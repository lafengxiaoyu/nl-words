# API 使用追踪优化方案

## 当前实现的负担分析

### 1. 写入负担
- **现状**：每次数据库操作产生 1 次额外插入
- **影响**：写入次数翻倍
- **评估**：⚠️ 中等负担

### 2. 查询负担
- **现状**：管理员加载时查询所有日志记录
- **影响**：随着日志积累变慢
- **评估**：⚠️ 较高负担（需要优化）

### 3. 存储成本
- **现状**：每条日志 200-300 bytes
- **影响**：可忽略不计
- **评估**：✅ 轻微负担

## 优化方案

### 方案 1：采样记录（推荐）

**原理**：不记录所有操作，只记录一定比例的操作

**实现**：
```typescript
// apiUsageLogger.ts
const SAMPLING_RATE = 0.1 // 10% 的采样率

export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  // 只有 10% 的概率记录
  if (Math.random() > SAMPLING_RATE) {
    return
  }

  // ... 原有记录逻辑
}
```

**优点**：
- ✅ 减少 90% 的写入负担
- ✅ 减少 90% 的存储成本
- ✅ 统计数据仍然准确（在大数据量下）
- ✅ 适合追踪用户行为模式

**缺点**：
- ❌ 精确计数会有误差
- ❌ 不能追踪单次操作

**适用场景**：
- ✅ 用户量大（> 1000）
- ✅ 主要用于行为分析和成本估算
- ✅ 不需要精确计费

---

### 方案 2：批量写入

**原理**：将日志积攒到一定数量后批量写入

**实现**：
```typescript
// apiUsageLogger.ts
const logBuffer: LogApiUsageParams[] = []
const BATCH_SIZE = 50
const FLUSH_INTERVAL = 5000 // 5 秒

export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  logBuffer.push(params)

  if (logBuffer.length >= BATCH_SIZE) {
    await flushLogBuffer()
  }
}

async function flushLogBuffer() {
  if (logBuffer.length === 0) return

  const logs = [...logBuffer]
  logBuffer.length = 0

  try {
    await supabase.from('api_usage_log').insert(logs)
  } catch (error) {
    console.warn('Failed to flush log buffer:', error)
  }
}

// 定时刷新
setInterval(flushLogBuffer, FLUSH_INTERVAL)
```

**优点**：
- ✅ 减少数据库连接次数（50 倍）
- ✅ 提高写入性能
- ✅ 记录完整，无遗漏

**缺点**：
- ❌ 崩溃时可能丢失未刷新的日志
- ❌ 增加内存占用

**适用场景**：
- ✅ 高频操作场景
- ✅ 可以容忍少量数据丢失
- ✅ 需要精确记录

---

### 方案 3：Redis 缓存 + 异步写入（最佳方案）

**原理**：使用 Redis 队列缓冲，异步批量写入数据库

**实现**：
```typescript
// apiUsageLogger.ts
// 需要配置 Redis 连接
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)
const LOG_QUEUE_KEY = 'api_usage_logs'
const BATCH_SIZE = 100
const FLUSH_INTERVAL = 30000 // 30 秒

export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  // 快速推送到 Redis（< 1ms）
  await redis.lpush(LOG_QUEUE_KEY, JSON.stringify(params))
}

// 后台进程定期批量写入数据库
async function batchFlushLogs() {
  const logs: LogApiUsageParams[] = []

  // 取出 BATCH_SIZE 条记录
  for (let i = 0; i < BATCH_SIZE; i++) {
    const log = await redis.rpop(LOG_QUEUE_KEY)
    if (!log) break
    logs.push(JSON.parse(log))
  }

  if (logs.length > 0) {
    try {
      await supabase.from('api_usage_log').insert(logs)
    } catch (error) {
      // 失败时放回队列
      await redis.lpush(LOG_QUEUE_KEY, ...logs.map(l => JSON.stringify(l)))
    }
  }
}

setInterval(batchFlushLogs, FLUSH_INTERVAL)
```

**优点**：
- ✅ 极低延迟写入（< 1ms）
- ✅ 不阻塞主流程
- ✅ 完整记录，无遗漏
- ✅ 数据库连接数可控
- ✅ 支持高并发

**缺点**：
- ❌ 需要额外 Redis 服务
- ❌ Redis 故障可能丢失数据
- ❌ 需要维护 Redis

**适用场景**：
- ✅ 大规模生产环境
- ✅ 对性能要求高
- ✅ 有 Redis 资源

---

### 方案 4：数据库层触发器（Supabase 推荐）

**原理**：使用数据库触发器自动记录操作，无需应用层干预

**实现**：
```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION log_api_usage_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- 异步插入到日志表（使用 pg_notify 或后台任务）
  INSERT INTO api_usage_log (user_id, operation_type, table_name, record_count, success)
  VALUES (
    COALESCE(NEW.user_id, auth.uid()),
    TG_OP,
    TG_TABLE_NAME,
    1,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER log_user_progress_usage
AFTER INSERT OR UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION log_api_usage_trigger();
```

**优点**：
- ✅ 完全自动化，无需应用层代码
- ✅ 不会遗漏任何操作
- ✅ 性能优于应用层记录
- ✅ 数据集中管理

**缺点**：
- ❌ 增加数据库负担
- ❌ 需要管理触发器
- ❌ 难以灵活控制

**适用场景**：
- ✅ 需要完整追踪
- ✅ 不想修改应用代码
- ✅ 数据库性能充足

---

### 方案 5：仅记录异常操作（轻量级）

**原理**：只记录失败、超时或高频的操作

