// Data retention and cleanup policies for Reddit sentiment analyzer

export interface RetentionPolicy {
  name: string;
  description: string;
  retentionPeriod: number; // in milliseconds
  maxSize: number; // maximum number of records
  cleanupInterval: number; // how often to run cleanup
  autoCleanup: boolean;
}

export interface DataRecord {
  id: string;
  timestamp: number;
  type: 'audit_log' | 'analysis_result' | 'cache_entry' | 'error_log' | 'performance_metric';
  data: any;
  size: number; // estimated size in bytes
  metadata?: {
    ip?: string;
    userAgent?: string;
    subreddit?: string;
    threadId?: string;
    processingTime?: number;
    success?: boolean;
  };
}

// Retention policies for different data types
const RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  audit_log: {
    name: 'Audit Log Retention',
    description: 'Security and compliance audit logs',
    retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
    maxSize: 10000,
    cleanupInterval: 24 * 60 * 60 * 1000, // Daily
    autoCleanup: true
  },
  analysis_result: {
    name: 'Analysis Result Cache',
    description: 'Cached sentiment analysis results',
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 1000,
    cleanupInterval: 6 * 60 * 60 * 1000, // Every 6 hours
    autoCleanup: true
  },
  error_log: {
    name: 'Error Log Retention',
    description: 'Application error logs for debugging',
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxSize: 5000,
    cleanupInterval: 24 * 60 * 60 * 1000, // Daily
    autoCleanup: true
  },
  performance_metric: {
    name: 'Performance Metrics',
    description: 'API performance and usage metrics',
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxSize: 50000,
    cleanupInterval: 6 * 60 * 60 * 1000, // Every 6 hours
    autoCleanup: true
  },
  cache_entry: {
    name: 'Cache Entries',
    description: 'Temporary cache entries for API responses',
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 2000,
    cleanupInterval: 60 * 60 * 1000, // Hourly
    autoCleanup: true
  }
};

// In-memory data stores (in production, use proper database)
const dataStores = new Map<string, Map<string, DataRecord>>();
const cleanupIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Initialize data stores and cleanup intervals
 */
export function initializeDataRetention(): void {
  for (const [type, policy] of Object.entries(RETENTION_POLICIES)) {
    if (!dataStores.has(type)) {
      dataStores.set(type, new Map());
    }
    
    if (policy.autoCleanup && !cleanupIntervals.has(type)) {
      const interval = setInterval(() => {
        cleanupDataType(type);
      }, policy.cleanupInterval);
      
      cleanupIntervals.set(type, interval);
    }
  }
  
  console.log('Data retention system initialized');
}

/**
 * Shutdown data retention system
 */
export function shutdownDataRetention(): void {
  for (const interval of cleanupIntervals.values()) {
    clearInterval(interval);
  }
  cleanupIntervals.clear();
  
  // In production, you might want to persist important data before shutdown
  dataStores.clear();
  
  console.log('Data retention system shutdown');
}

/**
 * Store a data record with automatic retention management
 */
export function storeDataRecord(record: DataRecord): void {
  const store = dataStores.get(record.type);
  if (!store) {
    console.error(`No data store found for type: ${record.type}`);
    return;
  }
  
  // Add timestamp if not present
  if (!record.timestamp) {
    record.timestamp = Date.now();
  }
  
  // Estimate size if not provided
  if (!record.size) {
    record.size = estimateRecordSize(record);
  }
  
  // Store the record
  store.set(record.id, record);
  
  // Check if immediate cleanup is needed
  const policy = RETENTION_POLICIES[record.type];
  if (store.size > policy.maxSize * 1.1) {
    cleanupDataType(record.type);
  }
}

/**
 * Retrieve data records with optional filtering
 */
export function getDataRecords(
  type: string,
  filters?: {
    since?: number;
    until?: number;
    limit?: number;
    subreddit?: string;
    success?: boolean;
  }
): DataRecord[] {
  const store = dataStores.get(type);
  if (!store) {
    return [];
  }
  
  let records = Array.from(store.values());
  
  // Apply filters
  if (filters) {
    if (filters.since) {
      records = records.filter(r => r.timestamp >= filters.since!);
    }
    
    if (filters.until) {
      records = records.filter(r => r.timestamp <= filters.until!);
    }
    
    if (filters.subreddit && filters.subreddit !== 'all') {
      records = records.filter(r => r.metadata?.subreddit === filters.subreddit);
    }
    
    if (filters.success !== undefined) {
      records = records.filter(r => r.metadata?.success === filters.success);
    }
  }
  
  // Sort by timestamp (newest first)
  records.sort((a, b) => b.timestamp - a.timestamp);
  
  // Apply limit
  if (filters?.limit) {
    records = records.slice(0, filters.limit);
  }
  
  return records;
}

/**
 * Clean up expired data for a specific type
 */
