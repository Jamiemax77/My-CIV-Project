const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPin(pin) {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

module.exports = { hashPin, verifyPin };
