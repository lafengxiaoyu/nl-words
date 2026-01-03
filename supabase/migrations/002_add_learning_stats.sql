-- Supabase 数据库迁移脚本
-- 用于更新现有的 user_progress 表，添加学习统计字段
-- 
-- 使用方法：
-- 1. 在 Supabase Dashboard 中，进入 SQL Editor
-- 2. 复制并运行此脚本
-- 3. 检查执行结果，确保所有字段都已添加

-- 添加统计字段（如果不存在）
DO $$ 
BEGIN
  -- 添加 view_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'view_count') THEN
    ALTER TABLE user_progress ADD COLUMN view_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 view_count 字段';
  ELSE
    RAISE NOTICE 'view_count 字段已存在，跳过';
  END IF;

  -- 添加 mastered_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'mastered_count') THEN
    ALTER TABLE user_progress ADD COLUMN mastered_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 mastered_count 字段';
  ELSE
    RAISE NOTICE 'mastered_count 字段已存在，跳过';
  END IF;

  -- 添加 unmastered_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'unmastered_count') THEN
    ALTER TABLE user_progress ADD COLUMN unmastered_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 unmastered_count 字段';
  ELSE
    RAISE NOTICE 'unmastered_count 字段已存在，跳过';
  END IF;

  -- 添加 test_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'test_count') THEN
    ALTER TABLE user_progress ADD COLUMN test_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 test_count 字段';
  ELSE
    RAISE NOTICE 'test_count 字段已存在，跳过';
  END IF;

  -- 添加 test_correct_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'test_correct_count') THEN
    ALTER TABLE user_progress ADD COLUMN test_correct_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 test_correct_count 字段';
  ELSE
    RAISE NOTICE 'test_correct_count 字段已存在，跳过';
  END IF;

  -- 添加 test_wrong_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'test_wrong_count') THEN
    ALTER TABLE user_progress ADD COLUMN test_wrong_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 test_wrong_count 字段';
  ELSE
    RAISE NOTICE 'test_wrong_count 字段已存在，跳过';
  END IF;

  -- 添加 last_viewed_at 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE user_progress ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '已添加 last_viewed_at 字段';
  ELSE
    RAISE NOTICE 'last_viewed_at 字段已存在，跳过';
  END IF;

  -- 添加 last_tested_at 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'last_tested_at') THEN
    ALTER TABLE user_progress ADD COLUMN last_tested_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '已添加 last_tested_at 字段';
  ELSE
    RAISE NOTICE 'last_tested_at 字段已存在，跳过';
  END IF;

  -- 添加 stats_reset 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'stats_reset') THEN
    ALTER TABLE user_progress ADD COLUMN stats_reset BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '已添加 stats_reset 字段';
  ELSE
    RAISE NOTICE 'stats_reset 字段已存在，跳过';
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