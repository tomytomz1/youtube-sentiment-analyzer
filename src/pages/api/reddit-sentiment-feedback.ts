import type { APIRoute } from 'astro';
import { storeDataRecord } from '../../lib/data-retention';
import { performSecurityCheck } from '../../lib/security';
import { logAuditEvent } from './reddit-sentiment';

// Feedback types for model improvement
export interface UserFeedback {
  id: string;
  analysisId: string;
  threadUrl: string;
  subreddit: string;
  threadId: string;
  feedbackType: 'dispute' | 'correction' | 'improvement' | 'validation';
  category: 'sentiment_accuracy' | 'sarcasm_detection' | 'theme_identification' | 'meme_detection' | 'controversy_detection' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userRating: number; // 1-5 scale
  originalResult: any;
  suggestedCorrection?: any;
  textualFeedback: string;
  specificComments?: Array<{
    commentText: string;
    originalSentiment: string;
    suggestedSentiment: string;
    confidence: number;
  }>;
  contactInfo?: {
    email?: string;
    anonymous: boolean;
  };
  timestamp: string;
  ipHash: string;
  status: 'pending' | 'reviewed' | 'implemented' | 'rejected';
  moderatorNotes?: string;
  retrainImpact?: {
    affectedModels: string[];
    expectedImprovement: string;
    implementationDate?: string;
  };
}

// Dispute resolution data
export interface DisputeCase {
  id: string;
  feedbackId: string;
  disputeType: 'incorrect_sentiment' | 'missed_sarcasm' | 'false_positive' | 'data_quality' | 'bias_concern';
  evidence: {
    description: string;
    supportingUrls?: string[];
    expertOpinion?: string;
  };
  appealDeadline: string;
  status: 'open' | 'under_review' | 'resolved' | 'escalated';
  resolution?: {
    decision: 'upheld' | 'overturned' | 'partial_correction';
    explanation: string;
    actionsTaken: string[];
    compensationOffered?: string;
  };
}

// Retraining suggestions and tracking
export interface RetrainingSuggestion {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  affectedComments: number;
  expectedImprovement: string;
  dataRequired: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  source: 'user_feedback' | 'automated_analysis' | 'performance_monitoring';
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  metadata: {
    subredditDistribution?: Record<string, number>;
    languageDistribution?: Record<string, number>;
    sentimentPatterns?: any[];
    approvalDate?: string;
    moderatorNotes?: string;
  };
}

// In-memory stores (use proper database in production)
const feedbackStore = new Map<string, UserFeedback>();
const disputeStore = new Map<string, DisputeCase>();
const retrainingStore = new Map<string, RetrainingSuggestion>();

// Rate limiting for feedback endpoints
const feedbackRateLimit = new Map<string, { count: number; resetTime: number }>();
const FEEDBACK_RATE_LIMIT = 5; // 5 feedback submissions per hour
const FEEDBACK_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkFeedbackRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const limit = feedbackRateLimit.get(ipHash);
  
  if (!limit || now > limit.resetTime) {
    feedbackRateLimit.set(ipHash, { count: 1, resetTime: now + FEEDBACK_RATE_WINDOW });
    return false;
  }
  
  if (limit.count >= FEEDBACK_RATE_LIMIT) {
    return true;
  }
  
  limit.count++;
  return false;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'reddit.com' || urlObj.hostname.endsWith('.reddit.com') ? url : '';
  } catch {
    return '';
  }
}

function secureResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Access-Control-Allow-Origin': import.meta.env.PROD ? 'https://www.senti-meter.com' : 'http://localhost:4321',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// POST /api/reddit-sentiment-feedback - Submit user feedback
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // Get IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    const ipHash = Buffer.from(ip).toString('base64').slice(0, 16);
    
    // Check rate limit
    if (checkFeedbackRateLimit(ipHash)) {
      return secureResponse({ 
        error: 'Too many feedback submissions. Please try again later.',
        retryAfter: Math.ceil(FEEDBACK_RATE_WINDOW / 1000)
      }, 429);
    }
    
    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return secureResponse({ error: 'Invalid JSON in request body' }, 400);
    }
    
    // Validate required fields
    const requiredFields = ['analysisId', 'threadUrl', 'feedbackType', 'category', 'textualFeedback'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return secureResponse({ error: `Missing required field: ${field}` }, 400);
      }
    }
    
    // Security check on textual feedback
    const securityCheck = performSecurityCheck(body.textualFeedback);
    if (!securityCheck.safe && securityCheck.risk === 'critical') {
      logAuditEvent('FEEDBACK_SECURITY_VIOLATION', {
        violations: securityCheck.violations,
        risk: securityCheck.risk
      }, request, false, Date.now() - startTime, 'SECURITY_VIOLATION');
      
      return secureResponse({ error: 'Feedback contains invalid content' }, 400);
    }
    
    // Validate and sanitize inputs
    const feedback: UserFeedback = {
      id: generateId(),
      analysisId: body.analysisId.slice(0, 100),
      threadUrl: sanitizeUrl(body.threadUrl),
      subreddit: body.subreddit?.slice(0, 50) || 'unknown',
      threadId: body.threadId?.slice(0, 20) || 'unknown',
      feedbackType: ['dispute', 'correction', 'improvement', 'validation'].includes(body.feedbackType) 
        ? body.feedbackType : 'improvement',
      category: ['sentiment_accuracy', 'sarcasm_detection', 'theme_identification', 'meme_detection', 'controversy_detection', 'other'].includes(body.category)
        ? body.category : 'other',
      severity: ['low', 'medium', 'high', 'critical'].includes(body.severity) 
        ? body.severity : 'medium',
      userRating: Math.max(1, Math.min(5, parseInt(body.userRating) || 3)),
      originalResult: body.originalResult || {},
      suggestedCorrection: body.suggestedCorrection || null,
      textualFeedback: securityCheck.sanitized || body.textualFeedback.slice(0, 2000),
      specificComments: body.specificComments?.slice(0, 10)?.map((comment: any) => ({
        commentText: (comment.commentText || '').slice(0, 500),
        originalSentiment: comment.originalSentiment || 'unknown',
        suggestedSentiment: comment.suggestedSentiment || 'unknown',
        confidence: Math.max(0, Math.min(1, parseFloat(comment.confidence) || 0))
      })) || [],
      contactInfo: {
        email: body.contactInfo?.email?.slice(0, 100) || '',
        anonymous: body.contactInfo?.anonymous !== false
      },
      timestamp: new Date().toISOString(),
      ipHash,
      status: 'pending',
      moderatorNotes: '',
      retrainImpact: undefined
    };
    
    // Store feedback
    feedbackStore.set(feedback.id, feedback);
    
    // Store in data retention system
    storeDataRecord({
      id: `feedback_${feedback.id}`,
      timestamp: Date.now(),
      type: 'audit_log',
      data: feedback,
      size: JSON.stringify(feedback).length,
      metadata: {
        subreddit: feedback.subreddit,
        threadId: feedback.threadId,
        success: true
      }
    });
    
    // Generate retraining suggestion if feedback is significant
    if (feedback.severity === 'high' || feedback.severity === 'critical') {
      const retrainingSuggestion: RetrainingSuggestion = {
        id: generateId(),
        priority: feedback.severity === 'critical' ? 'high' : 'medium',
        category: feedback.category,
        description: `User reported ${feedback.category} issue: ${feedback.textualFeedback.slice(0, 200)}`,
        affectedComments: feedback.specificComments?.length || 1,
        expectedImprovement: `Improve ${feedback.category} accuracy`,
        dataRequired: ['user_feedback', 'original_analysis', 'corrected_labels'],
        estimatedEffort: 'medium',
        source: 'user_feedback',
        status: 'proposed',
        metadata: {
          subredditDistribution: { [feedback.subreddit]: 1 }
        }
      };
      
      retrainingStore.set(retrainingSuggestion.id, retrainingSuggestion);
    }
    
    logAuditEvent('FEEDBACK_SUBMITTED', {
      feedbackId: feedback.id,
      feedbackType: feedback.feedbackType,
      category: feedback.category,
      severity: feedback.severity,
      subreddit: feedback.subreddit
    }, request, true, Date.now() - startTime);
    
    return secureResponse({
      success: true,
      feedbackId: feedback.id,
      message: 'Feedback submitted successfully',
      disputeUrl: feedback.feedbackType === 'dispute' 
        ? `https://www.senti-meter.com/reddit-sentiment-analyzer/dispute/${feedback.id}`
        : undefined,
      estimatedReviewTime: feedback.severity === 'critical' ? '24 hours' : '3-5 business days'
    });
    
  } catch (error) {
    logAuditEvent('FEEDBACK_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    }, request, false, Date.now() - startTime, 'INTERNAL_ERROR');
    
    return secureResponse({ error: 'Internal server error' }, 500);
  }
};

