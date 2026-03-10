import { useMemo } from 'react';
import { Button, Dropdown, Spin } from 'antd';
import type { MenuProps, ButtonProps } from 'antd';
import { LoadingOutlined, DownOutlined } from '@ant-design/icons';
import type { Connection } from '@/types';
import styles from './index.module.scss';

interface IDPButtonProps {
  connection: Connection;
  loading?: boolean;
  disabled?: boolean;
  onClick: (strategy: string) => void;
}

const idpNames: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  wechat: '微信',
  feishu: '飞书',
  alipay: '支付宝',
  douyin: '抖音',
  user: '邮箱',
  staff: '平台账号',
};

const strategyNames: Record<string, string> = {
  oauth: 'OAuth 登录',
  web: '网页登录',
  mp: '小程序',
  oa: '公众号',
};

const oauthConfigs: Record<string, { authorizeUrl: string; scope: string }> = {
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    scope: 'user:email',
  },
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
  },
  wechat: {
    authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect',
    scope: 'snsapi_login',
  },
  feishu: {
    authorizeUrl: 'https://open.feishu.cn/open-apis/authen/v1/authorize',
    scope: '',
  },
  alipay: {
    authorizeUrl: 'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm',
    scope: 'auth_user',
  },
  douyin: {
    authorizeUrl: 'https://open.douyin.com/platform/oauth/connect',
    scope: 'user_info',
  },
};

const brandStyles: Record<
  string,
  { bg: string; hoverBg: string; border: string; color: string }
> = {
  github: {
    bg: '#24292e',
    hoverBg: '#1b1f23',
    border: '#24292e',
    color: '#fff',
  },
  google: {
    bg: '#fff',
    hoverBg: '#f9fafb',
    border: '#e5e7eb',
    color: '#1a1a1a',
  },
  wechat: {
    bg: '#07c160',
    hoverBg: '#06ae56',
    border: '#07c160',
    color: '#fff',
  },
  feishu: {
    bg: '#3370ff',
    hoverBg: '#2860e6',
    border: '#3370ff',
    color: '#fff',
  },
  alipay: {
    bg: '#1677ff',
    hoverBg: '#0958d9',
    border: '#1677ff',
    color: '#fff',
  },
  douyin: { bg: '#000', hoverBg: '#1a1a1a', border: '#000', color: '#fff' },
  user: { bg: '#374151', hoverBg: '#1f2937', border: '#374151', color: '#fff' },
  staff: {
    bg: '#f97316',
    hoverBg: '#ea580c',
    border: '#f97316',
    color: '#fff',
  },
};

const generateState = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

const getCallbackBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || window.location.origin;
};

const buildOAuthURL = (connection: string, clientId: string): string => {
  const config = oauthConfigs[connection];
  if (!config || !clientId) return '';

  const state = generateState();
  sessionStorage.setItem('oauth_state', state);

  const redirectUri = `${getCallbackBaseUrl()}/${connection}/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state: state,
    response_type: 'code',
  });

  if (connection === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  if (connection === 'wechat') {
    params.set('appid', clientId);
    params.delete('client_id');
    return `${config.authorizeUrl}?${params.toString()}#wechat_redirect`;
  }

  return `${config.authorizeUrl}?${params.toString()}`;
};

