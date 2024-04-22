const sql = `
    SELECT
        o.od_id, o.od_q_number, o.od_cancel_by, o.finished_at,
        u.id, u.urs_name, u.urs_profile_img
    FROM
        cms_order o
    JOIN 
        users u ON (u.id = o.customer_id)
    JOIN
        messages m ON (m.od_id = o.od_id)
    WHERE
        o.artist_id = ?
`

const contacts_order = `
  SELECT
    o.artist_id, o.od_id, o.od_q_number, o.od_cancel_by, o.finished_at, o.od_current_step_id as current_step,
    u.id, u.urs_name, u.urs_profile_img,
    SUBSTRING_INDEX(GROUP_CONCAT(m.message_text ORDER BY m.created_at DESC), ',', 1) AS message_text,
    MAX(m.created_at) AS last_message_time,
    (
        SELECT step_name 
        FROM cms_steps 
        WHERE current_step = cms_steps.step_id
    ) AS current_step_name
  FROM
    cms_order o
  JOIN 
    users u ON u.id = o.customer_id
  JOIN
    messages m ON (u.id = m.sender OR u.id = m.receiver)
  WHERE
    (m.sender = ? OR m.receiver = ?) 
    AND u.id != ?
    AND m.deleted_at IS NULL
    AND o.artist_id IS NOT NULL
    AND m.od_id IS NOT NULL
  GROUP BY
    o.od_id,
    o.od_q_number,
    o.od_cancel_by,
    o.finished_at,
    u.id,
    u.urs_name,
    u.urs_profile_img
  ORDER BY
    last_message_time DESC;
  `