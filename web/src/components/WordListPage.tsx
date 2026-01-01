import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Word } from '../data/words'
import { words } from '../data/words'

import './WordListPage.css'

interface WordListPageProps {
  languageMode: 'chinese' | 'english'
}

// 自定义下拉菜单组件
function CustomSelect({
  value,
  onChange,
  options,
  className
}: {
  value: number
  onChange: (value: number) => void
  options: number[]
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`custom-select ${className || ''}`} ref={selectRef}>
      <div
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value}</span>
        <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map(option => (
            <div
              key={option}
              className={`custom-select-option ${option === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 通用选项下拉组件（用于词性和难度选择）
function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={`custom-select option-select ${className || ''}`} ref={selectRef}>
      <div
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="option-select-label">{selectedOption?.label || value}</span>
        <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="custom-select-dropdown option-select-dropdown">
          {options.map(option => (
            <div
              key={option.value}
              className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
      noResults: '未找到匹配的单词',
      itemsPerPage: '每页显示',
      page: '页',
      of: '共',
      previous: '上一页',
      next: '下一页',
      show: '显示',
      items: '项',
      pageInfo: (current: number, total: number, start: number, end: number, totalItems: number) => 
        `第 ${current} ${total > 1 ? `页，共 ${total} 页` : '页'} (显示 ${start + 1}-${end}，共 ${totalItems} 项)`
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
      noResults: 'No matching words found',
      itemsPerPage: 'Items per page',
      page: 'Page',
      of: 'of',
      previous: 'Previous',
      next: 'Next',
      show: 'Show',
      items: 'items',
      pageInfo: (current: number, total: number, start: number, end: number, totalItems: number) => 
        `Page ${current} ${total > 1 ? `of ${total}` : ''} (showing ${start + 1}-${end} of ${totalItems} items)`
    }
  }

  const t = translations[languageMode] as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // 安全获取翻译字符串的辅助函数
  const getTranslation = (key: string): string => {
    const value = t[key]
    return typeof value === 'string' ? value : key
  }

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

  // 分页状态
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // 获取所有唯一的词性
  const allPartsOfSpeech: string[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'phrase', 'other']

  // 获取所有唯一的难度
  const allDifficulties = Array.from(new Set(words.map(w => w.difficulty))).sort()

  // 词性选项
  const partOfSpeechOptions = [
    { value: 'all', label: t.allParts },
    ...allPartsOfSpeech.map(pos => ({ value: pos, label: getTranslation(pos) }))
  ]

  // 难度选项
  const difficultyOptions = [
    { value: 'all', label: t.allDifficulties },
    ...allDifficulties.map(diff => ({ value: diff, label: getTranslation(diff) }))
  ]

  // 分页计算
  const totalPages = Math.ceil(filteredWords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredWords.length)
  const currentPageWords = filteredWords.slice(startIndex, endIndex)

  // 重置当前页当过滤条件变化时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedPartOfSpeech, selectedDifficulty, itemsPerPage])

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

          {/* 桌面端筛选按钮 */}
          <div className="filter-row desktop-filters">
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
                    {getTranslation(pos)}
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
                    {getTranslation(diff)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 移动端下拉筛选 */}
          <div className="filter-row mobile-filters">
            <div className="filter-group">
              <label className="filter-label">{t.partOfSpeech}</label>
              <OptionSelect
                value={selectedPartOfSpeech}
                onChange={setSelectedPartOfSpeech}
                options={partOfSpeechOptions}
                className="mobile-filter-select"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t.difficulty}</label>
              <OptionSelect
                value={selectedDifficulty}
                onChange={setSelectedDifficulty}
                options={difficultyOptions}
                className="mobile-filter-select"
              />
            </div>
          </div>
        </div>

        {/* 分页控制和单词表格 */}
        <div className="words-table-container">
          {/* 分页控制头部 */}
          {filteredWords.length > 0 && (
            <div className="pagination-controls-top">
              <div className="pagination-info">
                <span>{t.pageInfo(currentPage, totalPages, startIndex, endIndex, filteredWords.length)}</span>
              </div>
              <div className="items-per-page-selector">
                <label className="items-per-page-label">{t.itemsPerPage}:</label>
                <CustomSelect
                  value={itemsPerPage}
                  onChange={setItemsPerPage}
                  options={[10, 20, 50, 100, 200]}
                  className="items-per-page-custom-select"
                />
              </div>
            </div>
          )}

          {/* 单词表格 */}
          {filteredWords.length > 0 ? (
            <>
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
                  {currentPageWords.map(word => (
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
                          {getTranslation(word.partOfSpeech)}
                        </span>
                      </td>
                      <td className="difficulty-col">
                        <span className={`difficulty-tag difficulty-${word.difficulty}`}>
                          {getTranslation(word.difficulty)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 分页导航底部 */}
              {totalPages > 1 && (
                <div className="pagination-controls-bottom">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    {t.previous}
                  </button>
                  <div className="pagination-pages">
                    <span className="pagination-current">{t.page} {currentPage}</span>
                    <span className="pagination-total">{t.of} {totalPages}</span>
                  </div>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {t.next}
                  </button>
                </div>
              )}
            </>
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