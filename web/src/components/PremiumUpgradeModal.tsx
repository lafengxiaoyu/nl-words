import { useState } from 'react'
import './PremiumUpgradeModal.css'

interface PremiumUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  languageMode: 'chinese' | 'english'
}

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  languageMode
}: PremiumUpgradeModalProps) {
  const [showQRCode, setShowQRCode] = useState(false)

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
      price: '一次性付费 ¥66',
      upgradeButton: '查看支付方式',
      closeButton: '暂时不需要',
      note: '💡 提示：支付后备注您的邮箱或用户名，管理员将手动为您解锁。如果觉得这个应用对你有帮助，也可以请我喝杯咖啡 ☕',
      qrCodeNote: '📱 支付说明',
      qrCodeSteps: [
        '使用支付宝扫描上方二维码',
        '支付 ¥66',
        '在备注中填写您的邮箱地址或用户名',
        '管理员收到支付后会为您解锁 Premium 权限',
        '通常在 48 小时内完成解锁'
      ],
      hideQRCode: '返回'
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
      price: 'One-time payment ¥66',
      upgradeButton: 'View Payment Options',
      closeButton: 'Not Now',
      note: '💡 Note: Include your email or username in payment note, admin will unlock for you manually. If you find this app helpful, feel free to buy me a coffee ☕',
      qrCodeNote: '📱 Payment Instructions',
      qrCodeSteps: [
        'Scan the QR code above with Alipay',
        'Pay ¥66',
        'Include your email or username in the payment note',
        'Admin will unlock Premium access after payment is received',
        'Usually unlocked within 48 hours'
      ],
      hideQRCode: 'Back'
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
          {!showQRCode ? (
            <>
              <div className="premium-features">
                {t.features.map((feature, index) => (
                  <div key={index} className="premium-feature">{feature}</div>
                ))}
              </div>

              <div className="premium-price">{t.price}</div>

              <div className="premium-note">{t.note}</div>
            </>
          ) : (
            <div className="alipay-qrcode-container">
              <div className="qrcode-wrapper">
                {/* 请将您的支付宝收款码图片放在 public 目录下，例如 public/alipay-qrcode.png */}
                <img
                  src="/alipay-qrcode.png"
                  alt="支付宝收款码 / Alipay QR Code"
                  className="alipay-qrcode"
                  onError={(e) => {
                    // 如果图片不存在，显示占位符
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'qrcode-placeholder';
                    placeholder.innerHTML = `
                      <div class="qrcode-placeholder-text">
                        <p>📷</p>
                        <p>请将支付宝收款码图片重命名为</p>
                        <p><strong>alipay-qrcode.png</strong></p>
                        <p>并放在 <strong>web/public/</strong> 目录下</p>
                      </div>
                    `;
                    target.parentElement?.appendChild(placeholder);
                  }}
                />
              </div>

              <div className="payment-instructions">
                <h3>{t.qrCodeNote}</h3>
                <ol className="payment-steps">
                  {t.qrCodeSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="premium-modal-footer">
          {!showQRCode ? (
            <>
              <button
                className="btn btn-primary btn-full premium-upgrade-btn"
                onClick={() => setShowQRCode(true)}
              >
                {t.upgradeButton}
              </button>
              <button
                className="btn btn-outline btn-full"
                onClick={onClose}
              >
                {t.closeButton}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-full"
              onClick={() => setShowQRCode(false)}
            >
              {t.hideQRCode}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
