// Advanced language detection and translation utilities

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  script?: string;
  region?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  provider: string;
}

export interface MultilingualAnalysis {
  primaryLanguage: string;
  languageDistribution: Record<string, number>;
  nonEnglishComments: Array<{
    language: string;
    comment: string;
    sentiment: string;
    translated?: string;
    confidence: number;
  }>;
  languageDetectionConfidence: number;
  translationNotes: string;
  needsTranslation: boolean;
  supportedForAnalysis: boolean;
}

// Language patterns and common words for basic detection
const LANGUAGE_PATTERNS = {
  en: {
    patterns: [
      /\b(the|and|that|have|for|not|with|you|this|but|his|from|they)\b/gi,
      /\b(said|each|which|their|time|will|about|would|there|could|other)\b/gi,
      /ing\b/gi, /tion\b/gi, /ness\b/gi
    ],
    commonWords: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'],
    weight: 1.0
  },
  es: {
    patterns: [
      /\b(el|la|de|que|y|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|las)\b/gi,
      /\b(está|tiene|hace|muy|más|todo|bien|ese|como|año|hasta|puede|así)\b/gi,
      /ción\b/gi, /mente\b/gi, /ando\b/gi, /iendo\b/gi
    ],
    commonWords: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con'],
    weight: 0.9
  },
  fr: {
    patterns: [
      /\b(le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se)\b/gi,
      /\b(pas|tout|le|sa|homme|elle|ou|comme|lui|nous|temps|très|état|sans|peut)\b/gi,
      /tion\b/gi, /ment\b/gi, /eur\b/gi, /eau\b/gi
    ],
    commonWords: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une'],
    weight: 0.9
  },
  de: {
    patterns: [
      /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine)\b/gi,
      /\b(auch|er|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|sind|noch)\b/gi,
      /ung\b/gi, /keit\b/gi, /lich\b/gi, /sch\b/gi
    ],
    commonWords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im'],
    weight: 0.9
  },
  pt: {
    patterns: [
      /\b(de|a|o|e|do|da|em|um|para|é|com|não|uma|os|no|se|na|por|mais|as|dos)\b/gi,
      /\b(que|eu|está|ter|seu|essa|ele|você|foi|pode|ela|já|tem|ao|muito|como)\b/gi,
      /ção\b/gi, /mente\b/gi, /ando\b/gi, /endo\b/gi
    ],
    commonWords: ['de', 'a', 'o', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se'],
    weight: 0.9
  },
  it: {
    patterns: [
      /\b(di|che|e|la|il|un|a|per|in|del|è|da|con|le|si|una|non|al|lo|gli|dei)\b/gi,
      /\b(come|suo|più|anche|tutto|dalla|nella|molto|quando|essere|tra|dove|cosa)\b/gi,
      /zione\b/gi, /mente\b/gi, /ando\b/gi, /endo\b/gi
    ],
    commonWords: ['di', 'che', 'e', 'la', 'il', 'un', 'a', 'per', 'in', 'del', 'è', 'da', 'con', 'le', 'si', 'una'],
    weight: 0.9
  },
  ru: {
    patterns: [
      /[а-яё]/gi, // Cyrillic characters
      /\b(в|и|не|на|я|быть|с|что|а|по|это|она|к|но|они|мы|как|из|у|который|о|до)\b/gi
    ],
    commonWords: ['в', 'и', 'не', 'на', 'я', 'быть', 'с', 'что', 'а', 'по', 'это', 'она', 'к', 'но', 'они'],
    weight: 0.8
  },
  ja: {
    patterns: [
      /[\u3040-\u309F]/g, // Hiragana
      /[\u30A0-\u30FF]/g, // Katakana
      /[\u4E00-\u9FAF]/g  // Kanji
    ],
    commonWords: ['は', 'が', 'を', 'に', 'の', 'と', 'で', 'から', 'まで', 'より'],
    weight: 0.8
  },
  ko: {
    patterns: [
      /[\uAC00-\uD7AF]/g, // Hangul
      /[\u3130-\u318F]/g  // Hangul Compatibility Jamo
    ],
    commonWords: ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '로'],
    weight: 0.8
  },
  zh: {
    patterns: [
      /[\u4E00-\u9FFF]/g, // Chinese characters
      /[\u3400-\u4DBF]/g  // CJK Extension A
    ],
    commonWords: ['的', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '上', '也', '很', '到', '说'],
    weight: 0.8
  },
  ar: {
    patterns: [
      /[\u0600-\u06FF]/g, // Arabic
      /[\u0750-\u077F]/g  // Arabic Supplement
    ],
    commonWords: ['في', 'من', 'إلى', 'على', 'أن', 'هذا', 'هذه', 'كان', 'التي', 'ما', 'لا', 'كل', 'أو'],
    weight: 0.8
  }
};

// Supported languages for sentiment analysis
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'it'];

