import { Composition } from "remotion";
import { MacWindow, FPS } from "./MacWindow";

// render.mjs passes the real props; these let `npm run studio` show a frame
// once a recording has been copied to public/recording.webm
const defaultProps = {
  title: "Mevire",
  video: "recording.webm",
  background: "backgrounds/dunes-wolfgang-hasselmann.jpg",
  trimStart: 0,
  seconds: 10,
};

export const RemotionRoot = () => (
  <Composition
    id="MacWindow"
    component={MacWindow}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={defaultProps.seconds * FPS}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.floor(props.seconds * FPS)),
    })}
  />
);
