# 反恶意注册防护方案

## 问题描述

短时间内收到大量假邮箱注册尝试（如 `123@312333312`），由于为了避免 rate limit 问题关闭了邮箱验证，导致无法有效过滤恶意注册。

## 防护方案

### 方案 1: 邮箱格式验证（最简单，立即可用）

在前端和后端添加严格的邮箱验证规则：

#### 前端验证
```typescript
// 严格的邮箱格式验证
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const emailRegexStrict = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,30}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,30}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

// 验证邮箱
function isValidEmail(email: string): boolean {
  if (!emailRegexStrict.test(email)) return false;

  // 额外检查
  const [localPart, domain] = email.split('@');

  // 本地部分不能以 . 或 - 开头/结尾
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.startsWith('-') || localPart.endsWith('-')) return false;

  // 域名必须有有效的顶级域名
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  // 顶级域名至少2个字符，最多20个字符
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || tld.length > 20) return false;

  // 检查常见假邮箱模式
  const fakePatterns = [
    /\d{10,}@[a-z0-9.-]+/i,  // 用户名包含10个以上数字
    /@(\d{10,}|\d+\.\d+)/i,  // 域名是纯数字或数字.数字
    /\.(\d{5,})/i,            // 顶级域名是5个以上数字
    /^[a-z]+\d{10,}@/i,      // 字母后跟10个以上数字
  ];

  for (const pattern of fakePatterns) {
    if (pattern.test(email)) return false;
  }

  return true;
}
```

#### 数据库触发器验证
```sql
-- 创建邮箱验证函数
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

-- 创建检查邮箱的触发器
CREATE OR REPLACE FUNCTION validate_new_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_email_format(NEW.email) THEN
    RAISE EXCEPTION '无效的邮箱格式: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
DROP TRIGGER IF EXISTS validate_email_trigger ON auth.users;
CREATE TRIGGER validate_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_new_user_email();
```

### 方案 2: IP 级别限流（推荐）

创建注册尝试记录表，限制同一 IP 的注册频率：

```sql
-- 创建注册尝试记录表
CREATE TABLE IF NOT EXISTS signup_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL,  -- 支持 IPv6
  email VARCHAR(255),
  username VARCHAR(20),
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  metadata JSONB
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON signup_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_time ON signup_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON signup_attempts(email);

-- 检查 IP 是否可以注册的函数
CREATE OR REPLACE FUNCTION can_signup(p_ip_address VARCHAR(45))
RETURNS TABLE (allowed BOOLEAN, reason TEXT) AS $$
DECLARE
  v_attempts_1h INTEGER;
  v_attempts_24h INTEGER;
  v_failed_attempts_1h INTEGER;
BEGIN
  -- 统计过去1小时的所有尝试
  SELECT COUNT(*)
  INTO v_attempts_1h
  FROM signup_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > NOW() - INTERVAL '1 hour';

  -- 统计过去24小时的所有尝试
  SELECT COUNT(*)
  INTO v_attempts_24h
  FROM signup_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > NOW() - INTERVAL '24 hours';

  -- 统计过去1小时的失败尝试
  SELECT COUNT(*)
  INTO v_failed_attempts_1h
  FROM signup_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at > NOW() - INTERVAL '1 hour'
    AND NOT success;

  -- 规则：1小时内最多3次尝试
  IF v_attempts_1h >= 3 THEN
    RETURN QUERY SELECT FALSE, '请求过于频繁，请1小时后再试';
    RETURN;
  END IF;

  -- 规则：24小时内最多5次尝试
  IF v_attempts_24h >= 5 THEN
    RETURN QUERY SELECT FALSE, '今日注册次数已达上限';
    RETURN;
  END IF;

  -- 规则：1小时内失败3次则暂时封禁
  IF v_failed_attempts_1h >= 3 THEN
    RETURN QUERY SELECT FALSE, '多次注册失败，请24小时后再试';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 记录注册尝试的函数
CREATE OR REPLACE FUNCTION record_signup_attempt(
  p_ip_address VARCHAR(45),
  p_email VARCHAR(255),
  p_username VARCHAR(20),
  p_success BOOLEAN,
  p_user_agent TEXT
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO signup_attempts (
    ip_address,
    email,
    username,
    success,
    user_agent
  ) VALUES (
    p_ip_address,
    p_email,
    p_username,
    p_success,
    p_user_agent
  )
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql;
```

