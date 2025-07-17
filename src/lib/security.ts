// Advanced security utilities for Reddit sentiment analysis

export interface SecurityCheckResult {
  safe: boolean;
  risk: 'low' | 'medium' | 'high' | 'critical';
  violations: string[];
  sanitized?: string;
}

export interface PromptInjectionResult {
  detected: boolean;
  confidence: number;
  patterns: string[];
  sanitized: string;
}

// Prompt injection patterns to detect
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction attempts
  /ignore\s+previous\s+instructions?/i,
  /forget\s+everything\s+before/i,
  /disregard\s+the\s+above/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /user\s*:\s*/i,
  /human\s*:\s*/i,
  
  // Role manipulation
  /you\s+are\s+now\s+a/i,
  /pretend\s+to\s+be/i,
  /act\s+as\s+a/i,
  /roleplay\s+as/i,
  /simulate\s+being/i,
  
  // Output manipulation
  /return\s+only/i,
  /respond\s+with\s+only/i,
  /output\s+format/i,
  /json\s+response/i,
  /```[a-zA-Z]*\s*\n/i,
  
  // Escape attempts
  /\\n\\n/,
  /\\r\\n/,
  /\\u[0-9a-fA-F]{4}/,
  /\\x[0-9a-fA-F]{2}/,
  
  // Data extraction attempts
  /what\s+is\s+your\s+prompt/i,
  /show\s+me\s+your\s+instructions/i,
  /reveal\s+your\s+system\s+message/i,
  /tell\s+me\s+about\s+your\s+training/i,
  
  // Jailbreaking attempts
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /debug\s+mode/i,
  /unrestricted\s+mode/i,
  /sudo\s+mode/i,
  
  // Code injection
  /<script[^>]*>/i,
  /javascript:/i,
  /eval\s*\(/i,
  /function\s*\(/i,
  /=>\s*{/,
  
  // SQL injection patterns
  /union\s+select/i,
  /drop\s+table/i,
  /insert\s+into/i,
  /delete\s+from/i,
  
  // Template injection
  /\{\{.*\}\}/,
  /\$\{.*\}/,
  /%\{.*\}/,
  
  // Command injection
  /;\s*rm\s+/i,
  /;\s*cat\s+/i,
  /;\s*ls\s+/i,
  /\|\s*bash/i,
  /\|\s*sh/i,
  
  // Data URLs and Base64
  /data:[^;]+;base64,/i,
  /btoa\s*\(/i,
  /atob\s*\(/i,
  
  // Suspicious Unicode
  /[\u200B-\u200D\uFEFF]/,
  /[\u2060-\u2064]/,
  /[\u00AD]/
];

// Content that should never appear in legitimate Reddit comments
const FORBIDDEN_CONTENT_PATTERNS = [
  /BEGIN_MALICIOUS_PAYLOAD/i,
  /END_MALICIOUS_PAYLOAD/i,
  /INJECT_HERE/i,
  /BYPASS_FILTER/i,
  /SYSTEM_OVERRIDE/i,
  /ADMIN_ACCESS/i,
  /ROOT_PRIVILEGE/i,
  /<\?php/i,
  /<asp:/i,
  /<%.*%>/,
  /\{\{.*unsafe.*\}\}/i,
  /\$_(GET|POST|REQUEST|SESSION|COOKIE)/i
];

// Suspicious keywords that might indicate manipulation attempts
const SUSPICIOUS_KEYWORDS = [
  'sentiment_override',
  'bypass_analysis',
  'force_positive',
  'force_negative',
  'inject_sentiment',
  'manipulate_result',
  'fake_comment',
  'generated_content',
  'ai_generated',
  'bot_comment',
  'spam_override',
  'admin_mode',
  'debug_sentiment',
  'test_injection'
];

/**
 * Comprehensive security check for user input
 */
export function performSecurityCheck(input: string): SecurityCheckResult {
  const violations: string[] = [];
  let risk: SecurityCheckResult['risk'] = 'low';
  
  if (!input || typeof input !== 'string') {
    return {
      safe: false,
      risk: 'medium',
      violations: ['Invalid input type'],
      sanitized: ''
    };
  }
  
  // Check for prompt injection patterns
  const injectionResult = detectPromptInjection(input);
  if (injectionResult.detected) {
    violations.push(`Prompt injection detected (confidence: ${(injectionResult.confidence * 100).toFixed(1)}%)`);
    risk = injectionResult.confidence > 0.8 ? 'critical' : 
           injectionResult.confidence > 0.5 ? 'high' : 'medium';
  }
  
  // Check for forbidden content
  for (const pattern of FORBIDDEN_CONTENT_PATTERNS) {
    if (pattern.test(input)) {
      violations.push(`Forbidden content pattern: ${pattern.source}`);
      risk = 'critical';
    }
  }
  
  // Check for suspicious keywords
  const lowerInput = input.toLowerCase();
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (lowerInput.includes(keyword)) {
      violations.push(`Suspicious keyword: ${keyword}`);
      risk = risk === 'low' ? 'medium' : risk;
    }
  }
  
  // Check input length (extremely long inputs might be attacks)
  if (input.length > 10000) {
    violations.push('Input exceeds maximum safe length');
    risk = risk === 'low' ? 'medium' : risk;
  }
  
  // Check for excessive special characters
  const specialCharRatio = (input.match(/[^a-zA-Z0-9\s]/g) || []).length / input.length;
  if (specialCharRatio > 0.3) {
    violations.push('Excessive special characters detected');
    risk = risk === 'low' ? 'medium' : risk;
  }
  
  // Check for control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(input)) {
    violations.push('Control characters detected');
    risk = 'high';
  }
  
  // Sanitize the input
  const sanitized = sanitizeInput(input);
  
  return {
    safe: violations.length === 0,
    risk,
    violations,
    sanitized
  };
}

/**
 * Detect prompt injection attempts with confidence scoring
 */
export function detectPromptInjection(input: string): PromptInjectionResult {
  const detectedPatterns: string[] = [];
  let totalScore = 0;
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      detectedPatterns.push(pattern.source);
      
      // Score based on pattern type and position
      let score = 1;
      
      // Higher score for patterns at the beginning of input
      if (matches.index !== undefined && matches.index < 50) {
        score *= 1.5;
      }
      
      // Higher score for certain critical patterns
      if (pattern.source.includes('ignore') || pattern.source.includes('forget')) {
        score *= 2;
      }
      
      totalScore += score;
    }
  }
  
  // Calculate confidence (0-1)
  const confidence = Math.min(1, totalScore / 5);
  
  // Sanitize input by removing detected patterns
  let sanitized = input;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }
  
  return {
    detected: detectedPatterns.length > 0,
    confidence,
    patterns: detectedPatterns,
    sanitized
  };
}

/**
 * Advanced input sanitization
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input;
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  // Remove zero-width and invisible characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060-\u2064]/g, '');
  
  // Normalize Unicode
  sanitized = sanitized.normalize('NFC');
  
  // Remove potential script tags and dangerous content
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT_REMOVED]');
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '[IFRAME_REMOVED]');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '[OBJECT_REMOVED]');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '[EMBED_REMOVED]');
  
  // Remove data URLs
  sanitized = sanitized.replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/gi, '[DATA_URL_REMOVED]');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:[^"'\s]*/gi, '[JS_URL_REMOVED]');
  
  // Remove vbscript: URLs
  sanitized = sanitized.replace(/vbscript:[^"'\s]*/gi, '[VBS_URL_REMOVED]');
  
  // Limit consecutive special characters
  sanitized = sanitized.replace(/([!@#$%^&*()_+={}\[\]|\\:";'<>?,.\/~`-])\1{3,}/g, '$1$1$1');
  
  // Normalize excessive whitespace
  sanitized = sanitized.replace(/\s{4,}/g, '   ');
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  // Trim and return
  return sanitized.trim();
}

