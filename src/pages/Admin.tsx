import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Shield, Award, Users, ShieldCheck, ShieldX, Lightbulb, Lock, Globe, UserCog, Eye, ArrowLeft, Trash2, Megaphone, Plus, Calendar, Edit, AlertCircle, Info, Bell, Wrench, MessageSquare, CheckCircle, XCircle, Clock, Rocket, Send, Star, ImageIcon, RefreshCw, Mail, Archive, Reply, BarChart3, Gavel, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ProfileBadge {
  id: string;
  userId: number;
  badgeType: 'ambassador' | 'advisor';
  awardedBy: number;
  awardedAt: string;
}

interface ProfileWithBadges {
  id: number;
  userId: number;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  badges: ProfileBadge[];
}

interface Idea {
  id: string;
  title: string;
  problem: string | null;
  creatorId: number;
  isPublic: boolean;
  isFeatured: boolean;
  stage: string | null;
  createdAt: string;
}

interface AdminUser {
  userId: number;
  email: string;
  fullName: string | null;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'maintenance' | 'event' | 'update' | 'general';
  priority: 'normal' | 'important' | 'urgent';
  startsAt: string;
  endsAt: string | null;
  eventDate: string | null;
  eventEndDate: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface Suggestion {
  id: number;
  userId: number | null;
  suggestion: string;
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
  adminNotes: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  inboxConversationId: number | null;
  createdAt: string;
  userEmail: string | null;
  userFullName: string | null;
}

interface FoundryEventAttendee {
  id: number;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: 'going' | 'maybe' | 'not_going';
}

interface FoundryEventWithAttendees {
  id: number;
  title: string;
  eventType: string;
  startTime: string;
  endTime: string | null;
  attendees: FoundryEventAttendee[];
}

interface RoadshowBooking {
  id: number;
  ideaId: string;
  ideaTitle: string;
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  eventId: number | null;
  eventTitle: string | null;
  eventStartTime: string | null;
  pitchDuration: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNotes: string | null;
  createdAt: string;
}

interface InboxConversation {
  id: number;
  userId: number | null;
  userEmail: string;
  userName: string | null;
  subject: string;
  conversationType: 'feedback' | 'support' | 'general';
  isResolved: boolean;
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
}

interface InboxMessage {
  id: number;
  conversationId: number;
  senderType: 'user' | 'admin';
  senderId: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string | null;
  attachmentUrl: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<ProfileWithBadges[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [foundryEvents, setFoundryEvents] = useState<FoundryEventWithAttendees[]>([]);
  const [roadshowBookings, setRoadshowBookings] = useState<RoadshowBooking[]>([]);
  const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
  const [adminGroups, setAdminGroups] = useState<any[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', slug: '', description: '', primaryColor: '', accentColor: '', universityId: '' });
  const [addMemberGroupSlug, setAddMemberGroupSlug] = useState<string | null>(null);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<string>('member');
  const [addMemberResults, setAddMemberResults] = useState<any[]>([]);
  const [addMemberSearching, setAddMemberSearching] = useState(false);
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<InboxMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [inboxLoading, setInboxLoading] = useState(false);
  const [outlookSyncing, setOutlookSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [ideaSearchQuery, setIdeaSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'general' as 'maintenance' | 'event' | 'update' | 'general',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: '',
    eventDate: '',
    eventEndDate: '',
    isActive: true,
    sendEmail: false,
  });

  useEffect(() => {
    async function checkAdmin() {
      try {
        const result = await apiRequest<{ isAdmin: boolean }>('/admin/check');
        setIsAdmin(result.isAdmin);
        
        if (!result.isAdmin) {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges.',
            variant: 'destructive',
          });
          navigate('/portal');
          return;
        }
        
        const [profilesData, ideasData, adminsData, announcementsData, suggestionsData, foundryEventsData, bookingsData, inboxData, groupsData, universitiesData] = await Promise.all([
          apiRequest<ProfileWithBadges[]>('/admin/profiles'),
          apiRequest<Idea[]>('/admin/ideas'),
          apiRequest<AdminUser[]>('/admin/admins'),
          apiRequest<Announcement[]>('/admin/announcements'),
          apiRequest<Suggestion[]>('/admin/suggestions'),
          apiRequest<FoundryEventWithAttendees[]>('/admin/foundry-events'),
          apiRequest<RoadshowBooking[]>('/admin/roadshow-bookings'),
          apiRequest<InboxConversation[]>('/admin/inbox'),
          apiRequest<any[]>('/groups'),
          apiRequest<{ id: string; name: string }[]>('/universities'),
        ]);
        
        setProfiles(profilesData);
        setIdeas(ideasData);
        setAdmins(adminsData);
        setAnnouncements(announcementsData);
        setSuggestions(suggestionsData);
        setFoundryEvents(foundryEventsData);
        setRoadshowBookings(bookingsData);
        setInboxConversations(inboxData);
        setAdminGroups(groupsData);
        setUniversities(universitiesData);
      } catch (error) {
        console.error('Admin check failed:', error);
        navigate('/portal');
      } finally {
        setLoading(false);
      }
    }
    
    checkAdmin();
  }, [navigate, toast]);

