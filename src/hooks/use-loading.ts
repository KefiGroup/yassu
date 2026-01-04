/**
 * Loading State Hook
 * Manages loading states for async operations
 */

import { useState, useCallback } from "react";

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export function useLoading(initialState: boolean = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = useCallback((errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
    setSuccess(false);
  }, []);

  const setLoadingSuccess = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSuccess(true);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  /**
   * Wrapper for async operations with automatic loading state management
   */
  const withLoading = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      startLoading();
      try {
        const result = await operation();
        setLoadingSuccess();
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setLoadingError(errorMessage);
        return null;
      }
    },
    [startLoading, setLoadingSuccess, setLoadingError]
  );

  return {
    isLoading,
    error,
    success,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    setSuccess: setLoadingSuccess,
    reset,
    withLoading,
  };
}

/**
 * Multiple loading states manager
 * Useful for managing multiple async operations on the same page
 */
export function useMultipleLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});

  const startLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading: true, error: null, success: false },
    }));
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: false },
    }));
  }, []);

  const setError = useCallback((key: string, error: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading: false, error, success: false },
    }));
  }, []);

  const setSuccess = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading: false, error: null, success: true },
    }));
  }, []);

  const reset = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key]?.isLoading ?? false;
  }, [loadingStates]);

  const getError = useCallback((key: string) => {
    return loadingStates[key]?.error ?? null;
  }, [loadingStates]);

  const isSuccess = useCallback((key: string) => {
    return loadingStates[key]?.success ?? false;
  }, [loadingStates]);

  return {
    loadingStates,
    startLoading,
    stopLoading,
    setError,
    setSuccess,
    reset,
    isLoading,
    getError,
    isSuccess,
  };
}
