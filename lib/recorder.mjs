// Shared plumbing for every record-<project>-demo.mjs script: browser setup,
// a visible cursor, smooth wheel scrolling, hovers, drags and saving the video.
// A project script only writes its walkthrough and calls record().
//
// Output: videos/raw.webm plus videos/meta.json (seconds of loading to trim).

import { chromium } from "playwright";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";

export const WIDTH = 1440;
export const HEIGHT = 900;
const OUT_DIR = "videos";
// Every video must come in under 1:30. The workflow's MP4 step also cuts at
// this length as a backstop, so keep scripts a few seconds under it.
export const MAX_SECONDS = 90;

// Scroll speeds for smoothScrollBy and scrollTo. Pixels per wheel tick, and
// milliseconds between ticks. Lower step or higher delay = slower. How long
// these take depends on the machine, since every tick waits on the browser.
export const FAST = { step: 70, delay: 16 };
export const NORMAL = { step: 40, delay: 16 };
export const SLOW = { step: 10, delay: 28 };
// A speed can instead be a pace, { rate } in pixels per second, or a fixed
// { duration } in ms. Both take the same time on any machine, which keeps a
// walkthrough's length predictable.

// A visible fake cursor. Headless browsers don't draw the mouse, so viewers
// would otherwise see hovers happen with no pointer on screen.
function installCursor() {
  const install = () => {
    if (document.getElementById("__demo_cursor")) return;
    const style = document.createElement("style");
    style.textContent =
      "::-webkit-scrollbar{display:none}html{scrollbar-width:none}";
    document.head.appendChild(style);

    const c = document.createElement("div");
    c.id = "__demo_cursor";
    Object.assign(c.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.92)",
      border: "2px solid #0a0a0a",
      boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
      pointerEvents: "none",
      zIndex: "2147483647",
      transform: "translate(-100px, -100px)",
      transition: "scale 0.12s ease",
    });
    document.documentElement.appendChild(c);

    // If the framework re-renders the document and drops the cursor, put it back
    const ensure = () => {
      if (!c.isConnected) document.documentElement.appendChild(c);
    };

    window.addEventListener(
      "mousemove",
      (e) => {
        ensure();
        c.style.transform = `translate(${e.clientX - 9}px, ${e.clientY - 9}px)`;
      },
      true,
    );
    window.addEventListener("mousedown", () => (c.style.scale = "0.7"), true);
    window.addEventListener("mouseup", () => (c.style.scale = "1"), true);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
}

export const wait = (page, ms) => page.waitForTimeout(ms);

