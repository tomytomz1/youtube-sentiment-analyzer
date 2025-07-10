import type { APIRoute } from 'astro';

// Simple SVG-based OG image generation (no external dependencies)
export const GET: APIRoute = async ({ url, request }) => {
  console.log('OG Image API called:', url.toString());

  try {
    const searchParams = new URL(url).searchParams;
    const id = searchParams.get('id');

    // If no ID provided, return a default image
    if (!id) {
      console.log('No ID provided, returning default image');
      return createDefaultImage();
    }

    // Try to get data from Redis (with proper error handling)
    let resultData = null;
    try {
      // Import Redis here to avoid startup issues
      const { Redis } = await import('@upstash/redis');
      
      const redisUrl = import.meta.env.KV_REST_API_URL;
      const redisToken = import.meta.env.KV_REST_API_TOKEN;

      if (!redisUrl || !redisToken) {
        console.error('Redis configuration missing:', { 
          hasUrl: !!redisUrl, 
          hasToken: !!redisToken 
        });
        return createErrorImage('Configuration Error');
      }

      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      resultData = await redis.get(id);
      console.log('Redis fetch result:', { id, hasData: !!resultData });

    } catch (redisError) {
      console.error('Redis error:', redisError);
      return createErrorImage('Database Error');
    }

    if (!resultData) {
      console.log('No data found for ID:', id);
      return createErrorImage('Result Not Found');
    }

    // Extract data safely
    const sentiment = (resultData as any)?.sentimentData || {};
    const meta = (resultData as any)?.meta || resultData;
    
    const videoTitle = meta?.videoInfo?.title || (resultData as any)?.videoInfo?.title || 'YouTube Video';
    const channelTitle = meta?.channelInfo?.channelTitle || (resultData as any)?.channelInfo?.channelTitle || 'Unknown Channel';
    const summary = sentiment?.summary || 'AI-powered sentiment analysis results';
    const platform = (resultData as any)?.platform || 'youtube';

    const positive = Math.max(0, Math.min(100, sentiment.positive || 0));
    const neutral = Math.max(0, Math.min(100, sentiment.neutral || 0));
    const negative = Math.max(0, Math.min(100, sentiment.negative || 0));

    console.log('Creating image for:', { videoTitle, positive, neutral, negative });

    return createSentimentImage({
      title: videoTitle,
      channelTitle: channelTitle,
      positive,
      neutral,
      negative,
      summary,
      platform
    });

  } catch (error) {
    console.error('Critical error in OG image generation:', error);
    return createErrorImage('Server Error');
  }
};

