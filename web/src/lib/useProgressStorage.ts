import { useCallback } from 'react'
import type { Word, UserWordProgress } from '../data/types'
import { saveProgressToStorage } from './progressStorage'

/**
 * React Hook: 管理本地进度存储
 *
 * 使用方式：
 * const { saveProgress } = useProgressStorage(wordList)
 * saveProgress()
 */
export function useProgressStorage(wordList: Word[]) {
  /**
   * 保存当前 wordList 的进度到 localStorage
   * 只保存有变化的进度数据（熟悉度非 new、已收藏、或统计有值）
   */
  const saveProgress = useCallback(() => {
    const progressMap = new Map<number, UserWordProgress>()

    wordList.forEach(word => {
      if (word.familiarity !== 'new' || word.favorited || (word.stats && (
        word.stats.viewCount > 0 ||
        word.stats.masteredCount > 0 ||
        word.stats.unmasteredCount > 0 ||
        word.stats.testCount > 0
      ))) {
        progressMap.set(word.id, {
          wordId: word.id,
          familiarity: word.familiarity,
          stats: word.stats,
          favorited: word.favorited || false
        })
      }
    })

    saveProgressToStorage(progressMap)
  }, [wordList])

  return { saveProgress }
}
