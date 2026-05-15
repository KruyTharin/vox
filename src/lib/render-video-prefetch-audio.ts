import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import http from "node:http";
import { join } from "node:path";
import type { Track } from "@/lib/music-playlist";

const PREFETCH_DOWNLOAD_TIMEOUT_MS = 180_000;
const PREFETCH_RETRIES = 3;

async function downloadUrlToFile(url: string, dest: string): Promise<void> {
  let last: unknown;
  for (let attempt = 1; attempt <= PREFETCH_RETRIES; attempt++) {
    try {
      await unlink(dest).catch(() => {});

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PREFETCH_DOWNLOAD_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            accept: "audio/mpeg,audio/*,*/*",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9",
            referer: "https://www.google.com/",
          },
          redirect: "follow",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText} while fetching audio`);
        }

        const body = response.body;
        if (!body) {
          throw new Error("Response body is empty");
        }

        const file = createWriteStream(dest);
        const reader = body.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            file.write(value);
          }
          file.end();
          await new Promise<void>((resolve, reject) => {
            file.on("finish", resolve);
            file.on("error", reject);
          });
        } finally {
          reader.releaseLock();
        }
      } finally {
        clearTimeout(timeoutId);
      }

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
      } else if (/^data:/i.test(t.audioUrl)) {
        const base64 = t.audioUrl.split(",")[1];
        if (!base64) {
          throw new Error(`Malformed data URL for track ${i}`);
        }
        const buffer = Buffer.from(base64, "base64");
        await writeFile(dest, buffer);
      } else {
        throw new Error(`Unsupported audioUrl (need http(s) or data): ${t.audioUrl}`);
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
