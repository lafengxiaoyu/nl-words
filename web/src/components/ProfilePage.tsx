import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { baseWords } from '../data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from '../data/words'
import ActivityTimeline from './ActivityTimeline'
import './ProfilePage.css'

interface User {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    full_name?: string
  }
}

interface UserProfile {
  username?: string
  email?: string
  bio?: string
  role?: 'admin' | 'user' | 'moderator'
  avatar_url?: string
}

interface ProfilePageProps {
  languageMode: 'chinese' | 'english'
}

export default function ProfilePage({ languageMode }: ProfilePageProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const initialWords: Word[] = baseWords.map(word => ({
    ...word,
    familiarity: 'new',
    stats: undefined,
  }))
  const [wordList, setWordList] = useState<Word[]>(initialWords)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [bioInput, setBioInput] = useState('')
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 获取基础路径（兼容 Vite base path）
  const getBasePath = () => {
    return import.meta.env.BASE_URL || '/'
  }

  // 生成头像路径的辅助函数
  const getAvatarPath = (path: string) => {
    const base = getBasePath()
    const basePath = base.endsWith('/') ? base.slice(0, -1) : base
    return `${basePath}${path}`
  }

  // 头像列表 - SVG 图标
  const avatarOptions = [
    // 默认头像（放在第一位）
    { id: '0', svgPath: getAvatarPath('/avatars/default-avatar.svg'), name: languageMode === 'chinese' ? '默认头像' : 'Default Avatar' },
    // 男性头像
    { id: '1', svgPath: getAvatarPath('/avatars/man_avatars/01.svg'), name: 'Man 1' },
    { id: '2', svgPath: getAvatarPath('/avatars/man_avatars/02.svg'), name: 'Man 2' },
    { id: '3', svgPath: getAvatarPath('/avatars/man_avatars/03.svg'), name: 'Man 3' },
    { id: '4', svgPath: getAvatarPath('/avatars/man_avatars/04.svg'), name: 'Man 4' },
    { id: '5', svgPath: getAvatarPath('/avatars/man_avatars/05.svg'), name: 'Man 5' },
    { id: '6', svgPath: getAvatarPath('/avatars/man_avatars/06.svg'), name: 'Man 6' },
    { id: '7', svgPath: getAvatarPath('/avatars/man_avatars/07.svg'), name: 'Man 7' },
    { id: '8', svgPath: getAvatarPath('/avatars/man_avatars/08.svg'), name: 'Man 8' },
    { id: '9', svgPath: getAvatarPath('/avatars/man_avatars/09.svg'), name: 'Man 9' },
    { id: '10', svgPath: getAvatarPath('/avatars/man_avatars/10.svg'), name: 'Man 10' },
    { id: '11', svgPath: getAvatarPath('/avatars/man_avatars/11.svg'), name: 'Man 11' },
    { id: '12', svgPath: getAvatarPath('/avatars/man_avatars/12.svg'), name: 'Man 12' },
    { id: '13', svgPath: getAvatarPath('/avatars/man_avatars/13.svg'), name: 'Man 13' },
    { id: '14', svgPath: getAvatarPath('/avatars/man_avatars/14.svg'), name: 'Man 14' },
    { id: '15', svgPath: getAvatarPath('/avatars/man_avatars/15.svg'), name: 'Man 15' },
    { id: '16', svgPath: getAvatarPath('/avatars/man_avatars/16.svg'), name: 'Man 16' },
    { id: '17', svgPath: getAvatarPath('/avatars/man_avatars/17.svg'), name: 'Man 17' },
    { id: '18', svgPath: getAvatarPath('/avatars/man_avatars/18.svg'), name: 'Man 18' },
    { id: '19', svgPath: getAvatarPath('/avatars/man_avatars/19.svg'), name: 'Man 19' },
    { id: '20', svgPath: getAvatarPath('/avatars/man_avatars/20.svg'), name: 'Man 20' },
    { id: '21', svgPath: getAvatarPath('/avatars/man_avatars/21.svg'), name: 'Man 21' },
    { id: '22', svgPath: getAvatarPath('/avatars/man_avatars/22.svg'), name: 'Man 22' },
    { id: '23', svgPath: getAvatarPath('/avatars/man_avatars/23.svg'), name: 'Man 23' },
    { id: '24', svgPath: getAvatarPath('/avatars/man_avatars/24.svg'), name: 'Man 24' },
    { id: '25', svgPath: getAvatarPath('/avatars/man_avatars/25.svg'), name: 'Man 25' },
    { id: '26', svgPath: getAvatarPath('/avatars/man_avatars/26.svg'), name: 'Man 26' },
    { id: '27', svgPath: getAvatarPath('/avatars/man_avatars/27.svg'), name: 'Man 27' },
    { id: '28', svgPath: getAvatarPath('/avatars/man_avatars/28.svg'), name: 'Man 28' },
    { id: '29', svgPath: getAvatarPath('/avatars/man_avatars/29.svg'), name: 'Man 29' },
    { id: '30', svgPath: getAvatarPath('/avatars/man_avatars/30.svg'), name: 'Man 30' },
    { id: '31', svgPath: getAvatarPath('/avatars/man_avatars/31.svg'), name: 'Man 31' },
    { id: '32', svgPath: getAvatarPath('/avatars/man_avatars/32.svg'), name: 'Man 32' },
    { id: '33', svgPath: getAvatarPath('/avatars/man_avatars/33.svg'), name: 'Man 33' },
    { id: '34', svgPath: getAvatarPath('/avatars/man_avatars/34.svg'), name: 'Man 34' },
    { id: '35', svgPath: getAvatarPath('/avatars/man_avatars/35.svg'), name: 'Man 35' },
    { id: '36', svgPath: getAvatarPath('/avatars/man_avatars/36.svg'), name: 'Man 36' },
    // 女性头像
    { id: '37', svgPath: getAvatarPath('/avatars/women_avatars/01.svg'), name: 'Woman 1' },
    { id: '38', svgPath: getAvatarPath('/avatars/women_avatars/02.svg'), name: 'Woman 2' },
    { id: '39', svgPath: getAvatarPath('/avatars/women_avatars/03.svg'), name: 'Woman 3' },
    { id: '40', svgPath: getAvatarPath('/avatars/women_avatars/04.svg'), name: 'Woman 4' },
    { id: '41', svgPath: getAvatarPath('/avatars/women_avatars/05.svg'), name: 'Woman 5' },
    { id: '42', svgPath: getAvatarPath('/avatars/women_avatars/06.svg'), name: 'Woman 6' },
    { id: '43', svgPath: getAvatarPath('/avatars/women_avatars/07.svg'), name: 'Woman 7' },
    { id: '44', svgPath: getAvatarPath('/avatars/women_avatars/08.svg'), name: 'Woman 8' },
    { id: '45', svgPath: getAvatarPath('/avatars/women_avatars/09.svg'), name: 'Woman 9' },
    { id: '46', svgPath: getAvatarPath('/avatars/women_avatars/10.svg'), name: 'Woman 10' },
    { id: '47', svgPath: getAvatarPath('/avatars/women_avatars/11.svg'), name: 'Woman 11' },
    { id: '48', svgPath: getAvatarPath('/avatars/women_avatars/12.svg'), name: 'Woman 12' },
    { id: '49', svgPath: getAvatarPath('/avatars/women_avatars/13.svg'), name: 'Woman 13' },
    { id: '50', svgPath: getAvatarPath('/avatars/women_avatars/14.svg'), name: 'Woman 14' },
    { id: '51', svgPath: getAvatarPath('/avatars/women_avatars/15.svg'), name: 'Woman 15' },
    { id: '52', svgPath: getAvatarPath('/avatars/women_avatars/16.svg'), name: 'Woman 16' },
    { id: '53', svgPath: getAvatarPath('/avatars/women_avatars/17.svg'), name: 'Woman 17' },
    { id: '54', svgPath: getAvatarPath('/avatars/women_avatars/18.svg'), name: 'Woman 18' },
    { id: '55', svgPath: getAvatarPath('/avatars/women_avatars/19.svg'), name: 'Woman 19' },
    { id: '56', svgPath: getAvatarPath('/avatars/women_avatars/20.svg'), name: 'Woman 20' },
    { id: '57', svgPath: getAvatarPath('/avatars/women_avatars/21.svg'), name: 'Woman 21' },
    { id: '58', svgPath: getAvatarPath('/avatars/women_avatars/22.svg'), name: 'Woman 22' },
    { id: '59', svgPath: getAvatarPath('/avatars/women_avatars/23.svg'), name: 'Woman 23' },
    { id: '60', svgPath: getAvatarPath('/avatars/women_avatars/24.svg'), name: 'Woman 24' },
    { id: '61', svgPath: getAvatarPath('/avatars/women_avatars/25.svg'), name: 'Woman 25' },
    { id: '62', svgPath: getAvatarPath('/avatars/women_avatars/26.svg'), name: 'Woman 26' },
    { id: '63', svgPath: getAvatarPath('/avatars/women_avatars/27.svg'), name: 'Woman 27' },
    { id: '64', svgPath: getAvatarPath('/avatars/women_avatars/28.svg'), name: 'Woman 28' },
    { id: '65', svgPath: getAvatarPath('/avatars/women_avatars/29.svg'), name: 'Woman 29' },
    { id: '66', svgPath: getAvatarPath('/avatars/women_avatars/30.svg'), name: 'Woman 30' },
    { id: '67', svgPath: getAvatarPath('/avatars/women_avatars/31.svg'), name: 'Woman 31' },
    { id: '68', svgPath: getAvatarPath('/avatars/women_avatars/32.svg'), name: 'Woman 32' },
    { id: '69', svgPath: getAvatarPath('/avatars/women_avatars/33.svg'), name: 'Woman 33' },
    { id: '70', svgPath: getAvatarPath('/avatars/women_avatars/34.svg'), name: 'Woman 34' },
    { id: '71', svgPath: getAvatarPath('/avatars/women_avatars/35.svg'), name: 'Woman 35' },
    { id: '72', svgPath: getAvatarPath('/avatars/women_avatars/36.svg'), name: 'Woman 36' },
  ]

  // 获取默认头像（当用户未设置头像时使用）
  const getDefaultAvatar = () => {
    const base = getBasePath()
    // 移除 base 末尾的斜杠，然后添加路径
    const basePath = base.endsWith('/') ? base.slice(0, -1) : base
    return `${basePath}/avatars/default-avatar.svg`
  }

  // 获取用户头像URL，处理emoji旧数据
  const getAvatarUrl = (avatarUrl: string | undefined) => {
    if (!avatarUrl) {
      return getDefaultAvatar()
    }
    // 如果是以/avatars/开头的SVG路径，则添加 base path
    if (avatarUrl.startsWith('/avatars/') && avatarUrl.endsWith('.svg')) {
      const base = getBasePath()
      const basePath = base.endsWith('/') ? base.slice(0, -1) : base
      // 如果路径已经包含 base path，直接返回；否则添加 base path
      if (avatarUrl.startsWith(basePath)) {
        return avatarUrl
      }
      return `${basePath}${avatarUrl}`
    }
    // 否则视为emoji或无效路径，返回默认头像
    return getDefaultAvatar()
  }

  // 计算学习统计
  const masteredCount = wordList.filter(w => w.familiarity === 'mastered').length
  const totalCount = wordList.length
  const progressPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  const t = {
    chinese: {
      title: '我的账户',
      accountInfo: '账户信息',
      username: '用户名',
      email: '邮箱',
      bio: '个人简介',
      avatar: '头像',
      editUsername: '编辑用户名',
      editBio: '编辑简介',
      editAvatar: '更换头像',
      save: '保存',
      cancel: '取消',
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
      bio: 'Bio',
      avatar: 'Avatar',
      editUsername: 'Edit Username',
      editBio: 'Edit Bio',
      editAvatar: 'Change Avatar',
      save: 'Save',
      cancel: 'Cancel',
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
        // 加载用户资料
        await loadUserProfile(user.id)
      }
    }
    getUser()

    // Load word progress from localStorage
    const savedProgress = localStorage.getItem('nl-words')
    if (savedProgress) {
      try {
        const parsedWords: Word[] = JSON.parse(savedProgress)
        if (Array.isArray(parsedWords) && parsedWords.length > 0) {
          setWordList(parsedWords)
        }
      } catch (e) {
        console.error('Failed to load saved progress', e)
        // 如果加载失败，使用默认值
        const wordsWithProgress: Word[] = baseWords.map(word => ({
          ...word,
          familiarity: 'new' as FamiliarityLevel,
          stats: undefined,
        }))
        setWordList(wordsWithProgress)
      }
    } else {
      // 如果没有保存的数据，使用默认值
      const wordsWithProgress: Word[] = baseWords.map(word => ({
        ...word,
        familiarity: 'new' as FamiliarityLevel,
        stats: undefined,
      }))
      setWordList(wordsWithProgress)
    }
  }, [navigate, languageMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, email, bio, role, avatar_url')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setUserProfile(data)
        setUsernameInput(data.username || '')
        setBioInput(data.bio || '')
      } else {
        // 如果用户资料不存在，创建一个默认的
        const { data: newUserProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            username: user?.email?.split('@')[0] || 'user',
            email: user?.email || '',
            avatar_url: getDefaultAvatar()
          })
          .select('username, email, bio, role, avatar_url')
          .single()

        if (!createError && newUserProfile) {
          setUserProfile(newUserProfile)
          setUsernameInput(newUserProfile.username || '')
          setBioInput(newUserProfile.bio || '')
        }
      }
    } catch (err) {
      console.error('加载用户资料失败:', err)
    }
  }

  const handleUpdateUsername = async () => {
    if (!user || !usernameInput.trim()) return

    if (usernameInput.length < 2 || usernameInput.length > 20) {
      setError(languageMode === 'chinese' ? '用户名长度必须在2-20个字符之间' : 'Username must be 2-20 characters')
      return
    }

    setProfileLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: usernameInput.trim() })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage(languageMode === 'chinese' ? '用户名更新成功' : 'Username updated successfully')
      setUserProfile(prev => prev ? { ...prev, username: usernameInput.trim() } : null)
      setEditingUsername(false)
    } catch (err: unknown) {
      const error = err as Error
      setError(`${languageMode === 'chinese' ? '更新失败' : 'Update failed'}: ${error.message}`)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdateBio = async () => {
    if (!user) return

    setProfileLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ bio: bioInput.trim() || null })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage(languageMode === 'chinese' ? '简介更新成功' : 'Bio updated successfully')
      setUserProfile(prev => prev ? { ...prev, bio: bioInput.trim() || undefined } : null)
      setEditingBio(false)
    } catch (err: unknown) {
      const error = err as Error
      setError(`${languageMode === 'chinese' ? '更新失败' : 'Update failed'}: ${error.message}`)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdateAvatar = async (avatarUrl: string) => {
    if (!user) return

    setProfileLoading(true)
    setError(null)
    setMessage(null)

    try {
      // 将包含 base path 的路径转换为相对路径（用于数据库存储）
      const base = getBasePath()
      const basePath = base.endsWith('/') ? base.slice(0, -1) : base
      // 如果路径包含 base path，移除它；否则直接使用
      const relativePath = avatarUrl.startsWith(basePath) 
        ? avatarUrl.slice(basePath.length) 
        : avatarUrl

      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: relativePath })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage(languageMode === 'chinese' ? '头像更新成功' : 'Avatar updated successfully')
      // 更新本地状态时使用完整路径（包含 base path）
      setUserProfile(prev => prev ? { ...prev, avatar_url: relativePath } : null)
      setEditingAvatar(false)
    } catch (err: unknown) {
      const error = err as Error
      setError(`${languageMode === 'chinese' ? '更新失败' : 'Update failed'}: ${error.message}`)
    } finally {
      setProfileLoading(false)
    }
  }

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

      const resetWords: Word[] = baseWords.map(word => ({
        ...word,
        familiarity: 'new' as FamiliarityLevel,
        stats: undefined
      }))

      setWordList(resetWords)
      // 保存进度到 localStorage
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
            {/* Avatar Section */}
            <section className="profile-section">
              <div className="avatar-section">
                <div className="avatar-display">
                  <div className="avatar-large">
                    <img src={getAvatarUrl(userProfile?.avatar_url)} alt="Avatar" className="avatar-img" />
                  </div>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => setEditingAvatar(true)}
                  >
                    ✏️ {text.editAvatar}
                  </button>
                </div>
              </div>

              {/* Avatar Selection Modal */}
              {editingAvatar && (
                <div className="avatar-overlay" onClick={() => setEditingAvatar(false)}>
                  <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
                    <h3>{text.editAvatar}</h3>
                    <div className="avatar-grid">
                      {avatarOptions.map((avatar) => (
                        <button
                          key={avatar.id}
                          className={`avatar-option ${userProfile?.avatar_url === avatar.svgPath ? 'selected' : ''}`}
                          onClick={() => handleUpdateAvatar(avatar.svgPath)}
                          disabled={profileLoading}
                          title={avatar.name}
                        >
                          <img src={avatar.svgPath} alt={avatar.name} className="avatar-option-img" />
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn-secondary btn-full"
                      onClick={() => setEditingAvatar(false)}
                      disabled={profileLoading}
                    >
                      {text.cancel}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <hr className="profile-divider" />

            {/* Account Info Section */}
            <section className="profile-section">
              <h2>{text.accountInfo}</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>{text.username}</label>
                  <div className="info-value with-edit">
                    {editingUsername ? (
                      <div className="edit-input-group">
                        <input
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder={text.username}
                          minLength={2}
                          maxLength={20}
                          disabled={profileLoading}
                        />
                        <button
                          className="btn btn-small btn-primary"
                          onClick={handleUpdateUsername}
                          disabled={profileLoading}
                        >
                          {text.save}
                        </button>
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => {
                            setEditingUsername(false)
                            setUsernameInput(userProfile?.username || '')
                          }}
                          disabled={profileLoading}
                        >
                          {text.cancel}
                        </button>
                      </div>
                    ) : (
                      <>
                        {userProfile?.username || user.email?.split('@')[0] || 'N/A'}
                        <button
                          className="btn-edit"
                          onClick={() => setEditingUsername(true)}
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="info-item">
                  <label>{text.email}</label>
                  <div className="info-value">{user.email || 'N/A'}</div>
                </div>
                <div className="info-item">
                  <label>{text.bio}</label>
                  <div className="info-value with-edit">
                    {editingBio ? (
                      <div className="edit-input-group">
                        <textarea
                          value={bioInput}
                          onChange={(e) => setBioInput(e.target.value)}
                          placeholder={text.bio}
                          maxLength={200}
                          disabled={profileLoading}
                          rows={3}
                        />
                        <button
                          className="btn btn-small btn-primary"
                          onClick={handleUpdateBio}
                          disabled={profileLoading}
                        >
                          {text.save}
                        </button>
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => {
                            setEditingBio(false)
                            setBioInput(userProfile?.bio || '')
                          }}
                          disabled={profileLoading}
                        >
                          {text.cancel}
                        </button>
                      </div>
                    ) : (
                      <>
                        {userProfile?.bio || (languageMode === 'chinese' ? '暂无简介' : 'No bio')}
                        <button
                          className="btn-edit"
                          onClick={() => setEditingBio(true)}
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
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
                  const levelMastered = levelWords.filter(w => w.familiarity === 'mastered').length
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

            {/* Activity Timeline Section */}
            {user && (
              <section className="profile-section">
                <ActivityTimeline
                  languageMode={languageMode}
                  userId={user.id}
                />
              </section>
            )}

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
