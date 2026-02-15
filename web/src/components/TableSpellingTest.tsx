import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { Word, DifficultyLevel } from '../data/words'
import { words } from '../data/words'
import { supabase } from '../lib/supabase'
import { updateTestStats, loadUserProgress, mergeProgress } from '../lib/progressSync'
import { calculateFamiliarity } from '../lib/familiarityCalculator'
import { isPremiumUser } from '../lib/subscription'
import { safeLocalStorage } from '../lib/safeLocalStorage'
import './TableSpellingTest.css'

interface TableSpellingTestProps {
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

interface TestWord {
  word: Word
  userAnswer: string
  isSubmitted: boolean
  isCorrect: boolean
}

export default function TableSpellingTest({ languageMode }: TableSpellingTestProps) {
  const navigate = useNavigate()

  // 从 sessionStorage 读取初始设置
  const getInitialSettings = () => {
    try {
      const testSettingsStr = sessionStorage.getItem('testSettings')
      if (testSettingsStr) {
        const settings = JSON.parse(testSettingsStr)
        return {
          difficulty: settings.difficulty || 'all',
          wordCount: settings.wordCount || 10,
          testMode: settings.testMode || 'all'
        }
      }
    } catch (error) {
      console.error('Failed to parse test settings:', error)
    }
    return {
      difficulty: 'all',
      wordCount: 10,
      testMode: 'all'
    }
  }

  const initialSettings = getInitialSettings()

  const [user, setUser] = useState<User | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [testWords, setTestWords] = useState<TestWord[]>([])
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const [selectedDifficulty] = useState<DifficultyLevel | 'all'>(initialSettings.difficulty as DifficultyLevel | 'all')
  const [wordCount] = useState(initialSettings.wordCount)
  // 初始化时使用默认的 words 数组，而不是空数组
  const [wordsWithProgress, setWordsWithProgress] = useState<Word[]>(words)
  const [testMode] = useState<'all' | 'mistakes' | 'new' | 'learning'>(initialSettings.testMode as 'all' | 'mistakes' | 'new' | 'learning')
  const [testStarted, setTestStarted] = useState(false)
  const [testComplete, setTestComplete] = useState(false)
  const [hintIndex, setHintIndex] = useState<Record<number, number>>({})

  const translations = {
    chinese: {
      title: '表格拼写测试',
      backToLearn: '← 返回学单词',
      startTest: '开始测试',
      submit: '提交答案',
      submitAll: '提交全部',
      testComplete: '测试完成',
      score: '得分',
      correct: '正确',
      wrong: '错误',
      correctAnswer: '正确答案',
      yourAnswer: '你的答案',
      speakButton: '发音',
      selectTestMode: '测试模式',
      selectDifficulty: '选择难度',
      selectWordCount: '选择单词数量',
      testModeAll: '全部随机',
      testModeMistakes: '错题复习',
      testModeNew: '新题练习',
      testModeLearning: '学习中',
      allDifficulty: '全部',
      wordCountLabel: (count: number) => `${count} 个单词`,
      dutchColumn: '荷兰语',
      englishColumn: '英文翻译',
      inputPlaceholder: '输入英文翻译...',
      results: '测试结果',
      accuracy: '正确率',
      restart: '重新开始',
      backToSelection: '返回选择页面',
      hintButton: '💡 提示',
      hintText: '提示'
    },
    english: {
      title: 'Table Spelling Test',
      backToLearn: '← Back to Learn',
      startTest: 'Start Test',
      submit: 'Submit',
      submitAll: 'Submit All',
      testComplete: 'Test Complete',
      score: 'Score',
      correct: 'Correct',
      wrong: 'Wrong',
      correctAnswer: 'Correct Answer',
      yourAnswer: 'Your Answer',
      speakButton: 'Pronounce',
      selectTestMode: 'Test Mode',
      selectDifficulty: 'Select Difficulty',
      selectWordCount: 'Select Word Count',
      testModeAll: 'All Random',
      testModeMistakes: 'Mistakes Review',
      testModeNew: 'New Words',
      testModeLearning: 'Learning',
      allDifficulty: 'All',
      wordCountLabel: (count: number) => `${count} words`,
      dutchColumn: 'Dutch',
      englishColumn: 'English Translation',
      inputPlaceholder: 'Enter English translation...',
      results: 'Test Results',
      accuracy: 'Accuracy',
      restart: 'Restart',
      backToSelection: 'Back to Selection',
      hintButton: '💡 Hint',
      hintText: 'Hint'
    }
  }

  const t = translations[languageMode]

  // 检查用户认证状态
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
          const premium = await isPremiumUser(session.user.id)
          setIsPremium(premium)
          await loadUserProgressData(session.user.id)
        } else {
          const savedProgress = safeLocalStorage.getItem('nl-words')
          if (savedProgress) {
            try {
              const parsedWords = JSON.parse(savedProgress) as Word[]
              setWordsWithProgress(parsedWords)
            } catch (e) {
              console.error('Failed to parse saved progress:', e)
              setWordsWithProgress(words)
            }
          } else {
            // 如果没有保存的进度，使用默认单词列表
            setWordsWithProgress(words)
          }
        }
      } catch (error) {
        console.error('checkUser error:', error)
        setWordsWithProgress(words)
      }
    }

    const loadUserProgressData = async (userId: string) => {
      try {
        const progressMap = await loadUserProgress(userId)
        const mergedWords = mergeProgress(words, progressMap)
        setWordsWithProgress(mergedWords)
      } catch (error) {
        console.error('Failed to load progress from Supabase:', error)
        const savedProgress = safeLocalStorage.getItem('nl-words')
        if (savedProgress) {
          try {
            const parsedWords = JSON.parse(savedProgress) as Word[]
            setWordsWithProgress(parsedWords)
          } catch (e) {
            console.error('Failed to parse saved progress:', e)
            setWordsWithProgress(words)
          }
        } else {
          // 如果没有保存的进度，使用默认单词列表
          setWordsWithProgress(words)
        }
      }
    }

    checkUser()

    // 从 sessionStorage 读取测试设置已在组件初始化时完成

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        const premium = await isPremiumUser(session.user.id)
        setIsPremium(premium)
        await loadUserProgressData(session.user.id)
      } else {
        setIsPremium(false)
        const savedProgress = safeLocalStorage.getItem('nl-words')
        if (savedProgress) {
          try {
            const parsedWords = JSON.parse(savedProgress) as Word[]
            setWordsWithProgress(parsedWords)
          } catch (e) {
            console.error('Failed to parse saved progress:', e)
            setWordsWithProgress(words)
          }
        } else {
          // 如果没有保存的进度，使用默认单词列表
          setWordsWithProgress(words)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const filterWordsByDifficulty = useCallback((allWords: typeof words, difficulty: DifficultyLevel | 'all') => {
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
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return allWords.filter(w => w.difficulty === 'B1' || w.difficulty === 'B2')
    } else if (difficulty === 'C1') {
      if (!isPremium) {
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return allWords.filter(w => w.difficulty === 'C1' || w.difficulty === 'C2')
    } else {
      if (!isPremium) {
        return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
      }
      return allWords.filter(w => w.difficulty === difficulty)
    }
  }, [isPremium])

  const startTest = useCallback(() => {
    const filteredWords = filterWordsByDifficulty(wordsWithProgress.length > 0 ? wordsWithProgress : words, selectedDifficulty)

    let selectedWords: Word[] = []

    switch (testMode) {
      case 'mistakes': {
        const mistakeWords = filteredWords.filter(w => w.stats && w.stats.testWrongCount && w.stats.testWrongCount > 0)
        selectedWords = mistakeWords.slice(0, wordCount)
        break
      }
      case 'new': {
        const newWords = filteredWords.filter(w => !w.stats || !w.stats.viewCount || w.stats.viewCount === 0)
        selectedWords = newWords.slice(0, wordCount)
        break
      }
      case 'learning': {
        const learningWords = filteredWords.filter(w =>
          w.stats &&
          w.stats.viewCount &&
          w.stats.viewCount > 0 &&
          (!w.stats.testCorrectCount || w.stats.testCorrectCount < 3)
        )
        selectedWords = learningWords.slice(0, wordCount)
        break
      }
      default:
        selectedWords = filteredWords
          .sort(() => Math.random() - 0.5)
          .slice(0, wordCount)
    }

    const testWordObjects: TestWord[] = selectedWords.map(word => ({
      word,
      userAnswer: '',
      isSubmitted: false,
      isCorrect: false
    }))

    setTestWords(testWordObjects)
    setTestStarted(true)
    setTestComplete(false)
  }, [selectedDifficulty, wordCount, testMode, filterWordsByDifficulty, wordsWithProgress])

  // 自动开始测试（表格拼写不需要设置页面）
  useEffect(() => {
    if (!testStarted && wordsWithProgress.length > 0) {
      startTest()
    }
  }, [testStarted, wordsWithProgress, startTest])

  const handleAnswerChange = (index: number, value: string) => {
    setTestWords(prev => {
      const newTestWords = [...prev]
      newTestWords[index] = { ...newTestWords[index], userAnswer: value }
      return newTestWords
    })
  }

  // 灵活的答案匹配函数
  const isFlexibleMatch = (userAnswer: string, correctAnswer: string): boolean => {
    if (!userAnswer.trim()) return false

    const user = userAnswer.toLowerCase().trim()
    const correct = correctAnswer.toLowerCase().trim()

    // 1. 完全匹配
    if (user === correct) return true

    // 2. 用户答案包含正确答案的任一部分（逗号分隔）
    const correctParts = correct.split(',').map(p => p.trim())
    for (const part of correctParts) {
      if (user === part) return true
    }

    // 3. 用户答案包含正确答案的某个单词（至少3个字符）
    const userWords = user.split(/\s+/)
    const correctWords = correct.split(/\s+/)

    for (const userWord of userWords) {
      if (userWord.length < 3) continue
      for (const correctWord of correctWords) {
        if (correctWord.includes(userWord) || userWord.includes(correctWord)) {
          return true
        }
      }
    }

    // 4. 忽略常见介词和冠词的匹配（如: to, a, an, the, in, on, at等）
    const stopWords = new Set(['to', 'a', 'an', 'the', 'in', 'on', 'at', 'by', 'for', 'of', 'with', 'from'])
    const filteredUserWords = userWords.filter(w => !stopWords.has(w.toLowerCase()))
    const filteredCorrectWords = correctWords.filter(w => !stopWords.has(w.toLowerCase()))

    // 如果过滤后都为空，使用原判断
    if (filteredUserWords.length === 0 || filteredCorrectWords.length === 0) {
      return false
    }

    // 检查过滤后的单词是否有交集
    for (const userWord of filteredUserWords) {
      if (filteredCorrectWords.some(cw => cw.includes(userWord) || userWord.includes(cw))) {
        return true
      }
    }

    return false
  }

  const submitAnswer = (index: number) => {
    setTestWords(prev => {
      const newTestWords = [...prev]
      const testWord = newTestWords[index]
      const correctEnglish = testWord.word.translation.english
      const userAnswer = testWord.userAnswer

      const isCorrect = isFlexibleMatch(userAnswer, correctEnglish)

      newTestWords[index] = {
        ...testWord,
        isSubmitted: true,
        isCorrect
      }
      return newTestWords
    })
  }

  const getHint = useCallback((index: number) => {
    const testWord = testWords[index]
    // 显示荷兰语例句
    if (testWord.word.examples && testWord.word.examples.length > 0) {
      return testWord.word.examples[0]
    }
    return ''
  }, [testWords])

  const toggleHint = useCallback((index: number) => {
    setHintIndex(prev => {
      const currentLevel = prev[index] || 0
      if (currentLevel === 0) {
        // 如果当前没有提示，显示第一级提示
        return { ...prev, [index]: 1 }
      } else {
        // 如果有提示，隐藏提示（重置为0）
        return { ...prev, [index]: 0 }
      }
    })
  }, [])

  const submitAll = async () => {
    setTestWords(prev => {
      const newTestWords = prev.map(testWord => {
        const correctEnglish = testWord.word.translation.english
        const userAnswer = testWord.userAnswer

        const isCorrect = isFlexibleMatch(userAnswer, correctEnglish)

        return {
          ...testWord,
          isSubmitted: true,
          isCorrect
        }
      })
      return newTestWords
    })

    setTestComplete(true)

    // 保存测试统计到数据库或 localStorage
    if (user) {
      // 登录用户：保存到数据库
      const updatePromises = testWords.map(tw =>
        updateTestStats(user.id, tw.word.id, tw.isCorrect, tw.word.stats)
      )
      try {
        const results = await Promise.all(updatePromises)

        // 更新本地状态
        setWordsWithProgress(prevWords => {
          return prevWords.map(w => {
            const testWord = testWords.find(tw => tw.word.id === w.id)
            const resultIndex = testWords.findIndex(tw => tw.word.id === w.id)
            const result = results[resultIndex]
            if (result && result.familiarity !== undefined) {
              return {
                ...w,
                familiarity: result.familiarity,
                stats: {
                  viewCount: w.stats?.viewCount ?? 0,
                  masteredCount: w.stats?.masteredCount ?? 0,
                  unmasteredCount: w.stats?.unmasteredCount ?? 0,
                  testCount: (w.stats?.testCount ?? 0) + 1,
                  testCorrectCount: testWord?.isCorrect ? (w.stats?.testCorrectCount ?? 0) + 1 : (w.stats?.testCorrectCount ?? 0),
                  testWrongCount: !testWord?.isCorrect ? (w.stats?.testWrongCount ?? 0) + 1 : (w.stats?.testWrongCount ?? 0),
                  lastTestedAt: new Date().toISOString(),
                  lastViewedAt: w.stats?.lastViewedAt,
                }
              }
            }
            return w
          })
        })
      } catch (error) {
        console.error('Failed to update test stats:', error)
      }
    } else {
      // 未登录用户：保存到 localStorage
      const savedProgress = safeLocalStorage.getItem('nl-words')
      if (savedProgress) {
        try {
          const localWords: Word[] = JSON.parse(savedProgress)

          // 更新每个测试单词的统计
          testWords.forEach(tw => {
            const wordIndex = localWords.findIndex(w => w.id === tw.word.id)
            if (wordIndex !== -1) {
              const currentStats = localWords[wordIndex].stats
              const updatedStats = {
                viewCount: currentStats?.viewCount ?? 0,
                masteredCount: currentStats?.masteredCount ?? 0,
                unmasteredCount: currentStats?.unmasteredCount ?? 0,
                testCount: (currentStats?.testCount ?? 0) + 1,
                testCorrectCount: tw.isCorrect ? (currentStats?.testCorrectCount ?? 0) + 1 : (currentStats?.testCorrectCount ?? 0),
                testWrongCount: !tw.isCorrect ? (currentStats?.testWrongCount ?? 0) + 1 : (currentStats?.testWrongCount ?? 0),
                lastViewedAt: currentStats?.lastViewedAt,
                lastTestedAt: new Date().toISOString(),
              }
              const calculatedFamiliarity = calculateFamiliarity(undefined, updatedStats)
              localWords[wordIndex] = {
                ...localWords[wordIndex],
                stats: updatedStats,
                familiarity: calculatedFamiliarity
              }
            }
          })

          // 保存回 localStorage
          safeLocalStorage.setItem('nl-words', JSON.stringify(localWords))

          // 更新本地状态
          setWordsWithProgress(localWords)
        } catch (error) {
          console.error('Failed to save progress to localStorage:', error)
        }
      }
    }
  }

  const calculateScore = useCallback(() => {
    const correctCount = testWords.filter(tw => tw.isCorrect).length
    const totalCount = testWords.length
    return totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  }, [testWords])

  const speakWord = (dutchWord: string, index: number) => {
    if ('speechSynthesis' in window) {
      setSpeakingIndex(index)
      const utterance = new SpeechSynthesisUtterance(dutchWord)
      utterance.lang = 'nl-NL'
      utterance.rate = 0.8
      utterance.onend = () => setSpeakingIndex(null)
      window.speechSynthesis.speak(utterance)
    }
  }

  const filteredWords = filterWordsByDifficulty(wordsWithProgress.length > 0 ? wordsWithProgress : words, selectedDifficulty)

  if (testComplete) {
    const correctCount = testWords.filter(tw => tw.isCorrect).length
    const accuracy = calculateScore()

    return (
      <div className="table-spelling-test">
        <div className="test-container">
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
              {t.backToLearn}
            </button>
            <button
              className="lang-toggle-btn"
              onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/table-spelling`)}
              aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
              title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            >
              <GlobeIcon />
              <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
            </button>
          </div>

          <div className="results-container">
            <h1>{t.results}</h1>
            <div className="score-summary">
              <div className="score-circle">
                <span className="score-number">{accuracy}%</span>
                <span className="score-label">{t.accuracy}</span>
              </div>
              <div className="stats-summary">
                <div className="stat-item">
                  <span className="stat-value correct">{correctCount}</span>
                  <span className="stat-label">{t.correct}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value wrong">{testWords.length - correctCount}</span>
                  <span className="stat-label">{t.wrong}</span>
                </div>
              </div>
            </div>

            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t.dutchColumn}</th>
                    <th>{t.yourAnswer}</th>
                    <th>{t.correctAnswer}</th>
                    <th>{t.speakButton}</th>
                  </tr>
                </thead>
                <tbody>
                  {testWords.map((testWord, index) => (
                    <tr key={testWord.word.id} className={testWord.isCorrect ? 'correct-row' : 'wrong-row'}>
                      <td>{index + 1}</td>
                      <td className="dutch-cell">{testWord.word.word}</td>
                      <td className={testWord.isCorrect ? 'correct-answer' : 'wrong-answer'}>
                        {testWord.userAnswer || '-'}
                      </td>
                      <td className="correct-answer">{testWord.word.translation.english}</td>
                      <td>
                        <button
                          className="speak-btn-small"
                          onClick={() => speakWord(testWord.word.word, index)}
                          disabled={speakingIndex === index}
                        >
                          <SpeakerIcon isSpeaking={speakingIndex === index} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={startTest}>
                {t.restart}
              </button>
              <button className="btn btn-secondary" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/test-select`)}>
                {t.backToSelection}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!testStarted) {
    return (
      <div className="table-spelling-test">
        <div className="test-container">
          <div className="loading-container">
            <p>{languageMode === 'chinese' ? '加载测试...' : 'Loading test...'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="table-spelling-test">
      <div className="test-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
            {t.backToLearn}
          </button>
          <button
            className="lang-toggle-btn"
            onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/table-spelling`)}
            aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
          >
            <GlobeIcon />
            <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
          </button>
        </div>

        <div className="test-content">
          <h1>{t.title}</h1>
          
          <div className="test-table-container">
            <table className="test-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.dutchColumn}</th>
                  <th>{t.englishColumn}</th>
                  <th>{t.speakButton}</th>
                </tr>
              </thead>
              <tbody>
                {testWords.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      没有测试单词数据 (testWords.length = 0)
                    </td>
                  </tr>
                )}
                {testWords.map((testWord, index) => (
                  <tr key={testWord.word.id}>
                    <td>{index + 1}</td>
                    <td className="dutch-cell">
                      <div>{testWord.word.word || '无荷兰语'}</div>
                      {!testWord.isSubmitted && (
                        <div className="hint-row">
                          <button
                            className="hint-btn-inline"
                            onClick={() => toggleHint(index)}
                            title="显示/隐藏例句"
                          >
                            💡
                          </button>
                          {hintIndex[index] > 0 && (
                            <div className="hint-text-inline">{getHint(index)}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="input-cell">
                      {!testWord.isSubmitted ? (
                        <input
                          type="text"
                          value={testWord.userAnswer}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          placeholder={t.inputPlaceholder}
                          className="answer-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              submitAnswer(index)
                            }
                          }}
                        />
                      ) : (
                        <div className={`submitted-answer ${testWord.isCorrect ? 'correct' : 'wrong'}`}>
                          {testWord.userAnswer}
                          {!testWord.isCorrect && (
                            <span className="correct-answer-hint">
                              ({testWord.word.translation.english})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="speak-btn-small"
                        onClick={() => speakWord(testWord.word.word, index)}
                        disabled={speakingIndex === index}
                      >
                        <SpeakerIcon isSpeaking={speakingIndex === index} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="submit-section">
            {!testWords.every(tw => tw.isSubmitted) ? (
              <button className="btn btn-primary btn-lg" onClick={submitAll}>
                {t.submitAll}
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => setTestComplete(true)}>
                {t.testComplete}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
