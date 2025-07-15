import type { APIRoute } from 'astro';

interface SentimentMeta {
  analyzedCount?: number;
  totalComments?: number;
  mostLiked?: { text: string; likeCount: number };
  mostUpvoted?: { text: string; score: number };
  videoInfo?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
  };
  threadInfo?: {
    title?: string;
    subreddit?: string;
    author?: string;
    score?: number;
    created?: number;
    url?: string;
  };
  channelInfo?: {
    channelTitle?: string;
    channelDescription?: string;
    channelPublishedAt?: string;
    channelThumbnails?: any;
    channelCustomUrl?: string;
    channelTopics?: string[];
  };
  platform?: string;
}

interface SentimentRequest {
  comments: string[];
  analyzedCount?: number;
  totalComments?: number;
  mostLiked?: { text: string; likeCount: number };
  mostUpvoted?: { text: string; score: number };
  videoInfo?: any;
  threadInfo?: any;
  channelInfo?: any;
  platform?: string;
}

// Rate limiting (reuse from comments API)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // Lower limit for AI API calls

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

function sanitizeString(str: unknown, maxLength: number = 1000): string {
  if (typeof str !== 'string') return '';
  
  // Remove potentially dangerous characters but preserve basic punctuation
  const cleaned = str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
    
  return cleaned.slice(0, maxLength);
}

function validateComments(comments: unknown): string[] {
  if (!Array.isArray(comments)) {
    throw new Error('Comments must be an array');
  }

  if (comments.length === 0) {
    throw new Error('Comments array cannot be empty');
  }

  if (comments.length > 500) {
    throw new Error('Too many comments provided');
  }

  const validatedComments = comments
    .filter((comment): comment is string => typeof comment === 'string')
    .map(comment => sanitizeString(comment, 1000))
    .filter(comment => comment.length > 0 && comment.length <= 1000);

  if (validatedComments.length === 0) {
    throw new Error('No valid comments found');
  }

  return validatedComments.slice(0, 300); // Limit to 300 comments
}

function validateMetadata(meta: any): SentimentMeta {
  const validated: SentimentMeta = {};

  // Platform detection
  validated.platform = sanitizeString(meta.platform || 'youtube', 20);

  if (typeof meta.analyzedCount === 'number' && meta.analyzedCount >= 0) {
    validated.analyzedCount = Math.min(meta.analyzedCount, 1000);
  }

  if (typeof meta.totalComments === 'number' && meta.totalComments >= 0) {
    validated.totalComments = Math.min(meta.totalComments, 10000000);
  }

  // YouTube-specific validation
  if (meta.mostLiked && typeof meta.mostLiked === 'object') {
    validated.mostLiked = {
      text: sanitizeString(meta.mostLiked.text || '', 500),
      likeCount: Math.max(0, Number(meta.mostLiked.likeCount) || 0)
    };
  }

  // Reddit-specific validation
  if (meta.mostUpvoted && typeof meta.mostUpvoted === 'object') {
    validated.mostUpvoted = {
      text: sanitizeString(meta.mostUpvoted.text || '', 500),
      score: Math.max(0, Number(meta.mostUpvoted.score) || 0)
    };
  }

  if (meta.videoInfo && typeof meta.videoInfo === 'object') {
    validated.videoInfo = {
      title: sanitizeString(meta.videoInfo.title || '', 200),
      description: sanitizeString(meta.videoInfo.description || '', 1000),
      channelId: sanitizeString(meta.videoInfo.channelId || '', 50),
      channelTitle: sanitizeString(meta.videoInfo.channelTitle || '', 100),
    };
  }

  if (meta.threadInfo && typeof meta.threadInfo === 'object') {
    validated.threadInfo = {
      title: sanitizeString(meta.threadInfo.title || '', 200),
      subreddit: sanitizeString(meta.threadInfo.subreddit || '', 50),
      author: sanitizeString(meta.threadInfo.author || '', 50),
      score: Math.max(0, Number(meta.threadInfo.score) || 0),
      created: typeof meta.threadInfo.created === 'number' ? meta.threadInfo.created : null,
      url: sanitizeString(meta.threadInfo.url || '', 500),
    };
  }

  if (meta.channelInfo && typeof meta.channelInfo === 'object') {
    validated.channelInfo = {
      channelTitle: sanitizeString(meta.channelInfo.channelTitle || '', 100),
      channelDescription: sanitizeString(meta.channelInfo.channelDescription || '', 1000),
      channelPublishedAt: sanitizeString(meta.channelInfo.channelPublishedAt || '', 50),
      channelCustomUrl: sanitizeString(meta.channelInfo.channelCustomUrl || '', 100),
      channelTopics: Array.isArray(meta.channelInfo.channelTopics)
        ? meta.channelInfo.channelTopics.slice(0, 10).map((topic: any) => sanitizeString(topic, 100))
        : [],
      channelThumbnails: validateThumbnails(meta.channelInfo.channelThumbnails)
    };
  }

  return validated;
}

