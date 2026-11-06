// Mevire walkthrough: the whole home page (splash to footer), then into the
// job board through the slide-in nav menu, and the job board top to bottom.
//
//   node record-mevire-demo.mjs
//   DEMO_URL=http://localhost:3000 node record-mevire-demo.mjs
//
// Selectors come from the Mevire repo (components/pages/home, components/pages/jobs,
// components/shared/NavBar.tsx). If a section is renamed there, update it here.

import {
  WIDTH,
  HEIGHT,
  wait,
  smoothScrollBy,
  scrollTo,
  scrollToBottom,
  scrollToTop,
  glideX,
  moveMouse,
  hover,
  click,
  record,
} from "./lib/recorder.mjs";

const URL = process.env.DEMO_URL || "https://mevire.vercel.app";

// Every scroll is timed (a pace in px per second, or a duration) rather than
// counted in wheel ticks, so the video comes out the same length however slow
// the recording machine is. It must stay under 1:30.

// Getting from one section to the next
const MOVE = { rate: 1200 };
// The staircase line in "How a job moves" is scrubbed to scroll, so this
// stretch goes slowly enough to see each step drawn
const CRAWL = { rate: 340 };
// An easy browsing pace, for scrolling past the register's photos
const BROWSE = { rate: 340 };
// The long run from the footer back up to the hero
const RETURN = { duration: 2200 };
// The small nudge up that brings the navbar back
const NUDGE = { duration: 400 };

const section = (page, heading) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading }) });

// The navbar fades out while scrolling down and back in on any scroll up.
const navBarShowing = () => {
  const bar = document
    .querySelector("[aria-controls='site-menu']")
    ?.closest("header");
  if (!bar) return true;
  const style = getComputedStyle(bar);
  return style.visibility !== "hidden" && Number(style.opacity) > 0.95;
};

// Nudge the page up if the bar is hidden, and wait until it can be clicked
async function revealNavBar(page) {
  if (!(await page.evaluate(navBarShowing))) {
    await smoothScrollBy(page, -180, NUDGE);
  }
  await page
    .waitForFunction(navBarShowing, null, { timeout: 3000 })
    .catch(() => console.warn("Navbar didn't come back into view"));
  await wait(page, 200);
}

async function openMenu(page) {
  await click(page, page.getByRole("button", { name: "Open menu" }), 400);
  // Backdrop fades, panel slides in from the right, links rise one by one
  await wait(page, 1200);
}

// Menu links are big text in a full-width block, so aim at the words
const menuLink = (page, name) =>
  page.locator("#site-menu").getByRole("link", { name, exact: true });
const ON_TEXT = { x: 0.18, y: 0.5 };

