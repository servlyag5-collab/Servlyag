// Records a scene page into a vertical MP4 using Edge's built-in --screenshot, one frame per run
// (used because Edge here won't allow remote control). Several frames run at once.
// Usage: node record-frames.cjs <scene.html> <out.mp4> [seconds=5] [fps=30] [parallel=6]
// Needs ffmpeg-static (TOOLS_DIR = folder whose node_modules has it) and Microsoft Edge.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const tools = process.env.TOOLS_DIR;
const ffmpeg = require(tools ? path.join(tools, 'node_modules', 'ffmpeg-static') : 'ffmpeg-static');
const [scene, out, secs = '5', fpsArg = '30', parArg = '6'] = process.argv.slice(2);
const seconds = Number(secs), fps = Number(fpsArg), par = Number(parArg), frames = Math.round(seconds * fps);
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find((p) => fs.existsSync(p));
const url = 'file:///' + path.resolve(scene).replace(/\\/g, '/');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'servly-frames-'));

function shoot(i, slot) {
  return new Promise((resolve) => {
    const file = path.join(dir, `f${String(i).padStart(4, '0')}.png`);
    const p = spawn(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files',
      `--user-data-dir=${path.join(os.tmpdir(), 'servly-video-edge-' + slot)}`, '--force-device-scale-factor=1',
      '--window-size=1080,1920', '--virtual-time-budget=1500', `--screenshot=${file}`, `${url}?record&t=${(i / fps).toFixed(4)}`],
      { stdio: 'ignore' });
    // A stuck Edge (seen 2026-11-09: 2 of 150 frames hung) is killed after 30 s; the frame is then retried.
    const kill = setTimeout(() => { try { p.kill(); } catch { /* gone */ } }, 30000);
    p.on('close', () => {
      clearTimeout(kill);
      // Edge sometimes returns before the file lands: wait up to 10 s.
      let n = 0; const wait = () => (fs.existsSync(file) || n++ > 100 ? resolve(fs.existsSync(file)) : setTimeout(wait, 100)); wait();
    });
  });
}

(async () => {
  let next = 0, failed = 0;
  const worker = async (slot) => {
    while (next < frames) { const i = next++; if (!(await shoot(i, slot)) && !(await shoot(i, slot))) failed++; }
  };
  const started = Date.now();
  await Promise.all(Array.from({ length: par }, (_, s) => worker(s)));
  if (failed) { console.error(`${failed} frame(s) missing in ${dir}`); process.exit(1); }
  await new Promise((resolve, reject) => {
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: 'inherit' });
    ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg ' + c))));
  });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`Recorded ${frames} frames in ${Math.round((Date.now() - started) / 1000)} s -> ${out}`);
})();
