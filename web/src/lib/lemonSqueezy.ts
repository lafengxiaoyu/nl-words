/**
 * LemonSqueezy 集成工具
 * 处理订阅支付、Webhook 验证和权限管理
 */

// LemonSqueezy 配置
const LEMONSQUEEZY_STORE_ID = import.meta.env.VITE_LEMONSQUEEZY_STORE_ID || ''
const LEMONSQUEEZY_PREMIUM_VARIANT_ID = import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || ''

// 产品定价配置（与 LemonSqueezy Dashboard 对应）
export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly',
    price: '¥29/月',
    description: '按月订阅，随时取消'
  },
  YEARLY: {
    id: 'yearly',
    name: 'Yearly',
    price: '¥299/年',
    description: '年付省 15%，平均 ¥25/月'
  }
}

// 订阅级别类型
export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'inactive'

// 订阅信息接口
export interface Subscription {
  id: string
  user_id: string
  lemonsqueezy_customer_id: string | null
  lemonsqueezy_order_id: string | null
  lemonsqueezy_subscription_id: string | null
  lemonsqueezy_variant_id: string | null
  tier: SubscriptionTier
  status: SubscriptionStatus
  renews_at: string | null
  created_at: string
  updated_at: string
}

/**
 * 生成 LemonSqueezy 支付链接
 * @param userId - 用户 ID
 * @param email - 用户邮箱
 * @param variantId - 产品 Variant ID（月付/年付）
 * @returns 支付链接
 */
export function createCheckoutLink(
  userId: string,
  email: string,
  variantId: string
): string {
  const baseUrl = 'https://store.lemonsqueezy.com'
  const storeId = LEMONSQUEEZY_STORE_ID

  // 构建支付链接
  const checkoutUrl = new URL(`${baseUrl}/checkout/buy/${variantId}`)

  // 传递自定义数据（user_id 和 email 会在 Webhook 中返回）
  checkoutUrl.searchParams.append('checkout[custom][user_id]', userId)
  checkoutUrl.searchParams.append('checkout[email]', email)

  // 添加其他可选参数
  checkoutUrl.searchParams.append('checkout[discount]', '') // 可用于折扣码

  return checkoutUrl.toString()
}

/**
 * 打开 LemonSqueezy 支付页面
 * @param userId - 用户 ID
 * @param email - 用户邮箱
 * @param variantId - 产品 Variant ID
 */
export function openCheckout(
  userId: string,
  email: string,
  variantId: string
): void {
  const checkoutUrl = createCheckoutLink(userId, email, variantId)
  window.open(checkoutUrl, '_blank', 'width=800,height=600,noopener,noreferrer')
}

/**
 * 根据订阅级别筛选单词
 * @param words - 单词列表
 * @param tier - 用户订阅级别
 * @returns 筛选后的单词列表
 */
export function filterWordsBySubscription<T extends { difficulty: string }>(
  words: T[],
  tier: SubscriptionTier
): T[] {
  if (tier === 'premium') {
    return words // 付费用户可以看到所有单词
  }

  // 免费用户只能看到 A1 和 A2 单词
  return words.filter(word => word.difficulty === 'A1' || word.difficulty === 'A2')
}

/**
 * 检查用户是否可以访问特定难度的单词
 * @param difficulty - 单词难度
 * @param tier - 用户订阅级别
 * @returns 是否可以访问
 */
export function canAccessDifficulty(
  difficulty: string,
  tier: SubscriptionTier
): boolean {
  if (tier === 'premium') {
    return true // 付费用户可以访问所有难度
  }

  // 免费用户只能访问 A1 和 A2
  return difficulty === 'A1' || difficulty === 'A2'
}

/**
 * 检查配置是否完整
 */
export function isLemonSqueezyConfigured(): boolean {
  return (
    LEMONSQUEEZY_STORE_ID !== '' &&
    LEMONSQUEEZY_PREMIUM_VARIANT_ID !== ''
  )
}

/**
 * 获取配置状态信息
 */
export function getLemonSqueezyConfigStatus() {
  return {
    configured: isLemonSqueezyConfigured(),
    storeId: LEMONSQUEEZY_STORE_ID,
    premiumVariantId: LEMONSQUEEZY_PREMIUM_VARIANT_ID,
    warning: !isLemonSqueezyConfigured()
      ? 'LemonSqueezy 未配置，请在 .env 文件中设置 VITE_LEMONSQUEEZY_STORE_ID 和 VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID'
      : null
  }
}

/**
 * 从 Webhook 事件中提取用户数据
 * @param payload - LemonSqueezy Webhook payload
 * @returns 用户 ID 和邮箱
 */
export function extractUserDataFromWebhook(payload: any): {
  userId: string | null
  email: string | null
} {
  try {
    const customData = payload.data?.meta?.custom_data
    const userData = payload.data?.attributes?.first_order_item?.custom_price?.custom_data

    // LemonSqueezy 可能在不同位置传递自定义数据
    return {
      userId: customData?.user_id || userData?.user_id || null,
      email: payload.data?.attributes?.user_email || payload.meta?.custom_data?.email || null
    }
  } catch (error) {
    console.error('提取用户数据失败:', error)
    return { userId: null, email: null }
  }
}

/**
 * 订阅过期时间计算
 * @param tier - 订阅级别
 * @param planType - 计划类型（monthly/yearly）
 * @returns 过期时间
 */
export function calculateExpiryDate(
  tier: SubscriptionTier,
  planType: 'monthly' | 'yearly'
): Date {
  const now = new Date()
  const months = planType === 'monthly' ? 1 : 12
  now.setMonth(now.getMonth() + months)
  return now
}

export {
  LEMONSQUEEZY_STORE_ID,
  LEMONSQUEEZY_PREMIUM_VARIANT_ID
}
