import { useState } from 'react'
import './PremiumUpgradeModal.css'

interface PremiumUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade?: () => void
  languageMode: 'chinese' | 'english'
}

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
  languageMode
}: PremiumUpgradeModalProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // 这里未来可以集成 LemonSqueezy 支付
      if (onUpgrade) {
        await onUpgrade()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const translations = {
    chinese: {
      title: '🔓 解锁高级单词',
      subtitle: '升级到 Premium，访问 B1 及以上难度单词',
      features: [
        '✅ 访问 B1、B2、C1、C2 难度单词',
        '✅ 更多高级词汇学习',
        '✅ 提升到高级荷兰语水平',
        '✅ 终身访问权限'
      ],
      price: '一次性付费 ¥99',
      upgradeButton: '立即升级',
      closeButton: '暂时不需要',
      note: '💡 提示：目前由管理员手动升级订阅'
    },
    english: {
      title: '🔓 Unlock Premium Words',
      subtitle: 'Upgrade to Premium to access B1+ difficulty words',
      features: [
        '✅ Access B1, B2, C1, C2 difficulty words',
        '✅ More advanced vocabulary',
        '✅ Reach advanced Dutch level',
        '✅ Lifetime access'
      ],
      price: 'One-time payment $15',
      upgradeButton: 'Upgrade Now',
      closeButton: 'Not Now',
      note: '💡 Note: Currently upgraded manually by admin'
    }
  }

  const t = translations[languageMode]

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="premium-modal-close" onClick={onClose}>×</button>

        <div className="premium-modal-header">
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>

        <div className="premium-modal-body">
          <div className="premium-features">
            {t.features.map((feature, index) => (
              <div key={index} className="premium-feature">{feature}</div>
            ))}
          </div>

          <div className="premium-price">{t.price}</div>

          <div className="premium-note">{t.note}</div>
        </div>

        <div className="premium-modal-footer">
          <button
            className="btn btn-primary btn-full premium-upgrade-btn"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? '处理中...' : t.upgradeButton}
          </button>
          <button
            className="btn btn-outline btn-full"
            onClick={onClose}
            disabled={loading}
          >
            {t.closeButton}
          </button>
        </div>
      </div>
    </div>
  )
}
