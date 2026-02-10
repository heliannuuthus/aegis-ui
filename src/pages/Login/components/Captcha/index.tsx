import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
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

/** Captcha 组件暴露的方法 */
export interface CaptchaHandle {
  /** 重置验证码 */
  reset: () => void;
}

interface CaptchaProps {
  /** Captcha 配置 */
  config: VChanConfig;
  /** Token 变化回调 */
  onTokenChange: (token: string | undefined) => void;
  /** 自定义类名 */
  className?: string;
}

// ---- Turnstile 脚本按需加载 ----

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** 全局只加载一次的 Promise，确保脚本不会重复插入 */
let turnstileLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  // 如果已经可用，立即返回
  if (window.turnstile) return Promise.resolve();

  // 如果已经在加载中，复用同一个 Promise
  if (turnstileLoadPromise) return turnstileLoadPromise;

  turnstileLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      turnstileLoadPromise = null; // 加载失败时允许重试
      reject(new Error('Turnstile 脚本加载失败'));
    };
    document.head.appendChild(script);
  });

  return turnstileLoadPromise;
}

/**
 * Captcha 人机验证组件
 * 支持 Cloudflare Turnstile，按需加载脚本
 */
const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(
  ({ config, onTokenChange, className }, ref) => {
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const widgetIdRef = useRef<string | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);

    // 从 connection 解析 captcha 类型（格式：captcha-provider，如 captcha-turnstile）
    const captchaType = config.connection.split('-').slice(1).join('-') || '';
    const isTurnstile = captchaType === 'turnstile';

    // 稳定引用 onTokenChange，避免不必要的重新渲染
    const onTokenChangeRef = useRef(onTokenChange);
    onTokenChangeRef.current = onTokenChange;

    // 初始化 Turnstile widget
    const renderWidget = useCallback(() => {
      if (!window.turnstile || !containerRef.current || !config.identifier) return;

      // 如果已经有 widget，先移除
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: config.identifier,
        callback: (token) => onTokenChangeRef.current(token),
        'expired-callback': () => onTokenChangeRef.current(undefined),
        'error-callback': () => onTokenChangeRef.current(undefined),
        theme: 'auto',
        size: 'flexible',
      });

      setReady(true);
    }, [config.identifier]);

    // 按需加载脚本并初始化
    useEffect(() => {
      if (!isTurnstile || !config.identifier) return;

      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          if (!cancelled) renderWidget();
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = undefined;
        }
      };
    }, [isTurnstile, config.identifier, renderWidget]);

    // 重置方法
    const reset = useCallback(() => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        onTokenChangeRef.current(undefined);
      }
    }, []);

    // 通过 ref 暴露 reset 方法
    useImperativeHandle(ref, () => ({ reset }), [reset]);

    if (!isTurnstile) {
      return (
        <div className={`${styles.container} ${className || ''}`}>
          <div className={styles.unsupported}>
            不支持的验证类型: {captchaType || config.connection}
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className={`${styles.container} ${className || ''}`}>
          <div className={styles.unsupported}>
            验证组件加载失败，请刷新页面重试
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
  }
);

Captcha.displayName = 'Captcha';

export default Captcha;
