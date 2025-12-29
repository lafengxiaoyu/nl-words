# 数据库迁移指南 - 学习统计功能

本文档说明如何更新 Supabase 数据库以支持新的学习统计功能。

## 数据库表结构更新

需要在 `user_progress` 表中添加以下字段来记录学习统计信息：

### SQL 迁移脚本

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 添加学习统计字段到 user_progress 表
ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mastered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unmastered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS test_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS test_correct_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS test_wrong_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

-- 为统计字段添加注释
COMMENT ON COLUMN user_progress.view_count IS '单词被查看的次数';
COMMENT ON COLUMN user_progress.mastered_count IS '标记为掌握的次数';
COMMENT ON COLUMN user_progress.unmastered_count IS '标记为未掌握的次数';
COMMENT ON COLUMN user_progress.test_count IS '测试次数';
COMMENT ON COLUMN user_progress.test_correct_count IS '测试做对的次数';
COMMENT ON COLUMN user_progress.test_wrong_count IS '测试做错的次数';
COMMENT ON COLUMN user_progress.last_viewed_at IS '最后查看时间';
COMMENT ON COLUMN user_progress.last_tested_at IS '最后测试时间';

-- 更新现有记录的默认值
UPDATE user_progress
SET 
  view_count = 0,
  mastered_count = 0,
  unmastered_count = 0,
  test_count = 0,
  test_correct_count = 0,
  test_wrong_count = 0
WHERE view_count IS NULL;
```

## 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `view_count` | INTEGER | 单词被查看的次数 |
| `mastered_count` | INTEGER | 标记为掌握的次数 |
| `unmastered_count` | INTEGER | 标记为未掌握的次数 |
| `test_count` | INTEGER | 测试次数 |
| `test_correct_count` | INTEGER | 测试做对的次数 |
| `test_wrong_count` | INTEGER | 测试做错的次数 |
| `last_viewed_at` | TIMESTAMPTZ | 最后查看时间 |
| `last_tested_at` | TIMESTAMPTZ | 最后测试时间 |

## 完整表结构

更新后的 `user_progress` 表结构：

```sql
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL,
  mastered BOOLEAN DEFAULT false,
  familiarity TEXT DEFAULT 'new',
  view_count INTEGER DEFAULT 0,
  mastered_count INTEGER DEFAULT 0,
  unmastered_count INTEGER DEFAULT 0,
  test_count INTEGER DEFAULT 0,
  test_correct_count INTEGER DEFAULT 0,
  test_wrong_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_word_id ON user_progress(word_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_updated_at ON user_progress(updated_at);
```

## Row Level Security (RLS) 策略

确保 RLS 策略已正确配置（如果之前已设置，无需修改）：

```sql
-- 启用 RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的进度
CREATE POLICY "Users can view their own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
  ON user_progress FOR DELETE
  USING (auth.uid() = user_id);
```

## 迁移步骤

1. **登录 Supabase Dashboard**
   - 访问 https://app.supabase.com
   - 选择你的项目

2. **打开 SQL Editor**
   - 在左侧菜单中点击 "SQL Editor"
   - 点击 "New query"

3. **执行迁移脚本**
   - 复制上面的 SQL 迁移脚本
   - 粘贴到 SQL Editor
   - 点击 "Run" 执行

4. **验证迁移**
   - 在 "Table Editor" 中查看 `user_progress` 表
   - 确认新字段已添加
   - 检查现有数据是否正确

## 注意事项

- 迁移不会影响现有数据
- 所有新字段都有默认值（0 或 NULL）
- 现有记录的统计字段会被初始化为 0
- 迁移是向后兼容的，不会破坏现有功能

## 测试

迁移完成后，可以：

1. 登录应用
2. 查看几个单词（应该自动记录 `view_count`）
3. 标记一些单词为掌握/未掌握（应该记录 `mastered_count` 或 `unmastered_count`）
4. 在详情面板中查看统计信息
5. 检查 Supabase 数据库确认数据已正确保存

## 回滚（如果需要）

如果需要回滚迁移，可以执行：

```sql
ALTER TABLE user_progress
DROP COLUMN IF EXISTS view_count,
DROP COLUMN IF EXISTS mastered_count,
DROP COLUMN IF EXISTS unmastered_count,
DROP COLUMN IF EXISTS test_count,
DROP COLUMN IF EXISTS test_correct_count,
DROP COLUMN IF EXISTS test_wrong_count,
DROP COLUMN IF EXISTS last_viewed_at,
DROP COLUMN IF EXISTS last_tested_at;
```

**注意**：回滚会永久删除所有统计数据，请谨慎操作。

