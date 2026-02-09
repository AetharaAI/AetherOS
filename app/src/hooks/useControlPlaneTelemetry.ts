import { useCallback, useEffect } from 'react';
import {
  fetchLiteLLMUsage,
  fetchLiteLLMUserInfo,
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
  const { getEffectiveUserId } = useAuthStore();

  const refreshTelemetry = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const userId = getEffectiveUserId();
    const updatedAt = new Date().toISOString();

    setContextTelemetry({ loading: true, error: null });

    const [usageResult, userInfoResult, usersCountResult] = await Promise.allSettled([
      fetchLiteLLMUsage({
        userId,
        appId: LITELLM_CONFIG.appId,
        lookbackDays: 7,
      }),
      fetchLiteLLMUserInfo(userId),
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

    if (userInfoResult.status === 'fulfilled') {
      setContextTelemetry({
        userInfo: userInfoResult.value,
      });
    } else if (!errorMessage) {
      errorMessage = userInfoResult.reason instanceof Error
        ? userInfoResult.reason.message
        : 'Failed to fetch user info';
    }

    if (usersCountResult.status === 'fulfilled') {
      setContextTelemetry({
        usersCount: usersCountResult.value,
      });
    } else if (!errorMessage) {
      errorMessage = usersCountResult.reason instanceof Error
        ? usersCountResult.reason.message
        : 'Failed to fetch users';
    }

    setContextTelemetry({
      loading: false,
      error: errorMessage,
      lastUpdated: updatedAt,
    });
  }, [enabled, getEffectiveUserId, setContextTelemetry]);

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
