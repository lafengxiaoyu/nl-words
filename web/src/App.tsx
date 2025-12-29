import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { words } from './data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from './data/words'
import { supabase } from './lib/supabase'
import { loadUserProgress, saveUserProgress, saveAllUserProgress, mergeProgress } from './lib/progressSync'
import Auth from './components/Auth'

// Supabase user type
interface SupabaseUser {
  id: string
  email?: string
}

interface SupabaseSession {
  user: SupabaseUser | null
}

function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [wordList, setWordList] = useState<Word[]>(words)
  const [filteredWordList, setFilteredWordList] = useState<Word[]>(words)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

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
      // 同时保存到 localStorage 作为备份
      localStorage.setItem('nl-words', JSON.stringify(mergedWords))
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (error) {
      console.error('从 Supabase 加载进度失败:', error)
      setSyncStatus('error')
      // 如果加载失败，尝试从 localStorage 加载
      loadProgressFromLocalStorage()
    }
  }, [loadProgressFromLocalStorage])

  // 检查用户登录状态
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error && error.message !== 'Invalid API key') {
          console.error('获取用户信息失败:', error)
        }
        setUser(user)
        setIsLoading(false)
        
        if (user) {
          // 用户已登录，从 Supabase 加载进度
          try {
            await loadProgressFromSupabase(user.id)
          } catch (error) {
            console.error('加载云端进度失败，使用本地数据:', error)
            loadProgressFromLocalStorage()
          }
        } else {
          // 用户未登录，从 localStorage 加载
          loadProgressFromLocalStorage()
        }
      } catch (error) {
        console.error('初始化失败:', error)
        setIsLoading(false)
        loadProgressFromLocalStorage()
      }
    }

    checkUser()

    // 监听认证状态变化
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: SupabaseSession) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            await loadProgressFromSupabase(session.user.id)
          } catch (error) {
            console.error('加载云端进度失败:', error)
            loadProgressFromLocalStorage()
          }
        } else {
          loadProgressFromLocalStorage()
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('设置认证监听失败:', error)
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
  }, [calculateFilteredWordList])

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
    
    // 保存到 Supabase
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
    
    // 保存到 Supabase
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
      
      // 批量保存到 Supabase
      await saveAllProgressToSupabase()
    }
  }

  // 导航函数
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredWordList.length)
    setIsFlipped(false)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredWordList.length) % filteredWordList.length)
    setIsFlipped(false)
  }

  const currentWord = filteredWordList[currentIndex]

  // 处理认证成功
  const handleAuthSuccess = () => {
    setShowAuth(false)
  }

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <h2>🇳🇱 荷兰语单词学习</h2>
          <p>正在加载...</p>
        </div>
      </div>
    )
  }

  if (showAuth) {
    return <Auth onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🇳🇱 荷兰语单词学习</h1>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="stats">
          {masteredCount} / {totalCount} 已掌握 ({progressPercentage}%)
        </div>

        {/* 同步状态指示器 */}
        {syncStatus !== 'idle' && (
          <div className={`sync-status sync-status--${syncStatus}`}>
            {syncStatus === 'syncing' && '🔄 同步中...'}
            {syncStatus === 'success' && '✅ 同步成功'}
            {syncStatus === 'error' && '❌ 同步失败'}
          </div>
        )}

        {/* 用户信息 */}
        <div className="user-info">
          {user ? (
            <span>👤 {user.email}</span>
          ) : (
            <button 
              className="btn btn-outline"
              onClick={() => setShowAuth(true)}
            >
              登录
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {/* 难度筛选 */}
        <div className="difficulty-filters">
          <button
            className={`btn ${selectedDifficulty === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedDifficulty('all')}
          >
            全部
          </button>
          <button
            className={`btn ${selectedDifficulty === 'A1' || selectedDifficulty === 'A2' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedDifficulty('A1')}
          >
            A1-A2
          </button>
          <button
            className={`btn ${selectedDifficulty === 'B1' || selectedDifficulty === 'B2' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedDifficulty('B1')}
          >
            B1-B2
          </button>
          <button
            className={`btn ${selectedDifficulty === 'C1' || selectedDifficulty === 'C2' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedDifficulty('C1')}
          >
            C1-C2
          </button>
        </div>

        {/* 单词卡片 */}
        {currentWord && (
          <div className="word-card-container">
            <div 
              className={`word-card ${isFlipped ? 'flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="card-front">
                <div className="word-dutch">{currentWord.dutch}</div>
                {currentWord.wordType && (
                  <div className="word-type">{currentWord.wordType}</div>
                )}
              </div>
              <div className="card-back">
                <div className="word-chinese">{currentWord.chinese}</div>
                {currentWord.example && (
                  <div className="word-example">
                    <div className="example-nl">{currentWord.example.dutch}</div>
                    <div className="example-zh">{currentWord.example.chinese}</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 单词信息 */}
            <div className="word-info">
              <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>
                {currentWord.difficulty}
              </span>
              
              <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                {currentWord.familiarity === 'new' && '🆕 新词'}
                {currentWord.familiarity === 'learning' && '📖 学习中'}
                {currentWord.familiarity === 'familiar' && '😊 熟悉'}
                {currentWord.familiarity === 'mastered' && '✅ 已掌握'}
              </span>

              {currentWord.mastered && (
                <span className="mastered-badge">✅ 已掌握</span>
              )}
            </div>

            {/* 熟悉程度设置 */}
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

        {/* 导航控制 */}
        <div className="navigation">
          <button 
            className="btn btn-outline"
            onClick={goToPrevious}
            disabled={filteredWordList.length <= 1}
          >
            上一个
          </button>
          
          <button 
            className={`btn ${currentWord?.mastered ? 'btn-success' : 'btn-primary'}`}
            onClick={toggleMastered}
          >
            {currentWord?.mastered ? '取消掌握' : '标记掌握'}
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={goToNext}
            disabled={filteredWordList.length <= 1}
          >
            下一个
          </button>
        </div>

        {/* 工具按钮 */}
        <div className="tools">
          <button 
            className="btn btn-outline"
            onClick={shuffleWords}
          >
            🔀 随机排序
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={() => setShowStats(!showStats)}
          >
            📊 {showStats ? '隐藏统计' : '显示统计'}
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={() => setShowDetails(!showDetails)}
          >
            📋 {showDetails ? '隐藏详情' : '显示详情'}
          </button>
        </div>

        {/* 统计面板 */}
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
            
            {/* 按难度统计 */}
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

            {/* 按熟悉程度统计 */}
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

            <button 
              className="btn btn-danger"
              onClick={resetProgress}
            >
              🔄 重置进度
            </button>
          </div>
        )}

        {/* 详情面板 */}
        {showDetails && currentWord && (
          <div className="details-panel">
            <h3>单词详情</h3>
            <div className="detail-item">
              <strong>荷兰语：</strong> {currentWord.dutch}
            </div>
            <div className="detail-item">
              <strong>中文：</strong> {currentWord.chinese}
            </div>
            {currentWord.wordType && (
              <div className="detail-item">
                <strong>词性：</strong> {currentWord.wordType}
              </div>
            )}
            {currentWord.difficulty && (
              <div className="detail-item">
                <strong>难度：</strong> 
                <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>
                  {currentWord.difficulty}
                </span>
              </div>
            )}
            {currentWord.familiarity && (
              <div className="detail-item">
                <strong>熟悉程度：</strong> 
                <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                  {currentWord.familiarity === 'new' && '🆕 新词'}
                  {currentWord.familiarity === 'learning' && '📖 学习中'}
                  {currentWord.familiarity === 'familiar' && '😊 熟悉'}
                  {currentWord.familiarity === 'mastered' && '✅ 已掌握'}
                </span>
              </div>
            )}
            {currentWord.example && (
              <div className="detail-item">
                <strong>例句：</strong>
                <div className="example-container">
                  <div className="example-nl">{currentWord.example.dutch}</div>
                  <div className="example-zh">{currentWord.example.chinese}</div>
                </div>
              </div>
            )}
            {currentWord.grammar && (
              <div className="detail-item">
                <strong>语法说明：</strong> {currentWord.grammar}
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
  )
}

export default App