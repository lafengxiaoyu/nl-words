# 访问量统计功能说明

## 概述

本系统实现了完整的用户访问量跟踪功能，用于统计和分析每个用户的 API 请求次数，便于按访问量计费。

## 数据库表结构

### 1. `user_access_logs` - 用户访问日志表

记录每次用户访问的详细信息：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| request_type | VARCHAR(50) | 请求类型：page_view, word_query, progress_save, auth_login, auth_signup, admin_action, search, other |
| endpoint | VARCHAR(255) | 请求的端点 |
| method | VARCHAR(10) | HTTP 方法：GET, POST, PUT, DELETE, PATCH |
| created_at | TIMESTAMP | 创建时间 |

### 2. `user_access_stats` - 用户访问统计表

汇总每个用户的访问统计：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID（唯一） |
| total_requests | INTEGER | 总请求数 |
| current_month_requests | INTEGER | 当月请求数 |
| last_request_at | TIMESTAMP | 最后请求时间 |
| updated_at | TIMESTAMP | 更新时间 |
| created_at | TIMESTAMP | 创建时间 |

## 使用方法

### 1. 数据库迁移

运行迁移脚本创建表和函数：

```bash
# 在 Supabase SQL Editor 中运行
supabase migration up
```

或直接在 Supabase Dashboard 的 SQL Editor 中执行 `005_add_access_logging.sql`

### 2. 记录用户访问

在应用中记录用户访问：

```typescript
import { logUserAccess } from '../lib/accessLogger'

// 记录页面访问
await logUserAccess('page_view', {
  endpoint: '/dashboard',
  method: 'GET'
})

// 记录单词查询
await logUserAccess('word_query', {
  endpoint: '/api/words/search',
  method: 'GET'
})

// 记录进度保存
await logUserAccess('progress_save', {
  endpoint: '/api/progress',
  method: 'POST'
})
```

### 3. 查看用户访问统计

```typescript
import { getUserAccessStats } from '../lib/accessLogger'

// 获取当前用户的访问统计
const stats = await getUserAccessStats()
console.log('总请求数:', stats?.total_requests)
console.log('本月请求数:', stats?.current_month_requests)
console.log('最后请求时间:', stats?.last_request_at)
```

### 4. 管理员查看所有用户统计

管理员控制台会自动显示所有用户的访问统计，包括：
- 总访问量
- 本月访问量
- 预估费用（免费套餐或付费套餐）

## 费用计算规则

基于 Supabase 免费套餐：

| 套餐 | 请求数限制 | 费用 |
|------|-----------|------|
| 免费套餐 | ≤ 50,000 次/月 | $0/月 |
| 付费套餐 | ≤ 500,000 次/月 | $25/月 |
| 超额 | 每 500,000 次 | $25/月 |

## 数据库函数

### log_user_access()

记录用户访问并更新统计：

```sql
SELECT log_user_access(
  'user_uuid_here',
  'word_query',
  '/api/words/search',
  'GET'
);
```

### reset_monthly_stats()

重置月度统计（每月1号执行）：

```sql
SELECT reset_monthly_stats();
```

可以设置为 cron job 自动执行：

```sql
-- 每月1号凌晨自动重置
SELECT cron.schedule(
  'reset-monthly-stats',
  '0 0 1 * *',
  $$SELECT reset_monthly_stats();$$
);
```

## 查询示例

### 查询高访问量用户

```sql
SELECT 
  u.username,
  u.email,
  s.total_requests,
  s.current_month_requests,
  s.last_request_at
FROM user_access_stats s
JOIN user_profiles u ON s.user_id = u.user_id
WHERE s.total_requests > 1000
ORDER BY s.total_requests DESC;
```

### 查询用户的详细访问日志

```sql
SELECT * FROM user_access_logs
WHERE user_id = 'user_uuid_here'
ORDER BY created_at DESC
LIMIT 100;
```

### 删除旧访问日志（保留最近3个月）

```sql
DELETE FROM user_access_logs
WHERE created_at < NOW() - INTERVAL '3 months';
```

## 自动化部署

建议创建一个定时任务每月执行以下操作：

1. 重置月度统计
2. 删除旧日志（保留3个月）
3. 生成月度报告

```sql
-- 创建定时任务
SELECT cron.schedule(
  'monthly-maintenance',
  '0 0 1 * *',
  $$
    SELECT reset_monthly_stats();
    DELETE FROM user_access_logs WHERE created_at < NOW() - INTERVAL '3 months';
  $$
);
```

## 注意事项

1. **性能考虑**：访问日志表会快速增长，建议定期清理旧数据
2. **索引优化**：已为常用查询字段创建索引，无需额外优化
3. **隐私保护**：访问日志包含用户行为数据，需要遵守隐私政策
4. **计费准确性**：Supabase 的实际计费可能与我们的统计有差异，请以官方账单为准

## 下一步

1. 在应用关键位置添加访问记录调用
2. 设置定时任务清理旧数据
3. 配置邮件通知高访问量用户
4. 生成月度使用报告
