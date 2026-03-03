// ==================== Connection 配置 ====================

/** 连接类型 */
export type ConnectionType = 'idp' | 'vchan' | 'factor';

/**
 * Connection 前端公开的连接信息
 *
 * 字段说明：
 * - type: 连接类型（idp / vchan / factor）
 * - connection: 标识（github, google, wechat-mp, user, staff, email_otp, captcha...）
 * - identifier: 公开标识（client_id / site_key / rp_id）
 * - strategy: 登录策略（仅 user/staff 需要：password, webauthn）
 * - delegate: 可替代主认证的独立验证方式（email_otp, totp, webauthn），通过 Challenge 完成后以 ChallengeToken 作为 proof 登录
 * - require: 前置条件（captcha），登录前必须全部通过
 */
export interface Connection {
  /** 连接类型 */
  type: ConnectionType;
  /** Connection 标识 */
  connection: string;
  /** 公开标识（client_id / site_key / rp_id） */
  identifier?: string;
  /** 登录策略（user/staff: password, webauthn; captcha: turnstile） */
  strategy?: string[];
  /** 可替代主认证的独立验证方式（email_otp, totp, webauthn） */
  delegate?: string[];
  /** 前置条件（captcha） */
  require?: string[];
}

/**
 * Connections Map（按 ConnectionType 分类）
 *
 * JSON 示例: { "idp": [...], "vchan": [...], "factor": [...] }
 */
export type ConnectionsMap = Partial<Record<ConnectionType, Connection[]>>;

// ==================== Challenge 流程 ====================

/** Channel Type（验证方式） */
export type ChannelType = 'email_otp' | 'totp' | 'webauthn' | 'sms_otp' | 'tg_otp' | 'wechat-mp' | 'alipay-mp';

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
 * WebAuthn 注册响应（发送给服务端完成注册）
 */
export interface WebAuthnAttestationResponse {
  /** 凭证 ID（base64url 编码） */
  id: string;
  /** 原始凭证 ID（base64url 编码） */
  rawId: string;
  /** 凭证类型 */
  type: 'public-key';
  /** 注册响应数据 */
  response: {
    /** 认证器数据（base64url 编码） */
    attestationObject: string;
    /** 客户端数据 JSON（base64url 编码） */
    clientDataJSON: string;
    /** 传输方式 */
    transports?: string[];
  };
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
 * 前置条件配置
 */
export interface ChallengeRequiredConfig {
  /** 公开标识（如 site_key） */
  identifier?: string;
  /** 认证方式（如 turnstile） */
  strategy?: string[];
}

/**
 * Challenge 前置条件（对应后端 ChallengeRequired）
 * JSON 结构: {"captcha": {"identifier": "xxx", "strategy": ["turnstile"]}}
 */
export type ChallengeRequired = Record<string, ChallengeRequiredConfig>;

/**
 * 创建 Challenge 请求（三层模型：type / channel_type / channel）
 */
export interface CreateChallengeRequest {
  /** 应用 ID */
  client_id: string;
  /** 目标服务 ID */
  audience: string;
  /** 业务场景（验证类必填，交换类忽略）：verify / forget_password */
  type?: string;
  /** 验证方式 */
  channel_type: ChannelType;
  /** 验证目标（邮箱 / 手机号 / user_id / wx_code ...） */
  channel: string;
}

/**
 * 创建 Challenge 响应
 */
export interface CreateChallengeResponse {
  /** Challenge ID */
  challenge_id: string;
  /** 下次可重发的冷却时间（秒） */
  retry_after?: number;
  /** 前置条件（captcha 未验证时有值） */
  required?: ChallengeRequired;
  /** WebAuthn 公钥选项（channel_type=webauthn 时返回） */
  options?: Record<string, unknown>;
}

/**
 * 验证 Challenge 请求
 */
export interface VerifyChallengeRequest {
  /** 当前提交的验证类型（必填）：前置条件时为 connection 名（如 "captcha"），主验证时为 channel_type 名（如 "email_otp"） */
  type: string;
  /** 验证方式（如 "turnstile"），前置条件验证时必填 */
  strategy?: string;
  /** 验证证明（OTP code / captcha token / WebAuthn assertion） */
  proof: unknown;
}

/**
 * 验证 Challenge 响应
 */
export interface VerifyChallengeResponse {
  /** 是否验证成功 */
  verified: boolean;
  /** 验证成功后的凭证（用于 Login 的 proof） */
  challenge_token?: string;
  /** 前置未完成时引导渲染 */
  required?: ChallengeRequired;
}

/**
 * Challenge 响应（登录返回的，用于 ChallengeVerify 组件渲染）
 */
export interface ChallengeResponse {
  /** Challenge ID */
  challenge_id: string;
  /** Challenge 类型（email_otp, tg_otp, totp...） */
  type: string;
  /** 提示信息（如：验证码已发送到 h***@gmail.com） */
  hint?: string;
  /** 下次可重发的冷却时间（秒） */
  retry_after?: number;
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
  /** 重定向地址（携带 code 和 state） */
  location: string;
  /** Challenge 响应（需要 MFA 验证时返回） */
  challenge?: ChallengeResponse;
}

// ==================== 300 Action Redirect ====================

/**
 * 300 指令式重定向响应（前端拦截器解析 Location header 后生成）
 */
export interface RedirectAction {
  /** 原始 Location URL */
  location: string;
  /** 需要执行的 actions（从 ?action=captcha,totp 解析） */
  actions: string[];
  /** 其他 URL 参数 */
  params: Record<string, string>;
}

// ==================== 错误处理 ====================

/**
 * 错误响应
 * 前端仅依赖 HTTP status 做流程控制；data 仅特定场景携带（429/428）
 */
export interface AuthError {
  /** HTTP 状态码 */
  status: number;
  /** 附加数据（429: retry_after/challenge_id，428: required） */
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
  /** WebAuthn attestation 数据（finish 阶段） */
  [key: string]: unknown;
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

// ==================== 账户关联 ====================

/**
 * 被识别到的已有用户摘要
 */
export interface IdentifiedUser {
  /** 昵称 */
  nickname?: string;
  /** 头像 URL */
  picture?: string;
}

/**
 * 识别到已有用户的响应
 */
export interface IdentifyResponse {
  /** 当前登录的 IDP（github/google 等） */
  connection: string;
  /** 匹配到的已有用户 */
  user?: IdentifiedUser;
}

/**
 * 确认/取消关联请求
 */
export interface ConfirmIdentifyRequest {
  /** true=确认关联，false=取消 */
  confirm: boolean;
}
