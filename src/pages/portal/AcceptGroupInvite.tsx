import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AcceptGroupInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [groupName, setGroupName] = useState('');
  const [groupSlug, setGroupSlug] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid invitation link.');
      return;
    }

    if (authLoading) return;

    if (!user) {
      navigate(`/auth?invite=${encodeURIComponent(token)}`, { replace: true });
      return;
    }

    async function acceptInvite() {
      try {
        const result = await apiRequest('/groups/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        setGroupName(result.groupName);
        setGroupSlug(result.groupSlug || '');
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to accept invitation.');
      }
    }

    acceptInvite();
  }, [token, user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 pt-24">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Preparing your invitation...</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 pt-24">
        <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-lg font-medium">Accepting invitation...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Welcome to {groupName}!</p>
              <p className="text-muted-foreground">You've been added as a member.</p>
              {groupSlug && (
                <Button onClick={() => navigate(`/portal/applications/${groupSlug}`)} data-testid="button-go-to-application">
                  Fill Out Application
                </Button>
              )}
              <Button variant={groupSlug ? 'outline' : 'default'} onClick={() => navigate('/portal')} data-testid="button-go-to-portal">
                Go to Dashboard
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-lg font-medium">Could not accept invitation</p>
              <p className="text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/portal')} data-testid="button-go-to-portal-error">
                Go to Portal
              </Button>
            </>
          )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
