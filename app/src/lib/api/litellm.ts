import type {
  ChatRequest,
  LiteLLMUsageSnapshot,
  LiteLLMUserInfo,
  Model,
  ModelBadge,
  ModelProvider,
  ModelStatus,
} from '@/types/chat';

const FALLBACK_BASE_URL = 'https://api.blackboxaudio.tech/v1';
const FALLBACK_API_KEY = 'sk-aether-master-pro';
const FALLBACK_APP_ID = 'aether-os-web';
const FALLBACK_MODEL_NAME = 'kimi-vl-thinking';

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_BASE_URL;
  }

  const prefixed = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;

  return prefixed.replace(/\/+$/, '');
}

function readEnv(name: string): string | undefined {
  const value = import.meta.env[name];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const LITELLM_CONFIG = {
  baseUrl: normalizeBaseUrl(readEnv('VITE_LITELLM_API_BASE_URL') ?? FALLBACK_BASE_URL),
  apiKey: readEnv('VITE_LITELLM_API_KEY') ?? FALLBACK_API_KEY,
  appId: readEnv('VITE_AETHEROS_APP_ID') ?? FALLBACK_APP_ID,
  modelName: readEnv('VITE_LITELLM_MODEL_NAME') ?? FALLBACK_MODEL_NAME,
};

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${LITELLM_CONFIG.apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function requestLiteLLM(path: string, init: RequestInit = {}): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const headers = {
    ...authHeaders(),
    ...(init.headers ?? {}),
  };

  return fetch(`${LITELLM_CONFIG.baseUrl}${normalizedPath}`, {
    ...init,
    headers,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }

  return undefined;
}

function findFirstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }

    const value = toNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function findFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }

    const value = toStringValue(record[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function sumNamedNumbers(node: unknown, keySet: Set<string>): number {
  if (Array.isArray(node)) {
    return node.reduce((total, item) => total + sumNamedNumbers(item, keySet), 0);
  }

  if (!node || typeof node !== 'object') {
    return 0;
  }

  let total = 0;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (keySet.has(key)) {
      const numericValue = toNumber(value);
      if (numericValue !== null) {
        total += numericValue;
      }
    }

    if (value && typeof value === 'object') {
      total += sumNamedNumbers(value, keySet);
    }
  }

  return total;
}

function toProvider(value: unknown): ModelProvider {
  const raw = toStringValue(value)?.toLowerCase();
  if (raw === 'vllm' || raw === 'triton') {
    return raw;
  }

  return 'custom';
}

function toStatus(value: unknown): ModelStatus {
  const raw = toStringValue(value)?.toLowerCase();
  if (raw === 'available' || raw === 'warming' || raw === 'offline') {
    return raw;
  }

  return 'available';
}

function inferBadges(modelId: string, modelInfo: Record<string, unknown>): ModelBadge[] {
  const badges = new Set<ModelBadge>();
  const lowered = modelId.toLowerCase();

  if (
    lowered.includes('vision') ||
    lowered.includes('vl') ||
    lowered.includes('image') ||
    Boolean(modelInfo.supports_vision)
  ) {
    badges.add('vision');
  }

  if (
    lowered.includes('tool') ||
    Boolean(modelInfo.supports_function_calling) ||
    Boolean(modelInfo.supports_parallel_function_calling)
  ) {
    badges.add('tools');
  }

  if (Boolean(modelInfo.sovereign) || lowered.includes('aether') || lowered.includes('kimi')) {
    badges.add('sovereign');
  }

  return Array.from(badges);
}

function mapModel(record: Record<string, unknown>): Model | null {
  const info = asRecord(record.model_info) ?? {};
  const modelId =
    findFirstString(record, ['id', 'model_name', 'model']) ??
    findFirstString(info, ['id', 'model_name', 'model']);

  if (!modelId) {
    return null;
  }

  const contextWindow =
    findFirstNumber(record, ['max_input_tokens', 'max_tokens', 'context_window']) ??
    findFirstNumber(info, ['max_input_tokens', 'max_tokens', 'context_window']) ??
    0;

  const provider = toProvider(
    findFirstString(record, ['litellm_provider', 'provider']) ??
    findFirstString(info, ['provider'])
  );

  const status = toStatus(record.status ?? info.status);
  const badges = inferBadges(modelId, info);

  return {
    id: modelId,
    name: findFirstString(record, ['display_name', 'name']) ?? modelId,
    provider,
    status,
    specs: {
      contextWindow,
      quantization: findFirstString(info, ['quantization', 'precision']) ?? 'unknown',
      gpuAllocation: findFirstString(info, ['gpu_allocation', 'deployment']) ?? 'unknown',
    },
    badges,
    description: findFirstString(record, ['description']),
  };
}

function normalizeModelsPayload(payload: unknown): Model[] {
  const payloadRecord = asRecord(payload);

  if (!payloadRecord) {
    return [];
  }

  const candidates = [
    payloadRecord,
    payloadRecord.models,
    payloadRecord.data,
    payloadRecord.model_list,
  ];

  for (const candidate of candidates) {
    const items = asArray(candidate);
    if (items.length === 0) {
      continue;
    }

    const mapped = items
      .map((item) => mapModel(asRecord(item) ?? {}))
      .filter((model): model is Model => Boolean(model));

    if (mapped.length > 0) {
      return mapped;
    }
  }

  return [];
}

function dateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseUsage(payload: unknown): LiteLLMUsageSnapshot {
  const raw = asRecord(payload) ?? {};
  const promptTokens = sumNamedNumbers(raw, new Set(['prompt_tokens', 'input_tokens']));
  const completionTokens = sumNamedNumbers(raw, new Set(['completion_tokens', 'output_tokens']));
  const totalTokensFromPayload = sumNamedNumbers(raw, new Set(['total_tokens', 'tokens']));
  const spend = sumNamedNumbers(raw, new Set(['spend', 'total_spend', 'cost', 'total_cost']));
  const requests = sumNamedNumbers(raw, new Set(['requests', 'request_count', 'num_requests']));

  return {
    promptTokens,
    completionTokens,
    totalTokens: totalTokensFromPayload > 0 ? totalTokensFromPayload : promptTokens + completionTokens,
    spend,
    requests,
    windowStart: findFirstString(raw, ['start_date', 'start_time']),
    windowEnd: findFirstString(raw, ['end_date', 'end_time']),
    raw,
  };
}

function parseUserInfo(payload: unknown, fallbackUserId: string): LiteLLMUserInfo {
  const raw = asRecord(payload) ?? {};
  const candidateUser = asRecord(raw.user) ?? asRecord(raw.user_info) ?? raw;

  return {
    userId:
      findFirstString(candidateUser, ['user_id', 'user', 'id', 'sub']) ??
      fallbackUserId,
    role: findFirstString(candidateUser, ['role']),
    spend: findFirstNumber(candidateUser, ['spend', 'total_spend', 'current_spend']),
    maxBudget: findFirstNumber(candidateUser, ['max_budget', 'budget', 'soft_budget']),
    metadata: asRecord(candidateUser.metadata) ?? {},
    raw,
  };
}

export async function fetchLiteLLMModels(): Promise<Model[]> {
  const response = await requestLiteLLM('/models', { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load models (${response.status})`);
  }

  const payload = await response.json();
  return normalizeModelsPayload(payload);
}

interface UsageQuery {
  userId: string;
  appId: string;
  lookbackDays?: number;
}

export async function fetchLiteLLMUsage(query: UsageQuery): Promise<LiteLLMUsageSnapshot> {
  const lookbackDays = Math.max(1, query.lookbackDays ?? 7);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - lookbackDays);

  const params = new URLSearchParams();
  params.set('user_id', query.userId);
  params.set('app_id', query.appId);
  params.set('start_date', dateString(startDate));
  params.set('end_date', dateString(endDate));

  const response = await requestLiteLLM(`/usage?${params.toString()}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load usage (${response.status})`);
  }

  const payload = await response.json();
  return parseUsage(payload);
}

export async function fetchLiteLLMUserInfo(userId: string): Promise<LiteLLMUserInfo> {
  const params = new URLSearchParams();
  params.set('user_id', userId);

  const response = await requestLiteLLM(`/user/info?${params.toString()}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load user info (${response.status})`);
  }

  const payload = await response.json();
  return parseUserInfo(payload, userId);
}

export async function fetchLiteLLMUsersCount(): Promise<number> {
  const response = await requestLiteLLM('/users', { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`);
  }

  const payload = await response.json();
  const root = asRecord(payload);

  if (!root) {
    return 0;
  }

  const candidates = [root.users, root.data, payload];
  for (const candidate of candidates) {
    const items = asArray(candidate);
    if (items.length > 0) {
      return items.length;
    }
  }

  return 0;
}

export async function streamLiteLLMChat(
  request: ChatRequest,
  options: { signal?: AbortSignal } = {}
): Promise<Response> {
  return requestLiteLLM('/chat/completions', {
    method: 'POST',
    body: JSON.stringify(request),
    signal: options.signal,
  });
}
