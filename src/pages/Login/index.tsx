import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  getConnections,
  getAuthContext,
  login,
  continueChallenge,
  initiateChallenge,
} from '@/services/api';
import { showError, isFlowExpiredError, restartAuthFlow, getErrorMessage } from '@/utils/error';
import { passkeyUserCache } from '@/utils/passkeyCache';
import type {
  ConnectionsMap,
  Connection,
  LoginResponse,
  ChallengeResponse,
  AuthError,
  AuthContext,
} from '@/types';
import IDPButton from './components/IDPButton';
import ChallengeVerify from './components/ChallengeVerify';
import OperLogin from './components/oper';
import Passkey from './components/Passkey';
import SecurityMask from './components/SecurityMask';
import { isWebAuthnSupported, isConditionalUISupported, isPlatformAuthenticatorAvailable } from './components/WebAuthn';
import {
  convertToPublicKeyOptions,
  convertAssertionResponse,
  performWebAuthnAssertion,
  performConditionalMediation,
} from './components/WebAuthn/utils';
import styles from './index.module.scss';

const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [connections, setConnections] = useState<ConnectionsMap>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);

  // 安全验证遮罩状态
  const [showSecurityMask, setShowSecurityMask] = useState(false);
  const cachedUser = useMemo(() => passkeyUserCache.get(), []);

  // Oper 登录步骤状态（用于控制社交登录等区块的显示）
  const [operStep, setOperStep] = useState<'email' | 'verify'>('email');

  // Conditional UI (Passkey 自动填充) 的 AbortController
  const conditionalAbortRef = useRef<AbortController | null>(null);

  // 处理 URL 中的错误参数（来自 OAuth 回调失败等场景）
  useEffect(() => {
    const errorCode = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorCode) {
      const errorMessage = errorDesc || getErrorMessage(errorCode);
      message.error(errorMessage);

      // 清除 URL 中的错误参数
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
        if (isFlowExpiredError(err)) {
          restartAuthFlow();
          return;
        }
        showError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSuccess = useCallback((response: LoginResponse) => {
    if (response.location) {
      window.location.href = response.location;
    }
  }, []);

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
      if (isFlowExpiredError(err)) {
        restartAuthFlow();
        return;
      }
      showError(error);
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
      const verifyResponse = await continueChallenge(challenge.challenge_id, { proof: code });
      if (!verifyResponse.verified) {
        // 检查是否有前置条件未完成
        if (verifyResponse.required) {
          message.warning('请先完成前置验证');
          return;
        }
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

  // 独立 Passkey IDP 连接
  const passkeyConnection = useMemo(
    () => (connections.idp ?? []).find((c) => c.connection === 'passkey'),
    [connections]
  );

  // 检查 oper 是否应该显示（strategy 非空 或 有有效的 delegate）
  const shouldShowOper =
    operConnection &&
    ((operConnection.strategy ?? []).length > 0 ||
      (operConnection.delegate ?? []).some((d) =>
        (connections.factor ?? []).some((m) => m.connection === d)
      ));

  // oper 是否已经处理 Passkey（有 passkey delegate 且 factor 中有 passkey）
  const operHandlesPasskey =
    shouldShowOper &&
    (operConnection?.delegate ?? []).includes('passkey') &&
    (connections.factor ?? []).some((m) => m.connection === 'passkey');

  // 页面级是否需要处理独立 Passkey IDP（oper 不处理时才由页面处理）
  const shouldPageHandlePasskey =
    !!passkeyConnection && !operHandlesPasskey && isWebAuthnSupported();

  // IDP 连接（社交登录按钮）
  // 排除 oper（由 OperLogin 组件处理）、passkey（单独处理）、email 和无 delegate 的 user（由 oper 统一处理）
  const idpConnections: Connection[] = (connections.idp ?? []).filter(
    (c) =>
      c.connection !== 'oper' &&
      c.connection !== 'passkey' &&
      c.connection !== 'email' &&
      !(c.connection === 'user' && (!c.delegate || c.delegate.length === 0)) &&
      !(c.strategy ?? []).includes('mp')
  );

  // Captcha 配置（connection 值为 "captcha"）
  const captchaConfig: Connection | undefined = (connections.vchan ?? []).find(
    (c) => c.connection === 'captcha'
  );

  // 安全验证遮罩三条件判断：缓存 + 平台认证器 + passkey connection
  useEffect(() => {
    if (loading || !cachedUser || !passkeyConnection) return;

    let cancelled = false;
    isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled && available) {
        setShowSecurityMask(true);
      }
    });
    return () => { cancelled = true; };
  }, [loading, cachedUser, passkeyConnection]);

  // 辅助函数：执行 Passkey WebAuthn 登录流程
  const performPasskeyLogin = useCallback(async (
    options?: { signal?: AbortSignal; conditional?: boolean }
  ) => {
    if (!authContext?.application?.app_id || !authContext?.service?.service_id) {
      throw new Error('认证上下文不完整');
    }

    // 1. 创建 WebAuthn challenge（后端返回 challenge_id + options）
    const challengeResp = await initiateChallenge({
      client_id: authContext.application.app_id,
      audience: authContext.service.service_id,
      type: 'login',
      channel_type: 'webauthn',
      channel: '',
    });

    // 2. 转换 options 并执行 WebAuthn assertion
    // 注意：后端需要在 CreateChallengeResponse 中返回 WebAuthn options
    // 当前通过 challenge_id 获取 options 可能需要后端额外接口支持
    const publicKeyOptions = convertToPublicKeyOptions((challengeResp as any).options);
    const credential = options?.conditional
      ? await performConditionalMediation(publicKeyOptions, options.signal!)
      : await performWebAuthnAssertion(publicKeyOptions);
    const assertionResponse = convertAssertionResponse(credential);

    // 3. 验证凭证
    const verifyResponse = await continueChallenge(challengeResp.challenge_id, {
      proof: JSON.stringify(assertionResponse),
    });

    if (!verifyResponse.verified || !verifyResponse.challenge_token) {
      throw new Error('验证失败');
    }

    // 4. 使用 challenge_token 完成登录
    const loginResponse = await login({
      connection: 'passkey',
      proof: verifyResponse.challenge_token,
    });

    return loginResponse;
  }, [authContext]);

  // 安全验证遮罩的 Passkey 登录处理
  const handleSecurityMaskLogin = useCallback(async () => {
    // 终止正在运行的 Conditional UI
    conditionalAbortRef.current?.abort();
    conditionalAbortRef.current = null;

    const loginResponse = await performPasskeyLogin();

    if (loginResponse.challenge) {
      setChallenge(loginResponse.challenge);
    } else {
      handleLoginSuccess(loginResponse);
    }
  }, [performPasskeyLogin, handleLoginSuccess]);

  // 关闭安全验证遮罩，切换到普通登录
  const handleSecurityMaskSwitch = useCallback(() => {
    setShowSecurityMask(false);
  }, []);

  // 页面级 Conditional UI：在浏览器自动填充中显示 Passkey 选项
  // 当安全验证遮罩显示时，不启动 Conditional UI
  useEffect(() => {
    if (!shouldPageHandlePasskey || loading || showSecurityMask) return;

    const abortController = new AbortController();
    conditionalAbortRef.current = abortController;

    const startConditionalUI = async () => {
      const supported = await isConditionalUISupported();
      if (!supported || abortController.signal.aborted) return;

      try {
        const loginResponse = await performPasskeyLogin({
          signal: abortController.signal,
          conditional: true,
        });
        if (abortController.signal.aborted) return;

        if (loginResponse.challenge) {
          setChallenge(loginResponse.challenge);
        } else {
          handleLoginSuccess(loginResponse);
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.debug('Page conditional UI:', error);
      }
    };

    startConditionalUI();

    return () => {
      abortController.abort();
      conditionalAbortRef.current = null;
    };
  }, [shouldPageHandlePasskey, loading, showSecurityMask, performPasskeyLogin, handleLoginSuccess]);

  // 手动点击 Passkey 按钮登录（模态弹窗模式）
  const handleManualPasskeyLogin = useCallback(async () => {
    // 终止正在运行的 Conditional UI
    conditionalAbortRef.current?.abort();
    conditionalAbortRef.current = null;

    setLoginLoading(true);
    setActiveConnection('passkey');
    try {
      const loginResponse = await performPasskeyLogin();

      if (loginResponse.challenge) {
        setChallenge(loginResponse.challenge);
      } else {
        handleLoginSuccess(loginResponse);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== 'NotAllowedError' && !error.message.includes('cancel')) {
          showError(error);
        }
      }
    } finally {
      setLoginLoading(false);
      setActiveConnection(null);
    }
  }, [performPasskeyLogin, handleLoginSuccess]);

  const hasConnections =
    idpConnections.length > 0 ||
    shouldShowOper ||
    shouldPageHandlePasskey;

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

        {/* 安全验证遮罩 */}
        {showSecurityMask && cachedUser ? (
          <SecurityMask
            userHint={cachedUser}
            onLogin={handleSecurityMaskLogin}
            onSwitch={handleSecurityMaskSwitch}
          />
        ) : (
        <>
        {/* 标题 */}
        <h1 className={clsx(styles.title, !authContext?.service?.description && styles.noSubtitle)}>
          登录到 {authContext?.application?.name || 'Aegis'}
        </h1>
        {authContext?.service?.description && (
          <p className={styles.subtitle}>{authContext.service.description}</p>
        )}

        {/* 登录内容 */}
        <div className={styles.content}>
          {/* 独立指纹/面容登录（非 oper delegate，优先展示） */}
          {shouldPageHandlePasskey && (
            <div className={styles.formSection}>
              <Passkey
                onClick={handleManualPasskeyLogin}
                loading={loginLoading && activeConnection === 'passkey'}
                disabled={loginLoading}
              />
            </div>
          )}

          {/* 分隔线 - 指纹/面容和 Oper 之间 */}
          {shouldPageHandlePasskey && shouldShowOper && (
            <div className={styles.divider}>
              <span>或</span>
            </div>
          )}

          {/* Oper 登录（邮箱 + 验证方式） */}
          {shouldShowOper && operConnection && (
            <div className={styles.formSection}>
              <OperLogin
                connection={operConnection}
                delegatedConnections={connections.factor ?? []}
                captchaConfig={captchaConfig}
                authContext={authContext}
                loading={loginLoading && activeConnection === 'oper'}
                disabled={loginLoading}
                onLogin={handleLoginSuccess}
                onChallenge={setChallenge}
                onStepChange={setOperStep}
              />
            </div>
          )}

          {/* 分隔线 - Oper 和社交登录之间（用户进入验证步骤后隐藏） */}
          {operStep === 'email' && (shouldShowOper || shouldPageHandlePasskey) && idpConnections.length > 0 && (
            <div className={styles.divider}>
              <span>或</span>
            </div>
          )}

          {/* 社交登录（用户进入验证步骤后隐藏） */}
          {operStep === 'email' && idpConnections.length > 0 && (
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
        </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
