import type { APIRoute } from 'astro';

interface SentimentMeta {
  analyzedCount?: number;
  totalComments?: number;
  mostLiked?: { text: string; likeCount: number };
  videoInfo?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
  };
  channelInfo?: {
    channelTitle?: string;
    channelDescription?: string;
    channelPublishedAt?: string;
    channelThumbnails?: any;
    channelCustomUrl?: string;
    channelTopics?: string[];
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      comments,
      analyzedCount,
      totalComments,
      mostLiked,
      videoInfo,
      channelInfo,
    }: { comments: string[] } & SentimentMeta = body;

    // Validate input
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid comments array provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = import.meta.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ---- Prepare context for summary style ----
    const channelNiche = detectChannelNiche(channelInfo);

    // Sentiment analysis
    const sentimentAnalysis = await analyzeSentiment(
      comments,
      apiKey,
      {
        videoInfo,
        channelInfo,
        channelNiche,
      }
    );

    // Pass through all meta fields
    const result = {
      ...sentimentAnalysis,
      ...(analyzedCount !== undefined && { analyzedCount }),
      ...(totalComments !== undefined && { totalComments }),
      ...(mostLiked !== undefined && { mostLiked }),
      ...(videoInfo !== undefined && { videoInfo }),
      ...(channelInfo !== undefined && { channelInfo }),
      ...(channelNiche !== undefined && { channelNiche }),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Helper: Extract JSON object from GPT output
 */
function extractJSON(str: string): string {
  const match = str.match(/{[\s\S]*}/);
  if (match) return match[0];
  throw new Error("No JSON object found in OpenAI response");
}

/**
 * Detects the niche/topic from channelInfo or videoInfo
 */
function detectChannelNiche(channelInfo?: SentimentMeta["channelInfo"]): string | undefined {
  if (!channelInfo) return undefined;
  if (Array.isArray(channelInfo.channelTopics) && channelInfo.channelTopics.length > 0) {
    // YouTube topic categories are full URLs, try to extract last part or keyword
    return channelInfo.channelTopics
      .map((topic: string) => {
        try {
          // E.g. http://www.youtube.com/topic/UC2R-7eYkD0GfjI_n9vIm_HA or http://en.wikipedia.org/wiki/Music
          return decodeURIComponent(topic.split('/').pop() ?? topic);
        } catch {
          return topic;
        }
      })
      .filter(Boolean)
      .join(', ');
  }
  // Fallback: try to infer from channel description
  if (channelInfo.channelDescription) {
    // crude guess: extract most common non-stopword noun/adjective
    // or just return first 10 words as a teaser
    return channelInfo.channelDescription.split(/\s+/).slice(0, 10).join(' ');
  }
  return undefined;
}

/**
 * Analyze sentiment using OpenAI GPT-4o with newsroom-level summary prompt
 */
async function analyzeSentiment(
  comments: string[],
  apiKey: string,
  meta: {
    videoInfo?: SentimentMeta["videoInfo"],
    channelInfo?: SentimentMeta["channelInfo"],
    channelNiche?: string,
  }
) {
  // Prepare context for the prompt
  const videoTitle = meta.videoInfo?.title || 'N/A';
  const channelTitle = meta.channelInfo?.channelTitle || 'N/A';
  const channelDesc = meta.channelInfo?.channelDescription || 'N/A';
  const channelNiche = meta.channelNiche || 'N/A';

  // Improved prompt for newsroom-quality summary
  const prompt = `
You are an expert media analyst for a leading news publication.

Analyze the sentiment of the following YouTube comments and provide a newsroom-quality, highly detailed summary of the overall sentiment. Your summary should be written in the objective, insightful, and context-aware style of a professional news outlet, referencing the video and channel context as appropriate.

Video Title: "${videoTitle}"
Channel Name: "${channelTitle}"
Channel Description: "${channelDesc}"
Channel Niche: "${channelNiche}"

Comments to analyze:
${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}

Respond ONLY with a valid JSON object. Do NOT use markdown, do NOT include code fencing, do NOT add any explanation or text—just output valid JSON.

Your JSON object must include:
1. "positive": percentage of positive comments (number)
2. "neutral": percentage of neutral comments (number)
3. "negative": percentage of negative comments (number)
4. "summary": a thorough, newsroom-quality, multi-sentence summary that contextualizes the sentiment in relation to the video's topic, channel style, and its audience (at least 3-4 sentences, news style, with details on trends, controversies, or engagement patterns if present). Use a professional, neutral tone and, if appropriate, separate paragraphs with double line breaks (\\n\\n).
5. "sampleComments": an object with arrays of 3-5 example comments for each sentiment:
   - "positive": array of positive comment examples
   - "neutral": array of neutral comment examples
   - "negative": array of negative comment examples

Make sure percentages add up to 100.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Respond only with valid JSON as requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let cleanJSON: string;
    try {
      cleanJSON = extractJSON(content);
    } catch (extractErr) {
      console.error("Failed to extract JSON from OpenAI response:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }

    let sentimentData;
    try {
      sentimentData = JSON.parse(cleanJSON);
    } catch (parseErr) {
      console.error("Failed to parse extracted JSON:", cleanJSON);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Validate the response structure
    if (
      typeof sentimentData.positive !== 'number' ||
      typeof sentimentData.neutral !== 'number' ||
      typeof sentimentData.negative !== 'number' ||
      typeof sentimentData.summary !== 'string' ||
      !sentimentData.sampleComments
    ) {
      throw new Error('Invalid response format from OpenAI');
    }

    return sentimentData;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}
