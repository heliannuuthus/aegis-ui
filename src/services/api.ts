import axios, { AxiosError } from 'axios';
import type {
  ConnectionsMap,
  LoginRequest,
  LoginResponse,
  RedirectAction,
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
  IdentifyResponse,
  ConfirmIdentifyRequest,
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // 携带 aegis-session Cookie
  validateStatus: (status) => (status >= 200 && status < 300) || status === 300,
});

/**
 * 解析 300 响应的 Location header 为 RedirectAction
 */
function parseRedirectAction(location: string): RedirectAction {
  const url = new URL(location, window.location.origin);
  const params = Object.fromEntries(url.searchParams);
  const actions = (params.actions || '').split(',').filter(Boolean);
  const { actions: _, ...rest } = params;
  return {
    location,
    actions,
    params: rest,
  };
}

// 响应拦截器：300 解析为 RedirectAction，4xx/5xx 转为 AuthError
api.interceptors.response.use(
  (response) => {
    if (response.status === 300) {
      const location = response.headers['location'];
      if (!location) {
        return Promise.reject({ status: 0 } satisfies AuthError);
      }
      response.data = parseRedirectAction(location);
    }
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const authError: AuthError = {
      status,
      data: typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined,
    };
    return Promise.reject(authError);
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
 * 发起登录
 * 300 → RedirectAction（前端需要执行 action 或跳转）
 * 200 → LoginResponse（辅助验证完成等）
 * 4xx → 抛出 AuthError
 */
export const login = async (data: LoginRequest): Promise<LoginResponse | RedirectAction> => {
  const response = await api.post<LoginResponse | RedirectAction>('/login', data);
  return response.data;
};

/** 类型守卫：判断响应是否为 RedirectAction */
export function isRedirectAction(data: unknown): data is RedirectAction {
  return (
    typeof data === 'object' &&
    data !== null &&
    'actions' in data &&
    'location' in data &&
    Array.isArray((data as RedirectAction).actions)
  );
}

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
 * @param data 验证数据（{ type, proof }）— type 必填：前置条件时为 connection 名（如 "captcha"），主验证时为 channel_type 名（如 "email_otp"）
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

// ==================== 账户关联（Account Linking）API ====================

/**
 * 获取识别到的已有用户信息
 * 仅在 flow 存在已识别用户时返回数据（HasIdentifiedUser: User != nil && State == Initialized）
 */
export const getIdentifyContext = async (): Promise<IdentifyResponse> => {
  const response = await api.get<IdentifyResponse>('/binding');
  return response.data;
};

/**
 * 确认或取消账户关联
 * confirm=true：将新 IDP 身份关联到已有用户，完成登录
 * confirm=false：取消关联，回到登录页
 */
export const confirmIdentify = async (
  data: ConfirmIdentifyRequest
): Promise<RedirectAction> => {
  const response = await api.post<RedirectAction>('/binding', data);
  return response.data;
};

export default api;
