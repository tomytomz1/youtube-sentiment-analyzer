import { ImageResponse } from '@vercel/og';
import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Astro: uses process.env for env vars
  const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });

  // ResultData as defined in your Astro code
  const resultData = (await redis.get(id)) as {
    sentimentData?: {
      positive?: number;
      neutral?: number;
      negative?: number;
      summary?: string;
    };
    meta?: {
      videoInfo?: { title?: string };
      channelInfo?: { channelTitle?: string; channelThumbnails?: { default?: { url?: string } } };
      analyzedCount?: number;
      totalComments?: number;
      mostLiked?: { likeCount?: number; text?: string };
    };
    videoUrl?: string;
    platform?: string;
  } | null;

  if (!resultData) {
    return new Response('Not found', { status: 404 });
  }

  const sentiment = resultData.sentimentData || {};
  const meta = resultData.meta || {};
  const videoTitle = meta.videoInfo?.title || 'YouTube Video';
  const channelTitle = meta.channelInfo?.channelTitle || 'Unknown Channel';
  const channelAvatar = meta.channelInfo?.channelThumbnails?.default?.url || null;
  const analyzedCount = meta.analyzedCount || 0;
  const totalComments = meta.totalComments || 0;
  const summary = sentiment.summary || '';
  const mostLiked = meta.mostLiked || null;
  const videoUrl = resultData.videoUrl || '';
  const platform = (resultData as any).platform || 'youtube';
  // Platform branding
  let platformLogo = 'https://www.senti-meter.com/logo.svg';
  let platformName = 'YouTube';
  let platformColor = blue;
  if (platform === 'reddit') {
    platformLogo = 'https://www.senti-meter.com/reddit-logo.svg';
    platformName = 'Reddit';
    platformColor = '#FF4500';
  } else if (platform === 'twitter' || platform === 'x') {
    platformLogo = 'https://www.senti-meter.com/x-logo.svg';
    platformName = 'X (Twitter)';
    platformColor = '#000000';
  }

  // Helper to extract YouTube video ID
  function extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*&v=([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1].length === 11) return match[1];
    }
    return null;
  }
  const videoId = extractVideoId(videoUrl);
  const videoThumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  // Brand colors
  const green = '#16a34a';
  const red = '#dc2626';
  const gray = '#52525b';
  const blue = '#2563eb';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: 950,
            background: 'white',
            borderRadius: 32,
            boxShadow: '0 8px 48px rgba(30, 64, 175, 0.07)',
            padding: 44,
            display: 'flex',
            flexDirection: 'column',
            height: 500,
            fontFamily: 'Inter, system-ui, sans-serif',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <img
              src={platformLogo}
              width={50}
              height={50}
              style={{ borderRadius: 12, border: `2.5px solid ${platformColor}`, background: '#fff', marginRight: 18 }}
              alt={`${platformName} logo`}
            />
            <div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: '#1e293b',
                  maxWidth: 640,
                  lineHeight: 1.13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {platformName}: {videoTitle}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  color: '#64748b',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                {channelAvatar ? (
                  <img
                    src={channelAvatar}
                    width={30}
                    height={30}
                    style={{
                      borderRadius: '50%',
                      border: '1.5px solid #e0e7ef',
                      marginRight: 6
                    }}
                    alt="Channel avatar"
                  />
                ) : null}
                {channelTitle}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 26, marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                gap: 38,
                alignItems: 'flex-end',
                marginBottom: 10
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 34,
                    color: green,
                    marginBottom: 3
                  }}
                >
                  {sentiment.positive || 0}%
                </div>
                <div
                  style={{
                    width: 150,
                    height: 12,
                    borderRadius: 8,
                    background: '#e5e7eb',
                    marginBottom: 3
                  }}
                >
                  <div
                    style={{
                      width: `${sentiment.positive || 0}%`,
                      height: 12,
                      borderRadius: 8,
                      background: green
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 17,
                    color: green,
                    fontWeight: 700
                  }}
                >
                  Positive
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 34,
                    color: gray,
                    marginBottom: 3
                  }}
                >
                  {sentiment.neutral || 0}%
                </div>
                <div
                  style={{
                    width: 150,
                    height: 12,
                    borderRadius: 8,
                    background: '#e5e7eb',
                    marginBottom: 3
                  }}
                >
                  <div
                    style={{
                      width: `${sentiment.neutral || 0}%`,
                      height: 12,
                      borderRadius: 8,
                      background: gray
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 17,
                    color: gray,
                    fontWeight: 700
                  }}
                >
                  Neutral
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 34,
                    color: red,
                    marginBottom: 3
                  }}
                >
                  {sentiment.negative || 0}%
                </div>
                <div
                  style={{
                    width: 150,
                    height: 12,
                    borderRadius: 8,
                    background: '#e5e7eb',
                    marginBottom: 3
                  }}
                >
                  <div
                    style={{
                      width: `${sentiment.negative || 0}%`,
                      height: 12,
                      borderRadius: 8,
                      background: red
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 17,
                    color: red,
                    fontWeight: 700
                  }}
                >
                  Negative
                </div>
              </div>
            </div>
          </div>

          {summary ? (
            <div
              style={{
                background: '#f1f5f9',
                borderRadius: 14,
                padding: '17px 25px',
                fontSize: 18,
                color: '#334155',
                fontWeight: 500,
                lineHeight: 1.3,
                marginBottom: 18,
                marginTop: 2,
                minHeight: 40,
                maxHeight: 70,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {summary}
            </div>
          ) : null}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 4,
            marginBottom: 10,
            gap: 32
          }}>
            <div style={{ fontSize: 18, color: '#64748b', fontWeight: 600 }}>
              {analyzedCount} analyzed
            </div>
            <div style={{ fontSize: 18, color: '#64748b', fontWeight: 600 }}>
              {totalComments} total comments
            </div>
            {mostLiked ? (
              <div style={{ fontSize: 18, color: '#eab308', fontWeight: 600 }}>
                👍 {mostLiked.likeCount} most liked
              </div>
            ) : null}
            <div style={{
              fontSize: 18,
              color: '#9333ea',
              fontWeight: 700,
              border: '1.5px solid #ddd6fe',
              borderRadius: 7,
              padding: '1px 9px',
              background: '#faf5ff'
            }}>
              AI Powered
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
            width: '100%'
          }}>
            <img
              src="https://www.senti-meter.com/logo.svg"
              height={40}
              alt="Senti-Meter Logo"
              style={{
                height: 40,
                width: 'auto',
                marginRight: 10
              }}
            />
            <div
              style={{
                fontSize: 21,
                color: blue,
                fontWeight: 700,
                marginLeft: 'auto'
              }}
            >
              Try it free at www.senti-meter.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
