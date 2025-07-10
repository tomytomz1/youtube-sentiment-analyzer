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

    return createSentimentImage({
      title: videoTitle,
      channelTitle,
      positive,
      neutral,
      negative
    });

  } catch (error) {
    console.error('[OG-PNG] Error generating OG image:', error);
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
  console.log('[OG-PNG] Sentiment image generated with data:', data);
  
  const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  const truncatedChannel = channelTitle.length > 30 ? channelTitle.substring(0, 27) + '...' : channelTitle;

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
          position: 'relative',
        }
      },
      // Debug red rectangle in top left
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: 100,
          height: 100,
          backgroundColor: 'red',
          zIndex: 1000,
        }
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '1080px',
            height: '510px',
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '60px',
            position: 'relative',
          }
        },
        // Platform Badge
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: '#FF0000',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '30px',
              display: 'inline-block',
              width: 'fit-content',
            }
          },
          'YouTube'
        ),
        // Title
        React.createElement(
          'div',
          {
            style: {
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: '10px',
              lineHeight: '1.2',
            }
          },
          truncatedTitle
        ),
        // Channel
        React.createElement(
          'div',
          {
            style: {
              fontSize: '20px',
              color: '#6B7280',
              marginBottom: '30px',
            }
          },
          truncatedChannel
        ),
        // Sentiment Title
        React.createElement(
          'div',
          {
            style: {
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: '30px',
            }
          },
          'Sentiment Analysis Results'
        ),
        // Sentiment Grid
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '40px',
            }
          },
          // Positive
          React.createElement(
            'div',
            { style: { textAlign: 'center', flex: 1 } },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#059669',
                  marginBottom: '8px',
                }
              },
              `${positive}%`
            ),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#059669',
                }
              },
              'POSITIVE'
            )
          ),
          // Neutral
          React.createElement(
            'div',
            { style: { textAlign: 'center', flex: 1 } },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#6B7280',
                  marginBottom: '8px',
                }
              },
              `${neutral}%`
            ),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#6B7280',
                }
              },
              'NEUTRAL'
            )
          ),
          // Negative
          React.createElement(
            'div',
            { style: { textAlign: 'center', flex: 1 } },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#DC2626',
                  marginBottom: '8px',
                }
              },
              `${negative}%`
            ),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#DC2626',
                }
              },
              'NEGATIVE'
            )
          )
        ),
        // Branding
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              bottom: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              justifyContent: 'space-between',
            }
          },
          React.createElement(
            'div',
            {
              style: {
                color: '#3B82F6',
                fontSize: '20px',
                fontWeight: 'bold',
              }
            },
            '🔍 Senti-Meter'
          ),
          React.createElement(
            'div',
            {
              style: {
                color: '#3B82F6',
                fontSize: '18px',
                fontWeight: 'bold',
              }
            },
            'www.senti-meter.com'
          )
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