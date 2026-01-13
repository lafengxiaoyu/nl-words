-- ============================================
-- 添加订阅相关字段
-- ============================================

-- 1. 在 user_profiles 表中添加订阅相关字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'premium'));
  END IF;
END $$;

-- 2. 添加订阅状态字段（用于 LemonSqueezy 集成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'expired'));
  END IF;
END $$;

-- 3. 添加 LemonSqueezy 订阅 ID（可选，用于未来集成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'lemon_subscription_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN lemon_subscription_id VARCHAR(100);
  END IF;
END $$;

-- 4. 添加订阅开始时间
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_started_at'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 5. 添加订阅结束时间（用于订阅到期时自动降级）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_ends_at'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 6. 更新 RLS 策略，允许管理员修改订阅
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can update their own profile (exclude subscription)"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    role = (SELECT role FROM user_profiles WHERE user_id = auth.uid()) AND
    subscription_tier = (SELECT subscription_tier FROM user_profiles WHERE user_id = auth.uid())
  );

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 将用户升级为付费用户：
--    UPDATE user_profiles
--    SET subscription_tier = 'premium',
--        subscription_started_at = NOW(),
--        subscription_ends_at = NULL  -- 或设置到期时间
--    WHERE user_id = 'user_id_here';
--
-- 2. 将用户降级为免费用户：
--    UPDATE user_profiles
--    SET subscription_tier = 'free',
--        subscription_status = 'expired',
--        subscription_ends_at = NOW()
--    WHERE user_id = 'user_id_here';
--
-- 3. 通过邮箱修改用户订阅（管理员操作）：
--    UPDATE user_profiles
--    SET subscription_tier = 'premium'
--    WHERE email = 'user_email@example.com';
--
-- 4. 查看付费用户列表：
--    SELECT username, email, subscription_tier, subscription_status, subscription_started_at
--    FROM user_profiles
--    WHERE subscription_tier = 'premium';
--
-- 5. 检查用户是否有权限访问 B1 及以上单词：
--    SELECT CASE
--      WHEN subscription_tier = 'premium' THEN true
--      ELSE false
--    END as can_access_b1
--    FROM user_profiles
--    WHERE user_id = 'user_id_here';
--
-- 6. 自动更新到期订阅（可设置为定时任务）：
--    UPDATE user_profiles
--    SET subscription_tier = 'free',
--        subscription_status = 'expired'
--    WHERE subscription_tier = 'premium'
--      AND subscription_ends_at IS NOT NULL
--      AND subscription_ends_at < NOW();
--
-- ============================================
