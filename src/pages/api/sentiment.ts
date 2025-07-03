import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the request body
    const body = await request.json();
    const { comments } = body;

    // Validate input
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid comments array provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get OpenAI API key from environment variables
    const apiKey = import.meta.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Analyze sentiment using OpenAI
    const sentimentAnalysis = await analyzeSentiment(comments, apiKey);

    return new Response(
      JSON.stringify(sentimentAnalysis),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
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
 * Analyze sentiment using OpenAI GPT-4o
 */
async function analyzeSentiment(comments: string[], apiKey: string) {
  const prompt = `Please analyze the sentiment of these YouTube comments and provide a structured response.

Comments to analyze:
${comments.map((comment, index) => `${index + 1}. ${comment}`).join('\n')}

Please respond with a JSON object containing:
1. "positive": percentage of positive comments (number)
2. "neutral": percentage of neutral comments (number)  
3. "negative": percentage of negative comments (number)
4. "summary": a one-sentence summary of the overall sentiment
5. "sampleComments": an object with arrays of 3-5 example comments for each sentiment:
   - "positive": array of positive comment examples
   - "neutral": array of neutral comment examples
   - "negative": array of negative comment examples

Make sure percentages add up to 100. Only respond with valid JSON, no additional text.`;

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
        max_tokens: 1000,
        temperature: 0.3,
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

    // Parse the JSON response
    try {
      const sentimentData = JSON.parse(content);
      
      // Validate the response structure
      if (typeof sentimentData.positive !== 'number' || 
          typeof sentimentData.neutral !== 'number' || 
          typeof sentimentData.negative !== 'number' ||
          typeof sentimentData.summary !== 'string' ||
          !sentimentData.sampleComments) {
        throw new Error('Invalid response format from OpenAI');
      }

      return sentimentData;

    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}
