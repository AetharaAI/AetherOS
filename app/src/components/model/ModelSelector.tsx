import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useChatStore } from '@/store/chatStore';
import { fetchLiteLLMModels } from '@/lib/api/litellm';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Cpu,
  Eye,
  Loader2,
  Shield,
  Wrench,
} from 'lucide-react';
import type { ModelBadge, ModelStatus } from '@/types/chat';

const statusIcons: Record<ModelStatus, ReactNode> = {
  available: <div className="h-2 w-2 rounded-full bg-success" />,
  warming: <Loader2 className="h-3 w-3 animate-spin text-warning" />,
  offline: <AlertCircle className="h-3 w-3 text-error" />,
};

const statusLabels: Record<ModelStatus, string> = {
  available: 'Available',
  warming: 'Warming up',
  offline: 'Offline',
};

const badgeIcons: Record<ModelBadge, ReactNode> = {
  sovereign: <Shield className="h-3 w-3" />,
  vision: <Eye className="h-3 w-3" />,
  tools: <Wrench className="h-3 w-3" />,
};

const badgeLabels: Record<ModelBadge, string> = {
  sovereign: 'Sovereign',
  vision: 'Vision',
  tools: 'Tools',
};

export function ModelSelector() {
  const { models, activeModel, setModels, setActiveModel } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextModels = await fetchLiteLLMModels();
      if (nextModels.length === 0) {
        setLoadError('No models returned from LiteLLM');
      }
      setModels(nextModels);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load models';
      setLoadError(message);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [setModels]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const activeModelData = models.find((model) => model.id === activeModel);

  const handleModelSelect = (modelId: string) => {
    setActiveModel(modelId);
    setIsOpen(false);
  };

  return (
    <div className="p-3">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between border-carbon-600 bg-carbon-700 text-text-primary hover:bg-carbon-600 hover:text-text-primary',
              !activeModelData && 'text-text-muted'
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Cpu className="h-4 w-4 text-sovereign-500" />
              <span className="truncate">
                {activeModelData?.name || (isLoading ? 'Loading models...' : 'Select Model')}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px] border-carbon-600 bg-carbon-700">
          <DropdownMenuLabel className="flex items-center justify-between text-xs text-text-muted">
            <span>LiteLLM Models</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-carbon-600" />

          {loadError && (
            <DropdownMenuItem disabled className="cursor-default p-3 text-xs text-error">
              {loadError}
            </DropdownMenuItem>
          )}

          {!loadError && models.length === 0 && !isLoading && (
            <DropdownMenuItem disabled className="cursor-default p-3 text-xs text-text-muted">
              No models available
            </DropdownMenuItem>
          )}

          {models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => model.status === 'available' && handleModelSelect(model.id)}
              disabled={model.status !== 'available'}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-1 p-3',
                'hover:bg-carbon-600 focus:bg-carbon-600',
                activeModel === model.id && 'bg-carbon-600',
                model.status !== 'available' && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-text-primary">{model.name}</span>
                  {activeModel === model.id && <Check className="h-4 w-4 flex-shrink-0 text-sovereign-500" />}
                </div>
                <div className="flex items-center gap-1">
                  {statusIcons[model.status]}
                  <span className="text-xs text-text-muted">{statusLabels[model.status]}</span>
                </div>
              </div>

              {model.description && <p className="line-clamp-2 text-xs text-text-muted">{model.description}</p>}

              {model.badges.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {model.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="secondary"
                      className={cn(
                        'gap-1 px-1.5 py-0 text-[10px]',
                        badge === 'sovereign' && 'border-sovereign-500/30 bg-sovereign-500/20 text-sovereign-500',
                        badge === 'vision' && 'border-forge-cyan/30 bg-forge-cyan/20 text-forge-cyan',
                        badge === 'tools' && 'border-success/30 bg-success/20 text-success'
                      )}
                    >
                      {badgeIcons[badge]}
                      {badgeLabels[badge]}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-text-muted">
                <span>{model.specs.contextWindow > 0 ? `${model.specs.contextWindow.toLocaleString()} ctx` : 'ctx n/a'}</span>
                <span>{model.specs.quantization}</span>
                <span>{model.specs.gpuAllocation}</span>
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-carbon-600" />
          <DropdownMenuItem
            onClick={loadModels}
            className="cursor-pointer text-xs text-text-secondary hover:text-text-primary"
          >
            Refresh model list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeModelData && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {activeModelData.badges.includes('sovereign') && (
            <Badge
              variant="outline"
              className="gap-1 border-sovereign-500/30 px-1.5 py-0.5 text-[10px] text-sovereign-500"
            >
              <Shield className="h-3 w-3" />
              AetherOS
            </Badge>
          )}
          <span>
            {activeModelData.specs.contextWindow > 0
              ? `${activeModelData.specs.contextWindow.toLocaleString()} tokens`
              : 'Context unknown'}
          </span>
        </div>
      )}
    </div>
  );
}
