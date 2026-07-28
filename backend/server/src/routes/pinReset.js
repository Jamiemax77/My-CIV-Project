const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { pool } = require('../db');
const { makeId } = require('../lib/id');
const { ApiError, asyncHandler } = require('../lib/errors');
const { notifyAdmins } = require('../lib/notify');

const router = express.Router();

fs.mkdirSync(config.storageDir, { recursive: true });

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME = new Set(['image/jpeg', 'image/png']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIME.has(file.mimetype)) return cb(new ApiError('Foto harus berformat JPG/PNG.'));
    cb(null, true);
  },
});

// Unauthenticated by definition (participant hasn't logged in — that's the whole point
// of "lupa PIN"), so this is rate-limited hard by IP to keep it from being used to spam
// storage/DB with junk requests the way the login/lookup limiters guard auth.js.
const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ ok: false, error: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.' }),
});

function safeName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

/** Reuses the same `{category}__{participantId}__{uuid}__{name}` layout as routes/files.js
 * so these selfies can be read back through the existing authenticated GET /files/:id. */
function saveSelfie(participantId, file) {
  const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
  const fileId = `pin-reset-selfie__${participantId}__${crypto.randomUUID()}__${safeName(
    file.originalname || `selfie${ext}`
  )}`;
  fs.writeFileSync(path.join(config.storageDir, fileId), file.buffer);
  return fileId;
}

router.post(
  '/',
  requestLimiter,
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'left', maxCount: 1 },
    { name: 'right', maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const identifier = String(req.body.identifier || '').trim().toLowerCase();
    if (!identifier) throw new ApiError('Email/Nomor ID wajib diisi.');

    const [rows] = await pool.query(
      "SELECT id, full_name FROM profiles WHERE role = 'participant' AND (LOWER(email) = ? OR LOWER(id_number) = ?) LIMIT 1",
      [identifier, identifier]
    );
    const profile = rows[0];
    if (!profile) throw new ApiError('Email/Nomor ID tidak terdaftar.', 404);

    const front = req.files?.front?.[0];
    const left = req.files?.left?.[0];
    const right = req.files?.right?.[0];
    if (!front || !left || !right) {
      throw new ApiError('Foto depan, kiri, dan kanan wajib diunggah.');
    }

    const [existing] = await pool.query(
      "SELECT id FROM pin_reset_requests WHERE participant_id = ? AND status = 'pending' LIMIT 1",
      [profile.id]
    );
    if (existing[0]) {
      throw new ApiError(
        'Anda sudah memiliki permintaan reset PIN yang sedang diproses admin.',
        409
      );
    }

    const id = makeId('prr');
    await pool.query(
      `INSERT INTO pin_reset_requests
        (id, participant_id, selfie_front_path, selfie_left_path, selfie_right_path)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        profile.id,
        saveSelfie(profile.id, front),
        saveSelfie(profile.id, left),
        saveSelfie(profile.id, right),
      ]
    );

    // Genuinely time-sensitive — the participant is locked out of their account until an
    // admin acts on this, so it's the one case in this app that warrants a push alongside
    // the in-app row, not just the in-app row like every other notification trigger.
    await notifyAdmins(
      {
        type: 'pin_reset_requested',
        title: 'Permintaan reset PIN baru',
        body: `${profile.full_name} mengajukan reset PIN dan menunggu verifikasi.`,
        data: { requestId: id, participantId: profile.id },
      },
      { push: true }
    );

    res.status(201).json({ ok: true, data: { id } });
  })
);

module.exports = router;
