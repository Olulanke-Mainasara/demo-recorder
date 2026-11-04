# demo-recorder

Records a smooth scripted walkthrough of a website on GitHub's servers, so your own machine does no recording.

## Setup (once)

1. Create a new GitHub repo (public repos get free Actions minutes with no limit).
2. Put these files in it, keeping the folder layout:
   ```
   record-demo.mjs
   package.json
   .github/workflows/record-demo.yml
   ```
3. Push.

## Record a video

1. On GitHub, open the repo's **Actions** tab.
2. Pick **Record demo** on the left, then **Run workflow**. Change the URL if you want a different site.
3. Wait about 2 to 3 minutes. Open the finished run and download **demo-video** at the bottom. It's a zip with `demo.mp4` inside.

## Tweaking the walkthrough

All the choreography lives in `main()` in `record-demo.mjs`, numbered by section:

- Slower scrolling: lower `step` or raise `delay` in a `smoothScrollBy` call.
- Longer pauses: raise the numbers in `wait(page, ...)`.
- Hover something new: `await hover(page, page.getByText('Some text', { exact: true }));`
- Different site: copy the file, and rewrite the section steps using that site's headings.

If a heading or element isn't found, the script logs a warning and skips it instead of crashing, so check the run log if a section looks missing.

## Optional: test locally

```bash
npm install
npx playwright install chromium
node record-demo.mjs
```
This is fine to run on an old Mac: the video is captured from the browser's own frames, so a slow machine makes the run take longer but doesn't make the video stutter as badly as a screen recorder would. Output is `videos/raw.webm`.
# demo-recorder
