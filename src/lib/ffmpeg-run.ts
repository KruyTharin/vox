import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Prefer `FFMPEG_PATH`, then `@ffmpeg-installer/ffmpeg`, then `ffmpeg` on PATH.
 * If pnpm ignored installer postinstall scripts, run `pnpm approve-builds` and reinstall.
 */
export function getFfmpegBinaryPath(): string {
  const env = process.env.FFMPEG_PATH?.trim();
  if (env && existsSync(env)) {
    return env;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@ffmpeg-installer/ffmpeg") as { path: string };
    if (mod?.path && existsSync(mod.path)) {
      return mod.path;
    }
  } catch {
    /* optional / verify failed */
  }
  try {
    const p = execSync("command -v ffmpeg", { encoding: "utf8" }).trim();
    if (p) {
      return p;
    }
  } catch {
    /* no ffmpeg on PATH */
  }
  throw new Error(
    "FFmpeg not found. Install ffmpeg, set FFMPEG_PATH, or allow @ffmpeg-installer build scripts (pnpm approve-builds) and reinstall.",
  );
}

export type RunFfmpegResult = { code: number; stderr: string; stdout: string };

export function runFfmpeg(args: string[]): Promise<RunFfmpegResult> {
  const bin = getFfmpegBinaryPath();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr, stdout });
    });
  });
}

export async function runFfmpegOrThrow(args: string[]): Promise<void> {
  const { code, stderr } = await runFfmpeg(args);
  if (code !== 0) {
    const tail = stderr.slice(-4000);
    throw new Error(`ffmpeg exited ${code}: ${tail}`);
  }
}
