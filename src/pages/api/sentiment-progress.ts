import type { APIRoute } from 'astro';

// Store progress for each analysis session
const progressStore = new Map<string, { stage: string; progress: number; timestamp: number }>();

export const GET: APIRoute = async ({ request, url }) => {
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response('Missing sessionId parameter', { status: 400 });
  }

  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected","sessionId":"' + sessionId + '"}\n\n'));
      
      // Set up interval to check for progress updates
      const interval = setInterval(() => {
        const progress = progressStore.get(sessionId);
        
        if (progress) {
          const data = {
            type: 'progress',
            stage: progress.stage,
            progress: progress.progress,
            timestamp: progress.timestamp
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          
          // Clean up completed sessions
          if (progress.progress >= 100 || Date.now() - progress.timestamp > 120000) { // 2 minutes
            progressStore.delete(sessionId);
            controller.enqueue(encoder.encode('data: {"type":"complete"}\n\n'));
            clearInterval(interval);
            controller.close();
          }
        }
      }, 500); // Check every 500ms
      
      // Clean up on client disconnect
      request.signal?.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, stage, progress } = body;
    
    if (!sessionId || typeof stage !== 'string' || typeof progress !== 'number') {
      return new Response('Invalid progress data', { status: 400 });
    }
    
    // Store progress update
    progressStore.set(sessionId, {
      stage,
      progress: Math.max(0, Math.min(100, progress)),
      timestamp: Date.now()
    });
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response('Error updating progress', { status: 500 });
  }
}; 