前端调用：
```typescript
// 获取客户端 IP（需要后端 API 支持）
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('/api/get-client-ip');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
};

const handleRegister = async () => {
  const ip = await getClientIP();

  // 检查是否可以注册
  const { data: canSignup, error: checkError } = await supabase
    .rpc('can_signup', { p_ip_address: ip });

  if (checkError || !canSignup) {
    setError('注册请求过于频繁，请稍后再试');
    return;
  }

  if (!canSignup[0]?.allowed) {
    setError(canSignup[0]?.reason || '无法注册');
    return;
  }

  // 记录注册尝试
  await supabase.rpc('record_signup_attempt', {
    p_ip_address: ip,
    p_email: email,
    p_username: username,
    p_success: false,  // 先记录为失败
    p_user_agent: navigator.userAgent
  });

  try {
    // 尝试注册
    const { data, error } = await supabase.auth.signUp({ /* ... */ });

    if (error) throw error;

    // 注册成功，更新记录
    await supabase.rpc('record_signup_attempt', {
      p_ip_address: ip,
      p_email: email,
      p_username: username,
      p_success: true,
      p_user_agent: navigator.userAgent
    });

  } catch (err) {
    // 失败的记录已在上面记录
    throw err;
  }
};
```

### 方案 3: 临时邮箱域名黑名单

```sql
-- 创建黑名单表
CREATE TABLE IF NOT EXISTS email_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入常见的临时邮箱域名
INSERT INTO email_blacklist (domain, reason) VALUES
('guerrillamail.com', '临时邮箱'),
('mailinator.com', '临时邮箱'),
('10minutemail.com', '临时邮箱'),
('tempmail.org', '临时邮箱'),
('yopmail.com', '临时邮箱'),
('trashmail.com', '临时邮箱')
ON CONFLICT (domain) DO NOTHING;

-- 创建邮箱黑名单检查函数
CREATE OR REPLACE FUNCTION is_email_blacklisted(p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
  v_domain VARCHAR(255);
  v_count INTEGER;
BEGIN
  -- 提取域名部分
  v_domain := split_part(p_email, '@', 2);

  -- 检查是否在黑名单中
  SELECT COUNT(*) INTO v_count
  FROM email_blacklist
  WHERE domain = v_domain;

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 更新触发器，加入黑名单检查
CREATE OR REPLACE FUNCTION validate_new_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查邮箱格式
  IF NOT validate_email_format(NEW.email) THEN
    RAISE EXCEPTION '无效的邮箱格式';
  END IF;

  -- 检查黑名单
  IF is_email_blacklisted(NEW.email) THEN
    RAISE EXCEPTION '此邮箱域名不被允许';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 方案 4: 设备指纹识别（高级）

使用浏览器指纹识别，防止同一设备多次注册：

```typescript
// 简单的设备指纹生成
function generateFingerprint(): string {
  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return hash.toString(16);
}
```

### 方案 5: 简单验证码（最有效）

添加简单的数学验证码或图形验证码：

```typescript
// 数学验证码
function generateMathCaptcha(): { question: string, answer: number } {
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;

  let answer: number;
  switch (operator) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
  }

  return {
    question: `${num1} ${operator} ${num2} = ?`,
    answer
  };
}

// 在 Auth.tsx 中使用
const [captcha, setCaptcha] = useState<{ question: string, answer: number } | null>(null);
const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('');

// 生成验证码
useEffect(() => {
  setCaptcha(generateMathCaptcha());
}, []);

// 验证
if (parseInt(userCaptchaAnswer) !== captcha?.answer) {
  setError('验证码错误');
  return;
}
```

### 方案 6: 智能假邮箱检测

```sql
-- 创建假邮箱特征检测函数
CREATE OR REPLACE FUNCTION detect_fake_email(p_email VARCHAR(255))
RETURNS TABLE (is_fake BOOLEAN, confidence NUMERIC, reasons TEXT[]) AS $$
DECLARE
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_score NUMERIC := 0;
  v_local_part TEXT;
  v_domain TEXT;
  v_tld TEXT;
BEGIN
  -- 分解邮箱
  v_local_part := split_part(p_email, '@', 1);
  v_domain := split_part(p_email, '@', 2);
  v_tld := split_part(v_domain, '.', array_length(string_to_array(v_domain, '.'), 1));

  -- 检测规则
  -- 1. 用户名包含过多连续数字
  IF v_local_part ~ '\d{8,}' THEN
    v_reasons := array_append(v_reasons, '用户名包含大量连续数字');
    v_score := v_score + 0.4;
  END IF;

  -- 2. 域名部分是纯数字
  IF v_domain ~ '^[0-9.-]+\.[0-9]+$' THEN
    v_reasons := array_append(v_reasons, '域名格式异常');
    v_score := v_score + 0.6;
  END IF;

  -- 3. 顶级域名是纯数字且长度>3
  IF v_tld ~ '^[0-9]{4,}$' THEN
    v_reasons := array_append(v_reasons, '顶级域名异常');
    v_score := v_score + 0.7;
  END IF;

  -- 4. 邮箱整体过长
  IF LENGTH(p_email) > 50 THEN
    v_reasons := array_append(v_reasons, '邮箱长度异常');
    v_score := v_score + 0.3;
  END IF;

  -- 5. 用户名与域名过于相似
  IF LENGTH(v_local_part) > 5 AND v_domain ~ v_local_part THEN
    v_reasons := array_append(v_reasons, '用户名与域名相似');
    v_score := v_score + 0.3;
  END IF;

  -- 判断是否为假邮箱（阈值 0.5）
  RETURN QUERY SELECT
    v_score >= 0.5,
    v_score,
    v_reasons;
