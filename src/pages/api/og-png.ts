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
  // const title = meta?.videoInfo?.title || 'YouTube Video'; // Title not rendered in image
  const positive = Math.max(0, Math.min(100, Math.round(sentiment.positive ?? 0)));
  const neutral = Math.max(0, Math.min(100, Math.round(sentiment.neutral ?? 0)));
  const negative = Math.max(0, Math.min(100, Math.round(sentiment.negative ?? 0)));
  const analyzedCount = meta.analyzedCount || 0;
  const totalComments = meta.totalComments || 0;
  const mostLiked = sentiment.mostLiked || {};
  const mostLikedText = mostLiked.text || '';
  const mostLikedLikes = mostLiked.likeCount || 0;
  const summary = sentiment.summary || '';

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
        // Avatar + Channel Name (single cell, vertically stacked)
        React.createElement('div', {
          style: {
            minWidth: 150,
            minHeight: 110,
            background: '#f8fafc',
            borderRadius: 12,
            padding: '10px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px 0 rgba(59, 130, 246, 0.04)',
          }
        },
          avatarBuffer && avatarUrl ?
            React.createElement('img', {
              src: avatarUrl,
              width: 48,
              height: 48,
              style: {
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #e5e7eb',
                background: '#f3f4f6',
                marginBottom: 6,
              }
            }) :
            React.createElement('div', {
              style: {
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#e5e7eb',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 'bold',
                marginBottom: 6,
              }
            }, getInitials(channelName)),
          React.createElement('span', {
            style: {
              fontSize: 20,
              color: '#374151',
              fontWeight: 700,
              textAlign: 'center',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }
          }, channelName)
        ),
        // Positive
        React.createElement('div', {
          style: {
            minWidth: 150,
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
      // --- Dynamic content sizing logic ---
      (() => {
        // Card height: 630px, top row: ~110px + 28px margin, bottom margin: 80px, min comment box: 70px
        const CARD_HEIGHT = 630;
        const TOP_ROW_HEIGHT = 110 + 28;
        const BOTTOM_MARGIN = 80;
        const MIN_COMMENT_BOX = 70;
        const COMMENT_LABEL_HEIGHT = 28;
        const COMMENT_LIKES_HEIGHT = 24;
        const COMMENT_BOX_PADDING = 18 + 14; // top + bottom
        const AVAILABLE_HEIGHT = CARD_HEIGHT - TOP_ROW_HEIGHT - BOTTOM_MARGIN;
        // Estimate analysis and comment heights
        const analysisFontSize = 28;
        const commentFontSize = 24;
        // Estimate line heights (1.5x)
        const analysisLineHeight = Math.ceil(analysisFontSize * 1.5);
        const commentLineHeight = Math.ceil(commentFontSize * 1.5);
        // Estimate lines for analysis and comment
        const analysisLines = Math.ceil((summary.length || 1) / 80); // rough estimate: 80 chars/line
        const commentLines = Math.ceil((mostLikedText.length || 1) / 80);
        // Calculate required heights
        const analysisHeight = analysisLines * analysisLineHeight;
        const commentHeight = commentLines * commentLineHeight + COMMENT_LABEL_HEIGHT + COMMENT_LIKES_HEIGHT + COMMENT_BOX_PADDING;
        let showComment = true;
        let showReadMore = false;
        let maxAnalysisLines = analysisLines;
        // If both fit, show both
        if (analysisHeight + commentHeight < AVAILABLE_HEIGHT) {
          // ok
        } else if (analysisHeight < AVAILABLE_HEIGHT - MIN_COMMENT_BOX) {
          // Truncate comment to fit
          showReadMore = true;
        } else {
          // Only show as much analysis as fits, omit comment
          showComment = false;
          maxAnalysisLines = Math.floor((AVAILABLE_HEIGHT) / analysisLineHeight);
          showReadMore = true;
        }
        // Truncate analysis if needed
        let analysisDisplay = summary;
        if (maxAnalysisLines < analysisLines) {
          // Truncate to maxAnalysisLines
          let charsPerLine = 80;
          let maxChars = maxAnalysisLines * charsPerLine;
          analysisDisplay = summary.slice(0, maxChars - 4) + '...';
        }
        // Truncate comment if needed
        let commentDisplay = mostLikedText;
        if (showComment && showReadMore && commentHeight + analysisHeight > AVAILABLE_HEIGHT) {
          // Truncate comment to fit remaining space
          let remainingHeight = AVAILABLE_HEIGHT - (maxAnalysisLines * analysisLineHeight);
          let maxCommentLines = Math.floor((remainingHeight - COMMENT_LABEL_HEIGHT - COMMENT_LIKES_HEIGHT - COMMENT_BOX_PADDING) / commentLineHeight);
          let charsPerLine = 80;
          let maxChars = Math.max(0, maxCommentLines * charsPerLine);
          commentDisplay = mostLikedText.slice(0, maxChars - 4) + (maxChars > 0 ? '...' : '');
        }
        // --- Render analysis ---
        const analysisBlock = React.createElement('div', {
          style: {
            marginTop: 24,
            marginLeft: 'auto',
            marginRight: 'auto',
            color: '#374151',
            fontSize: analysisFontSize,
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: 1100,
            textAlign: 'left',
            marginBottom: 16, // reduced gap above comment box
          }
        }, analysisDisplay);
        // --- Render comment box ---
        const commentBox = showComment ? React.createElement('div', {
          style: {
            marginTop: 0,
            background: '#f8fafc',
            borderRadius: 14,
            padding: '18px 18px 14px 18px', // keep bottom padding
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: 60,
            maxWidth: 1100,
            marginLeft: 'auto',
            marginRight: 'auto',
            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.04)',
          }
        },
          // Label
          React.createElement('span', {
            style: {
              color: '#2563eb',
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
              alignSelf: 'flex-start',
              letterSpacing: 0.5,
            }
          }, 'Most Liked Comment'),
          // Comment text (italic, in quotes, minimal margin)
          React.createElement('span', {
            style: {
              color: '#374151',
              fontSize: commentFontSize,
              fontWeight: 500,
              marginBottom: 0, // minimize space below comment
              textAlign: 'left',
              width: '100%',
              lineHeight: 1.5,
              maxWidth: 1100,
              alignSelf: 'flex-start',
              fontStyle: 'italic', // always italic
            }
          }, `"${commentDisplay}"`),
          // Like count (just below comment, minimal space)
          React.createElement('span', {
            style: {
              color: '#6b7280',
              fontSize: 18,
              fontWeight: 400,
              marginTop: 0, // minimize space above likes
              alignSelf: 'flex-start',
            }
          }, `${mostLikedLikes} likes`)
        ) : null;
        // --- Render read more CTA if needed ---
        const readMoreBlock = showReadMore ? React.createElement('div', {
          style: {
            marginTop: 18,
            color: '#2563eb',
            fontSize: 22,
            fontWeight: 700,
            textAlign: 'center',
            width: '100%',
            letterSpacing: 0.5,
          }
        }, 'Read more →') : null;
        // --- Compose all blocks ---
        return [analysisBlock, commentBox, readMoreBlock];
      })(),
      // More content can be added below
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