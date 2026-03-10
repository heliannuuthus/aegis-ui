import clsx from 'clsx';
import styles from './index.module.scss';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'light' | 'dark';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

/**
 * Aegis Logo 组件
 * 盾牌形状代表安全与保护
 */
const Logo = ({
  size = 'md',
  variant = 'default',
  animated = true,
  showText = false,
  className,
}: LogoProps) => {
  return (
    <div className={clsx(styles.container, styles[size], className)}>
      <div
        className={clsx(
          styles.logo,
          styles[variant],
          animated && styles.animated
        )}
      >
        {/* 盾牌 SVG */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.shield}
        >
          {/* 盾牌主体 */}
          <path
            d="M24 4L6 12V22C6 33.1 13.9 43.3 24 46C34.1 43.3 42 33.1 42 22V12L24 4Z"
            fill="url(#shieldGradient)"
            className={styles.shieldBody}
          />
          {/* 盾牌高光 */}
          <path
            d="M24 4L6 12V22C6 33.1 13.9 43.3 24 46V4Z"
            fill="url(#shieldHighlight)"
            className={styles.shieldHighlight}
          />
          {/* 锁孔图案 */}
          <circle cx="24" cy="22" r="6" fill="rgba(255,255,255,0.9)" />
          <path d="M22 25H26V32H22V25Z" fill="rgba(255,255,255,0.9)" />
          {/* 渐变定义 */}
          <defs>
            <linearGradient
              id="shieldGradient"
              x1="6"
              y1="4"
              x2="42"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient
              id="shieldHighlight"
              x1="6"
              y1="4"
              x2="24"
              y2="46"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="rgba(255,255,255,0.2)" />
              <stop offset="1" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
        </svg>
        {/* 光晕效果 */}
        <div className={styles.glow} />
      </div>
      {showText && (
        <span className={clsx(styles.text, styles[`text-${variant}`])}>
          Aegis
        </span>
      )}
    </div>
  );
};

export default Logo;
