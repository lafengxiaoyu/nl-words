-- ============================================
-- 用户资料表 Setup
-- ============================================
-- 运行此 SQL 脚本来创建用户资料表

-- 1. 创建用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 添加 role 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user', 'moderator'));
  END IF;
END $$;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 3. 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- 4. 创建更新时间戳的触发器
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 启用 RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 6. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own role" ON user_profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON user_profiles;

-- 7. 创建 RLS 策略
-- 允许任何人查看所有用户资料（用于显示用户名等公开信息）
CREATE POLICY "Public can view profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

-- 用户可以插入自己的资料
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的资料
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM user_profiles WHERE user_id = auth.uid()));

-- 管理员可以更新任何资料（包括角色）
CREATE POLICY "Admins can update any profile"
  ON user_profiles
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

-- ============================================
-- 自动创建用户资料的触发器
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建触发器：新用户注册时自动创建资料
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 数据迁移（如果需要从 user_roles 表迁移）
-- ============================================
-- 迁移 user_roles 数据到 user_profiles.role
-- 运行一次后可以删除 user_roles 表
/*
UPDATE user_profiles up
SET role = ur.role
FROM user_roles ur
WHERE up.user_id = ur.user_id;

-- 迁移完成后，删除 user_roles 表
-- DROP TABLE IF EXISTS user_roles CASCADE;
-- DROP FUNCTION IF EXISTS set_admin_role;
-- DROP FUNCTION IF EXISTS get_user_role;
*/

-- ============================================
-- 使用说明：
-- ============================================
--
-- 1. 设置用户为管理员：
--    UPDATE user_profiles SET role = 'admin' WHERE user_id = 'your_user_id';
--
-- 2. 或者通过邮箱设置管理员（先获取 user_id）：
--    UPDATE user_profiles SET role = 'admin'
--    WHERE email = 'your_admin_email@example.com';
--
-- 3. 查看所有用户及其角色：
--    SELECT role, username, email, created_at FROM user_profiles;
--
-- 4. 移除管理员权限：
--    UPDATE user_profiles SET role = 'user' WHERE user_id = 'user_id_here';
--
-- 5. 查看用户统计：
--    SELECT role, COUNT(*) as count
--    FROM user_profiles
--    GROUP BY role;
--
-- ============================================