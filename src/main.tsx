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
    // 主色调 - 使用项目主色 #0066ff
    colorPrimary: '#0066ff',
    colorPrimaryHover: '#0052cc',
    colorPrimaryActive: '#0047b3',
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    
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
      controlHeight: 44,
      controlHeightLG: 48,
      controlHeightSM: 36,
      primaryShadow: 'none',
      defaultBorderColor: '#e5e7eb',
      defaultColor: '#374151',
      fontWeight: 500,
      paddingInline: 20,
      paddingInlineLG: 24,
    },
    Input: {
      controlHeight: 44,
      activeShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
      hoverBorderColor: '#d1d5db',
      activeBorderColor: '#0066ff',
      paddingInline: 12,
    },
    Form: {
      itemMarginBottom: 16,
      verticalLabelPadding: '0 0 8px',
    },
    Card: {
      paddingLG: 32,
    },
    Spin: {
      colorPrimary: '#0066ff',
    },
    Dropdown: {
      paddingBlock: 8,
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
