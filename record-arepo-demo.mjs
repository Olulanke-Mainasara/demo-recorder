// Arepo walkthrough: the whole home page, then the Products page through the
// header nav.
//
//   node record-arepo-demo.mjs
//   DEMO_URL=http://localhost:5173 node record-arepo-demo.mjs
//
// Selectors come from the Arepo repo (app/components/sections/*). Section
// headings are matched by how they start, so a changed ending won't break them.

import {
  WIDTH,
  HEIGHT,
  wait,
  scrollTo,
  scrollToBottom,
  moveMouse,
  hover,
  click,
  record,
} from "./lib/recorder.mjs";

const URL = process.env.DEMO_URL || "https://arepo-one.vercel.app";

// A timed pace (px per second) rather than wheel ticks, so the video comes out
// the same length however slow the recording machine is. It must stay under
// 1:30.
const MOVE = { rate: 600 };

const section = (page, heading) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });

async function home(page) {
  // 1. Hero: the wordmark on the dark wall, the ribbon swaying behind it
  await wait(page, 1800);
  await moveMouse(page, WIDTH * 0.55, HEIGHT * 0.6, 0);
  await hover(page, page.getByRole("link", { name: "Get in touch", exact: true }), 900);

  // 2. Clients: the header turns white as the page moves, the logo tiles fade
  // in, and each hovered tile flips to white with the colour logo
  const clients = section(page, /^Trusted across transport/);
  await scrollTo(page, clients, { at: 0, speed: MOVE });
  await wait(page, 1000);
  const tiles = clients.locator("li");
  for (const i of [0, 3, 5, 6, 9]) {
    await hover(page, tiles.nth(i), 700);
  }

  // 3. Offerings: three cards; the middle one's rows link to products
  const offerings = section(page, /^Online database solutions to streamline/);
  await scrollTo(page, offerings, { at: 0, speed: MOVE });
  await wait(page, 1200);
  const cards = offerings.locator("article");
  for (let i = 0; i < 3; i++) {
    await scrollTo(page, cards.nth(i), { at: 0.12, speed: MOVE });
    await wait(page, 900);
    if (i === 1) {
      for (const label of ["Transport Operations", "Car park management"]) {
        await hover(page, cards.nth(i).getByRole("link", { name: label }), 700);
      }
    }
  }

  // 4. Our unique approach: the guarantees list staggers in, then the stats
  const platform = section(page, /^Our unique approach/);
  await scrollTo(page, platform, { at: 0, speed: MOVE });
  await wait(page, 1500);
  await hover(page, platform.getByRole("link", { name: "About Arepo" }), 800);
  await scrollTo(page, page.locator("main dl").first(), { at: 0.45, speed: MOVE });
  await wait(page, 1200);

  // 5. Product bento: hovering a tile lights its border and tips its arrow
  const products = section(page, /^Our software products/);
  await scrollTo(page, products, { at: 0, speed: MOVE });
  await wait(page, 1000);
  const bento = (slug) => products.locator(`a[href="/products/${slug}"]`);
  await scrollTo(page, bento("tracerit"), { at: 0.1, speed: MOVE });
  for (const slug of ["tracerit", "inkara", "goss", "cautus"]) {
    await hover(page, bento(slug), 900);
  }

  // 6. Our services
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.5);
  await scrollTo(page, section(page, /^Our services/), { at: 0, speed: MOVE });
  await wait(page, 1800);

  // 7. Testimonials: step through a couple of quotes
  const quotes = section(page, /^What our customers say/);
  await scrollTo(page, quotes, { at: 0.05, speed: MOVE });
  await wait(page, 1500);
  for (let i = 0; i < 2; i++) {
    await click(page, quotes.getByRole("button", { name: "Next testimonial" }), 400);
    await wait(page, 2000);
  }

  // 8. Closing call to action, then the footer
  const cta = section(page, /^Whatever your business is/);
  await scrollTo(page, cta, { at: 0, speed: MOVE });
  await wait(page, 1200);
  await hover(page, cta.getByRole("link", { name: "Start a conversation" }), 900);
  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.4);
  await scrollToBottom(page, MOVE);
  await wait(page, 1500);

  // 9. Over to Products through the header nav
  const nav = page.getByRole("navigation", { name: "Main" });
  await hover(page, nav.getByRole("link", { name: "Services", exact: true }), 600);
  await click(page, nav.getByRole("link", { name: "Products", exact: true }), 600);
  await page
    .waitForURL("**/products", { timeout: 15000 })
    .catch(() => console.warn("Didn't reach /products from the nav"));
}

async function productsPage(page) {
  // Page hero, with "Products" underlined in the nav
  await wait(page, 1800);

  // Each product in turn; hovering its name fills the arrow disc
  const listing = page.locator("main article");
  const count = await listing.count();
  for (let i = 0; i < count; i++) {
    await scrollTo(page, listing.nth(i), { at: 0.12, speed: MOVE });
    await wait(page, 700);
    await hover(page, listing.nth(i).locator('a[href^="/products/"]'), 900);
  }

  await moveMouse(page, WIDTH * 0.5, HEIGHT * 0.5);
  await scrollTo(page, section(page, /^Our online database solutions process/), {
    at: 0,
    speed: MOVE,
  });
  await wait(page, 2000);
}

await record({
  url: URL,
  title: "Arepo",
  walkthrough: async (page, markStart, url) => {
    // Prerendered static HTML, no intro: start as soon as it's painted
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await wait(page, 300);
    markStart();

    await home(page);
    await productsPage(page);
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
