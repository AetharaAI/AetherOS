import { useState } from 'react';
import { format } from 'date-fns';
import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Database,
  Shield,
  User,
  Wrench,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const isUser = message.role === 'user';

  const content = typeof message.content === 'string'
    ? message.content
    : JSON.stringify(message.content);

  const thinkingBlocks = message.metadata?.thinking ?? [];
  const toolCalls = message.metadata?.toolCalls ?? [];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('group relative px-4 py-4 md:px-6', isUser ? 'bg-carbon-800/50' : 'bg-transparent')}>
      <div className="mx-auto flex max-w-3xl gap-4">
        <div className="flex-shrink-0">
          {isUser ? (
            <Avatar className="h-8 w-8 bg-carbon-600">
              <AvatarFallback className="bg-carbon-600 text-text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sovereign-500 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium text-text-primary">{isUser ? 'You' : 'Assistant'}</span>
            {message.metadata && (
              <span className="text-xs text-text-muted">
                {format(new Date(message.metadata.timestamp), 'h:mm a')}
              </span>
            )}
            {isStreaming && (
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sovereign-500" />
                <span className="h-1.5 w-1.5 animate-pulse-dot-delay-1 rounded-full bg-sovereign-500" />
                <span className="h-1.5 w-1.5 animate-pulse-dot-delay-2 rounded-full bg-sovereign-500" />
              </div>
            )}
          </div>

          {!isUser && thinkingBlocks.length > 0 && (
            <div className="mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-text-secondary hover:text-text-primary"
                onClick={() => setShowThinking((value) => !value)}
              >
                <Brain className="h-3.5 w-3.5" />
                {showThinking ? 'Hide thinking' : 'Show thinking'}
                {showThinking ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>

              {showThinking && (
                <div className="mt-2 space-y-2 rounded-md border border-carbon-600 bg-carbon-700/40 p-2">
                  {thinkingBlocks.map((block) => (
                    <pre key={block.id} className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-text-secondary">
                      {block.content}
                    </pre>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="prose prose-invert max-w-none prose-sm">
            {content ? (
              <div className="whitespace-pre-wrap leading-relaxed text-text-primary">{content}</div>
            ) : isStreaming ? (
              <div className="flex h-6 items-center">
                <span className="italic text-text-muted">Thinking...</span>
              </div>
            ) : null}
          </div>

          {!isUser && toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {toolCalls.map((toolCall) => {
                const expanded = expandedTools[toolCall.id] ?? false;
                return (
                  <div key={toolCall.id} className="rounded-md border border-carbon-600 bg-carbon-700/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <Wrench className="h-3.5 w-3.5" />
                        <span className="font-mono text-text-primary">{toolCall.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            toolCall.status === 'success' && 'border-success text-success',
                            toolCall.status === 'error' && 'border-error text-error',
                            toolCall.status === 'running' && 'border-sovereign-500 text-sovereign-500',
                            toolCall.status === 'queued' && 'border-warning text-warning',
                            toolCall.status === 'info' && 'border-carbon-500 text-text-muted'
                          )}
                        >
                          {toolCall.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-text-muted"
                          onClick={() =>
                            setExpandedTools((current) => ({
                              ...current,
                              [toolCall.id]: !expanded,
                            }))
                          }
                        >
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-carbon-600 bg-carbon-800 p-2 text-xs text-text-secondary">
                        {toolCall.arguments || '{}'}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {message.metadata && !isStreaming && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Database className="h-3 w-3" />
                <span className="font-mono">
                  {(message.metadata.tokens.input + message.metadata.tokens.output).toLocaleString()} tokens
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{message.metadata.latency}ms</span>
              </div>

              <Badge
                variant="outline"
                className="border-carbon-500 px-1.5 py-0 text-[10px] text-text-muted"
              >
                {message.metadata.model}
              </Badge>

              <Badge
                variant="outline"
                className="gap-0.5 border-sovereign-500/30 px-1.5 py-0 text-[10px] text-sovereign-500"
              >
                <Shield className="h-3 w-3" />
                AetherOS
              </Badge>
            </div>
          )}
        </div>

        {content && !isStreaming && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
