import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ConnectionStatus {
  status: string;
  connection?: {
    id: string;
    requesterId: number;
    recipientId: number;
  };
}

interface ConnectionButtonProps {
  targetUserId: number;
  currentUserId?: number;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
  onStatusChange?: () => void;
}

async function apiCall(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return response.json();
}

export function ConnectionButton({
  targetUserId,
  currentUserId,
  size = 'sm',
  variant = 'outline',
  className = '',
  onStatusChange,
}: ConnectionButtonProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUserId || targetUserId === currentUserId) {
      setLoading(false);
      return;
    }

    fetch(`/api/connections/status/${targetUserId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { status: 'none' })
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setStatus({ status: 'none' });
        setLoading(false);
      });
  }, [targetUserId, currentUserId]);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const conn = await apiCall('/api/connections', {
        method: 'POST',
        body: JSON.stringify({ recipientId: targetUserId }),
      });
      setStatus({ status: 'pending', connection: { id: conn.id, requesterId: currentUserId!, recipientId: targetUserId } });
      toast({ title: 'Connection request sent' });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onStatusChange?.();
    } catch (error: any) {
      toast({ title: 'Failed to send request', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!status?.connection?.id) return;
    setActionLoading(true);
    try {
      await apiCall(`/api/connections/${status.connection.id}/cancel`, { method: 'DELETE' });
      setStatus({ status: 'none' });
      toast({ title: 'Request cancelled' });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onStatusChange?.();
    } catch {
      toast({ title: 'Failed to cancel', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!status?.connection?.id) return;
    setActionLoading(true);
    try {
      await apiCall(`/api/connections/${status.connection.id}/accept`, { method: 'POST' });
      setStatus({ status: 'accepted' });
      toast({ title: 'Connection accepted' });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onStatusChange?.();
    } catch {
      toast({ title: 'Failed to accept', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!status?.connection?.id) return;
    setActionLoading(true);
    try {
      await apiCall(`/api/connections/${status.connection.id}`, { method: 'DELETE' });
      setStatus({ status: 'none' });
      toast({ title: 'Connection removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/connections'] });
      onStatusChange?.();
    } catch {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!currentUserId || targetUserId === currentUserId) {
    return null;
  }

  if (actionLoading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (status?.status === 'accepted') {
    return (
      <Button
        variant="secondary"
        size={size}
        className={className}
        onClick={handleRemove}
        data-testid={`button-connected-${targetUserId}`}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        Connected
      </Button>
    );
  }

  if (status?.status === 'pending') {
    const isSender = status.connection?.requesterId === currentUserId;
    if (isSender) {
      return (
        <Button
          variant="outline"
          size={size}
          className={className}
          onClick={handleCancel}
          data-testid={`button-pending-${targetUserId}`}
        >
          <Clock className="w-4 h-4 mr-2" />
          Pending
        </Button>
      );
    } else {
      return (
        <Button
          variant="default"
          size={size}
          className={className}
          onClick={handleAccept}
          data-testid={`button-accept-${targetUserId}`}
        >
          <UserCheck className="w-4 h-4 mr-2" />
          Accept
        </Button>
      );
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleConnect}
      data-testid={`button-connect-${targetUserId}`}
    >
      <UserPlus className="w-4 h-4 mr-2" />
      Connect
    </Button>
  );
}
