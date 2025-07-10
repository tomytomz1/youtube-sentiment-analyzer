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

    // Extract avatar URL and channel name
    const channelInfo = (resultData as any)?.meta?.channelInfo || {};
    const channelName = channelInfo.channelTitle || 'Unknown Channel';
    const avatarUrl = channelInfo.channelThumbnails?.medium?.url || channelInfo.channelThumbnails?.default?.url;
    const avatarBuffer = await fetchAvatarBuffer(avatarUrl);

    return createSentimentImage(resultData, channelName, avatarBuffer, avatarUrl);

  } catch (error) {
    console.error('[OG-PNG] Error generating OG image:', error);
    return createErrorImage('Server Error');
  }
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function fetchAvatarBuffer(url: string | undefined): Promise<ArrayBuffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function createSentimentImage(data: any, channelName: string, avatarBuffer: ArrayBuffer | null, avatarUrl: string | undefined) {
  // Extract from correct locations
  const sentiment = data?.sentimentData || {};
  const meta = data?.meta || {};
  const title = meta?.videoInfo?.title || 'YouTube Video';
  const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive ?? 0)));
  const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral ?? 0)));
  const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative ?? 0)));
  const mostLiked = sentiment.mostLiked || {};
  const mostLikedText = mostLiked.text || '';
  const mostLikedLikes = mostLiked.likeCount || 0;

  return new ImageResponse(
    React.createElement('div', {
      style: {
        width: 1200,
        height: 630,
        backgroundColor: 'white',
        borderRadius: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }
    },
      // Header
      React.createElement('div', {
        style: {
          width: '100%',
          height: 80,
          backgroundColor: '#2563eb',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 40,
        }
      },
        React.createElement('span', {
          style: {
            color: 'white',
            fontSize: 36,
            fontWeight: 'bold',
            lineHeight: 1.2,
            maxWidth: 1100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }
        }, title)
      ),
      // Avatar + Channel Name Row
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          marginTop: 24,
          marginLeft: 40,
        }
      },
        avatarBuffer && avatarUrl ?
          React.createElement('img', {
            src: avatarUrl,
            width: 56,
            height: 56,
            style: {
              borderRadius: '50%',
              objectFit: 'cover',
              marginRight: 20,
              border: '2px solid #e5e7eb',
              background: '#f3f4f6',
            }
          }) :
          React.createElement('div', {
            style: {
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#e5e7eb',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 'bold',
              marginRight: 20,
            }
          }, getInitials(channelName)),
        React.createElement('span', {
          style: {
            fontSize: 28,
            color: '#374151',
            fontWeight: 600,
            maxWidth: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }
        }, channelName)
      ),
      // Sentiment Bars Row
      React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 40,
          marginLeft: 40,
          marginRight: 40,
          gap: 32,
        }
      },
        // Positive Bar
        React.createElement('div', {
          style: {
            flex: 1,
            background: '#e0f7ec',
            borderRadius: 16,
            padding: '24px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 2px 8px 0 rgba(16, 185, 129, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#059669',
              fontSize: 48,
              fontWeight: 'bold',
              marginBottom: 8,
            }
          }, `${positive}%`),
          React.createElement('span', {
            style: {
              color: '#059669',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1,
            }
          }, 'Positive')
        ),
        // Neutral Bar
        React.createElement('div', {
          style: {
            flex: 1,
            background: '#f3f4f6',
            borderRadius: 16,
            padding: '24px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 2px 8px 0 rgba(107, 114, 128, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#6b7280',
              fontSize: 48,
              fontWeight: 'bold',
              marginBottom: 8,
            }
          }, `${neutral}%`),
          React.createElement('span', {
            style: {
              color: '#6b7280',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1,
            }
          }, 'Neutral')
        ),
        // Negative Bar
        React.createElement('div', {
          style: {
            flex: 1,
            background: '#fee2e2',
            borderRadius: 16,
            padding: '24px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 2px 8px 0 rgba(220, 38, 38, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#dc2626',
              fontSize: 48,
              fontWeight: 'bold',
              marginBottom: 8,
            }
          }, `${negative}%`),
          React.createElement('span', {
            style: {
              color: '#dc2626',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1,
            }
          }, 'Negative')
        )
      ),
      // Most Liked Comment Highlight Box (multi-line, no truncation)
      React.createElement('div', {
        style: {
          marginTop: 40,
          marginLeft: 40,
          marginRight: 40,
          background: '#fef9c3',
          borderRadius: 16,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          minHeight: 60,
          maxHeight: 140,
          overflow: 'hidden',
        }
      },
        // Trophy emoji
        React.createElement('span', {
          style: {
            fontSize: 32,
            marginRight: 8,
            marginTop: 2,
          }
        }, '🏆'),
        // Comment and like count
        React.createElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }
        },
          React.createElement('span', {
            style: {
              color: '#92400e',
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              // Allow multi-line, clamp to 4 lines
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              whiteSpace: 'normal',
              maxWidth: 900,
            }
          }, mostLikedText),
          React.createElement('span', {
            style: {
              color: '#b45309',
              fontSize: 18,
              fontWeight: 500,
            }
          }, `${mostLikedLikes} likes`)
        )
      )
      // More content will be added below in next steps
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