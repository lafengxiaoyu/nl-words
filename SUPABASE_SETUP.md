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

## 5. 配置认证

1. 在 Supabase Dashboard 中，进入 **Authentication** → **Settings**
2. 确保 **Email Auth** 已启用
3. 可以配置邮箱验证（可选）

## 6. 测试

1. 运行 `npm install` 安装依赖
2. 运行 `npm run dev` 启动开发服务器
3. 尝试注册/登录账户
4. 测试学习进度的同步功能

## 注意事项

- **安全性**：anon key 是公开的，但通过 RLS (Row Level Security) 保护数据安全
- **邮箱验证**：如果启用了邮箱验证，用户注册后需要点击邮箱中的验证链接
- **数据备份**：应用会在本地 localStorage 保存备份，即使 Supabase 不可用也能继续学习

