# demo-recorder

Records smooth scripted walkthroughs of websites on GitHub's servers, so your own machine does no recording. Each project gets its own script.

```text
lib/recorder.mjs              Shared: browser, cursor, scrolling, hovers, drags, saving the video
record-mevire-demo.mjs        Mevire: home page, then the job board via the nav menu
record-evolve-demo.mjs        Evolve: the whole scroll story, in Night mode
record-arepo-demo.mjs         Arepo: home page, then the Products page via the header nav
.github/workflows/record-demo.yml
```

## Rule: every video is 1:30 or shorter

No recording may run longer than **1:30 (90 seconds)**, counted from the first kept frame (after the loading trim) to the end. Aim for about 1:20 so a slower runner still fits.

- Each run's log prints how long the video is (`keeps 81.4s`) and warns if it's over 90s.
- The workflow's MP4 step cuts at 90s as a backstop (`-t 90`). Don't rely on that: it chops off the ending.
- To make room, speed up the scrolling in the middle of a walkthrough, or shorten its holds and hovers. Leave splash screens and hero intros at their own pace.

Current lengths, measured locally: Mevire 81s, Evolve 81s, Arepo 80s.

## Record a video

1. On GitHub, open the repo's **Actions** tab.
2. Pick **Record demo** on the left, then **Run workflow**. Choose the project. Leave the URL blank to use the one in that project's script, or paste another (a preview deploy, say).
3. Wait a few minutes. Open the finished run and download the artifact at the bottom (`mevire-demo`, for example). It's a zip with the MP4 inside.

## Add a project

1. Copy `record-mevire-demo.mjs` to `record-<name>-demo.mjs`.
2. Change `URL` and rewrite `walkthrough` using that site's headings and buttons. Call `markStart()` at the first frame worth keeping; everything before it is trimmed. Keep it under 1:30 (see above).
3. Add `<name>` to the `options` list under `project` in `.github/workflows/record-demo.yml`.
4. Add `"record:<name>": "node record-<name>-demo.mjs"` to the scripts in `package.json`.

## Tweaking a walkthrough

Helpers you can use, all from `lib/recorder.mjs`:

- `smoothScrollBy(page, px, speed)`: scroll with real wheel events. `speed` is a pace, `{ rate: 900 }` in pixels per second, or a fixed `{ duration: 3000 }` in ms. Both take the same time on any machine, so use them. The older `FAST`, `NORMAL`, `SLOW` and `{ step, delay }` count wheel ticks, and each tick waits on the browser, so their length depends on how fast the machine is.
- `scrollTo(page, locator, { at: 0.15, speed })`: scroll until the element's top is 15% down the screen.
- `scrollToBottom(page, speed)` and `scrollToTop(page, speed)`
- `moveMouse(page, x, y, ms)`: glide the cursor to a point over `ms` (0 jumps there). Use this rather than `page.mouse.move`, so the cursor's position stays tracked.
- `hover(page, locator, pauseMs)`: glide the cursor over something and hold so its hover effect shows.
- `click(page, locator)`: hover, then click.
- `glideX(page, locator, { to: "end", duration: 4000 })`: smooth eased sideways scroll of a carousel strip (`to` is `"end"`, `"start"` or px).
- `drag(page, locator, dx)`: press and drag sideways, for carousels.
- `wait(page, ms)`

If an element isn't found, the script logs a warning and skips that step instead of crashing, so check the run log if a section looks missing.

## Optional: test locally

```bash
npm install
npx playwright install chromium
npm run record:mevire        # or record:evolve, record:arepo
DEMO_URL=http://localhost:3000 npm run record:mevire   # against a local dev server
DEMO_CHANNEL=chrome npm run record:mevire             # use your installed Chrome
```

Playwright no longer downloads Chromium or its video encoder for macOS 12 and older. On those Macs, use `DEMO_CHANNEL=chrome` to record with your installed Chrome.

The video records in real time, so anything that waits on the browser makes it longer. That's why the scripts use timed paces. Output is `videos/raw.webm`, and the log line says how long it is.
