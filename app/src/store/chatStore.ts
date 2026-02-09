import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LITELLM_CONFIG } from '@/lib/api/litellm';
import type {
  ActivityEvent,
  ChatSettings,
  ContextTelemetryState,
  ControlPlaneTab,
  Conversation,
  FileArtifact,
  Message,
  Model,
  SearchResults,
  StreamingState,
} from '@/types/chat';

interface ChatState {
  // UI State
  sidebarOpen: boolean;
  contextPanelOpen: boolean;
  activeConversationId: string | null;
  controlPlaneTab: ControlPlaneTab;
  controlPlaneDebug: boolean;

  // Data
  conversations: Conversation[];
  currentMessages: Message[];
  streamingMessage: Message | null;
  models: Model[];
  activeModel: string | null;
  activityEvents: ActivityEvent[];
  uploadedFiles: FileArtifact[];
  generatedFiles: FileArtifact[];
  sessionId: string;

  // Configuration
  settings: ChatSettings;

  // Search
  searchResults: SearchResults | null;
  isSearching: boolean;

  // Streaming
  streamingState: StreamingState;

  // Context telemetry
  contextTelemetry: ContextTelemetryState;

  // Actions
  toggleSidebar: () => void;
  toggleContextPanel: () => void;
  setControlPlaneTab: (tab: ControlPlaneTab) => void;
  setControlPlaneDebug: (enabled: boolean) => void;
  toggleControlPlaneDebug: () => void;
  setActiveConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  setCurrentMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setModels: (models: Model[]) => void;
  setActiveModel: (modelId: string) => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  setSearchResults: (results: SearchResults | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setStreamingState: (state: Partial<StreamingState>) => void;
  resetStreaming: () => void;
  clearCurrentConversation: () => void;
  addActivityEvent: (event: ActivityEvent) => void;
  updateActivityEvent: (id: string, updates: Partial<ActivityEvent>) => void;
  clearActivityEvents: () => void;
  addUploadedFile: (file: FileArtifact) => void;
  addGeneratedFile: (file: FileArtifact) => void;
  setContextTelemetry: (telemetry: Partial<ContextTelemetryState>) => void;
  setSessionId: (sessionId: string) => void;
}

const defaultSettings: ChatSettings = {
  model: LITELLM_CONFIG.modelName,
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: 'You are a helpful AI assistant.',
  webSearch: false,
};

const initialStreamingState: StreamingState = {
  isStreaming: false,
  currentChunk: '',
  model: '',
  messageId: null,
};

const initialContextTelemetry: ContextTelemetryState = {
  usage: null,
  userInfo: null,
  usersCount: null,
  lastUpdated: null,
  loading: false,
  error: null,
};

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      contextPanelOpen: true,
      activeConversationId: null,
      controlPlaneTab: 'context',
      controlPlaneDebug: false,
      conversations: [],
      currentMessages: [],
      streamingMessage: null,
      models: [],
      activeModel: LITELLM_CONFIG.modelName,
      activityEvents: [],
      uploadedFiles: [],
      generatedFiles: [],
      sessionId: createSessionId(),
      settings: defaultSettings,
      searchResults: null,
      isSearching: false,
      streamingState: initialStreamingState,
      contextTelemetry: initialContextTelemetry,

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),

      setControlPlaneTab: (tab) => set({ controlPlaneTab: tab }),

      setControlPlaneDebug: (enabled) => set({ controlPlaneDebug: enabled }),

      toggleControlPlaneDebug: () => set((state) => ({ controlPlaneDebug: !state.controlPlaneDebug })),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      setConversations: (conversations) => set({ conversations }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: conversation.id,
          currentMessages: conversation.messages,
          sessionId: createSessionId(),
          activityEvents: [],
          generatedFiles: [],
          contextTelemetry: { ...initialContextTelemetry },
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates } : conv
          ),
        })),

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
          currentMessages: state.activeConversationId === id ? [] : state.currentMessages,
        })),

      setCurrentMessages: (messages) => set({ currentMessages: messages }),

      addMessage: (message) =>
        set((state) => ({
          currentMessages: [...state.currentMessages, message],
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          currentMessages: state.currentMessages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),

      setModels: (models) => {
        set({ models });

        const { activeModel, settings } = get();
        if (!activeModel && models.length > 0) {
          const preferredModel = models.find(
            (model) => model.id === LITELLM_CONFIG.modelName && model.status === 'available'
          );
          const firstAvailable = models.find((model) => model.status === 'available');
          const selectedModel = preferredModel ?? firstAvailable;
          if (selectedModel) {
            set({
              activeModel: selectedModel.id,
              settings: { ...settings, model: selectedModel.id },
            });
          }
        }
      },

      setActiveModel: (modelId) =>
        set((state) => ({
          activeModel: modelId,
          settings: { ...state.settings, model: modelId },
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setSearchResults: (results) => set({ searchResults: results }),

      setIsSearching: (isSearching) => set({ isSearching }),

      setStreamingState: (state) =>
        set((previous) => ({
          streamingState: { ...previous.streamingState, ...state },
        })),

      resetStreaming: () =>
        set({
          streamingState: initialStreamingState,
          streamingMessage: null,
        }),

      clearCurrentConversation: () =>
        set({
          activeConversationId: null,
          currentMessages: [],
          streamingMessage: null,
          activityEvents: [],
          generatedFiles: [],
          sessionId: createSessionId(),
          contextTelemetry: { ...initialContextTelemetry },
        }),

      addActivityEvent: (event) =>
        set((state) => {
          const next = [...state.activityEvents, event];
          const limit = 300;
          return {
            activityEvents: next.length > limit ? next.slice(next.length - limit) : next,
          };
        }),

      updateActivityEvent: (id, updates) =>
        set((state) => ({
          activityEvents: state.activityEvents.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        })),

      clearActivityEvents: () => set({ activityEvents: [] }),

      addUploadedFile: (file) =>
        set((state) => ({
          uploadedFiles: [file, ...state.uploadedFiles],
        })),

      addGeneratedFile: (file) =>
        set((state) => ({
          generatedFiles: [file, ...state.generatedFiles],
        })),

      setContextTelemetry: (telemetry) =>
        set((state) => ({
          contextTelemetry: { ...state.contextTelemetry, ...telemetry },
        })),

      setSessionId: (sessionId) => set({ sessionId }),
    }),
    {
      name: 'aetheros-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        settings: state.settings,
        activeModel: state.activeModel,
        sidebarOpen: state.sidebarOpen,
        contextPanelOpen: state.contextPanelOpen,
        controlPlaneTab: state.controlPlaneTab,
        controlPlaneDebug: state.controlPlaneDebug,
      }),
    }
  )
);
