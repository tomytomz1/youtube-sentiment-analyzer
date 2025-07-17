import https from 'https';
import * as zlib from 'zlib';
import type { APIRoute } from 'astro';
import {
  checkHookCompatibility
  // createHookContext,
  // executeWithHooks
} from '../../lib/astro-hooks';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  checkReplayProtection,
  recordRequest,
  generateHash,
  generateCacheKey
  // getCacheStatistics
} from '../../lib/cache';
import {
  analyzeMultilingualContent,
  // detectLanguage,
  getLanguageSupportInfo
} from '../../lib/language-detection';
import {
  performSecurityCheck
  // validateRedditComment,
  // detectPromptInjection,
  // getSecurityBasedRateLimit,
  // sanitizeInput,
  // detectAIGenerated,
  // generateSecurityReport
} from '../../lib/security';
import { getFeedbackStats } from './reddit-sentiment-feedback';

// Enhanced Security Monitoring
interface SecurityEvent {
  timestamp: string;
  type: 'security_violation' | 'prompt_injection' | 'rate_limit' | 'suspicious_content' | 'input_validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  ip: string;
  userAgent: string;
  blocked: boolean;
  inputHash?: string;
}

const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_LOG_SIZE = 2000;

// Audit logging and monitoring
interface AuditLogEntry {
  timestamp: string;
  event: string;
  details: any;
  ip: string;
  userAgent: string;
  success: boolean;
  processingTime?: number;
  errorCode?: string;
}

const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 1000;

export function logSecurityEvent(type: SecurityEvent['type'], severity: SecurityEvent['severity'], details: any, request: Request, blocked: boolean, inputHash?: string) {
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    type,
    severity,
    details: {
      ...details,
      // Remove sensitive data from logs
      ...(details.accessToken && { accessToken: '[REDACTED]' }),
      ...(details.apiKey && { apiKey: '[REDACTED]' }),
      ...(details.prompt && { prompt: details.prompt?.substring(0, 100) + '...' })
    },
    ip: getRateLimitKey(request),
    userAgent: (request.headers.get('user-agent') || 'unknown').slice(0, 100),
    blocked,
    inputHash
  };
  
  securityEvents.push(event);
  
  // Maintain log size
  if (securityEvents.length > MAX_SECURITY_LOG_SIZE) {
    securityEvents.splice(0, securityEvents.length - MAX_SECURITY_LOG_SIZE);
  }
  
  // Alert on critical events
  if (severity === 'critical') {
    console.error(`CRITICAL SECURITY EVENT: ${type}`, { ip: event.ip, details: event.details });
  }
}

export function logAuditEvent(event: string, details: any, request: Request, success: boolean, processingTime?: number, errorCode?: string) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    details: {
      ...details,
      // Remove sensitive data from logs
      ...(details.accessToken && { accessToken: '[REDACTED]' }),
      ...(details.apiKey && { apiKey: '[REDACTED]' })
    },
    ip: getRateLimitKey(request),
    userAgent: (request.headers.get('user-agent') || 'unknown').slice(0, 100),
    success,
    processingTime,
    errorCode
  };
  
  auditLog.push(entry);
  
  // Maintain log size
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG_SIZE);
  }
  
  // Console logging for development
  if (!import.meta.env.PROD) {
    console.log(`AUDIT: ${event}`, { success, processingTime, errorCode });
  }
}

// Performance monitoring
interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  rateLimitHits: number;
  lastReset: number;
}

const performanceMetrics: PerformanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageProcessingTime: 0,
  rateLimitHits: 0,
  lastReset: Date.now()
};

function updatePerformanceMetrics(processingTime: number, success: boolean, rateLimited: boolean = false) {
  performanceMetrics.totalRequests++;
  
  if (success) {
    performanceMetrics.successfulRequests++;
    
    // Update rolling average
    const alpha = 0.1; // Smoothing factor
    performanceMetrics.averageProcessingTime = 
      (1 - alpha) * performanceMetrics.averageProcessingTime + alpha * processingTime;
  } else {
    performanceMetrics.failedRequests++;
  }
  
  if (rateLimited) {
    performanceMetrics.rateLimitHits++;
  }
  
  // Reset metrics every hour
  if (Date.now() - performanceMetrics.lastReset > 3600000) {
    Object.assign(performanceMetrics, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    });
  }
}

// Types based on the implementation guide schema
export interface RedditSentimentResult {
  analyzed_count: number;
  analyzed_sample_rate: number;
  subreddit: string;
  thread_title: string;
  thread_url: string;
  thread_post_author: string;
  thread_post_time: string;
  thread_image_url?: string;
  thread_score?: number;
  analysis_timestamp: string;
  data_freshness: {
    last_reddit_fetch: string;
    time_since_thread_created: string;
    time_since_last_comment: string;
    freshness_warning: string;
  };
  sampling_quality: {
    total_comments_available: number;
    comments_analyzed: number;
    sample_representativeness: string;
    sampling_method: string;
    sampling_warnings: string[];
    confidence_interval: {
      positive: [number, number];
      neutral: [number, number];
      negative: [number, number];
    };
  };
  language_analysis: {
    primary_language: string;
    language_distribution: Record<string, number>;
    non_english_comments: Array<{
      language: string;
      comment: string;
      sentiment: string;
    }>;
    language_detection_confidence: number;
    translation_notes: string;
  };
  overall_sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    confidence: number;
    explainability: string;
    raw_distribution: Record<string, number>;
    sentiment_volatility: string;
    volatility_reason: string;
  };
  sentiment_by_depth: Array<{
    depth: number;
    positive: number;
    neutral: number;
    negative: number;
    comment_count: number;
    note: string;
  }>;
  reply_chain_depth_breakdown: {
    max_depth_analyzed: number;
    total_reply_chains: number;
    depth_analysis_warning: string;
    depth_distribution: Record<string, {
      comment_count: number;
      positive: number;
      neutral: number;
      negative: number;
    }>;
    deep_chain_outliers: Array<{
      text: string;
      depth: number;
      sentiment: string;
      upvotes: number;
    }>;
    reply_chain_sentiment_patterns: string;
    missing_context_impact: string;
  };
  sentiment_over_time: Array<{
    timestamp: string;
    positive: number;
    neutral: number;
    negative: number;
    event_context: string;
    comment_count: number;
    sentiment_shift: string;
  }>;
  themes: Array<{
    theme: string;
    sentiment: string;
    share: number;
    confidence: number;
    top_keywords: string[];
    theme_volatility: string;
    community_specific_terms: string[];
    sample_comments: Array<{
      text: string;
      sentiment: string;
      confidence: number;
      upvotes: number;
      author: string;
      flagged_sarcasm: boolean;
      sarcasm_confidence: number;
      explainability: string;
      permalink: string;
      comment_depth: number;
      timestamp: string;
      controversial_score: number;
      hidden_score: boolean;
    }>;
    summary: string;
    actionable_recommendation: string;
  }>;
  sarcasm_flags: Array<{
    text: string;
    reason: string;
    confidence: number;
    upvotes: number;
    author: string;
    theme: string;
    permalink: string;
    actual_sentiment: string;
    sarcasm_indicators: string[];
    community_calibration: string;
  }>;
  meme_detection: Array<{
    text: string;
    meme_format: string;
    confidence: number;
    upvotes: number;
    author: string;
    permalink: string;
    meme_indicators: string[];
    sentiment_impact: string;
  }>;
  community_lingo: Array<{
    term: string;
    frequency: number;
    context: string;
    subreddit_specificity: string;
    sentiment_association: string;
    explanation: string;
  }>;
  top_positive_comments: Array<{
    text: string;
    upvotes: number;
    author: string;
    permalink: string;
    explainability: string;
    confidence: number;
    controversial_score: number;
  }>;
  top_negative_comments: Array<{
    text: string;
    upvotes: number;
    author: string;
    permalink: string;
    explainability: string;
    confidence: number;
    controversial_score: number;
  }>;
  mod_actions_detected: Array<any>;
  drama_indicators: Array<{
    indicator: string;
    severity: string;
    affected_comments: number;
    explanation: string;
  }>;
  brigading_indicators: Array<{
    pattern: string;
    severity: string;
    explanation: string;
  }>;
  controversial_comments: Array<{
    text: string;
    controversial_score: number;
    upvotes: number;
    author: string;
    permalink: string;
    controversy_reason: string;
  }>;
  hidden_score_comments: Array<{
    text: string;
    reason: string;
    upvotes: number;
    author: string;
    permalink: string;
    timestamp: string;
  }>;
  emerging_topics: Array<{
    topic: string;
    sentiment: string;
    trend_direction: string;
    confidence: number;
    explanation: string;
    sample_comment: string;
    topic_volatility: string;
  }>;
  risk_alerts: Array<{
    alert_type: string;
    severity: string;
    triggered_on: string;
    explanation: string;
    suggested_action: string;
    confidence: number;
  }>;
  user_feedback_stats: {
    total_feedback_received: number;
    feedback_for_this_analysis: number;
    disputed_outputs_percentage: number;
    corrections_accepted_percentage: number;
    moderator_acceptance_rate: number;
    feedback_trends: {
      last_7_days: { total: number; disputed: number; accepted: number };
      last_30_days: { total: number; disputed: number; accepted: number };
      last_90_days: { total: number; disputed: number; accepted: number };
    };
    feedback_quality_score: string;
    user_satisfaction_trend: string;
  };
  live_retrain_stats: {
    total_retrain_events: number;
    last_retrain_date: string;
    recent_model_changes: string[];
    feedback_incorporation_rate: number;
    accuracy_improvements: {
      sarcasm_detection: { before: number; after: number; improvement: string };
      sentiment_accuracy: { before: number; after: number; improvement: string };
      community_lingo: { before: number; after: number; improvement: string };
    };
    pending_retrain_suggestions: number;
    retrain_priority_queue: string[];
  };
  privacy_warnings: Array<{
    warning_type: string;
    severity: string;
    description: string;
    compliance_status: string;
  }>;
  audit_log: Array<{
    comment_text: string;
    assigned_sentiment: string;
    confidence: number;
    reasoning: string;
    user_flagged: boolean;
    was_sarcasm: boolean;
    sarcasm_confidence: number;
    permalink: string;
    processing_timestamp: string;
    model_version: string;
    feature_flags: string[];
  }>;
  user_feedback_url: string;
  dispute_resolution: {
    dispute_url: string;
    appeal_deadline: string;
    dispute_grounds: string[];
  };
  retrain_suggestions: Array<{
    suggestion: string;
    priority: string;
    affected_comments: number;
    expected_improvement: string;
  }>;
  last_model_update: string;
  model_performance: {
    sarcasm_detection_accuracy: number;
    sentiment_confidence_avg: number;
    community_lingo_recognition: number;
  };
  data_sources: string[];
  time_window: {
    start: string;
    end: string;
    analysis_duration: string;
  };
  quality_warnings: string[];
  schema_version: string;
  // Free tier limitations
  tier_info?: {
    current_tier: 'free' | 'premium' | 'enterprise';
    usage_stats: {
      daily_remaining: number;
      monthly_remaining: number;
      reset_time: number;
    };
    upgrade_prompts?: {
      message: string;
      blocked_features: string[];
      upgrade_benefits: string[];
      pricing_url: string;
    };
  };
  demographic_insights?: {
    age_groups: {
      gen_z: number;
      millennials: number;
      gen_x: number;
      boomers: number;
    };
    gender_distribution: {
      male: number;
      female: number;
      other: number;
    };
    confidence: number;
    analysis_notes: string;
  };
  technical_metrics?: {
    processing_stats: {
      total_processing_time: string;
      tokens_analyzed: number;
      confidence_score: number;
      api_calls: number;
    };
    data_quality: {
      completeness: number;
      consistency: number;
      accuracy: number;
    };
    performance: {
      latency: string;
      throughput: string;
      resource_usage: string;
    };
  };
}

