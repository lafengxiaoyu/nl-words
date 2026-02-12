/**
 * 智能复习算法 - 基于艾宾浩斯遗忘曲线
 * 
 * 算法原理：
 * 1. 根据单词的熟悉程度和测试记录，计算下次复习时间
 * 2. 新词 -> 学习中 -> 熟悉 -> 已掌握，复习间隔逐渐增加
 * 3. 答错会重置复习间隔
 * 4. 连续答对会延长复习间隔
 */

import type { LearningStats, FamiliarityLevel } from '../data/types'

// 复习间隔（单位：小时）
const REVIEW_INTERVALS = {
  new: [1, 4, 24],           // 新词：1小时、4小时、24小时后复习
  learning: [24, 72, 168],   // 学习中：1天、3天、7天后复习
  familiar: [168, 336, 720], // 熟悉：7天、14天、30天后复习
  mastered: [720, 1440, 2880] // 已掌握：30天、60天、120天后复习
}

// 计算复习优先级（越高越需要复习）
export function calculateReviewPriority(
  familiarity: FamiliarityLevel,
  stats?: LearningStats,
  baselineTime?: number
): number {
  const now = baselineTime ?? Date.now()
  const lastTestedAt = stats?.lastTestedAt ? new Date(stats.lastTestedAt).getTime() : 0
  const lastViewedAt = stats?.lastViewedAt ? new Date(stats.lastViewedAt).getTime() : 0

  // 使用最近一次活动时间
  const lastActivityTime = Math.max(lastTestedAt, lastViewedAt)

  // 如果没有任何活动记录，最高优先级
  if (lastActivityTime === 0) {
    return 100
  }

  const hoursSinceActivity = (now - lastActivityTime) / (1000 * 60 * 60)

  // 计算当前复习阶段
  const testCount = stats?.testCount || 0
  const consecutiveCorrect = stats?.consecutiveCorrectCount || 0
  const reviewStage = Math.min(testCount, 2) // 0, 1, 2 三个阶段

  // 获取当前阶段的复习间隔
  const interval = REVIEW_INTERVALS[familiarity]?.[reviewStage] || 24

  // 计算复习优先级
  const overdueRatio = hoursSinceActivity / interval

  if (overdueRatio >= 1) {
    // 已过期，优先级根据过期程度递增
    return Math.min(90 + Math.floor((overdueRatio - 1) * 10), 100)
  } else if (overdueRatio >= 0.8) {
    // 即将过期（80%以上），高优先级
    return 70 + Math.floor(overdueRatio * 25)
  } else if (overdueRatio >= 0.5) {
    // 过半，中等优先级
    return 50 + Math.floor(overdueRatio * 40)
  } else {
    // 优先级较低
    return Math.floor(overdueRatio * 100)
  }
}

// 计算下次复习时间（返回时间戳）
export function calculateNextReviewTime(
  familiarity: FamiliarityLevel,
  stats?: LearningStats,
  baselineTime?: number
): number {
  const now = baselineTime ?? Date.now()
  const lastTestedAt = stats?.lastTestedAt ? new Date(stats.lastTestedAt).getTime() : 0
  const lastViewedAt = stats?.lastViewedAt ? new Date(stats.lastViewedAt).getTime() : 0

  // 使用最近一次活动时间
  const lastActivityTime = Math.max(lastTestedAt, lastViewedAt)

  // 如果没有任何活动记录，返回当前时间（需要立即复习）
  if (lastActivityTime === 0) {
    return now
  }

  // 计算当前复习阶段
  const testCount = stats?.testCount || 0
  const consecutiveCorrect = stats?.consecutiveCorrectCount || 0
  const reviewStage = Math.min(testCount, 2) // 0, 1, 2 三个阶段

  // 答错后重置到第一阶段
  const hasRecentMistake = stats?.lastMistakeAt && stats.testWrongCount > 0
  const actualStage = hasRecentMistake ? 0 : reviewStage

  // 获取当前阶段的复习间隔（小时）
  const intervalHours = REVIEW_INTERVALS[familiarity]?.[actualStage] || 24

  // 计算下次复习时间
  return lastActivityTime + (intervalHours * 60 * 60 * 1000)
}

