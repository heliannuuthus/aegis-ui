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
import CaptchaModal from '@/components/CaptchaModal';
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

interface CaptchaModalState {
  open: boolean;
  siteKey: string;
  strategy: string;
  pendingPassword: string | null;
}

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
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [dynamicRequireCaptcha, setDynamicRequireCaptcha] = useState(false);
  const [captchaModal, setCaptchaModal] = useState<CaptchaModalState>({
    open: false,
    siteKey: '',
    strategy: '',
    pendingPassword: null,
  });
  const lastPendingSeqRef = useRef(0);

  const needsCaptcha = (requiresCaptcha || dynamicRequireCaptcha) && !!captchaConfig;

  // 处理后端动态追加的 captcha 要求
  if (pendingActions.seq !== 0 && pendingActions.seq !== lastPendingSeqRef.current) {
    lastPendingSeqRef.current = pendingActions.seq;
    if (pendingActions.actions.some((a) => captchaConfig && a === captchaConfig.connection)) {
      setDynamicRequireCaptcha(true);
      setCaptchaVerified(false);
    }
  }

  const closeCaptchaModal = useCallback(() => {
    setCaptchaModal(prev => ({ ...prev, open: false, pendingPassword: null }));
  }, []);

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

  const handleCaptchaSuccess = useCallback(async (_challengeId: string, token: string) => {
    const pendingPassword = captchaModal.pendingPassword;
    
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
      closeCaptchaModal();

      if (pendingPassword) {
        setIsLoading(true);
        try {
          await performLogin(pendingPassword);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else {
        showError(error);
      }
      throw error;
    }
  }, [captchaModal.pendingPassword, captchaConfig, onRedirectAction, closeCaptchaModal, performLogin]);

  const handleSubmit = useCallback(async (values: { password: string }) => {
    setIsLoading(true);
    try {
      if (needsCaptcha && !captchaVerified) {
        setCaptchaModal({
          open: true,
          siteKey: captchaConfig?.identifier || '',
          strategy: captchaConfig?.strategy?.[0] ?? 'turnstile',
          pendingPassword: values.password,
        });
        setIsLoading(false);
        return;
      }

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
  }, [needsCaptcha, captchaVerified, captchaConfig, performLogin, onError]);

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

      <CaptchaModal
        open={captchaModal.open}
        siteKey={captchaModal.siteKey}
        challengeId=""
        onSuccess={handleCaptchaSuccess}
        onCancel={closeCaptchaModal}
      />
    </div>
  );
};

export default PasswordVerify;