// Languages that need translation for analysis
const TRANSLATION_REQUIRED = ['ru', 'ja', 'ko', 'zh', 'ar'];

/**
 * Detect language of a text using pattern matching and statistical analysis
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.length < 10) {
    return { language: 'unknown', confidence: 0 };
  }
  
  const cleanText = text.toLowerCase().replace(/[^\w\s\u0100-\uFFFF]/g, ' ');
  const words = cleanText.split(/\s+/).filter(word => word.length > 1);
  
  if (words.length < 3) {
    return { language: 'unknown', confidence: 0 };
  }
  
  const scores: Record<string, number> = {};
  
  // Score each language
  for (const [lang, config] of Object.entries(LANGUAGE_PATTERNS)) {
    let score = 0;
    
    // Pattern matching
    for (const pattern of config.patterns) {
      const matches = cleanText.match(pattern) || [];
      score += matches.length * 0.5;
    }
    
    // Common word matching
    let commonWordMatches = 0;
    for (const word of words) {
      if (config.commonWords.includes(word)) {
        commonWordMatches++;
      }
    }
    
    score += (commonWordMatches / words.length) * 10 * config.weight;
    scores[lang] = score;
  }
  
  // Find best match
  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0);
  
  if (sortedScores.length === 0) {
    return { language: 'unknown', confidence: 0 };
  }
  
  const [bestLang, bestScore] = sortedScores[0];
  const secondBestScore = sortedScores[1]?.[1] || 0;
  
  // Calculate confidence based on score difference
  const maxPossibleScore = words.length;
  const normalizedScore = Math.min(bestScore / maxPossibleScore, 1);
  const confidencePenalty = secondBestScore > 0 ? (bestScore - secondBestScore) / bestScore : 1;
  const confidence = normalizedScore * confidencePenalty;
  
  return {
    language: bestLang,
    confidence: Math.min(0.99, Math.max(0, confidence)),
    script: getScript(bestLang)
  };
}

/**
 * Detect language distribution across multiple comments
 */
export function analyzeLanguageDistribution(comments: string[]): {
  distribution: Record<string, number>;
  primaryLanguage: string;
  confidence: number;
  needsTranslation: string[];
} {
  const distribution: Record<string, number> = {};
  const needsTranslation: string[] = [];
  let totalConfidence = 0;
  
  for (const comment of comments) {
    if (!comment || comment.length < 10) continue;
    
    const detection = detectLanguage(comment);
    if (detection.confidence > 0.3) {
      distribution[detection.language] = (distribution[detection.language] || 0) + 1;
      totalConfidence += detection.confidence;
      
      if (TRANSLATION_REQUIRED.includes(detection.language)) {
        needsTranslation.push(comment);
      }
    } else {
      distribution['unknown'] = (distribution['unknown'] || 0) + 1;
    }
  }
  
  // Convert to percentages
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total > 0) {
    for (const [lang, count] of Object.entries(distribution)) {
      distribution[lang] = Math.round((count / total) * 100);
    }
  }
  
  // Find primary language
  const sortedLanguages = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .filter(([lang]) => lang !== 'unknown');
  
  const primaryLanguage = sortedLanguages[0]?.[0] || 'en';
  const overallConfidence = totalConfidence / Math.max(comments.length, 1);
  
  return {
    distribution,
    primaryLanguage,
    confidence: Math.min(0.99, overallConfidence),
    needsTranslation
  };
}

/**
 * Basic translation using pattern replacement (for demonstration)
 * In production, use Google Translate API, Azure Translator, or similar
 */
export async function translateText(
  text: string, 
  targetLanguage: string = 'en',
  sourceLanguage?: string
): Promise<TranslationResult> {
  // Detect source language if not provided
  if (!sourceLanguage) {
    const detection = detectLanguage(text);
    sourceLanguage = detection.language;
    
    if (detection.confidence < 0.5) {
      throw new Error('Could not reliably detect source language');
    }
  }
  
  // If already in target language, return as-is
  if (sourceLanguage === targetLanguage) {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage,
      targetLanguage,
      confidence: 1.0,
      provider: 'no_translation_needed'
    };
  }
  
  // Simple pattern-based translation for common phrases
  // In production, replace with actual translation service
  const translatedText = await mockTranslate(text, sourceLanguage);
  
  return {
    originalText: text,
    translatedText,
    sourceLanguage,
    targetLanguage,
    confidence: 0.8, // Mock confidence
    provider: 'mock_translator'
  };
}

/**
 * Analyze multilingual content for sentiment analysis
 */
