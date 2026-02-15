import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import { words } from './data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from './data/words'
import type { ExampleTranslations } from './data/types'
import { supabase } from './lib/supabase'
import { loadUserProgress, saveUserProgress, mergeProgress, incrementViewCount, updateMasteryStats } from './lib/progressSync'
import { calculateFamiliarityScore } from './lib/familiarityCalculator'
import { isPremiumUser } from './lib/subscription'
import { safeLocalStorage } from './lib/safeLocalStorage'
import { initializeProgressStorage, loadProgressFromStorage } from './lib/progressStorage'
import { useProgressStorage } from './lib/useProgressStorage'
import type { UserWordProgress } from './data/types'
import Auth from './components/Auth'
import UserProfile from './components/UserProfile'
import ProfilePage from './components/ProfilePage'
import TestPage from './components/TestPage'
import WordListPage from './components/WordListPage'
import AdminDashboard from './components/AdminDashboard'
import SpellingGame from './components/SpellingGame'
import TestSelectionPage from './components/TestSelectionPage'
import TableSpellingTest from './components/TableSpellingTest'
import AboutPage from './components/AboutPage'
import ResetPassword from './components/ResetPassword'
import PremiumUpgradeModal from './components/PremiumUpgradeModal'
import SmartReviewPage from './components/SmartReviewPage'
import { Flashcard } from './components/Flashcard'
import logo from './assets/images/dutch-lex.svg'

// 发音按钮图标组件
const SpeakerIcon = ({ isSpeaking }: { isSpeaking: boolean }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`speaker-icon ${isSpeaking ? 'speaking' : ''}`}>
      {/* 喇叭主体 */}
      <path
        d="M3 9V15H7L12 20V4L7 9H3Z"
        fill="currentColor"
      />
      {/* 声波 */}
      <path
        d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"
        fill="currentColor"
        opacity="0.5"
      />
      {/* 脉冲圈 */}
      {isSpeaking && (
        <>
          <circle cx="12" cy="12" r="10" className="pulse-ring" />
          <circle cx="12" cy="12" r="14" className="pulse-ring" style={{ animationDelay: '0.3s' }} />
        </>
      )}
    </svg>
  )
}

// 翻译图标组件
const TranslateIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="translate-icon">
      <path
        d="M5 8l6 0"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 8l0 6"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14l8 0"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14l0 4"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 5h12"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 2h1"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 22l-3-10"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 22l5-18"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 22l-5-18"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 左箭头图标组件
const ChevronLeftIcon = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="chevron-icon">
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 右箭头图标组件
const ChevronRightIcon = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="chevron-icon">
      <path
        d="M9 18L15 12L9 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 用户图标组件
const UserIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="user-icon">
      <path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 语言/地球图标组件
const GlobeIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="globe-icon">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 锁图标组件
const LockIcon = () => {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="lock-svg-icon">
      <path
        d="M12 15V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 菜单图标组件
const MenuIcon = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="menu-icon">
      {isOpen ? (
        // X 图标（关闭状态）
        <>
          <path
            d="M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 6L18 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        // 菜单图标（打开状态）
        <>
          <path
            d="M3 12H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 6H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 18H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  )
}

// 随机排序/洗牌图标组件
const ShuffleIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shuffle-icon">
      <path
        d="M16 3H21V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20L21 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 16V21H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 15L21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4L9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 详情/信息图标组件
const InfoIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="info-icon">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8H12.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 语言模式类型
type LanguageMode = 'chinese' | 'english'

// Supabase user type
interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    full_name?: string
  }
}

