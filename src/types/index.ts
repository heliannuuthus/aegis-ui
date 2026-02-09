// ==================== Connection 配置 ====================

/**
 * 通用 Connection 配置
 * 适用于所有类型：IDP、VChan、MFA
 *
 * 字段说明：
 * - connection: 标识（github, google, wechat-mp, user, oper, email_otp, captcha-turnstile...）
 * - identifier: 公开标识（client_id / site_key / rp_id）
 * - strategy: 登录策略（仅 user/oper 需要：password）
 * - delegate: 委托验证方式（可替代 strategy 的 MFA：email_otp, webauthn）
 * - require: 前置验证（captcha）
 */
export interface ConnectionConfig {
  /** Connection 标识 */
  connection: string;
  /** 公开标识（client_id / site_key / rp_id） */
  identifier?: string;
  /** 登录策略（仅 user/oper：password） */
  strategy?: string[];
  /** 委托验证/可替代策略的 MFA（email_otp, webauthn） */
  delegate?: string[];
  /** 前置验证要求（captcha） */
  require?: string[];
}

/**
 * VChan 配置（验证渠道，如 captcha）
 * 与 ConnectionConfig 结构相同，但语义上是验证渠道
 */
export type VChanConfig = ConnectionConfig;

/**
 * MFA 配置
 * 与 ConnectionConfig 结构相同，但语义上是 MFA
 */
export type MFAConfig = ConnectionConfig;

/**
 * Connections Map（按类别分类）
 *
 * - IDP: 身份提供商（github, google, user, oper, wechat-mp...）
 * - VChan: 验证渠道/前置验证（captcha-turnstile...）
 * - MFA: 多因素认证方式（email_otp, webauthn...），delegate 引用的配置
 */
export interface ConnectionsMap {
  /** 身份提供商 */
  idp?: ConnectionConfig[];
  /** 验证渠道（前置验证，如 captcha） */
  vchan?: VChanConfig[];
  /** MFA 验证方式（delegate 引用的配置） */
  mfa?: MFAConfig[];
}

// ==================== Challenge 流程 ====================

/** Challenge 类型 */
export type ChallengeType = 'captcha' | 'totp' | 'email' | 'webauthn';

// ==================== WebAuthn 相关 ====================

/**
 * WebAuthn 凭证描述符
 */
export interface WebAuthnCredentialDescriptor {
  /** 凭证类型 */
  type: 'public-key';
  /** 凭证 ID（base64url 编码） */
  id: string;
  /** 传输方式 */
  transports?: ('usb' | 'nfc' | 'ble' | 'internal' | 'hybrid')[];
}

/**
 * WebAuthn Challenge 选项（服务端返回）
 */
export interface WebAuthnRequestOptions {
  /** Challenge（base64url 编码） */
  challenge: string;
  /** RP ID */
  rpId: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 用户验证要求 */
  userVerification?: 'required' | 'preferred' | 'discouraged';
  /** 允许的凭证列表 */
  allowCredentials?: WebAuthnCredentialDescriptor[];
}

/**
 * WebAuthn Challenge 响应
 */
export interface WebAuthnChallengeResponse {
  /** Challenge ID */
  challenge_id: string;
  /** Challenge 类型 */
  type: 'webauthn';
  /** 过期时间（秒） */
  expires_in?: number;
  /** WebAuthn 请求选项 */
  options: WebAuthnRequestOptions;
}

/**
 * WebAuthn 认证响应（发送给服务端验证）
 */
export interface WebAuthnAssertionResponse {
  /** 凭证 ID（base64url 编码） */
  id: string;
  /** 原始凭证 ID（base64url 编码） */
  rawId: string;
  /** 凭证类型 */
  type: 'public-key';
  /** 认证响应数据 */
  response: {
    /** 认证器数据（base64url 编码） */
    authenticatorData: string;
    /** 客户端数据 JSON（base64url 编码） */
    clientDataJSON: string;
    /** 签名（base64url 编码） */
    signature: string;
    /** 用户句柄（base64url 编码，可选） */
    userHandle?: string;
  };
}

/**
 * 创建 Challenge 请求
 */
export interface CreateChallengeRequest {
  /** Challenge 类型 */
  type: ChallengeType;
  /** 关联的 AuthFlow ID */
  flow_id?: string;
  /** 关联的用户 ID */
  user_id?: string;
  /** email 类型时必填 */
  email?: string;
  /** captcha 前置验证 token */
  captcha_token?: string;
}

/**
 * 创建 Challenge 响应
 */
export interface CreateChallengeResponse {
  /** Challenge ID */
  challenge_id: string;
  /** Challenge 类型 */
  type: string;
  /** 过期时间（秒） */
  expires_in: number;
  /** 额外数据（如 captcha 的 site_key，email 的 masked_email） */
  data?: Record<string, unknown>;
}

/**
 * 验证 Challenge 请求
 */
export interface VerifyChallengeRequest {
  /** 验证码（totp/email） */
  code?: string;
  /** Captcha token */
  token?: string;
}

/**
 * 验证 Challenge 响应
 */
