"use client";

import { useEffect, useState } from "react";
import {
  Video,
  Eye,
  PlaySquare,
  Heart,
  MessageSquare,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";

interface YoutubeChannelStats {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  thumbnailUrl: string | null;
}

interface YoutubeVideoSummary {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
}

interface YoutubeSummary {
  channel: YoutubeChannelStats | null;
  recentVideos: YoutubeVideoSummary[];
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

interface Props {
  projectId: string;
}

export function YoutubeWidget({ projectId }: Props) {
  const [data, setData] = useState<YoutubeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/integrations/youtube/summary?projectId=${encodeURIComponent(projectId)}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `YouTube fetch failed (${res.status})`
          );
        }
        const json = (await res.json()) as YoutubeSummary;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "YouTube fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading YouTube">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<Video className="h-6 w-6" />}
        title={`We couldn't load YouTube: ${error}. Reconnect it in Settings, then Connected accounts.`}
      />
    );
  }

  if (!data || !data.channel) {
    return (
      <EmptyState
        icon={<Video className="h-6 w-6" />}
        title="No YouTube channel found. The Google account you connected doesn't own a channel."
      />
    );
  }

  const channel = data.channel;

  return (
    <div>
      {/* Channel header */}
      <div className="mb-4 flex items-center gap-3">
        {channel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnailUrl}
            alt={channel.channelTitle}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-line"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
            <Video className="h-5 w-5 text-text-3" />
          </div>
        )}
        <div>
          <p className="text-title text-text">{channel.channelTitle}</p>
          <p className="font-mono text-caption text-text-3">{channel.channelId}</p>
        </div>
      </div>

      {/* Channel stats */}
      <KpiStrip
        className="mb-4 animate-in rail:grid-cols-3"
        cells={[
          { label: "Subscribers", value: channel.subscriberCount.toLocaleString() },
          { label: "Views", value: channel.viewCount.toLocaleString() },
          { label: "Videos", value: channel.videoCount.toLocaleString() },
        ]}
      />

      {/* Recent videos */}
      <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center justify-between border-b border-line p-4 md:px-6">
          <h3 className="flex items-center gap-2 text-title text-text">
            <PlaySquare className="h-4 w-4 text-text-3" />
            Recent videos
          </h3>
          <Badge variant="secondary">{data.recentVideos.length}</Badge>
        </div>
        {data.recentVideos.length === 0 ? (
          <p className="px-6 py-6 text-body-s text-text-3">No videos uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recentVideos.map((video) => (
              <li
                key={video.videoId}
                className="flex gap-3 px-6 py-3 transition-colors hover:bg-ground"
              >
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={96}
                    height={54}
                    className="h-[54px] w-24 shrink-0 rounded-sm border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-[54px] w-24 shrink-0 items-center justify-center rounded-sm bg-surface-2">
                    <Video className="h-5 w-5 text-text-3" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-link line-clamp-2 text-body-s text-text transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-accent-hover"
                  >
                    {video.title}
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-3">
                    <span>{timeAgo(video.publishedAt)}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Eye className="h-3 w-3" aria-hidden />
                      {video.views.toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Heart className="h-3 w-3" aria-hidden />
                      {video.likes.toLocaleString()} likes
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <MessageSquare className="h-3 w-3" aria-hidden />
                      {video.comments.toLocaleString()} comments
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
