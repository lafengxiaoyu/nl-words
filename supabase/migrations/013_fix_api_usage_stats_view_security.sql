-- ============================================
-- 修复 user_api_usage_stats 视图安全配置
-- ============================================
-- 问题：视图使用了 SECURITY DEFINER 权限，会引发安全警告
-- 解决：移除 SECURITY DEFINER，改为普通视图

-- 删除旧视图
DROP VIEW IF EXISTS public.user_api_usage_stats;

-- 重新创建视图，不使用 SECURITY DEFINER
CREATE VIEW public.user_api_usage_stats AS
SELECT
  up.user_id,
  up.username,
  up.email,
  up.subscription_tier,
  up.subscription_status,
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
  -- 估算的7天内调用次数
  COALESCE(
    FLOOR(
      COUNT(*) FILTER (
        WHERE al.success = true
        AND DATE(al.created_at) >= CURRENT_DATE - INTERVAL '7 days'
      ) / 0.05
    ),
    0
  ) as calls_7days,
  -- 估算的30天内调用次数
  COALESCE(
    FLOOR(
      COUNT(*) FILTER (
        WHERE al.success = true
        AND DATE(al.created_at) >= CURRENT_DATE - INTERVAL '30 days'
      ) / 0.05
    ),
    0
  ) as calls_30days,
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
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total_records
  FROM user_progress
  WHERE user_id = up.user_id
) progress ON true
GROUP BY up.user_id, up.username, up.email, up.subscription_tier, up.subscription_status, progress.total_records;

-- 为视图添加注释
COMMENT ON VIEW public.user_api_usage_stats IS '用户 API 使用统计视图（基于 api_usage_log 采样数据估算实际调用量）';
