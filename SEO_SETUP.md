# SEO Setup Documentation

## Meta Tags Implementation

The YouTube Sentiment Analyzer includes comprehensive SEO optimization with the following meta tags:

### Page Title
```html
<title>Free YouTube Comment Analyzer - AI Sentiment Analysis Tool</title>
```

### Meta Description
```html
<meta name="description" content="Analyze YouTube comments instantly with AI. Get sentiment insights, viewer reactions, and engagement metrics for any video. Free, no signup required.">
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

1. **Search Engine Optimization**: Optimized title tags and meta descriptions for better Google rankings
2. **Social Media Sharing**: Rich previews on Facebook, Twitter, LinkedIn with custom OG images
3. **User Experience**: Clear, descriptive titles and descriptions with comprehensive FAQ
4. **Discoverability**: Relevant keywords targeting high-value search terms
5. **Professional Appearance**: Custom Open Graph image for brand recognition
6. **Internal Linking**: Breadcrumb navigation and cross-linking for better site structure
7. **Structured Data**: FAQ, HowTo, and WebApplication schema markup for rich snippets
8. **Content Depth**: Comprehensive FAQ (20+ questions) and detailed use cases
9. **Mobile Optimization**: Responsive design with proper alt tags for accessibility
10. **Site Architecture**: Clear navigation with breadcrumbs and related tools sections

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