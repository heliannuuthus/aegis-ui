import { useState, useEffect, useCallback } from 'react';
import { Button, message } from 'antd';
import { ArrowLeftOutlined, MailOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import type {
  WebAuthnChallengeResponse,
  WebAuthnAssertionResponse,
  ChallengeResponse,
  LoginResponse,
} from '@/types';
import { initiateWebAuthnChallenge, verifyWebAuthnCredential, login, initiateChallenge } from '@/services/api';
import WebAuthn from '../WebAuthn';
import PasswordInput from '../PasswordInput';
import Passkey from '../Passkey';
import styles from './index.module.scss';

/** 验证方式 */
type VerifyMethod = 'password' | 'email_otp' | 'webauthn';

/** 当前视图 */
type ViewState = 'loading' | 'webauthn' | 'options' | 'password';

interface VerifyStepProps {
  /** 用户邮箱 */
  email: string;
  /** 可用的验证方式 */
  availableMethods: VerifyMethod[];
  /** 是否支持 Passkey */
  hasPasskey: boolean;
  /** 是否支持 WebAuthn */
  hasWebAuthn: boolean;
  /** 是否正在加载 */
  loading?: boolean;
  /** 返回回调 */
  onBack: () => void;
  /** 登录成功回调 */
  onLoginSuccess: (response: LoginResponse) => void;
  /** Challenge 回调（需要进一步验证） */
  onChallenge: (challenge: ChallengeResponse) => void;
  /** 错误回调 */
  onError: (error: Error) => void;
}

const VerifyStep = ({
  email,
  availableMethods,
  hasPasskey,
  hasWebAuthn,
  loading = false,
  onBack,
  onLoginSuccess,
  onChallenge,
  onError,
}: VerifyStepProps) => {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [webAuthnChallenge, setWebAuthnChallenge] = useState<WebAuthnChallengeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasPassword = availableMethods.includes('password');
  const hasEmailOTP = availableMethods.includes('email_otp');

  // 初始化：如果支持 WebAuthn，自动触发
  useEffect(() => {
    const initVerify = async () => {
      if (hasWebAuthn) {
        setViewState('loading');
        try {
          const challenge = await initiateWebAuthnChallenge(email);
          setWebAuthnChallenge(challenge);
          setViewState('webauthn');
        } catch (error) {
          console.error('WebAuthn challenge 获取失败:', error);
          // 回退到选项列表
          setViewState('options');
        }
      } else {
        // 没有 WebAuthn，直接显示选项
        setViewState('options');
      }
    };

    initVerify();
  }, [email, hasWebAuthn]);

  // WebAuthn 认证成功 → 获取 challenge_token → 调用 Login
  const handleWebAuthnSuccess = useCallback(async (credential: WebAuthnAssertionResponse) => {
    if (!webAuthnChallenge) return;

    setIsLoading(true);
    try {
      // 1. 验证 WebAuthn 凭证，获取 challenge_token
      const verifyResponse = await verifyWebAuthnCredential(webAuthnChallenge.challenge_id, credential);
      if (!verifyResponse.verified || !verifyResponse.challenge_token) {
        throw new Error('WebAuthn 验证失败');
      }

      // 2. 使用 challenge_token 作为 proof 调用 Login
      const loginResponse = await login({
        connection: 'oper',
        principal: email,
        proof: verifyResponse.challenge_token,
      });

      if (loginResponse.challenge) {
        onChallenge(loginResponse.challenge);
      } else {
        onLoginSuccess(loginResponse);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('WebAuthn 验证失败'));
      setViewState('options');
    } finally {
      setIsLoading(false);
    }
  }, [webAuthnChallenge, email, onLoginSuccess, onChallenge, onError]);

  // WebAuthn 认证取消
  const handleWebAuthnCancel = useCallback(() => {
    setViewState('options');
  }, []);

  // WebAuthn 认证错误
  const handleWebAuthnError = useCallback((error: Error) => {
    message.error(error.message);
    setViewState('options');
  }, []);

  // 密码登录
  const handlePasswordLogin = useCallback(async (password: string) => {
    setIsLoading(true);
    try {
      const response = await login({
        connection: 'oper',
        strategy: 'password',
        principal: email,
        proof: password,
      });
      if (response.challenge) {
        onChallenge(response.challenge);
      } else {
        onLoginSuccess(response);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('登录失败'));
    } finally {
      setIsLoading(false);
    }
  }, [email, onLoginSuccess, onChallenge, onError]);

  // 邮箱验证码登录 - 发起 Challenge，让父组件处理验证码输入
  const handleEmailOTPLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      // 发起 email OTP challenge
      const challengeResponse = await initiateChallenge({
        type: 'email',
        email: email,
      });

      // 返回 Challenge 让父组件显示验证码输入界面
      // 验证成功后会返回 challenge_token，用于 Login
      onChallenge({
        challenge_id: challengeResponse.challenge_id,
        type: 'email_otp',
        hint: `验证码已发送到 ${email}`,
        expires_in: challengeResponse.expires_in,
        connection: 'oper',  // 保存上下文用于后续 Login
        principal: email,    // 保存上下文用于后续 Login
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error('发送验证码失败'));
    } finally {
      setIsLoading(false);
    }
  }, [email, onChallenge, onError]);

  // Passkey 登录
  const handlePasskeyLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      const challenge = await initiateWebAuthnChallenge(email);
      setWebAuthnChallenge(challenge);
      setViewState('webauthn');
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Passkey 验证失败'));
    } finally {
      setIsLoading(false);
    }
  }, [email, onError]);

  // 重试 WebAuthn
  const handleRetryWebAuthn = useCallback(async () => {
    setIsLoading(true);
    try {
      const challenge = await initiateWebAuthnChallenge(email);
      setWebAuthnChallenge(challenge);
      setViewState('webauthn');
    } catch (error) {
      message.error('获取认证信息失败');
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const globalLoading = loading || isLoading;

  // 加载中视图
  if (viewState === 'loading') {
    return (
      <div className={styles.stepContainer}>
        <WebAuthn
          loading={true}
          onSuccess={() => {}}
          onError={() => {}}
          onCancel={() => {}}
        />
      </div>
    );
  }

  // WebAuthn 认证视图
  if (viewState === 'webauthn' && webAuthnChallenge) {
    return (
      <div className={styles.stepContainer}>
        <button type="button" className={styles.backButton} onClick={() => setViewState('options')}>
          <ArrowLeftOutlined />
          <span>其他方式</span>
        </button>

        <WebAuthn
          options={webAuthnChallenge.options}
          autoTrigger={true}
          loading={globalLoading}
          onSuccess={handleWebAuthnSuccess}
          onError={handleWebAuthnError}
          onCancel={handleWebAuthnCancel}
        />

        <div className={styles.retryHint}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleRetryWebAuthn}
            disabled={globalLoading}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 密码输入视图
  if (viewState === 'password') {
    return (
      <div className={styles.stepContainer}>
        <button type="button" className={styles.backButton} onClick={() => setViewState('options')}>
          <ArrowLeftOutlined />
          <span>其他方式</span>
        </button>

        <PasswordInput
          email={email}
          loading={globalLoading}
          disabled={globalLoading}
          onSubmit={handlePasswordLogin}
          onBack={onBack}
        />

        {/* Passkey 选项 */}
        {hasPasskey && (
          <>
            <div className={styles.divider}>
              <span>或</span>
            </div>
            <Passkey
              onClick={handlePasskeyLogin}
              loading={false}
              disabled={globalLoading}
            />
          </>
        )}
      </div>
    );
  }

  // 选项列表视图
  return (
    <div className={styles.stepContainer}>
      <button type="button" className={styles.backButton} onClick={onBack}>
        <ArrowLeftOutlined />
        <span>更换账号</span>
      </button>

      {/* 用户信息 */}
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {email.charAt(0).toUpperCase()}
        </div>
        <span className={styles.email}>{email}</span>
      </div>

      <h3 className={styles.optionsTitle}>选择登录方式</h3>

      <div className={styles.optionsList}>
        {/* WebAuthn 选项 */}
        {hasWebAuthn && (
          <Button
            size="large"
            block
            icon={<KeyOutlined />}
            onClick={handleRetryWebAuthn}
            loading={globalLoading}
            disabled={globalLoading}
            className={styles.optionButton}
          >
            使用安全密钥
          </Button>
        )}

        {/* 密码登录选项 */}
        {hasPassword && (
          <Button
            size="large"
            block
            icon={<LockOutlined />}
            onClick={() => setViewState('password')}
            disabled={globalLoading}
            className={styles.optionButton}
          >
            使用密码登录
          </Button>
        )}

        {/* 邮箱验证码选项 */}
        {hasEmailOTP && (
          <Button
            size="large"
            block
            icon={<MailOutlined />}
            onClick={handleEmailOTPLogin}
            loading={globalLoading}
            disabled={globalLoading}
            className={styles.optionButton}
          >
            发送邮箱验证码
          </Button>
        )}
      </div>

      {/* Passkey 选项 */}
      {hasPasskey && (
        <>
          <div className={styles.divider}>
            <span>或</span>
          </div>
          <Passkey
            onClick={handlePasskeyLogin}
            loading={false}
            disabled={globalLoading}
          />
        </>
      )}
    </div>
  );
};

export default VerifyStep;
