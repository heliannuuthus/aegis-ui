import { Form, Input, Button } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import styles from './index.module.scss';

interface EmailStepProps {
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 初始邮箱（从验证步骤返回时回填） */
  initialEmail?: string;
  /** 提交回调 */
  onSubmit: (email: string) => void;
}

const EmailStep = ({
  loading = false,
  disabled = false,
  initialEmail,
  onSubmit,
}: EmailStepProps) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: { email: string }) => {
    onSubmit(values.email);
  };

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ email: initialEmail }}
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
