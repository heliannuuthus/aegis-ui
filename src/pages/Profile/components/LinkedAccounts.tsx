import { useState, useEffect } from 'react';
import { Card, Button, message, Modal, Empty, Spin } from 'antd';
import {
  GithubOutlined,
  GoogleOutlined,
  WechatOutlined,
  AlipayCircleOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { getIdentities, unbindIdentity } from '@/services/api';
import { showError } from '@/utils/error';
import type { Identity } from '@/types';
import styles from './LinkedAccounts.module.scss';

// IDP 图标和名称映射
const idpConfig: Record<string, { icon: React.ReactNode; name: string; color: string }> = {
  github: { icon: <GithubOutlined />, name: 'GitHub', color: '#24292e' },
  google: { icon: <GoogleOutlined />, name: 'Google', color: '#4285f4' },
  'wechat-mp': { icon: <WechatOutlined />, name: '微信', color: '#07c160' },
  'alipay-mp': { icon: <AlipayCircleOutlined />, name: '支付宝', color: '#1677ff' },
};

const LinkedAccounts = () => {
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<Identity[]>([]);

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    try {
      setLoading(true);
      const data = await getIdentities();
      setIdentities(data.identities || []);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbind = async (idp: string) => {
    const config = idpConfig[idp] || { name: idp };

    Modal.confirm({
      title: '确认解绑',
      content: `解绑 ${config.name} 后，您将无法使用该账号登录。确定要解绑吗？`,
      okText: '确认解绑',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await unbindIdentity(idp);
          message.success(`${config.name} 已解绑`);
          loadIdentities();
        } catch (error: unknown) {
          showError(error);
        }
      },
    });
  };

  const handleBind = (idp: string) => {
    // TODO: 跳转到绑定流程
    message.info(`绑定 ${idpConfig[idp]?.name || idp} 功能开发中`);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }

  // 已绑定的 IDP
  const boundIdps = identities.map((i) => i.idp);

  // 可绑定的 IDP（未绑定的）
  const availableIdps = Object.keys(idpConfig).filter((idp) => !boundIdps.includes(idp));

  return (
    <div className={styles.container}>
      {/* 已绑定的账号 */}
      <Card title="已关联账号" className={styles.card}>
        {identities.length > 0 ? (
          <div className={styles.identityList}>
            {identities.map((identity) => {
              const config = idpConfig[identity.idp] || {
                icon: <LinkOutlined />,
                name: identity.idp,
                color: '#666',
              };

              return (
                <div key={identity.idp} className={styles.identityItem}>
                  <div className={styles.identityInfo}>
                    <span
                      className={styles.identityIcon}
                      style={{ color: config.color }}
                    >
                      {config.icon}
                    </span>
                    <div>
                      <p className={styles.identityName}>{config.name}</p>
                      <p className={styles.identityDate}>
                        绑定于 {new Date(identity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleUnbind(identity.idp)}
                  >
                    解绑
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无关联账号" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* 可绑定的账号 */}
      {availableIdps.length > 0 && (
        <Card title="可关联账号" className={styles.card}>
          <div className={styles.availableList}>
            {availableIdps.map((idp) => {
              const config = idpConfig[idp];

              return (
                <Button
                  key={idp}
                  className={styles.bindButton}
                  icon={config.icon}
                  onClick={() => handleBind(idp)}
                >
                  绑定 {config.name}
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LinkedAccounts;
