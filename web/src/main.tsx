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
// Vite 会自动提供 BASE_URL，它基于 vite.config.ts 中的 base 配置
// 例如：/nl-words/ 或 /
const getBasePath = () => {
  // import.meta.env.BASE_URL 是 Vite 自动提供的，基于 vite.config.ts 的 base 配置
  // 它会包含尾部斜杠，但 BrowserRouter 的 basename 不需要尾部斜杠
  const baseUrl = import.meta.env.BASE_URL
  // 移除尾部斜杠（如果存在）
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
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
