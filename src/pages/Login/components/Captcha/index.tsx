import { useState, useRef, useEffect, useCallback } from 'react';
import type { VChanConfig } from '@/types';
import styles from './index.module.scss';

// Turnstile 全局类型声明
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

interface CaptchaProps {
  /** Captcha 配置 */
  config: VChanConfig;
  /** Token 变化回调 */
  onTokenChange: (token: string | undefined) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * Captcha 人机验证组件
 * 支持 Cloudflare Turnstile
 */
const Captcha = ({ config, onTokenChange, className }: CaptchaProps) => {
  const [ready, setReady] = useState(false);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // 从 connection 解析 captcha 类型（格式：captcha-provider，如 captcha-turnstile）
  const captchaType = config.connection.split('-').slice(1).join('-') || '';
  const isTurnstile = captchaType === 'turnstile';

  // 初始化 Turnstile
  const initTurnstile = useCallback(() => {
    if (!window.turnstile || !containerRef.current || !config.identifier) return;

    // 如果已经有 widget，先移除
    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: config.identifier,
      callback: (token) => onTokenChange(token),
      'expired-callback': () => onTokenChange(undefined),
      'error-callback': () => onTokenChange(undefined),
      theme: 'auto',
      size: 'flexible',
    });

    setReady(true);
  }, [config.identifier, onTokenChange]);

  // 监听 Turnstile 加载
  useEffect(() => {
    if (!isTurnstile || !config.identifier) return;

    if (window.turnstile) {
      initTurnstile();
    } else {
      // 等待脚本加载
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          initTurnstile();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [isTurnstile, config.identifier, initTurnstile]);

  // 重置方法（暴露给父组件）
  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChange(undefined);
    }
  }, [onTokenChange]);

  // 暴露 reset 方法
  useEffect(() => {
    // 将 reset 方法挂载到 DOM 元素上，供父组件调用
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { resetCaptcha?: () => void }).resetCaptcha = reset;
    }
  }, [reset]);

  if (!isTurnstile) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.unsupported}>
          不支持的验证类型: {captchaType || config.connection}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div
        ref={containerRef}
        className={`${styles.turnstile} ${ready ? styles.ready : ''}`}
      />
      {!ready && <div className={styles.loading}>加载验证组件...</div>}
    </div>
  );
};

export default Captcha;
