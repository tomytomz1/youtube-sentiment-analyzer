// src/pages/api/og-png.ts - Simple version for debugging
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    // Simple SVG response to test if endpoint works
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#3b82f6"/>
        <rect x="100" y="100" width="1000" height="430" rx="20" fill="white"/>
        <text x="600" y="300" text-anchor="middle" fill="#1f2937" font-family="Arial" font-size="48" font-weight="bold">
          OG Image Test Works!
        </text>
        <text x="600" y="400" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="24">
          Endpoint is responding correctly
        </text>
      </svg>
    `;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error in og-png:', error);
    
    // Return a simple error response
    return new Response('Error generating image', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
};