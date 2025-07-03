# API Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory with the following:

```env
# YouTube Data API v3 Key
YOUTUBE_API_KEY=your_youtube_api_key_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the generated API key
6. Paste it in your `.env.local` file

## Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Go to the **API Keys** section
4. Click **Create new secret key**
5. Copy the generated API key
6. Paste it in your `.env.local` file

## API Endpoints

### Comments API
- **URL**: `/api/comments`
- **Method**: `POST`
- **Body**: `{ "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID" }`
- **Response**: `{ "comments": ["comment1", "comment2", ...] }`

### Sentiment Analysis API
- **URL**: `/api/sentiment`
- **Method**: `POST`
- **Body**: `{ "comments": ["comment1", "comment2", ...] }`
- **Response**: 
```json
{
  "positive": 45,
  "neutral": 30,
  "negative": 25,
  "summary": "Overall sentiment is mixed with a slight positive lean.",
  "sampleComments": {
    "positive": ["Great video!", "Love this content"],
    "neutral": ["Thanks for sharing", "Interesting"],
    "negative": ["Not my favorite", "Could be better"]
  }
}
```

## Supported YouTube URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

## Error Handling

The APIs handle various error cases:

### Comments API
- Invalid YouTube URLs
- Missing or invalid YouTube API key
- Video not found
- Comments disabled
- API quota exceeded

### Sentiment API
- Invalid or empty comments array
- Missing or invalid OpenAI API key
- OpenAI API rate limit exceeded
- OpenAI API access denied
- Invalid response from OpenAI

## Usage Flow

1. **Get Comments**: POST to `/api/comments` with YouTube URL
2. **Analyze Sentiment**: POST to `/api/sentiment` with the comments array
3. **Display Results**: Show sentiment percentages, summary, and sample comments 