function validateThumbnails(thumbnails: any) {
  if (!thumbnails || typeof thumbnails !== 'object') return {};
  
  const validated: any = {};
  ['default', 'medium', 'high'].forEach(size => {
    if (thumbnails[size]?.url) {
      try {
        const url = new URL(thumbnails[size].url);
        // Only allow trusted YouTube/Google domains
        if (['ytimg.com', 'ggpht.com', 'googleusercontent.com'].some(domain => url.hostname.endsWith(domain))) {
          validated[size] = { url: url.toString() };
        }
      } catch {
        // Invalid URL, skip
      }
    }
  });
  
  return validated;
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

function createErrorResponse(message: string, status: number = 400) {
  // Generic error messages to prevent information disclosure
  const genericMessages: Record<string, string> = {
    'Comments must be an array': 'Invalid data provided',
    'Comments array cannot be empty': 'Invalid data provided',
    'Too many comments provided': 'Too much data provided',
    'No valid comments found': 'Invalid data provided',
    'OpenAI API key not configured': 'Service temporarily unavailable',
    'Invalid OpenAI API key': 'Service temporarily unavailable',
    'OpenAI API rate limit exceeded': 'Service busy. Please try again later',
    'OpenAI API error': 'Service temporarily unavailable',
    'No response from OpenAI': 'Service temporarily unavailable',
    'Invalid JSON response from OpenAI': 'Service temporarily unavailable',
    'Invalid response format from OpenAI': 'Service temporarily unavailable',
    'Request timeout': 'Request timed out. Please try again',
    'Too many requests': 'Too many requests. Please try again later',
    'Invalid content type': 'Invalid request format',
    'Invalid JSON': 'Invalid request data',
    'Internal server error': 'An unexpected error occurred',
  };

  const safeMessage = genericMessages[message] || 'An error occurred. Please try again';
  
  return secureResponse({ error: safeMessage }, status);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return createErrorResponse('Too many requests', 429);
    }

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return createErrorResponse('Invalid content type', 400);
    }

    // Parse and validate request body
    let body: SentimentRequest;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    // Validate comments
    const validatedComments = validateComments(body.comments);

    // Validate metadata
    const validatedMeta = validateMetadata({
      analyzedCount: body.analyzedCount,
      totalComments: body.totalComments,
      mostLiked: body.mostLiked,
      mostUpvoted: body.mostUpvoted,
      videoInfo: body.videoInfo,
      threadInfo: body.threadInfo,
      channelInfo: body.channelInfo,
      platform: body.platform || 'youtube',
    });

    // Validate API key
    const apiKey = import.meta.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here' || !apiKey.startsWith('sk-')) {
      console.error('OpenAI API key not configured properly');
      return createErrorResponse('OpenAI API key not configured', 500);
    }

    // Detect platform context
    const platformContext = detectPlatformContext(validatedMeta);

    // Perform sentiment analysis with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let sentimentAnalysis;
    try {
      sentimentAnalysis = await analyzeSentiment(
        validatedComments,
        apiKey,
        {
          videoInfo: validatedMeta.videoInfo,
          threadInfo: validatedMeta.threadInfo,
          channelInfo: validatedMeta.channelInfo,
          platformContext,
          platform: validatedMeta.platform,
        },
        controller.signal
      );
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return createErrorResponse('Request timeout', 504);
        }
        if (error.message.includes('rate limit')) {
          return createErrorResponse('OpenAI API rate limit exceeded', 429);
        }
        if (error.message.includes('API key')) {
          return createErrorResponse('Invalid OpenAI API key', 500);
        }
        if (error.message.includes('OpenAI')) {
          return createErrorResponse('OpenAI API error', 500);
        }
      }
      
      console.error('Sentiment analysis error:', error);
      return createErrorResponse('Service temporarily unavailable', 500);
    }
    clearTimeout(timeoutId);

    // Combine results with metadata
    const result = {
      ...sentimentAnalysis,
      ...validatedMeta,
      ...(platformContext && { platformContext }),
    };

    return secureResponse(result);

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return createErrorResponse('Internal server error', 500);
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
 * Helper: Extract JSON object from GPT output with validation
 */
