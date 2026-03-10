/**
 * iris 域名下的安全设置页面（/user/security 子路由）
 *
 * 使用 irisApi（Bearer Token）替代原有的 Cookie API
 */

import { useState, useEffect } from 'react';
import { Card, Button, message, Modal, Input, QRCode, Spin, Empty } from 'antd';
import {
  SafetyOutlined,
  KeyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/providers/AuthProvider';
import {
  getMFAStatus,
  setupMFA,
  verifyMFA,
  deleteMFA,
} from '@/services/irisApi';
import {
  convertAttestationResponse,
  convertToPublicKeyCreationOptions,
} from '@/pages/Login/components/WebAuthn';
import { passkeyUserCache } from '@/utils/passkeyCache';
import { showError } from '@/utils/error';
import type {
  MFAStatusResponse,
  CredentialSummary,
  SetupTOTPResponse,
  SetupWebAuthnBeginResponse,
} from '@/types';
import styles from './SecuritySettings.module.scss';

const IrisSecuritySettings = () => {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MFAStatusResponse | null>(null);

  const [totpModalVisible, setTotpModalVisible] = useState(false);
  const [totpSetup, setTotpSetup] = useState<SetupTOTPResponse | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  const [webauthnLoading, setWebauthnLoading] = useState(false);

  useEffect(() => {
    loadMFAStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMFAStatus = async () => {
    try {
      setLoading(true);
      const data = await getMFAStatus(auth);
      setMfaStatus(data);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    try {
      setTotpLoading(true);
      const response = await setupMFA(auth, { type: 'totp' });
      if (response.type === 'totp') {
        setTotpSetup(response as SetupTOTPResponse);
        setTotpModalVisible(true);
      }
    } catch (error: unknown) {
      showError(error);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleConfirmTOTP = async () => {
    if (!totpSetup || !totpCode) return;
    try {
      setTotpLoading(true);
      await verifyMFA(auth, {
        type: 'totp',
        credential_id: totpSetup.credential_id,
        code: totpCode,
        confirm: true,
      });
      message.success('TOTP 绑定成功');
      setTotpModalVisible(false);
      setTotpSetup(null);
      setTotpCode('');
      loadMFAStatus();
    } catch (error: unknown) {
      showError(error);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDeleteTOTP = async () => {
    Modal.confirm({
      title: '确认删除',
      content:
        '删除 TOTP 后，您将无法使用验证器应用进行二次验证。确定要删除吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMFA(auth, { type: 'totp' });
          message.success('TOTP 已删除');
          loadMFAStatus();
        } catch (error: unknown) {
          showError(error);
        }
      },
    });
  };

  const handleSetupWebAuthn = async () => {
    try {
      setWebauthnLoading(true);
      const beginResponse = await setupMFA(auth, {
        type: 'webauthn',
        action: 'begin',
      });
      if (beginResponse.type !== 'webauthn' || !('options' in beginResponse)) {
        throw new Error('Invalid response');
      }
      const { options, challenge_id } =
        beginResponse as SetupWebAuthnBeginResponse;
      const publicKeyOptions = convertToPublicKeyCreationOptions(options);
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });
      if (!credential) throw new Error('WebAuthn 注册被取消');

      const attestationResponse = convertAttestationResponse(
        credential as PublicKeyCredential
      );
      const finishResponse = await setupMFA(auth, {
        type: 'webauthn',
        action: 'finish',
        challenge_id,
        credential: attestationResponse,
      });

      if ('success' in finishResponse && finishResponse.success) {
        message.success('安全密钥添加成功');
        passkeyUserCache.writeAfterRegistration();
        loadMFAStatus();
      } else {
        throw new Error('注册失败');
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'NotAllowedError') return;
      showError(error);
    } finally {
      setWebauthnLoading(false);
    }
  };

  const handleDeleteWebAuthn = async (credentialId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除此安全密钥后，您将无法使用它进行登录。确定要删除吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMFA(auth, {
            type: 'webauthn',
            credential_id: credentialId,
          });
          message.success('安全密钥已删除');
          const remaining = webauthnCredentials?.filter(
            (c) => c.credential_id !== credentialId
          );
          if (!remaining || remaining.length === 0) {
            passkeyUserCache.clear();
          }
          loadMFAStatus();
        } catch (error: unknown) {
          showError(error);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }

  const totpCredential = mfaStatus?.credentials.find((c) => c.type === 'totp');
  const webauthnCredentials = mfaStatus?.credentials.filter(
    (c) => c.type === 'webauthn' || c.type === 'passkey'
  );

  return (
    <div className={styles.container}>
      <Card
        title={
          <span className={styles.cardTitle}>
            <SafetyOutlined /> 验证器应用 (TOTP)
          </span>
        }
        className={styles.card}
        extra={
          totpCredential ? (
            <Button danger icon={<DeleteOutlined />} onClick={handleDeleteTOTP}>
              删除
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleSetupTOTP}
              loading={totpLoading}
            >
              设置
            </Button>
          )
        }
      >
        {totpCredential ? (
          <div className={styles.credentialInfo}>
            <p className={styles.status}>
              <span className={styles.enabled}>已启用</span>
            </p>
            {totpCredential.last_used_at && (
              <p className={styles.lastUsed}>
                最后使用:{' '}
                {new Date(totpCredential.last_used_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className={styles.description}>
            使用 Google Authenticator、Microsoft Authenticator
            等验证器应用生成一次性验证码
          </p>
        )}
      </Card>

      <Card
        title={
          <span className={styles.cardTitle}>
            <KeyOutlined /> 安全密钥 / Passkey
          </span>
        }
        className={styles.card}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleSetupWebAuthn}
            loading={webauthnLoading}
          >
            添加
          </Button>
        }
      >
        {webauthnCredentials && webauthnCredentials.length > 0 ? (
          <div className={styles.credentialList}>
            {webauthnCredentials.map((cred: CredentialSummary) => (
              <div key={cred.id} className={styles.credentialItem}>
                <div className={styles.credentialDetails}>
                  <KeyOutlined className={styles.credentialIcon} />
                  <div>
                    <p className={styles.credentialType}>
                      {cred.type === 'passkey' ? 'Passkey' : '安全密钥'}
                    </p>
                    <p className={styles.credentialId}>{cred.credential_id}</p>
                    {cred.last_used_at && (
                      <p className={styles.lastUsed}>
                        最后使用: {new Date(cred.last_used_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteWebAuthn(cred.credential_id || '')}
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            description="暂无安全密钥"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      <Modal
        title="设置验证器应用"
        open={totpModalVisible}
        onCancel={() => {
          setTotpModalVisible(false);
          setTotpSetup(null);
          setTotpCode('');
        }}
        footer={null}
        width={400}
      >
        {totpSetup && (
          <div className={styles.totpSetup}>
            <p className={styles.totpStep}>1. 使用验证器应用扫描下方二维码</p>
            <div className={styles.qrcode}>
              <QRCode value={totpSetup.otpauth_uri} size={200} />
            </div>
            <p className={styles.totpStep}>或手动输入密钥:</p>
            <div className={styles.secretKey}>
              <code>{totpSetup.secret}</code>
            </div>
            <p className={styles.totpStep}>2. 输入验证器显示的 6 位验证码</p>
            <Input
              placeholder="000000"
              value={totpCode}
              onChange={(e) =>
                setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              maxLength={6}
              className={styles.codeInput}
            />
            <Button
              type="primary"
              block
              onClick={handleConfirmTOTP}
              loading={totpLoading}
              disabled={totpCode.length !== 6}
            >
              确认绑定
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default IrisSecuritySettings;
