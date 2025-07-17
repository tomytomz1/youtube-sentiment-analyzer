// Caching and replay protection system for Reddit sentiment analysis

export interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
  requestHash: string;
  accessCount: number;
  lastAccessed: number;
}

export interface ReplayProtectionEntry {
  requestHash: string;
  timestamp: number;
  ipHash: string;
  response: any;
  expiry: number;
}

// In-memory cache (in production, use Redis or similar)
const cache = new Map<string, CacheEntry>();
const replayProtection = new Map<string, ReplayProtectionEntry>();

// Cache configuration
const CACHE_TTL = 900000; // 15 minutes
const REPLAY_PROTECTION_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 1000;
const MAX_REPLAY_PROTECTION_SIZE = 5000;

// Cleanup intervals
let cacheCleanupInterval: NodeJS.Timeout | null = null;
let replayCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Generate a hash for cache keys and replay protection
 */
export function generateHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Generate a cache key for Reddit sentiment requests
 */
export function generateCacheKey(subreddit: string, threadId: string, maxComments: number = 100): string {
  return `reddit_sentiment:${subreddit}:${threadId}:${maxComments}`;
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key);
      removedCount++;
    }
  }
  
  // If cache is still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemove = cache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`Cache cleanup: removed ${removedCount} expired entries`);
  }
}

/**
 * Clean up expired replay protection entries
 */
function cleanupReplayProtection(): void {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [key, entry] of replayProtection.entries()) {
    if (now > entry.expiry) {
      replayProtection.delete(key);
      removedCount++;
    }
  }
  
  // If replay protection is still too large, remove oldest entries
  if (replayProtection.size > MAX_REPLAY_PROTECTION_SIZE) {
    const entries = Array.from(replayProtection.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = replayProtection.size - MAX_REPLAY_PROTECTION_SIZE;
    for (let i = 0; i < toRemove; i++) {
      replayProtection.delete(entries[i][0]);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`Replay protection cleanup: removed ${removedCount} expired entries`);
  }
}

/**
 * Initialize cache cleanup intervals
 */
export function initializeCache(): void {
  if (!cacheCleanupInterval) {
    cacheCleanupInterval = setInterval(cleanupCache, 300000); // Every 5 minutes
  }
  
  if (!replayCleanupInterval) {
    replayCleanupInterval = setInterval(cleanupReplayProtection, 600000); // Every 10 minutes
  }
}

/**
 * Shutdown cache and cleanup intervals
 */
export function shutdownCache(): void {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
  
  if (replayCleanupInterval) {
    clearInterval(replayCleanupInterval);
    replayCleanupInterval = null;
  }
  
  cache.clear();
  replayProtection.clear();
}

/**
 * Get cached analysis result
 */
export function getCachedAnalysis(cacheKey: string): CacheEntry | null {
  const entry = cache.get(cacheKey);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  
  // Check if entry has expired
  if (now > entry.expiry) {
    cache.delete(cacheKey);
    return null;
  }
  
  // Update access statistics
  entry.accessCount++;
  entry.lastAccessed = now;
  
  return entry;
}

/**
 * Store analysis result in cache
 */
export function setCachedAnalysis(
  cacheKey: string, 
  data: any, 
  requestHash: string,
  ttl: number = CACHE_TTL
): void {
  const now = Date.now();
  
  const entry: CacheEntry = {
    data,
    timestamp: now,
    expiry: now + ttl,
    requestHash,
    accessCount: 0,
    lastAccessed: now
  };
  
  cache.set(cacheKey, entry);
  
  // Trigger cleanup if cache is getting too large
  if (cache.size > MAX_CACHE_SIZE * 1.1) {
    cleanupCache();
  }
}

/**
 * Check for replay attacks - same request from same IP within time window
 */
export function checkReplayProtection(
  requestHash: string, 
  ipHash: string
): { isReplay: boolean; previousResponse?: any } {
  const existingEntry = replayProtection.get(requestHash);
  
  if (!existingEntry) {
    return { isReplay: false };
  }
  
  const now = Date.now();
  
  // Check if entry has expired
  if (now > existingEntry.expiry) {
    replayProtection.delete(requestHash);
    return { isReplay: false };
  }
  
  // Check if same IP made the same request recently
  if (existingEntry.ipHash === ipHash) {
    return { 
      isReplay: true, 
      previousResponse: existingEntry.response 
    };
  }
  
  return { isReplay: false };
}

