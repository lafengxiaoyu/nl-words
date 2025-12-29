# GitHub Pages 部署指南

## 快速开始

### 1. 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Pages**
3. 在 **Source** 部分：
   - 选择 **GitHub Actions** 作为源
4. 保存设置

### 2. 配置环境变量（可选）

如果你的应用使用了 Supabase，需要在 GitHub 仓库中设置 Secrets：

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下 secrets：
   - `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: 你的 Supabase Anon Key

### 3. 推送代码

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

### 4. 查看部署

1. 进入 **Actions** 标签页查看部署状态
2. 部署完成后，访问：`https://<你的用户名>.github.io/nl-words/`

## 工作流说明

### 主分支部署 (`deploy.yml`)

- **触发条件**: 推送到 `main` 或 `master` 分支
- **操作**: 
  1. 构建项目
  2. 自动部署到 GitHub Pages
- **访问地址**: `https://<用户名>.github.io/nl-words/`

### PR 预览 (`pr-preview.yml`)

- **触发条件**: 创建或更新 Pull Request
- **操作**:
  1. 构建项目
  2. 在 PR 中评论构建状态
- **注意**: GitHub Pages 不支持 PR 预览，如果需要预览功能，建议使用 Vercel 或 Netlify

## 自定义配置

### 修改仓库名称

如果你的仓库名称不是 `nl-words`，需要修改：

1. **vite.config.ts**:
```typescript
base: process.env.NODE_ENV === 'production' ? '/你的仓库名/' : '/',
```

2. **.github/workflows/deploy.yml**:
   - 不需要修改，会自动使用仓库名称

### 使用自定义域名

1. 在仓库根目录创建 `CNAME` 文件，内容为你的域名
2. 在 GitHub Pages 设置中配置自定义域名

## 故障排查

### 部署失败

1. 检查 **Actions** 标签页中的错误信息
2. 确认环境变量是否正确设置
3. 检查构建日志

### 页面空白

1. 检查 `vite.config.ts` 中的 `base` 配置是否正确
2. 确认所有资源路径使用相对路径
3. 检查浏览器控制台的错误信息

### 环境变量未生效

- GitHub Pages 是静态站点，环境变量只在构建时使用
- 确保在 GitHub Secrets 中设置了所有需要的环境变量
- 注意：不要在代码中直接使用环境变量值，它们会被打包到构建产物中

## 高级选项

### 使用 Vercel 进行 PR 预览

如果你想要更好的 PR 预览体验，可以集成 Vercel：

1. 访问 [Vercel](https://vercel.com)
2. 导入你的 GitHub 仓库
3. 配置构建设置：
   - **Framework Preset**: Vite
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

Vercel 会自动为每个 PR 创建预览链接。

### 使用 Netlify 进行 PR 预览

1. 访问 [Netlify](https://netlify.com)
2. 导入你的 GitHub 仓库
3. 配置构建设置：
   - **Base directory**: `web`
   - **Build command**: `npm run build`
   - **Publish directory**: `web/dist`

## 注意事项

- GitHub Pages 只支持静态文件，不支持服务端渲染
- 每次推送到主分支都会触发重新部署
- 部署通常需要几分钟时间
- 如果使用 Supabase，确保设置了正确的 CORS 配置


