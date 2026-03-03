import { useEffect, useRef } from 'react';
import { Card, Spin } from 'antd';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { login, isRedirectAction } from '@/services/api';
import { isFlowExpiredError, restartAuthFlow, getErrorMessage } from '@/utils/error';
import { smartNavigate } from '@/utils/navigation';
import type { AuthError } from '@/types';
import styles from './index.module.scss';

/**
 * OAuth 回调页面
 * 处理第三方 IDP 登录后的回调
 * 路由: /:connection/callback
 *
 * 流程:
 * 1. 从 URL path 获取 connection
 * 2. 从 URL query 获取 code 和 state
 * 3. 验证 state（与 sessionStorage 中存储的对比）
 * 4. 调用 Login API，将 code 作为 proof
 * 5. 重定向到最终目标
 */
function CallbackPage() {
  const { connection } = useParams<{ connection: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initiatedRef = useRef(false);

  /** 跳转到登录页并通过 state 传递错误消息 */
  const navigateToLoginWithError = (errorMessage: string) => {
    navigate('/login', { state: { errorMessage } });
  };

  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // IDP 返回的错误（如用户取消授权），跳回登录页
      if (error) {
        navigateToLoginWithError(errorDescription || error);
        return;
      }

      if (!code || !connection) {
        navigateToLoginWithError('缺少必要的回调参数');
        return;
      }

      // 验证 state（CSRF 防护）
      const savedState = sessionStorage.getItem('oauth_state');
      if (!savedState || savedState !== state) {
        navigateToLoginWithError('登录状态验证失败，请重试');
        return;
      }

      sessionStorage.removeItem('oauth_state');

      try {
        const response = await login({
          connection: connection,
          proof: code,
        });

        if (isRedirectAction(response)) {
          // 内部路径用 SPA 路由，外部路径用整页跳转
          smartNavigate(response.location, navigate);
        } else if (response.location) {
          smartNavigate(response.location, navigate);
        } else {
          navigate('/');
        }
      } catch (err: unknown) {
        const authError = err as AuthError;
        if (isFlowExpiredError(authError)) {
          restartAuthFlow();
          return;
        }
        navigateToLoginWithError(getErrorMessage(authError));
      }
    };

    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
