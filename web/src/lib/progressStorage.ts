import { safeLocalStorage } from './safeLocalStorage'
import type { Word, UserWordProgress } from '../data/types'

/**
 * 词库版本号
 * 当词库结构或内容有重大变化时，增加此版本号
 * 用户首次加载新版本时，会清除旧缓存
 */
const VOCABULARY_VERSION = 1

/**
 * localStorage 键名
 */
const STORAGE_KEYS = {
  PROGRESS: 'nl-words-progress',
  VERSION: 'nl-words-version',
  LEGACY_WORDS: 'nl-words' // 旧版完整数据键名
} as const

/**
 * 紧凑的进度数据结构
 * 只存储用户动态数据，不包括静态词库
 */
export interface CompactProgress {
  i: number // id
  f: 'n' | 'l' | 'f' | 'm' // familiarity: new/learning/familiar/mastered
  s?: { // stats (可选，有值时才存储)
    v: number // viewCount
    m: number // masteredCount
    u: number // unmasteredCount
    t: number // testCount
    c: number // testCorrectCount
    w: number // testWrongCount
    lv?: string // lastViewedAt (ISO string)
    lt?: string // lastTestedAt (ISO string)
  }
  v: boolean // favorited
}

/**
 * 保存用户进度到 localStorage
 * 只保存进度数据，不保存完整单词
 */
export function saveProgressToStorage(progress: Map<number, UserWordProgress>): boolean {
  try {
    const compactProgress: CompactProgress[] = []

    progress.forEach((p, wordId) => {
      const item: CompactProgress = {
        i: wordId,
        f: p.familiarity.charAt(0) as CompactProgress['f'],
        v: p.favorited || false
      }

      // 只有非默认的统计数据才存储
      if (p.stats && (
        p.stats.viewCount > 0 ||
        p.stats.masteredCount > 0 ||
        p.stats.unmasteredCount > 0 ||
        p.stats.testCount > 0 ||
        p.stats.testCorrectCount > 0 ||
        p.stats.testWrongCount > 0
      )) {
        item.s = {
          v: p.stats.viewCount,
          m: p.stats.masteredCount,
          u: p.stats.unmasteredCount,
          t: p.stats.testCount,
          c: p.stats.testCorrectCount,
          w: p.stats.testWrongCount,
        }
        if (p.stats.lastViewedAt) item.s.lv = p.stats.lastViewedAt
        if (p.stats.lastTestedAt) item.s.lt = p.stats.lastTestedAt
      }

      compactProgress.push(item)
    })

    const success = safeLocalStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(compactProgress))
    safeLocalStorage.setItem(STORAGE_KEYS.VERSION, String(VOCABULARY_VERSION))

    return success
  } catch (error) {
    console.error('保存进度到 localStorage 失败:', error)
    return false
  }
}

/**
 * 从 localStorage 加载用户进度
 * 返回进度 Map
 */
export function loadProgressFromStorage(): Map<number, UserWordProgress> {
  try {
    const progressStr = safeLocalStorage.getItem(STORAGE_KEYS.PROGRESS)
    if (!progressStr) {
      return new Map()
    }

    const compactProgress: CompactProgress[] = JSON.parse(progressStr)
    const progressMap = new Map<number, UserWordProgress>()

    compactProgress.forEach(item => {
      const progress: UserWordProgress = {
        wordId: item.i,
        familiarity: item.f === 'n' ? 'new' : item.f === 'l' ? 'learning' : item.f === 'f' ? 'familiar' : 'mastered',
        favorited: item.v
      }

      if (item.s) {
        progress.stats = {
          viewCount: item.s.v,
          masteredCount: item.s.m,
          unmasteredCount: item.s.u,
          testCount: item.s.t,
          testCorrectCount: item.s.c,
          testWrongCount: item.s.w,
          lastViewedAt: item.s.lv,
          lastTestedAt: item.s.lt
        }
      }

      progressMap.set(item.i, progress)
    })

    return progressMap
  } catch (error) {
    console.error('从 localStorage 加载进度失败:', error)
    return new Map()
  }
}

/**
 * 将 Word 数组转换为进度 Map
 * 用于从旧版数据迁移
 */
function wordsToProgressMap(wordList: Word[]): Map<number, UserWordProgress> {
  const progressMap = new Map<number, UserWordProgress>()

  wordList.forEach(word => {
    // 只保存有非默认值的进度
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

  return progressMap
}

/**
 * 检查是否需要迁移旧数据
 */
export function needsMigration(): boolean {
  const legacyData = safeLocalStorage.getItem(STORAGE_KEYS.LEGACY_WORDS)
  const currentVersion = safeLocalStorage.getItem(STORAGE_KEYS.VERSION)

  // 有旧数据且版本不匹配时需要迁移
  return !!(legacyData && currentVersion !== String(VOCABULARY_VERSION))
}

/**
 * 迁移旧数据到新格式
 */
export function migrateFromLegacy(): boolean {
  try {
    const legacyData = safeLocalStorage.getItem(STORAGE_KEYS.LEGACY_WORDS)
    if (!legacyData) {
      return false
    }

    console.log('🔄 开始迁移旧版数据...')

    const oldWordList: Word[] = JSON.parse(legacyData)

    if (!Array.isArray(oldWordList)) {
      console.error('旧版数据格式错误')
      return false
    }

    // 提取进度
    const progressMap = wordsToProgressMap(oldWordList)

    // 保存新格式
    const success = saveProgressToStorage(progressMap)

    if (success) {
      console.log(`✅ 迁移成功：${progressMap.size} 个单词的进度已保存`)
      // 可选：删除旧数据以释放空间
      // safeLocalStorage.removeItem(STORAGE_KEYS.LEGACY_WORDS)
    } else {
      console.error('❌ 迁移失败')
    }

    return success
  } catch (error) {
    console.error('迁移旧数据失败:', error)
    return false
  }
}

/**
 * 检查词库版本是否匹配
 * 如果版本不匹配，清除进度缓存
 */
export function checkAndClearOnVersionMismatch(): void {
  const storedVersion = safeLocalStorage.getItem(STORAGE_KEYS.VERSION)

  if (storedVersion !== String(VOCABULARY_VERSION)) {
    console.log(`📚 词库版本更新：${storedVersion} -> ${VOCABULARY_VERSION}`)
    safeLocalStorage.removeItem(STORAGE_KEYS.PROGRESS)
    safeLocalStorage.setItem(STORAGE_KEYS.VERSION, String(VOCABULARY_VERSION))
  }
}

/**
 * 初始化进度存储
 * 检查版本并执行必要的迁移
 */
export function initializeProgressStorage(): void {
  checkAndClearOnVersionMismatch()

  if (needsMigration()) {
    migrateFromLegacy()
  }
}

/**
 * 清除所有进度数据
 */
export function clearProgressStorage(): void {
  safeLocalStorage.removeItem(STORAGE_KEYS.PROGRESS)
  safeLocalStorage.removeItem(STORAGE_KEYS.VERSION)
  // 保留旧数据以便恢复
  // safeLocalStorage.removeItem(STORAGE_KEYS.LEGACY_WORDS)
}