// 判断单词是否需要复习
export function needsReview(familiarity: FamiliarityLevel, stats?: LearningStats): boolean {
  const now = Date.now()
  const nextReviewTime = calculateNextReviewTime(familiarity, stats)
  return now >= nextReviewTime
}

// 获取需要复习的单词列表（按优先级排序）
export interface ReviewWord {
  id: number
  priority: number
  nextReviewTime: number
  daysUntilReview: number
}

export function getReviewWords(
  words: Array<{ id: number; familiarity: FamiliarityLevel; stats?: LearningStats }>,
  limit?: number,
  baselineTime?: number
): ReviewWord[] {
  const now = baselineTime ?? Date.now()

  // 计算每个单词的复习优先级
  const reviewWords = words
    .map(word => {
      const nextReviewTime = calculateNextReviewTime(word.familiarity, word.stats, now)
      return {
        id: word.id,
        priority: calculateReviewPriority(word.familiarity, word.stats, now),
        nextReviewTime,
        daysUntilReview: (nextReviewTime - now) / (1000 * 60 * 60 * 24)
      }
    })
    // 按优先级排序（高到低）
    .sort((a, b) => b.priority - a.priority)

  // 如果指定了限制，返回前N个
  if (limit && limit > 0) {
    return reviewWords.slice(0, limit)
  }

  return reviewWords
}

// 获取复习状态描述
export function getReviewStatusText(
  familiarity: FamiliarityLevel,
  stats?: LearningStats,
  language: 'chinese' | 'english' = 'chinese'
): string {
  const now = Date.now()
  const nextReviewTime = calculateNextReviewTime(familiarity, stats)
  const hoursUntilReview = (nextReviewTime - now) / (1000 * 60 * 60)
  
  if (hoursUntilReview <= 0) {
    return language === 'chinese' ? '🔥 需要复习' : '🔥 Review Now'
  } else if (hoursUntilReview < 24) {
    const hours = Math.floor(hoursUntilReview)
    return language === 'chinese' ? `${hours}小时后复习` : `Review in ${hours}h`
  } else if (hoursUntilReview < 48) {
    return language === 'chinese' ? '明天复习' : 'Review tomorrow'
  } else {
    const days = Math.floor(hoursUntilReview / 24)
    if (days < 7) {
      return language === 'chinese' ? `${days}天后复习` : `Review in ${days}d`
    } else {
      const weeks = Math.floor(days / 7)
      return language === 'chinese' ? `${weeks}周后复习` : `Review in ${weeks}w`
    }
  }
}

// 获取复习进度统计
export interface ReviewStats {
  urgentReview: number      // 紧急需要复习（已过期）
  dueSoon: number          // 即将到期（24小时内）
  upcoming: number         // 即将到期（1周内）
  future: number           // 未来复习
  totalWords: number
}

export function getReviewStats(
  words: Array<{ familiarity: FamiliarityLevel; stats?: LearningStats }>,
  baselineTime?: number
): ReviewStats {
  const now = baselineTime ?? Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  const oneWeekMs = 7 * oneDayMs

  let urgentReview = 0
  let dueSoon = 0
  let upcoming = 0
  let future = 0

  words.forEach(word => {
    const nextReviewTime = calculateNextReviewTime(word.familiarity, word.stats, now)
    const timeDiff = nextReviewTime - now

    if (timeDiff <= 0) {
      urgentReview++
    } else if (timeDiff <= oneDayMs) {
      dueSoon++
    } else if (timeDiff <= oneWeekMs) {
      upcoming++
    } else {
      future++
    }
  })

  return {
    urgentReview,
    dueSoon,
    upcoming,
    future,
    totalWords: words.length
  }
}
