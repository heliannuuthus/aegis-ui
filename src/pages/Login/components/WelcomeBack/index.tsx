import { useState } from 'react';
import { Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { PasskeyUserHint } from '@/utils/passkeyCache';
import styles from './index.module.scss';

interface WelcomeBackProps {
  /** 缓存的用户信息 */
  userHint: PasskeyUserHint;
  /** 点击安全验证登录 */
  onLogin: () => Promise<void>;
  /** 切换到其他登录方式 */
  onSwitch: () => void;
}

const WelcomeBack = ({ userHint, onLogin, onSwitch }: WelcomeBackProps) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error) {
      if (error instanceof Error) {
        // 用户取消不提示
        if (error.name === 'NotAllowedError' || error.message.includes('cancel')) {
          message.info('本次验证已取消');
          return;
        }
        // 凭证不存在
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

  return (
    <div className={styles.overlay}>
      {/* 头像 */}
      <div className={styles.avatar}>
        {userHint.picture ? (
          <img src={userHint.picture} alt={userHint.nickname} />
        ) : (
          <div className={styles.avatarFallback}>
            {userHint.nickname.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 标题 */}
      <h2 className={styles.title}>欢迎回来</h2>
      <p className={styles.nickname}>{userHint.nickname}</p>
      <p className={styles.subtitle}>通过安全验证快速登录</p>

      {/* 主按钮 */}
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <Spin indicator={<LoadingOutlined spin />} className={styles.spinner} />
        ) : (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"
            />
          </svg>
        )}
        <span>使用安全验证登录</span>
      </button>

      {/* 次按钮 */}
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onSwitch}
        disabled={loading}
      >
        使用其他账号登录
      </button>
    </div>
  );
};

export default WelcomeBack;
