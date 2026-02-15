-- ============================================
-- 为 user_progress 表添加管理员策略
-- ============================================
-- 问题：管理员无法查看其他用户的进度数据
-- 解决：添加管理员可以查看所有用户进度的 RLS 策略

-- 首先启用 RLS（如果尚未启用）
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON user_progress;

-- 创建 RLS 策略
-- 管理员可以查看所有用户的进度（放在前面，优先级更高）
CREATE POLICY "Admins can view all progress"
  ON user_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 管理员可以更新任何用户的进度
CREATE POLICY "Admins can update any progress"
  ON user_progress
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 管理员可以删除任何用户的进度
CREATE POLICY "Admins can delete any progress"
  ON user_progress
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 用户可以查看自己的进度
CREATE POLICY "Users can view their own progress"
  ON user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的进度
CREATE POLICY "Users can insert their own progress"
  ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的进度
CREATE POLICY "Users can update their own progress"
  ON user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 索引优化（如果不存在）
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_updated_at ON user_progress(updated_at);
