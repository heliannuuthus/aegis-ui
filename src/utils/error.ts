import { message } from 'antd';
import type { AuthError } from '@/types';

/**
 * 错误码到中文消息的映射
 * 与后端 aegis/errors 保持同步
 */
const errorMessages: Record<string, string> = {
  // 400 Bad Request
  invalid_request: '请求参数无效',
  invalid_scope: '无效的权限范围',
  invalid_grant: '授权码已过期或失效',
  client_not_found: '应用不存在',
  service_not_found: '服务不存在',

  // 401 Unauthorized
  unauthorized: '请先登录',
  invalid_token: '无效的令牌',
  invalid_client: '无效的应用',
  expired_token: '令牌已过期',
  token_revoked: '令牌已撤销',
  insufficient_authentication: '需要更高级别的认证',

  // 403 Forbidden
  access_denied: '访问被拒绝',
  invalid_origin: '无效的请求来源',
  origin_mismatch: '请求来源不匹配',

  // 404 Not Found
  not_found: '资源不存在',
  user_not_found: '用户不存在',

  // 412 Precondition Failed
  flow_not_found: '登录会话已失效',
  flow_expired: '登录会话已过期',
  flow_invalid: '登录会话无效',
  login_required: '请先登录',

  // 422 Unprocessable Entity
  no_connection_available: '没有可用的登录方式',
  identity_required: '需要绑定身份信息',
  interaction_required: '需要完成人机验证',

  // 500 Internal Server Error
  server_error: '服务器错误，请稍后重试',

  // 网络错误
  network_error: '网络连接失败',
};

/**
 * 获取错误消息
 * @param error 错误对象或错误码
 * @returns 错误消息
 */
export function getErrorMessage(error: AuthError | string): string {
  if (typeof error === 'string') {
    return errorMessages[error] || error;
  }

  // 优先使用 error_description
  if (error.error_description) {
    return error.error_description;
  }

  // 使用错误码映射
  return errorMessages[error.error] || error.error || '未知错误';
}

/**
 * 显示错误消息（使用 antd message）
 * @param error 错误对象
 */
export function showError(error: AuthError | unknown): void {
  const err = error as AuthError;
  const msg = getErrorMessage(err);
  message.error(msg);
}

/**
 * 显示警告消息
 * @param error 错误对象
 */
export function showWarning(error: AuthError | unknown): void {
  const err = error as AuthError;
  const msg = getErrorMessage(err);
  message.warning(msg);
}

/**
 * 判断是否需要重定向到错误页面
 * 某些错误适合通过 message 提示，某些错误需要跳转到错误页面
 */
export function shouldRedirectToError(error: AuthError): boolean {
  const redirectErrors = [
    'flow_not_found',
    'flow_expired',
    'flow_invalid',
    'client_not_found',
    'service_not_found',
    'no_connection_available',
  ];
  return redirectErrors.includes(error.error);
}

export default {
  getErrorMessage,
  showError,
  showWarning,
  shouldRedirectToError,
};
