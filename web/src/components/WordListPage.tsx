import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Word } from '../data/words'
import { words } from '../data/words'
import type { ExampleTranslations } from '../data/types'

import './WordListPage.css'

interface WordListPageProps {
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
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [sortBy, setSortBy] = useState<'word' | 'translation' | 'partOfSpeech' | 'difficulty'>('word')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')



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

  const detailsPanel = {
    title: languageMode === 'chinese' ? '单词详情' : 'Word Details',
    dutch: languageMode === 'chinese' ? '荷兰语' : 'Dutch',
    chinese: languageMode === 'chinese' ? '中文' : 'Chinese',
    english: languageMode === 'chinese' ? '英文' : 'English',
    partOfSpeech: languageMode === 'chinese' ? '词性' : 'Part of Speech',
    difficulty: languageMode === 'chinese' ? '难度' : 'Difficulty',
    details: languageMode === 'chinese' ? '详情' : 'Details',
    article: languageMode === 'chinese' ? '冠词' : 'Article',
    singular: languageMode === 'chinese' ? '单数' : 'Singular',
    plural: languageMode === 'chinese' ? '复数' : 'Plural',
    separable: languageMode === 'chinese' ? '可分动词' : 'Separable',
    inseparable: languageMode === 'chinese' ? '不可分动词' : 'Inseparable',
    prefix: languageMode === 'chinese' ? '前缀' : 'Prefix',
    conjugation: languageMode === 'chinese' ? '变位' : 'Conjugation',
    base: languageMode === 'chinese' ? '原形' : 'Base',
    withDe: languageMode === 'chinese' ? '与de连用' : 'With de',
    withHet: languageMode === 'chinese' ? '与het连用' : 'With het',
    comparative: languageMode === 'chinese' ? '比较级' : 'Comparative',
    superlative: languageMode === 'chinese' ? '最高级' : 'Superlative',
    uncountablePreposition: languageMode === 'chinese' ? '搭配介词' : 'Preposition',
    pastParticiple: languageMode === 'chinese' ? '过去分词' : 'Past Participle',
    pastParticipleAuxiliary: languageMode === 'chinese' ? '辅助动词' : 'Auxiliary',
    examples: languageMode === 'chinese' ? '例句' : 'Examples',
    notes: languageMode === 'chinese' ? '备注' : 'Notes'
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
  }).sort((a, b) => {
    // 排序逻辑
    let comparison = 0
    switch (sortBy) {
      case 'word':
        comparison = a.word.localeCompare(b.word)
        break
      case 'translation':
        comparison = a.translation[languageMode].localeCompare(b.translation[languageMode])
        break
      case 'partOfSpeech':
        comparison = a.partOfSpeech.localeCompare(b.partOfSpeech)
        break
      case 'difficulty':
        comparison = a.difficulty.localeCompare(b.difficulty)
        break
    }
    return sortOrder === 'asc' ? comparison : -comparison
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
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
            {t.backToLearn}
          </button>
          <button
            className="lang-toggle-btn"
            onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/wordlist`)}
            aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
          >
            <GlobeIcon />
            <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中文'}</span>
          </button>
        </div>

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
                    <th
                      className={`word-col sortable ${sortBy === 'word' ? 'active' : ''}`}
                      onClick={() => {
                        if (sortBy === 'word') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('word')
                          setSortOrder('asc')
                        }
                      }}
                    >
                      {t.word}
                      {sortBy === 'word' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className={`translation-col sortable ${sortBy === 'translation' ? 'active' : ''}`}
                      onClick={() => {
                        if (sortBy === 'translation') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('translation')
                          setSortOrder('asc')
                        }
                      }}
                    >
                      {t.translation}
                      {sortBy === 'translation' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className={`pos-col sortable ${sortBy === 'partOfSpeech' ? 'active' : ''}`}
                      onClick={() => {
                        if (sortBy === 'partOfSpeech') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('partOfSpeech')
                          setSortOrder('asc')
                        }
                      }}
                    >
                      {t.partOfSpeech}
                      {sortBy === 'partOfSpeech' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className={`difficulty-col sortable ${sortBy === 'difficulty' ? 'active' : ''}`}
                      onClick={() => {
                        if (sortBy === 'difficulty') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('difficulty')
                          setSortOrder('asc')
                        }
                      }}
                    >
                      {t.difficulty}
                      {sortBy === 'difficulty' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageWords.map(word => (
                    <tr
                      key={word.id}
                      className={`word-row ${selectedWord?.id === word.id ? 'word-row--selected' : ''}`}
                      onClick={() => setSelectedWord(selectedWord?.id === word.id ? null : word)}
                    >
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

      {/* 单词详情面板 */}
      {selectedWord && (
        <div className="word-details-overlay" onClick={() => setSelectedWord(null)}>
          <div className="word-details-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{detailsPanel.title}</h3>
            <button className="close-details-btn" onClick={() => setSelectedWord(null)}>×</button>

            <div className="detail-item"><strong>{detailsPanel.dutch}：</strong> <span>{selectedWord.word}</span></div>
            <div className="detail-item"><strong>{detailsPanel.chinese}：</strong> {selectedWord.translation.chinese}</div>
            <div className="detail-item"><strong>{detailsPanel.english}：</strong> <span>{selectedWord.translation.english}</span></div>
            <div className="detail-item"><strong>{detailsPanel.partOfSpeech}：</strong> <span>{getTranslation(selectedWord.partOfSpeech)}</span></div>
            <div className="detail-item">
              <strong>{detailsPanel.difficulty}：</strong>
              <span className={`difficulty-tag difficulty--${selectedWord.difficulty}`}>{selectedWord.difficulty}</span>
            </div>

            {/* 名词信息 */}
            {selectedWord.partOfSpeech === 'noun' && selectedWord.forms?.noun && (
              <div className="detail-item noun-info">
                <strong>{detailsPanel.partOfSpeech} {detailsPanel.details}：</strong>
                <div className="noun-details">
                  <div><strong>{detailsPanel.article}：</strong> <span className={`article-badge article--${selectedWord.forms.noun.article}`}>{selectedWord.forms.noun.article}</span></div>
                  <div><strong>{detailsPanel.singular}：</strong> <span>{selectedWord.forms.noun.singular}</span></div>
                  <div><strong>{detailsPanel.plural}：</strong> <span>{selectedWord.forms.noun.plural}</span></div>
                  {selectedWord.forms.noun.uncountablePreposition && (
                    <div><strong>{detailsPanel.uncountablePreposition}：</strong> <span>{selectedWord.forms.noun.uncountablePreposition}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* 动词信息 */}
            {selectedWord.partOfSpeech === 'verb' && selectedWord.forms?.verb && (
              <div className="detail-item verb-info">
                <strong>{detailsPanel.partOfSpeech} {detailsPanel.details}：</strong>
                <div className="verb-details">
                  {selectedWord.forms.verb.isSeparable !== undefined && (
                    <div>
                      <strong>{selectedWord.forms.verb.isSeparable ? detailsPanel.separable : detailsPanel.inseparable}</strong>
                      {selectedWord.forms.verb.prefix && <span> ({detailsPanel.prefix}: <span>{selectedWord.forms.verb.prefix}</span>)</span>}
                    </div>
                  )}
                  <div><strong>{detailsPanel.conjugation} ({detailsPanel.partOfSpeech})：</strong></div>
                  <div className="conjugation-table">
                    <div className="conjugation-section">
                      <strong>{languageMode === 'chinese' ? '现在时' : 'Present'}:</strong>
                      <div className="conjugation-row">ik: <span>{selectedWord.forms.verb.present.ik}</span></div>
                      <div className="conjugation-row">jij: <span>{selectedWord.forms.verb.present.jij}</span></div>
                      <div className="conjugation-row">hij/zij: <span>{selectedWord.forms.verb.present.hij}</span></div>
                      <div className="conjugation-row">wij: <span>{selectedWord.forms.verb.present.wij}</span></div>
                      <div className="conjugation-row">jullie: <span>{selectedWord.forms.verb.present.jullie}</span></div>
                      <div className="conjugation-row">zij: <span>{selectedWord.forms.verb.present.zij}</span></div>
                    </div>
                    <div className="conjugation-section">
                      <strong>{languageMode === 'chinese' ? '过去时' : 'Past'}:</strong>
                      <div className="conjugation-row">{languageMode === 'chinese' ? '单数' : 'Singular'}: <span>{selectedWord.forms.verb.past.singular}</span></div>
                      <div className="conjugation-row">{languageMode === 'chinese' ? '复数' : 'Plural'}: <span>{selectedWord.forms.verb.past.plural}</span></div>
                    </div>
                    <div className="conjugation-section">
                      <strong>{languageMode === 'chinese' ? '过去分词' : 'Past Participle'}:</strong>
                      <div className="conjugation-row single-line">
                        <span>{selectedWord.forms.verb.pastParticiple}{selectedWord.forms.verb.pastParticipleAuxiliary ? ` (${selectedWord.forms.verb.pastParticipleAuxiliary})` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 形容词信息 */}
            {selectedWord.partOfSpeech === 'adjective' && selectedWord.forms?.adjective && (
              <div className="detail-item adjective-info">
                <strong>{detailsPanel.partOfSpeech} {detailsPanel.details}：</strong>
                <div className="adjective-details">
                  <div><strong>{detailsPanel.base}：</strong> <span>{selectedWord.forms.adjective.base}</span></div>
                  <div><strong>{detailsPanel.withDe}：</strong> <span>{selectedWord.forms.adjective.withDe}</span></div>
                  <div><strong>{detailsPanel.withHet}：</strong> <span>{selectedWord.forms.adjective.withHet}</span></div>
                  <div><strong>{detailsPanel.comparative}：</strong> <span>{selectedWord.forms.adjective.comparative}</span></div>
                  <div><strong>{detailsPanel.superlative}：</strong> <span>{selectedWord.forms.adjective.superlative}</span></div>
                </div>
              </div>
            )}

            {/* 例句 */}
            {selectedWord.examples && selectedWord.examples.length > 0 && (
              <div className="detail-item">
                <strong>{detailsPanel.examples}：</strong>
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
                <strong>{detailsPanel.notes}：</strong> <span>{selectedWord.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}