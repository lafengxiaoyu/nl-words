# Discord 告警系统配置指南

## 概述

Discord 告警系统可以在出现问题时自动向 Discord 频道发送告警通知，包括：
- 🚨 Rate Limit 警告
- ⚠️ 疑似垃圾注册尝试
- ❌ 认证错误
- 🔧 API 错误

## 快速配置（5分钟）

### 1. 获取 Discord Webhook URL

1. 打开你的 Discord 服务器
2. 进入 **服务器设置** > **整合** > **Webhooks**
3. 点击 **"新建 Webhook"**
4. 命名 webhook（如 "告警机器人"）
5. 选择要接收告警的频道
6. 复制 webhook URL

Webhook URL 格式示例：
```
https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz
```

### 2. 配置数据库

在 Supabase SQL Editor 中运行：

```sql
-- 首次部署告警系统
-- 运行: supabase/migrations/010_alert_system.sql

-- 配置 Discord Webhook
SELECT update_discord_webhook_url('你的webhook_url_here');

-- 查看配置
SELECT * FROM discord_webhook_config;
```

### 3. 测试告警

```sql
-- 发送测试消息
SELECT send_discord_alert_if_configured(
  'test',
  'info',
  '这是一条测试消息 - 告警系统正常工作！'
);
```

## 告警类型

### Rate Limit 警告

**触发条件**：用户遇到邮件发送速率限制

**Discord 消息格式**：
```
🚨 Rate Limit 警告

user@example.com: Email rate limit exceeded

时间: 2026-02-12 10:30:00
```

**颜色**：黄色 (⚠️)

---

### 疑似垃圾注册

**触发条件**：用户尝试使用假邮箱注册

**Discord 消息格式**：
```
⚠️ 疑似垃圾注册

123@312333312: Invalid email format detected

时间: 2026-02-12 10:25:00
```

**颜色**：橙色 (🟠)

---

### 认证错误

**触发条件**：登录/注册过程中出现错误

**Discord 消息格式**：
```
❌ 认证错误

user@example.com: Invalid credentials

时间: 2026-02-12 10:20:00
```

**颜色**：红色 (🔴)

---

## 告警级别

| 级别 | 颜色 | 触发条件 |
|------|------|---------|
| **critical** | 🔴 红色 | 系统严重错误 |
| **error** | 🔴 深红色 | 操作失败 |
| **warning** | 🟡 黄色 | Rate limit、垃圾注册 |
| **info** | 🔵 蓝色 | 一般信息 |

## 管理命令

### 启用/禁用 Discord 告警

```sql
-- 启用
UPDATE discord_webhook_config SET is_enabled = TRUE;

-- 禁用
UPDATE discord_webhook_config SET is_enabled = FALSE;
```

### 更新 Webhook URL

```sql
SELECT update_discord_webhook_url('新的webhook_url');
```

### 查看告警统计

```sql
-- 过去 24 小时的告警统计
SELECT * FROM get_alert_stats(24);

-- 过去 1 小时的告警统计
SELECT * FROM get_alert_stats(1);

-- 过去 7 天的告警统计
SELECT * FROM get_alert_stats(168);
```

### 查看最近告警

```sql
-- 查看最近 50 条告警
SELECT * FROM recent_alerts LIMIT 50;

-- 查看所有未解决的告警
SELECT * FROM alert_logs WHERE resolved = FALSE ORDER BY created_at DESC;

-- 查看特定类型的告警
SELECT * FROM alert_logs WHERE alert_type = 'spam_registration' ORDER BY created_at DESC;
```

### 查看告警摘要

```sql
-- 查看过去 24 小时的告警摘要
SELECT * FROM discord_alert_summary;

-- 结果示例：
-- hour                    | alert_type         | alert_count | unique_emails
-- ------------------------|--------------------|-------------|---------------
-- 2026-02-12 10:00:00     | spam_registration  | 15          | 15
-- 2026-02-12 10:00:00     | rate_limit         | 3           | 2
-- 2026-02-12 09:00:00     | spam_registration  | 8           | 8
```

## 标记告警为已解决

