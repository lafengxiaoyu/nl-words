# API 使用追踪和速率限制

## 概述

本系统提供了轻量级的 API 使用追踪功能，帮助监控用户对 Supabase 数据库的访问情况。设计重点：**低数据库负担、小用户量（<1000）、管理员按需查看、采样统计**。

## 功能特性

### 1. API 使用日志记录（采样模式）

- ✅ **采样记录**：默认只记录 10% 的操作，减少 90% 数据库负担
- ✅ 自动记录数据库操作（read、write、upsert、delete）
- ✅ 记录操作成功/失败状态
- ✅ 按用户 ID 关联所有操作
- ✅ 异步记录，不阻塞主流程

**采样率配置**：
- 默认：10%（可通过 `VITE_API_LOG_SAMPLING_RATE` 环境变量调整）
- 设置为 `1.0` 记录所有操作
- 设置为 `0.1` 记录 10% 操作（推荐）
- 设置为 `0.01` 记录 1% 操作（超轻量）

### 2. 速率限制（可选）

- ✅ 免费用户：每小时 100 次请求，每天 1000 次读取/500 次写入
- ✅ Premium 用户：每小时 1000 次请求，每天 10000 次读取/5000 次写入
- ✅ 管理员：无限制
- ✅ 可自定义配置
- ℹ️ 默认不启用，需要时手动添加检查

### 3. 管理员面板统计（懒加载）

- ✅ 默认不加载 API 统计，减少数据库查询
- ✅ 按需查看用户 API 调用情况（可手动加载）
- ✅ 支持识别高频使用用户
- ℹ️ 采样统计适用于趋势分析，不适合精确计费

## 数据库结构

### api_usage_log 表

```sql
CREATE TABLE api_usage_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_type VARCHAR(50) NOT NULL,  -- 'read', 'write', 'upsert', 'delete'
  table_name VARCHAR(50) NOT NULL,
  record_count INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### user_api_usage_stats 视图

提供用户的 API 使用统计汇总：

```sql
SELECT * FROM user_api_usage_stats
```

返回字段：
- `user_id` - 用户 ID
- `username` - 用户名
- `email` - 邮箱
- `subscription_tier` - 订阅类型
- `total_calls` - 总调用次数
- `calls_today` - 今日调用次数
- `calls_month` - 本月调用次数
- `read_calls` - 读取操作次数
- `write_calls` - 写入操作次数
- `upsert_calls` - 更新操作次数
- `delete_calls` - 删除操作次数
- `failed_calls` - 失败调用次数
- `last_call_at` - 最后一次调用时间

## 安装步骤

### 1. 运行数据库迁移

在 Supabase Dashboard 的 SQL Editor 中运行：

```bash
supabase/migrations/006_add_api_usage_log.sql
```

这将创建 `api_usage_log` 表和相关索引、视图。

### 2. 在代码中集成

#### 在现有的数据库操作中记录日志

系统已经自动在以下文件中集成了日志记录：

- `src/lib/progressSync.ts` - 学习进度同步
  - `loadUserProgress()` - 记录读取操作
  - `saveUserProgress()` - 记录 upsert 操作

#### 手动记录其他操作

```typescript
import { logApiUsage } from './lib/apiUsageLogger'

// 记录成功的读取操作
await logApiUsage({
  userId: user.id,
  operationType: 'read',
  tableName: 'some_table',
  recordCount: data.length,
  success: true
})

// 记录失败的操作
try {
  // ... 数据库操作
} catch (error) {
  await logApiUsage({
    userId: user.id,
    operationType: 'write',
    tableName: 'some_table',
    recordCount: 0,
    success: false,
    error: error.message
  })
  throw error
}
```

### 3. 应用速率限制

```typescript
import { canUserPerformOperation } from './lib/apiRateLimiter'

// 在执行操作前检查
const check = await canUserPerformOperation(
  userId,
  subscriptionTier,
  'upsert',
  isAdmin
)

if (!check.allowed) {
  // 显示错误提示
  alert(check.reason)
  return
}

