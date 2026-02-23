import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import type {
  ChallengeResponse,
  LoginResponse,
  RedirectAction,
  AuthContext,
} from '@/types';
import { initiateChallenge, continueChallenge, login, isRedirectAction } from '@/services/api';
import { isRateLimitError, getRateLimitData, showError, isChallengeExpiredError, isPreconditionRequiredError } from '@/utils/error';
import CaptchaModal from '@/components/CaptchaModal';
import ChallengeVerify from '../ChallengeVerify';
import styles from './index.module.scss';

interface EmailOTPVerifyProps {
  email: string;
  authContext: AuthContext | null;
  onBack: () => void;
  onLoginSuccess: (response: LoginResponse) => void;
  onRedirectAction: (action: RedirectAction) => void;
  onChallenge: (challenge: ChallengeResponse) => void;
  onError: (error: Error) => void;
}

type ViewState = 'sending' | 'code_input';

interface CaptchaModalState {
  open: boolean;
  siteKey: string;
  strategy: string;
  challengeId: string;
  pendingOTPCode: string | null;
}

const DEFAULT_RETRY_AFTER = 60;

const EmailOTPVerify = ({
  email,
  authContext,
  onBack,
  onLoginSuccess,
  onRedirectAction,
  onChallenge,
  onError,
}: EmailOTPVerifyProps) => {
  const [viewState, setViewState] = useState<ViewState>('sending');
  const [isLoading, setIsLoading] = useState(false);
  const [emailOTPChallenge, setEmailOTPChallenge] = useState<ChallengeResponse | null>(null);
  const [captchaModal, setCaptchaModal] = useState<CaptchaModalState>({
    open: false,
    siteKey: '',
    strategy: '',
    challengeId: '',
    pendingOTPCode: null,
  });
  const hasInitiatedRef = useRef(false);

  const closeCaptchaModal = useCallback(() => {
    setCaptchaModal(prev => ({ ...prev, open: false, pendingOTPCode: null }));
  }, []);

  const handleCaptchaSuccess = useCallback(async (challengeId: string, token: string) => {
    const pendingCode = captchaModal.pendingOTPCode;
    const strategy = captchaModal.strategy;
    
    try {
      await continueChallenge(challengeId, {
        type: 'captcha',
        strategy,
        proof: token,
      });

      closeCaptchaModal();

      if (pendingCode && emailOTPChallenge) {
        setIsLoading(true);
        const verifyResponse = await continueChallenge(emailOTPChallenge.challenge_id, {
          type: 'email_otp',
          proof: pendingCode,
        });

        if (!verifyResponse.verified) {
          message.error('验证码错误，请重试');
          setIsLoading(false);
          return;
        }

        if (verifyResponse.challenge_token) {
          const loginResponse = await login({
            connection: 'staff',
            principal: email,
            proof: verifyResponse.challenge_token,
          });

          if (isRedirectAction(loginResponse)) {
            onRedirectAction(loginResponse);
          } else if (loginResponse.challenge) {
            onChallenge({
              ...loginResponse.challenge,
              connection: 'staff',
              principal: email,
            });
          } else {
            onLoginSuccess(loginResponse);
          }
        }
        setIsLoading(false);
      } else {
        setEmailOTPChallenge({
          challenge_id: challengeId,
          type: 'email_otp',
          hint: `验证码已发送到 ${email}`,
          retry_after: DEFAULT_RETRY_AFTER,
          connection: 'staff',
          principal: email,
        });
        setViewState('code_input');
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter ?? DEFAULT_RETRY_AFTER} 秒后重试`);
      } else {
        showError(error);
      }
      throw error;
    }
  }, [captchaModal.pendingOTPCode, captchaModal.strategy, emailOTPChallenge, email, onLoginSuccess, onRedirectAction, onChallenge, closeCaptchaModal]);

  const sendEmailOTP = useCallback(async (isResend = false) => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) {
      onError(new Error('认证上下文不完整'));
      return;
    }

    if (!isResend) {
      setViewState('sending');
    }
    setIsLoading(true);

    try {
      const challengeResponse = await initiateChallenge({
        client_id: authContext.application.app_id,
        audience: authContext.service.service_id,
        type: 'verify',
        channel_type: 'email_otp',
        channel: email,
      });

      const captchaConfig = challengeResponse.required?.captcha;
      if (captchaConfig?.identifier) {
        setCaptchaModal({
          open: true,
          siteKey: captchaConfig.identifier,
          strategy: captchaConfig.strategy?.[0] ?? 'turnstile',
          challengeId: challengeResponse.challenge_id,
          pendingOTPCode: null,
        });
        setIsLoading(false);
        return;
      }

      const retryAfter = challengeResponse.retry_after ?? DEFAULT_RETRY_AFTER;

      setEmailOTPChallenge({
        challenge_id: challengeResponse.challenge_id,
        type: 'email_otp',
        hint: `验证码已发送到 ${email}`,
        retry_after: retryAfter,
        connection: 'staff',
        principal: email,
      });
      setViewState('code_input');
      if (isResend) {
        message.success('验证码已重新发送');
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        const retryAfter = info?.retryAfter ?? DEFAULT_RETRY_AFTER;
        message.warning(`请求过于频繁，请 ${retryAfter} 秒后重试`);
        if (info?.challengeId) {
          setEmailOTPChallenge({
            challenge_id: info.challengeId,
            type: 'email_otp',
            hint: `验证码发送过于频繁，请 ${retryAfter} 秒后重试`,
            retry_after: retryAfter,
            connection: 'staff',
            principal: email,
          });
          setViewState('code_input');
        } else if (!isResend) {
          onBack();
        }
      } else {
        onError(error instanceof Error ? error : new Error('发送验证码失败'));
        if (!isResend) {
          onBack();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, authContext, onError, onBack]);

  useEffect(() => {
    if (!hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      sendEmailOTP(false);
    }
  }, [sendEmailOTP]);

  const handleCodeVerify = useCallback(async (code: string) => {
    if (!emailOTPChallenge) return;

    setIsLoading(true);
    try {
      const verifyResponse = await continueChallenge(emailOTPChallenge.challenge_id, {
        type: 'email_otp',
        proof: code,
      });

      if (verifyResponse.required?.conditions?.length) {
        message.warning('请先完成前置验证');
        setIsLoading(false);
        return;
      }

      if (!verifyResponse.verified) {
        message.error('验证码错误，请重试');
        setIsLoading(false);
        return;
      }

      if (verifyResponse.challenge_token) {
        const loginResponse = await login({
          connection: 'staff',
          principal: email,
          proof: verifyResponse.challenge_token,
        });

        if (isRedirectAction(loginResponse)) {
          onRedirectAction(loginResponse);
        } else if (loginResponse.challenge) {
          onChallenge({
            ...loginResponse.challenge,
            connection: 'staff',
            principal: email,
          });
        } else {
          onLoginSuccess(loginResponse);
        }
      }
    } catch (error: unknown) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else if (isChallengeExpiredError(error)) {
        message.warning('验证码已过期，请重新发送');
        sendEmailOTP(true);
      } else if (isPreconditionRequiredError(error)) {
        const authError = error as { data?: { required?: Record<string, { identifier?: string; strategy?: string[] }> } };
        const captchaConfig = authError.data?.required?.captcha;
        if (captchaConfig?.identifier && emailOTPChallenge) {
          setCaptchaModal({
            open: true,
            siteKey: captchaConfig.identifier,
            strategy: captchaConfig.strategy?.[0] ?? 'turnstile',
            challengeId: emailOTPChallenge.challenge_id,
            pendingOTPCode: code,
          });
        } else {
          showError(error);
        }
      } else {
        showError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [emailOTPChallenge, email, onLoginSuccess, onRedirectAction, onChallenge, sendEmailOTP]);

  const handleCodeCancel = useCallback(() => {
    onBack();
  }, [onBack]);

  const handleResend = useCallback(() => {
    sendEmailOTP(true);
  }, [sendEmailOTP]);

  if (viewState === 'sending') {
    return (
      <div className={styles.centerContent}>
        <div className={styles.sendingSpinner} />
        <p className={styles.sendingText}>正在发送验证码到 {email}...</p>
        
        <CaptchaModal
          open={captchaModal.open}
          siteKey={captchaModal.siteKey}
          challengeId={captchaModal.challengeId}
          onSuccess={handleCaptchaSuccess}
          onCancel={closeCaptchaModal}
        />
      </div>
    );
  }

  if (viewState === 'code_input' && emailOTPChallenge) {
    return (
      <>
        <ChallengeVerify
          challenge={emailOTPChallenge}
          loading={isLoading}
          onContinue={handleCodeVerify}
          onCancel={handleCodeCancel}
          onResend={handleResend}
        />
        
        <CaptchaModal
          open={captchaModal.open}
          siteKey={captchaModal.siteKey}
          challengeId={captchaModal.challengeId}
          onSuccess={handleCaptchaSuccess}
          onCancel={closeCaptchaModal}
        />
      </>
    );
  }

  return null;
};

export default EmailOTPVerify;
