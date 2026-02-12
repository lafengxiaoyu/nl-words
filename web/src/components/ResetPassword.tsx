import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import './Auth.css'

interface ResetPasswordProps {
  languageMode: 'chinese' | 'english'
}

/**
 * 密码重置页面组件
 * 用户通过邮件中的重置链接访问此页面来设置新密码
 */
export default function ResetPassword({ languageMode }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const translations = {
    chinese: {
      title: '重置密码',
      subtitle: '请输入您的新密码',
      newPasswordLabel: '新密码',
      newPasswordPlaceholder: '至少6个字符',
      confirmPasswordLabel: '确认密码',
      confirmPasswordPlaceholder: '再次输入新密码',
      submitButton: '重置密码',
      processing: '处理中...',
      success: '密码重置成功！正在跳转到登录页面...',
      invalidLink: '重置链接无效或已过期',
      backToLogin: '返回登录',
      passwordMismatch: '两次输入的密码不一致',
      passwordTooShort: '密码至少需要6个字符',
      checking: '验证重置链接...'
    },
    english: {
      title: 'Reset Password',
      subtitle: 'Please enter your new password',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'At least 6 characters',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Enter new password again',
      submitButton: 'Reset Password',
      processing: 'Processing...',
      success: 'Password reset successful! Redirecting to login...',
      invalidLink: 'Reset link is invalid or expired',
      backToLogin: 'Back to Login',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      checking: 'Verifying reset link...'
    }
  }

  const t = translations[languageMode] || translations.chinese

  // 监听 Supabase 的 PASSWORD_RECOVERY：客户端从 URL 解析到恢复会话时会触发，作为兜底
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsValidSession(true)
        setChecking(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // 检查是否有有效的恢复会话
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // 若 URL 路径中有双斜杠（如 Supabase Site URL 末尾有 / 导致），先规范化避免路由异常
        if (typeof window !== 'undefined' && window.location.pathname.includes('//')) {
          const fixedPath = window.location.pathname.replace(/\/+/g, '/')
          const fixedUrl = fixedPath + window.location.search + window.location.hash
          window.history.replaceState(null, '', fixedUrl)
        }

        // 首先检查是否已有活跃的恢复会话
        let { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setIsValidSession(true)
          setChecking(false)
          return
        }

        // 若有 hash（Supabase 重定向），给客户端较长时间自动解析 hash 并设置 session（detectSessionInUrl）
        const hasHash = !!location.hash
        if (hasHash) {
          await new Promise((r) => setTimeout(r, 600))
          const retry = await supabase.auth.getSession()
          session = retry.data.session
          if (session) {
            setIsValidSession(true)
            setChecking(false)
            return
          }
        }

        // 如果没有会话，检查 URL 中的 token（支持 query 参数和 hash 片段两种格式）
        // 格式1: ?token=xxx&type=recovery (Supabase 邮件链接，token 为 token_hash)
        // 格式2: #access_token=xxx&refresh_token=xxx&type=recovery (Supabase 重定向，refresh_token 可能为空)
        const searchParams = new URLSearchParams(location.search)
        const hashParams = location.hash ? new URLSearchParams(location.hash.substring(1)) : null

        const type = searchParams.get('type') || hashParams?.get('type')
        if (type !== 'recovery') {
          setIsValidSession(false)
          return
        }

        const tokenFromQuery = searchParams.get('token')
        const tokenFromHash = hashParams?.get('token')
        const accessTokenFromHash = hashParams?.get('access_token')
        const refreshTokenFromHash = hashParams?.get('refresh_token') ?? ''
        // 统一：query 或 hash 里的 token 都优先当作 token_hash 用于 verifyOtp
        const tokenForVerify = tokenFromQuery || tokenFromHash

        // JWT 形如 xxx.yyy.zzz（三段 base64），否则多为 token_hash
        const looksLikeJwt = (s: string) => s.length > 100 && (s.match(/\./g)?.length ?? 0) >= 2

        if (tokenForVerify) {
          // 格式1: query 或 hash 中的 token 为 token_hash，用 verifyOtp 验证
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenForVerify,
            type: 'recovery'
          })
          if (error) {
            console.error('Verify OTP error:', error)
            setIsValidSession(false)
          } else {
            setIsValidSession(!!data.session)
          }
        } else if (accessTokenFromHash) {
          if (looksLikeJwt(accessTokenFromHash) && refreshTokenFromHash) {
            // 格式2a: hash 中为 JWT + refresh_token，用 setSession
            const { data, error } = await supabase.auth.setSession({
              access_token: accessTokenFromHash,
              refresh_token: refreshTokenFromHash
            })
            if (error) {
              console.error('Set session error:', error)
              setIsValidSession(false)
            } else {
              setIsValidSession(!!data.session)
            }
          } else {
            // 格式2b: hash 里 access_token 实为 token_hash（短/非 JWT），用 verifyOtp
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: accessTokenFromHash,
              type: 'recovery'
            })
            if (error) {
              console.error('Verify OTP error:', error)
              setIsValidSession(false)
            } else {
              setIsValidSession(!!data.session)
            }
          }
        } else {
          setIsValidSession(false)
        }
      } catch (err) {
        console.error('Check recovery session error:', err)
        setIsValidSession(false)
      } finally {
        setChecking(false)
      }
    }

    checkRecoverySession()
  }, [location.search, location.hash])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证密码
    if (newPassword.length < 6) {
      setError(t.passwordTooShort)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess(true)

      // 登出用户，让他们用新密码登录
      await supabase.auth.signOut()

      // 跳转到登录页面
      setTimeout(() => {
        const path = languageMode === 'english' ? '/en/learn' : '/zh/learn'
        navigate(path)
      }, 2000)
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    const path = languageMode === 'english' ? '/en/learn' : '/zh/learn'
    navigate(path)
  }

  // 正在检查会话
  if (checking) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{t.title}</h2>
          <p className="auth-subtitle">{t.checking}</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  // 无效的重置链接
  if (!isValidSession) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{t.title}</h2>
          <div className="auth-error">{t.invalidLink}</div>
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={handleBackToLogin}
          >
            {t.backToLogin}
          </button>
        </div>
      </div>
    )
  }

  // 成功重置
  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{t.title}</h2>
          <div className="auth-message">{t.success}</div>
        </div>
      </div>
    )
  }

  // 显示重置密码表单
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t.title}</h2>
        <p className="auth-subtitle">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="newPassword">{t.newPasswordLabel}</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.newPasswordPlaceholder}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t.confirmPasswordLabel}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? t.processing : t.submitButton}
          </button>
        </form>

        <div className="auth-footer">
          <button
            type="button"
            className="btn-link"
            onClick={handleBackToLogin}
            disabled={loading}
          >
            {t.backToLogin}
          </button>
        </div>
      </div>
    </div>
  )
}