// Create a sentiment analysis image
function createSentimentImage(data: {
  title: string;
  channelTitle: string;
  positive: number;
  neutral: number;
  negative: number;
  summary: string;
  platform: string;
}) {
  const { title, channelTitle, positive, neutral, negative, summary, platform } = data;
  
  // Escape XML characters
  const escapeXml = (text: string) => 
    text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

  // Truncate long text
  const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  const truncatedChannel = channelTitle.length > 30 ? channelTitle.substring(0, 27) + '...' : channelTitle;
  const truncatedSummary = summary.length > 120 ? summary.substring(0, 117) + '...' : summary;

  const platformName = platform === 'reddit' ? 'Reddit' : platform === 'twitter' ? 'X' : 'YouTube';
  const platformColor = platform === 'reddit' ? '#FF4500' : platform === 'twitter' ? '#000000' : '#FF0000';

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6"/>
        <stop offset="100%" style="stop-color:#1e40af"/>
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bg)"/>
    
    <!-- Main content area -->
    <rect x="60" y="60" width="1080" height="510" rx="20" fill="white" opacity="0.95"/>
    
    <!-- Platform badge -->
    <rect x="80" y="80" width="120" height="40" rx="20" fill="${platformColor}"/>
    <text x="140" y="105" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${platformName}</text>
    
    <!-- Title -->
    <text x="80" y="160" fill="#1f2937" font-family="Arial, sans-serif" font-size="32" font-weight="bold">${escapeXml(truncatedTitle)}</text>
    
    <!-- Channel -->
    <text x="80" y="190" fill="#6b7280" font-family="Arial, sans-serif" font-size="20">${escapeXml(truncatedChannel)}</text>
    
    <!-- Sentiment Analysis Title -->
    <text x="80" y="240" fill="#1f2937" font-family="Arial, sans-serif" font-size="24" font-weight="bold">Sentiment Analysis Results</text>
    
    <!-- Positive Bar -->
    <text x="80" y="290" fill="#059669" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${positive}%</text>
    <text x="80" y="315" fill="#059669" font-family="Arial, sans-serif" font-size="16" font-weight="bold">POSITIVE</text>
    <rect x="200" y="275" width="250" height="20" rx="10" fill="#d1fae5"/>
    <rect x="200" y="275" width="${(positive / 100) * 250}" height="20" rx="10" fill="#059669"/>
    
    <!-- Neutral Bar -->
    <text x="480" y="290" fill="#6b7280" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${neutral}%</text>
    <text x="480" y="315" fill="#6b7280" font-family="Arial, sans-serif" font-size="16" font-weight="bold">NEUTRAL</text>
    <rect x="600" y="275" width="250" height="20" rx="10" fill="#f3f4f6"/>
    <rect x="600" y="275" width="${(neutral / 100) * 250}" height="20" rx="10" fill="#6b7280"/>
    
    <!-- Negative Bar -->
    <text x="880" y="290" fill="#dc2626" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${negative}%</text>
    <text x="880" y="315" fill="#dc2626" font-family="Arial, sans-serif" font-size="16" font-weight="bold">NEGATIVE</text>
    <rect x="1000" y="275" width="120" height="20" rx="10" fill="#fee2e2"/>
    <rect x="1000" y="275" width="${(negative / 100) * 120}" height="20" rx="10" fill="#dc2626"/>
    
    <!-- Summary -->
    <rect x="80" y="340" width="1040" height="80" rx="10" fill="#f8fafc"/>
    <text x="100" y="370" fill="#374151" font-family="Arial, sans-serif" font-size="18">${escapeXml(truncatedSummary.substring(0, 60))}</text>
    ${truncatedSummary.length > 60 ? `<text x="100" y="395" fill="#374151" font-family="Arial, sans-serif" font-size="18">${escapeXml(truncatedSummary.substring(60))}</text>` : ''}
    
    <!-- Branding -->
    <text x="80" y="480" fill="#3b82f6" font-family="Arial, sans-serif" font-size="20" font-weight="bold">🔍 Senti-Meter</text>
    <text x="80" y="505" fill="#6b7280" font-family="Arial, sans-serif" font-size="16">AI-Powered Sentiment Analysis</text>
    
    <!-- Call to action -->
    <text x="1120" y="500" text-anchor="end" fill="#3b82f6" font-family="Arial, sans-serif" font-size="18" font-weight="bold">Try it free at www.senti-meter.com</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Create error image
function createErrorImage(message: string) {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="errorBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ef4444"/>
        <stop offset="100%" style="stop-color:#dc2626"/>
      </linearGradient>
    </defs>
    
    <rect width="100%" height="100%" fill="url(#errorBg)"/>
    
    <rect x="100" y="200" width="1000" height="230" rx="20" fill="white" opacity="0.95"/>
    
    <text x="600" y="280" text-anchor="middle" fill="#dc2626" font-family="Arial, sans-serif" font-size="48" font-weight="bold">⚠️ ${message}</text>
    <text x="600" y="320" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="24">Senti-Meter - YouTube Sentiment Analysis</text>
    <text x="600" y="380" text-anchor="middle" fill="#3b82f6" font-family="Arial, sans-serif" font-size="20">Visit www.senti-meter.com to try again</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Create default image
function createDefaultImage() {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="defaultBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6"/>
        <stop offset="100%" style="stop-color:#1e40af"/>
      </linearGradient>
    </defs>
    
    <rect width="100%" height="100%" fill="url(#defaultBg)"/>
    
    <rect x="100" y="150" width="1000" height="330" rx="20" fill="white" opacity="0.95"/>
    
    <text x="600" y="230" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif" font-size="48" font-weight="bold">🔍 Senti-Meter</text>
    <text x="600" y="280" text-anchor="middle" fill="#3b82f6" font-family="Arial, sans-serif" font-size="32" font-weight="bold">YouTube Sentiment Analyzer</text>
    <text x="600" y="330" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="24">Instantly analyze video comment sentiment with AI</text>
    <text x="600" y="380" text-anchor="middle" fill="#374151" font-family="Arial, sans-serif" font-size="20">Free • No Login Required • AI-Powered</text>
    <text x="600" y="430" text-anchor="middle" fill="#3b82f6" font-family="Arial, sans-serif" font-size="20">www.senti-meter.com</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}