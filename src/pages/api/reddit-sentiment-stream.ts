import https from 'https';
import type { APIRoute } from 'astro';

// Environment variables
const clientId = import.meta.env.REDDIT_CLIENT_ID;
const clientSecret = import.meta.env.REDDIT_CLIENT_SECRET;
const openaiApiKey = import.meta.env.OPENAI_API_KEY;

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Increased for development and testing

// Interface for stream message structure
// interface StreamMessage {
//   type: 'progress' | 'partial_analysis' | 'sentiment_complete' | 'themes_complete' | 'sarcasm_complete' | 'complete' | 'error';
//   stage?: string;
//   message?: string;
//   data?: any;
//   field?: string;
//   value?: any;
//   error?: string;
// }

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  limit.count++;
  return false;
}

function sanitizeString(str: string, maxLength: number = 1000): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isValidRedditUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length > 2048) return false;
  
  const patterns = [
    /^https:\/\/(www\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^https:\/\/(old\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^https:\/\/(new\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url.trim()));
}

function extractThreadInfo(url: string): { subreddit: string; threadId: string; slug?: string } | null {
  const patterns = [
    /reddit\.com\/r\/([^\/]+)\/comments\/([a-zA-Z0-9]+)(?:\/([^\/\?]+))?/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        subreddit: match[1],
        threadId: match[2],
        slug: match[3] || undefined
      };
    }
  }
  return null;
}

async function getRedditAccessToken(): Promise<string> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SentiMeterBot/1.0 by u/Optimal_Ring1535',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Reddit OAuth2 error: ${response.status}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function extractImageUrl(threadData: any): Promise<string | undefined> {
  let imageUrl: string | undefined;
  
  console.log('Extracting image URL from thread data:', {
    hasPreview: !!threadData.preview,
    hasMedia: !!threadData.media,
    hasSecureMedia: !!threadData.secure_media,
    thumbnail: threadData.thumbnail,
    url: threadData.url,
    postHint: threadData.post_hint,
    isVideo: threadData.is_video,
    domain: threadData.domain
  });
  
  // 1. Check for preview images (most common for image posts)
  if (threadData.preview?.images?.[0]?.source?.url) {
    imageUrl = threadData.preview.images[0].source.url;
    console.log('Found image in preview.source.url:', imageUrl);
  }
  // 2. Check for preview images with resolutions
  else if (threadData.preview?.images?.[0]?.resolutions?.length > 0) {
    // Get the highest resolution image
    const resolutions = threadData.preview.images[0].resolutions;
    const highestRes = resolutions.reduce((prev: any, current: any) => 
      (prev.width > current.width) ? prev : current
    );
    imageUrl = highestRes.url;
    console.log('Found image in preview.resolutions:', imageUrl);
  }
  // 3. Check for gallery images
  else if (threadData.gallery_data?.items?.length > 0) {
    const firstItem = threadData.gallery_data.items[0];
    const mediaId = firstItem.media_id;
    if (threadData.media_metadata?.[mediaId]?.s?.u) {
      imageUrl = threadData.media_metadata[mediaId].s.u;
      console.log('Found image in gallery:', imageUrl);
    }
  }
  // 4. Check for media metadata directly
  else if (threadData.media_metadata) {
    const mediaIds = Object.keys(threadData.media_metadata);
    if (mediaIds.length > 0) {
      const firstMedia = threadData.media_metadata[mediaIds[0]];
      if (firstMedia.s?.u) {
        imageUrl = firstMedia.s.u;
        console.log('Found image in media_metadata:', imageUrl);
      }
    }
  }
  // 5. Check for media oembed thumbnail
  else if (threadData.media?.oembed?.thumbnail_url) {
    imageUrl = threadData.media.oembed.thumbnail_url;
    console.log('Found image in media.oembed.thumbnail_url:', imageUrl);
  }
  // 6. Check for secure media oembed thumbnail
  else if (threadData.secure_media?.oembed?.thumbnail_url) {
    imageUrl = threadData.secure_media.oembed.thumbnail_url;
    console.log('Found image in secure_media.oembed.thumbnail_url:', imageUrl);
  }
  // 7. Check for thumbnail (allow Reddit external previews)
  else if (threadData.thumbnail && 
           threadData.thumbnail !== 'self' && 
           threadData.thumbnail !== 'default' && 
           threadData.thumbnail !== 'nsfw' &&
           threadData.thumbnail !== 'spoiler') {
    imageUrl = threadData.thumbnail;
    console.log('Found image in thumbnail:', imageUrl);
  }
  // 8. Check if the URL itself is an image
  else if (threadData.url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(threadData.url)) {
    imageUrl = threadData.url;
    console.log('Found image URL directly:', imageUrl);
  }
  // 9. Check for Reddit image URLs in the URL field
  else if (threadData.url && threadData.url.includes('redd.it') && threadData.url.includes('v0-')) {
    imageUrl = threadData.url;
    console.log('Found Reddit image URL:', imageUrl);
  }
  
  // 10. If no image found in Reddit data, try to scrape from external URL
  if (!imageUrl && threadData.url && !threadData.url.includes('reddit.com')) {
    try {
      console.log('No image URL found in Reddit data, trying to scrape from external URL:', threadData.url);
      imageUrl = await scrapePreviewImage(threadData.url);
      if (imageUrl) {
        console.log('Successfully scraped preview image:', imageUrl);
      } else {
        console.log('No preview image found on external site');
      }
    } catch (error) {
      console.log('Error scraping preview image:', error);
    }
  }
  
  if (!imageUrl) {
    console.log('No image URL found in thread data');
  }
  
  return imageUrl;
}

