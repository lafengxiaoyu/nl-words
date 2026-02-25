import type { LearningStats, FamiliarityLevel } from '../data/types'

/**
 * 熟悉程度计算器 - 直观版本
 *
 * 设计原则：
 * 1. 用户的滑动操作是明确的意图，应该直接反映到熟悉度
 * 2. 向右滑动 = mastered（已掌握），向左滑动 = learning（学习中）
 * 3. 测试功能用于自动升级/降级，提供更精细的熟悉度调整
 * 4. 熟悉度保持四个级别：new（新词）、learning（学习中）、familiar（熟悉）、mastered（已掌握）
 */

/**
 * 根据用户操作和统计信息返回熟悉程度
 *
 * 级别划分标准：
 * - new: 0分（无任何学习活动）
 * - learning: 用户明确标记为学习中，或测试表现不佳
 * - familiar: 自动升级状态，介于学习和掌握之间
 * - mastered: 用户明确标记为已掌握，或测试表现优异
 *
 * @param userFamiliarity - 用户手动标记的熟悉程度（滑动操作）
 * @param stats - 学习统计数据
 */
export function calculateFamiliarity(
  userFamiliarity?: FamiliarityLevel,
  stats?: LearningStats
): FamiliarityLevel {
  // 如果没有任何学习活动，标记为 new
  if (!stats || (stats.viewCount === 0 && stats.testCount === 0 && stats.masteredCount === 0 && stats.unmasteredCount === 0)) {
    return 'new'
  }

  // 优先使用用户的明确标记（滑动操作）
  if (userFamiliarity === 'mastered' || userFamiliarity === 'learning' || userFamiliarity === 'familiar') {
    // 用户通过滑动明确标记了熟悉度，直接使用
    return userFamiliarity
  }

  // 如果用户标记为 new，但有新的学习活动（如查看），则允许自动升级
  if (userFamiliarity === 'new') {
    // 检查是否有新的学习活动（viewCount > 0）
    if (!stats || stats.viewCount === 0) {
      return 'new'
    }
    // 有学习活动，继续下面的自动判断逻辑，不强制返回 new
  }

  // 没有用户明确标记时，根据统计信息自动判断
  const hasTestRecords = stats.testCount > 0

  if (hasTestRecords) {
    const accuracy = stats.testCorrectCount / stats.testCount

    // 测试正确率 >= 85% 且测试次数 >= 3，自动标记为已掌握
    if (accuracy >= 0.85 && stats.testCount >= 3) {
      return 'mastered'
    }

    // 测试正确率 >= 70%，自动标记为熟悉
    if (accuracy >= 0.7 && stats.testCount >= 2) {
      return 'familiar'
    }

    // 测试正确率 >= 50%，标记为学习中
    if (accuracy >= 0.5) {
      return 'learning'
    }

    // 测试正确率 < 50%，保持在学习中
    return 'learning'
  }

  // 没有测试记录，根据查看次数判断
  if (stats.viewCount >= 5) {
    // 查看过5次以上，标记为熟悉
    return 'familiar'
  }

  if (stats.viewCount >= 3) {
    // 查看过3次以上，标记为学习中
    return 'learning'
  }

  // 其他情况标记为学习中
  return 'learning'
}

/**
 * 计算熟悉程度分数 (0-100) - 仅用于显示
 *
 * 评分因素：
 * - 用户标记 (40%): 直接反映用户意图
 * - 测试正确率 (35%): 验证掌握程度
 * - 练习频次 (25%): 接触频率
 */
export function calculateFamiliarityScore(stats: LearningStats | undefined, userFamiliarity?: FamiliarityLevel): number {
  if (!stats || (stats.viewCount === 0 && stats.testCount === 0 && stats.masteredCount === 0 && stats.unmasteredCount === 0)) {
    return 0 // 新单词
  }

  let score = 0

  // 1. 用户标记权重 (0-40分)
  if (userFamiliarity === 'mastered') {
    score += 40
  } else if (userFamiliarity === 'familiar') {
    score += 30
  } else if (userFamiliarity === 'learning') {
    score += 20
  }

  // 2. 测试正确率 (0-35分)
  if (stats.testCount > 0) {
    const accuracy = stats.testCorrectCount / stats.testCount
    score += accuracy * 35
  }

  // 3. 练习频次 (0-25分)
  score += Math.min(stats.viewCount * 3, 25)

  return Math.round(score)
}

/**
 * 获取熟悉程度的中文名称
 */
export function getFamiliarityLabel(familiarity: FamiliarityLevel): string {
  const labels: Record<FamiliarityLevel, string> = {
    new: '新单词',
    learning: '学习中',
    familiar: '熟悉',
    mastered: '已掌握'
  }
  return labels[familiarity]
}

/**
 * 获取熟悉程度的英文名称
 */
export function getFamiliarityLabelEn(familiarity: FamiliarityLevel): string {
  const labels: Record<FamiliarityLevel, string> = {
    new: 'New',
    learning: 'Learning',
    familiar: 'Familiar',
    mastered: 'Mastered'
  }
  return labels[familiarity]
}

/**
 * 获取熟悉程度的描述
 */
export function getFamiliarityDescription(familiarity: FamiliarityLevel, language: 'chinese' | 'english' = 'chinese'): string {
  const descriptions: Record<FamiliarityLevel, { chinese: string; english: string }> = {
    new: {
      chinese: '尚未开始学习',
      english: 'Not yet started'
    },
    learning: {
      chinese: '正在学习中，需要更多练习',
      english: 'Learning, needs more practice'
    },
    familiar: {
      chinese: '基本掌握，可以继续提高',
      english: 'Basically mastered, can improve further'
    },
    mastered: {
      chinese: '完全掌握，无需复习',
      english: 'Fully mastered, no need to review'
    }
  }
  return descriptions[familiarity][language]
}
