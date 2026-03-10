import { useState, useCallback, useRef } from 'react';
import { Modal, Spin } from 'antd';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import styles from './index.module.scss';

export interface CaptchaModalProps {
  open: boolean;
  siteKey: string;
  challengeId: string;
  onSuccess: (challengeId: string, token: string) => Promise<void>;
  onCancel: () => void;
}

const CaptchaModal = ({
  open,
  siteKey,
  challengeId,
  onSuccess,
  onCancel,
}: CaptchaModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSuccess = useCallback(
    async (token: string) => {
      setIsSubmitting(true);
      try {
        await onSuccess(challengeId, token);
      } catch {
        turnstileRef.current?.reset();
        setIsSubmitting(false);
      }
    },
    [challengeId, onSuccess]
  );

  const handleWidgetLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleExpire = useCallback(() => {
    turnstileRef.current?.reset();
  }, []);

  return (
    <Modal
      open={open}
      title="安全验证"
      footer={null}
      onCancel={onCancel}
      centered
      destroyOnClose
      maskClosable={false}
      width={380}
      className={styles.captchaModal}
      transitionName=""
      maskTransitionName=""
    >
      <div className={styles.content}>
        <p className={styles.hint}>请完成人机验证以继续</p>

        <div className={styles.turnstileWrapper}>
          {isLoading && (
            <div className={styles.loading}>
              <Spin />
            </div>
          )}

          {open && siteKey && (
            <Turnstile
              ref={turnstileRef}
              siteKey={siteKey}
              onSuccess={handleSuccess}
              onError={handleError}
              onExpire={handleExpire}
              onWidgetLoad={handleWidgetLoad}
              options={{
                theme: 'light',
                size: 'flexible',
              }}
            />
          )}
        </div>

        {isSubmitting && (
          <div className={styles.submitting}>
            <Spin size="small" />
            <span>验证中...</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CaptchaModal;
