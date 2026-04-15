export type MediaSource = "none" | "unsplash" | "upload" | "overlay";

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
  url: string | null;
  thumb: string | null;
  width?: number;
  height?: number;
  attribution?: PostMediaAttribution | null;
  overlay?: PostMediaOverlay | null;
}

export const EMPTY_MEDIA: PostMedia = {
  source: "none",
  url: null,
  thumb: null,
  attribution: null,
  overlay: null,
};

export function hasMedia(m: PostMedia | null | undefined): m is PostMedia {
  return !!m && m.source !== "none" && !!m.url;
}
