import { MusicPlayer } from "@/components/music-player";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-50">
        <Link
          href="/batch-video"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          Batch video (FFmpeg + Remotion)
        </Link>
      </div>
      <MusicPlayer />
    </div>
  );
}
