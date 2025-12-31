import type { BaseWord, WordWithProgress } from './types'
import wordsData from './words.json'

// 导出类型
export type { Word, BaseWord, WordWithProgress, UserWordProgress } from './types'
export type { PartOfSpeech, Article, FamiliarityLevel, DifficultyLevel } from './types'

// 导出基础单词数据（不包含用户进度）
// words.json 现在只包含单词本身的属性，不包含用户进度
export const baseWords: BaseWord[] = wordsData as BaseWord[]

// 导出单词数据（用于向后兼容，但实际应该使用 baseWords + 用户进度）
// 注意：这个导出会在运行时添加默认的用户进度，但最好使用 mergeProgress 函数
export const words: WordWithProgress[] = baseWords.map(word => ({
  ...word,
  familiarity: 'new' as const,
  stats: undefined,
}))
