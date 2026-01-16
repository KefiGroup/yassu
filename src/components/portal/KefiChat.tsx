import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';

function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<strong class="block text-base mt-3 mb-1">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong class="block text-lg mt-3 mb-1">$1</strong>')
    .replace(/^# (.+)$/gm, '<strong class="block text-xl mt-3 mb-1">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<span class="block pl-2">• $1</span>')
    .replace(/^\d+\. (.+)$/gm, '<span class="block pl-2">$&</span>');
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE = `Hi! I'm Kefi, your Yassu assistant.

I can help you with:
- Posting and improving your startup ideas
- Generating business plans and pitch decks
- Finding co-founders and building teams
- Using platform features

Just type your question below!`;

// Global event for opening chat from header
export const openKefiChat = () => {
  window.dispatchEvent(new CustomEvent('openKefiChat'));
};

export function KefiChat() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Listen for external open events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openKefiChat', handleOpen);
    return () => window.removeEventListener('openKefiChat', handleOpen);
  }, []);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const data = await api.post<{ success: boolean; message: string }>('/help/chat', {
        message: userMessage.content,
        conversationHistory
      });
      
      if (data.success && data.message) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Kefi chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I had trouble processing that. Please try again or rephrase your question."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-12 rounded-full shadow-lg z-50 gap-2 px-5"
          data-testid="button-kefi-open"
        >
          <HelpCircle className="h-5 w-5" />
          <span className="font-medium">Help</span>
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[380px] h-[500px] flex flex-col shadow-xl z-50 overflow-hidden" data-testid="card-kefi-chat">
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Kefi</span>
              <span className="text-sm opacity-80">Your Yassu Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-kefi-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                        : 'bg-muted'
                    }`}
                    data-testid={`message-${message.role}-${message.id}`}
                    dangerouslySetInnerHTML={
                      message.role === 'assistant' 
                        ? { __html: formatMarkdown(message.content) }
                        : undefined
                    }
                  >
                    {message.role === 'user' ? message.content : undefined}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Kefi anything..."
                className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                disabled={isLoading}
                data-testid="input-kefi-message"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                data-testid="button-kefi-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
