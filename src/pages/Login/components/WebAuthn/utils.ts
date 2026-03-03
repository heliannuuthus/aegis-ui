import type { WebAuthnRequestOptions, WebAuthnAssertionResponse, WebAuthnAttestationResponse } from '@/types';

/**
 * Base64URL 解码为 ArrayBuffer
 */
export const base64URLToBuffer = (base64url: string): ArrayBuffer => {
  // 将 base64url 转换为 base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // 补齐 padding
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  // 解码
  const binary = atob(paddedBase64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
};

/**
 * ArrayBuffer 编码为 Base64URL
 */
export const bufferToBase64URL = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // 转换为 base64
  const base64 = btoa(binary);
  // 转换为 base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * 检查浏览器是否支持 WebAuthn
 */
export const isWebAuthnSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
};

/**
 * 检查是否支持条件 UI（Passkey 自动填充）
 */
export const isConditionalUISupported = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return (
      typeof PublicKeyCredential.isConditionalMediationAvailable === 'function' &&
      (await PublicKeyCredential.isConditionalMediationAvailable())
    );
  } catch {
    return false;
  }
};

/**
 * 检查设备是否有平台认证器（指纹/面容/PIN 等）
 *
 * 用于判断是否展示"使用指纹或面容登录"按钮。
 * 注意：这只能判断设备能力，不能判断用户是否已注册 Passkey。
 * 是否已注册是隐私保护设计，无法在认证前检测。
 */
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return (
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
};

/**
 * 将服务端的 WebAuthn 注册选项转换为浏览器 API 格式
 *
 * go-webauthn 返回的 CredentialCreation 中，challenge / user.id / excludeCredentials[].id
 * 均为 base64url 编码字符串，需要转换为 ArrayBuffer。
 */
export const convertToPublicKeyCreationOptions = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any
): PublicKeyCredentialCreationOptions => {
  const publicKey = options.publicKey || options;
  return {
    ...publicKey,
    challenge: base64URLToBuffer(publicKey.challenge),
    user: {
      ...publicKey.user,
      id: base64URLToBuffer(publicKey.user.id),
    },
    excludeCredentials: publicKey.excludeCredentials?.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cred: any) => ({
        ...cred,
        id: base64URLToBuffer(cred.id),
      })
    ),
  };
};

/**
 * 将服务端的 WebAuthn 认证选项转换为浏览器 API 格式
 */
export const convertToPublicKeyOptions = (
  options: WebAuthnRequestOptions
): PublicKeyCredentialRequestOptions => {
  return {
    challenge: base64URLToBuffer(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: options.allowCredentials?.map((cred) => ({
      type: cred.type,
      id: base64URLToBuffer(cred.id),
      transports: cred.transports,
    })),
  };
};

/**
 * 将浏览器的注册响应转换为服务端格式
 */
export const convertAttestationResponse = (
  credential: PublicKeyCredential
): WebAuthnAttestationResponse => {
  const response = credential.response as AuthenticatorAttestationResponse;
  const result: WebAuthnAttestationResponse = {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: 'public-key',
    response: {
      attestationObject: bufferToBase64URL(response.attestationObject),
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
    },
  };

  // 获取传输方式（如果浏览器支持）
  if (typeof response.getTransports === 'function') {
    const transports = response.getTransports();
    if (transports.length > 0) {
      result.response.transports = transports;
    }
  }

  return result;
};

/**
 * 将浏览器的认证响应转换为服务端格式
 */
export const convertAssertionResponse = (
  credential: PublicKeyCredential
): WebAuthnAssertionResponse => {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: 'public-key',
    response: {
      authenticatorData: bufferToBase64URL(response.authenticatorData),
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      signature: bufferToBase64URL(response.signature),
      userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : undefined,
    },
  };
};

/**
 * 执行 WebAuthn 认证（模态弹窗模式）
 */
export const performWebAuthnAssertion = async (
  options: PublicKeyCredentialRequestOptions
): Promise<PublicKeyCredential> => {
  const credential = await navigator.credentials.get({
    publicKey: options,
  });
  if (!credential) {
    throw new Error('WebAuthn 认证被取消');
  }
  return credential as PublicKeyCredential;
};

/**
 * 执行 WebAuthn 条件式认证（Conditional UI / Passkey 自动填充）
 *
 * 不会弹出模态对话框，而是在浏览器输入框的自动填充下拉中显示 Passkey 选项。
 * 需要页面中存在带有 autocomplete="...webauthn" 属性的 input 元素。
 * 用户从自动填充中选择 Passkey 后触发设备认证（指纹/面容等）。
 *
 * @param options WebAuthn 请求选项
 * @param signal 可选的 AbortSignal，用于取消等待中的条件式认证
 */
export const performConditionalMediation = async (
  options: PublicKeyCredentialRequestOptions,
  signal?: AbortSignal
): Promise<PublicKeyCredential> => {
  const credential = await navigator.credentials.get({
    publicKey: options,
    mediation: 'conditional' as CredentialMediationRequirement,
    signal,
  });
  if (!credential) {
    throw new Error('WebAuthn 认证被取消');
  }
  return credential as PublicKeyCredential;
};
