import { useState, useMemo, useCallback } from 'react';
import { message } from 'antd';
import type {
  ConnectionConfig,
  MFAConfig,
  VChanConfig,
  ChallengeResponse,
  LoginResponse,
  AuthError,
} from '@/types';
import { isWebAuthnSupported } from '../WebAuthn';
import { initiateWebAuthnChallenge, verifyWebAuthnCredential, login } from '@/services/api';
import { convertToPublicKeyOptions, convertAssertionResponse, performWebAuthnAssertion } from '../WebAuthn/utils';
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

  // 检查浏览器是否支持 WebAuthn
  const webAuthnSupported = useMemo(() => isWebAuthnSupported(), []);

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
  const hasWebAuthn = availableDelegateMFA.includes('webauthn') && webAuthnSupported;
  const hasPasskey = availableDelegateMFA.includes('passkey') && webAuthnSupported;

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

  // 如果没有任何可用的登录方式，不渲染
  if (!hasPassword && availableDelegateMFA.length === 0) {
    return null;
  }

  // 邮箱提交
  const handleEmailSubmit = useCallback((submittedEmail: string, _captchaToken?: string) => {
    setEmail(submittedEmail);
    setStep('verify');
  }, []);

  // Passkey 点击（在邮箱步骤）
  const handlePasskeyClick = useCallback(async () => {
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
        throw new Error('Passkey 验证失败');
      }

      // 使用 challenge_token 调用 Login
      // Passkey 模式下 principal 为空，由服务端从凭证中识别用户
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
          message.error(error.message || 'Passkey 验证失败');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [onLogin, onChallenge]);

  // 返回邮箱步骤
  const handleBack = useCallback(() => {
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

  return (
    <div className={styles.container}>
      {step === 'email' ? (
        <EmailStep
          captchaConfig={captchaConfig}
          requiresCaptcha={requiresCaptcha}
          hasPasskey={hasPasskey}
          loading={globalLoading}
          disabled={disabled || globalLoading}
          onSubmit={handleEmailSubmit}
          onPasskeyClick={handlePasskeyClick}
        />
      ) : (
        <VerifyStep
          email={email}
          availableMethods={availableMethods}
          hasPasskey={hasPasskey}
          hasWebAuthn={hasWebAuthn}
          loading={globalLoading}
          onBack={handleBack}
          onLoginSuccess={handleLoginSuccess}
          onChallenge={handleChallenge}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default OperLogin;
