# 订阅系统部署总结

## ✅ 已完成

### 1. 数据库迁移
- ✅ 创建订阅相关字段
- ✅ 添加 RLS 策略保护订阅状态
- ✅ 文件：`supabase/migrations/005_add_subscription_fields.sql`

### 2. 核心功能库
- ✅ 权限检查函数
- ✅ 订阅状态管理
- ✅ 单词过滤逻辑
- ✅ 文件：`web/src/lib/subscription.ts`

### 3. UI 组件
- ✅ Premium 升级弹窗
- ✅ 订阅状态提示横幅
- ✅ 锁定的难度筛选器
- ✅ 文件：
  - `web/src/components/PremiumUpgradeModal.tsx`
  - `web/src/components/PremiumUpgradeModal.css`

### 4. 主要页面修改
- ✅ `App.tsx` - 集成订阅权限检查
- ✅ `App.css` - 添加订阅相关样式
- ✅ `AdminDashboard.tsx` - 管理员订阅管理
- ✅ `AdminDashboard.css` - 订阅徽章样式

## 🚀 部署步骤

### 第一步：数据库迁移
```bash
cd /Users/mac/IdeaProjects/nl-words
supabase db push
```

### 第二步：验证
```bash
npm run dev
```

### 第三步：测试
1. 登录普通用户账户
2. 尝试点击 B1-B2 或 C1-C2 按钮
3. 应该看到 Premium 升级弹窗
4. 登录管理员账户
5. 在 `/admin` 页面测试升级/降级功能

## 📋 权限规则

| 用户类型 | 可访问难度 |
|---------|-----------|
| 免费用户 | A1, A2 |
| Premium 用户 | A1, A2, B1, B2, C1, C2 |

## 🎯 关键功能

### 免费用户体验
- 看到 "🔒 免费用户：只能学习 A1-A2 单词" 横幅
- B1-B2 和 C1-C2 按钮显示锁定图标 🔒
- 点击锁定按钮弹出升级弹窗

### Premium 用户体验
- 无限制访问所有难度
- 不显示限制提示
- 正常使用所有功能

### 管理员操作
- 访问 `/admin` 路径
- 查看用户订阅状态（👑 Premium / 免费）
- 一键升级或降级用户订阅

## 🔧 未来集成 LemonSqueezy

当准备好集成实际支付时：

1. 安装 SDK：
```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

2. 添加环境变量（`.env`）：
```bash
VITE_LEMONSQUEEZY_API_KEY=your_api_key
VITE_LEMONSQUEEZY_STORE_ID=your_store_id
VITE_LEMONSQUEEZY_VARIANT_ID=your_variant_id
```

3. 修改 `PremiumUpgradeModal.tsx` 中的 `handleUpgrade` 函数

详细步骤请参考：`SUBSCRIPTION_SETUP.md`

## 📞 支持

如有问题，请查看：
- `SUBSCRIPTION_SETUP.md` - 详细部署指南
- 数据库迁移文件注释
- 代码内注释
