// Voice Search Validation and Testing Data
// This file contains voice search queries and expected responses for testing

export const voiceSearchTestCases = [
  {
    query: "What is sentiment analysis?",
    expectedAnswer: "Sentiment analysis uses AI to determine if text is positive, negative, or neutral with 94.7% accuracy.",
    type: "definition",
    answerLength: 16, // word count
    naturalness: "high"
  },
  {
    query: "How do I analyze YouTube comments?",
    expectedAnswer: "Just paste any YouTube video URL and click analyze. Results appear in 10-30 seconds.",
    type: "instruction",
    answerLength: 14,
    naturalness: "high"
  },
  {
    query: "Is this tool free?",
    expectedAnswer: "Yes, completely free with no registration required and unlimited usage.",
    type: "confirmation",
    answerLength: 11,
    naturalness: "high"
  },
  {
    query: "How accurate is sentiment analysis?",
    expectedAnswer: "Our AI achieves 94.7% accuracy using OpenAI's GPT-4o model for human-level understanding.",
    type: "statistic",
    answerLength: 14,
    naturalness: "high"
  },
  {
    query: "How long does analysis take?",
    expectedAnswer: "Most analyses complete in 10-30 seconds depending on the number of comments.",
    type: "timing",
    answerLength: 13,
    naturalness: "high"
  }
];

export const voiceSearchKeywords = [
  // Question starters
  "What is",
  "How do I",
  "How does",
  "Can I",
  "Is it",
  "How long",
  "How accurate",
  "How many",
  "What does",
  "Why should",
  
  // Core terms
  "sentiment analysis",
  "YouTube comments",
  "Reddit analysis",
  "AI sentiment",
  "comment analyzer",
  "social media sentiment",
  "emotion detection",
  "opinion mining",
  
  // Action words
  "analyze",
  "check",
  "measure",
  "understand",
  "track",
  "monitor",
  "detect",
  "identify"
];

export const voiceSearchOptimizationMetrics = {
  answerLength: {
    optimal: "20-40 words",
    acceptable: "15-50 words",
    tooShort: "< 15 words",
    tooLong: "> 50 words"
  },
  responseTime: {
    optimal: "< 2 seconds",
    acceptable: "2-5 seconds",
    slow: "> 5 seconds"
  },
  naturalness: {
    criteria: [
      "Uses conversational language",
      "Starts with direct answer",
      "Includes specific numbers/statistics",
      "Avoids technical jargon",
      "Sounds natural when spoken"
    ]
  }
};

export const commonVoiceSearchPatterns = {
  // Local search patterns
  local: [
    "sentiment analysis near me",
    "YouTube comment analyzer tool",
    "free sentiment analysis tool",
    "best sentiment analysis software"
  ],
  
  // Comparison patterns
  comparison: [
    "sentiment analysis vs opinion mining",
    "YouTube vs Reddit sentiment analysis",
    "free vs paid sentiment tools",
    "AI vs keyword sentiment analysis"
  ],
  
  // How-to patterns
  howTo: [
    "how to analyze sentiment",
    "how to check YouTube comments",
    "how to understand audience reaction",
    "how to measure social media sentiment"
  ],
  
  // Problem-solving patterns
  problemSolving: [
    "why is sentiment analysis important",
    "what makes sentiment analysis accurate",
    "when to use sentiment analysis",
    "who needs sentiment analysis"
  ]
};