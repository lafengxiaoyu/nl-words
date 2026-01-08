/**
 * 订阅管理服务
 * 处理用户订阅的查询、更新和权限检查
 */

import { supabase } from './supabase'
import type { Subscription, SubscriptionTier, SubscriptionStatus } from './lemonSqueezy'

/**
 * 获取用户的订阅信息
 * @param userId - 用户 ID
 * @returns 订阅信息，如果不存在则返回 null
 */
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('获取用户订阅失败:', error)
    return null
  }
}

/**
 * 获取用户的订阅级别
 * @param userId - 用户 ID
 * @returns 订阅级别
 */
export async function getUserSubscriptionTier(
  userId: string
): Promise<SubscriptionTier> {
  try {
    const subscription = await getUserSubscription(userId)

    // 检查订阅是否有效
    if (!subscription) {
      return 'free'
    }

    if (subscription.status !== 'active') {
      return 'free'
    }

    // 检查订阅是否过期
    if (subscription.renews_at) {
      const now = new Date()
      const renewDate = new Date(subscription.renews_at)
      if (now > renewDate) {
        return 'free'
      }
    }

    return subscription.tier
  } catch (error) {
    console.error('获取用户订阅级别失败:', error)
    return 'free' // 默认为免费用户
  }
}

/**
 * 检查用户是否为付费用户
 * @param userId - 用户 ID
 * @returns 是否为付费用户
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId)
  return tier === 'premium'
}

/**
 * 创建或更新用户订阅
 * @param userId - 用户 ID
 * @param subscriptionData - 订阅数据
 */
export async function upsertSubscription(
  userId: string,
  subscriptionData: Partial<Subscription>
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        ...subscriptionData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('更新订阅失败:', error)
    return null
  }
}

/**
 * 处理 LemonSqueezy 订单创建事件
 * @param userId - 用户 ID
 * @param orderData - 订单数据
 */
export async function handleOrderCreated(
  userId: string,
  orderData: {
    lemonsqueezy_order_id: string
    lemonsqueezy_customer_id: string
    lemonsqueezy_variant_id: string
    tier: SubscriptionTier
    status: SubscriptionStatus
  }
): Promise<boolean> {
  try {
    const success = await upsertSubscription(userId, orderData)
    return !!success
  } catch (error) {
    console.error('处理订单创建失败:', error)
    return false
  }
}

/**
 * 处理 LemonSqueezy 订阅更新事件
 * @param userId - 用户 ID
 * @param subscriptionData - 订阅数据
 */
export async function handleSubscriptionUpdated(
  userId: string,
  subscriptionData: Partial<Subscription>
): Promise<boolean> {
  try {
    const success = await upsertSubscription(userId, subscriptionData)
    return !!success
  } catch (error) {
    console.error('处理订阅更新失败:', error)
    return false
  }
}

/**
 * 处理订阅取消事件
 * @param userId - 用户 ID
 */
export async function handleSubscriptionCancelled(
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('处理订阅取消失败:', error)
    return false
  }
}

/**
 * 订阅过期检查（定时任务）
 * 标记所有已过期但状态仍为 active 的订阅
 */
export async function checkExpiredSubscriptions(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .lt('renews_at', new Date().toISOString())
      .eq('status', 'active')
      .select()

    if (error) throw error
    return data?.length || 0
  } catch (error) {
    console.error('检查过期订阅失败:', error)
    return 0
  }
}

/**
 * 获取所有活跃的 Premium 用户
 */
export async function getActivePremiumUsers(): Promise<Subscription[]> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        auth.users!inner(email)
      `)
      .eq('tier', 'premium')
      .eq('status', 'active')
      .gt('renews_at', new Date().toISOString())

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('获取 Premium 用户失败:', error)
    return []
  }
}

/**
 * 获取订阅统计信息
 */
export async function getSubscriptionStats(): Promise<{
  totalUsers: number
  premiumUsers: number
  freeUsers: number
  activeSubscriptions: number
  cancelledSubscriptions: number
}> {
  try {
    // 获取所有用户数
    const { count: totalUsers } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })

    // 获取 Premium 用户数
    const { count: premiumUsers } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'premium')
      .eq('status', 'active')

    const freeUsers = (totalUsers || 0) - (premiumUsers || 0)

    // 获取活跃订阅数
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 获取已取消订阅数
    const { count: cancelledSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    return {
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      freeUsers: freeUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      cancelledSubscriptions: cancelledSubscriptions || 0
    }
  } catch (error) {
    console.error('获取订阅统计失败:', error)
    return {
      totalUsers: 0,
      premiumUsers: 0,
      freeUsers: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0
    }
  }
}
