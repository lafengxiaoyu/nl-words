import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

// 获取 base 路径，与 vite.config.ts 保持一致
// 在生产环境使用 /nl-words，开发环境使用空字符串
const getBasePath = () => {
  // 检查是否是开发环境（通过检查 hostname 或 mode）
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  
  if (!isDev && import.meta.env.PROD) {
    // 生产环境：从环境变量获取，默认为 'nl-words'
    const basePath = import.meta.env.VITE_BASE_PATH || 'nl-words'
    const basename = `/${basePath}`
    // 调试日志（生产环境可以移除）
    console.log('Router basename:', basename, 'VITE_BASE_PATH:', import.meta.env.VITE_BASE_PATH)
    return basename
  }
  // 开发环境：不使用 basename
  console.log('Development mode: basename is empty')
  return ''
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter basename={getBasePath()}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
} catch (error) {
  console.error('Failed to render app:', error)
  rootElement.innerHTML = `
    <div style="padding: 50px; text-align: center; font-family: sans-serif;">
      <h1>应用加载失败</h1>
      <p>请检查浏览器控制台的错误信息</p>
      <p style="color: red;">${error instanceof Error ? error.message : String(error)}</p>
    </div>
  `
}
