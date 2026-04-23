export interface YoutubeChannelStats {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  thumbnailUrl: string | null;
}

export interface YoutubeVideoSummary {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
}

interface ChannelApiItem {
  id: string;
  snippet: {
    title: string;
    thumbnails?: { default?: { url?: string } };
  };
  statistics: {
    subscriberCount: string;
    viewCount: string;
    videoCount: string;
  };
  contentDetails: {
    relatedPlaylists: { uploads: string };
  };
}

interface PlaylistItem {
  contentDetails: { videoId: string };
}

interface VideoItem {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails?: { medium?: { url?: string } };
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

export async function fetchYoutubeChannelStats(
  accessToken: string
): Promise<YoutubeChannelStats | null> {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`YouTube channels API error ${res.status}`);
  }
  const data = await res.json();
  const first: ChannelApiItem | undefined = data.items?.[0];
  if (!first) return null;

  return {
    channelId: first.id,
    channelTitle: first.snippet.title,
    subscriberCount: parseInt(first.statistics.subscriberCount, 10) || 0,
    viewCount: parseInt(first.statistics.viewCount, 10) || 0,
    videoCount: parseInt(first.statistics.videoCount, 10) || 0,
    thumbnailUrl: first.snippet.thumbnails?.default?.url ?? null,
  };
}

export async function fetchRecentVideos(
  accessToken: string,
  limit = 10
): Promise<YoutubeVideoSummary[]> {
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!channelRes.ok) {
    throw new Error(`YouTube channels API error ${channelRes.status}`);
  }
  const channelData = await channelRes.json();
  const uploadsPlaylist =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) return [];

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!playlistRes.ok) {
    throw new Error(`YouTube playlistItems API error ${playlistRes.status}`);
  }
  const playlistData = await playlistRes.json();
  const videoIds: string[] = (playlistData.items ?? [])
    .map((item: PlaylistItem) => item.contentDetails.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!videosRes.ok) {
    throw new Error(`YouTube videos API error ${videosRes.status}`);
  }
  const videosData = await videosRes.json();

  return (videosData.items ?? []).map((item: VideoItem) => ({
    videoId: item.id,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
    views: parseInt(item.statistics.viewCount ?? "0", 10),
    likes: parseInt(item.statistics.likeCount ?? "0", 10),
    comments: parseInt(item.statistics.commentCount ?? "0", 10),
  }));
}
