import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/index.scss';

// 主题配置 - 与 SCSS 变量保持一致
const themeConfig = {
  token: {
    // 主色调
    colorPrimary: '#6366f1',
    colorPrimaryHover: '#4f46e5',
    colorPrimaryActive: '#4338ca',
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // 字体
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    
    // 颜色
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    
    // 文本颜色
    colorText: '#1f2937',
    colorTextSecondary: '#4b5563',
    colorTextTertiary: '#9ca3af',
    colorTextDisabled: '#d1d5db',
    
    // 边框颜色
    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f3f4f6',
    
    // 背景色
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f9fafb',
  },
  components: {
    Button: {
      primaryShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
    },
    Input: {
      activeShadow: '0 0 0 2px rgba(99, 102, 241, 0.1)',
    },
    Card: {
      paddingLG: 32,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
