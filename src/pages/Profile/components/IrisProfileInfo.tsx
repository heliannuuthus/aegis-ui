/**
 * iris 域名下的个人信息页面（/user/profile 子路由）
 *
 * 使用 irisApi（Bearer Token）替代原有的 Cookie API
 */

import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services/irisApi';
import { showError } from '@/utils/error';
import type { UserProfile, UpdateProfileRequest } from '@/types';
import { useOutletContext } from 'react-router-dom';
import styles from './ProfileInfo.module.scss';

interface UserLayoutContext {
  profile: UserProfile | null;
  reloadProfile: () => void;
}

const IrisProfileInfo = () => {
  const { profile, reloadProfile } = useOutletContext<UserLayoutContext>();
  const { auth } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  if (!profile) return null;

  const handleSubmit = async (values: UpdateProfileRequest) => {
    try {
      setLoading(true);
      await updateProfile(auth, values);
      message.success('资料更新成功');
      reloadProfile();
    } catch (error: unknown) {
      showError(error);
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

export default IrisProfileInfo;
