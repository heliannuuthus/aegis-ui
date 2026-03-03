import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image, Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  getConnections,
  getAuthContext,
  login,
  continueChallenge,
  initiateChallenge,
  isRedirectAction,
} from '@/services/api';
import { showError, isFlowExpiredError, restartAuthFlow, isRateLimitError, getRateLimitData } from '@/utils/error';
import { CHALLENGE_AUDIENCE } from '@/config/env';
import { smartNavigate } from '@/utils/navigation';
import { passkeyUserCache } from '@/utils/passkeyCache';
import type {
  ConnectionsMap,
  Connection,
  LoginResponse,
  RedirectAction,
  ChallengeResponse,
  AuthError,
  AuthContext,
  WebAuthnRequestOptions,
} from '@/types';
import IDPButton from './components/IDPButton';
import ChallengeVerify from './components/ChallengeVerify';
import StaffLogin from './components/staff';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [connections, setConnections] = useState<ConnectionsMap>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);

  // 300 action redirect: 后端指示的待完成 actions（seq 递增确保每次 300 都能触发 effect）
  const [pendingActions, setPendingActions] = useState<{ seq: number; actions: string[] }>({ seq: 0, actions: [] });
  const pendingSeqRef = useRef(0);

  // 安全验证遮罩状态
  const [showSecurityMask, setShowSecurityMask] = useState(false);
  const cachedUser = useMemo(() => passkeyUserCache.get(), []);

  // Staff 登录步骤状态（用于控制社交登录等区块的显示）
  const [staffStep, setStaffStep] = useState<'email' | 'verify'>('email');

  // Conditional UI (Passkey 自动填充) 的 AbortController
  const conditionalAbortRef = useRef<AbortController | null>(null);

  // 处理来自 Callback 等页面通过 navigate state 传递的错误消息
  useEffect(() => {
    const state = location.state as { errorMessage?: string } | null;
    if (state?.errorMessage) {
      message.error(state.errorMessage);
      // 清除 state 防止刷新后重复显示
      window.history.replaceState({}, '');
    }
  }, [location.state]);

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

  // 预加载 Turnstile 脚本，减少 captcha 弹出时的延迟
  useEffect(() => {
    const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    
    // 检查是否已经加载
    if (document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = TURNSTILE_SCRIPT_URL;
    link.as = 'script';
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, []);

  // Session 定时续期：定期调用 getAuthContext 触发后端滑动窗口续期
  useEffect(() => {
    if (loading) return;

    const KEEPALIVE_INTERVAL = 5 * 60 * 1000; // 5 分钟（后端 Cookie MaxAge 默认 10 分钟）
    const timer = setInterval(async () => {
      try {
        await getAuthContext();
      } catch (error) {
        const err = error as AuthError;
        if (isFlowExpiredError(err)) {
          restartAuthFlow();
        }
      }
    }, KEEPALIVE_INTERVAL);

    return () => clearInterval(timer);
  }, [loading]);

  /** 处理 300 RedirectAction 响应 */
  const handleRedirectAction = useCallback((action: RedirectAction) => {
    // identify action → 跳转到关联确认页
    if (action.actions.includes('identify')) {
      navigate('/binding');
      return;
    }
    if (action.actions.length > 0) {
      // 后端指示需要完成某些 actions（如 captcha），seq 递增保证每次都触发 effect
      pendingSeqRef.current += 1;
      setPendingActions({ seq: pendingSeqRef.current, actions: action.actions });
    } else {
      // 无 action，直接跳转（最终成功或页面切换）
      // 内部路径用 SPA 路由，外部路径（如回调到 atlas）用整页跳转
      smartNavigate(action.location, navigate);
    }
  }, [navigate]);

  const handleLoginSuccess = useCallback((response: LoginResponse) => {
    if (response.location) {
      // 登录成功后的跳转：内部路径用 SPA 路由，外部路径用整页跳转
      smartNavigate(response.location, navigate);
    }
  }, [navigate]);

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

      if (isRedirectAction(response)) {
        handleRedirectAction(response);
      } else if (response.challenge) {
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
      // 1. 验证 Challenge，获取 challenge_token（type = challenge 的 channel_type）
      const verifyResponse = await continueChallenge(challenge.challenge_id, {
        type: challenge.type,
        proof: code,
      });

      // 2. 前置条件未完成（验证失败后被追加 captcha 等）
      if (verifyResponse.required?.conditions?.length) {
        message.warning('请先完成前置验证');
        return;
      }

      if (!verifyResponse.verified) {
        message.error('验证失败，请重试');
        return;
      }

      // 3. 如果有 challenge_token，使用它调用 Login
      if (verifyResponse.challenge_token && challenge.connection && challenge.principal) {
        const loginResponse = await login({
          connection: challenge.connection,
          principal: challenge.principal,
          proof: verifyResponse.challenge_token,
        });
        
        if (isRedirectAction(loginResponse)) {
          handleRedirectAction(loginResponse);
        } else if (loginResponse.challenge) {
          setChallenge({
            ...loginResponse.challenge,
            connection: challenge.connection,
            principal: challenge.principal,
          });
        } else {
          handleLoginSuccess(loginResponse);
        }
      }
    } catch (error: unknown) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else {
        showError(error);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChallengeCancel = () => {
    setChallenge(null);
  };

  // 分离 staff 连接单独处理
  const staffConnection = (connections.idp ?? []).find((c) => c.connection === 'staff');

  // 独立 Passkey IDP 连接
  const passkeyConnection = useMemo(
    () => (connections.idp ?? []).find((c) => c.connection === 'passkey'),
    [connections]
  );

  // 检查 staff 是否应该显示（strategy 非空 或 有有效的 delegate）
  const shouldShowStaff =
    staffConnection &&
    ((staffConnection.strategy ?? []).length > 0 ||
      (staffConnection.delegate ?? []).some((d) =>
        (connections.factor ?? []).some((m) => m.connection === d)
      ));

  // staff 是否已经处理 Passkey（有 passkey delegate 且 factor 中有 passkey）
  const staffHandlesPasskey =
    shouldShowStaff &&
    (staffConnection?.delegate ?? []).includes('passkey') &&
    (connections.factor ?? []).some((m) => m.connection === 'passkey');

  // 页面级是否需要处理独立 Passkey IDP（staff 不处理时才由页面处理）
  const shouldPageHandlePasskey =
    !!passkeyConnection && !staffHandlesPasskey && isWebAuthnSupported();

  // IDP 连接（社交登录按钮）
  // 排除 staff/oper（由 StaffLogin 组件处理）、passkey（单独处理）、email 和无 delegate 的 user（由 staff 统一处理）
  const idpConnections: Connection[] = (connections.idp ?? []).filter(
    (c) =>
      c.connection !== 'staff' &&
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
      audience: CHALLENGE_AUDIENCE,
      type: 'passkey:verify',
      channel_type: 'webauthn',
      channel: '',
    });

    // 2. 转换 options 并执行 WebAuthn assertion
    // 注意：后端需要在 CreateChallengeResponse 中返回 WebAuthn options
    // 当前通过 challenge_id 获取 options 可能需要后端额外接口支持
    if (!challengeResp.options) throw new Error('WebAuthn options missing from challenge response');
    const publicKeyOptions = convertToPublicKeyOptions(challengeResp.options as unknown as WebAuthnRequestOptions);
    const credential = options?.conditional
      ? await performConditionalMediation(publicKeyOptions, options.signal!)
      : await performWebAuthnAssertion(publicKeyOptions);
    const assertionResponse = convertAssertionResponse(credential);

    // 3. 验证凭证（type = webauthn）
    const verifyResponse = await continueChallenge(challengeResp.challenge_id, {
      type: 'webauthn',
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

    try {
      const loginResponse = await performPasskeyLogin();

      if (isRedirectAction(loginResponse)) {
        handleRedirectAction(loginResponse);
      } else if (loginResponse.challenge) {
        setChallenge(loginResponse.challenge);
      } else {
        handleLoginSuccess(loginResponse);
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else if (error instanceof Error) {
        if (error.name !== 'NotAllowedError' && !error.message.includes('cancel')) {
          showError(error);
        }
      }
    }
  }, [performPasskeyLogin, handleLoginSuccess, handleRedirectAction]);

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

        if (isRedirectAction(loginResponse)) {
          handleRedirectAction(loginResponse);
        } else if (loginResponse.challenge) {
          setChallenge(loginResponse.challenge);
        } else {
          handleLoginSuccess(loginResponse);
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        if (isRateLimitError(error)) {
          const info = getRateLimitData(error);
          message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
        } else {
          console.debug('Page conditional UI:', error);
        }
      }
    };

    startConditionalUI();

    return () => {
      abortController.abort();
      conditionalAbortRef.current = null;
    };
  }, [shouldPageHandlePasskey, loading, showSecurityMask, performPasskeyLogin, handleLoginSuccess, handleRedirectAction]);

  // 手动点击 Passkey 按钮登录（模态弹窗模式）
  const handleManualPasskeyLogin = useCallback(async () => {
    // 终止正在运行的 Conditional UI
    conditionalAbortRef.current?.abort();
    conditionalAbortRef.current = null;

    setLoginLoading(true);
    setActiveConnection('passkey');
    try {
      const loginResponse = await performPasskeyLogin();

      if (isRedirectAction(loginResponse)) {
        handleRedirectAction(loginResponse);
      } else if (loginResponse.challenge) {
        setChallenge(loginResponse.challenge);
      } else {
        handleLoginSuccess(loginResponse);
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        const info = getRateLimitData(error);
        message.warning(`请求过于频繁，请 ${info?.retryAfter || 60} 秒后重试`);
      } else if (error instanceof Error) {
        if (error.name !== 'NotAllowedError' && !error.message.includes('cancel')) {
          showError(error);
        }
      }
    } finally {
      setLoginLoading(false);
      setActiveConnection(null);
    }
  }, [performPasskeyLogin, handleLoginSuccess, handleRedirectAction]);

  const hasConnections =
    idpConnections.length > 0 ||
    shouldShowStaff ||
    shouldPageHandlePasskey;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingState}>
            <Spin indicator={<LoadingOutlined spin style={{ fontSize: 32 }} />} />
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
            <Image
              src={authContext.application.logo_url}
              alt={authContext.application?.name}
              preview={false}
              width={48}
              height={48}
              styles={{
                root: { width: 48, height: 48, display: 'flex' },
                image: { width: 48, height: 48, borderRadius: 12, objectFit: 'contain' },
              }}
            />
          ) : (
            <svg viewBox="0 0 32 32" fill="none" width={48} height={48}>
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
          {/* 独立指纹/面容登录（非 staff delegate，优先展示） */}
          {shouldPageHandlePasskey && (
            <div className={styles.formSection}>
              <Passkey
                onClick={handleManualPasskeyLogin}
                loading={loginLoading && activeConnection === 'passkey'}
                disabled={loginLoading}
              />
            </div>
          )}

          {/* 分隔线 - 指纹/面容和 Staff 之间 */}
          {shouldPageHandlePasskey && shouldShowStaff && (
            <div className={styles.divider}>
              <span>或</span>
            </div>
          )}

          {/* Staff 登录（邮箱 + 验证方式） */}
          {shouldShowStaff && staffConnection && (
            <div className={styles.formSection}>
              <StaffLogin
                connection={staffConnection}
                delegatedConnections={connections.factor ?? []}
                captchaConfig={captchaConfig}
                authContext={authContext}
                loading={loginLoading && activeConnection === 'staff'}
                disabled={loginLoading}
                pendingActions={pendingActions}
                onLogin={handleLoginSuccess}
                onRedirectAction={handleRedirectAction}
                onChallenge={setChallenge}
                onStepChange={setStaffStep}
              />
            </div>
          )}

          {/* 分隔线 - Staff 和社交登录之间（用户进入验证步骤后隐藏） */}
          {staffStep === 'email' && (shouldShowStaff || shouldPageHandlePasskey) && idpConnections.length > 0 && (
            <div className={styles.divider}>
              <span>或</span>
            </div>
          )}

          {/* 社交登录（用户进入验证步骤后隐藏） */}
          {staffStep === 'email' && idpConnections.length > 0 && (
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
