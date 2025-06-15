// Plan Context Provider to prevent multiple API calls
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getPlanByToken } from '../lib/database';

interface Plan {
  id: string;
  token: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface PlanContextType {
  plan: Plan | null;
  planUuid: string | null;
  isLoading: boolean;
  error: string | null;
  refetchPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

interface PlanProviderProps {
  token: string;
  children: ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({ token, children }) => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPlan = useCallback(async () => {
    if (!token) {
      setError('No token provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] PlanProvider: Fetching plan for token:', token);
      }
      
      const fetchedPlan = await getPlanByToken(token);
      
      if (fetchedPlan) {
        setPlan(fetchedPlan);
        if (process.env.NODE_ENV === 'development') {
          console.log('[DEBUG] PlanProvider: Successfully fetched plan:', fetchedPlan);
        }
      } else {
        setPlan(null);
        setError('Plan not found');
      }
    } catch (err) {
      console.error('Error fetching plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plan');
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);
  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const refetchPlan = async () => {
    await fetchPlan();
  };

  const value: PlanContextType = {
    plan,
    planUuid: plan?.id || null,
    isLoading,
    error,
    refetchPlan
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
