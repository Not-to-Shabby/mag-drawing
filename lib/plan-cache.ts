// Simple plan cache to prevent multiple API calls during initialization
interface Plan {
  id: string;
  token: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const planCache = new Map<string, { plan: Plan | null; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

export const getCachedPlan = async (token: string, getPlanByToken: (token: string) => Promise<Plan | null>): Promise<Plan | null> => {
  const cached = planCache.get(token);
  const now = Date.now();
  
  // Return cached plan if it exists and is fresh
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] getCachedPlan: Returning cached plan for token:', token);
    }
    return cached.plan;
  }
  
  // Fetch fresh plan
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] getCachedPlan: Fetching fresh plan for token:', token);
  }
  
  try {
    const plan = await getPlanByToken(token);
    
    // Cache the result
    planCache.set(token, { plan, timestamp: now });
    
    return plan;
  } catch (error) {
    // Don't cache errors, let them bubble up
    throw error;
  }
};

// Clear cache for a specific token (useful when plan is updated)
export const clearPlanCache = (token: string) => {
  planCache.delete(token);
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] clearPlanCache: Cleared cache for token:', token);
  }
};

// Clear entire cache (useful for testing)
export const clearAllPlanCache = () => {
  planCache.clear();
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] clearAllPlanCache: Cleared entire plan cache');
  }
};
