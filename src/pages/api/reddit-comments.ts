import type { APIRoute } from 'astro';

const clientId = import.meta.env.REDDIT_CLIENT_ID;
const clientSecret = import.meta.env.REDDIT_CLIENT_SECRET;

type RedditCommentObj = { text: string, score: number };

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
  console.error('Reddit API Error:', message, debugInfo);
  
  // In development, include more debug info
  const response: any = { error: message };
  if (!import.meta.env.PROD && debugInfo) {
    response.debug = debugInfo;
  }
  
  return secureResponse(response, status);
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

// Main API Route
export const POST: APIRoute = async ({ request }) => {
  console.log('=== Reddit Comments API Debug Start ===');
  
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

    const { redditUrl } = body;
    console.log('Reddit URL:', redditUrl);

    // Validate input
    if (!redditUrl || typeof redditUrl !== 'string') {
      return createErrorResponse('Invalid Reddit URL provided', 400);
    }

    if (!isValidRedditUrl(redditUrl)) {
      return createErrorResponse('Could not extract thread ID from URL', 400, { url: redditUrl });
    }

    // Extract thread info
    const threadInfo = extractThreadInfo(redditUrl);
    console.log('Extracted thread info:', threadInfo);
    
    if (!threadInfo) {
      return createErrorResponse('Could not extract thread info from URL', 400, { url: redditUrl });
    }

    // Setup request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Request timeout triggered');
      controller.abort();
    }, 30000);

    try {
      console.log('Fetching Reddit data...');
      
      // Fetch Reddit thread and comments
      const redditData = await fetchRedditData(threadInfo, controller.signal);
      console.log('Reddit data received:', {
        title: redditData?.threadData?.title,
        subreddit: redditData?.threadData?.subreddit,
        commentCount: redditData?.comments?.length
      });
      
      if (!redditData) {
        return createErrorResponse('Could not fetch Reddit thread info', 500, { threadInfo });
      }

      if (!redditData.comments || redditData.comments.length === 0) {
        return createErrorResponse('No comments found on this Reddit thread', 404, { 
          threadInfo,
          hasThreadData: !!redditData.threadData
        });
      }

      // Find most upvoted comment
      const mostUpvotedComment = redditData.comments.reduce(
        (max, curr) => (curr.score > max.score ? curr : max),
        redditData.comments[0]
      );

      console.log('Most upvoted comment score:', mostUpvotedComment.score);

      // Sanitize and prepare response
      const response = {
        comments: redditData.comments.map(c => sanitizeString(c.text, 500)),
        totalComments: Math.min(redditData.totalComments || redditData.comments.length, 1000000),
        analyzedCount: redditData.comments.length,
        mostUpvoted: {
          text: sanitizeString(mostUpvotedComment.text, 500),
          score: Math.max(0, mostUpvotedComment.score)
        },
        threadInfo: {
          title: sanitizeString(redditData.threadData?.title || '', 200),
          subreddit: sanitizeString(redditData.threadData?.subreddit || '', 50),
          author: sanitizeString(redditData.threadData?.author || '', 50),
          score: Math.max(0, redditData.threadData?.score || 0),
          created: redditData.threadData?.created || null,
          url: sanitizeString(redditUrl, 500),
          imageUrl: redditData.threadData?.imageUrl || undefined,
        },
      };

      console.log('=== Reddit Comments API Debug Success ===');
      clearTimeout(timeoutId);
      return secureResponse(response);

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Inner API Error:', error);
      
      if (error.name === 'AbortError') {
        return createErrorResponse('Request timeout', 504);
      }
      
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        return createErrorResponse('Reddit API rate limit exceeded', 503, { error: error.message });
      }
      
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return createErrorResponse('Reddit thread not found', 404, { error: error.message });
      }
      
      return createErrorResponse('Could not fetch Reddit thread info', 500, { 
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
    }

  } catch (error: any) {
    console.error('=== Reddit Comments API Debug Error ===');
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

/**
 * Extract thread information from Reddit URL
 */
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

async function getRedditAccessToken(clientId: string, clientSecret: string): Promise<string> {
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
    const errorText = await response.text();
    throw new Error(`Reddit OAuth2 error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch Reddit thread data and comments
 */
async function fetchRedditData(threadInfo: { subreddit: string; threadId: string; slug?: string }, signal?: AbortSignal) {
  // Get Reddit OAuth2 token using your credentials
  const token = await getRedditAccessToken(clientId, clientSecret);

  // Now use the OAuth API endpoint!
  const jsonUrl = `https://oauth.reddit.com/r/${threadInfo.subreddit}/comments/${threadInfo.threadId}?limit=500&sort=top`;

  console.log('Fetching Reddit data from (OAuth):', jsonUrl);

  const response = await fetch(jsonUrl, { 
    signal,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'SentiMeterBot/1.0 by u/Optimal_Ring1535'
    }
  });

  console.log('Reddit data response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Reddit data error response:', errorText);

    if (response.status === 429) {
      throw new Error('Reddit API rate limit exceeded');
    }
    if (response.status === 404) {
      throw new Error('Reddit thread not found');
    }
    if (response.status === 403) {
      throw new Error('Reddit thread is private or restricted');
    }
    throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
  }
    
  const data = await response.json();
  console.log('Reddit data structure:', {
    hasData: !!data,
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : 'not array'
  });
  
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error('Invalid Reddit API response format');
  }
  
  // Extract thread data from first element
  const threadPost = data[0]?.data?.children?.[0]?.data;
  if (!threadPost) {
    throw new Error('Could not find thread data');
  }
  
  // Add imageUrl if available and valid
  let imageUrl: string | undefined = undefined;
  
  console.log('Thread post data for image extraction:', {
    hasPreview: !!threadPost.preview,
    hasImages: !!threadPost.preview?.images?.[0],
    hasSource: !!threadPost.preview?.images?.[0]?.source,
    sourceUrl: threadPost.preview?.images?.[0]?.source?.url,
    hasResolutions: !!threadPost.preview?.images?.[0]?.resolutions?.length,
    urlOverridden: threadPost.url_overridden_by_dest,
    thumbnail: threadPost.thumbnail,
    thumbnailWidth: threadPost.thumbnail_width,
    thumbnailHeight: threadPost.thumbnail_height,
    url: threadPost.url,
    postHint: threadPost.post_hint,
    domain: threadPost.domain,
    fullPreview: threadPost.preview
  });
  
  // Priority 1: Preview images (highest quality)
  if (threadPost.preview?.images?.[0]?.source?.url) {
    imageUrl = threadPost.preview.images[0].source.url.replace(/&amp;/g, '&');
    console.log('Using preview source image:', imageUrl);
  } else if (
    threadPost.preview?.images?.[0]?.resolutions?.length
  ) {
    // Use the largest available resolution
    const resolutions = threadPost.preview.images[0].resolutions;
    imageUrl = resolutions[resolutions.length - 1].url.replace(/&amp;/g, '&');
    console.log('Using preview resolution image:', imageUrl);
  } else if (threadPost.preview?.images?.[0]?.variants?.gif?.source?.url) {
    // Handle GIF variants
    imageUrl = threadPost.preview.images[0].variants.gif.source.url.replace(/&amp;/g, '&');
    console.log('Using GIF variant image:', imageUrl);
  } else if (threadPost.preview?.images?.[0]?.variants?.mp4?.source?.url) {
    // Handle MP4 variants  
    imageUrl = threadPost.preview.images[0].variants.mp4.source.url.replace(/&amp;/g, '&');
    console.log('Using MP4 variant image:', imageUrl);
  } 
  // Priority 2: Direct image URLs
  else if (
    threadPost.url_overridden_by_dest &&
    threadPost.url_overridden_by_dest.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)
  ) {
    imageUrl = threadPost.url_overridden_by_dest;
    console.log('Using URL override image:', imageUrl);
  } else if (
    threadPost.url &&
    threadPost.url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)
  ) {
    imageUrl = threadPost.url;
    console.log('Using direct URL image:', imageUrl);
  }
  // Priority 3: Thumbnails (fallback)
  else if (
    threadPost.thumbnail &&
    threadPost.thumbnail.startsWith('http') &&
    threadPost.thumbnail !== 'self' &&
    threadPost.thumbnail !== 'default' &&
    threadPost.thumbnail !== 'nsfw' &&
    threadPost.thumbnail !== 'spoiler'
  ) {
    imageUrl = threadPost.thumbnail;
    console.log('Using thumbnail image:', imageUrl);
  }
  
  console.log('Final image URL:', imageUrl);
  const threadData = {
    title: threadPost.title,
    subreddit: threadPost.subreddit,
    author: threadPost.author,
    score: threadPost.score,
    created: threadPost.created_utc,
    numComments: threadPost.num_comments,
    imageUrl,
  };
  
  // Extract comments from second element
  const commentsData = data[1]?.data?.children || [];
  const comments: RedditCommentObj[] = [];
  
  function extractComments(commentsList: any[], depth = 0) {
    if (depth > 5) return; // Prevent infinite recursion
    
    for (const comment of commentsList) {
      if (comment.kind === 't1' && comment.data) {
        const commentData = comment.data;
        
        // Skip deleted/removed comments
        if (commentData.body && 
            commentData.body !== '[deleted]' && 
            commentData.body !== '[removed]' &&
            typeof commentData.body === 'string' &&
            commentData.body.trim().length > 0) {
          
          comments.push({
            text: sanitizeString(commentData.body, 1000),
            score: Math.max(0, commentData.score || 0)
          });
        }
        
        // Recursively extract replies
        if (commentData.replies?.data?.children) {
          extractComments(commentData.replies.data.children, depth + 1);
        }
      }
    }
  }
  
  extractComments(commentsData);
  
  console.log(`Extracted ${comments.length} comments from Reddit thread`);
  
  return {
    threadData,
    comments: comments.slice(0, 300), // Limit to 300 comments
    totalComments: threadData.numComments || comments.length
  };
}

// Removed unused getRandomSample function