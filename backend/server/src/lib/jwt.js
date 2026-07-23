const jwt = require('jsonwebtoken');
const config = require('../config');

const SESSION_TTL = '7d';

function issueToken({ profileId, role }) {
  return jwt.sign({ profileId, role }, config.jwtSecret, { expiresIn: SESSION_TTL });
}

/** Throws jwt's own errors (TokenExpiredError, JsonWebTokenError) on failure. */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { issueToken, verifyToken };
