// 词性类型
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'interjection' | 'other'

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
}

// 动词变形
export interface VerbConjugation {
  infinitive: string
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

// 单词完整数据结构
export interface Word {
  id: number
  word: string // 荷兰语单词
  translation: Translation // 中英文翻译
  partOfSpeech: PartOfSpeech // 词性
  forms?: WordForms // 词性相关的变形信息
  examples: string[] // 例句（荷兰语）
  exampleTranslations?: string[] // 例句翻译（中文）
  notes?: string // 备注
  familiarity: FamiliarityLevel // 熟悉程度
  mastered: boolean // 是否已掌握（兼容旧数据）
  difficulty: DifficultyLevel // 难度级别
}

