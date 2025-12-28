import { createClient } from '@supabase/supabase-js'

// Supabase 配置
// 请替换为你的 Supabase 项目 URL 和 Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key'

if (!isSupabaseConfigured) {
  console.warn('Supabase 配置未设置，应用将以游客模式运行。请设置环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export { isSupabaseConfigured }

// 数据库表结构类型
export interface UserProgress {
  id?: string
  user_id: string
  word_id: number
  mastered: boolean
  familiarity: string
  updated_at?: string
}

export interface UserWord {
  word_id: number
  mastered: boolean
  familiarity: string
}