export interface VerifyChallengeResponse {
  /** 是否验证成功 */
  verified: boolean;
  /** 后续 Challenge ID（captcha 验证后创建的 email challenge） */
  challenge_id?: string;
  /** 验证成功后的凭证（用于 Login 的 proof） */
  challenge_token?: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/**
 * 需要前置验证的响应
 */
export interface RequireResponse {
  error: 'require_config';
  require: {
    type: string;
    config?: Record<string, unknown>;
  };
}

/**
 * Challenge 响应（登录返回的）
 */
export interface ChallengeResponse {
  /** Challenge ID */
  challenge_id: string;
  /** Challenge 类型（email_otp, tg_otp, totp...） */
  type: string;
  /** 提示信息（如：验证码已发送到 h***@gmail.com） */
  hint?: string;
  /** 过期时间（秒） */
  expires_in?: number;
  /** 关联的 Connection（用于后续 Login） */
  connection?: string;
  /** 关联的 Principal（用于后续 Login） */
  principal?: string;
}

// ==================== 请求/响应 ====================

/**
 * 登录请求
 */
export interface LoginRequest {
  /** Connection 标识（必填） */
  connection: string;
  /** 登录策略（可选，用于同一 connection 多种策略的情况） */
  strategy?: string;
  /** 身份主体（用户名/邮箱/手机号/OpenID...） */
  principal?: string;
  /** 凭证证明（OAuth code / captcha token / OTP 等） */
  proof?: unknown;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  /** 授权码 */
  code?: string;
  /** 重定向 URI */
  redirect_uri?: string;
  /** Challenge 响应（需要 MFA 验证时返回） */
  challenge?: ChallengeResponse;
}

// ==================== 错误处理 ====================

/**
 * 错误响应
 */
export interface AuthError {
  error: string;
  error_description?: string;
  data?: Record<string, unknown>;
}

// ==================== Flow 信息 ====================

/**
 * 应用信息
 */
export interface ApplicationInfo {
  /** 应用 ID */
  app_id: string;
  /** 应用名称 */
  name: string;
  /** 应用 Logo URL */
  logo_url?: string;
}

/**
 * 服务信息
 */
export interface ServiceInfo {
  /** 服务 ID */
  service_id: string;
  /** 服务名称 */
  name: string;
  /** 服务描述 */
  description?: string;
}

/**
 * Flow 信息（当前认证流程的应用和服务信息）
 */
export interface AuthContext {
  /** 应用信息 */
  application?: ApplicationInfo;
  /** 服务信息 */
  service?: ServiceInfo;
}

// ==================== 用户个人中心 ====================

/**
 * 用户资料
 */
export interface UserProfile {
  /** 用户 ID */
  id: string;
  /** 昵称 */
  nickname?: string;
  /** 头像 URL */
  picture?: string;
  /** 邮箱 */
  email?: string;
  /** 邮箱是否已验证 */
  email_verified: boolean;
  /** 手机号 */
  phone?: string;
}

/**
 * MFA 状态
 */
export interface MFAStatus {
  /** TOTP 是否启用 */
  totp_enabled: boolean;
  /** WebAuthn 凭证数量 */
  webauthn_count: number;
  /** Passkey 凭证数量 */
  passkey_count: number;
}

/**
 * 凭证摘要
 */
export interface CredentialSummary {
  /** 凭证 ID */
  id: number;
  /** 凭证类型 */
  type: 'totp' | 'webauthn' | 'passkey';
  /** 是否启用 */
  enabled: boolean;
  /** 凭证标识（部分显示） */
  credential_id?: string;
  /** 最后使用时间 */
  last_used_at?: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * MFA 状态响应
 */
export interface MFAStatusResponse {
  status: MFAStatus;
  credentials: CredentialSummary[];
}

/**
 * 设置 MFA 请求
 */
export interface SetupMFARequest {
  /** MFA 类型 */
  type: 'totp' | 'webauthn' | 'passkey';
  /** 操作阶段（WebAuthn 专用） */
  action?: 'begin' | 'finish';
  /** 应用名称（TOTP 专用） */
  app_name?: string;
  /** Challenge ID（WebAuthn finish 阶段） */
  challenge_id?: string;
}

/**
 * 设置 MFA 响应 - TOTP
 */
export interface SetupTOTPResponse {
  type: 'totp';
  credential_id: number;
  secret: string;
  otpauth_uri: string;
}

/**
 * 设置 MFA 响应 - WebAuthn Begin
 */
export interface SetupWebAuthnBeginResponse {
  type: 'webauthn' | 'passkey';
  action: 'begin';
  options: PublicKeyCredentialCreationOptions;
  challenge_id: string;
}

/**
 * 设置 MFA 响应 - WebAuthn Finish
 */
export interface SetupWebAuthnFinishResponse {
  type: 'webauthn' | 'passkey';
  action: 'finish';
  success: boolean;
  credential_id: string;
}

/**
 * 验证 MFA 请求
 */
export interface VerifyMFARequest {
  /** MFA 类型 */
  type: 'totp' | 'webauthn' | 'passkey';
  /** 操作阶段（WebAuthn 专用） */
  action?: 'begin' | 'finish';
  /** TOTP 验证码 */
  code?: string;
  /** 凭证 ID（TOTP 确认时） */
  credential_id?: number;
  /** 是否为首次确认（TOTP） */
  confirm?: boolean;
  /** Challenge ID（WebAuthn finish 阶段） */
  challenge_id?: string;
}

/**
 * 验证 MFA 响应 - WebAuthn Begin
 */
export interface VerifyWebAuthnBeginResponse {
  type: 'webauthn' | 'passkey';
  action: 'begin';
  options: PublicKeyCredentialRequestOptions;
  challenge_id: string;
}

/**
 * 更新 MFA 请求
 */
export interface UpdateMFARequest {
  type: 'totp' | 'webauthn' | 'passkey';
  credential_id?: string;
  enabled: boolean;
}

/**
 * 删除 MFA 请求
 */
export interface DeleteMFARequest {
  type: 'totp' | 'webauthn' | 'passkey';
  credential_id?: string;
}

/**
 * 第三方身份
 */
export interface Identity {
  /** IDP 标识 */
  idp: string;
  /** 绑定时间 */
  created_at: string;
}

/**
 * 更新资料请求
 */
export interface UpdateProfileRequest {
  nickname?: string;
  picture?: string;
}
