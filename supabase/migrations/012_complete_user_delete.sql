-- ============================================
-- 完整用户删除功能
-- ============================================
-- 提供管理员完整的用户删除功能，包括所有相关数据

-- 1. 创建完全删除用户及其所有数据的存储过程
CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_username TEXT;
  v_deleted_records JSONB := '{}'::jsonb;
BEGIN
  -- 获取用户名（用于日志）
  SELECT username INTO v_username
  FROM user_profiles
  WHERE user_id = p_user_id;

  -- 记录删除的记录数
  -- 删除用户进度数据
  DELETE FROM user_progress WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_records->>'user_progress' = ROW_COUNT;

  -- 删除单词统计数据
  DELETE FROM word_stats WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_records->>'word_stats' = ROW_COUNT;

  -- 删除用户的告警日志
  DELETE FROM alert_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_records->>'alert_logs' = ROW_COUNT;

  -- 删除用户的 API 使用日志
  DELETE FROM api_usage_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_records->>'api_usage_log' = ROW_COUNT;

  -- 删除用户资料
  DELETE FROM user_profiles WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_records->>'user_profiles' = ROW_COUNT;

  -- 构建结果
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', v_username,
    'deleted_records', v_deleted_records
  );

  -- 记录删除操作到告警日志
  INSERT INTO alert_logs (
    alert_type,
    severity,
    user_id,
    email,
    error_message,
    metadata
  ) VALUES (
    'user_deletion',
    'info',
    NULL, -- 用户已被删除
    v_username,
    'User deleted by admin',
    jsonb_build_object(
      'deleted_records', v_deleted_records,
      'deleted_by', auth.uid()
    )
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 批量删除用户
CREATE OR REPLACE FUNCTION delete_users_batch(p_user_ids UUID[])
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
  v_total_deleted INTEGER := 0;
BEGIN
  -- 遍历每个用户 ID
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- 删除单个用户
    v_result := delete_user_completely(v_user_id);
    v_results := v_results || v_result;

    IF (v_result->>'success')::boolean THEN
      v_total_deleted := v_total_deleted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_deleted', v_total_deleted,
    'total_requested', array_length(p_user_ids, 1),
    'results', v_results
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 删除长时间未活跃的用户（可配置天数）
CREATE OR REPLACE FUNCTION delete_inactive_users(p_days INTEGER DEFAULT 90)
RETURNS JSONB AS $$
DECLARE
  v_inactive_users UUID[];
  v_result JSONB;
  v_inactive_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 计算截止日期
  v_inactive_cutoff := NOW() - (p_days || ' days')::INTERVAL;

  -- 查找未活跃的用户
  SELECT ARRAY_AGG(DISTINCT up.user_id) INTO v_inactive_users
  FROM user_profiles up
  LEFT JOIN user_progress upr ON up.user_id = upr.user_id
  WHERE upr.user_id IS NULL
     OR (upr.last_viewed_at IS NOT NULL AND upr.last_viewed_at < v_inactive_cutoff)
     OR (upr.last_tested_at IS NOT NULL AND upr.last_tested_at < v_inactive_cutoff)
     OR (upr.last_viewed_at IS NULL AND upr.last_tested_at IS NULL
         AND up.created_at < v_inactive_cutoff);

  -- 如果没有未活跃用户，直接返回
  IF v_inactive_users IS NULL OR array_length(v_inactive_users, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No inactive users found',
      'deleted_count', 0
    );
  END IF;

  -- 批量删除
  v_result := delete_users_batch(v_inactive_users);

  RETURN jsonb_build_object(
    'success', true,
    'inactive_cutoff_days', p_days,
    'inactive_cutoff_date', v_inactive_cutoff,
    'deleted_count', (v_result->>'total_deleted')::integer,
    'details', v_result
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 授予管理员权限执行删除函数
DROP POLICY IF EXISTS "Admins can delete users" ON user_profiles;
CREATE POLICY "Admins can delete users"
  ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 使用示例
-- ============================================
--
-- 1. 删除单个用户
--    SELECT delete_user_completely('user_uuid_here');
--
-- 2. 批量删除多个用户
--    SELECT delete_users_batch(ARRAY['uuid1', 'uuid2', 'uuid3']);
--
-- 3. 删除 90 天未活跃的用户
--    SELECT delete_inactive_users(90);
--
-- 4. 删除 30 天未活跃的用户
--    SELECT delete_inactive_users(30);
--
-- 5. 查看 90 天未活跃的用户（删除前预览）
--    SELECT up.user_id, up.username, up.email,
--           COALESCE(upr.last_viewed_at, '从未访问') as last_activity,
--           up.created_at
--    FROM user_profiles up
--    LEFT JOIN user_progress upr ON up.user_id = upr.user_id
--    WHERE upr.last_viewed_at < NOW() - INTERVAL '90 days'
--       OR upr.last_viewed_at IS NULL
--       OR (upr.last_viewed_at IS NULL
--           AND upr.last_tested_at IS NULL
--           AND up.created_at < NOW() - INTERVAL '90 days');
--
-- ============================================
