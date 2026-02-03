import { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { LockOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import styles from './index.module.scss';

interface PasswordInputProps {
  /** 用户邮箱（显示用） */
  email: string;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 提交回调 */
  onSubmit: (password: string) => void;
  /** 返回回调 */
  onBack?: () => void;
}

const PasswordInput = ({
  email,
  loading = false,
  disabled = false,
  onSubmit,
  onBack,
}: PasswordInputProps) => {
  const [form] = Form.useForm();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (values: { password: string }) => {
    onSubmit(values.password);
  };

  return (
    <div className={styles.container}>
      {/* 用户信息 */}
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {email.charAt(0).toUpperCase()}
        </div>
        <span className={styles.email}>{email}</span>
        {onBack && (
          <button type="button" className={styles.changeButton} onClick={onBack}>
            更换账号
          </button>
        )}
      </div>

      {/* 密码表单 */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className={styles.form}
      >
        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="输入密码"
            disabled={disabled}
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
            visibilityToggle={{
              visible: showPassword,
              onVisibleChange: setShowPassword,
            }}
          />
        </Form.Item>

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
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PasswordInput;
