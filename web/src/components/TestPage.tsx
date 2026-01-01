import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { Word, DifficultyLevel } from '../data/words'
import { words } from '../data/words'
import { supabase } from '../lib/supabase'
import { updateTestStats } from '../lib/progressSync'
import { calculateFamiliarity } from '../lib/familiarityCalculator'
import './TestPage.css'

interface TestPageProps {
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

export default function TestPage({ languageMode }: TestPageProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [testWords, setTestWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [testComplete, setTestComplete] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all')
  const [wordCount, setWordCount] = useState(10)
  const [currentOptions, setCurrentOptions] = useState<Word[]>([])
  const [wrongAnswers, setWrongAnswers] = useState<{word: Word, userChoice: Word | 'not-mastered', correctWord: Word}[]>([])

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

  const translations = {
    chinese: {
      title: '单词测试',
      backToLearn: '← 返回学单词',
      startTest: '开始测试',
      question: '请选择这个单词的正确翻译',
      currentWord: '当前单词',
      yourAnswer: '你的答案',
      submitAnswer: '提交答案',
      nextQuestion: '下一题',
      testComplete: '测试完成',
      score: '得分',
      correct: '正确',
      wrong: '错误',
      correctAnswer: '正确答案',
      speakButton: '🔊 发音',
      selectDifficulty: '选择难度',
      selectWordCount: '选择单词数量',
      allDifficulty: '全部',
      wordCountLabel: (count: number) => `${count} 个单词`,
      notMastered: '未掌握',
      wrongAnswersSummary: '错误答案总结',
      skipped: '你跳过了它'
    },
    english: {
      title: 'Word Test',
      backToLearn: '← Back to Learn',
      startTest: 'Start Test',
      question: 'Select the correct translation',
      currentWord: 'Current Word',
      yourAnswer: 'Your Answer',
      submitAnswer: 'Submit',
      nextQuestion: 'Next',
      testComplete: 'Test Complete',
      score: 'Score',
      correct: 'Correct',
      wrong: 'Wrong',
      correctAnswer: 'Correct Answer',
      speakButton: '🔊 Pronounce',
      selectDifficulty: 'Select Difficulty',
      selectWordCount: 'Select Word Count',
      allDifficulty: 'All',
      wordCountLabel: (count: number) => `${count} words`,
      notMastered: 'Not Mastered',
      wrongAnswersSummary: 'Wrong Answers Summary',
      skipped: 'You skipped it'
    }
  }

  const t = translations[languageMode]

  // 根据难度筛选单词
  const filterWordsByDifficulty = (allWords: Word[], difficulty: DifficultyLevel | 'all') => {
    if (difficulty === 'all') {
      return allWords
    } else if (difficulty === 'A1') {
      // A1-A2 组合筛选
      return allWords.filter(w => w.difficulty === 'A1' || w.difficulty === 'A2')
    } else if (difficulty === 'B1') {
      // B1-B2 组合筛选
      return allWords.filter(w => w.difficulty === 'B1' || w.difficulty === 'B2')
    } else if (difficulty === 'C1') {
      // C1-C2 组合筛选
      return allWords.filter(w => w.difficulty === 'C1' || w.difficulty === 'C2')
    } else {
      return allWords.filter(w => w.difficulty === difficulty)
    }
  }

  // 开始测试
  const startTest = () => {
    // 根据难度筛选单词
    const filteredWords = filterWordsByDifficulty(words, selectedDifficulty)

    // 确保选择的数量不超过可用单词数
    const count = Math.min(wordCount, filteredWords.length)

    // 随机选择指定数量的单词进行测试
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5).slice(0, count)
    setTestWords(shuffled)
    setCurrentIndex(0)
    setScore(0)
    setTestComplete(false)
    setShowResult(false)
    setUserAnswer('')
    setWrongAnswers([])
    // 为第一个单词生成选项
    if (shuffled.length > 0) {
      setCurrentOptions(generateOptions(shuffled[0]))
    } else {
      setCurrentOptions([])
    }
  }

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

  // 生成选项（包含正确答案和3个错误答案）
  const generateOptions = (correctWord: Word) => {
    const options = [correctWord]
    const otherWords = words.filter(w => w.id !== correctWord.id)
    const shuffledOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3)
    options.push(...shuffledOthers)
    return options.sort(() => Math.random() - 0.5)
  }

