// After `expo export --platform web`, fonts and icon fonts sit deep inside dist/assets/node_modules/...
// (folders like node_modules, @expo, build). Netlify's drag-and-drop upload skips node_modules folders
// (and can trip on the others), so the website lost its heading font and icons. This moves every one of
// those files into one plain folder, dist/assets/fonts/, and updates every link to it.
// Run with: npm run build:web
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'fonts');

if (!fs.existsSync(from)) {
  console.log('Nothing to move (no dist/assets/node_modules).');
  process.exit(0);
}

// 1. Copy each file to assets/fonts/<its name> (names already include a unique code), remembering the old address.
const moves = []; // [old web address, new web address]
const collect = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) { collect(file); continue; }
    const rel = path.relative(from, file).split(path.sep).join('/');
    moves.push([`/assets/node_modules/${rel}`, `/assets/fonts/${e.name}`]);
    fs.mkdirSync(to, { recursive: true });
    fs.copyFileSync(file, path.join(to, e.name));
  }
};
collect(from);
// Copy, then delete the originals (a plain rename fails on Windows when a File Explorer window is open on it).
fs.rmSync(from, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

// 2. Point every link at the new addresses.
let changed = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) walk(file);
    else if (/\.(js|html|json|css|map)$/.test(e.name)) {
      let text = fs.readFileSync(file, 'utf8');
      if (!text.includes('/assets/node_modules/')) continue;
      for (const [a, b] of moves) text = text.split(a).join(b);
      fs.writeFileSync(file, text);
      changed++;
    }
  }
};
walk(dist);

// 3. Check nothing still points at, or sits in, a node_modules folder.
const leftovers = [];
const check = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules') leftovers.push(file); else check(file); }
    else if (/\.(js|html)$/.test(e.name) && fs.readFileSync(file, 'utf8').includes('/assets/node_modules/')) leftovers.push(file);
  }
};
check(dist);
if (leftovers.length) { console.error('Still pointing at node_modules:', leftovers); process.exit(1); }
console.log(`Moved ${moves.length} font/icon files to dist/assets/fonts and updated ${changed} file(s). Ready for Netlify.`);
