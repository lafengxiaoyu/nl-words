# 订阅系统部署指南

## 系统概述

本系统实现了一个基于权限控制的订阅系统：

- **免费用户**：只能查看 A1 和 A2 级别的单词
- **付费用户 (Premium)**：可以查看 B1、B2、C1、C2 所有级别的单词
- **管理员**：可以通过管理员控制台手动修改用户订阅状态

## 数据库部署

### 1. 运行数据库迁移

在 Supabase Dashboard 中执行以下 SQL 文件：

```bash
supabase db push
```

或手动运行迁移文件：
- `005_add_subscription_fields.sql`

### 2. 验证表结构

```sql
-- 查看 user_profiles 表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

应该包含以下字段：
- `subscription_tier` (VARCHAR): 'free' 或 'premium'
- `subscription_status` (VARCHAR): 'active', 'cancelled', 'past_due', 'expired'
- `lemon_subscription_id` (VARCHAR): LemonSqueezy 订阅 ID
- `subscription_started_at` (TIMESTAMP): 订阅开始时间
- `subscription_ends_at` (TIMESTAMP): 订阅结束时间

## 权限控制逻辑

### 核心函数

`src/lib/subscription.ts` 提供了以下函数：

1. **canAccessWordDifficulty(userId, difficulty)**: 检查用户是否可以访问指定难度的单词
2. **isPremiumUser(userId)**: 检查用户是否是付费用户
3. **getAllowedDifficultyLevels(userId)**: 获取用户可访问的难度级别列表
4. **filterWordsBySubscription(userId, words)**: 过滤单词列表
5. **updateUserSubscription(userId, tier, endsAt)**: 更新用户订阅（管理员）

### 权限规则

```typescript
// 免费用户
['A1', 'A2']

