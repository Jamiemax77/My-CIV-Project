const express = require('express');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { hashPin, verifyPin } = require('../lib/password');
const { issueToken } = require('../lib/jwt');
const { profileToPublic } = require('../lib/serialize');
const { ApiError, asyncHandler } = require('../lib/errors');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Per-account lockout (below) already blocks repeated guessing against one identifier;
// these IP-based limits are the second layer — bound how many identifiers/PINs a single
// source can try across *different* accounts, and stop /lookup from being used to mass-
// enumerate valid emails/ID numbers. Rejections reuse the ApiError JSON shape the client expects.
const authRateLimitHandler = (req, res) => {
  res.status(429).json({ ok: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authRateLimitHandler,
});

const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: authRateLimitHandler,
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    const pin = String(req.body.pin || '');
    const role = req.body.role;
    if (!identifier || !pin) throw new ApiError('Email/Nomor ID dan PIN wajib diisi.');
    if (role !== 'participant' && role !== 'admin') throw new ApiError('Role tidak valid.');

    const [rows] = await pool.query(
      'SELECT * FROM profiles WHERE role = ? AND (LOWER(email) = ? OR LOWER(id_number) = ?) LIMIT 1',
      [role, identifier, identifier]
    );
    const profile = rows[0];
    if (!profile) throw new ApiError('Email/Nomor ID atau PIN salah.', 401);

    if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
      throw new ApiError('Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi nanti.', 423);
    }

    const valid = await verifyPin(pin, profile.pin_hash);
    if (!valid) {
      const attempts = profile.failed_attempts + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        await pool.query(
          'UPDATE profiles SET failed_attempts = 0, locked_until = ? WHERE id = ?',
          [lockedUntil, profile.id]
        );
      } else {
        await pool.query('UPDATE profiles SET failed_attempts = ? WHERE id = ?', [attempts, profile.id]);
      }
      throw new ApiError('Email/Nomor ID atau PIN salah.', 401);
    }

    await pool.query('UPDATE profiles SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [profile.id]);

    const token = issueToken({ profileId: profile.id, role: profile.role });
    res.json({ ok: true, data: { token, profile: profileToPublic(profile) } });
  })
);

router.get(
  '/lookup',
  lookupLimiter,
  asyncHandler(async (req, res) => {
    const identifier = String(req.query.identifier || '').trim().toLowerCase();
    if (!identifier) throw new ApiError('Identifier wajib diisi.');

    const [rows] = await pool.query(
      'SELECT role FROM profiles WHERE LOWER(email) = ? OR LOWER(id_number) = ? LIMIT 1',
      [identifier, identifier]
    );
    const profile = rows[0];
    res.json({ ok: true, data: { exists: !!profile, role: profile ? profile.role : null } });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [req.session.profileId]);
    if (!rows[0]) throw new ApiError('Profil tidak ditemukan.', 404);
    res.json({ ok: true, data: { profile: profileToPublic(rows[0]) } });
  })
);

module.exports = router;