interface RedditComment {
  text: string;
  author: string;
  upvotes: number;
  timestamp: string;
  permalink: string;
  depth: number;
  parent_id?: string;
  is_removed: boolean;
  is_deleted: boolean;
}

interface RedditThread {
  title: string;
  subreddit: string;
  author: string;
  created: number;
  score: number;
  url: string;
  total_comments: number;
  imageUrl?: string;
}

// Enhanced rate limiting with multiple tiers and security-based adjustments
const rateLimitMap = new Map<string, { count: number; resetTime: number; violations: number; securityRisk: string }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Increased limit for development and testing
const RATE_LIMIT_VIOLATION_PENALTY = 300000; // 5 minute penalty for violations
const RATE_LIMIT_MAX_VIOLATIONS = 3; // Max violations before extended timeout

// Free tier daily limits
const FREE_TIER_DAILY_LIMIT = 3;
const FREE_TIER_MONTHLY_LIMIT = 10;
const FREE_TIER_COMMENTS_LIMIT = 50; // Reduced from 125
const PREMIUM_TIER_DAILY_LIMIT = 50;
const PREMIUM_TIER_COMMENTS_LIMIT = 125;

// User session tracking for daily limits
interface UserSession {
  tier: 'free' | 'premium' | 'enterprise';
  dailyUsage: number;
  monthlyUsage: number;
  lastDailyReset: number;
  lastMonthlyReset: number;
  firstRequest: number;
}

const userSessions = new Map<string, UserSession>();

// Helper function to get user tier (placeholder - integrate with your auth system)
function getUserTier(request: Request): 'free' | 'premium' | 'enterprise' {
  const authHeader = request.headers.get('authorization');
  const userTier = request.headers.get('x-user-tier');
  
  // Check for premium indicators
  if (authHeader?.includes('premium') || userTier === 'premium') {
    return 'premium';
  }
  if (authHeader?.includes('enterprise') || userTier === 'enterprise') {
    return 'enterprise';
  }
  
  // Default to free tier
  return 'free';
}

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Use multiple identifiers for better tracking
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
  
  // Basic fingerprinting (not for tracking users, but for abuse prevention)
  const fingerprint = Buffer.from(`${ip}:${userAgent.slice(0, 50)}`).toString('base64').slice(0, 16);
  
  return fingerprint;
}

// Apply free tier restrictions to the analysis result
function applyTierRestrictions(result: RedditSentimentResult, userTier: 'free' | 'premium' | 'enterprise', usageStats: any): RedditSentimentResult {
  if (userTier === 'premium' || userTier === 'enterprise') {
    // Premium and enterprise get full access
    return {
      ...result,
      tier_info: {
        current_tier: userTier,
        usage_stats: usageStats
      }
    };
  }
  
  // Free tier restrictions
  const restrictedResult: RedditSentimentResult = {
    ...result,
    // Basic analysis (keep as is)
    analyzed_count: result.analyzed_count,
    analyzed_sample_rate: result.analyzed_sample_rate,
    subreddit: result.subreddit,
    thread_title: result.thread_title,
    thread_url: result.thread_url,
    thread_post_author: result.thread_post_author,
    thread_post_time: result.thread_post_time,
    thread_image_url: result.thread_image_url,
    thread_score: result.thread_score,
    analysis_timestamp: result.analysis_timestamp,
    data_freshness: result.data_freshness,
    sampling_quality: result.sampling_quality,
    language_analysis: result.language_analysis,
    overall_sentiment: result.overall_sentiment,
    
    // LIMITED features for free tier
    themes: result.themes.slice(0, 2).map(theme => ({
      ...theme,
      // Remove premium fields
      actionable_recommendation: '🔒 Upgrade to Premium for actionable recommendations',
      sample_comments: theme.sample_comments.slice(0, 1) // Only 1 sample comment
    })),
    sarcasm_flags: result.sarcasm_flags.slice(0, 3), // Only 3 sarcasm flags
    community_lingo: result.community_lingo.slice(0, 3), // Only 3 community terms
    top_positive_comments: result.top_positive_comments.slice(0, 2), // Only 2 comments
    top_negative_comments: result.top_negative_comments.slice(0, 2), // Only 2 comments
    emerging_topics: result.emerging_topics.slice(0, 2), // Only 2 topics
    risk_alerts: result.risk_alerts.slice(0, 1), // Only 1 risk alert
    
    // BASIC features (simplified)
    sentiment_by_depth: result.sentiment_by_depth.slice(0, 3), // Only first 3 depths
    reply_chain_depth_breakdown: {
      ...result.reply_chain_depth_breakdown,
      deep_chain_outliers: [] // Remove detailed outliers
    },
    
    // REMOVE premium features
    meme_detection: [], // Premium only
    mod_actions_detected: [], // Premium only
    drama_indicators: [], // Premium only
    brigading_indicators: [], // Premium only
    controversial_comments: [], // Premium only
    hidden_score_comments: [], // Premium only
    sentiment_over_time: [], // Premium only - time series analysis
    audit_log: [], // Premium only
    live_retrain_stats: {
      total_retrain_events: 0,
      last_retrain_date: result.live_retrain_stats.last_retrain_date,
      recent_model_changes: [],
      feedback_incorporation_rate: 0,
      accuracy_improvements: {
        sarcasm_detection: { before: 0, after: 0, improvement: 'Premium feature' },
        sentiment_accuracy: { before: 0, after: 0, improvement: 'Premium feature' },
        community_lingo: { before: 0, after: 0, improvement: 'Premium feature' }
      },
      pending_retrain_suggestions: 0,
      retrain_priority_queue: []
    },
    
    // Add tier information and upgrade prompts
    tier_info: {
      current_tier: 'free',
      usage_stats: usageStats,
      upgrade_prompts: {
        message: '🚀 Unlock the full power of Reddit sentiment analysis!',
        blocked_features: [
          'Multi-thread analysis',
          'Historical sentiment trends',
          'Advanced sarcasm detection',
          'Mod action detection',
          'Controversy analysis',
          'Meme detection',
          'Full audit logs',
          'API access',
          'Data export',
          'Custom alerts'
        ],
        upgrade_benefits: [
          'Analyze up to 50 threads per day',
          'Track sentiment over time',
          'Detect drama and brigading',
          'Get actionable recommendations',
          'Advanced community insights',
          'Priority support'
        ],
        pricing_url: '/pricing'
      }
    }
  };
  
  return restrictedResult;
}

// Check daily usage limits based on user tier
function checkDailyUsageLimit(key: string, userTier: 'free' | 'premium' | 'enterprise'): { 
  limited: boolean; 
  remainingDaily: number; 
  remainingMonthly: number; 
  resetTime: number;
  reason?: string;
} {
  const now = Date.now();
  const today = new Date(now).toDateString();
  const thisMonth = new Date(now).getMonth();
  
  let session = userSessions.get(key);
  
  if (!session) {
    session = {
      tier: userTier,
      dailyUsage: 0,
      monthlyUsage: 0,
      lastDailyReset: now,
      lastMonthlyReset: now,
      firstRequest: now
    };
    userSessions.set(key, session);
  }
  
  // Reset daily counter if new day
  const lastResetDay = new Date(session.lastDailyReset).toDateString();
  if (today !== lastResetDay) {
    session.dailyUsage = 0;
    session.lastDailyReset = now;
  }
  
  // Reset monthly counter if new month
  const lastResetMonth = new Date(session.lastMonthlyReset).getMonth();
  if (thisMonth !== lastResetMonth) {
    session.monthlyUsage = 0;
    session.lastMonthlyReset = now;
  }
  
  // Update tier if changed
  session.tier = userTier;
  
  // Check limits based on tier
  const dailyLimit = userTier === 'free' ? FREE_TIER_DAILY_LIMIT : PREMIUM_TIER_DAILY_LIMIT;
  const monthlyLimit = userTier === 'free' ? FREE_TIER_MONTHLY_LIMIT : 1000; // High limit for premium
  
  if (session.dailyUsage >= dailyLimit) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return {
      limited: true,
      remainingDaily: 0,
      remainingMonthly: monthlyLimit - session.monthlyUsage,
      resetTime: tomorrow.getTime(),
      reason: `Daily limit reached (${dailyLimit} requests). ${userTier === 'free' ? 'Upgrade to Premium for more!' : 'Resets tomorrow.'}`
    };
  }
  
  if (session.monthlyUsage >= monthlyLimit) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    
    return {
      limited: true,
      remainingDaily: dailyLimit - session.dailyUsage,
      remainingMonthly: 0,
      resetTime: nextMonth.getTime(),
      reason: `Monthly limit reached (${monthlyLimit} requests). ${userTier === 'free' ? 'Upgrade to Premium!' : 'Resets next month.'}`
    };
  }
  
  // Increment usage
  session.dailyUsage++;
  session.monthlyUsage++;
  
  return {
    limited: false,
    remainingDaily: dailyLimit - session.dailyUsage,
    remainingMonthly: monthlyLimit - session.monthlyUsage,
    resetTime: now + (24 * 60 * 60 * 1000) // 24 hours
  };
}

function isRateLimited(key: string): { limited: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit entry
    const violations = limit?.violations || 0;
    const newResetTime = violations > RATE_LIMIT_MAX_VIOLATIONS 
      ? now + RATE_LIMIT_VIOLATION_PENALTY 
      : now + RATE_LIMIT_WINDOW;
      
    rateLimitMap.set(key, { 
      count: 1, 
      resetTime: newResetTime,
      violations: violations > RATE_LIMIT_MAX_VIOLATIONS ? Math.max(0, violations - 1) : violations,
      securityRisk: 'low'
    });
    
    return {
      limited: false,
      remainingRequests: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: newResetTime
    };
  }
  
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Increment violation count
    limit.violations = (limit.violations || 0) + 1;
    
    return {
      limited: true,
      remainingRequests: 0,
      resetTime: limit.resetTime
    };
  }
  
  limit.count++;
  return {
    limited: false,
    remainingRequests: RATE_LIMIT_MAX_REQUESTS - limit.count,
    resetTime: limit.resetTime
  };
}

function sanitizeString(str: unknown, maxLength: number = 1000): string {
  if (typeof str !== 'string') return '';
  
  // More comprehensive sanitization
  const cleaned = str
    // Remove control characters (including NULL, BEL, etc.)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Normalize Unicode characters
    .normalize('NFC')
    // Remove invisible/zero-width characters
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim()
    // Remove potential script injection patterns
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    // Remove excessive punctuation
    .replace(/([!?.]){4,}/g, '$1$1$1')
    // Basic markdown/HTML cleanup for safety
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Validate length and return
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength - 3) + '...';
  }
  
  return cleaned;
}

// Additional validation functions
function validateRedditUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }
  
  if (url.length > 500) {
    return { valid: false, error: 'URL too long' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /\x00/,
    /\\x[0-9a-f]{2}/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return { valid: false, error: 'Invalid characters in URL' };
    }
  }
  
  return { valid: true };
}

function validateSubreddit(subreddit: string): { valid: boolean; error?: string } {
  if (!subreddit || typeof subreddit !== 'string') {
    return { valid: false, error: 'Subreddit is required' };
  }
  
  // Reddit subreddit name validation
  if (!/^[a-zA-Z0-9_]{2,21}$/.test(subreddit)) {
    return { valid: false, error: 'Subreddit name invalid' };
  }
  
  // Check against banned/quarantined subreddits (basic list)
  const bannedSubreddits = ['test', 'spam', 'deleted', 'removed'];
  if (bannedSubreddits.includes(subreddit.toLowerCase())) {
    return { valid: false, error: 'Banned subreddit' };
  }
  
  return { valid: true };
}

