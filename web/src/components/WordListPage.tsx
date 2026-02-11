import { useState, useEffect, useRef, useCallback } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Word } from '../data/words'
import { words } from '../data/words'
import type { ExampleTranslations } from '../data/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { isPremiumUser } from '../lib/subscription'
import { safeLocalStorage } from '../lib/safeLocalStorage'
import { loadUserProgress, mergeProgress, incrementViewCount } from '../lib/progressSync'
import { calculateFamiliarity } from '../lib/familiarityCalculator'
import PremiumUpgradeModal from './PremiumUpgradeModal'

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

// 锁图标组件
const LockIcon = ({ className }: { className?: string }) => {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className || "lock-svg-icon"}>
      <path
        d="M12 15V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
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
  className,
  getOptionLocked
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
  getOptionLocked?: (value: T) => boolean
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
        {selectedOption && getOptionLocked && getOptionLocked(selectedOption.value) && <LockIcon />}
        <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="custom-select-dropdown option-select-dropdown">
          {options.map(option => {
            const isLocked = getOptionLocked?.(option.value)
            return (
              <div
                key={option.value}
                className={`custom-select-option ${option.value === value ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
                {isLocked && <LockIcon />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function WordListPage({ languageMode }: WordListPageProps) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'all' | 'mistakes'>('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')

  // 处理难度选择，检查权限
  const handleDifficultySelect = (difficulty: string) => {
    // 检查是否为 Premium 内容但用户未订阅
    if ((difficulty === 'B1' || difficulty === 'B2' || difficulty === 'C1' || difficulty === 'C2') && !isPremium) {
      setShowPremiumModal(true)
      return
    }
    setSelectedDifficulty(difficulty)
  }
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [sortBy, setSortBy] = useState<'word' | 'translation' | 'partOfSpeech' | 'difficulty' | 'familiarity' | 'favorite' | 'wrongCount'>('word')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  const [favoriteMap, setFavoriteMap] = useState<Map<number, boolean>>(new Map())
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [wordsWithProgress, setWordsWithProgress] = useState<Word[]>(words)
  const [viewedWordsThisSession, setViewedWordsThisSession] = useState<Set<number>>(new Set())

  // 获取当前登录用户
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  // 加载用户进度（如果已登录）
  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        try {
          const progressMap = await loadUserProgress(user.id)
          const mergedWords = mergeProgress(words, progressMap)
          setWordsWithProgress(mergedWords)
          // 同步到 localStorage
          safeLocalStorage.setItem('nl-words', JSON.stringify(mergedWords))
        } catch (error) {
          console.error('Failed to load progress from Supabase:', error)
          // 如果云端加载失败，使用 localStorage 的数据
          const savedProgress = safeLocalStorage.getItem('nl-words')
          if (savedProgress) {
            try {
              const parsedWords = JSON.parse(savedProgress) as Word[]
              setWordsWithProgress(parsedWords)
            } catch (e) {
              console.error('Failed to parse saved progress:', e)
              setWordsWithProgress(words)
            }
          }
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
            setWordsWithProgress(words)
          }
        }
      }
    }
    loadProgress()
  }, [user])

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

  // 处理单词点击，记录查看次数
  const handleWordClick = useCallback(async (word: Word) => {
    const isSelected = selectedWord?.id === word.id

    // 如果是首次打开（不是关闭），且该单词在本会话中未被记录过
    if (!isSelected && !viewedWordsThisSession.has(word.id) && user) {
      // 记录查看次数
      const newStats = await incrementViewCount(user.id, word.id, word.stats)

      // 更新数据库
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          word_id: word.id,
          view_count: newStats.viewCount,
          last_viewed_at: newStats.lastViewedAt,
          familiarity: calculateFamiliarity(undefined, newStats),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,word_id'
        })

      if (error) {
        console.error('Failed to update view count:', error)
      } else {
        // 更新本地 state
        const updatedWords = wordsWithProgress.map(w =>
          w.id === word.id
            ? {
                ...w,
                stats: newStats,
                familiarity: calculateFamiliarity(undefined, newStats)
              }
            : w
        )
        setWordsWithProgress(updatedWords)

        // 同步到 localStorage
        safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))

        // 标记为已查看
        setViewedWordsThisSession(prev => new Set(prev).add(word.id))
      }
    }

    // 切换选中状态
    setSelectedWord(isSelected ? null : word)
  }, [selectedWord, viewedWordsThisSession, user, wordsWithProgress])

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

  const toggleFavorite = useCallback(async (wordId: number) => {
    const isFavorited = favoriteMap.get(wordId) || false
    const newFavoriteMap = new Map(favoriteMap)
    newFavoriteMap.set(wordId, !isFavorited)
    setFavoriteMap(newFavoriteMap)

    // 更新 localStorage
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem('nl-words')
      if (saved) {
        try {
          const wordsWithProgress = JSON.parse(saved) as Word[]
          const updatedWords = wordsWithProgress.map(word =>
            word.id === wordId ? { ...word, favorited: !word.favorited } : word
          )
          safeLocalStorage.setItem('nl-words', JSON.stringify(updatedWords))
        } catch (err) {
          console.error('Failed to update favorite data:', err)
        }
      }
    }

    // 如果已登录，同步到 Supabase
    if (user) {
      try {
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
        console.log('收藏状态已同步到数据库')
      } catch (error) {
        console.error('保存收藏状态失败:', error)
      }
    }
  }, [favoriteMap, user])

  const loadFavorites = useCallback(() => {
    if (typeof window === 'undefined') return
    const saved = safeLocalStorage.getItem('nl-words')
    if (!saved) return
    try {
      const wordsWithProgress = JSON.parse(saved) as Word[]
      const map = new Map<number, boolean>()
      wordsWithProgress.forEach(word => {
        if (word.favorited) {
          map.set(word.id, true)
        }
      })
      setFavoriteMap(map)
    } catch (err) {
      console.error('Failed to parse favorite data:', err)
    }
  }, [])

  useEffect(() => {
    loadFavorites()
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'nl-words') {
        loadFavorites()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [loadFavorites])

  const translations = {
    chinese: {
      title: '单词表',
      mistakesTitle: '错题本',
      backToLearn: '返回',
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
      determiner: '限定词',
      numeral: '数词',
      A1: 'A1',
      A2: 'A2',
      B1: 'B1',
      B2: 'B2',
      C1: 'C1',
      C2: 'C2',
      totalWords: (count: number) => `共 ${count} 个单词`,
      noResults: '未找到匹配的单词',
      noMistakes: '太棒了！你还没有错题记录',
      itemsPerPage: '每页显示',
      page: '页',
      of: '共',
      previous: '上一页',
      next: '下一页',
      show: '显示',
      items: '项',
      pageInfo: (current: number, total: number, start: number, end: number, totalItems: number) =>
        `第 ${current} ${total > 1 ? `页，共 ${total} 页` : '页'} (显示 ${start + 1}-${end}，共 ${totalItems} 项)`,
      viewAllWords: '全部单词',
      viewMistakes: '错题本',
      wrongCount: '错误次数'
    },
    english: {
      title: 'Word List',
      mistakesTitle: 'Mistakes',
      backToLearn: 'Back',
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
      determiner: 'Determiner',
      numeral: 'Numeral',
      A1: 'A1',
      A2: 'A2',
      B1: 'B1',
      B2: 'B2',
      C1: 'C1',
      C2: 'C2',
      totalWords: (count: number) => `Total ${count} words`,
      noResults: 'No matching words found',
      noMistakes: 'Great! You have no mistakes yet',
      itemsPerPage: 'Items per page',
      page: 'Page',
      of: 'of',
      previous: 'Previous',
      next: 'Next',
      show: 'Show',
      items: 'items',
      pageInfo: (current: number, total: number, start: number, end: number, totalItems: number) =>
        `Page ${current} ${total > 1 ? `of ${total}` : ''} (showing ${start + 1}-${end} of ${totalItems} items)`,
      viewAllWords: 'All Words',
      viewMistakes: 'Mistakes',
      wrongCount: 'Wrong Count'
    }
  }

  const t = translations[languageMode] as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // 安全获取翻译字符串的辅助函数
  const getTranslation = (key: string): string => {
    const value = t[key]
    return typeof value === 'string' ? value : key
  }

  // 获取所有唯一的词性和难度
  const otherPartsOfSpeech: string[] = ['determiner', 'numeral', 'phrase']

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

  const allPartsOfSpeech: string[] = Array.from(
    new Set(
      words.flatMap(w => {
        const pos = normalizePartOfSpeech(w.partOfSpeech)
        // 将所有包含 phrase 的词性归类为 phrase（包括 phrasal verb），将 reflexive verb 归类为 verb
        return pos.map(p => {
          if (p.includes('phrase') || p === 'phrasal verb') return 'phrase'
          if (p.includes('reflexive')) return 'verb'
          return p
        })
      })
    )
  ).sort()
  const allDifficulties: string[] = Array.from(new Set(words.map(w => w.difficulty))).sort()
  const partOfSpeechOptions = [
    { value: 'all', label: t.allParts },
    ...allPartsOfSpeech.map((pos: string) => ({ value: pos, label: getTranslation(pos) }))
  ]
  const difficultyOptions = [
    { value: 'all', label: t.allDifficulties },
    ...allDifficulties.map((diff: string) => ({ value: diff, label: getTranslation(diff) }))
  ]

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

  // 获取用于排序的词性（如果是数组，取第一个）
  const getPartOfSpeechForSort = (partOfSpeech: string | string[]): string => {
    const normalizedList = normalizePartOfSpeech(partOfSpeech)
    return normalizedList[0]
  }

  // 过滤单词
  const filteredWords = wordsWithProgress.filter(word => {
    // 错题本模式：只显示有错误记录且未掌握的单词
    if (viewMode === 'mistakes') {
      const wrongCount = word.stats?.testWrongCount || 0
      const masteredAt = word.stats?.masteredAt
      if (wrongCount === 0) return false
      if (masteredAt) return false // 已掌握的不显示
    }

    // 搜索过滤
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      word.word.toLowerCase().includes(searchLower) ||
      word.translation.chinese.toLowerCase().includes(searchLower) ||
      word.translation.english.toLowerCase().includes(searchLower)

    // 词性过滤
    const normalizedWordPOS = normalizePartOfSpeech(word.partOfSpeech)
    const matchesPartOfSpeech =
      selectedPartOfSpeech === 'all' ||
      (selectedPartOfSpeech === 'other' &&
        normalizedWordPOS.some((pos: string) => {
          // 将所有包含 phrase 的词性归类为 phrase（包括 phrasal verb），将 reflexive verb 归类为 verb
          let normalizedPos = pos.includes('phrase') || pos === 'phrasal verb' ? 'phrase' : pos
          normalizedPos = normalizedPos.includes('reflexive') ? 'verb' : normalizedPos
          return otherPartsOfSpeech.includes(normalizedPos)
        })) ||
      normalizedWordPOS.some(pos => {
        let normalizedPos = pos.includes('phrase') || pos === 'phrasal verb' ? 'phrase' : pos
        normalizedPos = normalizedPos.includes('reflexive') ? 'verb' : normalizedPos
        return normalizedPos === selectedPartOfSpeech
      })

    // 难度过滤（考虑订阅状态）
    const matchesDifficulty = (() => {
      if (selectedDifficulty === 'all') {
        // 免费用户只显示 A1-A2，付费用户显示全部
        if (!isPremium) {
          return word.difficulty === 'A1' || word.difficulty === 'A2'
        }
        return true
      } else {
        // 单独的难度级别筛选
        return word.difficulty === selectedDifficulty
      }
    })()

    return matchesSearch && matchesPartOfSpeech && matchesDifficulty
  }).sort((a, b) => {
    // 错题本模式：高频错题置顶（错误次数 >= 3）
    if (viewMode === 'mistakes') {
      const aWrongCount = a.stats?.testWrongCount || 0
      const bWrongCount = b.stats?.testWrongCount || 0
      const aIsHighFreq = aWrongCount >= 3
      const bIsHighFreq = bWrongCount >= 3

      // 高频错题优先
      if (aIsHighFreq && !bIsHighFreq) return -1
      if (!aIsHighFreq && bIsHighFreq) return 1
    }

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
        comparison = getPartOfSpeechForSort(a.partOfSpeech).localeCompare(getPartOfSpeechForSort(b.partOfSpeech))
        break
      case 'difficulty':
        comparison = a.difficulty.localeCompare(b.difficulty)
        break
      case 'favorite': {
        const aFav = favoriteMap.get(a.id) || false
        const bFav = favoriteMap.get(b.id) || false
        comparison = aFav === bFav ? 0 : (aFav ? -1 : 1)
        break
      }
      case 'familiarity': {
        const familiarityOrder = { new: 0, learning: 1, familiar: 2, mastered: 3 }
        const aFam = familiarityOrder[a.familiarity || 'new'] ?? 0
        const bFam = familiarityOrder[b.familiarity || 'new'] ?? 0
        comparison = aFam - bFam
        break
      }
      case 'wrongCount': {
        const aWrong = a.stats?.testWrongCount || 0
        const bWrong = b.stats?.testWrongCount || 0
        comparison = aWrong - bWrong
        break
      }
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // 分页状态
  const totalPages = Math.ceil(filteredWords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredWords.length)
  const currentPageWords = filteredWords.slice(startIndex, endIndex)

  // 重置当前页当过滤条件变化时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedPartOfSpeech, selectedDifficulty, itemsPerPage, viewMode])

  // 切换视图时重置排序
  useEffect(() => {
    if (viewMode === 'mistakes' && sortBy === 'favorite') {
      setSortBy('wrongCount')
      setSortOrder('desc')
    }
  }, [viewMode, sortBy])

  return (
    <div className="word-list-page">
      <div className="word-list-container">
        <div className="page-header">
          <button className="back-btn icon-btn" onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}`)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            <span className="btn-text">{t.backToLearn}</span>
          </button>
          
          <div className="header-center">
            <h1>{viewMode === 'mistakes' ? t.mistakesTitle : t.title}</h1>
            <p className="word-count">{t.totalWords(filteredWords.length)}</p>
          </div>
          
          <div className="header-right">
            <button
              className="lang-toggle-btn icon-btn"
              onClick={() => navigate(`/${languageMode === 'chinese' ? 'en' : 'zh'}/wordlist`)}
              aria-label={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
              title={languageMode === 'chinese' ? 'Switch to English' : '切换到中文'}
            >
              <GlobeIcon />
              <span className="lang-text">{languageMode === 'chinese' ? 'EN' : '中'}</span>
            </button>

            {/* 移动端汉堡菜单按钮 */}
            <button
              className="mobile-menu-btn icon-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={languageMode === 'chinese' ? '菜单' : 'Menu'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* 桌面端视图切换按钮 */}
            <div className="view-toggle-buttons desktop-only">
              <button
                className={`view-toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
                title={t.viewAllWords}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span className="btn-text">{t.viewAllWords}</span>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'mistakes' ? 'active' : ''}`}
                onClick={() => setViewMode('mistakes')}
                title={t.viewMistakes}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="btn-text">{t.viewMistakes}</span>
              </button>
            </div>

            {/* 错题专属测试按钮 */}
            {viewMode === 'mistakes' && filteredWords.length > 0 && (
              <button
                className="mistake-test-btn icon-btn"
                onClick={() => navigate(`/${languageMode === 'chinese' ? 'zh' : 'en'}/test?mistakesOnly=true`)}
                title={languageMode === 'chinese' ? '只测试错题' : 'Test only mistakes'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                <span className="btn-text">{languageMode === 'chinese' ? '测试' : 'Test'}</span>
              </button>
            )}
          </div>

          {/* 移动端汉堡菜单 */}
          {mobileMenuOpen && (
            <div className="mobile-menu-overlay">
              <div className="mobile-menu-content">
                <button
                  className={`mobile-menu-item ${viewMode === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('all')
                    setMobileMenuOpen(false)
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <span>{t.viewAllWords}</span>
                </button>
                <button
                  className={`mobile-menu-item ${viewMode === 'mistakes' ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('mistakes')
                    setMobileMenuOpen(false)
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>{t.viewMistakes}</span>
                </button>
              </div>
            </div>
          )}
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
                {allPartsOfSpeech.map((pos: string) => (
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
                  onClick={() => handleDifficultySelect('all')}
                >
                  {t.allDifficulties}
                </button>
                {allDifficulties.map((diff: string) => {
                  const isLocked = (diff === 'B1' || diff === 'B2' || diff === 'C1' || diff === 'C2') && !isPremium
                  return (
                    <button
                      key={diff}
                      className={`filter-option ${isLocked ? 'locked' : ''} ${selectedDifficulty === diff ? 'selected' : ''}`}
                      onClick={() => handleDifficultySelect(diff)}
                      title={isLocked ? '需要 Premium 才能访问' : ''}
                    >
                      {getTranslation(diff)}
                      {isLocked && <LockIcon className="lock-svg-icon" />}
                    </button>
                  )
                })}
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
                onChange={handleDifficultySelect}
                options={difficultyOptions}
                className="mobile-filter-select"
                getOptionLocked={(diff) => (diff === 'B1' || diff === 'B2' || diff === 'C1' || diff === 'C2') && !isPremium}
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
                    <th
                      className={`familiarity-col sortable ${sortBy === 'familiarity' ? 'active' : ''}`}
                      onClick={() => {
                        if (sortBy === 'familiarity') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('familiarity')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      {languageMode === 'chinese' ? '熟悉度' : 'Level'}
                      {sortBy === 'familiarity' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th
                      className={`favorite-col sortable ${sortBy === 'favorite' ? 'active' : ''}`}
                      onClick={() => {
                        if (sortBy === 'favorite') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortBy('favorite')
                          setSortOrder('desc')
                        }
                      }}
                    >
                      {languageMode === 'chinese' ? '收藏' : 'Favorite'}
                      {sortBy === 'favorite' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    {viewMode === 'mistakes' && (
                      <>
                        <th
                          className={`wrong-count-col sortable ${sortBy === 'wrongCount' ? 'active' : ''}`}
                          onClick={() => {
                            if (sortBy === 'wrongCount') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setSortBy('wrongCount')
                              setSortOrder('desc')
                            }
                          }}
                        >
                          {t.wrongCount}
                          {sortBy === 'wrongCount' && (
                            <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th className="consecutive-correct-col">
                          {languageMode === 'chinese' ? '连续答对' : 'Streak'}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentPageWords.map(word => {
                    const isFavorited = favoriteMap.get(word.id) || false
                    return (
                    <tr
                      key={word.id}
                      className={`word-row ${selectedWord?.id === word.id ? 'word-row--selected' : ''}`}
                      onClick={() => handleWordClick(word)}
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
                        {(() => {
                          const normalizedPosList = normalizePartOfSpeech(word.partOfSpeech)
                          return normalizedPosList.map((pos, idx) => {
                            // 将所有包含 phrase 的词性归类为 phrase（包括 phrasal verb），将 reflexive verb 归类为 verb
                            let normalizedPos = pos.includes('phrase') || pos === 'phrasal verb' ? 'phrase' : pos
                            normalizedPos = normalizedPos.includes('reflexive') ? 'verb' : normalizedPos
                            return (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span className="pos-separator"> </span>}
                                <span className={`pos-tag pos-${normalizedPos}`}>
                                  {getTranslation(normalizedPos)}
                                </span>
                              </React.Fragment>
                            )
                          })
                        })()}
                      </td>
                      <td className="difficulty-col">
                        <span className={`difficulty-tag difficulty-${word.difficulty}`}>
                          {getTranslation(word.difficulty)}
                        </span>
                      </td>
                      <td className="familiarity-col">
                        <span className={`familiarity-badge familiarity-${word.familiarity || 'new'}`}>
                          {word.familiarity === 'new' && (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4M12 16h.01"/>
                              </svg>
                              {languageMode === 'chinese' ? '新' : 'New'}
                            </>
                          )}
                          {word.familiarity === 'learning' && (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3 3H2z"/>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3 3h7z"/>
                              </svg>
                              {languageMode === 'chinese' ? '学习' : 'Learn'}
                            </>
                          )}
                          {word.familiarity === 'familiar' && (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              {languageMode === 'chinese' ? '熟悉' : 'Fam'}
                            </>
                          )}
                          {word.familiarity === 'mastered' && (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                                <circle cx="12" cy="12" r="4"/>
                              </svg>
                              {languageMode === 'chinese' ? '掌握' : 'Mstr'}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="favorite-col">
                        <button
                          className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
                          title={isFavorited ? (languageMode === 'chinese' ? '取消收藏' : 'Remove from favorites') : (languageMode === 'chinese' ? '添加收藏' : 'Add to favorites')}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(word.id)
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', padding: '8px' }}
                        >
                          {isFavorited ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3,16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3,16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                          )}
                        </button>
                      </td>
                      {viewMode === 'mistakes' && (
                        <>
                          <td className="wrong-count-col">
                            <span className="wrong-count-badge">{word.stats?.testWrongCount || 0}</span>
                            {(word.stats?.testWrongCount || 0) >= 3 && (
                              <span className="high-frequency-badge" title={languageMode === 'chinese' ? '高频错题' : 'High frequency mistake'}>
                                🔥
                              </span>
                            )}
                          </td>
                          <td className="consecutive-correct-col">
                            {word.stats?.consecutiveCorrectCount ? (
                              <span className="consecutive-correct-badge">
                                {word.stats.consecutiveCorrectCount}/3
                              </span>
                            ) : (
                              <span className="consecutive-correct-badge zero">
                                0/3
                              </span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* 错题本说明 */}
              {viewMode === 'mistakes' && (
                <div className="mistakes-info-panel">
                  <h3>{languageMode === 'chinese' ? '错题本说明' : 'Mistakes Notebook Guide'}</h3>
                  <ul>
                    <li>
                      <strong>{languageMode === 'chinese' ? '高频错题' : 'High Frequency'}</strong>:
                      {languageMode === 'chinese' ? ' 错误次数 ≥3 的单词会自动置顶，用🔥标记' : ' Words with ≥3 errors are automatically pinned with 🔥'}
                    </li>
                    <li>
                      <strong>{languageMode === 'chinese' ? '连续答对' : 'Consecutive Correct'}</strong>:
                      {languageMode === 'chinese' ? ' 连续答对 3 次后，单词会自动从错题本移除（已掌握）' : ' After 3 consecutive correct answers, the word will be removed from mistakes (mastered)'}
                    </li>
                    <li>
                      <strong>{languageMode === 'chinese' ? '错题专属测试' : 'Mistakes Test'}</strong>:
                      {languageMode === 'chinese' ? ' 点击"错题测试"按钮，只针对错题进行复习' : ' Click "Test Mistakes" to review only your mistakes'}
                    </li>
                  </ul>
                </div>
              )}

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
                  <div className="pagination-page-picker">
                    <input
                      type="range"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      className="pagination-range-slider"
                    />
                    <div className="pagination-page-display">
                      <span className="pagination-current">{currentPage}</span>
                      <span className="pagination-divider">/</span>
                      <span className="pagination-total">{totalPages}</span>
                    </div>
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
              <p>{viewMode === 'mistakes' ? t.noMistakes : t.noResults}</p>
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
            <div className="detail-item">
              <strong>{detailsPanel.partOfSpeech}：</strong>
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
              <strong>{detailsPanel.difficulty}：</strong>
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
      {/* Premium 升级弹窗 */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => {
          setShowPremiumModal(false)
        }}
        languageMode={languageMode}
      />
    </div>
  )
}










