import { Redis } from '@upstash/redis';
import type { APIContext } from 'astro';

// Explicit Redis configuration
const redis = new Redis({
  url: import.meta.env.UPSTASH_REDIS_REST_URL || 'https://optimum-jackass-51355.upstash.io',
  token: import.meta.env.UPSTASH_REDIS_REST_TOKEN || 'AcibAAIjcDE4MmY1YzdmN2E1OGM0NTZiYjJkNDBmYjFiMTZhMDE0YnAxMA',
});

export const POST = async ({ request }: APIContext) => {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    await redis.set(id, data);
    
    return new Response(JSON.stringify({ id }), { 
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