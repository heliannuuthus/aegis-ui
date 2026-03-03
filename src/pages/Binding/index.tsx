import { useState, useEffect } from 'react';
import { Button, Card, Avatar, Typography, Flex, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { getIdentifyContext, confirmIdentify } from '@/services/api';
import { showError, isFlowExpiredError, restartAuthFlow } from '@/utils/error';
import { smartNavigate } from '@/utils/navigation';
import type { AuthError, IdentifyResponse } from '@/types';

const { Title, Text } = Typography;

/** IDP 显示名称 */
const idpNames: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  wechat: '微信',
  'wechat-mp': '微信小程序',
  'wechat-web': '微信网页',
  wecom: '企业微信',
  'alipay-mp': '支付宝小程序',
  'alipay-web': '支付宝网页',
  'tt-mp': '抖音小程序',
  'tt-web': '抖音网页',
  user: '账号密码',
  staff: '平台账号',
};

/**
 * 账户关联确认页面
 *
 * 当用户通过第三方 IDP 登录时，如果系统检测到已有账户
 * （Platform 域通过邮箱匹配，Consumer 域通过手机号匹配），
 * 通过 actions=identify 重定向到此页面，提示用户是否将 IDP 身份关联到已有账户。
 *
 * 路由: /binding
 */
function BindingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [identifyCtx, setIdentifyCtx] = useState<IdentifyResponse | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const ctx = await getIdentifyContext();
        setIdentifyCtx(ctx);
      } catch (error: unknown) {
        const err = error as AuthError;
        if (isFlowExpiredError(err)) {
          restartAuthFlow();
          return;
        }
        showError(error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 确认关联 */
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const response = await confirmIdentify({ confirm: true });
      // 关联成功后跳转：内部路径用 SPA 路由，外部路径用整页跳转
      smartNavigate(response.location, navigate);
    } catch (error: unknown) {
      const err = error as AuthError;
      if (isFlowExpiredError(err)) {
        restartAuthFlow();
        return;
      }
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  /** 取消关联 */
  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const response = await confirmIdentify({ confirm: false });
      // 取消关联后跳转：内部路径用 SPA 路由，外部路径用整页跳转
      smartNavigate(response.location, navigate);
    } catch (error: unknown) {
      const err = error as AuthError;
      if (isFlowExpiredError(err)) {
        restartAuthFlow();
        return;
      }
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '100vh' }}>
        <Spin size="large" />
      </Flex>
    );
  }

  if (!identifyCtx) {
    return null;
  }

  const connectionName = idpNames[identifyCtx.connection] || identifyCtx.connection;
  const { user } = identifyCtx;
  const displayName = user?.nickname || '未知用户';

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', padding: 24, background: '#f5f7fb' }}>
      <Card style={{ width: 380 }}>
        <Flex vertical align="center" gap={16}>
          <Avatar size={64} src={user?.picture} icon={!user?.picture && <UserOutlined />} />
          <Title level={5} style={{ margin: 0 }}>{displayName}</Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            您的 {connectionName} 账户与该已有账户匹配，确认关联后可使用 {connectionName} 直接登录。
          </Text>
          <Flex vertical gap={8} style={{ width: '100%', marginTop: 8 }}>
            <Button type="primary" size="large" block onClick={handleConfirm} loading={submitting}>
              确认关联
            </Button>
            <Button type="text" size="large" block onClick={handleCancel} disabled={submitting}>
              取消
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}

export default BindingPage;
