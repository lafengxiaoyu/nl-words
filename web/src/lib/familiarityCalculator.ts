import type { LearningStats, FamiliarityLevel } from '../data/types'

/**
 * 熟悉程度计算器
 * 根据用户的学习统计数据自动计算熟悉程度
 */

/**
 * 计算熟悉程度分数 (0-100)
 * 
 * 评分因素：
 * - 测试正确率 (40%): 最能反映真实掌握程度
 * - 掌握倾向 (30%): 用户主动标记的倾向
 * - 练习频次 (20%): 查看次数代表接触频率
 * - 时间因素 (10%): 最近学习活动
 */
export function calculateFamiliarityScore(stats: LearningStats | undefined): number {
  if (!stats || stats.testCount === 0 && stats.masteredCount === 0 && stats.unmasteredCount === 0) {
    return 0 // 新单词
  }

  // 1. 测试正确率 (0-40分)
  let testScore = 0
  if (stats.testCount > 0) {
    const accuracy = stats.testCorrectCount / stats.testCount
    testScore = accuracy * 40
  }

  // 2. 掌握倾向 (0-30分)
  let masteryScore = 0
  const totalMasteryMarks = stats.masteredCount + stats.unmasteredCount
  if (totalMasteryMarks > 0) {
    const masteryRatio = stats.masteredCount / totalMasteryMarks
    masteryScore = masteryRatio * 30
  }

  // 3. 练习频次 (0-20分)
  const viewScore = Math.min(stats.viewCount * 2, 20)

  // 4. 时间因素 (0-10分)
  let timeScore = 0
  const now = new Date()
  const lastActivity = stats.lastTestedAt || stats.lastViewedAt
  if (lastActivity) {
    const daysSinceLastActivity = (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    // 最近7天有活动得10分，30天内按比例衰减
    if (daysSinceLastActivity <= 7) {
      timeScore = 10
    } else if (daysSinceLastActivity <= 30) {
      timeScore = 10 * (1 - (daysSinceLastActivity - 7) / 23)
    }
  }

  return Math.round(testScore + masteryScore + viewScore + timeScore)
}

/**
 * 根据分数和统计信息返回熟悉程度
 *
 * 采用混合策略：用户明确标记优先 + 智能降级保护
 *
 * 级别划分标准：
 * - new: 0分（无任何学习活动）
 * - learning: 1-39分（刚开始学习，掌握度较低）
 * - familiar: 40-69分（有一定掌握，但还未达到精通）
 * - mastered: 70+分（高度掌握，需满足额外条件）
 *
 * @param score - 计算出的分数
 * @param stats - 学习统计数据
 * @param userFamiliarity - 用户手动标记的熟悉程度（可选）
 */
export function getFamiliarityFromScore(
  score: number,
  stats: LearningStats | undefined,
  userFamiliarity?: FamiliarityLevel
): FamiliarityLevel {
  // 如果没有任何学习活动
  if (!stats || stats.testCount === 0 && stats.masteredCount === 0 && stats.unmasteredCount === 0 && stats.viewCount === 0) {
    return 'new'
  }

  // 混合策略：优先考虑用户明确标记，但添加智能降级保护

  // 1. 如果用户明确标记为mastered，尊重用户选择，除非测试数据明显矛盾
  if (userFamiliarity === 'mastered') {
    // 检查是否有明显的测试失误
    if (stats.testCount >= 2) {
      const accuracy = stats.testCorrectCount / stats.testCount
      // 测试正确率低于50%，说明用户可能盲目标记，强制降级
      if (accuracy < 0.5) {
        return score <= 39 ? 'learning' : 'familiar'
      }
    }
    // 测试数据正常或不足，尊重用户选择
    return 'mastered'
  }

  // 2. 如果用户明确标记为new或learning，尊重用户选择
  if (userFamiliarity === 'new' || userFamiliarity === 'learning') {
    return userFamiliarity
  }

  // 3. 如果用户标记为familiar，尊重用户选择
  if (userFamiliarity === 'familiar') {
    return 'familiar'
  }

  // 4. 没有用户明确标记，按分数计算
  if (score <= 39) {
    return 'learning'
  }

  if (score <= 69) {
    return 'familiar'
  }

  // 高分（70+）还需要满足最低条件才能标记为掌握
  if (score >= 70) {
    // 需要至少有测试记录和一定的正确率
    const hasTestRecords = stats.testCount >= 3
    const hasGoodAccuracy = stats.testCount > 0 && (stats.testCorrectCount / stats.testCount) >= 0.7

    if (hasTestRecords && hasGoodAccuracy) {
      return 'mastered'
    }
  }

  return 'familiar'
}

/**
 * 自动计算熟悉程度
 * 组合上述两个函数，直接返回熟悉程度
 *
 * @param stats - 学习统计数据
 * @param userFamiliarity - 用户手动标记的熟悉程度（可选）
 */
export function calculateFamiliarity(
  stats: LearningStats | undefined,
  userFamiliarity?: FamiliarityLevel
): FamiliarityLevel {
  const score = calculateFamiliarityScore(stats)
  return getFamiliarityFromScore(score, stats, userFamiliarity)
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
