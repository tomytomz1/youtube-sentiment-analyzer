// src/pages/api/og-png.ts - Enhanced with error handling but keeping your working structure
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

    // FIXED: Use your original ID validation that was working
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      console.error('[OG-PNG] Invalid ID format:', id);
      return createErrorImage('Invalid ID Format');
    }

    // Get data from Redis with enhanced error handling
    let resultData = null;
    try {
      // FIXED: Add safety check for environment variables
      const redisUrl = import.meta.env.KV_REST_API_URL;
      const redisToken = import.meta.env.KV_REST_API_TOKEN;
      console.log('[OG-PNG] Redis config:', { redisUrl, redisToken: !!redisToken });

      if (!redisUrl || !redisToken) {
        console.error('[OG-PNG] Redis configuration missing');
        return createErrorImage('Configuration Error');
      }

      const { Redis } = await import('@upstash/redis');
      
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      // FIXED: Add timeout to prevent hanging
      const fetchWithTimeout = Promise.race([
        redis.get(id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis timeout')), 8000)
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

    // FIXED: Use your original data extraction logic that was working
    const sentiment = (resultData as any)?.sentimentData || {};
    const meta = (resultData as any)?.meta || {};
    
    const videoTitle = meta?.videoInfo?.title || 'YouTube Video';
    const channelTitle = meta?.channelInfo?.channelTitle || 'Unknown Channel';
    
    const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive || 0)));
    const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral || 0)));
    const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative || 0)));

    console.log('[OG-PNG] Creating PNG image for:', { videoTitle, channelTitle, positive, neutral, negative });

    // FIXED: Use your original function signature and logic
    const channelInfo = (resultData as any)?.meta?.channelInfo || {};
    const channelName = channelInfo.channelTitle || 'Unknown Channel';
    const avatarUrl = channelInfo.channelThumbnails?.medium?.url || channelInfo.channelThumbnails?.default?.url;
    const avatarBuffer = await fetchAvatarBuffer(avatarUrl);

    // FIXED: Keep your original function name and parameters
    return createSentimentImage(resultData, channelName, avatarBuffer, avatarUrl);

  } catch (error) {
    console.error('[OG-PNG] Error generating OG image:', error);
    return createErrorImage('Server Error');
  }
};

// KEEP: Your original helper functions exactly as they were
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

// KEEP: Your original createSentimentImage function exactly as it was working
function createSentimentImage(data: any, channelName: string, avatarBuffer: ArrayBuffer | null, avatarUrl: string | undefined) {
  // FIXED: Add safety checks to prevent crashes
  const sentiment = data?.sentimentData || {};
  const meta = data?.meta || {};
  
  const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive ?? 0)));
  const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral ?? 0)));
  const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative ?? 0)));
  const analyzedCount = Math.max(0, meta.analyzedCount || 0);
  const totalComments = Math.max(0, meta.totalComments || 0);
  
  // FIXED: Safer extraction of summary data
  const summary = typeof sentiment.summary === 'string' ? sentiment.summary : '';

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
        justifyContent: 'flex-start',
        paddingBottom: 80, // extra bottom margin for social label
        position: 'relative', // allow absolute positioning for logo
      }
    },
      // Top Row: Avatar+Channel Name as one cell, then 5 equal-sized data squares (all horizontally aligned)
      React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          maxWidth: 1100,
          margin: '28px auto 0 auto', // add top margin
          paddingTop: 0,
          paddingBottom: 0,
        }
      },
        // Avatar + Channel Name (no box)
        React.createElement('div', {
          style: {
            minWidth: 220,
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 18, // keep spacing between avatar and stat boxes
          }
        },
          avatarBuffer && avatarUrl ?
            React.createElement('img', {
              src: avatarUrl,
              width: 120,
              height: 120,
              style: {
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #e5e7eb',
                background: '#f3f4f6',
                marginBottom: 10,
              }
            }) :
            React.createElement('div', {
              style: {
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: '#e5e7eb',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 44,
                fontWeight: 'bold',
                marginBottom: 10,
              }
            }, getInitials(channelName)),
          React.createElement('span', {
            style: {
              fontSize: 28,
              color: '#374151',
              fontWeight: 700,
              textAlign: 'center',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }
          }, channelName)
        ),
        // Positive
        React.createElement('div', {
          style: {
            minWidth: 120,
            background: '#e0f7ec',
            borderRadius: 12,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px 0 rgba(16, 185, 129, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#059669',
              fontSize: 40,
              fontWeight: 'bold',
              marginBottom: 4,
            }
          }, `${positive}%`),
          React.createElement('span', {
            style: {
              color: '#059669',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }
          }, 'Positive')
        ),
        // Neutral
        React.createElement('div', {
          style: {
            minWidth: 150,
            background: '#f3f4f6',
            borderRadius: 12,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px 0 rgba(107, 114, 128, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#6b7280',
              fontSize: 40,
              fontWeight: 'bold',
              marginBottom: 4,
            }
          }, `${neutral}%`),
          React.createElement('span', {
            style: {
              color: '#6b7280',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }
          }, 'Neutral')
        ),
        // Negative
        React.createElement('div', {
          style: {
            minWidth: 150,
            background: '#fee2e2',
            borderRadius: 12,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px 0 rgba(220, 38, 38, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#dc2626',
              fontSize: 40,
              fontWeight: 'bold',
              marginBottom: 4,
            }
          }, `${negative}%`),
          React.createElement('span', {
            style: {
              color: '#dc2626',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }
          }, 'Negative')
        ),
        // Analyzed
        React.createElement('div', {
          style: {
            minWidth: 150,
            background: '#e0e7ff',
            borderRadius: 12,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px 0 rgba(59, 130, 246, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#2563eb',
              fontSize: 40,
              fontWeight: 'bold',
              marginBottom: 4,
            }
          }, analyzedCount),
          React.createElement('span', {
            style: {
              color: '#2563eb',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }
          }, 'Analyzed')
        ),
        // Total
        React.createElement('div', {
          style: {
            minWidth: 150,
            background: '#f1f5f9',
            borderRadius: 12,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px 0 rgba(71, 85, 105, 0.08)',
          }
        },
          React.createElement('span', {
            style: {
              color: '#334155',
              fontSize: 40,
              fontWeight: 'bold',
              marginBottom: 4,
            }
          }, totalComments),
          React.createElement('span', {
            style: {
              color: '#334155',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
            }
          }, 'Total')
        )
      ),
      // --- True dynamic layout: no height/line estimates, natural flow, no overlap ---
      (() => {
        // Render analysis block (above)
        const analysisBlock = summary ? React.createElement('div', {
          style: {
            marginTop: 24,
            marginLeft: 'auto',
            marginRight: 'auto',
            color: '#374151',
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: 1100,
            textAlign: 'left',
            marginBottom: 16,
          }
        }, summary) : null;
        // Remove the commentBox entirely from the OG card
        // Return only the analysis block
        return [analysisBlock].filter(Boolean);
      })(),
      // More content can be added below
      React.createElement('img', {
        src: 'https://www.senti-meter.com/logo.png',
        width: 300,
        height: 100,
        style: {
          position: 'absolute',
          right: 5,
          bottom: 10,
          objectFit: 'contain',
          display: 'block',
        }
      })
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

// KEEP: Your original default and error images exactly as they were
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