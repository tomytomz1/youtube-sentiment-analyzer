// Astro hooks integration and compatibility checks for Reddit sentiment analyzer

export interface HookResult {
  success: boolean;
  blocked?: boolean;
  message?: string;
  modifiedData?: any;
  processingTime?: number;
}

export interface HookContext {
  request: Request;
  url: URL;
  params: Record<string, any>;
  locals: Record<string, any>;
  cookies: any;
  timestamp: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface HookConfiguration {
  enabled: boolean;
  timeout: number; // milliseconds
  retryCount: number;
  fallbackBehavior: 'allow' | 'block' | 'warn';
  hooks: {
    beforeRequest?: string[];
    afterRequest?: string[];
    onError?: string[];
    beforeAnalysis?: string[];
    afterAnalysis?: string[];
  };
}

// Default hook configuration
const DEFAULT_HOOK_CONFIG: HookConfiguration = {
  enabled: true,
  timeout: 5000, // 5 seconds
  retryCount: 2,
  fallbackBehavior: 'warn',
  hooks: {
    beforeRequest: [],
    afterRequest: [],
    onError: [],
    beforeAnalysis: [],
    afterAnalysis: []
  }
};

// Hook execution results storage
const hookExecutionResults = new Map<string, HookResult[]>();

/**
 * Load hook configuration from environment or settings
 */
export function loadHookConfiguration(): HookConfiguration {
  try {
    // Check for Astro hook configuration in environment
    const configStr = process.env.ASTRO_HOOKS_CONFIG || '{}';
    const envConfig = JSON.parse(configStr);
    
    return {
      ...DEFAULT_HOOK_CONFIG,
      ...envConfig
    };
  } catch (error) {
    console.warn('Failed to load hook configuration, using defaults:', error);
    return DEFAULT_HOOK_CONFIG;
  }
}

/**
 * Check if hooks are properly configured and accessible
 */
export async function checkHookCompatibility(): Promise<{
  compatible: boolean;
  issues: string[];
  recommendations: string[];
  hookStatus: Record<string, 'available' | 'missing' | 'error'>;
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const hookStatus: Record<string, 'available' | 'missing' | 'error'> = {};
  
  const config = loadHookConfiguration();
  
  // Check if Astro environment is available
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    issues.push('Astro environment not detected');
    recommendations.push('Ensure this code runs within an Astro application');
  }
  
  // Check each configured hook
  for (const [hookType, hookNames] of Object.entries(config.hooks)) {
    if (!hookNames || !Array.isArray(hookNames)) continue;
    
    for (const hookName of hookNames) {
      try {
        // Attempt to resolve hook module (simulated check)
        hookStatus[hookName] = 'available'; // Simulated check
        
        // In a real implementation, you would try to import the hook:
        // const hookModule = await import(hookPath);
        // if (typeof hookModule.default !== 'function') {
        //   throw new Error('Hook does not export a default function');
        // }
        
      } catch (error) {
        hookStatus[hookName] = 'error';
        issues.push(`Hook '${hookName}' (${hookType}) failed to load: ${error}`);
        recommendations.push(`Check that hook '${hookName}' exists and exports a default function`);
      }
    }
  }
  
  // Check hook timeout settings
  if (config.timeout > 30000) {
    issues.push('Hook timeout is very high (>30s) - may impact API performance');
    recommendations.push('Consider reducing hook timeout to under 10 seconds');
  }
  
  // Check retry configuration
  if (config.retryCount > 5) {
    issues.push('Hook retry count is very high - may cause delays');
    recommendations.push('Consider reducing retry count to 3 or fewer');
  }
  
  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
    hookStatus
  };
}

/**
 * Execute a specific hook with error handling and timeout
 */
export async function executeHook(
  hookName: string,
  hookType: string,
  context: HookContext,
  data?: any
): Promise<HookResult> {
  const startTime = Date.now();
  const config = loadHookConfiguration();
  
  if (!config.enabled) {
    return { success: true, message: 'Hooks disabled' };
  }
  
  // Check if this hook type is configured
  const hooksForType = config.hooks[hookType as keyof typeof config.hooks];
  if (!hooksForType || !hooksForType.includes(hookName)) {
    return { success: true, message: 'Hook not configured for this type' };
  }
  
  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 0; attempt <= config.retryCount; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Hook execution timeout')), config.timeout);
      });
      
      // Execute hook (simulated - in real implementation, dynamically import and execute)
      const hookPromise = simulateHookExecution(hookName, context, data);
      
      const result = await Promise.race([hookPromise, timeoutPromise]);
      
      const processingTime = Date.now() - startTime;
      
      // Store execution result
      const executionId = `${hookType}_${hookName}_${context.timestamp}`;
      if (!hookExecutionResults.has(executionId)) {
        hookExecutionResults.set(executionId, []);
      }
      hookExecutionResults.get(executionId)!.push({
        ...result,
        processingTime
      });
      
      return {
        ...result,
        processingTime
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < config.retryCount) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
    }
  }
  
  // All retries failed
  const processingTime = Date.now() - startTime;
  const result: HookResult = {
    success: false,
    blocked: config.fallbackBehavior === 'block',
    message: `Hook '${hookName}' failed after ${config.retryCount + 1} attempts: ${lastError?.message}`,
    processingTime
  };
  
  // Handle fallback behavior
  switch (config.fallbackBehavior) {
    case 'block':
      result.blocked = true;
      break;
    case 'warn':
      console.warn(`Hook '${hookName}' failed, continuing with warning:`, lastError?.message);
      result.success = true; // Allow continuation
      break;
    case 'allow':
      result.success = true; // Silently continue
      break;
  }
  
  return result;
}

