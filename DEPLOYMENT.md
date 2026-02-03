# 部署流程

本项目使用 GitHub Pages 进行部署，部署流程已集成数据验证和同步。

## 部署流程图

```
┌─────────────────────────────────────────────────────────┐
│              部署前置条件（自动执行）                    │
├─────────────────────────────────────────────────────────┤
│ 1. 词汇数据验证 (validate:words)                        │
│    └─ 检查 words.json 格式、必填字段、词性规则等       │
│                                                         │
│ 2. 词汇数据同步 (vocabulary-pipeline)                   │
│    ├─ 重新生成索引 (generate-vocab-index)              │
│    │   ├─ 更新 words.json                              │
│    │   ├─ 更新 stats.json                              │
│    │   ├─ 更新 index.json                              │
│    │   ├─ 更新 lookup.json                             │
│    │   └─ 更新 all_words.txt                           │
│    └─ 验证数据同步 (validate-vocabulary-sync)          │
│                                                         │
│ 3. 代码质量检查                                         │
│    ├─ ESLint 检查                                      │
│    └─ TypeScript 类型检查                              │
├─────────────────────────────────────────────────────────┤
│              部署流程                                    │
├─────────────────────────────────────────────────────────┤
│ 4. 版本管理                                             │
│    └─ 自动递增版本号 (bump-version)                    │
│                                                         │
│ 5. 构建                                                 │
│    └─ Vite 构建项目                                    │
│                                                         │
│ 6. 部署                                                 │
│    └─ 推送到 GitHub Pages                              │
└─────────────────────────────────────────────────────────┘
```

## 触发方式

### 方式一：本地部署脚本（推荐）

```bash
# 部署到 GitHub Pages（自动判断版本号）
node scripts/deploy-to-pages.cjs

# 或指定版本号类型
node scripts/deploy-to-pages.cjs patch  # 补丁版本
node scripts/deploy-to-pages.cjs minor  # 次要版本
node scripts/deploy-to-pages.cjs major  # 主要版本
```

**脚本执行流程**：
1. 验证词汇数据（`npm run validate:words`）
2. 同步词汇数据（`node scripts/vocabulary-pipeline.cjs`）
3. 递增版本号
4. 提交并推送所有变更
5. 推送 Git 标签触发 GitHub Actions 部署

### 方式二：GitHub Actions 自动部署

当推送代码到 `main` 或 `master` 分支时，自动触发部署。

**工作流程**：
1. 验证词汇数据
2. 同步词汇数据
3. ESLint 检查
4. TypeScript 类型检查
5. 构建项目
6. 部署到 GitHub Pages

### 方式三：手动触发

```bash
# 仅验证词汇数据
npm run validate:words

# 仅同步词汇数据（生成索引）
node scripts/vocabulary-pipeline.cjs

# 验证 + 同步（pre-commit）
npm run pre-commit
```

## 验证和同步说明

### 词汇数据验证 (`validate:words`)

验证 `web/src/data/words.json` 中的单词数据：

- **必填字段**：id、word、translation、partOfSpeech、examples、difficulty
- **数据完整性**：检查重复 id、重复单词
- **词性规则**：
  - 名词必须有 `forms.noun`（article、singular、plural）
  - 动词必须有 `forms.verb`（infinitive、present、past、pastParticiple、isSeparable）
  - 形容词必须有 `forms.adjective`（base、withDe、withHet、comparative、superlative）
- **翻译完整性**：中英文翻译必须完整
- **示例句子**：必须包含例句

### 词汇数据同步 (`vocabulary-pipeline`)

同步词汇数据到各个索引文件：

- **`words.json`** - 完整的单词列表（源数据）
- **`stats.json`** - 按难度级别统计单词数量
- **`index.json`** - 按课程索引的单词列表
- **`lookup.json`** - 按单词查询的映射表
- **`all_words.txt`** - 所有单词的纯文本列表

## 版本管理

版本号格式：`MAJOR.MINOR.PATCH`

- **MAJOR** - 重大功能变更
- **MINOR** - 新功能添加
- **PATCH** - Bug 修复和数据更新

版本号自动判断规则：
- Commit 包含 "major" → MAJOR 版本递增
- Commit 包含 "feature" 或 "feat" → MINOR 版本递增
- 其他情况 → PATCH 版本递增

## 常见问题

### Q: 部署失败，提示词汇验证错误？

A: 运行 `npm run validate:words` 查看具体错误，根据提示修正 `words.json` 中的数据格式问题。

### Q: 修改了单词数据，需要手动同步吗？

A: 不需要，部署前会自动执行 `vocabulary-pipeline` 同步所有数据。

### Q: 可以在提交代码前手动验证吗？

A: 可以，运行 `npm run pre-commit` 会执行完整的验证和同步流程。

### Q: 如何跳过验证直接部署？

A: **不建议跳过验证**，数据验证是保证应用正常运行的重要步骤。如果确实需要，可以手动修改工作流文件，但可能导致数据不一致。

## 相关文件

- `.github/workflows/deploy.yml` - GitHub Actions 部署工作流
- `scripts/deploy-to-pages.cjs` - 本地部署脚本
- `scripts/validate-words.cjs` - 词汇数据验证脚本
- `scripts/vocabulary-pipeline.cjs` - 词汇数据同步脚本
- `scripts/generate-vocab-index.cjs` - 索引生成脚本
- `WORD_VALIDATION_RULES.md` - 详细的验证规则说明
