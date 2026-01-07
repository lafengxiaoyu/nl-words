import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { words } from './data/words'
import type { Word, FamiliarityLevel, DifficultyLevel } from './data/words'
import { supabase } from './lib/supabase'
import { loadUserProgress, saveUserProgress, saveAllUserProgress, mergeProgress } from './lib/progressSync'
import Auth from './components/Auth'

function App() {
  const [user, setUser] = useState<{ id: string } | null>(null)
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: { id: string } | null } | null) => {
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

  // 根据难度筛选单词 - 使用effect但禁用lint警告因为这是必要的副作用
  useEffect(() => {
    if (selectedDifficulty === 'all') {
      setFilteredWordList(wordList)
    } else {
      setFilteredWordList(wordList.filter(w => w.difficulty === selectedDifficulty))
    }
    setCurrentIndex(0)
    setIsFlipped(false)
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [selectedDifficulty, wordList])

  // 保存到 localStorage（无论是否登录都保存作为备份）
  useEffect(() => {
    localStorage.setItem('nl-words', JSON.stringify(wordList))
  }, [wordList])

  const currentWord = filteredWordList[currentIndex]
  const masteredCount = filteredWordList.filter(w => w.mastered || w.familiarity === 'mastered').length
  const totalCount = filteredWordList.length
  const progress = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="app">
        <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>
          <h2>加载中...</h2>
        </div>
      </div>
    )
  }

  // 如果显示登录界面
  if (showAuth && !user) {
    return <Auth onAuthSuccess={() => setShowAuth(false)} />
  }

  // 如果没有单词，显示提示
  if (!currentWord || filteredWordList.length === 0) {
    return (
      <div className="app">
        <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>
          <h2>没有找到单词</h2>
          <p>请检查单词数据文件</p>
        </div>
      </div>
    )
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    setIsFlipped(false)
    setShowDetails(false)
    setCurrentIndex((prev) => (prev + 1) % filteredWordList.length)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setShowDetails(false)
    setCurrentIndex((prev) => (prev - 1 + filteredWordList.length) % filteredWordList.length)
  }

  const handleMastered = async () => {
    const updatedWord = {
      ...currentWord,
      mastered: !currentWord.mastered,
      familiarity: (!currentWord.mastered ? 'mastered' : 'learning') as FamiliarityLevel
    }
    
    setWordList(prev => prev.map((word, idx) => 
      idx === currentIndex ? updatedWord : word
    ))
    
    // 同步到 Supabase
    await saveProgressToSupabase(updatedWord)
  }

  const handleFamiliarityChange = async (level: FamiliarityLevel) => {
    const updatedWord = {
      ...currentWord,
      familiarity: level,
      mastered: level === 'mastered'
    }
    
    setWordList(prev => prev.map((word, idx) => 
      idx === currentIndex ? updatedWord : word
    ))
    
    // 同步到 Supabase
    await saveProgressToSupabase(updatedWord)
  }

  const handleReset = async () => {
    if (confirm('确定要重置所有进度吗？')) {
      const resetWords = words.map(w => ({ ...w, mastered: false, familiarity: 'new' as FamiliarityLevel }))
      setWordList(resetWords)
      setCurrentIndex(0)
      setIsFlipped(false)
      
      // 如果已登录，同步到 Supabase
      if (user) {
        await saveAllUserProgress(user.id, resetWords)
      }
    }
  }

  const handleShuffle = () => {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5)
    setWordList(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowAuth(false)
  }

  const handleSync = async () => {
    if (user) {
      await saveAllProgressToSupabase()
    } else {
      setShowAuth(true)
    }
  }

  const getPartOfSpeechLabel = (pos: string) => {
    const labels: Record<string, string> = {
      noun: '名词',
      verb: '动词',
      adjective: '形容词',
      adverb: '副词',
      pronoun: '代词',
      preposition: '介词',
      conjunction: '连词',
      interjection: '感叹词',
      phrase: '短语',
      other: '其他'
    }
    return labels[pos] || pos
  }

  const getFamiliarityLabel = (level: FamiliarityLevel) => {
    const labels: Record<FamiliarityLevel, string> = {
      new: '新词',
      learning: '学习中',
      familiar: '熟悉',
      mastered: '已掌握'
    }
    return labels[level]
  }

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄 同步中...'
      case 'success': return '✅ 已同步'
      case 'error': return '❌ 同步失败'
      default: return null
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>🇳🇱 荷兰语单词学习</h1>
          <div className="user-info">
            {user ? (
              <>
                <span className="user-email">{user.email}</span>
                {getSyncStatusText() && <span className="sync-status">{getSyncStatusText()}</span>}
                <button className="btn btn-small btn-outline" onClick={handleSync}>
                  {syncStatus === 'syncing' ? '同步中...' : '同步进度'}
                </button>
                <button className="btn btn-small btn-outline" onClick={handleLogout}>
                  登出
                </button>
              </>
            ) : (
              <>
                <span className="guest-notice">游客模式</span>
                <button className="btn btn-small btn-primary" onClick={() => setShowAuth(true)}>
                  登录/注册
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="difficulty-filter">
          <span className="filter-label">难度筛选：</span>
          <button
            className={`btn btn-small ${selectedDifficulty === 'all' ? 'btn-active' : 'btn-outline'}`}
            onClick={() => setSelectedDifficulty('all')}
          >
            全部
          </button>
          {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as DifficultyLevel[]).map(level => (
            <button
              key={level}
              className={`btn btn-small ${selectedDifficulty === level ? 'btn-active' : 'btn-outline'}`}
              onClick={() => setSelectedDifficulty(level)}
            >
              {level}
            </button>
          ))}
          <span className="filter-count">({filteredWordList.length} 个单词)</span>
        </div>

        <div className="card-container">
          <div 
            className={`word-card ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
          >
            <div className="card-front">
              <div className="card-label">荷兰语</div>
              <div className="word-text">{currentWord.word}</div>
              <div className="card-meta">
                <span className="part-of-speech">{getPartOfSpeechLabel(currentWord.partOfSpeech)}</span>
                {currentWord.forms?.noun && (
                  <span className="article">{currentWord.forms.noun.article}</span>
                )}
                <span className={`difficulty-badge difficulty-${currentWord.difficulty.toLowerCase()}`}>
                  {currentWord.difficulty}
                </span>
              </div>
              <div className="card-hint">点击翻转</div>
            </div>
            <div className="card-back">
              <div className="card-label">翻译</div>
              <div className="word-text">{currentWord.translation.chinese}</div>
              <div className="word-text-en">{currentWord.translation.english}</div>
              <div className="card-hint">点击翻转</div>
            </div>
          </div>
        </div>

        <div className="word-details-toggle">
          <button 
            className="btn btn-outline" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼ 隐藏详情' : '▶ 显示详情'}
          </button>
        </div>

        {showDetails && (
          <div className="word-details">
            <div className="detail-section">
              <h3>词性信息</h3>
              <div className="detail-content">
                <p><strong>词性：</strong>{getPartOfSpeechLabel(currentWord.partOfSpeech)}</p>
                
                {currentWord.forms?.noun && (
                  <div className="noun-forms">
                    <p><strong>定冠词：</strong>{currentWord.forms.noun.article}</p>
                    <p><strong>单数：</strong>{currentWord.forms.noun.singular}</p>
                    <p><strong>复数：</strong>{currentWord.forms.noun.plural}</p>
                  </div>
                )}

                {currentWord.forms?.verb && (
                  <div className="verb-forms">
                    <p><strong>不定式：</strong>{currentWord.forms.verb.infinitive}</p>
                    <div className="verb-conjugation">
                      <p><strong>现在时：</strong></p>
                      <ul>
                        <li>ik: {currentWord.forms.verb.present.ik}</li>
                        <li>jij: {currentWord.forms.verb.present.jij}</li>
                        <li>hij: {currentWord.forms.verb.present.hij}</li>
                        <li>wij: {currentWord.forms.verb.present.wij}</li>
                        <li>jullie: {currentWord.forms.verb.present.jullie}</li>
                        <li>zij: {currentWord.forms.verb.present.zij}</li>
                      </ul>
                      <p><strong>过去时：</strong>{currentWord.forms.verb.past.singular} / {currentWord.forms.verb.past.plural}</p>
                      <p><strong>过去分词：</strong>{currentWord.forms.verb.pastParticiple}{currentWord.forms.verb.pastParticipleAuxiliary && ` (与 ${currentWord.forms.verb.pastParticipleAuxiliary} 连用)`}</p>
                    </div>
                  </div>
                )}

                {currentWord.forms?.adjective && (
                  <div className="adjective-forms">
                    <p><strong>原形：</strong>{currentWord.forms.adjective.base}</p>
                    <p><strong>与de连用：</strong>{currentWord.forms.adjective.withDe}</p>
                    <p><strong>与het连用：</strong>{currentWord.forms.adjective.withHet}</p>
                    <p><strong>比较级：</strong>{currentWord.forms.adjective.comparative}</p>
                    <p><strong>最高级：</strong>{currentWord.forms.adjective.superlative}</p>
                  </div>
                )}
              </div>
            </div>

            {currentWord.examples && currentWord.examples.length > 0 && (
              <div className="detail-section">
                <h3>例句</h3>
                <div className="detail-content">
                  {currentWord.examples.map((example, idx) => (
                    <div key={idx} className="example-item">
                      <p className="example-nl">{example}</p>
                      {currentWord.exampleTranslations && currentWord.exampleTranslations[idx] && (
                        <p className="example-cn">{currentWord.exampleTranslations[idx]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentWord.notes && (
              <div className="detail-section">
                <h3>备注</h3>
                <div className="detail-content">
                  <p>{currentWord.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="controls">
          <button className="btn btn-secondary" onClick={handlePrev}>
            ← 上一个
          </button>
          <button 
            className={`btn ${currentWord.mastered || currentWord.familiarity === 'mastered' ? 'btn-mastered' : 'btn-primary'}`}
            onClick={handleMastered}
          >
            {currentWord.mastered || currentWord.familiarity === 'mastered' ? '✓ 已掌握' : '标记掌握'}
          </button>
          <button className="btn btn-secondary" onClick={handleNext}>
            下一个 →
          </button>
        </div>

        <div className="familiarity-controls">
          <span className="familiarity-label">熟悉程度：</span>
          {(['new', 'learning', 'familiar', 'mastered'] as FamiliarityLevel[]).map(level => (
            <button
              key={level}
              className={`btn btn-small ${currentWord.familiarity === level ? 'btn-active' : 'btn-outline'}`}
              onClick={() => handleFamiliarityChange(level)}
            >
              {getFamiliarityLabel(level)}
            </button>
          ))}
        </div>

        <div className="word-info">
          <span>第 {currentIndex + 1} / {totalCount} 个</span>
          <span className={`familiarity-badge familiarity-${currentWord.familiarity}`}>
            {getFamiliarityLabel(currentWord.familiarity)}
          </span>
        </div>

        <div className="actions">
          <button className="btn btn-outline" onClick={handleShuffle}>
            🔀 随机排序
          </button>
          <button className="btn btn-outline" onClick={() => setShowStats(!showStats)}>
            📊 {showStats ? '隐藏' : '显示'}统计
          </button>
          <button className="btn btn-outline" onClick={handleReset}>
            🔄 重置进度
          </button>
        </div>

        {showStats && (
          <div className="stats">
            <h3>学习统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{totalCount}</div>
                <div className="stat-label">总单词数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{masteredCount}</div>
                <div className="stat-label">已掌握</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{totalCount - masteredCount}</div>
                <div className="stat-label">待学习</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{progress}%</div>
                <div className="stat-label">完成度</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
