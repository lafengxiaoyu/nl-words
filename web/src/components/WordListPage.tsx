import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Word } from '../data/words'
import { words } from '../data/words'

import './WordListPage.css'

interface WordListPageProps {
  languageMode: 'chinese' | 'english'
}

export default function WordListPage({ languageMode }: WordListPageProps) {
  const navigate = useNavigate()
  const [wordList, setWordList] = useState<Word[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')



  // 加载单词列表
  useEffect(() => {
    setWordList(words)
  }, [])

  const translations = {
    chinese: {
      title: '单词表',
      backToLearn: '← 返回学单词',
      word: '单词',
      translation: '翻译',
      partOfSpeech: '词性',
      difficulty: '难度',
      searchPlaceholder: '搜索单词或翻译...',
      allParts: '全部词性',
      allDifficulties: '全部难度',
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
      A1: 'A1',
      A2: 'A2',
      B1: 'B1',
      B2: 'B2',
      C1: 'C1',
      C2: 'C2',
      totalWords: (count: number) => `共 ${count} 个单词`,
      noResults: '未找到匹配的单词'
    },
    english: {
      title: 'Word List',
      backToLearn: '← Back to Learn',
      word: 'Word',
      translation: 'Translation',
      partOfSpeech: 'Part of Speech',
      difficulty: 'Difficulty',
      searchPlaceholder: 'Search words or translations...',
      allParts: 'All Parts',
      allDifficulties: 'All Difficulties',
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
      A1: 'A1',
      A2: 'A2',
      B1: 'B1',
      B2: 'B2',
      C1: 'C1',
      C2: 'C2',
      totalWords: (count: number) => `Total ${count} words`,
      noResults: 'No matching words found'
    }
  }

  const t = translations[languageMode]

  // 过滤单词
  const filteredWords = wordList.filter(word => {
    // 搜索过滤
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      word.word.toLowerCase().includes(searchLower) ||
      word.translation.chinese.toLowerCase().includes(searchLower) ||
      word.translation.english.toLowerCase().includes(searchLower)

    // 词性过滤
    const matchesPartOfSpeech = selectedPartOfSpeech === 'all' || word.partOfSpeech === selectedPartOfSpeech

    // 难度过滤
    const matchesDifficulty = selectedDifficulty === 'all' || word.difficulty === selectedDifficulty

    return matchesSearch && matchesPartOfSpeech && matchesDifficulty
  })

  // 获取所有唯一的词性
  const allPartsOfSpeech: string[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'phrase', 'other']

  // 获取所有唯一的难度
  const allDifficulties = Array.from(new Set(words.map(w => w.difficulty))).sort()

  return (
    <div className="word-list-page">
      <div className="word-list-container">
        <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
          {t.backToLearn}
        </button>
        
        <div className="word-list-header">
          <h1>{t.title}</h1>
          <p className="word-count">{t.totalWords(filteredWords.length)}</p>
        </div>

        {/* 搜索和过滤 */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">{t.partOfSpeech}</label>
              <div className="filter-options">
                <button
                  className={`filter-option ${selectedPartOfSpeech === 'all' ? 'selected' : ''}`}
                  onClick={() => setSelectedPartOfSpeech('all')}
                >
                  {t.allParts}
                </button>
                {allPartsOfSpeech.map(pos => (
                  <button
                    key={pos}
                    className={`filter-option ${selectedPartOfSpeech === pos ? 'selected' : ''}`}
                    onClick={() => setSelectedPartOfSpeech(pos)}
                  >
                    {t[pos as keyof typeof t] || pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">{t.difficulty}</label>
              <div className="filter-options">
                <button
                  className={`filter-option ${selectedDifficulty === 'all' ? 'selected' : ''}`}
                  onClick={() => setSelectedDifficulty('all')}
                >
                  {t.allDifficulties}
                </button>
                {allDifficulties.map(diff => (
                  <button
                    key={diff}
                    className={`filter-option ${selectedDifficulty === diff ? 'selected' : ''}`}
                    onClick={() => setSelectedDifficulty(diff)}
                  >
                    {t[diff as keyof typeof t] || diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 单词表格 */}
        <div className="words-table-container">
          {filteredWords.length > 0 ? (
            <table className="words-table">
              <thead>
                <tr>
                  <th className="word-col">{t.word}</th>
                  <th className="translation-col">{t.translation}</th>
                  <th className="pos-col">{t.partOfSpeech}</th>
                  <th className="difficulty-col">{t.difficulty}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map(word => (
                  <tr key={word.id} className="word-row">
                    <td className="word-col">
                      <span className="word-dutch">{word.word}</span>
                    </td>
                    <td className="translation-col">
                      <span className="word-translation">
                        {languageMode === 'chinese' ? word.translation.chinese : word.translation.english}
                      </span>
                    </td>
                    <td className="pos-col">
                      <span className={`pos-tag pos-${word.partOfSpeech}`}>
                        {t[word.partOfSpeech as keyof typeof t] || word.partOfSpeech}
                      </span>
                    </td>
                    <td className="difficulty-col">
                      <span className={`difficulty-tag difficulty-${word.difficulty}`}>
                        {t[word.difficulty as keyof typeof t] || word.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results">
              <p>{t.noResults}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}