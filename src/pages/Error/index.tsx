import { Button } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import styles from './index.module.scss';

/** 错误类型 */
type ErrorType = 'error' | 'warning' | 'info';

/** 错误配置 */
interface ErrorConfig {
  title: string;
  subTitle: string;
  icon: React.ReactNode;
  type: ErrorType;
  suggestion?: string;
  canRetry?: boolean;
}

// 图标组件
const ErrorIcons = {
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  disconnect: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  server: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  ),
};

// 错误类型配置
const errorConfig: Record<string, ErrorConfig> = {
  // 400 Bad Request
  invalid_request: {
    title: '请求参数有误',
    subTitle: '请求中包含无效或缺失的参数',
    icon: ErrorIcons.warning,
    type: 'warning',
    suggestion: '请检查请求参数后重试，或联系应用开发者',
    canRetry: true,
  },
  invalid_scope: {
    title: '权限范围无效',
    subTitle: '请求的权限范围不被支持',
    icon: ErrorIcons.shield,
    type: 'warning',
    suggestion: '请检查应用配置的权限范围',
    canRetry: false,
  },
  invalid_grant: {
    title: '授权已失效',
    subTitle: '授权码已过期或已被使用',
    icon: ErrorIcons.clock,
    type: 'warning',
    suggestion: '请重新发起登录请求',
    canRetry: true,
  },
  client_not_found: {
    title: '应用不存在',
    subTitle: '请求的应用未注册或已被删除',
    icon: ErrorIcons.disconnect,
    type: 'error',
    suggestion: '请联系应用管理员确认应用配置',
    canRetry: false,
  },
  service_not_found: {
    title: '服务不存在',
    subTitle: '请求的目标服务未注册或已被删除',
    icon: ErrorIcons.disconnect,
    type: 'error',
    suggestion: '请联系服务管理员确认服务配置',
    canRetry: false,
  },
  // 401 Unauthorized
  unauthorized: {
    title: '身份未验证',
    subTitle: '请先登录后再进行操作',
    icon: ErrorIcons.lock,
    type: 'error',
    suggestion: '请重新登录后继续',
    canRetry: true,
  },
  invalid_token: {
    title: '令牌无效',
    subTitle: '访问令牌格式错误或已损坏',
    icon: ErrorIcons.stop,
    type: 'error',
    suggestion: '请重新登录获取新的令牌',
    canRetry: true,
  },
  invalid_client: {
    title: '客户端无效',
    subTitle: '应用配置不正确或已被禁用',
    icon: ErrorIcons.disconnect,
    type: 'error',
    suggestion: '请联系应用管理员',
    canRetry: false,
  },
  expired_token: {
    title: '令牌已过期',
    subTitle: '您的登录状态已失效',
    icon: ErrorIcons.clock,
    type: 'warning',
    suggestion: '请重新登录以继续使用',
    canRetry: true,
  },
  token_revoked: {
    title: '令牌已撤销',
    subTitle: '访问令牌已被主动撤销',
    icon: ErrorIcons.stop,
    type: 'warning',
    suggestion: '请重新登录',
    canRetry: true,
  },
  insufficient_authentication: {
    title: '认证级别不足',
    subTitle: '当前操作需要更高级别的身份验证',
    icon: ErrorIcons.shield,
    type: 'warning',
    suggestion: '请完成额外的身份验证',
    canRetry: true,
  },
  // 403 Forbidden
  access_denied: {
    title: '访问被拒绝',
    subTitle: '您没有权限访问此资源',
    icon: ErrorIcons.stop,
    type: 'error',
    suggestion: '请联系管理员获取访问权限',
    canRetry: false,
  },
  invalid_origin: {
    title: '来源不被允许',
    subTitle: '请求来源未在白名单中',
    icon: ErrorIcons.link,
    type: 'error',
    suggestion: '请从正确的应用入口访问',
    canRetry: false,
  },
  origin_mismatch: {
    title: '来源不匹配',
    subTitle: '请求来源与应用配置不符',
    icon: ErrorIcons.link,
    type: 'error',
    suggestion: '请检查访问地址是否正确',
    canRetry: false,
  },
  // 404 Not Found
  not_found: {
    title: '资源不存在',
    subTitle: '请求的资源未找到',
    icon: ErrorIcons.error,
    type: 'error',
    canRetry: false,
  },
  user_not_found: {
    title: '用户不存在',
    subTitle: '未找到该用户账号',
    icon: ErrorIcons.user,
    type: 'error',
    suggestion: '请检查账号是否正确，或注册新账号',
    canRetry: true,
  },
  // 412 Precondition Failed
  flow_not_found: {
    title: '登录会话不存在',
    subTitle: '登录流程已失效或从未创建',
    icon: ErrorIcons.disconnect,
    type: 'warning',
    suggestion: '请从应用重新发起登录',
    canRetry: true,
  },
  flow_expired: {
    title: '登录会话已过期',
    subTitle: '登录流程已超时',
    icon: ErrorIcons.clock,
    type: 'warning',
    suggestion: '请重新开始登录流程',
    canRetry: true,
  },
  flow_invalid: {
    title: '登录会话异常',
    subTitle: '登录流程状态不正确',
    icon: ErrorIcons.warning,
    type: 'warning',
    suggestion: '请清除浏览器缓存后重试',
    canRetry: true,
  },
  login_required: {
    title: '需要登录',
    subTitle: '当前操作需要先完成登录',
    icon: ErrorIcons.lock,
    type: 'warning',
    suggestion: '请登录后继续',
    canRetry: true,
  },
  // 422 Unprocessable Entity
  no_connection_available: {
    title: '无可用登录方式',
    subTitle: '该应用未配置任何登录方式',
    icon: ErrorIcons.disconnect,
    type: 'warning',
    suggestion: '请联系应用管理员配置登录方式',
    canRetry: false,
  },
  identity_required: {
    title: '需要绑定身份',
    subTitle: '请先完成必要的身份绑定',
    icon: ErrorIcons.user,
    type: 'warning',
    suggestion: '请按提示完成身份绑定',
    canRetry: true,
  },
  interaction_required: {
    title: '需要人机验证',
    subTitle: '请完成安全验证以继续',
    icon: ErrorIcons.shield,
    type: 'info',
    suggestion: '请完成验证码验证',
    canRetry: true,
  },
  // 500 Internal Server Error
  server_error: {
    title: '服务暂时不可用',
    subTitle: '服务器遇到了一些问题',
    icon: ErrorIcons.server,
    type: 'error',
    suggestion: '请稍后重试，如问题持续请联系技术支持',
    canRetry: true,
  },
  // 网络错误
  network_error: {
    title: '网络连接失败',
    subTitle: '无法连接到服务器',
    icon: ErrorIcons.disconnect,
    type: 'error',
    suggestion: '请检查网络连接后重试',
    canRetry: true,
  },
};

function ErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const errorCode = searchParams.get('error') || 'server_error';
  const errorDescription = searchParams.get('error_description');

  const config: ErrorConfig = errorConfig[errorCode] || {
    title: '发生错误',
    subTitle: errorDescription || '请求处理过程中发生错误',
    icon: ErrorIcons.error,
    type: 'error',
    canRetry: true,
  };

  const handleRetry = () => {
    navigate('/login');
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 图标区域 */}
        <div className={clsx(styles.iconContainer, styles[config.type])}>
          <div className={styles.iconWrapper}>
            {config.icon}
          </div>
          <div className={styles.iconRing} />
          <div className={styles.iconPulse} />
        </div>

        {/* 内容区域 */}
        <div className={styles.content}>
          <h1 className={styles.title}>{config.title}</h1>
          <p className={styles.description}>
            {errorDescription || config.subTitle}
          </p>

          {config.suggestion && (
            <div className={styles.suggestion}>
              <svg viewBox="0 0 20 20" fill="currentColor" className={styles.suggestionIcon}>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              <span>{config.suggestion}</span>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className={styles.actions}>
          <Button
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className={styles.backButton}
          >
            返回上一页
          </Button>
          {config.canRetry !== false && (
            <Button
              type="primary"
              size="large"
              icon={<ReloadOutlined />}
              onClick={handleRetry}
              className={styles.retryButton}
            >
              重新登录
            </Button>
          )}
        </div>

        {/* 调试信息（仅开发环境） */}
        {import.meta.env.DEV && (
          <div className={styles.debug}>
            <div className={styles.debugHeader}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>调试信息</span>
            </div>
            <div className={styles.debugContent}>
              <div className={styles.debugItem}>
                <span className={styles.debugLabel}>错误码</span>
                <code className={styles.debugValue}>{errorCode}</code>
              </div>
              {errorDescription && (
                <div className={styles.debugItem}>
                  <span className={styles.debugLabel}>描述</span>
                  <code className={styles.debugValue}>{errorDescription}</code>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorPage;
