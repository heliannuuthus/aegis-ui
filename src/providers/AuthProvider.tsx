/**
 * Iris Auth Provider
 *
 * 仅在 iris.heliannuuthus.com 域名下启用。
 * 通过 aegis-sdk 的 WebAuth 实例管理 OAuth2 Bearer Token 认证。
 */

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { createWebAuth } from '@aegis/sdk/web';
import type { WebAuth } from '@aegis/sdk/web';
import {
  getAegisEndpoint,
  getCallbackUri,
  IRIS_AUTH_CONFIG,
} from '@/config/env';

interface AuthContextValue {
  /** aegis-sdk WebAuth 实例 */
  auth: WebAuth;
  /** 是否已完成初始化检查 */
  ready: boolean;
  /** 是否已认证 */
  authenticated: boolean;
  /** 触发登录跳转 */
  login: () => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** 创建单例 WebAuth 实例 */
let webAuthInstance: WebAuth | null = null;

function getWebAuth(): WebAuth {
  if (!webAuthInstance) {
    webAuthInstance = createWebAuth({
      endpoint: getAegisEndpoint(),
      clientId: IRIS_AUTH_CONFIG.clientId,
      redirectUri: getCallbackUri(),
      defaultAudience: IRIS_AUTH_CONFIG.audience,
      defaultScopes: [...IRIS_AUTH_CONFIG.defaultScopes],
      defaultAudiences: {
        [IRIS_AUTH_CONFIG.audience]: {
          scope: IRIS_AUTH_CONFIG.defaultScopes.join(' '),
        },
      },
      profileEndpoint: window.location.origin,
      profileAudience: IRIS_AUTH_CONFIG.audience,
      defaultRedirectPath: IRIS_AUTH_CONFIG.defaultRedirectPath,
      debug: import.meta.env.DEV,
    });
  }
  return webAuthInstance;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authRef = useRef(getWebAuth());
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = authRef.current;
      const isAuth = await auth.isAuthenticated();
      setAuthenticated(isAuth);
      setReady(true);
    };
    checkAuth();
  }, []);

  const login = async () => {
    const auth = authRef.current;
    await auth.loginWithRedirect({
      audience: IRIS_AUTH_CONFIG.audience,
      scopes: [...IRIS_AUTH_CONFIG.defaultScopes],
    });
  };

  const logout = async () => {
    const auth = authRef.current;
    await auth.logout({ returnTo: getAegisEndpoint() });
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        auth: authRef.current,
        ready,
        authenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** 获取 Auth 上下文（仅 iris 域名下可用） */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
