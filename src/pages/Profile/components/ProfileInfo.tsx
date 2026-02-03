import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { updateProfile } from '@/services/api';
import type { UserProfile, UpdateProfileRequest } from '@/types';
import styles from './ProfileInfo.module.scss';

interface ProfileInfoProps {
  profile: UserProfile;
  onUpdate: () => void;
}

const ProfileInfo = ({ profile, onUpdate }: ProfileInfoProps) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: UpdateProfileRequest) => {
    try {
      setLoading(true);
      await updateProfile(values);
      message.success('资料更新成功');
      onUpdate();
    } catch (error: unknown) {
      const err = error as { error_description?: string };
      message.error(err.error_description || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          nickname: profile.nickname,
        }}
        onFinish={handleSubmit}
        className={styles.form}
      >
        <Form.Item
          label="昵称"
          name="nickname"
          rules={[{ max: 50, message: '昵称不能超过 50 个字符' }]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item label="邮箱">
          <Input
            value={profile.email || '未绑定'}
            disabled
            suffix={
              profile.email_verified ? (
                <span className={styles.verified}>已验证</span>
              ) : profile.email ? (
                <Button type="link" size="small">
                  去验证
                </Button>
              ) : (
                <Button type="link" size="small">
                  绑定邮箱
                </Button>
              )
            }
          />
        </Form.Item>

        <Form.Item label="手机号">
          <Input
            value={profile.phone || '未绑定'}
            disabled
            suffix={
              profile.phone ? null : (
                <Button type="link" size="small">
                  绑定手机
                </Button>
              )
            }
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存修改
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ProfileInfo;
