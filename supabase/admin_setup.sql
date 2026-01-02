-- ============================================
-- Admin Dashboard Setup for Supabase
-- ============================================
-- 运行此 SQL 脚本来设置管理员权限和数据库安全
-- 在 Supabase Dashboard 的 SQL Editor 中运行

-- 1. 创建用户角色表（可选，用于更细粒度的权限控制）
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- 2. 为 user_roles 表创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 3. 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;

-- 创建新的触发器
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 启用 RLS (Row Level Security)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
-- 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON user_roles;

-- 允许任何人读取用户角色（用于前端检查）
CREATE POLICY "Users can view roles"
  ON user_roles
  FOR SELECT
  USING (true);

-- 只有管理员可以修改角色
CREATE POLICY "Only admins can update roles"
  ON user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 只有管理员可以删除角色
CREATE POLICY "Only admins can delete roles"
  ON user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. 创建函数：设置用户为管理员
CREATE OR REPLACE FUNCTION set_admin_role(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 通过邮箱获取用户 ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- 插入或更新角色
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id)
  DO UPDATE SET role = 'admin';

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建函数：获取用户角色
CREATE OR REPLACE FUNCTION get_user_role(user_id_param UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM user_roles WHERE user_id = user_id_param LIMIT 1),
    'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建视图：用户进度统计（用于管理员查看）
CREATE OR REPLACE VIEW user_progress_stats AS
SELECT
  up.user_id,
  COUNT(*) as total_words,
  SUM(CASE WHEN up.familiarity = 'mastered' THEN 1 ELSE 0 END) as mastered_words,
  SUM(CASE WHEN up.familiarity = 'learning' THEN 1 ELSE 0 END) as learning_words,
  SUM(CASE WHEN up.familiarity = 'familiar' THEN 1 ELSE 0 END) as familiar_words,
  SUM(CASE WHEN up.familiarity = 'new' THEN 1 ELSE 0 END) as new_words,
  SUM(COALESCE(up.view_count, 0)) as total_views,
  SUM(COALESCE(up.test_count, 0)) as total_tests,
  MAX(up.updated_at) as last_active,
  MIN(up.updated_at) as first_active
FROM user_progress up
GROUP BY up.user_id;

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 设置管理员用户：
--    SELECT set_admin_role('your_admin_email@example.com');
--
-- 2. 查看用户角色：
--    SELECT ur.role, au.email, au.created_at
--    FROM user_roles ur
--    JOIN auth.users au ON ur.user_id = au.id;
--
-- 3. 查看所有用户进度统计：
--    SELECT * FROM user_progress_stats;
--
-- 4. 检查某个用户是否是管理员：
--    SELECT get_user_role('user_id_here');
--
-- 5. 删除用户角色（移除管理员）：
--    DELETE FROM user_roles WHERE user_id = 'user_id_here';
--
-- ============================================
