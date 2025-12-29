import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import './App.css'
import { words } from './data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from './data/words'
import type { ExampleTranslations } from './data/types'
import { supabase } from './lib/supabase'
import { loadUserProgress, saveUserProgress, saveAllUserProgress, mergeProgress } from './lib/progressSync'
import Auth from './components/Auth'

// 语言模式类型
type LanguageMode = 'chinese' | 'english'

// Supabase user type
interface SupabaseUser {
  id: string
  email?: string
}

// 主应用组件
function MainApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [wordList, setWordList] = useState<Word[]>(words)
  const [filteredWordList, setFilteredWordList] = useState<Word[]>(words)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all')
  const [languageMode, setLanguageMode] = useState<LanguageMode>('chinese')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // 触摸事件处理
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)
  const [swipeFeedback, setSwipeFeedback] = useState<string | null>(null)

  // 根据路径确定语言模式
  useEffect(() => {
    const path = location.pathname.toLowerCase()
    if (path.startsWith('/en')) {
      setLanguageMode('english')
    } else if (path.startsWith('/zh')) {
      setLanguageMode('chinese')
    } else {
      setLanguageMode('chinese')
    }
  }, [location.pathname])

  // 切换语言并更新路由
  const switchLanguage = useCallback((lang: LanguageMode) => {
    setLanguageMode(lang)
    if (lang === 'chinese') {
      navigate('/zh')
    } else {
      navigate('/en')
    }
  }, [navigate])

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
        await saveUserProgress(user.id, word.id, word.mastered, word.familiarity)
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
    } else {
      return wordList.filter(w => w.difficulty === selectedDifficulty)
    }
  }, [wordList, selectedDifficulty])

  // 根据难度筛选单词
  useEffect(() => {
    setFilteredWordList(calculateFilteredWordList())
    setIsFlipped(false) // 筛选时重置翻转状态
  }, [calculateFilteredWordList])

  // 当切换单词时，确保卡片重置为未翻转状态
  useEffect(() => {
    setIsFlipped(false)
  }, [currentIndex])

  // 计算学习进度
  const masteredCount = wordList.filter(w => w.mastered).length
  const totalCount = wordList.length
  const progressPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  // 切换当前单词的掌握状态
  const toggleMastered = async () => {
    const currentWord = filteredWordList[currentIndex]
    const updatedWords = wordList.map(word =>
      word.id === currentWord.id
        ? { ...word, mastered: !word.mastered, familiarity: word.mastered ? 'learning' as FamiliarityLevel : 'mastered' as FamiliarityLevel }
        : word
    )

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
    if (window.confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
      const resetWords = wordList.map(word => ({
        ...word,
        mastered: false,
        familiarity: 'new' as FamiliarityLevel
      }))

      setWordList(resetWords)
      localStorage.setItem('nl-words', JSON.stringify(resetWords))
      await saveAllProgressToSupabase()
    }
  }

  // 导航函数
  const goToNext = () => {
    // 如果卡片是翻转状态，先重置，等待动画完成后再切换
    if (isFlipped) {
      setIsFlipped(false)
      // 等待翻转动画完成（0.6s）后再切换单词
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % filteredWordList.length)
      }, 600)
    } else {
      // 如果卡片未翻转，直接切换
      setCurrentIndex((prev) => (prev + 1) % filteredWordList.length)
    }
  }

  const goToPrevious = () => {
    // 如果卡片是翻转状态，先重置，等待动画完成后再切换
    if (isFlipped) {
      setIsFlipped(false)
      // 等待翻转动画完成（0.6s）后再切换单词
      setTimeout(() => {
        setCurrentIndex((prev) => (prev - 1 + filteredWordList.length) % filteredWordList.length)
      }, 600)
    } else {
      // 如果卡片未翻转，直接切换
      setCurrentIndex((prev) => (prev - 1 + filteredWordList.length) % filteredWordList.length)
    }
  }

  // 触摸事件处理函数
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.changedTouches[0].screenX)
    setTouchEndX(e.changedTouches[0].screenX) // 初始化结束位置
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].screenX)
  }

  const handleTouchEnd = () => {
    const masteryThreshold = 80 // 标记掌握状态的滑动阈值
    const navigationThreshold = 200 // 切换单词的滑动阈值（更长，避免冲突）

    if (touchStartX === 0 || touchEndX === 0) {
      return
    }

    const swipeDistance = touchEndX - touchStartX
    const absDistance = Math.abs(swipeDistance)

    // 优先处理掌握状态标记（中等距离滑动：80-200px）
    if (absDistance >= masteryThreshold && absDistance < navigationThreshold) {
      // 向右滑动：标记为已掌握
      if (swipeDistance > masteryThreshold) {
        if (!currentWord?.mastered) {
          setSwipeFeedback('✅ 已掌握')
          setTimeout(() => setSwipeFeedback(null), 1000)
          toggleMastered()
        }
      }
      // 向左滑动：标记为未掌握
      else if (swipeDistance < -masteryThreshold) {
        if (currentWord?.mastered) {
          setSwipeFeedback('❌ 未掌握')
          setTimeout(() => setSwipeFeedback(null), 1000)
          toggleMastered()
        }
      }
    }
    // 如果滑动距离很大，用于导航（切换单词）
    else if (absDistance >= navigationThreshold) {
      // 向左滑动：下一个
      if (swipeDistance < -navigationThreshold) {
        goToNext()
      }
      // 向右滑动：上一个
      else if (swipeDistance > navigationThreshold) {
        goToPrevious()
      }
    }

    // 重置触摸状态
    setTouchStartX(0)
    setTouchEndX(0)
  }

  const currentWord = filteredWordList[currentIndex]

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
                <h1>🇳🇱 荷兰语单词学习</h1>

                <div className="language-selector-header">
                  <button
                    className={`btn btn-sm ${languageMode === 'chinese' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => switchLanguage('chinese')}
                  >
                    中文
                  </button>
                  <button
                    className={`btn btn-sm ${languageMode === 'english' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => switchLanguage('english')}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>

              <div className="stats">
                {masteredCount} / {totalCount} 已掌握 ({progressPercentage}%)
              </div>

              {syncStatus !== 'idle' && (
                <div className={`sync-status sync-status--${syncStatus}`}>
                  {syncStatus === 'syncing' && '🔄 同步中...'}
                  {syncStatus === 'success' && '✅ 同步成功'}
                  {syncStatus === 'error' && '❌ 同步失败'}
                </div>
              )}

              <div className="user-info">
                {user ? (
                  <span>👤 {user.email}</span>
                ) : (
                  <button className="btn btn-outline" onClick={() => setShowAuth(true)}>登录</button>
                )}
              </div>
            </header>

            <main className="main">
              <div className="difficulty-filters">
                <button className={`btn ${selectedDifficulty === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('all')}>全部</button>
                <button className={`btn ${selectedDifficulty === 'A1' || selectedDifficulty === 'A2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('A1')}>A1-A2</button>
                <button className={`btn ${selectedDifficulty === 'B1' || selectedDifficulty === 'B2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('B1')}>B1-B2</button>
                <button className={`btn ${selectedDifficulty === 'C1' || selectedDifficulty === 'C2' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedDifficulty('C1')}>C1-C2</button>
              </div>

              {currentWord && (
                <div className="word-card-container"
                     onTouchStart={handleTouchStart}
                     onTouchMove={handleTouchMove}
                     onTouchEnd={handleTouchEnd}>
                  {swipeFeedback && (
                    <div className="swipe-feedback">{swipeFeedback}</div>
                  )}
                  <div 
                    key={`word-${currentWord.id}-${currentIndex}`}
                    className={`word-card ${isFlipped ? 'flipped' : ''}`} 
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div className="card-front">
                      <div className="word-dutch">{currentWord.word}</div>
                      <div className="word-type">{currentWord.partOfSpeech}</div>
                    </div>
                    <div className="card-back">
                      <div className="word-translation">
                        {languageMode === 'chinese' ? currentWord.translation.chinese : currentWord.translation.english}
                      </div>
                      {currentExample && (
                        <div className="word-example">
                          <div className="example-nl">{currentExample.dutch}</div>
                          <div className={`example-${languageMode}`}>
                            {languageMode === 'chinese' ? currentExample.chinese : currentExample.english}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="word-info">
                    <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>{currentWord.difficulty}</span>
                    <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                      {currentWord.familiarity === 'new' && '🆕 新词'}
                      {currentWord.familiarity === 'learning' && '📖 学习中'}
                      {currentWord.familiarity === 'familiar' && '😊 熟悉'}
                      {currentWord.familiarity === 'mastered' && '✅ 已掌握'}
                    </span>
                    {currentWord.mastered && <span className="mastered-badge">✅ 已掌握</span>}
                  </div>

                  <div className="familiarity-controls">
                    <span>熟悉程度：</span>
                    {(['new', 'learning', 'familiar', 'mastered'] as FamiliarityLevel[]).map(level => (
                      <button
                        key={level}
                        className={`btn btn-sm ${currentWord.familiarity === level ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setWordFamiliarity(currentWord.id, level)}
                      >
                        {level === 'new' && '🆕 新词'}
                        {level === 'learning' && '📖 学习中'}
                        {level === 'familiar' && '😊 熟悉'}
                        {level === 'mastered' && '✅ 已掌握'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="navigation">
                <button className="btn btn-outline" onClick={goToPrevious} disabled={filteredWordList.length <= 1}>上一个</button>
                <button className={`btn ${currentWord?.mastered ? 'btn-success' : 'btn-primary'}`} onClick={toggleMastered}>
                  {currentWord?.mastered ? '取消掌握' : '标记掌握'}
                </button>
                <button className="btn btn-outline" onClick={goToNext} disabled={filteredWordList.length <= 1}>下一个</button>
              </div>

              <div className="tools">
                <button className="btn btn-outline" onClick={shuffleWords}>🔀 随机排序</button>
                <button className="btn btn-outline" onClick={() => setShowStats(!showStats)}>📊 {showStats ? '隐藏统计' : '显示统计'}</button>
                <button className="btn btn-outline" onClick={() => setShowDetails(!showDetails)}>📋 {showDetails ? '隐藏详情' : '显示详情'}</button>
              </div>

              {showStats && (
                <div className="stats-panel">
                  <h3>学习统计</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-label">总单词数</div>
                      <div className="stat-value">{totalCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">已掌握</div>
                      <div className="stat-value">{masteredCount}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">掌握率</div>
                      <div className="stat-value">{progressPercentage}%</div>
                    </div>
                  </div>
                  <div className="difficulty-stats">
                    <h4>按难度统计</h4>
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
                    <h4>按熟悉程度统计</h4>
                    {(['new', 'learning', 'familiar', 'mastered'] as FamiliarityLevel[]).map(level => {
                      const levelWords = wordList.filter(w => w.familiarity === level)
                      const levelPercentage = wordList.length > 0 ? Math.round((levelWords.length / wordList.length) * 100) : 0
                      return (
                        <div key={level} className="familiarity-stat">
                          <span className={`familiarity-badge familiarity--${level}`}>
                            {level === 'new' && '🆕 新词'}
                            {level === 'learning' && '📖 学习中'}
                            {level === 'familiar' && '😊 熟悉'}
                            {level === 'mastered' && '✅ 已掌握'}
                          </span>
                          <span>{levelWords.length}</span>
                          <span>({levelPercentage}%)</span>
                        </div>
                      )
                    })}
                  </div>
                  <button className="btn btn-danger" onClick={resetProgress}>🔄 重置进度</button>
                </div>
              )}

              {showDetails && currentWord && (
                <div className="details-panel">
                  <h3>单词详情</h3>
                  <div className="detail-item"><strong>荷兰语：</strong> {currentWord.word}</div>
                  <div className="detail-item"><strong>中文：</strong> {currentWord.translation.chinese}</div>
                  <div className="detail-item"><strong>英文：</strong> {currentWord.translation.english}</div>
                  <div className="detail-item"><strong>词性：</strong> {currentWord.partOfSpeech}</div>
                  <div className="detail-item">
                    <strong>难度：</strong>
                    <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>{currentWord.difficulty}</span>
                  </div>
                  <div className="detail-item">
                    <strong>熟悉程度：</strong>
                    <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                      {currentWord.familiarity === 'new' && '🆕 新词'}
                      {currentWord.familiarity === 'learning' && '📖 学习中'}
                      {currentWord.familiarity === 'familiar' && '😊 熟悉'}
                      {currentWord.familiarity === 'mastered' && '✅ 已掌握'}
                    </span>
                  </div>
                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <div className="detail-item">
                      <strong>例句：</strong>
                      {currentWord.examples.map((example, index) => (
                        <div key={index} className="example-container">
                          <div className="example-nl">{example}</div>
                          {(() => {
                            if (Array.isArray(currentWord.exampleTranslations)) {
                              const translation = currentWord.exampleTranslations[index]
                              return translation && <div className="example-zh">{translation}</div>
                            } else if (currentWord.exampleTranslations) {
                              const translations = currentWord.exampleTranslations as ExampleTranslations
                              const translation = languageMode === 'chinese'
                                ? translations.chinese?.[index]
                                : translations.english?.[index]
                              return translation && <div className={`example-${languageMode}`}>{translation}</div>
                            }
                            return null
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                  {currentWord.notes && (
                    <div className="detail-item">
                      <strong>备注：</strong> {currentWord.notes}
                    </div>
                  )}
                </div>
              )}
            </main>

            <footer className="footer">
              <p>💡 点击单词卡片查看翻译 | 使用键盘方向键切换单词</p>
            </footer>
          </div>
        </>
      )}
    </>
  )
}

// App 组件处理路由
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/zh" replace />} />
      <Route path="/zh" element={<MainApp />} />
      <Route path="/en" element={<MainApp />} />
      <Route path="*" element={<Navigate to="/zh" replace />} />
    </Routes>
  )
}

export default App
