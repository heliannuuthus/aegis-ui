import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, message } from 'antd';
import { ArrowLeftOutlined, KeyOutlined } from '@ant-design/icons';
import type {
  ChallengeResponse,
  LoginResponse,
  RedirectAction,
  AuthContext,
  WebAuthnRequestOptions,
} from '@/types';
import { initiateChallenge, continueChallenge, login, isRedirectAction } from '@/services/api';
import { isRateLimitError, getRateLimitData } from '@/utils/error';
import styles from './index.module.scss';

interface WebAuthnVerifyProps {
  email: string;
  authContext: AuthContext | null;
  onBack: () => void;
  onLoginSuccess: (response: LoginResponse) => void;
  onRedirectAction: (action: RedirectAction) => void;
  onChallenge: (challenge: ChallengeResponse) => void;
  onError: (error: Error) => void;
}

type ViewState = 'verifying' | 'error' | 'retry';

const WebAuthnVerify = ({
  email,
  authContext,
  onBack,
  onLoginSuccess,
  onRedirectAction,
  onChallenge,
  onError,
}: WebAuthnVerifyProps) => {
  const [viewState, setViewState] = useState<ViewState>('verifying');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasInitiatedRef = useRef(false);

  const performWebAuthnLogin = useCallback(async () => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) {
      onError(new Error('认证上下文不完整'));
      onBack();
      return;
    }

    setIsLoading(true);
    setViewState('verifying');
    setErrorMessage('');

    try {
      const challengeResp = await initiateChallenge({
        client_id: authContext.application.app_id,
        audience: authContext.service.service_id,
        type: 'verify',
        channel_type: 'webauthn',
        channel: email,
      });

      const { convertToPublicKeyOptions, convertAssertionResponse, performWebAuthnAssertion } =
        await import('../WebAuthn/utils');

      if (!challengeResp.options) {
        throw new Error('WebAuthn options missing from challenge response');
      }

      const publicKeyOptions = convertToPublicKeyOptions(challengeResp.options as unknown as WebAuthnRequestOptions);
      const credential = await performWebAuthnAssertion(publicKeyOptions);
      const assertionResponse = convertAssertionResponse(credential);

      const verifyResponse = await continueChallenge(challengeResp.challenge_id, {
        type: 'webauthn',
        proof: JSON.stringify(assertionResponse),
      });

      if (!verifyResponse.verified || !verifyResponse.challenge_token) {
        throw new Error('验证失败');
      }

      const loginResponse = await login({
        connection: 'staff',
        principal: email,
        proof: verifyResponse.challenge_token,
      });

      if (isRedirectAction(loginResponse)) {
        onRedirectAction(loginResponse);
      } else if (loginResponse.challenge) {
        onChallenge(loginResponse.challenge);
      } else {
        onLoginSuccess(loginResponse);
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
        setViewState('retry');
        setErrorMessage(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('cancel')) {
          setViewState('retry');
          setErrorMessage('验证被取消或超时');
        } else {
          setViewState('error');
          setErrorMessage(error.message || '安全密钥验证失败');
        }
      } else {
        setViewState('error');
        setErrorMessage('安全密钥验证失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, authContext, onLoginSuccess, onRedirectAction, onChallenge, onError, onBack]);

  // 组件挂载后自动开始验证
  useEffect(() => {
    if (!hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      performWebAuthnLogin();
    }
  }, [performWebAuthnLogin]);

  const handleRetry = useCallback(() => {
    performWebAuthnLogin();
  }, [performWebAuthnLogin]);

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

  const primaryButtonStyle = useMemo<React.CSSProperties>(() => ({
    height: 44,
    fontSize: 15,
    fontWeight: 500,
    borderRadius: 10,
    background: '#0066ff',
    border: 'none',
    boxShadow: 'none',
  }), []);

  // 验证中状态
  if (viewState === 'verifying' && isLoading) {
    return (
      <div className={styles.centerContent}>
        <div className={styles.webauthnIcon}>
          <KeyOutlined style={{ fontSize: 32, color: '#0066ff' }} />
        </div>
        <h3 className={styles.webauthnTitle}>安全密钥验证</h3>
        <p className={styles.webauthnHint}>请使用您的安全密钥或生物识别完成验证...</p>
        <div className={styles.sendingSpinner} />
      </div>
    );
  }

  // 错误或重试状态
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

      <div className={styles.centerContent}>
        <div className={styles.webauthnIcon}>
          <KeyOutlined style={{ fontSize: 32, color: viewState === 'error' ? '#ef4444' : '#0066ff' }} />
        </div>
        <h3 className={styles.webauthnTitle}>
          {viewState === 'error' ? '验证失败' : '安全密钥验证'}
        </h3>
        {errorMessage && (
          <p className={styles.errorHint}>{errorMessage}</p>
        )}
      </div>

      <Button
        type="primary"
        size="large"
        block
        loading={isLoading}
        onClick={handleRetry}
        style={primaryButtonStyle}
      >
        重试
      </Button>
    </div>
  );
};

export default WebAuthnVerify;
