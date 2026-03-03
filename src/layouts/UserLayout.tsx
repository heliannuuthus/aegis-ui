/**
 * 用户中心 Layout（iris 域名专用）
 *
 * 作为 /user 的父路由组件：
 * - 顶部用户卡片 + 登出按钮
 * - Tab 导航与 URL 同步
 * - <Outlet /> 渲染子路由
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Card, Avatar, Button, Tabs, Spin, message } from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  LinkOutlined,
  EditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/providers/AuthProvider';
import { getProfile } from '@/services/irisApi';
import { showError } from '@/utils/error';
import type { UserProfile } from '@/types';
import styles from './UserLayout.module.scss';

/** 子路由路径 → Tab key 映射 */
const TAB_MAP: Record<string, string> = {
  '/user/profile': 'profile',
  '/user/security': 'security',
  '/user/linked': 'linked',
};

/** Tab key → 子路由路径 */
const TAB_ROUTE: Record<string, string> = {
  profile: '/user/profile',
  security: '/user/security',
  linked: '/user/linked',
};

const UserLayout = () => {
  const { auth, ready, authenticated, login, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const activeTab = TAB_MAP[location.pathname] ?? 'profile';

  // 认证检查：未登录则触发 OAuth 跳转
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  // 获取用户信息
  useEffect(() => {
    if (!ready || !authenticated) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await getProfile(auth);
        setProfile(data);
      } catch (error: unknown) {
        showError(error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [ready, authenticated, auth]);

  const handleTabChange = (key: string) => {
    const route = TAB_ROUTE[key];
    if (route) {
      navigate(route);
    }
  };

  const handleLogout = async () => {
    message.success('已退出登录');
    await authLogout();
  };

  // 未初始化 / 未认证（等待跳转）
  if (!ready || !authenticated) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
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
    },
    {
      key: 'security',
      label: (
        <span>
          <SafetyOutlined />
          安全设置
        </span>
      ),
    },
    {
      key: 'linked',
      label: (
        <span>
          <LinkOutlined />
          关联账号
        </span>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 头部用户卡片 */}
        {profile && (
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
        )}

        {/* Tab 导航 + 子路由 */}
        <Card className={styles.settingsCard}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            className={styles.tabs}
          />
          <Outlet context={{ profile, reloadProfile: () => window.location.reload() }} />
        </Card>
      </div>
    </div>
  );
};

export default UserLayout;
