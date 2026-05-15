"use client";

import { MusicPlayerClassicLayout } from "@/components/music-player-classic-layout";
import { MusicPlayerEditor } from "@/components/music-player-editor";
import {
  cloneDefaultPlaylist,
  DEFAULT_LIKED_IDS,
  loadPersisted,
  STORAGE_KEY,
  type Track,
} from "@/lib/music-playlist";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>(() => cloneDefaultPlaylist());
  const [liked, setLiked] = useState<Set<string>>(() => new Set(DEFAULT_LIKED_IDS));
  const [persistReady, setPersistReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftArtist, setDraftArtist] = useState("");
  const [draftCover, setDraftCover] = useState("");
  const [draftAudioUrl, setDraftAudioUrl] = useState("");
  const [videoDownloadPending, setVideoDownloadPending] = useState(false);
  const [videoDownloadError, setVideoDownloadError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef(tracks);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useLayoutEffect(() => {
    const { tracks: t, liked: l } = loadPersisted();
    queueMicrotask(() => {
      setTracks(t);
      setLiked(l);
      setPersistReady(true);
    });
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tracks, likedIds: [...liked] }));
    } catch {
      /* ignore */
    }
  }, [tracks, liked, persistReady]);

  const track = tracks[currentIndex];
  const trackId = track?.id ?? "";
  const trackAudioUrl = track?.audioUrl ?? "";

  useEffect(() => {
    if (tracks.length === 0) {
      queueMicrotask(() => setSelectedIndex(null));
      return;
    }
    if (currentIndex >= tracks.length) {
      queueMicrotask(() => {
        setCurrentIndex(Math.max(0, tracks.length - 1));
      });
    }
    queueMicrotask(() => {
      setSelectedIndex((s) => {
        if (s === null) return 0;
        if (s >= tracks.length) return Math.max(0, tracks.length - 1);
        return s;
      });
    });
  }, [tracks.length, currentIndex]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const t = tracksRef.current[selectedIndex];
    if (!t) return;
    queueMicrotask(() => {
      setDraftTitle(t.title);
      setDraftArtist(t.artist);
      setDraftCover(t.cover);
      setDraftAudioUrl(t.audioUrl);
    });
  }, [selectedIndex]);

  const duration = mediaDuration ?? track?.durationSec ?? 0;

  const goNext = useCallback(() => {
    setCurrentSec(0);
    setCurrentIndex((i) => {
      const len = tracksRef.current.length;
      if (len <= 0) return 0;
      return (i + 1) % len;
    });
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !trackAudioUrl) return;
    const onTime = () => setCurrentSec(a.currentTime);
    const onMeta = () => {
      if (!Number.isFinite(a.duration) || a.duration <= 0) return;
      setMediaDuration(a.duration);
      setTracks((prev) => {
        const idx = prev.findIndex((t) => t.id === trackId);
        if (idx < 0) return prev;
        const cur = prev[idx]!;
        const nextSec = Math.round(a.duration);
        if (Math.abs(cur.durationSec - nextSec) < 1) return prev;
        const copy = [...prev];
        copy[idx] = { ...cur, durationSec: nextSec };
        return copy;
      });
    };
    const onEnded = () => goNext();
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnded);
    };
  }, [goNext, trackId, trackAudioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !trackAudioUrl) return;
    setMediaDuration(null);
    a.pause();
    a.src = trackAudioUrl;
    a.load();
    a.currentTime = 0;
    setCurrentSec(0);
  }, [currentIndex, trackId, trackAudioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !trackAudioUrl) return;
    if (playing) {
      void a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  }, [playing, currentIndex, trackId, trackAudioUrl]);

  const progress = useMemo(
    () => Math.min(100, duration > 0 ? (currentSec / duration) * 100 : 0),
    [currentSec, duration],
  );

  const seekRatio = (ratio: number) => {
    if (duration <= 0) return;
    const next = ratio * duration;
    setCurrentSec(next);
    const a = audioRef.current;
    if (a) a.currentTime = next;
  };

  const nudgeTime = (delta: number) => {
    if (duration <= 0) return;
    const next = Math.min(duration, Math.max(0, currentSec + delta));
    setCurrentSec(next);
    const a = audioRef.current;
    if (a) a.currentTime = next;
  };

  const goPrev = () => {
    setCurrentSec(0);
    setCurrentIndex((i) => {
      const len = tracksRef.current.length;
      if (len <= 0) return 0;
      return (i - 1 + len) % len;
    });
  };

  const removeTrack = (index: number) => {
    const removed = tracks[index];
    if (!removed) return;
    const next = tracks.filter((_, i) => i !== index);
    setTracks(next);
    setLiked((s) => {
      const n = new Set(s);
      n.delete(removed.id);
      return n;
    });
    let newIndex = currentIndex;
    if (index < currentIndex) newIndex = currentIndex - 1;
    else if (index > currentIndex) newIndex = currentIndex;
    else newIndex = next.length === 0 ? 0 : Math.min(currentIndex, next.length - 1);
    setCurrentIndex(newIndex);
    setSelectedIndex((s) => {
      if (s === null) return next.length ? 0 : null;
      if (index < s) return s - 1;
      if (index === s) return next.length === 0 ? null : Math.min(s, next.length - 1);
      return s;
    });
    if (next.length === 0) setPlaying(false);
  };

  const saveEdit = () => {
    if (selectedIndex === null) return;
    setTracks((prev) => {
      const copy = [...prev];
      const cur = copy[selectedIndex];
      if (!cur) return prev;
      copy[selectedIndex] = {
        ...cur,
        title: draftTitle.trim() || cur.title,
        artist: draftArtist.trim() || cur.artist,
        cover: draftCover.trim() || cur.cover,
        audioUrl: draftAudioUrl.trim() || cur.audioUrl,
      };
      return copy;
    });
  };

  const resetToDefaults = () => {
    setTracks(cloneDefaultPlaylist());
    setLiked(new Set(DEFAULT_LIKED_IDS));
    setCurrentIndex(0);
    setSelectedIndex(0);
    setCurrentSec(0);
    setPlaying(false);
    setIsAdding(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleRemoveSelected = () => {
    if (selectedIndex === null) return;
    if (!window.confirm("Remove this song from your playlist?")) return;
    removeTrack(selectedIndex);
  };

  const playTrack = (index: number) => {
    setCurrentIndex(index);
    setCurrentSec(0);
    setPlaying(true);
  };

  const handleSelectEditIndex = (index: number) => {
    setIsAdding(false);
    setSelectedIndex(index);
  };

  const handlePlayTrack = (index: number) => {
    setIsAdding(false);
    playTrack(index);
  };

  const startAdd = () => {
    setIsAdding(true);
    setSelectedIndex(null);
    setDraftTitle("");
    setDraftArtist("");
    setDraftCover("");
    setDraftAudioUrl("");
  };

  const cancelAdd = () => {
    setIsAdding(false);
  };

  const saveAdd = () => {
    const title = draftTitle.trim();
    const artist = draftArtist.trim();
    if (!title || !artist) return;
    
    const newTrack: Track = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      artist,
      cover: draftCover.trim() || "https://picsum.photos/seed/vox-default/800/800",
      audioUrl: draftAudioUrl.trim() || "",
      durationSec: 0,
    };
    
    setTracks((prev) => [...prev, newTrack]);
    setIsAdding(false);
    setSelectedIndex(tracks.length);
  };

  const downloadRenderedVideo = async () => {
    setVideoDownloadError(null);
    setVideoDownloadPending(true);
    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text || res.statusText;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* keep msg */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "music-player.mp4";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (e) {
      setVideoDownloadError(e instanceof Error ? e.message : "Render failed");
    } finally {
      setVideoDownloadPending(false);
    }
  };

  return (
    <div className="bg-player-bg text-player-fg flex min-h-screen flex-col gap-8 p-6 font-sans lg:flex-row lg:items-start lg:justify-center">
      <audio ref={audioRef} className="sr-only" preload="metadata" playsInline />

      <div className="flex w-full min-w-0 shrink-0 justify-center lg:max-w-[min(100%,56rem)] lg:flex-1">
        <MusicPlayerClassicLayout
          track={track}
          tracks={tracks}
          tracksLength={tracks.length}
          currentIndex={currentIndex}
          selectedIndex={selectedIndex}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          currentSec={currentSec}
          duration={duration}
          progress={progress}
          onSeekRatio={seekRatio}
          onNudgeTime={nudgeTime}
          onPrev={goPrev}
          onNext={goNext}
          onRestoreDefaults={resetToDefaults}
          onSelectEditIndex={handleSelectEditIndex}
          onPlayTrack={handlePlayTrack}
          onStartAdd={startAdd}
        />
      </div>

      <div className="flex w-full min-w-0 lg:max-w-3xl lg:flex-none lg:shrink-0">
        <MusicPlayerEditor
          tracks={tracks}
          selectedIndex={selectedIndex}
          isAdding={isAdding}
          draftTitle={draftTitle}
          draftArtist={draftArtist}
          draftCover={draftCover}
          draftAudioUrl={draftAudioUrl}
          onDraftTitle={setDraftTitle}
          onDraftArtist={setDraftArtist}
          onDraftCover={setDraftCover}
          onDraftAudioUrl={setDraftAudioUrl}
          onSaveEdit={saveEdit}
          onRemoveSelected={handleRemoveSelected}
          onResetDefaults={resetToDefaults}
          onDownloadVideo={downloadRenderedVideo}
          videoDownloadPending={videoDownloadPending}
          videoDownloadError={videoDownloadError}
          onStartAdd={startAdd}
          onCancelAdd={cancelAdd}
          onSaveAdd={saveAdd}
        />
      </div>
    </div>
  );
}
