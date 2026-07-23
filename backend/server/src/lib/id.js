const crypto = require('crypto');

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

module.exports = { makeId };
