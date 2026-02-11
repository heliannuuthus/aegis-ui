import axios, { AxiosError } from 'axios';
import type {
  ConnectionsMap,
  LoginRequest,
  LoginResponse,
  CreateChallengeRequest,
  CreateChallengeResponse,
  VerifyChallengeRequest,
  VerifyChallengeResponse,
  AuthError,
  AuthContext,
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

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // 携带 aegis-session Cookie
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<AuthError>) => {
    if (error.response?.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({
      error: 'network_error',
      error_description: error.message,
    });
  }
);

/**
 * 获取当前流程的认证上下文信息
 */
export const getAuthContext = async (): Promise<AuthContext> => {
  const response = await api.get<AuthContext>('/context');
  return response.data;
};

/**
 * 获取可用的 Connections Map
 * 返回按关系角色分类的 connections：idp、required、delegated
 */
export const getConnections = async (): Promise<ConnectionsMap> => {
  const response = await api.get<ConnectionsMap>('/connections');
  return response.data;
};

/**
 * 发起登录（可能返回 challenge）
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/login', data);
  return response.data;
};

/**
 * 发起 Challenge（三层模型：type / channel_type / channel）
 */
export const initiateChallenge = async (
  data: CreateChallengeRequest
): Promise<CreateChallengeResponse> => {
  const response = await api.post<CreateChallengeResponse>('/challenge', data);
  return response.data;
};

/**
 * 继续 Challenge（提交验证）
 * @param challengeId Challenge ID（路径参数）
 * @param data 验证数据（{ type?, proof }）
 */
export const continueChallenge = async (
  challengeId: string,
  data: VerifyChallengeRequest
): Promise<VerifyChallengeResponse> => {
  const response = await api.post<VerifyChallengeResponse>(
    `/challenge/${encodeURIComponent(challengeId)}`,
    data
  );
  return response.data;
};

// ==================== 用户个人中心 API ====================

/**
 * 获取用户资料
 */
export const getProfile = async (): Promise<UserProfile> => {
  const response = await api.get<UserProfile>('/user/profile');
  return response.data;
};

/**
 * 更新用户资料
 */
export const updateProfile = async (data: UpdateProfileRequest): Promise<UserProfile> => {
  const response = await api.put<UserProfile>('/user/profile', data);
  return response.data;
};

/**
 * 获取 MFA 状态
 */
export const getMFAStatus = async (): Promise<MFAStatusResponse> => {
  const response = await api.get<MFAStatusResponse>('/user/mfa');
  return response.data;
};

/**
 * 设置 MFA
 */
export const setupMFA = async (
  data: SetupMFARequest
): Promise<SetupTOTPResponse | SetupWebAuthnBeginResponse | SetupWebAuthnFinishResponse> => {
  const response = await api.post('/user/mfa', data);
  return response.data;
};

/**
 * 验证 MFA
 */
export const verifyMFA = async (
  data: VerifyMFARequest
): Promise<{ success: boolean } | VerifyWebAuthnBeginResponse> => {
  const response = await api.put('/user/mfa', data);
  return response.data;
};

/**
 * 更新 MFA 状态（启用/禁用）
 */
export const updateMFA = async (data: UpdateMFARequest): Promise<{ success: boolean }> => {
  const response = await api.patch('/user/mfa', data);
  return response.data;
};

/**
 * 删除 MFA
 */
export const deleteMFA = async (data: DeleteMFARequest): Promise<{ success: boolean }> => {
  const response = await api.delete('/user/mfa', { data });
  return response.data;
};

/**
 * 获取绑定的第三方身份
 */
export const getIdentities = async (): Promise<{ identities: Identity[] }> => {
  const response = await api.get('/user/identities');
  return response.data;
};

/**
 * 解绑第三方身份
 */
export const unbindIdentity = async (idp: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/user/identities/${idp}`);
  return response.data;
};

export default api;
