import type { FC } from "react";
import { Composition } from "remotion";
import { MUSIC_PLAYER_VIDEO_HEIGHT, MUSIC_PLAYER_VIDEO_WIDTH } from "../lib/music-player-remotion-layout";
import { DEFAULT_PLAYLIST, getRemotionTotalFrames, REMOTION_FPS, type RemotionPlayCapOption } from "../lib/music-playlist";
import { PREPROCESS_TARGET_HEIGHT, PREPROCESS_TARGET_WIDTH } from "../lib/video-preprocess-constants";
import { MusicPlayerVideo } from "./MusicPlayerVideo";
import { VerticalClip } from "./VerticalClip";

const VERTICAL_DEFAULT_FRAMES = 30 * REMOTION_FPS;

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="MusicPlayerVideo"
        component={MusicPlayerVideo}
        defaultProps={{ tracks: DEFAULT_PLAYLIST }}
        calculateMetadata={async ({ props }) => {
          const tracks = props.tracks?.length ? props.tracks : DEFAULT_PLAYLIST;
          const playCap = props.playCapSec as RemotionPlayCapOption | undefined;
          return {
            durationInFrames: getRemotionTotalFrames(tracks, REMOTION_FPS, playCap),
            fps: REMOTION_FPS,
            width: MUSIC_PLAYER_VIDEO_WIDTH,
            height: MUSIC_PLAYER_VIDEO_HEIGHT,
          };
        }}
      />
      <Composition
        id="VerticalClip"
        component={VerticalClip}
        defaultProps={{ videoSrc: "", durationInFrames: VERTICAL_DEFAULT_FRAMES }}
        calculateMetadata={async ({ props }) => {
          const durationInFrames = Math.max(1, Math.floor(Number(props.durationInFrames) || VERTICAL_DEFAULT_FRAMES));
          return {
            durationInFrames,
            fps: REMOTION_FPS,
            width: PREPROCESS_TARGET_WIDTH,
            height: PREPROCESS_TARGET_HEIGHT,
          };
        }}
      />
    </>
  );
};