const IDPIcons: Record<string, React.FC<{ style?: React.CSSProperties }>> = {
  user: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  ),
  staff: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
  ),
  github: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
  google: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  ),
  wechat: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.328.328 0 00.186-.059l2.002-1.185a.871.871 0 01.505-.144c.106 0 .21.012.313.036a9.91 9.91 0 002.618.35c.26 0 .518-.013.773-.034-.083-.298-.126-.606-.126-.92 0-3.635 3.532-6.585 7.89-6.585.259 0 .514.013.768.035C16.69 4.994 13.084 2.188 8.691 2.188zm-2.6 4.408c.57 0 1.034.463 1.034 1.034 0 .57-.464 1.034-1.035 1.034-.57 0-1.034-.464-1.034-1.034 0-.571.464-1.034 1.034-1.034zm5.07 0c.57 0 1.034.463 1.034 1.034 0 .57-.464 1.034-1.034 1.034-.571 0-1.035-.464-1.035-1.034 0-.571.464-1.034 1.035-1.034zm5.067 4.61c-3.852 0-6.977 2.603-6.977 5.813 0 3.211 3.125 5.813 6.977 5.813.71 0 1.395-.094 2.04-.266a.67.67 0 01.241-.044c.14 0 .276.039.395.113l1.56.923a.257.257 0 00.145.046c.125 0 .227-.103.227-.23 0-.055-.023-.111-.037-.165l-.305-1.154a.459.459 0 01.166-.519c1.43-1.049 2.345-2.604 2.345-4.317 0-3.21-3.126-5.813-6.977-5.813zm-2.234 3.5c.444 0 .804.36.804.804 0 .444-.36.805-.804.805a.804.804 0 01-.805-.805c0-.444.36-.804.805-.804zm4.468 0c.444 0 .805.36.805.804 0 .444-.361.805-.805.805a.804.804 0 01-.804-.805c0-.444.36-.804.804-.804z" />
    </svg>
  ),
  feishu: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.282 4.5c-.9 0-1.628.73-1.628 1.628v11.744c0 .9.729 1.628 1.628 1.628h11.436c.9 0 1.628-.729 1.628-1.628V6.128c0-.9-.729-1.628-1.628-1.628H6.282zm8.89 4.5l-4.445 4.445-2.222-2.222 4.444-4.445 2.222 2.222z" />
    </svg>
  ),
  alipay: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.422 15.358c-.463-.197-2.293-.879-3.922-1.465.602-1.197 1.061-2.489 1.327-3.831h-3.236V8.82h4.043V7.985h-4.043V5.804h-1.937c-.207 0-.376.169-.376.376v1.805H9.246v.835h4.032v1.242H9.93v.835h6.397c-.211 1.011-.541 1.982-.976 2.892-2.682-.893-5.519-1.441-5.519-.494 0 1.312 2.912 2.234 5.267 3.139.239.092.503.183.783.276a10.103 10.103 0 01-4.018 2.895c-.219.092-.164.386.073.386.896 0 2.858-.71 4.684-2.398 1.047.346 2.135.68 3.25.965.316.081.567-.246.386-.516-.334-.497-1.227-.877-2.433-1.399-.203-.088.008-.243.186-.195.991.261 3.192.833 3.591 1.241.149.153.4.116.505-.07a10.035 10.035 0 001.316-5.123v-.141c.003-.054-.003-.119-.003-.119zM3.024 4.508A2.487 2.487 0 00.538 6.994v10.012a2.487 2.487 0 002.486 2.486h17.952a2.487 2.487 0 002.486-2.486V6.994a2.487 2.487 0 00-2.486-2.486H3.024z" />
    </svg>
  ),
  douyin: ({ style }) => (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
};

const iconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  flexShrink: 0,
  display: 'block',
};

const IDPButton = ({
  connection,
  loading,
  disabled,
  onClick,
}: IDPButtonProps) => {
  const { connection: connName, strategy = [], identifier } = connection;

  const displayName = idpNames[connName] || connName;
  const IconComponent = IDPIcons[connName];
  const brand = brandStyles[connName] || brandStyles.google;

  const isOAuth = !!oauthConfigs[connName] && !!identifier;

  const handleClick = (selectedStrategy?: string) => {
    if (isOAuth && identifier) {
      const authURL = buildOAuthURL(connName, identifier);
      if (authURL) {
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = authURL;
        return;
      }
    }
    onClick(selectedStrategy || connName);
  };

  const buttonStyle = useMemo<React.CSSProperties>(
    () => ({
      width: 56,
      height: 56,
      minWidth: 56,
      maxWidth: 56,
      minHeight: 56,
      maxHeight: 56,
      padding: 0,
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${brand.border}`,
      background: brand.bg,
      color: brand.color,
      boxShadow: 'none',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    }),
    [brand]
  );

  const buttonStyles = useMemo<ButtonProps['styles']>(
    () => ({
      icon: { marginInlineEnd: 0 },
    }),
    []
  );

  const buttonContent = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {loading ? (
        <Spin
          indicator={
            <LoadingOutlined
              spin
              style={{ fontSize: 20, color: brand.color }}
            />
          }
        />
      ) : IconComponent ? (
        <IconComponent style={{ ...iconStyle, color: brand.color }} />
      ) : (
        <span
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#6b7280',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      {strategy.length > 1 && (
        <DownOutlined
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            fontSize: 8,
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        />
      )}
    </div>
  );

  if (strategy.length <= 1) {
    return (
      <Button
        type="text"
        style={buttonStyle}
        styles={buttonStyles}
        disabled={disabled || loading}
        onClick={() => handleClick(strategy[0])}
      >
        {buttonContent}
      </Button>
    );
  }

  const menuItems: MenuProps['items'] = strategy.map((s) => ({
    key: s,
    label: <span className={styles.menuItem}>{strategyNames[s] || s}</span>,
    onClick: () => handleClick(s),
  }));

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      disabled={disabled || loading}
    >
      <Button
        type="text"
        style={buttonStyle}
        styles={buttonStyles}
        disabled={disabled || loading}
      >
        {buttonContent}
      </Button>
    </Dropdown>
  );
};

export default IDPButton;
