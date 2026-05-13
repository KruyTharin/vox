"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Track } from "@/lib/music-playlist";
import { formatTime } from "@/lib/music-playlist";
import { MoreHorizontal, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

export type MusicPlayerClassicLayoutProps = {
  track: Track | undefined;
  tracks: Track[];
  tracksLength: number;
  currentIndex: number;
  selectedIndex: number | null;
  playing: boolean;
  onTogglePlay: () => void;
  currentSec: number;
  duration: number;
  progress: number;
  onSeekRatio: (ratio: number) => void;
  onNudgeTime: (delta: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onRestoreDefaults?: () => void;
  onSelectEditIndex: (index: number) => void;
  onPlayTrack: (index: number) => void;
};

export function MusicPlayerClassicLayout({
  track,
  tracks,
  tracksLength,
  currentIndex,
  selectedIndex,
  playing,
  onTogglePlay,
  currentSec,
  duration,
  progress,
  onSeekRatio,
  onNudgeTime,
  onPrev,
  onNext,
  onRestoreDefaults,
  onSelectEditIndex,
  onPlayTrack,
}: MusicPlayerClassicLayoutProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const pointerSeek = (clientX: number) => {
    const el = barRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeekRatio(ratio);
  };

  return (
    <div className="border-player-border bg-player-surface grid w-full max-w-5xl overflow-hidden rounded-2xl border shadow-[var(--shadow-player)] lg:grid-cols-2">
      {/* Now playing (original left column) */}
      <div className="border-player-border relative flex flex-col gap-8 border-b p-8 pb-10 lg:border-r lg:border-b-0">
        {tracksLength === 0 || !track ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="text-player-muted max-w-xs text-sm">Your playlist is empty.</p>
            {onRestoreDefaults ? (
              <Button type="button" variant="outline" className="border-player-border" onClick={onRestoreDefaults}>
                Restore default playlist
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl shadow-lg",
                playing && "music-art-pulse",
              )}
            >
              <Image
                src={track.cover}
                alt=""
                fill
                className="object-cover"
                sizes="280px"
                priority
                unoptimized
              />
              <button
                type="button"
                onClick={onTogglePlay}
                className="bg-player-accent text-player-bg ring-player-bg/30 absolute right-3 bottom-3 flex size-11 items-center justify-center rounded-full shadow-md ring-4 transition-transform hover:scale-105 active:scale-95"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
              </button>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">{track.title}</h1>
              <p className="text-player-muted text-sm">{track.artist}</p>
            </div>

            <div className="space-y-2">
              <div
                ref={barRef}
                role="slider"
                tabIndex={0}
                aria-valuenow={Math.round(currentSec)}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                className="bg-player-track relative h-1.5 w-full cursor-pointer rounded-full"
                onPointerDown={(e) => {
                  pointerSeek(e.clientX);
                  const move = (ev: PointerEvent) => pointerSeek(ev.clientX);
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") onNudgeTime(5);
                  if (e.key === "ArrowLeft") onNudgeTime(-5);
                }}
              >
                <div
                  className="bg-player-accent absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-player-muted flex justify-between text-xs tabular-nums">
                <span>{formatTime(currentSec)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="text-player-muted flex items-center justify-center gap-5">
              <button type="button" className="hover:text-player-fg transition-colors" aria-label="Shuffle">
                <Shuffle className="size-5" />
              </button>
              <button
                type="button"
                className="hover:text-player-fg transition-colors disabled:opacity-30"
                onClick={onPrev}
                disabled={tracksLength === 0}
                aria-label="Previous"
              >
                <SkipBack className="size-6 fill-current" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="bg-player-fg text-player-bg flex size-14 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-30"
                disabled={tracksLength === 0}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="size-7 fill-current" /> : <Play className="ml-1 size-7 fill-current" />}
              </button>
              <button
                type="button"
                className="hover:text-player-fg transition-colors disabled:opacity-30"
                onClick={onNext}
                disabled={tracksLength === 0}
                aria-label="Next"
              >
                <SkipForward className="size-6 fill-current" />
              </button>
              <button type="button" className="hover:text-player-fg transition-colors" aria-label="Repeat">
                <Repeat className="size-5" />
              </button>
            </div>
          </>
        )}

        <div className="absolute bottom-4 left-8">
          <span className="bg-player-pill text-player-muted inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="bg-player-accent inline-flex size-5 items-center justify-center rounded-full">
              <Play className="text-player-bg size-2.5 fill-current" />
            </span>
            Music Playlist
          </span>
        </div>
      </div>

      {/* Playlist (original right column inside card) */}
      <div className="flex flex-col bg-black/20">
        <div className="border-player-border flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">Top Hits 2024</h2>
            <p className="text-player-muted mt-0.5 text-sm">{tracks.length} songs</p>
          </div>
          <div className="text-player-muted flex gap-2">
            <button type="button" className="hover:text-player-fg rounded-md p-2 transition-colors" aria-label="Volume">
              <Volume2 className="size-5" />
            </button>
            <button type="button" className="hover:text-player-fg rounded-md p-2 transition-colors" aria-label="More">
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>

        <ul className="max-h-[min(520px,70vh)] flex-1 overflow-y-auto px-2 py-2">
          {tracks.length === 0 ? (
            <li className="text-player-muted px-3 py-8 text-center text-sm">No songs in this playlist.</li>
          ) : (
            tracks.map((item, index) => {
              const isPlayingRow = index === currentIndex;
              const isSelectedEdit = index === selectedIndex;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayTrack(index);
                      onSelectEditIndex(index);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors sm:gap-3",
                      isSelectedEdit && "ring-player-accent/70 ring-2 ring-offset-2 ring-offset-[#0a0f1f]",
                      isPlayingRow && "bg-player-active-row",
                      !isPlayingRow && !isSelectedEdit && "hover:bg-white/5",
                    )}
                    aria-label={`Play ${item.title} by ${item.artist}`}
                  >
                    <span className="text-player-muted flex w-6 shrink-0 justify-center text-sm tabular-nums">
                      {isPlayingRow && playing ? (
                        <span className="flex h-4 w-4 items-end justify-center gap-0.5" aria-hidden>
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className="bg-player-accent music-eq-bar w-[3px] rounded-full"
                              style={{ animationDelay: `${i * 0.12}s` }}
                            />
                          ))}
                        </span>
                      ) : (
                        <span className={cn(isPlayingRow && "text-player-accent font-semibold")}>{index + 1}</span>
                      )}
                    </span>
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg">
                      <Image src={item.cover} alt="" fill className="object-cover" sizes="44px" unoptimized />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", isPlayingRow && "text-player-accent")}>
                        {item.title}
                      </span>
                      <span className="text-player-muted block truncate text-xs">{item.artist}</span>
                    </span>
                    <span className="text-player-muted w-10 shrink-0 text-right text-xs tabular-nums">
                      {formatTime(item.durationSec)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