async function scrapePreviewImage(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Stop if we've read enough to find meta tags
        if (data.length > 100000) {
          req.destroy();
          return;
        }
      });

      res.on('end', () => {
        try {
          // Look for OpenGraph image
          const ogImageMatch = data.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
          if (ogImageMatch) {
            resolve(ogImageMatch[1]);
            return;
          }

          // Look for Twitter Card image
          const twitterImageMatch = data.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
          if (twitterImageMatch) {
            resolve(twitterImageMatch[1]);
            return;
          }

          // Look for other meta image tags
          const metaImageMatch = data.match(/<meta[^>]*name=["']image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
          if (metaImageMatch) {
            resolve(metaImageMatch[1]);
            return;
          }

          resolve(undefined);
        } catch {
          resolve(undefined);
        }
      });
    });

    req.on('error', () => {
      resolve(undefined);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(undefined);
    });

    req.end();
  });
}

async function fetchRedditData(threadInfo: { subreddit: string; threadId: string; slug?: string }): Promise<any> {
  const token = await getRedditAccessToken();
  const jsonUrl = `https://oauth.reddit.com/r/${threadInfo.subreddit}/comments/${threadInfo.threadId}?limit=500&sort=top`;

  const response = await fetch(jsonUrl, { 
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'SentiMeterBot/1.0 by u/Optimal_Ring1535'
    }
  });

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.status}`);
  }
    
  const data = await response.json();
  
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error('Invalid Reddit API response format');
  }
  
  // Extract thread data
  const threadPost = data[0]?.data?.children?.[0]?.data;
  if (!threadPost) {
    throw new Error('Could not find thread data');
  }
  
  // Extract comments
  const commentsData = data[1]?.data?.children || [];
  const comments: any[] = [];
  
  function extractComments(commentsList: any[], depth = 0, parentId?: string) {
    if (depth > 5) return;
    
    for (const comment of commentsList) {
      if (comment.kind === 't1' && comment.data) {
        const commentData = comment.data;
        
        if (commentData.body && 
            commentData.body !== '[deleted]' && 
            commentData.body !== '[removed]' &&
            typeof commentData.body === 'string' &&
            commentData.body.trim().length > 0) {
          
          comments.push({
            text: sanitizeString(commentData.body, 1000),
            score: Math.max(0, commentData.score || 0),
            author: commentData.author || '[deleted]',
            permalink: commentData.permalink || '',
            depth,
            timestamp: commentData.created_utc,
            parent_id: parentId,
            id: commentData.id
          });
        }
        
        if (commentData.replies?.data?.children) {
          extractComments(commentData.replies.data.children, depth + 1, commentData.id);
        }
      }
    }
  }
  
  extractComments(commentsData);
  
  return {
    threadData: {
      title: threadPost.title,
      subreddit: threadPost.subreddit,
      author: threadPost.author,
      score: threadPost.score,
      created: threadPost.created_utc,
      numComments: threadPost.num_comments,
      url: `https://www.reddit.com${threadPost.permalink}`,
      imageUrl: await extractImageUrl(threadPost),
    },
    comments: comments.slice(0, 100),
    totalComments: threadPost.num_comments || comments.length
  };
}

