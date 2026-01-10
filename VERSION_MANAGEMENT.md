# 版本管理指南

本项目使用轻量级版本控制系统，适合 GitHub Pages 部署。

## 📦 版本号规则

版本号遵循 **语义化版本控制 (Semantic Versioning)** 规范：
- `MAJOR.MINOR.PATCH` (例如: 1.0.0)
  - **MAJOR**: 不兼容的 API 修改
  - **MINOR**: 向下兼容的功能性新增
  - **PATCH**: 向下兼容的问题修正

## 🚀 使用方法

### 1. 递增版本号

#### 自动判断（推荐）

根据 commit message 自动判断版本类型：

```bash
# 提交代码
git commit -m "feat: 添加了新功能"
npm run version
# → 自动递增次要版本 (1.0.0 -> 1.1.0)

git commit -m "fix: 修复了一个 bug"
npm run version
# → 自动递增补丁版本 (1.0.0 -> 1.0.1)

git commit -m "major: 重构了整个系统"
npm run version
# → 自动递增主要版本 (1.0.0 -> 2.0.0)
```

**自动判断规则：**
- commit message 包含 `major` → 递增主要版本
- commit message 包含 `feature` 或 `feat` → 递增次要版本
- commit message 包含 `patch` 或 `fix` 或其他 → 递增补丁版本（默认）

#### 手动指定

也可以显式指定版本类型：

```bash
# 递增补丁版本 (1.0.0 -> 1.0.1)
npm run version:patch

# 递增次要版本 (1.0.0 -> 1.1.0)
npm run version:minor

# 递增主要版本 (1.0.0 -> 2.0.0)
npm run version:major
```

版本递增后，系统会自动：
- 更新 `version.json` 中的版本号
- 创建 Git 标签 (vX.Y.Z)
- 记录构建时间、Git 提交和分支信息

### 2. 构建项目

每次构建时，会自动更新构建信息：

```bash
npm run build
```

构建过程会：
- 更新构建时间和 Git 信息到 `version.json`
- 更新 `package.json` 中的版本号
- 生成版本常量文件 `web/src/lib/version.ts`

### 3. 查看当前版本

```bash
# 显示当前版本号
npm run version:info

# 或直接查看
cat version.json
```

### 4. 查看 Git 标签历史

使用 Git 命令查看所有版本标签：

```bash
# 查看所有标签
git tag -l

# 查看标签详情
git show v1.0.0

# 按日期排序
git tag -l --sort=-v:refname
```

### 5. 回滚到指定版本

使用 Git checkout 回滚到历史版本：

```bash
# 查看所有版本
git tag -l

# 回滚到指定版本（查看代码）
git checkout v1.0.0

# 恢复到主分支
git checkout main
```

## 📁 版本相关文件

### `version.json`
存储版本信息和构建数据：

```json
{
  "version": "1.0.0",
  "buildDate": "2026-01-10T00:00:00.000Z",
  "gitCommit": "abc1234",
  "gitBranch": "main"
}
```

### `web/src/lib/version.ts`
自动生成的版本常量文件，可在代码中引用：

```typescript
import { VERSION } from './lib/version'

console.log(VERSION.version)      // "1.0.0"
console.log(VERSION.buildDate)    // "2026-01-10T00:00:00.000Z"
console.log(VERSION.gitCommit)    // "abc1234"
console.log(VERSION.gitBranch)    // "main"
```

## 🎨 在应用中显示版本

使用 `VersionDisplay` 组件在应用中显示版本信息：

```tsx
import VersionDisplay from './components/VersionDisplay'

function App() {
  return (
    <div>
      {/* 在页脚显示 */}
      <footer>
        <VersionDisplay languageMode="chinese" position="footer" />
      </footer>
    </div>
  )
}
```

## 📋 典型工作流程

### 方式一：使用自动判断（推荐）

1. 开发完成后，用合适的 commit message 提交
2. 运行 `npm run version`（自动判断）
3. 提交版本变更
4. 推送代码，自动部署

示例：

```bash
# 1. 开发新功能
git add .
git commit -m "feat: 添加了单词搜索功能"

# 2. 递增版本（自动判断为 minor）
npm run version

# 3. 提交版本变更
git add version.json
git commit -m "chore: bump version to 1.1.0"

# 4. 推送代码和标签（自动部署）
git push origin main
git push origin v1.1.0
```

### 方式二：使用一键部署

```bash
# 提交代码（commit message 会自动判断版本类型）
git add .
git commit -m "fix: 修复了拼写错误的 bug"

# 一键部署
npm run deploy
# → 自动递增版本 + 提交 + 推送 + 触发 GitHub Actions
```

## 🌐 GitHub Pages 部署

### 自动部署（推荐）

本项目已配置 GitHub Actions 自动部署，**不需要手动部署**：

- 推送到 `main` 分支 → 自动触发构建和部署
- 推送版本标签（如 `v1.0.0`）→ 自动触发构建和部署