  // Computed values
  const inboxUnreadCount = inboxConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // Inbox handlers
  const handleSelectConversation = async (conversation: InboxConversation) => {
    // Clear previous messages and show loading state immediately to prevent stale data
    setConversationMessages([]);
    setReplyContent('');
    setSelectedConversation(conversation);
    setInboxLoading(true);
    
    try {
      const data = await apiRequest<{ conversation: InboxConversation; messages: InboxMessage[] }>(
        `/admin/inbox/${conversation.id}`
      );
      setConversationMessages(data.messages);
      // Update conversation with fresh data from server
      setSelectedConversation(data.conversation);
      // Update conversation unread count to 0 locally
      setInboxConversations(prev => 
        prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0, isResolved: data.conversation.isResolved } : c)
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
        variant: 'destructive',
      });
      setSelectedConversation(null);
    } finally {
      setInboxLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyContent.trim()) return;
    
    setActionLoading('inbox-reply');
    try {
      await apiRequest(`/admin/inbox/${selectedConversation.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      
      // Refresh conversation
      const data = await apiRequest<{ conversation: InboxConversation; messages: InboxMessage[] }>(
        `/admin/inbox/${selectedConversation.id}`
      );
      setConversationMessages(data.messages);
      setReplyContent('');
      
      toast({
        title: 'Reply Sent',
        description: 'Your reply has been sent and the user will receive an email.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleResolved = async (conversationId: number, currentStatus: boolean) => {
    setActionLoading(`resolve-${conversationId}`);
    try {
      await apiRequest(`/admin/inbox/${conversationId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ isResolved: !currentStatus }),
      });
      
      setInboxConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, isResolved: !currentStatus } : c)
      );
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, isResolved: !currentStatus } : null);
      }
      
      toast({
        title: currentStatus ? 'Reopened' : 'Resolved',
        description: `Conversation has been marked as ${currentStatus ? 'open' : 'resolved'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update conversation status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchiveConversation = async (conversationId: number, isArchived: boolean) => {
    setActionLoading(`archive-${conversationId}`);
    try {
      await apiRequest(`/admin/inbox/${conversationId}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !isArchived }),
      });
      
      setInboxConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setConversationMessages([]);
      }
      
      toast({
        title: isArchived ? 'Unarchived' : 'Archived',
        description: `Conversation has been ${isArchived ? 'restored' : 'archived'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive conversation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConversation = async (conversationId: number) => {
    if (!confirm('Are you sure you want to permanently delete this conversation? This cannot be undone.')) {
      return;
    }
    
    setActionLoading(`delete-${conversationId}`);
    try {
      await apiRequest(`/admin/inbox/${conversationId}`, {
        method: 'DELETE',
      });
      
      setInboxConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setConversationMessages([]);
      }
      
      toast({
        title: 'Deleted',
        description: 'Conversation has been permanently deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncOutlook = async () => {
    setOutlookSyncing(true);
    try {
      const result = await apiRequest<{ success: boolean; message: string }>('/admin/inbox/sync-outlook', {
        method: 'POST',
      });
      
      const inboxData = await apiRequest<InboxConversation[]>('/admin/inbox');
      setInboxConversations(inboxData);
      
      toast({
        title: 'Sync Complete',
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync Outlook emails',
        variant: 'destructive',
      });
    } finally {
      setOutlookSyncing(false);
    }
  };

  const handleAwardBadge = async (userId: number, badgeType: 'ambassador' | 'advisor') => {
    setActionLoading(`${userId}-${badgeType}-award`);
    try {
      await apiRequest('/admin/badges', {
        method: 'POST',
        body: JSON.stringify({ userId, badgeType }),
      });
      
      const profilesData = await apiRequest<ProfileWithBadges[]>('/admin/profiles');
      setProfiles(profilesData);
      
      toast({
        title: 'Badge Awarded',
        description: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge has been awarded.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to award badge.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeBadge = async (userId: number, badgeType: 'ambassador' | 'advisor') => {
    setActionLoading(`${userId}-${badgeType}-revoke`);
    try {
      await apiRequest(`/admin/badges/${userId}/${badgeType}`, {
        method: 'DELETE',
      });
      
      const profilesData = await apiRequest<ProfileWithBadges[]>('/admin/profiles');
      setProfiles(profilesData);
      
      toast({
        title: 'Badge Revoked',
        description: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge has been revoked.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke badge.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantAdmin = async (userId: number) => {
    setActionLoading(`admin-${userId}-grant`);
    try {
      await apiRequest('/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      
      const adminsData = await apiRequest<AdminUser[]>('/admin/admins');
      setAdmins(adminsData);
      
      toast({
        title: 'Admin Granted',
        description: 'User has been granted admin privileges.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to grant admin privileges.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: number) => {
    setActionLoading(`admin-${userId}-revoke`);
    try {
      await apiRequest(`/admin/admins/${userId}`, {
        method: 'DELETE',
      });
      
      const adminsData = await apiRequest<AdminUser[]>('/admin/admins');
      setAdmins(adminsData);
      
      toast({
        title: 'Admin Revoked',
        description: 'User admin privileges have been revoked.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke admin privileges.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteIdea = async (ideaId: string, ideaTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${ideaTitle}"? This action cannot be undone and will delete all related data (team members, invites, etc.).`)) {
      return;
    }

    setActionLoading(`delete-idea-${ideaId}`);
    try {
      await apiRequest(`/admin/ideas/${ideaId}`, {
        method: 'DELETE',
      });
      
      const ideasData = await apiRequest<Idea[]>('/admin/ideas');
      setIdeas(ideasData);
      
      toast({
        title: 'Idea Deleted',
        description: `"${ideaTitle}" has been permanently deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete idea.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async (ideaId: string, currentFeatured: boolean, ideaTitle: string) => {
    setActionLoading(`feature-idea-${ideaId}`);
    try {
      await apiRequest(`/admin/ideas/${ideaId}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });
      
      // Refresh the ideas list
      const ideasData = await apiRequest<Idea[]>('/admin/ideas');
      setIdeas(ideasData);
      
      toast({
        title: currentFeatured ? 'Removed from Homepage' : 'Featured on Homepage',
        description: `"${ideaTitle}" has been ${currentFeatured ? 'removed from' : 'added to'} the homepage.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update featured status.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateCovers = async () => {
    setActionLoading('regenerate-covers');
    try {
      const result = await apiRequest<{ message: string; results: Array<{ id: string; title: string; success: boolean; coverImage?: string; error?: string }> }>('/admin/ideas/regenerate-covers', {
        method: 'POST',
      });
      
      const successCount = result.results.filter(r => r.success).length;
      const failedResults = result.results.filter(r => !r.success);
      
      if (successCount > 0) {
        toast({
          title: 'Cover Images Generated',
          description: `Successfully generated ${successCount} of ${result.results.length} cover images.`,
        });
      } else if (failedResults.length > 0) {
        const errorMsg = failedResults[0]?.error || 'Unknown error';
        toast({
          title: 'Image Generation Failed',
          description: `Error: ${errorMsg}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'No Featured Ideas',
          description: 'No featured ideas found to generate images for.',
        });
      }
      
      // Refresh the ideas list
      const ideasData = await apiRequest<Idea[]>('/admin/ideas');
      setIdeas(ideasData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate cover images.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone and will delete:
- User account and profile
- All their ideas
- Team memberships
- Connections
- All related data`)) {
      return;
    }

    setActionLoading(`delete-user-${userId}`);
    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      const profilesData = await apiRequest<ProfileWithBadges[]>('/admin/profiles');
      setProfiles(profilesData);
      
      toast({
        title: 'User Deleted',
        description: `${userName} has been permanently deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '',
      message: '',
      type: 'general',
      priority: 'normal',
      startsAt: new Date().toISOString().slice(0, 16),
      endsAt: '',
      eventDate: '',
      eventEndDate: '',
      isActive: true,
      sendEmail: false,
    });
    setEditingAnnouncement(null);
    setShowAnnouncementForm(false);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      startsAt: new Date(announcement.startsAt).toISOString().slice(0, 16),
      endsAt: announcement.endsAt ? new Date(announcement.endsAt).toISOString().slice(0, 16) : '',
      eventDate: announcement.eventDate ? new Date(announcement.eventDate).toISOString().slice(0, 16) : '',
      eventEndDate: announcement.eventEndDate ? new Date(announcement.eventEndDate).toISOString().slice(0, 16) : '',
      isActive: announcement.isActive,
      sendEmail: false,
    });
    setShowAnnouncementForm(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and message are required.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading('save-announcement');
    try {
      const payload = {
        ...announcementForm,
        endsAt: announcementForm.endsAt || null,
        eventDate: announcementForm.eventDate || null,
        eventEndDate: announcementForm.eventEndDate || null,
      };

      if (editingAnnouncement) {
        await apiRequest(`/admin/announcements/${editingAnnouncement.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast({
          title: 'Announcement Updated',
          description: 'The announcement has been updated successfully.',
        });
      } else {
        await apiRequest('/admin/announcements', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast({
          title: 'Announcement Created',
          description: 'The announcement has been created successfully.',
        });
      }

      const announcementsData = await apiRequest<Announcement[]>('/admin/announcements');
      setAnnouncements(announcementsData);
      resetAnnouncementForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save announcement.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setActionLoading(`delete-announcement-${id}`);
    try {
      await apiRequest(`/admin/announcements/${id}`, {
        method: 'DELETE',
      });

      const announcementsData = await apiRequest<Announcement[]>('/admin/announcements');
      setAnnouncements(announcementsData);
      
      toast({
        title: 'Announcement Deleted',
        description: 'The announcement has been deleted.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete announcement.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAnnouncementActive = async (announcement: Announcement) => {
    setActionLoading(`toggle-announcement-${announcement.id}`);
    try {
      await apiRequest(`/admin/announcements/${announcement.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !announcement.isActive }),
      });

      const announcementsData = await apiRequest<Announcement[]>('/admin/announcements');
      setAnnouncements(announcementsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle announcement.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getAnnouncementTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'update': return <Info className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getAnnouncementPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'important': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const handleBookingAction = async (bookingId: number, action: 'approve' | 'reject', adminNotes?: string) => {
    setActionLoading(`booking-${bookingId}-${action}`);
    try {
      await apiRequest(`/admin/roadshow-bookings/${bookingId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: adminNotes || null }),
      });

      toast({
        title: action === 'approve' ? 'Booking Approved' : 'Booking Rejected',
        description: `The roadshow booking has been ${action}d.`,
      });

      const bookingsData = await apiRequest<RoadshowBooking[]>('/admin/roadshow-bookings');
      setRoadshowBookings(bookingsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} booking.`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingBookings = roadshowBookings.filter(b => b.status === 'pending');
  const processedBookings = roadshowBookings.filter(b => b.status !== 'pending');

  const filteredProfiles = profiles.filter((profile) =>
    (profile.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (profile.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(ideaSearchQuery.toLowerCase()) ||
    (idea.problem?.toLowerCase() || '').includes(ideaSearchQuery.toLowerCase())
  );

  const hasBadge = (profile: ProfileWithBadges, type: 'ambassador' | 'advisor') =>
    profile.badges.some(b => b.badgeType === type);

  const isCurrentAdmin = (userId: number) =>
    admins.some(a => a.userId === userId);

  if (loading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/portal')}
            data-testid="button-back-to-portal"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage badges, view all ideas, and control admin access.
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2" data-testid="tab-badges">
            <Award className="w-4 h-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-2" data-testid="tab-ideas">
            <Lightbulb className="w-4 h-4" />
            All Ideas
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2" data-testid="tab-admins">
            <UserCog className="w-4 h-4" />
            Admin Access
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2" data-testid="tab-announcements">
            <Megaphone className="w-4 h-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2" data-testid="tab-suggestions">
            <MessageSquare className="w-4 h-4" />
            Suggestions
            {suggestions.filter(s => s.status === 'new').length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {suggestions.filter(s => s.status === 'new').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="foundry" className="gap-2" data-testid="tab-foundry">
            <Rocket className="w-4 h-4" />
            Foundry Events
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2" data-testid="tab-bookings">
            <Calendar className="w-4 h-4" />
            Roadshow Bookings
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2" data-testid="tab-inbox">
            <MessageSquare className="w-4 h-4" />
            Inbox
            {inboxUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {inboxUnreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2" data-testid="tab-groups">
            <Users className="w-4 h-4" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Badge Management
              </CardTitle>
              <CardDescription>
                Award or revoke Ambassador and Advisor badges to platform members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-members"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredProfiles.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No members found matching your search.' : 'No members registered yet.'}
                  </p>
                ) : (
                  filteredProfiles.map((profile, index) => (
                    <motion.div
                      key={profile.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={profile.avatarUrl || undefined} />
                            <AvatarFallback>
                              {(profile.fullName || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profile.fullName || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                            <div className="flex gap-2 mt-1">
                              {hasBadge(profile, 'ambassador') && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Award className="w-3 h-3" />
                                  Ambassador
                                </Badge>
                              )}
                              {hasBadge(profile, 'advisor') && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Award className="w-3 h-3" />
                                  Advisor
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteUser(profile.userId, profile.fullName || profile.email || 'this user')}
                            disabled={actionLoading === `delete-user-${profile.userId}`}
                            data-testid={`button-delete-user-${profile.userId}`}
                          >
                            {actionLoading === `delete-user-${profile.userId}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                          {hasBadge(profile, 'ambassador') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeBadge(profile.userId, 'ambassador')}
                              disabled={actionLoading === `${profile.userId}-ambassador-revoke`}
                              data-testid={`button-revoke-ambassador-${profile.userId}`}
                            >
                              {actionLoading === `${profile.userId}-ambassador-revoke` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ShieldX className="w-4 h-4 mr-1" />
                              )}
                              Revoke Ambassador
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAwardBadge(profile.userId, 'ambassador')}
                              disabled={actionLoading === `${profile.userId}-ambassador-award`}
                              data-testid={`button-award-ambassador-${profile.userId}`}
                            >
                              {actionLoading === `${profile.userId}-ambassador-award` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 mr-1" />
                              )}
                              Award Ambassador
                            </Button>
                          )}
                          {hasBadge(profile, 'advisor') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeBadge(profile.userId, 'advisor')}
                              disabled={actionLoading === `${profile.userId}-advisor-revoke`}
                              data-testid={`button-revoke-advisor-${profile.userId}`}
                            >
                              {actionLoading === `${profile.userId}-advisor-revoke` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ShieldX className="w-4 h-4 mr-1" />
                              )}
                              Revoke Advisor
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAwardBadge(profile.userId, 'advisor')}
                              disabled={actionLoading === `${profile.userId}-advisor-award`}
                              data-testid={`button-award-advisor-${profile.userId}`}
                            >
                              {actionLoading === `${profile.userId}-advisor-award` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 mr-1" />
                              )}
                              Award Advisor
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    All Ideas ({ideas.length})
                  </CardTitle>
                  <CardDescription>
                    View all ideas on the platform, including private ones.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={handleRegenerateCovers}
                  disabled={actionLoading === 'regenerate-covers'}
                  data-testid="button-regenerate-covers"
                >
                  {actionLoading === 'regenerate-covers' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4 mr-2" />
                  )}
                  Regenerate Cover Images
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ideas..."
                  value={ideaSearchQuery}
                  onChange={(e) => setIdeaSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-ideas"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredIdeas.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {ideaSearchQuery ? 'No ideas found matching your search.' : 'No ideas posted yet.'}
                  </p>
                ) : (
                  filteredIdeas.map((idea, index) => (
                    <motion.div
                      key={idea.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{idea.title}</p>
                            {idea.isPublic ? (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Globe className="w-3 h-3" />
                                Public
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Lock className="w-3 h-3" />
                                Private
                              </Badge>
                            )}
                            {idea.stage && (
                              <Badge variant="outline" className="text-xs">
                                {idea.stage.replace(/_/g, ' ')}
                              </Badge>
                            )}
                            {idea.isFeatured && (
                              <Badge className="gap-1 text-xs bg-yellow-500 text-white">
                                <Star className="w-3 h-3 fill-current" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {idea.problem || 'No problem description'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(idea.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {idea.isPublic && (
                            <Button 
                              variant={idea.isFeatured ? "default" : "outline"} 
                              size="sm"
                              onClick={() => handleToggleFeatured(idea.id, idea.isFeatured, idea.title)}
                              disabled={actionLoading === `feature-idea-${idea.id}`}
                              className={idea.isFeatured ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                              data-testid={`button-feature-idea-${idea.id}`}
                            >
                              {actionLoading === `feature-idea-${idea.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Star className={`w-4 h-4 mr-1 ${idea.isFeatured ? 'fill-current' : ''}`} />
                                  {idea.isFeatured ? 'Featured' : 'Feature'}
                                </>
                              )}
                            </Button>
                          )}
                          <Link to={`/portal/ideas/${idea.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-idea-${idea.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteIdea(idea.id, idea.title)}
                            disabled={actionLoading === `delete-idea-${idea.id}`}
                            data-testid={`button-delete-idea-${idea.id}`}
                          >
                            {actionLoading === `delete-idea-${idea.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Admin Access Management
              </CardTitle>
              <CardDescription>
                Grant or revoke admin privileges to platform members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Current Admins ({admins.length})</h3>
                <div className="space-y-2">
                  {admins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No admins configured.</p>
                  ) : (
                    admins.map((admin) => (
                      <div key={admin.userId} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        <div>
                          <p className="font-medium">{admin.fullName || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeAdmin(admin.userId)}
                          disabled={actionLoading === `admin-${admin.userId}-revoke`}
                          data-testid={`button-revoke-admin-${admin.userId}`}
                        >
                          {actionLoading === `admin-${admin.userId}-revoke` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldX className="w-4 h-4 mr-1" />
                          )}
                          Revoke Admin
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Grant Admin Access</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members to grant admin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-grant-admin"
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredProfiles.filter(p => !isCurrentAdmin(p.userId)).slice(0, 10).map((profile) => (
                    <div key={profile.userId} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profile.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {(profile.fullName || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{profile.fullName || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGrantAdmin(profile.userId)}
                        disabled={actionLoading === `admin-${profile.userId}-grant`}
                        data-testid={`button-grant-admin-${profile.userId}`}
                      >
                        {actionLoading === `admin-${profile.userId}-grant` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 mr-1" />
                        )}
                        Grant Admin
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    Platform Announcements
                  </CardTitle>
                  <CardDescription>
                    Communicate maintenance schedules, events, and updates to all users.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    resetAnnouncementForm();
                    setShowAnnouncementForm(true);
                  }}
                  data-testid="button-new-announcement"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAnnouncementForm && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        placeholder="Announcement title..."
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                        data-testid="input-announcement-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Message</label>
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Announcement message..."
                        value={announcementForm.message}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                        data-testid="input-announcement-message"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={announcementForm.type}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, type: e.target.value as any }))}
                          data-testid="select-announcement-type"
                        >
                          <option value="general">General</option>
                          <option value="event">Event</option>
                          <option value="update">Update</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={announcementForm.priority}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value as any }))}
                          data-testid="select-announcement-priority"
                        >
                          <option value="normal">Normal</option>
                          <option value="important">Important</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Starts At</label>
                        <Input
                          type="datetime-local"
                          value={announcementForm.startsAt}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, startsAt: e.target.value }))}
                          data-testid="input-announcement-starts-at"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ends At (optional)</label>
                        <Input
                          type="datetime-local"
                          value={announcementForm.endsAt}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, endsAt: e.target.value }))}
                          data-testid="input-announcement-ends-at"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Event Date (optional)</label>
                        <Input
                          type="datetime-local"
                          value={announcementForm.eventDate}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, eventDate: e.target.value }))}
                          data-testid="input-announcement-event-date"
                        />
                        <p className="text-xs text-muted-foreground">When the actual event/maintenance occurs</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Event End Date (optional)</label>
                        <Input
                          type="datetime-local"
                          value={announcementForm.eventEndDate}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, eventEndDate: e.target.value }))}
                          data-testid="input-announcement-event-end-date"
                        />
                        <p className="text-xs text-muted-foreground">When the event/maintenance ends</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="announcement-active"
                        checked={announcementForm.isActive}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 rounded border-input"
                        data-testid="checkbox-announcement-active"
                      />
                      <label htmlFor="announcement-active" className="text-sm font-medium">
                        Active (visible to users)
                      </label>
                    </div>
                    
                    {!editingAnnouncement && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                        <input
                          type="checkbox"
                          id="announcement-send-email"
                          checked={announcementForm.sendEmail}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                          className="h-4 w-4 rounded border-input"
                          data-testid="checkbox-announcement-send-email"
                        />
                        <div>
                          <label htmlFor="announcement-send-email" className="text-sm font-medium">
                            Send email notification to all users
                          </label>
                          <p className="text-xs text-muted-foreground">
                            This will send an email to all registered users about this announcement
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveAnnouncement}
                        disabled={actionLoading === 'save-announcement'}
                        data-testid="button-save-announcement"
                      >
                        {actionLoading === 'save-announcement' ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {editingAnnouncement ? 'Update' : 'Create'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetAnnouncementForm}
                        data-testid="button-cancel-announcement"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {announcements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No announcements yet</p>
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`p-4 rounded-lg border ${announcement.isActive ? 'bg-card' : 'bg-muted/50 opacity-70'}`}
                      data-testid={`announcement-${announcement.id}`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {getAnnouncementTypeIcon(announcement.type)}
                            <h4 className="font-semibold">{announcement.title}</h4>
                            <Badge className={getAnnouncementPriorityColor(announcement.priority)}>
                              {announcement.priority}
                            </Badge>
                            <Badge variant={announcement.isActive ? 'default' : 'secondary'}>
                              {announcement.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{announcement.message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Starts: {new Date(announcement.startsAt).toLocaleString()}</span>
                            {announcement.endsAt && (
                              <span>Ends: {new Date(announcement.endsAt).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAnnouncementActive(announcement)}
                            disabled={actionLoading === `toggle-announcement-${announcement.id}`}
                            data-testid={`button-toggle-announcement-${announcement.id}`}
                          >
                            {actionLoading === `toggle-announcement-${announcement.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : announcement.isActive ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAnnouncement(announcement)}
                            data-testid={`button-edit-announcement-${announcement.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            disabled={actionLoading === `delete-announcement-${announcement.id}`}
                            data-testid={`button-delete-announcement-${announcement.id}`}
                          >
                            {actionLoading === `delete-announcement-${announcement.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                User Suggestions
              </CardTitle>
              <CardDescription>
                Review feedback and feature requests submitted by users through Kefi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No suggestions have been submitted yet.
                  </p>
                ) : (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-4 border rounded-lg space-y-3"
                      data-testid={`suggestion-item-${suggestion.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm">{suggestion.suggestion}</p>
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">
                                {suggestion.userFullName || 'Anonymous User'}
                              </span>
                              <span>-</span>
                              <span>{new Date(suggestion.createdAt).toLocaleDateString()}</span>
                            </div>
                            {suggestion.userEmail && (
                              <a 
                                href={`mailto:${suggestion.userEmail}`}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                data-testid={`link-email-${suggestion.id}`}
                              >
                                <Mail className="w-3 h-3" />
                                {suggestion.userEmail}
                              </a>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            suggestion.status === 'new' ? 'default' :
                            suggestion.status === 'implemented' ? 'secondary' :
                            suggestion.status === 'reviewed' ? 'outline' :
                            'destructive'
                          }
                          className={
                            suggestion.status === 'new' ? 'bg-blue-500' :
                            suggestion.status === 'implemented' ? 'bg-green-500' :
                            ''
                          }
                        >
                          {suggestion.status === 'new' && <Clock className="w-3 h-3 mr-1" />}
                          {suggestion.status === 'reviewed' && <Eye className="w-3 h-3 mr-1" />}
                          {suggestion.status === 'implemented' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {suggestion.status === 'dismissed' && <XCircle className="w-3 h-3 mr-1" />}
                          {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const newStatus = 'reviewed';
                            setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: newStatus } : s));
                            try {
                              await apiRequest(`/admin/suggestions/${suggestion.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: newStatus }),
                              });
                              toast({ title: 'Marked as Reviewed' });
                            } catch (error) {
                              setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: suggestion.status } : s));
                              toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
                            }
                          }}
                          disabled={suggestion.status === 'reviewed'}
                          data-testid={`button-review-${suggestion.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Reviewed
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const newStatus = 'implemented';
                            setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: newStatus } : s));
                            try {
                              await apiRequest(`/admin/suggestions/${suggestion.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: newStatus }),
                              });
                              toast({ title: 'Marked as Implemented' });
                            } catch (error) {
                              setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: suggestion.status } : s));
                              toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
                            }
                          }}
                          disabled={suggestion.status === 'implemented'}
                          data-testid={`button-implement-${suggestion.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Implemented
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const newStatus = 'dismissed';
                            setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: newStatus } : s));
                            try {
                              await apiRequest(`/admin/suggestions/${suggestion.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: newStatus }),
                              });
                              toast({ title: 'Suggestion Dismissed' });
                            } catch (error) {
                              setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, status: suggestion.status } : s));
                              toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
                            }
                          }}
                          disabled={suggestion.status === 'dismissed'}
                          data-testid={`button-dismiss-${suggestion.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Dismiss
                        </Button>
                        {suggestion.inboxConversationId && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              const conversation = inboxConversations.find(c => c.id === suggestion.inboxConversationId);
                              if (conversation) {
                                await handleSelectConversation(conversation);
                              } else {
                                toast({ title: 'Opening inbox...', description: 'Navigating to conversation' });
                              }
                              setActiveTab('inbox');
                            }}
                            data-testid={`button-reply-inbox-${suggestion.id}`}
                          >
                            <Reply className="w-4 h-4 mr-1" />
                            Reply in Inbox
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="foundry">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Foundry Events & Attendees
              </CardTitle>
              <CardDescription>
                View all Yassu Foundry events and their RSVPs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {foundryEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No events created yet.</p>
              ) : (
                foundryEvents.map((event) => (
                  <Card key={event.id} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription>
                            {new Date(event.startTime).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })} at {new Date(event.startTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.eventType}</Badge>
                          <Badge variant="secondary">
                            {event.attendees.filter(a => a.status === 'going').length} Going
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {event.attendees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No RSVPs yet</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Going ({event.attendees.filter(a => a.status === 'going').length})
                              </h4>
                              <div className="space-y-2">
                                {event.attendees.filter(a => a.status === 'going').map((attendee) => (
                                  <div key={attendee.id} className="flex items-center gap-2 text-sm">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={attendee.avatarUrl || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {attendee.fullName?.charAt(0) || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium">{attendee.fullName || 'Unknown'}</p>
                                      <p className="truncate text-xs text-muted-foreground">{attendee.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Maybe ({event.attendees.filter(a => a.status === 'maybe').length})
                              </h4>
                              <div className="space-y-2">
                                {event.attendees.filter(a => a.status === 'maybe').map((attendee) => (
                                  <div key={attendee.id} className="flex items-center gap-2 text-sm">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={attendee.avatarUrl || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {attendee.fullName?.charAt(0) || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium">{attendee.fullName || 'Unknown'}</p>
                                      <p className="truncate text-xs text-muted-foreground">{attendee.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                Not Going ({event.attendees.filter(a => a.status === 'not_going').length})
                              </h4>
                              <div className="space-y-2">
                                {event.attendees.filter(a => a.status === 'not_going').map((attendee) => (
                                  <div key={attendee.id} className="flex items-center gap-2 text-sm">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={attendee.avatarUrl || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {attendee.fullName?.charAt(0) || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium">{attendee.fullName || 'Unknown'}</p>
                                      <p className="truncate text-xs text-muted-foreground">{attendee.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Roadshow Booking Requests
              </CardTitle>
              <CardDescription>
                Review and manage requests from teams who want to present at roadshow events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pendingBookings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Pending Requests ({pendingBookings.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingBookings.map((booking) => (
                      <Card key={booking.id} className="border-l-4 border-l-amber-500">
                        <CardContent className="pt-4">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{booking.ideaTitle}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Requested by: {booking.userFullName || booking.userEmail || 'Unknown'}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline">{booking.pitchDuration} min pitch</Badge>
                                {booking.eventId && booking.eventTitle && (
                                  <Badge variant="secondary">
                                    Roadshow: {booking.eventTitle}
                                    {booking.eventStartTime && ` - ${new Date(booking.eventStartTime).toLocaleDateString()}`}
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  Submitted: {new Date(booking.createdAt).toLocaleDateString()}
                                </Badge>
                              </div>
                              {booking.message && (
                                <p className="text-sm mt-3 p-3 bg-muted rounded-md">{booking.message}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleBookingAction(booking.id, 'approve')}
                                disabled={actionLoading === `booking-${booking.id}-approve`}
                                data-testid={`button-approve-booking-${booking.id}`}
                              >
                                {actionLoading === `booking-${booking.id}-approve` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><CheckCircle className="w-4 h-4 mr-1" /> Approve</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleBookingAction(booking.id, 'reject')}
                                disabled={actionLoading === `booking-${booking.id}-reject`}
                                data-testid={`button-reject-booking-${booking.id}`}
                              >
                                {actionLoading === `booking-${booking.id}-reject` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><XCircle className="w-4 h-4 mr-1" /> Reject</>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {pendingBookings.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">No pending booking requests.</p>
                </div>
              )}

              {processedBookings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Previously Processed</h3>
                  <div className="space-y-2">
                    {processedBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{booking.ideaTitle}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            by {booking.userFullName || booking.userEmail}
                          </span>
                        </div>
                        <Badge
                          variant={booking.status === 'approved' ? 'default' : booking.status === 'rejected' ? 'destructive' : 'outline'}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    User Inbox
                  </CardTitle>
                  <CardDescription>
                    Respond to user feedback and suggestions. Replies are sent via email.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSyncOutlook}
                  disabled={outlookSyncing}
                  variant="outline"
                  data-testid="button-sync-outlook"
                >
                  {outlookSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Sync Outlook
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 min-h-[500px]">
                {/* Conversation List */}
                <div className="w-1/3 border-r pr-4 space-y-2">
                  {inboxConversations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No conversations yet</p>
                  ) : (
                    inboxConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors hover-elevate ${
                          selectedConversation?.id === conv.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'bg-muted/30'
                        }`}
                        data-testid={`inbox-conversation-${conv.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate text-sm">
                                {conv.userName || conv.userEmail}
                              </span>
                              {conv.unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {conv.subject}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conv.lastMessageAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {conv.isResolved ? (
                              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Conversation Detail */}
                <div className="flex-1 flex flex-col">
                  {!selectedConversation ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      Select a conversation to view details
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-4 pb-4 border-b mb-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{selectedConversation.subject}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            From: {selectedConversation.userName || 'Anonymous'} ({selectedConversation.userEmail})
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant={selectedConversation.isResolved ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleResolved(selectedConversation.id, selectedConversation.isResolved)}
                            disabled={actionLoading === `resolve-${selectedConversation.id}`}
                            data-testid="button-toggle-resolved"
                          >
                            {actionLoading === `resolve-${selectedConversation.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : selectedConversation.isResolved ? (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Reopen
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Resolved
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleArchiveConversation(selectedConversation.id, selectedConversation.isArchived || false)}
                            disabled={actionLoading === `archive-${selectedConversation.id}`}
                            title="Archive"
                            data-testid="button-archive-conversation"
                          >
                            {actionLoading === `archive-${selectedConversation.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteConversation(selectedConversation.id)}
                            disabled={actionLoading === `delete-${selectedConversation.id}`}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                            data-testid="button-delete-conversation"
                          >
                            {actionLoading === `delete-${selectedConversation.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[300px]">
                        {inboxLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : conversationMessages.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No messages yet</p>
                        ) : conversationMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.senderType === 'admin' 
                                ? 'bg-primary/10 ml-8' 
                                : 'bg-muted mr-8'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {msg.senderType === 'admin' 
                                  ? `Admin${msg.senderName ? ` (${msg.senderName})` : ''}` 
                                  : selectedConversation.userName || 'User'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.attachmentUrl && (
                              <a 
                                href={msg.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block mt-2"
                              >
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt="Attached screenshot" 
                                  className="max-w-xs rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Reply Input */}
                      <div className="border-t pt-4">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type your reply..."
                          className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                          rows={3}
                          data-testid="input-inbox-reply"
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            onClick={handleSendReply}
                            disabled={!replyContent.trim() || actionLoading === 'inbox-reply'}
                            data-testid="button-send-reply"
                          >
                            {actionLoading === 'inbox-reply' ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-groups-title">Groups</CardTitle>
                <CardDescription>Create and manage platform groups</CardDescription>
              </div>
              <Button onClick={() => setShowGroupForm(!showGroupForm)} data-testid="button-create-group">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showGroupForm && (
                <Card className="border-dashed">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Group Name *</label>
                        <Input
                          placeholder="e.g. Bruin Entrepreneurs"
                          value={groupForm.name}
                          onChange={e => setGroupForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))}
                          data-testid="input-group-name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">URL Slug *</label>
                        <Input
                          placeholder="bruin"
                          value={groupForm.slug}
                          onChange={e => setGroupForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                          data-testid="input-group-slug"
                        />
                        <p className="text-xs text-muted-foreground mt-1">yassu.ai/{groupForm.slug || 'slug'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        placeholder="A brief description of this group"
                        value={groupForm.description}
                        onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                        data-testid="input-group-description"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Primary Color (HSL)</label>
                        <Input
                          placeholder="213 69% 38%"
                          value={groupForm.primaryColor}
                          onChange={e => setGroupForm(f => ({ ...f, primaryColor: e.target.value }))}
                          data-testid="input-group-primary-color"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Accent Color (HSL)</label>
                        <Input
                          placeholder="45 100% 51%"
                          value={groupForm.accentColor}
                          onChange={e => setGroupForm(f => ({ ...f, accentColor: e.target.value }))}
                          data-testid="input-group-accent-color"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">University</label>
                        <select
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                          value={groupForm.universityId}
                          onChange={e => setGroupForm(f => ({ ...f, universityId: e.target.value }))}
                          data-testid="select-group-university"
                        >
                          <option value="">None</option>
                          {universities.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          if (!groupForm.name || !groupForm.slug) {
                            toast({ title: 'Missing fields', description: 'Name and slug are required.', variant: 'destructive' });
                            return;
                          }
                          try {
                            setActionLoading('create-group');
                            await apiRequest('/groups', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(groupForm),
                            });
                            toast({ title: 'Group created!' });
                            setShowGroupForm(false);
                            setGroupForm({ name: '', slug: '', description: '', primaryColor: '', accentColor: '', universityId: '' });
                            const refreshed = await apiRequest<any[]>('/groups');
                            setAdminGroups(refreshed);
                          } catch (err: any) {
                            toast({ title: 'Error', description: err.message || 'Failed to create group', variant: 'destructive' });
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === 'create-group'}
                        data-testid="button-submit-group"
                      >
                        {actionLoading === 'create-group' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Group
                      </Button>
                      <Button variant="outline" onClick={() => setShowGroupForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {adminGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No groups created yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminGroups.map((group: any) => (
                    <Card key={group.id} data-testid={`card-group-${group.slug}`}>
                      <CardContent className="py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {group.logoUrl ? (
                              <img src={group.logoUrl} alt={group.name} className="w-10 h-10 rounded-lg object-cover border" />
                            ) : (
                              <div className="flex gap-1">
                                {group.primaryColor && (
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: `hsl(${group.primaryColor})` }} />
                                )}
                                {group.accentColor && (
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: `hsl(${group.accentColor})` }} />
                                )}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{group.name}</p>
                              <p className="text-sm text-muted-foreground">/{group.slug} · {group.description || 'No description'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {group.memberCount} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Lightbulb className="w-4 h-4" />
                              {group.ideaCount} ideas
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {group.pendingInviteCount} pending
                            </span>
                            <Button
                              size="sm"
                              variant={addMemberGroupSlug === group.slug ? 'default' : 'outline'}
                              onClick={() => {
                                setAddMemberGroupSlug(addMemberGroupSlug === group.slug ? null : group.slug);
                                setAddMemberSearch('');
                                setAddMemberResults([]);
                                setAddMemberRole('member');
                              }}
                              data-testid={`button-add-member-${group.slug}`}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add User
                            </Button>
                          </div>
                        </div>

                        {addMemberGroupSlug === group.slug && (
                          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                            <p className="text-sm font-medium">Add user to {group.name}</p>
                            <div className="flex items-center gap-3">
                              <Input
                                placeholder="Search by name or email..."
                                value={addMemberSearch}
                                onChange={async (e) => {
                                  const q = e.target.value;
                                  setAddMemberSearch(q);
                                  if (q.length >= 2) {
                                    setAddMemberSearching(true);
                                    try {
                                      const results = await apiRequest(`/api/groups/${group.slug}/search-users?q=${encodeURIComponent(q)}`);
                                      setAddMemberResults(results as any[]);
                                    } catch {
                                      setAddMemberResults([]);
                                    } finally {
                                      setAddMemberSearching(false);
                                    }
                                  } else {
                                    setAddMemberResults([]);
                                  }
                                }}
                                className="flex-1"
                                data-testid="input-add-member-search"
                              />
                              <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                                <SelectTrigger className="w-[130px]" data-testid="select-add-member-role">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="judge">Judge</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {addMemberSearching && (
                              <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            )}
                            {addMemberResults.length > 0 && (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {addMemberResults.map((u: any) => (
                                  <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50" data-testid={`user-result-${u.id}`}>
                                    <div>
                                      <p className="text-sm font-medium">{u.fullName || 'Unknown'}</p>
                                      <p className="text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          setActionLoading(`add-member-${u.id}`);
                                          await apiRequest(`/api/groups/${group.slug}/add-member`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: u.id, role: addMemberRole }),
                                          });
                                          toast({ title: 'User added', description: `${u.fullName || u.email} added as ${addMemberRole}` });
                                          setAddMemberResults(prev => prev.filter(r => r.id !== u.id));
                                          const refreshed = await apiRequest<any[]>('/groups');
                                          setAdminGroups(refreshed);
                                        } catch (err: any) {
                                          toast({ title: 'Error', description: err.message || 'Failed to add user', variant: 'destructive' });
                                        } finally {
                                          setActionLoading(null);
                                        }
                                      }}
                                      disabled={actionLoading === `add-member-${u.id}`}
                                      data-testid={`button-add-${u.id}`}
                                    >
                                      {actionLoading === `add-member-${u.id}` ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <UserPlus className="w-3 h-3 mr-1" />
                                          Add as {addMemberRole}
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {addMemberSearch.length >= 2 && !addMemberSearching && addMemberResults.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">No matching users found</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
