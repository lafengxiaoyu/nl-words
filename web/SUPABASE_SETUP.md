# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 注册/登录账户
3. 创建新项目
4. 等待项目初始化完成

## 2. 获取 API 密钥

1. 在项目设置中，进入 **Settings** → **API**
2. 复制以下信息：
   - **Project URL** (例如: `https://xxxxx.supabase.co`)
   - **anon/public key** (anon key)

## 3. 配置环境变量

1. 在项目根目录创建 `.env` 文件（复制 `.env.example`）
2. 填入你的 Supabase 配置：

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. 创建数据库表

在 Supabase Dashboard 中，进入 **SQL Editor**，运行以下 SQL：

```sql
-- 创建用户学习进度表
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL,
  mastered BOOLEAN DEFAULT false,
  familiarity TEXT NOT NULL DEFAULT 'new',
  -- 学习统计字段
  view_count INTEGER DEFAULT 0,
  mastered_count INTEGER DEFAULT 0,
  unmastered_count INTEGER DEFAULT 0,
  test_count INTEGER DEFAULT 0,
  test_correct_count INTEGER DEFAULT 0,
  test_wrong_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_word_id ON user_progress(word_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和修改自己的进度
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON user_progress FOR DELETE
  USING (auth.uid() = user_id);
```

### 4.1. 如果表已存在（迁移现有表）

如果你的表已经创建但没有统计字段，运行以下迁移 SQL 来添加缺失的字段：

```sql
-- 添加统计字段（如果不存在）
DO $$ 
BEGIN
  -- 添加 view_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'view_count') THEN
    ALTER TABLE user_progress ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;

  -- 添加 mastered_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'mastered_count') THEN
    ALTER TABLE user_progress ADD COLUMN mastered_count INTEGER DEFAULT 0;
  END IF;

  -- 添加 unmastered_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'unmastered_count') THEN
    ALTER TABLE user_progress ADD COLUMN unmastered_count INTEGER DEFAULT 0;
  END IF;

  -- 添加 test_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'test_count') THEN
    ALTER TABLE user_progress ADD COLUMN test_count INTEGER DEFAULT 0;
  END IF;

  -- 添加 test_correct_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'test_correct_count') THEN
    ALTER TABLE user_progress ADD COLUMN test_correct_count INTEGER DEFAULT 0;
  END IF;

  -- 添加 test_wrong_count 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'test_wrong_count') THEN
    ALTER TABLE user_progress ADD COLUMN test_wrong_count INTEGER DEFAULT 0;
  END IF;

  -- 添加 last_viewed_at 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'last_viewed_at') THEN
    ALTER TABLE user_progress ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- 添加 last_tested_at 字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_progress' AND column_name = 'last_tested_at') THEN
    ALTER TABLE user_progress ADD COLUMN last_tested_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
```

## 5. 配置认证

1. 在 Supabase Dashboard 中，进入 **Authentication** → **Settings**
2. 确保 **Email Auth** 已启用
3. 可以配置邮箱验证（可选）

## 6. 测试

1. 运行 `npm install` 安装依赖
2. 运行 `npm run dev` 启动开发服务器
3. 尝试注册/登录账户
4. 测试学习进度的同步功能

## 7. 故障排除

### 同步问题检查清单

如果遇到同步问题，请按以下步骤检查：

1. **检查环境变量**
   - 确认 `web/.env` 文件存在且包含正确的配置
   - 确认 `VITE_SUPABASE_URL` 格式为 `https://xxxxx.supabase.co`
   - 确认 `VITE_SUPABASE_ANON_KEY` 已正确设置

2. **检查数据库表结构**
   - 在 Supabase Dashboard 中，进入 **Table Editor** → **user_progress**
   - 确认表包含以下字段：
     - `id`, `user_id`, `word_id`, `mastered`, `familiarity`, `updated_at`
     - `view_count`, `mastered_count`, `unmastered_count`
     - `test_count`, `test_correct_count`, `test_wrong_count`
     - `last_viewed_at`, `last_tested_at`
   - 如果缺少字段，运行 `SUPABASE_MIGRATION.sql` 迁移脚本

3. **检查 RLS 策略**
   - 在 Supabase Dashboard 中，进入 **Authentication** → **Policies**
   - 确认 `user_progress` 表有以下策略：
     - "Users can view own progress" (SELECT)
     - "Users can insert own progress" (INSERT)
     - "Users can update own progress" (UPDATE)
     - "Users can delete own progress" (DELETE)

4. **检查认证设置**
   - 在 Supabase Dashboard 中，进入 **Authentication** → **Settings**
   - 确认 **Email Auth** 已启用
   - 如果启用了邮箱验证，确认用户已点击验证链接

5. **查看浏览器控制台**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签页中的错误信息
   - 常见错误：
     - `PGRST116`: 表不存在，需要运行 SQL 脚本
     - `42703`: 字段不存在，需要运行迁移脚本
     - `JWT` 相关错误: 认证问题，检查登录状态

6. **测试连接**
   - 在浏览器控制台运行：
   ```javascript
   // 检查 Supabase 配置
   console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
   ```

## 注意事项

- **安全性**：anon key 是公开的，但通过 RLS (Row Level Security) 保护数据安全
- **邮箱验证**：如果启用了邮箱验证，用户注册后需要点击邮箱中的验证链接
- **数据备份**：应用会在本地 localStorage 保存备份，即使 Supabase 不可用也能继续学习
- **向后兼容**：如果表已存在但缺少新字段，运行迁移脚本不会影响现有数据

