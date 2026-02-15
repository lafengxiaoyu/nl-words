import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { Word, WordWithProgress } from '../data/words'
import type { ExampleTranslations } from '../data/types'
import { words } from '../data/words'
import { supabase } from '../lib/supabase'
import { loadUserProgress, mergeProgress } from '../lib/progressSync'
import { safeLocalStorage } from '../lib/safeLocalStorage'
import {
  getReviewWords,
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
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [favoriteMap, setFavoriteMap] = useState<Map<number, boolean>>(new Map())

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
        intervalsNewWords: '新词：1小时、4小时、24小时后复习',
        learning: '学习中：1天、3天、7天后复习',
        familiar: '熟悉：7天、14天、30天后复习',
        intervalsMastered: '已掌握：30天、60天、120天后复习',
        wrongAnswer: '答错会重置复习间隔',
        consecutiveCorrect: '连续答对会延长复习间隔'
      },
      detailsPanel: {
        title: '单词详情',
        dutch: '荷兰语',
        chinese: '中文',
        english: '英文',
        partOfSpeech: '词性',
        difficulty: '难度',
        details: '详情',
        article: '冠词',
        singular: '单数',
        plural: '复数',
        uncountablePreposition: '不可数前置词',
        separable: '可分动词',
        inseparable: '不可分动词',
        prefix: '前缀',
        base: '原形',
        withDe: '加de',
        withHet: '加het',
        comparative: '比较级',
        superlative: '最高级',
        notes: '备注',
        examples: '例句',
        stats: '学习统计',
        viewCount: '查看次数',
        testCount: '测试次数',
        testCorrectCount: '正确次数',
        testWrongCount: '错误次数',
        masteredCount: '掌握次数',
        lastViewedAt: '最后查看',
        lastTestedAt: '最后测试',
        correct: '正确',
        wrong: '错误',
        conjugation: '变位',
        present: '现在时',
        past: '过去时',
        pastSingular: '过去时单数',
        pastPlural: '过去时复数',
        pastParticiple: '过去分词',
        pastParticipleAuxiliary: '辅助动词'
      },
      noun: '名词',
      verb: '动词',
      adjective: '形容词',
      adverb: '副词',
      pronoun: '代词',
      preposition: '介词',
      conjunction: '连词',
      interjection: '感叹词',
      phrase: '短语',
      other: '其他',
      singular: '单数',
      plural: '复数'
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
        intervalsNewWords: 'New: 1h, 4h, 24h intervals',
        learning: 'Learning: 1d, 3d, 7d intervals',
        familiar: 'Familiar: 7d, 14d, 30d intervals',
        intervalsMastered: 'Mastered: 30d, 60d, 120d intervals',
        wrongAnswer: 'Wrong answers reset review interval',
        consecutiveCorrect: 'Consecutive correct answers extend interval'
      },
      detailsPanel: {
        title: 'Word Details',
        dutch: 'Dutch',
        chinese: 'Chinese',
        english: 'English',
        partOfSpeech: 'Part of Speech',
        difficulty: 'Difficulty',
        details: 'Details',
        article: 'Article',
        singular: 'Singular',
        plural: 'Plural',
        uncountablePreposition: 'Uncountable Prep',
        separable: 'Separable',
        inseparable: 'Inseparable',
        prefix: 'Prefix',
        base: 'Base',
        withDe: 'with de',
        withHet: 'with het',
        comparative: 'Comparative',
        superlative: 'Superlative',
        notes: 'Notes',
        examples: 'Examples',
        stats: 'Learning Statistics',
        viewCount: 'View Count',
        testCount: 'Test Count',
        correct: 'Correct',
        wrong: 'Wrong',
        masteredCount: 'Mastered',
        lastViewedAt: 'Last Viewed',
        lastTestedAt: 'Last Tested',
        conjugation: 'Conjugation',
        present: 'Present',
        past: 'Past',
        pastSingular: 'Past Singular',
        pastPlural: 'Past Plural',
        pastParticiple: 'Past Participle',
        favorite: 'Favorite'
      },
      noun: 'Noun',
      verb: 'Verb',
      adjective: 'Adjective',
      adverb: 'Adverb',
      pronoun: 'Pronoun',
      preposition: 'Preposition',
      conjunction: 'Conjunction',
      interjection: 'Interjection',
      phrase: 'Phrase',
      other: 'Other',
      singular: 'Singular',
      plural: 'Plural'
    }
  }

  const t = translations[languageMode]

  // 安全获取翻译字符串的辅助函数
  const getTranslation = (key: string): string => {
    const value = (t as any)[key]
    return typeof value === 'string' ? value : key
  }

  // 处理词性：将 noun/adjective 这种格式拆分为数组
  const normalizePartOfSpeech = (pos: string | string[]): string[] => {
    if (Array.isArray(pos)) {
      return pos.flatMap(p => {
        // 处理 noun/adjective 这种格式
        if (p.includes('/')) {
          return p.split('/').map(s => s.trim())
        }
        return [p]
      })
    } else {
      // 处理单个词性中的 noun/adjective 格式
      if (pos.includes('/')) {
        return pos.split('/').map(s => s.trim())
      }
      return [pos]
    }
  }

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

  // 加载收藏状态
  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          const { data: favorites } = await supabase
            .from('user_progress')
            .select('word_id')
            .eq('user_id', user.id)
            .eq('is_favorited', true)

          if (favorites) {
            const map = new Map<number, boolean>()
            favorites.forEach(f => map.set(f.word_id, true))
            setFavoriteMap(map)
          }
        } catch (error) {
          console.error('Failed to load favorites:', error)
        }
      } else {
        const savedFavorites = safeLocalStorage.getItem('nl-words-favorites')
        if (savedFavorites) {
          try {
            const favoriteIds = JSON.parse(savedFavorites) as number[]
            const map = new Map<number, boolean>()
            favoriteIds.forEach(id => map.set(id, true))
            setFavoriteMap(map)
          } catch (e) {
            console.error('Failed to parse saved favorites:', e)
          }
        }
      }
    }
    loadFavorites()
  }, [user])

  // 切换收藏
  const toggleFavorite = async (wordId: number) => {
    if (user) {
      try {
        const isFavorited = favoriteMap.get(wordId)
        // 先从数据库获取现有的记录，保留 familiarity 和其他字段
        const { data: existingData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .maybeSingle()

        const { error: upsertError } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: wordId,
            familiarity: existingData?.familiarity || 'new',
            is_favorited: !isFavorited,
            favorited_at: !isFavorited ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,word_id'
          })

        if (upsertError) throw upsertError
        setFavoriteMap(prev => new Map(prev).set(wordId, !isFavorited))
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
      }
    } else {
      const savedFavorites = safeLocalStorage.getItem('nl-words-favorites')
      const favoriteIds: number[] = savedFavorites ? JSON.parse(savedFavorites) : []
      const index = favoriteIds.indexOf(wordId)
      if (index > -1) {
        favoriteIds.splice(index, 1)
      } else {
        favoriteIds.push(wordId)
      }
      safeLocalStorage.setItem('nl-words-favorites', JSON.stringify(favoriteIds))
      setFavoriteMap(prev => new Map(prev).set(wordId, index === -1))
    }
  }

  // 处理单词点击，增加查看次数
  const handleWordClick = async (word: WordWithProgress) => {
    setSelectedWord(word)

    // 增加查看次数
    if (user) {
      try {
        // 先获取现有记录
        const { data: existingData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('word_id', word.id)
          .maybeSingle()

        const currentCount = existingData?.view_count || 0

        const { error: upsertError } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            word_id: word.id,
            familiarity: existingData?.familiarity || word.familiarity,
            view_count: currentCount + 1,
            is_favorited: existingData?.is_favorited || false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,word_id'
          })

        if (upsertError) throw upsertError
      } catch (error) {
        console.error('Failed to update view count:', error)
      }
    } else {
      // 未登录用户使用 localStorage 记录查看次数
      try {
        const saved = safeLocalStorage.getItem('nl-words')
        if (saved) {
          const wordsWithProgress = JSON.parse(saved) as Word[]
          const updatedWords = wordsWithProgress.map(w =>
            w.id === word.id
              ? { ...w, stats: { ...w.stats, viewCount: (w.stats?.viewCount || 0) + 1 } }
              : w
          )
          safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
        }
      } catch (error) {
        console.error('Failed to update view count in localStorage:', error)
      }
    }
  }

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
                  // 根据剩余天数判断紧急程度
                  const getUrgencyInfo = (days: number) => {
                    if (days <= 0) {
                      return {
                        class: 'urgent',
                        text: languageMode === 'chinese' ? '紧急' : 'Urgent',
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        )
                      }
                    }
                    if (days <= 1) {
                      return {
                        class: 'due-soon',
                        text: languageMode === 'chinese' ? '24h内' : '24h',
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        )
                      }
                    }
                    if (days <= 7) {
                      return {
                        class: 'upcoming',
                        text: languageMode === 'chinese' ? '1周内' : '1w',
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        )
                      }
                    }
                    return {
                      class: 'future',
                      text: languageMode === 'chinese' ? '未来' : 'Future',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )
                    }
                  }
                  const urgencyInfo = getUrgencyInfo(item.daysUntilReview)
                  return (
                    <div key={item.id} className="review-word-item" onClick={() => item.word && handleWordClick(item.word)}>
                      <div className="word-info">
                        <span className="word-dutch">{item.word.word || '—'}</span>
                        <span className="word-translation">
                          {translation || '—'}
                        </span>
                      </div>
                      <div className="review-status">
                        <span className={`urgency-badge urgency-${urgencyInfo.class}`}>
                          {urgencyInfo.icon}
                          {urgencyInfo.text}
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
              <li>🆕 {t.reviewExplanation.intervalsNewWords}</li>
              <li>📖 {t.reviewExplanation.learning}</li>
              <li>😊 {t.reviewExplanation.familiar}</li>
              <li>✅ {t.reviewExplanation.intervalsMastered}</li>
              <li>❌ {t.reviewExplanation.wrongAnswer}</li>
              <li>✨ {t.reviewExplanation.consecutiveCorrect}</li>
            </ul>
          </div>
        </div>

        {/* 单词详情面板 */}
        {selectedWord && (
          <div className="word-details-overlay" onClick={() => setSelectedWord(null)}>
            <div className="word-details-panel" onClick={(e) => e.stopPropagation()}>
              <h3>{t.detailsPanel.title}</h3>
              <button className="close-details-btn" onClick={() => setSelectedWord(null)}>×</button>

              <div className="detail-item"><strong>{t.detailsPanel.dutch}:</strong> <span>{selectedWord.word}</span></div>
              <div className="detail-item"><strong>{t.detailsPanel.chinese}:</strong> {selectedWord.translation.chinese}</div>
              <div className="detail-item"><strong>{t.detailsPanel.english}:</strong> <span>{selectedWord.translation.english}</span></div>
              <div className="detail-item">
                <strong>{t.detailsPanel.partOfSpeech}:</strong>
                <span>
                  {(() => {
                    const normalizedPosList = normalizePartOfSpeech(selectedWord.partOfSpeech)
                    return normalizedPosList.map(pos => {
                      // 将所有包含 phrase 的词性归类为 phrase（包括 phrasal verb），将 reflexive verb 归类为 verb
                      let normalizedPos = pos.includes('phrase') || pos === 'phrasal verb' ? 'phrase' : pos
                      normalizedPos = normalizedPos.includes('reflexive') ? 'verb' : normalizedPos
                      return getTranslation(normalizedPos)
                    }).join(', ')
                  })()}
                </span>
              </div>
              <div className="detail-item">
                <strong>{t.detailsPanel.difficulty}:</strong>
                <span className={`difficulty-tag difficulty--${selectedWord.difficulty}`}>{selectedWord.difficulty}</span>
              </div>
              <div className="detail-item">
                <strong>{languageMode === 'chinese' ? '收藏状态' : 'Favorite Status'}:</strong>
                <button
                  className={`favorite-btn ${favoriteMap.get(selectedWord.id) ? 'favorited' : ''}`}
                  style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', padding: '8px' }}
                  onClick={() => toggleFavorite(selectedWord.id)}
                  title={favoriteMap.get(selectedWord.id) ? (languageMode === 'chinese' ? '取消收藏' : 'Remove from favorites') : (languageMode === 'chinese' ? '添加收藏' : 'Add to favorites')}
                >
                  {favoriteMap.get(selectedWord.id) ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  )}
                  <span style={{ marginLeft: '4px' }}>
                    {favoriteMap.get(selectedWord.id) ? (languageMode === 'chinese' ? '已收藏' : 'Favorited') : (languageMode === 'chinese' ? '未收藏' : 'Not favorited')}
                  </span>
                </button>
              </div>

              {/* 名词信息 */}
              {selectedWord.partOfSpeech === 'noun' && selectedWord.forms?.noun && (
                <div className="detail-item noun-info">
                  <strong>{t.detailsPanel.partOfSpeech} {t.detailsPanel.details}:</strong>
                  <div className="noun-details">
                    <div><strong>{t.detailsPanel.article}:</strong> <span className={`article-badge article--${selectedWord.forms.noun.article}`}>{selectedWord.forms.noun.article}</span></div>
                    <div><strong>{t.detailsPanel.singular}:</strong> <span>{selectedWord.forms.noun.singular}</span></div>
                    <div><strong>{t.detailsPanel.plural}:</strong> <span>{selectedWord.forms.noun.plural}</span></div>
                    {selectedWord.forms.noun.uncountablePreposition && (
                      <div><strong>{t.detailsPanel.uncountablePreposition}:</strong> <span>{selectedWord.forms.noun.uncountablePreposition}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* 动词信息 */}
              {selectedWord.partOfSpeech === 'verb' && selectedWord.forms?.verb && (
                <div className="detail-item verb-info">
                  <div className="verb-header">
                    <strong>{t.detailsPanel.partOfSpeech} {t.detailsPanel.details}</strong>
                    {selectedWord.forms.verb.isSeparable !== undefined && (
                      <span className="verb-type-tag">
                        {selectedWord.forms.verb.isSeparable ? t.detailsPanel.separable : t.detailsPanel.inseparable}
                        {selectedWord.forms.verb.prefix && ` · ${t.detailsPanel.prefix}: ${selectedWord.forms.verb.prefix}`}
                      </span>
                    )}
                  </div>
                  <div className="verb-details">
                    {/* 变位表格 */}
                    <div className="conjugation-table two-column">
                      {/* 现在时 */}
                      <div className="conjugation-section present-tense">
                        <div className="conjugation-header">{t.detailsPanel.present}</div>
                        <div className="conjugation-content">
                          <div className="conjugation-row"><span className="pronoun">ik</span><span className="form">{selectedWord.forms.verb.present.ik}</span></div>
                          <div className="conjugation-row"><span className="pronoun">jij</span><span className="form">{selectedWord.forms.verb.present.jij}</span></div>
                          <div className="conjugation-row"><span className="pronoun">hij/zij</span><span className="form">{selectedWord.forms.verb.present.hij}</span></div>
                          <div className="conjugation-row"><span className="pronoun">wij</span><span className="form">{selectedWord.forms.verb.present.wij}</span></div>
                          <div className="conjugation-row"><span className="pronoun">jullie</span><span className="form">{selectedWord.forms.verb.present.jullie}</span></div>
                          <div className="conjugation-row"><span className="pronoun">zij</span><span className="form">{selectedWord.forms.verb.present.zij}</span></div>
                        </div>
                      </div>

                      {/* 过去时和过去分词 */}
                      <div className="conjugation-section past-section">
                        <div className="conjugation-header">{t.detailsPanel.past} / {t.detailsPanel.pastParticiple}</div>
                        <div className="conjugation-content">
                          <div className="past-subsection">
                            <div className="subsection-title">{t.detailsPanel.past}</div>
                            <div className="conjugation-row">
                              <span className="pronoun">{t.singular}</span>
                              <span className="form">{selectedWord.forms.verb.past.singular}</span>
                            </div>
                            <div className="conjugation-row">
                              <span className="pronoun">{t.plural}</span>
                              <span className="form">{selectedWord.forms.verb.past.plural}</span>
                            </div>
                          </div>
                          <div className="participle-subsection">
                            <div className="subsection-title">{t.detailsPanel.pastParticiple}</div>
                            <div className="participle-form">
                              {selectedWord.forms.verb.pastParticiple}
                              {selectedWord.forms.verb.pastParticipleAuxiliary && (
                                <span className="auxiliary-verb">({selectedWord.forms.verb.pastParticipleAuxiliary})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 形容词信息 */}
              {selectedWord.partOfSpeech === 'adjective' && selectedWord.forms?.adjective && (
                <div className="detail-item adjective-info">
                  <strong>{t.detailsPanel.partOfSpeech} {t.detailsPanel.details}:</strong>
                  <div className="adjective-details">
                    <div><strong>{t.detailsPanel.base}:</strong> <span>{selectedWord.forms.adjective.base}</span></div>
                    <div><strong>{t.detailsPanel.withDe}:</strong> <span>{selectedWord.forms.adjective.withDe}</span></div>
                    <div><strong>{t.detailsPanel.withHet}:</strong> <span>{selectedWord.forms.adjective.withHet}</span></div>
                    <div><strong>{t.detailsPanel.comparative}:</strong> <span>{selectedWord.forms.adjective.comparative}</span></div>
                    <div><strong>{t.detailsPanel.superlative}:</strong> <span>{selectedWord.forms.adjective.superlative}</span></div>
                  </div>
                </div>
              )}

              {/* 例句 */}
              {selectedWord.examples && selectedWord.examples.length > 0 && (
                <div className="detail-item">
                  <strong>{t.detailsPanel.examples}:</strong>
                  {selectedWord.examples.map((example, index) => (
                    <div key={index} className="example-container">
                      <div className="example-nl">{example}</div>
                      {(() => {
                        if (Array.isArray(selectedWord.exampleTranslations)) {
                          const translation = selectedWord.exampleTranslations[index]
                          return translation && <div className="example-zh">{translation}</div>
                        } else if (selectedWord.exampleTranslations) {
                          const translations = selectedWord.exampleTranslations as ExampleTranslations
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
              {selectedWord.notes && (
                <div className="detail-item">
                  <strong>{t.detailsPanel.notes}:</strong> <span>{selectedWord.notes}</span>
                </div>
              )}

              {/* 统计信息 */}
              {selectedWord.stats && (
                <div className="detail-item stats-info">
                  <strong>{t.detailsPanel.stats}:</strong>
                  <div className="stats-details">
                    <div><strong>{t.detailsPanel.viewCount}:</strong> <span>{selectedWord.stats.viewCount || 0}</span></div>
                    <div><strong>{t.detailsPanel.testCount}:</strong> <span>{selectedWord.stats.testCount || 0}</span></div>
                    <div><strong>{t.detailsPanel.correct}:</strong> <span className="stats-correct">{selectedWord.stats.testCorrectCount || 0}</span></div>
                    <div><strong>{t.detailsPanel.wrong}:</strong> <span className="stats-wrong">{selectedWord.stats.testWrongCount || 0}</span></div>
                    {selectedWord.stats.masteredCount > 0 && (
                      <div><strong>{t.detailsPanel.masteredCount}:</strong> <span className="stats-mastered">{selectedWord.stats.masteredCount}</span></div>
                    )}
                    {selectedWord.stats.lastViewedAt && (
                      <div><strong>{t.detailsPanel.lastViewedAt}:</strong> <span>{new Date(selectedWord.stats.lastViewedAt).toLocaleDateString()}</span></div>
                    )}
                    {selectedWord.stats.lastTestedAt && (
                      <div><strong>{t.detailsPanel.lastTestedAt}:</strong> <span>{new Date(selectedWord.stats.lastTestedAt).toLocaleDateString()}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
