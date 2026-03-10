/**
 * Passkey 用户缓存管理
 *
 * 用于 Welcome Back 遮盖层的本地缓存。
 * 缓存最近一次注册 Passkey 的用户信息，以实现快速回访登录体验。
 *
 * 缓存策略：同一浏览器同一站点仅缓存最近一次设置 Passkey 的用户提示信息。
 * 缓存仅用于 UI 提示，不作为认证依据。
 */

const CACHE_KEY = 'heliannuuthus@aegis:passkey_user';

/**
 * 缓存的用户信息
 */
export interface PasskeyUserHint {
  /** 用户稳定标识 */
  uid: string;
  /** 遮盖层展示名称 */
  nickname: string;
  /** 头像 URL（可空） */
  picture?: string;
  /** 最后更新时间戳 */
  updated_at: number;
}

/**
 * 暂存的用户信息（用于注册 Passkey 后写入缓存）
 * 在个人信息页设置，注册成功后使用
 */
let pendingUserInfo: {
  uid: string;
  nickname: string;
  picture?: string;
} | null = null;

export const passkeyUserCache = {
  /**
   * 读取缓存的用户信息
   */
  get(): PasskeyUserHint | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PasskeyUserHint;
    } catch {
      return null;
    }
  },

  /**
   * 写入缓存
   */
  set(info: Omit<PasskeyUserHint, 'updated_at'>): void {
    try {
      const data: PasskeyUserHint = {
        ...info,
        updated_at: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // localStorage 不可用时静默失败
    }
  },

  /**
   * 清除缓存
   */
  clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // 静默失败
    }
  },

  /**
   * 暂存当前用户信息（个人信息页调用）
   * 在用户注册 Passkey 之前调用，注册成功后自动写入缓存
   */
  setPendingUserInfo(info: {
    uid: string;
    nickname: string;
    picture?: string;
  }): void {
    pendingUserInfo = info;
  },

  /**
   * 注册成功后写入缓存
   * 使用之前通过 setPendingUserInfo 暂存的用户信息
   */
  writeAfterRegistration(): void {
    if (pendingUserInfo) {
      passkeyUserCache.set(pendingUserInfo);
      pendingUserInfo = null;
    }
  },
};
