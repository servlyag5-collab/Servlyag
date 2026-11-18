// Builds the LAUNCH version of the website into launch/web (kept off GitHub): the same app as `npm run build:web`,
// but payments go to https://servlyag.com/pay. Made ahead of launch so launch day is only "drag and switch on".
// Run with: npm run build:web:launch   (then see docs/LAUNCH-KIT.md for when and where to upload it)
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const env = { ...process.env, EXPO_PUBLIC_PAY_URL: 'https://servlyag.com/pay' }; // wins over the test address in .env
execSync('npx expo export --platform web --output-dir launch/web --clear', { cwd: root, env, stdio: 'inherit' });
execSync('node scripts/fix-web-assets.js launch/web', { cwd: root, stdio: 'inherit' });
console.log('Launch website ready in launch/web (payments: https://servlyag.com/pay). Nothing has been uploaded.');
