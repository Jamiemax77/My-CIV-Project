/**
 * Usage: node scripts/hash-pin.js 123456
 * Prints a bcrypt hash to paste into `profiles.pin_hash` for a seeded user.
 */
const { hashPin } = require('../src/lib/password');

const pin = process.argv[2];
if (!pin) {
  console.error('Usage: node scripts/hash-pin.js <pin>');
  process.exit(1);
}

hashPin(pin).then((hash) => {
  console.log(hash);
});
