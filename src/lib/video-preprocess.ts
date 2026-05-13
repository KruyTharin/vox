import { runFfmpegOrThrow } from "@/lib/ffmpeg-run";
import {
  PREPROCESS_DEFAULT_MAX_DURATION_SEC,
  PREPROCESS_TARGET_HEIGHT,
  PREPROCESS_TARGET_WIDTH,
} from "@/lib/video-preprocess-constants";

export {
  PREPROCESS_DEFAULT_MAX_DURATION_SEC,
  PREPROCESS_TARGET_HEIGHT,
  PREPROCESS_TARGET_WIDTH,
};

export type VideoPreprocessOptions = {
  /** Output width (default 1080). */
  width?: number;
  /** Output height (default 1920). */
  height?: number;
  /** Hard trim: keep only the first N seconds (15–30 typical). */
  maxDurationSec?: number;
  /** libx264 CRF; lower = larger file / better quality (18–28 typical). */
  crf?: number;
  /** libx264 preset (ultrafast … veryslow). */
  preset?: string;
  /** Output frames per second (default 30). */
  fps?: number;
};

const defaultOpts: Required<
  Pick<VideoPreprocessOptions, "width" | "height" | "maxDurationSec" | "crf" | "preset" | "fps">
> = {
  width: PREPROCESS_TARGET_WIDTH,
  height: PREPROCESS_TARGET_HEIGHT,
  maxDurationSec: PREPROCESS_DEFAULT_MAX_DURATION_SEC,
  crf: 23,
  preset: "medium",
  fps: 30,
};

/**
 * Normalize to 9:16 (cover + center crop), trim length, H.264 + AAC, faststart.
 * Retries without audio if the input has no audio stream.
 */
export async function preprocessVideoToStandard(
  inputPath: string,
  outputPath: string,
  options: VideoPreprocessOptions = {},
): Promise<void> {
  const w = options.width ?? defaultOpts.width;
  const h = options.height ?? defaultOpts.height;
  const t = options.maxDurationSec ?? defaultOpts.maxDurationSec;
  const crf = options.crf ?? defaultOpts.crf;
  const preset = options.preset ?? defaultOpts.preset;
  const fps = options.fps ?? defaultOpts.fps;

  const vf = [
    `scale=${w}:${h}:force_original_aspect_ratio=increase`,
    `crop=${w}:${h}`,
    `fps=${fps}`,
    "format=yuv420p",
  ].join(",");

  const baseArgs = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
    "-t",
    String(t),
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-crf",
    String(crf),
    "-preset",
    preset,
    "-movflags",
    "+faststart",
    "-pix_fmt",
    "yuv420p",
  ];

  const withAudio = [...baseArgs, "-c:a", "aac", "-b:a", "160k", outputPath];
  try {
    await runFfmpegOrThrow(withAudio);
  } catch {
    const noAudio = [...baseArgs, "-an", outputPath];
    await runFfmpegOrThrow(noAudio);
  }
}

/**
 * Single JPEG thumbnail from a video file (after preprocess, matches final framing).
 */
export async function extractVideoThumbnail(
  inputPath: string,
  outputJpegPath: string,
  seekSec = 0.5,
): Promise<void> {
  await runFfmpegOrThrow([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(seekSec),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputJpegPath,
  ]);
}

export const ALLOWED_VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "webm",
  "mkv",
  "mpeg",
  "mpg",
  "m4v",
  "avi",
]);

export function isAllowedVideoExtension(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_VIDEO_EXTENSIONS.has(ext);
}
