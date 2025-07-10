// src/pages/api/og-png.ts - Working React version that generates PNG
import { ImageResponse } from '@vercel/og';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return createDefaultImage();
    }

    // Validate ID format
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      return createErrorImage('Invalid ID Format');
    }

    // Get data from Redis
    let resultData = null;
    try {
      const { Redis } = await import('@upstash/redis');
      
      const redisUrl = import.meta.env.KV_REST_API_URL;
      const redisToken = import.meta.env.KV_REST_API_TOKEN;

      if (!redisUrl || !redisToken) {
        return createErrorImage('Configuration Error');
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
    } catch (redisError) {
      console.error('Redis error:', redisError);
      return createErrorImage('Database Error');
    }

    if (!resultData) {
      return createErrorImage('Result Not Found');
    }

    // Extract data
    const sentiment = (resultData as any)?.sentimentData || {};
    const meta = (resultData as any)?.meta || {};
    
    const videoTitle = meta?.videoInfo?.title || 'YouTube Video';
    const channelTitle = meta?.channelInfo?.channelTitle || 'Unknown Channel';
    
    const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive || 0)));
    const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral || 0)));
    const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative || 0)));

    return createSentimentImage({
      title: videoTitle,
      channelTitle,
      positive,
      neutral,
      negative
    });

  } catch (error) {
    console.error('Error generating OG image:', error);
    return createErrorImage('Server Error');
  }
};

function createSentimentImage(data: {
  title: string;
  channelTitle: string;
  positive: number;
  neutral: number;
  negative: number;
}) {
  const { title, channelTitle, positive, neutral, negative } = data;
  
  const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  const truncatedChannel = channelTitle.length > 30 ? channelTitle.substring(0, 27) + '...' : channelTitle;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
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
            width: '1080px',
            height: '510px',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Platform Badge */}
          <div
            style={{
              backgroundColor: '#FF0000',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '30px',
              display: 'inline-block',
              width: 'fit-content',
            }}
          >
            YouTube
          </div>
          
          {/* Title */}
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
          
          {/* Channel */}
          <div
            style={{
              fontSize: '20px',
              color: '#6B7280',
              marginBottom: '30px',
            }}
          >
            {truncatedChannel}
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
                }}
              >
                POSITIVE
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
                }}
              >
                NEUTRAL
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
                }}
              >
                NEGATIVE
              </div>
            </div>
          </div>
          
          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              justifyContent: 'space-between',
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

function createDefaultImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3B82F6',
          backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>
            🔍
          </div>
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
            }}
          >
            YouTube Sentiment Analyzer
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

function createErrorImage(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EF4444',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            ⚠️
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#DC2626',
            }}
          >
            {message}
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