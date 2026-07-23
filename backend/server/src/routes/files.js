const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const config = require('../config');
const { ApiError, asyncHandler } = require('../lib/errors');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

fs.mkdirSync(config.storageDir, { recursive: true });

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

function safeName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

/** fileId format: {category}__{participantId}__{uuid}__{safeOriginalName} — this doubles as the on-disk filename. */
function buildFileId(category, participantId, originalName) {
  const uuid = crypto.randomUUID();
  return `${safeName(category)}__${participantId}__${uuid}__${safeName(originalName)}`;
}

function parseParticipantId(fileId) {
  const parts = fileId.split('__');
  return parts.length >= 2 ? parts[1] : null;
}

router.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError('File kosong.');

    const participantId =
      req.session.role === 'admin' ? req.body.participantId : req.session.profileId;
    if (!participantId) throw new ApiError('participantId wajib diisi.');

    const fileId = buildFileId(req.body.category || 'lainnya', participantId, req.file.originalname);
    await fs.promises.writeFile(path.join(config.storageDir, fileId), req.file.buffer);

    res.status(201).json({ ok: true, data: { fileId, name: req.file.originalname } });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const fileId = req.params.id;
    const ownerParticipantId = parseParticipantId(fileId);
    if (req.session.role !== 'admin' && ownerParticipantId !== req.session.profileId) {
      throw new ApiError('Tidak memiliki akses untuk file ini.', 403);
    }

    const filePath = path.join(config.storageDir, fileId);
    if (!filePath.startsWith(config.storageDir) || !fs.existsSync(filePath)) {
      throw new ApiError('File tidak ditemukan.', 404);
    }

    const ext = path.extname(fileId).toLowerCase();
    res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  })
);

module.exports = router;
