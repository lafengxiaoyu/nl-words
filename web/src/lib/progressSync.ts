import { supabase, isSupabaseConfigured, type UserProgress } from './supabase'
import type { BaseWord, WordWithProgress, UserWordProgress, FamiliarityLevel, LearningStats, Word } from '../data/types'
import { calculateFamiliarity } from './familiarityCalculator'

// Supabase 错误类型
interface SupabaseError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

/**
 * 从 Supabase 加载用户的学习进度
 */
export async function loadUserProgress(userId: string): Promise<Map<number, UserWordProgress>> {
  if (!isSupabaseConfigured) {
    return new Map()
  }
  
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    const progressMap = new Map<number, UserWordProgress>()
    
    if (data) {
      data.forEach((item: UserProgress) => {
        // 如果标记为已重置，则不创建 stats 对象
        const stats: LearningStats | undefined = item.stats_reset ? undefined : (
          item.view_count && item.view_count > 0 ? {
            viewCount: item.view_count,
            masteredCount: item.mastered_count || 0,
            unmasteredCount: item.unmastered_count || 0,
            testCount: item.test_count || 0,
            testCorrectCount: item.test_correct_count || 0,
            testWrongCount: item.test_wrong_count || 0,
            lastViewedAt: item.last_viewed_at || undefined,
            lastTestedAt: item.last_tested_at || undefined,
          } : undefined
        )

        progressMap.set(item.word_id, {
          wordId: item.word_id,
          familiarity: item.familiarity as FamiliarityLevel,
          stats,
        })
      })
    }

    return progressMap
  } catch (error: unknown) {
    console.error('加载学习进度失败:', error)
    // 提供更详细的错误信息
    const supabaseError = error as SupabaseError
    if (supabaseError?.code === 'PGRST116') {
      console.error('❌ 数据库表 user_progress 不存在，请运行 SUPABASE_SETUP.md 中的 SQL 脚本')
    } else if (supabaseError?.code === '42703') {
      console.error('❌ 数据库表缺少必要的字段，请运行 supabase/migrations/002_add_learning_stats.sql 迁移脚本')
    } else if (supabaseError?.message?.includes('JWT')) {
      console.error('❌ 认证失败，请检查 Supabase 配置和用户登录状态')
    }
    throw error
  }
}

/**
 * 保存用户的学习进度到 Supabase
 */
export async function saveUserProgress(
  userId: string,
  wordId: number,
  familiarity: FamiliarityLevel,
  stats?: LearningStats
): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  try {
    // 使用 upsert 来更新或插入记录
    const updateData: Partial<UserProgress> = {
      user_id: userId,
      word_id: wordId,
      familiarity,
      updated_at: new Date().toISOString(),
    }

    // 如果有统计数据，添加到更新数据中
    if (stats) {
      updateData.view_count = stats.viewCount
      updateData.mastered_count = stats.masteredCount
      updateData.unmastered_count = stats.unmasteredCount
      updateData.test_count = stats.testCount
      updateData.test_correct_count = stats.testCorrectCount
      updateData.test_wrong_count = stats.testWrongCount
      updateData.last_viewed_at = stats.lastViewedAt
      updateData.last_tested_at = stats.lastTestedAt
      updateData.stats_reset = false
    } else {
      // 如果没有统计数据，标记为已重置
      updateData.stats_reset = true
      updateData.view_count = 0
      updateData.mastered_count = 0
      updateData.unmastered_count = 0
      updateData.test_count = 0
      updateData.test_correct_count = 0
      updateData.test_wrong_count = 0
      updateData.last_viewed_at = undefined
      updateData.last_tested_at = undefined
    }

    const { error } = await supabase
      .from('user_progress')
      .upsert(updateData, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
  } catch (error: unknown) {
    console.error('保存学习进度失败:', error)
    // 提供更详细的错误信息
    const supabaseError = error as SupabaseError
    if (supabaseError?.code === 'PGRST116') {
      console.error('❌ 数据库表 user_progress 不存在，请运行 SUPABASE_SETUP.md 中的 SQL 脚本')
    } else if (supabaseError?.code === '42703') {
      console.error('❌ 数据库表缺少必要的字段，请运行 supabase/migrations/002_add_learning_stats.sql 迁移脚本')
    } else if (supabaseError?.message?.includes('JWT') || supabaseError?.message?.includes('permission')) {
      console.error('❌ 权限错误，请检查 RLS 策略和用户认证状态')
    }
    throw error
  }
}

