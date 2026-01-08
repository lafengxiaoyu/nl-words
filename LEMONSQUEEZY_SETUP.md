# LemonSqueezy 支付功能集成指南

本指南将帮助你快速集成 LemonSqueezy 支付功能,实现订阅制付费解锁高级单词。

## 📋 功能概览

- ✅ **免费用户**: 只能学习 A1-A2 难度单词
- ✅ **Premium 用户**: 解锁所有难度(B1-B2, C1-C2)
- ✅ **订阅制**: 支持月付/年付,自动续费
- ✅ **全球支付**: 支持 135+ 国家,20+ 支付方式
- ✅ **税务合规**: LemonSqueezy 自动处理全球税务

---

## 🚀 快速开始

### 1. 数据库设置

在 Supabase Dashboard 中运行 SQL 迁移脚本:

```bash
# 1. 进入 Supabase Dashboard
# 2. 点击 SQL Editor
# 3. 复制 supabase/migrations/004_add_subscriptions.sql 的内容
# 4. 点击 "Run" 执行
```

迁移脚本会创建:
- `subscriptions` 表(存储用户订阅信息)
- RLS 权限策略
- 辅助函数 `get_user_subscription_tier()` 和 `is_premium_user()`

---

### 2. LemonSqueezy 配置

#### 2.1 注册 LemonSqueezy 账户

