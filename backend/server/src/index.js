const express = require('express');
const cors = require('cors');
const config = require('./config');
const { ApiError } = require('./lib/errors');
const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participant');
const adminRoutes = require('./routes/admin');
const fileRoutes = require('./routes/files');

const app = express();

// CloudPanel puts Nginx in front of this app, so req.ip/req.ips must come from the
// X-Forwarded-For header it sets rather than the proxy's own socket address — otherwise
// every request looks like it's from the same IP, which breaks per-IP rate limiting
// (routes/auth.js) and would make express-rate-limit throw a startup validation error.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, data: { status: 'My CIV-Project API is running' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint tidak ditemukan.' });
});

// Express only treats a 4-arg function as error middleware; `next` must stay even if unused.
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  // Unexpected errors (DB failures, bugs, etc.) are logged in full but never
  // shown to the client verbatim — could leak connection strings, SQL, stack traces.
  console.error(err);
  res.status(500).json({ ok: false, error: 'Terjadi kesalahan pada server.' });
});

app.listen(config.port, () => {
  console.log(`My CIV-Project API listening on port ${config.port}`);
});
