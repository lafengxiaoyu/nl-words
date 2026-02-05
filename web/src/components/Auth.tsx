import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Auth.css'

interface AuthProps {
  onAuthSuccess: () => void
  languageMode: 'chinese' | 'english'
}

export default function Auth({ onAuthSuccess, languageMode }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const translations = {
    chinese: {
      title: '🇳🇱 荷兰语单词学习',
      loginSubtitle: '登录以同步学习进度',
      registerSubtitle: '注册新账户',
      usernameLabel: '用户名',
      usernamePlaceholder: '请输入用户名',
      emailLabel: '邮箱',
      passwordLabel: '密码',
      passwordPlaceholder: '至少6个字符',
      processing: '处理中...',
      loginButton: '登录',
      registerButton: '注册',
      switchToRegister: '还没有账户？注册',
      switchToLogin: '已有账户？登录',
      or: '或',
      guestMode: '游客模式（不登录）',
      guestHint: '💡 提示：游客模式下学习进度仅保存在本地，登录后可同步到云端',
      loginSuccess: '登录成功！',
      registerSuccess: '注册成功！正在跳转到学习页面...',
      configError: 'Supabase 未配置，请先设置环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY',
      operationError: '操作失败，请重试'
    },
    english: {
      title: '🇳🇱 Dutch Word Learning',
      loginSubtitle: 'Login to sync progress',
      registerSubtitle: 'Create new account',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter username',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      processing: 'Processing...',
      loginButton: 'Login',
      registerButton: 'Sign Up',
      switchToRegister: "Don't have an account? Sign up",
      switchToLogin: 'Already have an account? Login',
      or: 'Or',
      guestMode: 'Guest Mode (No login)',
      guestHint: '💡 Tip: Progress is saved locally in guest mode. Login to sync to cloud.',
      loginSuccess: 'Login successful!',
      registerSuccess: 'Sign up successful! Redirecting to learning page...',
      configError: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.',
      operationError: 'Operation failed, please try again'
    }
  }

  const t = translations[languageMode]

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isSupabaseConfigured) {
      setError(t.configError)
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        // 登录
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage(t.loginSuccess)
          setTimeout(() => {
            onAuthSuccess()
          }, 500)
        }
      } else {
        // 注册
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        })

        if (error) throw error

        if (data.user) {
          // 数据库触发器会自动创建用户资料，但如果需要立即显示用户名，可以手动更新
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ username: username })
            .eq('user_id', data.user.id)

          if (profileError) {
            console.error('保存用户信息失败:', profileError)
          }

          setMessage(t.registerSuccess)
          setTimeout(() => {
            // 跳转到当前语言的学习页面
            const path = languageMode === 'english' ? '/en/learn' : '/zh/learn'
            window.location.href = `https://lafengxiaoyu.github.io/nl-words${path}`
          }, 1500)
        }
      }
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || t.operationError)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestMode = () => {
    onAuthSuccess()
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{t.title}</h2>
        <p className="auth-subtitle">
          {isLogin ? t.loginSubtitle : t.registerSubtitle}
        </p>

        <form onSubmit={handleAuth} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">{t.usernameLabel}</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                required
                minLength={2}
                maxLength={20}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t.passwordLabel}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? t.processing : isLogin ? t.loginButton : t.registerButton}
          </button>
        </form>

        <div className="auth-footer">
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
              setMessage(null)
            }}
            disabled={loading}
          >
            {isLogin ? t.switchToRegister : t.switchToLogin}
          </button>
        </div>

        <div className="auth-divider">
          <span>{t.or}</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-full"
          onClick={handleGuestMode}
          disabled={loading}
        >
          {t.guestMode}
        </button>

        <p className="auth-note">
          {t.guestHint}
        </p>
      </div>
    </div>
  )
}
