import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { join } from "node:path";
import type { Track } from "@/lib/music-playlist";

const PREFETCH_CONNECT_TIMEOUT_MS = 15_000;
const PREFETCH_DOWNLOAD_TIMEOUT_MS = 180_000;
const PREFETCH_RETRIES = 3;

async function downloadUrlToFile(url: string, dest: string): Promise<void> {
  let last: unknown;
  for (let attempt = 1; attempt <= PREFETCH_RETRIES; attempt++) {
    try {
      await unlink(dest).catch(() => {});
      await new Promise<void>((resolve, reject) => {
        const client = url.startsWith("https:") ? https : http;
        const req = client.get(url, { headers: { "user-agent": "vox-render/1.0 (Remotion prefetch)" } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Follow redirects manually so we control timeouts on each hop
            downloadUrlToFile(res.headers.location, dest).then(resolve, reject);
            return;
          }
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode} while fetching audio`));
            return;
          }

          const file = createWriteStream(dest);
          const totalTimeout = setTimeout(() => {
            file.destroy();
            req.destroy();
            reject(new Error(`Download timed out after ${PREFETCH_DOWNLOAD_TIMEOUT_MS}ms`));
          }, PREFETCH_DOWNLOAD_TIMEOUT_MS);

          res.pipe(file);
          file.on("finish", () => {
            clearTimeout(totalTimeout);
            file.close(() => resolve());
          });
          file.on("error", (err) => {
            clearTimeout(totalTimeout);
            file.destroy();
            reject(err);
          });
          res.on("error", (err) => {
            clearTimeout(totalTimeout);
            file.destroy();
            reject(err);
          });
        });

        req.setTimeout(PREFETCH_CONNECT_TIMEOUT_MS, () => {
          req.destroy();
          reject(new Error(`Connection timed out after ${PREFETCH_CONNECT_TIMEOUT_MS}ms`));
        });

        req.on("error", (err) => {
          reject(err);
        });
      });
      return;
    } catch (e) {
      last = e;
      if (attempt < PREFETCH_RETRIES) {
        const backoff = 1000 * Math.pow(2, attempt - 1);
        console.warn(`[prefetch] attempt ${attempt} failed for ${url}, retrying in ${backoff}ms…`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  const detail = last instanceof Error ? last.message : String(last);
  throw new Error(`Failed to prefetch audio (${url}) after ${PREFETCH_RETRIES} attempts: ${detail}`);
}

/** Download each remote track audio into `dir` as `audio-0.mp3`, … */
export async function prefetchTrackAudioFiles(tracks: Track[], dir: string): Promise<string[]> {
  await mkdir(dir, { recursive: true });
  return Promise.all(
    tracks.map(async (t, i) => {
      const dest = join(dir, `audio-${i}.mp3`);
      if (/^https?:\/\//i.test(t.audioUrl)) {
        await downloadUrlToFile(t.audioUrl, dest);
      } else {
        throw new Error(`Unsupported audioUrl (need http(s)): ${t.audioUrl}`);
      }
      return dest;
    }),
  );
}

/** Serves given files at `GET /audio-{i}.mp3` from 127.0.0.1 (same order as prefetch). */
export async function startLocalPrefetchAudioServer(
  filePaths: string[],
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const map = new Map<string, string>(filePaths.map((p, i) => [`audio-${i}.mp3`, p]));
  const server = http.createServer((req, res) => {
    const name = (req.url ?? "/").replace(/^\//, "").split("?")[0] ?? "";
    const abs = map.get(name);
    if (!abs) {
      res.writeHead(404);
      res.end();
      return;
    }
    void (async () => {
      try {
        const st = await stat(abs);
        res.writeHead(200, {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(st.size),
        });
        createReadStream(abs).pipe(res);
      } catch {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      }
    })();
  });

  return await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Could not bind local audio server"));
        return;
      }
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

export function tracksWithLocalAudioUrls(tracks: Track[], baseUrl: string): Track[] {
  return tracks.map((t, i) => ({
    ...t,
    audioUrl: `${baseUrl}/audio-${i}.mp3`,
  }));
}
