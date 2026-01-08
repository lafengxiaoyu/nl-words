import { useState } from 'react'
import type { DifficultyLevel } from '../data/types'
import PremiumModal from './PremiumModal'
import { isPremiumUser } from '../lib/subscriptionManager'
import { supabase } from '../lib/supabase'
import './DifficultyLock.css'

interface DifficultyLockProps {
  difficulty: DifficultyLevel
  languageMode: 'chinese' | 'english'
  userId?: string
  onUnlock: () => void
}

// 锁图标
const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="lock-icon-small">
    <path
      d="M12 15V17M6 21H18C19.6569 21 21 19.6569 21 18V9C21 7.34315 19.6569 6 18 6H17V4C17 2.34315 15.6569 1 14 1H10C8.34315 1 7 2.34315 7 4V6H6C4.34315 6 3 7.34315 3 9V18C3 19.6569 4.34315 21 6 21ZM9 4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V6H9V4ZM5 9C5 8.44772 5.44772 8 6 8H18C18.5523 8 19 8.44772 19 9V18C19 18.5523 18.5523 19 18 19H6C5.44772 19 5 18.5523 5 18V9Z"
      fill="currentColor"
    />
  </svg>
)

// 皇冠图标
const CrownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="crown-icon">
    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM5 16V19H19V16H5Z" />
  </svg>
)

export default function DifficultyLock({
  difficulty,
  languageMode,
  userId,
  onUnlock
}: DifficultyLockProps) {
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const translations = {
    chinese: {
      title: '需要 Premium',
      description: (level: string) => `${level} 级别单词需要 Premium 订阅`,
      upgrade: '升级到 Premium',
      unlockAll: '解锁所有单词',
      currentPlan: '当前计划：免费',
      benefit1: '解锁 B1-B2 难度单词',
      benefit2: '解锁 C1-C2 高级单词',
      benefit3: '无限次学习练习',
      benefit4: '优先获得新功能',
      learnMore: '了解更多',
      close: '关闭'
    },
    english: {
      title: 'Premium Required',
      description: (level: string) => `${level} level words require Premium subscription`,
      upgrade: 'Upgrade to Premium',
      unlockAll: 'Unlock All Words',
      currentPlan: 'Current plan: Free',
      benefit1: 'Unlock B1-B2 level words',
      benefit2: 'Unlock C1-C2 advanced words',
      benefit3: 'Unlimited practice',
      benefit4: 'Early access to new features',
      learnMore: 'Learn More',
      close: 'Close'
    }
  }

  const t = translations[languageMode]

  // 判断是否需要 Premium
  const requiresPremium = difficulty === 'B1' || difficulty === 'B2' || difficulty === 'C1' || difficulty === 'C2'

  if (!requiresPremium) {
    return null
  }

  return (
    <>
      <div className="difficulty-lock" onClick={() => setShowPremiumModal(true)}>
        <div className="lock-icon-wrapper">
          <LockIcon />
        </div>
        <div className="lock-content">
          <div className="lock-title">
            <CrownIcon />
            {t.title}
          </div>
          <p className="lock-description">{t.description(difficulty)}</p>
          <button className="btn btn-primary btn-sm" onClick={(e) => {
            e.stopPropagation()
            setShowPremiumModal(true)
          }}>
            {t.upgrade}
          </button>
        </div>
      </div>

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        languageMode={languageMode}
        userId={userId}
      />
    </>
  )
}
