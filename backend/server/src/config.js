require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Placeholders that have appeared in this repo's .env.example / docs over time — if any
// of these end up live, every session in production would be forgeable, so refuse to boot
// rather than run with a known/guessable secret.
const KNOWN_PLACEHOLDER_SECRETS = new Set(['change-me', 'changeme', 'secret', 'your-secret-here']);
const MIN_JWT_SECRET_LENGTH = 32;

function requiredJwtSecret() {
  const value = required('JWT_SECRET');
  if (KNOWN_PLACEHOLDER_SECRETS.has(value.toLowerCase())) {
    throw new Error(
      'JWT_SECRET is still set to a placeholder value. Generate a real one, e.g. `openssl rand -hex 32`.'
    );
  }
  if (value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET is too short (${value.length} chars, minimum ${MIN_JWT_SECRET_LENGTH}). Generate a real one, e.g. \`openssl rand -hex 32\`.`
    );
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
  },
  jwtSecret: requiredJwtSecret(),
  storageDir: process.env.STORAGE_DIR || require('path').join(__dirname, '..', 'storage'),
};
