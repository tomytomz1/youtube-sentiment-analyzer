import type { APIRoute } from 'astro';

const clientId = import.meta.env.REDDIT_CLIENT_ID;
const clientSecret = import.meta.env.REDDIT_CLIENT_SECRET;

type RedditCommentObj = { 
  text: string, 
  score: number,
  author: string,
  created: number,
  permalink: string,
  id: string,
  parentId?: string,
  depth: number
};

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
    // Standard desktop formats
    /^https:\/\/(www\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^https:\/\/(old\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^https:\/\/(new\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    
    // Mobile formats
    /^https:\/\/(m\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^https:\/\/(www\.)?reddit\.com\/r\/[^\/]+\/s\/[a-zA-Z0-9]+/,  // Mobile share format
    
    // Without www
    /^https:\/\/reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^https:\/\/reddit\.com\/r\/[^\/]+\/s\/[a-zA-Z0-9]+/,
    
    // HTTP versions (less secure but sometimes used)
    /^http:\/\/(www\.)?reddit\.com\/r\/[^\/]+\/comments\/[a-zA-Z0-9]+/,
    /^http:\/\/(www\.)?reddit\.com\/r\/[^\/]+\/s\/[a-zA-Z0-9]+/,
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

    // Resolve mobile share URLs
    let resolvedUrl: string;
    try {
      resolvedUrl = await resolveMobileShareUrl(redditUrl);
      console.log('Resolved Reddit URL:', resolvedUrl);
    } catch (error) {
      console.error('Failed to resolve Reddit URL:', error);
      return new Response(JSON.stringify({ 
        error: error.message || 'Unable to resolve Reddit URL',
        details: 'Please check that the Reddit link is valid and accessible.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract thread info
    const threadInfo = extractThreadInfo(resolvedUrl);
    console.log('Extracted thread info:', threadInfo);
    
    if (!threadInfo) {
      return createErrorResponse('Could not extract thread info from URL', 400, { url: resolvedUrl });
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
        comments: redditData.comments.map(c => ({
          text: c.text, // Keep raw text for frontend processing
          score: Math.max(0, c.score),
          author: c.author,
          created: c.created,
          permalink: c.permalink,
          id: c.id,
          parentId: c.parentId,
          depth: c.depth
        })),
        totalComments: Math.min(redditData.totalComments || redditData.comments.length, 1000000),
        analyzedCount: redditData.comments.length,
        mostUpvoted: {
          text: mostUpvotedComment.text, // Keep raw text for frontend processing
          score: Math.max(0, mostUpvotedComment.score),
          author: mostUpvotedComment.author,
          created: mostUpvotedComment.created,
          permalink: mostUpvotedComment.permalink,
          id: mostUpvotedComment.id,
          depth: mostUpvotedComment.depth
        },
        threadInfo: {
          title: sanitizeString(redditData.threadData?.title || '', 200),
          subreddit: sanitizeString(redditData.threadData?.subreddit || '', 50),
          author: sanitizeString(redditData.threadData?.author || '', 50),
          score: Math.max(0, redditData.threadData?.score || 0),
          created: redditData.threadData?.created || null,
          url: sanitizeString(resolvedUrl, 500),
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
 * Validate if a Reddit URL actually exists
 */
async function validateRedditUrl(url: string): Promise<boolean> {
  try {
    console.log('Validating Reddit URL existence:', url);
    
    // Skip validation in production/Vercel environment as it can cause issues
    // Reddit may block HEAD requests from cloud providers
    if (import.meta.env.VERCEL || import.meta.env.PROD) {
      console.log('Skipping URL validation in production environment');
      return true;
    }
    
    // Try a simple HEAD request to check if the URL exists
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    
    console.log('URL validation response status:', response.status);
    
    // Consider 200, 301, 302 as valid (redirects are fine)
    if (response.status === 200 || response.status === 301 || response.status === 302) {
      console.log('URL is valid');
      return true;
    }
    
    // 404 means the URL doesn't exist
    if (response.status === 404) {
      console.log('URL returns 404 - does not exist');
      return false;
    }
    
    // 403 might mean access restrictions but URL could still exist
    if (response.status === 403) {
      console.log('URL returns 403 - access restricted but may exist');
      return true; // Continue processing, let the actual resolution methods handle it
    }
    
    // For other status codes, assume it might be valid (rate limiting, etc.)
    console.log('URL validation inconclusive, assuming valid');
    return true;
    
  } catch (error) {
    console.error('Error validating Reddit URL:', error);
    // If we can't validate, assume it might be valid
    return true;
  }
}

/**
 * Resolve mobile share URLs to actual thread URLs
 */
async function resolveMobileShareUrl(url: string): Promise<string> {
  // Check if it's a mobile share URL
  if (!/\/r\/[^\/]+\/s\/[a-zA-Z0-9]+/.test(url)) {
    return url; // Not a mobile share URL, return as-is
  }
  
  // First, validate if the share URL actually exists
  const urlExists = await validateRedditUrl(url);
  if (!urlExists) {
    console.log('Mobile share URL does not exist or is expired');
    throw new Error('This Reddit share link appears to be invalid or expired. Please check the URL and try again.');
  }
  
  try {
    console.log('Resolving mobile share URL:', url);
    
    // Try Reddit's JSON API to resolve the share URL
    const jsonUrl = url + '.json';
    console.log('Trying JSON API:', jsonUrl);
    
    const jsonResponse = await fetch(jsonUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    if (jsonResponse.ok) {
      const data = await jsonResponse.json();
      console.log('JSON API response received');
      
      // Check if we got valid Reddit data
      if (data && Array.isArray(data) && data[0] && data[0].data && data[0].data.children && data[0].data.children[0]) {
        const post = data[0].data.children[0].data;
        if (post.subreddit && post.id) {
          const resolvedUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}/`;
          console.log('Successfully resolved via JSON API to:', resolvedUrl);
          return resolvedUrl;
        }
      }
    }
    
    console.log('JSON API did not work, trying redirect method with browser headers');
    
    // Enhanced redirect method with better headers
    const redirectResponse = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // Handle redirects manually to capture the Location header
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    
    console.log('Redirect response status:', redirectResponse.status);
    
    // Check for redirect responses
    if (redirectResponse.status >= 300 && redirectResponse.status < 400) {
      const location = redirectResponse.headers.get('location');
      console.log('Found redirect location:', location);
      
      if (location && isValidRedditUrl(location)) {
        console.log('Successfully resolved via redirect to:', location);
        return location;
      }
    }
    
    // If no redirect, try to parse the HTML content
    console.log('No redirect found, trying HTML content parsing');
    
    const htmlResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });
    
    const htmlText = await htmlResponse.text();
    console.log('HTML response length:', htmlText.length);
    
    // Enhanced HTML parsing with more patterns
    const patterns = [
      // Look for canonical URL
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      // Look for og:url meta tag
      /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
      // Look for twitter:url meta tag
      /<meta[^>]+name=["']twitter:url["'][^>]+content=["']([^"']+)["']/i,
      // Look for JavaScript redirects
      /window\.location\.href\s*=\s*["']([^"']+)["']/i,
      /window\.location\s*=\s*["']([^"']+)["']/i,
      /location\.href\s*=\s*["']([^"']+)["']/i,
      // Look for direct Reddit comment links in HTML
      /href=["'](https:\/\/www\.reddit\.com\/r\/[^\/]+\/comments\/[^"']+)["']/i,
      // Look for data attributes
      /data-permalink=["']([^"']+)["']/i,
      /data-url=["']([^"']+)["']/i,
      // Look for JSON-LD structured data
      /"url":\s*"([^"]+\/comments\/[^"]+)"/i,
      // Look for Reddit's internal routing data
      /"permalink":\s*"([^"]+)"/i
    ];
    
    for (const pattern of patterns) {
      const match = htmlText.match(pattern);
      if (match && match[1]) {
        let foundUrl = match[1];
        
        // Handle relative URLs
        if (foundUrl.startsWith('/')) {
          foundUrl = 'https://www.reddit.com' + foundUrl;
        }
        
        // Validate it's a proper Reddit URL
        if (isValidRedditUrl(foundUrl) && foundUrl.includes('/comments/')) {
          console.log('Found URL in HTML via pattern:', foundUrl);
          return foundUrl;
        }
      }
    }
    
    console.log('Could not resolve mobile share URL through any method');
    throw new Error('Unable to resolve this Reddit share link. It may be expired, invalid, or the post may have been deleted.');
    
  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('deleted')) {
      throw error; // Re-throw our custom error messages
    }
    console.error('Error resolving mobile share URL:', error);
    throw new Error('Unable to resolve this Reddit share link. Please try using the direct Reddit post URL instead.');
  }
}

/**
 * Extract thread information from Reddit URL
 */
function extractThreadInfo(url: string): { subreddit: string; threadId: string; slug?: string } | null {
  const patterns = [
    // Standard comments format: /r/subreddit/comments/threadId/slug
    /reddit\.com\/r\/([^\/]+)\/comments\/([a-zA-Z0-9]+)(?:\/([^\/\?]+))?/,
    // Mobile share format: /r/subreddit/s/shareId
    /reddit\.com\/r\/([^\/]+)\/s\/([a-zA-Z0-9]+)/,
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
  
  function extractComments(commentsList: any[], depth = 0, parentId?: string) {
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
            text: commentData.body, // Keep raw text for frontend processing
            score: Math.max(0, commentData.score || 0),
            author: commentData.author || '[deleted]',
            created: commentData.created_utc || 0,
            permalink: commentData.permalink || '',
            id: commentData.id || '',
            parentId: parentId,
            depth: depth
          });
        }
        
        // Recursively extract replies
        if (commentData.replies?.data?.children) {
          extractComments(commentData.replies.data.children, depth + 1, commentData.id);
        }
      }
    }
  }
  
  extractComments(commentsData);
  console.log(`Extracted ${comments.length} comments from Reddit thread`);
  return {
    threadData,
    comments, // Return all comments
    totalComments: threadData.numComments || comments.length
  };
}

// Removed unused getRandomSample function