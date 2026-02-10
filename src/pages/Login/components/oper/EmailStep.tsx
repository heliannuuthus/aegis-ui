import { useState, useRef, useCallback } from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import type { VChanConfig } from '@/types';
import Captcha, { type CaptchaHandle } from '../Captcha';
import styles from './index.module.scss';

interface EmailStepProps {
  /** Captcha 配置 */
  captchaConfig?: VChanConfig;
  /** 是否需要 Captcha */
  requiresCaptcha: boolean;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 初始邮箱（从验证步骤返回时回填） */
  initialEmail?: string;
  /** 提交回调 */
  onSubmit: (email: string, captchaToken?: string) => void;
}

const EmailStep = ({
  captchaConfig,
  requiresCaptcha,
  loading = false,
  disabled = false,
  initialEmail,
  onSubmit,
}: EmailStepProps) => {
  const [form] = Form.useForm();
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captchaRef = useRef<CaptchaHandle>(null);
  // 是否已触发验证码渲染（用户输入了有效邮箱后才渲染）
  const [showCaptcha, setShowCaptcha] = useState(!!initialEmail);

  // 重置 Captcha
  const resetCaptcha = useCallback(() => {
    captchaRef.current?.reset();
    setCaptchaToken(undefined);
  }, []);

  // 监听邮箱字段变化，当邮箱格式有效时才激活验证码
  const handleFieldsChange = useCallback(() => {
    if (!requiresCaptcha || showCaptcha) return;

    const email = form.getFieldValue('email');
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setShowCaptcha(true);
    }
  }, [form, requiresCaptcha, showCaptcha]);

  // 提交表单
  const handleSubmit = async (values: { email: string }) => {
    if (requiresCaptcha && !captchaToken) {
      // 如果验证码还没渲染，先激活它
      if (!showCaptcha) {
        setShowCaptcha(true);
      }
      message.warning('请先完成人机验证');
      return;
    }

    onSubmit(values.email, captchaToken);
    resetCaptcha();
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ email: initialEmail }}
        onFinish={handleSubmit}
        onFieldsChange={handleFieldsChange}
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

        {/* 人机验证 - 仅在用户输入有效邮箱后才渲染 */}
        {requiresCaptcha && captchaConfig && showCaptcha && (
          <Form.Item>
            <Captcha
              ref={captchaRef}
              config={captchaConfig}
              onTokenChange={setCaptchaToken}
            />
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
            下一步
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EmailStep;
