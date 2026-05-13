"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PREPROCESS_DEFAULT_MAX_DURATION_SEC,
  PREPROCESS_TARGET_HEIGHT,
  PREPROCESS_TARGET_WIDTH,
} from "@/lib/video-preprocess-constants";
import Link from "next/link";
import { useCallback, useState } from "react";

export function BatchVideoGenerator() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [maxDurationSec, setMaxDurationSec] = useState(String(PREPROCESS_DEFAULT_MAX_DURATION_SEC));
  const [crf, setCrf] = useState("23");
  const [includeThumb, setIncludeThumb] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onBatch = useCallback(async () => {
    setError(null);
    if (!files || files.length === 0) {
      setError("Choose one or more video files.");
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("maxDurationSec", maxDurationSec);
      fd.set("crf", crf);
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files.item(i)!);
      }
      const res = await fetch("/api/video/batch-preprocess", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text || res.statusText;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* keep */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "normalized-batch.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch failed");
    } finally {
      setPending(false);
    }
  }, [files, maxDurationSec, crf]);

  const onSingle = useCallback(async () => {
    setError(null);
    if (!files || files.length !== 1) {
      setError("Pick exactly one file for single export, or use batch for multiple.");
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("file", files[0]!);
      fd.set("maxDurationSec", maxDurationSec);
      fd.set("crf", crf);
      if (includeThumb) fd.set("includeThumbnail", "true");
      const res = await fetch("/api/video/preprocess", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        let msg = text || res.statusText;
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* keep */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = includeThumb ? "normalized-with-thumb.zip" : "normalized-9x16.mp4";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setPending(false);
    }
  }, [files, maxDurationSec, crf, includeThumb]);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>FFmpeg preprocessing</CardTitle>
          <CardDescription>
            Normalize to {PREPROCESS_TARGET_WIDTH}×{PREPROCESS_TARGET_HEIGHT} (9:16), trim to a max length, H.264 +
            AAC, then optionally grab a poster frame. Use the outputs as Remotion assets (e.g.{" "}
            <code className="text-xs">VerticalClip</code> in <code className="text-xs">src/remotion/root.tsx</code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="batch-files">Video files</Label>
            <Input
              id="batch-files"
              type="file"
              accept="video/*,.mp4,.mov,.webm,.mkv,.mpeg,.mpg,.m4v,.avi"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
            <p className="text-muted-foreground text-xs">
              Batch: up to 12 files, 120 MB each. Hosts may impose a smaller request body limit than FFmpeg needs—run
              locally if uploads fail.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="max-dur">Max duration (seconds)</Label>
              <Input
                id="max-dur"
                type="number"
                min={15}
                max={30}
                value={maxDurationSec}
                onChange={(e) => setMaxDurationSec(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">Clamped to 15–30. Default 22.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="crf">CRF (quality / size)</Label>
              <Input id="crf" type="number" min={18} max={28} value={crf} onChange={(e) => setCrf(e.target.value)} />
              <p className="text-muted-foreground text-xs">18 = larger file, 28 = smaller. Default 23.</p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeThumb}
              onChange={(e) => setIncludeThumb(e.target.checked)}
              className="accent-primary size-4 rounded border"
            />
            Single-file export: include JPEG thumbnail in a zip (otherwise raw MP4 only).
          </label>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={pending} onClick={() => void onBatch()}>
              {pending ? "Working…" : "Download batch (zip)"}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void onSingle()}>
              {pending ? "Working…" : "Single file export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remotion</CardTitle>
          <CardDescription>
            After preprocessing, point <code className="text-xs">VerticalClip</code> at a reachable{" "}
            <code className="text-xs">videoSrc</code> and set <code className="text-xs">durationInFrames</code> to
            match trim × fps (30). Run Studio locally:{" "}
            <code className="text-xs">pnpm remotion:studio</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/">Back to music player</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
