# demo-recorder

- **Every recorded video must be 1:30 (90 seconds) or shorter**, counted from the first kept frame to the end. Aim for about 1:20. When changing a walkthrough, re-check its length: each run logs `keeps Ns`. The workflow's `-t 90` cut is only a backstop.
- To make room, speed up mid-walkthrough scrolling, or shorten holds and hovers. Don't speed up splash screens or hero intros.
- Use timed paces (`{ rate }` px/s or `{ duration }` ms) and `moveMouse`, not wheel-tick speeds or `page.mouse.move`, so a video is the same length on any machine. See README.md.