  const currentWord = testWords[currentIndex]
  const options = currentOptions

  // 提交答案
  const submitAnswer = async (selectedWord: Word) => {
    const isCorrect = selectedWord.id === currentWord.id
    setUserAnswer(String(selectedWord.id))
    if (isCorrect) {
      setScore(score + 1)
    } else {
      // 记录错误答案
      setWrongAnswers(prev => [...prev, {
        word: currentWord,
        userChoice: selectedWord,
        correctWord: currentWord
      }])
    }

    // 更新测试统计
    try {
      if (user) {
        // 登录用户：更新 Supabase
        const { familiarity: calculatedFamiliarity } = await updateTestStats(user.id, currentWord.id, isCorrect, currentWord.stats)
        console.log(`测试结果: ${isCorrect ? '正确' : '错误'}, 自动计算熟悉程度: ${calculatedFamiliarity}`)
      } else {
        // 本地用户：更新 localStorage
        const localStorageData = localStorage.getItem('nl-words')
        if (localStorageData) {
          const localWords: Word[] = JSON.parse(localStorageData)
          const wordIndex = localWords.findIndex(w => w.id === currentWord.id)
          if (wordIndex !== -1) {
            const currentStats = localWords[wordIndex].stats
            const updatedStats = {
              viewCount: currentStats?.viewCount || 0,
              masteredCount: currentStats?.masteredCount || 0,
              unmasteredCount: currentStats?.unmasteredCount || 0,
              testCount: (currentStats?.testCount || 0) + 1,
              testCorrectCount: isCorrect ? (currentStats?.testCorrectCount || 0) + 1 : (currentStats?.testCorrectCount || 0),
              testWrongCount: !isCorrect ? (currentStats?.testWrongCount || 0) + 1 : (currentStats?.testWrongCount || 0),
              lastViewedAt: currentStats?.lastViewedAt,
              lastTestedAt: new Date().toISOString(),
            }
            // 自动计算熟悉程度
            const calculatedFamiliarity = calculateFamiliarity(updatedStats)
            console.log(`测试结果: ${isCorrect ? '正确' : '错误'}, 自动计算熟悉程度: ${calculatedFamiliarity}`)
            localWords[wordIndex] = {
              ...localWords[wordIndex],
              stats: updatedStats,
              familiarity: calculatedFamiliarity
            }
            localStorage.setItem('nl-words', JSON.stringify(localWords))
          }
        }
      }
    } catch (error) {
      console.error('更新测试统计失败:', error)
    }

    setShowResult(true)
  }

  // 标记为未掌握
  const markAsNotMastered = async () => {
    const isCorrect = false
    setUserAnswer('not-mastered')
    // 记录错误答案
    setWrongAnswers(prev => [...prev, {
      word: currentWord,
      userChoice: 'not-mastered',
      correctWord: currentWord
    }])
    // 更新测试统计，并增加未掌握计数
    try {
      if (user) {
        // 登录用户：更新 Supabase
        const { familiarity: calculatedFamiliarity } = await updateTestStats(user.id, currentWord.id, isCorrect, currentWord.stats)
        console.log(`标记为未掌握，自动计算熟悉程度: ${calculatedFamiliarity}`)
      } else {
        // 本地用户：更新 localStorage
        const localStorageData = localStorage.getItem('nl-words')
        if (localStorageData) {
          const localWords: Word[] = JSON.parse(localStorageData)
          const wordIndex = localWords.findIndex(w => w.id === currentWord.id)
          if (wordIndex !== -1) {
            const currentStats = localWords[wordIndex].stats
            const updatedStats = {
              viewCount: currentStats?.viewCount || 0,
              masteredCount: currentStats?.masteredCount || 0,
              unmasteredCount: (currentStats?.unmasteredCount || 0) + 1,
              testCount: (currentStats?.testCount || 0) + 1,
              testCorrectCount: currentStats?.testCorrectCount || 0,
              testWrongCount: (currentStats?.testWrongCount || 0) + 1,
              lastViewedAt: currentStats?.lastViewedAt,
              lastTestedAt: new Date().toISOString(),
            }
            // 自动计算熟悉程度
            const calculatedFamiliarity = calculateFamiliarity(updatedStats)
            console.log(`标记为未掌握，自动计算熟悉程度: ${calculatedFamiliarity}`)
            localWords[wordIndex] = {
              ...localWords[wordIndex],
              stats: updatedStats,
              familiarity: calculatedFamiliarity
            }
            localStorage.setItem('nl-words', JSON.stringify(localWords))
          }
        }
      }
    } catch (error) {
      console.error('标记未掌握失败:', error)
    }
    setShowResult(true)
  }

