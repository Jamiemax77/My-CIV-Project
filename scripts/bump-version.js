// Bumps the patch number of app.json's expo.version (e.g. 1.5.0 -> 1.5.1) and mirrors it
// into package.json's version so the two never drift apart. Run manually before an EAS
// build whenever you want the "Tentang Aplikasi" version string to move forward — this
// does NOT touch Android's versionCode (see eas.json's appVersionSource note).
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Version "${version}" bukan format semver (X.Y.Z).`);
  }
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const oldVersion = appJson.expo.version;
const newVersion = bumpPatch(oldVersion);
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version bumped: ${oldVersion} -> ${newVersion}`);
console.log('Updated: app.json, package.json');
