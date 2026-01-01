import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Word, DifficultyLevel } from '../data/words'
import { words } from '../data/words'
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
  const [testWords, setTestWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [testComplete, setTestComplete] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all')
  const [wordCount, setWordCount] = useState(10)

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
      wordCountLabel: (count: number) => `${count} 个单词`
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
      wordCountLabel: (count: number) => `${count} words`
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
  const options = currentWord ? generateOptions(currentWord) : []

  // 提交答案
  const submitAnswer = (selectedWord: Word) => {
    if (selectedWord.id === currentWord.id) {
      setScore(score + 1)
    }
    setShowResult(true)
  }

  // 下一题
  const nextQuestion = () => {
    if (currentIndex < testWords.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowResult(false)
      setUserAnswer('')
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
                  {[5, 10, 15, 20, 25].map((count) => (
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

        {showResult && (
          <button className="btn btn-primary btn-lg next-btn" onClick={nextQuestion}>
            {t.nextQuestion}
          </button>
        )}
      </div>
    </div>
  )
}
