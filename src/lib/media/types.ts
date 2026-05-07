export type MediaSource = "none" | "unsplash" | "upload" | "overlay" | "heygen";

// Image vs video. Drives which upload helper runs in each platform's
// publish route. Defaults to "image" for legacy rows that don't carry
// the field (most existing post media is Unsplash images).
export type MediaKind = "image" | "video";

export interface PostMediaAttribution {
  name: string;
  username: string;
  profileUrl: string;
}

export interface PostMediaOverlay {
  text: string;
  style: "dark" | "light" | "brand";
  background: string | null;
}

export interface PostMedia {
  source: MediaSource;
  kind?: MediaKind; // optional for back-compat; treat undefined as "image"
  url: string | null;
  thumb: string | null;
  width?: number;
  height?: number;
  /** For video only — duration in seconds, used for X's 2:20 limit */
  durationSeconds?: number;
  /** For video only — file size in bytes, used to pick chunked vs simple upload */
  sizeBytes?: number;
  /** For video only — MIME type, e.g. "video/mp4" */
  mimeType?: string;
  attribution?: PostMediaAttribution | null;
  overlay?: PostMediaOverlay | null;
}

export const EMPTY_MEDIA: PostMedia = {
  source: "none",
  kind: undefined,
  url: null,
  thumb: null,
  attribution: null,
  overlay: null,
};

export function hasMedia(m: PostMedia | null | undefined): m is PostMedia {
  return !!m && m.source !== "none" && !!m.url;
}

export function isVideoMedia(m: PostMedia | null | undefined): boolean {
  return hasMedia(m) && m.kind === "video";
}

export function isImageMedia(m: PostMedia | null | undefined): boolean {
  return hasMedia(m) && (m.kind === "image" || m.kind === undefined);
}
