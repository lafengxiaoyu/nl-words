import { useState } from 'react'
import { openCheckout, SUBSCRIPTION_PLANS, LEMONSQUEEZY_PREMIUM_VARIANT_ID } from '../lib/lemonSqueezy'
import { isPremiumUser } from '../lib/subscriptionManager'
import { supabase } from '../lib/supabase'
import './PremiumModal.css'

interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  languageMode: 'chinese' | 'english'
  userId?: string
  userEmail?: string
}

// 锁图标
const LockIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="lock-icon">
    <path
      d="M12 15V17M6 21H18C19.6569 21 21 19.6569 21 18V9C21 7.34315 19.6569 6 18 6H17V4C17 2.34315 15.6569 1 14 1H10C8.34315 1 7 2.34315 7 4V6H6C4.34315 6 3 7.34315 3 9V18C3 19.6569 4.34315 21 6 21ZM9 4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V6H9V4ZM5 9C5 8.44772 5.44772 8 6 8H18C18.5523 8 19 8.44772 19 9V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V9Z"
      fill="currentColor"
    />
  </svg>
)

// 星星图标
const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="star-icon">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

// 对勾图标
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="check-icon">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
)

export default function PremiumModal({
  isOpen,
  onClose,
  languageMode,
  userId,
  userEmail
}: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [isProcessing, setIsProcessing] = useState(false)
  const [alreadyPremium, setAlreadyPremium] = useState(false)

  const translations = {
    chinese: {
      title: '升级到 Premium',
      subtitle: '解锁所有单词和高级功能',
      close: '关闭',
      features: {
        title: 'Premium 权益',
        items: [
          '解锁 B1-B2 难度单词',
          '解锁 C1-C2 高级单词',
          '无限次学习练习',
          '优先获得新功能',
          '学习数据云端同步'
        ]
      },
      plans: {
        title: '选择订阅计划',
        popular: '最受欢迎',
        recommended: '推荐',
        perMonth: '/月',
        save: '节省'
      },
      buttons: {
        subscribe: '立即订阅',
        alreadySubscribed: '您已经是 Premium 用户',
        goToPremium: '前往 Premium 页面'
      },
      guarantee: {
        title: '7天无理由退款',
        description: '如果不满意，随时申请退款'
      },
      secure: {
        title: '安全支付',
        description: '支持信用卡、PayPal 等多种支付方式'
      }
    },
    english: {
      title: 'Upgrade to Premium',
      subtitle: 'Unlock all words and premium features',
      close: 'Close',
      features: {
        title: 'Premium Benefits',
        items: [
          'Unlock B1-B2 level words',
          'Unlock C1-C2 advanced words',
          'Unlimited practice',
          'Early access to new features',
          'Cloud sync for learning data'
        ]
      },
      plans: {
        title: 'Choose Your Plan',
        popular: 'Most Popular',
        recommended: 'Recommended',
        perMonth: '/month',
        save: 'Save'
      },
      buttons: {
        subscribe: 'Subscribe Now',
        alreadySubscribed: 'You are already a Premium user',
        goToPremium: 'Go to Premium Page'
      },
      guarantee: {
        title: '7-day money-back guarantee',
        description: 'Full refund if not satisfied'
      },
      secure: {
        title: 'Secure payment',
        description: 'Supports credit card, PayPal and more'
      }
    }
  }

  const t = translations[languageMode]

  // 检查用户是否已经是 Premium
  const checkPremiumStatus = async () => {
    if (!userId) return
    const premium = await isPremiumUser(userId)
    setAlreadyPremium(premium)
  }

  if (isOpen && userId) {
    checkPremiumStatus()
  }

  const handleSubscribe = async () => {
    if (!userId || !userEmail) {
      console.error('用户信息不完整')
      return
    }

    setIsProcessing(true)

    try {
      // 打开 LemonSqueezy 支付页面
      openCheckout(userId, userEmail, LEMONSQUEEZY_PREMIUM_VARIANT_ID)

      // 监听支付成功后的消息（通过 postMessage）
      const handlePaymentSuccess = (event: MessageEvent) => {
        if (event.data.type === 'LEMONSQUEEZY_PAYMENT_SUCCESS') {
          setIsProcessing(false)
          onClose()
          // 刷新页面以更新订阅状态
          window.location.reload()
        }
      }

      window.addEventListener('message', handlePaymentSuccess)

      // 5分钟后移除监听器
      setTimeout(() => {
        window.removeEventListener('message', handlePaymentSuccess)
        setIsProcessing(false)
      }, 5 * 60 * 1000)

    } catch (error) {
      console.error('打开支付页面失败:', error)
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <button className="premium-modal-close" onClick={onClose} aria-label={t.close}>
          ×
        </button>

        <div className="premium-modal-header">
          <LockIcon />
          <h2 className="premium-modal-title">{t.title}</h2>
          <p className="premium-modal-subtitle">{t.subtitle}</p>
        </div>

        <div className="premium-modal-body">
          {/* 功能列表 */}
          <div className="premium-features">
            <h3 className="premium-features-title">{t.features.title}</h3>
            <ul className="premium-features-list">
              {t.features.items.map((item, index) => (
                <li key={index} className="premium-feature-item">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 订阅计划 */}
          <div className="premium-plans">
            <h3 className="premium-plans-title">{t.plans.title}</h3>
            <div className="premium-plans-container">
              {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                <div
                  key={plan.id}
                  className={`premium-plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.id === 'yearly' ? 'popular' : ''}`}
                  onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
                >
                  {plan.id === 'yearly' && (
                    <div className="plan-badge">{t.plans.popular}</div>
                  )}
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">{plan.price}</div>
                  <div className="plan-description">{plan.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 订阅按钮 */}
          <div className="premium-actions">
            {alreadyPremium ? (
              <button className="btn btn-secondary btn-disabled" disabled>
                {t.buttons.alreadySubscribed}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubscribe}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : t.buttons.subscribe}
              </button>
            )}
          </div>

          {/* 安全保障 */}
          <div className="premium-guarantee">
            <div className="guarantee-item">
              <div className="guarantee-icon">🛡️</div>
              <div className="guarantee-text">
                <div className="guarantee-title">{t.guarantee.title}</div>
                <div className="guarantee-description">{t.guarantee.description}</div>
              </div>
            </div>
            <div className="guarantee-item">
              <div className="guarantee-icon">🔒</div>
              <div className="guarantee-text">
                <div className="guarantee-title">{t.secure.title}</div>
                <div className="guarantee-description">{t.secure.description}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
