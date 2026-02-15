import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { Word } from '../data/words'
import { words } from '../data/words'
import { supabase } from '../lib/supabase'
import { loadUserProgress, mergeProgress } from '../lib/progressSync'
import { safeLocalStorage } from '../lib/safeLocalStorage'
import {
  getReviewWords,
  getReviewStatusText,
  getReviewStats,
  type ReviewStats
} from '../lib/smartReview'
import './SmartReviewPage.css'

interface SmartReviewPageProps {
  languageMode: 'chinese' | 'english'
}

// 地球图标组件
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
        d="M12 2C12 2 15 8 15 12C15 16 12 22 12 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 刷新图标组件
const RefreshIcon = ({ isRotating }: { isRotating: boolean }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`refresh-icon ${isRotating ? 'rotating' : ''}`}>
      <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function SmartReviewPage({ languageMode }: SmartReviewPageProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [wordsWithProgress, setWordsWithProgress] = useState<Word[]>(words)
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [reviewWords, setReviewWords] = useState<Array<{ id: number; priority: number; nextReviewTime: number; daysUntilReview: number }>>([])
  const [wordCount, setWordCount] = useState(10)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 使用页面首次加载时的时间戳作为基准，避免每次调用 Date.now() 不同导致统计不稳定
  const [pageLoadTime] = useState<number>(() => Date.now())

  // 翻译
  const translations = {
    chinese: {
      title: '智能复习',
      backToLearn: '← 返回',
      refresh: '刷新',
      selectWordCount: '复习数量',
      startReview: '开始复习',
      noReviewWords: '太棒了！暂无需要复习的单词',
      reviewStats: {
        title: '复习统计',
        mastered: '已掌握',
        newWords: '新词',
        urgent: '紧急复习',
        dueSoon: '即将到期',
        upcoming: '近期复习',
        future: '未来复习',
        total: '总单词数'
      },
      reviewExplanation: {
        title: '智能复习说明',
        description: '基于艾宾浩斯遗忘曲线算法，自动计算每个单词的最佳复习时间',
        statsTitle: '统计说明',
        mastered: '⭐ 已掌握：已经熟练掌握',
        newWords: '📝 新词：刚开始学习',
        urgent: '🔴 紧急复习：已过期，建议立即复习',
        dueSoon: '🟡 即将到期：24小时内到期',
        upcoming: '🔵 近期复习：1周内到期',
        future: '🟢 未来复习：1周后到期',
        intervalsTitle: '复习间隔',
        newWords: '新词：1小时、4小时、24小时后复习',
        learning: '学习中：1天、3天、7天后复习',
        familiar: '熟悉：7天、14天、30天后复习',
        mastered: '已掌握：30天、60天、120天后复习',
        wrongAnswer: '答错会重置复习间隔',
        consecutiveCorrect: '连续答对会延长复习间隔'
      }
    },
    english: {
      title: 'Smart Review',
      backToLearn: '← Back',
      refresh: 'Refresh',
      selectWordCount: 'Review Count',
      startReview: 'Start Review',
      noReviewWords: 'Great! No words need review',
      reviewStats: {
        title: 'Review Statistics',
        mastered: 'Mastered',
        newWords: 'New Words',
        urgent: 'Urgent',
        dueSoon: 'Due Soon',
        upcoming: 'Upcoming',
        future: 'Future',
        total: 'Total'
      },
      reviewExplanation: {
        title: 'Smart Review Guide',
        description: 'Based on Ebbinghaus forgetting curve, calculates optimal review time for each word',
        statsTitle: 'Statistics',
        mastered: '⭐ Mastered: Already mastered',
        newWords: '📝 New Words: Just started learning',
        urgent: '🔴 Urgent: Overdue, review immediately',
        dueSoon: '🟡 Due Soon: Due within 24 hours',
        upcoming: '🔵 Upcoming: Due within a week',
        future: '🟢 Future: Due after a week',
        intervalsTitle: 'Review Intervals',
        newWords: 'New: 1h, 4h, 24h intervals',
        learning: 'Learning: 1d, 3d, 7d intervals',
        familiar: 'Familiar: 7d, 14d, 30d intervals',
        mastered: 'Mastered: 30d, 60d, 120d intervals',
        wrongAnswer: 'Wrong answers reset review interval',
        consecutiveCorrect: 'Consecutive correct answers extend interval'
      }
    }
  }

  const t = translations[languageMode]

  // 加载用户进度
  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        try {
          const progressMap = await loadUserProgress(user.id)
          const mergedWords = mergeProgress(words, progressMap)
          setWordsWithProgress(mergedWords)
        } catch (error) {
          console.error('Failed to load progress from Supabase:', error)
        }
      } else {
        // 未登录，使用 localStorage 的数据
        const savedProgress = safeLocalStorage.getItem('nl-words')
        if (savedProgress) {
          try {
            const parsedWords = JSON.parse(savedProgress) as Word[]
            setWordsWithProgress(parsedWords)
          } catch (e) {
            console.error('Failed to parse saved progress:', e)
          }
        }
      }
    }
    loadProgress()
  }, [user])

  // 检查用户认证状态
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 计算复习统计和单词列表
  useEffect(() => {
    const stats = getReviewStats(wordsWithProgress, pageLoadTime)
    setReviewStats(stats)

    const reviewList = getReviewWords(wordsWithProgress, undefined, pageLoadTime)
    setReviewWords(reviewList)
  }, [wordsWithProgress, pageLoadTime])

  // 刷新
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)

    if (user) {
      try {
        const progressMap = await loadUserProgress(user.id)
        // 使用当前状态作为基准，而不是静态导入的 words
        const mergedWords = mergeProgress(wordsWithProgress, progressMap)
        setWordsWithProgress(mergedWords)
      } catch (error) {
        console.error('Failed to refresh progress:', error)
      }
    } else {
      const savedProgress = safeLocalStorage.getItem('nl-words')
      if (savedProgress) {
        try {
          const parsedWords = JSON.parse(savedProgress) as Word[]
          setWordsWithProgress(parsedWords)
        } catch (e) {
          console.error('Failed to parse saved progress:', e)
        }
      }
    }

    setTimeout(() => setIsRefreshing(false), 500)
  }, [user, wordsWithProgress])

  // 开始复习
  const startReview = () => {
    const reviewIds = reviewWords.slice(0, wordCount).map(w => w.id)
    
    // 将选中的单词ID存入 sessionStorage
    sessionStorage.setItem('reviewWordIds', JSON.stringify(reviewIds))
    sessionStorage.setItem('reviewWordCount', String(wordCount))
    
    // 导航到测试页面
    navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/test`)
  }

  if (!reviewStats) {
    return (
      <div className="smart-review-page">
        <div className="smart-review-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{languageMode === 'chinese' ? '加载中...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    )
  }

  // 获取复习单词的详细列表
  const reviewWordDetails = reviewWords.slice(0, wordCount).map(rw => {
    const word = wordsWithProgress.find(w => w.id === rw.id)
    return { ...rw, word }
  })

  const hasReviewWords = reviewStats.urgentReview + reviewStats.dueSoon > 0

  return (
    <div className="smart-review-page">
      <div className="smart-review-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
            {t.backToLearn}
          </button>
          <button
            className="lang-toggle-btn"
            onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/smart-review`)}
            aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
          >
            <GlobeIcon />
            <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
          </button>
        </div>

        <div className="smart-review-content">
          <h1>{t.title}</h1>
          
          <button className="refresh-btn" onClick={handleRefresh}>
            <RefreshIcon isRotating={isRefreshing} />
            <span>{t.refresh}</span>
          </button>

          {/* 复习统计 */}
          {reviewStats && (
            <div className="review-stats">
              <h2>{t.reviewStats.title}</h2>
              <div className="stats-grid">
                <div className="stat-item mastered">
                  <div className="stat-value">{reviewStats.mastered}</div>
                  <div className="stat-label">{t.reviewStats.mastered}</div>
                </div>
                <div className="stat-item new-words">
                  <div className="stat-value">{reviewStats.new}</div>
                  <div className="stat-label">{t.reviewStats.newWords}</div>
                </div>
                <div className="stat-item urgent">
                  <div className="stat-value">{reviewStats.urgentReview}</div>
                  <div className="stat-label">{t.reviewStats.urgent}</div>
                </div>
                <div className="stat-item due-soon">
                  <div className="stat-value">{reviewStats.dueSoon}</div>
                  <div className="stat-label">{t.reviewStats.dueSoon}</div>
                </div>
                <div className="stat-item upcoming">
                  <div className="stat-value">{reviewStats.upcoming}</div>
                  <div className="stat-label">{t.reviewStats.upcoming}</div>
                </div>
                <div className="stat-item future">
                  <div className="stat-value">{reviewStats.future}</div>
                  <div className="stat-label">{t.reviewStats.future}</div>
                </div>
              </div>
              <div className="stat-total">
                {t.reviewStats.total}: {reviewStats.totalWords}
              </div>
            </div>
          )}

          {/* 复习单词列表 */}
          {hasReviewWords ? (
            <>
              <div className="review-options">
                <label className="option-label">{t.selectWordCount}</label>
                <div className="word-count-selector">
                  {[5, 10, 20, 30].map((count) => (
                    <button
                      key={count}
                      className={`count-option ${wordCount === count ? 'selected' : ''}`}
                      onClick={() => setWordCount(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="review-words-list">
                {reviewWordDetails.map((item) => {
                  if (!item.word) return null
                  const translation = languageMode === 'chinese' ? item.word.translation?.chinese : item.word.translation?.english
                  return (
                    <div key={item.id} className="review-word-item">
                      <div className="word-info">
                        <span className="word-dutch">{item.word.word || '—'}</span>
                        <span className="word-translation">
                          {translation || '—'}
                        </span>
                      </div>
                      <div className="review-status">
                        <span className={`familiarity-badge familiarity-${item.word.familiarity}`}>
                          {getReviewStatusText(item.word.familiarity, item.word.stats, languageMode)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button className="btn btn-primary btn-lg start-review-btn" onClick={startReview}>
                {t.startReview}
              </button>
            </>
          ) : (
            <div className="no-review-words">
              <div className="no-review-icon">🎉</div>
              <p>{t.noReviewWords}</p>
            </div>
          )}

          {/* 复习说明 */}
          <div className="review-explanation">
            <h3>{t.reviewExplanation.title}</h3>
            <p>{t.reviewExplanation.description}</p>
            <h4>{t.reviewExplanation.statsTitle}</h4>
            <ul>
              <li>{t.reviewExplanation.urgent}</li>
              <li>{t.reviewExplanation.dueSoon}</li>
              <li>{t.reviewExplanation.upcoming}</li>
              <li>{t.reviewExplanation.future}</li>
            </ul>
            <h4>{t.reviewExplanation.intervalsTitle}</h4>
            <ul>
              <li>🆕 {t.reviewExplanation.newWords}</li>
              <li>📖 {t.reviewExplanation.learning}</li>
              <li>😊 {t.reviewExplanation.familiar}</li>
              <li>✅ {t.reviewExplanation.mastered}</li>
              <li>❌ {t.reviewExplanation.wrongAnswer}</li>
              <li>✨ {t.reviewExplanation.consecutiveCorrect}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
