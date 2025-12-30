import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { words } from '../data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from '../data/words'
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
  const [wordList, setWordList] = useState<Word[]>(words)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 计算学习统计
  const masteredCount = wordList.filter(w => w.mastered).length
  const totalCount = wordList.length
  const progressPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  const t = {
    chinese: {
      title: '我的账户',
      accountInfo: '账户信息',
      username: '用户名',
      email: '邮箱',
      learningStats: '学习统计',
      totalWords: '总单词数',
      mastered: '已掌握',
      masteryRate: '掌握率',
      difficultyStats: '按难度统计',
      familiarityStats: '按熟悉程度统计',
      testStats: {
        viewCount: '查看次数',
        masteredCount: '标记掌握',
        unmasteredCount: '标记未掌握',
        testCount: '测试次数',
        correctCount: '测试正确',
        wrongCount: '测试错误',
              accuracy: '正确率',
        lastViewed: '最后查看',
        lastTested: '最后测试'
      },
      resetProgress: '确定要重置所有学习进度吗？此操作不可撤销。',
      resetButton: '🔄 重置进度',
      familiarityLabels: {
        new: '🆕 新词',
        learning: '📖 学习中',
        familiar: '😊 熟悉',
        mastered: '✅ 已掌握'
      },
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
      learningStats: 'Learning Statistics',
      totalWords: 'Total Words',
      mastered: 'Mastered',
      masteryRate: 'Mastery Rate',
      difficultyStats: 'By Difficulty',
      familiarityStats: 'By Familiarity',
      testStats: {
        viewCount: 'Views',
        masteredCount: 'Marked Mastered',
        unmasteredCount: 'Marked Unmastered',
        testCount: 'Tests',
        correctCount: 'Correct',
        wrongCount: 'Wrong',
              accuracy: 'Accuracy',
        lastViewed: 'Last Viewed',
        lastTested: 'Last Tested'
      },
      resetProgress: 'Are you sure you want to reset all learning progress? This action cannot be undone.',
      resetButton: '🔄 Reset Progress',
      familiarityLabels: {
        new: '🆕 New',
        learning: '📖 Learning',
        familiar: '😊 Familiar',
        mastered: '✅ Mastered'
      },
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

    // Load word list from localStorage
    const savedWords = localStorage.getItem('nl-words')
    if (savedWords) {
      try {
        const parsed = JSON.parse(savedWords)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWordList(parsed)
        }
      } catch (e) {
        console.error('Failed to load saved words', e)
      }
    }
  }, [navigate, languageMode])

  // 重置进度
  const resetProgress = async () => {
    if (window.confirm(languageMode === 'chinese' ? '确定要重置所有学习进度吗？此操作不可撤销。' : 'Are you sure you want to reset all learning progress? This action cannot be undone.')) {
      // 删除云端的进度数据
      if (user) {
        try {
          await supabase.from('user_progress').delete().eq('user_id', user.id)
          await supabase.from('word_stats').delete().eq('user_id', user.id)
        } catch (error) {
          console.error('删除云端进度失败:', error)
        }
      }

      const resetWords = wordList.map(word => ({
        ...word,
        mastered: false,
        familiarity: 'new' as FamiliarityLevel,
        stats: undefined
      }))

      setWordList(resetWords)
      localStorage.setItem('nl-words', JSON.stringify(resetWords))
      window.location.reload()
    }
  }

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

            {/* Learning Stats Section */}
            <section className="profile-section">
              <h2>{text.learningStats}</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">{text.totalWords}</div>
                  <div className="stat-value">{totalCount}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">{text.mastered}</div>
                  <div className="stat-value">{masteredCount}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">{text.masteryRate}</div>
                  <div className="stat-value">{progressPercentage}%</div>
                </div>
              </div>
              <div className="difficulty-stats">
                <h3>{text.difficultyStats}</h3>
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as DifficultyLevel[]).map(level => {
                  const levelWords = wordList.filter(w => w.difficulty === level)
                  const levelMastered = levelWords.filter(w => w.mastered).length
                  const levelPercentage = levelWords.length > 0 ? Math.round((levelMastered / levelWords.length) * 100) : 0
                  return (
                    <div key={level} className="difficulty-stat">
                      <span className="difficulty-badge difficulty--{level}">{level}</span>
                      <span>{levelMastered}/{levelWords.length}</span>
                      <span>({levelPercentage}%)</span>
                    </div>
                  )
                })}
              </div>
              <div className="familiarity-stats">
                <h3>{text.familiarityStats}</h3>
                {(['new', 'learning', 'familiar', 'mastered'] as FamiliarityLevel[]).map(level => {
                  const levelWords = wordList.filter(w => w.familiarity === level)
                  const levelPercentage = wordList.length > 0 ? Math.round((levelWords.length / wordList.length) * 100) : 0
                  return (
                    <div key={level} className="familiarity-stat">
                      <span className={`familiarity-badge familiarity--${level}`}>
                        {text.familiarityLabels[level]}
                      </span>
                      <span>{levelWords.length}</span>
                      <span>({levelPercentage}%)</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <hr className="profile-divider" />

            {/* Reset Progress Section */}
            <section className="profile-section">
              <button
                className="btn btn-danger btn-full"
                onClick={resetProgress}
              >
                {text.resetButton}
              </button>
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