**工作流程：**
1. 代码推送到 GitHub
2. GitHub Actions 自动构建项目
3. 自动部署到 GitHub Pages
4. 部署完成后可通过 `https://<username>.github.io/nl-words/` 访问

### 部署方式对比

#### 方式一：直接推送（日常开发）

```bash
# 开发完成后直接推送
git add .
git commit -m "fix: 修复了某个问题"
git push origin main
# → 自动触发 GitHub Actions 部署
```

#### 方式二：版本化部署（重要发布）

```bash
# 1. 递增版本
npm run version:patch    # 或 version:minor / version:major

# 2. 提交变更
git add .
git commit -m "release: v1.0.1"

# 3. 推送（自动部署）
git push origin main
git push origin v1.0.1    # 推送标签（可选，但推荐）

# → GitHub Actions 自动构建并部署
```

#### 方式三：手动指定版本类型

如果自动判断不符合预期，可以显式指定：

```bash
# 显式指定为补丁版本
npm run version:patch

# 显式指定为次要版本
npm run version:minor

# 显式指定为主要版本
npm run version:major
```

### 推荐的 Commit Message 格式

#### Conventional Commits 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，配合版本自动判断功能：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型（影响版本递增）

| Type | 版本类型 | 说明 |
|-------|---------|------|
| `feat` | **MINOR** | 新功能 |
| `fix` | **PATCH** | Bug 修复 |
| `major` | **MAJOR** | 破坏性变更（需显式使用） |
| `refactor` | **PATCH** | 代码重构 |
| `docs` | **PATCH** | 文档更新 |
| `style` | **PATCH** | 代码格式调整 |
| `test` | **PATCH** | 测试相关 |
| `chore` | **PATCH** | 构建/工具配置等 |

#### 示例

```bash
# 新功能 - 递增 minor 版本
git commit -m "feat(wordlist): 添加单词搜索功能
- 支持按荷兰语搜索
- 支持按翻译搜索
- 实时搜索结果"

# Bug 修复 - 递增 patch 版本
git commit -m "fix(auth): 修复登录时偶尔失败的问题
- 优化 token 刷新逻辑
- 添加重试机制"

# 文档更新 - 递增 patch 版本
git commit -m "docs: 更新 README 部署说明"

# 重大变更 - 递增 major 版本
git commit -m "major: 重构数据存储结构
breaking: 用户数据结构变更，需要重新导入"

# 代码重构 - 递增 patch 版本
git commit -m "refactor(supabase): 简化查询逻辑"
```

#### Commit Message 最佳实践

```bash
# ✅ 好的示例
git commit -m "feat: 添加单词收藏功能
- 用户可以收藏单词
- 收藏数据保存到本地存储
- 添加收藏列表页面"

git commit -m "fix: 修复移动端导航栏错位问题"

git commit -m "chore: 更新依赖包到最新版本"

# ❌ 不好的示例
git commit -m "修改了代码"           # 太模糊
git commit -m "fix bug"             # 没有说明具体问题
git commit -m "update"              # 没有类型
git commit -m "feat 新功能"         # 应该使用英文冒号分隔
```

### 查看部署状态

在 GitHub 仓库中：
1. 进入 **Actions** 标签页
2. 查看最新的部署工作流
3. 点击查看详细日志

部署完成后，GitHub Pages 会自动更新，无需额外操作。

## ⚠️ 注意事项

1. **版本只能递增**: 系统不允许直接降级版本号
2. **自动判断规则**:
   - commit message 包含 `major` → major version
   - commit message 包含 `feature` 或 `feat` → minor version
   - commit message 包含 `patch` 或 `fix` 或其他 → patch version (默认)
3. **Commit Message 规范**: 建议遵循 Conventional Commits 规范，使用 `type: description` 格式
4. **Git 标签**: 版本递增会自动创建 Git 标签，推送标签会触发 GitHub Actions 部署
5. **构建时更新**: 每次构建都会更新构建时间和 Git 信息
6. **GitHub Actions**: 推送到 main 分支会自动触发部署，无需手动操作
7. **部署时间**: GitHub Actions 构建和部署通常需要 2-5 分钟

## 📚 相关命令速查

```bash
# 版本管理
npm run version         # 自动判断并递增版本
npm run version:patch    # 递增补丁版本（显式）
npm run version:minor    # 递增次要版本（显式）
npm run version:major    # 递增主要版本（显式）
npm run version:info     # 显示当前版本
npm run deploy           # 一键部署（递增版本 + 触发 GitHub Actions）

# Git 标签管理
git tag -l              # 查看所有标签
git show v1.0.0         # 查看标签详情
git push origin v1.0.0   # 推送指定标签（触发部署）

# 构建相关
npm run build          # 构建项目（自动更新版本信息）

# 版本回滚
git checkout v1.0.0     # 查看历史版本代码
git checkout main       # 返回主分支
```
