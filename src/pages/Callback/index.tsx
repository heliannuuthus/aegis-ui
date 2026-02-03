import { useEffect } from 'react';
import { Card, Spin } from 'antd';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { login } from '@/services/api';
import { shouldRedirectToError } from '@/utils/error';
import type { AuthError } from '@/types';
import styles from './index.module.scss';

/**
 * OAuth 回调页面
 * 处理第三方 IDP 登录后的回调
 * 路由: /auth/:connection/callback
 */
function CallbackPage() {
  const { connection } = useParams<{ connection: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /**
   * 跳转到登录页并携带错误信息
   * 非致命错误使用 message 提示，用户可以重试
   */
  const navigateToLoginWithError = (error: string, errorDescription?: string) => {
    navigate(`/login?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`);
  };

  /**
   * 跳转到错误页面
   * 仅用于无法恢复的致命错误
   */
  const navigateToErrorPage = (error: string, errorDescription?: string) => {
    navigate(`/error?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`);
  };

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // 如果有错误（来自 IDP 的错误），跳回登录页显示错误
      if (error) {
        // access_denied 通常是用户在 IDP 页面取消了授权，跳回登录页即可
        navigateToLoginWithError(error, errorDescription || undefined);
        return;
      }

      // 如果没有 code 或 connection，也是错误
      if (!code || !connection) {
        navigateToLoginWithError('invalid_request', '缺少必要的回调参数');
        return;
      }

      // 验证 state（CSRF 防护）
      const savedState = sessionStorage.getItem('oauth_state');
      const savedConnection = sessionStorage.getItem('oauth_connection');

      if (!savedState || savedState !== state) {
        navigateToLoginWithError('state_mismatch', 'OAuth 状态验证失败，请重试');
        return;
      }

      // 验证 connection 是否匹配
      if (savedConnection && savedConnection !== connection) {
        navigateToLoginWithError('connection_mismatch', '登录方式不匹配，请重试');
        return;
      }

      // 清理 sessionStorage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_connection');

      try {
        // 调用 login 接口，通过 proof 传递 code
        const response = await login({
          connection,
          proof: code,
        });

        // 如果有 redirect_uri，跳转到最终目标
        if (response.redirect_uri) {
          window.location.href = response.redirect_uri;
        } else {
          // 如果没有 redirect_uri，跳转到首页
          navigate('/');
        }
      } catch (err: unknown) {
        const authError = err as AuthError;
        // 只有真正中断流程的错误才跳转到错误页面
        if (shouldRedirectToError(authError)) {
          navigateToErrorPage(authError.error, authError.error_description);
        } else {
          // 其他错误跳回登录页，用 message 提示用户重试
          navigateToLoginWithError(
            authError.error || 'login_failed',
            authError.error_description || '登录失败，请重试'
          );
        }
      }
    };

    handleCallback();
  }, [connection, searchParams, navigate]);

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.loading}>
          <Spin size="large" />
          <p>正在处理登录...</p>
        </div>
      </Card>
    </div>
  );
}

export default CallbackPage;