1. 访问 [https://store.lemonsqueezy.com](https://store.lemonsqueezy.com)
2. 注册账户并完成验证

#### 2.2 创建产品和价格

1. 进入 Dashboard -> Products
2. 创建产品 "Premium Subscription"
3. 创建 Variants:

| Variant | 价格 | 描述 |
|---------|------|------|
| Monthly | ¥29/月 | 按月订阅,随时取消 |
| Yearly | ¥299/年 | 年付省 15% |

4. 复制 Variant ID(例如: `123456`)

#### 2.3 获取 Store ID

1. 进入 Settings -> General
2. 复制 Store ID(例如: `98765`)

---

### 3. 环境变量配置

复制 `.env.example` 到 `.env`:

```bash
cp web/.env.example web/.env
```

编辑 `web/.env`:

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# LemonSqueezy 配置
VITE_LEMONSQUEEZY_STORE_ID=98765
VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID=123456
```

---

### 4. 前端集成

#### 4.1 安装依赖

```bash
cd web
npm install
```

#### 4.2 使用组件

##### **显示付费引导弹窗**

```tsx
import { useState } from 'react'
import PremiumModal from './components/PremiumModal'

function MyComponent() {
  const [showPremium, setShowPremium] = useState(false)
  const [user] = useUser() // 假设你有用户状态

  return (
    <div>
      <button onClick={() => setShowPremium(true)}>
        升级到 Premium
      </button>

      <PremiumModal
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        languageMode="chinese"
        userId={user?.id}
        userEmail={user?.email}
      />
    </div>
  )
}
```

##### **根据订阅级别筛选单词**

```tsx
import { filterWordsBySubscription } from './lib/lemonSqueezy'
import { getUserSubscriptionTier } from './lib/subscriptionManager'

function WordList() {
  const [words, setWords] = useState([])
  const [userTier, setUserTier] = useState<'free' | 'premium'>('free')

  useEffect(() => {
    async function loadWords() {
      const tier = await getUserSubscriptionTier(userId)
      setUserTier(tier)
      const filtered = filterWordsBySubscription(allWords, tier)
      setWords(filtered)
    }
    loadWords()
  }, [userId])

  return (
    <div>
      {words.map(word => (
        <WordCard key={word.id} word={word} />
      ))}
    </div>
  )
}
```

##### **难度锁定提示**

```tsx
import DifficultyLock from './components/DifficultyLock'

function DifficultyButton({ difficulty }) {
  return (
    <>
      <button>{difficulty}</button>
      {['B1', 'B2', 'C1', 'C2'].includes(difficulty) && (
        <DifficultyLock
          difficulty={difficulty}
          languageMode="chinese"
          userId={user?.id}
          onUnlock={() => setShowPremium(true)}
        />
      )}
    </>
  )
}
```

---

### 5. Webhook 配置(重要!)

LemonSqueezy 需要向你的服务器发送 Webhook 来同步订阅状态。

#### 5.1 设置 Webhook URL

1. 进入 LemonSqueezy Dashboard -> Settings -> Webhooks
2. 点击 "Add new webhook"
3. 输入 URL: `https://your-domain.com/api/lemonsqueezy-webhook`
4. 选择事件:
   - ✅ `order_created` (订单创建)
   - ✅ `subscription_updated` (订阅更新)
   - ✅ `subscription_cancelled` (订阅取消)
   - ✅ `subscription_expired` (订阅过期)

#### 5.2 创建 Webhook 处理端点

由于你使用 Supabase,可以创建一个 Supabase Edge Function 来处理 Webhook:

```typescript
// supabase/functions/lemonsqueezy-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

serve(async (req) => {
  try {
    const signature = req.headers.get('x-signature')
    const payload = await req.json()

    // 1. 验证 Webhook 签名
    // (参见 LemonSqueezy 文档验证签名)

    // 2. 处理事件
    const eventType = payload.meta.event_name

    switch (eventType) {
      case 'order_created':
        await handleOrderCreated(payload)
        break
      case 'subscription_updated':
        await handleSubscriptionUpdated(payload)
        break
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(payload)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function handleOrderCreated(payload: any) {
  const userId = payload.meta.custom_data.user_id
  const orderId = payload.data.id
  const customerId = payload.data.attributes.customer_id
  const variantId = payload.data.attributes.first_order_item.variant_id

  // 判断订阅级别(根据 variant_id)
  const tier = variantId === 'yearly_variant_id' ? 'premium' : 'premium'

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      lemonsqueezy_order_id: orderId,
      lemonsqueezy_customer_id: customerId,
      lemonsqueezy_variant_id: variantId,
      tier: tier,
      status: 'active',
      renews_at: calculateExpiryDate(variantId)
    })
}
```

---

## 🎯 使用场景

### 场景 1: 难度筛选时锁定 B1+

```tsx
// 在 App.tsx 中
const filterWordsByDifficulty = async (difficulty: string) => {
  const tier = await getUserSubscriptionTier(userId)

  if (['B1', 'B2', 'C1', 'C2'].includes(difficulty) && tier === 'free') {
    setShowPremiumModal(true)
    return
  }

  // 继续筛选...
}
```

### 场景 2: 用户点击锁定的单词

```tsx
function WordCard({ word }) {
  const [userTier] = useSubscriptionTier()

  const isLocked = ['B1', 'B2', 'C1', 'C2'].includes(word.difficulty) && userTier === 'free'

  return (
    <div className="word-card">
      {isLocked ? (
        <DifficultyLock difficulty={word.difficulty} />
      ) : (
        <div className="word-content">
          {word.word}
        </div>
      )}
    </div>
  )
}
```

---

## 📊 数据库操作

### 查询用户订阅

```sql
-- 获取用户订阅状态
SELECT * FROM subscriptions WHERE user_id = 'user_uuid';

-- 获取所有 Premium 用户
SELECT
  u.email,
  s.tier,
  s.status,
  s.renews_at
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id
WHERE s.tier = 'premium' AND s.status = 'active';
```

### 手动设置用户为 Premium(测试)

```sql
UPDATE subscriptions
SET
  tier = 'premium',
  status = 'active',
  renews_at = NOW() + INTERVAL '1 year',
  lemonsqueezy_customer_id = 'test',
  lemonsqueezy_subscription_id = 'test'
WHERE user_id = 'your_user_id';
```

---

## 🧪 测试

### 1. 测试模式

LemonSqueezy 提供 Test Mode,无需真实支付:

1. Dashboard -> Settings -> Test Mode
2. 开启 Test Mode
3. 使用测试支付卡片(参见文档)

### 2. 测试订阅流程

```typescript
// 1. 模拟用户订阅
await handleOrderCreated({
  meta: { custom_data: { user_id: 'test_user_id' } },
  data: {
    id: 'test_order_id',
    attributes: {
      customer_id: 'test_customer_id',
      first_order_item: { variant_id: 'test_variant_id' }
    }
  }
})

// 2. 验证订阅状态
const tier = await getUserSubscriptionTier('test_user_id')
console.log(tier) // 应该返回 'premium'

// 3. 测试权限控制
const filtered = filterWordsBySubscription(allWords, 'free')
console.log(filtered.length) // 应该只包含 A1/A2 单词
```

---

## 🔄 后续步骤

### 1. 创建 Supabase Edge Function(处理 Webhook)

参考上面的代码创建 `supabase/functions/lemonsqueezy-webhook/index.ts`

### 2. 配置域名和 SSL

LemonSqueezy 要求 Webhook URL 使用 HTTPS:

- 使用 Vercel/Netlify 部署
- 或配置自定义域名 + SSL 证书

### 3. 监控订阅状态

定期检查过期订阅(可以设置定时任务):

```sql
-- 查找过期但状态仍为 active 的订阅
SELECT * FROM subscriptions
WHERE renews_at < NOW()
  AND status = 'active';

-- 更新状态
UPDATE subscriptions
SET status = 'expired'
WHERE renews_at < NOW()
  AND status = 'active';
```

---

## 📞 支持和资源

- **LemonSqueezy 文档**: [https://docs.lemonsqueezy.com](https://docs.lemonsqueezy.com)
- **LemonSqueezy API**: [https://docs.lemonsqueezy.com/api](https://docs.lemonsqueezy.com/api)
- **Supabase 文档**: [https://supabase.com/docs](https://supabase.com/docs)

---

## ⚠️ 注意事项

1. **Webhook 安全**: 务必验证签名,防止伪造请求
2. **订阅过期**: 定期检查并更新过期订阅状态
3. **用户退款**: 处理退款时需要更新用户订阅状态
4. **测试环境**: 正式上线前在 Test Mode 下充分测试
5. **税务合规**: LemonSqueezy 自动处理,但需正确配置产品类别

---

## 🎉 完成!

现在你的应用已经集成了 LemonSqueezy 支付功能!

**下一步**:
1. 在 LemonSqueezy Dashboard 创建真实产品和价格
2. 部署 Webhook 处理函数
3. 测试完整支付流程
4. 上线并开始盈利! 🚀
