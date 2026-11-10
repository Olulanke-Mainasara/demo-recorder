// Frames the last recording in a Mac window on a landscape photo picked at
// random from public/backgrounds, and renders a 1920×1080 MP4 with Remotion
// (see remotion/). Run it after a record-<project>-demo.mjs script.
//
//   node render.mjs videos/mevire-demo.mp4
//   node render.mjs videos/mevire-demo.mp4 --frames=0-124   # extra flags go to Remotion
//   node render.mjs videos/frame.png --still=300            # just frame 300, as a PNG

import { copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { MAX_SECONDS } from "./lib/recorder.mjs";

const [out = "videos/demo.mp4", ...flags] = process.argv.slice(2);

const meta = JSON.parse(readFileSync("videos/meta.json", "utf8"));
const photos = readdirSync("public/backgrounds").filter((f) => f.endsWith(".jpg"));
const background = `backgrounds/${photos[Math.floor(Math.random() * photos.length)]}`;

// Remotion serves files from public/
copyFileSync("videos/raw.webm", "public/recording.webm");

const props = {
  title: meta.title,
  video: "recording.webm",
  background,
  trimStart: meta.trimStart,
  // Never past 1:30
  seconds: Math.min(meta.seconds, MAX_SECONDS),
};
writeFileSync("videos/props.json", JSON.stringify(props, null, 2));
console.log(
  `Framing "${props.title}" on ${background} (${props.seconds.toFixed(1)}s)`,
);

const still = flags.find((flag) => flag.startsWith("--still="));
const rest = flags.filter((flag) => flag !== still);
const command = still
  ? ["still", `--frame=${still.split("=")[1]}`]
  : ["render", "--codec=h264", "--crf=18"];

const [verb, ...options] = command;
const { status } = spawnSync(
  "npx",
  [
    "remotion",
    verb,
    "remotion/index.jsx",
    "MacWindow",
    out,
    "--props=videos/props.json",
    ...options,
    ...rest,
  ],
  { stdio: "inherit" },
);
process.exit(status ?? 1);
