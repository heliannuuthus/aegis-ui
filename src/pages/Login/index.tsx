import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { getConnections, getAuthContext, login, continueChallenge } from '@/services/api';
import { showError, shouldRedirectToError, getErrorMessage } from '@/utils/error';
import type {
  ConnectionsMap,
  ConnectionConfig,
  VChanConfig,
  LoginResponse,
  ChallengeResponse,
  AuthError,
  AuthContext,
} from '@/types';
import IDPButton from './components/IDPButton';
import EmailLogin from './components/EmailLogin';
import ChallengeVerify from './components/ChallengeVerify';
import OperLogin from './components/oper';
import styles from './index.module.scss';

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [connections, setConnections] = useState<ConnectionsMap>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);

  // 处理 URL 中的错误参数（来自 Callback 页面或其他页面的重定向）
  useEffect(() => {
    const errorCode = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorCode) {
      // 用 message 显示错误
      const errorMessage = errorDesc || getErrorMessage(errorCode);
      message.error(errorMessage);

      // 清除 URL 中的错误参数，保留其他参数
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      newParams.delete('error_description');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行获取认证上下文和连接配置
        const [authContextData, connectionsData] = await Promise.all([
          getAuthContext(),
          getConnections(),
        ]);
        setAuthContext(authContextData);
        setConnections(connectionsData);
      } catch (error) {
        console.error('获取登录信息失败:', error);
        const err = error as AuthError;
        if (shouldRedirectToError(err)) {
          navigate(`/error?error=${err.error}&error_description=${encodeURIComponent(err.error_description || '')}`);
        } else {
          showError(error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleLoginSuccess = (response: LoginResponse) => {
    if (response.redirect_uri) {
      window.location.href = response.redirect_uri;
    }
  };

  const handleLogin = async (
    connection: string,
    params: {
      strategy?: string;
      principal?: string;
      proof?: unknown;
    } = {}
  ) => {
    setLoginLoading(true);
    setActiveConnection(connection);

    try {
      const response = await login({
        connection,
        strategy: params.strategy,
        principal: params.principal,
        proof: params.proof,
      });

      if (response.challenge) {
        setChallenge(response.challenge);
      } else {
        handleLoginSuccess(response);
      }
    } catch (error: unknown) {
      const err = error as AuthError;
      if (shouldRedirectToError(err)) {
        navigate(`/error?error=${err.error}&error_description=${encodeURIComponent(err.error_description || '')}`);
      } else {
        showError(error);
      }
    } finally {
      setLoginLoading(false);
      setActiveConnection(null);
    }
  };

  const handleChallengeContinue = async (code: string) => {
    if (!challenge) return;

    setLoginLoading(true);
    try {
      // 1. 验证 Challenge，获取 challenge_token
      const verifyResponse = await continueChallenge(challenge.challenge_id, { code });
      if (!verifyResponse.verified) {
        message.error('验证失败，请重试');
        return;
      }

      // 2. 如果有 challenge_token，使用它调用 Login
      if (verifyResponse.challenge_token && challenge.connection && challenge.principal) {
        const loginResponse = await login({
          connection: challenge.connection,
          principal: challenge.principal,
          proof: verifyResponse.challenge_token,
        });
        
        if (loginResponse.challenge) {
          // 可能需要进一步验证
          setChallenge({
            ...loginResponse.challenge,
            connection: challenge.connection,
            principal: challenge.principal,
          });
        } else {
          handleLoginSuccess(loginResponse);
        }
      } else {
        // 没有 token（可能是 captcha 验证），只是刷新
        message.success('验证成功');
        setChallenge(null);
        window.location.reload();
      }
    } catch (error: unknown) {
      showError(error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChallengeCancel = () => {
    setChallenge(null);
  };

  // 分离 oper 连接单独处理
  const operConnection = (connections.idp ?? []).find((c) => c.connection === 'oper');

  // 检查 oper 是否应该显示（strategy 非空 或 有有效的 delegate）
  const shouldShowOper =
    operConnection &&
    ((operConnection.strategy ?? []).length > 0 ||
      (operConnection.delegate ?? []).some((mfa) =>
        (connections.mfa ?? []).some((m) => m.connection === mfa)
      ));

  // 需要邮箱输入的连接类型（仅 email 类型，没有 delegate 配置的 user）
  // 排除 oper，因为 oper 由 OperLogin 组件处理
  const emailConnections: ConnectionConfig[] = (connections.idp ?? []).filter(
    (c) =>
      c.connection === 'email' ||
      (c.connection === 'user' && (!c.delegate || c.delegate.length === 0))
  );

  // IDP 连接（社交登录按钮）
  // 排除 oper（由 OperLogin 组件处理）和 emailConnections 中的连接
  const idpConnections: ConnectionConfig[] = (connections.idp ?? []).filter(
    (c) =>
      c.connection !== 'oper' &&
      !(c.strategy ?? []).includes('mp') &&
      !emailConnections.some((ec) => ec.connection === c.connection)
  );

  // Captcha 配置（connection 格式为 captcha:provider，如 captcha:turnstile）
  const captchaConfig: VChanConfig | undefined = (connections.vchan ?? []).find(
    (c) => c.connection.startsWith('captcha:')
  );

  const hasConnections =
    idpConnections.length > 0 || emailConnections.length > 0 || shouldShowOper;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingState}>
            <Spin indicator={<LoadingOutlined spin />} size="large" />
            <p>正在加载...</p>
          </div>
        </div>
      </div>
    );
  }

  if (challenge) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <ChallengeVerify
            challenge={challenge}
            loading={loginLoading}
            onContinue={handleChallengeContinue}
            onCancel={handleChallengeCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          {authContext?.application?.logo_url ? (
            <img src={authContext.application.logo_url} alt={authContext.application?.name} />
          ) : (
            <svg viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#374151" />
              <path
                d="M16 8L8 12V20L16 24L24 20V12L16 8Z"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="16" cy="15" r="3" fill="white" />
              <path d="M14.5 17H17.5V21H14.5V17Z" fill="white" />
            </svg>
          )}
        </div>

        {/* 标题 */}
        <h1 className={clsx(styles.title, !authContext?.service?.description && styles.noSubtitle)}>
          登录到 {authContext?.application?.name || 'Aegis'}
        </h1>
        {authContext?.service?.description && (
          <p className={styles.subtitle}>{authContext.service.description}</p>
        )}

        {/* 登录内容 */}
        <div className={styles.content}>
          {/* Oper 登录（运营账号） */}
          {shouldShowOper && operConnection && (
            <div className={styles.formSection}>
              <OperLogin
                connection={operConnection}
                mfaConnections={connections.mfa ?? []}
                captchaConfig={captchaConfig}
                loading={loginLoading && activeConnection === 'oper'}
                disabled={loginLoading}
                onLogin={handleLoginSuccess}
                onChallenge={setChallenge}
              />
            </div>
          )}

          {/* 分隔线 - Oper 和其他登录方式之间 */}
          {shouldShowOper && (emailConnections.length > 0 || idpConnections.length > 0) && (
            <div className={styles.divider}>
              <span>或</span>
            </div>
          )}

          {/* 邮箱登录（user 和 email 类型） */}
          {emailConnections.length > 0 && (
            <div className={styles.formSection}>
              {emailConnections.map((conn) => (
                <EmailLogin
                  key={conn.connection}
                  connection={conn}
                  captchaConfig={captchaConfig}
                  loading={loginLoading && activeConnection === conn.connection}
                  disabled={loginLoading}
                  onLogin={(principal, proof) =>
                    handleLogin(conn.connection, { principal, proof })
                  }
                />
              ))}
            </div>
          )}

          {/* 分隔线 - 邮箱登录和社交登录之间 */}
          {emailConnections.length > 0 && idpConnections.length > 0 && (
            <div className={styles.divider}>
              <span>或</span>
            </div>
          )}

          {/* 社交登录 */}
          {idpConnections.length > 0 && (
            <div className={styles.socialSection}>
              {idpConnections.map((conn) => (
                <IDPButton
                  key={conn.connection}
                  connection={conn}
                  loading={loginLoading && activeConnection === conn.connection}
                  disabled={loginLoading}
                  onClick={(strategy) =>
                    handleLogin(conn.connection, { strategy })
                  }
                />
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!hasConnections && (
            <div className={styles.emptyState}>
              <p>暂无可用的登录方式</p>
            </div>
          )}
        </div>

        {/* 页脚 */}
        <div className={styles.footer}>
          <span>
            登录即表示您同意
            <a href="/terms" target="_blank" rel="noopener noreferrer">服务条款</a>
            和
            <a href="/privacy" target="_blank" rel="noopener noreferrer">隐私政策</a>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
