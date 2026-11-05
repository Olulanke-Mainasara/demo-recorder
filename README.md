# demo-recorder

Records smooth scripted walkthroughs of websites on GitHub's servers, so your own machine does no recording. Each project gets its own script.

```text
lib/recorder.mjs              Shared: browser, cursor, scrolling, hovers, drags, saving the video
record-mevire-demo.mjs        Mevire: home page, then the job board via the nav menu
record-evolve-demo.mjs        Evolve: the whole scroll story, in Night mode
record-arepo-demo.mjs         Arepo: home page, then the Products page via the header nav
.github/workflows/record-demo.yml
```

## Record a video

1. On GitHub, open the repo's **Actions** tab.
2. Pick **Record demo** on the left, then **Run workflow**. Choose the project. Leave the URL blank to use the one in that project's script, or paste another (a preview deploy, say).
3. Wait a few minutes. Open the finished run and download the artifact at the bottom (`mevire-demo`, for example). It's a zip with the MP4 inside.

## Add a project

1. Copy `record-mevire-demo.mjs` to `record-<name>-demo.mjs`.
2. Change `URL` and rewrite `walkthrough` using that site's headings and buttons. Call `markStart()` at the first frame worth keeping; everything before it is trimmed.
3. Add `<name>` to the `options` list under `project` in `.github/workflows/record-demo.yml`.
4. Add `"record:<name>": "node record-<name>-demo.mjs"` to the scripts in `package.json`.

## Tweaking a walkthrough

Helpers you can use, all from `lib/recorder.mjs`:

- `smoothScrollBy(page, px, speed)`: scroll with real wheel events. `speed` is `FAST`, `NORMAL`, `SLOW` or your own `{ step, delay }` (lower step or higher delay is slower).
- `scrollTo(page, locator, { at: 0.15 })`: scroll until the element's top is 15% down the screen.
- `scrollToBottom(page, speed)` and `scrollToTop(page, speed)`
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
```

The video is captured from the browser's own frames, so a slow machine makes the run take longer but doesn't make the video stutter the way a screen recorder would. Output is `videos/raw.webm`.
