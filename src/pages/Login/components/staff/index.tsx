import { useState, useMemo, useCallback } from 'react';
import { message } from 'antd';
import type {
  Connection,
  ChallengeResponse,
  LoginResponse,
  RedirectAction,
  AuthContext,
} from '@/types';
import { isWebAuthnSupported } from '../WebAuthn';
import EmailStep from './EmailStep';
import VerifyStep from './VerifyStep';
import styles from './index.module.scss';

/** 登录步骤 */
type LoginStep = 'email' | 'verify';

interface StaffLoginProps {
  /** Connection 配置 */
  connection: Connection;
  /** Factor 配置列表（委托路径） */
  delegatedConnections: Connection[];
  /** Captcha 配置 */
  captchaConfig?: Connection;
  /** 认证上下文 */
  authContext: AuthContext | null;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 后端指示的待完成 actions（300 协议，seq 递增保证每次 300 触发 effect） */
  pendingActions?: { seq: number; actions: string[] };
  /** 登录成功回调 */
  onLogin: (response: LoginResponse) => void;
  /** 300 重定向回调 */
  onRedirectAction: (action: RedirectAction) => void;
  /** Challenge 回调 */
  onChallenge: (challenge: ChallengeResponse) => void;
  /** 步骤变化回调（email: 输入邮箱阶段, verify: 验证阶段） */
  onStepChange?: (step: 'email' | 'verify') => void;
}

const StaffLogin = ({
  connection,
  delegatedConnections,
  captchaConfig,
  authContext,
  loading = false,
  disabled = false,
  pendingActions = { seq: 0, actions: [] },
  onLogin,
  onRedirectAction,
  onChallenge,
  onStepChange,
}: StaffLoginProps) => {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  // 动画方向：forward = 向前（邮箱→验证），back = 返回
  const [animDirection, setAnimDirection] = useState<'forward' | 'back'>(
    'forward'
  );
  // 用于触发重新渲染动画的 key
  const [stepKey, setStepKey] = useState(0);

  // 检查浏览器是否支持 WebAuthn
  const webAuthnSupported = useMemo(() => isWebAuthnSupported(), []);

  // 获取有效的 delegate（在 delegatedConnections 中存在的）
  const availableDelegate = useMemo(() => {
    const delegates = connection.delegate ?? [];
    return delegates.filter((d) =>
      delegatedConnections.some((m) => m.connection === d)
    );
  }, [connection, delegatedConnections]);

  // 检查各种验证方式是否可用
  const hasPassword = (connection.strategy ?? []).includes('password');
  const hasEmailOTP = availableDelegate.includes('email_otp');
  // WebAuthn delegate（delegate 中的 webauthn），作为可替代主认证的独立路径
  const hasDelegateWebAuthn =
    availableDelegate.includes('webauthn') && webAuthnSupported;

  // 是否需要 Captcha
  const requiresCaptcha =
    (connection.require ?? []).includes('captcha') && !!captchaConfig;

  // 可用的验证方式列表
  const availableMethods = useMemo(() => {
    const methods: ('password' | 'email_otp' | 'webauthn')[] = [];
    if (hasPassword) methods.push('password');
    if (hasEmailOTP) methods.push('email_otp');
    if (hasDelegateWebAuthn) methods.push('webauthn');
    return methods;
  }, [hasPassword, hasEmailOTP, hasDelegateWebAuthn]);

  // 邮箱提交 → 前进到验证步骤
  const handleEmailSubmit = useCallback(
    (submittedEmail: string) => {
      setEmail(submittedEmail);
      setAnimDirection('forward');
      setStepKey((k) => k + 1);
      setStep('verify');
      onStepChange?.('verify');
    },
    [onStepChange]
  );

  // 返回邮箱步骤（保留已输入的邮箱）
  const handleBack = useCallback(() => {
    setAnimDirection('back');
    setStepKey((k) => k + 1);
    setStep('email');
    onStepChange?.('email');
  }, [onStepChange]);

  // 错误处理
  const handleError = useCallback((error: Error) => {
    message.error(error.message || '操作失败');
  }, []);

  // 如果没有任何可用的登录方式，不渲染
  if (!hasPassword && !hasEmailOTP && !hasDelegateWebAuthn) {
    return null;
  }

  const globalLoading = loading;

  const stepClassName =
    animDirection === 'forward'
      ? styles.stepContainer
      : styles.stepContainerBack;

  return (
    <div className={styles.container}>
      <div key={stepKey} className={stepClassName}>
        {step === 'email' ? (
          <EmailStep
            loading={globalLoading}
            disabled={disabled || globalLoading}
            initialEmail={email}
            onSubmit={handleEmailSubmit}
          />
        ) : (
          <VerifyStep
            email={email}
            availableMethods={availableMethods}
            hasWebAuthn={hasDelegateWebAuthn}
            authContext={authContext}
            requiresCaptcha={requiresCaptcha}
            captchaConfig={captchaConfig}
            pendingActions={pendingActions}
            loading={globalLoading}
            onBack={handleBack}
            onLoginSuccess={onLogin}
            onRedirectAction={onRedirectAction}
            onChallenge={onChallenge}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
};

export default StaffLogin;
