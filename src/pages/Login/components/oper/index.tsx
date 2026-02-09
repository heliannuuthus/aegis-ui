import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import clsx from 'clsx';
import type {
  ConnectionConfig,
  MFAConfig,
  VChanConfig,
  ChallengeResponse,
  LoginResponse,
  AuthError,
} from '@/types';
import { isWebAuthnSupported, isConditionalUISupported, isPlatformAuthenticatorAvailable } from '../WebAuthn';
import { initiateWebAuthnChallenge, verifyWebAuthnCredential, login } from '@/services/api';
import {
  convertToPublicKeyOptions,
  convertAssertionResponse,
  performWebAuthnAssertion,
  performConditionalMediation,
} from '../WebAuthn/utils';
import EmailStep from './EmailStep';
import VerifyStep from './VerifyStep';
import styles from './index.module.scss';

/** 登录步骤 */
type LoginStep = 'email' | 'verify';

interface OperLoginProps {
  /** Connection 配置 */
  connection: ConnectionConfig;
  /** MFA 配置列表 */
  mfaConnections: MFAConfig[];
  /** Captcha 配置 */
  captchaConfig?: VChanConfig;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 登录成功回调 */
  onLogin: (response: LoginResponse) => void;
  /** Challenge 回调 */
  onChallenge: (challenge: ChallengeResponse) => void;
}

