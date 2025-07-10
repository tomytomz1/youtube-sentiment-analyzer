// src/pages/api/og-png.ts - Using React.createElement (no JSX)
import { ImageResponse } from '@vercel/og';
import type { APIRoute } from 'astro';
import React from 'react';

export const GET: APIRoute = async ({ url }) => {
  console.log('[OG-PNG] API called with url:', url);
  try {
    const searchParams = new URL(url).searchParams;
    const id = searchParams.get('id');
    console.log('[OG-PNG] Extracted id:', id);

    if (!id) {
      console.error('[OG-PNG] No ID provided');
      return createDefaultImage();
    }

    // Validate ID format
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      console.error('[OG-PNG] Invalid ID format:', id);
      return createErrorImage('Invalid ID Format');
    }

    // Get data from Redis
    let resultData = null;
    try {
      const { Redis } = await import('@upstash/redis');
      
      const redisUrl = import.meta.env.KV_REST_API_URL;
      const redisToken = import.meta.env.KV_REST_API_TOKEN;
      console.log('[OG-PNG] Redis config:', { redisUrl, redisToken: !!redisToken });

      if (!redisUrl || !redisToken) {
        console.error('[OG-PNG] Redis configuration missing');
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
      console.log('[OG-PNG] Redis fetch result:', { id, hasData: !!resultData, resultData });
    } catch (redisError) {
      console.error('[OG-PNG] Redis error:', redisError);
      return createErrorImage('Database Error');
    }

    if (!resultData) {
      console.error('[OG-PNG] No data found for ID:', id);
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

    console.log('[OG-PNG] Creating PNG image for:', { videoTitle, channelTitle, positive, neutral, negative });

    return createSentimentImage();

  } catch (error) {
    console.error('[OG-PNG] Error generating OG image:', error);
    return createErrorImage('Server Error');
  }
};

function createSentimentImage() {
  // Minimal test: solid red PNG with centered white text, 1200x630
  return new ImageResponse(
    React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: 'red',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    },
      React.createElement('span', {
        style: {
          color: 'white',
          fontSize: 80,
          fontWeight: 'bold',
        }
      }, 'OG IMAGE TEST')
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function createDefaultImage() {
  console.log('[OG-PNG] Returning default image');
  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3B82F6',
          backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        }
      },
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
          }
        },
        React.createElement(
          'div',
          { style: { fontSize: '60px', marginBottom: '20px' } },
          '🔍'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: '20px',
            }
          },
          'Senti-Meter'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#3B82F6',
            }
          },
          'YouTube Sentiment Analyzer'
        )
      )
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function createErrorImage(message: string) {
  console.log('[OG-PNG] Returning error image with message:', message);
  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EF4444',
        }
      },
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
          }
        },
        React.createElement(
          'div',
          { style: { fontSize: '48px', marginBottom: '20px' } },
          '⚠️'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#DC2626',
            }
          },
          message
        )
      )
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}