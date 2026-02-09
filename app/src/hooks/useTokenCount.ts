import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';

// Simple token estimation (rough approximation: ~4 chars per token)
// In production, you'd use a proper tokenizer like tiktoken
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface TokenCount {
  input: number;
  output: number;
  total: number;
  remaining: number;
}

export function useTokenCount() {
  const { currentMessages, settings, models, activeModel } = useChatStore();
  const [tokenCount, setTokenCount] = useState<TokenCount>({
    input: 0,
    output: 0,
    total: 0,
    remaining: 4096,
  });
  
  const calculateTokens = useCallback(() => {
    const activeModelData = models.find((m) => m.id === activeModel);
    const maxTokens = activeModelData?.specs.contextWindow || settings.maxTokens || 4096;
    
    // Calculate input tokens (all messages)
    let inputTokens = 0;
    for (const message of currentMessages) {
      const content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
      inputTokens += estimateTokens(content);
    }
    
    // Add system prompt tokens
    const systemTokens = estimateTokens(settings.systemPrompt);
    inputTokens += systemTokens;
    
    // Estimate output tokens (reserve for completion)
    const outputTokens = Math.min(1024, Math.floor(maxTokens * 0.3));
    
    const total = inputTokens + outputTokens;
    const remaining = maxTokens - total;
    
    setTokenCount({
      input: inputTokens,
      output: outputTokens,
      total,
      remaining,
    });
    
    return { input: inputTokens, output: outputTokens, total, remaining };
  }, [currentMessages, settings, models, activeModel]);
  
  useEffect(() => {
    calculateTokens();
  }, [calculateTokens]);
  
  return {
    ...tokenCount,
    calculateTokens,
    estimateTokens,
  };
}