/**
 * 更新单词的查看统计
 */
export async function incrementViewCount(
  userId: string,
  wordId: number,
  currentStats?: LearningStats
): Promise<LearningStats> {
  if (!isSupabaseConfigured) {
    // 返回本地统计数据
    return {
      viewCount: (currentStats?.viewCount || 0) + 1,
      masteredCount: currentStats?.masteredCount || 0,
      unmasteredCount: currentStats?.unmasteredCount || 0,
      testCount: currentStats?.testCount || 0,
      testCorrectCount: currentStats?.testCorrectCount || 0,
      testWrongCount: currentStats?.testWrongCount || 0,
      lastViewedAt: new Date().toISOString(),
      lastTestedAt: currentStats?.lastTestedAt,
    }
  }

  try {
    // 先获取当前记录
    const { data: existing } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .single()

    const newStats: LearningStats = {
      viewCount: (existing?.view_count || currentStats?.viewCount || 0) + 1,
      masteredCount: existing?.mastered_count || currentStats?.masteredCount || 0,
      unmasteredCount: existing?.unmastered_count || currentStats?.unmasteredCount || 0,
      testCount: existing?.test_count || currentStats?.testCount || 0,
      testCorrectCount: existing?.test_correct_count || currentStats?.testCorrectCount || 0,
      testWrongCount: existing?.test_wrong_count || currentStats?.testWrongCount || 0,
      lastViewedAt: new Date().toISOString(),
      lastTestedAt: existing?.last_tested_at || currentStats?.lastTestedAt,
    }

    // 更新或插入记录
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        word_id: wordId,
        familiarity: existing?.familiarity || 'new',
        view_count: newStats.viewCount,
        mastered_count: newStats.masteredCount,
        unmastered_count: newStats.unmasteredCount,
        test_count: newStats.testCount,
        test_correct_count: newStats.testCorrectCount,
        test_wrong_count: newStats.testWrongCount,
        last_viewed_at: newStats.lastViewedAt,
        last_tested_at: newStats.lastTestedAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
    return newStats
  } catch (error: unknown) {
    console.error('更新查看统计失败:', error)
    const supabaseError = error as SupabaseError
    if (supabaseError?.code === '42703') {
      console.error('❌ 数据库表缺少统计字段，请运行 supabase/migrations/002_add_learning_stats.sql 迁移脚本')
    }
    // 返回本地计算的统计数据
    return {
      viewCount: (currentStats?.viewCount || 0) + 1,
      masteredCount: currentStats?.masteredCount || 0,
      unmasteredCount: currentStats?.unmasteredCount || 0,
      testCount: currentStats?.testCount || 0,
      testCorrectCount: currentStats?.testCorrectCount || 0,
      testWrongCount: currentStats?.testWrongCount || 0,
      lastViewedAt: new Date().toISOString(),
      lastTestedAt: currentStats?.lastTestedAt,
    }
  }
}

/**
 * 更新掌握状态统计
 * 返回更新后的统计数据和自动计算的熟悉程度
 */
