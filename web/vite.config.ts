import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 从环境变量获取仓库名称，默认为 'nl-words'
// 如果仓库名称不同，设置环境变量 VITE_BASE_PATH
const basePath = process.env.VITE_BASE_PATH || 'nl-words'
const base = process.env.NODE_ENV === 'production' ? `/${basePath}/` : '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
