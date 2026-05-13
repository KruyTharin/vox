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

const MAX_FILES = 12;
const MAX_BYTES_PER_FILE = 120 * 1024 * 1024;

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
    const maxDurationSec = parseDurationField(form.get("maxDurationSec"));
    const crf = parseCrfField(form.get("crf"));
    const opts: VideoPreprocessOptions = {};
    if (maxDurationSec !== undefined) opts.maxDurationSec = maxDurationSec;
    if (crf !== undefined) opts.crf = crf;

    const files = form.getAll("files").filter((e): e is File => e instanceof File);
    if (files.length === 0) {
      return Response.json({ error: "Add at least one file under the “files” field." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return Response.json({ error: `Too many files (max ${MAX_FILES}).` }, { status: 400 });
    }

    for (const f of files) {
      if (f.size > MAX_BYTES_PER_FILE) {
        return Response.json(
          { error: `File too large: ${f.name || "upload"} (max ${MAX_BYTES_PER_FILE / (1024 * 1024)} MB each).` },
          { status: 400 },
        );
      }
      if (f.type && !f.type.startsWith("video/")) {
        return Response.json({ error: `Not a video type: ${f.name || f.type}` }, { status: 400 });
      }
      const name = f.name || "clip.mp4";
      if (!isAllowedVideoExtension(name)) {
        return Response.json(
          { error: `Unsupported extension: ${name}. Allowed: mp4, mov, webm, mkv, mpeg, mpg, m4v, avi.` },
          { status: 400 },
        );
      }
    }

    workDir = join(tmpdir(), `vox-batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    await mkdir(workDir, { recursive: true });

    const { default: archiver } = await import("archiver");
    const zipPath = join(workDir, "batch.zip");
    const ws = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(ws);

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const buf = Buffer.from(await file.arrayBuffer());
      const stem = (file.name ? basename(file.name, extname(file.name)) : `clip-${i}`).replace(/[^\w.-]+/g, "_");
      const ext = extname(file.name || "") || ".mp4";
      const rawPath = join(workDir, `in-${i}${ext}`);
      const normPath = join(workDir, `norm-${i}.mp4`);
      const thumbPath = join(workDir, `thumb-${i}.jpg`);
      await writeFile(rawPath, buf);
      await preprocessVideoToStandard(rawPath, normPath, opts);
      await extractVideoThumbnail(normPath, thumbPath, 0.5);
      archive.file(normPath, { name: `clips/${stem}-${i}.mp4` });
      archive.file(thumbPath, { name: `thumbnails/${stem}-${i}.jpg` });
    }

    await archive.finalize();
    await finished(ws);
    const zipBuffer = await readFile(zipPath);

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="normalized-batch.zip"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Batch preprocess failed";
    console.error("[batch-preprocess]", err);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