async function streamOpenAIAnalysis(redditData: any, controller: any) {
  const prompt = `
You are a next-generation Reddit sentiment analysis engine. Analyze the following Reddit thread and comments with full transparency, thematic clustering, sarcasm/meme detection, mod action detection, top positive/negative comments, actionable recommendations, and audit fields.

Thread metadata:
Title: ${redditData.threadData.title}
Subreddit: ${redditData.threadData.subreddit}
Author: ${redditData.threadData.author}
Created: ${new Date(redditData.threadData.created * 1000).toISOString()}
URL: ${redditData.threadData.url}
Total Comments: ${redditData.totalComments}

Comments (JSON array, each with text, score, author, permalink, depth, timestamp):
${JSON.stringify(redditData.comments)}

Return a single valid JSON object matching this schema:
{
  "analyzed_count": 0,
  "analyzed_sample_rate": 0,
  "subreddit": "",
  "thread_title": "",
  "thread_url": "",
  "thread_post_author": "",
  "thread_post_time": "",
  "analysis_timestamp": "",
  "data_freshness": {},
  "sampling_quality": {},
  "language_analysis": {},
  "overall_sentiment": {
    "positive": 0,
    "neutral": 0,
    "negative": 0,
    "confidence": 0,
    "explainability": "",
    "raw_distribution": {},
    "sentiment_volatility": "",
    "volatility_reason": ""
  },
  "sentiment_by_depth": [],
  "reply_chain_depth_breakdown": {},
  "sentiment_over_time": [],
  "themes": [],
  "sarcasm_flags": [],
  "meme_detection": [],
  "community_lingo": [],
  "top_positive_comments": [],
  "top_negative_comments": [],
  "mod_actions_detected": [],
  "drama_indicators": [],
  "brigading_indicators": [],
  "controversial_comments": [],
  "hidden_score_comments": [],
  "emerging_topics": [],
  "risk_alerts": [],
  "user_feedback_stats": {},
  "live_retrain_stats": {},
  "privacy_warnings": [],
  "audit_log": [],
  "user_feedback_url": "",
  "dispute_resolution": {},
  "retrain_suggestions": [],
  "last_model_update": "",
  "model_performance": {},
  "data_sources": [],
  "time_window": {},
  "quality_warnings": [],
  "schema_version": "1.0.0"
}

Return ONLY valid JSON. No markdown, no prose, no explanation. If any required data is missing, fill warnings/risk_alerts/data_freshness as appropriate.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'RedditSentimentAnalyzer/2.0',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a product-focused AI assistant for Reddit sentiment analysis. Output only valid JSON matching the provided schema.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.2,
      top_p: 0.9,
      stream: true
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const stream = response.body;
  if (!stream) {
    throw new Error('No response stream from OpenAI');
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let partialJSON = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Stream complete
            if (partialJSON) {
              try {
                const result = JSON.parse(partialJSON);
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'complete',
                  data: result
                })}\n\n`);
              } catch {
                throw new Error('Invalid JSON from OpenAI');
              }
            }
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              partialJSON += parsed.choices[0].delta.content;
              
              // Send progress updates for key fields
              if (partialJSON.includes('"overall_sentiment"')) {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'progress',
                  stage: 'sentiment_analyzed',
                  message: 'Overall sentiment analysis complete'
                })}\n\n`);
              }
              
              if (partialJSON.includes('"themes"')) {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'progress',
                  stage: 'themes_identified',
                  message: 'Themes and topics identified'
                })}\n\n`);
              }
              
              if (partialJSON.includes('"sarcasm_flags"')) {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'progress',
                  stage: 'sarcasm_detected',
                  message: 'Sarcasm and meme detection complete'
                })}\n\n`);
              }
            }
          } catch {
            // Continue accumulating JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function analyzeWithStreaming(redditUrl: string, _maxComments: number, controller: any) {
  try {
    // Step 1: Send initial progress
    controller.enqueue(`data: ${JSON.stringify({
      type: 'progress',
      stage: 'fetching_comments',
      message: 'Fetching Reddit comments...'
    })}\n\n`);

    // Step 2: Fetch Reddit data
    const threadInfo = extractThreadInfo(redditUrl);
    if (!threadInfo) {
      throw new Error('Could not extract thread info from URL');
    }

    const redditData = await fetchRedditData(threadInfo);
    
    if (!redditData.comments || redditData.comments.length === 0) {
      throw new Error('No comments found on this Reddit thread');
    }
    
    // Apply tier-based comment limits for streaming
    const userTier = 'free'; // Default to free for streaming endpoint
    const commentLimit = userTier === 'free' ? 50 : 125;
    redditData.comments = redditData.comments.slice(0, commentLimit);

    // Step 3: Send comments fetched
    controller.enqueue(`data: ${JSON.stringify({
      type: 'progress',
      stage: 'comments_fetched',
      message: `Analyzing ${redditData.comments.length} comments...`,
      data: { 
        commentCount: redditData.comments.length,
        totalComments: redditData.totalComments,
        threadTitle: redditData.threadData.title,
        subreddit: redditData.threadData.subreddit
      }
    })}\n\n`);

    // Step 4: Stream OpenAI analysis
    await streamOpenAIAnalysis(redditData, controller);

  } catch (error: any) {
    console.error('Streaming analysis error:', error);
    controller.enqueue(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'An error occurred during analysis'
    })}\n\n`);
  } finally {
    controller.close();
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { redditUrl, maxComments = 100 } = body;

    // Validate input
    if (!redditUrl || typeof redditUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid Reddit URL provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isValidRedditUrl(redditUrl)) {
      return new Response(JSON.stringify({ error: 'Could not extract thread ID from URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate environment variables
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Reddit API credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        analyzeWithStreaming(redditUrl, maxComments, controller);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': import.meta.env.PROD
          ? 'https://www.senti-meter.com'
          : 'http://localhost:4321',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error: any) {
    console.error('Streaming API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handle preflight requests
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': import.meta.env.PROD
        ? 'https://www.senti-meter.com'
        : 'http://localhost:4321',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}; 