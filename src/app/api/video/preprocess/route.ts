import {
  extractVideoThumbnail,
  isAllowedVideoExtension,
  preprocessVideoToStandard,
  type VideoPreprocessOptions,
} from "@/lib/video-preprocess";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { finished } from "node:stream/promises";

export const runtime = "nodejs";
export const maxDuration = 900;

const MAX_BYTES = 200 * 1024 * 1024;

function parseDurationField(v: FormDataEntryValue | null): number | undefined {
  if (v == null || typeof v !== "string") return undefined;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(30, Math.max(15, n));
}

function parseCrfField(v: FormDataEntryValue | null): number | undefined {
  if (v == null || typeof v !== "string") return undefined;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(28, Math.max(18, n));
}

export async function POST(request: Request) {
  let workDir: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: 'Expected multipart field "file" (one video).' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB).` }, { status: 400 });
    }
    const name = file.name || "upload.mp4";
    if (!isAllowedVideoExtension(name)) {
      return Response.json(
        { error: `Unsupported extension. Allowed: mp4, mov, webm, mkv, mpeg, mpg, m4v, avi.` },
        { status: 400 },
      );
    }

    const opts: VideoPreprocessOptions = {};
    const d = parseDurationField(form.get("maxDurationSec"));
    const c = parseCrfField(form.get("crf"));
    if (d !== undefined) opts.maxDurationSec = d;
    if (c !== undefined) opts.crf = c;

    workDir = join(tmpdir(), `vox-pre-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    await mkdir(workDir, { recursive: true });
    const ext = extname(name) || ".mp4";
    const rawPath = join(workDir, `input${ext}`);
    const outPath = join(workDir, "normalized.mp4");
    const thumbPath = join(workDir, "thumbnail.jpg");
    await writeFile(rawPath, Buffer.from(await file.arrayBuffer()));
    await preprocessVideoToStandard(rawPath, outPath, opts);
    await extractVideoThumbnail(outPath, thumbPath, 0.5);

    const wantThumb = form.get("includeThumbnail") === "1" || form.get("includeThumbnail") === "true";
    if (wantThumb) {
      const { default: archiver } = await import("archiver");
      const zipPath = join(workDir, "out.zip");
      const ws = createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(ws);
      archive.file(outPath, { name: `${basename(name, ext) || "clip"}-normalized.mp4` });
      archive.file(thumbPath, { name: `${basename(name, ext) || "clip"}-thumbnail.jpg` });
      await archive.finalize();
      await finished(ws);
      const zipBuf = await readFile(zipPath);
      return new Response(zipBuf, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="normalized-with-thumb.zip"',
        },
      });
    }

    const mp4 = await readFile(outPath);
    return new Response(mp4, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="normalized-9x16.mp4"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preprocess failed";
    console.error("[preprocess-video]", err);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
