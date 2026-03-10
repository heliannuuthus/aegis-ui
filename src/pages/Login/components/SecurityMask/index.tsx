import { useState, useMemo } from 'react';
import { Button, Image, message } from 'antd';
import type { PasskeyUserHint } from '@/utils/passkeyCache';
import styles from './index.module.scss';

interface SecurityMaskProps {
  userHint: PasskeyUserHint;
  onLogin: () => Promise<void>;
  onSwitch: () => void;
}

const FingerprintIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"
    />
  </svg>
);

const SecurityMask = ({ userHint, onLogin, onSwitch }: SecurityMaskProps) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.name === 'NotAllowedError' ||
          error.message.includes('cancel')
        ) {
          message.info('本次验证已取消');
          return;
        }
        if (
          error.message.includes('not found') ||
          error.message.includes('credential')
        ) {
          message.warning('未检测到可用的安全凭证，请使用其他方式登录');
          onSwitch();
          return;
        }
      }
      message.error('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const primaryButtonStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      height: 44,
      padding: '0 20px',
      background: '#0066ff',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 500,
      marginBottom: 12,
      boxShadow: 'none',
      transition: 'background 0.2s ease',
    }),
    []
  );

  const secondaryButtonStyle = useMemo<React.CSSProperties>(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: 40,
      padding: '0 16px',
      background: 'transparent',
      color: '#6b7280',
      border: 'none',
      borderRadius: 8,
      fontSize: 14,
      boxShadow: 'none',
      transition: 'all 0.2s ease',
    }),
    []
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.avatar}>
        {userHint.picture ? (
          <Image
            src={userHint.picture}
            alt={userHint.nickname}
            preview={false}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {userHint.nickname.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <h2 className={styles.title}>安全验证</h2>
      <p className={styles.nickname}>{userHint.nickname}</p>
      <p className={styles.subtitle}>使用已注册的安全凭证快速登录</p>

      <Button
        type="primary"
        size="large"
        block
        style={primaryButtonStyle}
        onClick={handleLogin}
        disabled={loading}
        loading={loading}
        icon={
          !loading ? (
            <FingerprintIcon style={{ width: 20, height: 20 }} />
          ) : undefined
        }
      >
        验证身份并登录
      </Button>

      <Button
        size="large"
        block
        type="text"
        style={secondaryButtonStyle}
        onClick={onSwitch}
        disabled={loading}
      >
        使用其他方式登录
      </Button>
    </div>
  );
};

export default SecurityMask;
