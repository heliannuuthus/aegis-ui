import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Spin } from 'antd';
import api, { isRedirectAction } from '@/services/api';
import { isFlowExpiredError, restartAuthFlow, getErrorMessage } from '@/utils/error';
import { smartNavigate } from '@/utils/navigation';

import type { AuthError } from '@/types';
import styles from './index.module.scss';

/**
 * 授权入口页面
 * 接收 SDK 传递的授权参数，发起真正的 /api/authorize 请求
 *
 * URL 参数：
 * - client_id: 应用 Client ID（必填）
 * - audience: 目标服务 ID（必填）
 * - scope: 请求的 scope（必填）
 * - redirect_uri: 回调地址（可选）
 * - code_challenge: PKCE code_challenge（必填）
 * - code_challenge_method: PKCE 方法，固定为 S256（必填）
 * - state: 状态参数（必填）
 * - response_type: 响应类型，固定为 code（必填）
 */
const AuthorizePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initiatedRef = useRef(false);

  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;

    const initiateAuthorize = async () => {
      // 保存完整的 authorize URL，用于 flow 过期后重新发起
      sessionStorage.setItem('authorize_url', window.location.href);

      // 获取必要参数
      const clientId = searchParams.get('client_id');
      const audience = searchParams.get('audience');
      const scope = searchParams.get('scope');
      const codeChallenge = searchParams.get('code_challenge');
      const codeChallengeMethod = searchParams.get('code_challenge_method');
      const state = searchParams.get('state');
      const responseType = searchParams.get('response_type');
      const redirectUri = searchParams.get('redirect_uri');

      // 验证必要参数
      if (!clientId || !audience || !scope || !codeChallenge || !codeChallengeMethod || !state || !responseType) {
        setError('缺少必要的授权参数');
        setLoading(false);
        return;
      }

      if (responseType !== 'code') {
        setError('不支持的 response_type，仅支持 code');
        setLoading(false);
        return;
      }

      if (codeChallengeMethod !== 'S256') {
        setError('不支持的 code_challenge_method，仅支持 S256');
        setLoading(false);
        return;
      }

      try {
        // 构建授权请求参数（form data）
        const formData = new URLSearchParams({
          client_id: clientId,
          audience,
          scope,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          state,
          response_type: responseType,
        });

        if (redirectUri) {
          formData.set('redirect_uri', redirectUri);
        }

        // 发起 POST form 授权请求
        const response = await api.post('/authorize', formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        // 300 协议：后端统一通过 Location header 指示下一步
        if (isRedirectAction(response.data)) {
          // Authorize 阶段的 300：内部路径用 SPA 路由，外部路径用整页跳转
          smartNavigate(response.data.location, navigate);
        } else {
          navigate(`/login?${searchParams.toString()}`);
        }
      } catch (err: unknown) {
        const authError = err as AuthError;
        console.error('授权请求失败:', authError);

        if (isFlowExpiredError(authError)) {
          restartAuthFlow();
        } else {
          // authorize 接口返回 OAuth 2.0 标准错误体 {"error": "...", "error_description": "..."}
          const desc = authError.data?.error_description as string | undefined;
          const code = authError.data?.error as string | undefined;
          setError(desc || code || getErrorMessage(authError));
        }
      } finally {
        setLoading(false);
      }
    };

    initiateAuthorize();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.loading}>
            <Spin size="large" />
            <p>正在处理授权请求...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.error}>
            <h2>授权失败</h2>
            <p>{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default AuthorizePage;
