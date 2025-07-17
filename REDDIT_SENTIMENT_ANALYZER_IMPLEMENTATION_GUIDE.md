# Reddit Sentiment Analyzer Implementation Guide

## Prompt for Cursor/Claude

(Just copy-paste this as your request, and paste your current code after it if possible!)

I want you to upgrade my Astro/TypeScript Reddit sentiment analyzer.

### What I have:
- My project is an Astro site with TypeScript modules.
- I have a sample JSON schema for Reddit thread sentiment analysis (see below).
- I have a reddit-sentiments.ts (or equivalent) file that exports a sample/static object, NOT real fetched/analyzed data.

### What I want you to do:
- Replace all hardcoded/sample values in my object with real Reddit data.
- Use the official Reddit API (or snoowrap/other Node wrappers if easier).
- Support both top-level and reply-chain comments—not just top-level.
- Scrape (at least) the first 100 comments (or as many as Reddit returns).
- Analyze the comments in a pipeline to generate:
  - Sentiment scores and confidence (positive, negative, neutral)
  - Themes, memes, sarcasm, controversy
  - Sample comments and statistics as in my schema
- Return the output in exactly the same JSON shape as my sample object below—no fields added or removed, just fill them dynamically.

Make it a TypeScript module that exports an async function:
```typescript
// reddit-sentiments.ts
export async function analyzeRedditThread(threadUrl: string): Promise<RedditSentimentResult>
```
`RedditSentimentResult` should be typed to match the schema below.

Keep the code compatible with Astro/TypeScript best practices.
Use fetch or Axios for HTTP, or a library like snoowrap (Node), but avoid any heavy frameworks that won't run on Vercel/Netlify.
Include proper error handling.
If using an API token, read it from environment variables.

### My current sample output schema (fill this with real analysis):
```typescript
export type RedditSentimentResult = { /* ...use your JSON schema here... */ };

// Example static export (replace this with dynamic logic):
export const sampleResult: RedditSentimentResult = { /* ... sample JSON ... */ };

// I want:
export async function analyzeRedditThread(threadUrl: string): Promise<RedditSentimentResult> {
  // TODO: fetch Reddit data, analyze, return populated result matching schema above
}
```

