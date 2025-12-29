import { supabase, isSupabaseConfigured, type UserProgress } from './supabase'
import type { Word } from '../data/words'

/**
 * 从 Supabase 加载用户的学习进度
 */
export async function loadUserProgress(userId: string): Promise<Map<number, Partial<Word>>> {
  if (!isSupabaseConfigured) {
    return new Map()
  }
  
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    const progressMap = new Map<number, Partial<Word>>()
    
    if (data) {
      data.forEach((item: UserProgress) => {
        progressMap.set(item.word_id, {
          mastered: item.mastered,
          familiarity: item.familiarity as any,
        })
      })
    }

    return progressMap
  } catch (error) {
    console.error('加载学习进度失败:', error)
    throw error
  }
}

/**
 * 保存用户的学习进度到 Supabase
 */
export async function saveUserProgress(
  userId: string,
  wordId: number,
  mastered: boolean,
  familiarity: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }
  
  try {
    // 使用 upsert 来更新或插入记录
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        word_id: wordId,
        mastered,
        familiarity,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
  } catch (error) {
    console.error('保存学习进度失败:', error)
    throw error
  }
}

/**
 * 批量保存用户的学习进度
 */
export async function saveAllUserProgress(
  userId: string,
  words: Word[]
): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }
  
  try {
    const progressData = words.map(word => ({
      user_id: userId,
      word_id: word.id,
      mastered: word.mastered,
      familiarity: word.familiarity,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('user_progress')
      .upsert(progressData, {
        onConflict: 'user_id,word_id'
      })

    if (error) throw error
  } catch (error) {
    console.error('批量保存学习进度失败:', error)
    throw error
  }
}

/**
 * 合并云端进度到本地单词列表
 */
export function mergeProgress(
  words: Word[],
  progressMap: Map<number, Partial<Word>>
): Word[] {
  return words.map(word => {
    const progress = progressMap.get(word.id)
    if (progress) {
      return {
        ...word,
        mastered: progress.mastered ?? word.mastered,
        familiarity: progress.familiarity ?? word.familiarity,
      }
    }
    return word
  })
}

