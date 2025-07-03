# YouTube Sentiment Analyzer

A free, privacy-focused web application that analyzes the sentiment of YouTube video comments using AI. Get instant insights into how viewers feel about any YouTube video.

## 🚀 Features

- **Instant Analysis**: Paste any YouTube URL and get sentiment results in seconds
- **Privacy First**: No data storage, no tracking, no personal information collected
- **AI-Powered**: Uses OpenAI's GPT-4o for accurate sentiment analysis
- **Sample Comments**: See examples of positive, neutral, and negative comments
- **Most Liked Comment**: Highlights the comment with the most likes
- **Free to Use**: No registration required, completely free

## 🛠️ Tech Stack

- **Frontend**: Astro + TypeScript + Tailwind CSS
- **Backend**: Astro API Routes
- **AI**: OpenAI GPT-4o
- **Data**: YouTube Data API v3
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- YouTube Data API v3 key
- OpenAI API key

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/youtube-sentiment-analyzer.git
   cd youtube-sentiment-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   YOUTUBE_API_KEY=your_youtube_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:4321`

## 🔧 API Setup

### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Add the API key to your `.env` file

### OpenAI API
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and add billing information
3. Generate an API key
4. Add the API key to your `.env` file

## 📁 Project Structure

```
youtube-sentiment-analyzer/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── comments.ts    # YouTube comments API
│   │   │   └── sentiment.ts   # Sentiment analysis API
│   │   ├── index.astro        # Main application page
│   │   └── privacy.astro      # Privacy policy page
│   ├── layouts/
│   │   └── Layout.astro       # Base layout component
│   └── styles/
│       └── global.css         # Global styles
├── public/                    # Static assets
├── astro.config.mjs          # Astro configuration
└── package.json              # Dependencies and scripts
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm run preview
```

## 🔒 Privacy & Security

- **No Data Storage**: We don't store any user data, URLs, or analysis results
- **No Tracking**: No cookies, analytics, or user tracking
- **Real-time Processing**: All analysis happens in real-time and is immediately discarded
- **API Security**: API keys are stored securely as environment variables

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you have any questions or issues, please contact us at [tomasbeltran2014@gmail.com](mailto:tomasbeltran2014@gmail.com).

---

**Note**: This tool is for educational and research purposes. Please respect YouTube's Terms of Service and use responsibly.