function extractJSON(str: string): string {
  // Remove markdown code blocks if present
  const cleaned = str.replace(/```json\s*|\s*```/g, '');
  
  // Find JSON object
  const match = cleaned.match(/{[\s\S]*}/);
  if (!match) {
    throw new Error('No JSON object found in response');
  }
  
  // Validate it's actually JSON
  try {
    JSON.parse(match[0]);
    return match[0];
  } catch {
    throw new Error('Invalid JSON in response');
  }
}

/**
 * Detects the platform context from metadata
 */
function detectPlatformContext(meta: SentimentMeta): string | undefined {
  const platform = meta.platform || 'youtube';
  
  if (platform === 'reddit') {
    if (meta.threadInfo?.subreddit) {
      return `r/${meta.threadInfo.subreddit}`;
    }
    return 'Reddit discussion';
  }
  
  if (platform === 'youtube') {
    if (meta.channelInfo?.channelTopics && Array.isArray(meta.channelInfo.channelTopics) && meta.channelInfo.channelTopics.length > 0) {
      return meta.channelInfo.channelTopics
        .map((topic: string) => {
          try {
            // Extract meaningful part from YouTube topic URLs
            const urlParts = topic.split('/');
            return decodeURIComponent(urlParts[urlParts.length - 1] || topic);
          } catch {
            return topic;
          }
        })
        .filter(Boolean)
        .slice(0, 3) // Limit to first 3 topics
        .join(', ');
    }
    
    // Fallback: extract keywords from channel description
    if (meta.channelInfo?.channelDescription) {
      const words = meta.channelInfo.channelDescription
        .split(/\s+/)
        .filter(word => word.length > 3 && word.length < 20)
        .slice(0, 5);
      return words.join(' ');
    }
  }
  
  return undefined;
}

/**
 * Analyze sentiment using OpenAI GPT-4o with platform-specific context
 */
