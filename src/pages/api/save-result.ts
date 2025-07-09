import { Redis } from '@upstash/redis';
import type { APIContext } from 'astro';

// Secure Redis configuration - only use environment variables
const redis = new Redis({
  url: import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

// Validate Redis configuration
if (!import.meta.env.KV_REST_API_URL || !import.meta.env.KV_REST_API_TOKEN) {
  console.error('Missing Redis configuration. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
}

export const POST = async ({ request }: APIContext) => {
  try {
    // Check Redis configuration
    if (!import.meta.env.KV_REST_API_URL || !import.meta.env.KV_REST_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const id = crypto.randomUUID();
    
    // Add metadata to the saved data (this is the enhancement)
    const enrichedData = {
      ...data,
      platform: data.platform || 'youtube',
      createdAt: new Date().toISOString(),
      version: '1.0'
    };
    
    // Set with 30-day expiration (2592000 seconds) - this is new
    await redis.set(id, enrichedData, { ex: 2592000 });
    
    // Return more information including the full share URL - this is enhanced
    return new Response(JSON.stringify({ 
      id,
      shareUrl: `${new URL(request.url).origin}/result/${id}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in POST /api/save-result:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET = async ({ url }: APIContext) => {
  try {
    // Check Redis configuration
    if (!import.meta.env.KV_REST_API_URL || !import.meta.env.KV_REST_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await redis.get(id);
    
    if (!result) {
      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(result), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in GET /api/save-result:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};