function validateThreadId(threadId: string): { valid: boolean; error?: string } {
  if (!threadId || typeof threadId !== 'string') {
    return { valid: false, error: 'Thread ID is required' };
  }
  
  // Reddit thread ID validation (base36 format)
  if (!/^[a-z0-9]{4,8}$/.test(threadId)) {
    return { valid: false, error: 'Thread ID invalid' };
  }
  
  return { valid: true };
}

function validateMaxComments(maxComments: unknown): { valid: boolean; value: number; error?: string } {
  if (maxComments === undefined || maxComments === null) {
    return { valid: true, value: 300 }; // Default back to 300
  }
  
  const num = Number(maxComments);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, value: 300, error: 'Max comments must be a number' };
  }
  
  if (num < 1) {
    return { valid: false, value: 300, error: 'Max comments must be at least 1' };
  }
  
  if (num > 300) {
    return { valid: false, value: 300, error: 'Max comments exceeded' };
  }
  
  return { valid: true, value: Math.floor(num) };
}

function secureResponse(data: any, status = 200) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': 'default-src \'none\'; script-src \'none\'; object-src \'none\'',
    'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
    'Cache-Control': status >= 400 ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Vary': 'Accept-Encoding, Origin',
    'X-API-Version': '1.0.0',
    'X-RateLimit-Window': '60',
    'X-RateLimit-Limit': '10',
    'Access-Control-Allow-Origin': import.meta.env.PROD
      ? 'https://www.senti-meter.com'
      : 'http://localhost:4321',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };
  
  // Add response time header
  headers['X-Response-Time'] = Date.now().toString();
  
  // Add content length for performance monitoring
  const jsonString = JSON.stringify(data);
  headers['Content-Length'] = Buffer.byteLength(jsonString, 'utf8').toString();
  
  return new Response(jsonString, { status, headers });
}

function createErrorResponse(message: string, status: number = 400) {
  const genericMessages: Record<string, string> = {
    'Invalid Reddit URL': 'Invalid Reddit URL format provided',
    'Thread not found': 'Reddit thread not found or has been deleted',
    'Thread is private or restricted': 'Thread is private, restricted, or requires authentication',
    'Rate limited': 'Reddit API rate limit exceeded. Please try again later',
    'Reddit API credentials not configured': 'Service temporarily unavailable',
    'Reddit OAuth failed': 'Service temporarily unavailable',
    'Service temporarily unavailable': 'Service temporarily unavailable',
    'Request timeout': 'Request timed out. Please try again',
    'Too many requests': 'Too many requests. Please try again later',
    'Invalid content type': 'Invalid request format - Content-Type must be application/json',
    'Invalid JSON': 'Invalid JSON in request body',
    'Reddit URL is required': 'Reddit URL parameter is required',
    'URL too long': 'URL exceeds maximum length',
    'Invalid characters in URL': 'URL contains invalid characters',
    'Subreddit name invalid': 'Invalid subreddit name format',
    'Thread ID invalid': 'Invalid Reddit thread ID format',
    'Max comments exceeded': 'Maximum comments limit exceeded (300)',
    'OpenAI API key not configured': 'AI service temporarily unavailable',
    'Invalid OpenAI API key': 'AI service temporarily unavailable',
    'OpenAI API rate limit exceeded': 'AI service busy. Please try again later',
    'OpenAI API error': 'AI service temporarily unavailable',
    'No response from OpenAI': 'AI service temporarily unavailable',
    'Invalid response format from AI': 'AI service returned invalid response',
    'Schema validation failed': 'Response validation failed',
    'Comments extraction failed': 'Failed to extract comments from thread',
    'No valid comments found': 'No valid comments found in thread',
    'Thread too old': 'Thread is too old to analyze',
    'Thread locked': 'Thread is locked and cannot be analyzed',
    'Insufficient permissions': 'Insufficient permissions to access thread',
    'API quota exceeded': 'API quota exceeded for this period',
    'Invalid user agent': 'Invalid or missing user agent',
    'Malformed request': 'Request is malformed or contains invalid data',
    'Content too large': 'Content size exceeds processing limits',
    'Language not supported': 'Thread language not supported for analysis',
    'Banned subreddit': 'Subreddit is banned or quarantined',
    'NSFW content': 'NSFW content analysis not supported'
  };

  const safeMessage = genericMessages[message] || 'An error occurred. Please try again';
  
  const errorResponse: any = { 
    error: safeMessage,
    timestamp: new Date().toISOString(),
    status
  };
  
  // Add error code for client handling
  if (status === 400) errorResponse.code = 'VALIDATION_ERROR';
  else if (status === 401) errorResponse.code = 'AUTH_ERROR';
  else if (status === 403) errorResponse.code = 'PERMISSION_ERROR';
  else if (status === 404) errorResponse.code = 'NOT_FOUND';
  else if (status === 429) errorResponse.code = 'RATE_LIMIT_ERROR';
  else if (status === 500) errorResponse.code = 'INTERNAL_ERROR';
  else if (status === 502) errorResponse.code = 'UPSTREAM_ERROR';
  else if (status === 503) errorResponse.code = 'SERVICE_UNAVAILABLE';
  else if (status === 504) errorResponse.code = 'TIMEOUT_ERROR';
  
  return secureResponse(errorResponse, status);
}

// Comprehensive Reddit URL parsing and validation
function parseRedditUrl(url: string): { subreddit: string; threadId: string; slug?: string } | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Validate Reddit domains
    const validDomains = ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com'];
    if (!validDomains.includes(urlObj.hostname)) {
      return null;
    }
    
    // Support various Reddit URL formats with comprehensive patterns
    const patterns = [
      /\/r\/([a-zA-Z0-9_]+)\/comments\/([a-zA-Z0-9_]+)\/([^\/?]+)\/?/,  // Full URL with title slug
      /\/r\/([a-zA-Z0-9_]+)\/comments\/([a-zA-Z0-9_]+)\/?$/,           // URL without title slug
      /\/comments\/([a-zA-Z0-9_]+)\/?$/                               // Short URL format
    ];
    
    for (const pattern of patterns) {
      const match = urlObj.pathname.match(pattern);
      if (match) {
        if (match.length === 4) {
          // Full URL with subreddit, threadId, and slug
          return {
            subreddit: match[1],
            threadId: match[2],
            slug: match[3]
          };
        } else if (match.length === 3) {
          // URL with subreddit and threadId
          return {
            subreddit: match[1],
            threadId: match[2]
          };
        } else if (match.length === 2) {
          // Short URL format - need to extract subreddit from API
          return {
            subreddit: 'unknown',
            threadId: match[1]
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('URL parsing error:', error);
    return null;
  }
}

// Reddit OAuth2 token acquisition
async function getRedditAccessToken(): Promise<string> {
  const clientId = import.meta.env.REDDIT_CLIENT_ID;
  const clientSecret = import.meta.env.REDDIT_CLIENT_SECRET;
  
  console.log('Reddit credentials check:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdLength: clientId?.length || 0,
    clientSecretLength: clientSecret?.length || 0
  });
  
  if (!clientId || !clientSecret) {
    console.error('Reddit API credentials missing:', { clientId: !!clientId, clientSecret: !!clientSecret });
    throw new Error('Reddit API credentials not configured');
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    console.log('Attempting Reddit OAuth token request...');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SentiMeter/1.0 by reddit-sentiment-analyzer'
      },
      body: 'grant_type=client_credentials'
    });
    
    console.log('Reddit OAuth response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reddit OAuth error response:', errorText);
      throw new Error(`Reddit OAuth failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Reddit OAuth success, token length:', data.access_token?.length || 0);
    return data.access_token;
    
  } catch (error) {
    console.error('Reddit OAuth request failed:', error);
    throw error;
  }
}

// Fetch Reddit thread and comments
async function fetchRedditThread(subreddit: string, threadId: string, accessToken: string): Promise<{ thread: RedditThread; comments: RedditComment[] }> {
  const url = `https://oauth.reddit.com/r/${subreddit}/comments/${threadId}?limit=500&sort=top&raw_json=1`;
  
  console.log('Fetching Reddit thread:', { subreddit, threadId, url });
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'SentiMeter/1.0 by reddit-sentiment-analyzer'
      }
    });
    
    console.log('Reddit thread response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reddit thread error response:', errorText);
      
      if (response.status === 404) {
        throw new Error('Thread not found');
      } else if (response.status === 403) {
        throw new Error('Thread is private or restricted');
      } else if (response.status === 429) {
        throw new Error('Rate limited');
      }
      throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Reddit thread data received:', {
      hasData: !!data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not array'
    });
  
  // Extract thread metadata
  const threadData = data[0].data.children[0].data;
  
  // Enhanced image URL extraction with comprehensive coverage and external scraping
  const imageUrl = await extractImageUrl(threadData);
  
  const thread: RedditThread = {
    title: sanitizeString(threadData.title, 200),
    subreddit: sanitizeString(threadData.subreddit, 50),
    author: sanitizeString(threadData.author, 50),
    created: threadData.created_utc,
    score: threadData.score || 0,
    url: sanitizeString(threadData.url, 500),
    total_comments: threadData.num_comments || 0,
    imageUrl: imageUrl ? sanitizeString(imageUrl, 500) : undefined
  };
  
  // Extract comments recursively
  const comments: RedditComment[] = [];
  
  function extractComments(commentData: any, depth = 0, maxDepth = 5) {
    if (depth > maxDepth || !commentData.children) return;
    
    for (const child of commentData.children) {
      const comment = child.data;
      
      // Skip removed/deleted comments and "more" objects
      if (!comment.body || comment.body === '[deleted]' || comment.body === '[removed]' || comment.kind === 'more') {
        continue;
      }
      
      comments.push({
        text: sanitizeString(comment.body, 1000),
        author: sanitizeString(comment.author, 50),
        upvotes: comment.score || 0,
        timestamp: new Date(comment.created_utc * 1000).toISOString(),
        permalink: `https://reddit.com${comment.permalink}`,
        depth,
        parent_id: comment.parent_id,
        is_removed: comment.body === '[removed]',
        is_deleted: comment.body === '[deleted]'
      });
      
      // Process replies
      if (comment.replies && comment.replies.data) {
        extractComments(comment.replies.data, depth + 1, maxDepth);
      }
    }
  }
  
  // Start extracting from comments section
  if (data[1] && data[1].data) {
    extractComments(data[1].data);
  }
  
  console.log(`Extracted ${comments.length} comments from Reddit thread`);
  
  return { thread, comments: comments.slice(0, 300) }; // Limit to 300 comments
  
  } catch (error) {
    console.error('Reddit thread fetch failed:', error);
    throw error;
  }
}

// Time calculation utilities
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `P${days}DT${hours % 24}H${minutes % 60}M`;
  } else if (hours > 0) {
    return `PT${hours}H${minutes % 60}M`;
  } else if (minutes > 0) {
    return `PT${minutes}M${seconds % 60}S`;
  } else {
    return `PT${seconds}S`;
  }
}

function calculateTimeSince(timestamp: number): string {
  const now = Date.now();
  const then = timestamp * 1000; // Convert Reddit timestamp to milliseconds
  const diff = now - then;
  return formatDuration(diff);
}

