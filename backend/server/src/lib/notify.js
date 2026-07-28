const { pool } = require('../db');
const { makeId } = require('./id');

async function insertNotification(profileId, { type, title, body, data }) {
  const id = makeId('ntf');
  await pool.query(
    'INSERT INTO notifications (id, profile_id, type, title, body, data) VALUES (?, ?, ?, ?, ?, ?)',
    [id, profileId, type, title, body || null, data ? JSON.stringify(data) : null]
  );
  return id;
}

async function sendPush(profileId, { title, body, data }) {
  const [rows] = await pool.query('SELECT push_token FROM profiles WHERE id = ? LIMIT 1', [
    profileId,
  ]);
  const token = rows[0] && rows[0].push_token;
  if (!token) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
    });
  } catch (err) {
    // Push delivery is best-effort — the in-app row (already written by insertNotification)
    // is the source of truth, so a failed/unreachable push must never fail the request
    // that triggered it (e.g. submitting a reimbursement).
    console.error('Push notification failed:', err);
  }
}

/** Writes an in-app notification for one profile; pass `push: true` for the rare
 * time-sensitive case (currently only the PIN-reset-request flow) to also fan it
 * out through Expo's push service. */
async function notifyProfile(profileId, notification, { push = false } = {}) {
  await insertNotification(profileId, notification);
  if (push) await sendPush(profileId, notification);
}

/** Same, fanned out to every admin profile — used for events with no single fixed recipient. */
async function notifyAdmins(notification, options = {}) {
  const [admins] = await pool.query("SELECT id FROM profiles WHERE role = 'admin'");
  await Promise.all(admins.map((admin) => notifyProfile(admin.id, notification, options)));
}

module.exports = { notifyProfile, notifyAdmins };