// 执行操作
await saveUserProgress(userId, wordId, familiarity, stats)
```

## 管理员面板使用

### 查看用户 API 使用情况

**当前设计**：
- 用户列表默认显示 "-" 占位符
- 不预加载 API 统计，减少数据库查询负担
- 如需查看特定用户的统计，可以手动查询数据库

### 手动查询用户 API 统计

如果需要查看某个用户的详细 API 使用情况，可以在 Supabase Dashboard 的 SQL Editor 中运行：

```sql
-- 查看特定用户的 API 使用统计
SELECT
  operation_type,
  COUNT(*) as call_count,
  SUM(record_count) as total_records
FROM api_usage_log
WHERE user_id = 'user-uuid-here'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY operation_type;
```

```sql
-- 查看高频用户（基于采样数据）
SELECT
  up.username,
  up.email,
  COUNT(*) as sample_count,
  COUNT(*) * 10 as estimated_total  -- 乘以 10 估算总数（10% 采样率）
FROM api_usage_log al
JOIN user_profiles up ON al.user_id = up.user_id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
GROUP BY up.user_id, up.username, up.email
ORDER BY sample_count DESC
LIMIT 10;
```

**注意**：由于采用采样模式，显示的调用次数需要乘以采样率的倒数来估算实际调用次数。例如 10% 采样率显示 100 次，实际约为 1000 次。

### 清理不活跃用户

使用 "三个月未活跃用户" 筛选功能，批量删除长期不活跃的用户数据，减少数据库负载。

## 监控和告警建议

### 1. 定期检查高频用户

```sql
-- 查找最近7天调用次数最多的前10个用户
SELECT
  user_id,
  username,
  email,
  COUNT(*) as call_count
FROM api_usage_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, username, email
ORDER BY call_count DESC
LIMIT 10;
```

### 2. 检查失败率高的用户

```sql
-- 查找失败率超过 20% 的用户
SELECT
  user_id,
  username,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_calls,
  (SUM(CASE WHEN success = false THEN 1 ELSE 0 END)::float / COUNT(*) * 100) as failure_rate
FROM api_usage_log
GROUP BY user_id, username
HAVING (SUM(CASE WHEN success = false THEN 1 ELSE 0 END)::float / COUNT(*) * 100) > 20
ORDER BY failure_rate DESC;
```

### 3. 设置清理任务

定期清理 90 天前的日志（已在 SQL 脚本中提供函数）：

```sql
SELECT cleanup_old_api_logs();
```

建议在 Supabase 的 pg_cron 中设置为每月运行一次。

## 自定义配置

### 修改速率限制

编辑 `src/lib/apiRateLimiter.ts` 中的 `DEFAULT_RATE_LIMIT_CONFIG`：

```typescript
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  free: {
    dailyReadLimit: 1000,      // 修改为你的需求
    dailyWriteLimit: 500,
    dailyUpsertLimit: 500,
    hourlyRequestLimit: 100
  },
  premium: {
    dailyReadLimit: 10000,
    dailyWriteLimit: 5000,
    dailyUpsertLimit: 5000,
    hourlyRequestLimit: 1000
  },
  admin: {
    unlimited: true
  }
}
```

### 添加更多操作类型

如果需要追踪其他类型的操作，在 `apiUsageLogger.ts` 中扩展 `OperationType`：

```typescript
export type OperationType = 'read' | 'write' | 'upsert' | 'delete' | 'batch'
```

## 注意事项

1. **性能考虑**：API 日志记录是异步的，不会阻塞主流程
2. **存储成本**：建议定期清理旧日志（90 天以上）
3. **未登录用户**：未登录用户使用 localStorage，不会产生 API 调用
4. **错误处理**：日志记录失败不应影响主功能

## 故障排查

### 问题：日志未记录

检查：
1. `api_usage_log` 表是否已创建
2. RLS 策略是否允许用户插入自己的日志
3. 检查浏览器控制台是否有错误

### 问题：速率限制不生效

检查：
1. `api_usage_log` 表中的数据是否正常记录
2. 时间计算是否正确（使用 UTC 时间）
3. 用户订阅类型是否正确识别

## 技术支持

如有问题，请检查：
1. Supabase Dashboard 中的 SQL Editor 运行状态
2. 浏览器控制台的错误日志
3. 管理员面板中的用户 API 调用统计
