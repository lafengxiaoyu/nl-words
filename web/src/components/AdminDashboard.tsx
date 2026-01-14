import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminDashboard.css'
import Chart from 'chart.js/auto'

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
  wordsLearned24h?: number
  subscription_tier?: 'free' | 'premium'
  subscription_status?: string
  totalApiCalls?: number
  callsToday?: number
  callsThisMonth?: number
}

interface AdminStats {
  totalUsers: number
  totalProgress: number
  activeUsers24h: number
  recentSignups: number
  inactiveUsers3m: number
  premiumUsers: number
  databaseSizeEstimate: string
}

interface SubscriptionUpdateData {
  subscription_tier: 'free' | 'premium';
  subscription_status?: 'active' | 'cancelled' | 'past_due' | 'expired';
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
}

interface ApiUsageLog {
  id: string
  user_id: string
  operation_type: string
  table_name: string
  created_at: string
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProgress: 0,
    activeUsers24h: 0,
    recentSignups: 0,
    inactiveUsers3m: 0,
    premiumUsers: 0,
    databaseSizeEstimate: '0 MB'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)
  const [selectedInactiveUsers, setSelectedInactiveUsers] = useState<Set<string>>(new Set())
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [showApiDetailsModal, setShowApiDetailsModal] = useState(false)
  const [apiDetailsUserId, setApiDetailsUserId] = useState<string | null>(null)
  const [apiDetailsLoading, setApiDetailsLoading] = useState(false)
  const [apiUsageLogs, setApiUsageLogs] = useState<ApiUsageLog[]>([])
  const chartRef = useRef<Chart | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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

      const adminUsers = await loadUsers()
      await loadStats(adminUsers)
    } catch (err) {
      console.error('检查管理员权限失败:', err)
      setError('加载失败')
    }
  }

  const loadUsers = async (): Promise<AdminUser[] | undefined> => {
    try {
      setLoading(true)

      // 使用 service role 获取所有用户资料（绕过 RLS）
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, email, created_at, role, subscription_tier, subscription_status')

      if (profilesError) {
        console.error('加载用户资料失败:', profilesError)
        throw profilesError
      }

      console.log('加载到的用户数量:', profilesData?.length || 0)

      // 获取用户ID列表
      const userIds = profilesData?.map(p => p.user_id) || []

      // 为每个用户获取最新的进度信息
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('user_id, updated_at')
        .in('user_id', userIds)

      console.log('加载到的进度记录数量:', progressData?.length || 0)

      // 计算过去24小时的时间
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // 构建用户数据（不加载 API 统计，设置为 null）
      const adminUsers: AdminUser[] = (profilesData || []).map(profile => {
        // 获取该用户的最新更新时间
        const userProgress = progressData
          ?.filter(p => p.user_id === profile.user_id)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

        // 计算过去24小时学习的词汇数量
        const wordsLearned24h = progressData?.filter(p =>
          p.user_id === profile.user_id && new Date(p.updated_at) >= new Date(oneDayAgo)
        ).length || 0

        return {
          id: profile.user_id,
          email: profile.email || 'user@example.com',
          username: profile.username,
          created_at: profile.created_at,
          last_sign_in_at: userProgress?.updated_at,
          is_admin: profile.role === 'admin',
          wordsLearned24h,
          subscription_tier: profile.subscription_tier as 'free' | 'premium',
          subscription_status: profile.subscription_status,
          totalApiCalls: undefined, // 默认不加载
          callsToday: undefined,
          callsThisMonth: undefined
        }
      })

      console.log('构建的用户列表长度:', adminUsers.length)
      setUsers(adminUsers)
      return adminUsers // 返回用户数组用于统计
    } catch (err) {
      console.error('加载用户失败:', err)
      showMessage('error', '加载用户列表失败')
      return undefined
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (usersList: AdminUser[] = []) => {
    try {
      // 统计总学习记录数
      const { count: totalProgressCount } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })

      console.log('总学习记录数:', totalProgressCount)

      // 统计最近24小时活跃用户（唯一用户数）
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: activeUsersData } = await supabase
        .from('user_progress')
        .select('user_id')
        .gt('updated_at', oneDayAgo)

      // 计算唯一活跃用户数
      const uniqueActiveUsers = new Set(activeUsersData?.map(u => u.user_id) || []).size

      console.log('24小时活跃用户数:', uniqueActiveUsers)
      console.log('用户列表长度:', usersList.length)

      // 统计三个月未活跃用户
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const inactiveUsers3m = usersList.filter(user => {
        const lastActivity = user.last_sign_in_at || user.created_at
        return new Date(lastActivity) < threeMonthsAgo
      }).length

      console.log('三个月未活跃用户数:', inactiveUsers3m)
      console.log('用户总数:', usersList.length)

      // 统计 Premium 用户数
      const premiumUsers = usersList.filter(user => 
        user.subscription_tier === 'premium' && 
        user.subscription_status === 'active'
      ).length

      // 估算数据库大小（假设每条 user_progress 记录约 1KB）
      const estimatedSizeMB = ((totalProgressCount || 0) * 1024) / (1024 * 1024)
      const databaseSizeEstimate = estimatedSizeMB < 1 
        ? '< 1 MB' 
        : estimatedSizeMB < 1024 
          ? `${estimatedSizeMB.toFixed(2)} MB`
          : `${(estimatedSizeMB / 1024).toFixed(2)} GB`

      setStats({
        totalUsers: usersList.length,
        totalProgress: totalProgressCount || 0,
        activeUsers24h: uniqueActiveUsers,
        recentSignups: 0,
        inactiveUsers3m,
        premiumUsers,
        databaseSizeEstimate
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
      const adminUsers = await loadUsers()
      await loadStats(adminUsers)
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
      const adminUsers = await loadUsers()
      await loadStats(adminUsers)
    } catch (err) {
      console.error('重置进度失败:', err)
      showMessage('error', '重置进度失败')
    }
  }

  const handleUpdateSubscription = async (
    userId: string,
    tier: 'free' | 'premium'
  ) => {
    try {
      const updateData: SubscriptionUpdateData = {
        subscription_tier: tier
      }

      if (tier === 'premium') {
        updateData.subscription_status = 'active'
        updateData.subscription_started_at = new Date().toISOString()
        updateData.subscription_ends_at = null
      } else {
        updateData.subscription_status = 'expired'
        updateData.subscription_ends_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)

      if (error) throw error

      showMessage('success', tier === 'premium' ? '用户已升级为 Premium' : '用户已降级为免费用户')
      const adminUsers = await loadUsers()
      await loadStats(adminUsers)
    } catch (err) {
      console.error('更新订阅失败:', err)
      showMessage('error', '更新订阅失败')
    }
  }

  const handleBatchDeleteInactive = async () => {
    try {
      if (selectedInactiveUsers.size === 0) {
        showMessage('error', '请先选择要删除的用户')
        return
      }

      const userIds = Array.from(selectedInactiveUsers)

      // 批量删除用户的所有进度数据
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .in('user_id', userIds)

      if (error) throw error

      showMessage('success', `已删除 ${userIds.length} 个用户的数据`)
      setSelectedInactiveUsers(new Set())
      setShowBatchDeleteConfirm(false)
      const adminUsers = await loadUsers()
      await loadStats(adminUsers)
    } catch (err) {
      console.error('批量删除失败:', err)
      showMessage('error', '批量删除失败')
    }
  }

  const toggleInactiveUserSelection = (userId: string) => {
    const newSelection = new Set(selectedInactiveUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedInactiveUsers(newSelection)
  }

  const selectAllInactiveUsers = () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const inactiveUsers = users.filter(user => {
      const lastActivity = user.last_sign_in_at || user.created_at
      return new Date(lastActivity) < threeMonthsAgo && !user.is_admin
    })
    setSelectedInactiveUsers(new Set(inactiveUsers.map(u => u.id)))
  }

  const clearInactiveUserSelection = () => {
    setSelectedInactiveUsers(new Set())
  }

  const loadUserApiDetails = async (userId: string) => {
    try {
      setApiDetailsLoading(true)
      setApiDetailsUserId(userId)
      setShowApiDetailsModal(true)

      const { data, error } = await supabase
        .from('api_usage_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100) // 只显示最近100条

      if (error) throw error
      setApiUsageLogs(data || [])

      // 计算操作类型统计
      const operationStats: Record<string, number> = {}
      data?.forEach(log => {
        operationStats[log.operation_type] = (operationStats[log.operation_type] || 0) + 1
      })

      // 创建图表
      if (canvasRef.current) {
        // 销毁旧图表
        if (chartRef.current) {
          chartRef.current.destroy()
        }

        const ctx = canvasRef.current.getContext('2d')
        if (ctx && Object.keys(operationStats).length > 0) {
          const labels = Object.keys(operationStats)
          const values = labels.map(label => operationStats[label])
          const colors = [
            'rgba(5, 150, 105, 0.8)',   // green for insert
            'rgba(37, 99, 235, 0.8)',   // blue for update
            'rgba(124, 58, 237, 0.8)',  // purple for select
            'rgba(239, 68, 68, 0.8)',   // red for delete
          ]

          chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [{
                label: '操作次数',
                data: values,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: {
                  display: false
                },
                title: {
                  display: true,
                  text: '操作类型分布（最近100条记录）'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }
          })
        }
      }
    } catch (err) {
      console.error('加载API详情失败:', err)
      showMessage('error', '加载API详情失败')
    } finally {
      setApiDetailsLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 计算三个月未活跃的用户
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const getInactiveStatus = (user: AdminUser) => {
    const lastActivity = user.last_sign_in_at || user.created_at
    return new Date(lastActivity) < threeMonthsAgo
  }

  // 筛选三个月未活跃的用户
  const displayUsers = showInactiveOnly
    ? filteredUsers.filter(user => getInactiveStatus(user) && !user.is_admin)
    : filteredUsers

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
        <div className="stat-card stat-card--premium">
          <div className="stat-icon">👑</div>
          <div className="stat-info">
            <div className="stat-value">{stats.premiumUsers}</div>
            <div className="stat-label">Premium用户</div>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.inactiveUsers3m}</div>
            <div className="stat-label">3个月未活跃</div>
          </div>
        </div>
        <div className="stat-card stat-card--storage">
          <div className="stat-icon">💾</div>
          <div className="stat-info">
            <div className="stat-value">{stats.databaseSizeEstimate}</div>
            <div className="stat-label">数据库大小</div>
          </div>
        </div>
      </div>

      {/* 搜索栏和筛选 */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索用户..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button
          className={`btn ${showInactiveOnly ? 'btn-warning' : 'btn-secondary'}`}
          onClick={() => {
            setShowInactiveOnly(!showInactiveOnly)
            setSelectedInactiveUsers(new Set())
          }}
        >
          {showInactiveOnly ? '显示所有用户' : `仅显示3个月未活跃用户 (${stats.inactiveUsers3m})`}
        </button>
      </div>

      {/* 批量操作栏（仅显示未活跃用户时显示） */}
      {showInactiveOnly && (
        <div className="batch-actions">
          <button className="btn btn-small btn-secondary" onClick={selectAllInactiveUsers}>
            全选
          </button>
          <button className="btn btn-small btn-secondary" onClick={clearInactiveUserSelection}>
            清除选择
          </button>
          <span className="selected-count">已选择 {selectedInactiveUsers.size} 个用户</span>
          {selectedInactiveUsers.size > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setShowBatchDeleteConfirm(true)}
            >
              批量删除
            </button>
          )}
        </div>
      )}

      {/* 用户列表 */}
      <div className="users-section">
        <h2>
          {showInactiveOnly ? '三个月未活跃用户' : '用户列表'}
        </h2>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  {showInactiveOnly && <th className="checkbox-column">选择</th>}
                  <th>用户ID</th>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>创建时间</th>
                  <th>最后活跃</th>
                  <th>24h学习</th>
                  <th>API调用</th>
                  <th>订阅</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.length === 0 ? (
                  <tr>
                    <td colSpan={showInactiveOnly ? 10 : 9} className="no-data">
                      {searchQuery ? '未找到匹配的用户' : (showInactiveOnly ? '暂无三个月未活跃用户' : '暂无用户数据')}
                    </td>
                  </tr>
                ) : (
                  displayUsers.map(user => (
                    <tr key={user.id} className={getInactiveStatus(user) ? 'user-row--inactive' : ''}>
                      {showInactiveOnly && (
                        <td className="checkbox-column">
                          <input
                            type="checkbox"
                            checked={selectedInactiveUsers.has(user.id)}
                            onChange={() => toggleInactiveUserSelection(user.id)}
                          />
                        </td>
                      )}
                      <td className="user-id">{user.id.substring(0, 8)}...</td>
                      <td>{user.username || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td className="datetime-field">{formatDate(user.created_at)}</td>
                      <td className="datetime-field">
                        {formatDate(user.last_sign_in_at)}
                        {getInactiveStatus(user) && (
                          <span className="inactive-badge">3个月未活跃</span>
                        )}
                      </td>
                      <td className="word-count-badge">{user.wordsLearned24h || 0}</td>
                      <td className="api-calls-cell">
                        <div
                          className="api-cells-clickable"
                          onClick={() => loadUserApiDetails(user.id)}
                          title="点击查看API调用详情"
                        >
                          {user.totalApiCalls !== undefined ? (
                            <div className="api-calls-info">
                              <div className="api-calls-total">{user.totalApiCalls || 0}</div>
                              <div className="api-calls-detail">
                                今日: {user.callsToday || 0} / 本月: {user.callsThisMonth || 0}
                              </div>
                            </div>
                          ) : (
                            <div className="api-calls-placeholder">查看详情</div>
                          )}
                        </div>
                      </td>
                      <td>
                        {user.subscription_tier === 'premium' ? (
                          <span className="badge badge-premium">👑 Premium</span>
                        ) : (
                          <span className="badge badge-free">免费</span>
                        )}
                      </td>
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
                            {user.subscription_tier === 'premium' ? (
                              <button
                                className="btn btn-small btn-warning"
                                onClick={() => {
                                  if (window.confirm(`确定要降级用户 ${user.email || user.username} 为免费用户吗？`)) {
                                    handleUpdateSubscription(user.id, 'free')
                                  }
                                }}
                                title="降级为免费用户"
                              >
                                降级
                              </button>
                            ) : (
                              <button
                                className="btn btn-small btn-success"
                                onClick={() => {
                                  if (window.confirm(`确定要升级用户 ${user.email || user.username} 为 Premium 用户吗？`)) {
                                    handleUpdateSubscription(user.id, 'premium')
                                  }
                                }}
                                title="升级为 Premium"
                              >
                                升级
                              </button>
                            )}
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

      {/* 成本分析提示 */}
      <div className="cost-notice">
        <h3>💰 成本分析提示</h3>
        <ul>
          <li><strong>未注册用户：</strong>所有未登录用户的数据都存储在浏览器本地（localStorage），不会产生 Supabase API 调用和存储费用</li>
          <li><strong>API 调用：</strong>只有已登录用户的学习进度操作才会调用 Supabase API</li>
          <li><strong>存储成本：</strong>数据库大小估算基于 user_progress 表记录数，实际占用可能因数据压缩而不同</li>
          <li><strong>建议：</strong>定期清理三个月未活跃用户的数据，可以降低存储成本并提高查询性能</li>
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

      {/* 批量删除确认对话框 */}
      {showBatchDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowBatchDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>批量删除确认</h3>
            <p>确定要删除 {selectedInactiveUsers.size} 个用户的进度数据吗？</p>
            <p className="warning">此操作不可撤销！被删除的数据将无法恢复。</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowBatchDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={handleBatchDeleteInactive}
              >
                确认批量删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API调用详情模态框 */}
      {showApiDetailsModal && (
        <div className="modal-overlay" onClick={() => {
          setShowApiDetailsModal(false)
          // 关闭时销毁图表
          if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
          }
        }}>
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <h3>API调用详情</h3>
            <p>用户ID: {apiDetailsUserId?.substring(0, 8)}...</p>

            {apiDetailsLoading ? (
              <div className="loading">加载中...</div>
            ) : (
              <>
                {apiUsageLogs.length > 0 && (
                  <div className="api-stats-chart">
                    <canvas ref={canvasRef} style={{ maxHeight: '300px' }} />
                  </div>
                )}
                <div className="api-logs-table">
                  {apiUsageLogs.length === 0 ? (
                    <div className="no-data">暂无API调用记录</div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>操作类型</th>
                          <th>表名</th>
                          <th>时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiUsageLogs.map(log => (
                          <tr key={log.id}>
                            <td className="operation-type">{log.operation_type}</td>
                            <td>{log.table_name || '-'}</td>
                            <td className="datetime-field">{formatDate(log.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-actions">
                  <p className="info-text">仅显示最近100条记录（采样率10%）</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowApiDetailsModal(false)
                      // 关闭时销毁图表
                      if (chartRef.current) {
                        chartRef.current.destroy()
                        chartRef.current = null
                      }
                    }}
                  >
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