const OperLogin = ({
  connection,
  mfaConnections,
  captchaConfig,
  loading = false,
  disabled = false,
  onLogin,
  onChallenge,
}: OperLoginProps) => {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 动画方向：forward = 向前（邮箱→验证），back = 返回
  const [animDirection, setAnimDirection] = useState<'forward' | 'back'>('forward');
  // 用于触发重新渲染动画的 key
  const [stepKey, setStepKey] = useState(0);
  // 设备是否有平台认证器（指纹/面容），用于控制"使用指纹或面容登录"按钮是否展示
  const [hasPlatformAuth, setHasPlatformAuth] = useState(false);

  // Conditional UI (Passkey 自动填充) 的 AbortController
  const conditionalAbortRef = useRef<AbortController | null>(null);

  // 检查浏览器是否支持 WebAuthn
  const webAuthnSupported = useMemo(() => isWebAuthnSupported(), []);

  // 异步检测设备是否有平台认证器
  useEffect(() => {
    if (!webAuthnSupported) return;
    isPlatformAuthenticatorAvailable().then(setHasPlatformAuth);
  }, [webAuthnSupported]);

  // 获取有效的 delegate MFA（在 mfaConnections 中存在的）
  const availableDelegateMFA = useMemo(() => {
    const delegateMFA = connection.delegate ?? [];
    return delegateMFA.filter((mfa) =>
      mfaConnections.some((m) => m.connection === mfa)
    );
  }, [connection, mfaConnections]);

  // 检查各种验证方式是否可用
  const hasPassword = (connection.strategy ?? []).includes('password');
  const hasEmailOTP = availableDelegateMFA.includes('email_otp');
  // 合并 webauthn 和 passkey 为统一的 WebAuthn 能力
  const hasWebAuthn = (availableDelegateMFA.includes('webauthn') || availableDelegateMFA.includes('passkey')) && webAuthnSupported;

  // 是否需要 Captcha
  const requiresCaptcha = (connection.require ?? []).includes('captcha') && !!captchaConfig;

  // 可用的验证方式列表
  const availableMethods = useMemo(() => {
    const methods: ('password' | 'email_otp' | 'webauthn')[] = [];
    if (hasPassword) methods.push('password');
    if (hasEmailOTP) methods.push('email_otp');
    if (hasWebAuthn) methods.push('webauthn');
    return methods;
  }, [hasPassword, hasEmailOTP, hasWebAuthn]);

  // Conditional UI: 页面加载后自动在浏览器自动填充中显示 Passkey 选项
  // 用户点击输入框时会看到 Passkey 提示，选择后直接触发指纹/面容认证
  useEffect(() => {
    if (!hasWebAuthn) return;

    const abortController = new AbortController();
    conditionalAbortRef.current = abortController;

    const startConditionalUI = async () => {
      const supported = await isConditionalUISupported();
      if (!supported || abortController.signal.aborted) return;

      try {
        // 1. 获取 discoverable credential challenge（无需用户名）
        const challenge = await initiateWebAuthnChallenge('');
        if (abortController.signal.aborted) return;

        // 2. 启动条件式认证，等待用户从自动填充中选择 Passkey
        const publicKeyOptions = convertToPublicKeyOptions(challenge.options);
        const credential = await performConditionalMediation(
          publicKeyOptions,
          abortController.signal
        );
        if (abortController.signal.aborted) return;

        // 3. 验证凭证，获取 challenge_token
        const assertionResponse = convertAssertionResponse(credential);
        const verifyResponse = await verifyWebAuthnCredential(
          challenge.challenge_id,
          assertionResponse
        );

        if (!verifyResponse.verified || !verifyResponse.challenge_token) {
          throw new Error('验证失败');
        }

        // 4. 使用 challenge_token 完成登录
        const loginResponse = await login({
          connection: 'oper',
          proof: verifyResponse.challenge_token,
        });

        if (loginResponse.challenge) {
          onChallenge(loginResponse.challenge);
        } else {
          onLogin(loginResponse);
        }
      } catch (error) {
        // 被中止或用户未操作，静默忽略
        if (abortController.signal.aborted) return;
        console.debug('Conditional UI:', error);
      }
    };

    startConditionalUI();

    return () => {
      abortController.abort();
      conditionalAbortRef.current = null;
    };
  }, [hasWebAuthn, onLogin, onChallenge]);

  // 如果没有任何可用的登录方式，不渲染
  if (!hasPassword && !hasEmailOTP && !hasWebAuthn) {
    return null;
  }

  // 邮箱提交 → 前进到验证步骤
  const handleEmailSubmit = useCallback((submittedEmail: string, _captchaToken?: string) => {
    setEmail(submittedEmail);
    setAnimDirection('forward');
    setStepKey((k) => k + 1);
    setStep('verify');
  }, []);

  // Passkey 点击（在邮箱步骤）
  const handlePasskeyClick = useCallback(async () => {
    // 终止正在运行的 Conditional UI，避免冲突
    // 同一时刻只能有一个 navigator.credentials.get() 调用
    conditionalAbortRef.current?.abort();
    conditionalAbortRef.current = null;

    setIsLoading(true);
    try {
      // Passkey 可以在不输入邮箱的情况下使用
      // 这里我们使用空字符串，让服务端根据 Passkey 凭证识别用户
      const challenge = await initiateWebAuthnChallenge('');
      const publicKeyOptions = convertToPublicKeyOptions(challenge.options);
      const credential = await performWebAuthnAssertion(publicKeyOptions);
      const assertionResponse = convertAssertionResponse(credential);
      const verifyResponse = await verifyWebAuthnCredential(challenge.challenge_id, assertionResponse);
      
      if (!verifyResponse.verified || !verifyResponse.challenge_token) {
        throw new Error('验证失败');
      }

      // 使用 challenge_token 调用 Login
      // 无密码模式下 principal 为空，由服务端从凭证中识别用户
      const loginResponse = await login({
        connection: 'oper',
        proof: verifyResponse.challenge_token,
      });

      if (loginResponse.challenge) {
        onChallenge(loginResponse.challenge);
      } else {
        onLogin(loginResponse);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== 'NotAllowedError' && !error.message.includes('cancel')) {
          message.error(error.message || '验证失败');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [onLogin, onChallenge]);

  // 返回邮箱步骤
  const handleBack = useCallback(() => {
    setAnimDirection('back');
    setStepKey((k) => k + 1);
    setStep('email');
    setEmail('');
  }, []);

  // 登录成功
  const handleLoginSuccess = useCallback((response: LoginResponse) => {
    onLogin(response);
  }, [onLogin]);

  // Challenge
  const handleChallenge = useCallback((challenge: ChallengeResponse) => {
    onChallenge(challenge);
  }, [onChallenge]);

  // 错误处理
  const handleError = useCallback((error: Error | AuthError) => {
    let errorMessage: string | undefined;
    if ('error_description' in error) {
      errorMessage = error.error_description;
    } else if ('message' in error) {
      errorMessage = error.message;
    }
    message.error(errorMessage || '操作失败');
  }, []);

  const globalLoading = loading || isLoading;

  const stepClassName = clsx(
    animDirection === 'forward' ? styles.stepContainer : styles.stepContainerBack
  );

  return (
    <div className={styles.container}>
      <div key={stepKey} className={stepClassName}>
      {step === 'email' ? (
        <EmailStep
          captchaConfig={captchaConfig}
          requiresCaptcha={requiresCaptcha}
          hasWebAuthn={hasWebAuthn && hasPlatformAuth}
          loading={globalLoading}
          disabled={disabled || globalLoading}
          onSubmit={handleEmailSubmit}
          onWebAuthnClick={handlePasskeyClick}
        />
      ) : (
        <VerifyStep
          email={email}
          availableMethods={availableMethods}
          hasWebAuthn={hasWebAuthn}
          loading={globalLoading}
          onBack={handleBack}
          onLoginSuccess={handleLoginSuccess}
          onChallenge={handleChallenge}
          onError={handleError}
        />
      )}
      </div>
    </div>
  );
};

export default OperLogin;
