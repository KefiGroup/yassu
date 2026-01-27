import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, UserX, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface RequesterProfile {
  id: number;
  fullName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  skills?: string[];
  interests?: string[];
  university?: { name: string; shortName: string | null } | null;
  message?: string;
}

type PageState = 'loading' | 'show_profile' | 'accepting' | 'rejecting' | 'accepted' | 'rejected' | 'error';

export default function AcceptConnection() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<RequesterProfile | null>(null);
  const [error, setError] = useState<string>('');
  
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('requestId');
  const token = params.get('token');

  useEffect(() => {
    if (!requestId || !token) {
      setError('Invalid or missing connection request link.');
      setState('error');
      return;
    }

    fetch(`/api/connections/preview?requestId=${requestId}&token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Connection request not found or already handled');
        return res.json();
      })
      .then(data => {
        setProfile(data);
        setState('show_profile');
      })
      .catch(err => {
        setError(err.message || 'This connection request is no longer valid.');
        setState('error');
      });
  }, [requestId, token]);

  const handleAccept = async () => {
    setState('accepting');
    try {
      const res = await fetch(`/api/connections/accept-with-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, token })
      });
      
      if (!res.ok) throw new Error('Failed to accept connection');
      setState('accepted');
    } catch (err) {
      setError('Failed to accept the connection. Please try again.');
      setState('error');
    }
  };

  const handleReject = async () => {
    setState('rejecting');
    try {
      const res = await fetch(`/api/connections/reject-with-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, token })
      });
      
      if (!res.ok) throw new Error('Failed to reject connection');
      setState('rejected');
    } catch (err) {
      setError('Failed to reject the connection. Please try again.');
      setState('error');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading connection request...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connection Not Available</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => setLocation('/portal/collaborators')} data-testid="button-go-to-collaborators">
                Go to Collaborators
              </Button>
            </div>
          )}

          {state === 'show_profile' && profile && (
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profile.fullName)}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-2xl font-bold mb-1">{profile.fullName}</h2>
              
              {profile.university && (
                <p className="text-muted-foreground mb-3">
                  {profile.university.shortName || profile.university.name}
                </p>
              )}
              
              {profile.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {profile.bio}
                </p>
              )}
              
              {profile.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mb-4">
                  {profile.skills.slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {profile.skills.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{profile.skills.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
              
              {profile.message && (
                <div className="w-full bg-muted/50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs text-muted-foreground mb-1">Personal message:</p>
                  <p className="text-sm italic">"{profile.message}"</p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mb-6">
                <strong>{profile.fullName.split(' ')[0]}</strong> wants to connect with you on Yassu
              </p>
              
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleReject}
                  data-testid="button-reject-connection"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleAccept}
                  data-testid="button-accept-connection"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          )}

          {(state === 'accepting' || state === 'rejecting') && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                {state === 'accepting' ? 'Accepting connection...' : 'Declining connection...'}
              </p>
            </div>
          )}

          {state === 'accepted' && profile && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Connected!</h2>
              <p className="text-muted-foreground mb-6">
                You are now connected with <strong>{profile.fullName}</strong>
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/portal/collaborators')}
                  data-testid="button-view-connections"
                >
                  View Connections
                </Button>
                <Button 
                  onClick={() => setLocation('/portal/messages')}
                  data-testid="button-send-message"
                >
                  Send Message
                </Button>
              </div>
            </div>
          )}

          {state === 'rejected' && profile && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <XCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connection Declined</h2>
              <p className="text-muted-foreground mb-6">
                You have declined the connection request from {profile.fullName}.
              </p>
              <Button 
                onClick={() => setLocation('/portal/collaborators')}
                data-testid="button-back-to-collaborators"
              >
                Back to Collaborators
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
