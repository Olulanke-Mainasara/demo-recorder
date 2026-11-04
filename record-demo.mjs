// Records a scripted walkthrough of a site with Playwright.
// Output: videos/raw.webm plus videos/meta.json (how many seconds of blank loading to trim).
// Run in GitHub Actions (see .github/workflows/record-demo.yml) so your Mac does none of the work.

import { chromium } from 'playwright';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';

const URL = process.env.DEMO_URL || 'https://mevire.vercel.app';
const WIDTH = 1920;
const HEIGHT = 1080;
const OUT_DIR = 'videos';

// A visible fake cursor. Headless browsers don't draw the mouse, so viewers
// would otherwise see hovers happen with no pointer on screen.
function installCursor() {
  const install = () => {
    if (document.getElementById('__demo_cursor')) return;
    const style = document.createElement('style');
    style.textContent = '::-webkit-scrollbar{display:none}html{scrollbar-width:none}';
    document.head.appendChild(style);

    const c = document.createElement('div');
    c.id = '__demo_cursor';
    Object.assign(c.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.92)',
      border: '2px solid #0a0a0a',
      boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transform: 'translate(-100px, -100px)',
      transition: 'scale 0.12s ease',
    });
    document.documentElement.appendChild(c);

    window.addEventListener('mousemove', (e) => {
      c.style.transform = `translate(${e.clientX - 9}px, ${e.clientY - 9}px)`;
    }, true);
    window.addEventListener('mousedown', () => { c.style.scale = '0.7'; }, true);
    window.addEventListener('mouseup', () => { c.style.scale = '1'; }, true);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
}

const wait = (page, ms) => page.waitForTimeout(ms);

// Scroll with real wheel events in small steps. This triggers scroll-based
// animations (and smooth-scroll libraries like Lenis) the same way a person would.
async function smoothScrollBy(page, distance, { step = 50, delay = 16 } = {}) {
  const steps = Math.ceil(Math.abs(distance) / step);
  const dir = Math.sign(distance);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step * dir);
    await wait(page, delay);
  }
  await wait(page, 600); // let smooth scrolling settle
}

// Scroll until a heading sits about 15% from the top of the screen.
async function scrollToHeading(page, name, opts) {
  const heading = page.getByRole('heading', { name }).first();
  const box = await heading.boundingBox({ timeout: 4000 }).catch(() => null);
  if (!box) {
    console.warn(`Heading not found, skipping: ${name}`);
    return;
  }
  await smoothScrollBy(page, box.y - HEIGHT * 0.15, opts);
}

// Glide the cursor onto an element and pause on it so hover effects show.
async function hover(page, locator, pause = 900) {
  const box = await locator.first().boundingBox({ timeout: 3000 }).catch(() => null);
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 30 });
  await wait(page, pause);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: WIDTH, height: HEIGHT } },
  });
  await context.addInitScript(installCursor);

  const page = await context.newPage();
  const videoStart = Date.now(); // recording starts when the page is created

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await wait(page, 300);

  // Everything before this moment is blank loading, so we trim it later.
  const trimStart = (Date.now() - videoStart) / 1000;
  await page.mouse.move(WIDTH * 0.5, HEIGHT * 0.6);

  // 1. Hero: let the intro animation play, drift the cursor across the images
  await wait(page, 2500);
  await page.mouse.move(WIDTH * 0.7, HEIGHT * 0.45, { steps: 40 });
  await wait(page, 800);
  await page.mouse.move(WIDTH * 0.3, HEIGHT * 0.55, { steps: 40 });
  await wait(page, 800);

  // 2. Stats counters animate as they enter the viewport
  await smoothScrollBy(page, HEIGHT * 0.9, { step: 40 });
  await wait(page, 1800);

  // 3. Services
  await scrollToHeading(page, 'What we do');
  for (const title of ['Design packages', 'Inspection & testing', 'Resident engineers']) {
    await hover(page, page.getByRole('heading', { name: title }));
  }

  // 4. Process steps, scrolled slowly so each one can be read
  await scrollToHeading(page, 'How a job moves', { step: 30, delay: 20 });
  await wait(page, 1200);
  await smoothScrollBy(page, HEIGHT * 0.6, { step: 25, delay: 20 });
  await wait(page, 1200);

  // 5. Register of engineers
  await scrollToHeading(page, 'On the register.');
  for (const person of ['Chukwuemeka Obi', 'Hannah Clarke', 'Arjun Mehta']) {
    await hover(page, page.getByText(person, { exact: true }), 700);
  }

  // 6. "Pick your side" cards
  await scrollToHeading(page, 'Pick your side of the job.');
  for (const label of ['Take drawings', 'Take a site', 'Work a trade']) {
    await hover(page, page.getByText(label, { exact: true }), 700);
  }

  // 7. Footer
  await smoothScrollBy(page, 3000, { step: 60 });
  await wait(page, 1500);

  // 8. Back to the top, then open the job board
  await smoothScrollBy(page, -20000, { step: 200, delay: 12 });
  await wait(page, 800);
  const jobsLink = page.getByRole('link', { name: 'Job board' }).first();
  await hover(page, jobsLink, 500);
  await jobsLink.click().catch(() => console.warn('Could not click Job board link'));
  await page.waitForLoadState('load');
  await wait(page, 2000);
  await smoothScrollBy(page, HEIGHT * 0.7, { step: 40 });
  await wait(page, 1500);

  // Finish: closing the context saves the video file
  const video = page.video();
  await context.close();
  await browser.close();

  const rawPath = await video.path();
  renameSync(rawPath, `${OUT_DIR}/raw.webm`);
  writeFileSync(`${OUT_DIR}/meta.json`, JSON.stringify({ trimStart }, null, 2));
  console.log(`Saved ${OUT_DIR}/raw.webm (trim first ${trimStart.toFixed(2)}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
