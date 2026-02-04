import { safeLocalStorage } from './safeLocalStorage'
import type { Word } from '../data/types'

/**
 * 更新单个单词的进度并保存（用于兼容旧格式）
 * 用于需要从 localStorage 读取旧格式数据、更新单个词、然后保存的场景
 */
export function updateAndSaveWordProgress(
  wordId: number,
  updater: (word: Word) => Word
): Word | null {
  try {
    const localStorageData = safeLocalStorage.getItem('nl-words')

    // 如果有旧格式数据，使用旧方式（兼容性）
    if (localStorageData) {
      const localWords: Word[] = JSON.parse(localStorageData)
      const wordIndex = localWords.findIndex(w => w.id === wordId)

      if (wordIndex !== -1) {
        localWords[wordIndex] = updater(localWords[wordIndex])
        safeLocalStorage.setItem('nl-words', JSON.stringify(localWords))
        return localWords[wordIndex]
      }
    }

    return null
  } catch (error) {
    console.error('更新单词进度失败:', error)
    return null
  }
}

/**
 * 通过 ID 获取带进度的单词（用于兼容旧格式）
 */
export function getWordWithProgress(wordId: number): Word | null {
  try {
    const localStorageData = safeLocalStorage.getItem('nl-words')
    if (!localStorageData) return null

    const localWords: Word[] = JSON.parse(localStorageData)
    return localWords.find(w => w.id === wordId) || null
  } catch (error) {
    console.error('获取单词进度失败:', error)
    return null
  }
}
