-- ============================================
-- 反恶意注册防护 - 数据库层面
-- ============================================

-- 1. 创建邮箱验证函数
CREATE OR REPLACE FUNCTION validate_email_format(p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
  -- 基础邮箱格式检查
  IF p_email !~ '^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,30}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,30}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$' THEN
    RETURN FALSE;
  END IF;

  -- 检查假邮箱模式
  IF p_email ~ '\d{10,}@[a-z0-9.-]+' THEN
    RETURN FALSE;
  END IF;

  IF p_email ~ '@(\d{10,}|\d+\.\d+)' THEN
    RETURN FALSE;
  END IF;

  IF p_email ~ '\.(\d{5,})' THEN
    RETURN FALSE;
  END IF;

  -- 确保域名包含至少一个字母
  IF p_email !~ '@[a-z0-9.-]*[a-z]' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建检查邮箱的触发器
CREATE OR REPLACE FUNCTION validate_new_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_email_format(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email
      USING HINT = 'Please use a valid email address';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 应用触发器
DROP TRIGGER IF EXISTS validate_email_trigger ON auth.users;
CREATE TRIGGER validate_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_new_user_email();

-- 4. 创建临时邮箱黑名单表
CREATE TABLE IF NOT EXISTS email_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. 插入常见的临时邮箱域名
INSERT INTO email_blacklist (domain, reason) VALUES
('guerrillamail.com', '临时邮箱'),
('guerrillamailblock.com', '临时邮箱'),
('mailinator.com', '临时邮箱'),
('10minutemail.com', '临时邮箱'),
('tempmail.org', '临时邮箱'),
('yopmail.com', '临时邮箱'),
('trashmail.com', '临时邮箱'),
('throwawaymail.com', '临时邮箱'),
('fakeinbox.com', '临时邮箱'),
('temp-mail.org', '临时邮箱')
ON CONFLICT (domain) DO NOTHING;

-- 6. 创建邮箱黑名单检查函数
CREATE OR REPLACE FUNCTION is_email_blacklisted(p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  v_domain VARCHAR(255);
  v_count INTEGER;
BEGIN
  v_domain := split_part(p_email, '@', 2);

  SELECT COUNT(*) INTO v_count
  FROM email_blacklist
  WHERE domain = v_domain;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 7. 更新触发器，加入黑名单检查
CREATE OR REPLACE FUNCTION validate_new_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查邮箱格式
  IF NOT validate_email_format(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email
      USING HINT = 'Please use a valid email address';
  END IF;

  -- 检查黑名单
  IF is_email_blacklisted(NEW.email) THEN
    RAISE EXCEPTION 'Email domain % is not allowed', split_part(NEW.email, '@', 2)
      USING HINT = 'Please use a different email address';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建假邮箱检测视图
CREATE OR REPLACE VIEW suspicious_users AS
SELECT
  up.id as profile_id,
  up.user_id,
  up.username,
  up.email,
  up.created_at,
  -- 检测结果
  CASE
    WHEN up.email ~ '\d{10,}@' THEN '用户名含大量连续数字'
    WHEN up.email ~ '@\d+\.\d+' THEN '域名为纯数字'
    WHEN up.email ~ '\.\d{5,}$' THEN '顶级域名异常（纯数字且长度>=5）'
    WHEN LENGTH(up.email) > 60 THEN '邮箱长度异常'
    WHEN split_part(up.email, '@', 1) = split_part(up.email, '@', 2) THEN '用户名与域名相同'
    ELSE '其他异常'
  END as risk_reason,
  -- 风险评分
  CASE
    WHEN up.email ~ '@\d+\.\d+' THEN 100
    WHEN up.email ~ '\.\d{5,}$' THEN 90
    WHEN up.email ~ '\d{10,}@' THEN 80
    WHEN LENGTH(up.email) > 60 THEN 50
    ELSE 30
  END as risk_score
FROM user_profiles up
WHERE
  up.email ~ '\d{8,}@'
  OR up.email ~ '@\d+\.\d+'
  OR up.email ~ '\.\d{5,}$'
  OR LENGTH(up.email) > 60
  OR split_part(up.email, '@', 1) = split_part(up.email, '@', 2)
ORDER BY up.created_at DESC;

-- 9. 创建统计视图
CREATE OR REPLACE VIEW registration_quality_stats AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE email ~ '\d{8,}@' OR email ~ '@\d+\.\d+' OR email ~ '\.\d{5,}$') as suspicious_count,
  COUNT(*) FILTER (WHERE email ~ '\d{8,}@') as user_with_many_digits,
  COUNT(*) FILTER (WHERE email ~ '@\d+\.\d+') as numeric_domain,
  COUNT(*) FILTER (WHERE email ~ '\.\d{5,}$') as numeric_tld,
  ROUND(100.0 * COUNT(*) FILTER (WHERE email ~ '\d{8,}@' OR email ~ '@\d+\.\d+' OR email ~ '\.\d{5,}$') / COUNT(*), 2) as suspicious_percentage
FROM user_profiles;

-- ============================================
-- 使用示例
-- ============================================

-- 查看所有可疑用户
-- SELECT * FROM suspicious_users;

-- 查看注册质量统计
-- SELECT * FROM registration_quality_stats;

-- 查看某个邮箱是否可疑
-- SELECT * FROM detect_fake_email('123@312333312');

-- 查看今日注册的可疑用户
-- SELECT * FROM suspicious_users WHERE created_at > CURRENT_DATE;

-- ============================================
-- 清理假用户的查询
-- ============================================

-- 1. 查看所有可能是假邮箱的用户
SELECT
  user_id,
  username,
  email,
  created_at
FROM user_profiles
WHERE
  email ~ '\d{10,}@'
  OR email ~ '@\d{10,}'
  OR email ~ '\.\d{5,}$'
ORDER BY created_at DESC
LIMIT 50;

-- 2. 查看最近1小时的可疑注册
SELECT
  user_id,
  username,
  email,
  created_at
FROM user_profiles
WHERE
  (email ~ '\d{10,}@' OR email ~ '@\d{10,}' OR email ~ '\.\d{5,}$')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 3. 查看特定模式的假邮箱
-- 例如：查找域名为纯数字的用户
SELECT
  user_id,
  username,
  email,
  created_at
FROM user_profiles
WHERE email ~ '@\d+\.\d+$'
ORDER BY created_at DESC;

-- ============================================
-- 批量删除假用户（小心使用）
-- ============================================

-- 方法 1: 删除所有高风险的假用户（建议先查看列表确认）
-- 条件：邮箱中包含10个以上连续数字，或域名为纯数字
DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  FOR user_rec IN
    SELECT user_id FROM user_profiles
    WHERE
      (email ~ '\d{10,}@' OR email ~ '@\d+\.\d+$')
      AND created_at < NOW() - INTERVAL '1 hour'  -- 给1小时缓冲期
  LOOP
    -- 使用之前创建的删除函数
    PERFORM delete_user_by_id(user_rec.user_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '已删除 % 个假用户', v_count;
END $$;

-- 方法 2: 删除特定模式的假用户
-- 例如：删除所有顶级域名为5个以上数字的用户
DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  FOR user_rec IN
    SELECT user_id FROM user_profiles
    WHERE
      email ~ '\.\d{5,}$'
      AND created_at < NOW() - INTERVAL '1 hour'
  LOOP
    PERFORM delete_user_by_id(user_rec.user_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '已删除 % 个顶级域名异常的用户', v_count;
END $$;

-- 方法 3: 手动确认后删除（推荐）
-- 1. 先查看列表
-- SELECT user_id, username, email, created_at FROM user_profiles WHERE email ~ '@\d+\.\d+$';

-- 2. 复制 user_id，然后手动删除
-- SELECT delete_user_by_id('user-uuid-here');

-- ============================================
-- 维护建议
-- ============================================

-- 1. 定期检查可疑用户
-- 每天运行：SELECT * FROM suspicious_users WHERE created_at > CURRENT_DATE;

-- 2. 更新黑名单
-- INSERT INTO email_blacklist (domain, reason) VALUES ('new-temp-domain.com', '新增临时邮箱');

-- 3. 清理已删除用户的 profile 数据
-- 这些已经通过 CASCADE 自动删除，但可以定期清理软删除的记录

-- 4. 监控注册质量
-- 每周运行：SELECT * FROM registration_quality_stats;

-- ============================================
