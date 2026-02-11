// WebAuthn 工具函数 re-export
// 组件逻辑已内联到 VerifyStep 和 Login/index.tsx 中，此处仅导出工具函数
export {
  isWebAuthnSupported,
  isConditionalUISupported,
  isPlatformAuthenticatorAvailable,
  convertAttestationResponse,
  convertToPublicKeyCreationOptions,
  convertToPublicKeyOptions,
  convertAssertionResponse,
  performWebAuthnAssertion,
  performConditionalMediation,
} from './utils';
