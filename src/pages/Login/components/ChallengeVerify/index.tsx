import { useState, useMemo, useRef } from 'react';
import { Button, Input } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCountDown } from 'ahooks';
import type { ChallengeResponse } from '@/types';
import styles from './index.module.scss';

interface ChallengeVerifyProps {
  challenge: ChallengeResponse;
  loading?: boolean;
  /** 验证码正在发送中（异步） */
  sending?: boolean;
  onContinue: (code: string) => void;
  onCancel: () => void;
  onResend?: () => void;
}

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
};

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const ChallengeVerify = ({
  challenge,
  loading,
  sending = false,
  onContinue,
  onCancel,
  onResend,
}: ChallengeVerifyProps) => {
  const [code, setCode] = useState<string>('');
  const retryAfter = challenge.retry_after ?? RESEND_COOLDOWN;

  /* eslint-disable react-hooks/purity -- Date.now() is inherently impure but necessary for countdown timers */
  const mountTimeRef = useRef(Date.now());

  const [resendTargetDate, setResendTargetDate] = useState(
    () => mountTimeRef.current + retryAfter * 1000
  );

  const challengeIdRef = useRef(challenge.challenge_id);
  const retryAfterRef = useRef(retryAfter);
  if (challenge.challenge_id !== challengeIdRef.current || retryAfter !== retryAfterRef.current) {
    challengeIdRef.current = challenge.challenge_id;
    retryAfterRef.current = retryAfter;
    setResendTargetDate(Date.now() + retryAfter * 1000);
  }

  const [resendCountdown] = useCountDown({ targetDate: resendTargetDate });
  const resendSeconds = Math.round(resendCountdown / 1000);
  const canResend = resendSeconds <= 0;

  const isExpired = challenge.expires_at ? Date.now() > challenge.expires_at : false;
  /* eslint-enable react-hooks/purity */

  const handleOTPChange = (value: string) => {
    setCode(value);
    if (value.length === CODE_LENGTH) {
      onContinue(value);
    }
  };

  const handleResend = () => {
    if (onResend && canResend) {
      onResend();
    }
  };

  const maskedEmail = challenge.principal ? maskEmail(challenge.principal) : null;

  const backButtonStyle = useMemo<React.CSSProperties>(() => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: 0,
    fontSize: 14,
    color: '#6b7280',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    height: 'auto',
  }), []);

  const otpInputStyle = useMemo<React.CSSProperties>(() => ({
    width: 42,
    height: 48,
    fontSize: 20,
    fontWeight: 600,
    textAlign: 'center',
    borderRadius: 8,
  }), []);

  if (isExpired) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Button
            type="link"
            style={backButtonStyle}
            icon={<ArrowLeftOutlined style={{ fontSize: 12 }} />}
            onClick={onCancel}
          >
            返回
          </Button>
        </div>
        <div className={styles.expiredState}>
          <div className={styles.expiredIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className={styles.expiredText}>验证码已过期</p>
          {onResend && (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onResend}
              style={{ borderRadius: 8 }}
            >
              重新发送
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          type="link"
          style={backButtonStyle}
          icon={<ArrowLeftOutlined style={{ fontSize: 12 }} />}
          onClick={onCancel}
        >
          返回
        </Button>
      </div>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>输入验证码</h3>
        </div>

        <div className={styles.hintRow}>
          {maskedEmail && (
            <span className={styles.hint}>已发送至 {maskedEmail}</span>
          )}
          {sending ? (
            <span className={styles.sendingHint}>发送中...</span>
          ) : onResend ? (
            <Button
              type="link"
              size="small"
              onClick={handleResend}
              disabled={!canResend || loading}
              className={styles.resendBtn}
            >
              {canResend ? '重新发送' : `${resendSeconds}s 后重发`}
            </Button>
          ) : null}
        </div>

        <div className={styles.otpSection}>
          <Input.OTP
            length={CODE_LENGTH}
            value={code}
            onChange={handleOTPChange}
            disabled={loading || sending}
            autoFocus
            size="large"
            styles={{ input: otpInputStyle }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChallengeVerify;
