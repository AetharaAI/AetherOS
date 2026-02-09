// Message types
export type ActivityEventStatus = 'queued' | 'running' | 'success' | 'error' | 'info';
export type ActivityEventSource = 'system' | 'model' | 'tool' | 'mcp' | 'mcpfabric' | 'terminal' | 'browser' | 'file';

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  content?: string;
  image_url?: string;
  tool_call_id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface ThinkingBlock {
  id: string;
  content: string;
  createdAt: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: string;
  status: ActivityEventStatus;
  source: ActivityEventSource;
  startedAt: string;
  completedAt?: string;
  result?: string;
  error?: string;
}

export interface MessageMetadata {
  model: string;
  tokens: { input: number; output: number };
  latency: number;
  finish_reason: string;
  timestamp: string;
  appId?: string;
  userId?: string;
  thinking?: ThinkingBlock[];
  toolCalls?: ToolCallRecord[];
  rawUsage?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
  metadata?: MessageMetadata;
  createdAt: Date;
}

export interface ActivityEvent {
  id: string;
  type: 'status' | 'thinking' | 'tool_call' | 'tool_result' | 'terminal' | 'browser' | 'file';
  source: ActivityEventSource;
  status: ActivityEventStatus;
  title: string;
  description?: string;
  arguments?: string;
  details?: string;
  timestamp: string;
  messageId?: string;
  toolCallId?: string;
  payload?: Record<string, unknown>;
}

export interface FileArtifact {
  id: string;
  name: string;
  size: number;
  kind: 'uploaded' | 'generated';
  mimeType?: string;
  createdAt: string;
  path?: string;
  sourceEventId?: string;
}

export type ControlPlaneTab = 'context' | 'activity' | 'terminal' | 'browser' | 'files';

export interface LiteLLMUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  spend: number;
  requests: number;
  windowStart?: string;
  windowEnd?: string;
  raw?: Record<string, unknown>;
}

export interface LiteLLMUserInfo {
  userId: string;
  role?: string;
  spend?: number | null;
  maxBudget?: number | null;
  metadata?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

export interface ContextTelemetryState {
  usage: LiteLLMUsageSnapshot | null;
  userInfo: LiteLLMUserInfo | null;
  usersCount: number | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
}

// Model types
export type ModelProvider = 'vllm' | 'triton' | 'custom';
export type ModelStatus = 'available' | 'warming' | 'offline';
export type ModelBadge = 'sovereign' | 'vision' | 'tools';

export interface ModelSpecs {
  contextWindow: number;
  quantization: string;
  gpuAllocation: string;
}

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  status: ModelStatus;
  specs: ModelSpecs;
  badges: ModelBadge[];
  description?: string;
}

// Streaming types
export interface StreamingState {
  isStreaming: boolean;
  currentChunk: string;
  model: string;
  messageId: string | null;
}

export interface StreamEvent {
  id: string;
  object: 'chat.completion.chunk' | string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      reasoning?: string;
      reasoning_content?: string;
      thinking?: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Context window types
export interface ContextBreakdown {
  systemPrompt: number;
  conversationHistory: number;
  currentInput: number;
  reserved: number;
}

export interface ContextVisualizerProps {
  maxTokens: number;
  usedTokens: number;
  breakdown: ContextBreakdown;
  compressionStrategy?: 'summarize' | 'truncate' | 'error';
}

// Composer types
export interface ComposerFeatures {
  multimodal: boolean;
  webSearch: {
    enabled: boolean;
    toggle: () => void;
    results?: SearchResults;
  };
  tools: boolean;
  agents: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface SearchResults {
  context: string;
  answer?: string;
  results: SearchResult[];
}

// Conversation types
export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isStarred?: boolean;
  folderId?: string | null;
}

// Settings types
export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  webSearch: boolean;
}

// Auth types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  guestId: string;
}

// API types
export interface ChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream: boolean;
  user?: string;
  metadata?: {
    app_id?: string;
    session_id?: string;
    [key: string]: unknown;
  };
}

export interface ModelResponse {
  models: Model[];
}

export interface ConversationListResponse {
  conversations: Conversation[];
  nextCursor?: string;
  hasMore: boolean;
}