/**
 * Validate Reddit comment content specifically
 */
export function validateRedditComment(comment: string): SecurityCheckResult {
  const baseCheck = performSecurityCheck(comment);
  
  // Additional Reddit-specific checks
  const additionalViolations: string[] = [];
  
  // Check for markdown injection attempts
  if (/\[.*\]\(javascript:/i.test(comment)) {
    additionalViolations.push('Markdown javascript injection detected');
  }
  
  // Check for excessive formatting (might be spam)
  const formattingChars = comment.match(/[*_~`\[\]()]/g) || [];
  if (formattingChars.length > comment.length * 0.2) {
    additionalViolations.push('Excessive markdown formatting detected');
  }
  
  // Check for potential bot signatures
  const botPatterns = [
    /^I am a bot/i,
    /beep boop/i,
    /this action was performed automatically/i,
    /contact the moderators/i
  ];
  
  for (const pattern of botPatterns) {
    if (pattern.test(comment)) {
      additionalViolations.push('Bot signature detected');
      break;
    }
  }
  
  return {
    safe: baseCheck.safe && additionalViolations.length === 0,
    risk: additionalViolations.length > 0 ? 'medium' : baseCheck.risk,
    violations: [...baseCheck.violations, ...additionalViolations],
    sanitized: baseCheck.sanitized
  };
}

/**
 * Check if content appears to be AI-generated (basic heuristics)
 */
export function detectAIGenerated(text: string): { likely: boolean; confidence: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;
  
  // Common AI phrases
  const aiPhrases = [
    /as an ai/i,
    /i'm an ai/i,
    /i don't have personal/i,
    /i can't browse the internet/i,
    /my knowledge cutoff/i,
    /according to my training/i,
    /i'm not able to/i,
    /i don't have the ability/i,
    /i can't provide real-time/i
  ];
  
  for (const phrase of aiPhrases) {
    if (phrase.test(text)) {
      indicators.push(`AI phrase: ${phrase.source}`);
      score += 3;
    }
  }
  
  // Overly formal language patterns
  if (/\b(furthermore|moreover|additionally|consequently|therefore)\b/gi.test(text)) {
    indicators.push('Overly formal language');
    score += 1;
  }
  
  // Perfect grammar (unusual for casual Reddit comments)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 2 && !/[a-z][A-Z]/.test(text) && !/\b(ur|u|tbh|lol|omg|wtf)\b/i.test(text)) {
    indicators.push('Unusually perfect grammar');
    score += 1;
  }
  
  // Generic responses
  const genericPatterns = [
    /thank you for sharing/i,
    /i hope this helps/i,
    /please let me know if/i,
    /feel free to ask/i,
    /i'm here to help/i
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(text)) {
      indicators.push('Generic AI response pattern');
      score += 2;
    }
  }
  
  const confidence = Math.min(1, score / 10);
  
  return {
    likely: confidence > 0.5,
    confidence,
    indicators
  };
}

/**
 * Rate limit based on security risk
 */
export function getSecurityBasedRateLimit(risk: SecurityCheckResult['risk']): number {
  switch (risk) {
    case 'critical': return 0; // Block entirely
    case 'high': return 1; // Very strict
    case 'medium': return 2; // Reduced limit
    case 'low': return 5; // Normal limit
    default: return 2;
  }
}

/**
 * Generate security report for monitoring
 */
export function generateSecurityReport(checks: SecurityCheckResult[]): {
  totalChecks: number;
  safeChecks: number;
  riskDistribution: Record<string, number>;
  commonViolations: Record<string, number>;
  securityScore: number;
} {
  const totalChecks = checks.length;
  const safeChecks = checks.filter(c => c.safe).length;
  
  const riskDistribution: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
  
  const commonViolations: Record<string, number> = {};
  
  for (const check of checks) {
    riskDistribution[check.risk]++;
    
    for (const violation of check.violations) {
      commonViolations[violation] = (commonViolations[violation] || 0) + 1;
    }
  }
  
  // Calculate security score (0-100)
  const securityScore = Math.round((safeChecks / Math.max(totalChecks, 1)) * 100);
  
  return {
    totalChecks,
    safeChecks,
    riskDistribution,
    commonViolations,
    securityScore
  };
}