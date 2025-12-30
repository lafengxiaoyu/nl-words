import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ProfilePage.css'

interface User {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    full_name?: string
  }
}

interface ProfilePageProps {
  languageMode: 'chinese' | 'english'
}

export default function ProfilePage({ languageMode }: ProfilePageProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const t = {
    chinese: {
      title: '我的账户',
      accountInfo: '账户信息',
      username: '用户名',
      email: '邮箱',
      changePassword: '修改密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      updateButton: '更新密码',
      backButton: '返回学习',
      logoutButton: '退出登录',
      errors: {
        notConfigured: 'Supabase 未配置',
        passwordsNotMatch: '两次输入的密码不一致',
        passwordTooShort: '密码至少需要6个字符',
      },
      success: '密码修改成功',
      failed: '密码修改失败',
      lastUpdated: '最后更新'
    },
    english: {
      title: 'My Account',
      accountInfo: 'Account Information',
      username: 'Username',
      email: 'Email',
      changePassword: 'Change Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      updateButton: 'Update Password',
      backButton: 'Back to Learning',
      logoutButton: 'Logout',
      errors: {
        notConfigured: 'Supabase not configured',
        passwordsNotMatch: 'Passwords do not match',
        passwordTooShort: 'Password must be at least 6 characters',
      },
      success: 'Password updated successfully',
      failed: 'Failed to update password',
      lastUpdated: 'Last Updated'
    }
  }

  const text = t[languageMode]

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)
      } else {
        setUser(user)
      }
    }
    getUser()
  }, [navigate, languageMode])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setError(text.errors.passwordsNotMatch)
      return
    }

    if (newPassword.length < 6) {
      setError(text.errors.passwordTooShort)
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage(text.success)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const error = err as Error
      setError(`${text.failed}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)
    window.location.reload()
  }

  if (!user) {
    return null
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <header className="profile-header">
          <div className="profile-header-content">
            <h1>{text.title}</h1>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
              {text.backButton}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="profile-main">
          <div className="profile-card">
            {/* Account Info Section */}
            <section className="profile-section">
              <h2>{text.accountInfo}</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>{text.username}</label>
                  <div className="info-value">
                    {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'N/A'}
                  </div>
                </div>
                <div className="info-item">
                  <label>{text.email}</label>
                  <div className="info-value">{user.email || 'N/A'}</div>
                </div>
              </div>
            </section>

            <hr className="profile-divider" />

            {/* Change Password Section */}
            <section className="profile-section">
              <h2>{text.changePassword}</h2>
              <form onSubmit={handleChangePassword} className="password-form">
                <div className="form-group">
                  <label htmlFor="new-password">{text.newPassword}</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">{text.confirmPassword}</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  {loading ? '处理中...' : text.updateButton}
                </button>
              </form>
            </section>

            <hr className="profile-divider" />

            {/* Logout Section */}
            <section className="profile-section">
              <button
                className="btn btn-danger btn-full"
                onClick={handleLogout}
              >
                {text.logoutButton}
              </button>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="profile-footer">
          <p>🇳🇱 {languageMode === 'chinese' ? '荷兰语单词学习' : 'Dutch Word Learning'}</p>
        </footer>
      </div>
    </div>
  )
}
