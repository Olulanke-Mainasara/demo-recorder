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
  NORMAL,
  wait,
  smoothScrollBy,
  scrollTo,
  scrollToBottom,
  hover,
  click,
  drag,
  record,
} from "./lib/recorder.mjs";

const URL = process.env.DEMO_URL || "https://mevire.vercel.app";

// The staircase line in "How a job moves" is scrubbed to scroll, so this
// stretch goes slowly enough to read each step as it's drawn
const CRAWL = { step: 8, delay: 30 };

const section = (page, heading) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) });

// The navbar fades out while scrolling down and back in on any scroll up.
// Nudge the page up and wait until the bar can actually be clicked.
async function revealNavBar(page) {
  await smoothScrollBy(page, -180, NORMAL);
  await page
    .waitForFunction(
      () => {
        const bar = document
          .querySelector("[aria-controls='site-menu']")
          ?.closest("header");
        if (!bar) return true;
        const style = getComputedStyle(bar);
        return style.visibility !== "hidden" && Number(style.opacity) > 0.95;
      },
      null,
      { timeout: 3000 },
    )
    .catch(() => console.warn("Navbar didn't come back into view"));
  await wait(page, 300);
}

async function openMenu(page) {
  await click(page, page.getByRole("button", { name: "Open menu" }), 500);
  // Backdrop fades, panel slides in from the right, links rise one by one
  await wait(page, 1600);
}

// Menu links are big text in a full-width block, so aim at the words
const menuLink = (page, name) =>
  page.locator("#site-menu").getByRole("link", { name, exact: true });
const ON_TEXT = { x: 0.18, y: 0.5 };

async function home(page) {
  // 1. Hero: heading rises, photos wipe in, navbar drops down
  await wait(page, 700);
  await page.mouse.move(WIDTH * 0.55, HEIGHT * 0.97);
  await hover(
    page,
    page.locator("main").getByRole("link", { name: "Submit a job" }),
    1000,
  );
  // Swap the hero carousel to its second slide (wipes up, caption rolls in)
  await click(page, page.getByRole("button", { name: "Show Plant room coordination" }), 500);
  await wait(page, 2200);
  await page.mouse.move(WIDTH * 0.5, HEIGHT * 0.45, { steps: 35 });
  await wait(page, 400);

  // 2. Stats: the hero scrolls away over the fixed photo, figures count up (3s)
  await smoothScrollBy(page, HEIGHT, NORMAL);
  await wait(page, 2800);

  // 3. Services: title and cards reveal, then drag through the carousel
  const services = section(page, "What we do");
  await scrollTo(page, services, { at: 0, speed: NORMAL });
  await wait(page, 1700);
  await hover(page, page.getByRole("heading", { name: "Design packages" }), 800);
  const strip = services.locator("article").first().locator("..");
  await drag(page, strip, -650);
  await wait(page, 1600);
  await drag(page, strip, -650);
  await wait(page, 1600);
  await click(page, page.getByRole("button", { name: "Show Design packages" }), 400);
  await wait(page, 1400);

  // 4. How a job moves: park the list just below where the line starts,
  // then crawl so the staircase draws and each step rises in turn
  const how = section(page, "How a job moves");
  const steps = how.locator("ol");
  await page.mouse.move(WIDTH * 0.85, HEIGHT * 0.5, { steps: 30 });
  await scrollTo(page, steps, { at: 0.72, speed: NORMAL });
  await wait(page, 1400);
  const box = await steps.boundingBox().catch(() => null);
  if (box) {
    // The line finishes when the list's bottom reaches 60% of the screen
    await smoothScrollBy(page, box.y + box.height - HEIGHT * 0.6 + 40, CRAWL);
  }
  await wait(page, 1500);

  // 5. On the register: title, then the photo grid with hover zooms
  const register = section(page, /^On the register/);
  await scrollTo(page, register.getByRole("heading", { level: 2 }), {
    at: 0.12,
    speed: NORMAL,
  });
  await wait(page, 1500);
  await hover(page, register.getByRole("link", { name: "Join the register" }), 900);
  await scrollTo(page, register.locator("ul").first(), { at: 0.02, speed: NORMAL });
  await wait(page, 600);
  for (const name of [
    "Chukwuemeka Obi",
    "Mei Lin Tan & Grace Wong",
    "Hannah Clarke",
    "Adaeze Nwosu & Bisi Adeyemi",
    "Your name here.",
  ]) {
    await hover(page, register.locator("li").filter({ hasText: name }), 1100);
  }

  // 6. Pick your side: rules draw across, rows rise, hovering dims the others
  const sides = section(page, /^Pick your side/);
  await scrollTo(page, sides.getByRole("heading", { level: 2 }), {
    at: 0.1,
    speed: NORMAL,
  });
  await wait(page, 1800);
  await hover(page, sides.getByRole("link", { name: "See what's open" }), 900);
  await scrollTo(page, sides.locator("ul"), { at: 0.25, speed: NORMAL });
  for (const title of ["Take drawings", "Take a site", "Work a trade"]) {
    await hover(page, sides.getByRole("link").filter({ hasText: title }), 1000, {
      x: 0.35,
      y: 0.5,
    });
  }

  // 7. Footer: photo parallax, email headline, then the wordmark letters rise
  const footer = page.locator("footer");
  await page.mouse.move(WIDTH * 0.5, HEIGHT * 0.5, { steps: 25 });
  await scrollTo(page, footer, { at: 0, speed: NORMAL });
  await wait(page, 1300);
  await hover(page, footer.getByRole("link", { name: "support.mevire@gmail.com" }), 1000);
  await page.mouse.move(WIDTH * 0.6, HEIGHT * 0.35, { steps: 25 });
  await scrollToBottom(page, NORMAL);
  await wait(page, 1800);

  // 8. Into the job board through the nav menu
  await revealNavBar(page);
  await openMenu(page);
  await hover(page, menuLink(page, "Home"), 600, ON_TEXT);
  await hover(page, menuLink(page, "Register"), 600, ON_TEXT);
  await click(page, menuLink(page, "Job board"), 700, ON_TEXT);
  await page
    .waitForURL("**/jobs", { timeout: 15000 })
    .catch(() => console.warn("Didn't reach /jobs from the menu"));
}

