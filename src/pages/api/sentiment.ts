// Add this at the very top of the file
// @ts-ignore
// eslint-disable-next-line
declare module 'vader-sentiment';

import type { APIRoute } from 'astro';
import vader from 'vader-sentiment';

interface SentimentMeta {
  analyzedCount?: number;
  totalComments?: number;
  mostLiked?: { text: string; likeCount: number };
  mostUpvoted?: { text: string; score: number; sentiment?: string };
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
  mostUpvoted?: { text: string; score: number; sentiment?: string };
  videoInfo?: any;
  threadInfo?: any;
  channelInfo?: any;
  platform?: string;
}

// Add this at the top if using TypeScript and vader-sentiment has no types
// declare module 'vader-sentiment';

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

  // Remove upper bound for Reddit/VADER - allow longer comments for Reddit
  const validatedComments = comments
    .filter((comment): comment is string => typeof comment === 'string')
    .map(comment => sanitizeString(comment, 10000)) // Increased from 1000 to 10000 for Reddit comments
    .filter(comment => comment.length > 0 && comment.length <= 10000); // Increased filter limit too

  if (validatedComments.length === 0) {
    throw new Error('No valid comments found');
  }

  return validatedComments;
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

  // Preserve comments with metadata for threading context
  if (Array.isArray(meta.commentsWithMetadata)) {
    validated.commentsWithMetadata = meta.commentsWithMetadata.map((comment: any) => ({
      text: sanitizeString(comment.text || '', 10000),
      id: sanitizeString(comment.id || '', 50),
      parentId: sanitizeString(comment.parentId || '', 50),
      author: sanitizeString(comment.author || '', 50),
      score: Math.max(0, Number(comment.score) || 0),
      created: Number(comment.created) || 0,
      depth: Math.max(0, Math.min(10, Number(comment.depth) || 0))
    }));
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
      ...meta.mostUpvoted, // Preserve all original properties
      text: sanitizeString(meta.mostUpvoted.text || '', 10000), // Increased from 500 to 10000 for Reddit comments
      score: Math.max(0, Number(meta.mostUpvoted.score) || 0),
      sentiment: meta.mostUpvoted.sentiment || undefined
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
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
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

// Add progress tracking interface
interface ProgressCallback {
  (stage: string, progress: number): void;
}

// Add progress update function
async function updateProgress(sessionId: string, stage: string, progress: number) {
  if (!sessionId) return;
  
  try {
    await fetch('/api/sentiment-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, stage, progress })
    });
    console.log(`Progress: ${stage} - ${progress}%`);
  } catch (error) {
    console.error('Failed to update progress:', error);
  }
}

