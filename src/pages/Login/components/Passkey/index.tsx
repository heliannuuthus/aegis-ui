import { useMemo } from 'react';
import { Button } from 'antd';

interface PasskeyProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const PasskeyIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg style={style} viewBox="0 0 24 24" fill="currentColor">
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
  const buttonStyle = useMemo<React.CSSProperties>(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 44,
    padding: '0 16px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    boxShadow: 'none',
    transition: 'all 0.2s ease',
    opacity: loading || disabled ? 0.6 : 1,
    cursor: loading || disabled ? 'not-allowed' : 'pointer',
  }), [loading, disabled]);

  return (
    <Button
      type="default"
      size="large"
      block
      className={className}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled || loading}
      loading={loading}
      icon={!loading ? <PasskeyIcon style={{ width: 20, height: 20, color: '#374151' }} /> : undefined}
    >
      <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
        使用指纹或面容登录
      </span>
    </Button>
  );
};

export default Passkey;
