import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Button, Spin } from 'antd';
import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { useCountDown } from 'ahooks';
import clsx from 'clsx';
import type { ChallengeResponse } from '@/types';
import styles from './index.module.scss';

interface ChallengeVerifyProps {
  challenge: ChallengeResponse;
  loading?: boolean;
  onContinue: (code: string) => void;
  onCancel: () => void;
}

// Challenge 类型图标 SVG
const ChallengeIcons: Record<string, React.FC<{ className?: string }>> = {
  email_otp: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  tg_otp: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
  totp: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
};

// Challenge 类型名称
const challengeNames: Record<string, string> = {
  email_otp: '邮箱验证',
  tg_otp: 'Telegram 验证',
  totp: '动态口令',
};

// Challenge 类型提示
const challengeHints: Record<string, string> = {
  email_otp: '我们已向您的邮箱发送了验证码',
  tg_otp: '请查看 Telegram 机器人发送的验证码',
  totp: '请打开验证器应用获取动态口令',
};

// 常见邮箱域名到 Web 客户端的映射
const emailProviders: Record<string, { name: string; url: string }> = {
  'gmail.com': { name: 'Gmail', url: 'https://mail.google.com' },
  'googlemail.com': { name: 'Gmail', url: 'https://mail.google.com' },
  'outlook.com': { name: 'Outlook', url: 'https://outlook.live.com' },
  'hotmail.com': { name: 'Outlook', url: 'https://outlook.live.com' },
  'live.com': { name: 'Outlook', url: 'https://outlook.live.com' },
  'yahoo.com': { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' },
  'qq.com': { name: 'QQ 邮箱', url: 'https://mail.qq.com' },
  'foxmail.com': { name: 'QQ 邮箱', url: 'https://mail.qq.com' },
  '163.com': { name: '网易邮箱', url: 'https://mail.163.com' },
  '126.com': { name: '网易邮箱', url: 'https://mail.126.com' },
  'yeah.net': { name: '网易邮箱', url: 'https://mail.yeah.net' },
  'icloud.com': { name: 'iCloud', url: 'https://www.icloud.com/mail' },
  'me.com': { name: 'iCloud', url: 'https://www.icloud.com/mail' },
};

// 根据邮箱地址获取邮箱提供商快捷链接
const getEmailProvider = (email: string): React.ReactNode => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  const provider = emailProviders[domain];
  if (!provider) return null;
  return (
    <a
      href={provider.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.emailShortcutLink}
    >
      打开 {provider.name}
    </a>
  );
};

const CODE_LENGTH = 6;

const ChallengeVerify = ({
  challenge,
  loading,
  onContinue,
  onCancel,
}: ChallengeVerifyProps) => {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string>('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [targetDate] = useState<number | undefined>(
    challenge.expires_in ? Date.now() + challenge.expires_in * 1000 : undefined
  );

  const [countdown] = useCountDown({
    targetDate,
  });

  const countdownSeconds = Math.round(countdown / 1000);
  const isExpired = Boolean(targetDate && countdownSeconds <= 0);

  // 自动聚焦第一个输入框
  useEffect(() => {
    if (!isExpired && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isExpired]);

  // 处理输入
  const handleInput = (index: number, value: string) => {
    // 只允许数字
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // 自动跳转到下一个输入框
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // 如果所有位都填完，自动提交
    if (digit && index === CODE_LENGTH - 1) {
      const fullCode = newCode.join('');
      if (fullCode.length === CODE_LENGTH) {
        onContinue(fullCode);
      }
    }
  };

  // 处理键盘事件
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // 当前格为空时，删除并跳到前一格
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // 清除当前格
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // 处理粘贴
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (pastedData) {
      const newCode = pastedData.split('').concat(Array(CODE_LENGTH).fill('')).slice(0, CODE_LENGTH);
      setCode(newCode);
      setError('');

      // 聚焦到最后一个有值的输入框
      const lastFilledIndex = Math.min(pastedData.length, CODE_LENGTH) - 1;
      if (lastFilledIndex >= 0) {
        inputRefs.current[lastFilledIndex]?.focus();
      }

      // 如果粘贴了完整的验证码，自动提交
      if (pastedData.length === CODE_LENGTH) {
        onContinue(pastedData);
      }
    }
  };

  // 提交验证
  const handleSubmit = () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      setError('请输入完整的 6 位验证码');
      return;
    }
    onContinue(fullCode);
  };

  const IconComponent = ChallengeIcons[challenge.type] || ChallengeIcons.totp;
  const name = challengeNames[challenge.type] || '验证码';
  const defaultHint = challengeHints[challenge.type] || '请输入验证码';
  const hint = challenge.hint || defaultHint;

  return (
    <div className={styles.container}>
      {/* 返回按钮 */}
      <button className={styles.backButton} onClick={onCancel}>
        <ArrowLeftOutlined />
        <span>返回</span>
      </button>

      {/* 图标 */}
      <div className={styles.iconWrapper}>
        <IconComponent className={styles.icon} />
        <div className={styles.iconGlow} />
      </div>

      {/* 标题 */}
      <h2 className={styles.title}>{name}</h2>

      {/* 提示 */}
      <p className={styles.hint}>{hint}</p>

      {/* 倒计时 */}
      {targetDate && !isExpired && (
        <div className={styles.countdown}>
          <div className={styles.countdownProgress}>
            <svg viewBox="0 0 36 36">
              <path
                className={styles.countdownBg}
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={styles.countdownFg}
                strokeDasharray={`${(countdownSeconds / (challenge.expires_in || 300)) * 100}, 100`}
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className={styles.countdownText}>{countdownSeconds}s</span>
          </div>
        </div>
      )}

      {/* 过期提示 */}
      {isExpired && (
        <div className={styles.expiredAlert}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>验证码已过期，请返回重试</span>
        </div>
      )}

      {/* 验证码输入框 */}
      <div className={styles.codeInputGroup}>
        {Array.from({ length: CODE_LENGTH }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={code[index]}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isExpired || loading}
            className={clsx(
              styles.codeInput,
              code[index] && styles.filled,
              error && styles.error,
              isExpired && styles.disabled
            )}
            aria-label={`验证码第 ${index + 1} 位`}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {error && <p className={styles.errorText}>{error}</p>}

      {/* 提交按钮 */}
      <Button
        type="primary"
        size="large"
        block
        onClick={handleSubmit}
        loading={loading}
        disabled={isExpired || code.join('').length !== CODE_LENGTH}
        className={styles.submitButton}
        icon={loading ? <Spin indicator={<LoadingOutlined />} /> : null}
      >
        {loading ? '验证中...' : '验证'}
      </Button>

      {/* 打开邮箱快捷按钮 */}
      {challenge.type === 'email_otp' && challenge.principal && (
        <div className={styles.emailShortcut}>
          {getEmailProvider(challenge.principal)}
        </div>
      )}

      {/* 帮助提示 */}
      <p className={styles.helpText}>
        没有收到验证码？请检查垃圾邮件或稍后重试
      </p>
    </div>
  );
};

export default ChallengeVerify;
