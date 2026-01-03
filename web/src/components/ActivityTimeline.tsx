import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { supabase } from '../lib/supabase'
import './ActivityTimeline.css'

interface ActivityTimelineProps {
  languageMode: 'chinese' | 'english'
  userId: string
}

interface DailyActivity {
  date: string
  viewCount: number
  testCount: number
  masteredCount: number
  wordsLearned: number
  totalActivity: number
}

interface ActivitySummary {
  totalDays: number
  streakDays: number
  avgDaily: number
  mostActiveDay: string
  totalActivities: number
}

export default function ActivityTimeline({ languageMode, userId }: ActivityTimelineProps) {
  const [activityData, setActivityData] = useState<DailyActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // 指标配置
  const metricsConfig = [
    { key: 'totalActivity', color: '#ff7300' },
    { key: 'viewCount', color: '#8884d8' },
    { key: 'testCount', color: '#82ca9d' },
    { key: 'masteredCount', color: '#ffc658' },
  ] as const;

  const text = {
    chinese: {
      title: '学习活跃度时序图',
      loading: '加载中...',
      noData: '暂无活动数据',
      timeRange: {
        '7d': '最近7天',
        '30d': '最近30天',
        '90d': '最近90天'
      },
      chartType: {
        line: '线型图',
        bar: '柱状图'
      },
      metrics: {
        viewCount: '查看次数',
        testCount: '测试次数',
        masteredCount: '标记掌握',
        wordsLearned: '学习单词',
        totalActivity: '总活跃度'
      },
      summary: {
        title: '活动统计',
        totalDays: '总天数',
        streakDays: '连续天数',
        avgDaily: '日均活动',
        mostActiveDay: '最活跃日',
        totalActivities: '总活动量'
      },
      tooltipLabels: {
        date: '日期',
        activities: '项活动'
      }
    },
    english: {
      title: 'Learning Activity Timeline',
      loading: 'Loading...',
      noData: 'No activity data available',
      timeRange: {
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
        '90d': 'Last 90 Days'
      },
      chartType: {
        line: 'Line Chart',
        bar: 'Bar Chart'
      },
      metrics: {
        viewCount: 'Views',
        testCount: 'Tests',
        masteredCount: 'Mastered',
        wordsLearned: 'Words Learned',
        totalActivity: 'Total Activity'
      },
      summary: {
        title: 'Activity Summary',
        totalDays: 'Total Days',
        streakDays: 'Streak Days',
        avgDaily: 'Daily Avg',
        mostActiveDay: 'Most Active Day',
        totalActivities: 'Total Activities'
      },
      tooltipLabels: {
        date: 'Date',
        activities: ' activities'
      }
    }
  }

  const currentText = text[languageMode]

  // 加载活动数据
  useEffect(() => {
    const loadActivityData = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 计算日期范围
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(endDate.getDate() - days)

        // 从数据库获取用户进度数据
        const { data, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)
          .gte('updated_at', startDate.toISOString())
          .order('updated_at', { ascending: true })

        if (error) {
          console.error('加载活动数据失败:', error)
          setActivityData([])
          return
        }

        // 创建日期到活动的映射
        const dailyMap = new Map<string, DailyActivity>()

        // 初始化所有日期
        for (let i = 0; i < days; i++) {
          const date = new Date()
          date.setDate(endDate.getDate() - (days - 1 - i))
          const dateStr = date.toISOString().split('T')[0]

          dailyMap.set(dateStr, {
            date: dateStr,
            viewCount: 0,
            testCount: 0,
            masteredCount: 0,
            wordsLearned: 0,
            totalActivity: 0
          })
        }

        // 处理数据库数据
        if (data) {
          data.forEach((progress) => {
            // 处理查看时间
            if (progress.last_viewed_at) {
              const viewDate = new Date(progress.last_viewed_at).toISOString().split('T')[0]
              const activity = dailyMap.get(viewDate)
              if (activity) {
                activity.viewCount += progress.view_count || 0
              }
            }

            // 处理测试时间
            if (progress.last_tested_at) {
              const testDate = new Date(progress.last_tested_at).toISOString().split('T')[0]
              const activity = dailyMap.get(testDate)
              if (activity) {
                activity.testCount += progress.test_count || 0
              }
            }

            // 处理掌握标记（基于更新时间）
            if (progress.familiarity === 'mastered' && progress.updated_at) {
              const masteredDate = new Date(progress.updated_at).toISOString().split('T')[0]
              const activity = dailyMap.get(masteredDate)
              if (activity) {
                activity.masteredCount += 1
                activity.wordsLearned += 1
              }
            }

            // 处理其他学习进度（基于更新时间）
            if (progress.familiarity !== 'new' && progress.updated_at) {
              const learnDate = new Date(progress.updated_at).toISOString().split('T')[0]
              const activity = dailyMap.get(learnDate)
              if (activity && progress.familiarity !== 'mastered') {
                activity.wordsLearned += 1
              }
            }
          })
        }

        // 计算总活跃度并转换为数组
        const activities = Array.from(dailyMap.values()).map(activity => ({
          ...activity,
          totalActivity: activity.viewCount + activity.testCount + activity.masteredCount
        }))

        setActivityData(activities)
      } catch (error) {
        console.error('加载活动数据失败:', error)
        setActivityData([])
      } finally {
        setLoading(false)
      }
    }

    loadActivityData()
  }, [userId, timeRange])

  // 计算活动统计
  const activitySummary = useMemo<ActivitySummary>(() => {
    if (activityData.length === 0) {
      return {
        totalDays: 0,
        streakDays: 0,
        avgDaily: 0,
        mostActiveDay: '',
        totalActivities: 0
      }
    }

    const totalActivities = activityData.reduce((sum, day) => sum + day.totalActivity, 0)
    const activeDays = activityData.filter(day => day.totalActivity > 0)
    const totalDays = activeDays.length

    // 计算连续学习天数（从今天往前数）
    let streakDays = 0
    const today = new Date().toISOString().split('T')[0]
    const sortedData = [...activityData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    for (const day of sortedData) {
      if (day.totalActivity > 0 || day.date === today) {
        if (day.totalActivity > 0) streakDays++
      } else {
        break
      }
    }

    // 找到最活跃的一天
    const mostActiveDay = activityData.reduce((max, day) =>
      day.totalActivity > max.totalActivity ? day : max
    , activityData[0])

    return {
      totalDays,
      streakDays,
      avgDaily: totalDays > 0 ? Math.round(totalActivities / totalDays * 10) / 10 : 0,
      mostActiveDay: mostActiveDay?.date ? new Date(mostActiveDay.date).toLocaleDateString() : '',
      totalActivities
    }
  }, [activityData])

  // Custom Tooltip with proper types
  interface TooltipProps {
    active?: boolean
    payload?: Array<{
      color: string
      name: string
      value: number
    }>
    label?: string
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const date = new Date(label || '').toLocaleDateString()
      return (
        <div className="activity-tooltip">
          <p className="tooltip-label">{`${currentText.tooltipLabels.date}: ${date}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="tooltip-item" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${currentText.tooltipLabels.activities}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="activity-timeline">
        <div className="timeline-header">
          <h3>{currentText.title}</h3>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{currentText.loading}</p>
        </div>
      </div>
    )
  }

  if (activityData.length === 0 || activitySummary.totalActivities === 0) {
    return (
      <div className="activity-timeline">
        <div className="timeline-header">
          <h3>{currentText.title}</h3>
        </div>
        <div className="no-data-message">
          <p>{currentText.noData}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="activity-timeline">
      <div className="timeline-header">
        <h3>{currentText.title}</h3>
        <div className="timeline-controls">
          <div className="time-range-buttons">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {currentText.timeRange[range]}
              </button>
            ))}
          </div>
          <div className="chart-type-buttons">
            {(['line', 'bar'] as const).map(type => (
              <button
                key={type}
                className={`chart-type-btn ${chartType === type ? 'active' : ''}`}
                onClick={() => setChartType(type)}
              >
                {currentText.chartType[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="activity-summary">
        <h4>{currentText.summary.title}</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">{currentText.summary.totalDays}</span>
            <span className="summary-value">{activitySummary.totalDays}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{currentText.summary.streakDays}</span>
            <span className="summary-value streak">{activitySummary.streakDays}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{currentText.summary.avgDaily}</span>
            <span className="summary-value">{activitySummary.avgDaily}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{currentText.summary.totalActivities}</span>
            <span className="summary-value">{activitySummary.totalActivities}</span>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'line' ? (
            <LineChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#666"
              />
              <YAxis stroke="#666" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {/* 渲染所有序列，交互交给 Legend 控制 */}
              {metricsConfig.map(metric => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={metric.key === 'totalActivity' ? 3 : 2}
                  name={currentText.metrics[metric.key as keyof typeof currentText.metrics]}
                  dot={{ fill: metric.color, strokeWidth: 2, r: metric.key === 'totalActivity' ? 3 : 2 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#666"
              />
              <YAxis stroke="#666" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {metricsConfig.map(metric => (
                <Bar
                  key={metric.key}
                  dataKey={metric.key}
                  fill={metric.color}
                  name={currentText.metrics[metric.key as keyof typeof currentText.metrics]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