/**
 * Execute multiple hooks in sequence
 */
export async function executeHooks(
  hookType: string,
  context: HookContext,
  data?: any
): Promise<{
  success: boolean;
  results: Record<string, HookResult>;
  blockedBy?: string;
  totalProcessingTime: number;
}> {
  const startTime = Date.now();
  const config = loadHookConfiguration();
  const hooksForType = config.hooks[hookType as keyof typeof config.hooks] || [];
  
  const results: Record<string, HookResult> = {};
  
  for (const hookName of hooksForType) {
    const result = await executeHook(hookName, hookType, context, data);
    results[hookName] = result;
    
    // If any hook blocks the request, stop execution
    if (result.blocked) {
      return {
        success: false,
        results,
        blockedBy: hookName,
        totalProcessingTime: Date.now() - startTime
      };
    }
    
    // If hook modified the data, use the modified version for subsequent hooks
    if (result.modifiedData) {
      data = result.modifiedData;
    }
  }
  
  return {
    success: true,
    results,
    totalProcessingTime: Date.now() - startTime
  };
}

/**
 * Create hook context from Astro request
 */
export function createHookContext(request: Request, additionalParams?: Record<string, any>): HookContext {
  const url = new URL(request.url);
  
  return {
    request,
    url,
    params: additionalParams || {},
    locals: {}, // In real Astro app, this would be Astro.locals
    cookies: {}, // In real Astro app, this would be Astro.cookies
    timestamp: Date.now(),
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               undefined
  };
}

/**
 * Simulated hook execution (replace with actual dynamic import in production)
 */
async function simulateHookExecution(
  hookName: string,
  context: HookContext,
  data?: any
): Promise<HookResult> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  
  // Simulate different hook behaviors
  switch (hookName) {
    case 'rate-limit-check':
      return {
        success: true,
        message: 'Rate limit check passed'
      };
      
    case 'security-scanner':
      // Simulate security check
      if (context.url.searchParams.get('malicious') === 'true') {
        return {
          success: false,
          blocked: true,
          message: 'Security violation detected'
        };
      }
      return {
        success: true,
        message: 'Security check passed'
      };
      
    case 'analytics-tracker':
      return {
        success: true,
        message: 'Analytics event tracked'
      };
      
    case 'data-enricher':
      return {
        success: true,
        message: 'Data enriched',
        modifiedData: {
          ...data,
          enriched: true,
          enrichmentTimestamp: new Date().toISOString()
        }
      };
      
    case 'cache-invalidator':
      return {
        success: true,
        message: 'Cache invalidation triggered'
      };
      
    default:
      return {
        success: true,
        message: `Hook '${hookName}' executed successfully`
      };
  }
}

/**
 * Get hook execution statistics
 */
export function getHookStatistics(): {
  totalExecutions: number;
  successRate: number;
  averageProcessingTime: number;
  hookPerformance: Record<string, {
    executions: number;
    successRate: number;
    averageTime: number;
  }>;
  recentFailures: Array<{
    hookName: string;
    timestamp: number;
    error: string;
  }>;
} {
  const allResults = Array.from(hookExecutionResults.values()).flat();
  const totalExecutions = allResults.length;
  const successfulExecutions = allResults.filter(r => r.success).length;
  const totalProcessingTime = allResults.reduce((sum, r) => sum + (r.processingTime || 0), 0);
  
  const hookPerformance: Record<string, any> = {};
  const recentFailures: any[] = [];
  
  // Analyze results by hook
  for (const [executionId, results] of hookExecutionResults.entries()) {
    const [, hookName] = executionId.split('_');
    
    if (!hookPerformance[hookName]) {
      hookPerformance[hookName] = {
        executions: 0,
        successCount: 0,
        totalTime: 0
      };
    }
    
    for (const result of results) {
      hookPerformance[hookName].executions++;
      hookPerformance[hookName].totalTime += result.processingTime || 0;
      
      if (result.success) {
        hookPerformance[hookName].successCount++;
      } else {
        recentFailures.push({
          hookName,
          timestamp: Date.now(), // In real implementation, track actual timestamp
          error: result.message || 'Unknown error'
        });
      }
    }
  }
  
  // Calculate rates and averages
  for (const [hookName, stats] of Object.entries(hookPerformance)) {
    const typedStats = stats as any;
    hookPerformance[hookName] = {
      executions: typedStats.executions,
      successRate: typedStats.executions > 0 ? typedStats.successCount / typedStats.executions : 0,
      averageTime: typedStats.executions > 0 ? typedStats.totalTime / typedStats.executions : 0
    };
  }
  
  return {
    totalExecutions,
    successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 1,
    averageProcessingTime: totalExecutions > 0 ? totalProcessingTime / totalExecutions : 0,
    hookPerformance,
    recentFailures: recentFailures.slice(-10) // Last 10 failures
  };
}