// Add progress updates to the main POST handler
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
    let body: SentimentRequest & { sessionId?: string };
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const sessionId = body.sessionId || '';
    console.log('Starting sentiment analysis with progress tracking...');
    await updateProgress(sessionId, 'Starting analysis...', 5);

    // Validate comments
    const validatedComments = validateComments(body.comments);
    console.log(`Progress: Validated ${validatedComments.length} comments`);
    await updateProgress(sessionId, 'Validating comments...', 10);

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
      commentsWithMetadata: body.commentsWithMetadata, // Add this to preserve full comment objects
    });
    console.log('Progress: Metadata validated');
    await updateProgress(sessionId, 'Processing metadata...', 15);

    // Detect platform context
    const platformContext = detectPlatformContext(validatedMeta);
    console.log('Progress: Platform context detected');
    await updateProgress(sessionId, 'Analyzing platform context...', 20);

    // Use OpenAI for all sentiment analysis to get detailed narrative paragraphs
    // (Previously Reddit used VADER, but user wants detailed analysis)
    
    // Validate API key
    const apiKey = import.meta.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here' || !apiKey.startsWith('sk-')) {
      console.error('OpenAI API key not configured properly');
      return createErrorResponse('OpenAI API key not configured', 500);
    }
    console.log('Progress: API key validated');
    await updateProgress(sessionId, 'Connecting to AI service...', 25);

    // Perform sentiment analysis with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased from 30s to 60s for complex threading analysis

    let sentimentAnalysis;
    try {
      await updateProgress(sessionId, 'Analyzing sentiment patterns...', 30);
      
      sentimentAnalysis = await analyzeSentiment(
        validatedComments,
        apiKey,
        {
          videoInfo: validatedMeta.videoInfo,
          threadInfo: validatedMeta.threadInfo,
          channelInfo: validatedMeta.channelInfo,
          platformContext,
          platform: validatedMeta.platform,
          commentsWithMetadata: validatedMeta.commentsWithMetadata, // Pass metadata
        },
        controller.signal,
        sessionId // Pass sessionId for progress updates
      );
      
      await updateProgress(sessionId, 'Processing results...', 85);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('First attempt timed out, trying with fewer comments...');
          // Retry with fewer comments if timeout occurred
          const reducedComments = validatedComments.slice(0, Math.min(100, validatedComments.length));
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 45000); // 45s for retry
          
          try {
            sentimentAnalysis = await analyzeSentiment(
              reducedComments,
              apiKey,
              {
                videoInfo: validatedMeta.videoInfo,
                threadInfo: validatedMeta.threadInfo,
                channelInfo: validatedMeta.channelInfo,
                platformContext,
                platform: validatedMeta.platform,
                commentsWithMetadata: validatedMeta.commentsWithMetadata,
              },
              retryController.signal
            );
            clearTimeout(retryTimeoutId);
            console.log(`Retry succeeded with ${reducedComments.length} comments`);
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            console.error('Retry also failed:', retryError);
            return createErrorResponse('Analysis timeout - please try again with a smaller thread', 504);
          }
        } else if (error.message.includes('rate limit')) {
          return createErrorResponse('OpenAI API rate limit exceeded', 429);
        } else if (error.message.includes('API key')) {
          return createErrorResponse('Invalid OpenAI API key', 500);
        } else if (error.message.includes('OpenAI')) {
          return createErrorResponse('OpenAI API error', 500);
        } else {
          console.error('Sentiment analysis error:', error);
          return createErrorResponse('Service temporarily unavailable', 500);
        }
      } else {
        console.error('Sentiment analysis error:', error);
        return createErrorResponse('Service temporarily unavailable', 500);
      }
    }
    clearTimeout(timeoutId);

    // Update most upvoted comment with sentiment if it's Reddit
    let finalSentimentAnalysis = sentimentAnalysis;
    if ((validatedMeta.platform || '').toLowerCase() === 'reddit' && validatedMeta.mostUpvoted?.text) {
      // Use VADER just for the most upvoted comment sentiment classification
      try {
        const mostUpvotedResult = vader.SentimentIntensityAnalyzer.polarity_scores(validatedMeta.mostUpvoted.text);
        let mostUpvotedSentiment = 'neutral';
        if (mostUpvotedResult.compound >= 0.05) {
          mostUpvotedSentiment = 'positive';
        } else if (mostUpvotedResult.compound <= -0.05) {
          mostUpvotedSentiment = 'negative';
        }
        
        finalSentimentAnalysis = {
          ...sentimentAnalysis,
          mostUpvoted: {
            ...validatedMeta.mostUpvoted,
            sentiment: mostUpvotedSentiment
          }
        };
      } catch (vaderError) {
        console.error('VADER error for most upvoted comment:', vaderError);
        // Continue without sentiment classification for most upvoted
      }
    }

    // Combine results with metadata
    const result = {
      ...finalSentimentAnalysis,
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
  console.log('DEBUG: Raw OpenAI response:', str);
  
  // Remove markdown code blocks if present
  let cleaned = str.replace(/```json\s*|\s*```/g, '');
  
  // Remove any text before the first { and after the last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    console.error('DEBUG: No valid JSON braces found in:', cleaned);
    throw new Error('No JSON object found in response');
  }
  
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  console.log('DEBUG: Extracted JSON:', cleaned);
  
  // Validate it's actually JSON
  try {
    const parsed = JSON.parse(cleaned);
    console.log('DEBUG: Successfully parsed JSON:', parsed);
    return cleaned;
  } catch (parseError) {
    console.error('DEBUG: JSON parse error:', parseError);
    console.error('DEBUG: Failed to parse:', cleaned);
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
    commentsWithMetadata?: any[], // Add metadata for threading context
  },
  signal?: AbortSignal,
  sessionId?: string // Add sessionId parameter
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

  // Limit comments for prompt to prevent prompt injection and reduce timeout issues
  const limitedComments = comments.slice(0, 150); // Reduced from 200 to 150 for better performance
  const commentsMetadata = meta.commentsWithMetadata || [];

  // Build comment lookup for parent context
  const commentLookup = new Map();
  commentsMetadata.forEach(comment => {
    if (comment.id) {
      commentLookup.set(comment.text, comment);
    }
  });

  // Create a platform-specific prompt
  let prompt = '';
  
  if (platform === 'reddit') {
    // Build threaded comment structure for Reddit
    let threadedComments = '';
    limitedComments.forEach((comment, index) => {
      const metadata = commentLookup.get(comment);
      if (metadata && metadata.parentId && metadata.depth > 0) {
        // Find parent comment
        const parentComment = commentsMetadata.find(c => c.id === metadata.parentId);
        if (parentComment) {
          const parentPreview = parentComment.text.length > 100 // Reduced from 150 to 100 chars
            ? parentComment.text.substring(0, 100) + '...' 
            : parentComment.text;
          threadedComments += `${index + 1}. [REPLY to: "${parentPreview}"] → ${comment}\n`;
        } else {
          threadedComments += `${index + 1}. [REPLY] → ${comment}\n`;
        }
      } else {
        threadedComments += `${index + 1}. [TOP-LEVEL] ${comment}\n`;
      }
    });

    prompt = `Analyze the sentiment of these Reddit comments for a thread titled "${contentTitle}" posted by u/${contentCreator} in ${platformSpecificContext}.

IMPORTANT: These comments include REPLIES with their parent context. A reply's sentiment depends heavily on what it's replying to:
- "Yeah, exactly!" is positive if replying to praise, negative if agreeing with criticism
- "I disagree" context matters - disagreeing with good vs bad points
- "That's ridiculous" could be defending or attacking depending on parent

Reddit Comments with Threading Context:
${threadedComments}

You are an expert in human psychology and communication patterns. Analyze these comments with deep understanding of:
- Sarcasm and irony
- Contextual meaning and subtext  
- How replies relate to their parent comments
- Social dynamics and implied criticism
- Emotional undertones beyond surface words

Classify each comment into these sophisticated sentiment categories:
- GENUINE_POSITIVE: Authentic support, enthusiasm, agreement
- SKEPTICAL: Doubt, questioning, "I'm not convinced"
- SARCASTIC: Irony, mocking, saying opposite of what they mean
- CRITICAL: Direct criticism, disagreement, calling out problems
- FRUSTRATED: Anger, annoyance, fed up with situation
- FEARFUL: Anxiety about consequences, worried about future
- CYNICAL: Pessimistic worldview, "nothing will change"
- RESIGNED: Accepting negative reality, giving up hope
- NEUTRAL: Pure information sharing, factual statements

Pay special attention to:
- Comments that sound positive but are actually sarcastic
- Replies that change meaning based on parent context
- Ironic statements that flip the narrative
- Contextual criticism disguised as questions
- How agreement/disagreement works in context

Respond ONLY with valid JSON:

{
  "genuinePositive": <number 0-100>,
  "skeptical": <number 0-100>,
  "sarcastic": <number 0-100>,
  "critical": <number 0-100>,
  "frustrated": <number 0-100>,
  "fearful": <number 0-100>,
  "cynical": <number 0-100>,
  "resigned": <number 0-100>,
  "neutral": <number 0-100>,
  "summary": "<detailed analysis explaining the real emotional landscape, key themes, sarcasm patterns, threading context, and genuine vs surface sentiment>",
  "sampleComments": {
    "genuinePositive": ["<comment1>", "<comment2>", "<comment3>"],
    "skeptical": ["<comment1>", "<comment2>", "<comment3>"],
    "sarcastic": ["<comment1>", "<comment2>", "<comment3>"],
    "critical": ["<comment1>", "<comment2>", "<comment3>"],
    "frustrated": ["<comment1>", "<comment2>", "<comment3>"],
    "fearful": ["<comment1>", "<comment2>", "<comment3>"],
    "cynical": ["<comment1>", "<comment2>", "<comment3>"],
    "resigned": ["<comment1>", "<comment2>", "<comment3>"],
    "neutral": ["<comment1>", "<comment2>", "<comment3>"]
  }
}

Ensure percentages sum to 100. Focus on REAL sentiment including threading context, not surface-level word analysis.`;
  } else {
    prompt = `Analyze the sentiment of these YouTube comments for a video titled "${contentTitle}" from channel "${contentCreator}" in the ${platformSpecificContext} category.

Comments to analyze:
${limitedComments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}

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
    console.log(`Making OpenAI API request for ${platform} with ${limitedComments.length} comments...`);
    await updateProgress(sessionId || '', 'Sending request to AI...', 40);
    
    const startTime = Date.now();
    
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

    const responseTime = Date.now() - startTime;
    console.log(`OpenAI API response received in ${responseTime}ms, status: ${response.status}`);
    await updateProgress(sessionId || '', 'AI analysis complete, processing...', 60);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (response.status === 400) {
        throw new Error('OpenAI API bad request');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    await updateProgress(sessionId || '', 'Parsing AI response...', 70);

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Extract and validate JSON response
    let cleanJSON: string;
    try {
      cleanJSON = extractJSON(content);
      await updateProgress(sessionId || '', 'Validating results...', 75);
    } catch (extractError) {
      console.error('Failed to extract JSON from OpenAI response. Error:', extractError);
      console.error('Full OpenAI response content:', content);
      throw new Error('Invalid response format from AI');
    }

    let sentimentData;
    try {
      sentimentData = JSON.parse(cleanJSON);
      await updateProgress(sessionId || '', 'Formatting results...', 80);
    } catch (parseError) {
      console.error('Failed to parse extracted JSON. Error:', parseError);
      console.error('Extracted JSON string:', cleanJSON);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    if (
      typeof sentimentData.genuinePositive !== 'number' ||
      typeof sentimentData.skeptical !== 'number' ||
      typeof sentimentData.sarcastic !== 'number' ||
      typeof sentimentData.critical !== 'number' ||
      typeof sentimentData.frustrated !== 'number' ||
      typeof sentimentData.fearful !== 'number' ||
      typeof sentimentData.cynical !== 'number' ||
      typeof sentimentData.resigned !== 'number' ||
      typeof sentimentData.neutral !== 'number' ||
      typeof sentimentData.summary !== 'string' ||
      !sentimentData.sampleComments ||
      !Array.isArray(sentimentData.sampleComments.genuinePositive) ||
      !Array.isArray(sentimentData.sampleComments.skeptical) ||
      !Array.isArray(sentimentData.sampleComments.sarcastic) ||
      !Array.isArray(sentimentData.sampleComments.critical) ||
      !Array.isArray(sentimentData.sampleComments.frustrated) ||
      !Array.isArray(sentimentData.sampleComments.fearful) ||
      !Array.isArray(sentimentData.sampleComments.cynical) ||
      !Array.isArray(sentimentData.sampleComments.resigned) ||
      !Array.isArray(sentimentData.sampleComments.neutral)
    ) {
      throw new Error('Invalid response structure from AI');
    }

    // Sanitize and validate the response
    const sanitizedResponse = {
      genuinePositive: Math.max(0, Math.min(100, Math.round(sentimentData.genuinePositive))),
      skeptical: Math.max(0, Math.min(100, Math.round(sentimentData.skeptical))),
      sarcastic: Math.max(0, Math.min(100, Math.round(sentimentData.sarcastic))),
      critical: Math.max(0, Math.min(100, Math.round(sentimentData.critical))),
      frustrated: Math.max(0, Math.min(100, Math.round(sentimentData.frustrated))),
      fearful: Math.max(0, Math.min(100, Math.round(sentimentData.fearful))),
      cynical: Math.max(0, Math.min(100, Math.round(sentimentData.cynical))),
      resigned: Math.max(0, Math.min(100, Math.round(sentimentData.resigned))),
      neutral: Math.max(0, Math.min(100, Math.round(sentimentData.neutral))),
      summary: sanitizeString(sentimentData.summary, 2000),
      sampleComments: {
        genuinePositive: sentimentData.sampleComments.genuinePositive
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        skeptical: sentimentData.sampleComments.skeptical
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        sarcastic: sentimentData.sampleComments.sarcastic
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        critical: sentimentData.sampleComments.critical
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        frustrated: sentimentData.sampleComments.frustrated
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        fearful: sentimentData.sampleComments.fearful
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        cynical: sentimentData.sampleComments.cynical
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        resigned: sentimentData.sampleComments.resigned
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
        neutral: sentimentData.sampleComments.neutral
          .slice(0, 5)
          .map((comment: any) => sanitizeString(comment, 2000))
          .filter((comment: string) => comment.length > 0),
      }
    };

    // Ensure percentages sum to 100
    const total = sanitizedResponse.genuinePositive + sanitizedResponse.skeptical + 
                  sanitizedResponse.sarcastic + sanitizedResponse.critical + 
                  sanitizedResponse.frustrated + sanitizedResponse.fearful + 
                  sanitizedResponse.cynical + sanitizedResponse.resigned + 
                  sanitizedResponse.neutral;
    if (total !== 100) {
      const diff = 100 - total;
      sanitizedResponse.genuinePositive += diff; // Adjust genuinePositive to make it sum to 100
      sanitizedResponse.genuinePositive = Math.max(0, Math.min(100, sanitizedResponse.genuinePositive));
    }

    return sanitizedResponse;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}