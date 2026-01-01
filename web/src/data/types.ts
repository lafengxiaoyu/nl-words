// 词性类型
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'interjection' | 'phrase' | 'other'

// 名词的定冠词
export type Article = 'de' | 'het'

// 熟悉程度
export type FamiliarityLevel = 'new' | 'learning' | 'familiar' | 'mastered'

// 单词难度级别（CEFR标准）
export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

// 名词信息
export interface NounInfo {
  article: Article
  singular: string
  plural: string
  uncountablePreposition?: string  // 不可数名词搭配的介词
}

// 动词变形
export interface VerbConjugation {
  infinitive: string
  isSeparable?: boolean  // 是否为可分动词
  prefix?: string  // 可分前缀
  present: {
    ik: string
    jij: string
    hij: string
    wij: string
    jullie: string
    zij: string
  }
  past: {
    singular: string
    plural: string
  }
  pastParticiple: string
}

// 形容词变形
export interface AdjectiveForms {
  base: string
  withDe: string  // 与de连用
  withHet: string // 与het连用
  comparative: string // 比较级
  superlative: string // 最高级
}

// 词性相关信息
export interface WordForms {
  noun?: NounInfo
  verb?: VerbConjugation
  adjective?: AdjectiveForms
}

// 翻译信息
export interface Translation {
  chinese: string
  english: string
}

// 例句翻译
export interface ExampleTranslations {
  chinese: string[]
  english: string[]
}

// 学习统计信息
export interface LearningStats {
  viewCount: number // 查看次数
  masteredCount: number // 标记为掌握的次数
  unmasteredCount: number // 标记为未掌握的次数
  testCount: number // 测试次数
  testCorrectCount: number // 测试做对的次数
  testWrongCount: number // 测试做错的次数
  lastViewedAt?: string // 最后查看时间
  lastTestedAt?: string // 最后测试时间
}

// 单词基础数据结构（不包含用户特定的属性）
export interface BaseWord {
  id: number
  word: string // 荷兰语单词
  translation: Translation // 中英文翻译
  partOfSpeech: PartOfSpeech // 词性
  forms?: WordForms // 词性相关的变形信息
  examples: string[] // 例句（荷兰语）
  exampleTranslations?: ExampleTranslations // 例句翻译（中英文）
  notes?: string // 备注
  difficulty: DifficultyLevel // 难度级别
}

// 用户对单词的进度信息
export interface UserWordProgress {
  wordId: number
  familiarity: FamiliarityLevel // 熟悉程度（'new' | 'learning' | 'familiar' | 'mastered'）
  stats?: LearningStats // 学习统计信息
}

// 单词与用户进度的组合（用于UI显示）
export interface WordWithProgress extends BaseWord {
  familiarity: FamiliarityLevel // 熟悉程度（'new' | 'learning' | 'familiar' | 'mastered'）
  stats?: LearningStats // 学习统计信息
}

// Word 类型作为 WordWithProgress 的别名，用于UI显示
// 注意：单词数据本身（BaseWord）不包含用户进度，用户进度存储在数据库中
export type Word = WordWithProgress

