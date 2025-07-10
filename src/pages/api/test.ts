import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const startTime = Date.now();
  
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: import.meta.env.PROD ? 'production' : 'development',
    url: url.toString(),
    requestHeaders: {},
    environmentVariables: {
      hasYouTubeKey: !!import.meta.env.YOUTUBE_API_KEY,
      hasOpenAIKey: !!import.meta.env.OPENAI_API_KEY,
      hasRedisUrl: !!import.meta.env.KV_REST_API_URL,
      hasRedisToken: !!import.meta.env.KV_REST_API_TOKEN,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
    redisConnection: null as any,
    processingTime: 0
  };

  // Test Redis connection
  try {
    const { Redis } = await import('@upstash/redis');
    
    const redis = new Redis({
      url: import.meta.env.KV_REST_API_URL!,
      token: import.meta.env.KV_REST_API_TOKEN!,
    });

    // Test simple Redis operation
    const testKey = `test-${Date.now()}`;
    await redis.set(testKey, 'test-value', { ex: 60 });
    const testValue = await redis.get(testKey);
    await redis.del(testKey);

    testResults.redisConnection = {
      status: 'success',
      testKeySet: testValue === 'test-value'
    };
  } catch (error) {
    testResults.redisConnection = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  testResults.processingTime = Date.now() - startTime;

  return new Response(JSON.stringify(testResults, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};

// Test simple SVG generation
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { title = 'Test Title', positive = 60, neutral = 30, negative = 10 } = body;

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#3b82f6"/>
      <rect x="100" y="100" width="1000" height="430" rx="20" fill="white"/>
      <text x="600" y="200" text-anchor="middle" fill="#1f2937" font-family="Arial" font-size="32" font-weight="bold">TEST: ${title}</text>
      <text x="300" y="350" text-anchor="middle" fill="#059669" font-family="Arial" font-size="24">${positive}% Positive</text>
      <text x="600" y="350" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="24">${neutral}% Neutral</text>
      <text x="900" y="350" text-anchor="middle" fill="#dc2626" font-family="Arial" font-size="24">${negative}% Negative</text>
      <text x="600" y="450" text-anchor="middle" fill="#3b82f6" font-family="Arial" font-size="20">API Test Success ✅</text>
    </svg>`;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};