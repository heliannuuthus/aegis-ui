import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, message } from 'antd';
import { ArrowLeftOutlined, MailOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import type {
  ChallengeResponse,
  LoginResponse,
  AuthContext,
  Connection,
} from '@/types';
import { initiateChallenge, continueChallenge, login } from '@/services/api';
import PasswordInput from '../PasswordInput';
import Captcha, { type CaptchaHandle } from '../Captcha';
import ChallengeVerify from '../ChallengeVerify';
import styles from './index.module.scss';

/** 验证方式 */
type VerifyMethod = 'password' | 'email_otp' | 'webauthn';

/** 当前视图 */
type ViewState = 'options' | 'password' | 'email_otp';

interface VerifyStepProps {
  /** 用户邮箱 */
  email: string;
  /** 可用的验证方式 */
  availableMethods: VerifyMethod[];
  /** 是否支持 WebAuthn delegate（delegate 中有 webauthn 且浏览器支持） */
  hasWebAuthn: boolean;
  /** 认证上下文（用于获取 client_id / audience） */
  authContext: AuthContext | null;
  /** 是否需要 Captcha（仅密码登录时使用） */
  requiresCaptcha: boolean;
  /** Captcha 配置 */
  captchaConfig?: Connection;
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
  hasWebAuthn,
  authContext,
  requiresCaptcha,
  captchaConfig,
  loading = false,
  onBack,
  onLoginSuccess,
  onChallenge,
  onError,
}: VerifyStepProps) => {
  const [viewState, setViewState] = useState<ViewState>('options');
  const [isLoading, setIsLoading] = useState(false);
  const [emailOTPChallenge, setEmailOTPChallenge] = useState<ChallengeResponse | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<CaptchaHandle>(null);

  const hasPassword = availableMethods.includes('password');
  const hasEmailOTP = availableMethods.includes('email_otp');

  // 如果只有一种验证方式，直接进入对应视图
  useEffect(() => {
    const methodCount = [hasPassword, hasEmailOTP, hasWebAuthn].filter(Boolean).length;
    if (methodCount === 1) {
      if (hasPassword) setViewState('password');
      // email_otp 和 webauthn 需要先发起请求，留在 options 视图中自动触发
    }
  }, [hasPassword, hasEmailOTP, hasWebAuthn]);

  // WebAuthn delegate 认证（浏览器弹窗模式，非遮罩）
  const handleWebAuthnLogin = useCallback(async () => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) {
      onError(new Error('认证上下文不完整'));
      return;
    }

    setIsLoading(true);
    try {
      // 1. 创建 WebAuthn challenge
      const challengeResp = await initiateChallenge({
        client_id: authContext.application.app_id,
        audience: authContext.service.service_id,
        type: 'login',
        channel_type: 'webauthn',
        channel: email,
      });

      // 2. 动态导入 WebAuthn 工具
      const { convertToPublicKeyOptions, convertAssertionResponse, performWebAuthnAssertion } =
        await import('../WebAuthn/utils');

      // 3. 触发浏览器系统弹窗（指纹/面容/PIN/安全密钥）
      const publicKeyOptions = convertToPublicKeyOptions((challengeResp as any).options);
      const credential = await performWebAuthnAssertion(publicKeyOptions);
      const assertionResponse = convertAssertionResponse(credential);

      // 4. 验证凭证，获取 challenge_token
      const verifyResponse = await continueChallenge(challengeResp.challenge_id, {
        proof: JSON.stringify(assertionResponse),
      });
      if (!verifyResponse.verified || !verifyResponse.challenge_token) {
        throw new Error('验证失败');
      }

      // 5. 使用 challenge_token 作为 proof 调用 Login
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
      if (error instanceof Error) {
        // 用户主动取消，不报错
        if (error.name === 'NotAllowedError' || error.message.includes('cancel')) {
          return;
        }
        onError(error);
      } else {
        onError(new Error('安全验证失败'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, authContext, onLoginSuccess, onChallenge, onError]);

  // 重置 Captcha
  const resetCaptcha = useCallback(() => {
    captchaRef.current?.reset();
    setCaptchaToken(undefined);
  }, []);

  // 密码登录
  const handlePasswordLogin = useCallback(async (password: string) => {
    if (requiresCaptcha && !captchaToken) {
      message.warning('请先完成人机验证');
      return;
    }

    setIsLoading(true);
    try {
      // 如果需要 captcha 前置验证，先单独调用 login 验证 captcha
      if (requiresCaptcha && captchaToken) {
        await login({
          connection: 'captcha',
          strategy: captchaConfig?.strategy?.[0] ?? 'turnstile',
          proof: captchaToken,
        });
      }

      // 再调用密码登录
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
      resetCaptcha();
      onError(error instanceof Error ? error : new Error('登录失败'));
    } finally {
      setIsLoading(false);
    }
  }, [email, requiresCaptcha, captchaToken, captchaConfig, resetCaptcha, onLoginSuccess, onChallenge, onError]);

  // 邮箱验证码登录 - 发起 Challenge，就地显示验证码输入
  const handleEmailOTPLogin = useCallback(async () => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) {
      onError(new Error('认证上下文不完整'));
      return;
    }

    setIsLoading(true);
    try {
      const challengeResponse = await initiateChallenge({
        client_id: authContext.application.app_id,
        audience: authContext.service.service_id,
        type: 'login',
        channel_type: 'email_otp',
        channel: email,
      });

      // 如果需要 captcha 前置，暂时跳过（后续可扩展 captcha 前置逻辑）
      if (challengeResponse.required && !challengeResponse.required.verified) {
        // TODO: 处理 captcha 前置验证
        onError(new Error('需要先完成人机验证'));
        return;
      }

      setEmailOTPChallenge({
        challenge_id: challengeResponse.challenge_id,
        type: 'email_otp',
        hint: `验证码已发送到 ${email}`,
        connection: 'oper',
        principal: email,
      });
      setViewState('email_otp');
    } catch (error) {
      onError(error instanceof Error ? error : new Error('发送验证码失败'));
    } finally {
      setIsLoading(false);
    }
  }, [email, authContext, onError]);

  // 验证码提交
  const handleEmailOTPContinue = useCallback(async (code: string) => {
    if (!emailOTPChallenge) return;

    onChallenge({
      ...emailOTPChallenge,
      connection: 'oper',
      principal: email,
    });
  }, [emailOTPChallenge, email, onChallenge]);

  // 验证码取消 → 回到选项列表
  const handleEmailOTPCancel = useCallback(() => {
    setEmailOTPChallenge(null);
    setViewState('options');
  }, []);

  const globalLoading = loading || isLoading;

  // 密码输入视图
  if (viewState === 'password') {
    return (
      <div>
        {/* 只有多种方式时才显示返回按钮 */}
        {(hasEmailOTP || hasWebAuthn) && (
          <button type="button" className={styles.backButton} onClick={() => { resetCaptcha(); setViewState('options'); }}>
            <ArrowLeftOutlined />
            <span>其他方式</span>
          </button>
        )}
        {/* 只有密码一种方式时显示返回到邮箱步骤 */}
        {!hasEmailOTP && !hasWebAuthn && (
          <button type="button" className={styles.backButton} onClick={onBack}>
            <ArrowLeftOutlined />
            <span>更换账号</span>
          </button>
        )}

        <PasswordInput
          email={email}
          loading={globalLoading}
          disabled={globalLoading}
          onSubmit={handlePasswordLogin}
          beforeSubmit={
            requiresCaptcha && captchaConfig ? (
              <div className={styles.captchaWrapper}>
                <Captcha
                  ref={captchaRef}
                  config={captchaConfig}
                  onTokenChange={setCaptchaToken}
                />
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  // 邮箱验证码就地输入视图
  if (viewState === 'email_otp' && emailOTPChallenge) {
    return (
      <div>
        <button type="button" className={styles.backButton} onClick={handleEmailOTPCancel}>
          <ArrowLeftOutlined />
          <span>其他方式</span>
        </button>

        <ChallengeVerify
          challenge={emailOTPChallenge}
          loading={globalLoading}
          onContinue={handleEmailOTPContinue}
          onCancel={handleEmailOTPCancel}
        />
      </div>
    );
  }

  // 选项列表视图
  return (
    <div>
      <button type="button" className={styles.backButton} onClick={onBack}>
        <ArrowLeftOutlined />
        <span>更换账号</span>
      </button>

      {/* 用户信息 */}
      <div className={styles.userInfo}>
        <span className={styles.email}>{email}</span>
      </div>

      <h3 className={styles.optionsTitle}>选择登录方式</h3>

      <div className={styles.optionsList}>
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

        {/* WebAuthn MFA 选项（安全密钥/指纹/面容二次验证） */}
        {hasWebAuthn && (
          <Button
            size="large"
            block
            icon={<KeyOutlined />}
            onClick={handleWebAuthnLogin}
            loading={globalLoading}
            disabled={globalLoading}
            className={styles.optionButton}
          >
            使用安全验证
          </Button>
        )}
      </div>
    </div>
  );
};

export default VerifyStep;
