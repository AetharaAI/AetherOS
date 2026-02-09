import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from '@/store/chatStore';
import { useChatStream } from '@/hooks/useChatStream';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Send,
  Paperclip,
  Image,
  Globe,
  Square,
  Wrench,
  Bot,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { estimateTokens } from '@/hooks/useTokenCount';

export function Composer() {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    settings, 
    updateSettings, 
    activeModel,
    addUploadedFile,
    isSearching,
    searchResults,
    setSearchResults,
    uploadedFiles,
  } = useChatStore();
  
  const { sendMessage, stopGeneration, isLoading } = useChatStream({
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);
  
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading || !activeModel) return;
    
    const message = input.trim();
    setInput('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    await sendMessage(message);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    registerFiles(e.dataTransfer.files);
  };

  const registerFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    Array.from(files).forEach((file) => {
      addUploadedFile({
        id: uuidv4(),
        name: file.name,
        size: file.size,
        kind: 'uploaded',
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      });
    });
  };

  const openFilePicker = () => {
    if (!activeModel) {
      return;
    }
    fileInputRef.current?.click();
  };
  
  const toggleWebSearch = () => {
    updateSettings({ webSearch: !settings.webSearch });
    if (settings.webSearch) {
      setSearchResults(null);
    }
  };
  
  const estimatedTokens = estimateTokens(input);
  const recentUploads = uploadedFiles.slice(0, 4);
  
  return (
    <div className="border-t border-carbon-600 bg-carbon-800/50">
      {/* Search Results Preview */}
      {searchResults && settings.webSearch && (
        <div className="px-4 py-2 border-b border-carbon-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-forge-cyan" />
              <span className="text-sm text-text-secondary">Search Results</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-text-muted hover:text-text-primary"
              onClick={() => setSearchResults(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-dark">
            {searchResults.results.slice(0, 3).map((result, idx) => (
              <a
                key={idx}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-forge-cyan hover:underline truncate"
              >
                {result.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {recentUploads.length > 0 && (
        <div className="border-b border-carbon-600 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {recentUploads.map((file) => (
              <Badge key={file.id} variant="outline" className="border-carbon-500 text-[10px] text-text-secondary">
                {file.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div
        className={cn(
          'p-4',
          isDragging && 'bg-carbon-700/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              registerFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeModel 
                ? "Message the assistant..." 
                : "Select a model to start chatting"
              }
              disabled={!activeModel || isLoading}
              className={cn(
                'min-h-[56px] max-h-[200px] pr-24 pb-10',
                'bg-carbon-700 border-carbon-600 text-text-primary placeholder:text-text-muted',
                'resize-none focus-visible:ring-sovereign-500 focus-visible:ring-1',
                !activeModel && 'opacity-50 cursor-not-allowed'
              )}
              rows={1}
            />
            
            {/* Bottom Toolbar */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              {/* Left Actions */}
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-muted hover:text-text-primary hover:bg-carbon-600"
                        disabled={!activeModel}
                        onClick={openFilePicker}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attach file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-text-muted hover:text-text-primary hover:bg-carbon-600"
                        disabled={!activeModel}
                        onClick={openFilePicker}
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload image</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={settings.webSearch ? 'secondary' : 'ghost'}
                        size="sm"
                        className={cn(
                          'h-8 gap-1.5',
                          settings.webSearch 
                            ? 'bg-forge-cyan/20 text-forge-cyan hover:bg-forge-cyan/30' 
                            : 'text-text-muted hover:text-text-primary hover:bg-carbon-600'
                        )}
                        onClick={toggleWebSearch}
                        disabled={!activeModel}
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                        <span className="text-xs">Search</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enable web search</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-text-muted hover:text-text-primary hover:bg-carbon-600"
                        disabled={!activeModel}
                      >
                        <Wrench className="h-4 w-4" />
                        <span className="text-xs">Tools</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use tools</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-text-muted hover:text-text-primary hover:bg-carbon-600"
                        disabled={!activeModel}
                      >
                        <Bot className="h-4 w-4" />
                        <span className="text-xs">Agents</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AgentForge agents</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Right Actions */}
              <div className="flex items-center gap-2">
                {/* Token count */}
                {input.length > 0 && (
                  <span className="text-xs text-text-muted font-mono">
                    ~{estimatedTokens} tokens
                  </span>
                )}
                
                {/* Submit/Stop Button */}
                {isLoading ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={stopGeneration}
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className={cn(
                      'h-8 w-8',
                      input.trim() && activeModel
                        ? 'bg-sovereign-500 hover:bg-sovereign-600 text-white'
                        : 'bg-carbon-600 text-text-muted cursor-not-allowed'
                    )}
                    disabled={!input.trim() || !activeModel}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
        
        {/* Footer Info */}
        <div className="max-w-3xl mx-auto mt-2 flex items-center justify-center gap-4 text-xs text-text-muted">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {activeModel && (
            <Badge variant="outline" className="text-[10px] border-carbon-500">
              <Sparkles className="h-3 w-3 mr-1 text-sovereign-500" />
              {activeModel}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
