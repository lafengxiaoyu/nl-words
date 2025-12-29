import type { Word } from './types'
import wordsData from './words.json'

// 导出类型
export type { Word } from './types'
export type { PartOfSpeech, Article, FamiliarityLevel, DifficultyLevel } from './types'

// 导出单词数据
export const words: Word[] = wordsData as Word[]
