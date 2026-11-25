// Builds the FOUNDERS version of the website into founders/web (kept off GitHub), for the public-but-unlisted
// founders site (e.g. servly-founders.netlify.app) that only founding businesses get the link to before launch
// (owner's decision 2026-11-23). Same app, but the Pay button is switched off ("Online payment is not connected
// yet"), because the link can be passed around and payments are still in test mode. Founding businesses get their
// plan with a personal invite code (v41). The payment server is also locked to admins (PAYMENTS_ADMIN_ONLY = yes).
// Run with: npm run build:web:founders   (upload steps: docs/LAUNCH-KIT.md)
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const env = { ...process.env, EXPO_PUBLIC_PAY_URL: '', EXPO_PUBLIC_FOUNDERS_PREVIEW: 'yes' }; // no Pay button; no messages or calls (src/lib/preview.ts)
execSync('npx expo export --platform web --output-dir founders/web --clear', { cwd: root, env, stdio: 'inherit' });
execSync('node scripts/fix-web-assets.js founders/web', { cwd: root, stdio: 'inherit' });
console.log('Founders website ready in founders/web (Pay switched off). Nothing has been uploaded.');
