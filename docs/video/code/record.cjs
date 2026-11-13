// Records an animated scene page (docs/video/code/sceneN.html) into a vertical MP4, frame by frame.
// Usage: node record.cjs <scene.html> <out.mp4> [seconds=5] [fps=30]
// Needs: puppeteer-core and ffmpeg-static (set TOOLS_DIR to the folder whose node_modules has them),
// and Microsoft Edge installed. Each frame calls window.render(t) in the page, so timing is exact.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const tools = process.env.TOOLS_DIR;
const req = (m) => require(tools ? path.join(tools, 'node_modules', m) : m);
const puppeteer = req('puppeteer-core');
const ffmpeg = req('ffmpeg-static');

const [scene, out, secs = '5', fpsArg = '30'] = process.argv.slice(2);
const seconds = Number(secs), fps = Number(fpsArg), frames = Math.round(seconds * fps);
const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find((p) => fs.existsSync(p));

(async () => {
  // If Edge was started separately with --remote-debugging-port (BROWSER_URL=http://127.0.0.1:9333), connect to it;
  // otherwise start our own headless Edge.
  const browser = process.env.BROWSER_URL
    ? await puppeteer.connect({ browserURL: process.env.BROWSER_URL })
    : await puppeteer.launch({ executablePath: edge, headless: true, dumpio: !!process.env.DEBUG, userDataDir: path.join(require('os').tmpdir(), 'servly-video-edge'), args: ['--allow-file-access-from-files', '--hide-scrollbars', '--no-first-run', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.resolve(scene).replace(/\\/g, '/') + '?record', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / fps);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log(`Recorded ${frames} frames -> ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
