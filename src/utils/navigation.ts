import type { NavigateFunction } from 'react-router-dom';

/**
 * 内部路由路径列表
 * 这些路径在 aegis-ui 内部跳转时使用 SPA 路由（navigate），避免整页重载
 */
const INTERNAL_PATHS = [
  '/authorize',
  '/login',
  '/consent',
  '/binding',
  '/profile',
  '/terms',
  '/privacy',
] as const;

/**
 * 判断给定 URL 是否为内部路径
 * 内部路径：同域 + 在 INTERNAL_PATHS 列表中
 */
export function isInternalPath(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    
    // 跨域直接返回 false
    if (parsed.origin !== window.location.origin) {
      return false;
    }
    
    const pathname = parsed.pathname;
    
    // 精确匹配或前缀匹配（处理带参数的路径如 /login?xxx）
    return INTERNAL_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    );
  } catch {
    // 相对路径处理
    const pathname = url.split('?')[0];
    return INTERNAL_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    );
  }
}

/**
 * 从完整 URL 中提取路径和查询参数，用于 navigate()
 */
export function extractPathWithParams(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/**
 * 智能导航：内部路径使用 SPA 路由，外部路径使用整页跳转
 * 
 * @param url - 目标 URL（可以是完整 URL 或相对路径）
 * @param navigate - React Router 的 navigate 函数
 * @param options - 可选配置
 */
export function smartNavigate(
  url: string,
  navigate: NavigateFunction,
  options?: {
    /** 强制使用整页跳转（用于需要刷新状态的场景） */
    forceReload?: boolean;
    /** 使用 replace 而非 push */
    replace?: boolean;
  }
): void {
  const { forceReload = false, replace = false } = options ?? {};
  
  // 强制刷新或外部路径：使用 window.location
  if (forceReload || !isInternalPath(url)) {
    if (replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
    return;
  }
  
  // 内部路径：使用 SPA 路由
  const path = extractPathWithParams(url);
  navigate(path, { replace });
}

/**
 * 创建一个绑定了 navigate 函数的 smartNavigate
 * 方便在组件中使用
 */
export function createSmartNavigate(navigate: NavigateFunction) {
  return (url: string, options?: Parameters<typeof smartNavigate>[2]) => {
    smartNavigate(url, navigate, options);
  };
}

/**
 * 处理 RedirectAction 的 location 跳转
 * 自动判断是内部路由还是外部跳转
 */
export function handleRedirectLocation(
  location: string,
  navigate: NavigateFunction,
  options?: {
    /** 某些 action 需要强制刷新 */
    forceReload?: boolean;
  }
): void {
  smartNavigate(location, navigate, options);
}
