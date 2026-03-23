import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Auth.css'

interface AuthProps {
  onAuthSuccess: () => void
  languageMode: 'chinese' | 'english'
  onLanguageChange?: (mode: 'chinese' | 'english') => void
}

type AuthMode = 'login' | 'register' | 'reset'

export default function Auth({ onAuthSuccess, languageMode, onLanguageChange }: AuthProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 生成验证码的辅助函数
  const generateCaptcha = () => {
    const operators = ['+', '-', '*']
    const operator = operators[Math.floor(Math.random() * operators.length)]
    const a = Math.floor(Math.random() * 10) + 1
    const b = Math.floor(Math.random() * 10) + 1

    let answer: number
    const question = `${a} ${operator} ${b}`

    if (operator === '+') answer = a + b
    else if (operator === '-') answer = a - b
    else answer = a * b

    return { question, answer }
  }

  // 验证码状态
  const [captcha, setCaptcha] = useState(() => generateCaptcha())
  const [captchaInput, setCaptchaInput] = useState('')

  // 严格邮箱验证
  const isValidEmail = (emailAddress: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,30}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,30}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(emailAddress)) return false

    // 分解邮箱
    const parts = emailAddress.split('@')
    if (parts.length !== 2) return false

    const localPart = parts[0]
    const domain = parts[1]

    // 拒绝纯数字域名 (如 123@312333312)
    if (/^\d+\.\d+$/.test(domain)) return false

    // 拒绝用户名包含8个以上连续数字
    if (/\d{8,}/.test(localPart)) return false

    // 拒绝顶级域名是5个以上数字
    const tld = domain.split('.').pop()
    if (tld && /^\d{5,}$/.test(tld)) return false

    // 确保域名包含至少一个字母
    if (!/[a-zA-Z]/.test(domain)) return false

    return true
  }

  // 刷新验证码
  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha())
    setCaptchaInput('')
  }

  const translations = {
    chinese: {
      title: '荷兰语单词学习',
      loginSubtitle: '登录以同步学习进度',
      registerSubtitle: '注册新账户',
      resetSubtitle: '重置密码',
      usernameLabel: '用户名',
      usernamePlaceholder: '请输入用户名',
      emailLabel: '邮箱',
      emailPlaceholder: '请输入邮箱地址',
      passwordLabel: '密码',
      passwordPlaceholder: '至少6个字符',
      processing: '处理中...',
      loginButton: '登录',
      registerButton: '注册',
      resetButton: '发送重置链接',
      switchToRegister: '还没有账户？注册',
      switchToLogin: '已有账户？登录',
      switchToReset: '忘记密码？',
      switchToLoginFromReset: '返回登录',
      or: '或',
      guestMode: '游客模式（不登录）',
      guestHint: '💡 提示：游客模式下学习进度仅保存在本地，登录后可同步到云端',
      loginSuccess: '登录成功！',
      registerSuccess: '注册成功！正在跳转到学习页面...',
      resetSuccess: '重置链接已发送到您的邮箱，请查收邮件',
      configError: 'Supabase 未配置，请先设置环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY',
      operationError: '操作失败，请重试',
      captchaLabel: '验证码',
      captchaError: '验证码错误',
      invalidEmail: '邮箱格式不正确，请输入有效的邮箱地址'
    },
    english: {
      title: 'Dutch Word Learning',
      loginSubtitle: 'Login to sync progress',
      registerSubtitle: 'Create new account',
      resetSubtitle: 'Reset Password',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Enter username',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email address',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      processing: 'Processing...',
      loginButton: 'Login',
      registerButton: 'Sign Up',
      resetButton: 'Send Reset Link',
      switchToRegister: "Don't have an account? Sign up",
      switchToLogin: 'Already have an account? Login',
      switchToReset: 'Forgot Password?',
      switchToLoginFromReset: 'Back to Login',
      or: 'Or',
      guestMode: 'Guest Mode (No login)',
      guestHint: '💡 Tip: Progress is saved locally in guest mode. Login to sync to cloud.',
      loginSuccess: 'Login successful!',
      registerSuccess: 'Sign up successful! Redirecting to learning page...',
      resetSuccess: 'Reset link sent to your email. Please check your inbox.',
      configError: 'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.',
      operationError: 'Operation failed, please try again',
      captchaLabel: 'Captcha',
      captchaError: 'Incorrect captcha',
      invalidEmail: 'Invalid email format. Please enter a valid email address'
    }
  }

  const t = translations[languageMode] || translations.chinese

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
      if (authMode === 'login') {
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
      } else if (authMode === 'register') {
        // 验证邮箱格式
        if (!isValidEmail(email)) {
          // 记录垃圾注册尝试到数据库（静默失败，不阻塞用户流程）
          supabase.rpc('log_spam_registration', {
            p_email: email,
            p_reason: 'Invalid email format detected'
          })

          setError(t.invalidEmail)
          setLoading(false)
          return
        }

        // 验证验证码
        const captchaAnswer = parseInt(captchaInput)
        if (isNaN(captchaAnswer) || captchaAnswer !== captcha.answer) {
          setError(t.captchaError)
          refreshCaptcha()
          setLoading(false)
          return
        }

        // 注册 - Supabase 仪表板已启用 Email Auto-confirmation
        // 用户注册后会立即激活，无需邮件验证
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        })

        // 特殊处理：如果是 rate limit 错误，给出友好提示
        if (error && error.message && (error.message.includes('rate limit') || error.message.includes('Rate limit'))) {
          setError(languageMode === 'chinese'
            ? '注册请求过于频繁，请稍后再试（1-2分钟后）'
            : 'Too many sign up attempts. Please try again later (after 1-2 minutes).')
          refreshCaptcha() // 刷新验证码
          return
        }

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

          // 发送注册成功通知到 Discord
          supabase.rpc('send_discord_alert_if_configured', {
            p_alert_type: 'auth_info',
            p_severity: 'info',
            p_message: `✅ 新用户注册成功\n📧 ${email}\n👤 ${username}`
          }).then(({ error }) => {
            if (error) {
              console.error('发送 Discord 通知失败:', error)
            }
          })

          setMessage(t.registerSuccess)
          setTimeout(() => {
            // 跳转到当前语言的学习页面
            const path = languageMode === 'english' ? '/en/learn' : '/zh/learn'

            // 根据环境确定跳转 URL
            if (import.meta.env.DEV) {
              // 开发环境：使用相对路径
              window.location.href = path
            } else {
              // 生产环境：使用 GitHub Pages
              window.location.href = `https://lafengxiaoyu.github.io/nl-words${path}`
            }
          }, 1500)
        }
      } else if (authMode === 'reset') {
        // 重置密码 - 根据当前语言跳转到对应的密码重置页面
        const resetPath = languageMode === 'english' ? 'en/reset-password' : 'zh/reset-password'

        // 根据环境确定重定向 URL（避免 base 末尾与 path 开头重复斜杠导致 //）
        const isDev = import.meta.env.DEV
        const base = isDev ? 'http://localhost:5173' : 'https://lafengxiaoyu.github.io/nl-words'
        const path = resetPath.startsWith('/') ? resetPath : `/${resetPath}`
        const redirectUrl = base.replace(/\/$/, '') + path

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        })

        if (error) throw error

        setMessage(t.resetSuccess)
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
        {/* 语言切换 */}
        <div className="auth-language-switch">
          <button
            className={`lang-btn ${languageMode === 'chinese' ? 'active' : ''}`}
            onClick={() => onLanguageChange?.('chinese')}
            disabled={loading}
          >
            中文
          </button>
          <button
            className={`lang-btn ${languageMode === 'english' ? 'active' : ''}`}
            onClick={() => onLanguageChange?.('english')}
            disabled={loading}
          >
            English
          </button>
        </div>

        <h2>{t.title}</h2>
        <p className="auth-subtitle">
          {authMode === 'login' ? t.loginSubtitle : authMode === 'register' ? t.registerSubtitle : t.resetSubtitle}
        </p>

        <form onSubmit={handleAuth} className="auth-form">
          {authMode === 'register' && (
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
              placeholder={authMode === 'reset' ? t.emailPlaceholder : 'your@email.com'}
              required
              disabled={loading}
            />
          </div>

          {authMode !== 'reset' && (
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
          )}

          {authMode === 'register' && (
            <div className="form-group">
              <label>{t.captchaLabel}</label>
              <div className="captcha-container">
                <span className="captcha-question">
                  {captcha.question} = ?
                </span>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="输入答案"
                  required
                  disabled={loading}
                  maxLength={3}
                />
                <button
                  type="button"
                  className="captcha-refresh"
                  onClick={refreshCaptcha}
                  disabled={loading}
                  title="刷新验证码"
                >
                  🔄
                </button>
              </div>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? t.processing : authMode === 'reset' ? t.resetButton : authMode === 'login' ? t.loginButton : t.registerButton}
          </button>
        </form>

        <div className="auth-footer">
          {authMode === 'login' && (
            <div className="auth-footer-links">
              <button
                type="button"
                className="btn-link"
                onClick={() => setAuthMode('reset')}
                disabled={loading}
              >
                {t.switchToReset}
              </button>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setAuthMode('register')
                  setError(null)
                  setMessage(null)
                }}
                disabled={loading}
              >
                {t.switchToRegister}
              </button>
            </div>
          )}

          {(authMode === 'register' || authMode === 'reset') && (
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setAuthMode('login')
                setError(null)
                setMessage(null)
              }}
              disabled={loading}
            >
              {authMode === 'reset' ? t.switchToLoginFromReset : t.switchToLogin}
            </button>
          )}
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
