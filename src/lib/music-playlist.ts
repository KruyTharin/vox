export type Track = {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  cover: string;
  audioUrl: string;
};

export const STORAGE_KEY = "vox-playlist-v1";

export const DEFAULT_LIKED_IDS = ["vox-2", "vox-5"];

/** Crossfade between tracks when one “ends” in the export (seconds). */
export const REMOTION_TRANSITION_SEC = 0.55;

/** Only the first N tracks are included in the server-rendered MP4 (temporary cap). */
export const REMOTION_EXPORT_MAX_TRACKS = 2;

/**
 * Max real-time seconds per track in the exported video (shorter = much faster renders).
 * In-app playback still uses the full file; this only limits the Remotion timeline.
 */
export const REMOTION_EXPORT_PLAY_CAP_SEC = 45;

/** Composition FPS (keep in sync with `src/remotion/root.tsx`). */
export const REMOTION_FPS = 30;

/** undefined = default export cap (`REMOTION_EXPORT_PLAY_CAP_SEC`); null = full `durationSec`; number = custom cap (seconds). */
export type RemotionPlayCapOption = number | null | undefined;

function resolvePlayCapSeconds(playCap: RemotionPlayCapOption): number | null {
  if (playCap === null) return null;
  if (typeof playCap === "number") return playCap;
  return REMOTION_EXPORT_PLAY_CAP_SEC;
}

/** @deprecated Legacy segment length; prefer getRemotionTotalFrames */
export const REMOTION_SEGMENT_SEC = 6;

/** Seconds of each track on the Remotion timeline for a given cap mode. */
export function getRemotionExportSegmentDurationSec(track: Track, playCap?: RemotionPlayCapOption): number {
  const raw = Math.max(0, track.durationSec);
  const cap = resolvePlayCapSeconds(playCap);
  if (cap === null) return raw;
  return Math.min(raw, cap);
}

/** Frames for the “play” segment of one track. */
export function getRemotionPlayFrames(track: Track, fps: number, playCap?: RemotionPlayCapOption): number {
  return Math.max(1, Math.round(getRemotionExportSegmentDurationSec(track, playCap) * fps));
}

export function getRemotionTransitionFrames(fps: number): number {
  return Math.max(1, Math.round(REMOTION_TRANSITION_SEC * fps));
}

export function getRemotionTotalFrames(tracks: Track[], fps: number, playCap?: RemotionPlayCapOption): number {
  if (tracks.length === 0) {
    return Math.max(1, Math.round(REMOTION_SEGMENT_SEC * fps));
  }
  const tf = getRemotionTransitionFrames(fps);
  let total = 0;
  for (let i = 0; i < tracks.length; i++) {
    total += getRemotionPlayFrames(tracks[i]!, fps, playCap);
    if (i < tracks.length - 1) total += tf;
  }
  return Math.max(1, total);
}

/** Wall-clock length of the server-exported MP4 (first `REMOTION_EXPORT_MAX_TRACKS` tracks + transitions, default cap). */
export function getRemotionExportDurationSec(tracks: Track[]): number {
  if (tracks.length === 0) return 0;
  const subset = tracks.slice(0, REMOTION_EXPORT_MAX_TRACKS);
  return getRemotionTotalFrames(subset, REMOTION_FPS, undefined) / REMOTION_FPS;
}

/** Full playlist timeline length when uncapped (e.g. in-browser preview). */
export function getRemotionPreviewDurationSec(tracks: Track[]): number {
  if (tracks.length === 0) return 0;
  return getRemotionTotalFrames(tracks, REMOTION_FPS, null) / REMOTION_FPS;
}

/** Global frame index where track `index`’s play segment begins (after prior plays + transitions). */
export function getRemotionPlaySegmentStartFrame(
  tracks: Track[],
  index: number,
  fps: number,
  playCap?: RemotionPlayCapOption,
): number {
  let f = 0;
  for (let j = 0; j < index; j++) {
    f += getRemotionPlayFrames(tracks[j]!, fps, playCap);
    if (j < tracks.length - 1) {
      f += getRemotionTransitionFrames(fps);
    }
  }
  return f;
}

export const DEFAULT_PLAYLIST: Track[] = [
  {
    id: "vox-1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    durationSec: 200,
    cover: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=800&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "vox-2",
    title: "Anti-Hero",
    artist: "Taylor Swift",
    durationSec: 221,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "vox-3",
    title: "Flowers",
    artist: "Miley Cyrus",
    durationSec: 200,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "vox-4",
    title: "As It Was",
    artist: "Harry Styles",
    durationSec: 167,
    cover: "https://picsum.photos/seed/vox-as-it-was/800/800",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    id: "vox-5",
    title: "Kill Bill",
    artist: "SZA",
    durationSec: 153,
    cover: "https://picsum.photos/seed/vox-kill-bill/800/800",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  },
  {
    id: "vox-6",
    title: "Calm Down",
    artist: "Rema & Selena Gomez",
    durationSec: 239,
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
  },
  {
    id: "vox-7",
    title: "Cruel Summer",
    artist: "Taylor Swift",
    durationSec: 178,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  },
];

export function cloneDefaultPlaylist(): Track[] {
  return DEFAULT_PLAYLIST.map((t) => ({ ...t }));
}

export function isTrack(x: unknown): x is Track {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.artist === "string" &&
    typeof o.durationSec === "number" &&
    typeof o.cover === "string" &&
    typeof o.audioUrl === "string"
  );
}

export function loadPersisted(): { tracks: Track[]; liked: Set<string> } {
  if (typeof window === "undefined") {
    return { tracks: cloneDefaultPlaylist(), liked: new Set(DEFAULT_LIKED_IDS) };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tracks: cloneDefaultPlaylist(), liked: new Set(DEFAULT_LIKED_IDS) };
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && parsed.every(isTrack)) {
        return { tracks: parsed, liked: new Set(DEFAULT_LIKED_IDS) };
      }
      return { tracks: cloneDefaultPlaylist(), liked: new Set(DEFAULT_LIKED_IDS) };
    }
    if (parsed && typeof parsed === "object" && "tracks" in parsed) {
      const rec = parsed as { tracks?: unknown; likedIds?: unknown };
      const ts = rec.tracks;
      if (Array.isArray(ts) && ts.length > 0 && ts.every(isTrack)) {
        const liked =
          Array.isArray(rec.likedIds) && rec.likedIds.every((x): x is string => typeof x === "string")
            ? new Set(rec.likedIds)
            : new Set(DEFAULT_LIKED_IDS);
        return { tracks: ts, liked };
      }
    }
  } catch {
    /* ignore */
  }
  return { tracks: cloneDefaultPlaylist(), liked: new Set(DEFAULT_LIKED_IDS) };
}

export function formatTime(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