/**
 * Validate hook configuration
 */
export function validateHookConfig(config: Partial<HookConfiguration>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate timeout
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 0) {
      errors.push('Timeout must be a non-negative number');
    } else if (config.timeout > 60000) {
      warnings.push('Timeout is very high (>60s) - may impact performance');
    }
  }
  
  // Validate retry count
  if (config.retryCount !== undefined) {
    if (typeof config.retryCount !== 'number' || config.retryCount < 0) {
      errors.push('Retry count must be a non-negative number');
    } else if (config.retryCount > 10) {
      warnings.push('Retry count is very high - may cause significant delays');
    }
  }
  
  // Validate fallback behavior
  if (config.fallbackBehavior !== undefined) {
    if (!['allow', 'block', 'warn'].includes(config.fallbackBehavior)) {
      errors.push('Fallback behavior must be "allow", "block", or "warn"');
    }
  }
  
  // Validate hooks structure
  if (config.hooks !== undefined) {
    if (typeof config.hooks !== 'object' || config.hooks === null) {
      errors.push('Hooks configuration must be an object');
    } else {
      const validHookTypes = ['beforeRequest', 'afterRequest', 'onError', 'beforeAnalysis', 'afterAnalysis'];
      
      for (const [hookType, hookList] of Object.entries(config.hooks)) {
        if (!validHookTypes.includes(hookType)) {
          warnings.push(`Unknown hook type: ${hookType}`);
        }
        
        if (hookList !== undefined && !Array.isArray(hookList)) {
          errors.push(`Hook type '${hookType}' must be an array of hook names`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create a hook-aware request wrapper for the sentiment analyzer
 */
export async function executeWithHooks(
  hookContext: HookContext,
  analysisFunction: (data: any) => Promise<any>,
  requestData: any
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  hookResults: Record<string, Record<string, HookResult>>;
  totalProcessingTime: number;
}> {
  const startTime = Date.now();
  const hookResults: Record<string, Record<string, HookResult>> = {};
  
  try {
    // Execute beforeRequest hooks
    const beforeRequestResult = await executeHooks('beforeRequest', hookContext, requestData);
    hookResults.beforeRequest = beforeRequestResult.results;
    
    if (!beforeRequestResult.success) {
      return {
        success: false,
        error: `Blocked by hook: ${beforeRequestResult.blockedBy}`,
        hookResults,
        totalProcessingTime: Date.now() - startTime
      };
    }
    
    // Execute beforeAnalysis hooks
    const beforeAnalysisResult = await executeHooks('beforeAnalysis', hookContext, requestData);
    hookResults.beforeAnalysis = beforeAnalysisResult.results;
    
    if (!beforeAnalysisResult.success) {
      return {
        success: false,
        error: `Blocked by analysis hook: ${beforeAnalysisResult.blockedBy}`,
        hookResults,
        totalProcessingTime: Date.now() - startTime
      };
    }
    
    // Execute main analysis function
    const analysisResult = await analysisFunction(requestData);
    
    // Execute afterAnalysis hooks
    const afterAnalysisResult = await executeHooks('afterAnalysis', hookContext, analysisResult);
    hookResults.afterAnalysis = afterAnalysisResult.results;
    
    // Execute afterRequest hooks
    const afterRequestResult = await executeHooks('afterRequest', hookContext, analysisResult);
    hookResults.afterRequest = afterRequestResult.results;
    
    return {
      success: true,
      result: analysisResult,
      hookResults,
      totalProcessingTime: Date.now() - startTime
    };
    
  } catch (error) {
    // Execute onError hooks
    const errorContext = { ...hookContext, error };
    const onErrorResult = await executeHooks('onError', errorContext);
    hookResults.onError = onErrorResult.results;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hookResults,
      totalProcessingTime: Date.now() - startTime
    };
  }
}

// Export hook configuration for external access
export const hookConfig = loadHookConfiguration();