export async function analyzeMultilingualContent(comments: Array<{
  text: string;
  author: string;
  metadata?: any;
}>): Promise<MultilingualAnalysis> {
  const commentTexts = comments.map(c => c.text);
  const languageAnalysis = analyzeLanguageDistribution(commentTexts);
  
  const nonEnglishComments: MultilingualAnalysis['nonEnglishComments'] = [];
  
  // Process non-English comments
  for (const comment of comments) {
    const detection = detectLanguage(comment.text);
    
    if (detection.language !== 'en' && detection.confidence > 0.5) {
      let translated: string | undefined;
      
      // Translate if possible and needed
      if (TRANSLATION_REQUIRED.includes(detection.language)) {
        try {
          const translation = await translateText(comment.text, 'en', detection.language);
          translated = translation.translatedText;
        } catch (error) {
          console.warn(`Translation failed for ${detection.language}:`, error);
        }
      }
      
      nonEnglishComments.push({
        language: detection.language,
        comment: comment.text.slice(0, 200), // Truncate for storage
        sentiment: 'unknown', // Will be filled by sentiment analysis
        translated,
        confidence: detection.confidence
      });
    }
  }
  
  const supportedLanguagePercentage = Object.entries(languageAnalysis.distribution)
    .filter(([lang]) => SUPPORTED_LANGUAGES.includes(lang))
    .reduce((sum, [, percent]) => sum + percent, 0);
  
  return {
    primaryLanguage: languageAnalysis.primaryLanguage,
    languageDistribution: languageAnalysis.distribution,
    nonEnglishComments,
    languageDetectionConfidence: languageAnalysis.confidence,
    translationNotes: generateTranslationNotes(languageAnalysis, nonEnglishComments.length),
    needsTranslation: languageAnalysis.needsTranslation.length > 0,
    supportedForAnalysis: supportedLanguagePercentage >= 70
  };
}

/**
 * Get script/writing system for a language
 */
function getScript(language: string): string {
  const scripts: Record<string, string> = {
    en: 'Latin',
    es: 'Latin',
    fr: 'Latin',
    de: 'Latin',
    pt: 'Latin',
    it: 'Latin',
    ru: 'Cyrillic',
    ja: 'Japanese',
    ko: 'Hangul',
    zh: 'Chinese',
    ar: 'Arabic'
  };
  
  return scripts[language] || 'Unknown';
}

/**
 * Generate translation notes for the analysis
 */
function generateTranslationNotes(
  languageAnalysis: { distribution: Record<string, number>; primaryLanguage: string },
  nonEnglishCount: number
): string {
  const { distribution, primaryLanguage } = languageAnalysis;
  const englishPercentage = distribution.en || 0;
  
  if (englishPercentage >= 95) {
    return 'Content is primarily in English - no translation required.';
  }
  
  if (nonEnglishCount === 0) {
    return 'All content detected as English or supported languages.';
  }
  
  const nonEnglishLanguages = Object.entries(distribution)
    .filter(([lang, percent]) => lang !== 'en' && percent > 5)
    .map(([lang, percent]) => `${lang} (${percent}%)`)
    .join(', ');
  
  if (nonEnglishLanguages) {
    return `${nonEnglishCount} non-English comments detected in: ${nonEnglishLanguages}. ` +
           (TRANSLATION_REQUIRED.includes(primaryLanguage) 
             ? 'Auto-translation attempted for sentiment analysis.' 
             : 'Language supported for direct analysis.');
  }
  
  return `${nonEnglishCount} non-English comments detected and processed for analysis.`;
}

/**
 * Mock translation function (replace with actual service in production)
 */
async function mockTranslate(text: string, from: string): Promise<string> {
  // Simple mock translations for common phrases
  const mockTranslations: Record<string, Record<string, string>> = {
    es: {
      'Esto es una locura política.': 'This is political madness.',
      'Me gusta mucho': 'I like it a lot',
      'No me gusta': 'I don\'t like it',
      'Qué interesante': 'How interesting',
      'Muy malo': 'Very bad',
      'Excelente': 'Excellent'
    },
    fr: {
      'Encore des changements inutiles.': 'More useless changes.',
      'C\'est très bien': 'It\'s very good',
      'Je n\'aime pas': 'I don\'t like it',
      'Très intéressant': 'Very interesting',
      'Mauvais': 'Bad',
      'Excellent': 'Excellent'
    },
    de: {
      'Das ist interessant': 'That is interesting',
      'Sehr gut': 'Very good',
      'Gefällt mir nicht': 'I don\'t like it',
      'Ausgezeichnet': 'Excellent'
    }
  };
  
  // Check for exact matches first
  if (mockTranslations[from]?.[text]) {
    return mockTranslations[from][text];
  }
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return placeholder translation for demo
  return `[Translated from ${from}]: ${text}`;
}

/**
 * Check if a language is supported for sentiment analysis
 */
export function isLanguageSupported(language: string): boolean {
  return SUPPORTED_LANGUAGES.includes(language);
}

/**
 * Get language support information
 */
export function getLanguageSupportInfo(): {
  supported: string[];
  requiresTranslation: string[];
  detectable: string[];
} {
  return {
    supported: SUPPORTED_LANGUAGES,
    requiresTranslation: TRANSLATION_REQUIRED,
    detectable: Object.keys(LANGUAGE_PATTERNS)
  };
}