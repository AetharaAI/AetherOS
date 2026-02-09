import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { streamLiteLLMChat, LITELLM_CONFIG } from '@/lib/api/litellm';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import type {
  ActivityEvent,
  ActivityEventSource,
  ChatRequest,
  FileArtifact,
  Message,
  MessageMetadata,
  StreamEvent,
  ToolCallRecord,
} from '@/types/chat';

interface UseChatStreamOptions {
  onError?: (error: Error) => void;
  onComplete?: (message: Message) => void;
}

interface UsageCounter {
  input: number;
  output: number;
}

function safeToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseArguments(input: string): Record<string, unknown> | null {
  if (!input || input.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractGeneratedArtifact(toolCall: ToolCallRecord, sourceEventId: string): FileArtifact | null {
  const loweredName = toolCall.name.toLowerCase();
  const maybeFileTool =
    loweredName.includes('file') ||
    loweredName.includes('artifact') ||
    loweredName.includes('write') ||
    loweredName.includes('save');

  if (!maybeFileTool) {
    return null;
  }

  const parsedArgs = parseArguments(toolCall.arguments);
  const candidatePath =
    (parsedArgs?.path as string | undefined) ??
    (parsedArgs?.file_path as string | undefined) ??
    (parsedArgs?.output_path as string | undefined);

  const candidateName =
    (parsedArgs?.name as string | undefined) ??
    (parsedArgs?.filename as string | undefined) ??
    (typeof candidatePath === 'string' ? candidatePath.split('/').pop() : undefined);

  if (!candidateName) {
    return null;
  }

  return {
    id: uuidv4(),
    name: candidateName,
    size: 0,
    kind: 'generated',
    path: candidatePath,
    createdAt: new Date().toISOString(),
    sourceEventId,
  };
}

function inferActivitySource(toolName: string): ActivityEventSource {
  const lowered = toolName.toLowerCase();

  if (lowered.includes('fabric')) {
    return 'mcpfabric';
  }

  if (lowered.includes('mcp')) {
    return 'mcp';
  }

  if (
    lowered.includes('terminal') ||
    lowered.includes('shell') ||
    lowered.includes('bash') ||
    lowered.includes('command') ||
    lowered.includes('computer')
  ) {
    return 'terminal';
  }

  if (lowered.includes('browser') || lowered.includes('web') || lowered.includes('navigate')) {
    return 'browser';
  }

  if (lowered.includes('file') || lowered.includes('artifact') || lowered.includes('write')) {
    return 'file';
  }

  return 'tool';
}

function activityTypeForSource(source: ActivityEventSource): ActivityEvent['type'] {
  if (source === 'terminal') {
    return 'terminal';
  }

  if (source === 'browser') {
    return 'browser';
  }

  if (source === 'file') {
    return 'file';
  }

  return 'tool_call';
}

function getThinkingChunk(event: StreamEvent): string {
  const delta = event.choices[0]?.delta;
  if (!delta) {
    return '';
  }

  return delta.reasoning_content ?? delta.reasoning ?? delta.thinking ?? '';
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    activeModel,
    addActivityEvent,
    addGeneratedFile,
    addMessage,
    currentMessages,
    sessionId,
    setContextTelemetry,
    setIsSearching,
    setSearchResults,
    setStreamingState,
    settings,
    updateActivityEvent,
    updateMessage,
  } = useChatStore();

  const { getEffectiveUserId } = useAuthStore();

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const stopEventId = uuidv4();
    addActivityEvent({
      id: stopEventId,
      type: 'status',
      source: 'system',
      status: 'info',
      title: 'Generation stopped',
      description: 'Stream aborted by user',
      timestamp: new Date().toISOString(),
    });

    setStreamingState({ isStreaming: false });
    setIsLoading(false);
  }, [addActivityEvent, setStreamingState]);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeModel) {
      options.onError?.(new Error('No model selected'));
      return;
    }

    setIsLoading(true);
    const startedAt = Date.now();
    const requestId = uuidv4();

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    addMessage(userMessage);

    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    addMessage(assistantMessage);

    setStreamingState({
      isStreaming: true,
      currentChunk: '',
      model: activeModel,
      messageId: assistantMessageId,
    });

    const userId = getEffectiveUserId();

    const requestEventId = uuidv4();
    addActivityEvent({
      id: requestEventId,
      type: 'status',
      source: 'model',
      status: 'running',
      title: 'Completion request started',
      description: `model=${activeModel}`,
      timestamp: new Date().toISOString(),
      messageId: assistantMessageId,
      payload: {
        request_id: requestId,
        user: userId,
        app_id: LITELLM_CONFIG.appId,
        session_id: sessionId,
      },
    });

    try {
      const apiMessages = currentMessages
        .filter((message) => message.id !== assistantMessageId)
        .map((message) => ({
          role: message.role,
          content: safeToString(message.content),
        }));

      apiMessages.push({ role: 'user', content });

      if (settings.webSearch) {
        setIsSearching(true);

        try {
          const searchResponse = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: content }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            setSearchResults(searchData);

            apiMessages.unshift({
              role: 'system',
              content: `Search results for "${content}":\n${searchData.context}\n\nUse the above search results if relevant.`,
            });
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
        } finally {
          setIsSearching(false);
        }
      }

      const requestBody: ChatRequest = {
        model: activeModel,
        messages: apiMessages,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: true,
        user: userId,
        metadata: {
          app_id: LITELLM_CONFIG.appId,
          session_id: sessionId,
        },
      };

      abortControllerRef.current = new AbortController();
      const response = await streamLiteLLMChat(requestBody, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body from LiteLLM stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let tokenCount: UsageCounter = { input: 0, output: 0 };
      let finalFinishReason: string | null = null;
      let finalUsage: Record<string, unknown> | undefined;

      const toolCalls = new Map<string, ToolCallRecord>();
      const toolCallActivityIds = new Map<string, string>();

      const thinkingBlockId = uuidv4();
      let thinkingContent = '';
      let thinkingActivityId: string | null = null;

      const upsertMetadata = (partial: Partial<MessageMetadata>) => {
        const currentMessage = useChatStore.getState().currentMessages.find(
          (message) => message.id === assistantMessageId
        );

        const existing = currentMessage?.metadata;
        const baseMetadata: MessageMetadata = {
          model: existing?.model ?? activeModel,
          tokens: existing?.tokens ?? { input: 0, output: 0 },
          latency: existing?.latency ?? 0,
          finish_reason: existing?.finish_reason ?? 'streaming',
          timestamp: existing?.timestamp ?? new Date().toISOString(),
          appId: existing?.appId ?? LITELLM_CONFIG.appId,
          userId: existing?.userId ?? userId,
          thinking: existing?.thinking,
          toolCalls: existing?.toolCalls,
          rawUsage: existing?.rawUsage,
        };

        updateMessage(assistantMessageId, {
          metadata: {
            ...baseMetadata,
            ...partial,
          },
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue;
          }

          const data = line.slice(6);
          if (data === '[DONE]') {
            continue;
          }

          let event: StreamEvent;
          try {
            event = JSON.parse(data) as StreamEvent;
          } catch (parseError) {
            console.error('Failed to parse SSE event', parseError);
            continue;
          }

          const choice = event.choices?.[0];
          if (!choice) {
            continue;
          }

          if (choice.delta?.content) {
            const currentContent =
              (useChatStore.getState().currentMessages.find((message) => message.id === assistantMessageId)
                ?.content as string) ?? '';

            const nextContent = currentContent + choice.delta.content;
            setStreamingState({ currentChunk: nextContent });
            updateMessage(assistantMessageId, { content: nextContent });
          }

          const thinkingChunk = getThinkingChunk(event);
          if (thinkingChunk) {
            thinkingContent += thinkingChunk;

            if (!thinkingActivityId) {
              thinkingActivityId = uuidv4();
              addActivityEvent({
                id: thinkingActivityId,
                type: 'thinking',
                source: 'model',
                status: 'running',
                title: 'Reasoning stream',
                details: thinkingContent,
                timestamp: new Date().toISOString(),
                messageId: assistantMessageId,
              });
            } else {
              updateActivityEvent(thinkingActivityId, {
                details: thinkingContent,
              });
            }

            upsertMetadata({
              thinking: [
                {
                  id: thinkingBlockId,
                  content: thinkingContent,
                  createdAt: new Date(startedAt).toISOString(),
                },
              ],
            });
          }

          if (choice.delta?.tool_calls && choice.delta.tool_calls.length > 0) {
            for (const [index, toolCallDelta] of choice.delta.tool_calls.entries()) {
              const existingToolCall = toolCalls.get(toolCallDelta.id) ?? {
                id: toolCallDelta.id || `${assistantMessageId}-tool-${index}`,
                name: toolCallDelta.function?.name || 'tool',
                arguments: '',
                status: 'running',
                source: inferActivitySource(toolCallDelta.function?.name || 'tool'),
                startedAt: new Date().toISOString(),
              };

              const nextToolCall: ToolCallRecord = {
                ...existingToolCall,
                name: toolCallDelta.function?.name || existingToolCall.name,
                arguments: `${existingToolCall.arguments}${toolCallDelta.function?.arguments ?? ''}`,
                status: 'running',
                source: inferActivitySource(toolCallDelta.function?.name || existingToolCall.name),
              };

              toolCalls.set(nextToolCall.id, nextToolCall);

              const existingActivityId = toolCallActivityIds.get(nextToolCall.id);
              if (!existingActivityId) {
                const activityId = uuidv4();
                toolCallActivityIds.set(nextToolCall.id, activityId);

                addActivityEvent({
                  id: activityId,
                  type: activityTypeForSource(nextToolCall.source),
                  source: nextToolCall.source,
                  status: 'running',
                  title: nextToolCall.name,
                  arguments: nextToolCall.arguments,
                  timestamp: new Date().toISOString(),
                  messageId: assistantMessageId,
                  toolCallId: nextToolCall.id,
                });
              } else {
                updateActivityEvent(existingActivityId, {
                  title: nextToolCall.name,
                  arguments: nextToolCall.arguments,
                  status: 'running',
                });
              }

              upsertMetadata({
                toolCalls: Array.from(toolCalls.values()),
              });
            }
          }

          if (choice.finish_reason) {
            finalFinishReason = choice.finish_reason;
          }

          if (event.usage) {
            tokenCount = {
              input: Math.round(event.usage.prompt_tokens),
              output: Math.round(event.usage.completion_tokens),
            };

            finalUsage = {
              prompt_tokens: event.usage.prompt_tokens,
              completion_tokens: event.usage.completion_tokens,
              total_tokens: event.usage.total_tokens,
            };
          }
        }
      }

      const completedAtIso = new Date().toISOString();
      const finalizedToolCalls = Array.from(toolCalls.values()).map((toolCall) => ({
        ...toolCall,
        status: 'success' as const,
        completedAt: completedAtIso,
      }));

      for (const toolCall of finalizedToolCalls) {
        const activityId = toolCallActivityIds.get(toolCall.id);
        if (activityId) {
          updateActivityEvent(activityId, {
            status: 'success',
            details: 'Completed',
          });

          const generatedArtifact = extractGeneratedArtifact(toolCall, activityId);
          if (generatedArtifact) {
            addGeneratedFile(generatedArtifact);
          }
        }
      }

      if (thinkingActivityId) {
        updateActivityEvent(thinkingActivityId, {
          status: 'success',
        });
      }

      updateActivityEvent(requestEventId, {
        status: 'success',
        description: `model=${activeModel}, latency=${Date.now() - startedAt}ms`,
      });

      const finalContent =
        (useChatStore.getState().currentMessages.find((message) => message.id === assistantMessageId)
          ?.content as string) ?? '';

      const finalMessageMetadata: MessageMetadata = {
        model: activeModel,
        tokens: tokenCount,
        latency: Date.now() - startedAt,
        finish_reason: finalFinishReason ?? 'stop',
        timestamp: completedAtIso,
        appId: LITELLM_CONFIG.appId,
        userId,
        thinking: thinkingContent
          ? [
              {
                id: thinkingBlockId,
                content: thinkingContent,
                createdAt: new Date(startedAt).toISOString(),
              },
            ]
          : undefined,
        toolCalls: finalizedToolCalls.length > 0 ? finalizedToolCalls : undefined,
        rawUsage: finalUsage,
      };

      const finalMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: finalContent,
        createdAt: new Date(),
        metadata: finalMessageMetadata,
      };

      updateMessage(assistantMessageId, finalMessage);
      options.onComplete?.(finalMessage);

      const existingUsage = useChatStore.getState().contextTelemetry.usage;
      const totalIncrement = tokenCount.input + tokenCount.output;
      setContextTelemetry({
        usage: {
          promptTokens: (existingUsage?.promptTokens ?? 0) + tokenCount.input,
          completionTokens: (existingUsage?.completionTokens ?? 0) + tokenCount.output,
          totalTokens: (existingUsage?.totalTokens ?? 0) + totalIncrement,
          spend: existingUsage?.spend ?? 0,
          requests: (existingUsage?.requests ?? 0) + 1,
          windowStart: existingUsage?.windowStart,
          windowEnd: completedAtIso,
          raw: existingUsage?.raw,
        },
        lastUpdated: completedAtIso,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        const message = error instanceof Error ? error.message : 'Unknown stream error';
        console.error('Streaming error:', error);
        options.onError?.(error instanceof Error ? error : new Error(message));

        const currentContent =
          (useChatStore.getState().currentMessages.find((message) => message.id === assistantMessageId)
            ?.content as string) ?? '';

        updateMessage(assistantMessageId, {
          content: `${currentContent}\n\n[Error: ${message}]`,
        });

        updateActivityEvent(requestEventId, {
          status: 'error',
          description: message,
        });
      }
    } finally {
      setStreamingState({ isStreaming: false });
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    activeModel,
    addActivityEvent,
    addGeneratedFile,
    addMessage,
    currentMessages,
    getEffectiveUserId,
    options,
    sessionId,
    setContextTelemetry,
    setIsSearching,
    setSearchResults,
    setStreamingState,
    settings,
    updateActivityEvent,
    updateMessage,
  ]);

  return {
    sendMessage,
    stopGeneration,
    isLoading,
  };
}
