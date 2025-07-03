import type { APIRoute } from 'astro';

type CommentObj = { text: string, likeCount: number };

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
        JSON.stringify({ error: 'Could not extract video ID from URL. Please check the format and try again.' }),
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
        JSON.stringify({ error: 'YouTube API key not configured on server.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch up to 300 comments (with like counts)
    const allComments: CommentObj[] = await fetchYouTubeComments(videoId, apiKey, 300);

    if (!allComments.length) {
      return new Response(
        JSON.stringify({ error: 'No comments found for this video (comments may be disabled or unavailable).' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Randomly sample up to 300 for analysis
    let analyzedComments = allComments;
    if (allComments.length > 300) {
      analyzedComments = getRandomSample(allComments, 300);
    }

    // Find most liked comment
    const mostLikedComment = allComments.reduce(
      (max, curr) => (curr.likeCount > max.likeCount ? curr : max),
      allComments[0]
    );

    // Respond with: sampled comments (for sentiment), most liked, counts for UI
    return new Response(
      JSON.stringify({
        comments: analyzedComments.map(c => c.text),
        totalComments: allComments.length,
        analyzedCount: analyzedComments.length,
        mostLiked: mostLikedComment,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error fetching YouTube comments:', error?.message || error);

    let message = 'Internal server error';
    if (typeof error === 'object' && error?.message) {
      if (
        error.message.includes('quota') ||
        error.message.includes('API key')
      ) {
        message = 'YouTube API quota exceeded or invalid API key. Please try again later.';
      } else if (
        error.message.includes('not found') ||
        error.message.includes('disabled')
      ) {
        message = 'Video not found or comments are disabled.';
      }
    }

    return new Response(
      JSON.stringify({ error: message }),
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
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
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
 * Fetch comments (with likeCount) from YouTube Data API v3
 */
async function fetchYouTubeComments(
  videoId: string,
  apiKey: string,
  maxToFetch = 300
): Promise<CommentObj[]> {
  let comments: CommentObj[] = [];
  let nextPageToken = "";
  let fetched = 0;
  const maxPerPage = 100;

  while (fetched < maxToFetch) {
    let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=${maxPerPage}&order=relevance`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;
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
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const snippet = item.snippet?.topLevelComment?.snippet;
        if (snippet && snippet.textDisplay && typeof snippet.textDisplay === 'string') {
          const clean = snippet.textDisplay.trim();
          if (clean && !comments.some(c => c.text === clean)) {
            comments.push({
              text: clean,
              likeCount: snippet.likeCount || 0,
            });
          }
        }
      }
      fetched += data.items.length;
    }

    if (data.nextPageToken) {
      nextPageToken = data.nextPageToken;
    } else {
      break;
    }
  }

  return comments;
}

/**
 * Get a random sample of n elements from an array (Fisher–Yates shuffle)
 */
function getRandomSample<T>(arr: T[], n: number): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, n);
}
