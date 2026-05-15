"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  REMOTION_EXPORT_MAX_TRACKS,
  REMOTION_EXPORT_PLAY_CAP_SEC,
  formatTime,
  getRemotionExportDurationSec,
  type Track,
} from "@/lib/music-playlist";
import { Download, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

const MusicPlayerExportPreview = dynamic(
  () =>
    import("@/components/music-player-export-preview").then(
      (m) => m.MusicPlayerExportPreview,
    ),
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
  isAdding: boolean;
  draftTitle: string;
  draftArtist: string;
  draftCover: string;
  draftAudioUrl: string;
  onDraftTitle: (v: string) => void;
  onDraftArtist: (v: string) => void;
  onDraftCover: (v: string) => void;
  onDraftAudioUrl: (v: string) => void;
  onSaveEdit: () => void;
  onRemoveSelected: () => void;
  onResetDefaults: () => void;
  onDownloadVideo: () => void | Promise<void>;
  videoDownloadPending: boolean;
  videoDownloadError: string | null;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onSaveAdd: () => void;
};

export function MusicPlayerEditor({
  tracks,
  selectedIndex,
  isAdding,
  draftTitle,
  draftArtist,
  draftCover,
  draftAudioUrl,
  onDraftTitle,
  onDraftArtist,
  onDraftCover,
  onDraftAudioUrl,
  onSaveEdit,
  onRemoveSelected,
  onResetDefaults,
  onDownloadVideo,
  videoDownloadPending,
  videoDownloadError,
  onStartAdd,
  onCancelAdd,
  onSaveAdd,
}: MusicPlayerEditorProps) {
  const selectedTrack = selectedIndex !== null ? tracks[selectedIndex] : null;
  const exportDurationSec = getRemotionExportDurationSec(tracks);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onDraftAudioUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="border-player-border bg-player-surface flex min-h-0 min-h-[70vh] w-full flex-1 flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-player)]">
      <div className="border-player-border flex shrink-0 flex-col gap-1 border-b px-6 py-5">
        <h2 className="text-lg font-bold">Edit playlist</h2>
        <p className="text-player-muted text-sm">
          {isAdding
            ? "Add a new song to your playlist."
            : "Choose a song on the left, then edit or export video."}
        </p>
        {!isAdding && (
          <button
            type="button"
            onClick={onResetDefaults}
            className="text-player-muted hover:text-player-accent w-fit text-xs underline-offset-2 hover:underline"
          >
            Reset to defaults
          </button>
        )}
      </div>

      <div className="border-player-border bg-black/20 flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-6">
        {isAdding ? (
          <>
            <h3 className="text-sm font-semibold">Add new song</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-title" className="text-player-fg">
                  Title
                </Label>
                <Input
                  id="add-title"
                  value={draftTitle}
                  onChange={(e) => onDraftTitle(e.target.value)}
                  placeholder="Song title"
                  className="border-player-border bg-black/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-artist" className="text-player-fg">
                  Singer / artist
                </Label>
                <Input
                  id="add-artist"
                  value={draftArtist}
                  onChange={(e) => onDraftArtist(e.target.value)}
                  placeholder="Artist name"
                  className="border-player-border bg-black/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-cover-url" className="text-player-fg">
                  Thumbnail URL
                </Label>
                <Input
                  id="add-cover-url"
                  value={draftCover}
                  onChange={(e) => onDraftCover(e.target.value)}
                  placeholder="https://…"
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
              <div className="grid gap-2">
                <Label htmlFor="add-audio-url" className="text-player-fg">
                  Audio URL
                </Label>
                <Input
                  id="add-audio-url"
                  value={draftAudioUrl}
                  onChange={(e) => onDraftAudioUrl(e.target.value)}
                  placeholder="https://… or upload a file"
                  className="border-player-border bg-black/20"
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioFileChange}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="border-player-border"
                    onClick={() => audioFileRef.current?.click()}
                  >
                    <Upload className="size-4 mr-1" />
                    Upload audio file
                  </Button>
                  {draftAudioUrl && (
                    <audio
                      src={draftAudioUrl}
                      controls
                      className="h-8 flex-1"
                      preload="metadata"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto border-player-border"
                onClick={onCancelAdd}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-player-accent text-white hover:bg-player-accent/90"
                disabled={!draftTitle.trim() || !draftArtist.trim()}
                onClick={onSaveAdd}
              >
                <Plus className="size-4" />
                Add song
              </Button>
            </div>
          </>
        ) : selectedTrack ? (
          <>
            <h3 className="text-sm font-semibold">Selected song</h3>
            <p className="text-player-muted text-xs">
              Click a row in the playlist on the left to select it here.
            </p>
            <p className="text-sm font-medium">{selectedTrack.title}</p>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editor-title" className="text-player-fg">
                  Title
                </Label>
                <Input
                  id="editor-title"
                  value={draftTitle}
                  onChange={(e) => onDraftTitle(e.target.value)}
                  className="border-player-border bg-black/20"
                />
              </div>
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
              <div className="grid gap-2">
                <Label htmlFor="editor-audio-url" className="text-player-fg">
                  Audio URL
                </Label>
                <Input
                  id="editor-audio-url"
                  value={draftAudioUrl}
                  onChange={(e) => onDraftAudioUrl(e.target.value)}
                  placeholder="https://… or upload a file"
                  className="border-player-border bg-black/20"
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={audioFileRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioFileChange}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="border-player-border"
                    onClick={() => audioFileRef.current?.click()}
                  >
                    <Upload className="size-4 mr-1" />
                    Upload audio file
                  </Button>
                  {draftAudioUrl && (
                    <audio
                      src={draftAudioUrl}
                      controls
                      className="h-8 flex-1"
                      preload="metadata"
                    />
                  )}
                </div>
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
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-player-muted text-sm">Nothing selected.</p>
            <Button
              type="button"
              className="bg-player-accent text-white hover:bg-player-accent/90"
              onClick={onStartAdd}
            >
              <Plus className="size-4" />
              Add a song
            </Button>
          </div>
        )}

        {!isAdding && (
          <div className="border-player-border space-y-3 border-t pt-6">
            <MusicPlayerExportPreview tracks={tracks} />
            <h3 className="text-sm font-semibold">Export video</h3>
            <p className="text-player-muted text-xs">
              Renders with Remotion on the server (may take a few minutes for
              long playlists). All songs are included at their full duration
              (up to {REMOTION_EXPORT_MAX_TRACKS} tracks).
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
              {videoDownloadPending
                ? "Rendering…"
                : "Download rendered video (.mp4)"}
            </Button>
            {!videoDownloadPending && tracks.length > 0 ? (
              <p className="text-muted-foreground text-xs tabular-nums">
                Export length {formatTime(exportDurationSec)} ({tracks.length} track{tracks.length !== 1 ? "s" : ""} + transitions)
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
