import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Users,
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

interface TeamChat {
  teamId: string;
  teamName: string;
  teamImage: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  lastMessageSender: string;
  unreadCount: number;
}

interface TeamMessage {
  id: string;
  teamId: string;
  senderId: number;
  content: string;
  createdAt: string;
  senderName: string | null;
  senderAvatar: string | null;
}

interface SearchUser {
  userId: number;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  connectionStatus: 'none' | 'pending' | 'accepted';
  connectionId: string | null;
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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'dms' | 'teams'>('dms');
  
  // DM state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Team chat state
  const [teamChats, setTeamChats] = useState<TeamChat[]>([]);
  const [selectedTeamChat, setSelectedTeamChat] = useState<TeamChat | null>(null);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [selectedTeamInfo, setSelectedTeamInfo] = useState<{ id: string; name: string; imageUrl: string | null } | null>(null);
  
  // Common state
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New message dialog state
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [loadingSearchUsers, setLoadingSearchUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Connection confirmation dialog state
  const [showConnectionConfirm, setShowConnectionConfirm] = useState(false);
  const [pendingMessageUser, setPendingMessageUser] = useState<SearchUser | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingConnectionRequest, setSendingConnectionRequest] = useState(false);
  
  // Track connection status for current conversation partner
  const [partnerConnectionStatus, setPartnerConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('accepted');

  useEffect(() => {
    fetchConversations();
    fetchTeamChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, teamMessages]);

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

  const fetchTeamChats = async () => {
    try {
      const response = await fetch('/api/team-messages/chats', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTeamChats(data);
      }
    } catch (error) {
      console.error('Failed to fetch team chats:', error);
    }
  };

  const fetchSearchUsers = async (query: string = '') => {
    setLoadingSearchUsers(true);
    try {
      const response = await fetch(`/api/messages/search-users?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSearchUsers(data);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoadingSearchUsers(false);
    }
  };

  // Debounce search
  useEffect(() => {
    if (!showNewMessageDialog) return;
    const timer = setTimeout(() => {
      fetchSearchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, showNewMessageDialog]);

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedTeamChat(null);
    setLoadingMessages(true);
    
    try {
      // Fetch messages and connection status in parallel
      const [msgResponse, connResponse] = await Promise.all([
        fetch(`/api/messages/${conversation.partnerId}`, { credentials: 'include' }),
        fetch(`/api/connections/status/${conversation.partnerId}`, { credentials: 'include' }),
      ]);
      
      if (msgResponse.ok) {
        const data = await msgResponse.json();
        setMessages(data);
        setConversations(prev => prev.map(c => 
          c.partnerId === conversation.partnerId ? { ...c, unreadCount: 0 } : c
        ));
      }
      
      if (connResponse.ok) {
        const connData = await connResponse.json();
        setPartnerConnectionStatus(connData.status || 'none');
      } else {
        setPartnerConnectionStatus('none');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const selectTeamChat = async (teamChat: TeamChat) => {
    setSelectedTeamChat(teamChat);
    setSelectedConversation(null);
    setLoadingMessages(true);
    
    try {
      const response = await fetch(`/api/team-messages/${teamChat.teamId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTeamMessages(data.messages);
        setSelectedTeamInfo(data.team);
        setTeamChats(prev => prev.map(c => 
          c.teamId === teamChat.teamId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Failed to fetch team messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    if (selectedConversation) {
      await sendDirectMessage();
    } else if (selectedTeamChat) {
      await sendTeamMessage();
    }
  };

  const sendDirectMessage = async () => {
    if (!selectedConversation) return;
    
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

  const sendTeamMessage = async () => {
    if (!selectedTeamChat) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/team-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teamId: selectedTeamChat.teamId,
          content: newMessage.trim(),
        }),
      });
      
      if (response.ok) {
        const message = await response.json();
        setTeamMessages(prev => [...prev, message]);
        setNewMessage('');
        setTeamChats(prev => prev.map(c => 
          c.teamId === selectedTeamChat.teamId 
            ? { ...c, lastMessage: message.content, lastMessageAt: message.createdAt, lastMessageSender: message.senderName }
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

  const handleUserSelect = (selectedUser: SearchUser) => {
    // Check if already connected or pending - allow messaging directly
    if (selectedUser.connectionStatus === 'accepted' || selectedUser.connectionStatus === 'pending') {
      startConversationWithUser(selectedUser);
    } else {
      // Show confirmation dialog for non-connected users (no existing connection)
      setPendingMessageUser(selectedUser);
      setConnectionMessage('');
      setShowConnectionConfirm(true);
    }
  };

  const startConversationWithUser = (selectedUser: SearchUser) => {
    const partnerId = selectedUser.userId;
    
    const existingConv = conversations.find(c => c.partnerId === partnerId);
    if (existingConv) {
      selectConversation(existingConv);
      setShowNewMessageDialog(false);
      setActiveTab('dms');
      setPartnerConnectionStatus(selectedUser.connectionStatus);
      return;
    }
    
    const newConv: Conversation = {
      partnerId,
      partnerName: selectedUser.fullName || 'Unknown',
      partnerAvatar: selectedUser.avatarUrl,
      partnerHeadline: selectedUser.headline,
      lastMessage: '',
      lastMessageAt: null,
      unreadCount: 0,
    };
    
    setConversations(prev => [newConv, ...prev]);
    setSelectedConversation(newConv);
    setSelectedTeamChat(null);
    setMessages([]);
    setShowNewMessageDialog(false);
    setActiveTab('dms');
    setPartnerConnectionStatus(selectedUser.connectionStatus);
  };

  const handleSendConnectionAndMessage = async () => {
    if (!pendingMessageUser) return;
    
    setSendingConnectionRequest(true);
    try {
      // Send connection request
      const connResponse = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: pendingMessageUser.userId,
          message: connectionMessage || 'I would like to connect with you.',
        }),
      });
      
      if (!connResponse.ok) {
        const error = await connResponse.json();
        throw new Error(error.error || 'Failed to send connection request');
      }
      
      toast({
        title: 'Connection Request Sent',
        description: `A connection request has been sent to ${pendingMessageUser.fullName}. They will need to accept it to connect.`,
      });
      
      // Start conversation
      startConversationWithUser({ ...pendingMessageUser, connectionStatus: 'pending' });
      setShowConnectionConfirm(false);
      setPendingMessageUser(null);
      setConnectionMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send connection request',
        variant: 'destructive',
      });
    } finally {
      setSendingConnectionRequest(false);
    }
  };

  const handleConnectFromChat = async () => {
    if (!selectedConversation) return;
    
    setSendingConnectionRequest(true);
    try {
      const connResponse = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: selectedConversation.partnerId,
          message: 'I would like to connect with you.',
        }),
      });
      
      if (!connResponse.ok) {
        const error = await connResponse.json();
        throw new Error(error.error || 'Failed to send connection request');
      }
      
      toast({
        title: 'Connection Request Sent',
        description: `A connection request has been sent to ${selectedConversation.partnerName}.`,
      });
      
      setPartnerConnectionStatus('pending');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send connection request',
        variant: 'destructive',
      });
    } finally {
      setSendingConnectionRequest(false);
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

  const filteredTeamChats = teamChats.filter(c =>
    c.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0) + 
                      teamChats.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveChat = selectedConversation || selectedTeamChat;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with your teammates and collaborators
          </p>
        </div>
        <Dialog open={showNewMessageDialog} onOpenChange={(open) => {
          setShowNewMessageDialog(open);
          if (open) {
            setUserSearchQuery('');
            fetchSearchUsers('');
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-new-message"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search people..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-users"
                />
              </div>
              <ScrollArea className="h-[300px]">
                {loadingSearchUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchUsers.length > 0 ? (
                  <div className="space-y-2">
                    {searchUsers.map((userItem) => (
                      <div
                        key={userItem.userId}
                        onClick={() => handleUserSelect(userItem)}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        data-testid={`user-${userItem.userId}`}
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={userItem.avatarUrl || undefined} />
                          <AvatarFallback>{getInitials(userItem.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{userItem.fullName}</p>
                            {userItem.connectionStatus === 'accepted' && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">Connected</Badge>
                            )}
                            {userItem.connectionStatus === 'pending' && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">Pending</Badge>
                            )}
                          </div>
                          {userItem.headline && (
                            <p className="text-sm text-muted-foreground truncate max-w-full">
                              {userItem.headline}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {userSearchQuery 
                        ? `No people found matching "${userSearchQuery}"` 
                        : loadingSearchUsers 
                          ? 'Loading...' 
                          : 'No other users on the platform yet'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Connection confirmation dialog */}
        <Dialog open={showConnectionConfirm} onOpenChange={setShowConnectionConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Connection Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                You are not connected with <strong>{pendingMessageUser?.fullName}</strong>. 
                A connection request will be sent along with your message.
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Add a message (optional)
                </label>
                <Input
                  placeholder="Hi, I'd like to connect..."
                  value={connectionMessage}
                  onChange={(e) => setConnectionMessage(e.target.value)}
                  data-testid="input-connection-message"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowConnectionConfirm(false);
                    setPendingMessageUser(null);
                  }}
                  data-testid="button-cancel-connection"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendConnectionAndMessage}
                  disabled={sendingConnectionRequest}
                  data-testid="button-send-connection"
                >
                  {sendingConnectionRequest ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Send Request & Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
            <div className={`w-full md:w-80 border-r flex flex-col ${hasActiveChat ? 'hidden md:flex' : 'flex'}`}>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dms' | 'teams')} className="flex flex-col h-full">
                <div className="p-4 border-b space-y-3">
                  <TabsList className="w-full">
                    <TabsTrigger value="dms" className="flex-1" data-testid="tab-dms">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      DMs
                      {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
                        <Badge variant="default" className="ml-2">
                          {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="flex-1" data-testid="tab-teams">
                      <Users className="w-4 h-4 mr-2" />
                      Teams
                      {teamChats.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
                        <Badge variant="default" className="ml-2">
                          {teamChats.reduce((sum, c) => sum + c.unreadCount, 0)}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={activeTab === 'dms' ? 'Search conversations...' : 'Search team chats...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-conversations"
                    />
                  </div>
                </div>
                
                <TabsContent value="dms" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
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
                          Click "New Message" to start chatting
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="teams" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    {filteredTeamChats.length > 0 ? (
                      <div className="divide-y">
                        {filteredTeamChats.map((teamChat) => (
                          <div
                            key={teamChat.teamId}
                            onClick={() => selectTeamChat(teamChat)}
                            className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedTeamChat?.teamId === teamChat.teamId ? 'bg-muted' : ''
                            }`}
                            data-testid={`team-chat-${teamChat.teamId}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={teamChat.teamImage || undefined} />
                                <AvatarFallback>
                                  <Users className="w-5 h-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium truncate">{teamChat.teamName}</p>
                                  {teamChat.unreadCount > 0 && (
                                    <Badge variant="default" className="shrink-0">
                                      {teamChat.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {teamChat.lastMessage 
                                    ? `${teamChat.lastMessageSender}: ${teamChat.lastMessage}`
                                    : 'No messages yet'}
                                </p>
                                {teamChat.lastMessageAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatTime(teamChat.lastMessageAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">No team chats yet</p>
                        <p className="text-muted-foreground text-xs mt-2">
                          Join a team to start group messaging
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => navigate('/portal/ideas')}
                          data-testid="button-explore-ideas"
                        >
                          Explore Ideas
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Messages Panel */}
            <div className={`flex-1 flex flex-col ${!hasActiveChat ? 'hidden md:flex' : 'flex'}`}>
              {hasActiveChat ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden"
                      onClick={() => {
                        setSelectedConversation(null);
                        setSelectedTeamChat(null);
                      }}
                      data-testid="button-back-conversations"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    
                    {selectedConversation && (
                      <>
                        <Avatar 
                          className="w-10 h-10 cursor-pointer"
                          onClick={() => navigate(`/portal/users/${selectedConversation.partnerId}`)}
                        >
                          <AvatarImage src={selectedConversation.partnerAvatar || undefined} />
                          <AvatarFallback>{getInitials(selectedConversation.partnerName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p 
                              className="font-medium cursor-pointer hover:underline"
                              onClick={() => navigate(`/portal/users/${selectedConversation.partnerId}`)}
                            >
                              {selectedConversation.partnerName}
                            </p>
                            {partnerConnectionStatus === 'pending' && (
                              <Badge variant="outline" className="text-xs">Pending</Badge>
                            )}
                          </div>
                          {selectedConversation.partnerHeadline && (
                            <p className="text-sm text-muted-foreground truncate">
                              {selectedConversation.partnerHeadline}
                            </p>
                          )}
                        </div>
                        {partnerConnectionStatus === 'none' && (
                          <Button 
                            size="sm"
                            onClick={handleConnectFromChat}
                            disabled={sendingConnectionRequest}
                            data-testid="button-connect-from-chat"
                          >
                            {sendingConnectionRequest ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Connect
                          </Button>
                        )}
                      </>
                    )}
                    
                    {selectedTeamChat && (
                      <>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedTeamChat.teamImage || undefined} />
                          <AvatarFallback>
                            <Users className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{selectedTeamChat.teamName}</p>
                          <p className="text-sm text-muted-foreground">Team Chat</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (selectedConversation ? messages : teamMessages).length > 0 ? (
                      <div className="space-y-4">
                        {selectedConversation && messages.map((message) => {
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
                        
                        {selectedTeamChat && teamMessages.map((message) => {
                          const isOwn = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isOwn && (
                                <Avatar className="w-8 h-8 mr-2 shrink-0">
                                  <AvatarImage src={message.senderAvatar || undefined} />
                                  <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                  isOwn 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                }`}
                              >
                                {!isOwn && (
                                  <p className="text-xs font-medium mb-1">{message.senderName}</p>
                                )}
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
