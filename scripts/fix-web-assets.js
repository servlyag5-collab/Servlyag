// After `expo export --platform web`, fonts and icon fonts sit in dist/assets/node_modules/...
// Netlify's drag-and-drop upload skips every folder called node_modules, so the website lost its
// heading font and icons. This moves them to dist/assets/vendor/ and updates every link to them.
// Run with: npm run build:web
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');

if (!fs.existsSync(from)) {
  console.log('Nothing to move (no dist/assets/node_modules).');
  process.exit(0);
}
// Copy, then delete the original (a plain rename fails on Windows when a File Explorer window is open on it).
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
fs.rmSync(from, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

let changed = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|html|json|css|map)$/.test(entry.name)) {
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('/assets/node_modules/')) {
        fs.writeFileSync(file, text.split('/assets/node_modules/').join('/assets/vendor/'));
        changed++;
      }
    }
  }
};
walk(dist);

const left = [];
const find = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  if (e.isDirectory()) (e.name === 'node_modules' ? left.push(path.join(dir, e.name)) : find(path.join(dir, e.name)));
});
find(dist);
if (left.length) { console.error('Still inside node_modules folders:', left); process.exit(1); }
console.log(`Moved fonts and icons to dist/assets/vendor and updated ${changed} file(s). Ready for Netlify.`);
