# Aegis UI

Aegis Auth UI - 认证界面应用。

## 特性

- **登录页面**: 支持多种 IDP（GitHub、Google、企业微信、邮箱验证码）
- **授权同意页面**: OAuth 2.0 授权确认
- **错误页面**: 友好的错误展示
- **回调处理**: OAuth 回调处理

## 技术栈

- React 19
- Vite 7
- Ant Design 6
- React Router 7
- TypeScript 5
- Sass

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 配置

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

## 项目结构

```
aegis-ui/
├── public/           # 静态资源
├── src/
│   ├── pages/        # 页面组件
│   │   ├── Login/    # 登录页
│   │   ├── Consent/  # 授权同意页
│   │   ├── Error/    # 错误页
│   │   └── Callback/ # 回调处理页
│   ├── services/     # API 服务
│   ├── styles/       # 全局样式
│   ├── types/        # TypeScript 类型
│   ├── App.tsx       # 应用入口
│   └── main.tsx      # 渲染入口
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 与 Aegis 服务集成

Aegis UI 作为 Aegis 认证服务的前端界面，需要配合后端使用。

### 开发模式

开发时，Vite 会自动代理 `/auth` 路径到后端服务：

```typescript
// vite.config.ts
server: {
  proxy: {
    '/auth': 'http://localhost:8080',
  },
}
```

### 生产部署

生产环境建议使用 Nginx 反向代理：

```nginx
location /auth {
    proxy_pass http://aegis-backend:8080;
}

location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

## 相关项目

- **Aegis SDK**: `@aegis/auth-sdk` - 认证 SDK
- **Helios**: 后端服务

## License

MIT
