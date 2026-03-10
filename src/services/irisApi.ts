/**
 * Iris API 服务层
 *
 * iris 域名下使用 aegis-sdk 的 Bearer Token 调用后端 /user/* 接口。
 * nginx 会将 iris.heliannuuthus.com/api/* 映射到后端 /user/*。
 */

import type { WebAuth } from '@heliannuuthus/aegis-sdk/web';
import { IRIS_AUTH_CONFIG, getIrisApiBase } from '@/config/env';
import type {
  UserProfile,
  UpdateProfileRequest,
  MFAStatusResponse,
  SetupMFARequest,
  SetupTOTPResponse,
  SetupWebAuthnBeginResponse,
  SetupWebAuthnFinishResponse,
  VerifyMFARequest,
  VerifyWebAuthnBeginResponse,
  UpdateMFARequest,
  DeleteMFARequest,
  Identity,
} from '@/types';

const AUDIENCE = IRIS_AUTH_CONFIG.audience;

/** 获取 Bearer Token 请求头 */
async function authHeaders(auth: WebAuth): Promise<Record<string, string>> {
  const token = await auth.getAccessToken(AUDIENCE);
  if (!token) {
    throw new Error('未认证：无法获取 iris access token');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** 统一请求封装 */
async function request<T>(
  auth: WebAuth,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await authHeaders(auth);
  const url = `${getIrisApiBase()}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const desc = (errorData.error_description ??
      errorData.error ??
      `请求失败: ${response.status}`) as string;
    const err = Object.assign(new Error(desc), {
      status: response.status,
      data: errorData,
    });
    throw err;
  }

  return response.json() as Promise<T>;
}

// ==================== 用户信息 ====================

export async function getProfile(auth: WebAuth): Promise<UserProfile> {
  return request<UserProfile>(auth, 'GET', '/profile');
}

export async function updateProfile(
  auth: WebAuth,
  data: UpdateProfileRequest
): Promise<UserProfile> {
  return request<UserProfile>(auth, 'PATCH', '/profile', data);
}

// ==================== MFA ====================

export async function getMFAStatus(auth: WebAuth): Promise<MFAStatusResponse> {
  return request<MFAStatusResponse>(auth, 'GET', '/mfa');
}

export async function setupMFA(
  auth: WebAuth,
  data: SetupMFARequest
): Promise<
  SetupTOTPResponse | SetupWebAuthnBeginResponse | SetupWebAuthnFinishResponse
> {
  return request(auth, 'POST', '/mfa', data);
}

export async function verifyMFA(
  auth: WebAuth,
  data: VerifyMFARequest
): Promise<{ success: boolean } | VerifyWebAuthnBeginResponse> {
  return request(auth, 'PUT', '/mfa', data);
}

export async function updateMFA(
  auth: WebAuth,
  data: UpdateMFARequest
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(auth, 'PATCH', '/mfa', data);
}

export async function deleteMFA(
  auth: WebAuth,
  data: DeleteMFARequest
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(auth, 'DELETE', '/mfa', {
    ...data,
  });
}

// ==================== 第三方身份 ====================

export async function getIdentities(
  auth: WebAuth
): Promise<{ identities: Identity[] }> {
  return request<{ identities: Identity[] }>(auth, 'GET', '/identities');
}

export async function unbindIdentity(
  auth: WebAuth,
  idp: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    auth,
    'DELETE',
    `/identities/${encodeURIComponent(idp)}`
  );
}
