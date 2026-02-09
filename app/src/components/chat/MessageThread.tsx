import { useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot } from 'lucide-react';

export function MessageThread() {
  const { currentMessages, streamingState } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages.length, streamingState.currentChunk]);
  
  const isStreaming = streamingState.isStreaming;
  
  // Empty state
  if (currentMessages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sovereign-500/20 flex items-center justify-center mx-auto">
            <Bot className="h-8 w-8 text-sovereign-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              How can I help you today?
            </h2>
            <p className="text-text-muted max-w-md mx-auto">
              Start a conversation inside AetherOS. 
              Control Plane telemetry updates as tools, thinking, and model events stream in.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {[
              'Explain quantum computing',
              'Write a Python function',
              'Analyze this document',
              'Help with data analysis',
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-3 py-1.5 text-sm bg-carbon-700 hover:bg-carbon-600 text-text-secondary hover:text-text-primary rounded-full transition-colors"
                onClick={() => {
                  // Would trigger composer to fill this text
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea 
        ref={scrollRef}
        className="h-full scrollbar-dark"
      >
        <div className="py-4">
          {currentMessages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isStreaming && index === currentMessages.length - 1 && message.role === 'assistant'}
            />
          ))}
          
          {/* Streaming indicator for new message */}
          {isStreaming && streamingState.messageId && !currentMessages.find(m => m.id === streamingState.messageId) && (
            <MessageBubble
              message={{
                id: streamingState.messageId,
                role: 'assistant',
                content: streamingState.currentChunk,
                createdAt: new Date(),
              }}
              isStreaming={true}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
