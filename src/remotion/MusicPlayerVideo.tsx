import { MUSIC_PLAYER_VIDEO_HEIGHT, MUSIC_PLAYER_VIDEO_WIDTH } from "../lib/music-player-remotion-layout";
import type { RemotionPlayCapOption, Track } from "../lib/music-playlist";
import {
  DEFAULT_PLAYLIST,
  formatTime,
  getRemotionExportSegmentDurationSec,
  getRemotionPlayFrames,
  getRemotionPlaySegmentStartFrame,
  getRemotionTransitionFrames,
} from "../lib/music-playlist";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { MoreHorizontal, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";

export type MusicPlayerVideoProps = {
  tracks: Track[];
  /**
   * undefined: default export cap (~`REMOTION_EXPORT_PLAY_CAP_SEC` per track).
   * null: full `durationSec` per track (full playlist preview).
   */
  playCapSec?: RemotionPlayCapOption;
};

const colors = {
  bg: "#060914",
  surface: "#0a0f1f",
  fg: "#f0f3fa",
  muted: "#8b92a8",
  accent: "#e11d2e",
  trackBar: "#252b3d",
  activeRow: "rgba(230, 57, 70, 0.14)",
  pill: "#141a2a",
  border: "rgba(255,255,255,0.08)",
};

function resolvePhase(
  frame: number,
  list: Track[],
  fps: number,
  playCap: RemotionPlayCapOption,
):
  | { type: "play"; index: number; local: number; playFrames: number }
  | { type: "transition"; from: number; to: number; local: number; transFrames: number } {
  let f = frame;
  for (let i = 0; i < list.length; i++) {
    const playF = getRemotionPlayFrames(list[i]!, fps, playCap);
    if (f < playF) {
      return { type: "play", index: i, local: f, playFrames: playF };
    }
    f -= playF;
    if (i === list.length - 1) {
      return { type: "play", index: i, local: Math.max(0, playF - 1), playFrames: playF };
    }
    const transF = getRemotionTransitionFrames(fps);
    if (f < transF) {
      return { type: "transition", from: i, to: i + 1, local: f, transFrames: transF };
    }
    f -= transF;
  }
  const last = list.length - 1;
  const playF = getRemotionPlayFrames(list[last]!, fps, playCap);
  return { type: "play", index: last, local: Math.max(0, playF - 1), playFrames: playF };
}

function displayDurationSec(track: Track, playCap: RemotionPlayCapOption) {
  return getRemotionExportSegmentDurationSec(track, playCap);
}

export function MusicPlayerVideo({ tracks, playCapSec }: MusicPlayerVideoProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const list = tracks.length > 0 ? tracks : DEFAULT_PLAYLIST;
  const phase = resolvePhase(frame, list, fps, playCapSec);

  const playingIndex = phase.type === "play" ? phase.index : phase.local < phase.transFrames / 2 ? phase.from : phase.to;
  const tPlay = list[playingIndex]!;

  let progress = 0;
  let currentSec = 0;
  let transBlend = 0;
  const fromTrack = phase.type === "transition" ? list[phase.from]! : null;
  const toTrack = phase.type === "transition" ? list[phase.to]! : null;

  if (phase.type === "play") {
    const d = displayDurationSec(list[phase.index]!, playCapSec);
    progress = phase.playFrames > 0 ? (phase.local / phase.playFrames) * 100 : 0;
    currentSec = (phase.local / phase.playFrames) * d;
  } else {
    transBlend = interpolate(phase.local, [0, phase.transFrames - 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    progress = 100;
    currentSec = displayDurationSec(fromTrack!, playCapSec);
  }

  const scale = Math.min(width / MUSIC_PLAYER_VIDEO_WIDTH, height / MUSIC_PLAYER_VIDEO_HEIGHT, 1.15);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {list.map((item, index) => (
        <Sequence
          key={`audio-${item.id}`}
          from={getRemotionPlaySegmentStartFrame(list, index, fps, playCapSec)}
          durationInFrames={getRemotionPlayFrames(item, fps, playCapSec)}
          layout="none"
        >
          <Audio src={item.audioUrl} />
        </Sequence>
      ))}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 28 * scale,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1040 * scale,
            borderRadius: 16 * scale,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            boxShadow: "0 28px 90px -24px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Now playing (matches app left column) */}
          <div
            style={{
              flex: 1.05,
              borderRight: `1px solid ${colors.border}`,
              padding: 32 * scale,
              paddingBottom: 40 * scale,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 32 * scale,
            }}
          >
            {phase.type === "transition" && fromTrack && toTrack ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 280 * scale,
                  margin: "0 auto",
                  aspectRatio: "1",
                  borderRadius: 24 * scale,
                  overflow: "hidden",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ position: "absolute", inset: 0, opacity: 1 - transBlend }}>
                  <Img src={fromTrack.cover} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ position: "absolute", inset: 0, opacity: transBlend }}>
                  <Img src={toTrack.cover} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div
                  style={{
                    position: "absolute",
                    right: 12 * scale,
                    bottom: 12 * scale,
                    width: 44 * scale,
                    height: 44 * scale,
                    borderRadius: "50%",
                    backgroundColor: colors.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 0 ${4 * scale}px rgba(6,9,20,0.35)`,
                  }}
                >
                  <Pause size={20 * scale} fill="#060914" color="#060914" strokeWidth={0} />
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 280 * scale,
                  margin: "0 auto",
                  aspectRatio: "1",
                  borderRadius: 24 * scale,
                  overflow: "hidden",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                }}
              >
                <Img src={tPlay.cover} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div
                  style={{
                    position: "absolute",
                    right: 12 * scale,
                    bottom: 12 * scale,
                    width: 44 * scale,
                    height: 44 * scale,
                    borderRadius: "50%",
                    backgroundColor: colors.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 0 ${4 * scale}px rgba(6,9,20,0.35)`,
                  }}
                >
                  <Pause size={20 * scale} fill="#060914" color="#060914" strokeWidth={0} />
                </div>
              </div>
            )}

            {phase.type === "transition" && fromTrack && toTrack ? (
              <div
                style={{
                  position: "relative",
                  textAlign: "center",
                  minHeight: 68 * scale,
                  width: "100%",
                }}
              >
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: 1 - transBlend }}>
                  <h1 style={{ color: colors.fg, fontSize: 24 * scale, fontWeight: 700, margin: `0 0 ${8 * scale}px`, letterSpacing: "-0.02em" }}>
                    {fromTrack.title}
                  </h1>
                  <p style={{ color: colors.muted, fontSize: 14 * scale, margin: 0 }}>{fromTrack.artist}</p>
                </div>
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: transBlend }}>
                  <h1 style={{ color: colors.fg, fontSize: 24 * scale, fontWeight: 700, margin: `0 0 ${8 * scale}px`, letterSpacing: "-0.02em" }}>
                    {toTrack.title}
                  </h1>
                  <p style={{ color: colors.muted, fontSize: 14 * scale, margin: 0 }}>{toTrack.artist}</p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h1 style={{ color: colors.fg, fontSize: 24 * scale, fontWeight: 700, margin: `0 0 ${8 * scale}px`, letterSpacing: "-0.02em" }}>
                  {tPlay.title}
                </h1>
                <p style={{ color: colors.muted, fontSize: 14 * scale, margin: 0 }}>{tPlay.artist}</p>
              </div>
            )}

            <div style={{ width: "100%" }}>
              <div
                style={{
                  height: 6 * scale,
                  borderRadius: 999,
                  backgroundColor: colors.trackBar,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8 * scale,
                  fontSize: 12 * scale,
                  color: colors.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>{formatTime(currentSec)}</span>
                <span>
                  {formatTime(
                    phase.type === "play"
                      ? displayDurationSec(list[phase.index]!, playCapSec)
                      : displayDurationSec(fromTrack!, playCapSec),
                  )}
                </span>
              </div>
            </div>

            <TransportRow scale={scale} />

            <div style={{ position: "absolute", bottom: 16 * scale, left: 32 * scale }}>
              <span
                style={{
                  backgroundColor: colors.pill,
                  color: colors.muted,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8 * scale,
                  borderRadius: 999,
                  padding: `${6 * scale}px ${12 * scale}px`,
                  fontSize: 11 * scale,
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 18 * scale,
                    height: 18 * scale,
                    borderRadius: "50%",
                    backgroundColor: colors.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Play size={10 * scale} fill="#060914" color="#060914" strokeWidth={0} />
                </span>
                Music Playlist
              </span>
            </div>
          </div>

          {/* Playlist (matches app right column) */}
          <div style={{ flex: 0.95, backgroundColor: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                borderBottom: `1px solid ${colors.border}`,
                padding: `${20 * scale}px ${22 * scale}px`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2 style={{ color: colors.fg, fontSize: 17 * scale, fontWeight: 700, margin: 0 }}>Top Hits 2024</h2>
                <p style={{ color: colors.muted, fontSize: 13 * scale, margin: `${4 * scale}px 0 0` }}>
                  {list.length} songs
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 * scale, color: colors.muted, alignItems: "center" }}>
                <Volume2 size={20 * scale} strokeWidth={2} />
                <MoreHorizontal size={20 * scale} strokeWidth={2} />
              </div>
            </div>
            <div style={{ padding: `${8 * scale}px`, overflow: "hidden", flex: 1 }}>
              {list.map((item, index) => {
                const isPlaying = index === playingIndex;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10 * scale,
                      padding: `${10 * scale}px ${12 * scale}px`,
                      borderRadius: 12 * scale,
                      marginBottom: 4 * scale,
                      backgroundColor: isPlaying ? colors.activeRow : "transparent",
                      outline: isPlaying ? `2px solid ${colors.accent}` : "none",
                      outlineOffset: 2 * scale,
                    }}
                  >
                    <span
                      style={{
                        width: 24 * scale,
                        textAlign: "center",
                        fontSize: 14 * scale,
                        color: isPlaying ? colors.accent : colors.muted,
                        fontWeight: isPlaying ? 600 : 400,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {isPlaying ? <EqBars frame={frame} index={index} scale={scale} /> : <span>{index + 1}</span>}
                    </span>
                    <div
                      style={{
                        position: "relative",
                        width: 44 * scale,
                        height: 44 * scale,
                        borderRadius: 8 * scale,
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <Img src={item.cover} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14 * scale,
                          fontWeight: 500,
                          color: isPlaying ? colors.accent : colors.fg,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12 * scale,
                          color: colors.muted,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.artist}
                      </div>
                    </div>
                    <span
                      style={{
                        width: 40 * scale,
                        textAlign: "right",
                        fontSize: 12 * scale,
                        color: colors.muted,
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(getRemotionExportSegmentDurationSec(item, playCapSec))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TransportRow({ scale }: { scale: number }) {
  const side = 20 * scale;
  const skip = 24 * scale;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 20 * scale,
        color: colors.muted,
      }}
    >
      <Shuffle width={side} height={side} strokeWidth={2} />
      <SkipBack width={skip} height={skip} fill="currentColor" strokeWidth={0} />
      <div
        style={{
          width: 56 * scale,
          height: 56 * scale,
          borderRadius: "50%",
          backgroundColor: colors.fg,
          color: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pause width={28 * scale} height={28 * scale} fill="currentColor" strokeWidth={0} />
      </div>
      <SkipForward width={skip} height={skip} fill="currentColor" strokeWidth={0} />
      <Repeat width={side} height={side} strokeWidth={2} />
    </div>
  );
}

function EqBars({ frame, index, scale }: { frame: number; index: number; scale: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", justifyContent: "center", gap: 2 * scale, height: 14 * scale }}>
      {[0, 1, 2, 3].map((i) => {
        const h = 4 + 8 * (0.5 + 0.5 * Math.sin((frame + index * 3 + i * 5) * 0.18));
        return (
          <span
            key={i}
            style={{
              width: 3 * scale,
              height: h * scale,
              borderRadius: 2 * scale,
              backgroundColor: colors.accent,
            }}
          />
        );
      })}
    </span>
  );
}
