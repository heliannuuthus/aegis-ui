import { useState, useRef } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import type { VChanConfig } from '@/types';
import Captcha from '../Captcha';
import Passkey from '../Passkey';
import styles from './index.module.scss';

interface EmailStepProps {
  /** Captcha 配置 */
  captchaConfig?: VChanConfig;
  /** 是否需要 Captcha */
  requiresCaptcha: boolean;
  /** 是否支持 Passkey */
  hasPasskey: boolean;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 提交回调 */
  onSubmit: (email: string, captchaToken?: string) => void;
  /** Passkey 点击回调 */
  onPasskeyClick: () => void;
}

const EmailStep = ({
  captchaConfig,
  requiresCaptcha,
  hasPasskey,
  loading = false,
  disabled = false,
  onSubmit,
  onPasskeyClick,
}: EmailStepProps) => {
  const [form] = Form.useForm();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<HTMLDivElement>(null);

  // 重置 Captcha
  const resetCaptcha = () => {
    if (captchaRef.current) {
      const el = captchaRef.current as HTMLDivElement & { resetCaptcha?: () => void };
      el.resetCaptcha?.();
    }
    setCaptchaToken(undefined);
  };

  // 提交表单
  const handleSubmit = async (values: { email: string }) => {
    if (requiresCaptcha && !captchaToken) {
      message.warning('请先完成人机验证');
      return;
    }

    onSubmit(values.email, captchaToken);
    resetCaptcha();
  };

  return (
    <div className={styles.stepContainer}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className={styles.form}
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="邮箱地址"
            disabled={disabled}
            autoComplete="email webauthn"
          />
        </Form.Item>

        {/* 人机验证 */}
        {requiresCaptcha && captchaConfig && (
          <Form.Item>
            <div ref={captchaRef}>
              <Captcha
                config={captchaConfig}
                onTokenChange={setCaptchaToken}
              />
            </div>
          </Form.Item>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            disabled={disabled}
            className={styles.submitButton}
          >
            继续
          </Button>
        </Form.Item>
      </Form>

      {/* Passkey 选项 */}
      {hasPasskey && (
        <>
          <div className={styles.divider}>
            <span>或</span>
          </div>
          <Passkey
            onClick={onPasskeyClick}
            loading={false}
            disabled={disabled || loading}
          />
        </>
      )}
    </div>
  );
};

export default EmailStep;
