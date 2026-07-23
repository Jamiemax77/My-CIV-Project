/** PIN hashing, HMAC session tokens, and lockout logic. See PROMPT-DEV-CIV-PROJECT.md §1B/§7. */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashPin(pin, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + salt);
  return bytes.map((b) => ((b < 0 ? b + 256 : b).toString(16).padStart(2, '0'))).join('');
}

function getHmacSecret() {
  const secret = PropertiesService.getScriptProperties().getProperty('HMAC_SECRET');
  if (!secret) throw new Error('HMAC_SECRET belum diset di Script Properties.');
  return secret;
}

function issueToken(session) {
  const payload = JSON.stringify({
    profileId: session.profileId,
    role: session.role,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const payloadB64 = Utilities.base64EncodeWebSafe(payload);
  const signature = Utilities.computeHmacSha256Signature(payloadB64, getHmacSecret());
  const sigB64 = Utilities.base64EncodeWebSafe(signature);
  return payloadB64 + '.' + sigB64;
}

function verifyToken(token) {
  if (!token || token.indexOf('.') === -1) throw new Error('Sesi tidak valid, silakan login kembali.');
  const [payloadB64, sigB64] = token.split('.');
  const expectedSig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payloadB64, getHmacSecret())
  );
  if (expectedSig !== sigB64) throw new Error('Sesi tidak valid, silakan login kembali.');
  const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString());
  if (payload.exp < Date.now()) throw new Error('Sesi berakhir, silakan login kembali.');
  return payload;
}

/** Verifies the token and (optionally) enforces a required role. Returns { profileId, role }. */
function requireAuth(token, requiredRole) {
  const session = verifyToken(token);
  if (requiredRole && session.role !== requiredRole) {
    throw new Error('Tidak memiliki akses untuk aksi ini.');
  }
  return session;
}

function profileToPublic(row) {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    idNumber: row.id_number,
    email: row.email,
    phone: row.phone || undefined,
    gender: row.gender || undefined,
    university: row.university || undefined,
    semester: row.semester ? Number(row.semester) : undefined,
    photoUrl: row.photo_drive_id || undefined,
  };
}

function authLogin(payload) {
  const identifier = String(payload.identifier || '').trim().toLowerCase();
  const pin = String(payload.pin || '');
  const role = payload.role;
  if (!identifier || !pin) throw new Error('Email/NIM dan PIN wajib diisi.');

  const sheet = getSheet('profiles');
  const match = sheetToObjects(sheet).find(
    (row) =>
      String(row.role) === role &&
      (String(row.email).toLowerCase() === identifier ||
        String(row.id_number).toLowerCase() === identifier)
  );
  if (!match) throw new Error('Email/NIM atau PIN salah.');

  const now = new Date();
  if (match.locked_until && new Date(match.locked_until) > now) {
    throw new Error('Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi nanti.');
  }

  if (hashPin(pin, match.pin_salt) !== match.pin_hash) {
    const attempts = Number(match.failed_attempts || 0) + 1;
    const patch = { failed_attempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      patch.locked_until = new Date(now.getTime() + LOCKOUT_MINUTES * 60000).toISOString();
      patch.failed_attempts = 0;
    }
    updateObjectByRow(sheet, match.__row, patch);
    throw new Error('Email/NIM atau PIN salah.');
  }

  updateObjectByRow(sheet, match.__row, { failed_attempts: 0, locked_until: '' });

  const token = issueToken({ profileId: match.id, role: match.role });
  return { token, profile: profileToPublic(match) };
}

function authMe(token) {
  const session = verifyToken(token);
  const match = findRowById(getSheet('profiles'), session.profileId);
  return { profile: profileToPublic(match) };
}
