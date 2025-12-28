import { useState, useEffect } from 'react'
import './App.css'
import { words } from './data/words'
import type { Word } from './data/words'

function App() {
  const [wordList, setWordList] = useState<Word[]>(words)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // 从localStorage加载数据
  useEffect(() => {
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
  }, [])

  const currentWord = wordList[currentIndex]
  const masteredCount = wordList.filter(w => w.mastered).length
  const totalCount = wordList.length
  const progress = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  // 如果没有单词，显示加载状态
  if (!currentWord || wordList.length === 0) {
    return (
      <div className="app">
        <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>
          <h2>加载中...</h2>
        </div>
      </div>
    )
  }

  // 保存到localStorage
  useEffect(() => {
    localStorage.setItem('nl-words', JSON.stringify(wordList))
  }, [wordList])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleNext = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % wordList.length)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + wordList.length) % wordList.length)
  }

  const handleMastered = () => {
    setWordList(prev => prev.map((word, idx) => 
      idx === currentIndex ? { ...word, mastered: !word.mastered } : word
    ))
  }

  const handleReset = () => {
    if (confirm('确定要重置所有进度吗？')) {
      setWordList(words.map(w => ({ ...w, mastered: false })))
      setCurrentIndex(0)
      setIsFlipped(false)
    }
  }

  const handleShuffle = () => {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5)
    setWordList(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🇳🇱 荷兰语单词学习</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{masteredCount} / {totalCount}</span>
        </div>
      </header>

      <main className="main">
        <div className="card-container">
          <div 
            className={`word-card ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
          >
            <div className="card-front">
              <div className="card-label">荷兰语</div>
              <div className="word-text">{currentWord.dutch}</div>
              <div className="card-hint">点击翻转</div>
            </div>
            <div className="card-back">
              <div className="card-label">中文</div>
              <div className="word-text">{currentWord.chinese}</div>
              <div className="card-hint">点击翻转</div>
            </div>
          </div>
        </div>

        <div className="controls">
          <button className="btn btn-secondary" onClick={handlePrev}>
            ← 上一个
          </button>
          <button 
            className={`btn ${currentWord.mastered ? 'btn-mastered' : 'btn-primary'}`}
            onClick={handleMastered}
          >
            {currentWord.mastered ? '✓ 已掌握' : '标记掌握'}
          </button>
          <button className="btn btn-secondary" onClick={handleNext}>
            下一个 →
          </button>
        </div>

        <div className="word-info">
          <span>第 {currentIndex + 1} / {totalCount} 个</span>
          {currentWord.mastered && <span className="mastered-badge">已掌握</span>}
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
