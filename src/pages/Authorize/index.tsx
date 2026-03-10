import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import api, { isRedirectAction } from '@/services/api';
import {
  isFlowExpiredError,
  restartAuthFlow,
  getErrorMessage,
} from '@/utils/error';
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
 * - response_type: 响应类型（必填）
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
      sessionStorage.setItem('authorize_url', window.location.href);

      const clientId = searchParams.get('client_id');
      const audience = searchParams.get('audience');
      const scope = searchParams.get('scope');
      const codeChallenge = searchParams.get('code_challenge');
      const codeChallengeMethod = searchParams.get('code_challenge_method');
      const state = searchParams.get('state');
      const responseType = searchParams.get('response_type');
      const redirectUri = searchParams.get('redirect_uri');
      const audiencesRaw = searchParams.get('audiences');

      if (!clientId || !scope || !state || !responseType) {
        setError('缺少必要的授权参数');
        setLoading(false);
        return;
      }

      if (!audience && !audiencesRaw) {
        setError('必须指定 audience 或 audiences');
        setLoading(false);
        return;
      }

      if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
        setError('不支持的 code_challenge_method，仅支持 S256');
        setLoading(false);
        return;
      }

      let audiences: Record<string, { scope?: string }> | undefined;
      if (audiencesRaw) {
        try {
          audiences = JSON.parse(audiencesRaw);
        } catch {
          setError('audiences 参数格式无效');
          setLoading(false);
          return;
        }
      }

      try {
        let response;

        if (audiences) {
          // 多 audience：JSON POST，不传 audience
          const jsonBody: Record<string, unknown> = {
            client_id: clientId,
            scope,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            state,
            response_type: responseType,
            audiences,
          };
          if (redirectUri) jsonBody.redirect_uri = redirectUri;
          response = await api.post('/authorize', jsonBody);
        } else {
          // 单 audience：form-urlencoded POST，不传 audiences
          const formData = new URLSearchParams({
            client_id: clientId,
            audience: audience!,
            scope,
            response_type: responseType,
            state,
          });
          if (codeChallenge) formData.set('code_challenge', codeChallenge);
          if (codeChallengeMethod)
            formData.set('code_challenge_method', codeChallengeMethod);
          if (redirectUri) formData.set('redirect_uri', redirectUri);
          response = await api.post('/authorize', formData.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        }

        if (isRedirectAction(response.data)) {
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

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <Spin size="large" />
            <p>正在处理授权请求...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.error}>
            <div className={styles.errorIcon}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className={styles.errorTitle}>授权失败</h2>
            <p className={styles.errorMessage}>{error}</p>
            <button className={styles.errorAction} onClick={handleGoBack}>
              返回上一页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthorizePage;
