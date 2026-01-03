# 管理员控制台使用指南

## 功能概述

管理员控制台提供以下功能：

- 📊 查看用户统计信息（总用户数、学习记录、活跃用户）
- 👥 查看用户列表和详细信息
- 🗑️ 删除用户及其数据
- 🔄 重置用户学习进度
- 🔍 搜索用户

## 设置步骤

### 1. 配置环境变量

在 `web/.env` 文件中添加管理员邮箱：

```bash
VITE_ADMIN_EMAIL=your_admin_email@example.com
```

或者复制示例文件：
```bash
cp web/.env.example web/.env
```

然后编辑 `.env` 文件，填写你的 Supabase 配置和管理员邮箱。

### 2. 设置数据库管理员权限

在 Supabase Dashboard 中：

1. 打开你的项目
2. 进入 SQL Editor
3. 运行 `supabase/migrations/001_initial_user_profiles_setup.sql` 脚本
4. 设置第一个管理员：

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your_admin_email@example.com';
```

### 3. 访问管理员控制台

启动开发服务器：
```bash
cd web
npm run dev
```

然后访问：
```
http://localhost:5173/admin
```

## 使用说明

### 查看用户统计

管理员控制台首页显示：
- **总用户数**：注册的用户总数
- **学习记录**：用户的学习进度记录总数
- **24小时活跃**：最近24小时有活动的用户数

### 管理用户

#### 搜索用户
在搜索框中输入用户ID或邮箱进行搜索。

#### 删除用户
点击用户右侧的"删除"按钮，确认后将删除：
- 该用户的所有学习进度数据
- 用户进度记录（user_progress 表中的数据）

**注意**：由于安全限制，前端无法直接删除 Supabase Auth 中的用户账户。如需完全删除用户，需要在 Supabase Dashboard 中手动操作或使用 Service Role Key。

#### 重置进度
点击"重置进度"按钮将清除用户的所有学习进度数据，但保留用户账户。

## 安全建议

### 前端限制

由于前端使用的是 Anon Key（公开密钥），存在以下限制：

1. **无法直接列出所有用户**：出于安全考虑，Supabase 不允许前端使用 Anon Key 查询 `auth.users` 表
2. **无法删除用户账户**：需要 Service Role Key 才能删除用户账户
3. **只能操作用户进度数据**：可以查询和删除 `user_progress` 表中的数据

### 推荐做法

1. **使用 Supabase Dashboard**：进行完整的用户管理操作
2. **实现后端 API**：如果需要完整的用户管理功能，建议：
   - 使用 Supabase Edge Functions
   - 或者使用其他后端服务（如 Node.js, Python 等）
   - 使用 Service Role Key 进行敏感操作

3. **设置环境变量**：
   - 在生产环境中，确保 `VITE_ADMIN_EMAIL` 设置正确
   - 不要将敏感信息（如 Service Role Key）暴露在前端

4. **定期备份**：定期备份数据库，防止误操作

5. **监控用户行为**：通过 Supabase Dashboard 的 Logs 和 Database 功能监控用户活动

## 扩展功能

### 使用数据库角色

角色信息已合并到 `user_profiles` 表中：

```sql
-- 查看用户角色
SELECT role, username, email, created_at
FROM user_profiles;

-- 添加管理员
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'new_admin@example.com';

-- 移除管理员
UPDATE user_profiles
SET role = 'user'
WHERE user_id = 'user_id_here';

-- 查看管理员列表
SELECT username, email, created_at
FROM user_profiles
WHERE role = 'admin';
```

### 查询用户统计

```sql
-- 查看用户数量统计
SELECT role, COUNT(*) as count
FROM user_profiles
GROUP BY role;

-- 查看最近注册的用户
SELECT username, email, created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
```

## 故障排除

### 无法访问管理员控制台

1. 检查环境变量是否正确设置
2. 确认当前登录邮箱与管理员邮箱匹配
3. 检查 `user_profiles` 表中该用户的 `role` 是否为 'admin'

### 看不到用户列表

由于前端限制，只能看到有学习进度的用户。如果需要查看所有用户，请：
- 使用 Supabase Dashboard 的 Authentication 页面
- 或实现后端 API

### 无法删除用户

前端只能删除用户进度数据。要完全删除用户：
- 访问 Supabase Dashboard
- 进入 Authentication → Users
- 找到用户并点击删除

## 数据库安全

### RLS (Row Level Security)

已为 `user_profiles` 表启用 RLS，确保：
- 任何人都可以读取用户资料
- 用户可以更新自己的资料（不包括角色）
- 只有管理员可以更新角色

### 权限说明

| 操作 | Anon Key | Service Role Key |
|------|----------|------------------|
| 查询用户进度 | ✅ | ✅ |
| 删除用户进度 | ✅ | ✅ |
| 查询用户列表（有进度） | ✅ | ✅ |
| 查询所有用户 | ❌ | ✅ |
| 删除用户账户 | ❌ | ✅ |
| 修改用户资料 | ✅ | ✅ |
| 修改用户角色 | 仅管理员 | ✅ |

## 未来改进

可以考虑添加以下功能：

1. **审计日志**：记录管理员的所有操作
2. **批量操作**：批量删除或重置用户
3. **数据导出**：导出用户数据为 CSV/Excel
4. **用户详情**：查看单个用户的详细学习记录
5. **违规检测**：自动检测异常用户行为
6. **IP 封禁**：封禁恶意 IP 地址

## 联系支持

如有问题，请检查：
- Supabase 文档：https://supabase.com/docs
- 项目 README：../README.md
