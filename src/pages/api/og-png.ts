// src/pages/api/og-png.ts - Improved Twitter Card Design
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

    // Determine dominant sentiment and emoji
    let sentimentEmoji = '🤔';
    if (positive > 60) sentimentEmoji = '✨';
    else if (positive > 40) sentimentEmoji = '😊';
    else if (negative > 40) sentimentEmoji = '😬';
    else if (negative > 60) sentimentEmoji = '💔';

    console.log('[OG-PNG] Creating PNG image for:', { videoTitle, channelTitle, positive, neutral, negative });

    // Extract avatar URL and channel name
    const channelInfo = (resultData as any)?.meta?.channelInfo || {};
    const channelName = channelInfo.channelTitle || 'Unknown Channel';
    const avatarUrl = channelInfo.channelThumbnails?.medium?.url || channelInfo.channelThumbnails?.default?.url;
    const avatarBuffer = await fetchAvatarBuffer(avatarUrl);

    return createImprovedSentimentImage(resultData, channelName, avatarBuffer, avatarUrl, sentimentEmoji);

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

// Helper function for sentiment gauges
function createSentimentGauge(label: string, value: number, color: string) {
  return React.createElement('div', {
    style: {
      textAlign: 'center',
      position: 'relative',
    }
  },
    // Background circle
    React.createElement('div', {
      style: {
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid rgba(255,255,255,0.15)',
        position: 'relative',
        overflow: 'hidden',
      }
    },
      // Progress ring
      React.createElement('svg', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: 'rotate(-90deg)',
        }
      },
        React.createElement('circle', {
          cx: 80,
          cy: 80,
          r: 76,
          fill: 'none',
          stroke: color,
          strokeWidth: 6,
          strokeDasharray: `${2 * Math.PI * 76 * value / 100} ${2 * Math.PI * 76}`,
          strokeLinecap: 'round',
          opacity: 0.3,
        })
      ),
      React.createElement('div', {
        style: {
          fontSize: 52,
          fontWeight: 'bold',
          color: color,
          lineHeight: 1,
          textShadow: `0 0 20px ${color}33`,
        }
      }, `${value}%`),
      React.createElement('div', {
        style: {
          fontSize: 18,
          color: '#94A3B8',
          marginTop: 4,
          fontWeight: 600,
        }
      }, label)
    )
  );
}

function createImprovedSentimentImage(data: any, channelName: string, avatarBuffer: ArrayBuffer | null, avatarUrl: string | undefined, sentimentEmoji: string) {
  const sentiment = data?.sentimentData || {};
  const meta = data?.meta || {};
  const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive ?? 0)));
  const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral ?? 0)));
  const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative ?? 0)));
  const analyzedCount = meta.analyzedCount || 0;
  const totalComments = meta.totalComments || 0;

  return new ImageResponse(
    React.createElement('div', {
      style: {
        width: 1200,
        height: 630,
        backgroundColor: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }
    },
      // Gradient overlay
      React.createElement('div', {
        style: {
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 70%)
          `,
        }
      }),
      
      // Sentiment emoji (top right)
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: 40,
          right: 60,
          fontSize: 80,
          opacity: 0.2,
        }
      }, sentimentEmoji),
      
      // Header with channel info
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          padding: '50px 60px 30px',
          gap: 20,
          zIndex: 1,
        }
      },
        // Channel avatar
        avatarBuffer && avatarUrl ?
          React.createElement('img', {
            src: avatarUrl,
            style: {
              width: 70,
              height: 70,
              borderRadius: '50%',
              border: '4px solid #3B82F6',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            }
          }) :
          React.createElement('div', {
            style: {
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: '#1E293B',
              border: '4px solid #3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 'bold',
              color: '#3B82F6',
            }
          }, getInitials(channelName)),
        
        // Channel name and context
        React.createElement('div', {
          style: { flex: 1 }
        },
          React.createElement('div', {
            style: {
              color: '#64748B',
              fontSize: 18,
              marginBottom: 4,
              letterSpacing: '0.5px',
            }
          }, 'YouTube Comment Analysis'),
          React.createElement('div', {
            style: {
              color: '#F1F5F9',
              fontSize: 32,
              fontWeight: 'bold',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }
          }, channelName)
        )
      ),
      
      // Main sentiment display
      React.createElement('div', {
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 80,
          padding: '0 60px',
          zIndex: 1,
        }
      },
        createSentimentGauge('Positive', positive, '#10B981'),
        createSentimentGauge('Neutral', neutral, '#6B7280'),
        createSentimentGauge('Negative', negative, '#EF4444'),
      ),
      
      // Bottom section with branding and stats
      React.createElement('div', {
        style: {
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9), transparent)',
          padding: '40px 60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }
        },
          React.createElement('div', {
            style: {
              width: 60,
              height: 60,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            }
          }, '🔍'),
          React.createElement('div', {},
            React.createElement('div', {
              style: {
                color: '#F1F5F9',
                fontSize: 26,
                fontWeight: 'bold',
                marginBottom: 2,
              }
            }, 'Senti-Meter'),
            React.createElement('div', {
              style: {
                color: '#64748B',
                fontSize: 16,
              }
            }, 'AI-Powered Sentiment Analysis')
          )
        ),
        
        React.createElement('div', {
          style: {
            textAlign: 'right',
          }
        },
          React.createElement('div', {
            style: {
              color: '#94A3B8',
              fontSize: 20,
              marginBottom: 4,
            }
          }, `${analyzedCount.toLocaleString()} of ${totalComments.toLocaleString()} comments`),
          React.createElement('div', {
            style: {
              background: '#3B82F6',
              color: 'white',
              padding: '8px 20px',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 'bold',
              display: 'inline-block',
            }
          }, 'Analyze your video →')
        )
      )
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
          backgroundColor: '#0F172A',
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)
          `,
        }
      },
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '80px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
          }
        },
        React.createElement(
          'div',
          { style: { fontSize: '80px', marginBottom: '30px' } },
          '🔍'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '56px',
              fontWeight: 'bold',
              color: '#F1F5F9',
              marginBottom: '20px',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }
          },
          'Senti-Meter'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '28px',
              color: '#64748B',
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
          backgroundColor: '#0F172A',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.2) 0%, transparent 50%)',
        }
      },
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '24px',
            padding: '80px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
          }
        },
        React.createElement(
          'div',
          { style: { fontSize: '60px', marginBottom: '30px' } },
          '⚠️'
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#EF4444',
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