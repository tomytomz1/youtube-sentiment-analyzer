import type { APIRoute } from 'astro';

type CommentObj = { text: string, likeCount: number };

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

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
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, maxLength);
}

function secureResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Access-Control-Allow-Origin': import.meta.env.PROD
        ? 'https://www.senti-meter.com'
        : 'http://localhost:4321',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function createErrorResponse(message: string, status: number = 400, debugInfo?: any) {
  console.error('API Error:', message, debugInfo);
  
  // In development, include more debug info
  const response: any = { error: message };
  if (!import.meta.env.PROD && debugInfo) {
    response.debug = debugInfo;
  }
  
  return secureResponse(response, status);
}

function isValidYouTubeUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length > 2048) return false;
  
  const patterns = [
    /^https:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
    /^https:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
    /^https:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
    /^https:\/\/(www\.)?youtube\.com\/v\/[a-zA-Z0-9_-]{11}/
  ];
  
  return patterns.some(pattern => pattern.test(url.trim()));
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) && 
           (parsed.hostname.endsWith('.youtube.com') || 
            parsed.hostname.endsWith('.ytimg.com') ||
            parsed.hostname.endsWith('.ggpht.com') ||
            parsed.hostname.endsWith('.googleusercontent.com'));
  } catch {
    return false;
  }
}

function sanitizeThumbnails(thumbnails: any) {
  if (!thumbnails || typeof thumbnails !== 'object') return {};
  
  const sanitized: any = {};
  ['default', 'medium', 'high'].forEach(size => {
    if (thumbnails[size]?.url && isValidImageUrl(thumbnails[size].url)) {
      sanitized[size] = { url: thumbnails[size].url };
    }
  });
  
  return sanitized;
}

// HTML entity decoder (safe, no dependencies)
function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
            .replace(/&#x([\da-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, '\'')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
}

