# Oper 登录流程说明

## 核心概念

### Principal 和 Proof

| 术语 | 含义 | 示例 |
|------|------|------|
| **Principal** | 身份标识（"你是谁"） | `email`, `username`, `phone` |
| **Proof** | 身份证明（"证明你是"） | `password`, `challenge_token` |

### Strategy 和 Delegate

| 字段 | 含义 | 示例 |
|------|------|------|
| **Strategy** | 基础登录策略 | `password` |
| **Delegate** | 可替代 Strategy 的 MFA 验证方式 | `email_otp`, `webauthn` |

用户可以**任选其一**完成验证：使用 Strategy（如密码）或使用 Delegate 中的任意一种 MFA。

### ConnectionsMap 结构

```json
{
  "idp": [
    {
      "connection": "oper",
      "strategy": ["password"],
      "delegate": ["email_otp", "webauthn"],
      "require": ["captcha"]
    }
  ],
  "vchan": [
    {
      "connection": "captcha-turnstile",
      "identifier": "0x4AAAAAAA..."
    }
  ],
  "mfa": [
    { "connection": "email_otp" },
    { "connection": "webauthn", "identifier": "aegis.example.com" }
  ]
}
```

## 登录流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Oper 登录完整流程                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1: 邮箱输入 + Captcha（如果 require 包含 captcha）              │
│          ↓                                                          │
│  Step 2: 选择验证方式                                                │
│          │                                                          │
│          ├─→ Password（来自 strategy）                               │
│          │   └─→ POST /login { principal, proof: password }         │
│          │                                                          │
│          └─→ Delegate MFA（来自 delegate）                           │
│              │                                                      │
│              ├─→ email_otp:                                         │
│              │   ┌──────────────────────────────────────┐           │
│              │   │ 1. POST /challenge                   │           │
│              │   │    { type: "email", email }          │           │
│              │   │    → { challenge_id }                │           │
│              │   │                                      │           │
│              │   │ 2. 用户输入验证码                     │           │
│              │   │                                      │           │
│              │   │ 3. PUT /challenge/{id}               │           │
│              │   │    { code: "123456" }                │           │
│              │   │    → { verified, challenge_token }   │           │
│              │   └──────────────────────────────────────┘           │
│              │   └─→ POST /login { principal, proof: challenge_token }
│              │                                                      │
│              └─→ webauthn:                                          │
│                  ┌──────────────────────────────────────┐           │
│                  │ 1. POST /challenge                   │           │
│                  │    { type: "webauthn", email }       │           │
│                  │    → { challenge_id, options }       │           │
│                  │                                      │           │
│                  │ 2. navigator.credentials.get()       │           │
│                  │                                      │           │
│                  │ 3. PUT /challenge/{id}               │           │
│                  │    { credential: {...} }             │           │
│                  │    → { verified, challenge_token }   │           │
│                  └──────────────────────────────────────┘           │
│                  └─→ POST /login { principal, proof: challenge_token }
│                                                                     │
│  Step 3: 登录成功                                                    │
│          → { code, redirect_uri }                                   │
│          → 重定向到 redirect_uri?code=xxx                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 登录请求格式

```typescript
interface LoginRequest {
  connection: string;    // 必填：oper
  strategy?: string;     // 可选：password（使用 strategy 时）
  principal: string;     // 必填：用户邮箱
  proof: string;         // 必填：密码 或 challenge_token
}
```

### 密码登录

```json
{
  "connection": "oper",
  "strategy": "password",
  "principal": "user@example.com",
  "proof": "my_password_123"
}
```

### Delegate MFA 登录（使用 Challenge Token）

```json
{
  "connection": "oper",
  "principal": "user@example.com",
  "proof": "challenge_token_xxx"
}
```

## 前端渲染逻辑

```typescript
// 1. 获取 oper 配置
const operConfig = connections.idp.find(c => c.connection === 'oper');

// 2. 检查前置验证（captcha）
if ((operConfig.require ?? []).includes('captcha')) {
  const captchaConfig = connections.vchan.find(c => c.connection.startsWith('captcha-'));
  // 使用 captchaConfig.identifier (site_key) 初始化 Turnstile/reCAPTCHA
}

// 3. 获取可用的验证方式
const hasPassword = (operConfig.strategy ?? []).includes('password');
const delegates = operConfig.delegate ?? [];

// 4. 过滤有效的 delegate（在 mfa 配置中存在的）
const availableDelegates = delegates.filter(d => 
  connections.mfa.some(m => m.connection === d)
);

// 5. 如果选择 delegate，从 mfa 获取配置
if (selectedMethod === 'webauthn') {
  const webauthnConfig = connections.mfa.find(c => c.connection === 'webauthn');
  // 使用 webauthnConfig.identifier (rp_id)
}
```

## Challenge Token 说明

- **统一凭证格式**：无论使用哪种 MFA，验证成功后都返回 `challenge_token`
- **安全性**：Token 有时效性，一次性使用
- **解耦**：Login 接口不需要关心具体的 MFA 类型，只需验证 Token

## 错误处理

| 场景 | 响应 |
|------|------|
| Captcha 验证失败 | `{ error: "captcha_failed" }` |
| 密码错误 | `{ error: "invalid_credentials" }` |
| Challenge Token 无效 | `{ error: "invalid_proof" }` |
| Challenge Token 过期 | `{ error: "challenge_expired" }` |
