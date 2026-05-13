"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REMOTION_EXPORT_MAX_TRACKS, REMOTION_EXPORT_PLAY_CAP_SEC, formatTime, getRemotionExportDurationSec, type Track } from "@/lib/music-playlist";
import { Download, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";

const MusicPlayerExportPreview = dynamic(
  () => import("@/components/music-player-export-preview").then((m) => m.MusicPlayerExportPreview),
  {
    ssr: false,
    loading: () => (
      <p className="text-player-muted border-player-border rounded-lg border border-dashed px-3 py-6 text-center text-xs">
        Loading export preview…
      </p>
    ),
  },
);

export type MusicPlayerEditorProps = {
  tracks: Track[];
  selectedIndex: number | null;
  draftArtist: string;
  draftCover: string;
  onDraftArtist: (v: string) => void;
  onDraftCover: (v: string) => void;
  onSaveEdit: () => void;
  onRemoveSelected: () => void;
  onResetDefaults: () => void;
  onDownloadVideo: () => void | Promise<void>;
  videoDownloadPending: boolean;
  videoDownloadError: string | null;
};

export function MusicPlayerEditor({
  tracks,
  selectedIndex,
  draftArtist,
  draftCover,
  onDraftArtist,
  onDraftCover,
  onSaveEdit,
  onRemoveSelected,
  onResetDefaults,
  onDownloadVideo,
  videoDownloadPending,
  videoDownloadError,
}: MusicPlayerEditorProps) {
  const selectedTrack = selectedIndex !== null ? tracks[selectedIndex] : null;
  const exportDurationSec = getRemotionExportDurationSec(tracks);

  return (
    <div className="border-player-border bg-player-surface flex min-h-0 min-h-[70vh] w-full flex-1 flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-player)]">
      <div className="border-player-border flex shrink-0 flex-col gap-1 border-b px-6 py-5">
        <h2 className="text-lg font-bold">Edit playlist</h2>
        <p className="text-player-muted text-sm">
          Choose a song on the left, then edit or export video.
        </p>
        <button
          type="button"
          onClick={onResetDefaults}
          className="text-player-muted hover:text-player-accent w-fit text-xs underline-offset-2 hover:underline"
        >
          Reset to defaults
        </button>
      </div>

      <div className="border-player-border bg-black/20 flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-6">
        <h3 className="text-sm font-semibold">Selected song</h3>
        <p className="text-player-muted text-xs">
          Click a row in the playlist on the left to select it here.
        </p>
        {selectedTrack ? (
          <>
            <p className="text-sm font-medium">{selectedTrack.title}</p>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editor-cover-url" className="text-player-fg">
                  Thumbnail URL
                </Label>
                <Input
                  id="editor-cover-url"
                  value={draftCover}
                  onChange={(e) => onDraftCover(e.target.value)}
                  placeholder="https://…"
                  className="border-player-border bg-black/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editor-artist" className="text-player-fg">
                  Singer / artist
                </Label>
                <Input
                  id="editor-artist"
                  value={draftArtist}
                  onChange={(e) => onDraftArtist(e.target.value)}
                  className="border-player-border bg-black/20"
                />
              </div>
              <div className="border-player-border relative mx-auto aspect-square w-32 overflow-hidden rounded-lg border">
                <Image
                  key={draftCover}
                  src={
                    draftCover.trim() ||
                    "https://picsum.photos/seed/vox-preview/400/400"
                  }
                  alt=""
                  fill
                  className="object-cover"
                  sizes="128px"
                  unoptimized
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={onRemoveSelected}
              >
                <Trash2 className="size-4" />
                Remove song
              </Button>
              <Button
                type="button"
                className="bg-player-accent text-white hover:bg-player-accent/90"
                onClick={onSaveEdit}
              >
                Save changes
              </Button>
            </div>
          </>
        ) : (
          <p className="text-player-muted text-sm">Nothing selected.</p>
        )}

        <div className="border-player-border space-y-3 border-t pt-6">
          <MusicPlayerExportPreview tracks={tracks} />
          <h3 className="text-sm font-semibold">Export video</h3>
          <p className="text-player-muted text-xs">
            Renders with Remotion on the server (may take a minute the first time while the bundle builds). Only the
            first {REMOTION_EXPORT_MAX_TRACKS} songs are included, and each is capped to about{" "}
            {REMOTION_EXPORT_PLAY_CAP_SEC}s in the file so exports finish quickly (the player still uses full-length
            audio).
          </p>
          {videoDownloadError ? (
            <p className="text-destructive text-xs" role="alert">
              {videoDownloadError}
            </p>
          ) : null}
          <Button
            type="button"
            className="border-player-border w-full sm:w-auto"
            disabled={tracks.length === 0 || videoDownloadPending}
            onClick={() => void onDownloadVideo()}
          >
            {videoDownloadPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {videoDownloadPending ? "Rendering…" : "Download rendered video (.mp4)"}
          </Button>
          {!videoDownloadPending && tracks.length > 0 ? (
            <p className="text-muted-foreground text-xs tabular-nums">
              Export length {formatTime(exportDurationSec)} (first {REMOTION_EXPORT_MAX_TRACKS} tracks + transitions)
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
