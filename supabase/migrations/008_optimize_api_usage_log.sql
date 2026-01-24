-- ============================================
-- 优化 api_usage_log 表
-- ============================================
--
-- 1. 删除超过 30 天的旧日志
-- 2. 移除不必要的索引以节省空间
-- 3. 保留必要的索引以维持查询性能
--
-- ============================================

-- 1. 清理超过 30 天的日志（平衡存储与数据分析需求）
DELETE FROM api_usage_log
WHERE created_at < NOW() - INTERVAL '30 days';

-- 2. 删除可能不必要的索引（根据实际查询需求调整）
-- operation_type 单独索引可能不是必须的（如果有复合索引）
DROP INDEX IF EXISTS idx_api_usage_log_operation_type;

-- 3. 确保必要的复合索引存在
CREATE INDEX IF NOT EXISTS idx_api_usage_log_user_created ON api_usage_log(user_id, created_at);

-- 4. VACUUM 回收空间
VACUUM FULL api_usage_log;

-- ============================================
-- 验证清理结果
-- ============================================

SELECT
  COUNT(*) as total_logs,
  MIN(created_at) as oldest_log,
  MAX(created_at) as newest_log,
  pg_size_pretty(pg_total_relation_size('api_usage_log')) as table_size
FROM api_usage_log;

-- ============================================
-- 查看索引使用情况（可选）
-- ============================================

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'api_usage_log'
ORDER BY pg_relation_size(indexrelid) DESC;
