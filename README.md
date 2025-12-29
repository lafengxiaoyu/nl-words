# 🇳🇱 荷兰语单词学习应用

一个现代化的荷兰语单词学习应用，使用 React + TypeScript + Vite 构建，支持 Supabase 云端同步。

## ✨ 功能特性

- 📚 **丰富的单词库** - 包含词性、变形、例句等详细信息
- 🎯 **难度分级** - A1-C2 六个级别，适合不同水平的学习者
- 📊 **学习进度追踪** - 实时显示学习进度和统计
- ✅ **掌握标记** - 标记已掌握的单词
- 🔀 **随机排序** - 打乱单词顺序，增加学习挑战
- 💾 **数据同步** - 支持 Supabase 云端同步（可选）
- 📱 **响应式设计** - 完美适配手机和电脑
- 🚀 **自动部署** - GitHub Actions 自动部署到 GitHub Pages

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
cd web
npm install

# 启动开发服务器
npm run dev
```

### 环境变量配置

创建 `web/.env` 文件（可选，用于 Supabase 同步）：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 📦 部署

### GitHub Pages

项目已配置 GitHub Actions 自动部署：

1. 推送代码到 `main` 分支
2. GitHub Actions 会自动构建并部署
3. 访问：`https://<你的用户名>.github.io/nl-words/`

详细说明请查看 [GitHub Pages 设置指南](./GITHUB_PAGES_SETUP.md)

### 其他平台

- **Vercel**: 导入仓库，自动部署
- **Netlify**: 导入仓库，设置构建目录为 `web`
- **Cloudflare Pages**: 导入仓库，设置构建命令为 `cd web && npm run build`

## 📖 使用说明

### 基本操作

1. **查看单词**：页面中央显示荷兰语单词卡片
2. **翻转卡片**：点击卡片查看中文翻译
3. **切换单词**：使用"上一个"和"下一个"按钮浏览单词
4. **标记掌握**：点击"标记掌握"按钮标记已学会的单词
5. **查看进度**：点击"显示统计"查看详细学习数据

### 高级功能

- **难度筛选**：点击顶部的难度按钮（A1-A2, B1-B2, C1-C2）筛选单词
- **随机排序**：点击"🔀 随机排序"打乱单词顺序
- **查看详情**：点击"显示详情"查看完整的词性信息、例句等
- **熟悉程度**：设置单词的熟悉程度（新词/学习中/熟悉/已掌握）
- **云端同步**：登录后可以同步学习进度到云端

## 🗂️ 项目结构

```
nl-words/
├── web/                    # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── data/           # 单词数据（JSON格式）
│   │   ├── lib/            # 工具函数（Supabase等）
│   │   └── ...
│   ├── .github/            # GitHub Actions 工作流
│   └── ...
└── README.md
```

## 🔧 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Supabase** - 后端服务（认证和数据库）
- **GitHub Actions** - CI/CD

## 📝 添加单词

编辑 `web/src/data/words.json` 文件，按照现有格式添加新单词。详细说明请查看 [数据文件说明](./web/src/data/README.md)

## 🔐 Supabase 设置

如果需要使用云端同步功能，请按照 [Supabase 设置指南](./web/SUPABASE_SETUP.md) 进行配置。

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 如果不配置 Supabase，应用会以游客模式运行，学习进度仅保存在本地浏览器中。


