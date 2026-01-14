import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Search, 
  ArrowLeft,
  Loader2,
  User,
  Plus,
} from 'lucide-react';

interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerAvatar: string | null;
  partnerHeadline: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: number;
  recipientId: number;
  content: string;
  read: boolean;
  createdAt: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    
    try {
      const response = await fetch(`/api/messages/${conversation.partnerId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Update unread count in conversations list
        setConversations(prev => prev.map(c => 
          c.partnerId === conversation.partnerId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: selectedConversation.partnerId,
          content: newMessage.trim(),
        }),
      });
      
      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        
        // Update last message in conversation
        setConversations(prev => prev.map(c => 
          c.partnerId === selectedConversation.partnerId 
            ? { ...c, lastMessage: message.content, lastMessageAt: message.createdAt }
            : c
        ));
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with your teammates and collaborators
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="h-[calc(100%-4rem)]"
      >
        <Card className="h-full">
          <CardContent className="p-0 h-full flex">
            {/* Conversations List */}
            <div className={`w-full md:w-80 border-r flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-conversations"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                {filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.partnerId}
                        onClick={() => selectConversation(conversation)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedConversation?.partnerId === conversation.partnerId ? 'bg-muted' : ''
                        }`}
                        data-testid={`conversation-${conversation.partnerId}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conversation.partnerAvatar || undefined} />
                            <AvatarFallback>{getInitials(conversation.partnerName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{conversation.partnerName}</p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="shrink-0">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage || 'No messages yet'}
                            </p>
                            {conversation.lastMessageAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTime(conversation.lastMessageAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </p>
                    <p className="text-muted-foreground text-xs mt-2">
                      Visit a collaborator's profile to start messaging
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/portal/collaborators')}
                      data-testid="button-find-collaborators"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Find Collaborators
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Messages Panel */}
            <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden"
                      onClick={() => setSelectedConversation(null)}
                      data-testid="button-back-conversations"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar 
                      className="w-10 h-10 cursor-pointer"
                      onClick={() => navigate(`/portal/users/${selectedConversation.partnerId}`)}
                    >
                      <AvatarImage src={selectedConversation.partnerAvatar || undefined} />
                      <AvatarFallback>{getInitials(selectedConversation.partnerName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => navigate(`/portal/users/${selectedConversation.partnerId}`)}
                      >
                        {selectedConversation.partnerName}
                      </p>
                      {selectedConversation.partnerHeadline && (
                        <p className="text-sm text-muted-foreground truncate">
                          {selectedConversation.partnerHeadline}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isOwn = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                  isOwn 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {formatTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">
                          Start the conversation by sending a message
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sending}
                        data-testid="input-message"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim() || sending}
                        data-testid="button-send-message"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground text-sm">
                      Choose a conversation from the list or start a new one
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
