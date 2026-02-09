import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ContextPanel } from '@/components/layout/ContextPanel';
import { MessageThread } from '@/components/chat/MessageThread';
import { Composer } from '@/components/chat/Composer';
import { setupApiInterceptors } from '@/lib/api/chat';
import { useChatStore } from '@/store/chatStore';
import { Button } from '@/components/ui/button';
import { PanelLeft, PanelRight } from 'lucide-react';
import './App.css';

function App() {
  const { sidebarOpen, contextPanelOpen, toggleSidebar, toggleContextPanel } = useChatStore();
  
  // Setup API interceptors on mount
  useEffect(() => {
    setupApiInterceptors();
  }, []);
  
  return (
    <div className="h-screen w-screen flex bg-carbon-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-carbon-600 flex items-center justify-between px-4 bg-carbon-800/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-secondary hover:text-text-primary"
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Hide navigation' : 'Show navigation'}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-text-primary">
              AetherOS
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-secondary hover:text-text-primary"
              onClick={toggleContextPanel}
              title={contextPanelOpen ? 'Hide control plane' : 'Show control plane'}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        </header>
        
        {/* Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <MessageThread />
            <Composer />
          </div>
          
          {/* Context Panel */}
          {contextPanelOpen && <ContextPanel />}
        </div>
      </div>
    </div>
  );
}

export default App;
