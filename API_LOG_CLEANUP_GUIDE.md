# API 日志清理指南

## 概述

本指南介绍如何定期清理 `api_usage_log` 表中的旧日志，以保持数据库轻量和高效。

## 清理方案对比

| 方案 | 自动化 | 复杂度 | 推荐度 |
|------|--------|--------|--------|
| 手动 SQL | ❌ 手动 | 低 | ⭐⭐ 适合小规模 |
| pg_cron | ✅ 自动 | 中 | ⭐⭐⭐⭐⭐ 推荐 |
| Supabase Functions | ✅ 自动 | 高 | ⭐⭐⭐ 需要额外配置 |

## 方案 1：手动清理（适合小规模）

### 何时使用
- 用户量 < 100
- 不介意每月手动运行一次 SQL
- 数据库资源充足

### 步骤

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 运行以下 SQL：

```sql
-- 查看当前日志数量和日期范围
SELECT
  COUNT(*) as total_logs,
  MIN(created_at) as oldest_log,
  MAX(created_at) as newest_log
FROM api_usage_log;

-- 删除 90 天前的日志
DELETE FROM api_usage_log
WHERE created_at < NOW() - INTERVAL '90 days';

-- 查看删除后的数量
SELECT COUNT(*) as remaining_logs
FROM api_usage_log;
```

4. 建议每月运行一次（可设置日历提醒）

---

## 方案 2：使用 pg_cron 自动清理（推荐）

### 何时使用
- 用户量 100-1000
- 希望自动化维护
- Supabase 免费或 Pro 计划

### 前置条件

**启用 pg_cron 扩展**：

1. 登录 Supabase Dashboard
2. 进入 **Database** > **Extensions**
3. 搜索 `pg_cron`
4. 点击 **Enable**

### 安装步骤

1. 在 SQL Editor 中运行：
   ```
   supabase/migrations/007_api_log_cleanup_cron.sql
   ```

2. 验证定时任务已创建：
   ```sql
   SELECT * FROM cron.job;
   ```

3. 应该看到类似输出：
   ```
   jobid        | schedule | command
   -------------+----------+---------
   cleanup-api-logs-monthly | 0 2 1 * * | SELECT cleanup_old_api_logs()
   ```

### 定时任务说明

默认配置：
- **执行时间**：每月 1 号凌晨 2:00
- **保留期限**：90 天
- **清理范围**：所有早于 90 天前的日志

### 自定义配置

#### 修改清理频率

**每周清理**：
```sql
-- 删除原任务
SELECT cron.unschedule('cleanup-api-logs-monthly');

-- 创建每周任务（每周日凌晨 3 点）
SELECT cron.schedule(
  'cleanup-api-logs-weekly',
  '0 3 * * 0',
  $$SELECT cleanup_old_api_logs()$$
);
```

**每季度清理**：
```sql
-- 删除原任务
SELECT cron.unschedule('cleanup-api-logs-monthly');

-- 创建每季度任务（每季度第一天凌晨 2 点）
SELECT cron.schedule(
  'cleanup-api-logs-quarterly',
  '0 2 1 * 1,4,7,10',
  $$SELECT cleanup_old_api_logs()$$
);
```

#### 修改保留期限

编辑 `cleanup_old_api_logs()` 函数：

```sql
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
  -- 修改这里的 INTERVAL 值
  DELETE FROM api_usage_log
  WHERE created_at < NOW() - INTERVAL '180 days';  -- 改为 180 天

  RAISE NOTICE '已清理超过 180 天的 API 日志';
END;
$$ LANGUAGE plpgsql;
```

常用选项：
- `INTERVAL '30 days'` - 保留 30 天
- `INTERVAL '60 days'` - 保留 60 天
- `INTERVAL '90 days'` - 保留 90 天（默认）
- `INTERVAL '180 days'` - 保留半年
- `INTERVAL '365 days'` - 保留一年

#### 禁用定时任务

```sql
-- 暂停任务（不删除）
SELECT cron.unschedule('cleanup-api-logs-monthly');

-- 如果需要重新启用
SELECT cron.schedule(
  'cleanup-api-logs-monthly',
  '0 2 1 * *',
  $$SELECT cleanup_old_api_logs()$$
);
```

### 监控清理效果

#### 查看清理历史

```sql
-- 查看日志数量变化趋势
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as log_count
FROM api_usage_log
GROUP BY month
ORDER BY month DESC
LIMIT 12;
```

#### 查看当前状态

