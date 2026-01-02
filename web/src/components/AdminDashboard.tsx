import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminDashboard.css'

interface AdminUser {
  id: string
  email?: string
  username?: string
  created_at: string
  last_sign_in_at?: string
  user_metadata?: {
    name?: string
    full_name?: string
  }
  app_metadata?: {
    role?: string
    provider?: string
  }
  is_admin?: boolean
}

interface AdminStats {
  totalUsers: number
  totalProgress: number
  activeUsers24h: number
  recentSignups: number
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProgress: 0,
    activeUsers24h: 0,
    recentSignups: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''

  useEffect(() => {
    checkAdminAndLoadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/auth')
        return
      }

      // 检查是否是管理员（从 user_profiles 表获取）
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const isAdmin = user.email === ADMIN_EMAIL ||
                      profile?.role === 'admin' ||
                      user.user_metadata?.role === 'admin' ||
                      user.app_metadata?.role === 'admin'

      if (!isAdmin) {
        showMessage('error', '您没有管理员权限')
        setTimeout(() => navigate('/'), 2000)
        return
      }

      const userCount = await loadUsers(user.id)
      await loadStats(userCount)
    } catch (err) {
      console.error('检查管理员权限失败:', err)
      setError('加载失败')
    }
  }

  const loadUsers = async (adminUserId: string) => {
    try {
      setLoading(true)

      // 查询用户进度表获取用户列表
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id, updated_at, familiarity')

      if (progressError) {
        console.error('加载用户失败:', progressError)
        throw progressError
      }

      // 获取唯一用户ID列表
      const uniqueUserIds = [...new Set(progressData?.map(p => p.user_id) || [])]

      // 从 user_profiles 表获取用户信息
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, email, created_at, role')
        .in('user_id', uniqueUserIds)

      if (profilesError) {
        console.error('加载用户资料失败:', profilesError)
      }

      // 合并数据
      const adminUsers: AdminUser[] = uniqueUserIds.map(userId => {
        const profile = profilesData?.find(p => p.user_id === userId)
        const progress = progressData?.find(p => p.user_id === userId)
        return {
          id: userId,
          email: profile?.email || 'user@example.com',
          username: profile?.username,
          created_at: profile?.created_at || new Date().toISOString(),
          last_sign_in_at: progress?.updated_at,
          is_admin: profile?.role === 'admin'
        }
      })

      setUsers(adminUsers)
      return uniqueUserIds.length // 返回用户数量用于统计
    } catch (err) {
      console.error('加载用户失败:', err)
      showMessage('error', '加载用户列表失败')
      return 0
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (userCount: number = 0) => {
    try {
      // 统计总学习记录数
      const { count: totalProgressCount } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })

      // 统计最近24小时活跃用户
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: activeUsersCount } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', oneDayAgo)

      setStats({
        totalUsers: userCount,
        totalProgress: totalProgressCount || 0,
        activeUsers24h: activeUsersCount || 0,
        recentSignups: 0 // 前端无法获取注册信息
      })
    } catch (err) {
      console.error('加载统计失败:', err)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      // 删除用户的所有进度数据
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      showMessage('success', '用户数据已删除')
      setShowDeleteConfirm(false)
      setSelectedUser(null)
      await loadUsers()
      await loadStats()
    } catch (err) {
      console.error('删除用户失败:', err)
      showMessage('error', '删除用户失败')
    }
  }

  const handleResetUserProgress = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      showMessage('success', '用户进度已重置')
      await loadStats()
    } catch (err) {
      console.error('重置进度失败:', err)
      showMessage('error', '重置进度失败')
    }
  }

  const filteredUsers = users.filter(user =>
    user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>🛡️ 管理员控制台</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">总用户数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalProgress}</div>
            <div className="stat-label">学习记录</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeUsers24h}</div>
            <div className="stat-label">24小时活跃</div>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索用户..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* 用户列表 */}
      <div className="users-section">
        <h2>用户列表</h2>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>用户ID</th>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>创建时间</th>
                  <th>最后活跃</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      {searchQuery ? '未找到匹配的用户' : '暂无用户数据'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="user-id">{user.id.substring(0, 8)}...</td>
                      <td>{user.username || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>{formatDate(user.last_sign_in_at)}</td>
                      <td>
                        {user.is_admin ? (
                          <span className="badge badge-admin">管理员</span>
                        ) : (
                          <span className="badge badge-user">普通用户</span>
                        )}
                      </td>
                      <td className="actions">
                        {!user.is_admin && (
                          <>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => {
                                setSelectedUser(user)
                                setShowDeleteConfirm(true)
                              }}
                            >
                              删除
                            </button>
                            <button
                              className="btn btn-small btn-warning"
                              onClick={() => handleResetUserProgress(user.id)}
                            >
                              重置进度
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 安全提示 */}
      <div className="security-notice">
        <h3>⚠️ 安全提示</h3>
        <ul>
          <li>前端只能访问匿名数据和用户进度数据，无法直接管理用户账户</li>
          <li>如需完整的用户管理功能，建议使用 Supabase Dashboard 或实现后端 API</li>
          <li>可以设置环境变量 VITE_ADMIN_EMAIL 来指定管理员邮箱</li>
          <li>建议定期备份数据库，防止恶意操作</li>
        </ul>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除用户 {selectedUser.email || selectedUser.id.substring(0, 8)} 的所有数据吗？</p>
            <p className="warning">此操作不可撤销！</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteUser(selectedUser.id)}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
