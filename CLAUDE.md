# demo-recorder

- **Every recorded video must be 1:30 (90 seconds) or shorter**, counted from the first kept frame to the end. Aim for about 1:20. When changing a walkthrough, re-check its length: each run logs `keeps Ns`. The workflow's `-t 90` cut is only a backstop.
- To make room, speed up mid-walkthrough scrolling, or shorten holds and hovers. Don't speed up splash screens or hero intros.
- Use timed paces (`{ rate }` px/s or `{ duration }` ms) and `moveMouse`, not wheel-tick speeds or `page.mouse.move`, so a video is the same length on any machine. See README.md.
- Framed videos (the default) are rendered by Remotion: `render.mjs` plus `remotion/MacWindow.jsx`. The page stays 1440×900, and the dark title bar is added on top of it in a 1920×1080, 25fps frame. Keep the window free of gradients and blur. Use `/remotion-best-practices` (in `.claude/skills/`) when changing `remotion/`.
