import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ModelSelector } from '@/components/model/ModelSelector';
import { AuthWidget } from '@/components/auth/AuthWidget';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  History,
  Star,
  Folder,
  Settings,
  X,
} from 'lucide-react';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { 
    sidebarOpen, 
    conversations, 
    activeConversationId,
    setActiveConversation,
    clearCurrentConversation,
    toggleSidebar,
  } = useChatStore();
  
  const handleNewChat = () => {
    clearCurrentConversation();
  };
  
  const handleConversationClick = (id: string) => {
    setActiveConversation(id);
    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      useChatStore.setState({ currentMessages: conversation.messages });
    }
  };
  
  // Group conversations by date
  const groupedConversations = conversations.reduce((groups, conv) => {
    const date = new Date(conv.updatedAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'Previous 7 Days';
    } else {
      groupKey = 'Older';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(conv);
    return groups;
  }, {} as Record<string, typeof conversations>);
  
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];
  
  if (!sidebarOpen) {
    return (
      <div className="w-0 transition-all duration-300" />
    );
  }
  
  return (
    <div
      className={cn(
        'sidebar open flex flex-col h-full bg-carbon-800 border-r border-carbon-600 transition-all duration-300',
        isCollapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-carbon-600">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sovereign-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-text-primary">AetherOS</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-sovereign-500 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">A</span>
          </div>
        )}
        {!isCollapsed && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-secondary hover:text-text-primary"
              onClick={() => setIsCollapsed(true)}
              title="Collapse navigation"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-secondary hover:text-text-primary"
              onClick={toggleSidebar}
              title="Hide navigation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-secondary hover:text-text-primary mx-auto mt-2"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className={cn(
            'w-full bg-sovereign-500 hover:bg-sovereign-600 text-white',
            isCollapsed && 'px-2'
          )}
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">New Chat</span>}
        </Button>
      </div>
      
      {/* Model Selector */}
      {!isCollapsed && <ModelSelector />}
      
      {/* Conversation History */}
      {!isCollapsed && (
        <>
          <Separator className="bg-carbon-600" />
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full scrollbar-dark">
              <div className="p-3">
                <div className="flex items-center gap-2 mb-3 text-text-secondary">
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium">History</span>
                </div>
                
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-text-muted text-sm">
                    No conversations yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupOrder.map((group) => {
                      const groupConvs = groupedConversations[group];
                      if (!groupConvs || groupConvs.length === 0) return null;
                      
                      return (
                        <div key={group}>
                          <div className="text-xs text-text-muted mb-2 px-2">
                            {group}
                          </div>
                          <div className="space-y-1">
                            {groupConvs.map((conv) => (
                              <button
                                key={conv.id}
                                onClick={() => handleConversationClick(conv.id)}
                                className={cn(
                                  'w-full text-left px-2 py-2 rounded-md text-sm transition-colors',
                                  activeConversationId === conv.id
                                    ? 'bg-carbon-600 text-text-primary'
                                    : 'text-text-secondary hover:bg-carbon-700 hover:text-text-primary'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{conv.title}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
      
      {/* Bottom Actions */}
      {!isCollapsed && (
        <>
          <Separator className="bg-carbon-600" />
          <div className="p-3 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-carbon-700"
            >
              <Star className="h-4 w-4 mr-2" />
              Starred
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-carbon-700"
            >
              <Folder className="h-4 w-4 mr-2" />
              Folders
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-carbon-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </>
      )}
      
      {/* Auth Widget */}
      <Separator className="bg-carbon-600" />
      <div className="p-3">
        <AuthWidget isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
