const express = require('express');
const { pool } = require('../db');
const { ApiError, asyncHandler } = require('../lib/errors');
const { notificationToPublic } = require('../lib/serialize');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE profile_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.session.profileId]
    );
    res.json({ ok: true, data: rows.map(notificationToPublic) });
  })
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE profile_id = ? AND read_at IS NULL',
      [req.session.profileId]
    );
    res.json({ ok: true, data: { count: Number(count) } });
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND profile_id = ? AND read_at IS NULL',
      [req.params.id, req.session.profileId]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE profile_id = ? AND read_at IS NULL',
      [req.session.profileId]
    );
    res.json({ ok: true, data: { ok: true } });
  })
);

router.post(
  '/push-token',
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new ApiError('Token wajib diisi.');
    await pool.query('UPDATE profiles SET push_token = ? WHERE id = ?', [
      token,
      req.session.profileId,
    ]);
    res.json({ ok: true, data: { ok: true } });
  })
);

router.delete(
  '/push-token',
  asyncHandler(async (req, res) => {
    await pool.query('UPDATE profiles SET push_token = NULL WHERE id = ?', [req.session.profileId]);
    res.json({ ok: true, data: { ok: true } });
  })
);

module.exports = router;
