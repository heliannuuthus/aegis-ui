import { useState, useMemo } from 'react';
import { Button, Input } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, MailOutlined } from '@ant-design/icons';
import { useCountDown } from 'ahooks';
import type { ChallengeResponse } from '@/types';
import styles from './index.module.scss';

interface ChallengeVerifyProps {
  challenge: ChallengeResponse;
  loading?: boolean;
  onContinue: (code: string) => void;
  onCancel: () => void;
  onResend?: () => void;
}

const emailProviders: Record<string, { name: string; url: string }> = {
  'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
  'googlemail.com': { name: 'Gmail', url: 'https://mail.google.com' },
  'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com' },
  'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com' },
  'live.com': { name: 'Outlook', url: 'https://outlook.live.com' },
  'yahoo.com': { name: 'Yahoo', url: 'https://mail.yahoo.com' },
  'qq.com': { name: 'QQ邮箱', url: 'https://mail.qq.com' },
  'foxmail.com': { name: 'QQ邮箱', url: 'https://mail.qq.com' },
  '163.com': { name: '网易邮箱', url: 'https://mail.163.com' },
  '126.com': { name: '网易邮箱', url: 'https://mail.126.com' },
  'yeah.net': { name: '网易邮箱', url: 'https://mail.yeah.net' },
  'icloud.com': { name: 'iCloud', url: 'https://www.icloud.com/mail' },
  'me.com': { name: 'iCloud', url: 'https://www.icloud.com/mail' },
};

const getEmailProviderInfo = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return emailProviders[domain] || null;
};

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
  onContinue,
  onCancel,
  onResend,
}: ChallengeVerifyProps) => {
  const [code, setCode] = useState<string>('');
  const retryAfter = challenge.retry_after ?? RESEND_COOLDOWN;
  const [resendTargetDate, setResendTargetDate] = useState<number>(
    Date.now() + retryAfter * 1000
  );

  const [resendCountdown] = useCountDown({ targetDate: resendTargetDate });
  const resendSeconds = Math.round(resendCountdown / 1000);
  const canResend = resendSeconds <= 0;

  const isExpired = challenge.expires_at ? Date.now() > challenge.expires_at : false;

  const handleOTPChange = (value: string) => {
    setCode(value);
    if (value.length === CODE_LENGTH) {
      onContinue(value);
    }
  };

  const handleResend = () => {
    if (onResend && canResend) {
      onResend();
      setResendTargetDate(Date.now() + retryAfter * 1000);
    }
  };

  const emailProvider = challenge.principal ? getEmailProviderInfo(challenge.principal) : null;
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

        {maskedEmail && (
          <p className={styles.hint}>
            已发送至 {maskedEmail}
          </p>
        )}

        <div className={styles.otpSection}>
          <Input.OTP
            length={CODE_LENGTH}
            value={code}
            onChange={handleOTPChange}
            disabled={loading}
            autoFocus
            size="large"
            styles={{ input: otpInputStyle }}
          />
        </div>

        <div className={styles.actions}>
          {onResend && (
            <Button
              type="link"
              size="small"
              onClick={handleResend}
              disabled={!canResend || loading}
              className={styles.resendBtn}
            >
              {canResend ? '重新发送' : `${resendSeconds}s 后重发`}
            </Button>
          )}

          {challenge.type === 'email_otp' && emailProvider && (
            <a
              href={emailProvider.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.emailLink}
            >
              <MailOutlined style={{ fontSize: 12 }} />
              打开{emailProvider.name}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeVerify;
