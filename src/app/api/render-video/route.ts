import { REMOTION_EXPORT_MAX_TRACKS, isTrack, type Track } from "@/lib/music-playlist";
import {
  prefetchTrackAudioFiles,
  startLocalPrefetchAudioServer,
  tracksWithLocalAudioUrls,
} from "@/lib/render-video-prefetch-audio";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { mkdtemp, readFile, rm } from "fs/promises";
import { cpus, tmpdir } from "os";
import { join } from "path";

export const runtime = "nodejs";
/** Allow long renders for full-duration playlists. */
export const maxDuration = 900;

export async function POST(request: Request) {
  let tmpDir: string | null = null;
  let closeLocalAudioServer: (() => Promise<void>) | null = null;
  try {
    const body = (await request.json()) as { tracks?: unknown };
    if (!Array.isArray(body.tracks) || body.tracks.length === 0) {
      return Response.json({ error: "Expected a non-empty tracks array" }, { status: 400 });
    }
    if (body.tracks.length > 40) {
      return Response.json({ error: "Too many tracks (max 40)" }, { status: 400 });
    }
    if (!body.tracks.every(isTrack)) {
      return Response.json({ error: "Invalid track entries" }, { status: 400 });
    }
    const tracks = (body.tracks as Track[]).slice(0, REMOTION_EXPORT_MAX_TRACKS);

    tmpDir = await mkdtemp(join(tmpdir(), "vox-remotion-"));
    const prefetchDir = join(tmpDir, "audio-prefetch");
    const prefetchedPaths = await prefetchTrackAudioFiles(tracks, prefetchDir);
    const { baseUrl: localAudioBase, close: closeLocal } = await startLocalPrefetchAudioServer(prefetchedPaths);
    closeLocalAudioServer = closeLocal;
    const tracksForRender = tracksWithLocalAudioUrls(tracks, localAudioBase);

    const outPath = join(tmpDir, "music-player.mp4");
    const entryPoint = join(process.cwd(), "src", "remotion", "index.tsx");

    const serveUrl = await bundle({
      entryPoint,
      webpackOverride: (config) => config,
    });

    const composition = await selectComposition({
      serveUrl,
      id: "MusicPlayerVideo",
      inputProps: { tracks: tracksForRender, playCapSec: null },
    });

    const cores = cpus().length;
    const concurrency = Math.min(16, Math.max(2, cores));

    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      audioCodec: "aac",
      enforceAudioTrack: true,
      outputLocation: outPath,
      inputProps: { tracks: tracksForRender },
      logLevel: "error",
      concurrency,
      /** High-quality H.264 for YouTube-style uploads (slower than `veryfast`, clearer than crf 22). */
      x264Preset: "medium",
      crf: 18,
      pixelFormat: "yuv420p",
    });

    const buffer = await readFile(outPath);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="music-player.mp4"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    console.error("[render-video]", err);
    return Response.json({ error: message }, { status: 500 });
  } finally {
    if (closeLocalAudioServer) {
      await closeLocalAudioServer().catch(() => {});
    }
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
