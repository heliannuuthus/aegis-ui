import { useEffect } from 'react';

/**
 * 首页 - 直接访问视为异常行为
 * 认证流程应该从其他应用（如 atlas）通过 /auth/authorize 发起
 * 直接访问根页面或未知路由会被重定向到空白页
 */
function HomePage() {
  useEffect(() => {
    // 直接访问视为异常/攻击行为，重定向到空白页
    window.location.href = 'about:blank';
  }, []);

  return null;
}

export default HomePage;
