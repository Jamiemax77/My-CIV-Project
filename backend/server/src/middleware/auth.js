const { verifyToken } = require('../lib/jwt');

/** Requires a valid Bearer token; attaches { profileId, role } as req.session. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Sesi tidak ditemukan, silakan login kembali.' });

  try {
    req.session = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Sesi tidak valid atau sudah berakhir, silakan login kembali.' });
  }
}

/** Use after requireAuth to additionally gate a route to one role. */
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(403).json({ ok: false, error: 'Tidak memiliki akses untuk aksi ini.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