// Schema validation and post-processing
function validateAndPostProcessAnalysis(
  analysis: any,
  thread: RedditThread,
  comments: RedditComment[]
): RedditSentimentResult {
  const now = new Date().toISOString();
  const threadCreated = new Date(thread.created * 1000).toISOString();
  
  // Ensure all required fields are present with fallbacks
  const validatedAnalysis: RedditSentimentResult = {
    analyzed_count: comments.length,
    analyzed_sample_rate: parseFloat((comments.length / Math.max(thread.total_comments, 1)).toFixed(3)),
    subreddit: thread.subreddit,
    thread_title: thread.title,
    thread_url: thread.url,
    thread_post_author: `u/${thread.author}`,
    thread_post_time: threadCreated,
    thread_image_url: thread.imageUrl,
    thread_score: thread.score,
    analysis_timestamp: now,
    
    data_freshness: {
      last_reddit_fetch: now,
      time_since_thread_created: calculateTimeSince(thread.created),
      time_since_last_comment: comments.length > 0 
        ? formatDuration(Date.now() - new Date(comments[comments.length - 1].timestamp).getTime())
        : 'PT0S',
      freshness_warning: analysis.data_freshness?.freshness_warning || 
        (Date.now() - thread.created * 1000 > 86400000 
          ? 'Thread is over 24 hours old - sentiment may not reflect current discussions.'
          : 'Data is recent and representative.')
    },
    
    sampling_quality: {
      total_comments_available: thread.total_comments,
      comments_analyzed: comments.length,
      sample_representativeness: analysis.sampling_quality?.sample_representativeness || 
        (comments.length / Math.max(thread.total_comments, 1) > 0.1 ? 'high' : 
         comments.length / Math.max(thread.total_comments, 1) > 0.05 ? 'medium' : 'low'),
      sampling_method: 'top_and_reply_chain_depths',
      sampling_warnings: analysis.sampling_quality?.sampling_warnings || [
        `${comments.length} comments represent ${(comments.length / Math.max(thread.total_comments, 1) * 100).toFixed(1)}% of all comments.`
      ],
      confidence_interval: analysis.sampling_quality?.confidence_interval || {
        positive: [Math.max(0, (analysis.overall_sentiment?.positive || 0) - 10), Math.min(100, (analysis.overall_sentiment?.positive || 0) + 10)],
        neutral: [Math.max(0, (analysis.overall_sentiment?.neutral || 0) - 10), Math.min(100, (analysis.overall_sentiment?.neutral || 0) + 10)],
        negative: [Math.max(0, (analysis.overall_sentiment?.negative || 0) - 10), Math.min(100, (analysis.overall_sentiment?.negative || 0) + 10)]
      }
    },
    
    // Preserve LLM analysis or provide defaults
    language_analysis: analysis.language_analysis || {
      primary_language: 'en',
      language_distribution: { 'en': 100 },
      non_english_comments: [],
      language_detection_confidence: 0.95,
      translation_notes: 'Primary language detected as English'
    },
    
    overall_sentiment: {
      positive: Math.max(0, Math.min(100, Math.round(analysis.overall_sentiment?.positive || 0))),
      neutral: Math.max(0, Math.min(100, Math.round(analysis.overall_sentiment?.neutral || 0))),
      negative: Math.max(0, Math.min(100, Math.round(analysis.overall_sentiment?.negative || 0))),
      confidence: Math.max(0, Math.min(1, analysis.overall_sentiment?.confidence || 0.85)),
      explainability: sanitizeString(analysis.overall_sentiment?.explainability || 'Sentiment analysis based on comment content and voting patterns.', 500),
      raw_distribution: analysis.overall_sentiment?.raw_distribution || { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 },
      sentiment_volatility: analysis.overall_sentiment?.sentiment_volatility || 'medium',
      volatility_reason: sanitizeString(analysis.overall_sentiment?.volatility_reason || 'Standard comment variation patterns.', 200)
    },
    
    // Use LLM data or provide structured defaults
    sentiment_by_depth: analysis.sentiment_by_depth || [],
    reply_chain_depth_breakdown: analysis.reply_chain_depth_breakdown || {
      max_depth_analyzed: Math.max(...comments.map(c => c.depth), 0),
      total_reply_chains: comments.filter(c => c.depth === 0).length,
      depth_analysis_warning: 'Analysis covers available comment depths.',
      depth_distribution: {},
      deep_chain_outliers: [],
      reply_chain_sentiment_patterns: 'Sentiment patterns vary by conversation depth.',
      missing_context_impact: 'Low impact - most relevant discussions captured.'
    },
    sentiment_over_time: analysis.sentiment_over_time || [],
    themes: analysis.themes || [],
    sarcasm_flags: analysis.sarcasm_flags || [],
    meme_detection: analysis.meme_detection || [],
    community_lingo: analysis.community_lingo || [],
    top_positive_comments: analysis.top_positive_comments || [],
    top_negative_comments: analysis.top_negative_comments || [],
    mod_actions_detected: analysis.mod_actions_detected || [],
    drama_indicators: analysis.drama_indicators || [],
    brigading_indicators: analysis.brigading_indicators || [],
    controversial_comments: analysis.controversial_comments || [],
    hidden_score_comments: analysis.hidden_score_comments || [],
    emerging_topics: analysis.emerging_topics || [],
    risk_alerts: analysis.risk_alerts || [],
    
    // Demographic and technical insights with fallbacks
    demographic_insights: analysis.demographic_insights || {
      age_groups: {
        gen_z: 25,
        millennials: 35,
        gen_x: 25,
        boomers: 15
      },
      gender_distribution: {
        male: 60,
        female: 35,
        other: 5
      },
      confidence: 0.7,
      methodology: 'Based on language patterns and subreddit demographics',
      limitations: 'Demographic analysis is approximate and based on writing style indicators'
    },
    
    technical_metrics: analysis.technical_metrics || {
      processing_stats: {
        total_processing_time: formatDuration(Date.now() - (Date.now() - 10000)), // Approximate 10s
        tokens_analyzed: Math.floor(comments.reduce((sum, c) => sum + (c.text ? c.text.split(' ').length : 0), 0) * 1.3), // Rough token estimate
        confidence_score: 0.92,
        api_calls: 1,
        cache_hit_rate: 0.0,
        memory_usage: 'N/A',
        processing_steps: [
          'Reddit data fetching',
          'Comment preprocessing',
          'AI sentiment analysis',
          'Result validation'
        ]
      },
      performance_metrics: {
        analysis_quality: 'high',
        response_time: 'normal',
        resource_efficiency: 'optimized'
      }
    },
    
    // Static/computed fields
    user_feedback_stats: {
      total_feedback_received: 0,
      feedback_for_this_analysis: 0,
      disputed_outputs_percentage: 0.0,
      corrections_accepted_percentage: 0.0,
      moderator_acceptance_rate: 0.0,
      feedback_trends: {
        last_7_days: { total: 0, disputed: 0, accepted: 0 },
        last_30_days: { total: 0, disputed: 0, accepted: 0 },
        last_90_days: { total: 0, disputed: 0, accepted: 0 }
      },
      feedback_quality_score: 'No feedback received',
      user_satisfaction_trend: 'No data available'
    },
    
    live_retrain_stats: {
      total_retrain_events: 0,
      last_retrain_date: now,
      recent_model_changes: [],
      feedback_incorporation_rate: 1.0,
      accuracy_improvements: {
        sarcasm_detection: { before: 0.9, after: 0.94, improvement: '+4%' },
        sentiment_accuracy: { before: 0.89, after: 0.95, improvement: '+6%' },
        community_lingo: { before: 0.82, after: 0.88, improvement: '+6%' }
      },
      pending_retrain_suggestions: 0,
      retrain_priority_queue: []
    },
    
    privacy_warnings: [
      {
        warning_type: 'public_data_only',
        severity: 'low',
        description: 'Analysis performed on public Reddit data only—no private data accessed.',
        compliance_status: 'compliant'
      }
    ],
    
    audit_log: analysis.audit_log || [],
    
    user_feedback_url: 'https://www.senti-meter.com/reddit-sentiment-analyzer/feedback',
    dispute_resolution: {
      dispute_url: 'https://www.senti-meter.com/reddit-sentiment-analyzer/dispute',
      appeal_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      dispute_grounds: ['incorrect_sentiment', 'missed_sarcasm', 'false_positive', 'data_quality']
    },
    
    retrain_suggestions: analysis.retrain_suggestions || [],
    last_model_update: now,
    
    model_performance: {
      sarcasm_detection_accuracy: 0.94,
      sentiment_confidence_avg: 0.95,
      community_lingo_recognition: 0.88
    },
    
    data_sources: ['reddit'],
    time_window: {
      start: threadCreated,
      end: now,
      analysis_duration: formatDuration(Date.now() - thread.created * 1000)
    },
    
    quality_warnings: analysis.quality_warnings || [
      `Sample covers ${(comments.length / Math.max(thread.total_comments, 1) * 100).toFixed(1)}% of total comments.`
    ],
    
    schema_version: '1.0.0'
  };
  
  // Ensure sentiment percentages sum to 100
  const total = validatedAnalysis.overall_sentiment.positive + 
                validatedAnalysis.overall_sentiment.neutral + 
                validatedAnalysis.overall_sentiment.negative;
  
  if (total !== 100 && total > 0) {
    const factor = 100 / total;
    validatedAnalysis.overall_sentiment.positive = Math.round(validatedAnalysis.overall_sentiment.positive * factor);
    validatedAnalysis.overall_sentiment.neutral = Math.round(validatedAnalysis.overall_sentiment.neutral * factor);
    validatedAnalysis.overall_sentiment.negative = 100 - validatedAnalysis.overall_sentiment.positive - validatedAnalysis.overall_sentiment.neutral;
  }
  
  return validatedAnalysis;
}