// 付费用户
['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
```

## 管理员操作

### 通过管理员控制台

1. 访问 `/admin` 路径
2. 登录管理员账户
3. 在用户列表中：
   - 点击"升级"按钮：将用户升级为 Premium
   - 点击"降级"按钮：将用户降级为免费用户

### 直接操作数据库

```sql
-- 升级用户为 Premium
UPDATE user_profiles
SET subscription_tier = 'premium',
    subscription_status = 'active',
    subscription_started_at = NOW()
WHERE user_id = 'your_user_id';

-- 降级用户为免费
UPDATE user_profiles
SET subscription_tier = 'free',
    subscription_status = 'expired',
    subscription_ends_at = NOW()
WHERE user_id = 'your_user_id';

-- 通过邮箱修改订阅
UPDATE user_profiles
SET subscription_tier = 'premium'
WHERE email = 'user@example.com';

-- 查看所有付费用户
SELECT username, email, subscription_tier, subscription_status, subscription_started_at
FROM user_profiles
WHERE subscription_tier = 'premium';
```

## UI 变更

### 1. Premium 提示横幅

免费用户登录后会看到一个提示横幅：

```
🔒 免费用户：只能学习 A1-A2 单词 [升级 Premium]
```

### 2. 难度筛选器

- **B1-B2** 和 **C1-C2** 按钮会显示锁定图标 🔒
- 点击锁定按钮会弹出 Premium 升级弹窗
- 免费用户无法选择被锁定的难度

### 3. Premium 升级弹窗

当用户尝试访问受限内容时，会显示升级弹窗：

```
🔓 解锁高级单词
升级到 Premium，访问 B1 及以上难度单词

✅ 访问 B1、B2、C1、C2 难度单词
✅ 更多高级词汇学习
✅ 提升到高级荷兰语水平
✅ 终身访问权限

一次性付费 ¥99

[立即升级] [暂时不需要]
```

## 未来集成 LemonSqueezy 支付

### 前端集成

1. 安装 LemonSqueezy SDK:

```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

2. 创建 LemonSqueezy 客户端:

```typescript
// src/lib/lemonsqueezy.ts
import { createClient } from '@lemonsqueezy/lemonsqueezy.js'

const lemon = createClient(import.meta.env.VITE_LEMONSQUEEZY_API_KEY)

export async function createCheckoutLink(userId: string) {
  const storeId = import.meta.env.VITE_LEMONSQUEEZY_STORE_ID
  const variantId = import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID

  const checkout = await lemon.createCheckout({
    storeId,
    variantId,
    checkoutData: {
      custom: {
        user_id: userId
      }
    }
  })

  return checkout.url
}
```

3. 在 PremiumUpgradeModal 中添加支付逻辑:

```typescript
const handleUpgrade = async () => {
  setLoading(true)
  try {
    const checkoutUrl = await createCheckoutLink(user.id)
    window.location.href = checkoutUrl
  } catch (error) {
    console.error('创建支付链接失败:', error)
    showMessage('error', '创建支付链接失败，请联系管理员')
  } finally {
    setLoading(false)
  }
}
```

### Webhook 处理

创建 Webhook 处理函数（可以在 Supabase Edge Functions 中）:

```typescript
// supabase/functions/lemonsqueezy-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { WebhookEvent } from '@lemonsqueezy/lemonsqueezy.js'

serve(async (req) => {
  const signature = req.headers.get('X-Signature')
  const body = await req.text()

  // 验证 webhook 签名
  const event = WebhookEvent.constructEvent(
    body,
    signature,
    import.meta.env.LEMON_WEBHOOK_SECRET
  )

  if (event.eventName === 'order_created') {
    const userId = event.data.meta.custom.user_id
    const subscriptionId = event.data.attributes.first_order_item.subscription_id

    // 更新用户订阅状态
    await supabase
      .from('user_profiles')
      .update({
        subscription_tier: 'premium',
        subscription_status: 'active',
        lemon_subscription_id: subscriptionId,
        subscription_started_at: new Date().toISOString()
      })
      .eq('user_id', userId)
  }

  return new Response('OK', { status: 200 })
})
```

### 环境变量

在 `.env` 中添加：

```bash
# LemonSqueezy 配置
VITE_LEMONSQUEEZY_API_KEY=your_api_key
VITE_LEMONSQUEEZY_STORE_ID=your_store_id
VITE_LEMONSQUEEZY_VARIANT_ID=your_variant_id
LEMON_WEBHOOK_SECRET=your_webhook_secret
```

## 测试

### 测试免费用户权限

1. 登录一个普通用户
2. 确保用户订阅状态为 'free'
3. 尝试选择 B1 或 C1 难度
4. 应该看到升级弹窗

### 测试付费用户权限

1. 通过管理员控制台将用户升级为 Premium
2. 刷新页面
3. 应该可以访问 B1、B2、C1、C2 难度
4. 不应该再看到 Premium 提示横幅

### 测试管理员功能

1. 以管理员身份登录
2. 访问 `/admin`
3. 测试升级和降级用户订阅
4. 验证用户列表中的订阅状态正确显示

## 安全注意事项

1. **RLS 策略**: 确保只有管理员可以修改用户的订阅状态
2. **客户端验证**: 虽然有 UI 限制，但重要操作应在后端再次验证
3. **Webhook 验证**: LemonSqueezy Webhook 必须验证签名
4. **订阅过期**: 设置定时任务或 cron job 检查过期的订阅

## 常见问题

### Q: 用户如何升级订阅？

A: 目前由管理员手动升级，未来将通过 LemonSqueezy 自动支付升级。

### Q: 已付费用户如何降级？

A: 管理员可以在控制台点击"降级"按钮，或在数据库中手动修改。

### Q: 订阅会过期吗？

A: 目前不会自动过期。如果需要设置订阅期限，请在 `user_profiles.subscription_ends_at` 中设置结束时间，并创建定时任务检查过期订阅。

### Q: 如何查看当前订阅状态？

A: 用户可以通过管理员控制台查看，或直接查询数据库：

```sql
SELECT * FROM user_profiles WHERE user_id = 'your_user_id';
```

## 更新日志

- **2026-01-13**: 初始版本发布
  - 基础订阅系统
  - 权限控制
  - 管理员手动升级/降级功能
  - Premium 升级弹窗
