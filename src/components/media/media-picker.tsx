"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ImageIcon,
  Upload,
  Search,
  Type,
  X as XIcon,
  Loader2,
  Check,
  ExternalLink,
  Video as VideoIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/toast";
import type { PostMedia } from "@/src/lib/media/types";
import { EMPTY_MEDIA, hasMedia } from "@/src/lib/media/types";

interface UnsplashResult {
  id: string;
  url: string;
  thumb: string;
  width: number;
  height: number;
  alt: string;
  downloadLocation: string;
  attribution: { name: string; username: string; profileUrl: string };
}

interface MediaPickerProps {
  value: PostMedia;
  onChange: (media: PostMedia) => void;
  /** Seed text used when user opens the overlay tab */
  defaultOverlayText?: string;
  /** Compact chip-style trigger vs. full card trigger */
  variant?: "chip" | "card";
}

export function MediaPicker({
  value,
  onChange,
  defaultOverlayText = "",
  variant = "card",
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unsplash" | "upload" | "video" | "overlay">("unsplash");

  // Unsplash state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UnsplashResult[]>([]);
  const [configured, setConfigured] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Video upload state — separate ref so the input only accepts video MIME
  // types and the size limit on the backend matches the larger 200MB cap.
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);

  // Overlay state
  const [overlayText, setOverlayText] = useState(defaultOverlayText);
  const [overlayStyle, setOverlayStyle] =
    useState<"dark" | "light" | "brand">("brand");
  const [overlayAspect, setOverlayAspect] =
    useState<"square" | "landscape" | "portrait">("square");
  const [generating, setGenerating] = useState(false);

  const { toast } = useToast();

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/media/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setConfigured(data.configured !== false);
      setResults(data.photos ?? []);
    } catch {
      toast("Search failed", "error");
    } finally {
      setSearching(false);
    }
  }

  async function handlePickStock(photo: UnsplashResult) {
    fetch("/api/media/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
    }).catch(() => {});
    onChange({
      source: "unsplash",
      url: photo.url,
      thumb: photo.thumb,
      width: photo.width,
      height: photo.height,
      attribution: photo.attribution,
      overlay: null,
    });
    setOpen(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange({
        source: "upload",
        kind: "image",
        url: data.url,
        thumb: data.url,
        attribution: null,
        overlay: null,
      });
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange({
        source: "upload",
        kind: "video",
        url: data.url,
        // Browsers can't easily generate a video thumbnail without playback;
        // the preview card uses an icon when thumb is null.
        thumb: null,
        sizeBytes: data.size,
        mimeType: data.mimeType,
        attribution: null,
        overlay: null,
      });
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleGenerateOverlay() {
    if (!overlayText.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/media/overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: overlayText.trim(),
          style: overlayStyle,
          aspect: overlayAspect,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      onChange({
        source: "overlay",
        url: data.url,
        thumb: data.url,
        width: data.width,
        height: data.height,
        attribution: null,
        overlay: {
          text: overlayText.trim(),
          style: overlayStyle,
          background: null,
        },
      });
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  }

  function handleRemove() {
    onChange(EMPTY_MEDIA);
  }

  const trigger = variant === "chip" ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-1 px-2.5 py-1.5 text-small text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
    >
      <ImageIcon className="h-3.5 w-3.5" />
      {hasMedia(value) ? "Change image" : "Add image"}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group w-full rounded-lg border border-dashed border-border-default bg-surface-0 hover:bg-surface-1 hover:border-accent/60 transition-colors p-4 text-left"
    >
      {hasMedia(value) ? (
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 rounded-md overflow-hidden flex-shrink-0 border border-border-default bg-surface-2 flex items-center justify-center">
            {value.kind === "video" ? (
              <VideoIcon className="h-5 w-5 text-text-secondary" />
            ) : (
              <Image
                src={value.thumb ?? value.url ?? ""}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-small text-text-primary font-medium">
              {labelForSource(value.source, value.kind)}
            </p>
            {value.attribution ? (
              <p className="text-xs text-text-tertiary truncate">
                Photo by {value.attribution.name}
              </p>
            ) : (
              <p className="text-xs text-text-tertiary">Click to change</p>
            )}
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="p-1.5 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary cursor-pointer"
            aria-label="Remove media"
          >
            <XIcon className="h-4 w-4" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-text-secondary group-hover:text-text-primary">
          <div className="h-10 w-10 rounded-md bg-surface-2 flex items-center justify-center">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-small font-medium">Add image</p>
            <p className="text-xs text-text-tertiary">
              Stock photo, upload, or text card
            </p>
          </div>
        </div>
      )}
    </button>
  );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add media</DialogTitle>
            <DialogDescription>
              Choose a stock photo, upload your own, or generate a branded text card.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col min-h-0">
            <TabsList>
              <TabsTrigger value="unsplash">
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Stock
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="video">
                <VideoIcon className="h-3.5 w-3.5 mr-1.5" />
                Video
              </TabsTrigger>
              <TabsTrigger value="overlay">
                <Type className="h-3.5 w-3.5 mr-1.5" />
                Text Card
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unsplash" className="flex-1 overflow-y-auto mt-4 space-y-3">
              {!configured ? (
                <div className="text-small text-text-secondary p-4 rounded-md border border-border-default bg-surface-0">
                  Unsplash is not configured. Set <code className="font-mono text-data">UNSPLASH_ACCESS_KEY</code> in your environment.
                </div>
              ) : (
                <>
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                      placeholder="Search photos (e.g. marketing, coffee, city)"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={searching || query.trim().length < 2}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                  </form>

                  {results.length === 0 && !searching && (
                    <p className="text-small text-text-tertiary text-center py-8">
                      Search to find stock photos from Unsplash
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {results.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => handlePickStock(photo)}
                        className="group relative aspect-video rounded-md overflow-hidden border border-border-default hover:border-accent transition-colors"
                      >
                        <Image
                          src={photo.thumb}
                          alt={photo.alt}
                          fill
                          sizes="200px"
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                          <p className="text-xs text-white opacity-0 group-hover:opacity-100 truncate">
                            {photo.attribution.name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {results.length > 0 && (
                    <p className="text-xs text-text-tertiary text-center">
                      Photos from{" "}
                      <a
                        href="https://unsplash.com/?utm_source=conduikt&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-0.5"
                      >
                        Unsplash <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="upload" className="flex-1 mt-4">
              <div className="rounded-lg border border-dashed border-border-default bg-surface-0 p-12 text-center">
                <Upload className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
                <p className="text-body text-text-primary mb-1">
                  Upload an image
                </p>
                <p className="text-small text-text-secondary mb-4">
                  PNG, JPEG, WebP, or GIF — up to 5 MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Choose file"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="video" className="flex-1 mt-4">
              <div className="rounded-lg border border-dashed border-border-default bg-surface-0 p-12 text-center">
                <VideoIcon className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
                <p className="text-body text-text-primary mb-1">
                  Upload a video
                </p>
                <p className="text-small text-text-secondary mb-1">
                  MP4, MOV, or WebM &mdash; up to 200 MB
                </p>
                <p className="text-xs text-text-tertiary mb-4">
                  Platform limits: X 2:20, LinkedIn 200MB, Facebook 20min
                </p>
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => videoFileRef.current?.click()}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Choose video"
                  )}
                </Button>
                <p className="text-xs text-text-tertiary mt-4">
                  After upload, the video attaches to your post and uploads
                  to X/LinkedIn/Facebook when you publish or schedule.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="overlay" className="flex-1 mt-4 space-y-4">
              <div>
                <label className="text-small text-text-secondary mb-1.5 block">
                  Text (max 280 chars)
                </label>
                <textarea
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value.slice(0, 280))}
                  rows={3}
                  placeholder="A quote, stat, or key insight from your post..."
                  className="w-full rounded-md border border-border-default bg-surface-0 px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {overlayText.length}/280
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-small text-text-secondary mb-1.5 block">
                    Style
                  </label>
                  <div className="flex gap-2">
                    {(["brand", "dark", "light"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setOverlayStyle(s)}
                        className={`flex-1 rounded-md border px-3 py-2 text-small capitalize transition-colors ${
                          overlayStyle === s
                            ? "border-accent bg-accent-muted text-accent"
                            : "border-border-default text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-small text-text-secondary mb-1.5 block">
                    Aspect
                  </label>
                  <div className="flex gap-2">
                    {(["square", "landscape", "portrait"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setOverlayAspect(a)}
                        className={`flex-1 rounded-md border px-3 py-2 text-small capitalize transition-colors ${
                          overlayAspect === a
                            ? "border-accent bg-accent-muted text-accent"
                            : "border-border-default text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-text-tertiary">
                  Uses your{" "}
                  <a href="/settings/brand" className="underline">
                    brand kit
                  </a>{" "}
                  colors
                </p>
                <Button
                  onClick={handleGenerateOverlay}
                  disabled={generating || !overlayText.trim()}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Generate card
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function labelForSource(source: string, kind?: string): string {
  if (kind === "video") return "Uploaded video";
  switch (source) {
    case "unsplash":
      return "Stock photo";
    case "upload":
      return "Uploaded image";
    case "overlay":
      return "Text card";
    case "heygen":
      return "Generated video";
    default:
      return "Image";
  }
}
