import { useState, useMemo, useCallback } from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, MailOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import type {
  ChallengeResponse,
  LoginResponse,
  RedirectAction,
  AuthContext,
  Connection,
} from '@/types';
import PasswordVerify from './PasswordVerify';
import EmailOTPVerify from './EmailOTPVerify';
import WebAuthnVerify from './WebAuthnVerify';
import styles from './index.module.scss';

type VerifyMethod = 'password' | 'email_otp' | 'webauthn';
type ViewState = 'options' | 'password' | 'email_otp' | 'webauthn';

interface VerifyStepProps {
  email: string;
  availableMethods: VerifyMethod[];
  hasWebAuthn: boolean;
  authContext: AuthContext | null;
  requiresCaptcha: boolean;
  captchaConfig?: Connection;
  pendingActions?: { seq: number; actions: string[] };
  loading?: boolean;
  onBack: () => void;
  onLoginSuccess: (response: LoginResponse) => void;
  onRedirectAction: (action: RedirectAction) => void;
  onChallenge: (challenge: ChallengeResponse) => void;
  onError: (error: Error) => void;
}

const VerifyStep = ({
  email,
  availableMethods,
  hasWebAuthn,
  authContext,
  requiresCaptcha,
  captchaConfig,
  pendingActions = { seq: 0, actions: [] },
  onBack,
  onLoginSuccess,
  onRedirectAction,
  onChallenge,
  onError,
}: VerifyStepProps) => {
  const [viewState, setViewState] = useState<ViewState>('options');

  const hasPassword = availableMethods.includes('password');
  const hasEmailOTP = availableMethods.includes('email_otp');

  // 如果只有一种验证方式，直接进入
  const singleMethodView = useMemo<ViewState | null>(() => {
    const methodCount = [hasPassword, hasEmailOTP, hasWebAuthn].filter(Boolean).length;
    if (methodCount === 1) {
      if (hasPassword) return 'password';
      if (hasEmailOTP) return 'email_otp';
      if (hasWebAuthn) return 'webauthn';
    }
    return null;
  }, [hasPassword, hasEmailOTP, hasWebAuthn]);

  // 返回选项列表
  const handleBackToOptions = useCallback(() => {
    if (singleMethodView) {
      onBack();
    } else {
      setViewState('options');
    }
  }, [singleMethodView, onBack]);

  const backButtonStyle = useMemo<React.CSSProperties>(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    padding: 0,
    marginBottom: 20,
    fontSize: 14,
    color: '#6b7280',
    height: 'auto',
    boxShadow: 'none',
  }), []);

  const optionButtonStyle = useMemo<React.CSSProperties>(() => ({
    height: 44,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none',
  }), []);

  // 实际显示的视图状态
  const activeView = singleMethodView || viewState;

  // 密码验证
  if (activeView === 'password') {
    return (
      <PasswordVerify
        email={email}
        requiresCaptcha={requiresCaptcha}
        captchaConfig={captchaConfig}
        pendingActions={pendingActions}
        onBack={handleBackToOptions}
        onLoginSuccess={onLoginSuccess}
        onRedirectAction={onRedirectAction}
        onChallenge={onChallenge}
        onError={onError}
      />
    );
  }

  // 邮箱验证码验证
  if (activeView === 'email_otp') {
    return (
      <EmailOTPVerify
        email={email}
        authContext={authContext}
        onBack={handleBackToOptions}
        onLoginSuccess={onLoginSuccess}
        onRedirectAction={onRedirectAction}
        onChallenge={onChallenge}
        onError={onError}
      />
    );
  }

  // WebAuthn 验证
  if (activeView === 'webauthn') {
    return (
      <WebAuthnVerify
        email={email}
        authContext={authContext}
        onBack={handleBackToOptions}
        onLoginSuccess={onLoginSuccess}
        onRedirectAction={onRedirectAction}
        onChallenge={onChallenge}
        onError={onError}
      />
    );
  }

  // 选项列表
  return (
    <div>
      <Button
        type="link"
        style={backButtonStyle}
        icon={<ArrowLeftOutlined style={{ fontSize: 12 }} />}
        onClick={onBack}
      >
        更换账号
      </Button>

      <div className={styles.userInfo}>
        <span className={styles.email}>{email}</span>
      </div>

      <h3 className={styles.optionsTitle}>选择登录方式</h3>

      <div className={styles.optionsList}>
        {hasPassword && (
          <Button
            size="large"
            block
            icon={<LockOutlined style={{ fontSize: 16, marginRight: 8 }} />}
            onClick={() => setViewState('password')}
            style={optionButtonStyle}
          >
            密码登录
          </Button>
        )}

        {hasEmailOTP && (
          <Button
            size="large"
            block
            icon={<MailOutlined style={{ fontSize: 16, marginRight: 8 }} />}
            onClick={() => setViewState('email_otp')}
            style={optionButtonStyle}
          >
            验证码登录
          </Button>
        )}

        {hasWebAuthn && (
          <Button
            size="large"
            block
            icon={<KeyOutlined style={{ fontSize: 16, marginRight: 8 }} />}
            onClick={() => setViewState('webauthn')}
            style={optionButtonStyle}
          >
            安全密钥登录
          </Button>
        )}
      </div>
    </div>
  );
};

export default VerifyStep;