**实现**：
```typescript
export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  const { userId, operationType, success, tableName } = params

  // 只记录失败的操作
  if (!success) {
    await supabase.from('api_usage_log').insert({
      user_id: userId,
      operation_type: operationType,
      table_name: tableName,
      success: false,
      error_message: params.error
    })
    return
  }

  // 检查是否高频用户（可选）
  const isHighFrequency = await checkUserFrequency(userId)
  if (isHighFrequency) {
    await supabase.from('api_usage_log').insert({
      user_id: userId,
      operation_type: operationType,
      table_name: tableName,
      success: true
    })
  }
}
```

**优点**：
- ✅ 几乎零负担
- ✅ 只关注异常
- ✅ 适合故障排查

**缺点**：
- ❌ 无法追踪正常使用
- ❌ 无法做统计分析

**适用场景**：
- ✅ 调试阶段
- ✅ 监控异常
- ✅ 资源有限

---

### 方案 6：管理员按需查询（当前方案改进）

**原理**：只在需要时查询日志，不预加载

**实现**：
```typescript
// AdminDashboard.tsx

// 方式 1：懒加载
const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
const [userApiStats, setUserApiStats] = useState<Map<string, ApiStats>>(new Map())

// 只查询被选中的用户
const handleUserSelect = async (userId: string) => {
  setSelectedUserId(userId)

  if (!userApiStats.has(userId)) {
    const stats = await getUserApiStats(userId)
    setUserApiStats(prev => new Map(prev).set(userId, stats))
  }
}

// 方式 2：分页查询
const [page, setPage] = useState(1)
const [apiStatsPage, setApiStatsPage] = useState<Map<number, ApiStats>>(new Map())

const loadApiStatsForPage = async (userIdsOnPage: string[]) => {
  const stats = await supabase
    .from('api_usage_log')
    .select('user_id, COUNT(*) as count')
    .in('user_id', userIdsOnPage)
    .group('user_id')

  setApiStatsPage(prev => new Map(prev, ...stats))
}
```

**优点**：
- ✅ 减少初始加载时间
- ✅ 只加载需要的数据
- ✅ 改善用户体验

**缺点**：
- ❌ 需要多次查询
- ❌ 复杂度增加

**适用场景**：
- ✅ 用户量大
- ✅ 管理员只需查看部分用户

---

## 推荐方案组合

### 阶段 1：初期（用户 < 1000）
**使用方案 1 + 方案 6**
- 采样记录（10%）
- 懒加载 API 统计

### 阶段 2：中期（用户 1000-10000）
**使用方案 2 + 方案 6**
- 批量写入（50 条/批次）
- 懒加载 API 统计

### 阶段 3：后期（用户 > 10000）
**使用方案 3（Redis）或方案 4（触发器）**
- Redis 缓存 + 异步写入
- 或数据库触发器
- 完整记录，高性能

---

## 当前实现的具体优化

如果你选择保留当前实现，建议：

### 1. 添加采样率
```typescript
const API_LOG_SAMPLING_RATE = parseFloat(
  import.meta.env.VITE_API_LOG_SAMPLING_RATE || '0.5' // 默认 50%
)

export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  if (Math.random() > API_LOG_SAMPLING_RATE) {
    return
  }
  // ...
}
```

### 2. 改进管理员查询
```typescript
// 只查询最近 30 天的日志
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

const { data: apiUsageStats } = await supabase
  .from('api_usage_log')
  .select('user_id, operation_type, created_at')
  .in('user_id', userIds)
  .gte('created_at', thirtyDaysAgo) // 添加时间过滤
```

### 3. 添加自动清理
```sql
-- 在 pg_cron 中配置每月清理
SELECT cron.schedule(
  'cleanup-api-logs',
  '0 0 1 * *', -- 每月 1 号凌晨
  $$SELECT cleanup_old_api_logs()$$
);
```

---

## 性能基准测试

### 测试场景：1000 用户，每人 100 次操作/天

| 方案 | 写入负担 | 查询负担 | 存储成本 | 实现复杂度 |
|------|---------|---------|---------|-----------|
| 当前实现 | 高 | 高 | 低 | 低 |
| 采样（10%） | 低 | 低 | 低 | 低 |
| 批量写入（50条） | 中 | 中 | 中 | 中 |
| Redis 缓存 | 低 | 低 | 中 | 高 |
| 触发器 | 高 | 高 | 高 | 中 |
| 仅记录异常 | 极低 | 极低 | 极低 | 低 |

---

## 决策建议

### 选择方案 1（采样）如果：
- ✅ 用户量中等（< 5000）
- ✅ 主要用于趋势分析
- ✅ 不需要精确计费
- ✅ 希望简单实现

### 选择方案 2（批量）如果：
- ✅ 操作频率高
- ✅ 需要完整记录
- ✅ 可以容忍少量延迟
- ✅ 不想引入新依赖

### 选择方案 3（Redis）如果：
- ✅ 大规模生产环境
- ✅ 性能要求高
- ✅ 已有 Redis 资源
- ✅ 需要高可用

### 选择方案 4（触发器）如果：
- ✅ 不想修改应用代码
- ✅ 需要完整追踪
- ✅ 数据库性能充足

### 选择方案 5（仅异常）如果：
- ✅ 只用于调试
- ✅ 资源非常有限
- ✅ 不需要统计分析

### 选择方案 6（懒加载）如果：
- ✅ 管理员不常查看
- ✅ 用户量大
- ✅ 优化加载速度
- ✅ 可以配合其他方案使用

---

## 下一步行动

1. **评估当前需求**：确定你需要精确记录还是趋势分析
2. **选择方案**：根据用户量和性能要求选择合适方案
3. **实施优化**：修改代码实现选择的方案
4. **监控效果**：观察性能改善和统计准确性
5. **持续调整**：根据实际使用情况调整参数

需要我帮你实现某个特定的优化方案吗？