// MainApp component
function MainApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<{ avatar_url?: string } | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  
  // 获取基础路径（兼容 Vite base path）
  const getBasePath = () => {
    return import.meta.env.BASE_URL || '/'
  }

  // 获取默认头像路径
  const getDefaultAvatarPath = () => {
    const base = getBasePath()
    const basePath = base.endsWith('/') ? base.slice(0, -1) : base
    return `${basePath}/avatars/default-avatar.svg`
  }

  // 获取用户头像URL
  const getUserAvatarUrl = (avatarUrl: string | undefined) => {
    if (!avatarUrl) {
      return null // 返回 null 表示使用默认图标
    }
    // 如果是默认头像路径，返回 null（使用默认图标）
    const defaultPath = getDefaultAvatarPath()
    if (avatarUrl === '/avatars/default-avatar.svg' || avatarUrl === defaultPath || avatarUrl.endsWith('/avatars/default-avatar.svg')) {
      return null
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
    // 否则视为无效路径，返回 null（使用默认图标）
    return null
  }

  // 加载用户资料
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setUserProfile(data)
      } else {
        setUserProfile(null)
      }
    } catch (err) {
      console.error('加载用户资料失败:', err)
      setUserProfile(null)
    }
  }

  // 加载用户订阅状态
  const loadUserSubscription = async (userId: string) => {
    try {
      const premium = await isPremiumUser(userId)
      setIsPremium(premium)
    } catch (err) {
      console.error('加载订阅状态失败:', err)
      setIsPremium(false)
    }
  }
  const [wordList, setWordList] = useState<Word[]>(words)
  const [filteredWordList, setFilteredWordList] = useState<Word[]>(words)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all')
  const [languageMode, setLanguageMode] = useState<LanguageMode>('chinese')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)

  // 发音功能
  const speakDutch = (text: string) => {
    if (!text || !window.speechSynthesis) return

    // 取消当前正在播放的语音
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nl-NL' // 荷兰语
    utterance.rate = 0.9 // 语速稍慢，更适合学习
    utterance.pitch = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  // Translations object
  const translations = {
    chinese: {
      appTitle: '荷兰语单词学习',
      chineseLabel: '🇨🇳 中文',
      englishLabel: '🇺🇸 EN',
      allLabel: '全部',
      a1a2Label: 'A1-A2',
      b1b2Label: 'B1-B2',
      c1c2Label: 'C1-C2',
      premiumBadge: '👑 Premium',
      masteredText: '已掌握',
      masteredCount: (mastered: number, total: number, percentage: number) => `${mastered} / ${total} 已掌握 (${percentage}%)`,
      syncStatus: {
        syncing: '🔄 同步中...',
        success: '✅ 同步成功',
        error: '❌ 同步失败'
      },
      loginButton: '登录',
      shuffleButton: '随机排序',
      showDetailsButton: (show: boolean) => show ? '隐藏详情' : '显示详情',
      prevButton: '←',
      nextButton: '→',
      flipCardHint: '点击卡片翻转 · 左滑未掌握 · 右滑已掌握',
      speakButton: '🔊 发音',
      speakExampleButton: '🔊 例句发音',
      familiarityLabels: {
        new: '🆕 新词',
        learning: '📖 学习中',
        familiar: '😊 熟悉',
        mastered: '✅ 已掌握'
      },
      swipeFeedback: {
        mastered: '✅ 已掌握',
        unmastered: '❌ 未掌握'
      },
      statsPanel: {
        title: '学习统计',
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
        }
      },
      detailsPanel: {
        title: '单词详情',
        dutch: '荷兰语',
        chinese: '中文',
        english: '英文',
        partOfSpeech: '词性',
        difficulty: '难度',
        familiarity: '熟悉程度',
        article: '冠词',
        singular: '单数',
        plural: '复数',
        separable: '可分动词',
        inseparable: '不可分动词',
        prefix: '前缀',
        conjugation: '变位',
        base: '原形',
        withDe: '与de连用',
        withHet: '与het连用',
        comparative: '比较级',
        superlative: '最高级',
        uncountablePreposition: '搭配介词',
        examples: '例句',
        notes: '备注',
        stats: '学习统计',
        resetStats: '重置统计'
      }
    },
    english: {
      appTitle: 'Dutch Word Learning',
      chineseLabel: '🇨🇳 中文',
      englishLabel: '🇺🇸 EN',
      allLabel: 'All',
      a1a2Label: 'A1-A2',
      b1b2Label: 'B1-B2',
      c1c2Label: 'C1-C2',
      premiumBadge: '👑 Premium',
      masteredText: 'Mastered',
      masteredCount: (mastered: number, total: number, percentage: number) => `${mastered} / ${total} Mastered (${percentage}%)`,
      syncStatus: {
        syncing: '🔄 Syncing...',
        success: '✅ Sync Success',
        error: '❌ Sync Failed'
      },
      loginButton: 'Login',
      shuffleButton: 'Shuffle',
      showDetailsButton: (show: boolean) => show ? 'Hide Details' : 'Show Details',
      prevButton: '←',
      nextButton: '→',
      flipCardHint: 'Tap to flip · Swipe left: Unmastered · Swipe right: Mastered',
      speakButton: '🔊 Pronounce',
      speakExampleButton: '🔊 Example Pronounce',
      familiarityLabels: {
        new: '🆕 New',
        learning: '📖 Learning',
        familiar: '😊 Familiar',
        mastered: '✅ Mastered'
      },
      swipeFeedback: {
        mastered: '✅ Mastered',
        unmastered: '❌ Unmastered'
      },
      statsPanel: {
        title: 'Learning Statistics',
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
        }
      },
      detailsPanel: {
        title: 'Word Details',
        dutch: 'Dutch',
        chinese: 'Chinese',
        english: 'English',
        partOfSpeech: 'Part of Speech',
        difficulty: 'Difficulty',
        familiarity: 'Familiarity',
        article: 'Article',
        singular: 'Singular',
        plural: 'Plural',
        separable: 'Separable',
        inseparable: 'Inseparable',
        prefix: 'Prefix',
        conjugation: 'Conjugation',
        base: 'Base',
        withDe: 'With de',
        withHet: 'With het',
        comparative: 'Comparative',
        superlative: 'Superlative',
        uncountablePreposition: 'Preposition',
        examples: 'Examples',
        notes: 'Notes',
        stats: 'Learning Stats',
        resetStats: 'Reset Stats'
      }
    }
  }

  const t = translations[languageMode]

  // 导航栏翻译
  const navTranslations = {
    chinese: {
      learn: '学单词',
      test: '测单词',
      game: '玩游戏',
      wordList: '单词表',
      about: '关于'
    },
    english: {
      learn: 'Learn',
      test: 'Test',
      game: 'Game',
      wordList: 'Word List',
      about: 'About'
    }
  }

  // 触摸事件处理


  // 根据路径确定语言模式
  const prevPathRef = useRef<string>('')
  useEffect(() => {
    const path = location.pathname.toLowerCase()
    // 直接检查路径，React Router 已经处理了 basename
    if (path.endsWith('/en') || path.includes('/en/')) {
      setLanguageMode('english')
    } else if (path.endsWith('/zh') || path.includes('/zh/') || path === '/' || path.endsWith('/')) {
      setLanguageMode('chinese')
    } else {
      setLanguageMode('chinese')
    }
    
    // 当从 profile 页面返回时，重新加载用户资料（确保头像更新）
    const prevPath = prevPathRef.current
    if (user && prevPath.includes('/profile') && !path.includes('/profile')) {
      loadUserProfile(user.id).catch((error) => {
        console.error('重新加载用户资料失败:', error)
      })
    }
    prevPathRef.current = path
  }, [location.pathname, user])

  // 切换语言并更新路由
  const switchLanguage = useCallback((lang: LanguageMode) => {
    setLanguageMode(lang)
    const currentPath = location.pathname.toLowerCase()
    // 检查当前路径，避免重复导航
    if (lang === 'chinese' && !currentPath.endsWith('/zh') && currentPath !== '/') {
      navigate('/zh', { replace: true })
    } else if (lang === 'english' && !currentPath.endsWith('/en')) {
      navigate('/en', { replace: true })
    }
  }, [navigate, location.pathname])

  // 从 localStorage 加载进度
  const loadProgressFromLocalStorage = useCallback(() => {
    // 初始化进度存储（检查版本和迁移）
    initializeProgressStorage()

    // 加载紧凑的进度数据
    const progressMap = loadProgressFromStorage()

    // 合并进度到静态词库
    const mergedWords = mergeProgress(words, progressMap)
    setWordList(mergedWords)
    setFilteredWordList(mergedWords)
  }, [])

  // 从 Supabase 加载进度
  const loadProgressFromSupabase = useCallback(async (userId: string) => {
    try {
      setSyncStatus('syncing')

      // 获取本地进度
      const localProgressMap = loadProgressFromStorage()

      // 从云端获取进度
      const cloudProgressMap = await loadUserProgress(userId)

      // 合并进度（云端优先）
      const mergedProgressMap = new Map<number, UserWordProgress>(localProgressMap)
      cloudProgressMap.forEach((progress, wordId) => {
        mergedProgressMap.set(wordId, progress)
      })

      // 保存合并后的进度
      // saveProgressToStorage 已通过 useProgressStorage hook 间接调用
      // 这里先不保存，等待 setWordList 更新后再保存

      // 合并到词库
      const mergedWords = mergeProgress(words, mergedProgressMap)
      setWordList(mergedWords)
      setFilteredWordList(mergedWords)

      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (error) {
      console.error('从 Supabase 加载进度失败:', error)
      setSyncStatus('error')
      loadProgressFromLocalStorage()
    }
  }, [loadProgressFromLocalStorage])

  // 检查用户登录状态
  useEffect(() => {
    loadProgressFromLocalStorage()

    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.warn('获取用户信息失败，使用本地模式:', error.message)
        }
        setUser(user)

        if (user) {
          try {
            await loadProgressFromSupabase(user.id)
            await loadUserProfile(user.id)
            await loadUserSubscription(user.id)
          } catch (error) {
            console.error('加载云端进度失败，使用本地数据:', error)
          }
        }
      } catch (error) {
        console.error('初始化失败，使用本地数据:', error)
      }
    }

    checkUser()

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user || null
        setUser(user)
        if (user) {
          loadProgressFromSupabase(user.id).catch((error) => {
            console.error('加载云端进度失败:', error)
          })
          loadUserProfile(user.id).catch((error) => {
            console.error('加载用户资料失败:', error)
          })
          loadUserSubscription(user.id).catch((error) => {
            console.error('加载订阅状态失败:', error)
          })
        } else {
          setUserProfile(null)
          setIsPremium(false)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('设置认证监听失败，使用本地模式:', error)
    }
  }, [loadProgressFromSupabase, loadProgressFromLocalStorage])

  // 保存进度到 Supabase（如果已登录）
  const saveProgressToSupabase = async (word: Word) => {
    if (user) {
      try {
        await saveUserProgress(user.id, word.id, word.familiarity, word.stats)
        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 1000)
      } catch (error) {
        console.error('保存进度到 Supabase 失败:', error)
        setSyncStatus('error')
      }
    }
  }

  // 计算筛选后的单词列表
  const calculateFilteredWordList = useCallback(() => {
    if (selectedDifficulty === 'all') {
      // 免费用户只显示 A1-A2，付费用户显示全部
      if (isPremium) {
        return wordList
      } else {
        return wordList.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
    } else if (selectedDifficulty === 'A1') {
      // A1-A2 组合筛选
      return wordList.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
    } else if (selectedDifficulty === 'B1') {
      // B1-B2 组合筛选 - 需要检查权限
      if (!isPremium) {
        // 触发付费弹窗
        setShowPremiumModal(true)
        // 回退到 A1-A2
        return wordList.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return wordList.filter(w => w.difficulty === 'B1' || w.difficulty === 'B2')
    } else if (selectedDifficulty === 'C1') {
      // C1-C2 组合筛选 - 需要检查权限
      if (!isPremium) {
        setShowPremiumModal(true)
        return wordList.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return wordList.filter(w => w.difficulty === 'C1' || w.difficulty === 'C2')
    } else {
      // 单独的难度级别筛选（这里只可能是 'B2' 或 'C2'）
      const isAllowed = isPremium
      if (!isAllowed) {
        setShowPremiumModal(true)
        return wordList.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return wordList.filter(w => w.difficulty === selectedDifficulty)
    }
  }, [wordList, selectedDifficulty, isPremium])

  // 根据难度筛选单词
  useEffect(() => {
    setFilteredWordList(calculateFilteredWordList())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordList, selectedDifficulty])

  // 当切换单词时，确保卡片重置为未翻转状态（由 Flashcard 组件处理）

  // 当前单词（需要在 useEffect 之前定义，以便在 useEffect 中使用）
  const currentWord = filteredWordList[currentIndex]

  // 计算学习进度 - 基于筛选后的列表
  const masteredCount = filteredWordList.filter(w => w.familiarity === 'mastered').length
  const totalCount = filteredWordList.length
  const progressPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  // 进度存储 hook
  const { saveProgress: saveCurrentProgressToStorage } = useProgressStorage(wordList)

  // 设置单词熟悉程度
  const setWordFamiliarity = async (wordId: number, familiarity: FamiliarityLevel) => {
    const targetWord = wordList.find(w => w.id === wordId)
    if (!targetWord) return

    // Update mastery stats
    if (user) {
      try {
        const { stats: updatedStats, familiarity: calculatedFamiliarity } = await updateMasteryStats(
          user.id,
          targetWord.id,
          familiarity,
          targetWord.stats
        )
        console.log(`设置熟悉程度为 ${calculatedFamiliarity}（用户选择: ${familiarity}）`)

        const updatedWords = wordList.map(word =>
          word.id === wordId
            ? {
                ...word,
                familiarity: calculatedFamiliarity,
                stats: updatedStats
              }
            : word
        )

        setWordList(updatedWords)
        saveCurrentProgressToStorage()
        await saveProgressToSupabase(updatedWords.find(w => w.id === wordId)!)
        return
      } catch (error) {
        console.error('更新掌握统计失败:', error)
      }
    }

    // Local mode: update local stats
    const isMastered = familiarity === 'mastered'
    const updatedWords = wordList.map(word => {
      if (word.id === wordId) {
        const currentStats = word.stats || {
          viewCount: 0,
          masteredCount: 0,
          unmasteredCount: 0,
          testCount: 0,
          testCorrectCount: 0,
          testWrongCount: 0,
        }

        const updatedStats = {
          ...currentStats,
          masteredCount: isMastered ? currentStats.masteredCount + 1 : currentStats.masteredCount,
          unmasteredCount: !isMastered ? currentStats.unmasteredCount + 1 : currentStats.unmasteredCount,
        }

        // 直接使用用户选择，简化逻辑
        const calculatedFamiliarity = familiarity
        console.log(`设置熟悉程度为 ${calculatedFamiliarity}（用户选择: ${familiarity}）`)

        return {
          ...word,
          familiarity: calculatedFamiliarity,
          stats: updatedStats
        }
      }
      return word
    })

    setWordList(updatedWords)
    saveCurrentProgressToStorage()
    await saveProgressToSupabase(updatedWords.find(w => w.id === wordId)!)
  }

  // 重置单词学习统计
  const resetWordStats = async (wordId: number) => {
    const updatedWords = wordList.map(word =>
      word.id === wordId
        ? { ...word, familiarity: 'new' as FamiliarityLevel, stats: undefined }
        : word
    )

    setWordList(updatedWords)
    saveCurrentProgressToStorage()
    const updatedWord = updatedWords.find(w => w.id === wordId)!
    await saveProgressToSupabase(updatedWord)
  }

  // 随机排序单词
  const shuffleWords = () => {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5)
    setWordList(shuffled)
    setCurrentIndex(0)
  }

  // 收藏功能
  const handleFavorite = async () => {
    if (!currentWord) return

    const updatedWord = {
      ...currentWord,
      favorited: !currentWord.favorited
    }

    // 更新本地状态
    setWordList(prev => prev.map(word =>
      word.id === currentWord.id ? updatedWord : word
    ))

    // 更新 localStorage
    const updatedWords = wordList.map(word =>
      word.id === currentWord.id ? updatedWord : word
    )
    safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))

    // 如果已登录，同步到 Supabase
    if (user) {
      try {
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: currentWord.id,
            familiarity: currentWord.familiarity,
            is_favorited: updatedWord.favorited,
            favorited_at: updatedWord.favorited ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,word_id'
          })

        if (error) throw error

        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 2000)
      } catch (error) {
        console.error('保存收藏状态失败:', error)
        setSyncStatus('error')
      }
    }
  }

  // 导航函数
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % filteredWordList.length)
  }, [filteredWordList.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + filteredWordList.length) % filteredWordList.length)
  }, [filteredWordList.length])

  // 记录单词查看次数（当单词变化时）
  useEffect(() => {
    if (!currentWord) return
    
    const recordView = async () => {
      if (user) {
        try {
          const updatedStats = await incrementViewCount(user.id, currentWord.id, currentWord.stats)
          setWordList(prevWords => prevWords.map(word =>
            word.id === currentWord.id
              ? { ...word, stats: updatedStats }
              : word
          ))
          // Update localStorage
          const updatedWords = wordList.map(word =>
            word.id === currentWord.id
              ? { ...word, stats: updatedStats }
              : word
          )
          safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
        } catch (error) {
          console.error('记录查看次数失败:', error)
        }
      } else {
        // 本地模式：更新本地统计数据
        const currentStats = currentWord.stats || {
          viewCount: 0,
          masteredCount: 0,
          unmasteredCount: 0,
          testCount: 0,
          testCorrectCount: 0,
          testWrongCount: 0,
        }
        
        const updatedStats = {
          ...currentStats,
          viewCount: currentStats.viewCount + 1,
          lastViewedAt: new Date().toISOString(),
        }
        
        setWordList(prevWords => prevWords.map(word =>
          word.id === currentWord.id
            ? { ...word, stats: updatedStats }
            : word
        ))
        
        // 保存到 localStorage
        const updatedWords = wordList.map(word =>
          word.id === currentWord.id
            ? { ...word, stats: updatedStats }
            : word
        )
        safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
      }
    }

    recordView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id, user?.id])



  // 获取当前单词的例句和翻译
  const getCurrentExample = () => {
    if (!currentWord?.examples || currentWord.examples.length === 0) {
      return null
    }
    const example = currentWord.examples[0]

    if (Array.isArray(currentWord.exampleTranslations)) {
      const chineseTranslation = currentWord.exampleTranslations[0] || ''
      return {
        dutch: example,
        chinese: chineseTranslation,
        english: ''
      }
    } else if (currentWord.exampleTranslations) {
      const translations = currentWord.exampleTranslations as ExampleTranslations
      return {
        dutch: example,
        chinese: translations.chinese?.[0] || '',
        english: translations.english?.[0] || ''
      }
    }

    return { dutch: example, chinese: '', english: '' }
  }

  const currentExample = getCurrentExample()

  // 根据单词长度计算字号类别
  const getWordLengthClass = (word: string) => {
    const length = word.length
    if (length <= 10) return 'word-normal'
    if (length <= 15) return 'word-medium'
    if (length <= 20) return 'word-long'
    return 'word-very-long'
  }

  const currentWordLengthClass = currentWord ? getWordLengthClass(currentWord.word) : 'word-normal'

  const handleAuthSuccess = () => {
    setShowAuth(false)
  }

  const handleAuthLanguageChange = (mode: 'chinese' | 'english') => {
    setLanguageMode(mode)
    // 登录页面只切换语言模式，不触发路由跳转
    // 更新浏览器标签页标题
    document.title = mode === 'chinese' ? '荷兰语单词学习' : 'Dutch Word Learning'
  }

  // 汉堡菜单状态
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 键盘导航 - 左右方向键切换单词
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在 learn 页面且没有打开详情面板时响应
      if (location.pathname.endsWith('/learn') && !showDetails) {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          goToNext()
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          goToPrevious()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [location.pathname, showDetails, goToNext, goToPrevious])

  return (
    <>
      {showAuth ? (
        <Auth onAuthSuccess={handleAuthSuccess} languageMode={languageMode} onLanguageChange={handleAuthLanguageChange} />
      ) : (
        <>
          <div className="app">
            <header className="header">
              <div className="header-content">
                <div className="header-left">
                  <img src={logo} alt="Dutch Lex" className="app-logo" />
                </div>

                <nav className="nav-menu desktop-nav">
                  <button
                    className={`nav-btn ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}` || location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/learn` ? 'nav-btn--active' : ''}`}
                    onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/learn`)}
                  >
                    {navTranslations[languageMode].learn}
                  </button>
                  <button
                    className={`nav-btn ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/test` || location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/test-select` ? 'nav-btn--active' : ''}`}
                    onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/test-select`)}
                  >
                    {navTranslations[languageMode].test}
                  </button>
                  <button
                    className={`nav-btn ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/wordlist` ? 'nav-btn--active' : ''}`}
                    onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/wordlist`)}
                  >
                    {navTranslations[languageMode].wordList}
                  </button>
                  <button
                    className={`nav-btn ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/about` ? 'nav-btn--active' : ''}`}
                    onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/about`)}
                  >
                    {navTranslations[languageMode].about}
                  </button>
                </nav>

                <div className="header-right">
                  {/* 用户按钮 */}
                  {user ? (
                    <button className="user-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/profile`)} aria-label={languageMode === 'chinese' ? '用户资料' : 'User Profile'}>
                      {(() => {
                        const avatarUrl = getUserAvatarUrl(userProfile?.avatar_url)
                        if (avatarUrl) {
                          return <img src={avatarUrl} alt="Avatar" className="user-avatar-img" />
                        }
                        return <UserIcon />
                      })()}
                    </button>
                  ) : (
                    <button className="user-btn" onClick={() => setShowAuth(true)} aria-label={languageMode === 'chinese' ? '登录' : 'Login'}>
                      <UserIcon />
                    </button>
                  )}

                  {/* 桌面端语言选择器 */}
                  <div className="language-selector-header">
                    <button
                      className={`btn btn-sm language-btn ${languageMode === 'chinese' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => switchLanguage('chinese')}
                      aria-label="中文"
                      title="中文"
                    >
                      <GlobeIcon />
                      <span className="language-text">CN</span>
                    </button>
                    <button
                      className={`btn btn-sm language-btn ${languageMode === 'english' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => switchLanguage('english')}
                      aria-label="English"
                      title="English"
                    >
                      <GlobeIcon />
                      <span className="language-text">EN</span>
                    </button>
                  </div>

                  {/* 移动端语言切换 */}
                  <button className="lang-icon-mobile" onClick={() => switchLanguage(languageMode === 'chinese' ? 'english' : 'chinese')} aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}>
                    <GlobeIcon />
                  </button>

                  {/* 汉堡菜单按钮 - 仅在移动端显示 */}
                  <button
                    className="hamburger-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Menu"
                  >
                    <MenuIcon isOpen={mobileMenuOpen} />
                  </button>
                </div>
              </div>

              {/* 移动端菜单下拉 */}
              <div className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu--open' : ''}`}>
                <button
                  className={`mobile-menu-item ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}` || location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/learn` ? 'mobile-menu-item--active' : ''}`}
                  onClick={() => {
                    navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/learn`)
                    setMobileMenuOpen(false)
                  }}
                >
                  {navTranslations[languageMode].learn}
                </button>
                <button
                  className={`mobile-menu-item ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/test` || location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/test-select` ? 'mobile-menu-item--active' : ''}`}
                  onClick={() => {
                    navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/test-select`)
                    setMobileMenuOpen(false)
                  }}
                >
                  {navTranslations[languageMode].test}
                </button>
                <button
                  className={`mobile-menu-item ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/wordlist` ? 'mobile-menu-item--active' : ''}`}
                  onClick={() => {
                    navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/wordlist`)
                    setMobileMenuOpen(false)
                  }}
                >
                  {navTranslations[languageMode].wordList}
                </button>
                <button
                  className={`mobile-menu-item ${location.pathname === `/${languageMode === 'chinese' ? 'zh' : 'en'}/about` ? 'mobile-menu-item--active' : ''}`}
                  onClick={() => {
                    navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/about`)
                    setMobileMenuOpen(false)
                  }}
                >
                  {navTranslations[languageMode].about}
                </button>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>

              <div className="stats">
                {t.masteredCount(masteredCount, totalCount, progressPercentage)}
              </div>

              {syncStatus !== 'idle' && (
                <div className={`sync-status sync-status--${syncStatus}`}>
                  {syncStatus === 'syncing' && t.syncStatus.syncing}
                  {syncStatus === 'success' && t.syncStatus.success}
                  {syncStatus === 'error' && t.syncStatus.error}
                </div>
              )}
            </header>

            <main className="main">
              <div className="difficulty-filters">
                <button className={`btn ${selectedDifficulty === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('all')}>{t.allLabel}</button>
                <button className={`btn ${selectedDifficulty === 'A1' || selectedDifficulty === 'A2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('A1')}>{t.a1a2Label}</button>
                <button
                  className={`btn ${!isPremium ? 'btn-locked' : ''} ${selectedDifficulty === 'B1' || selectedDifficulty === 'B2' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedDifficulty('B1')}
                  title={isPremium ? '' : '需要 Premium 才能访问'}
                >
                  {t.b1b2Label}
                  {!isPremium && <LockIcon />}
                </button>
                <button
                  className={`btn ${!isPremium ? 'btn-locked' : ''} ${selectedDifficulty === 'C1' || selectedDifficulty === 'C2' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedDifficulty('C1')}
                  title={isPremium ? '' : '需要 Premium 才能访问'}
                >
                  {t.c1c2Label}
                  {!isPremium && <LockIcon />}
                </button>
              </div>

              {currentWord && (
                <div className="word-card-container">
                  <Flashcard
                    key={`word-${currentWord.id}-${currentIndex}`}
                    frontContent={
                      <div className="card-front-content">
                        <div className="word-front-content">
                          <div className="word-with-speaker">
                            <div className={`flashcard-word-dutch ${currentWordLengthClass}`}>{currentWord.word}</div>
                            <button
                              className="speak-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                speakDutch(currentWord.word)
                              }}
                              title={t.speakButton}
                            >
                              <SpeakerIcon isSpeaking={isSpeaking} />
                            </button>
                          </div>
                        </div>
                        <span className={`difficulty-badge difficulty--${currentWord.difficulty} card-difficulty`}>{currentWord.difficulty}</span>
                        <div className="card-front-meta">
                          <button
                            className={`favorite-btn ${currentWord.favorited ? 'favorited' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFavorite()
                            }}
                            title={currentWord.favorited ? '取消收藏' : '收藏单词'}
                          >
                            {currentWord.favorited ? (
                              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    }
                    backContent={
                      <div className="card-back-content">
                        <div className="word-dutch-small">{currentWord.word}</div>
                        <div className="word-type">{currentWord.partOfSpeech}</div>
                        <div className="word-translation">
                          <TranslateIcon /> {languageMode === 'chinese' ? currentWord.translation.chinese : currentWord.translation.english}
                        </div>
                        {currentExample && currentExample.dutch && (
                          <div className="word-example">
                            <div className="example-header">
                              <div className="example-nl">{currentExample.dutch}</div>
                              <button
                                className="speak-btn-example"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  speakDutch(currentExample.dutch)
                                }}
                                title={t.speakExampleButton}
                              >
                                <SpeakerIcon isSpeaking={isSpeaking} />
                              </button>
                            </div>
                            {(languageMode === 'chinese' ? currentExample.chinese : currentExample.english) && (
                              <div className={`example-${languageMode} ${languageMode === 'english' ? 'example-english' : ''}`}>
                                {languageMode === 'chinese' ? currentExample.chinese : currentExample.english}
                              </div>
                            )}
                          </div>
                        )}
                        <span className={`difficulty-badge difficulty--${currentWord.difficulty} card-difficulty`}>{currentWord.difficulty}</span>
                      </div>
                    }
                    onSwipeRight={() => {
                      setWordFamiliarity(currentWord.id, 'mastered')
                      goToNext()
                    }}
                    onSwipeLeft={() => {
                      setWordFamiliarity(currentWord.id, 'learning')
                      goToNext()
                    }}
                  />
                </div>
              )}

              <div className="navigation">
                <button className="btn btn-outline nav-btn-icon" onClick={goToPrevious} disabled={filteredWordList.length <= 1} aria-label={languageMode === 'chinese' ? '上一个单词' : 'Previous word'}>
                  <ChevronLeftIcon />
                </button>
                <button className="btn btn-outline nav-btn-icon" onClick={goToNext} disabled={filteredWordList.length <= 1} aria-label={languageMode === 'chinese' ? '下一个单词' : 'Next word'}>
                  <ChevronRightIcon />
                </button>
              </div>

              <div className="tools">
                <button className="btn btn-outline shuffle-btn" onClick={shuffleWords}>
                  <ShuffleIcon />
                  <span>{t.shuffleButton}</span>
                </button>
                <button className="btn btn-outline details-btn" onClick={() => setShowDetails(!showDetails)}>
                  <InfoIcon />
                  <span>{t.showDetailsButton(showDetails)}</span>
                </button>
              </div>

              {showDetails && currentWord && (
                <div className="details-panel">
                  <h3>{t.detailsPanel.title}</h3>
                  <div className="detail-item"><strong>{t.detailsPanel.dutch}：</strong> <span>{currentWord.word}</span></div>
                  <div className="detail-item"><strong>{t.detailsPanel.chinese} ：</strong> {currentWord.translation.chinese}</div>
                  <div className="detail-item"><strong>{t.detailsPanel.english}：</strong> <span>{currentWord.translation.english}</span></div>
                  <div className="detail-item"><strong>{t.detailsPanel.partOfSpeech}：</strong> <span>{currentWord.partOfSpeech}</span></div>
                  <div className="detail-item">
                    <strong>{t.detailsPanel.difficulty}：</strong>
                    <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>{currentWord.difficulty}</span>
                  </div>
                  <div className="detail-item familiarity-info">
                    <div className="familiarity-display">
                      <strong>{t.detailsPanel.familiarity}：</strong>
                      <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                        {t.familiarityLabels[currentWord.familiarity]}
                      </span>
                    </div>
                    {currentWord.stats && (
                      <div className="familiarity-score">
                        <span>{languageMode === 'chinese' ? '掌握分数：' : 'Mastery Score:'}</span>
                        <span className="score-value">{calculateFamiliarityScore(currentWord.stats)}</span>
                        <span className="score-total">/ 100</span>
                      </div>
                    )}
                  </div>

                  {/* 名词信息 */}
                  {currentWord.partOfSpeech === 'noun' && currentWord.forms?.noun && (
                    <div className="detail-item noun-info">
                      <strong>{t.detailsPanel.partOfSpeech} {languageMode === 'chinese' ? '详情' : 'Details'}：</strong>
                      <div className="noun-details">
                        <div><strong>{t.detailsPanel.article}：</strong> <span className={`article-badge article--${currentWord.forms.noun.article}`}>{currentWord.forms.noun.article}</span></div>
                        <div><strong>{t.detailsPanel.singular}：</strong> <span>{currentWord.forms.noun.singular}</span></div>
                        <div><strong>{t.detailsPanel.plural}：</strong> <span>{currentWord.forms.noun.plural}</span></div>
                        {currentWord.forms.noun.uncountablePreposition && (
                          <div><strong>{t.detailsPanel.uncountablePreposition}：</strong> <span>{currentWord.forms.noun.uncountablePreposition}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 动词信息 */}
                  {currentWord.partOfSpeech === 'verb' && currentWord.forms?.verb && (
                    <div className="detail-item verb-info">
                      <strong>{t.detailsPanel.partOfSpeech} {languageMode === 'chinese' ? '详情' : 'Details'}：</strong>
                      <div className="verb-details">
                        {currentWord.forms.verb.isSeparable !== undefined && (
                          <div>
                            <strong>{currentWord.forms.verb.isSeparable ? t.detailsPanel.separable : t.detailsPanel.inseparable}</strong>
                            {currentWord.forms.verb.prefix && <span> ({t.detailsPanel.prefix}: <span>{currentWord.forms.verb.prefix}</span>)</span>}
                          </div>
                        )}
                        <div><strong>{t.detailsPanel.conjugation} ({t.detailsPanel.partOfSpeech})：</strong></div>
                        <div className="conjugation-table">
                          <div className="conjugation-section">
                            <strong>{languageMode === 'chinese' ? '现在时' : 'Present'}:</strong>
                            <div className="conjugation-row">ik: <span>{currentWord.forms.verb.present.ik}</span></div>
                            <div className="conjugation-row">jij: <span>{currentWord.forms.verb.present.jij}</span></div>
                            <div className="conjugation-row">hij/zij: <span>{currentWord.forms.verb.present.hij}</span></div>
                            <div className="conjugation-row">wij: <span>{currentWord.forms.verb.present.wij}</span></div>
                            <div className="conjugation-row">jullie: <span>{currentWord.forms.verb.present.jullie}</span></div>
                            <div className="conjugation-row">zij: <span>{currentWord.forms.verb.present.zij}</span></div>
                          </div>
                          <div className="conjugation-section">
                            <strong>{languageMode === 'chinese' ? '过去时' : 'Past'}:</strong>
                            <div className="conjugation-row">{languageMode === 'chinese' ? '单数' : 'Singular'}: <span>{currentWord.forms.verb.past.singular}</span></div>
                            <div className="conjugation-row">{languageMode === 'chinese' ? '复数' : 'Plural'}: <span>{currentWord.forms.verb.past.plural}</span></div>
                          </div>
                          <div className="conjugation-section">
                            <strong>{languageMode === 'chinese' ? '过去分词' : 'Past Participle'}:</strong>
                            <div className="conjugation-row single-line">
                              <span>{currentWord.forms.verb.pastParticiple}{currentWord.forms.verb.pastParticipleAuxiliary ? ` (${currentWord.forms.verb.pastParticipleAuxiliary})` : ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 形容词信息 */}
                  {currentWord.partOfSpeech === 'adjective' && currentWord.forms?.adjective && (
                    <div className="detail-item adjective-info">
                      <strong>{t.detailsPanel.partOfSpeech} {languageMode === 'chinese' ? '详情' : 'Details'}：</strong>
                      <div className="adjective-details">
                        <div><strong>{t.detailsPanel.base}：</strong> <span>{currentWord.forms.adjective.base}</span></div>
                        <div><strong>{t.detailsPanel.withDe}：</strong> <span>{currentWord.forms.adjective.withDe}</span></div>
                        <div><strong>{t.detailsPanel.withHet}：</strong> <span>{currentWord.forms.adjective.withHet}</span></div>
                        <div><strong>{t.detailsPanel.comparative}：</strong> <span>{currentWord.forms.adjective.comparative}</span></div>
                        <div><strong>{t.detailsPanel.superlative}：</strong> <span>{currentWord.forms.adjective.superlative}</span></div>
                      </div>
                    </div>
                  )}

                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <div className="detail-item">
                      <strong>{t.detailsPanel.examples}：</strong>
                      {currentWord.examples.map((example, index) => (
                        <div key={index} className="example-container">
                          <div className="example-nl">{example}</div>
                          {(() => {
                            if (Array.isArray(currentWord.exampleTranslations)) {
                              const translation = currentWord.exampleTranslations[index]
                              return translation && <div className={`example-zh ${languageMode === 'english' ? 'example-english' : ''}`}>{translation}</div>
                            } else if (currentWord.exampleTranslations) {
                              const translations = currentWord.exampleTranslations as ExampleTranslations
                              const translation = languageMode === 'chinese'
                                ? translations.chinese?.[index]
                                : translations.english?.[index]
                              return translation && <div className={`example-${languageMode} ${languageMode === 'english' ? 'example-english' : ''}`}>{translation}</div>
                            }
                            return null
                          })()}

                        </div>
                      ))}
                    </div>
                  )}
                  {currentWord.notes && (
                    <div className="detail-item">
                      <strong>{t.detailsPanel.notes}：</strong> <span className="google-font-text">{currentWord.notes}</span>
                    </div>
                  )}
                  {currentWord.stats && (
                    <div className="detail-item">
                      <strong className="google-font-text">{t.detailsPanel.stats}：</strong>
                      <div className="stats-detail">
                        <div className="google-font-text">{t.statsPanel.testStats.viewCount}: {currentWord.stats.viewCount}</div>
                        <div className="google-font-text">{t.statsPanel.testStats.masteredCount}: {currentWord.stats.masteredCount}</div>
                        <div className="google-font-text">{t.statsPanel.testStats.unmasteredCount}: {currentWord.stats.unmasteredCount}</div>
                        <div className="google-font-text">{t.statsPanel.testStats.testCount}: {currentWord.stats.testCount}</div>
                        {currentWord.stats.testCount > 0 && (
                          <>
                            <div className="google-font-text">{t.statsPanel.testStats.correctCount}: {currentWord.stats.testCorrectCount}</div>
                            <div className="google-font-text">{t.statsPanel.testStats.wrongCount}: {currentWord.stats.testWrongCount}</div>
                            <div className="google-font-text">{t.statsPanel.testStats.accuracy}: {Math.round((currentWord.stats.testCorrectCount / currentWord.stats.testCount) * 100)}%</div>
                          </>
                        )}
                        {currentWord.stats.lastViewedAt && (
                          <div className="google-font-text">{t.statsPanel.testStats.lastViewed}: {new Date(currentWord.stats.lastViewedAt).toLocaleString(languageMode === 'chinese' ? 'zh-CN' : 'en-US')}</div>
                        )}
                        {currentWord.stats.lastTestedAt && (
                          <div className="google-font-text">{t.statsPanel.testStats.lastTested}: {new Date(currentWord.stats.lastTestedAt).toLocaleString(languageMode === 'chinese' ? 'zh-CN' : 'en-US')}</div>
                        )}
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (window.confirm(languageMode === 'chinese' ? '确定要重置此单词的学习统计吗？' : 'Are you sure you want to reset the learning statistics for this word?')) {
                            resetWordStats(currentWord.id)
                          }
                        }}
                        style={{ marginTop: '10px' }}
                      >
                        {t.detailsPanel.resetStats}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </main>

            <footer className="footer">
              <p className="google-font-text">{t.flipCardHint} | {languageMode === 'chinese' ? '使用键盘方向键切换单词' : 'Use arrow keys to navigate'}</p>
            </footer>

            {showUserProfile && user && (
              <UserProfile
                user={user}
                onClose={() => setShowUserProfile(false)}
                languageMode={languageMode}
              />
            )}

            {/* Premium 升级弹窗 */}
            <PremiumUpgradeModal
              isOpen={showPremiumModal}
              onClose={() => {
                setShowPremiumModal(false)
              }}
              languageMode={languageMode}
            />
          </div>
        </>
      )}
    </>
  )
}

// Profile Page Component
function ProfileRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <ProfilePage languageMode={languageMode} />
}

