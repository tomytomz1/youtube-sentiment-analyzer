# SEO Setup Documentation

## Meta Tags Implementation

The YouTube Sentiment Analyzer includes comprehensive SEO optimization with the following meta tags:

### Page Title
```html
<title>Free YouTube Sentiment Analyzer – Instantly Summarize Video Comments</title>
```

### Meta Description
```html
<meta name="description" content="Paste any YouTube video link and get an instant summary of comment sentiment: see if viewers love or hate a video in seconds. Free, no login needed.">
```

### Open Graph Tags (Facebook)
- `og:type` - website
- `og:url` - Canonical URL of the site
- `og:title` - Same as page title
- `og:description` - Same as meta description
- `og:image` - Custom SVG image for social sharing

### Twitter Card Tags
- `twitter:card` - summary_large_image
- `twitter:url` - Canonical URL
- `twitter:title` - Same as page title
- `twitter:description` - Same as meta description
- `twitter:image` - Same Open Graph image

### Additional SEO Tags
- `robots` - index, follow
- `author` - YouTube Sentiment Analyzer
- `keywords` - youtube, sentiment analysis, comment analysis, video sentiment, ai analysis, free tool
- `canonical` - Link to canonical URL

## Open Graph Image

### Location
- OG images are now served dynamically via `/api/og-image?id=...` for result pages.
- Logos use `/logo.svg`.

### Design Elements
- **Background**: Blue gradient matching the site design
- **Title**: "YouTube Sentiment Analyzer"
- **Subtitle**: "Instantly analyze video comment sentiment with AI"
- **Visual Elements**:
  - Sentiment bars (positive, neutral, negative)
  - YouTube icon representation
  - AI icon representation
- **Footer**: "Free • No Login Required • Powered by AI"

## URL Configuration

Update the `url` variable in `src/pages/index.astro` when deploying:

```javascript
const url = "https://your-domain.com"; // Replace with actual domain
```

## SEO Benefits

1. **Search Engine Optimization**: Proper title and description for Google rankings
2. **Social Media Sharing**: Rich previews on Facebook, Twitter, LinkedIn
3. **User Experience**: Clear, descriptive titles and descriptions
4. **Discoverability**: Relevant keywords for search engines
5. **Professional Appearance**: Custom Open Graph image for brand recognition

## Testing SEO

### Tools to Test:
1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **Google Rich Results Test**: https://search.google.com/test/rich-results
4. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

### What to Check:
- Title displays correctly
- Description appears properly
- Open Graph image loads and displays
- No missing meta tags warnings
- Proper canonical URL 