export async function updateMasteryStats(
  userId: string,
  wordId: number,
  familiarity: FamiliarityLevel,
  currentStats?: LearningStats
): Promise<{ stats: LearningStats; familiarity: FamiliarityLevel }> {
  const isMastered = familiarity === 'mastered'
  if (!isSupabaseConfigured) {
    const newStats: LearningStats = {
      viewCount: currentStats?.viewCount || 0,
      masteredCount: isMastered ? (currentStats?.masteredCount || 0) + 1 : (currentStats?.masteredCount || 0),
      unmasteredCount: !isMastered ? (currentStats?.unmasteredCount || 0) + 1 : (currentStats?.unmasteredCount || 0),
      testCount: currentStats?.testCount || 0,
      testCorrectCount: currentStats?.testCorrectCount || 0,
      testWrongCount: currentStats?.testWrongCount || 0,
      lastViewedAt: currentStats?.lastViewedAt,
      lastTestedAt: currentStats?.lastTestedAt,
    }
    // 传入用户选择，实现混合策略
    const calculatedFamiliarity = calculateFamiliarity(newStats, familiarity)
    return { stats: newStats, familiarity: calculatedFamiliarity }
  }

  try {
    const { data: existing } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .single()

    const newStats: LearningStats = {
      viewCount: existing?.view_count || currentStats?.viewCount || 0,
      masteredCount: isMastered 
        ? (existing?.mastered_count || currentStats?.masteredCount || 0) + 1
        : (existing?.mastered_count || currentStats?.masteredCount || 0),
      unmasteredCount: !isMastered
        ? (existing?.unmastered_count || currentStats?.unmasteredCount || 0) + 1
        : (existing?.unmastered_count || currentStats?.unmasteredCount || 0),
      testCount: existing?.test_count || currentStats?.testCount || 0,
      testCorrectCount: existing?.test_correct_count || currentStats?.testCorrectCount || 0,
      testWrongCount: existing?.test_wrong_count || currentStats?.testWrongCount || 0,
      lastViewedAt: existing?.last_viewed_at || currentStats?.lastViewedAt,
      lastTestedAt: existing?.last_tested_at || currentStats?.lastTestedAt,
    }

    // 传入用户选择，实现混合策略
    const calculatedFamiliarity = calculateFamiliarity(newStats, familiarity)

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        word_id: wordId,
        familiarity: calculatedFamiliarity,
        mastered_count: newStats.masteredCount,
        unmastered_count: newStats.unmasteredCount,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
    return { stats: newStats, familiarity: calculatedFamiliarity }
  } catch (error: unknown) {
    console.error('更新掌握统计失败:', error)
    const supabaseError = error as SupabaseError
    if (supabaseError?.code === '42703') {
      console.error('❌ 数据库表缺少统计字段，请运行 supabase/migrations/002_add_learning_stats.sql 迁移脚本')
    }
    const newStats: LearningStats = {
      viewCount: currentStats?.viewCount || 0,
      masteredCount: isMastered ? (currentStats?.masteredCount || 0) + 1 : (currentStats?.masteredCount || 0),
      unmasteredCount: !isMastered ? (currentStats?.unmasteredCount || 0) + 1 : (currentStats?.unmasteredCount || 0),
      testCount: currentStats?.testCount || 0,
      testCorrectCount: currentStats?.testCorrectCount || 0,
      testWrongCount: currentStats?.testWrongCount || 0,
      lastViewedAt: currentStats?.lastViewedAt,
      lastTestedAt: currentStats?.lastTestedAt,
    }
    const calculatedFamiliarity = calculateFamiliarity(newStats)
    return { stats: newStats, familiarity: calculatedFamiliarity }
  }
}

/**
 * 更新测试统计
 * 返回更新后的统计数据和自动计算的熟悉程度
 */
