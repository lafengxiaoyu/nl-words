import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { Word, DifficultyLevel, FamiliarityLevel } from '../data/words'
import { words as baseWords } from '../data/words'
import { supabase } from '../lib/supabase'
import { loadUserProgress, updateTestStats, mergeProgress } from '../lib/progressSync'
import { calculateFamiliarity } from '../lib/familiarityCalculator'
import { isPremiumUser } from '../lib/subscription'
import { safeLocalStorage } from '../lib/safeLocalStorage'
import PremiumUpgradeModal from './PremiumUpgradeModal'
import './SpellingGame.css'

interface SpellingGameProps {
  languageMode: 'chinese' | 'english'
}

// 发音按钮图标组件
const SpeakerIcon = ({ isSpeaking }: { isSpeaking: boolean }) => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`speaker-icon ${isSpeaking ? 'speaking' : ''}`}>
      <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor" />
      <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="currentColor" opacity="0.7" />
      <path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

// 地球图标组件
const GlobeIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="globe-icon">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2C12 2 15 8 15 12C15 16 12 22 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 心形图标
const HeartIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="heart-icon">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

// 时钟图标
const ClockIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="clock-icon">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 火焰图标（连击）
const FireIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="fire-icon">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  )
}

// 提示图标
const HintIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="hint-icon">
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SpellingGame({ languageMode }: SpellingGameProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [userWords, setUserWords] = useState<Word[]>(baseWords) // 用户带进度的单词列表
  const [gameWords, setGameWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [resultType, setResultType] = useState<'correct' | 'wrong' | 'timeout' | 'skipped'>('wrong')
  const [score, setScore] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all') // 用于类型检查
  const [wordCount, setWordCount] = useState(10) // 用于类型检查
  const [timeLimit, setTimeLimit] = useState(15) // 每个单词的时间限制（秒）
  const [timeRemaining, setTimeRemaining] = useState(15)

  // 注意：setSelectedDifficulty, setWordCount, setTimeLimit 在当前实现中未直接调用
  // 设置从 sessionStorage 读取，通过 effective* 变量使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _setSelectedDifficulty = setSelectedDifficulty
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _setWordCount = setWordCount
  const [lives, setLives] = useState(3)
  const [combo, setCombo] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<{ word: Word, userAnswer: string, correctAnswer: string }[]>([])
  const [hints, setHints] = useState<string[]>([])
  const [hintIndex, setHintIndex] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [timeModeEnabled, setTimeModeEnabled] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isProcessingRef = useRef(false) // 防止重复处理答案
  const userAnswerRef = useRef(userAnswer) // 用于同步获取最新的 userAnswer
  const hasAutoStarted = useRef(false) // 标记是否已经自动开始游戏

  // 从 localStorage 加载用户进度
  const loadProgressFromLocalStorage = useCallback(() => {
    const savedWords = safeLocalStorage.getItem('nl-words')
    if (savedWords) {
      try {
        const parsed = JSON.parse(savedWords)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserWords(parsed)
        }
      } catch {
        // 加载本地进度失败
        setUserWords(baseWords)
      }
    } else {
      setUserWords(baseWords)
    }
  }, [])

  // 同步 userAnswerRef 与 userAnswer state
  useEffect(() => {
    userAnswerRef.current = userAnswer
  }, [userAnswer])

  // 检查用户登录状态
  useEffect(() => {
    const checkUser = async () => {
      try {
        // 使用 getSession 而不是 getUser，更稳定
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('获取会话失败:', error.message)
        } else {
          setUser(session?.user || null)
        }
      } catch {
        // 检查用户登录状态失败
      }
    }

    checkUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED': {
          const loggedInUser = session?.user || null
          setUser(loggedInUser)

          // 登录后从 Supabase 加载进度
          if (loggedInUser) {
            try {
              const progressMap = await loadUserProgress(loggedInUser.id)
              const mergedWords = mergeProgress(baseWords, progressMap)
              setUserWords(mergedWords)
              safeLocalStorage.setItem('nl-words', JSON.stringify(mergedWords))
            } catch {
              // 从 Supabase 加载进度失败，使用本地数据
              loadProgressFromLocalStorage()
            }
          }
          break
        }
        case 'SIGNED_OUT':
          setUser(null)
          // 登出后重新加载本地进度
          loadProgressFromLocalStorage()
          break
        default:
          // 其他事件不处理
          break
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 加载订阅状态
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (user) {
        const premium = await isPremiumUser(user.id)
        setIsPremium(premium)
      } else {
        setIsPremium(false)
      }
    }
    loadSubscriptionStatus()
  }, [user])

  const translations = {
    chinese: {
      title: '单词拼写挑战',
      backToLearn: '← 返回学单词',
      startGame: '开始挑战',
      question: '请拼写这个荷兰语单词',
      currentWord: '当前单词',
      yourAnswer: '你的答案',
      submitAnswer: '提交答案',
      nextQuestion: '下一题',
      gameComplete: '挑战完成',
      score: '得分',
      correct: '正确',
      wrong: '错误',
      correctAnswer: '正确答案',
      speakButton: '🔊 发音',
      timeUpAnswer: '超时未答',
      skippedAnswer: '已跳过',
      selectDifficulty: '选择难度',
      selectWordCount: '选择单词数量',
      allDifficulty: '全部',
      wordCountLabel: (count: number) => `${count} 个单词`,
      lives: '生命值',
      combo: '连击',
      timeRemaining: '剩余时间',
      hintText: '提示',
      useHint: '使用提示',
      noMoreHints: '没有更多提示',
      timeMode: '限时模式',
      timeModeLabel: (seconds: number) => `${seconds}秒/词`,
      wrongAnswersSummary: '错误单词回顾',
      yourSpelling: '你的拼写',
      correctSpelling: '正确拼写',
      comboBonus: '连击奖励 x',
      comboLost: '连击中断',
      timeUp: '时间到',
      startTimer: '开始计时',
      pauseTimer: '暂停计时',
      perfect: '完美！',
      excellent: '优秀！',
      good: '不错！',
      tryAgain: '再接再厉',
      newRecord: '新纪录！',
      continuePlaying: '继续挑战',
    },
    english: {
      title: 'Spelling Challenge',
      backToLearn: '← Back to Learn',
      startGame: 'Start Challenge',
      question: 'Spell this Dutch word',
      currentWord: 'Current Word',
      yourAnswer: 'Your Answer',
      submitAnswer: 'Submit',
      nextQuestion: 'Next',
      gameComplete: 'Challenge Complete',
      score: 'Score',
      correct: 'Correct',
      wrong: 'Wrong',
      correctAnswer: 'Correct Answer',
      speakButton: '🔊 Pronounce',
      timeUpAnswer: 'Time\'s up',
      skippedAnswer: 'Skipped',
      selectDifficulty: 'Select Difficulty',
      selectWordCount: 'Select Word Count',
      allDifficulty: 'All',
      wordCountLabel: (count: number) => `${count} words`,
      lives: 'Lives',
      combo: 'Combo',
      timeRemaining: 'Time Remaining',
      hintText: 'Hint',
      useHint: 'Use Hint',
      noMoreHints: 'No more hints',
      timeMode: 'Time Mode',
      timeModeLabel: (seconds: number) => `${seconds}s/word`,
      wrongAnswersSummary: 'Wrong Words Review',
      yourSpelling: 'Your Spelling',
      correctSpelling: 'Correct Spelling',
      comboBonus: 'Combo Bonus x',
      comboLost: 'Combo Lost',
      timeUp: 'Time\'s up',
      startTimer: 'Start Timer',
      pauseTimer: 'Pause Timer',
      perfect: 'Perfect!',
      excellent: 'Excellent!',
      good: 'Good!',
      tryAgain: 'Keep trying',
      newRecord: 'New Record!',
      continuePlaying: 'Continue Playing',
    }
  }

  const t = translations[languageMode]

  // 根据难度筛选单词（考虑订阅状态）
  const filterWordsByDifficulty = useCallback((allWords: Word[], difficulty: DifficultyLevel | 'all') => {
    // 免费用户只能访问 A1 和 A2
    if (!isPremium) {
      if (difficulty === 'all') {
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      } else if (difficulty === 'A1') {
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      } else {
        // B1, B2, C1, C2 对免费用户返回空数组
        return []
      }
    }

    // 付费用户可以访问所有难度
    if (difficulty === 'all') {
      return allWords
    } else if (difficulty === 'A1') {
      return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
    } else if (difficulty === 'B1') {
      return allWords.filter(w => w.difficulty === 'B1' || w.difficulty === 'B2')
    } else if (difficulty === 'C1') {
      return allWords.filter(w => w.difficulty === 'C1' || w.difficulty === 'C2')
    } else {
      return allWords.filter(w => w.difficulty === difficulty)
    }
  }, [isPremium])

  // 生成提示
  const generateHints = useCallback((word: string, familiarity: FamiliarityLevel): string[] => {
    const hints: string[] = []
    const length = word.length

    // 如果单词太短，直接返回完整单词
    if (length <= 2) {
      hints.push(word)
      return hints
    }

    // 根据熟悉度生成不同提示级别
    if (familiarity === 'new') {
      // 新词：显示完整单词，但要隐藏部分
      if (length >= 3) {
        hints.push(word[0] + '_'.repeat(length - 2) + word[length - 1])
      }
      if (length >= 4) {
        hints.push(word[0] + word[1] + '_'.repeat(length - 3) + word[length - 2] + word[length - 1])
      }
      hints.push(word)
    } else if (familiarity === 'learning') {
      // 学习中：显示首字母和末字母
      if (length >= 3) {
        hints.push(word[0] + '_'.repeat(length - 2) + word[length - 1])
      }
      if (length >= 4) {
        hints.push(word[0] + word[1] + '_'.repeat(length - 3) + word[length - 2] + word[length - 1])
      }
      hints.push(word)
    } else if (familiarity === 'familiar') {
      // 熟悉：只显示首字母
      hints.push(word[0] + '_'.repeat(length - 1))
      if (length >= 3) {
        hints.push(word[0] + word[1] + '_'.repeat(length - 2))
      }
      hints.push(word)
    } else {
      // 已掌握：只显示部分字符
      hints.push(word[0] + '_'.repeat(length - 1))
      hints.push(word)
    }

    return hints
  }, [])

  // 开始游戏
  const startGame = useCallback(() => {
    // 清除计时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // 重置处理标志
    isProcessingRef.current = false

    // 从 sessionStorage 读取最新设置
    let effectiveWordCount = wordCount
    let effectiveDifficulty = selectedDifficulty
    let effectiveTimeLimit = timeLimit
    
    const testSettingsStr = sessionStorage.getItem('testSettings')
    if (testSettingsStr) {
      try {
        const settings = JSON.parse(testSettingsStr)
        if (settings.wordCount) effectiveWordCount = settings.wordCount
        if (settings.difficulty) effectiveDifficulty = settings.difficulty
        if (settings.timeLimit !== undefined) {
          effectiveTimeLimit = settings.timeLimit
          setTimeLimit(settings.timeLimit)
          setTimeModeEnabled(settings.timeLimit > 0)
          setTimeRemaining(settings.timeLimit)
        }
      } catch (error) {
        console.error('Failed to parse test settings in startGame:', error)
      }
      // 清除设置，避免重复使用
      sessionStorage.removeItem('testSettings')
    }

    const filteredWords = filterWordsByDifficulty(userWords, effectiveDifficulty)
    const count = Math.min(effectiveWordCount, filteredWords.length)
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5).slice(0, count)

    setGameWords(shuffled)
    setCurrentIndex(0)
    setScore(0)
    setLives(3)
    setCombo(0)
    setGameComplete(false)
    setShowResult(false)
    setResultType('wrong')
    setUserAnswer('')
    setWrongAnswers([])
    setHintIndex(0)
    setGameStarted(true)

    if (shuffled.length > 0) {
      const firstWord = shuffled[0]
      const firstHints = generateHints(firstWord.word, firstWord.familiarity)
      setHints(firstHints)
      setTimeRemaining(effectiveTimeLimit)
    }
  }, [userWords, selectedDifficulty, wordCount, timeLimit, generateHints, filterWordsByDifficulty])

  // 倒计时
  useEffect(() => {
    // 清除现有计时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // 只有在游戏进行中、启用计时模式、未显示结果、游戏未完成且还有剩余时间时才启动计时
    if (gameStarted && timeModeEnabled && !showResult && !gameComplete && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 时间到，清除计时器并处理超时
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }

            // 处理超时逻辑
            if (!isProcessingRef.current && currentIndex < gameWords.length) {
              isProcessingRef.current = true
              const currentWord = gameWords[currentIndex]

              if (currentWord) {
                setLives(prevLives => prevLives - 1)
                setCombo(0)
                setWrongAnswers(prev => [...prev, {
                  word: currentWord,
                  userAnswer: '',
                  correctAnswer: currentWord.word
                }])

                // 更新单词统计
                const updateWordStats = () => {
                  if (user) {
                    return updateTestStats(user.id, currentWord.id, false, currentWord.stats)
                  } else {
                    const currentStats = currentWord.stats
                    const updatedStats = {
                      viewCount: currentStats?.viewCount ?? 0,
                      masteredCount: currentStats?.masteredCount ?? 0,
                      unmasteredCount: currentStats?.unmasteredCount ?? 0,
                      testCount: (currentStats?.testCount ?? 0) + 1,
                      testCorrectCount: (currentStats?.testCorrectCount ?? 0),
                      testWrongCount: (currentStats?.testWrongCount ?? 0) + 1,
                      lastViewedAt: currentStats?.lastViewedAt,
                      lastTestedAt: new Date().toISOString(),
                    }
                    const calculatedFamiliarity = calculateFamiliarity(undefined, updatedStats)
                    return Promise.resolve({ familiarity: calculatedFamiliarity })
                  }
                }

                updateWordStats().then(({ familiarity: calculatedFamiliarity }) => {
                  // 更新本地状态
                  if (user) {
                    setUserWords(prevWords => prevWords.map(w => {
                      if (w.id === currentWord.id) {
                        return {
                          ...w,
                          familiarity: calculatedFamiliarity,
                          stats: {
                            viewCount: (w.stats?.viewCount ?? 0),
                            masteredCount: (w.stats?.masteredCount ?? 0),
                            unmasteredCount: (w.stats?.unmasteredCount ?? 0),
                            testCount: (w.stats?.testCount ?? 0) + 1,
                            testCorrectCount: (w.stats?.testCorrectCount ?? 0),
                            testWrongCount: (w.stats?.testWrongCount ?? 0) + 1,
                            lastTestedAt: new Date().toISOString(),
                            lastViewedAt: w.stats?.lastViewedAt,
                          }
                        }
                      }
                      return w
                    }))
                  } else {
                    setUserWords(prevWords => prevWords.map(w => {
                      if (w.id === currentWord.id) {
                        const currentStats = w.stats
                        const updatedStats = {
                          viewCount: currentStats?.viewCount ?? 0,
                          masteredCount: currentStats?.masteredCount ?? 0,
                          unmasteredCount: currentStats?.unmasteredCount ?? 0,
                          testCount: (currentStats?.testCount ?? 0) + 1,
                          testCorrectCount: (currentStats?.testCorrectCount ?? 0),
                          testWrongCount: (currentStats?.testWrongCount ?? 0) + 1,
                          lastViewedAt: currentStats?.lastViewedAt,
                          lastTestedAt: new Date().toISOString(),
                        }
                        const calculatedFamiliarity = calculateFamiliarity(undefined, updatedStats)
                        return {
                          ...w,
                          stats: updatedStats,
                          familiarity: calculatedFamiliarity
                        }
                      }
                      return w
                    }))

                    // 保存到localStorage
                    setTimeout(() => {
                      const words = JSON.parse(safeLocalStorage.getItem('nl-words') || '[]')
                      const updatedWords = words.map((w: Word) => {
                        if (w.id === currentWord.id) {
                          const currentStats = w.stats
                          const updatedStats = {
                            viewCount: currentStats?.viewCount ?? 0,
                            masteredCount: currentStats?.masteredCount ?? 0,
                            unmasteredCount: currentStats?.unmasteredCount ?? 0,
                            testCount: (currentStats?.testCount ?? 0) + 1,
                            testCorrectCount: (currentStats?.testCorrectCount ?? 0),
                            testWrongCount: (currentStats?.testWrongCount ?? 0) + 1,
                            lastViewedAt: currentStats?.lastViewedAt,
                            lastTestedAt: new Date().toISOString(),
                          }
                          const calculatedFamiliarity = calculateFamiliarity(undefined, updatedStats)
                          return {
                            ...w,
                            stats: updatedStats,
                            familiarity: calculatedFamiliarity
                          }
                        }
                        return w
                      })
                      safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
                    }, 0)
                  }
                }).catch(() => {
                  // 更新失败
                }).finally(() => {
                  setResultType('timeout')
                  setShowResult(true)

                  // 检查是否游戏结束
                  setTimeout(() => {
                    setLives(currentLives => {
                      if (currentLives <= 0 || currentIndex >= gameWords.length - 1) {
                        setGameComplete(true)
                      }
                      return currentLives
                    })
                  }, 2000)

                  // 立即重置处理标志，允许用户点击"下一题"
                  setTimeout(() => {
                    isProcessingRef.current = false
                  }, 200)
                })
              }

              return 0
            }

            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [gameStarted, showResult, gameComplete, timeModeEnabled, currentIndex, gameWords, user, timeRemaining])

  // 发音功能
  const speakDutch = (text: string) => {
    if (!text || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'nl-NL'
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  // 使用提示
  const useHint = () => {
    if (hintIndex < hints.length - 1) {
      setHintIndex(prev => prev + 1)
    }
  }

  // 跳过题目（点击下一题按钮）
  const skipQuestion = async () => {
    // 防止重复处理
    if (isProcessingRef.current) {
      return
    }

    // 立即清除计时器
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const currentWord = gameWords[currentIndex]
    if (!currentWord) {
      return
    }

    // 立即设置处理标志
    isProcessingRef.current = true

    // 跳过视为答错
    setLives(prev => prev - 1)
    setCombo(0)
    setWrongAnswers(prev => [...prev, {
      word: currentWord,
      userAnswer: '',
      correctAnswer: currentWord.word
    }])

    // 更新测试统计
    try {
      if (user) {
        const { familiarity: calculatedFamiliarity } = await updateTestStats(user.id, currentWord.id, false, currentWord.stats)

        // 更新本地状态中的单词进度
        setUserWords(prevWords => {
          return prevWords.map(w => {
            if (w.id === currentWord.id) {
              return {
                ...w,
                familiarity: calculatedFamiliarity,
                stats: {
                  viewCount: (w.stats?.viewCount ?? 0),
                  masteredCount: (w.stats?.masteredCount ?? 0),
                  unmasteredCount: (w.stats?.unmasteredCount ?? 0),
                  testCount: (w.stats?.testCount ?? 0) + 1,
                  testCorrectCount: (w.stats?.testCorrectCount ?? 0),
                  testWrongCount: (w.stats?.testWrongCount ?? 0) + 1,
                  lastTestedAt: new Date().toISOString(),
                  lastViewedAt: w.stats?.lastViewedAt,
                }
              }
            }
            return w
          })
        })
      } else {
        // 本地用户：更新 localStorage
        const updatedWords = userWords.map(w => {
          if (w.id === currentWord.id) {
            const currentStats = w.stats
            const updatedStats = {
              viewCount: currentStats?.viewCount ?? 0,
              masteredCount: currentStats?.masteredCount ?? 0,
              unmasteredCount: currentStats?.unmasteredCount ?? 0,
              testCount: (currentStats?.testCount ?? 0) + 1,
              testCorrectCount: (currentStats?.testCorrectCount ?? 0),
              testWrongCount: (currentStats?.testWrongCount ?? 0) + 1,
              lastViewedAt: currentStats?.lastViewedAt,
              lastTestedAt: new Date().toISOString(),
            }
            const calculatedFamiliarity = calculateFamiliarity(undefined, updatedStats)
            return {
              ...w,
              stats: updatedStats,
              familiarity: calculatedFamiliarity
            }
          }
          return w
        })
        setUserWords(updatedWords)
        safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
      }
    } catch {
      // 更新测试统计失败
    }

    setShowResult(true)

    // 检查是否游戏结束
    if (lives <= 1 || currentIndex >= gameWords.length - 1) {
      setTimeout(() => {
        setGameComplete(true)
      }, 2000)
    }

    // 延迟重置处理标志，确保状态更新完成
    setTimeout(() => {
      isProcessingRef.current = false
    }, 300)
  }

  // 提交答案
  const submitAnswer = async () => {
    // 检查是否已经有结果在显示
    if (showResult) {
      return
    }

    // 防止重复提交
    if (isProcessingRef.current) {
      return
    }

    // 立即清除计时器，防止重复触发
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const currentWord = gameWords[currentIndex]
    if (!currentWord) {
      return
    }

    // 立即设置处理标志
    isProcessingRef.current = true

    // 使用 ref 获取最新的 userAnswer 值
    const currentUserAnswer = userAnswerRef.current
    const isCorrect = currentUserAnswer.toLowerCase().trim() === currentWord.word.toLowerCase().trim()

    if (isCorrect) {
      // 答对
      const bonusPoints = 10 + (combo * 2) // 连击奖励
      setScore(prev => prev + bonusPoints)
      setCombo(prev => prev + 1)
    } else {
      // 答错
      setLives(prev => prev - 1)
      setCombo(0)
      setWrongAnswers(prev => [...prev, {
        word: currentWord,
        userAnswer: currentUserAnswer || '',
        correctAnswer: currentWord.word
      }])
    }

    // 设置结果类型
    if (isCorrect) {
      setResultType('correct')
    } else if (currentUserAnswer.trim()) {
      setResultType('wrong')
    } else {
      setResultType('timeout')
    }

    // 更新测试统计
    try {
      if (user) {
        const { familiarity: calculatedFamiliarity } = await updateTestStats(user.id, currentWord.id, isCorrect, currentWord.stats)

        // 更新本地状态中的单词进度
        setUserWords(prevWords => {
          return prevWords.map(w => {
            if (w.id === currentWord.id) {
              return {
                ...w,
                familiarity: calculatedFamiliarity,
                stats: {
                  viewCount: (w.stats?.viewCount ?? 0),
                  masteredCount: (w.stats?.masteredCount ?? 0),
                  unmasteredCount: (w.stats?.unmasteredCount ?? 0),
                  testCount: (w.stats?.testCount ?? 0) + 1,
                  testCorrectCount: isCorrect ? (w.stats?.testCorrectCount ?? 0) + 1 : (w.stats?.testCorrectCount ?? 0),
                  testWrongCount: !isCorrect ? (w.stats?.testWrongCount ?? 0) + 1 : (w.stats?.testWrongCount ?? 0),
                  lastTestedAt: new Date().toISOString(),
                  lastViewedAt: w.stats?.lastViewedAt,
                }
              }
            }
            return w
          })
        })
      } else {
        // 本地用户：更新 localStorage
        const updatedWords = userWords.map(w => {
          if (w.id === currentWord.id) {
            const currentStats = w.stats
            const updatedStats = {
              viewCount: currentStats?.viewCount ?? 0,
              masteredCount: currentStats?.masteredCount ?? 0,
              unmasteredCount: currentStats?.unmasteredCount ?? 0,
              testCount: (currentStats?.testCount ?? 0) + 1,
              testCorrectCount: isCorrect ? (currentStats?.testCorrectCount ?? 0) + 1 : (currentStats?.testCorrectCount ?? 0),
              testWrongCount: !isCorrect ? (currentStats?.testWrongCount ?? 0) + 1 : (currentStats?.testWrongCount ?? 0),
              lastViewedAt: currentStats?.lastViewedAt,
              lastTestedAt: new Date().toISOString(),
            }
            const calculatedFamiliarity = calculateFamiliarity(undefined, updatedStats)
            return {
              ...w,
              stats: updatedStats,
              familiarity: calculatedFamiliarity
            }
          }
          return w
        })
        setUserWords(updatedWords)
        safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
      }
    } catch {
      // 更新测试统计失败
    }

    setShowResult(true)

    // 检查是否游戏结束
    if (lives <= 0 || currentIndex >= gameWords.length - 1) {
      setTimeout(() => {
        setGameComplete(true)
      }, 2000)
    }

    // 延迟重置处理标志，确保状态更新完成
    setTimeout(() => {
      isProcessingRef.current = false
    }, 300)
  }

  // 下一题
  const nextQuestion = () => {
    if (currentIndex < gameWords.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setShowResult(false)
      setResultType('wrong')
      setUserAnswer('')
      setHintIndex(0)
      setTimeRemaining(timeLimit)
      isProcessingRef.current = false // 重置处理标志

      if (gameWords[nextIndex]) {
        const nextHints = generateHints(gameWords[nextIndex].word, gameWords[nextIndex].familiarity)
        setHints(nextHints)
      }
    } else {
      setGameComplete(true)
    }
  }

  // 重新开始
  const restartGame = () => {
    startGame()
  }

  // 检查是否生命值为0
  useEffect(() => {
    if (lives <= 0 && gameStarted) {
      const timer = setTimeout(() => {
        setGameComplete(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [lives, gameStarted])

  const currentWord = gameWords[currentIndex]

  // 从sessionStorage读取设置并自动开始游戏
  useEffect(() => {
    if (gameStarted || hasAutoStarted.current) return

    // 只在有设置时才自动开始游戏
    const testSettingsStr = sessionStorage.getItem('testSettings')
    if (testSettingsStr) {
      console.log('SpellingGame: Auto-starting game with settings from sessionStorage')
      hasAutoStarted.current = true
      startGame()
    }
  }, [startGame, gameStarted])

  // 游戏完成界面
  if (gameComplete) {
    const correctCount = gameWords.length - wrongAnswers.length

    let resultMessage = ''
    if (correctCount === gameWords.length) {
      resultMessage = t.perfect
    } else if (correctCount >= gameWords.length * 0.8) {
      resultMessage = t.excellent
    } else if (correctCount >= gameWords.length * 0.6) {
      resultMessage = t.good
    } else {
      resultMessage = t.tryAgain
    }

    return (
      <>
        <div className="spelling-game">
          <div className="game-container">
            <div className="page-header">
              <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
                {t.backToLearn}
              </button>
              <button
                className="lang-toggle-btn"
                onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/game`)}
                aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
                title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
              >
                <GlobeIcon />
                <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
              </button>
            </div>
            <div className="game-complete">
              <h1>{t.gameComplete}</h1>
              <div className="result-message">{resultMessage}</div>

              <div className="stats-display">
                <div className="stat-item">
                  <div className="stat-label">{t.score}</div>
                  <div className="stat-value">{score}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">{t.correct}</div>
                  <div className="stat-value">{correctCount} / {gameWords.length}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">{t.lives}</div>
                  <div className="stat-value">{lives} / 3</div>
                </div>
              </div>

              {wrongAnswers.length > 0 && (
                <div className="wrong-answers-summary">
                  <h3>{t.wrongAnswersSummary}</h3>
                  <div className="wrong-answers-list">
                    {wrongAnswers.map((item, index) => (
                      <div key={index} className="wrong-answer-item">
                        <div className="wrong-word">
                          <strong>{item.word.word}</strong> -
                          {languageMode === 'chinese' ? item.word.translation.chinese : item.word.translation.english}
                        </div>
                        <div className="spelling-comparison">
                          <span className="your-spelling">{t.yourSpelling}: {item.userAnswer || '—'}</span>
                          <span className="correct-spelling">{t.correctSpelling}: {item.correctAnswer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="game-actions">
                <button className="btn btn-primary btn-lg" onClick={restartGame}>
                  {t.continuePlaying}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Premium 升级弹窗 */}
        <PremiumUpgradeModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          languageMode={languageMode}
        />
      </>
    )
  }

  // 游戏进行中
  if (!currentWord) {
    return (
      <>
        <div className="spelling-game">
          <div className="game-container">
            <div className="page-header">
              <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
                {t.backToLearn}
              </button>
            </div>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>{languageMode === 'chinese' ? '加载中...' : 'Loading...'}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="spelling-game">
        <div className="game-container">
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
              {t.backToLearn}
            </button>
            <button
              className="lang-toggle-btn"
              onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/game`)}
              aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
              title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            >
              <GlobeIcon />
              <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
            </button>
          </div>

          {/* 游戏状态栏 */}
          <div className="game-status-bar">
            <div className="status-item">
              <span className="status-label">{currentIndex + 1} / {gameWords.length}</span>
            </div>
            <div className="status-item">
              <HeartIcon />
              <span className="status-label">{lives}</span>
            </div>
            {combo > 0 && (
              <div className="status-item combo-active">
                <FireIcon />
                <span className="status-label">{combo}x</span>
              </div>
            )}
            <div className="status-item">
              <span className="status-label">{t.score}: {score}</span>
            </div>
            {timeModeEnabled && !showResult && (
              <div className="status-item">
                <ClockIcon />
                <span className={`status-label ${timeRemaining <= 5 ? 'warning' : ''}`}>{timeRemaining}s</span>
              </div>
            )}
          </div>

          {/* 问题卡片 */}
          <div className="question-card">
            <div className="question-header">
              <span className="question-label">{t.currentWord}</span>
              <button
                className="speak-btn-test"
                onClick={() => speakDutch(currentWord.word)}
                title={t.speakButton}
              >
                <SpeakerIcon isSpeaking={isSpeaking} />
              </button>
            </div>
            <div className="word-translation">
              {languageMode === 'chinese' ? currentWord.translation.chinese : currentWord.translation.english}
            </div>
            <div className="word-difficulty-badge">
              <span className={`difficulty-badge difficulty--${currentWord.difficulty}`}>
                {currentWord.difficulty}
              </span>
              <span className={`familiarity-badge familiarity--${currentWord.familiarity}`}>
                {languageMode === 'chinese'
                  ? currentWord.familiarity === 'new' ? '新词'
                    : currentWord.familiarity === 'learning' ? '学习中'
                      : currentWord.familiarity === 'familiar' ? '熟悉'
                        : '已掌握'
                  : currentWord.familiarity}
              </span>
            </div>
          </div>

          {/* 输入区域 */}
          {!showResult && (
            <div className="input-section">
              <input
                ref={inputRef}
                type="text"
                className="word-input"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && userAnswer.trim() && submitAnswer()}
                placeholder={languageMode === 'chinese' ? '输入荷兰语单词...' : 'Type Dutch word...'}
                autoFocus
                disabled={showResult}
              />
              {hints.length > 0 && hints[hintIndex] && (
                <div className="hint-display">
                  <HintIcon />
                  <span className="hint-text">{hints[hintIndex]}</span>
                  {hintIndex < hints.length - 1 && (
                    <button className="hint-btn" onClick={useHint}>
                      {t.useHint} ({hints.length - 1 - hintIndex})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 结果显示 */}
          {showResult && (
            <div className="result-section">
              <div className={`result-message ${resultType === 'correct' ? 'correct' : 'wrong'}`}>
                {resultType === 'correct' 
                  ? t.correct 
                  : resultType === 'skipped'
                    ? t.skippedAnswer
                    : resultType === 'timeout'
                      ? t.timeUpAnswer
                      : userAnswer}
              </div>
              {userAnswer.toLowerCase().trim() !== currentWord.word.toLowerCase().trim() && (
                <div className="correct-answer-display">
                  {t.correctAnswer}: <strong>{currentWord.word}</strong>
                </div>
              )}
              {combo > 0 && userAnswer.toLowerCase().trim() === currentWord.word.toLowerCase().trim() && (
                <div className="combo-display">
                  <FireIcon />
                  <span>{t.comboBonus}{combo}</span>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          {!showResult ? (
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button
                className="btn btn-outline btn-lg"
                style={{ flex: 1 }}
                onClick={skipQuestion}
              >
                {t.nextQuestion}
              </button>
              <button
                className="btn btn-primary btn-lg submit-btn"
                style={{ flex: 1 }}
                onClick={submitAnswer}
                disabled={!userAnswer.trim()}
              >
                {t.submitAnswer}
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-lg next-btn"
              onClick={nextQuestion}
            >
              {t.nextQuestion}
            </button>
          )}
        </div>
      </div>

      {/* Premium 升级弹窗 */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        languageMode={languageMode}
      />
    </>
  )
}