// GET /api/reddit-sentiment-feedback - Get feedback status or statistics
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const feedbackId = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  
  try {
    if (feedbackId) {
      // Get specific feedback status
      const feedback = feedbackStore.get(feedbackId);
      if (!feedback) {
        return secureResponse({ error: 'Feedback not found' }, 404);
      }
      
      return secureResponse({
        id: feedback.id,
        status: feedback.status,
        feedbackType: feedback.feedbackType,
        category: feedback.category,
        severity: feedback.severity,
        timestamp: feedback.timestamp,
        moderatorNotes: feedback.moderatorNotes || 'Under review',
        retrainImpact: feedback.retrainImpact,
        appealDeadline: feedback.feedbackType === 'dispute' 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : undefined
      });
    }
    
    if (action === 'stats') {
      // Get feedback statistics
      const allFeedback = Array.from(feedbackStore.values());
      const now = Date.now();
      const last30Days = allFeedback.filter(f => now - new Date(f.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total: allFeedback.length,
        last30Days: last30Days.length,
        byType: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        averageRating: allFeedback.reduce((sum, f) => sum + f.userRating, 0) / Math.max(allFeedback.length, 1),
        retrainingSuggestions: retrainingStore.size,
        activeDisputes: Array.from(disputeStore.values()).filter(d => d.status === 'open' || d.status === 'under_review').length
      };
      
      // Calculate distributions
      for (const feedback of allFeedback) {
        stats.byType[feedback.feedbackType] = (stats.byType[feedback.feedbackType] || 0) + 1;
        stats.byCategory[feedback.category] = (stats.byCategory[feedback.category] || 0) + 1;
        stats.bySeverity[feedback.severity] = (stats.bySeverity[feedback.severity] || 0) + 1;
        stats.byStatus[feedback.status] = (stats.byStatus[feedback.status] || 0) + 1;
      }
      
      return secureResponse(stats);
    }
    
    return secureResponse({ error: 'Invalid request' }, 400);
    
  } catch {
    return secureResponse({ error: 'Internal server error' }, 500);
  }
};

// OPTIONS - CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': import.meta.env.PROD ? 'https://www.senti-meter.com' : 'http://localhost:4321',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// Export functions for internal use
export function getFeedbackStats() {
  const allFeedback = Array.from(feedbackStore.values());
  const totalFeedback = allFeedback.length;
  const disputedOutputs = allFeedback.filter(f => f.feedbackType === 'dispute').length;
  const correctedOutputs = allFeedback.filter(f => f.status === 'implemented').length;
  
  return {
    totalFeedback,
    disputedOutputs,
    correctedOutputs,
    disputedPercentage: totalFeedback > 0 ? (disputedOutputs / totalFeedback * 100) : 0,
    correctedPercentage: totalFeedback > 0 ? (correctedOutputs / totalFeedback * 100) : 0,
    averageRating: allFeedback.reduce((sum, f) => sum + f.userRating, 0) / Math.max(allFeedback.length, 1)
  };
}

export function getRetrainingSuggestions(): RetrainingSuggestion[] {
  return Array.from(retrainingStore.values())
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}

export function approveRetrainingSuggestion(id: string, moderatorNotes: string): boolean {
  const suggestion = retrainingStore.get(id);
  if (suggestion) {
    suggestion.status = 'approved';
    suggestion.metadata.approvalDate = new Date().toISOString();
    suggestion.metadata.moderatorNotes = moderatorNotes;
    return true;
  }
  return false;
}