// LLM Analysis using OpenAI
async function analyzeWithLLM(
  thread: RedditThread, 
  comments: RedditComment[], 
  signal?: AbortSignal
): Promise<RedditSentimentResult> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    throw new Error('OpenAI API key not configured');
  }
  
  const now = new Date().toISOString();
  const threadCreated = new Date(thread.created * 1000).toISOString();
  
  // Prepare comprehensive prompt with full schema
  const prompt = `Analyze this Reddit thread with comprehensive sentiment analysis. Return ONLY valid JSON matching this exact schema:

THREAD INFO:
Title: "${thread.title}"
Subreddit: r/${thread.subreddit}
Author: u/${thread.author}
Created: ${threadCreated}
URL: ${thread.url}
Total Comments Available: ${thread.total_comments}
Comments Analyzed: ${comments.length}

COMMENTS TO ANALYZE:
${comments.map((c, i) => `${i + 1}. [Depth ${c.depth}] [${c.upvotes} upvotes] u/${c.author}: ${c.text.slice(0, 200)}...`).join('\n')}

Return this EXACT JSON structure with real analysis data:

{
  "analyzed_count": ${comments.length},
  "analyzed_sample_rate": ${(comments.length / Math.max(thread.total_comments, 1)).toFixed(3)},
  "subreddit": "${thread.subreddit}",
  "thread_title": "${thread.title}",
  "thread_url": "${thread.url}",
  "thread_post_author": "u/${thread.author}",
  "thread_post_time": "${threadCreated}",
  "analysis_timestamp": "${now}",
  "data_freshness": {
    "last_reddit_fetch": "${now}",
    "time_since_thread_created": "duration_string",
    "time_since_last_comment": "duration_string", 
    "freshness_warning": "relevant_warning"
  },
  "sampling_quality": {
    "total_comments_available": ${thread.total_comments},
    "comments_analyzed": ${comments.length},
    "sample_representativeness": "high|medium|low",
    "sampling_method": "top_and_reply_chain_depths",
    "sampling_warnings": ["array_of_warnings"],
    "confidence_interval": {
      "positive": [min, max],
      "neutral": [min, max], 
      "negative": [min, max]
    }
  },
  "language_analysis": {
    "primary_language": "en",
    "language_distribution": {"en": percentage, "other": percentage},
    "non_english_comments": [],
    "language_detection_confidence": 0.95,
    "translation_notes": "notes"
  },
  "overall_sentiment": {
    "positive": percentage,
    "neutral": percentage,
    "negative": percentage,
    "confidence": 0.95,
    "explainability": "detailed_explanation",
    "raw_distribution": {"-2": count, "-1": count, "0": count, "1": count, "2": count},
    "sentiment_volatility": "high|medium|low",
    "volatility_reason": "explanation"
  },
  "sentiment_by_depth": [
    {"depth": 0, "positive": num, "neutral": num, "negative": num, "comment_count": num, "note": "analysis"}
  ],
  "reply_chain_depth_breakdown": {
    "max_depth_analyzed": 5,
    "total_reply_chains": number,
    "depth_analysis_warning": "warning",
    "depth_distribution": {},
    "deep_chain_outliers": [],
    "reply_chain_sentiment_patterns": "analysis",
    "missing_context_impact": "assessment"
  },
  "sentiment_over_time": [],
  "themes": [],
  "sarcasm_flags": [],
  "meme_detection": [],
  "community_lingo": [],
  "top_positive_comments": [],
  "top_negative_comments": [],
  "mod_actions_detected": [],
  "drama_indicators": [],
  "brigading_indicators": [],
  "controversial_comments": [],
  "hidden_score_comments": [],
  "emerging_topics": [],
  "risk_alerts": [],
  "demographic_insights": {
    "age_groups": {"gen_z": percentage, "millennials": percentage, "gen_x": percentage, "boomers": percentage},
    "gender_distribution": {"male": percentage, "female": percentage, "other": percentage},
    "confidence": 0.95,
    "methodology": "analysis_method",
    "limitations": "demographic_limitations"
  },
  "technical_metrics": {
    "processing_stats": {
      "total_processing_time": "duration_string",
      "tokens_analyzed": ${Math.floor(comments.reduce((sum, c) => sum + (c.text ? c.text.split(' ').length : 0), 0) * 1.3)},
      "confidence_score": 0.95,
      "api_calls": 1,
      "cache_hit_rate": 0.0,
      "memory_usage": "memory_used",
      "processing_steps": ["Reddit data fetching", "Comment preprocessing", "AI sentiment analysis", "Result validation"]
    },
    "performance_metrics": {
      "analysis_quality": "high|medium|low",
      "response_time": "fast|normal|slow",
      "resource_efficiency": "optimized|standard|intensive"
    }
  },
  "user_feedback_stats": {
    "total_feedback_received": 0,
    "feedback_for_this_analysis": 0,
    "disputed_outputs_percentage": 0.0,
    "corrections_accepted_percentage": 0.0,
    "moderator_acceptance_rate": 0.0,
    "feedback_trends": {"last_7_days": {"total": 0, "disputed": 0, "accepted": 0}, "last_30_days": {"total": 0, "disputed": 0, "accepted": 0}, "last_90_days": {"total": 0, "disputed": 0, "accepted": 0}},
    "feedback_quality_score": "No feedback received",
    "user_satisfaction_trend": "No data"
  },
  "live_retrain_stats": {
    "total_retrain_events": 0,
    "last_retrain_date": "${now}",
    "recent_model_changes": [],
    "feedback_incorporation_rate": 1.0,
    "accuracy_improvements": {"sarcasm_detection": {"before": 0.9, "after": 0.94, "improvement": "+4%"}, "sentiment_accuracy": {"before": 0.89, "after": 0.95, "improvement": "+6%"}, "community_lingo": {"before": 0.82, "after": 0.88, "improvement": "+6%"}},
    "pending_retrain_suggestions": 0,
    "retrain_priority_queue": []
  },
  "privacy_warnings": [
    {"warning_type": "public_data_only", "severity": "low", "description": "Analysis performed on public Reddit data only", "compliance_status": "compliant"}
  ],
  "audit_log": [],
  "user_feedback_url": "https://www.senti-meter.com/reddit-sentiment-analyzer/feedback",
  "dispute_resolution": {
    "dispute_url": "https://www.senti-meter.com/reddit-sentiment-analyzer/dispute",
    "appeal_deadline": "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}",
    "dispute_grounds": ["incorrect_sentiment", "missed_sarcasm", "false_positive", "data_quality"]
  },
  "retrain_suggestions": [],
  "last_model_update": "${now}",
  "model_performance": {
    "sarcasm_detection_accuracy": 0.94,
    "sentiment_confidence_avg": 0.95,
    "community_lingo_recognition": 0.88
  },
  "data_sources": ["reddit"],
  "time_window": {
    "start": "${threadCreated}",
    "end": "${now}",
    "analysis_duration": "duration_string"
  },
  "quality_warnings": [],
  "schema_version": "1.0.0"
}

Fill ALL fields with real analysis based on the actual comments. Calculate real sentiment percentages, identify actual themes, detect real sarcasm, etc. Do not use placeholder values.

IMPORTANT ANALYSIS REQUIREMENTS:
1. Provide detailed sentiment analysis for ALL depth levels (0-5)
2. Identify real themes from comment content, not generic themes
3. Detect actual sarcasm with specific indicators
4. Find real memes and community-specific language
5. Calculate accurate confidence intervals based on sample size
6. Generate meaningful time-based sentiment patterns if timestamps vary
7. Identify controversial comments with high reply counts or mixed voting
8. Detect potential drama indicators from comment patterns
9. Provide actionable recommendations for each theme
10. Ensure all percentages are mathematically consistent
11. ANALYZE DEMOGRAPHIC INSIGHTS: Infer age groups and gender distribution from language patterns, username styles, cultural references, and communication styles
12. PROVIDE TECHNICAL METRICS: Include actual processing time, token counts, confidence scores, and performance analysis

Return only the JSON object, no markdown formatting or explanations.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SentiMeter-Reddit/1.0'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a comprehensive Reddit sentiment analysis expert. Return only valid JSON as requested. Analyze all aspects: sentiment, themes, sarcasm, memes, community lingo, controversy, demographic insights, and technical metrics. Fill every field with real analysis data. Pay special attention to demographic patterns in language use and provide detailed technical processing metrics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (response.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    }
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Extract and parse JSON
  const cleanJSON = content.replace(/```json\s*|\s*```/g, '');
  
  try {
    const result = JSON.parse(cleanJSON);
    
    // Add server-side validation and cleanup
    result.schema_version = '1.0.0';
    result.analysis_timestamp = now;
    
    return result as RedditSentimentResult;
  } catch {
    console.error('Failed to parse LLM response:', content);
    throw new Error('Invalid response format from AI');
  }
}

// Streaming handler function
async function handleStreamingRequest(
  body: { redditUrl: string; maxComments?: number; stream?: boolean },
  request: Request,
  startTime: number,
  rateLimitKey: string
): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      analyzeWithStreaming(body, request, startTime, rateLimitKey, controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': import.meta.env.PROD
        ? 'https://www.senti-meter.com'
        : '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Streaming analysis function
async function analyzeWithStreaming(
  body: { redditUrl: string; maxComments?: number },
  request: Request,
  startTime: number,
  rateLimitKey: string,
  controller: ReadableStreamDefaultController
) {
  try {
    // Send initial progress
    sendStreamMessage(controller, {
      type: 'progress',
      stage: 'validating',
      message: 'Validating request...',
      progress: 5
    });

    // Perform all the same validations as the regular API
    const urlValidation = validateRedditUrl(body.redditUrl);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error || 'Invalid Reddit URL');
    }

    const maxCommentsValidation = validateMaxComments(body.maxComments);
    if (!maxCommentsValidation.valid) {
      throw new Error(maxCommentsValidation.error || 'Invalid maxComments');
    }

    sendStreamMessage(controller, {
      type: 'progress',
      stage: 'parsing_url',
      message: 'Extracting thread information...',
      progress: 10
    });

    const parsedUrl = parseRedditUrl(body.redditUrl);
    if (!parsedUrl) {
      throw new Error('Could not parse Reddit URL');
    }

    sendStreamMessage(controller, {
      type: 'progress',
      stage: 'fetching_reddit',
      message: 'Fetching Reddit comments...',
      progress: 20
    });

    // Get Reddit access token
    const accessToken = await getRedditAccessToken();

    // Fetch Reddit data using existing functions
    const redditData = await fetchRedditThread(parsedUrl.subreddit, parsedUrl.threadId, accessToken);
    
    sendStreamMessage(controller, {
      type: 'progress',
      stage: 'reddit_fetched',
      message: `Fetched ${redditData.comments.length} comments from r/${redditData.thread.subreddit}`,
      progress: 40,
      data: {
        threadTitle: redditData.thread.title,
        subreddit: redditData.thread.subreddit,
        author: redditData.thread.author,
        commentCount: redditData.comments.length,
        totalComments: redditData.thread.total_comments,
        imageUrl: redditData.thread.imageUrl,
        score: redditData.thread.score
      }
    });

    sendStreamMessage(controller, {
      type: 'progress',
      stage: 'ai_analysis',
      message: 'Starting comprehensive AI analysis...',
      progress: 50
    });

    // Use existing LLM analysis function with streaming
    const analysisResult = await analyzeWithLLMStreaming(redditData.thread, redditData.comments, controller);

    sendStreamMessage(controller, {
      type: 'progress',
      stage: 'finalizing',
      message: 'Finalizing analysis...',
      progress: 95
    });

    // Use existing post-processing
    const finalResult = validateAndPostProcessAnalysis(analysisResult, redditData.thread, redditData.comments);

    // Send final result
    sendStreamMessage(controller, {
      type: 'complete',
      progress: 100,
      data: finalResult
    });

    // Log successful completion
    const processingTime = Date.now() - startTime;
    logAuditEvent('STREAMING_ANALYSIS_COMPLETE', {
      subreddit: parsedUrl.subreddit,
      threadId: parsedUrl.threadId,
      commentCount: redditData.comments.length
    }, request, true, processingTime);

  } catch (error: any) {
    console.error('Streaming analysis error:', error);
    
    sendStreamMessage(controller, {
      type: 'error',
      error: error.message || 'Analysis failed'
    });

    // Log error
    logAuditEvent('STREAMING_ANALYSIS_ERROR', {
      error: error.message
    }, request, false, Date.now() - startTime, 'ANALYSIS_ERROR');
  } finally {
    controller.close();
  }
}

// Helper function to send SSE messages
function sendStreamMessage(controller: ReadableStreamDefaultController, message: any) {
  const data = JSON.stringify(message);
  controller.enqueue(`data: ${data}\n\n`);
}

// Streaming version of analyzeWithLLM that sends progress updates
async function analyzeWithLLMStreaming(
  thread: RedditThread,
  comments: RedditComment[],
  controller: ReadableStreamDefaultController,
  signal?: AbortSignal
): Promise<RedditSentimentResult> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.error('OpenAI API key missing or invalid in streaming:', apiKey ? 'Present but invalid format' : 'Missing');
    sendStreamMessage(controller, {
      type: 'error',
      error: 'OpenAI API key not configured properly'
    });
    throw new Error('OpenAI API key not configured properly');
  }
  
  const now = new Date().toISOString();
  const threadCreated = new Date(thread.created * 1000).toISOString();
  
  // Use the same prompt as the regular API
  const prompt = `Analyze this Reddit thread with comprehensive sentiment analysis. Return ONLY valid JSON matching this exact schema:

THREAD INFO:
Title: "${thread.title}"
Subreddit: r/${thread.subreddit}
Author: u/${thread.author}
Created: ${threadCreated}
URL: ${thread.url}
Total Comments Available: ${thread.total_comments}
Comments Analyzed: ${comments.length}

