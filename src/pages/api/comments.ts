import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the request body
    const body = await request.json();
    const { youtubeUrl } = body;

    // Validate input
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube URL provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract video ID from various YouTube URL formats
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Could not extract video ID from URL' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get YouTube API key from environment variables
    const apiKey = import.meta.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch comments from YouTube Data API v3
    const comments = await fetchYouTubeComments(videoId, apiKey);

    return new Response(
      JSON.stringify({ comments }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // youtube.com/watch?v=VIDEO_ID&other_params
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch comments from YouTube Data API v3
 */
async function fetchYouTubeComments(videoId: string, apiKey: string): Promise<string[]> {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=100&order=relevance`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('YouTube API quota exceeded or invalid API key');
      } else if (response.status === 404) {
        throw new Error('Video not found or comments are disabled');
      } else {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();

    // Extract comment text from the response
    const comments: string[] = [];
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const commentText = item.snippet?.topLevelComment?.snippet?.textDisplay;
        if (commentText && typeof commentText === 'string') {
          comments.push(commentText);
        }
      }
    }

    return comments;

  } catch (error) {
    console.error('Error calling YouTube API:', error);
    throw error;
  }
}
