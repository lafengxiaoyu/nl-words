// Supabase API 调用记录工具
// 用于追踪用户对数据库的访问次数

import { supabase } from './supabase'

export type OperationType = 'read' | 'write' | 'upsert' | 'delete'

interface LogApiUsageParams {
  userId: string
  operationType: OperationType
  tableName: string
  recordCount?: number
  success: boolean
  error?: string
}

// 从环境变量获取采样率，默认 5%（降低 95% 日志量）
const API_LOG_SAMPLING_RATE = parseFloat(
  import.meta.env.VITE_API_LOG_SAMPLING_RATE || '0.05'
)

/**
 * 判断是否应该记录这次 API 调用（基于采样率）
 */
function shouldLog(): boolean {
  return Math.random() < API_LOG_SAMPLING_RATE
}

/**
 * 记录 API 使用情况（基于采样率）
 * @param params API 调用参数
 */
export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  const { userId, operationType, tableName, recordCount = 1, success, error } = params

  // 基于采样率决定是否记录
  if (!shouldLog()) {
    return
  }

  try {
    // 异步记录，不阻塞主流程
    await supabase.from('api_usage_log').insert({
      user_id: userId,
      operation_type: operationType,
      table_name: tableName,
      record_count: recordCount,
      success,
      error_message: error
    })
  } catch (logError) {
    // 记录日志失败不应该影响主流程
    console.warn('Failed to log API usage:', logError)
  }
}

/**
 * 获取用户 API 使用统计
 * @param userId 用户 ID
 * @param days 统计天数，默认 30 天
 */
export async function getUserApiUsageStats(
  userId: string,
  days: number = 30
): Promise<Array<{ operation_type: string; call_count: number; record_count: number }> | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_api_usage', {
        p_user_id: userId,
        p_days: days
      })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to get user API usage stats:', error)
    return null
  }
}

/**
 * 检查用户是否超过调用限制
 * @param userId 用户 ID
 * @param limit 调用限制次数
 * @param hours 时间范围（小时），默认 24 小时
 */
export async function checkRateLimit(
  userId: string,
  limit: number,
  hours: number = 24
): Promise<{ allowed: boolean; currentUsage: number; remaining: number }> {
  try {
    const { data, error } = await supabase
      .from('api_usage_log')
      .select('id')
      .eq('user_id', userId)
      .eq('success', true)
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    if (error) throw error

    const currentUsage = data?.length || 0
    const remaining = Math.max(0, limit - currentUsage)

    return {
      allowed: currentUsage < limit,
      currentUsage,
      remaining
    }
  } catch (error) {
    console.error('Failed to check rate limit:', error)
    // 出错时默认允许，避免影响正常使用
    return { allowed: true, currentUsage: 0, remaining: limit }
  }
}

/**
 * 包装数据库操作，自动记录 API 使用
 */
export async function withApiUsageLogging<T>(
  userId: string | null,
  operationType: OperationType,
  tableName: string,
  operation: () => Promise<T>,
  recordCount: number = 1
): Promise<T> {
  if (!userId) {
    // 未登录用户不记录
    return operation()
  }

  const startTime = Date.now()
  try {
    const result = await operation()
    
    // 记录成功的调用
    await logApiUsage({
      userId,
      operationType,
      tableName,
      recordCount,
      success: true
    })

    return result
  } catch (error) {
    // 记录失败的调用
    await logApiUsage({
      userId,
      operationType,
      tableName,
      recordCount,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    })

    throw error
  } finally {
    // 可以在这里记录耗时等信息
    const duration = Date.now() - startTime
    if (duration > 1000) {
      console.warn(`Slow API call detected: ${operationType} on ${tableName} took ${duration}ms`)
    }
  }
}
