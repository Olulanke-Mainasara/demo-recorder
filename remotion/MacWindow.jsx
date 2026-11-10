// The recording in a dark macOS-style window, centred on a landscape photo.
// The page keeps its recorded 1440×900 and the title bar sits on top of it,
// so the window is 1440×928 in a 1920×1080 frame.

import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["600"],
  subsets: ["latin"],
});

// Playwright records at 25fps; matching it shows every recorded frame once,
// so scrolling stays even
export const FPS = 25;

const PAGE_WIDTH = 1440;
const PAGE_HEIGHT = 900;
const BAR_HEIGHT = 28;
const WINDOW_HEIGHT = BAR_HEIGHT + PAGE_HEIGHT;

// Close, minimise, zoom: fill and edge colours
const LIGHTS = [
  ["#ff5f57", "#e0443e"],
  ["#febc2e", "#dea123"],
  ["#28c840", "#1aab29"],
];

const TitleBar = ({ title }) => (
  <div
    style={{
      position: "relative",
      height: BAR_HEIGHT,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2b2b2d",
      borderBottom: "1px solid #0d0d0d",
      color: "#dedede",
      fontFamily,
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "0.01em",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 13,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        gap: 8,
      }}
    >
      {LIGHTS.map(([fill, edge]) => (
        <div
          key={fill}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: fill,
            boxShadow: `inset 0 0 0 0.6px ${edge}`,
          }}
        />
      ))}
    </div>
    {title}
  </div>
);

export const MacWindow = ({ title, video, background, trimStart }) => {
  const { width, height, fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <Img
        src={staticFile(background)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          left: (width - PAGE_WIDTH) / 2,
          top: (height - WINDOW_HEIGHT) / 2,
          width: PAGE_WIDTH,
          height: WINDOW_HEIGHT,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: "#000",
          boxShadow:
            "0 24px 70px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.55)",
        }}
      >
        <TitleBar title={title} />
        <Video
          src={staticFile(video)}
          trimBefore={Math.round(trimStart * fps)}
          muted
          style={{ display: "block", width: PAGE_WIDTH, height: PAGE_HEIGHT }}
        />
      </div>
    </AbsoluteFill>
  );
};
