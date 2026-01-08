-- ============================================
-- LemonSqueezy 订阅管理表
-- ============================================
-- 运行此 SQL 脚本来创建订阅相关的表

-- 1. 创建订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  lemonsqueezy_customer_id TEXT,
  lemonsqueezy_order_id TEXT,
  lemonsqueezy_subscription_id TEXT,
  lemonsqueezy_variant_id TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'cancelled', 'expired', 'inactive')),
  renews_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_customer_id ON subscriptions(lemonsqueezy_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_subscription_id ON subscriptions(lemonsqueezy_subscription_id);

-- 3. 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- 4. 创建更新时间戳的触发器
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 启用 RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Public can check subscription status" ON subscriptions;

-- 7. 创建 RLS 策略
-- 用户可以查看自己的订阅
CREATE POLICY "Users can view their own subscription"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的订阅
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的订阅
CREATE POLICY "Users can update their own subscription"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. 为现有用户创建免费订阅
INSERT INTO subscriptions (user_id, tier, status)
SELECT 
  id,
  'free' as tier,
  'active' as status
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.user_id = auth.users.id
);

-- 9. 创建辅助函数：获取用户订阅级别
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT tier
    FROM subscriptions
    WHERE user_id = user_uuid
      AND status = 'active'
      AND (renews_at IS NULL OR renews_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建辅助函数：检查用户是否为付费用户
CREATE OR REPLACE FUNCTION is_premium_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE user_id = user_uuid
      AND tier = 'premium'
      AND status = 'active'
      AND (renews_at IS NULL OR renews_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 手动设置用户为 Premium（测试用）：
--    UPDATE subscriptions
--    SET tier = 'premium',
--        status = 'active',
--        renews_at = NOW() + INTERVAL '1 year',
--        lemonsqueezy_customer_id = 'test_customer_123',
--        lemonsqueezy_subscription_id = 'test_sub_123',
--        lemonsqueezy_variant_id = 'test_variant_123'
--    WHERE user_id = 'your_user_id';
--
-- 2. 查询用户的订阅状态：
--    SELECT * FROM subscriptions WHERE user_id = 'your_user_id';
--
-- 3. 查询所有 Premium 用户：
--    SELECT u.email, s.tier, s.status, s.renews_at
--    FROM auth.users u
--    JOIN subscriptions s ON u.id = s.user_id
--    WHERE s.tier = 'premium' AND s.status = 'active';
--
-- 4. 在代码中检查用户是否为 Premium：
--    SELECT is_premium_user('your_user_id');
--    或
--    SELECT get_user_subscription_tier('your_user_id');
--
-- 5. 取消用户订阅：
--    UPDATE subscriptions
--    SET status = 'cancelled',
--        updated_at = NOW()
--    WHERE user_id = 'your_user_id';
--
-- ============================================