```sql
-- 统计日志分布
SELECT
  CASE
    WHEN created_at >= NOW() - INTERVAL '7 days' THEN '最近7天'
    WHEN created_at >= NOW() - INTERVAL '30 days' THEN '30天内'
    WHEN created_at >= NOW() - INTERVAL '90 days' THEN '90天内'
    ELSE '超过90天'
  END as age_range,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM api_usage_log
GROUP BY age_range
ORDER BY age_range;
```

---

## 方案 3：手动批处理（适合控制）

### 适用场景
- 想要精确控制每次删除的记录数
- 日志量很大（> 10 万条）
- 担心一次删除造成锁表

### 批量删除脚本

```sql
-- 分批删除，每次删除 1000 条
DO $$
DECLARE
  deleted_count INTEGER;
  total_deleted INTEGER := 0;
  batch_size INTEGER := 1000;
BEGIN
  LOOP
    -- 删除一批记录
    DELETE FROM api_usage_log
    WHERE created_at < NOW() - INTERVAL '90 days'
    LIMIT batch_size;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;

    -- 如果没有删除到记录，退出循环
    IF deleted_count = 0 THEN
      EXIT;
    END IF;

    -- 输出进度
    RAISE NOTICE '已删除 % 条记录，总计 % 条', deleted_count, total_deleted;

    -- 可选：每次删除后暂停 1 秒，避免锁表
    PERFORM pg_sleep(1);
  END LOOP;

  RAISE NOTICE '完成！总计删除 % 条记录', total_deleted;
END $$;
```

---

## 监控和维护

### 定期检查日志大小

```sql
-- 查看表大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'api_usage_log';
```

### 设置告警（Supabase Pro）

1. 进入 Dashboard > **Monitoring**
2. 设置 **Database Size** 告警
3. 当数据库超过阈值时接收通知

### 检查定时任务运行状态

```sql
-- 查看定时任务
SELECT * FROM cron.job;

-- 查看任务运行日志（如果可用）
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## 故障排查

### 问题 1：定时任务没有执行

**检查步骤**：

1. 确认 pg_cron 扩展已启用：
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. 确认任务已创建：
   ```sql
   SELECT * FROM cron.job;
   ```

3. 检查数据库日志中的错误信息

### 问题 2：日志没有被清理

**可能原因**：
- 定时任务时间未到
- 90 天内没有旧日志
- 函数执行出错

**解决方法**：

```sql
-- 手动测试清理函数
SELECT cleanup_old_api_logs();

-- 检查是否有错误
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-api-logs-monthly')
ORDER BY start_time DESC
LIMIT 5;
```

### 问题 3：删除操作导致应用卡顿

**解决方案**：

1. 改用批量删除（方案 3）
2. 在低峰期执行（凌晨 2-3 点）
3. 增加删除间隔时间（改为每季度清理）

---

## 最佳实践建议

### 小型应用（< 100 用户）
- 使用方案 1（手动清理）
- 每季度运行一次
- 保留 180 天日志

### 中型应用（100-1000 用户）
- 使用方案 2（pg_cron 自动清理）
- 每月自动清理
- 保留 90 天日志（推荐）

### 大型应用（> 1000 用户）
- 使用方案 2 + 方案 3
- 每月分批删除
- 考虑使用分区表优化

---

## 快速参考

### 常用 SQL 命令

| 需求 | SQL 命令 |
|------|---------|
| 查看日志数量 | `SELECT COUNT(*) FROM api_usage_log;` |
| 查看日志范围 | `SELECT MIN(created_at), MAX(created_at) FROM api_usage_log;` |
| 手动清理 90 天前 | `SELECT cleanup_old_api_logs();` |
| 查看定时任务 | `SELECT * FROM cron.job;` |
| 暂停定时任务 | `SELECT cron.unschedule('cleanup-api-logs-monthly');` |
| 重新启动任务 | `SELECT cron.schedule('cleanup-api-logs-monthly', '0 2 1 * *', $$SELECT cleanup_old_api_logs()$$);` |

### 环境变量配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_API_LOG_SAMPLING_RATE` | 采样率 | 0.1 (10%) |

---

## 总结

对于你的需求（1000 用户、低数据库负担、管理员不实时查看），**推荐使用方案 2（pg_cron）**：

- ✅ 完全自动化，无需手动操作
- ✅ Supabase 内置支持，无需额外依赖
- ✅ 每月自动清理 90 天前的日志
- ✅ 数据库负担最小

**下一步**：
1. 在 Supabase Dashboard 启用 pg_cron 扩展
2. 运行 `007_api_log_cleanup_cron.sql` 脚本
3. 验证定时任务已创建
4. 完成！以后会自动清理
