import type { WebAuthnRequestOptions, WebAuthnAssertionResponse } from '@/types';

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
 * 将服务端的 WebAuthn 选项转换为浏览器 API 格式
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
 * 执行 WebAuthn 认证
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