  // 下一题
  const nextQuestion = () => {
    if (currentIndex < testWords.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setShowResult(false)
      setUserAnswer('')
      // 为下一个单词生成选项
      if (testWords[nextIndex]) {
        setCurrentOptions(generateOptions(testWords[nextIndex]))
      } else {
        setCurrentOptions([])
      }
    } else {
      setTestComplete(true)
    }
  }

  // 重新开始
  const restartTest = () => {
    startTest()
  }

  if (testWords.length === 0) {
    const filteredWords = filterWordsByDifficulty(words, selectedDifficulty)
    const maxWordCount = filteredWords.length

    return (
      <div className="test-page">
        <div className="test-container">
          <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
            {t.backToLearn}
          </button>
          <div className="test-intro">
            <h1>{t.title}</h1>

            <div className="test-options">
              <div className="option-group">
                <label className="option-label">{t.selectDifficulty}</label>
                <div className="difficulty-selector">
                  <button
                    className={`difficulty-option ${selectedDifficulty === 'all' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('all')}
                  >
                    {t.allDifficulty}
                  </button>
                  <button
                    className={`difficulty-option ${selectedDifficulty === 'A1' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('A1')}
                  >
                    A1-A2
                  </button>
                  <button
                    className={`difficulty-option ${selectedDifficulty === 'B1' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('B1')}
                  >
                    B1-B2
                  </button>
                  <button
                    className={`difficulty-option ${selectedDifficulty === 'C1' ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty('C1')}
                  >
                    C1-C2
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
                      {count}
                    </button>
                  ))}
                </div>
                {maxWordCount < wordCount && (
                  <p className="warning-text">
                    {languageMode === 'chinese'
                      ? `该难度下只有 ${maxWordCount} 个单词`
                      : `Only ${maxWordCount} words available at this difficulty`
                    }
                  </p>
                )}
              </div>
            </div>

            <button className="btn btn-primary btn-lg" onClick={startTest}>
              {t.startTest}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (testComplete) {
    const percentage = Math.round((score / testWords.length) * 100)
    return (
      <div className="test-page">
        <div className="test-container">
          <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
            {t.backToLearn}
          </button>
          <div className="test-complete">
            <h1>{t.testComplete}</h1>
            <div className="test-info">
              <span className="test-difficulty">
                {selectedDifficulty === 'all' ? t.allDifficulty : selectedDifficulty}
              </span>
            </div>
            <div className="score-display">
              <div className="score-number">{score} / {testWords.length}</div>
              <div className="score-percentage">{percentage}%</div>
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
                      <div className="user-choice">
                        {item.userChoice === 'not-mastered' ? t.skipped : `${t.yourAnswer}: ${languageMode === 'chinese' ? (item.userChoice as Word).translation.chinese : (item.userChoice as Word).translation.english}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-lg" onClick={restartTest}>
              {t.startTest}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="test-page">
      <div className="test-container">
        <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
          {t.backToLearn}
        </button>
        
        <div className="test-progress">
          <span>{currentIndex + 1} / {testWords.length}</span>
        </div>

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
          <div className="word-dutch-test">{currentWord.word}</div>
        </div>

        <div className="options-container">
          {options.map((option) => (
            <button
              key={option.id}
              className={`option-btn ${showResult && option.id === currentWord.id ? 'correct' : ''} ${showResult && option.id !== currentWord.id && userAnswer === String(option.id) ? 'wrong' : ''}`}
              onClick={() => !showResult && submitAnswer(option)}
              disabled={showResult}
            >
              {languageMode === 'chinese' ? option.translation.chinese : option.translation.english}
            </button>
          ))}

        </div>

        <button
          className={`btn btn-lg next-btn ${showResult ? 'btn-primary' : 'btn-not-mastered'}`}
          onClick={() => !showResult ? markAsNotMastered() : nextQuestion()}
        >
          {t.nextQuestion}
        </button>
      </div>
    </div>
  )
}
