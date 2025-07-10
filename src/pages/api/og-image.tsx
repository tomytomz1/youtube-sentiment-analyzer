// src/pages/api/og-image.ts - COMPLETE REPLACEMENT
import { ImageResponse } from '@vercel/og';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, request }) => {
  console.log('OG Image API called:', url.toString());

  try {
    const searchParams = new URL(url).searchParams;
    const id = searchParams.get('id');

    // If no ID provided, return a default image
    if (!id) {
      console.log('No ID provided, returning default image');
      return createDefaultPNGImage();
    }

    // Validate ID format
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      console.log('Invalid ID format:', id);
      return createErrorPNGImage('Invalid ID Format');
    }

    // Try to get data from Redis
    let resultData = null;
    try {
      const { Redis } = await import('@upstash/redis');
      
      const redisUrl = import.meta.env.KV_REST_API_URL;
      const redisToken = import.meta.env.KV_REST_API_TOKEN;

      if (!redisUrl || !redisToken) {
        console.error('Redis configuration missing');
        return createErrorPNGImage('Configuration Error');
      }

      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      const fetchWithTimeout = Promise.race([
        redis.get(id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), 5000)
        )
      ]);

      resultData = await fetchWithTimeout;
      console.log('Redis fetch result:', { id, hasData: !!resultData });

    } catch (redisError) {
      console.error('Redis error:', redisError);
      return createErrorPNGImage('Database Error');
    }

    if (!resultData) {
      console.log('No data found for ID:', id);
      return createErrorPNGImage('Result Not Found');
    }

    // Extract data safely
    const sentiment = (resultData as any)?.sentimentData || {};
    const meta = (resultData as any)?.meta || resultData;
    
    const videoTitle = meta?.videoInfo?.title || (resultData as any)?.videoInfo?.title || 'YouTube Video';
    const channelTitle = meta?.channelInfo?.channelTitle || (resultData as any)?.channelInfo?.channelTitle || 'Unknown Channel';
    const platform = (resultData as any)?.platform || 'youtube';

    const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive || 0)));
    const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral || 0)));
    const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative || 0)));

    console.log('Creating PNG image for:', { videoTitle, positive, neutral, negative });

    return createSentimentPNGImage({
      title: videoTitle,
      channelTitle: channelTitle,
      positive,
      neutral,
      negative,
      platform
    });

  } catch (error) {
    console.error('Critical error in OG image generation:', error);
    return createErrorPNGImage('Server Error');
  }
};

// Create actual PNG image using @vercel/og
function createSentimentPNGImage(data: {
  title: string;
  channelTitle: string;
  positive: number;
  neutral: number;
  negative: number;
  platform: string;
}) {
  const { title, channelTitle, positive, neutral, negative, platform } = data;
  
  // Truncate text for display
  const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  const truncatedChannel = channelTitle.length > 30 ? channelTitle.substring(0, 27) + '...' : channelTitle;
  
  const platformName = platform === 'reddit' ? 'Reddit' : platform === 'twitter' ? 'X' : 'YouTube';
  const platformColor = platform === 'reddit' ? '#FF4500' : platform === 'twitter' ? '#000000' : '#FF0000';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3B82F6',
          backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        }}
      >
        {/* Main Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '1080px',
            height: '510px',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '60px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Platform Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                backgroundColor: platformColor,
                color: 'white',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
            >
              {platformName}
            </div>
          </div>

          {/* Title and Channel */}
          <div style={{ marginBottom: '30px' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#1F2937',
                marginBottom: '10px',
                lineHeight: '1.2',
              }}
            >
              {truncatedTitle}
            </div>
            <div
              style={{
                fontSize: '20px',
                color: '#6B7280',
              }}
            >
              {truncatedChannel}
            </div>
          </div>

          {/* Sentiment Title */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: '30px',
            }}
          >
            Sentiment Analysis Results
          </div>

          {/* Sentiment Grid */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '40px',
            }}
          >
            {/* Positive */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#059669',
                  marginBottom: '8px',
                }}
              >
                {positive}%
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#059669',
                  textTransform: 'uppercase',
                }}
              >
                Positive
              </div>
            </div>

            {/* Neutral */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#6B7280',
                  marginBottom: '8px',
                }}
              >
                {neutral}%
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                }}
              >
                Neutral
              </div>
            </div>

            {/* Negative */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#DC2626',
                  marginBottom: '8px',
                }}
              >
                {negative}%
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#DC2626',
                  textTransform: 'uppercase',
                }}
              >
                Negative
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                color: '#3B82F6',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              🔍 Senti-Meter
            </div>
            <div
              style={{
                color: '#3B82F6',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
            >
              www.senti-meter.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function createDefaultPNGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3B82F6',
          backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '80px',
            margin: '60px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔍</div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: '20px',
            }}
          >
            Senti-Meter
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#3B82F6',
              marginBottom: '20px',
            }}
          >
            YouTube Sentiment Analyzer
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#6B7280',
              marginBottom: '30px',
            }}
          >
            AI-Powered • Free • Instant Results
          </div>
          <div
            style={{
              fontSize: '20px',
              color: '#3B82F6',
              fontWeight: 'bold',
            }}
          >
            www.senti-meter.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function createErrorPNGImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EF4444',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '80px',
            margin: '100px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#DC2626',
              marginBottom: '20px',
            }}
          >
            {message}
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#6B7280',
              marginBottom: '20px',
            }}
          >
            Senti-Meter - YouTube Sentiment Analysis
          </div>
          <div
            style={{
              fontSize: '20px',
              color: '#3B82F6',
              fontWeight: 'bold',
            }}
          >
            www.senti-meter.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}