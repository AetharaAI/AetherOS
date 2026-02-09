import { useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  Bug,
  FileText,
  Globe,
  RefreshCw,
  SquareTerminal,
  X,
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useControlPlaneTelemetry } from '@/hooks/useControlPlaneTelemetry';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActivityEvent, ControlPlaneTab, FileArtifact } from '@/types/chat';

interface ControlTabDefinition {
  id: ControlPlaneTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const CONTROL_TABS: ControlTabDefinition[] = [
  { id: 'context', label: 'Context', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'terminal', label: 'Terminal', icon: SquareTerminal },
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'files', label: 'Files', icon: FileText },
];

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString();
}

function formatBytes(size: number): string {
  if (size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function EventRow({ event, debug }: { event: ActivityEvent; debug: boolean }) {
  const [expandedThinking, setExpandedThinking] = useState(false);
  const isThinking = event.type === 'thinking';

  return (
    <div className="rounded-md border border-carbon-600 bg-carbon-700/50 p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-text-primary">{event.title}</div>
          {event.description && <div className="text-xs text-text-muted">{event.description}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              event.status === 'success' && 'border-success text-success',
              event.status === 'error' && 'border-error text-error',
              event.status === 'running' && 'border-sovereign-500 text-sovereign-500',
              event.status === 'queued' && 'border-warning text-warning',
              event.status === 'info' && 'border-carbon-500 text-text-muted'
            )}
          >
            {event.status}
          </Badge>
          <span className="text-[10px] text-text-muted">{formatTimestamp(event.timestamp)}</span>
        </div>
      </div>

      {event.arguments && (
        <div className="mt-2 rounded border border-carbon-600 bg-carbon-800 p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Arguments</div>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-text-secondary">{event.arguments}</pre>
        </div>
      )}

      {isThinking && event.details && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-text-secondary hover:text-text-primary"
            onClick={() => setExpandedThinking((value) => !value)}
          >
            {expandedThinking ? 'Hide thinking' : 'Show thinking'}
          </Button>
          {expandedThinking && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-carbon-600 bg-carbon-800 p-2 text-xs text-text-secondary">
              {event.details}
            </pre>
          )}
        </div>
      )}

      {debug && event.payload && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-carbon-600 bg-carbon-800 p-2 text-[10px] text-text-muted">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function FilesList({ files }: { files: FileArtifact[] }) {
  if (files.length === 0) {
    return <div className="text-sm text-text-muted">No artifacts yet</div>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div key={file.id} className="rounded-md border border-carbon-600 bg-carbon-700/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-text-primary">{file.name}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                file.kind === 'uploaded' ? 'border-forge-cyan text-forge-cyan' : 'border-success text-success'
              )}
            >
              {file.kind}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-text-muted">
            <div>{formatBytes(file.size)}</div>
            <div>{formatTimestamp(file.createdAt)}</div>
            {file.path && <div className="truncate">{file.path}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContextPanel() {
  const {
    activeModel,
    activityEvents,
    contextPanelOpen,
    controlPlaneDebug,
    controlPlaneTab,
    currentMessages,
    generatedFiles,
    models,
    setControlPlaneTab,
    toggleContextPanel,
    toggleControlPlaneDebug,
    uploadedFiles,
  } = useChatStore();

  const { contextTelemetry, refreshTelemetry } = useControlPlaneTelemetry({
    enabled: contextPanelOpen,
  });

  const [browserUrlInput, setBrowserUrlInput] = useState('https://aetherpro.us');
  const [browserUrl, setBrowserUrl] = useState('https://aetherpro.us');

  const activeModelData = models.find((model) => model.id === activeModel);
  const maxTokens = activeModelData?.specs.contextWindow ?? 0;
  const totalTokens = contextTelemetry.usage?.totalTokens ?? 0;
  const usagePercent = maxTokens > 0 ? Math.min(100, (totalTokens / maxTokens) * 100) : 0;
  const remaining = maxTokens > 0 ? Math.max(maxTokens - totalTokens, 0) : null;

  const messageStats = useMemo(
    () => ({
      total: currentMessages.length,
      user: currentMessages.filter((message) => message.role === 'user').length,
      assistant: currentMessages.filter((message) => message.role === 'assistant').length,
    }),
    [currentMessages]
  );

  const terminalEvents = useMemo(
    () => activityEvents.filter((event) => event.source === 'terminal'),
    [activityEvents]
  );

  const browserEvents = useMemo(
    () => activityEvents.filter((event) => event.source === 'browser'),
    [activityEvents]
  );

  const files = useMemo(
    () => [...uploadedFiles, ...generatedFiles].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [uploadedFiles, generatedFiles]
  );

  if (!contextPanelOpen) {
    return null;
  }

  const renderContextTab = () => (
    <ScrollArea className="h-full scrollbar-dark">
      <div className="space-y-5 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Token Usage</span>
            <Badge variant="outline" className="text-xs border-carbon-500 text-text-secondary">
              {maxTokens > 0 ? `${Math.round(usagePercent)}%` : 'N/A'}
            </Badge>
          </div>

          <Progress value={maxTokens > 0 ? usagePercent : 0} className="h-2" />

          <div className="space-y-1 text-xs text-text-muted">
            <div className="flex items-center justify-between">
              <span>Used</span>
              <span className="font-mono text-text-secondary">{totalTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Max (model)</span>
              <span className="font-mono text-text-secondary">
                {maxTokens > 0 ? maxTokens.toLocaleString() : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Remaining</span>
              <span className="font-mono text-text-secondary">
                {remaining !== null ? remaining.toLocaleString() : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Prompt / Completion</span>
              <span className="font-mono text-text-secondary">
                {(contextTelemetry.usage?.promptTokens ?? 0).toLocaleString()} / {(contextTelemetry.usage?.completionTokens ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-carbon-600" />

        <div className="space-y-2 text-sm">
          <div className="font-medium text-text-primary">Model</div>
          {activeModelData ? (
            <div className="space-y-1 text-xs text-text-muted">
              <div className="flex items-center justify-between">
                <span>Name</span>
                <span className="text-text-secondary">{activeModelData.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Provider</span>
                <span className="text-text-secondary uppercase">{activeModelData.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Context Window</span>
                <span className="font-mono text-text-secondary">
                  {activeModelData.specs.contextWindow > 0
                    ? activeModelData.specs.contextWindow.toLocaleString()
                    : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quantization</span>
                <span className="text-text-secondary">{activeModelData.specs.quantization}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-muted">No model metadata loaded</div>
          )}
        </div>

        <Separator className="bg-carbon-600" />

        <div className="space-y-2 text-sm">
          <div className="font-medium text-text-primary">User & App</div>
          <div className="space-y-1 text-xs text-text-muted">
            <div className="flex items-center justify-between">
              <span>User ID</span>
              <span className="max-w-[150px] truncate text-text-secondary">
                {contextTelemetry.userInfo?.userId ?? 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Role</span>
              <span className="text-text-secondary">{contextTelemetry.userInfo?.role ?? 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Spend</span>
              <span className="font-mono text-text-secondary">
                {contextTelemetry.userInfo?.spend !== null && contextTelemetry.userInfo?.spend !== undefined
                  ? `$${contextTelemetry.userInfo.spend.toFixed(4)}`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Budget</span>
              <span className="font-mono text-text-secondary">
                {contextTelemetry.userInfo?.maxBudget !== null && contextTelemetry.userInfo?.maxBudget !== undefined
                  ? `$${contextTelemetry.userInfo.maxBudget.toFixed(2)}`
                  : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total users</span>
              <span className="font-mono text-text-secondary">
                {contextTelemetry.usersCount !== null ? contextTelemetry.usersCount : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-carbon-600" />

        <div className="space-y-2 text-sm">
          <div className="font-medium text-text-primary">Conversation Stats</div>
          <div className="space-y-1 text-xs text-text-muted">
            <div className="flex items-center justify-between">
              <span>Total messages</span>
              <span className="font-mono text-text-secondary">{messageStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>User messages</span>
              <span className="font-mono text-text-secondary">{messageStats.user}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Assistant messages</span>
              <span className="font-mono text-text-secondary">{messageStats.assistant}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Requests (usage)</span>
              <span className="font-mono text-text-secondary">{contextTelemetry.usage?.requests ?? 0}</span>
            </div>
          </div>
        </div>

        {(contextTelemetry.error || contextTelemetry.loading || contextTelemetry.lastUpdated) && (
          <div className="rounded-md border border-carbon-600 bg-carbon-700/40 p-2 text-[11px] text-text-muted">
            {contextTelemetry.loading && <div>Refreshing context telemetry...</div>}
            {contextTelemetry.error && <div className="text-warning">{contextTelemetry.error}</div>}
            {contextTelemetry.lastUpdated && <div>Last sync: {formatTimestamp(contextTelemetry.lastUpdated)}</div>}
          </div>
        )}

        {controlPlaneDebug && (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-carbon-600 bg-carbon-700/40 p-3 text-[10px] text-text-muted">
            {JSON.stringify(contextTelemetry, null, 2)}
          </pre>
        )}
      </div>
    </ScrollArea>
  );

  const renderActivityTab = () => (
    <ScrollArea className="h-full scrollbar-dark">
      <div className="space-y-3 p-4">
        {activityEvents.length === 0 && <div className="text-sm text-text-muted">No activity captured yet</div>}
        {[...activityEvents].reverse().map((event) => (
          <EventRow key={event.id} event={event} debug={controlPlaneDebug} />
        ))}
      </div>
    </ScrollArea>
  );

  const renderTerminalTab = () => (
    <ScrollArea className="h-full scrollbar-dark">
      <div className="space-y-3 p-4">
        {terminalEvents.length === 0 && (
          <div className="text-sm text-text-muted">No terminal/computer-use events yet</div>
        )}
        {[...terminalEvents].reverse().map((event) => (
          <EventRow key={event.id} event={event} debug={controlPlaneDebug} />
        ))}
      </div>
    </ScrollArea>
  );

  const renderBrowserTab = () => (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-carbon-600 p-3">
        <div className="flex items-center gap-2">
          <input
            value={browserUrlInput}
            onChange={(event) => setBrowserUrlInput(event.target.value)}
            placeholder="https://"
            className="flex-1 rounded-md border border-carbon-600 bg-carbon-700 px-2 py-1 text-sm text-text-primary outline-none focus:border-sovereign-500"
          />
          <Button
            size="sm"
            className="h-8 bg-sovereign-500 px-3 text-white hover:bg-sovereign-600"
            onClick={() => setBrowserUrl(browserUrlInput)}
          >
            Open
          </Button>
        </div>
        <div className="text-[11px] text-text-muted">
          Browser tool events: {browserEvents.length}
        </div>
      </div>

      <div className="flex-1 p-3">
        <iframe
          title="AetherOS Browser"
          src={browserUrl}
          className="h-full w-full rounded-md border border-carbon-600 bg-carbon-700"
          sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        />
      </div>

      {controlPlaneDebug && browserEvents.length > 0 && (
        <ScrollArea className="max-h-40 border-t border-carbon-600 p-3">
          <div className="space-y-2">
            {[...browserEvents].reverse().map((event) => (
              <EventRow key={event.id} event={event} debug={true} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const renderFilesTab = () => (
    <ScrollArea className="h-full scrollbar-dark">
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 text-sm font-medium text-text-primary">Artifacts</div>
          <FilesList files={files} />
        </div>

        {controlPlaneDebug && (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-carbon-600 bg-carbon-700/40 p-3 text-[10px] text-text-muted">
            {JSON.stringify(files, null, 2)}
          </pre>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="context-panel open flex h-full w-[360px] flex-col border-l border-carbon-600 bg-carbon-800 transition-all duration-300">
      <div className="flex items-center justify-between border-b border-carbon-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-sovereign-500" />
          <span className="font-semibold text-text-primary">Control Plane</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-text-secondary hover:text-text-primary"
          onClick={toggleContextPanel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b border-carbon-600 px-2 py-2">
        <div className="grid grid-cols-5 gap-1">
          {CONTROL_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 justify-center gap-1 px-1 text-[11px] text-text-secondary hover:text-text-primary',
                  controlPlaneTab === tab.id && 'bg-carbon-700 text-text-primary'
                )}
                onClick={() => setControlPlaneTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-text-secondary hover:text-text-primary"
            onClick={() => void refreshTelemetry()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', contextTelemetry.loading && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1 px-2 text-xs',
              controlPlaneDebug ? 'text-sovereign-500 hover:text-sovereign-500' : 'text-text-secondary hover:text-text-primary'
            )}
            onClick={toggleControlPlaneDebug}
          >
            <Bug className="h-3.5 w-3.5" />
            Debug
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {controlPlaneTab === 'context' && renderContextTab()}
        {controlPlaneTab === 'activity' && renderActivityTab()}
        {controlPlaneTab === 'terminal' && renderTerminalTab()}
        {controlPlaneTab === 'browser' && renderBrowserTab()}
        {controlPlaneTab === 'files' && renderFilesTab()}
      </div>
    </div>
  );
}
