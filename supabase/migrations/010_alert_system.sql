-- ============================================
-- 告警系统 Setup with Discord Webhook Support
-- ============================================
-- 用于跟踪和通知速率限制错误及其他关键事件

-- 1. 创建告警日志表
CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(50) NOT NULL, -- 'rate_limit', 'auth_error', 'api_error', 'spam_registration'
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
  user_id UUID, -- 可选，如果与特定用户相关
  email VARCHAR(255), -- 可选，用户的邮箱
  error_message TEXT,
  metadata JSONB, -- 额外信息
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_alert_logs_type ON alert_logs(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_logs_severity ON alert_logs(severity);
CREATE INDEX IF NOT EXISTS idx_alert_logs_created ON alert_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_logs_resolved ON alert_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id ON alert_logs(user_id);

-- 3. 启用 RLS
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
DROP POLICY IF EXISTS "Admins can view all alerts" ON alert_logs;
DROP POLICY IF EXISTS "Admins can insert alerts" ON alert_logs;
DROP POLICY IF EXISTS "Admins can update alerts" ON alert_logs;

CREATE POLICY "Admins can view all alerts"
  ON alert_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert alerts"
  ON alert_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update alerts"
  ON alert_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. 记录告警的函数
CREATE OR REPLACE FUNCTION log_rate_limit_error(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_error_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alert_logs (
    alert_type,
    severity,
    user_id,
    email,
    error_message,
    metadata
  ) VALUES (
    'rate_limit',
    'warning',
    p_user_id,
    p_email,
    p_error_message,
    jsonb_build_object(
      'source', 'auth',
      'action', 'signup'
    )
  )
  RETURNING id INTO v_alert_id;

  -- 自动发送 Discord 告警
  PERFORM send_discord_alert_if_configured(
    'rate_limit',
    'warning',
    p_email || ': ' || p_error_message
  );

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 记录假邮箱注册尝试
CREATE OR REPLACE FUNCTION log_spam_registration(
  p_email VARCHAR(255),
  p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alert_logs (
    alert_type,
    severity,
    email,
    error_message,
    metadata
  ) VALUES (
    'spam_registration',
    'warning',
    p_email,
    p_reason,
    jsonb_build_object(
      'source', 'auth',
      'action', 'signup_attempt'
    )
  )
  RETURNING id INTO v_alert_id;

  -- 自动发送 Discord 告警
  PERFORM send_discord_alert_if_configured(
    'spam_registration',
    'warning',
    p_email || ': ' || p_reason
  );

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建 Discord Webhook 配置表
CREATE TABLE IF NOT EXISTS discord_webhook_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_url TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. Discord Webhook URL 加密存储（可选，使用 pgcrypto）
-- 注意：需要先启用 pgcrypto 扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 插入默认的 webhook 配置（占位符）
INSERT INTO discord_webhook_config (webhook_url, is_enabled)
VALUES ('YOUR_DISCORD_WEBHOOK_URL_HERE', FALSE)
ON CONFLICT DO NOTHING;

-- 9. 获取 Discord Webhook URL 的函数
CREATE OR REPLACE FUNCTION get_discord_webhook_url()
RETURNS TEXT AS $$
DECLARE
  v_webhook_url TEXT;
BEGIN
  SELECT webhook_url INTO v_webhook_url
  FROM discord_webhook_config
  WHERE is_enabled = TRUE
  LIMIT 1;

  RETURN v_webhook_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 更新 Discord Webhook URL 的函数（管理员专用）
CREATE OR REPLACE FUNCTION update_discord_webhook_url(p_webhook_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 验证调用者是否为管理员
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update webhook configuration';
  END IF;

  -- 更新或创建配置
  UPDATE discord_webhook_config
  SET
    webhook_url = p_webhook_url,
    is_enabled = TRUE,
    updated_at = NOW()
  WHERE id = (SELECT id FROM discord_webhook_config LIMIT 1);

  IF NOT FOUND THEN
    INSERT INTO discord_webhook_config (webhook_url, is_enabled)
    VALUES (p_webhook_url, TRUE);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 发送 Discord 告警的函数
CREATE OR REPLACE FUNCTION send_discord_alert(
  p_webhook_url TEXT,
  p_title TEXT,
  p_description TEXT,
  p_color INTEGER DEFAULT 16776960, -- 黄色（警告）
  p_fields JSONB DEFAULT '[]'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_payload JSONB;
  v_http_result TEXT;
BEGIN
  -- 构建 Discord Webhook payload
  v_payload := jsonb_build_object(
    'username', 'Dutch Word Learning Bot',
    'avatar_url', 'https://cdn-icons-png.flaticon.com/512/2706/2706773.png',
    'embeds', jsonb_build_array(
      jsonb_build_object(
        'title', p_title,
        'description', p_description,
        'color', p_color,
        'timestamp', NOW(),
        'footer', jsonb_build_object(
          'text', 'Dutch Word Learning Alert System',
          'icon_url', 'https://cdn-icons-png.flaticon.com/512/2706/2706773.png'
        ),
        'fields', p_fields
      )
    )
  );

  -- 发送 HTTP POST 请求（需要 net 扩展）
  BEGIN
    SELECT content::TEXT INTO v_http_result
    FROM net.http_post(
      p_webhook_url,
      v_payload,
      jsonb_build_object('Content-Type', 'application/json'),
      5 -- 5秒超时
    );

    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    -- 静默失败，不影响主流程
    RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 条件发送 Discord 告警（如果配置了 webhook）
CREATE OR REPLACE FUNCTION send_discord_alert_if_configured(
  p_alert_type VARCHAR(50),
  p_severity VARCHAR(20),
  p_message TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_webhook_url TEXT;
  v_title TEXT;
  v_color INTEGER;
  v_success BOOLEAN;
BEGIN
  -- 获取 webhook URL
  v_webhook_url := get_discord_webhook_url();

  -- 如果未配置 webhook，直接返回
  IF v_webhook_url IS NULL OR v_webhook_url = 'YOUR_DISCORD_WEBHOOK_URL_HERE' THEN
    RETURN FALSE;
  END IF;

  -- 根据类型和严重程度设置标题和颜色
  CASE p_alert_type
    WHEN 'rate_limit' THEN
      v_title := '🚨 Rate Limit 警告';
      v_color := 16776960; -- 黄色
    WHEN 'spam_registration' THEN
      v_title := '⚠️ 疑似垃圾注册';
      v_color := 16750848; -- 橙色
    WHEN 'auth_error' THEN
      v_title := '❌ 认证错误';
      v_color := 16711680; -- 红色
    WHEN 'api_error' THEN
      v_title := '🔧 API 错误';
      v_color := 16711680; -- 红色
    ELSE
      v_title := 'ℹ️ 系统告警';
      v_color := 5620992; -- 蓝色
  END CASE;

  -- 根据严重程度调整颜色
  IF p_severity = 'critical' THEN
    v_color := 16711680; -- 红色
  ELSIF p_severity = 'error' THEN
    v_color := 13369344; -- 深红色
  ELSIF p_severity = 'warning' THEN
    v_color := 16776960; -- 黄色
  END IF;

  -- 发送告警
  v_success := send_discord_alert(
    v_webhook_url,
    v_title,
    p_message,
    v_color
  );

  RETURN v_success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 创建统计函数：获取告警统计
CREATE OR REPLACE FUNCTION get_alert_stats(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  alert_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    alert_type,
    severity,
    COUNT(*) as alert_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM alert_logs
  WHERE created_at >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY alert_type, severity
  ORDER BY severity DESC, alert_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 14. 创建视图：最近的告警
CREATE OR REPLACE VIEW recent_alerts AS
SELECT
  al.*,
  up.username,
  CASE
    WHEN al.resolved THEN '已解决'
    WHEN al.created_at < NOW() - INTERVAL '1 hour' THEN '待处理'
    ELSE '新告警'
  END as status
FROM alert_logs al
LEFT JOIN user_profiles up ON al.user_id = up.user_id
ORDER BY al.created_at DESC
LIMIT 100;

-- 15. Discord 告警摘要视图
CREATE OR REPLACE VIEW discord_alert_summary AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  alert_type,
  COUNT(*) as alert_count,
  COUNT(DISTINCT email) as unique_emails
FROM alert_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), alert_type
ORDER BY hour DESC, alert_count DESC;

-- ============================================
-- 使用示例
-- ============================================

-- 示例 1: 配置 Discord Webhook（管理员运行）
-- SELECT update_discord_webhook_url('https://discord.com/api/webhooks/YOUR_WEBHOOK_URL');

-- 示例 2: 启用/禁用 Discord 告警
-- UPDATE discord_webhook_config SET is_enabled = TRUE/FALSE;

-- 示例 3: 查看 Discord Webhook 配置
-- SELECT * FROM discord_webhook_config;

-- 示例 4: 测试发送 Discord 告警
-- SELECT send_discord_alert_if_configured('test', 'info', '这是一条测试消息');

-- 示例 5: 查看告警统计
-- SELECT * FROM get_alert_stats(24);

-- 示例 6: 查看最近的告警
-- SELECT * FROM recent_alerts;

-- 示例 7: 查看 Discord 告警摘要
-- SELECT * FROM discord_alert_summary;

-- 示例 8: 查看 Rate Limit 告警
-- SELECT * FROM alert_logs WHERE alert_type = 'rate_limit' ORDER BY created_at DESC LIMIT 10;

-- 示例 9: 查看垃圾注册尝试
-- SELECT * FROM alert_logs WHERE alert_type = 'spam_registration' ORDER BY created_at DESC LIMIT 10;

-- ============================================
-- 如何获取 Discord Webhook URL
-- ============================================
--
-- 1. 打开你的 Discord 服务器
-- 2. 进入服务器设置 > 整合 > Webhooks
-- 3. 点击"新建 Webhook"
-- 4. 命名 webhook（如 "告警机器人"）
-- 5. 选择要发送告警的频道
-- 6. 复制 webhook URL（格式：https://discord.com/api/webhooks/...）
-- 7. 在数据库中配置：
--    SELECT update_discord_webhook_url('你的webhook_url');
--
-- ============================================
-- Discord 告警格式示例
-- ============================================
--
-- 🚨 Rate Limit 警告
--
-- 123@312333312: Email rate limit exceeded
--
-- 时间: 2026-02-12 10:30:00
--
-- ---
--
-- ⚠️ 疑似垃圾注册
--
-- test12345678@fake.com: 用户名包含大量连续数字
--
-- 时间: 2026-02-12 10:25:00
--
-- ============================================
