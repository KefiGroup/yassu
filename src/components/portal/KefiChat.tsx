import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, HelpCircle, MessageSquarePlus, ArrowLeft, Camera, Image, Trash2, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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

type ChatMode = 'select' | 'help' | 'feedback' | 'bug';

const HELP_WELCOME_MESSAGE = `Hi! I'm Kefi, your Yassu assistant.

I can help you with:
- Posting and improving your startup ideas
- Generating business plans and pitch decks
- Finding co-founders and building teams
- Using platform features

Just type your question below!`;

const FEEDBACK_WELCOME_MESSAGE = `We'd love to hear from you!

Share your suggestions, feature requests, or any feedback to help us improve Yassu for all student founders.

Type your feedback below and we'll make sure the team sees it.`;

const BUG_WELCOME_MESSAGE = `Found something that's not working?

Please describe what you were trying to do, what happened, and what you expected to happen. Adding a screenshot helps us fix things faster!`;

// Global event for opening chat from header
export const openKefiChat = () => {
  window.dispatchEvent(new CustomEvent('openKefiChat'));
};

export function KefiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('select');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bugInputRef = useRef<HTMLInputElement>(null);
  
  // Listen for external open events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openKefiChat', handleOpen);
    return () => window.removeEventListener('openKefiChat', handleOpen);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: HELP_WELCOME_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && mode === 'help' && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen && mode === 'feedback' && feedbackRef.current) {
      feedbackRef.current.focus();
    }
  }, [isOpen, mode]);

  const handleClose = () => {
    setIsOpen(false);
    // Reset to select mode when closing
    setMode('select');
    setFeedbackText('');
    setFeedbackSubmitted(false);
    setBugText('');
    setBugSubmitted(false);
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleSelectMode = (selectedMode: 'help' | 'feedback' | 'bug') => {
    setMode(selectedMode);
    if (selectedMode === 'help') {
      setMessages([{ id: 'welcome', role: 'assistant', content: HELP_WELCOME_MESSAGE }]);
    }
  };

  const handleBackToSelect = () => {
    setMode('select');
    setFeedbackText('');
    setFeedbackSubmitted(false);
    setBugText('');
    setBugSubmitted(false);
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setMessages([{ id: 'welcome', role: 'assistant', content: HELP_WELCOME_MESSAGE }]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      let attachmentUrl: string | undefined;
      
      if (screenshotFile) {
        const urlResponse = await fetch('/api/uploads/request-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `feedback-${Date.now()}-${screenshotFile.name}`,
            size: screenshotFile.size,
            contentType: screenshotFile.type
          })
        });
        
        if (urlResponse.ok) {
          const { uploadURL, objectPath } = await urlResponse.json();
          
          const uploadResult = await fetch(uploadURL, {
            method: 'PUT',
            headers: { 'Content-Type': screenshotFile.type },
            body: screenshotFile
          });
          
          if (uploadResult.ok) {
            attachmentUrl = `/objects${objectPath}`;
          }
        }
      }
      
      await api.post('/help/chat', {
        message: `I have a suggestion: ${feedbackText.trim()}`,
        conversationHistory: [],
        attachmentUrl
      });
      setFeedbackSubmitted(true);
      setFeedbackText('');
      clearScreenshot();
    } catch (error) {
      console.error('Feedback submission error:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSubmitBug = async () => {
    if (!bugText.trim() || isSubmittingBug) return;

    setIsSubmittingBug(true);
    try {
      let attachmentUrl: string | undefined;
      
      if (screenshotFile) {
        const urlResponse = await fetch('/api/uploads/request-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `bug-${Date.now()}-${screenshotFile.name}`,
            size: screenshotFile.size,
            contentType: screenshotFile.type
          })
        });
        
        if (urlResponse.ok) {
          const { uploadURL, objectPath } = await urlResponse.json();
          
          const uploadResult = await fetch(uploadURL, {
            method: 'PUT',
            headers: { 'Content-Type': screenshotFile.type },
            body: screenshotFile
          });
          
          if (uploadResult.ok) {
            attachmentUrl = `/objects${objectPath}`;
          }
        }
      }
      
      await api.post('/help/chat', {
        message: `BUG REPORT: ${bugText.trim()}`,
        conversationHistory: [],
        attachmentUrl
      });
      setBugSubmitted(true);
      setBugText('');
      clearScreenshot();
    } catch (error) {
      console.error('Bug submission error:', error);
    } finally {
      setIsSubmittingBug(false);
    }
  };

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
          <span className="font-medium">Help & Feedback</span>
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[380px] h-[500px] flex flex-col shadow-xl z-50 overflow-hidden" data-testid="card-kefi-chat">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              {mode !== 'select' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToSelect}
                  className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 mr-1"
                  data-testid="button-kefi-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Kefi</span>
              <span className="text-sm opacity-80">
                {mode === 'help' ? 'Help' : mode === 'feedback' ? 'Feedback' : mode === 'bug' ? 'Bug Report' : 'Your Assistant'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              data-testid="button-kefi-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Mode Selection View */}
          {mode === 'select' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold mb-1">Hi! I'm Kefi</h3>
                <p className="text-sm text-muted-foreground">How can I help you today?</p>
              </div>
              
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover-elevate"
                  onClick={() => handleSelectMode('help')}
                  data-testid="button-kefi-mode-help"
                >
                  <HelpCircle className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium">Get Help</div>
                    <div className="text-xs text-muted-foreground">Ask questions about using Yassu</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover-elevate"
                  onClick={() => handleSelectMode('feedback')}
                  data-testid="button-kefi-mode-feedback"
                >
                  <MessageSquarePlus className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium">Submit Feedback</div>
                    <div className="text-xs text-muted-foreground">Share suggestions or ideas</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-center gap-2 hover-elevate"
                  onClick={() => handleSelectMode('bug')}
                  data-testid="button-kefi-mode-bug"
                >
                  <Bug className="h-8 w-8 text-destructive" />
                  <div className="text-center">
                    <div className="font-medium">Report a Bug</div>
                    <div className="text-xs text-muted-foreground">Something not working right?</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Help Mode - Chat View */}
          {mode === 'help' && (
            <>
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
            </>
          )}

          {/* Feedback Mode */}
          {mode === 'feedback' && (
            <div className="flex-1 flex flex-col p-4">
              {!feedbackSubmitted ? (
                <>
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: formatMarkdown(FEEDBACK_WELCOME_MESSAGE) }} />
                  </div>
                  
                  <Textarea
                    ref={feedbackRef}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="What would you like to see improved or added to Yassu?"
                    className="flex-1 resize-none mb-3"
                    disabled={isSubmittingFeedback}
                    data-testid="textarea-kefi-feedback"
                  />
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                    data-testid="input-kefi-screenshot"
                  />
                  
                  {screenshotPreview ? (
                    <div className="relative mb-3 rounded-lg border overflow-hidden">
                      <img 
                        src={screenshotPreview} 
                        alt="Screenshot preview" 
                        className="w-full h-24 object-cover"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={clearScreenshot}
                        data-testid="button-kefi-remove-screenshot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-3 w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmittingFeedback}
                      data-testid="button-kefi-add-screenshot"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Add Screenshot (optional)
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackText.trim() || isSubmittingFeedback}
                    className="w-full"
                    data-testid="button-kefi-submit-feedback"
                  >
                    {isSubmittingFeedback ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <MessageSquarePlus className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your feedback has been recorded. The Yassu team will review it to make the platform better for all student founders.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFeedbackSubmitted(false);
                        setFeedbackText('');
                      }}
                      data-testid="button-kefi-another-feedback"
                    >
                      Submit Another
                    </Button>
                    <Button
                      onClick={handleBackToSelect}
                      data-testid="button-kefi-back-home"
                    >
                      Back to Menu
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bug Report Mode */}
          {mode === 'bug' && (
            <div className="flex-1 flex flex-col p-4">
              {!bugSubmitted ? (
                <>
                  <div className="bg-destructive/10 rounded-lg p-4 mb-4 border border-destructive/20">
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: formatMarkdown(BUG_WELCOME_MESSAGE) }} />
                  </div>
                  
                  <Textarea
                    value={bugText}
                    onChange={(e) => setBugText(e.target.value)}
                    placeholder="Describe the bug: what happened and what did you expect?"
                    className="flex-1 resize-none mb-3"
                    disabled={isSubmittingBug}
                    data-testid="textarea-kefi-bug"
                  />
                  
                  <input
                    type="file"
                    ref={bugInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                    data-testid="input-kefi-bug-screenshot"
                  />
                  
                  {screenshotPreview ? (
                    <div className="relative mb-3 rounded-lg border overflow-hidden">
                      <img 
                        src={screenshotPreview} 
                        alt="Screenshot preview" 
                        className="w-full h-24 object-cover"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={clearScreenshot}
                        data-testid="button-kefi-remove-bug-screenshot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-3 w-full"
                      onClick={() => bugInputRef.current?.click()}
                      disabled={isSubmittingBug}
                      data-testid="button-kefi-add-bug-screenshot"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Add Screenshot (recommended)
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleSubmitBug}
                    disabled={!bugText.trim() || isSubmittingBug}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-kefi-submit-bug"
                  >
                    {isSubmittingBug ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Bug className="h-4 w-4 mr-2" />
                        Submit Bug Report
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <Bug className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Bug Reported!</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Thank you for helping us improve Yassu! Our team will investigate this issue.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBugSubmitted(false);
                        setBugText('');
                      }}
                      data-testid="button-kefi-another-bug"
                    >
                      Report Another
                    </Button>
                    <Button
                      onClick={handleBackToSelect}
                      data-testid="button-kefi-back-home-bug"
                    >
                      Back to Menu
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
