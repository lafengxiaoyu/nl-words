-- Supabase 数据库迁移脚本
-- 在 user_progress 表中添加收藏相关字段
--
-- 使用方法：
-- 1. 在 Supabase Dashboard 中，进入 SQL Editor
-- 2. 复制并运行此脚本
-- 3. 检查执行结果，确保所有字段都已添加

-- 添加收藏相关字段（如果不存在）
DO $$
BEGIN
  -- 添加 is_favorited 字段（是否收藏）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'is_favorited') THEN
    ALTER TABLE user_progress ADD COLUMN is_favorited BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '已添加 is_favorited 字段';
  ELSE
    RAISE NOTICE 'is_favorited 字段已存在，跳过';
  END IF;

  -- 添加 favorited_at 字段（收藏时间）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'favorited_at') THEN
    ALTER TABLE user_progress ADD COLUMN favorited_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '已添加 favorited_at 字段';
  ELSE
    RAISE NOTICE 'favorited_at 字段已存在，跳过';
  END IF;

  -- 添加 favorite_notes 字段（收藏备注）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'favorite_notes') THEN
    ALTER TABLE user_progress ADD COLUMN favorite_notes TEXT;
    RAISE NOTICE '已添加 favorite_notes 字段';
  ELSE
    RAISE NOTICE 'favorite_notes 字段已存在，跳过';
  END IF;

  -- 添加 favorite_category 字段（收藏分类）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'favorite_category') THEN
    ALTER TABLE user_progress ADD COLUMN favorite_category VARCHAR(50);
    RAISE NOTICE '已添加 favorite_category 字段';
  ELSE
    RAISE NOTICE 'favorite_category 字段已存在，跳过';
  END IF;
END $$;

-- 为收藏相关字段添加索引
CREATE INDEX IF NOT EXISTS idx_user_progress_favorited
  ON user_progress(is_favorited, user_id)
  WHERE is_favorited = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_progress_favorited_at
  ON user_progress(favorited_at DESC)
  WHERE favorited_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_progress_favorite_category
  ON user_progress(favorite_category, user_id)
  WHERE favorite_category IS NOT NULL;

-- 验证表结构
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_progress'
  AND column_name IN ('is_favorited', 'favorited_at', 'favorite_notes', 'favorite_category')
ORDER BY ordinal_position;
