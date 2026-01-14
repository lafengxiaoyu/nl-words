-- ============================================
-- API 使用日志表 Setup
-- ============================================
-- 用于追踪每个用户的数据库访问次数和类型
-- 帮助监控 Supabase 用量和限制滥用行为

-- 1. 创建 API 使用日志表
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'read', 'write', 'upsert', 'delete'
  table_name VARCHAR(50) NOT NULL,
  record_count INTEGER DEFAULT 1, -- 操作的记录数量
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_api_usage_log_user_id ON api_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_operation_type ON api_usage_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_created_at ON api_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_user_created ON api_usage_log(user_id, created_at);

-- 3. 启用 RLS (Row Level Security)
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- 4. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own api usage" ON api_usage_log;
DROP POLICY IF EXISTS "Users can insert their own api usage" ON api_usage_log;
DROP POLICY IF EXISTS "Admins can view all api usage" ON api_usage_log;

-- 5. 创建 RLS 策略
-- 用户可以查看自己的 API 使用日志
CREATE POLICY "Users can view their own api usage"
  ON api_usage_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的 API 使用日志
CREATE POLICY "Users can insert their own api usage"
  ON api_usage_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 管理员可以查看所有 API 使用日志
CREATE POLICY "Admins can view all api usage"
  ON api_usage_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. 创建自动清理旧日志的函数
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
  -- 删除 90 天前的日志
  DELETE FROM api_usage_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 7. 创建用于统计的视图
CREATE OR REPLACE VIEW user_api_usage_stats AS
SELECT
  up.user_id,
  up.username,
  up.email,
  up.subscription_tier,
  up.subscription_status,
  -- 总调用次数
  COUNT(*) FILTER (WHERE al.success = true) as total_calls,
  -- 今日调用次数
  COUNT(*) FILTER (
    WHERE al.success = true 
    AND DATE(al.created_at) = CURRENT_DATE
  ) as calls_today,
  -- 本月调用次数
  COUNT(*) FILTER (
    WHERE al.success = true 
    AND DATE_TRUNC('month', al.created_at) = DATE_TRUNC('month', CURRENT_DATE)
  ) as calls_month,
  -- 按操作类型统计
  COUNT(*) FILTER (WHERE al.operation_type = 'read' AND al.success = true) as read_calls,
  COUNT(*) FILTER (WHERE al.operation_type = 'write' AND al.success = true) as write_calls,
  COUNT(*) FILTER (WHERE al.operation_type = 'upsert' AND al.success = true) as upsert_calls,
  COUNT(*) FILTER (WHERE al.operation_type = 'delete' AND al.success = true) as delete_calls,
  -- 失败调用次数
  COUNT(*) FILTER (WHERE al.success = false) as failed_calls,
  -- 最后一次调用时间
  MAX(al.created_at) as last_call_at
FROM user_profiles up
LEFT JOIN api_usage_log al ON up.user_id = al.user_id
GROUP BY up.user_id, up.username, up.email, up.subscription_tier, up.subscription_status;

-- 8. 创建获取用户使用统计的函数
CREATE OR REPLACE FUNCTION get_user_api_usage(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  operation_type VARCHAR(50),
  call_count BIGINT,
  record_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    operation_type,
    COUNT(*) as call_count,
    SUM(record_count) as record_count
  FROM api_usage_log
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY operation_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 在代码中记录 API 调用：
--    INSERT INTO api_usage_log (user_id, operation_type, table_name, record_count, success)
--    VALUES ('user_uuid', 'upsert', 'user_progress', 1, true)
--
-- 2. 查询用户使用统计：
--    SELECT * FROM user_api_usage_stats
--    WHERE user_id = 'your_user_id'
--
-- 3. 查询所有用户的用量：
--    SELECT * FROM user_api_usage_stats ORDER BY total_calls DESC
--
-- 4. 获取特定用户过去 7 天的详细统计：
--    SELECT * FROM get_user_api_usage('user_id', 7)
--
-- 5. 定期清理旧日志（可以在 Supabase 定时任务中运行）：
--    SELECT cleanup_old_api_logs()
--
-- ============================================
