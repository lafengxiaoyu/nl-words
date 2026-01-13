import { supabase } from './supabase'

export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'expired'

export interface UserProfile {
  user_id: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  subscription_started_at?: string
  subscription_ends_at?: string
}

/**
 * 检查用户是否有权限访问指定难度的单词
 * @param user 用户对象
 * @param difficulty 单词难度
 * @returns 是否有访问权限
 */
export async function canAccessWordDifficulty(
  userId: string | null,
  difficulty: string
): Promise<boolean> {
  if (!userId) {
    // 未登录用户只能访问 A1 和 A2
    return difficulty === 'A1' || difficulty === 'A2'
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.error('获取用户订阅状态失败:', error)
      // 出错时默认只允许访问 A1 和 A2
      return difficulty === 'A1' || difficulty === 'A2'
    }

    const { subscription_tier } = data

    // 付费用户可以访问所有难度
    if (subscription_tier === 'premium') {
      return true
    }

    // 免费用户只能访问 A1 和 A2
    return difficulty === 'A1' || difficulty === 'A2'
  } catch (error) {
    console.error('检查访问权限时出错:', error)
    return difficulty === 'A1' || difficulty === 'A2'
  }
}

/**
 * 获取用户订阅信息
 */
export async function getUserSubscription(
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, subscription_tier, subscription_status, subscription_started_at, subscription_ends_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.error('获取用户订阅信息失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('获取用户订阅信息时出错:', error)
    return null
  }
}

/**
 * 检查用户是否是付费用户
 */
export async function isPremiumUser(userId: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const subscription = await getUserSubscription(userId)
    return subscription?.subscription_tier === 'premium'
  } catch (error) {
    console.error('检查付费用户状态时出错:', error)
    return false
  }
}

/**
 * 获取允许的难度级别列表
 */
export async function getAllowedDifficultyLevels(
  userId: string | null
): Promise<string[]> {
  const isPremium = await isPremiumUser(userId)
  return isPremium
    ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    : ['A1', 'A2']
}

/**
 * 管理员：更新用户订阅状态
 */
export async function updateUserSubscription(
  userId: string,
  subscriptionTier: SubscriptionTier,
  endsAt?: Date | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: {
      subscription_tier: SubscriptionTier
      subscription_started_at?: string
      subscription_ends_at?: string | null
      subscription_status?: SubscriptionStatus
    } = {
      subscription_tier: subscriptionTier
    }

    if (subscriptionTier === 'premium') {
      updateData.subscription_started_at = new Date().toISOString()
      updateData.subscription_status = 'active'
      updateData.subscription_ends_at = endsAt ? endsAt.toISOString() : null
    } else {
      updateData.subscription_status = 'expired'
      updateData.subscription_ends_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('更新用户订阅失败:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * 过滤单词列表，只返回用户有权限访问的单词
 */
export async function filterWordsBySubscription<T extends { difficulty: string }>(
  userId: string | null,
  words: T[]
): Promise<T[]> {
  const allowedLevels = await getAllowedDifficultyLevels(userId)
  return words.filter(word => allowedLevels.includes(word.difficulty))
}
