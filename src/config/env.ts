/**
 * 域名感知配置
 *
 * aegis-ui 同时服务两个域名：
 * - aegis.heliannuuthus.com → 认证 UI（Cookie 认证）
 * - iris.heliannuuthus.com  → 用户中心 UI（OAuth Bearer Token 认证）
 */

const AEGIS_HOSTNAME = 'aegis.heliannuuthus.com';
const IRIS_HOSTNAME = 'iris.heliannuuthus.com';

/** 当前是否为 iris 域名 */
export function isIrisDomain(): boolean {
  return window.location.hostname === IRIS_HOSTNAME;
}

/** 当前是否为 aegis 域名 */
export function isAegisDomain(): boolean {
  return window.location.hostname === AEGIS_HOSTNAME;
}

/** aegis 认证服务地址（用于 aegis-sdk endpoint） */
export function getAegisEndpoint(): string {
  return `${window.location.protocol}//${AEGIS_HOSTNAME}`;
}

/** iris API 基础地址（nginx 会将 /api/ 映射到后端 /user/） */
export function getIrisApiBase(): string {
  return '/api';
}

/** Challenge 验证的固定 audience（身份验证归属 iris 用户服务） */
export const CHALLENGE_AUDIENCE = 'iris';

/** aegis-sdk 配置 */
export const IRIS_AUTH_CONFIG = {
  /** 平台个人中心在 hermes 注册的 client_id */
  clientId: 'piris',
  /** iris 服务的 audience 名称 */
  audience: 'iris',
  /** OAuth 默认 scopes */
  defaultScopes: ['openid', 'profile', 'email'],
  /** OAuth 回调路径 */
  callbackPath: '/auth/callback',
  /** 登录后默认跳转路径 */
  defaultRedirectPath: '/user/profile',
} as const;

/** 获取 OAuth 回调 URI（完整地址） */
export function getCallbackUri(): string {
  return `${window.location.origin}${IRIS_AUTH_CONFIG.callbackPath}`;
}