export function cleanupDataType(type: string): { removed: number; totalSize: number } {
  const store = dataStores.get(type);
  const policy = RETENTION_POLICIES[type];
  
  if (!store || !policy) {
    return { removed: 0, totalSize: 0 };
  }
  
  const now = Date.now();
  const cutoffTime = now - policy.retentionPeriod;
  let removedCount = 0;
  let totalSize = 0;
  
  // Remove expired records
  for (const [id, record] of store.entries()) {
    if (record.timestamp < cutoffTime) {
      store.delete(id);
      removedCount++;
    } else {
      totalSize += record.size;
    }
  }
  
  // If still over size limit, remove oldest records
  if (store.size > policy.maxSize) {
    const records = Array.from(store.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first
    
    const toRemove = store.size - policy.maxSize;
    for (let i = 0; i < toRemove && i < records.length; i++) {
      store.delete(records[i][0]);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`Data cleanup for ${type}: removed ${removedCount} records`);
  }
  
  return { removed: removedCount, totalSize };
}

/**
 * Clean up all data types
 */
export function cleanupAllData(): Record<string, { removed: number; totalSize: number }> {
  const results: Record<string, { removed: number; totalSize: number }> = {};
  
  for (const type of Object.keys(RETENTION_POLICIES)) {
    results[type] = cleanupDataType(type);
  }
  
  return results;
}

/**
 * Get data retention statistics
 */
export function getRetentionStatistics(): Record<string, {
  policy: RetentionPolicy;
  currentCount: number;
  currentSize: number;
  oldestRecord: number | null;
  newestRecord: number | null;
}> {
  const stats: Record<string, any> = {};
  
  for (const [type, policy] of Object.entries(RETENTION_POLICIES)) {
    const store = dataStores.get(type);
    if (!store) continue;
    
    const records = Array.from(store.values());
    const currentCount = records.length;
    const currentSize = records.reduce((sum, r) => sum + r.size, 0);
    
    const timestamps = records.map(r => r.timestamp).sort((a, b) => a - b);
    const oldestRecord = timestamps.length > 0 ? timestamps[0] : null;
    const newestRecord = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;
    
    stats[type] = {
      policy,
      currentCount,
      currentSize,
      oldestRecord,
      newestRecord
    };
  }
  
  return stats;
}

/**
 * Estimate the size of a data record in bytes
 */
function estimateRecordSize(record: DataRecord): number {
  try {
    const jsonString = JSON.stringify(record);
    return Buffer.byteLength(jsonString, 'utf8');
  } catch {
    // Fallback estimation
    return 1000; // Default 1KB
  }
}

/**
 * Export data for compliance/backup purposes
 */
export function exportData(
  type: string,
  format: 'json' | 'csv' = 'json',
  filters?: {
    since?: number;
    until?: number;
    anonymize?: boolean;
  }
): string {
  const records = getDataRecords(type, filters);
  
  if (filters?.anonymize) {
    // Remove PII and sensitive data
    records.forEach(record => {
      if (record.metadata) {
        delete record.metadata.ip;
        delete record.metadata.userAgent;
        
        // Hash the thread ID for privacy
        if (record.metadata.threadId) {
          record.metadata.threadId = `hash_${hashString(record.metadata.threadId)}`;
        }
      }
    });
  }
  
  if (format === 'csv') {
    return convertToCSV(records);
  }
  
  return JSON.stringify(records, null, 2);
}

/**
 * Delete all data for a specific subreddit (for GDPR compliance)
 */
export function deleteSubredditData(subreddit: string): {
  type: string;
  deletedCount: number;
}[] {
  const results: { type: string; deletedCount: number }[] = [];
  
  for (const [type, store] of dataStores.entries()) {
    let deletedCount = 0;
    
    for (const [id, record] of store.entries()) {
      if (record.metadata?.subreddit === subreddit) {
        store.delete(id);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      results.push({ type, deletedCount });
    }
  }
  
  return results;
}

/**
 * Get data retention compliance report
 */
export function getComplianceReport(): {
  overallCompliance: boolean;
  issues: string[];
  recommendations: string[];
  dataTypes: Record<string, {
    compliant: boolean;
    issues: string[];
    recordCount: number;
    oldestRecordAge: number;
  }>;
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const dataTypes: Record<string, any> = {};
  
  const stats = getRetentionStatistics();
  
  for (const [type, stat] of Object.entries(stats)) {
    const typeIssues: string[] = [];
    const now = Date.now();
    
    // Check if records exceed retention period
    if (stat.oldestRecord && (now - stat.oldestRecord) > stat.policy.retentionPeriod) {
      typeIssues.push('Records exceed retention period');
      issues.push(`${type}: Records exceed retention period`);
    }
    
    // Check if record count exceeds limit
    if (stat.currentCount > stat.policy.maxSize) {
      typeIssues.push('Record count exceeds limit');
      issues.push(`${type}: Record count (${stat.currentCount}) exceeds limit (${stat.policy.maxSize})`);
    }
    
    // Check storage size
    const sizeMB = stat.currentSize / (1024 * 1024);
    if (sizeMB > 100) { // 100MB threshold
      typeIssues.push('High storage usage');
      recommendations.push(`${type}: Consider reducing retention period or record size`);
    }
    
    dataTypes[type] = {
      compliant: typeIssues.length === 0,
      issues: typeIssues,
      recordCount: stat.currentCount,
      oldestRecordAge: stat.oldestRecord ? now - stat.oldestRecord : 0
    };
  }
  
  return {
    overallCompliance: issues.length === 0,
    issues,
    recommendations,
    dataTypes
  };
}

/**
 * Helper function to convert records to CSV
 */
function convertToCSV(records: DataRecord[]): string {
  if (records.length === 0) return '';
  
  const headers = ['id', 'timestamp', 'type', 'size'];
  const rows = records.map(record => [
    record.id,
    new Date(record.timestamp).toISOString(),
    record.type,
    record.size.toString()
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Simple hash function for anonymization
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Initialize data retention system when module loads
initializeDataRetention();