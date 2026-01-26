-- ============================================
-- API 使用统计修正 - 考虑采样率
-- ============================================
-- 问题：api_usage_log 表是采样的（默认 5%），
--      user_api_usage_stats 视图直接 COUNT 会得到采样记录数
-- 解决：让视图返回估算的实际调用量（采样数 / 采样率）
--
-- 注意：采样率应与前端的 VITE_API_LOG_SAMPLING_RATE 保持一致
-- 默认采样率：0.05 (5%)
-- 如果修改了前端采样率，请同步修改下方的 SAMPLING_RATE 常量

-- 删除旧视图
DROP VIEW IF EXISTS user_api_usage_stats;

-- 创建新视图，使用估算值
CREATE VIEW user_api_usage_stats AS
SELECT
  up.user_id,
  up.username,
  up.email,
  up.subscription_tier,
  up.subscription_status,
  -- 估算的总调用次数（采样数 / 0.05）
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.success = true) / 0.05),
    0
  ) as total_calls,
  -- 估算的今日调用次数
  COALESCE(
    FLOOR(
      COUNT(*) FILTER (
        WHERE al.success = true
        AND DATE(al.created_at) = CURRENT_DATE
      ) / 0.05
    ),
    0
  ) as calls_today,
  -- 估算的本月调用次数
  COALESCE(
    FLOOR(
      COUNT(*) FILTER (
        WHERE al.success = true
        AND DATE_TRUNC('month', al.created_at) = DATE_TRUNC('month', CURRENT_DATE)
      ) / 0.05
    ),
    0
  ) as calls_month,
  -- 估算的按操作类型统计
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'read' AND al.success = true) / 0.05),
    0
  ) as read_calls,
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'write' AND al.success = true) / 0.05),
    0
  ) as write_calls,
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'upsert' AND al.success = true) / 0.05),
    0
  ) as upsert_calls,
  COALESCE(
    FLOOR(COUNT(*) FILTER (WHERE al.operation_type = 'delete' AND al.success = true) / 0.05),
    0
  ) as delete_calls,
  -- 失败调用次数（采样数，无需估算）
  COUNT(*) FILTER (WHERE al.success = false) as failed_calls,
  -- 最后一次调用时间
  MAX(al.created_at) as last_call_at,
  -- 学习记录统计
  COALESCE(progress.total_records, 0) as progress_records
FROM user_profiles up
LEFT JOIN api_usage_log al ON up.user_id = al.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as total_records
  FROM user_progress
  GROUP BY user_id
) progress ON up.user_id = progress.user_id
GROUP BY up.user_id, up.username, up.email, up.subscription_tier, up.subscription_status, progress.total_records;

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 默认采样率：5% (0.05)
--
-- 2. 估算公式：实际调用量 = 采样记录数 / 采样率
--    例如：10 条采样记录 / 0.05 = 200 次实际调用
--
-- 3. 如果修改了前端的采样率（VITE_API_LOG_SAMPLING_RATE），
--    需要同步修改此视图中的除数（默认 0.05）
--
-- 4. 如果想要精确统计而非估算，可以：
--    a) 将采样率设为 1.0（100% 采样，修改前端和此视图）
--    b) 或者在前端直接统计调用次数（不使用日志系统）
--
-- ============================================
