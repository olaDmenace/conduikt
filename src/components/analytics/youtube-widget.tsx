"use client";

import { useEffect, useState } from "react";
import {
  Video,
  Users,
  Eye,
  PlaySquare,
  Heart,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

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

export function YoutubeWidget() {
  const [data, setData] = useState<YoutubeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/integrations/youtube/summary");
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
  }, []);

  if (loading) {
    return (
      <Card className="animate-in">
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-small text-text-tertiary">
            Loading YouTube data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="animate-in">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Video className="h-8 w-8 text-text-tertiary mb-3" />
          <p className="text-body text-text-secondary">{error}</p>
          <p className="text-small text-text-tertiary mt-1">
            Reconnect YouTube in Settings &rarr; Integrations.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.channel) {
    return (
      <Card className="animate-in">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Video className="h-8 w-8 text-text-tertiary mb-3" />
          <p className="text-body text-text-secondary">No YouTube channel found</p>
          <p className="text-small text-text-tertiary mt-1">
            The connected Google account doesn&rsquo;t own a channel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const channel = data.channel;

  const channelStats = [
    {
      label: "Subscribers",
      value: channel.subscriberCount.toLocaleString(),
      icon: Users,
    },
    {
      label: "Total Views",
      value: channel.viewCount.toLocaleString(),
      icon: Eye,
    },
    {
      label: "Videos",
      value: channel.videoCount.toLocaleString(),
      icon: PlaySquare,
    },
  ];

  return (
    <div>
      {/* Channel header */}
      <div className="flex items-center gap-3 mb-4">
        {channel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnailUrl}
            alt={channel.channelTitle}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-border-default"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-surface-2 flex items-center justify-center">
            <Video className="h-5 w-5 text-text-tertiary" />
          </div>
        )}
        <div>
          <p className="text-h3 text-text-primary">{channel.channelTitle}</p>
          <p className="text-caption text-text-tertiary font-mono">
            {channel.channelId}
          </p>
        </div>
      </div>

      {/* Channel stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {channelStats.map((stat, i) => (
          <Card
            key={stat.label}
            className="animate-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="flex items-start justify-between p-5">
              <div className="min-w-0">
                <p className="text-caption text-text-tertiary">{stat.label}</p>
                <p className="mt-1 font-semibold font-mono text-text-primary text-2xl">
                  {stat.value}
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-2 shrink-0 ml-2">
                <stat.icon className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent videos */}
      <Card className="animate-in" style={{ animationDelay: "240ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PlaySquare className="h-4 w-4 text-accent" />
              Recent Videos
            </span>
            <Badge variant="secondary">{data.recentVideos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentVideos.length === 0 ? (
            <p className="px-6 py-6 text-small text-text-tertiary">
              No videos uploaded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {data.recentVideos.map((video) => (
                <li
                  key={video.videoId}
                  className="flex gap-3 px-6 py-3 hover:bg-surface-1/50 transition-colors"
                >
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      width={96}
                      height={54}
                      className="h-[54px] w-24 rounded object-cover shrink-0 border border-border-default"
                    />
                  ) : (
                    <div className="h-[54px] w-24 rounded bg-surface-2 shrink-0 flex items-center justify-center">
                      <Video className="h-5 w-5 text-text-tertiary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-small text-text-primary hover:text-accent transition-colors line-clamp-2"
                    >
                      {video.title}
                    </a>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-caption text-text-tertiary">
                      <span>{timeAgo(video.publishedAt)}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Eye className="h-3 w-3" />
                        {video.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Heart className="h-3 w-3" />
                        {video.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <MessageSquare className="h-3 w-3" />
                        {video.comments.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
