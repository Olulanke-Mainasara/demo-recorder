// Evolve walkthrough: the whole scroll story in Night mode, from the eye
// opening to the footer.
//
//   node record-evolve-demo.mjs
//   DEMO_URL=http://localhost:5173 node record-evolve-demo.mjs
//
// Almost everything on this site is scrubbed to scroll, so the scroll speed
// here *is* the animation speed. Selectors are the class names from the
// Evolve repo (src/components/*); if a chapter is renamed there, update it here.

import {
  HEIGHT,
  NORMAL,
  wait,
  smoothScrollBy,
  scrollTo,
  scrollToBottom,
  record,
} from "./lib/recorder.mjs";

const URL = process.env.DEMO_URL || "https://evolve-prints.vercel.app";

// The two zooms are timed in seconds rather than wheel ticks, so they keep a
// brisk pace however slow the recording machine is.
// The push into the pupil
const DIVE = { duration: 1600 };
// 03's slab-to-wing zoom: the whole pin, of which the zoom is about 2s
const ZOOM = { duration: 3200 };
// Pinned chapters, slow enough to follow each beat
const STORY = { step: 12, delay: 26 };
// Parallax chapters
const DRIFT = { step: 16, delay: 22 };

// A pinned chapter is wrapped in GSAP's .pin-spacer, whose extra height is
// how far you scroll while it's pinned. Falls back to the length set in code.
async function pinLength(page, selector, fallback) {
  const length = await page
    .evaluate((sel) => {
      const el = document.querySelector(sel);
      const spacer = el?.parentElement;
      return spacer?.classList.contains("pin-spacer")
        ? spacer.offsetHeight - el.offsetHeight
        : 0;
    }, selector)
    .catch(() => 0);
  return length > 0 ? length : fallback;
}

// From an element's top at the top of the screen, scroll until its bottom
// reaches the bottom of the screen.
async function scrollThrough(page, locator, speed) {
  const box = await locator.first().boundingBox().catch(() => null);
  if (box && box.y + box.height > HEIGHT) {
    await smoothScrollBy(page, box.y + box.height - HEIGHT, speed);
  }
}

// Scroll to a pinned chapter, hold on its opening, then play the whole pin.
// `pin` is the element GSAP pins, when it isn't the chapter itself.
async function pinned(page, selector, { pin = selector, fallback, hold = 1200, speed = STORY }) {
  await scrollTo(page, page.locator(selector), { at: 0, speed: NORMAL });
  await wait(page, hold);
  await smoothScrollBy(page, await pinLength(page, pin, fallback), speed);
  await wait(page, 1500);
}

async function story(page) {
  // 1. Pupil dive: the stage pushes into the eye until it goes black
  await smoothScrollBy(page, await pinLength(page, ".hero", HEIGHT * 0.85), DIVE);
  await wait(page, 500);

  // 2. 01 Origins: title card on the black, the year counter appears
  await scrollTo(page, page.locator(".origins"), { at: -0.15, speed: NORMAL });
  await wait(page, 2600);

  // 3. 02 Family tree: the ground lifts to the theme on the way in, then the
  // tree draws branch by branch while the counter runs 230 → 150
  await pinned(page, ".family-tree", { fallback: HEIGHT * 2.2 });

  // 4. 03 Archaeopteryx: the slab pushes in to the wing, dissolves to the close-up
  await pinned(page, ".archaeopteryx", { fallback: HEIGHT * 2.4, hold: 1600, speed: ZOOM });

  // 5. 04 Feathers and 05 Habits: text reveals, photos drift at different speeds
  for (const chapter of [".feathers", ".habits"]) {
    await scrollTo(page, page.locator(chapter), { at: 0, speed: NORMAL });
    await wait(page, 1800);
    await scrollThrough(page, page.locator(chapter), DRIFT);
    await wait(page, 800);
  }

  // 6. 06 Impact: hard cut to black, the huge 66, the headline, then the
  // extinction layer rises over it
  await pinned(page, ".impact", { pin: ".impact__pin", fallback: HEIGHT * 2.4, hold: 600 });
  // "The small ones made it." as the ground comes back
  await scrollTo(page, page.locator(".impact__aftermath"), { at: 0.3, speed: NORMAL });
  await wait(page, 2200);

  // 7. 07 Still here: cassowary, the pigeon full-bleed, then the closing line
  await scrollTo(page, page.locator(".still-here"), { at: 0, speed: NORMAL });
  await wait(page, 2000);
  await scrollTo(page, page.locator(".still-here__pigeon"), { at: 0.08, speed: DRIFT });
  await wait(page, 1400);
  await scrollTo(page, page.locator(".still-here__closing"), { at: 0.12, speed: NORMAL });
  await wait(page, 2600);

  // 8. Footer: the EVOLVE wordmark with its eye, then down through the
  // sources and credits
  await scrollTo(page, page.locator("footer"), { at: 0, speed: NORMAL });
  await wait(page, 1800);
  await scrollToBottom(page, NORMAL);
  await wait(page, 1800);
}

await record({
  url: URL,
  // Night mode throughout, like the Mevire video
  colorScheme: "dark",
  init: [
    () => {
      try {
        localStorage.setItem("evolve-theme", "dark");
      } catch {}
    },
  ],
  walkthrough: async (page, markStart, url) => {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 0. Intro (about 5s): EVOLVE is swept by light, the O opens into an eye,
    // the photo grows to fill the screen. It starts once the eye photo has
    // loaded, which the hero marks with data-photo. Scrolling is locked
    // until it ends.
    const started = await page
      .waitForSelector(".hero[data-photo]", { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!started) console.warn("Hero intro never started");
    markStart(0.1);

    await page
      .waitForFunction(
        () => !document.documentElement.classList.contains("is-locked"),
        null,
        { timeout: 15000 },
      )
      .catch(() => console.warn("Hero never unlocked scrolling"));
    // Rest on the revealed eye with its tagline and cue
    await wait(page, 1800);

    await story(page);
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