async function jobBoard(page) {
  // Menu slides away while the page header rises and the rows come in
  await wait(page, 2200);
  await hover(
    page,
    page.locator("main").getByRole("link", { name: "Sign in for full details" }),
    1000,
  );

  // Filters: each pick re-runs the rows' rise
  const filters = page.getByRole("group", { name: "Filter by role" });
  await scrollTo(page, filters, { at: 0.12, speed: NORMAL });
  await wait(page, 500);
  for (const role of ["Design engineer", "Trade", "All roles"]) {
    await click(page, filters.getByRole("button", { name: role }), 400);
    await wait(page, 1300);
  }

  // Hovering a row dims the others and swings its arrow
  const rows = page.locator("[data-row]");
  for (let i = 0; i < 3; i++) {
    await hover(page, rows.nth(i), 900, { x: 0.4, y: 0.5 });
  }

  // Down past the rest of the list to the WhatsApp section
  const alert = section(page, /^Postings hit the WhatsApp group first/);
  await page.mouse.move(WIDTH * 0.5, HEIGHT * 0.5, { steps: 25 });
  await scrollTo(page, alert, { at: 0.08, speed: NORMAL });
  await wait(page, 1800);
  await hover(page, alert.getByRole("link", { name: "Join the WhatsApp group" }), 1000);

  // Close on the menu again: "Job board" now shows as the current page
  await revealNavBar(page);
  await openMenu(page);
  await hover(page, menuLink(page, "Job board"), 1000, ON_TEXT);
  await click(page, page.getByRole("button", { name: "Close menu" }), 500);
  await wait(page, 1600);
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
        .waitForFunction(() => window.__splashDone === true, null, { timeout: 20000 })
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
