import { useState, useRef, useCallback, useMemo } from 'react';
import { Form, Input, Button, message } from 'antd';
import { ArrowLeftOutlined, LockOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import type {
  ChallengeResponse,
  LoginResponse,
  RedirectAction,
  Connection,
} from '@/types';
import { login, isRedirectAction } from '@/services/api';
import { isRateLimitError, getRateLimitData, showError } from '@/utils/error';
import CaptchaStep from '@/components/CaptchaStep';
import styles from './index.module.scss';

interface PasswordVerifyProps {
  email: string;
  requiresCaptcha: boolean;
  captchaConfig?: Connection;
  pendingActions?: { seq: number; actions: string[] };
  onBack: () => void;
  onLoginSuccess: (response: LoginResponse) => void;
  onRedirectAction: (action: RedirectAction) => void;
  onChallenge: (challenge: ChallengeResponse) => void;
  onError: (error: Error) => void;
}

type ViewState = 'captcha' | 'password';

const PasswordVerify = ({
  email,
  requiresCaptcha,
  captchaConfig,
  pendingActions = { seq: 0, actions: [] },
  onBack,
  onLoginSuccess,
  onRedirectAction,
  onChallenge,
  onError,
}: PasswordVerifyProps) => {
  const [form] = Form.useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [_captchaVerified, setCaptchaVerified] = useState(false);
  const [dynamicRequireCaptcha, setDynamicRequireCaptcha] = useState(false);
  const lastPendingSeqRef = useRef(0);

  const needsCaptcha = (requiresCaptcha || dynamicRequireCaptcha) && !!captchaConfig;
  const initialView: ViewState = needsCaptcha ? 'captcha' : 'password';
  const [viewState, setViewState] = useState<ViewState>(initialView);

  if (pendingActions.seq !== 0 && pendingActions.seq !== lastPendingSeqRef.current) {
    lastPendingSeqRef.current = pendingActions.seq;
    if (pendingActions.actions.some((a) => captchaConfig && a === captchaConfig.connection)) {
      setDynamicRequireCaptcha(true);
      setCaptchaVerified(false);
      setViewState('captcha');
    }
  }

  const performLogin = useCallback(async (password: string) => {
    const response = await login({
      connection: 'staff',
      strategy: 'password',
      principal: email,
      proof: password,
    });

    if (isRedirectAction(response)) {
      onRedirectAction(response);
    } else if (response.challenge) {
      onChallenge(response.challenge);
    } else {
      onLoginSuccess(response);
    }
  }, [email, onLoginSuccess, onRedirectAction, onChallenge]);

  const handleCaptchaSuccess = useCallback(async (token: string) => {
    try {
      const captchaResp = await login({
        connection: 'captcha',
        strategy: captchaConfig?.strategy?.[0] ?? 'turnstile',
        proof: token,
      });

      if (isRedirectAction(captchaResp)) {
        if (captchaResp.actions.length > 0) {
          onRedirectAction(captchaResp);
          return;
        }
      }

      setCaptchaVerified(true);
      setViewState('password');
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else {
        showError(error);
      }
      setViewState('captcha');
    }
  }, [captchaConfig, onRedirectAction]);

  const handleSubmit = useCallback(async (values: { password: string }) => {
    setIsLoading(true);
    try {
      await performLogin(values.password);
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else {
        onError(error instanceof Error ? error : new Error('登录失败'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [performLogin, onError]);

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

  if (viewState === 'captcha' && captchaConfig) {
    return (
      <CaptchaStep
        siteKey={captchaConfig.identifier}
        onSuccess={handleCaptchaSuccess}
        onCancel={onBack}
      />
    );
  }

  return (
    <div>
      <Button
        type="link"
        style={backButtonStyle}
        icon={<ArrowLeftOutlined style={{ fontSize: 12 }} />}
        onClick={onBack}
      >
        其他方式
      </Button>

      <div className={styles.userInfo}>
        <span className={styles.email}>{email}</span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className={styles.form}
      >
        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="输入密码"
            disabled={isLoading}
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
            visibilityToggle={{
              visible: showPassword,
              onVisibleChange: setShowPassword,
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isLoading}
            disabled={isLoading}
            style={{ marginTop: 8 }}
          >
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PasswordVerify;
