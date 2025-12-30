import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import { words } from './data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from './data/words'
import type { ExampleTranslations } from './data/types'
import { supabase } from './lib/supabase'
import { loadUserProgress, saveUserProgress, saveAllUserProgress, mergeProgress, incrementViewCount, updateMasteryStats } from './lib/progressSync'
import Auth from './components/Auth'
import UserProfile from './components/UserProfile'
import ProfilePage from './components/ProfilePage'

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
  const [showAuth, setShowAuth] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [wordList, setWordList] = useState<Word[]>(words)
  const [filteredWordList, setFilteredWordList] = useState<Word[]>(words)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showStats, setShowStats] = useState(false)
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
      masteredText: '已掌握',
      masteredCount: (mastered: number, total: number, percentage: number) => `${mastered} / ${total} 已掌握 (${percentage}%)`,
      syncStatus: {
        syncing: '🔄 同步中...',
        success: '✅ 同步成功',
        error: '❌ 同步失败'
      },
      loginButton: '登录',
      resetProgress: '确定要重置所有学习进度吗？此操作不可撤销。',
      resetButton: '🔄 重置进度',
      shuffleButton: '🔀 随机排序',
      showStatsButton: (show: boolean) => show ? '隐藏统计' : '显示统计',
      showDetailsButton: (show: boolean) => show ? '隐藏详情' : '显示详情',
      prevButton: '上一个',
      nextButton: '下一个',
      masteredButton: '标记掌握',
      unmasteredButton: '取消掌握',
      flipCardHint: '点击单词卡片查看翻译',
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
        examples: '例句',
        notes: '备注',
        stats: '学习统计'
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
      masteredText: 'Mastered',
      masteredCount: (mastered: number, total: number, percentage: number) => `${mastered} / ${total} Mastered (${percentage}%)`,
      syncStatus: {
        syncing: '🔄 Syncing...',
        success: '✅ Sync Success',
        error: '❌ Sync Failed'
      },
      loginButton: 'Login',
      resetProgress: 'Are you sure you want to reset all learning progress? This action cannot be undone.',
      resetButton: '🔄 Reset Progress',
      shuffleButton: '🔀 Shuffle',
      showStatsButton: (show: boolean) => show ? 'Hide Stats' : 'Show Stats',
      showDetailsButton: (show: boolean) => show ? 'Hide Details' : 'Show Details',
      prevButton: 'Prev',
      nextButton: 'Next',
      masteredButton: 'Mark Mastered',
      unmasteredButton: 'Unmark Mastered',
      flipCardHint: 'Click card to flip',
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
        examples: 'Examples',
        notes: 'Notes',
        stats: 'Learning Stats'
      }
    }
  }

  const t = translations[languageMode]

  // 触摸事件处理
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [swipeFeedback, setSwipeFeedback] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0) // 滑动偏移量，用于动画
  const [isSwiping, setIsSwiping] = useState(false) // 是否正在滑动
  const lastTapRef = useRef(0) // 记录最后一次点击时间，用于双击检测

  // 根据路径确定语言模式
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
  }, [location.pathname])

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
    const savedWords = localStorage.getItem('nl-words')
    if (savedWords) {
      try {
        const parsed = JSON.parse(savedWords)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWordList(parsed)
          setFilteredWordList(parsed)
        }
      } catch (e) {
        console.error('Failed to load saved words', e)
      }
    }
  }, [])

  // 从 Supabase 加载进度
  const loadProgressFromSupabase = useCallback(async (userId: string) => {
    try {
      setSyncStatus('syncing')
      const progressMap = await loadUserProgress(userId)
      const mergedWords = mergeProgress(words, progressMap)
      setWordList(mergedWords)
      setFilteredWordList(mergedWords)
      localStorage.setItem('nl-words', JSON.stringify(mergedWords))
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
        await saveUserProgress(user.id, word.id, word.mastered, word.familiarity, word.stats)
        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 1000)
      } catch (error) {
        console.error('保存进度到 Supabase 失败:', error)
        setSyncStatus('error')
      }
    }
  }

  // 批量保存进度到 Supabase
  const saveAllProgressToSupabase = async () => {
    if (user) {
      try {
        setSyncStatus('syncing')
        await saveAllUserProgress(user.id, wordList)
        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 2000)
      } catch (error) {
        console.error('批量保存进度失败:', error)
        setSyncStatus('error')
      }
    }
  }

  // 计算筛选后的单词列表
  const calculateFilteredWordList = useCallback(() => {
    if (selectedDifficulty === 'all') {
      return wordList
    } else if (selectedDifficulty === 'A1') {
      // A1-A2 组合筛选
      return wordList.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
    } else if (selectedDifficulty === 'B1') {
      // B1-B2 组合筛选
      return wordList.filter(w => w.difficulty === 'B1' || w.difficulty === 'B2')
    } else if (selectedDifficulty === 'C1') {
      // C1-C2 组合筛选
      return wordList.filter(w => w.difficulty === 'C1' || w.difficulty === 'C2')
    } else {
      return wordList.filter(w => w.difficulty === selectedDifficulty)
    }
  }, [wordList, selectedDifficulty])

  // 根据难度筛选单词
  useEffect(() => {
    setFilteredWordList(calculateFilteredWordList())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordList, selectedDifficulty])

  // 当切换单词时，确保卡片重置为未翻转状态
  useEffect(() => {
    setIsFlipped(false)
  }, [currentIndex])

  // 当前单词（需要在 useEffect 之前定义，以便在 useEffect 中使用）
  const currentWord = filteredWordList[currentIndex]

  // 计算学习进度 - 基于筛选后的列表
  const masteredCount = filteredWordList.filter(w => w.mastered).length
  const totalCount = filteredWordList.length
  const progressPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  // 切换当前单词的掌握状态
  const toggleMastered = async () => {
    const currentWord = filteredWordList[currentIndex]
    const newMasteredState = !currentWord.mastered
    
    // Update mastery stats
    if (user) {
      try {
        const updatedStats = await updateMasteryStats(
          user.id,
          currentWord.id,
          newMasteredState,
          currentWord.stats
        )
        
        const updatedWords = wordList.map(word =>
          word.id === currentWord.id
            ? { 
                ...word, 
                mastered: newMasteredState, 
                familiarity: newMasteredState ? 'mastered' as FamiliarityLevel : 'learning' as FamiliarityLevel,
                stats: updatedStats
              }
            : word
        )
        
        setWordList(updatedWords)
        localStorage.setItem('nl-words', JSON.stringify(updatedWords))
        await saveProgressToSupabase(updatedWords.find(w => w.id === currentWord.id)!)
        return
      } catch (error) {
        console.error('更新掌握统计失败:', error)
      }
    }
    
    // Local mode: update local stats
    const updatedWords = wordList.map(word => {
      if (word.id === currentWord.id) {
        const currentStats = word.stats || {
          viewCount: 0,
          masteredCount: 0,
          unmasteredCount: 0,
          testCount: 0,
          testCorrectCount: 0,
          testWrongCount: 0,
        }
        
        return {
          ...word,
          mastered: newMasteredState,
          familiarity: newMasteredState ? 'mastered' as FamiliarityLevel : 'learning' as FamiliarityLevel,
          stats: {
            ...currentStats,
            masteredCount: newMasteredState ? currentStats.masteredCount + 1 : currentStats.masteredCount,
            unmasteredCount: !newMasteredState ? currentStats.unmasteredCount + 1 : currentStats.unmasteredCount,
          }
        }
      }
      return word
    })

    setWordList(updatedWords)
    localStorage.setItem('nl-words', JSON.stringify(updatedWords))
    await saveProgressToSupabase(updatedWords.find(w => w.id === currentWord.id)!)
  }

  // 设置单词熟悉程度
  const setWordFamiliarity = async (wordId: number, familiarity: FamiliarityLevel) => {
    const updatedWords = wordList.map(word =>
      word.id === wordId
        ? { ...word, familiarity, mastered: familiarity === 'mastered' }
        : word
    )

    setWordList(updatedWords)
    localStorage.setItem('nl-words', JSON.stringify(updatedWords))
    await saveProgressToSupabase(updatedWords.find(w => w.id === wordId)!)
  }

  // 随机排序单词
  const shuffleWords = () => {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5)
    setWordList(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  // 重置进度
  const resetProgress = async () => {
    if (window.confirm(t.resetProgress)) {
      const resetWords = wordList.map(word => ({
        ...word,
        mastered: false,
        familiarity: 'new' as FamiliarityLevel,
        stats: undefined // Reset stats
      }))

      setWordList(resetWords)
      localStorage.setItem('nl-words', JSON.stringify(resetWords))
      await saveAllProgressToSupabase()
    }
  }

  // 导航函数
  const goToNext = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % filteredWordList.length)
  }

  const goToPrevious = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + filteredWordList.length) % filteredWordList.length)
  }

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
          localStorage.setItem('nl-words', JSON.stringify(updatedWords))
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
        localStorage.setItem('nl-words', JSON.stringify(updatedWords))
      }
    }

    recordView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id, user?.id])

  // 触摸事件处理函数
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const startX = touch.screenX
    const startY = touch.screenY
    setTouchStartX(startX)
    setTouchEndX(startX) // 初始化结束位置
    setTouchStartY(startY)
    setSwipeOffset(0)
    setIsSwiping(false) // 初始状态不是滑动
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const currentX = touch.screenX
    const currentY = touch.screenY
    setTouchEndX(currentX)

    // 计算滑动偏移量
    if (touchStartX !== 0) {
      const offsetX = currentX - touchStartX
      const offsetY = currentY - touchStartY
      const absOffsetX = Math.abs(offsetX)
      const absOffsetY = Math.abs(offsetY)

      // 只处理水平滑动（水平距离大于垂直距离，且水平距离超过阈值）
      if (absOffsetX > 10 && absOffsetX > absOffsetY * 1.5) {
        setIsSwiping(true)
        setSwipeOffset(offsetX)
      } else if (absOffsetY > absOffsetX) {
        // 垂直滑动，忽略
        setIsSwiping(false)
      }
    }
  }

  const handleTouchEnd = () => {
    const masteryThreshold = 50 // Threshold for marking mastery (lower for more sensitivity)
    const navigationThreshold = 100 // Threshold for switching words (much lower for more sensitivity)

    if (touchStartX === 0 || touchEndX === 0) {
      setIsSwiping(false)
      setSwipeOffset(0)
      setTouchStartX(0)
      setTouchEndX(0)
      setTouchStartY(0)
      return
    }

    // If not swiping, return
    if (!isSwiping) {
      setTouchStartX(0)
      setTouchEndX(0)
      setTouchStartY(0)
      setSwipeOffset(0)
      setIsSwiping(false)
      return
    }

    const swipeDistance = touchEndX - touchStartX
    const absDistance = Math.abs(swipeDistance)

    // Prioritize navigation (switching words) - increase priority
    if (absDistance >= navigationThreshold) {
      // Swipe left: next
      if (swipeDistance < -navigationThreshold) {
        // Immediately reset state and switch
        setTouchStartX(0)
        setTouchEndX(0)
        setTouchStartY(0)
        setSwipeOffset(0)
        setIsSwiping(false)
        goToNext()
        return
      }
      // Swipe right: previous
      else if (swipeDistance > navigationThreshold) {
        // Immediately reset state and switch
        setTouchStartX(0)
        setTouchEndX(0)
        setTouchStartY(0)
        setSwipeOffset(0)
        setIsSwiping(false)
        goToPrevious()
        return
      }
    }
    // Handle mastery marking (short distance swipe: 50-100px)
    else if (absDistance >= masteryThreshold) {
      // Swipe right: mark as mastered
      if (swipeDistance > masteryThreshold) {
        if (!currentWord?.mastered) {
          setSwipeFeedback(languageMode === 'chinese' ? t.swipeFeedback.mastered : t.swipeFeedback.mastered)
          setTimeout(() => setSwipeFeedback(null), 1000)
          toggleMastered()
        }
      }
      // Swipe left: mark as unmastered
      else if (swipeDistance < -masteryThreshold) {
        if (currentWord?.mastered) {
          setSwipeFeedback(languageMode === 'chinese' ? t.swipeFeedback.unmastered : t.swipeFeedback.unmastered)
          setTimeout(() => setSwipeFeedback(null), 1000)
          toggleMastered()
        }
      }
    }

    // Reset touch state and animation
    setTimeout(() => {
      setTouchStartX(0)
      setTouchEndX(0)
      setTouchStartY(0)
      setSwipeOffset(0)
      setIsSwiping(false)
    }, 200) // Shorter wait time
  }

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

  return (
    <>
      {showAuth ? (
        <Auth onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          <div className="app">
            <header className="header">
              <div className="header-content">
                <h1 className={languageMode === 'english' ? 'title-english' : ''}>{t.appTitle}</h1>

                <div className="header-right">
                  <div className="language-selector-header">
                    <button
                      className={`btn btn-sm ${languageMode === 'chinese' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => switchLanguage('chinese')}
                    >
                      {t.chineseLabel}
                    </button>
                    <button
                      className={`btn btn-sm ${languageMode === 'english' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => switchLanguage('english')}
                    >
                      {t.englishLabel}
                    </button>
                  </div>
                  {user && (
                    <button className="btn btn-outline btn-sm user-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/profile`)}>
                      👤 {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </button>
                  )}
                </div>
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

              {!user && (
                <div className="user-info">
                  <button className="btn btn-outline" onClick={() => setShowAuth(true)}>{t.loginButton}</button>
                </div>
              )}
            </header>

            <main className="main">
              <div className="difficulty-filters">
                <button className={`btn ${selectedDifficulty === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('all')}>{t.allLabel}</button>
                <button className={`btn ${selectedDifficulty === 'A1' || selectedDifficulty === 'A2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('A1')}>{t.a1a2Label}</button>
                <button className={`btn ${selectedDifficulty === 'B1' || selectedDifficulty === 'B2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('B1')}>{t.b1b2Label}</button>
                <button className={`btn ${selectedDifficulty === 'C1' || selectedDifficulty === 'C2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('C1')}>{t.c1c2Label}</button>
              </div>

              {currentWord && (
                <div className={`word-card-container ${isSwiping ? 'swiping' : ''}`}>
                  {swipeFeedback && (
                    <div className="swipe-feedback">{swipeFeedback}</div>
                  )}
                  <div
                    key={`word-${currentWord.id}-${currentIndex}`}
                    className={`word-card ${isFlipped ? 'flipped' : ''} ${isSwiping ? 'swiping' : ''}`}
                    onClick={() => {
                      // Double tap detection: if tapped again within 300ms, flip card
                      const now = Date.now()
                      const timeSinceLastTap = now - lastTapRef.current

                      // Only respond to double tap when not swiping
                      if (!isSwiping && timeSinceLastTap < 300 && timeSinceLastTap > 0) {
                        // Double tap triggers flip
                        setIsFlipped(!isFlipped)
                        lastTapRef.current = 0 // Reset to prevent triple tap
                      } else {
                        // Single tap, record time
                        lastTapRef.current = now
                      }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      transform: isSwiping
                        ? `translateX(${swipeOffset}px) rotateZ(${swipeOffset * 0.15}deg)`
                        : undefined,
                      opacity: isSwiping ? Math.max(0.3, 1 - Math.abs(swipeOffset) / 500) : undefined,
                      transition: isSwiping ? 'none' : undefined,
                      filter: isSwiping && Math.abs(swipeOffset) > 50
                        ? `drop-shadow(${swipeOffset > 0 ? '4px' : '-4px'} 8px 16px ${swipeOffset > 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'})`
                        : undefined,
                    }}
                  >
                    <div className="card-front">
                      <div className="word-front-content">
                        <div className={`word-dutch ${currentWordLengthClass}`}>{currentWord.word}</div>
                        <div className="word-type">{currentWord.partOfSpeech}</div>
                        <button
                          className="speak-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            speakDutch(currentWord.word)
                          }}
                          title={t.speakButton}
                        >
                          {isSpeaking ? '🔇' : '🔊'}
                        </button>
                      </div>
                      <span className={`difficulty-badge difficulty--${currentWord.difficulty} card-difficulty`}>{currentWord.difficulty}</span>
                    </div>
                    <div className="card-back">
                      <div className="word-dutch-small">{currentWord.word}</div>
                      <div className="word-translation">
                        {languageMode === 'chinese' ? currentWord.translation.chinese : currentWord.translation.english}
                      </div>
                      {currentExample && (
                        <div className="word-example">
                          <div className="example-nl">{currentExample.dutch}</div>
                          <button
                            className="speak-btn-example"
                            onClick={(e) => {
                              e.stopPropagation()
                              speakDutch(currentExample.dutch)
                            }}
                            title={t.speakExampleButton}
                          >
                            {isSpeaking ? '🔇' : '🔊'}
                          </button>
                          <div className={`example-${languageMode} ${languageMode === 'english' ? 'example-english' : ''}`}>
                            {languageMode === 'chinese' ? currentExample.chinese : currentExample.english}
                          </div>
                        </div>
                      )}
                      <span className={`difficulty-badge difficulty--${currentWord.difficulty} card-difficulty`}>{currentWord.difficulty}</span>
                    </div>
                  </div>

                  <div className="familiarity-controls">
                    <span>{t.detailsPanel.familiarity}:</span>
                    {(['new', 'learning', 'familiar', 'mastered'] as FamiliarityLevel[]).map(level => (
                      <button
                        key={level}
                        className={`btn btn-sm ${currentWord.familiarity === level ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setWordFamiliarity(currentWord.id, level)}
                      >
                        {t.familiarityLabels[level]}
                      </button>
                    ))}
                  </div>
      </div>
              )}

              <div className="navigation">
                <button className="btn btn-outline" onClick={goToPrevious} disabled={filteredWordList.length <= 1}>{t.prevButton}</button>
                <button className={`btn ${currentWord?.mastered ? 'btn-success' : 'btn-primary'}`} onClick={toggleMastered}>
                  {currentWord?.mastered ? t.unmasteredButton : t.masteredButton}
        </button>
                <button className="btn btn-outline" onClick={goToNext} disabled={filteredWordList.length <= 1}>{t.nextButton}</button>
              </div>

              <div className="tools">
                <button className="btn btn-outline" onClick={shuffleWords}>{t.shuffleButton}</button>
                <button className="btn btn-outline" onClick={() => setShowStats(!showStats)}>{t.showStatsButton(showStats)}</button>
                <button className="btn btn-outline" onClick={() => setShowDetails(!showDetails)}>{t.showDetailsButton(showDetails)}</button>
              </div>

              {showStats && (
                <div className="stats-panel">
                  <h3>{t.statsPanel.title}</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-label">{t.statsPanel.totalWords}</div>
                      <div className="stat-value">{totalCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">{t.statsPanel.mastered}</div>
                      <div className="stat-value">{masteredCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">{t.statsPanel.masteryRate}</div>
                      <div className="stat-value">{progressPercentage}%</div>
                    </div>
                  </div>
                  <div className="difficulty-stats">
                    <h4>{t.statsPanel.difficultyStats}</h4>
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
                    <h4>{t.statsPanel.familiarityStats}</h4>
                    {(['new', 'learning', 'familiar', 'mastered'] as FamiliarityLevel[]).map(level => {
                      const levelWords = wordList.filter(w => w.familiarity === level)
                      const levelPercentage = wordList.length > 0 ? Math.round((levelWords.length / wordList.length) * 100) : 0
                      return (
                        <div key={level} className="familiarity-stat">
                          <span className={`familiarity-badge familiarity--${level}`}>
                            {t.familiarityLabels[level]}
                          </span>
                          <span>{levelWords.length}</span>
                          <span>({levelPercentage}%)</span>
                        </div>
                      )
                    })}
                  </div>
                  <button className="btn btn-danger" onClick={resetProgress}>{t.resetButton}</button>
                </div>
              )}

              {showDetails && currentWord && (
                <div className="details-panel">
                  <h3>{t.detailsPanel.title}</h3>
                  <div className="detail-item"><strong>{t.detailsPanel.dutch}：</strong> {currentWord.word}</div>
                  <div className="detail-item"><strong>{t.detailsPanel.chinese} ：</strong> {currentWord.translation.chinese}</div>
                  <div className="detail-item"><strong>{t.detailsPanel.english}：</strong> {currentWord.translation.english}</div>
                  <div className="detail-item"><strong>{t.detailsPanel.partOfSpeech}：</strong> {currentWord.partOfSpeech}</div>
                  <div className="detail-item">
                    <strong>{t.detailsPanel.difficulty}：</strong>
                    <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>{currentWord.difficulty}</span>
                  </div>
                  <div className="detail-item">
                    <strong>{t.detailsPanel.familiarity}：</strong>
                    <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                      {t.familiarityLabels[currentWord.familiarity]}
                    </span>
                  </div>
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
                      <strong>{t.detailsPanel.notes}：</strong> {currentWord.notes}
                    </div>
                  )}
                  {currentWord.stats && (
                    <div className="detail-item">
                      <strong>{t.detailsPanel.stats}：</strong>
                      <div className="stats-detail">
                        <div>{t.statsPanel.testStats.viewCount}: {currentWord.stats.viewCount}</div>
                        <div>{t.statsPanel.testStats.masteredCount}: {currentWord.stats.masteredCount}</div>
                        <div>{t.statsPanel.testStats.unmasteredCount}: {currentWord.stats.unmasteredCount}</div>
                        <div>{t.statsPanel.testStats.testCount}: {currentWord.stats.testCount}</div>
                        {currentWord.stats.testCount > 0 && (
                          <>
                            <div>{t.statsPanel.testStats.correctCount}: {currentWord.stats.testCorrectCount}</div>
                            <div>{t.statsPanel.testStats.wrongCount}: {currentWord.stats.testWrongCount}</div>
                            <div>{t.statsPanel.testStats.accuracy}: {Math.round((currentWord.stats.testCorrectCount / currentWord.stats.testCount) * 100)}%</div>
                          </>
                        )}
                        {currentWord.stats.lastViewedAt && (
                          <div>{t.statsPanel.testStats.lastViewed}: {new Date(currentWord.stats.lastViewedAt).toLocaleString(languageMode === 'chinese' ? 'zh-CN' : 'en-US')}</div>
                        )}
                        {currentWord.stats.lastTestedAt && (
                          <div>{t.statsPanel.testStats.lastTested}: {new Date(currentWord.stats.lastTestedAt).toLocaleString(languageMode === 'chinese' ? 'zh-CN' : 'en-US')}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>

            <footer className="footer">
              <p>{t.flipCardHint} | {languageMode === 'chinese' ? '使用键盘方向键切换单词' : 'Use arrow keys to navigate'}</p>
            </footer>

            {showUserProfile && user && (
              <UserProfile
                user={user}
                onClose={() => setShowUserProfile(false)}
                languageMode={languageMode}
              />
            )}
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

// App 组件处理路由
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/zh" replace />} />
      <Route path="/zh" element={<MainApp />} />
      <Route path="/zh/*" element={<MainApp />} />
      <Route path="/zh/profile" element={<ProfileRoute />} />
      <Route path="/en" element={<MainApp />} />
      <Route path="/en/*" element={<MainApp />} />
      <Route path="/en/profile" element={<ProfileRoute />} />
      <Route path="*" element={<Navigate to="/zh" replace />} />
    </Routes>
  )
}

export default App