/**
 * Record request for replay protection
 */
export function recordRequest(
  requestHash: string, 
  ipHash: string, 
  response: any,
  ttl: number = REPLAY_PROTECTION_TTL
): void {
  const now = Date.now();
  
  const entry: ReplayProtectionEntry = {
    requestHash,
    timestamp: now,
    ipHash,
    response,
    expiry: now + ttl
  };
  
  replayProtection.set(requestHash, entry);
  
  // Trigger cleanup if replay protection is getting too large
  if (replayProtection.size > MAX_REPLAY_PROTECTION_SIZE * 1.1) {
    cleanupReplayProtection();
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStatistics() {
  const now = Date.now();
  
  let cacheHits = 0;
  let cacheExpiredEntries = 0;
  let cacheValidEntries = 0;
  
  for (const entry of cache.values()) {
    if (now > entry.expiry) {
      cacheExpiredEntries++;
    } else {
      cacheValidEntries++;
      cacheHits += entry.accessCount;
    }
  }
  
  let replayValidEntries = 0;
  let replayExpiredEntries = 0;
  
  for (const entry of replayProtection.values()) {
    if (now > entry.expiry) {
      replayExpiredEntries++;
    } else {
      replayValidEntries++;
    }
  }
  
  return {
    cache: {
      totalEntries: cache.size,
      validEntries: cacheValidEntries,
      expiredEntries: cacheExpiredEntries,
      totalHits: cacheHits,
      memoryUsage: JSON.stringify(Array.from(cache.values())).length
    },
    replayProtection: {
      totalEntries: replayProtection.size,
      validEntries: replayValidEntries,
      expiredEntries: replayExpiredEntries,
      memoryUsage: JSON.stringify(Array.from(replayProtection.values())).length
    },
    configuration: {
      cacheTTL: CACHE_TTL,
      replayProtectionTTL: REPLAY_PROTECTION_TTL,
      maxCacheSize: MAX_CACHE_SIZE,
      maxReplayProtectionSize: MAX_REPLAY_PROTECTION_SIZE
    }
  };
}

/**
 * Invalidate cache entries for a specific subreddit (useful for moderation)
 */
export function invalidateCacheForSubreddit(subreddit: string): number {
  let invalidatedCount = 0;
  
  for (const [key] of cache.entries()) {
    if (key.includes(`reddit_sentiment:${subreddit}:`)) {
      cache.delete(key);
      invalidatedCount++;
    }
  }
  
  return invalidatedCount;
}

/**
 * Invalidate cache entries for a specific thread
 */
export function invalidateCacheForThread(subreddit: string, threadId: string): number {
  let invalidatedCount = 0;
  
  for (const [key] of cache.entries()) {
    if (key.includes(`reddit_sentiment:${subreddit}:${threadId}:`)) {
      cache.delete(key);
      invalidatedCount++;
    }
  }
  
  return invalidatedCount;
}

/**
 * Preemptively warm cache for popular threads
 */
export function warmCache(popularThreads: Array<{ subreddit: string; threadId: string }>): void {
  // This would be called by a background job in production
  console.log(`Cache warming scheduled for ${popularThreads.length} threads`);
  
  // In a real implementation, this would trigger background analysis
  // for popular threads to ensure they're cached when users request them
}

/**
 * Get cache health score (0-100, higher is better)
 */
export function getCacheHealthScore(): number {
  const stats = getCacheStatistics();
  
  let score = 100;
  
  // Reduce score for high memory usage
  const maxMemoryUsage = 50 * 1024 * 1024; // 50MB
  const currentMemoryUsage = stats.cache.memoryUsage + stats.replayProtection.memoryUsage;
  
  if (currentMemoryUsage > maxMemoryUsage) {
    score -= Math.min(30, (currentMemoryUsage - maxMemoryUsage) / maxMemoryUsage * 30);
  }
  
  // Reduce score for too many expired entries
  const expiredRatio = stats.cache.expiredEntries / Math.max(stats.cache.totalEntries, 1);
  if (expiredRatio > 0.2) {
    score -= expiredRatio * 20;
  }
  
  // Reduce score if cache is too full
  const cacheFillRatio = stats.cache.totalEntries / MAX_CACHE_SIZE;
  if (cacheFillRatio > 0.9) {
    score -= (cacheFillRatio - 0.9) * 100;
  }
  
  return Math.max(0, Math.round(score));
}

// Initialize cache when module is loaded
initializeCache();