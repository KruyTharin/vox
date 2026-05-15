"use client";

import { MUSIC_PLAYER_VIDEO_HEIGHT, MUSIC_PLAYER_VIDEO_WIDTH } from "@/lib/music-player-remotion-layout";
import {
  REMOTION_FPS,
  formatTime,
  getRemotionPreviewDurationSec,
  getRemotionTotalFrames,
  type Track,
} from "@/lib/music-playlist";
import { MusicPlayerVideo } from "@/remotion/MusicPlayerVideo";
import { Player } from "@remotion/player";
import { useMemo } from "react";

const COMPOSITION_WIDTH = MUSIC_PLAYER_VIDEO_WIDTH;
const COMPOSITION_HEIGHT = MUSIC_PLAYER_VIDEO_HEIGHT;

export type MusicPlayerExportPreviewProps = {
  tracks: Track[];
};

/** Full playlist + full `durationSec` per track. Server MP4 now matches this. */
export function MusicPlayerExportPreview({ tracks }: MusicPlayerExportPreviewProps) {
  const durationInFrames = useMemo(
    () => getRemotionTotalFrames(tracks, REMOTION_FPS, null),
    [tracks],
  );
  const previewDurationLabel = useMemo(() => formatTime(getRemotionPreviewDurationSec(tracks)), [tracks]);

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Export preview</h4>
      <p className="text-player-muted text-xs">
        Full playlist ({tracks.length} songs), full track lengths ({previewDurationLabel} timeline).
        The downloaded MP4 matches this preview. Muted so it does not overlap the main player.
      </p>
      <div className="border-player-border overflow-hidden rounded-lg border bg-[#060914]">
        <Player
          acknowledgeRemotionLicense
          component={MusicPlayerVideo}
          inputProps={{ tracks, playCapSec: null }}
          durationInFrames={durationInFrames}
          fps={REMOTION_FPS}
          compositionWidth={COMPOSITION_WIDTH}
          compositionHeight={COMPOSITION_HEIGHT}
          controls
          initiallyMuted
          showVolumeControls
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