// Main API Route
export const POST: APIRoute = async ({ request }) => {
  console.log('=== Comments API Debug Start ===');
  // Masked API key logging for debugging only (shows first 4 chars)
  const maskedYouTubeKey = import.meta.env.YOUTUBE_API_KEY ? import.meta.env.YOUTUBE_API_KEY.slice(0, 4) + '...' : 'undefined';
  const maskedOpenAIKey = import.meta.env.OPENAI_API_KEY ? import.meta.env.OPENAI_API_KEY.slice(0, 4) + '...' : 'undefined';
  console.log('Loaded API Key (masked):', maskedYouTubeKey);
  console.log('Loaded OpenAI Key (masked):', maskedOpenAIKey);
  
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    console.log('Rate limit key:', rateLimitKey);
    
    if (isRateLimited(rateLimitKey)) {
      console.log('Rate limited');
      return createErrorResponse('Too many requests', 429);
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      return createErrorResponse('Invalid content type', 400);
    }

    // Parse request body with error handling
    let body: any;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return createErrorResponse('Invalid JSON', 400);
    }

    const { youtubeUrl } = body;
    console.log('YouTube URL:', youtubeUrl);

    // Validate input
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return createErrorResponse('Invalid YouTube URL provided', 400);
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      return createErrorResponse('Could not extract video ID from URL', 400, { url: youtubeUrl });
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    console.log('Extracted video ID:', videoId);
    
    if (!videoId) {
      return createErrorResponse('Could not extract video ID from URL', 400, { url: youtubeUrl });
    }

    // Validate environment variables
    const apiKey = import.meta.env.YOUTUBE_API_KEY;
    console.log('API Key status:', {
      exists: !!apiKey,
      length: apiKey?.length,
      startsWithSk: apiKey?.startsWith('sk-'),
      isPlaceholder: apiKey === 'your_youtube_api_key_here'
    });
    
    if (!apiKey || apiKey === 'your_youtube_api_key_here') {
      console.error('YouTube API key not configured properly');
      return createErrorResponse('YouTube API key not configured', 500, {
        keyExists: !!apiKey,
        isPlaceholder: apiKey === 'your_youtube_api_key_here'
      });
    }

    // Setup request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Request timeout triggered');
      controller.abort();
    }, 30000);

    try {
      console.log('Fetching video data...');
      
      // Test basic video info first
      const videoData = await fetchVideoData(videoId, apiKey, controller.signal);
      console.log('Video data received:', {
        title: videoData?.snippet?.title,
        channelId: videoData?.snippet?.channelId,
        commentCount: videoData?.statistics?.commentCount
      });
      
      if (!videoData) {
        return createErrorResponse('Could not fetch video info', 500, { videoId });
      }

      // Get real total comment count
      const totalComments = videoData.statistics?.commentCount
        ? Math.max(0, parseInt(videoData.statistics.commentCount, 10))
        : 0;

      console.log('Total comments:', totalComments);

      if (totalComments === 0) {
        return createErrorResponse('Comments disabled or no comments found', 404, { 
          videoId,
          hasStatistics: !!videoData.statistics,
          commentCount: videoData.statistics?.commentCount 
        });
      }

      // Fetch channel info (optional)
      let channelInfo = {};
      try {
        console.log('Fetching channel info...');
        channelInfo = await fetchChannelInfo(videoData.snippet.channelId, apiKey, controller.signal);
        console.log('Channel info fetched successfully');
      } catch (error) {
        console.warn('Could not fetch channel info:', error);
      }

      // Fetch comments
      console.log('Fetching comments...');
      const commentsPromises = [
        fetchYouTubeComments(videoId, apiKey, 150, 'relevance', controller.signal),
        fetchYouTubeComments(videoId, apiKey, 150, 'time', controller.signal)
      ];

      const [commentsRelevance, commentsTime] = await Promise.allSettled(commentsPromises);
      console.log('Comments fetch results:', {
        relevance: commentsRelevance.status,
        time: commentsTime.status,
        relevanceCount: commentsRelevance.status === 'fulfilled' ? commentsRelevance.value.length : 0,
        timeCount: commentsTime.status === 'fulfilled' ? commentsTime.value.length : 0
      });
      
      const allComments: CommentObj[] = [];
      
      if (commentsRelevance.status === 'fulfilled') {
        allComments.push(...commentsRelevance.value);
      } else {
        console.error('Relevance comments failed:', commentsRelevance.reason);
      }
      
      if (commentsTime.status === 'fulfilled') {
        allComments.push(...commentsTime.value);
      } else {
        console.error('Time comments failed:', commentsTime.reason);
      }

      console.log('Total fetched comments:', allComments.length);

      if (allComments.length === 0) {
        return createErrorResponse('No comments found', 404, {
          videoId,
          totalComments,
          relevanceError: commentsRelevance.status === 'rejected' ? commentsRelevance.reason : null,
          timeError: commentsTime.status === 'rejected' ? commentsTime.reason : null
        });
      }

      // Deduplicate comments
      const uniqueComments = allComments.filter((comment, index, arr) =>
        arr.findIndex(c => c.text === comment.text) === index
      );

      console.log('Unique comments:', uniqueComments.length);

      // Sample up to 300 for analysis
      let analyzedComments = uniqueComments;
      if (uniqueComments.length > 300) {
        analyzedComments = getRandomSample(uniqueComments, 300);
      }

      // Find most liked comment
      const mostLikedComment = uniqueComments.reduce(
        (max, curr) => (curr.likeCount > max.likeCount ? curr : max),
        uniqueComments[0]
      );

      console.log('Most liked comment likes:', mostLikedComment.likeCount);

      // Sanitize and prepare response
      const response = {
        comments: analyzedComments.map(c => sanitizeString(c.text, 500)),
        totalComments: Math.min(totalComments, 1000000),
        analyzedCount: analyzedComments.length,
        mostLiked: {
          text: sanitizeString(mostLikedComment.text, 500),
          likeCount: Math.max(0, mostLikedComment.likeCount)
        },
        videoInfo: {
          title: sanitizeString(videoData.snippet?.title || '', 200),
          description: sanitizeString(videoData.snippet?.description || '', 1000),
          channelId: sanitizeString(videoData.snippet?.channelId || '', 50),
          channelTitle: sanitizeString(videoData.snippet?.channelTitle || '', 100),
        },
        channelInfo: sanitizeChannelInfo(channelInfo),
      };

      console.log('=== Comments API Debug Success ===');
      clearTimeout(timeoutId);
      return secureResponse(response);

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Inner API Error:', error);
      
      if (error.name === 'AbortError') {
        return createErrorResponse('Request timeout', 504);
      }
      
      if (error.message?.includes('quota')) {
        return createErrorResponse('YouTube API quota exceeded', 503, { error: error.message });
      }
      
      if (error.message?.includes('not found')) {
        return createErrorResponse('Video not found', 404, { error: error.message });
      }
      
      return createErrorResponse('Could not fetch video info', 500, { 
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
    }

  } catch (error: any) {
    console.error('=== Comments API Debug Error ===');
    console.error('Outer error:', error);
    return createErrorResponse('Internal server error', 500, {
      error: error?.message || String(error),
      stack: error?.stack?.split('\n').slice(0, 3)
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

function sanitizeChannelInfo(channelInfo: any) {
  if (!channelInfo || typeof channelInfo !== 'object') return {};
  
  return {
    channelTitle: sanitizeString(channelInfo.channelTitle || '', 100),
    channelDescription: sanitizeString(channelInfo.channelDescription || '', 1000),
    channelPublishedAt: sanitizeString(channelInfo.channelPublishedAt || '', 50),
    channelCustomUrl: sanitizeString(channelInfo.channelCustomUrl || '', 100),
    channelTopics: Array.isArray(channelInfo.channelTopics)
      ? channelInfo.channelTopics.slice(0, 20).map((topic: any) => sanitizeString(topic, 200))
      : [],
    channelThumbnails: sanitizeThumbnails(channelInfo.channelThumbnails)
  };
}

/**
 * Extract video ID from various YouTube URL formats with strict validation
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetch YouTube video data with enhanced error handling
 */
async function fetchVideoData(videoId: string, apiKey: string, signal?: AbortSignal) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
  
  console.log('Fetching video data from:', url.replace(apiKey, 'API_KEY_HIDDEN'));
  
  const response = await fetch(url, { 
    signal,
    headers: {
      'User-Agent': 'YouTube-Sentiment-Analyzer/1.0'
    }
  });
  
  console.log('Video data response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Video data error response:', errorText);
    
    if (response.status === 403) {
      throw new Error('YouTube API quota exceeded or access denied');
    }
    if (response.status === 404) {
      throw new Error('Video not found');
    }
    if (response.status === 400) {
      throw new Error('Bad request to YouTube API');
    }
    throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('Video data structure:', {
    hasItems: !!data.items,
    itemsCount: data.items?.length || 0,
    firstItemKeys: data.items?.[0] ? Object.keys(data.items[0]) : []
  });
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Video not found or private');
  }
  
  return data.items[0];
}

/**
 * Fetch channel info with error handling
 */
async function fetchChannelInfo(channelId: string, apiKey: string, signal?: AbortSignal) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,topicDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
  
  console.log('Fetching channel info for:', channelId);
  
  const response = await fetch(url, { 
    signal,
    headers: {
      'User-Agent': 'YouTube-Sentiment-Analyzer/1.0'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Channel info error:', errorText);
    throw new Error(`Channel API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  if (data.items && Array.isArray(data.items) && data.items[0]) {
    const snippet = data.items[0].snippet || {};
    const topicDetails = data.items[0].topicDetails || {};
    return {
      channelTitle: snippet.title,
      channelDescription: snippet.description,
      channelPublishedAt: snippet.publishedAt,
      channelThumbnails: snippet.thumbnails,
      channelCustomUrl: snippet.customUrl,
      channelTopics: topicDetails.topicCategories || [],
    };
  }
  return {};
}

/**
 * Fetch comments with enhanced error handling
 */
async function fetchYouTubeComments(
  videoId: string,
  apiKey: string,
  maxToFetch: number = 150,
  order: 'relevance' | 'time' = 'relevance',
  signal?: AbortSignal
): Promise<CommentObj[]> {
  console.log(`Fetching comments (${order}):`, { videoId, maxToFetch });
  
  const comments: CommentObj[] = [];
  let nextPageToken = '';
  let fetched = 0;
  const maxPerPage = 100;
  const maxPages = 3;
  let pageCount = 0;

  while (fetched < maxToFetch && pageCount < maxPages) {
    let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}&maxResults=${maxPerPage}&order=${order}`;
    if (nextPageToken) {
      url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
    }
    
    console.log(`Fetching comments page ${pageCount + 1}...`);
    
    const response = await fetch(url, { 
      signal,
      headers: {
        'User-Agent': 'YouTube-Sentiment-Analyzer/1.0'
      }
    });

    console.log(`Comments page ${pageCount + 1} response:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Comments error (page ${pageCount + 1}):`, errorText);
      
      if (response.status === 403) {
        throw new Error('YouTube API quota exceeded or comments disabled');
      } else if (response.status === 404) {
        throw new Error('Comments not found or disabled');
      } else {
        throw new Error(`Comments API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    
    console.log(`Comments page ${pageCount + 1} data:`, {
      itemsCount: data.items?.length || 0,
      hasNextPageToken: !!data.nextPageToken
    });
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const snippet = item.snippet?.topLevelComment?.snippet;
        if (snippet && snippet.textDisplay && typeof snippet.textDisplay === 'string') {
          const decoded = decodeHtmlEntities(snippet.textDisplay);
          const clean = sanitizeString(decoded, 500);
          if (clean && !comments.some(c => c.text === clean)) {
            comments.push({
              text: clean,
              likeCount: Math.max(0, snippet.likeCount || 0),
            });
          }
        }
      }
      fetched += data.items.length;
    }

    if (data.nextPageToken) {
      nextPageToken = data.nextPageToken;
    } else {
      console.log('No more pages available');
      break;
    }
    
    pageCount++;
  }

  console.log(`Fetched ${comments.length} ${order} comments`);
  return comments;
}

/**
 * Get a random sample using Fisher–Yates shuffle
 */
function getRandomSample<T>(arr: T[], n: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, n);
} 