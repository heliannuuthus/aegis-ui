import { useState, useMemo, useCallback } from 'react';
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
import { isWebAuthnSupported } from '../WebAuthn';
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
  /** 步骤变化回调（email: 输入邮箱阶段, verify: 验证阶段） */
  onStepChange?: (step: 'email' | 'verify') => void;
}

const OperLogin = ({
  connection,
  mfaConnections,
  captchaConfig,
  loading = false,
  disabled = false,
  onLogin,
  onChallenge,
  onStepChange,
}: OperLoginProps) => {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 动画方向：forward = 向前（邮箱→验证），back = 返回
  const [animDirection, setAnimDirection] = useState<'forward' | 'back'>('forward');
  // 用于触发重新渲染动画的 key
  const [stepKey, setStepKey] = useState(0);

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
  // MFA 级 webauthn（delegate 中的 webauthn），用于登录后二次验证
  const hasMFAWebAuthn = availableDelegateMFA.includes('webauthn') && webAuthnSupported;

  // 是否需要 Captcha
  const requiresCaptcha = (connection.require ?? []).includes('captcha') && !!captchaConfig;

  // 可用的验证方式列表
  const availableMethods = useMemo(() => {
    const methods: ('password' | 'email_otp' | 'webauthn')[] = [];
    if (hasPassword) methods.push('password');
    if (hasEmailOTP) methods.push('email_otp');
    if (hasMFAWebAuthn) methods.push('webauthn');
    return methods;
  }, [hasPassword, hasEmailOTP, hasMFAWebAuthn]);

  // 如果没有任何可用的登录方式，不渲染
  if (!hasPassword && !hasEmailOTP && !hasMFAWebAuthn) {
    return null;
  }

  // 邮箱提交 → 前进到验证步骤
  const handleEmailSubmit = useCallback((submittedEmail: string, _captchaToken?: string) => {
    setEmail(submittedEmail);
    setAnimDirection('forward');
    setStepKey((k) => k + 1);
    setStep('verify');
    onStepChange?.('verify');
  }, [onStepChange]);

  // 返回邮箱步骤（保留已输入的邮箱）
  const handleBack = useCallback(() => {
    setAnimDirection('back');
    setStepKey((k) => k + 1);
    setStep('email');
    onStepChange?.('email');
  }, [onStepChange]);

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
          loading={globalLoading}
          disabled={disabled || globalLoading}
          initialEmail={email}
          onSubmit={handleEmailSubmit}
        />
      ) : (
        <VerifyStep
          email={email}
          availableMethods={availableMethods}
          hasWebAuthn={hasMFAWebAuthn}
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