// Test Page Route Component
function TestRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <TestPage languageMode={languageMode} />
}

// Test Selection Page Route Component
function TestSelectionRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <TestSelectionPage languageMode={languageMode} />
}

// Word List Page Route Component
function WordListRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <WordListPage languageMode={languageMode} />
}

// Game Page Route Component
function GameRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <SpellingGame languageMode={languageMode} />
}

// Table Spelling Test Route Component
function TableSpellingRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <TableSpellingTest languageMode={languageMode} />
}

// Smart Review Page Route Component
function SmartReviewRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <SmartReviewPage languageMode={languageMode} />
}

// About Page Route Component
function AboutRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <AboutPage languageMode={languageMode} />
}

// Reset Password Route Component
function ResetPasswordRoute() {
  const location = useLocation()
  const languageMode = location.pathname.startsWith('/zh') ? 'chinese' : 'english'
  return <ResetPassword languageMode={languageMode} />
}

// App 组件处理路由
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/zh/learn" replace />} />
      <Route path="/zh" element={<Navigate to="/zh/learn" replace />} />
      <Route path="/zh/learn" element={<MainApp />} />
      <Route path="/zh/test-select" element={<TestSelectionRoute />} />
      <Route path="/zh/test" element={<TestRoute />} />
      <Route path="/zh/smart-review" element={<SmartReviewRoute />} />
      <Route path="/zh/game" element={<GameRoute />} />
      <Route path="/zh/table-spelling" element={<TableSpellingRoute />} />
      <Route path="/zh/profile" element={<ProfileRoute />} />
      <Route path="/zh/wordlist" element={<WordListRoute />} />
      <Route path="/zh/about" element={<AboutRoute />} />
      <Route path="/zh/reset-password" element={<ResetPasswordRoute />} />
      <Route path="/en" element={<Navigate to="/en/learn" replace />} />
      <Route path="/en/learn" element={<MainApp />} />
      <Route path="/en/test-select" element={<TestSelectionRoute />} />
      <Route path="/en/test" element={<TestRoute />} />
      <Route path="/en/smart-review" element={<SmartReviewRoute />} />
      <Route path="/en/game" element={<GameRoute />} />
      <Route path="/en/table-spelling" element={<TableSpellingRoute />} />
      <Route path="/en/profile" element={<ProfileRoute />} />
      <Route path="/en/wordlist" element={<WordListRoute />} />
      <Route path="/en/about" element={<AboutRoute />} />
      <Route path="/en/reset-password" element={<ResetPasswordRoute />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/zh/learn" replace />} />
    </Routes>
  )
}

export default App