### Resources
- [Astro docs](https://docs.astro.build/)
- [Reddit API docs](https://www.reddit.com/dev/api/)
- [snoowrap (Node Reddit API wrapper)](https://github.com/not-an-aardvark/snoowrap)

### Target thread for testing:
https://www.reddit.com/r/pics/comments/1m0h9ze/trump_is_paving_the_white_house_rose_garden/

### Summary:
Upgrade my reddit-sentiments.ts from sample/static to real, live Reddit analysis.
Export an async function `analyzeRedditThread(threadUrl)` that fetches, analyzes, and returns the exact output schema shown.
Code must be Astro/TypeScript compatible, handle errors, and support at least 100 comments per thread.

## SCHEMA EXAMPLE (your output must be exactly this shape, all fields):

```typescript
export const redditSentimentAnalysis = {
  analyzed_count: 100,
  analyzed_sample_rate: 0.037, // 100 out of 2,716 total
  subreddit: "pics",
  thread_title: "Trump is paving the White House Rose Garden",
  thread_url: "https://www.reddit.com/r/pics/comments/1m0h9ze/trump_is_paving_the_white_house_rose_garden/",
  thread_post_author: "u/purplelynn",
  thread_post_time: "2024-07-15T21:00:00Z",
  analysis_timestamp: "2024-07-16T13:30:00Z",
  data_freshness: {
    last_reddit_fetch: "2024-07-16T13:30:00Z",
    time_since_thread_created: "PT16H30M",
    time_since_last_comment: "PT7M",
    freshness_warning: "Thread is still trending—sentiment may shift with more replies and news cycles."
  },
  sampling_quality: {
    total_comments_available: 2716,
    comments_analyzed: 100,
    sample_representativeness: "medium",
    sampling_method: "top_and_reply_chain_depths",
    sampling_warnings: [
      "100 comments represent 3.7% of all comments. Sentiment trends are accurate but may miss emerging sub-threads.",
      "Mix of top-level and replies to capture depth, but viral replies may skew controversy scores."
    ],
    confidence_interval: {
      positive: [8, 18],
      neutral: [10, 22],
      negative: [64, 80]
    }
  },
  language_analysis: {
    primary_language: "en",
    language_distribution: { "en": 97, "es": 2, "fr": 1 },
    non_english_comments: [
      { language: "es", comment: "Esto es una locura política.", sentiment: "negative" },
      { language: "fr", comment: "Encore des changements inutiles.", sentiment: "negative" }
    ],
    language_detection_confidence: 0.99,
    translation_notes: "3 non-English comments detected, all auto-translated for sentiment."
  },
  overall_sentiment: {
    positive: 15,
    neutral: 16,
    negative: 69,
    confidence: 0.95,
    explainability: "Sentiment overwhelmingly negative, focused on perceived destruction of tradition, political polarization, and sarcasm. Minority comments defend renovation or argue for nuance.",
    raw_distribution: { "-2": 49, "-1": 20, "0": 16, "1": 12, "2": 3 },
    sentiment_volatility: "high",
    volatility_reason: "Frequent sarcasm, reply-chain debates, and meme-driven shifts."
  },
  sentiment_by_depth: [
    { depth: 0, positive: 3, neutral: 7, negative: 30, comment_count: 40, note: "Top-level dominated by strong opinions, mostly negative or sarcastic." },
    { depth: 1, positive: 5, neutral: 4, negative: 12, comment_count: 21, note: "First replies include both debate and dogpiling." },
    { depth: 2, positive: 4, neutral: 2, negative: 13, comment_count: 19, note: "Second-level replies often devolve into arguments or meme exchanges." },
    { depth: 3, positive: 1, neutral: 2, negative: 6, comment_count: 9, note: "Deeper chains often off-topic or inside jokes." },
    { depth: 4, positive: 2, neutral: 1, negative: 5, comment_count: 8, note: "Rare but typically heated back-and-forth or clarification requests." },
    { depth: 5, positive: 0, neutral: 0, negative: 3, comment_count: 3, note: "Occasional thread derailments, mostly negative or snarky." }
  ],
  reply_chain_depth_breakdown: {
    max_depth_analyzed: 5,
    total_reply_chains: 20,
    depth_analysis_warning: "Beyond depth 5, comments were mostly off-topic.",
    depth_distribution: {
      depth_0: { comment_count: 40, positive: 3, neutral: 7, negative: 30 },
      depth_1: { comment_count: 21, positive: 5, neutral: 4, negative: 12 },
      depth_2: { comment_count: 19, positive: 4, neutral: 2, negative: 13 },
      depth_3: { comment_count: 9, positive: 1, neutral: 2, negative: 6 },
      depth_4: { comment_count: 8, positive: 2, neutral: 1, negative: 5 },
      depth_5: { comment_count: 3, positive: 0, neutral: 0, negative: 3 }
    },
    deep_chain_outliers: [
      { text: "It's a garden, not a historical artifact.", depth: 4, sentiment: "neutral", upvotes: 11 },
      { text: "All politicians do this, relax.", depth: 5, sentiment: "neutral", upvotes: 3 }
    ],
    reply_chain_sentiment_patterns: "Negative sentiment persists in deeper chains, though some pushback and meme content emerge after depth 3.",
    missing_context_impact: "Low beyond depth 5; main sentiment drivers captured in top 100."
  },
  sentiment_over_time: [
    { timestamp: "2024-07-15T22:00:00Z", positive: 2, neutral: 3, negative: 13, event_context: "Initial spike, mostly shock and criticism.", comment_count: 18, sentiment_shift: "immediate_negative" },
    { timestamp: "2024-07-16T04:00:00Z", positive: 3, neutral: 4, negative: 10, event_context: "First overnight wave—sarcasm and memes emerge.", comment_count: 17, sentiment_shift: "more_meme_activity" },
    { timestamp: "2024-07-16T09:00:00Z", positive: 6, neutral: 6, negative: 18, event_context: "US morning: debates, some defense, but still negative overall.", comment_count: 30, sentiment_shift: "minor_positive_rise" },
    { timestamp: "2024-07-16T13:00:00Z", positive: 4, neutral: 3, negative: 15, event_context: "Active replies, more balanced arguments, some neutrality.", comment_count: 20, sentiment_shift: "debate" }
  ],
  themes: [
    {
      theme: "Destruction of tradition",
      sentiment: "negative",
      share: 0.3,
      confidence: 0.97,
      top_keywords: ["ruin", "history", "bulldoze", "nothing sacred"],
      theme_volatility: "medium",
      community_specific_terms: ["bulldoze"],
      sample_comments: [
        { text: "Didn't Melania already bulldoze it once? Can't wait for the 'improvements'.", sentiment: "negative", confidence: 0.96, upvotes: 880, author: "u/historicalbuff", flagged_sarcasm: true, sarcasm_confidence: 0.94, explainability: "Recurring sarcasm about repeated changes.", permalink: "/r/pics/comments/1m0h9ze/comment/kx4y0dz/", comment_depth: 0, timestamp: "2024-07-15T22:11:00Z", controversial_score: 0.7, hidden_score: false }
      ],
      summary: "Widespread belief that changes disregard history.",
      actionable_recommendation: "Add expert factual links to thread."
    },
    {
      theme: "Political meme/sarcasm",
      sentiment: "negative",
      share: 0.18,
      confidence: 0.90,
      top_keywords: ["statue", "gold", "planting", "himself"],
      theme_volatility: "high",
      community_specific_terms: ["gold statue"],
      sample_comments: [
        { text: "Maybe he's planting a gold statue of himself.", sentiment: "negative", confidence: 0.91, upvotes: 470, author: "u/omgnotagain", flagged_sarcasm: true, sarcasm_confidence: 0.97, explainability: "Classic Trump meme format.", permalink: "/r/pics/comments/1m0h9ze/comment/kx4y3io/", comment_depth: 0, timestamp: "2024-07-15T22:19:00Z", controversial_score: 0.7, hidden_score: false }
      ],
      summary: "Sarcastic memes and jokes about Trump's ego are rampant.",
      actionable_recommendation: "Consider meme moderation if needed."
    },
    {
      theme: "Exhaustion with politics",
      sentiment: "neutral",
      share: 0.13,
      confidence: 0.85,
      top_keywords: ["every administration", "leave alone", "tired"],
      theme_volatility: "medium",
      community_specific_terms: ["leave something alone"],
      sample_comments: [
        { text: "Can we have just one administration that leaves something alone?", sentiment: "neutral", confidence: 0.83, upvotes: 540, author: "u/sighing_susan", flagged_sarcasm: true, sarcasm_confidence: 0.7, explainability: "Sarcastic plea for less meddling.", permalink: "/r/pics/comments/1m0h9ze/comment/kx4wzrq/", comment_depth: 0, timestamp: "2024-07-15T22:25:00Z", controversial_score: 0.4, hidden_score: false }
      ],
      summary: "Fatigue with constant changes, not just with Trump.",
      actionable_recommendation: "Highlight bipartisan renovation history."
    },
    {
      theme: "Defensive/contrarian takes",
      sentiment: "positive",
      share: 0.09,
      confidence: 0.71,
      top_keywords: ["update", "not everything bad", "needed"],
      theme_volatility: "high",
      sample_comments: [
        { text: "Honestly, the garden needed some updates. Not everything Trump does is bad.", sentiment: "positive", confidence: 0.69, upvotes: 110, author: "u/both_sides_bob", flagged_sarcasm: false, sarcasm_confidence: 0.1, explainability: "Minority, gets downvoted in sub-threads.", permalink: "/r/pics/comments/1m0h9ze/comment/kx4ytz8/", comment_depth: 0, timestamp: "2024-07-15T22:40:00Z", controversial_score: 0.6, hidden_score: false }
      ],
      summary: "Some pushback on the negativity.",
      actionable_recommendation: "Highlight balanced opinions to reduce echo chamber."
    }
    // ...other themes omitted for brevity, but you'd list about 8–10, including "Conspiracy", "Jokes about Melania", "International comparisons", "Garden facts", "Meta discussion", etc.
  ],
  sarcasm_flags: [
    // Sampled/flagged sarcastic comments (showing a few)
    { text: "Didn't Melania already bulldoze it once? Can't wait for the 'improvements'.", reason: "Quotes and word choice signal sarcasm.", confidence: 0.94, upvotes: 880, author: "u/historicalbuff", theme: "Destruction of tradition", permalink: "/r/pics/comments/1m0h9ze/comment/kx4y0dz/", actual_sentiment: "negative", sarcasm_indicators: ["bulldoze", "'improvements'"], community_calibration: "high" },
    { text: "Yeah, maybe he'll plant a giant T for Trump in tulips.", reason: "Absurd suggestion for comedic effect.", confidence: 0.91, upvotes: 95, author: "u/tulipbro", theme: "Political meme/sarcasm", permalink: "/r/pics/comments/1m0h9ze/comment/kx50tfz/", actual_sentiment: "negative", sarcasm_indicators: ["giant T", "Trump"], community_calibration: "medium" }
    // ...and so on
  ],
  meme_detection: [
    { text: "Maybe he's planting a gold statue of himself.", meme_format: "Trump statue meme", confidence: 0.95, upvotes: 470, author: "u/omgnotagain", permalink: "/r/pics/comments/1m0h9ze/comment/kx4y3io/", meme_indicators: ["gold statue", "Trump"], sentiment_impact: "amplifies negative context" },
    { text: "Next: AstroTurf everything gold.", meme_format: "Trump gold meme", confidence: 0.91, upvotes: 72, author: "u/banter", permalink: "/r/pics/comments/1m0h9ze/comment/kx50kgw/", meme_indicators: ["AstroTurf", "gold"], sentiment_impact: "sarcastic negative" }
  ],
  community_lingo: [
    { term: "bulldoze", frequency: 4, context: "sarcasm", subreddit_specificity: "medium", sentiment_association: "negative", explanation: "Reference to Melania Trump's previous garden changes." },
    { term: "leave something alone", frequency: 2, context: "exhaustion", subreddit_specificity: "medium", sentiment_association: "negative", explanation: "Exasperation with constant changes." },
    { term: "T for Trump", frequency: 1, context: "meme", subreddit_specificity: "low", sentiment_association: "neutral", explanation: "Running joke about branding everything." }
  ],
  top_positive_comments: [
    { text: "Honestly, the garden needed some updates. Not everything Trump does is bad.", upvotes: 110, author: "u/both_sides_bob", permalink: "/r/pics/comments/1m0h9ze/comment/kx4ytz8/", explainability: "Rare positive perspective.", confidence: 0.69, controversial_score: 0.6 }
    // ...others as needed
  ],
  top_negative_comments: [
    { text: "Didn't Melania already bulldoze it once? Can't wait for the 'improvements'.", upvotes: 880, author: "u/historicalbuff", permalink: "/r/pics/comments/1m0h9ze/comment/kx4y0dz/", explainability: "High upvotes, strongly negative, sarcastic.", confidence: 0.96, controversial_score: 0.7 },
    { text: "History means nothing to these people.", upvotes: 760, author: "u/fdrfan", permalink: "/r/pics/comments/1m0h9ze/comment/kx4x7vs/", explainability: "Directly negative.", confidence: 0.91, controversial_score: 0.5 }
    // ...add more, up to 10
  ],
  mod_actions_detected: [],
  drama_indicators: [
    { indicator: "high sarcasm ratio", severity: "high", affected_comments: 17, explanation: "Sarcasm and meme usage far exceed baseline." },
    { indicator: "contrarian dogpiling", severity: "medium", affected_comments: 4, explanation: "Positive or moderate comments get mass reply chains." }
  ],
  brigading_indicators: [
    { pattern: "sudden influx of new accounts", severity: "low", explanation: "Several users with 'new user' tags post strongly negative or positive comments." }
  ],
  controversial_comments: [
    { text: "All politicians do this, relax.", controversial_score: 0.8, upvotes: 6, author: "u/centrist37", permalink: "/r/pics/comments/1m0h9ze/comment/kx50mv8/", controversy_reason: "Unpopular, sparks argument chain." },
    { text: "Honestly, the garden needed some updates. Not everything Trump does is bad.", controversial_score: 0.6, upvotes: 110, author: "u/both_sides_bob", permalink: "/r/pics/comments/1m0h9ze/comment/kx4ytz8/", controversy_reason: "Pushback against thread majority." }
    // ...more as needed
  ],
  hidden_score_comments: [
    { text: "[removed]", reason: "User deleted comment after downvotes.", upvotes: 0, author: "u/[deleted]", permalink: "/r/pics/comments/1m0h9ze/comment/kx54gdb/", timestamp: "2024-07-16T08:51:00Z" }
    // ...as needed
  ],
  emerging_topics: [
    { topic: "garden history", sentiment: "negative", trend_direction: "up", confidence: 0.82, explanation: "Comments reference Melania's renovation and loss of tradition.", sample_comment: "Didn't Melania already bulldoze it once?", topic_volatility: "medium" },
    { topic: "international comparison", sentiment: "neutral", trend_direction: "steady", confidence: 0.79, explanation: "Some users compare US gardens to European counterparts.", sample_comment: "In France, they restore gardens instead of changing everything.", topic_volatility: "low" }
  ],
  risk_alerts: [
    { alert_type: "polarization", severity: "high", triggered_on: "2024-07-16T12:00:00Z", explanation: "Positive or moderate comments result in lengthy, negative reply chains.", suggested_action: "Proactive moderation in controversial threads.", confidence: 0.9 }
  ],
  user_feedback_stats: {
    total_feedback_received: 2,
    feedback_for_this_analysis: 2,
    disputed_outputs_percentage: 0.0,
    corrections_accepted_percentage: 0.0,
    moderator_acceptance_rate: 0.0,
    feedback_trends: {
      last_7_days: { total: 2, disputed: 0, accepted: 0 },
      last_30_days: { total: 2, disputed: 0, accepted: 0 },
      last_90_days: { total: 2, disputed: 0, accepted: 0 }
    },
    feedback_quality_score: "No disputes or corrections received.",
    user_satisfaction_trend: "No negative feedback recorded."
  },
  live_retrain_stats: {
    total_retrain_events: 1,
    last_retrain_date: "2024-07-16T10:00:00Z",
    recent_model_changes: ["Improved sarcasm detection for meme-heavy political threads."],
    feedback_incorporation_rate: 1.0,
    accuracy_improvements: {
      sarcasm_detection: { before: 0.9, after: 0.94, improvement: "+4%" },
      sentiment_accuracy: { before: 0.89, after: 0.95, improvement: "+6%" },
      community_lingo: { before: 0.82, after: 0.88, improvement: "+6%" }
    },
    pending_retrain_suggestions: 1,
    retrain_priority_queue: ["detect more political meme variants"]
  },
  privacy_warnings: [
    { warning_type: "public_data_only", severity: "low", description: "Analysis performed on public Reddit data only—no private data accessed.", compliance_status: "compliant" },
    { warning_type: "username_handling", severity: "low", description: "Usernames are public on Reddit, but user privacy is respected.", compliance_status: "compliant" },
    { warning_type: "data_retention", severity: "medium", description: "Analysis data may be stored to improve model accuracy. See privacy policy.", compliance_status: "requires_review" },
    { warning_type: "sensitive_content", severity: "low", description: "No sensitive personal data detected.", compliance_status: "compliant" }
  ],
  audit_log: [
    { comment_text: "Didn't Melania already bulldoze it once? Can't wait for the 'improvements'.", assigned_sentiment: "negative", confidence: 0.94, reasoning: "Sarcasm and negative sentiment.", user_flagged: false, was_sarcasm: true, sarcasm_confidence: 0.94, permalink: "/r/pics/comments/1m0h9ze/comment/kx4y0dz/", processing_timestamp: "2024-07-16T13:15:00Z", model_version: "gpt-4o-2024-07-16", feature_flags: ["sarcasm_detection", "community_lingo"] },
    { comment_text: "Honestly, the garden needed some updates. Not everything Trump does is bad.", assigned_sentiment: "positive", confidence: 0.69, reasoning: "Contrarian positive.", user_flagged: false, was_sarcasm: false, sarcasm_confidence: 0.1, permalink: "/r/pics/comments/1m0h9ze/comment/kx4ytz8/", processing_timestamp: "2024-07-16T13:16:00Z", model_version: "gpt-4o-2024-07-16", feature_flags: [] }
    // ...etc., up to 100
  ],
  user_feedback_url: "https://www.senti-meter.com/reddit-sentiment-analyzer/feedback/1m0h9ze",
  dispute_resolution: {
    dispute_url: "https://www.senti-meter.com/reddit-sentiment-analyzer/dispute/1m0h9ze",
    appeal_deadline: "2024-07-23T13:30:00Z",
    dispute_grounds: ["incorrect_sentiment", "missed_sarcasm", "false_positive", "data_quality"]
  },
  retrain_suggestions: [
    { suggestion: "Improve detection of memes as sarcasm.", priority: "high", affected_comments: 11, expected_improvement: "Increase sarcasm/meme accuracy by 15%" }
  ],
  last_model_update: "2024-07-16T10:00:00Z",
  model_performance: {
    sarcasm_detection_accuracy: 0.94,
    sentiment_confidence_avg: 0.95,
    community_lingo_recognition: 0.88
  },
  data_sources: ["reddit"],
  time_window: {
    start: "2024-07-15T21:00:00Z",
    end: "2024-07-16T13:30:00Z",
    analysis_duration: "PT16H30M"
  },
  quality_warnings: [
    "Sample covers 3.7% of total comments—trends highly reliable, but rare subthreads may be missed.",
    "Sentiment volatility due to meme/sarcasm density—interpret with nuance."
  ]
};
```

## Implementation Micro-Checklist

### 1. File & API Route Setup
- [ ] **Create file:** `src/pages/api/reddit-sentiment.ts`
- [ ] **Import Astro types:** `import type { APIRoute } from 'astro';`
- [ ] **Set up environment variable access** for Reddit API credentials and LLM API key (e.g., OpenAI/Claude).
- [ ] **Export main handler:** `export const POST: APIRoute = async ({ request }) => { ... }`
- [ ] **Add a schema_version constant or field** in all output.

### 2. Input Validation & Parsing
- [ ] **Parse JSON body** from the POST request.
- [ ] **Validate required fields:**
  - [ ] `redditUrl` (string, valid Reddit thread URL)
  - [ ] `maxComments` (number, default 100, max 100)
- [ ] **Return 400 error** if validation fails, with a clear error message.

### 3. Rate Limiting & Security
- [ ] **Implement rate limiting** (per-IP, 10 requests/minute).
- [ ] **Add CORS headers** (allow only your frontend origin in production).
- [ ] **Add security headers** (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
- [ ] **Log all errors** with enough context for debugging, but do not leak sensitive info in responses.
- [ ] **Mask usernames, IPs, or PII in logs** for privacy compliance.

### 4. Reddit URL & Thread Extraction
- [ ] **Validate Reddit URL** using regex for all supported formats (www, old, new).
- [ ] **Extract subreddit, thread ID, and slug** from the URL.
- [ ] **Return 400 error** if extraction fails.

### 5. Fetch Reddit Thread Metadata
- [ ] **Obtain Reddit OAuth2 access token** using client ID/secret.
- [ ] **Fetch thread JSON** from Reddit's OAuth API:
  - [ ] Endpoint: `https://oauth.reddit.com/r/{subreddit}/comments/{threadId}?limit=500&sort=top`
- [ ] **Handle errors:**
  - [ ] 404: Thread not found
  - [ ] 403: Private/restricted
  - [ ] 429: Rate limited
  - [ ] Timeout (30s max)
- [ ] **Extract thread metadata:**
  - [ ] Title
  - [ ] Subreddit
  - [ ] Author
  - [ ] Created UTC
  - [ ] Score
  - [ ] Number of comments
  - [ ] URL
  - [ ] Image/preview URL (if available)
- [ ] **Sanitize all metadata fields** (remove control chars, trim, limit length).

### 6. Fetch & Structure Comments
- [ ] **Recursively extract up to 100 comments** (including reply chains to at least depth 5).
- [ ] For each comment, extract:
  - [ ] Text (body)
  - [ ] Upvotes (score)
  - [ ] Author
  - [ ] Permalink
  - [ ] Depth (nesting level)
  - [ ] Timestamp (created_utc)
  - [ ] Parent ID
  - [ ] Removed/deleted status
- [ ] **Skip** comments that are `[deleted]`, `[removed]`, or empty.
- [ ] **Sanitize all comment fields** (remove control chars, trim, limit length).
- [ ] **Track total comments available** vs. comments analyzed (for sampling stats).

### 7. Prepare Data for LLM
- [ ] **Build a detailed prompt** for the LLM:
  - [ ] Include all thread metadata.
  - [ ] Include all extracted comments (up to 100, with all metadata).
  - [ ] Paste the full output schema (see below) in the prompt.
  - [ ] **LLM Instructions:**
    - [ ] "Return a single valid JSON object matching this schema. No markdown, no prose, no explanation."
    - [ ] "If you cannot fill a field due to missing data, output an empty array/object or a warning string, never hallucinate values."
    - [ ] "Populate the schema with sentiment analysis based on actual comments from the live thread, not with fabricated or random placeholder values."
    - [ ] "If any required data is missing, fill warnings/risk_alerts/data_freshness as appropriate."

### 8. Call LLM API
- [ ] **Check for LLM API key** in environment; return 500 if missing.
- [ ] **POST to LLM API** (e.g., OpenAI GPT-4o, Claude, etc.):
  - [ ] Use the prompt from above.
  - [ ] Set sensible `max_tokens` (e.g., 4000+).
  - [ ] Set `temperature` low (0.1–0.3) for consistency.
  - [ ] Set `top_p` (0.9).
  - [ ] Set a 30s timeout.
- [ ] **Handle LLM API errors:**
  - [ ] 401: Invalid API key
  - [ ] 429: Rate limited
  - [ ] 500: LLM error
  - [ ] Timeout
- [ ] **Extract the JSON object** from the LLM's response:
  - [ ] Remove markdown/code block wrappers if present.
  - [ ] Parse as JSON.
  - [ ] Return 500 if parsing fails, with a generic error.

### 9. Validate & Post-Process LLM Output
- [ ] **Check that all required schema fields are present** (even if empty).
- [ ] **Sanitize all string fields** (remove control chars, trim, limit length).
- [ ] **Add server-side timestamps** for analysis time, if not present.
- [ ] **Validate numeric ranges** (e.g., sentiment % sum to 100).
- [ ] **If any required data is missing, add warnings to output.**
- [ ] **Add a schema_version field** to output.

### 10. Respond to Client
- [ ] **Return the full JSON object** as the API response.
- [ ] **Set all appropriate headers** (CORS, security, content-type).
- [ ] **Return 200 on success, 4xx/5xx on error.**
- [ ] **Log the request/response** (with privacy in mind) for audit/debug.
- [ ] **Support an idempotency key** or replay-protection logic.

### 11. TypeScript Data Export
- [ ] **Return the output as a TypeScript export** (e.g., `export const redditSentimentAnalysis = {...};`).
- [ ] **Ensure all fields match the schema** and are production-usable.

### 12. Testing & QA
- [ ] **Test with real Reddit threads** (public, private, locked, deleted, high/low comment count).
- [ ] **Test with malformed/missing input.**
- [ ] **Test LLM output for schema compliance and transparency.**
- [ ] **Test rate limiting and error handling.**
- [ ] **Test CORS and security headers.**
- [ ] **Test for prompt injection or malicious input.**
- [ ] **Test for performance** (should respond in <30s).
- [ ] **Document all API error codes** and response shapes.
- [ ] **Document any known LLM limitations** and edge cases.

### 13. Documentation
- [ ] **Document the API route, input/output, and error codes.**
- [ ] **Document environment variables required.**
- [ ] **Document the schema and any LLM prompt details.**
- [ ] **Document known limitations and future TODOs.**
- [ ] **Document the output schema** with field-by-field descriptions.
- [ ] **Provide OpenAPI/Swagger docs** if this API will be public.

### 14. Future-Proofing & Extensibility
- [ ] **Design for easy schema updates** (import schema from a separate file).
- [ ] **Allow for LLM provider swapping** (OpenAI, Claude, local, etc.).
- [ ] **Allow for custom prompt tweaks** per deployment.
- [ ] **Add user feedback endpoints** for retraining.
- [ ] **Support other platforms** (Twitter, YouTube, etc.) in the future, but keep this file Reddit-only.

## Output Schema Reference

This schema must be included in your prompt, code, and docs.

```json
{
  "analyzed_count": 0,
  "analyzed_sample_rate": 0,
  "subreddit": "",
  "thread_title": "",
  "thread_url": "",
  "thread_post_author": "",
  "thread_post_time": "",
  "language_distribution": {},
  "overall_sentiment": {
    "positive": 0,
    "neutral": 0,
    "negative": 0,
    "confidence": 0,
    "explainability": "",
    "raw_distribution": {}
  },
  "sentiment_by_depth": [],
  "sentiment_over_time": [],
  "themes": [],
  "sarcasm_flags": [],
  "top_positive_comments": [],
  "top_negative_comments": [],
  "mod_actions_detected": [],
  "meme_format_flags": [],
  "emerging_topics": [],
  "risk_alerts": [],
  "audit_log": [],
  "user_feedback_url": "",
  "retrain_suggestion": "",
  "last_model_update": "",
  "data_sources": [],
  "time_window": { "start": "", "end": "" },
  "schema_version": "1.0.0"
}
```

## Absolute Completeness (Ultra-Nerd Level Edge Cases)

### Output Determinism
- [ ] **LLM response must be 100% valid JSON**—never include markdown/code fences, explanations, or commentary.
- [ ] **Explicitly strip any leading/trailing whitespace, BOM, or hidden chars** before JSON parsing.

### Timezone & Locale Handling
- [ ] **Normalize all times/timestamps to UTC** and ISO8601 format.
- [ ] **Always store/return subreddit names and authors** in their original casing (Reddit is case-insensitive, but display can matter).

### Handling API Rate Limits & Backoff
- [ ] **Implement exponential backoff** on Reddit API 429 responses.
- [ ] **Surface API backoff/retry events** in a debug log (not exposed to user).

### Non-English Comments
- [ ] **Always detect and include language stats**, and translate non-English comments for LLM input.
- [ ] **Flag and annotate any comments** where translation fails or confidence <95%.

### Data Sanity and Length
- [ ] **Truncate any user-generated text fields** (comment bodies, usernames, etc.) over a safe limit (e.g., 1,000 chars).
- [ ] **Escape all strings** for safe display/storage (e.g., no control characters).

### Schema & Versioning
- [ ] **Bump schema_version on any future schema change**, and require old/new compatibility tests.
- [ ] **Add a model_version field** to output indicating which LLM/engine was used.

### Error Transparency
- [ ] **If any LLM or API error occurs**, surface a sanitized, user-friendly error object in the response, and always include a success boolean in the JSON (true/false).
- [ ] **Add a warnings array at the top level** (if not already present) for any partial data, rate limits, or quality caveats.

### Privacy & Compliance
- [ ] **Never persist or log full Reddit usernames** unless required for audit; hash/mask as needed.
- [ ] **Document and enforce a data retention policy** for all logs and analysis results.

### Replay & Reproducibility
- [ ] **Support an internal "replay" mode** for the API (save input+output for any job for future QA or customer support).

### Testing
- [ ] **Automated tests for:**
  - [ ] Schema compliance on every response
  - [ ] All error cases (bad input, Reddit API down, LLM API fails)
  - [ ] Minimum code coverage (aim for 90%+)
  - [ ] Lint/prettier checks required before commit.

## Follow every step. No field, validation, or process is optional.

This is the non-negotiable standard for a production-ready, audit-friendly Reddit sentiment analyzer API. 