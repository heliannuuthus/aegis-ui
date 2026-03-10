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
import { CHALLENGE_AUDIENCE } from '@/config/env';
import CaptchaStep from '@/components/CaptchaStep';
import ChallengeVerify from '../ChallengeVerify';

interface EmailOTPVerifyProps {
  email: string;
  authContext: AuthContext | null;
  onBack: () => void;
  onLoginSuccess: (response: LoginResponse) => void;
  onRedirectAction: (action: RedirectAction) => void;
  onChallenge: (challenge: ChallengeResponse) => void;
  onError: (error: Error) => void;
}

type ViewState = 'init' | 'captcha' | 'code_input';

interface CaptchaConfig {
  siteKey: string;
  strategy: string;
  challengeId: string;
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
  const [viewState, setViewState] = useState<ViewState>('init');
  const [isLoading, setIsLoading] = useState(false);
  const [emailOTPChallenge, setEmailOTPChallenge] = useState<ChallengeResponse | null>(null);
  const [captchaConfig, setCaptchaConfig] = useState<CaptchaConfig | null>(null);
  const hasInitiatedRef = useRef(false);

  const initiateOTP = useCallback(async () => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) {
      onError(new Error('认证上下文不完整'));
      return;
    }

    setIsLoading(true);
    try {
      const challengeResponse = await initiateChallenge({
        client_id: authContext.application.app_id,
        audience: CHALLENGE_AUDIENCE,
        type: 'staff:verify',
        channel_type: 'email_otp',
        channel: email,
      });

      const captcha = challengeResponse.required?.captcha;
      if (captcha?.identifier) {
        setCaptchaConfig({
          siteKey: captcha.identifier,
          strategy: captcha.strategy?.[0] ?? 'turnstile',
          challengeId: challengeResponse.challenge_id,
        });
        setViewState('captcha');
      } else {
        setEmailOTPChallenge({
          challenge_id: challengeResponse.challenge_id,
          type: 'email_otp',
          hint: `验证码已发送到 ${email}`,
          retry_after: challengeResponse.retry_after ?? DEFAULT_RETRY_AFTER,
          connection: 'staff',
          principal: email,
        });
        setViewState('code_input');
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
        } else {
          onBack();
        }
      } else {
        onError(error instanceof Error ? error : new Error('发送验证码失败'));
        onBack();
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, authContext, onError, onBack]);

  useEffect(() => {
    if (!hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      initiateOTP();
    }
  }, [initiateOTP]);

  const [isSending, setIsSending] = useState(false);

  const handleCaptchaSuccess = useCallback(async (token: string) => {
    if (!captchaConfig) return;

    setEmailOTPChallenge({
      challenge_id: captchaConfig.challengeId,
      type: 'email_otp',
      hint: `验证码发送中...`,
      retry_after: DEFAULT_RETRY_AFTER,
      connection: 'staff',
      principal: email,
    });
    setViewState('code_input');
    setIsSending(true);

    try {
      await continueChallenge(captchaConfig.challengeId, {
        type: 'captcha',
        strategy: captchaConfig.strategy,
        proof: token,
      });

      setEmailOTPChallenge(prev => prev ? {
        ...prev,
        hint: `验证码已发送到 ${email}`,
      } : prev);
      message.success('验证码已发送');
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        const retryAfter = info?.retryAfter ?? DEFAULT_RETRY_AFTER;
        message.warning(`请求过于频繁，请 ${retryAfter} 秒后重试`);
        setEmailOTPChallenge(prev => prev ? { ...prev, retry_after: retryAfter } : prev);
      } else {
        showError(error);
        setViewState('captcha');
      }
    } finally {
      setIsSending(false);
    }
  }, [captchaConfig, email]);

  const handleResend = useCallback(async () => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) return;

    setIsLoading(true);
    try {
      const challengeResponse = await initiateChallenge({
        client_id: authContext.application.app_id,
        audience: CHALLENGE_AUDIENCE,
        type: 'staff:verify',
        channel_type: 'email_otp',
        channel: email,
      });

      const captcha = challengeResponse.required?.captcha;
      if (captcha?.identifier) {
        setCaptchaConfig({
          siteKey: captcha.identifier,
          strategy: captcha.strategy?.[0] ?? 'turnstile',
          challengeId: challengeResponse.challenge_id,
        });
        setViewState('captcha');
      } else {
        setEmailOTPChallenge({
          challenge_id: challengeResponse.challenge_id,
          type: 'email_otp',
          hint: `验证码已发送到 ${email}`,
          retry_after: challengeResponse.retry_after ?? DEFAULT_RETRY_AFTER,
          connection: 'staff',
          principal: email,
        });
        message.success('验证码已重新发送');
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        const retryAfter = info?.retryAfter ?? DEFAULT_RETRY_AFTER;
        message.warning(`请求过于频繁，请 ${retryAfter} 秒后重试`);
        setEmailOTPChallenge(prev => prev ? { ...prev, retry_after: retryAfter } : prev);
      } else {
        showError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, authContext]);

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
        const delegateResponse = await login({
          connection: 'email_otp',
          proof: verifyResponse.challenge_token,
        });

        if (!isRedirectAction(delegateResponse)) {
          message.error('验证失败，请重试');
          setIsLoading(false);
          return;
        }

        if (delegateResponse.actions.length > 0) {
          onRedirectAction(delegateResponse);
          return;
        }

        const loginResponse = await login({
          connection: 'staff',
          principal: email,
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
        handleResend();
      } else if (isPreconditionRequiredError(error)) {
        const authError = error as { data?: { required?: Record<string, { identifier?: string; strategy?: string[] }> } };
        const captcha = authError.data?.required?.captcha;
        if (captcha?.identifier && emailOTPChallenge) {
          setCaptchaConfig({
            siteKey: captcha.identifier,
            strategy: captcha.strategy?.[0] ?? 'turnstile',
            challengeId: emailOTPChallenge.challenge_id,
          });
          setViewState('captcha');
        } else {
          showError(error);
        }
      } else {
        showError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [emailOTPChallenge, email, onLoginSuccess, onRedirectAction, onChallenge, handleResend]);

  if (viewState === 'init') {
    return null;
  }

  if (viewState === 'captcha' && captchaConfig) {
    return (
      <CaptchaStep
        siteKey={captchaConfig.siteKey}
        onSuccess={handleCaptchaSuccess}
        onCancel={onBack}
      />
    );
  }

  if (viewState === 'code_input' && emailOTPChallenge) {
    return (
      <ChallengeVerify
        challenge={emailOTPChallenge}
        loading={isLoading}
        sending={isSending}
        onContinue={handleCodeVerify}
        onCancel={onBack}
        onResend={handleResend}
      />
    );
  }

  return null;
};

export default EmailOTPVerify;
