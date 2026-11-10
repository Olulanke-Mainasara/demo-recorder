# demo-recorder

Records smooth scripted walkthroughs of websites on GitHub's servers, so your own machine does no recording. Each project gets its own script.

```text
lib/recorder.mjs              Shared: browser, cursor, scrolling, hovers, drags, saving the video
record-mevire-demo.mjs        Mevire: home page, then the job board via the nav menu
record-evolve-demo.mjs        Evolve: the whole scroll story, in Night mode
record-arepo-demo.mjs         Arepo: home page, then the Products page via the header nav
render.mjs                    Frames a recording in a Mac window and renders it with Remotion
remotion/                     The Remotion composition: window, title bar, backdrop
public/backgrounds/           The landscape photos the window sits on
.github/workflows/record-demo.yml
```

## Rule: every video is 1:30 or shorter

No recording may run longer than **1:30 (90 seconds)**, counted from the first kept frame (after the loading trim) to the end. Aim for about 1:20 so a slower runner still fits.

- Each run's log prints how long the video is (`keeps 81.4s`) and warns if it's over 90s.
- Both of the workflow's MP4 steps cut at 90s as a backstop. Don't rely on that: it chops off the ending.
- To make room, speed up the scrolling in the middle of a walkthrough, or shorten its holds and hovers. Leave splash screens and hero intros at their own pace.

Current lengths, measured locally: Mevire 81s, Evolve 81s, Arepo 80s.

## Record a video

1. On GitHub, open the repo's **Actions** tab.
2. Pick **Record demo** on the left, then **Run workflow**. Choose the project. Leave the URL blank to use the one in that project's script, or paste another (a preview deploy, say).
   - **Mac window frame** is ticked by default: you get a 1920×1080 video with the site in a Mac window on a landscape photo (see below). Untick it for the plain 1440×900 recording.
3. Wait a few minutes. Open the finished run and download the artifact at the bottom (`mevire-demo`, for example). It's a zip with the MP4 inside.

## The Mac window frame

With the frame on, `render.mjs` hands the recording to [Remotion](https://www.remotion.dev), which renders a 1920×1080, 25fps MP4:

- The page stays at its recorded 1440×900. A dark macOS-style title bar (28px) sits on top of it, with the traffic lights and the project's name, so the window is 1440×928, centred.
- Behind the window is a landscape photo, picked at random from `public/backgrounds/` on every render. The run log says which one. To add a photo, drop a .jpg in that folder; to retire one, delete it.
- The title is the `title` passed to `record()` in each project's script.
- 25fps matches Playwright, which records at a fixed 25 frames a second, so every recorded frame shows exactly once and scrolling stays even.

The look lives in `remotion/MacWindow.jsx`. To preview it, record locally, run `npm run render` once (it copies the recording to `public/recording.webm`), then `npm run studio`.

Remotion is free for individuals and companies of up to 3 people; bigger companies need a [company license](https://www.remotion.pro/license). Its agent skills are installed in `.claude/skills/` (`/remotion-best-practices` and friends).

### Photo credits

All from [Unsplash](https://unsplash.com), free to use under the Unsplash License:

| File | Photo | By |
|---|---|---|
| `dunes-wolfgang-hasselmann.jpg` | [Rolling sand dunes](https://unsplash.com/photos/pVr6wvUneMk) | Wolfgang Hasselmann |
| `sahara-pawel-wieladek.jpg` | [Sunrise over the Sahara](https://unsplash.com/photos/K3S4VPuswyw) | Paweł Wielądek |
| `sossusvlei-line-w.jpg` | [Sossusvlei, Namibia](https://unsplash.com/photos/q131pxQY8uI) | Line W |
| `joghaz-lake-aleksandr-popov.jpg` | [Joghaz reservoir at dusk, Armenia](https://unsplash.com/photos/tlBWWOxMbGQ) | Aleksandr Popov |
| `la-digue-secret-travel-guide.jpg` | [La Digue, Seychelles](https://unsplash.com/photos/gJupehxmPas) | Secret Travel Guide |
| `palawan-bernd-dittrich.jpg` | [Linapacan, Palawan, Philippines](https://unsplash.com/photos/S3T26BSyXok) | Bernd Dittrich |

## Add a project

1. Copy `record-mevire-demo.mjs` to `record-<name>-demo.mjs`.
2. Change `URL` and `title` (the name in the window's title bar), and rewrite `walkthrough` using that site's headings and buttons. Call `markStart()` at the first frame worth keeping; everything before it is trimmed. Keep it under 1:30 (see above).
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

To frame it:

```bash
npm run render -- videos/mevire-demo.mp4                 # the whole video
npm run render -- videos/frame.png --still=300           # just frame 300 (12s in), as a PNG
```

Remotion's video encoder needs macOS 13 or newer (or Linux). On older Macs only `--still` works, and it needs your installed Chrome: add `--browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
