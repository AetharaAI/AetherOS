import { useCallback, useEffect } from 'react';
import {
  fetchLiteLLMUsage,
  fetchLiteLLMUsersCount,
  LITELLM_CONFIG,
} from '@/lib/api/litellm';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

interface UseControlPlaneTelemetryOptions {
  enabled: boolean;
}

export function useControlPlaneTelemetry(options: UseControlPlaneTelemetryOptions) {
  const { enabled } = options;

  const { contextTelemetry, currentMessages, setContextTelemetry } = useChatStore();
  const { user, isAuthenticated, getEffectiveUserId } = useAuthStore();

  const refreshTelemetry = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const userId = getEffectiveUserId();
    const updatedAt = new Date().toISOString();

    setContextTelemetry({ loading: true, error: null });

    // Use local Passport user info if available
    if (user) {
      setContextTelemetry({
        userInfo: {
          userId: user.id || userId,
          role: 'user', // Default role for now, could be mapped from Keycloak roles if needed
          spend: 0, // Spend tracking might need backend integration, default to 0 for now
          maxBudget: 0,
          metadata: {
            email: user.email,
            name: user.name,
            image: user.image,
          },
          raw: user as any,
        },
      });
    }

    // Only fetch stats if authenticated (to avoid 401s/CORs on guest access to protected endpoints)
    if (!isAuthenticated) {
      setContextTelemetry({
        loading: false,
        lastUpdated: updatedAt,
        // Reset or keep previous usage? For now, we'll just not update it validly.
        // Actually, let's clear it if we are guest to avoid confusion.
        usage: null,
        usersCount: null,
      });
      return;
    }

    const [usageResult, usersCountResult] = await Promise.allSettled([
      fetchLiteLLMUsage({
        userId,
        appId: LITELLM_CONFIG.appId,
        lookbackDays: 7,
      }),
      fetchLiteLLMUsersCount(),
    ]);

    let errorMessage: string | null = null;

    if (usageResult.status === 'fulfilled') {
      setContextTelemetry({
        usage: usageResult.value,
      });
    } else {
      errorMessage = usageResult.reason instanceof Error
        ? usageResult.reason.message
        : 'Failed to fetch usage';
    }

    if (usersCountResult.status === 'fulfilled') {
      setContextTelemetry({
        usersCount: usersCountResult.value,
      });
    } else if (!errorMessage) {
      // Don't overwrite existing error message
      errorMessage = usersCountResult.reason instanceof Error
        ? usersCountResult.reason.message
        : 'Failed to fetch users';
    }

    setContextTelemetry({
      loading: false,
      error: errorMessage,
      lastUpdated: updatedAt,
    });
  }, [enabled, isAuthenticated, user, getEffectiveUserId, setContextTelemetry]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshTelemetry();

    const intervalId = window.setInterval(() => {
      void refreshTelemetry();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, refreshTelemetry]);

  useEffect(() => {
    if (!enabled || currentMessages.length === 0) {
      return;
    }

    void refreshTelemetry();
  }, [enabled, currentMessages.length, refreshTelemetry]);

  return {
    contextTelemetry,
    refreshTelemetry,
  };
}
