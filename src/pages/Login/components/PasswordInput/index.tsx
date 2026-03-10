import { useState, useMemo } from 'react';
import { Form, Input, Button } from 'antd';
import {
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import styles from './index.module.scss';

interface PasswordInputProps {
  email: string;
  loading?: boolean;
  disabled?: boolean;
  onSubmit: (password: string) => void;
}

const PasswordInput = ({
  email,
  loading = false,
  disabled = false,
  onSubmit,
}: PasswordInputProps) => {
  const [form] = Form.useForm();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (values: { password: string }) => {
    onSubmit(values.password);
  };

  const submitButtonStyle = useMemo<React.CSSProperties>(
    () => ({
      marginTop: 8,
    }),
    []
  );

  return (
    <div className={styles.container}>
      <div className={styles.userInfo}>
        <span className={styles.email}>{email}</span>
      </div>

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
            style={submitButtonStyle}
          >
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PasswordInput;
