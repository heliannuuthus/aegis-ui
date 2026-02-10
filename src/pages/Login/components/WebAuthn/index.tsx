import { useEffect, useState, useCallback } from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { WebAuthnRequestOptions, WebAuthnAssertionResponse } from '@/types';
import {
  isWebAuthnSupported,
  convertToPublicKeyOptions,
  convertAssertionResponse,
  performWebAuthnAssertion,
} from './utils';
import styles from './index.module.scss';

interface WebAuthnProps {
  /** WebAuthn 请求选项 */
  options?: WebAuthnRequestOptions;
  /** 是否自动触发认证 */
  autoTrigger?: boolean;
  /** 是否正在加载 */
  loading?: boolean;
  /** 认证成功回调 */
  onSuccess: (credential: WebAuthnAssertionResponse) => void;
  /** 认证错误回调 */
  onError: (error: Error) => void;
  /** 认证取消回调 */
  onCancel: () => void;
}

const WebAuthn = ({
  options,
  autoTrigger = true,
  loading = false,
  onSuccess,
  onError,
  onCancel,
}: WebAuthnProps) => {
  const [authenticating, setAuthenticating] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const handleAuthenticate = useCallback(async () => {
    if (!options || authenticating) return;

    if (!isWebAuthnSupported()) {
      onError(new Error('您的浏览器不支持 WebAuthn'));
      return;
    }

    setAuthenticating(true);
    try {
      const publicKeyOptions = convertToPublicKeyOptions(options);
      const credential = await performWebAuthnAssertion(publicKeyOptions);
      const assertionResponse = convertAssertionResponse(credential);
      onSuccess(assertionResponse);
    } catch (error) {
      if (error instanceof Error) {
        // 用户取消认证
        if (
          error.name === 'NotAllowedError' ||
          error.message.includes('cancelled') ||
          error.message.includes('canceled')
        ) {
          onCancel();
        } else {
          onError(error);
        }
      } else {
        onError(new Error('WebAuthn 认证失败'));
      }
    } finally {
      setAuthenticating(false);
    }
  }, [options, authenticating, onSuccess, onError, onCancel]);

  // 自动触发认证
  useEffect(() => {
    if (autoTrigger && options && !triggered && !loading) {
      setTriggered(true);
      handleAuthenticate();
    }
  }, [autoTrigger, options, triggered, loading, handleAuthenticate]);

  const isLoading = loading || authenticating;

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        {isLoading ? (
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        ) : (
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"
            />
          </svg>
        )}
      </div>
      <p className={styles.text}>
        {isLoading ? '正在验证身份...' : '使用安全密钥验证'}
      </p>
      <p className={styles.hint}>
        请在弹出的窗口中完成身份验证
      </p>
    </div>
  );
};

export default WebAuthn;
export { isWebAuthnSupported, isConditionalUISupported, isPlatformAuthenticatorAvailable, convertAttestationResponse, convertToPublicKeyCreationOptions } from './utils';
