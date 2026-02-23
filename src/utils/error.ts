import { message } from 'antd';
import type { AuthError } from '@/types';

/**
 * HTTP 状态码到用户友好消息的映射
 *
 * 前端仅依赖 HTTP status 做流程控制和展示。
 */
const statusMessages: Record<number, string> = {
  400: '请求参数无效',
  401: '用户名或密码错误',
  403: '访问被拒绝',
  404: '资源不存在',
  408: '登录会话已过期',
  409: '登录会话状态异常',
  410: '授权已失效',
  412: '登录会话已失效',
  422: '验证码已过期',
  426: '没有可用的登录方式',
  428: '需要绑定身份信息',
  429: '请求过于频繁，请稍后重试',
  500: '服务器错误，请稍后重试',
};

/**
 * 根据 HTTP status 获取错误消息
 */
export function getErrorMessage(error: AuthError): string {
  return statusMessages[error.status] || '未知错误';
}

/**
 * 显示错误消息（使用 antd message）
 */
export function showError(error: unknown): void {
  const err = error as AuthError;
  message.error(getErrorMessage(err));
}

/**
 * 显示警告消息
 */
export function showWarning(error: unknown): void {
  const err = error as AuthError;
  message.warning(getErrorMessage(err));
}

/**
 * 判断是否为 429 限流错误
 */
export function isRateLimitError(error: unknown): boolean {
  return (error as AuthError)?.status === 429;
}

/**
 * 从 429 错误中提取限流数据
 * @returns retry_after（秒）和可选的 challenge_id，非 429 返回 null
 */
export function getRateLimitData(error: unknown): { retryAfter: number; challengeId?: string } | null {
  const authError = error as AuthError;
  if (authError?.status !== 429 || !authError.data) return null;
  return {
    retryAfter: (authError.data.retry_after as number) || 0,
    challengeId: authError.data.challenge_id as string | undefined,
  };
}

/**
 * 判断是否为认证流程（flow）过期/失效类错误
 * 408 = flow 过期
 * 409 = flow 状态异常
 * 412 = flow 不存在（session 丢失）
 */
export function isFlowExpiredError(error: AuthError): boolean {
  return [408, 409, 412].includes(error.status);
}

/**
 * 判断是否为 Challenge 过期错误
 * 422 = challenge 过期（验证码超时）
 */
export function isChallengeExpiredError(error: unknown): boolean {
  return (error as AuthError)?.status === 422;
}

/**
 * 判断是否为前置条件未完成错误
 * 412 = 前置条件未完成（需要 captcha 等）
 * 注意：412 也可能是 flow 不存在，需要通过 response body 区分
 */
export function isPreconditionRequiredError(error: unknown): boolean {
  return (error as AuthError)?.status === 412;
}

/**
 * 从 412 错误中提取前置条件
 * 后端返回格式: { required: { "captcha": { identifier, strategy } } }
 */
export function getPreconditionRequired(error: unknown): Record<string, { identifier?: string; strategy?: string[] }> | null {
  const authError = error as AuthError;
  if (authError?.status !== 412 || !authError.data) return null;
  return authError.data.required || null;
}

/**
 * 重新发起认证流程
 * 从 sessionStorage 读取原始 authorize URL 并跳转，重建 flow
 */
export function restartAuthFlow(): boolean {
  const authorizeUrl = sessionStorage.getItem('authorize_url');
  if (authorizeUrl) {
    window.location.href = authorizeUrl;
    return true;
  }
  return false;
}