// Resolves once the page has stopped moving for a few frames, so smooth-scroll
// libraries (Lenis etc.) have finished easing before we measure anything.
export async function settle(page, timeout = 4000) {
  await page
    .evaluate(
      (limit) =>
        new Promise((resolve) => {
          const started = performance.now();
          let last = window.scrollY;
          let still = 0;
          const tick = () => {
            const y = window.scrollY;
            still = Math.abs(y - last) < 1 ? still + 1 : 0;
            last = y;
            if (still >= 4 || performance.now() - started > limit) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      timeout,
    )
    .catch(() => {});
}

// Scroll with real wheel events in small steps. This triggers scroll-based
// animations (and smooth-scroll libraries like Lenis) the same way a person would.
//
// `speed` is either { step, delay } (fixed-size ticks; the real pace depends on
// how fast the machine answers each tick) or { duration } in ms, which covers
// the distance in that time however slow the machine is. Use duration when
// the timing matters, e.g. a scrubbed zoom.
export async function smoothScrollBy(page, distance, speed = NORMAL) {
  if (speed.rate) {
    return scrollOver(page, distance, (Math.abs(distance) / speed.rate) * 1000);
  }
  if (speed.duration) return scrollOver(page, distance, speed.duration);
  const { step, delay } = speed;
  const steps = Math.ceil(Math.abs(distance) / step);
  if (!steps) return;
  const each = distance / steps; // lands exactly on the distance
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, each);
    await wait(page, delay);
  }
  await settle(page);
}

// Time-based scroll: each tick sends however much distance is due by now, so
// a slow round trip makes the ticks bigger rather than the scroll longer.
// Smooth-scroll libraries (Lenis) ease out the larger ticks.
async function scrollOver(page, distance, duration) {
  if (!distance) return;
  duration = Math.max(1, duration);
  const start = Date.now();
  let sent = 0;
  for (;;) {
    const t = Math.min(1, (Date.now() - start) / duration);
    const delta = distance * t - sent;
    if (delta !== 0) {
      await page.mouse.wheel(0, delta);
      sent += delta;
    }
    if (t === 1) break;
    await wait(page, 16);
  }
  await settle(page);
}

// Scroll until the element's top edge sits `at` of the way down the screen
// (0 = top edge, 0.5 = middle). Warns and skips if it can't be found.
export async function scrollTo(page, locator, { at = 0.15, speed } = {}) {
  const box = await locator
    .first()
    .boundingBox({ timeout: 4000 })
    .catch(() => null);
  if (!box) {
    console.warn(`Not found, skipping scroll: ${locator}`);
    return false;
  }
  await smoothScrollBy(page, box.y - HEIGHT * at, speed);
  return true;
}

// Scroll the rest of the way down to the bottom of the page.
export async function scrollToBottom(page, speed) {
  const left = await page.evaluate(
    () =>
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY,
  );
  await smoothScrollBy(page, left, speed);
}

// Glide a sideways-scrolling strip (a carousel) to `to`: "end", "start" or a
// position in px. It's eased and driven frame by frame inside the page, so
// it's perfectly smooth on video, like a slow trackpad swipe.
export async function glideX(page, locator, { to = "end", duration = 4000 } = {}) {
  const done = await locator
    .first()
    .evaluate(
      (el, { to, duration }) =>
        new Promise((resolve) => {
          const from = el.scrollLeft;
          const max = el.scrollWidth - el.clientWidth;
          const target =
            to === "end" ? max : to === "start" ? 0 : Math.min(max, Math.max(0, to));
          const behavior = el.style.scrollBehavior;
          el.style.scrollBehavior = "auto";
          const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2; // sine in-out
          const begin = performance.now();
          const tick = (now) => {
            const t = Math.min(1, (now - begin) / duration);
            el.scrollLeft = from + (target - from) * ease(t);
            if (t < 1) return requestAnimationFrame(tick);
            el.style.scrollBehavior = behavior;
            resolve(true);
          };
          requestAnimationFrame(tick);
        }),
      { to, duration },
      { timeout: 3000 },
    )
    .catch(() => false);
  if (!done) console.warn(`Not found, skipping sideways scroll: ${locator}`);
  return done;
}

// Scroll all the way back up to the top of the page.
export async function scrollToTop(page, speed) {
  const y = await page.evaluate(() => window.scrollY);
  await smoothScrollBy(page, -y, speed);
}

// Where the cursor is. Playwright doesn't say, so every move goes through
// moveMouse, which keeps track. Scripts should use it, not page.mouse.move.
const pointer = { x: 0, y: 0 };

// Glide the cursor to (x, y) over `duration` ms, eased. Each step goes to
// wherever the cursor should be by now, so a slow machine sends fewer, bigger
// steps rather than taking longer. A duration of 0 jumps straight there.
export async function moveMouse(page, x, y, duration = 400) {
  if (duration <= 0) {
    await page.mouse.move(x, y);
  } else {
    const from = { ...pointer };
    const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2; // sine in-out
    const start = Date.now();
    for (;;) {
      const t = Math.min(1, (Date.now() - start) / duration);
      const k = ease(t);
      await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
      if (t === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  pointer.x = x;
  pointer.y = y;
}

// Glide the cursor onto an element (its centre, or a point given as a fraction
// of its box) and pause so hover effects show. A target that's off screen is
// scrolled to the middle first.
export async function hover(page, locator, pause = 900, { x = 0.5, y = 0.5 } = {}) {
  const el = locator.first();
  let box = await el.boundingBox({ timeout: 3000 }).catch(() => null);
  if (!box) {
    console.warn(`Not found, skipping hover: ${locator}`);
    return false;
  }
  const cy = box.y + box.height * y;
  if (cy < 0 || cy > HEIGHT) {
    await smoothScrollBy(page, cy - HEIGHT * 0.5);
    box = await el.boundingBox().catch(() => null);
    if (!box) return false;
  }
  await moveMouse(page, box.x + box.width * x, box.y + box.height * y);
  await wait(page, pause);
  return true;
}

// Hover, then press and release where the cursor landed.
// Returns false (and logs) if the element isn't there.
export async function click(page, locator, pause = 400, point) {
  if (!(await hover(page, locator, pause, point))) return false;
  await page.mouse.down();
  await wait(page, 90);
  await page.mouse.up();
  return true;
}

// Press on an element and drag it sideways by dx pixels, like a person
// swiping a carousel with the mouse.
export async function drag(page, locator, dx, { from = 0.75 } = {}) {
  const box = await locator
    .first()
    .boundingBox({ timeout: 3000 })
    .catch(() => null);
  if (!box) {
    console.warn(`Not found, skipping drag: ${locator}`);
    return false;
  }
  const x = box.x + box.width * from;
  const y = box.y + box.height / 2;
  await moveMouse(page, x, y, 400);
  await wait(page, 250);
  await page.mouse.down();
  await moveMouse(page, x + dx, y, 700);
  await wait(page, 60);
  await page.mouse.up();
  return true;
}

// Launches the browser, runs the walkthrough and saves the video.
//
// walkthrough(page, markStart) drives the page. Call markStart() at the first
// frame worth keeping; everything recorded before it is trimmed off. If it's
// never called, the trim point is right after the first page load.
export async function record({ url, colorScheme = "dark", init = [], walkthrough }) {
  mkdirSync(OUT_DIR, { recursive: true });

  // DEMO_CHANNEL=chrome records with your installed Chrome instead, for Macs
  // Playwright no longer downloads Chromium for (macOS 12 and older)
  const channel = process.env.DEMO_CHANNEL;
  const browser = await chromium.launch(channel ? { channel } : {});
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme,
    reducedMotion: "no-preference",
    recordVideo: { dir: OUT_DIR, size: { width: WIDTH, height: HEIGHT } },
  });
  await context.addInitScript(installCursor);
  for (const script of init) await context.addInitScript(script);

  const page = await context.newPage();
  const videoStart = Date.now(); // recording starts when the page is created
  let trimStart = null;
  const markStart = (lead = 0) => {
    if (trimStart === null) {
      trimStart = Math.max(0, (Date.now() - videoStart) / 1000 - lead);
    }
  };

  try {
    await walkthrough(page, markStart, url);
  } finally {
    if (trimStart === null) markStart();
    const kept = (Date.now() - videoStart) / 1000 - trimStart;
    // Closing the context is what writes the video file
    const video = page.video();
    await context.close();
    await browser.close();

    const rawPath = await video.path();
    renameSync(rawPath, `${OUT_DIR}/raw.webm`);
    writeFileSync(
      `${OUT_DIR}/meta.json`,
      JSON.stringify({ trimStart }, null, 2),
    );
    console.log(
      `Saved ${OUT_DIR}/raw.webm (trim first ${trimStart.toFixed(2)}s, keeps ${kept.toFixed(1)}s)`,
    );
    if (kept > MAX_SECONDS) {
      console.warn(
        `Walkthrough ran ${kept.toFixed(1)}s, over the ${MAX_SECONDS}s limit: the MP4 step cuts it at ${MAX_SECONDS}s, so tighten the script`,
      );
    }
  }
}