async function analyzeSentiment(
  comments: string[],
  apiKey: string,
  meta: {
    videoInfo?: SentimentMeta['videoInfo'],
    threadInfo?: SentimentMeta['threadInfo'],
    channelInfo?: SentimentMeta['channelInfo'],
    platformContext?: string,
    platform?: string,
  },
  signal?: AbortSignal
) {
  const platform = meta.platform || 'youtube';
  
  // Prepare context for the prompt (sanitized)
  let contentTitle = 'N/A';
  let contentCreator = 'N/A';
  let platformSpecificContext = 'N/A';
  
  if (platform === 'youtube') {
    contentTitle = sanitizeString(meta.videoInfo?.title || 'N/A', 100);
    contentCreator = sanitizeString(meta.channelInfo?.channelTitle || 'N/A', 50);
    platformSpecificContext = sanitizeString(meta.platformContext || 'YouTube video', 100);
  } else if (platform === 'reddit') {
    contentTitle = sanitizeString(meta.threadInfo?.title || 'N/A', 100);
    contentCreator = sanitizeString(meta.threadInfo?.author || 'N/A', 50);
    platformSpecificContext = sanitizeString(meta.platformContext || 'Reddit discussion', 100);
  }

  // Limit comments for prompt to prevent prompt injection
  const limitedComments = comments.slice(0, 200);

  // Create a platform-specific prompt
  let prompt = '';
  
  if (platform === 'reddit') {
    prompt = `Analyze the sentiment of these Reddit comments for a thread titled "${contentTitle}" posted by u/${contentCreator} in ${platformSpecificContext}.

Reddit Comments to analyze:
${limitedComments.map((comment, index) => `${index + 1}. ${comment.slice(0, 200)}`).join('\n')}

Consider Reddit culture, upvote/downvote patterns, and community discussion dynamics in your analysis.

Respond ONLY with valid JSON. No markdown, no explanation, just JSON:

{
  "positive": <number 0-100>,
  "neutral": <number 0-100>, 
  "negative": <number 0-100>,
  "summary": "<professional 2-3 sentence summary considering Reddit community context>",
  "sampleComments": {
    "positive": ["<comment1>", "<comment2>", "<comment3>"],
    "neutral": ["<comment1>", "<comment2>", "<comment3>"],
    "negative": ["<comment1>", "<comment2>", "<comment3>"]
  }
}

Ensure percentages sum to 100.`;
  } else {
    prompt = `Analyze the sentiment of these YouTube comments for a video titled "${contentTitle}" from channel "${contentCreator}" in the ${platformSpecificContext} category.

Comments to analyze:
${limitedComments.map((comment, index) => `${index + 1}. ${comment.slice(0, 200)}`).join('\n')}

Respond ONLY with valid JSON. No markdown, no explanation, just JSON:

{
  "positive": <number 0-100>,
  "neutral": <number 0-100>, 
  "negative": <number 0-100>,
  "summary": "<professional 2-3 sentence summary>",
  "sampleComments": {
    "positive": ["<comment1>", "<comment2>", "<comment3>"],
    "neutral": ["<comment1>", "<comment2>", "<comment3>"],
    "negative": ["<comment1>", "<comment2>", "<comment3>"]
  }
}

Ensure percentages sum to 100.`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Sentiment-Analyzer/1.0',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis expert specializing in ${platform} content. Respond only with valid JSON as requested. Do not include any explanations or markdown formatting. Understand the cultural context and communication patterns specific to ${platform}.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1, // Lower temperature for more consistent results
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (response.status === 400) {
        throw new Error('OpenAI API bad request');
      } else {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Extract and validate JSON response
    let cleanJSON: string;
    try {
      cleanJSON = extractJSON(content);
    } catch {
      console.error('Failed to extract JSON from OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    let sentimentData;
    try {
      sentimentData = JSON.parse(cleanJSON);
    } catch {
      console.error('Failed to parse extracted JSON:', cleanJSON);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    if (
      typeof sentimentData.positive !== 'number' ||
      typeof sentimentData.neutral !== 'number' ||
      typeof sentimentData.negative !== 'number' ||
      typeof sentimentData.summary !== 'string' ||
      !sentimentData.sampleComments ||
      !Array.isArray(sentimentData.sampleComments.positive) ||
      !Array.isArray(sentimentData.sampleComments.neutral) ||
      !Array.isArray(sentimentData.sampleComments.negative)
    ) {
      throw new Error('Invalid response structure from AI');
    }

    // Sanitize and validate the response
    const sanitizedResponse = {
      positive: Math.max(0, Math.min(100, Math.round(sentimentData.positive))),
      neutral: Math.max(0, Math.min(100, Math.round(sentimentData.neutral))),
      negative: Math.max(0, Math.min(100, Math.round(sentimentData.negative))),
      summary: sanitizeString(sentimentData.summary, 2000),
      sampleComments: {
        positive: sentimentData.sampleComments.positive
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 300))
          .filter((comment: string) => comment.length > 0),
        neutral: sentimentData.sampleComments.neutral
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 300))
          .filter((comment: string) => comment.length > 0),
        negative: sentimentData.sampleComments.negative
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 300))
          .filter((comment: string) => comment.length > 0),
      }
    };

    // Ensure percentages sum to 100
    const total = sanitizedResponse.positive + sanitizedResponse.neutral + sanitizedResponse.negative;
    if (total !== 100) {
      const diff = 100 - total;
      sanitizedResponse.positive += diff; // Adjust positive to make it sum to 100
      sanitizedResponse.positive = Math.max(0, Math.min(100, sanitizedResponse.positive));
    }

    return sanitizedResponse;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}