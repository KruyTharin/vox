import { BatchVideoGenerator } from "@/components/batch-video-generator";
import Link from "next/link";

export const metadata = {
  title: "Batch video prep · Vox",
  description: "FFmpeg normalize, trim, compress — then Remotion",
};

export default function BatchVideoPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <nav className="mb-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline">
            ← Home
          </Link>
        </nav>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Batch video generator</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          FFmpeg-first pipeline for consistent 9:16 clips; Remotion composition <code className="text-xs">VerticalClip</code>{" "}
          matches 1080×1920.
        </p>
        <BatchVideoGenerator />
      </div>
    </div>
  );
}