END;
$$ LANGUAGE plpgsql;

-- 示例使用
-- SELECT * FROM detect_fake_email('123@312333312');
```

## 推荐实施顺序

### 立即实施（优先级高）
1. ✅ 邮箱格式验证 - 5分钟
2. ✅ 数学验证码 - 30分钟
3. ✅ 假邮箱检测 - 15分钟

### 近期实施（优先级中）
4. IP 限流 - 1小时
5. 临时邮箱黑名单 - 30分钟

### 长期考虑（优先级低）
6. 设备指纹
7. Cloudflare Turnstile（免费验证码服务）
8. 专业反欺诈服务

## 立即可用的临时方案

### 前端邮箱验证（最简单）

在 `Auth.tsx` 中添加：

```typescript
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,30}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,30}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  // 拒绝纯数字域名
  const domain = email.split('@')[1];
  if (/^\d+\.\d+$/.test(domain)) return false;

  // 拒绝用户名包含8个以上连续数字
  const localPart = email.split('@')[0];
  if (/\d{8,}/.test(localPart)) return false;

  // 拒绝顶级域名是5个以上数字
  const tld = domain.split('.').pop();
  if (/^\d{5,}$/.test(tld || '')) return false;

  return true;
};

// 在注册前验证
const handleAuth = async (e: React.FormEvent) => {
  e.preventDefault();

  if (authMode === 'register') {
    // 验证邮箱格式
    if (!isValidEmail(email)) {
      setError('邮箱格式不正确，请输入有效的邮箱地址');
      return;
    }
  }

  // ... 其他注册逻辑
};
```

### 数学验证码（简单有效）

在注册表单中添加：

```typescript
// 生成数学验证码
const [captcha, setCaptcha] = useState(() => {
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * 3)];
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;

  let answer: number;
  const question = `${a} ${operator} ${b}`;

  if (operator === '+') answer = a + b;
  else if (operator === '-') answer = a - b;
  else answer = a * b;

  return { question, answer };
});

const [captchaInput, setCaptchaInput] = useState('');

// 在表单中显示
<div className="form-group">
  <label>验证码</label>
  <div className="captcha-container">
    <span className="captcha-question">{captcha.question} = ?</span>
    <input
      type="text"
      value={captchaInput}
      onChange={(e) => setCaptchaInput(e.target.value)}
      placeholder="输入答案"
      required
    />
  </div>
</div>

// 验证时检查
if (parseInt(captchaInput) !== captcha.answer) {
  setError('验证码错误，请重试');
  setCaptcha(generateMathCaptcha()); // 刷新验证码
  return;
}
```

## 监控建议

创建监控视图：

```sql
-- 查看疑似假邮箱的注册
CREATE OR REPLACE VIEW suspicious_signups AS
SELECT
  user_id,
  username,
  email,
  created_at,
  -- 检测结果
  CASE
    WHEN email ~ '\d{8,}@' THEN '用户名含大量数字'
    WHEN email ~ '@\d+\.\d+' THEN '域名为纯数字'
    WHEN email ~ '\.\d{5,}$' THEN '顶级域名异常'
    ELSE '其他'
  END as risk_reason
FROM user_profiles
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (
    email ~ '\d{8,}@'
    OR email ~ '@\d+\.\d+'
    OR email ~ '\.\d{5,}$'
  )
ORDER BY created_at DESC;
```

## 清理假用户

```sql
-- 查看所有可能的假邮箱用户
SELECT
  id,
  username,
  email,
  created_at
FROM user_profiles
WHERE
  email ~ '\d{10,}@'
  OR email ~ '@\d{10,}'
  OR email ~ '\.\d{5,}$'
ORDER BY created_at DESC;

-- 批量删除假邮箱用户（小心使用）
-- 先确认列表，然后执行删除
DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  FOR user_rec IN
    SELECT user_id FROM user_profiles
    WHERE
      email ~ '\d{10,}@'
      OR email ~ '@\d{10,}'
      OR email ~ '\.\d{5,}$'
      AND created_at < NOW() - INTERVAL '1 hour'
  LOOP
    DELETE FROM auth.users WHERE id = user_rec.user_id;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '已删除 % 个假用户', v_count;
END $$;
```

## 总结

针对当前假邮箱注册攻击，建议：

1. **立即**：添加前端邮箱验证和数学验证码
2. **今天**：部署数据库邮箱验证和假邮箱检测
3. **明天**：实现 IP 限流和黑名单系统
4. **长期**：考虑 Cloudflare Turnstile 或专业反欺诈服务

这样可以有效防止大部分恶意注册，同时不影响正常用户体验。
