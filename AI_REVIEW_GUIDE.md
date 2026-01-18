# AI Code Review 使用指南

本项目集成了免费的 AI 代码审查功能,使用 Groq 提供的快速免费 LLM API。

## 功能特点

- ✅ **完全免费**: Groq 提供免费的 API 额度
- 🚀 **超快速度**: Groq 的推理速度业界领先
- 🎯 **智能审查**: 自动分析代码质量、潜在 Bug、性能问题等
- 📝 **详细反馈**: 提供具体的问题说明和改进建议
- 🔍 **灵活使用**: 可审查单个文件或整个项目

## 快速开始

### 1. 获取 Groq API Key

1. 访问 [Groq Console](https://console.groq.com/keys)
2. 注册/登录账号
3. 创建新的 API Key
4. 复制生成的 API Key

### 2. 配置环境变量

**方式 1: 创建 `.env` 文件**

在项目根目录创建 `.env` 文件:

```bash
GROQ_API_KEY=your_api_key_here
```

**方式 2: 临时设置**

```bash
export GROQ_API_KEY=your_api_key_here
```

### 3. 运行代码审查

```bash
# 审查所有 TypeScript/JavaScript 文件
npm run ai-review

# 审查指定文件
npm run ai-review -- web/src/App.tsx

# 审查多个文件
npm run ai-review -- web/src/App.tsx web/src/components/Header.tsx
```

## 审查内容

AI 审查会关注以下方面:

### 1. 代码质量
- 可读性和可维护性
- 代码组织和结构
- 命名规范

### 2. 潜在 Bug
- 逻辑错误
- 边界情况
- 常见错误模式

### 3. 性能优化
- 性能瓶颈
- 优化机会
- 资源使用

### 4. 安全性
- 安全漏洞
- 潜在风险
- 数据验证

### 5. 类型安全
- TypeScript 类型使用
- 类型错误风险
- 类型定义完整性

### 6. 最佳实践
- 框架特定规范
- 语言最佳实践
- 团队编码标准

## 输出格式

审查结果按以下格式输出:

```
✅ Strengths
   - 代码结构清晰,组件分离合理
   - 使用了适当的 TypeScript 类型

⚠️ Issues
   - Critical: 未处理的异步错误
   - Major: 缺少输入验证
   - Minor: 变量命名不一致

💡 Suggestions
   - 考虑使用 React.memo 优化性能
   - 添加错误边界组件

📝 Code Examples
   ```typescript
   // 建议的代码修改
   ```
```

## 支持的模型

脚本默认使用 `llama-3.3-70b-versatile` 模型,这是 Groq 最推荐的免费模型。

可用模型:
- `llama-3.3-70b-versatile` (推荐 - 70B 参数,最强大)
- `llama-3.1-8b-instant` (快速 - 8B 参数,响应更快)
- `mixtral-8x7b-32768` (Mixtral - 8x7B Mixture of Experts)

脚本会自动在这些模型间轮换,避免速率限制。

## 最佳实践

### 1. 定期审查
- 在提交代码前运行审查
- 重要功能开发后进行审查
- 代码重构时审查

### 2. 结合其他工具
- 与 ESLint、TypeScript 编译器配合使用
- 集成到 CI/CD 流程
- 作为 pre-commit hook 的一部分

### 3. 处理审查结果
- 优先处理 Critical 级别的问题
- 评估 Major 问题的业务影响
- 根据团队规范决定是否处理 Minor 问题

## 常见问题

### Q: API Key 在哪里存储最安全?

**A:** 推荐使用环境变量或 `.env` 文件,并将 `.env` 添加到 `.gitignore`。

### Q: 审查速度慢怎么办?

**A:** Groq 的速度已经很快了,如果觉得慢,可以:
- 一次审查较少的文件
- 使用 `--` 参数指定特定文件
- 脚本已自动处理速率限制,无需手动干预

### Q: 审查结果不准确怎么办?

**A:** AI 审查是辅助工具,应该:
- 结合人工判断
- 对关键代码进行额外测试
- 参考团队其他成员的意见

### Q: 是否支持其他语言?

**A:** 目前主要针对 TypeScript/JavaScript,但可以审查任何文本代码文件。

## 集成到工作流

### Pre-commit Hook

在 `package.json` 中添加:

```json
{
  "scripts": {
    "pre-commit": "npm run lint && npm run ai-review"
  }
}
```

### VSCode 任务

在 `.vscode/tasks.json` 中添加:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AI Review Current File",
      "type": "shell",
      "command": "npm run ai-review -- ${file}",
      "problemMatcher": []
    }
  ]
}
```

### GitHub Actions 集成

项目已配置 GitHub Actions 工作流,自动在 PR 时进行 AI 代码审查。

#### 配置步骤

1. **设置 GitHub Secret**

   在 GitHub 仓库中设置 Groq API Key:

   - 进入仓库: `Settings` → `Secrets and variables` → `Actions`
   - 点击 `New repository secret`
   - Name: `GROQ_API_KEY`
   - Value: 你的 Groq API Key

2. **触发方式**

   工作流会自动在以下情况触发:

   - **PR 创建/更新时**: 自动审查变更的 TypeScript/JavaScript 文件
   - **手动触发**: 在 Actions 页面点击 "Run workflow",可以指定文件路径

3. **审查结果**

   - 结果会自动作为评论添加到 PR
   - 如果已有 AI Review 评论,会更新而不是创建新评论
   - 审查报告会作为 artifact 保存 30 天

4. **工作流特性**

   - ✅ 只审查变更的文件,提高效率
   - ✅ 自动过滤测试文件和类型声明文件
   - ✅ 支持手动触发审查指定文件
   - ✅ 审查结果包含触发者、PR 信息、提交哈希等元数据
   - ✅ 失败时仍会上传审查报告

#### 工作流文件位置

`.github/workflows/ai-review.yml`

#### 手动触发工作流

1. 进入 GitHub 仓库的 `Actions` 标签
2. 选择 `AI Code Review` 工作流
3. 点击 `Run workflow`
4. 可选: 输入要审查的文件路径(留空则审查所有)
5. 点击绿色的 `Run workflow` 按钮

## 限制说明

- **免费额度**: Groq 提供的免费 API 额度有速率限制
- **上下文长度**: 单次审查受模型上下文长度限制
- **准确性**: AI 审查结果需要人工验证,不能完全依赖
- **速率限制**: 免费版每分钟有 12,000 tokens 的限制,脚本已自动处理:
  - 自动重试机制(最多 3 次)
  - 智能延迟(自动从错误消息中提取等待时间)
  - 模型轮换(自动切换到其他可用模型)
  - 请求间默认延迟 1.5 秒

## 更多资源

- [Groq 官网](https://groq.com)
- [Groq API 文档](https://console.groq.com/docs)
- [Llama 3 模型介绍](https://llama.meta.com/)

## 反馈与改进

如有问题或建议,欢迎提 Issue 或 PR!