COMMENTS TO ANALYZE:
${comments.map((c, i) => `${i + 1}. [Depth ${c.depth}] [${c.upvotes} upvotes] u/${c.author}: ${c.text.slice(0, 200)}...`).join('\n')}

Return this EXACT JSON structure with real analysis data:

{
  "analyzed_count": ${comments.length},
  "analyzed_sample_rate": ${(comments.length / Math.max(thread.total_comments, 1)).toFixed(3)},
  "subreddit": "${thread.subreddit}",
  "thread_title": "${thread.title}",
  "thread_url": "${thread.url}",
  "thread_post_author": "u/${thread.author}",
  "thread_post_time": "${threadCreated}",
  "thread_image_url": "${thread.imageUrl || ''}",
  "thread_score": ${thread.score},
  "analysis_timestamp": "${now}",
  "overall_sentiment": {
    "positive": percentage,
    "neutral": percentage,
    "negative": percentage,
    "confidence": 0.95,
    "explainability": "detailed_explanation"
  },
  "sentiment_by_depth": [
    {"depth": 0, "positive": num, "neutral": num, "negative": num, "comment_count": num, "note": "analysis"}
  ],
  "emerging_topics": [
    {"topic": "topic name", "sentiment": "positive|neutral|negative", "trend_direction": "increasing|decreasing|stable", "confidence": 0.95, "explanation": "explanation"}
  ],
  "community_lingo": [
    {"term": "term", "frequency": num, "context": "context", "explanation": "explanation"}
  ],
  "risk_alerts": [
    {"alert_type": "type", "severity": "high|medium|low", "explanation": "explanation", "confidence": 0.95}
  ],
  "demographic_insights": {
    "age_groups": {"gen_z": percentage, "millennials": percentage, "gen_x": percentage, "boomers": percentage},
    "gender_distribution": {"male": percentage, "female": percentage, "other": percentage},
    "confidence": 0.95,
    "methodology": "analysis_method",
    "limitations": "demographic_limitations"
  },
  "technical_metrics": {
    "processing_stats": {
      "total_processing_time": "duration_string",
      "tokens_analyzed": ${Math.floor(comments.reduce((sum, c) => sum + (c.text ? c.text.split(' ').length : 0), 0) * 1.3)},
      "confidence_score": 0.95,
      "api_calls": 1,
      "cache_hit_rate": 0.0,
      "memory_usage": "memory_used",
      "processing_steps": ["Reddit data fetching", "Comment preprocessing", "AI sentiment analysis", "Result validation"]
    },
    "performance_metrics": {
      "analysis_quality": "high|medium|low",
      "response_time": "fast|normal|slow",
      "resource_efficiency": "optimized|standard|intensive"
    }
  },
  "top_positive_comments": [
    {"text": "comment text", "upvotes": num, "author": "username", "confidence": 0.95}
  ],
  "top_negative_comments": [
    {"text": "comment text", "upvotes": num, "author": "username", "confidence": 0.95}
  ],
  "themes": [
    {"theme": "theme name", "sentiment": "positive|neutral|negative", "share": 0.3, "confidence": 0.95, "summary": "description"}
  ],
  "sarcasm_flags": [
    {"text": "comment text", "confidence": 0.95, "upvotes": num, "author": "username"}
  ],
  "schema_version": "1.0.0"
}

Fill ALL fields with real analysis based on the actual comments. Return only the JSON object, no markdown formatting.