export async function updateTestStats(
  userId: string,
  wordId: number,
  isCorrect: boolean,
  currentStats?: LearningStats
): Promise<{ stats: LearningStats; familiarity: FamiliarityLevel }> {
  if (!isSupabaseConfigured) {
    const newStats: LearningStats = {
      viewCount: currentStats?.viewCount || 0,
      masteredCount: currentStats?.masteredCount || 0,
      unmasteredCount: currentStats?.unmasteredCount || 0,
      testCount: (currentStats?.testCount || 0) + 1,
      testCorrectCount: isCorrect ? (currentStats?.testCorrectCount || 0) + 1 : (currentStats?.testCorrectCount || 0),
      testWrongCount: !isCorrect ? (currentStats?.testWrongCount || 0) + 1 : (currentStats?.testWrongCount || 0),
      lastViewedAt: currentStats?.lastViewedAt,
      lastTestedAt: new Date().toISOString(),
    }
    const calculatedFamiliarity = calculateFamiliarity(newStats)
    return { stats: newStats, familiarity: calculatedFamiliarity }
  }

  try {
    const { data: existing } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .single()

    const newStats: LearningStats = {
      viewCount: existing?.view_count || currentStats?.viewCount || 0,
      masteredCount: existing?.mastered_count || currentStats?.masteredCount || 0,
      unmasteredCount: existing?.unmastered_count || currentStats?.unmasteredCount || 0,
      testCount: (existing?.test_count || currentStats?.testCount || 0) + 1,
      testCorrectCount: isCorrect
        ? (existing?.test_correct_count || currentStats?.testCorrectCount || 0) + 1
        : (existing?.test_correct_count || currentStats?.testCorrectCount || 0),
      testWrongCount: !isCorrect
        ? (existing?.test_wrong_count || currentStats?.testWrongCount || 0) + 1
        : (existing?.test_wrong_count || currentStats?.testWrongCount || 0),
      lastViewedAt: existing?.last_viewed_at || currentStats?.lastViewedAt,
      lastTestedAt: new Date().toISOString(),
    }

    // 自动计算熟悉程度
    const calculatedFamiliarity = calculateFamiliarity(newStats)

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        word_id: wordId,
        familiarity: calculatedFamiliarity,
        test_count: newStats.testCount,
        test_correct_count: newStats.testCorrectCount,
        test_wrong_count: newStats.testWrongCount,
        last_tested_at: newStats.lastTestedAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
    return { stats: newStats, familiarity: calculatedFamiliarity }
  } catch (error: unknown) {
    console.error('更新测试统计失败:', error)
    const supabaseError = error as SupabaseError
    if (supabaseError?.code === '42703') {
      console.error('❌ 数据库表缺少统计字段，请运行 supabase/migrations/002_add_learning_stats.sql 迁移脚本')
    }
    const newStats: LearningStats = {
      viewCount: currentStats?.viewCount || 0,
      masteredCount: currentStats?.masteredCount || 0,
      unmasteredCount: currentStats?.unmasteredCount || 0,
      testCount: (currentStats?.testCount || 0) + 1,
      testCorrectCount: isCorrect ? (currentStats?.testCorrectCount || 0) + 1 : (currentStats?.testCorrectCount || 0),
      testWrongCount: !isCorrect ? (currentStats?.testWrongCount || 0) + 1 : (currentStats?.testWrongCount || 0),
      lastViewedAt: currentStats?.lastViewedAt,
      lastTestedAt: new Date().toISOString(),
    }
    const calculatedFamiliarity = calculateFamiliarity(newStats)
    return { stats: newStats, familiarity: calculatedFamiliarity }
  }
}

/**
 * 批量保存用户的学习进度
 */
export async function saveAllUserProgress(
  userId: string,
  words: WordWithProgress[]
): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }
  
  try {
    const progressData = words.map(word => {
      const data: Partial<UserProgress> = {
        user_id: userId,
        word_id: word.id,
        familiarity: word.familiarity,
        updated_at: new Date().toISOString(),
      }

      // 如果有统计数据，添加到更新数据中
      if (word.stats) {
        data.view_count = word.stats.viewCount
        data.mastered_count = word.stats.masteredCount
        data.unmastered_count = word.stats.unmasteredCount
        data.test_count = word.stats.testCount
        data.test_correct_count = word.stats.testCorrectCount
        data.test_wrong_count = word.stats.testWrongCount
        data.last_viewed_at = word.stats.lastViewedAt
        data.last_tested_at = word.stats.lastTestedAt
      }

      return data
    })

    const { error } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
  } catch (error: unknown) {
    console.error('批量保存学习进度失败:', error)
    const supabaseError = error as SupabaseError
    if (supabaseError?.code === '42703') {
      console.error('❌ 数据库表缺少必要的字段，请运行 supabase/migrations/002_add_learning_stats.sql 迁移脚本')
    } else if (supabaseError?.message?.includes('JWT') || supabaseError?.message?.includes('permission')) {
      console.error('❌ 权限错误，请检查 RLS 策略和用户认证状态')
    }
    throw error
  }
}

/**
 * 合并云端进度到本地单词列表
 * 将 BaseWord 数组或 Word 数组和用户进度 Map 合并成 WordWithProgress 数组
 */
export function mergeProgress(
  words: BaseWord[] | Word[],
  progressMap: Map<number, UserWordProgress>
): WordWithProgress[] {
  return words.map(word => {
    const progress = progressMap.get(word.id)
    if (progress) {
      return {
        ...word,
        familiarity: progress.familiarity,
        stats: progress.stats,
      }
    }
    // 如果没有进度数据，使用默认值，清除所有本地进度数据
    return {
      ...word,
      familiarity: 'new' as FamiliarityLevel,
      stats: undefined,
    }
  })
}


