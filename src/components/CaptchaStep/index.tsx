import { useState, useCallback, useRef } from 'react';
import { Spin, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import styles from './index.module.scss';

export interface CaptchaStepProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onCancel: () => void;
  title?: string;
  hint?: string;
}

const CaptchaStep = ({
  siteKey,
  onSuccess,
  onCancel,
  title = '安全验证',
  hint = '请完成人机验证以继续',
}: CaptchaStepProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleSuccess = useCallback(
    (token: string) => {
      onSuccess(token);
    },
    [onSuccess]
  );

  const handleWidgetLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleExpire = useCallback(() => {
    turnstileRef.current?.reset();
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    turnstileRef.current?.reset();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          type="link"
          className={styles.backBtn}
          icon={<ArrowLeftOutlined style={{ fontSize: 12 }} />}
          onClick={onCancel}
        >
          返回
        </Button>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.hint}>{hint}</p>

        <div className={styles.turnstileWrapper}>
          {isLoading && (
            <div className={styles.loading}>
              <Spin />
            </div>
          )}

          {siteKey && (
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

        {hasError && (
          <div className={styles.errorArea}>
            <p className={styles.errorText}>验证加载失败</p>
            <Button type="link" size="small" onClick={handleRetry}>
              重试
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptchaStep;