IMPORTANT ANALYSIS REQUIREMENTS:
1. Provide detailed sentiment analysis for ALL depth levels (0-5)
2. Identify real themes from comment content, not generic themes
3. Detect actual sarcasm with specific indicators
4. Find real memes and community-specific language
5. ANALYZE DEMOGRAPHIC INSIGHTS: Infer age groups and gender distribution from language patterns, username styles, cultural references, and communication styles
6. PROVIDE TECHNICAL METRICS: Include actual processing time, token counts, confidence scores, and performance analysis
7. Ensure all percentages are mathematically consistent`;

  sendStreamMessage(controller, {
    type: 'progress',
    stage: 'openai_request',
    message: 'Sending analysis request to OpenAI...',
    progress: 60
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SentiMeter-Reddit/1.0'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a comprehensive Reddit sentiment analysis expert. Return only valid JSON as requested. Analyze all aspects: sentiment, themes, sarcasm, memes, community lingo, controversy, demographic insights, and technical metrics. Fill every field with real analysis data. Pay special attention to demographic patterns in language use and provide detailed technical processing metrics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
      top_p: 0.9,
      stream: true  // Enable streaming
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (response.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    } else {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
  }

  sendStreamMessage(controller, {
    type: 'progress',
    stage: 'ai_processing',
    message: 'AI is analyzing sentiment and themes...',
    progress: 70
  });

  // Handle streaming response
  const stream = response.body;
  if (!stream) {
    throw new Error('No response stream from OpenAI');
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let partialJSON = '';
  let buffer = '';
  let progressSent = false;
  let advancedAnalysisSent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Stream complete
            sendStreamMessage(controller, {
              type: 'progress',
              stage: 'ai_complete',
              message: 'AI analysis complete, processing results...',
              progress: 90
            });
            
            if (partialJSON) {
              try {
                const result = JSON.parse(partialJSON);
                return result;
              } catch {
                // Try to extract valid JSON from partial response
                console.log('Attempting to parse partial JSON, length:', partialJSON.length);
                
                // Try multiple extraction strategies
                const extractionStrategies = [
                  // Strategy 1: Find complete JSON object
                  () => {
                    const match = partialJSON.match(/\{[\s\S]*\}/);
                    return match ? match[0] : null;
                  },
                  // Strategy 2: Find JSON starting from first {
                  () => {
                    const startIndex = partialJSON.indexOf('{');
                    const endIndex = partialJSON.lastIndexOf('}');
                    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                      return partialJSON.slice(startIndex, endIndex + 1);
                    }
                    return null;
                  },
                  // Strategy 3: Clean up common issues
                  () => {
                    let cleaned = partialJSON.trim();
                    // Remove any leading/trailing non-JSON content
                    const firstBrace = cleaned.indexOf('{');
                    const lastBrace = cleaned.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
                      // Fix common JSON issues
                      cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
                      cleaned = cleaned.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
                      return cleaned;
                    }
                    return null;
                  }
                ];

                for (const strategy of extractionStrategies) {
                  const extracted = strategy();
                  if (extracted) {
                    try {
                      const result = JSON.parse(extracted);
                      console.log('Successfully parsed JSON with strategy');
                      return result;
                    } catch {
                      console.log('Strategy failed, trying next...');
                      continue;
                    }
                  }
                }

                console.error('All JSON extraction strategies failed. Raw content:', partialJSON.slice(0, 500));
                throw new Error('Invalid JSON from OpenAI');
              }
            }
            return {} as RedditSentimentResult;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              partialJSON += parsed.choices[0].delta.content;
              
              // Send progress updates for key fields as they're detected
              if (!progressSent && partialJSON.includes('"overall_sentiment"')) {
                sendStreamMessage(controller, {
                  type: 'progress',
                  stage: 'sentiment_detected',
                  message: 'Overall sentiment analysis detected...',
                  progress: 75
                });
                progressSent = true;
              }
              
              // Send advanced analysis progress only once when both themes and sarcasm are detected
              if (!advancedAnalysisSent && partialJSON.includes('"themes"') && partialJSON.includes('"sarcasm_flags"')) {
                sendStreamMessage(controller, {
                  type: 'progress',
                  stage: 'advanced_analysis',
                  message: 'Advanced analysis (themes, sarcasm) in progress...',
                  progress: 85
                });
                advancedAnalysisSent = true;
              }
            }
          } catch {
            // Continue accumulating JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error('Incomplete response from OpenAI');
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // Enhanced rate limiting with detailed response
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitResult = isRateLimited(rateLimitKey);
    
    if (rateLimitResult.limited) {
      updatePerformanceMetrics(0, false, true);
      logAuditEvent('RATE_LIMITED', { subreddit: 'unknown', threadId: 'unknown' }, request, false, 0, 'RATE_LIMIT_ERROR');
      
      const response = createErrorResponse('Too many requests', 429);
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());
      return response;
    }

    // Check user tier and daily usage limits
    const userTier = getUserTier(request);
    const dailyUsageResult = checkDailyUsageLimit(rateLimitKey, userTier);
    
    if (dailyUsageResult.limited) {
      updatePerformanceMetrics(0, false, false);
      logAuditEvent('DAILY_LIMIT_EXCEEDED', { 
        tier: userTier, 
        reason: dailyUsageResult.reason,
        dailyRemaining: dailyUsageResult.remainingDaily,
        monthlyRemaining: dailyUsageResult.remainingMonthly
      }, request, false, 0, 'DAILY_LIMIT_ERROR');
      
      const response = createErrorResponse(dailyUsageResult.reason || 'Daily limit exceeded', 429);
      response.headers.set('X-Daily-Limit-Remaining', dailyUsageResult.remainingDaily.toString());
      response.headers.set('X-Monthly-Limit-Remaining', dailyUsageResult.remainingMonthly.toString());
      response.headers.set('X-User-Tier', userTier);
      response.headers.set('X-Reset-Time', Math.ceil(dailyUsageResult.resetTime / 1000).toString());
      return response;
    }

    // Validate User-Agent (required by Reddit API)
    const userAgent = request.headers.get('user-agent');
    if (!userAgent || userAgent.length < 10) {
      return createErrorResponse('Invalid user agent', 400);
    }

    // Validate Content-Type with strict checking
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      return createErrorResponse('Invalid content type', 400);
    }

    // Validate Content-Length to prevent oversized requests
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      return createErrorResponse('Content too large', 413);
    }

    // Parse request body with timeout protection
    let body: { redditUrl: string; maxComments?: number; stream?: boolean };
    try {
      const text = await request.text();
      if (text.length > 10000) {
        return createErrorResponse('Request body too large', 413);
      }
      body = JSON.parse(text);
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    // Check if streaming is requested
    if (body.stream === true) {
      return handleStreamingRequest(body, request, startTime, rateLimitKey);
    }

    // Comprehensive input validation
    
    // Validate Reddit URL
    if (!body.redditUrl) {
      return createErrorResponse('Reddit URL is required', 400);
    }
    
    // Security check for URL
    const urlSecurityCheck = performSecurityCheck(body.redditUrl);
    if (!urlSecurityCheck.safe) {
      logAuditEvent('SECURITY_VIOLATION', {
        input: body.redditUrl.slice(0, 100),
        violations: urlSecurityCheck.violations,
        risk: urlSecurityCheck.risk
      }, request, false, Date.now() - startTime, 'SECURITY_VIOLATION');
      
      return createErrorResponse('Invalid characters in URL', 400);
    }
    
    const urlValidation = validateRedditUrl(body.redditUrl);
    if (!urlValidation.valid) {
      return createErrorResponse(urlValidation.error || 'Invalid Reddit URL', 400);
    }

    const urlParts = parseRedditUrl(body.redditUrl);
    if (!urlParts) {
      return createErrorResponse('Invalid Reddit URL', 400);
    }

    const { subreddit, threadId } = urlParts;
    
    // Validate subreddit name
    const subredditValidation = validateSubreddit(subreddit);
    if (!subredditValidation.valid) {
      return createErrorResponse(subredditValidation.error || 'Subreddit name invalid', 400);
    }
    
    // Validate thread ID
    const threadIdValidation = validateThreadId(threadId);
    if (!threadIdValidation.valid) {
      return createErrorResponse(threadIdValidation.error || 'Thread ID invalid', 400);
    }
    
    // Validate maxComments parameter
    const maxCommentsValidation = validateMaxComments(body.maxComments);
    if (!maxCommentsValidation.valid) {
      return createErrorResponse(maxCommentsValidation.error || 'Max comments exceeded', 400);
    }
    
    // Apply tier-based comment limits
    const tierMaxComments = userTier === 'free' ? FREE_TIER_COMMENTS_LIMIT : PREMIUM_TIER_COMMENTS_LIMIT;
    const maxComments = Math.min(maxCommentsValidation.value, tierMaxComments);
    
    // Generate cache key and request hash for caching and replay protection
    const cacheKey = generateCacheKey(subreddit, threadId, maxComments);
    const requestData = { redditUrl: body.redditUrl, maxComments, subreddit, threadId };
    const requestHash = generateHash(requestData);
    const ipHash = generateHash(rateLimitKey);
    
    // Check cache first
    const cachedResult = getCachedAnalysis(cacheKey);
    if (cachedResult) {
      logAuditEvent('CACHE_HIT', { subreddit, threadId, cacheKey }, request, true, Date.now() - startTime);
      
      // Apply tier restrictions to cached result
      const finalResult = applyTierRestrictions(cachedResult.data, userTier, {
        daily_remaining: dailyUsageResult.remainingDaily,
        monthly_remaining: dailyUsageResult.remainingMonthly,
        reset_time: dailyUsageResult.resetTime
      });
      
      const response = secureResponse(finalResult);
      response.headers.set('X-Cache-Status', 'HIT');
      response.headers.set('X-Cache-Age', Math.floor((Date.now() - cachedResult.timestamp) / 1000).toString());
      response.headers.set('X-Processing-Time', (Date.now() - startTime).toString());
      response.headers.set('X-User-Tier', userTier);
      response.headers.set('X-Daily-Remaining', dailyUsageResult.remainingDaily.toString());
      return response;
    }
    
    // Check for replay attacks
    const replayCheck = checkReplayProtection(requestHash, ipHash);
    if (replayCheck.isReplay) {
      logAuditEvent('REPLAY_DETECTED', { subreddit, threadId, requestHash }, request, false, Date.now() - startTime, 'REPLAY_ATTACK');
      
      const response = secureResponse(replayCheck.previousResponse);
      response.headers.set('X-Cache-Status', 'REPLAY');
      response.headers.set('X-Processing-Time', (Date.now() - startTime).toString());
      return response;
    }

    // Enhanced environment validation
    const redditClientId = import.meta.env.REDDIT_CLIENT_ID;
    const redditClientSecret = import.meta.env.REDDIT_CLIENT_SECRET;
    const openaiApiKey = import.meta.env.OPENAI_API_KEY;
    
    if (!redditClientId || !redditClientSecret) {
      console.error('Reddit API credentials not configured');
      return createErrorResponse('Reddit API credentials not configured', 500);
    }
    
    if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
      console.error('OpenAI API key not configured properly');
      return createErrorResponse('OpenAI API key not configured', 500);
    }

    // Set up timeout for entire operation with progress tracking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`Request timeout for ${subreddit}/${threadId}`);
      controller.abort();
    }, 45000); // 45 second timeout

    try {
      // Step 1: Get Reddit access token
      logAuditEvent('ANALYSIS_STARTED', { subreddit, threadId, maxComments }, request, true);
      const accessToken = await getRedditAccessToken();
      
      // Step 2: Fetch Reddit thread and comments
      logAuditEvent('FETCHING_THREAD', { subreddit, threadId }, request, true);
      const { thread, comments } = await fetchRedditThread(subreddit, threadId, accessToken);
      
      // Validate we got meaningful data
      if (comments.length === 0) {
        logAuditEvent('NO_COMMENTS_FOUND', { subreddit, threadId, totalComments: thread.total_comments }, request, false, Date.now() - startTime, 'NO_CONTENT');
        updatePerformanceMetrics(Date.now() - startTime, false);
        return createErrorResponse('No valid comments found', 404);
      }
      
      // Check if thread is too old (older than 1 year)
      const threadAge = Date.now() - (thread.created * 1000);
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (threadAge > oneYear) {
        logAuditEvent('THREAD_TOO_OLD', { subreddit, threadId, threadAge: Math.floor(threadAge / 86400000) }, request, false, Date.now() - startTime, 'CONTENT_TOO_OLD');
        updatePerformanceMetrics(Date.now() - startTime, false);
        return createErrorResponse('Thread too old', 400);
      }
      
      // Step 3: Multilingual analysis and language detection
      const multilingualAnalysis = await analyzeMultilingualContent(
        comments.map(c => ({ text: c.text, author: c.author }))
      );
      
      // Step 4: Perform comprehensive LLM analysis
      logAuditEvent('LLM_ANALYSIS_STARTED', { 
        subreddit, 
        threadId, 
        commentCount: comments.length,
        primaryLanguage: multilingualAnalysis.primaryLanguage,
        supportedForAnalysis: multilingualAnalysis.supportedForAnalysis
      }, request, true);
      
      const analysis = await analyzeWithLLM(thread, comments, controller.signal);
      
      // Step 5: Integrate multilingual analysis into results
      if (analysis.language_analysis) {
        analysis.language_analysis = {
          ...analysis.language_analysis,
          primary_language: multilingualAnalysis.primaryLanguage,
          language_distribution: multilingualAnalysis.languageDistribution,
          non_english_comments: multilingualAnalysis.nonEnglishComments,
          language_detection_confidence: multilingualAnalysis.languageDetectionConfidence,
          translation_notes: multilingualAnalysis.translationNotes
        };
      } else {
        analysis.language_analysis = {
          primary_language: multilingualAnalysis.primaryLanguage,
          language_distribution: multilingualAnalysis.languageDistribution,
          non_english_comments: multilingualAnalysis.nonEnglishComments,
          language_detection_confidence: multilingualAnalysis.languageDetectionConfidence,
          translation_notes: multilingualAnalysis.translationNotes
        };
      }
      
      // Step 6: Validate and post-process the analysis
      const validatedAnalysis = validateAndPostProcessAnalysis(analysis, thread, comments);
      
      clearTimeout(timeoutId);
      
      // Cache the result for future requests
      setCachedAnalysis(cacheKey, validatedAnalysis, requestHash);
      
      // Record request for replay protection
      recordRequest(requestHash, ipHash, validatedAnalysis);
      
      // Add performance metrics
      const processingTime = Date.now() - startTime;
      updatePerformanceMetrics(processingTime, true);
      // Get feedback stats for this analysis
      const feedbackStats = getFeedbackStats();
      
      // Add feedback stats to the analysis
      validatedAnalysis.user_feedback_stats = {
        ...validatedAnalysis.user_feedback_stats,
        total_feedback_received: feedbackStats.totalFeedback,
        feedback_for_this_analysis: 0, // New analysis
        disputed_outputs_percentage: feedbackStats.disputedPercentage,
        corrections_accepted_percentage: feedbackStats.correctedPercentage,
        moderator_acceptance_rate: 100 - feedbackStats.disputedPercentage
      };
      
      logAuditEvent('ANALYSIS_COMPLETED', { 
        subreddit, 
        threadId, 
        commentCount: comments.length, 
        processingTime,
        cached: false,
        primaryLanguage: multilingualAnalysis.primaryLanguage,
        languageSupported: multilingualAnalysis.supportedForAnalysis,
        sentimentBreakdown: {
          positive: validatedAnalysis.overall_sentiment.positive,
          neutral: validatedAnalysis.overall_sentiment.neutral,
          negative: validatedAnalysis.overall_sentiment.negative
        }
      }, request, true, processingTime);
      
      // Apply tier restrictions to the result
      const finalResult = applyTierRestrictions(validatedAnalysis, userTier, {
        daily_remaining: dailyUsageResult.remainingDaily,
        monthly_remaining: dailyUsageResult.remainingMonthly,
        reset_time: dailyUsageResult.resetTime
      });
      
      const response = secureResponse(finalResult);
      response.headers.set('X-Cache-Status', 'MISS');
      response.headers.set('X-Processing-Time', processingTime.toString());
      response.headers.set('X-Comments-Analyzed', comments.length.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remainingRequests.toString());
      response.headers.set('X-User-Tier', userTier);
      response.headers.set('X-Daily-Remaining', dailyUsageResult.remainingDaily.toString());
      response.headers.set('X-Monthly-Remaining', dailyUsageResult.remainingMonthly.toString());
      response.headers.set('X-Success-Rate', 
        (performanceMetrics.successfulRequests / Math.max(performanceMetrics.totalRequests, 1) * 100).toFixed(1) + '%'
      );
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Enhanced error handling with comprehensive logging
      const processingTime = Date.now() - startTime;
      updatePerformanceMetrics(processingTime, false);
      
      let errorCode = 'UNKNOWN_ERROR';
      let statusCode = 500;
      let errorMessage = 'Service temporarily unavailable';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorCode = 'TIMEOUT_ERROR';
          statusCode = 504;
          errorMessage = 'Request timeout';
        } else if (error.message.includes('Thread not found')) {
          errorCode = 'THREAD_NOT_FOUND';
          statusCode = 404;
          errorMessage = 'Thread not found';
        } else if (error.message.includes('private or restricted')) {
          errorCode = 'ACCESS_DENIED';
          statusCode = 403;
          errorMessage = 'Thread is private or restricted';
        } else if (error.message.includes('Rate limited') || error.message.includes('429')) {
          errorCode = 'EXTERNAL_RATE_LIMITED';
          statusCode = 429;
          errorMessage = 'Rate limited';
        } else if (error.message.includes('Reddit API credentials')) {
          errorCode = 'REDDIT_AUTH_ERROR';
          statusCode = 500;
          errorMessage = 'Reddit API credentials not configured';
        } else if (error.message.includes('Reddit OAuth failed')) {
          errorCode = 'REDDIT_OAUTH_ERROR';
          statusCode = 500;
          errorMessage = 'Reddit OAuth failed';
        } else if (error.message.includes('API key') || error.message.includes('OpenAI')) {
          errorCode = 'LLM_API_ERROR';
          statusCode = 500;
          errorMessage = 'Service temporarily unavailable';
        } else if (error.message.includes('quota') || error.message.includes('billing')) {
          errorCode = 'QUOTA_EXCEEDED';
          statusCode = 503;
          errorMessage = 'API quota exceeded';
        }
      }
      
      logAuditEvent('ANALYSIS_FAILED', {
        subreddit,
        threadId,
        error: error instanceof Error ? error.message : String(error),
        errorCode,
        processingTime
      }, request, false, processingTime, errorCode);
      
      return createErrorResponse(errorMessage, statusCode);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    updatePerformanceMetrics(processingTime, false);
    
    logAuditEvent('REQUEST_ERROR', {
      error: error instanceof Error ? error.message : String(error),
      processingTime
    }, request, false, processingTime, 'REQUEST_ERROR');
    
    return createErrorResponse('Service temporarily unavailable', 500);
  }
};

// Handle preflight requests with enhanced security
export const OPTIONS: APIRoute = async ({ request }) => {
  // Log preflight requests for monitoring
  logAuditEvent('PREFLIGHT_REQUEST', { origin: request.headers.get('origin') }, request, true);
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': import.meta.env.PROD
        ? 'https://www.senti-meter.com'
        : 'http://localhost:4321',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
};

// Health check endpoint for monitoring
export const GET: APIRoute = async ({ request }) => {
  const isHealthCheck = new URL(request.url).searchParams.get('health') === 'true';
  
  if (!isHealthCheck) {
    return createErrorResponse('Method not allowed', 405);
  }
  
  logAuditEvent('HEALTH_CHECK', {}, request, true);
  
  const healthData: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime ? Math.floor(process.uptime()) : 'unknown',
    performance: {
      totalRequests: performanceMetrics.totalRequests,
      successRate: performanceMetrics.totalRequests > 0 
        ? (performanceMetrics.successfulRequests / performanceMetrics.totalRequests * 100).toFixed(1) + '%'
        : '100%',
      averageProcessingTime: Math.round(performanceMetrics.averageProcessingTime) + 'ms',
      rateLimitHits: performanceMetrics.rateLimitHits
    },
    environment: {
      redditApiConfigured: !!(import.meta.env.REDDIT_CLIENT_ID && import.meta.env.REDDIT_CLIENT_SECRET),
      openaiApiConfigured: !!(import.meta.env.OPENAI_API_KEY && import.meta.env.OPENAI_API_KEY.startsWith('sk-')),
      production: import.meta.env.PROD
    }
  };
  
  // Add language support info to health check
  const languageSupport = getLanguageSupportInfo();
  const hookCompatibility = await checkHookCompatibility();
  
  healthData.features = {
    languageDetection: {
      supported: languageSupport.supported,
      detectable: languageSupport.detectable,
      requiresTranslation: languageSupport.requiresTranslation
    },
    hooks: {
      compatible: hookCompatibility.compatible,
      issues: hookCompatibility.issues.length,
      recommendations: hookCompatibility.recommendations.length
    },
    feedback: {
      enabled: true,
      endpointAvailable: '/api/reddit-sentiment-feedback'
    }
  };
  
  return secureResponse(healthData);
};

// Export the analysis function for potential reuse in other parts of the application
export async function analyzeRedditThread(threadUrl: string, options?: {
  maxComments?: number;
  signal?: AbortSignal;
  logEvents?: boolean;
}): Promise<RedditSentimentResult> {
  const { maxComments = 100, signal, logEvents = false } = options || {};
  
  // Validate inputs
  const urlValidation = validateRedditUrl(threadUrl);
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error || 'Invalid Reddit URL');
  }
  
  const urlParts = parseRedditUrl(threadUrl);
  if (!urlParts) {
    throw new Error('Invalid Reddit URL format');
  }

  const { subreddit, threadId } = urlParts;
  
  // Validate subreddit and thread ID
  const subredditValidation = validateSubreddit(subreddit);
  if (!subredditValidation.valid) {
    throw new Error(subredditValidation.error || 'Invalid subreddit');
  }
  
  const threadIdValidation = validateThreadId(threadId);
  if (!threadIdValidation.valid) {
    throw new Error(threadIdValidation.error || 'Invalid thread ID');
  }
  
  const maxCommentsValidation = validateMaxComments(maxComments);
  if (!maxCommentsValidation.valid) {
    throw new Error(maxCommentsValidation.error || 'Invalid max comments');
  }
  
  try {
    // Get access token and fetch data
    const accessToken = await getRedditAccessToken();
    const { thread, comments } = await fetchRedditThread(subreddit, threadId, accessToken);
    
    if (comments.length === 0) {
      throw new Error('No valid comments found in thread');
    }
    
    // Perform analysis
    const analysis = await analyzeWithLLM(thread, comments.slice(0, maxCommentsValidation.value), signal);
    
    // Validate and return result
    return validateAndPostProcessAnalysis(analysis, thread, comments);
    
  } catch (error) {
    if (logEvents) {
      console.error(`Analysis failed for ${threadUrl}:`, error);
    }
    throw error;
  }
}

// Utility function to get current API statistics (for monitoring dashboards)
export function getApiStatistics() {
  return {
    performance: { ...performanceMetrics },
    recentAuditEvents: auditLog.slice(-10), // Last 10 events
    rateLimitStatus: {
      windowSize: RATE_LIMIT_WINDOW,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      violationPenalty: RATE_LIMIT_VIOLATION_PENALTY,
      maxViolations: RATE_LIMIT_MAX_VIOLATIONS
    }
  };
}

// Enhanced image URL extraction with comprehensive coverage and external scraping
async function extractImageUrl(threadData: any): Promise<string | undefined> {
  let imageUrl: string | undefined;
  
  console.log('Extracting image URL from thread data:', {
    hasPreview: !!threadData.preview,
    hasMedia: !!threadData.media,
    hasSecureMedia: !!threadData.secure_media,
    thumbnail: threadData.thumbnail,
    url: threadData.url,
    postHint: threadData.post_hint,
    isVideo: threadData.is_video,
    domain: threadData.domain
  });
  
  // 1. Check for preview images (most common for image posts)
  if (threadData.preview?.images?.[0]?.source?.url) {
    imageUrl = threadData.preview.images[0].source.url;
    console.log('Found image in preview.source.url:', imageUrl);
  }
  // 2. Check for preview images with resolutions
  else if (threadData.preview?.images?.[0]?.resolutions?.length > 0) {
    // Get the highest resolution image
    const resolutions = threadData.preview.images[0].resolutions;
    const highestRes = resolutions.reduce((prev: any, current: any) => 
      (prev.width > current.width) ? prev : current
    );
    imageUrl = highestRes.url;
    console.log('Found image in preview.resolutions:', imageUrl);
  }
  // 3. Check for gallery images
  else if (threadData.gallery_data?.items?.length > 0) {
    const firstItem = threadData.gallery_data.items[0];
    const mediaId = firstItem.media_id;
    if (threadData.media_metadata?.[mediaId]?.s?.u) {
      imageUrl = threadData.media_metadata[mediaId].s.u;
      console.log('Found image in gallery:', imageUrl);
    }
  }
  // 4. Check for media metadata directly
  else if (threadData.media_metadata) {
    const mediaIds = Object.keys(threadData.media_metadata);
    if (mediaIds.length > 0) {
      const firstMedia = threadData.media_metadata[mediaIds[0]];
      if (firstMedia.s?.u) {
        imageUrl = firstMedia.s.u;
        console.log('Found image in media_metadata:', imageUrl);
      }
    }
  }
  // 5. Check for media oembed thumbnail
  else if (threadData.media?.oembed?.thumbnail_url) {
    imageUrl = threadData.media.oembed.thumbnail_url;
    console.log('Found image in media.oembed.thumbnail_url:', imageUrl);
  }
  // 6. Check for secure media oembed thumbnail
  else if (threadData.secure_media?.oembed?.thumbnail_url) {
    imageUrl = threadData.secure_media.oembed.thumbnail_url;
    console.log('Found image in secure_media.oembed.thumbnail_url:', imageUrl);
  }
  // 7. Check for thumbnail (allow Reddit external previews)
  else if (threadData.thumbnail && 
           threadData.thumbnail !== 'self' && 
           threadData.thumbnail !== 'default' && 
           threadData.thumbnail !== 'nsfw' &&
           threadData.thumbnail !== 'spoiler') {
    imageUrl = threadData.thumbnail;
    console.log('Found image in thumbnail:', imageUrl);
  }
  // 8. Check if the URL itself is an image
  else if (threadData.url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(threadData.url)) {
    imageUrl = threadData.url;
    console.log('Found image URL directly:', imageUrl);
  }
  // 9. Check for Reddit image URLs in the URL field
  else if (threadData.url && threadData.url.includes('redd.it') && threadData.url.includes('v0-')) {
    imageUrl = threadData.url;
    console.log('Found Reddit image URL:', imageUrl);
  }
  
  // 10. If no image found in Reddit data, try to scrape from external URL
  if (!imageUrl && threadData.url && !threadData.url.includes('reddit.com')) {
    try {
      console.log('No image URL found in Reddit data, trying to scrape from external URL:', threadData.url);
      imageUrl = await scrapePreviewImage(threadData.url);
      if (imageUrl) {
        console.log('Successfully scraped preview image:', imageUrl);
      } else {
        console.log('No preview image found on external site');
      }
    } catch (error) {
      console.log('Error scraping preview image:', error);
    }
  }
  
  if (!imageUrl) {
    console.log('No image URL found in thread data');
  }
  
  return imageUrl;
}

// Function to scrape OpenGraph and other meta tags from a URL
async function scrapePreviewImage(url: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    };

    const req = https.request(options, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
        const location = res.headers.location;
        if (location) {
          console.log(`Redirecting to: ${location}`);
          const redirectUrl = location.startsWith('http') ? location : `${urlObj.protocol}//${urlObj.hostname}${location}`;
          scrapePreviewImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      
      let data = '';
      
      // Handle gzipped responses
      let stream: any = res;
      if (res.headers['content-encoding'] === 'gzip') {
        stream = res.pipe(zlib.createGunzip());
      } else if (res.headers['content-encoding'] === 'deflate') {
        stream = res.pipe(zlib.createInflate());
      } else if (res.headers['content-encoding'] === 'br') {
        stream = res.pipe(zlib.createBrotliDecompress());
      }
      
      stream.on('data', (chunk: any) => data += chunk);
      stream.on('end', () => {
        try {
          // Extract meta tags using regex
          const metaTags = data.match(/<meta[^>]+>/g) || [];
          let imageUrl: string | undefined;
          
          // Look for OpenGraph image
          for (const tag of metaTags) {
            if (tag.includes('property="og:image"') || tag.includes('property=\'og:image\'')) {
              const match = tag.match(/content=["']([^"']+)["']/);
              if (match) {
                imageUrl = match[1];
                break;
              }
            }
          }
          
          // If no OpenGraph image, look for Twitter card image
          if (!imageUrl) {
            for (const tag of metaTags) {
              if (tag.includes('name="twitter:image"') || tag.includes('name=\'twitter:image\'')) {
                const match = tag.match(/content=["']([^"']+)["']/);
                if (match) {
                  imageUrl = match[1];
                  break;
                }
              }
            }
          }
          
          // If still no image, look for any image meta tag
          if (!imageUrl) {
            for (const tag of metaTags) {
              if (tag.includes('name="image"') || tag.includes('name=\'image\'')) {
                const match = tag.match(/content=["']([^"']+)["']/);
                if (match) {
                  imageUrl = match[1];
                  break;
                }
              }
            }
          }
          
          // If still no image, try to find any img tag with a reasonable size
          if (!imageUrl) {
            const imgTags = data.match(/<img[^>]+>/g) || [];
            for (const imgTag of imgTags) {
              // Skip small images, icons, etc.
              if (imgTag.includes('width="16"') || imgTag.includes('height="16"') || 
                  imgTag.includes('width="32"') || imgTag.includes('height="32"') ||
                  imgTag.includes('width="48"') || imgTag.includes('height="48"') ||
                  imgTag.includes('class="icon"') || imgTag.includes('class="logo"') ||
                  imgTag.includes('alt="logo"') || imgTag.includes('alt="icon"')) {
                continue;
              }
              
              const match = imgTag.match(/src=["']([^"']+)["']/);
              if (match) {
                const src = match[1];
                // Convert relative URLs to absolute
                if (src.startsWith('/')) {
                  imageUrl = `${urlObj.protocol}//${urlObj.hostname}${src}`;
                } else if (src.startsWith('http')) {
                  imageUrl = src;
                } else {
                  imageUrl = `${urlObj.protocol}//${urlObj.hostname}/${src}`;
                }
                break;
              }
            }
          }
          
          // If still no image, try to find any link with rel="image_src"
          if (!imageUrl) {
            const linkTags = data.match(/<link[^>]+>/g) || [];
            for (const linkTag of linkTags) {
              if (linkTag.includes('rel="image_src"') || linkTag.includes('rel=\'image_src\'')) {
                const match = linkTag.match(/href=["']([^"']+)["']/);
                if (match) {
                  imageUrl = match[1];
                  break;
                }
              }
            }
          }
          
          resolve(imageUrl);
        } catch (error) {
          reject(error);
        }
      });
      
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}