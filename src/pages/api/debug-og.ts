// src/pages/api/debug-og.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const searchParams = new URL(url).searchParams;
  const id = searchParams.get('id');
  const ogImageUrl = `${url.origin}/api/og-image?id=${id}`;
  
  // Test if the OG image is accessible
  try {
    const response = await fetch(ogImageUrl);
    const isAccessible = response.ok;
    const contentType = response.headers.get('content-type');
    const cacheControl = response.headers.get('cache-control');
    
    return new Response(JSON.stringify({
      id,
      ogImageUrl,
      isAccessible,
      status: response.status,
      contentType,
      cacheControl,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(response.headers.entries())
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      id,
      ogImageUrl,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};