async function home(page) {
  // 1. Hero: heading rises, photos wipe in, navbar drops down. The one pill
  // hover in the video (the orange fill and the label rolling up) is here.
  await wait(page, 700);
  await moveMouse(page, WIDTH * 0.55, HEIGHT * 0.97, 0);
  await hover(
    page,
    page.locator("main").getByRole("link", { name: "Submit a job" }),
    1100,
  );
  // Swap the hero carousel to its second slide (wipes up, caption rolls in)
  await click(
    page,
    page.getByRole("button", { name: "Show Plant room coordination" }),
    500,
  );
  await wait(page, 2200);
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.45, 600);
  await wait(page, 300);

  // 2. Stats: the hero scrolls away over the fixed photo, figures count up (3s)
  await smoothScrollBy(page, HEIGHT, MOVE);
  await wait(page, 1500);

  // 3. Services: title and cards reveal, then one sideways glide through
  // all three cards (the strip scrolls freely, no snapping)
  const services = section(page, "What we do");
  await scrollTo(page, services, { at: 0, speed: MOVE });
  await wait(page, 800);
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.62);
  const strip = services.locator("article").first().locator("..");
  await glideX(page, strip, { to: "end", duration: 2800 });
  await wait(page, 300);

  // 4. How a job moves: park the list just below where the line starts,
  // then crawl so the staircase draws and each step rises in turn
  const steps = section(page, "How a job moves").locator("ol");
  await moveMouse(page, WIDTH * 0.85, HEIGHT * 0.5);
  await scrollTo(page, steps, { at: 0.72, speed: MOVE });
  await wait(page, 400);
  const box = await steps.boundingBox().catch(() => null);
  if (box) {
    // The line finishes when the list's bottom reaches 60% of the screen
    await smoothScrollBy(page, box.y + box.height - HEIGHT * 0.6 + 40, CRAWL);
  }
  await wait(page, 500);

  // 5. On the register: the title rises, then keep scrolling down the photo
  // grid without stopping, until the "Your name here." card, which gets the
  // one hover (its arrow swings round)
  const register = section(page, /^On the register/);
  await scrollTo(page, register.getByRole("heading", { level: 2 }), {
    at: 0.15,
    speed: MOVE,
  });
  await wait(page, 400);
  const yourName = register
    .locator("li")
    .filter({ hasText: "Your name here." });
  const card = await yourName.boundingBox().catch(() => null);
  if (card) {
    // Wait in the card's column, so it scrolls up under the cursor
    await moveMouse(page, card.x + card.width / 2, HEIGHT * 0.56);
  }
  await scrollTo(page, yourName, { at: 0.4, speed: BROWSE });
  await hover(page, yourName, 700);

  // 6. Pick your side: rules draw across, rows rise, hovering dims the others
  const sides = section(page, /^Pick your side/);
  await scrollTo(page, sides.getByRole("heading", { level: 2 }), {
    at: 0.1,
    speed: MOVE,
  });
  await wait(page, 1200);
  for (const title of ["Take drawings", "Take a site", "Work a trade"]) {
    await hover(
      page,
      sides.getByRole("link").filter({ hasText: title }),
      500,
      {
        x: 0.35,
        y: 0.5,
      },
    );
  }

  // 7. Footer: straight to the very bottom without stopping, so the photo
  // parallax plays and the wordmark letters rise in full view. Then back up
  // to the email headline.
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.5);
  await scrollToBottom(page, MOVE);
  await wait(page, 1600);
  const email = page
    .locator("footer")
    .getByRole("link", { name: "support.mevire@gmail.com" });
  await scrollTo(page, email, { at: 0.35, speed: MOVE });
  await hover(page, email, 700);

  // 8. All the way back up to the hero, then into the job board through the
  // nav menu (scrolling up has already brought the bar back)
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.5);
  await scrollToTop(page, RETURN);
  await wait(page, 200);
  await revealNavBar(page);
  await openMenu(page);
  await click(page, menuLink(page, "Job board"), 500, ON_TEXT);
  await page
    .waitForURL("**/jobs", { timeout: 15000 })
    .catch(() => console.warn("Didn't reach /jobs from the menu"));
}

async function jobBoard(page) {
  // Menu slides away while the page header rises and the rows come in
  await wait(page, 1800);

  // Filters: each pick re-runs the rows' rise
  const filters = page.getByRole("group", { name: "Filter by role" });
  await scrollTo(page, filters, { at: 0.12, speed: MOVE });
  await wait(page, 300);
  for (const role of ["Design engineer", "All roles"]) {
    await click(page, filters.getByRole("button", { name: role }), 300);
    await wait(page, 900);
  }

  // Hovering a row dims the others and swings its arrow
  const rows = page.locator("[data-row]");
  for (let i = 0; i < 3; i++) {
    await hover(page, rows.nth(i), 600, { x: 0.4, y: 0.5 });
  }

  // Footer: as on the home page, straight down past the rest of the list and
  // the WhatsApp section to the very bottom without stopping, so the photo
  // parallax plays and the wordmark letters rise in full view
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.5);
  await scrollToBottom(page, MOVE);
  await wait(page, 1800);

  // Close on the menu again: "Job board" now shows as the current page
  await revealNavBar(page);
  await openMenu(page);
  await hover(page, menuLink(page, "Job board"), 600, ON_TEXT);
  await click(page, page.getByRole("button", { name: "Close menu" }), 400);
  await wait(page, 900);
}

await record({
  url: URL,
  colorScheme: "dark",
  init: [
    () => {
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    },
    // The site fires this when its splash hands over to the hero
    () => {
      window.addEventListener("splash:done", () => {
        window.__splashDone = true;
      });
    },
  ],
  walkthrough: async (page, markStart, url) => {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 0. Splash: the word wheel rolls Mechanical → Electrical → Plumbing →
    // Mevire, then wipes off with an orange trail (about 6.5s). It only
    // plays when a visit starts on "/", which a fresh browser always does.
    const splash = await page
      .getByRole("listbox")
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (splash) {
      markStart(0.15);
      await page
        .waitForFunction(() => window.__splashDone === true, null, {
          timeout: 20000,
        })
        .catch(() => console.warn("Splash never finished"));
    } else {
      console.warn("No splash showed; starting from the hero");
      await page.waitForLoadState("load");
      markStart();
    }

    // The hero locks scrolling until its entrance has finished
    await page
      .waitForFunction(
        () => document.documentElement.style.overflow !== "hidden",
        null,
        { timeout: 10000 },
      )
      .catch(() => console.warn("Hero never unlocked scrolling"));

    await home(page);
    await jobBoard(page);
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
