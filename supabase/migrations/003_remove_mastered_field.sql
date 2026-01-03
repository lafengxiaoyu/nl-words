-- Supabase 数据库迁移脚本
-- 用于移除 user_progress 表中的 mastered 字段
-- 因为我们已经使用 familiarity 字段来表示掌握状态（familiarity === 'mastered'）
-- 
-- 使用方法：
-- 1. 在 Supabase Dashboard 中，进入 SQL Editor
-- 2. 复制并运行此脚本
-- 3. 检查执行结果，确保 mastered 字段已被移除

-- 移除 mastered 字段（如果存在）
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_progress' AND column_name = 'mastered') THEN
    ALTER TABLE user_progress DROP COLUMN mastered;
    RAISE NOTICE '已移除 mastered 字段';
  ELSE
    RAISE NOTICE 'mastered 字段不存在，跳过';
  END IF;
END $$;

-- 验证表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_progress'
ORDER BY ordinal_position;