import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Auth.css'

interface AuthProps {
  onAuthSuccess: () => void
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isSupabaseConfigured) {
      setError('Supabase 未配置，请先设置环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
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
          setMessage('登录成功！')
          setTimeout(() => {
            onAuthSuccess()
          }, 500)
        }
      } else {
        // 注册
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          setMessage('注册成功！请检查邮箱验证链接（如果启用了邮箱验证）')
          setTimeout(() => {
            setIsLogin(true)
            setMessage(null)
          }, 2000)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败，请重试')
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
        <h2>🇳🇱 荷兰语单词学习</h2>
        <p className="auth-subtitle">
          {isLogin ? '登录以同步学习进度' : '注册新账户'}
        </p>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
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
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6个字符"
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
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
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
            {isLogin ? '还没有账户？注册' : '已有账户？登录'}
          </button>
        </div>

        <div className="auth-divider">
          <span>或</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-full"
          onClick={handleGuestMode}
          disabled={loading}
        >
          游客模式（不登录）
        </button>

        <p className="auth-note">
          💡 提示：游客模式下学习进度仅保存在本地，登录后可同步到云端
        </p>
      </div>
    </div>
  )
}

