/**
 * 安全的 localStorage 包装函数
 * 处理配额错误和其他异常，避免应用崩溃
 */

export const safeLocalStorage = {
  /**
   * 安全地保存数据到 localStorage
   * 如果配额已满，返回 false 但不会抛出异常
   */
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage 配额已满，跳过本地存储。进度将保存在云端。')
      } else {
        console.error('localStorage 存储失败:', error)
      }
      return false
    }
  },

  /**
   * 安全地从 localStorage 读取数据
   */
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('localStorage 读取失败:', error)
      return null
    }
  },

  /**
   * 安全地从 localStorage 删除数据
   */
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('localStorage 删除失败:', error)
    }
  },

  /**
   * 安全地清空 localStorage
   */
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('localStorage 清空失败:', error)
    }
  }
}
