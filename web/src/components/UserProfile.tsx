import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './UserProfile.css'

interface UserProfileProps {
  user: { id: string; email?: string }
  onClose: () => void
  languageMode: 'chinese' | 'english'
}

export default function UserProfile({ user, onClose, languageMode }: UserProfileProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const t = {
    chinese: {
      title: '用户信息',
      email: '邮箱',
      userId: '用户 ID',
      changePassword: '修改密码',
      currentPassword: '当前密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      updateButton: '更新密码',
      closeButton: '关闭',
      errors: {
        notConfigured: 'Supabase 未配置',
        passwordsNotMatch: '两次输入的密码不一致',
        passwordTooShort: '密码至少需要6个字符',
      },
      success: '密码修改成功',
      failed: '密码修改失败'
    },
    english: {
      title: 'User Profile',
      email: 'Email',
      userId: 'User ID',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      updateButton: 'Update Password',
      closeButton: 'Close',
      errors: {
        notConfigured: 'Supabase not configured',
        passwordsNotMatch: 'Passwords do not match',
        passwordTooShort: 'Password must be at least 6 characters',
      },
      success: 'Password updated successfully',
      failed: 'Failed to update password'
    }
  }

  const text = t[languageMode]

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isSupabaseConfigured) {
      setError(text.errors.notConfigured)
      return
    }

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
    onClose()
    window.location.reload()
  }

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-card" onClick={(e) => e.stopPropagation()}>
        <button className="user-profile-close" onClick={onClose}>×</button>
        
        <h2>{text.title}</h2>
        
        <div className="user-info-section">
          <div className="user-info-item">
            <label>{text.email}:</label>
            <span>{user.email || 'N/A'}</span>
          </div>
          <div className="user-info-item">
            <label>{text.userId}:</label>
            <span className="user-id">{user.id}</span>
          </div>
        </div>

        <hr className="user-profile-divider" />

        <h3>{text.changePassword}</h3>
        
        <form onSubmit={handleChangePassword} className="change-password-form">
          <div className="form-group">
            <label htmlFor="new-password">{text.newPassword}</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••"
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
              placeholder="••••••"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && <div className="user-profile-error">{error}</div>}
          {message && <div className="user-profile-success">{message}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? '处理中...' : text.updateButton}
          </button>
        </form>

        <div className="user-profile-actions">
          <button
            className="btn btn-danger btn-full"
            onClick={handleLogout}
          >
            {languageMode === 'chinese' ? '退出登录' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  )
}
