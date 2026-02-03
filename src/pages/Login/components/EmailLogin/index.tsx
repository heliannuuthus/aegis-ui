import { useState, useRef } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import type { ConnectionConfig, VChanConfig } from '@/types';
import Captcha from '../Captcha';
import styles from './index.module.scss';

interface EmailLoginProps {
  connection: ConnectionConfig;
  captchaConfig?: VChanConfig;
  loading?: boolean;
  disabled?: boolean;
  onLogin: (principal: string, proof?: unknown) => void;
}

const EmailLogin = ({
  connection,
  captchaConfig,
  loading,
  disabled,
  onLogin,
}: EmailLoginProps) => {
  const [form] = Form.useForm();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<HTMLDivElement>(null);

  // 检查是否需要 captcha（require 现在是 string[] 类型）
  const requiresCaptcha =
    (connection.require ?? []).includes('captcha') && captchaConfig;

  // 重置 Captcha
  const resetCaptcha = () => {
    if (captchaRef.current) {
      const el = captchaRef.current as HTMLDivElement & { resetCaptcha?: () => void };
      el.resetCaptcha?.();
    }
    setCaptchaToken(undefined);
  };

  // 提交表单（发起登录，后端会触发 challenge）
  const handleSubmit = async (values: { email: string }) => {
    // 如果需要 captcha 但没有 token
    if (requiresCaptcha && !captchaToken) {
      message.warning('请先完成人机验证');
      return;
    }

    // principal: 邮箱, proof: captcha token
    onLogin(values.email, captchaToken);

    // 重置 captcha 以便下次使用
    resetCaptcha();
  };

  // 按钮显示文本 - 统一展示登录方式
  const buttonText = '使用邮箱登录';

  return (
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
          {buttonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default EmailLogin;
