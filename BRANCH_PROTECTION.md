# 分支保护规则设置指南

## 📋 概述

为了确保代码质量，需要配置GitHub分支保护规则，只有通过所有检查的PR才能合并到main分支。

## 🛡️ 分支保护规则配置

### 1. 进入分支保护设置

1. 访问：`https://github.com/lafengxiaoyu/nl-words/settings/branches`
2. 点击 "Add branch protection rule"
3. 在 "Branch name pattern" 中输入：`main`
4. 或者选择现有的 "main" 分支

### 2. 配置保护规则

#### 🔴 必须启用的选项

✅ **Require status checks to pass before merging**
- 启用此选项后，只有所有检查通过的PR才能合并

✅ **Require branches to be up to date before merging**
- 确保PR基于最新的main分支

#### 📋 需要选择的状态检查

在 "Status checks that are required" 中搜索并选择以下检查：

1. **quality-check** (来自 PR Status Check 工作流)
2. **lint** (来自 Deploy 工作流中的 lint job)
3. **build** (来自 Deploy 工作流中的 build job)
4. **deploy** (来自 Deploy 工作流 - 如果需要部署检查)

#### 🚫 推荐禁用的选项

❌ **Allow force pushes** - 不要启用，防止强制推送
❌ **Allow deletions** - 不要启用，防止意外删除主分支

### 3. 额外保护选项（推荐）

✅ **Require pull request reviews before merging**
- 设置需要的审查人数（建议1人）
- 启用 "Dismiss stale PR approvals when new commits are pushed"

✅ **Require conversation resolution before merging**
- 确保所有讨论都有结论后才能合并

## 🔄 工作流程

### 提交PR的完整流程

1. **创建PR**
   - 从feature分支向main分支提交PR
   - 自动触发状态检查工作流

2. **自动检查执行**
   - `lint`: 运行ESLint和TypeScript检查
   - `build`: 尝试构建项目
   - `quality-check`: 综合质量检查并评论PR

3. **检查结果**
   - ✅ 所有检查通过 → PR可以合并
   - ❌ 任何检查失败 → 需要修复后重新提交

4. **合并**
   - 只有在所有必需的状态检查都通过后
   - 合并按钮才会变为可点击状态

## 🚨 常见问题

### Q: PR一直显示"pending"状态？
A: 检查GitHub Actions是否正在运行，有时需要等待几分钟。

### Q: 状态检查失败但不显示具体错误？
A: 点击失败的检查项查看详细日志，或检查Actions标签页。

### Q: 如何绕过保护规则？
A: 只有仓库管理员可以临时禁用保护规则，但不推荐这样做。

### Q: 如何添加新的状态检查？
A: 在GitHub Actions工作流中添加新的job，然后在分支保护规则中选择该检查。

## 📝 最佳实践

1. **提交前本地检查**：
   ```bash
   npm run lint        # 检查代码风格
   npm run build      # 检查构建
   ```

2. **小步提交**：
   - 避免大型PR，减少检查失败的影响范围

3. **及时修复**：
   - 发现检查失败后立即修复，不要让失败的PR堆积

4. **定期更新**：
   - 定期rebase到最新的main分支

---

⚡ 配置完成后，代码质量和项目稳定性将得到有效保障！