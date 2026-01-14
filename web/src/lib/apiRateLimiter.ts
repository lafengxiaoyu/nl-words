// API 速率限制配置
// 用于限制用户的数据库访问频率，防止滥用

import { checkRateLimit, type OperationType } from './apiUsageLogger'

export interface RateLimitConfig {
  free: {
    dailyReadLimit: number
    dailyWriteLimit: number
    dailyUpsertLimit: number
    hourlyRequestLimit: number
  }
  premium: {
    dailyReadLimit: number
    dailyWriteLimit: number
    dailyUpsertLimit: number
    hourlyRequestLimit: number
  }
  admin: {
    unlimited: boolean
  }
}

// 默认配置（可根据需要调整）
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  free: {
    dailyReadLimit: 1000,      // 免费用户每天可读取 1000 次
    dailyWriteLimit: 500,     // 免费用户每天可写入 500 次
    dailyUpsertLimit: 500,    // 免费用户每天可更新 500 次
    hourlyRequestLimit: 100   // 免费用户每小时最多 100 次请求
  },
  premium: {
    dailyReadLimit: 10000,    // Premium 用户每天可读取 10000 次
    dailyWriteLimit: 5000,    // Premium 用户每天可写入 5000 次
    dailyUpsertLimit: 5000,   // Premium 用户每天可更新 5000 次
    hourlyRequestLimit: 1000   // Premium 用户每小时最多 1000 次请求
  },
  admin: {
    unlimited: true           // 管理员无限制
  }
}

/**
 * 检查用户是否可以执行操作
 * @param userId 用户 ID
 * @param subscriptionTier 订阅类型
 * @param operationType 操作类型
 * @param isAdmin 是否是管理员
 * @returns 是否允许执行操作及原因
 */
export async function canUserPerformOperation(
  userId: string,
  subscriptionTier: 'free' | 'premium' | undefined,
  operationType: OperationType,
  isAdmin: boolean = false
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  // 管理员无限制
  if (isAdmin) {
    return { allowed: true }
  }

  const tier = subscriptionTier || 'free'
  const config = DEFAULT_RATE_LIMIT_CONFIG[tier]

  // 检查每小时总请求限制
  const hourlyCheck = await checkRateLimit(
    userId,
    config.hourlyRequestLimit,
    1 // 1 小时
  )

  if (!hourlyCheck.allowed) {
    return {
      allowed: false,
      reason: `已达到每小时请求限制 (${config.hourlyRequestLimit} 次/小时)，请稍后再试`,
      remaining: hourlyCheck.remaining
    }
  }

  // 根据操作类型检查每日限制
  let dailyLimit: number
  switch (operationType) {
    case 'read':
      dailyLimit = config.dailyReadLimit
      break
    case 'write':
      dailyLimit = config.dailyWriteLimit
      break
    case 'upsert':
      dailyLimit = config.dailyUpsertLimit
      break
    case 'delete':
      dailyLimit = config.dailyWriteLimit // 删除操作使用写入限制
      break
    default:
      return { allowed: true } // 未知操作类型默认允许
  }

  const dailyCheck = await checkRateLimit(
    userId,
    dailyLimit,
    24 // 24 小时（1 天）
  )

  if (!dailyCheck.allowed) {
    return {
      allowed: false,
      reason: `已达到每日${operationType}操作限制 (${dailyLimit} 次/天)，请明天再试`,
      remaining: dailyCheck.remaining
    }
  }

  return { allowed: true, remaining: dailyCheck.remaining }
}

/**
 * 获取用户的速率限制状态
 * @param userId 用户 ID
 * @param subscriptionTier 订阅类型
 * @param isAdmin 是否是管理员
 */
export async function getUserRateLimitStatus(
  userId: string,
  subscriptionTier: 'free' | 'premium' | undefined,
  isAdmin: boolean = false
): Promise<{
  isAdmin: boolean
  tier: 'free' | 'premium'
  hourlyUsage: { current: number; limit: number; remaining: number }
  dailyUsage: {
    read: { current: number; limit: number; remaining: number }
    write: { current: number; limit: number; remaining: number }
    upsert: { current: number; limit: number; remaining: number }
  }
}> {
  const tier = subscriptionTier || 'free'
  const config = DEFAULT_RATE_LIMIT_CONFIG[tier]

  const hourlyCheck = await checkRateLimit(userId, config.hourlyRequestLimit, 1)
  const readCheck = await checkRateLimit(userId, config.dailyReadLimit, 24)
  const writeCheck = await checkRateLimit(userId, config.dailyWriteLimit, 24)
  const upsertCheck = await checkRateLimit(userId, config.dailyUpsertLimit, 24)

  return {
    isAdmin,
    tier,
    hourlyUsage: {
      current: hourlyCheck.currentUsage,
      limit: config.hourlyRequestLimit,
      remaining: hourlyCheck.remaining
    },
    dailyUsage: {
      read: {
        current: readCheck.currentUsage,
        limit: config.dailyReadLimit,
        remaining: readCheck.remaining
      },
      write: {
        current: writeCheck.currentUsage,
        limit: config.dailyWriteLimit,
        remaining: writeCheck.remaining
      },
      upsert: {
        current: upsertCheck.currentUsage,
        limit: config.dailyUpsertLimit,
        remaining: upsertCheck.remaining
      }
    }
  }
}