```sql
-- 标记单个告警为已解决
UPDATE alert_logs
SET resolved = TRUE,
    resolved_at = NOW()
WHERE id = 'alert_uuid';

-- 批量标记 24 小时前的告警为已解决
UPDATE alert_logs
SET resolved = TRUE,
    resolved_at = NOW()
WHERE created_at < NOW() - INTERVAL '24 hours';

-- 标记所有 spam_registration 告警为已解决
UPDATE alert_logs
SET resolved = TRUE,
    resolved_at = NOW()
WHERE alert_type = 'spam_registration' AND NOT resolved;
```

## 高级配置

### 自定义告警消息

如果需要发送自定义字段，可以使用 `send_discord_alert` 函数：

```sql
SELECT send_discord_alert(
  '你的webhook_url',
  '自定义标题',
  '自定义描述',
  16776960,  -- 黄色
  jsonb_build_array(
    jsonb_build_object('name', '用户', 'value', 'user@example.com'),
    jsonb_build_object('name', 'IP', 'value', '192.168.1.1'),
    jsonb_build_object('name', '时间', 'value', '2026-02-12 10:30:00')
  )
);
```

### 批量告警摘要

创建定时任务，每小时发送告警摘要：

```sql
-- 创建每日告警汇总函数
CREATE OR REPLACE FUNCTION send_daily_alert_summary()
RETURNS void AS $$
DECLARE
  v_summary TEXT;
  v_spam_count INTEGER;
  v_rate_limit_count INTEGER;
  v_total_count INTEGER;
BEGIN
  -- 统计昨天的告警
  SELECT COUNT(*) INTO v_spam_count
  FROM alert_logs
  WHERE alert_type = 'spam_registration'
    AND DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';

  SELECT COUNT(*) INTO v_rate_limit_count
  FROM alert_logs
  WHERE alert_type = 'rate_limit'
    AND DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';

  v_total_count := v_spam_count + v_rate_limit_count;

  -- 如果有告警，发送摘要
  IF v_total_count > 0 THEN
    v_summary := format(
      '📊 昨日告警汇总\n\n⚠️ 疑似垃圾注册: %d 次\n🚨 Rate Limit: %d 次\n\n总计: %d 次告警',
      v_spam_count, v_rate_limit_count, v_total_count
    );

    PERFORM send_discord_alert_if_configured(
      'daily_summary',
      'info',
      v_summary
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## 故障排查

### Discord 告警未收到

**检查步骤**：

1. 确认 webhook URL 是否正确
```sql
SELECT * FROM discord_webhook_config;
```

2. 确认告警是否启用
```sql
SELECT is_enabled FROM discord_webhook_config;
```

3. 检查是否有告警产生
```sql
SELECT * FROM alert_logs ORDER BY created_at DESC LIMIT 10;
```

4. 测试 webhook 是否工作
```sql
SELECT send_discord_alert_if_configured('test', 'info', '测试消息');
```

5. 检查 Discord 服务器是否收到消息

### 告警消息格式错误

**可能原因**：
- Webhook URL 不正确
- Discord 服务器限制（频率限制）
- payload 格式问题

**解决方案**：
```sql
-- 查看 net 扩展是否可用
SELECT * FROM pg_extension WHERE extname = 'net';

-- 如果没有，需要安装
CREATE EXTENSION IF NOT EXISTS net;
```

## 安全建议

1. **保护 Webhook URL**：不要在公开的代码仓库中泄露 webhook URL
2. **限制频道访问**：确保只有管理员能看到告警频道
3. **定期清理**：删除旧的告警记录
```sql
-- 删除 30 天前已解决的告警
DELETE FROM alert_logs
WHERE resolved = TRUE
  AND resolved_at < NOW() - INTERVAL '30 days';
```

4. **监控告警频率**：如果告警过多，可能需要调整阈值或禁用特定类型的告警

## 相关文件

- `supabase/migrations/010_alert_system.sql` - 告警系统数据库脚本
- `web/src/components/Auth.tsx` - 前端告警记录

## 更新日志

- **2026-02-12**: 初始版本
  - Discord Webhook 集成
  - 自动发送 Rate Limit 告警
  - 自动发送垃圾注册告警
  - 告警统计和摘要功能
