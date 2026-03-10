/**
 * OAuth 回调页面（iris 域名专用）
 * 路由: /auth/callback
 *
 * 处理 aegis-sdk 的 OAuth2 PKCE 回调：
 * 1. 从 URL 获取 code + state
 * 2. 调用 webAuth.handleRedirectCallback() 完成 token 交换
 * 3. 成功后跳转到目标页面
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spin, Result } from 'antd';
import { useAuth } from '@/providers/AuthProvider';
import { IRIS_AUTH_CONFIG } from '@/config/env';

const AuthCallbackPage = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const initiatedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;

    const handleCallback = async () => {
      const result = await auth.handleRedirectCallback();

      if (!result.success) {
        setError(result.error ?? '登录失败');
        return;
      }

      const redirectTo =
        result.redirectTo ?? IRIS_AUTH_CONFIG.defaultRedirectPath;
      navigate(redirectTo, { replace: true });
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Card style={{ maxWidth: 480 }}>
          <Result
            status="error"
            title="登录失败"
            subTitle={error}
            extra={
              <a href={IRIS_AUTH_CONFIG.defaultRedirectPath}>返回用户中心</a>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Card style={{ padding: '48px 32px', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>正在完成登录...</p>
      </Card>
    </div>
  );
};

export default AuthCallbackPage;
