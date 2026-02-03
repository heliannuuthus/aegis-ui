import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import styles from './index.module.scss';

interface PasskeyProps {
  /** 点击回调 */
  onClick: () => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

// FIDO Alliance 标准 Passkey 图标
const PasskeyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1C8.676 1 6 3.676 6 7c0 2.168 1.145 4.065 2.863 5.127A3.995 3.995 0 006 16v5a2 2 0 002 2h8a2 2 0 002-2v-5a3.995 3.995 0 00-2.863-3.873C16.855 11.065 18 9.168 18 7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4s-1.724 4-4 4-4-1.724-4-4 1.724-4 4-4zm-4 9h8a2 2 0 012 2v5H8v-5a2 2 0 012-2z" />
    <circle cx="12" cy="7" r="2" />
    <rect x="11" y="16" width="2" height="4" rx="1" />
  </svg>
);

const Passkey = ({
  onClick,
  loading = false,
  disabled = false,
  className,
}: PasskeyProps) => {
  return (
    <button
      type="button"
      className={clsx(styles.button, className, {
        [styles.loading]: loading,
        [styles.disabled]: disabled,
      })}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Spin indicator={<LoadingOutlined spin />} className={styles.spinner} />
      ) : (
        <PasskeyIcon className={styles.icon} />
      )}
      <span className={styles.text}>使用 Passkey 登录</span>
    </button>
  );
};

export default Passkey;
