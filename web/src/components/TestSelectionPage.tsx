import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { DifficultyLevel } from '../data/words'
import { words } from '../data/words'
import { isPremiumUser } from '../lib/subscription'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'
import PremiumUpgradeModal from './PremiumUpgradeModal'
import './TestSelectionPage.css'

interface TestSelectionPageProps {
  languageMode: 'chinese' | 'english'
}

// 锁图标
const LockIcon = () => {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="lock-svg-icon">
      <path d="M12 15V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="11" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 地球图标
const GlobeIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="globe-icon">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2C12 2 15 8 15 12C15 16 12 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function TestSelectionPage({ languageMode }: TestSelectionPageProps) {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all')
  const [wordCount, setWordCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const premium = await isPremiumUser(session.user.id)
        setIsPremium(premium)
      }
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const premium = await isPremiumUser(session.user.id)
        setIsPremium(premium)
      } else {
        setIsPremium(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const translations = {
    chinese: {
      title: '单词测试',
      backToLearn: '← 返回学单词',
      subtitle: '设置测试参数',
      selectDifficulty: '选择难度',
      selectWordCount: '选择单词数量',
      timeLimit: '限时模式',
      timeLimitLabel: (seconds: number) => seconds === 0 ? '无限制' : `${seconds}秒`,
      allDifficulty: '全部',
      wordCountLabel: (count: number) => `${count} 个`,
      modeSelection: '选择测试模式',
      modeDefault: '选择题',
      modeGame: '拼写游戏',
      difficultyWarning: '该难度下只有'
    },
    english: {
      title: 'Word Test',
      backToLearn: '← Back to Learn',
      subtitle: 'Configure Test Settings',
      selectDifficulty: 'Select Difficulty',
      selectWordCount: 'Select Word Count',
      timeLimit: 'Time Limit',
      timeLimitLabel: (seconds: number) => seconds === 0 ? 'No limit' : `${seconds}s`,
      allDifficulty: 'All',
      wordCountLabel: (count: number) => `${count}`,
      modeSelection: 'Select Test Mode',
      modeDefault: 'Multiple Choice',
      modeGame: 'Spelling Game',
      difficultyWarning: 'Only'
    }
  }

  const t = translations[languageMode]

  const filterWordsByDifficulty = (allWords: typeof words, difficulty: DifficultyLevel | 'all') => {
    if (difficulty === 'all') {
      if (isPremium) {
        return allWords
      } else {
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
    } else if (difficulty === 'A1') {
      return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
    } else if (difficulty === 'B1') {
      if (!isPremium) {
        setShowPremiumModal(true)
        setSelectedDifficulty('A1')
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return allWords.filter(w => w.difficulty === 'B1' || w.difficulty === 'B2')
    } else if (difficulty === 'C1') {
      if (!isPremium) {
        setShowPremiumModal(true)
        setSelectedDifficulty('A1')
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return allWords.filter(w => w.difficulty === 'C1' || w.difficulty === 'C2')
    } else {
      const isAllowed = isPremium
      if (!isAllowed) {
        setShowPremiumModal(true)
        setSelectedDifficulty('A1')
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return allWords.filter(w => w.difficulty === difficulty)
    }
  }

  const filteredWords = filterWordsByDifficulty(words, selectedDifficulty)
  const maxWordCount = filteredWords.length

  const handleDifficultySelect = (difficulty: DifficultyLevel | 'all') => {
    if ((difficulty === 'B1' || difficulty === 'B2' || difficulty === 'C1' || difficulty === 'C2') && !isPremium) {
      setShowPremiumModal(true)
      return
    }
    setSelectedDifficulty(difficulty)
  }

  const startTest = (mode: 'default' | 'game') => {
    const langPath = languageMode === 'chinese' ? 'zh' : 'en'
    sessionStorage.setItem('testSettings', JSON.stringify({
      difficulty: selectedDifficulty,
      wordCount: Math.min(wordCount, maxWordCount),
      timeLimit,
      mode
    }))

    if (mode === 'default') {
      navigate(`/${langPath}/test`)
    } else {
      navigate(`/${langPath}/game`)
    }
  }

  return (
    <>
      <div className="test-selection-page">
        <div className="test-selection-container">
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
              {t.backToLearn}
            </button>
            <button
              className="lang-toggle-btn"
              onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/test-select`)}
              aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
              title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            >
              <GlobeIcon />
              <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
            </button>
          </div>

          <div className="test-selection-content">
            <h1>{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>

            <div className="test-options">
              <div className="option-group">
                <label className="option-label">{t.selectDifficulty}</label>
                <div className="difficulty-selector">
                  <button
                    className={`difficulty-option ${selectedDifficulty === 'all' ? 'selected' : ''}`}
                    onClick={() => handleDifficultySelect('all')}
                  >
                    {t.allDifficulty}
                  </button>
                  <button
                    className={`difficulty-option ${selectedDifficulty === 'A1' ? 'selected' : ''}`}
                    onClick={() => handleDifficultySelect('A1')}
                  >
                    A1-A2
                  </button>
                  <button
                    className={`difficulty-option ${!isPremium ? 'locked' : ''} ${selectedDifficulty === 'B1' ? 'selected' : ''}`}
                    onClick={() => handleDifficultySelect('B1')}
                    title={isPremium ? '' : '需要 Premium 才能访问'}
                  >
                    B1-B2
                    {!isPremium && <LockIcon />}
                  </button>
                  <button
                    className={`difficulty-option ${!isPremium ? 'locked' : ''} ${selectedDifficulty === 'C1' ? 'selected' : ''}`}
                    onClick={() => handleDifficultySelect('C1')}
                    title={isPremium ? '' : '需要 Premium 才能访问'}
                  >
                    C1-C2
                    {!isPremium && <LockIcon />}
                  </button>
                </div>
              </div>

              <div className="option-group">
                <label className="option-label">{t.selectWordCount}</label>
                <div className="word-count-selector">
                  {[5, 10, 15, 25].map((count) => (
                    <button
                      key={count}
                      className={`count-option ${wordCount === count ? 'selected' : ''} ${count > maxWordCount ? 'disabled' : ''}`}
                      onClick={() => count <= maxWordCount && setWordCount(count)}
                      disabled={count > maxWordCount}
                    >
                      {t.wordCountLabel(count)}
                    </button>
                  ))}
                </div>
                {maxWordCount < wordCount && (
                  <p className="warning-text">
                    {languageMode === 'chinese'
                      ? `${t.difficultyWarning} ${maxWordCount} 个单词`
                      : `${t.difficultyWarning} ${maxWordCount} words available`
                    }
                  </p>
                )}
              </div>

              <div className="option-group">
                <label className="option-label">{t.timeLimit}</label>
                <div className="time-limit-selector">
                  {[0, 10, 15, 20].map((seconds) => (
                    <button
                      key={seconds}
                      className={`time-option ${timeLimit === seconds ? 'selected' : ''}`}
                      onClick={() => setTimeLimit(seconds)}
                    >
                      {t.timeLimitLabel(seconds)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mode-selection-section">
              <label className="option-label">{t.modeSelection}</label>
              <div className="mode-cards">
                <div className="mode-card primary-mode" onClick={() => startTest('default')}>
                  <h3>{t.modeDefault}</h3>
                </div>

                <div className="mode-card game-mode" onClick={() => startTest('game')}>
                  <h3>{t.modeGame}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        languageMode={languageMode}
      />
    </>
  )
}
