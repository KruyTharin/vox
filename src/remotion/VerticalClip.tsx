import { AbsoluteFill, OffthreadVideo } from "remotion";

export type VerticalClipProps = {
  /** Remote URL or local URL served during render (e.g. after FFmpeg preprocess). */
  videoSrc: string;
  /** Must match trimmed clip length in frames (fps × seconds). */
  durationInFrames: number;
};

export function VerticalClip({ videoSrc }: VerticalClipProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {videoSrc ? (
        <OffthreadVideo
          src={videoSrc}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}
