import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Button, Tabs, message, Spin } from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  LinkOutlined,
  EditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { getProfile } from '@/services/api';
import { passkeyUserCache } from '@/utils/passkeyCache';
import type { UserProfile } from '@/types';
import ProfileInfo from './components/ProfileInfo';
import SecuritySettings from './components/SecuritySettings';
import LinkedAccounts from './components/LinkedAccounts';
import styles from './index.module.scss';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      // 暂存用户信息，供 Passkey 注册成功后写入缓存
      passkeyUserCache.setPendingUserInfo({
        uid: data.id,
        nickname: data.nickname || '用户',
        picture: data.picture,
      });
    } catch (error: unknown) {
      const err = error as { error_description?: string };
      message.error(err.error_description || '获取用户信息失败');
      // 未登录则跳转到登录页
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // TODO: 调用登出 API
    message.success('已退出登录');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          个人信息
        </span>
      ),
      children: <ProfileInfo profile={profile} onUpdate={loadProfile} />,
    },
    {
      key: 'security',
      label: (
        <span>
          <SafetyOutlined />
          安全设置
        </span>
      ),
      children: <SecuritySettings />,
    },
    {
      key: 'linked',
      label: (
        <span>
          <LinkOutlined />
          关联账号
        </span>
      ),
      children: <LinkedAccounts />,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 头部用户卡片 */}
        <Card className={styles.headerCard}>
          <div className={styles.userHeader}>
            <div className={styles.avatarSection}>
              <Avatar
                size={80}
                src={profile.picture}
                icon={<UserOutlined />}
                className={styles.avatar}
              />
              <Button
                type="text"
                icon={<EditOutlined />}
                className={styles.editAvatarBtn}
                size="small"
              >
                更换头像
              </Button>
            </div>
            <div className={styles.userInfo}>
              <h1 className={styles.nickname}>{profile.nickname || '用户'}</h1>
              <p className={styles.userId}>ID: {profile.id}</p>
              {profile.email && (
                <p className={styles.email}>
                  {profile.email}
                  {profile.email_verified && (
                    <span className={styles.verified}>已验证</span>
                  )}
                </p>
              )}
            </div>
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className={styles.logoutBtn}
            >
              退出登录
            </Button>
          </div>
        </Card>

        {/* 设置内容 */}
        <Card className={styles.settingsCard}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className={styles.tabs}
          />
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
