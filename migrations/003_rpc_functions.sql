CREATE OR REPLACE FUNCTION get_messages_fast(
  p_conv_id UUID,
  p_limit INT DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID, conversation_id UUID, sender_id UUID, content TEXT, type TEXT,
  reply_to UUID, is_edited INT, is_deleted INT, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, media_url TEXT, media_type TEXT, mime_type TEXT,
  file_name TEXT, file_size BIGINT, duration INT,
  username TEXT, display_name TEXT, avatar_url TEXT, last_seen TIMESTAMPTZ,
  reactions JSON, "readBy" JSON, "replyTo" JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.conversation_id, m.sender_id, m.content, m.type,
    m.reply_to, m.is_edited, m.is_deleted, m.created_at,
    m.updated_at, m.media_url, m.media_type, m.mime_type,
    m.file_name, m.file_size, m.duration,
    u.username, u.display_name, u.avatar_url, u.last_seen,
    COALESCE(
      (SELECT json_agg(json_build_object('emoji', r.emoji, 'userId', r.user_id, 'username', ru.username, 'display_name', ru.display_name))
       FROM reactions r LEFT JOIN users ru ON r.user_id = ru.id WHERE r.message_id = m.id),
      '[]'::json
    ) as reactions,
    COALESCE(
      (SELECT json_agg(json_build_object('userId', rr.user_id, 'username', rru.username, 'display_name', rru.display_name))
       FROM read_receipts rr LEFT JOIN users rru ON rr.user_id = rru.id WHERE rr.message_id = m.id),
      '[]'::json
    ) as "readBy",
    CASE WHEN m.reply_to IS NOT NULL THEN
      (SELECT json_build_object('id', rm.id, 'content', rm.content, 'sender_id', rm.sender_id, 'username', rmu.username, 'display_name', rmu.display_name)
       FROM messages rm LEFT JOIN users rmu ON rm.sender_id = rmu.id WHERE rm.id = m.reply_to)
    ELSE NULL END as "replyTo"
  FROM messages m
  JOIN users u ON m.sender_id = u.id
  WHERE m.conversation_id = p_conv_id AND m.is_deleted = 0
  AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_conversations_fast(p_user_id UUID)
RETURNS TABLE (
  id UUID, type TEXT, name TEXT, members JSON,
  last_message TEXT, last_message_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH conv_members AS (
    SELECT cm.conversation_id,
      json_agg(json_build_object(
        'id', u.id, 'username', u.username, 'display_name', u.display_name,
        'avatar_url', u.avatar_url, 'status', u.status, 'last_seen', u.last_seen, 'role', cm.role
      )) as members_json
    FROM conversation_members cm JOIN users u ON cm.user_id = u.id
    GROUP BY cm.conversation_id
  ),
  last_msgs AS (
    SELECT DISTINCT ON (conversation_id) conversation_id, content, created_at
    FROM messages WHERE is_deleted = 0
    ORDER BY conversation_id, created_at DESC
  )
  SELECT c.id, c.type, c.name, cm.members_json as members,
    lm.content as last_message, lm.created_at as last_message_time
  FROM conversations c
  JOIN conversation_members cmm ON c.id = cmm.conversation_id
  JOIN conv_members cm ON c.id = cm.conversation_id
  LEFT JOIN last_msgs lm ON c.id = lm.conversation_id
  WHERE cmm.user_id = p_user_id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
