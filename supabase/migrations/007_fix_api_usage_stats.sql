-- ============================================
-- API 使用统计修正 - 考虑采样率
-- ============================================
-- 问题：api_usage_log 表是采样的（默认 5%），
--      user_api_usage_stats 视图直接 COUNT 会得到采样记录数
-- 解决：让视图返回估算的实际调用量（采样数 / 采样率）

-- 1. 添加 api_usage_settings 表来存储采样率配置
CREATE TABLE IF NOT EXISTS api_usage_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  value DECIMAL(10, 4) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. 插入默认采样率配置（5% = 0.05）
INSERT INTO api_usage_settings (key, value)
VALUES ('sampling_rate', 0.05)
ON CONFLICT (key) DO UPDATE SET value = 0.05, updated_at = NOW();

-- 3. 重建 user_api_usage_stats 视图，使用估算值
CREATE OR REPLACE VIEW user_api_usage_stats AS
SELECT
  up.user_id,
  up.username,
  up.email,
  up.subscription_tier,
  up.subscription_status,
  -- 估算的总调用次数（采样数 / 采样率）
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.success = true) / s.value),
    0
  ) as total_calls,
  -- 估算的今日调用次数
  COALESCE(
    FLOOR(
      COUNT(*) FILTER (
        WHERE al.success = true
        AND DATE(al.created_at) = CURRENT_DATE
      ) / s.value
    ),
    0
  ) as calls_today,
  -- 估算的本月调用次数
  COALESCE(
    FLOOR(
      COUNT(*) FILTER (
        WHERE al.success = true
        AND DATE_TRUNC('month', al.created_at) = DATE_TRUNC('month', CURRENT_DATE)
      ) / s.value
    ),
    0
  ) as calls_month,
  -- 估算的按操作类型统计
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'read' AND al.success = true) / s.value),
    0
  ) as read_calls,
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'write' AND al.success = true) / s.value),
    0
  ) as write_calls,
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'upsert' AND al.success = true) / s.value),
    0
  ) as upsert_calls,
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'delete' AND al.success = true) / s.value),
    0
  ) as delete_calls,
  -- 失败调用次数（采样数，无需估算）
  COUNT(*) FILTER (WHERE al.success = false) as failed_calls,
  -- 最后一次调用时间
  MAX(al.created_at) as last_call_at
FROM user_profiles up
CROSS JOIN api_usage_settings s
WHERE s.key = 'sampling_rate'
LEFT JOIN api_usage_log al ON up.user_id = al.user_id
GROUP BY up.user_id, up.username, up.email, up.subscription_tier, up.subscription_status, s.value;

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 如果修改了前端的采样率（VITE_API_LOG_SAMPLING_RATE），
--    需要更新 api_usage_settings 表：
--
--    UPDATE api_usage_settings SET value = 0.10 WHERE key = 'sampling_rate';
--    -- 设置采样率为 10%
--
-- 2. 如果想要精确统计而非估算，可以：
--    a) 将采样率设为 1.0（100% 采样，不推荐）
--    b) 或者在前端直接统计调用次数（不使用日志系统）
--
-- 3. 视图现在返回的是估算的实际调用量，
--    例如：10 条采样记录 / 0.05 采样率 = 200 次实际调用
--
-- ============================================
