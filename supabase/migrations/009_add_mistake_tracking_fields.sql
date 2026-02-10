-- Supabase 数据库迁移脚本
-- 为错题本功能添加追踪字段

-- 添加错题追踪字段
DO $$
BEGIN
  -- 添加 consecutive_correct_count 字段（连续答对次数）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'consecutive_correct_count') THEN
    ALTER TABLE user_progress ADD COLUMN consecutive_correct_count INTEGER DEFAULT 0;
    RAISE NOTICE '已添加 consecutive_correct_count 字段';
  ELSE
    RAISE NOTICE 'consecutive_correct_count 字段已存在，跳过';
  END IF;

  -- 添加 is_high_frequency_mistake 字段（是否为高频错题）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'is_high_frequency_mistake') THEN
    ALTER TABLE user_progress ADD COLUMN is_high_frequency_mistake BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '已添加 is_high_frequency_mistake 字段';
  ELSE
    RAISE NOTICE 'is_high_frequency_mistake 字段已存在，跳过';
  END IF;

  -- 添加 last_mistake_at 字段（最后错误时间）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'last_mistake_at') THEN
    ALTER TABLE user_progress ADD COLUMN last_mistake_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '已添加 last_mistake_at 字段';
  ELSE
    RAISE NOTICE 'last_mistake_at 字段已存在，跳过';
  END IF;

  -- 添加 mastered_at 字段（掌握时间，从错题本移除的时间）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_progress' AND column_name = 'mastered_at') THEN
    ALTER TABLE user_progress ADD COLUMN mastered_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '已添加 mastered_at 字段';
  ELSE
    RAISE NOTICE 'mastered_at 字段已存在，跳过';
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_progress_consecutive_correct
  ON user_progress(consecutive_correct_count);

CREATE INDEX IF NOT EXISTS idx_user_progress_high_frequency
  ON user_progress(is_high_frequency_mistake, test_wrong_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_progress_last_mistake_at
  ON user_progress(last_mistake_at DESC);

-- 验证表结构
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_progress'
  AND column_name IN (
    'consecutive_correct_count',
    'is_high_frequency_mistake',
    'last_mistake_at',
    'mastered_at'
  )
ORDER BY ordinal_position;
