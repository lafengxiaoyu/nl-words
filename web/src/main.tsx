import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
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
