import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, ShieldAlert } from 'lucide-react';

const WARNING_BEFORE_TIMEOUT = 3 * 60 * 1000; // Show warning 3 minutes before timeout
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

export function InactivityWarning() {
  const { user, sessionTimeout, serverLastActivity, signOut, updateActivity, setServerLastActivity } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef(false);
  
  // Use sessionTimeout from server, default to 1 hour if not set
  const inactivityTimeout = sessionTimeout || 60 * 60 * 1000;
  
  // Initialize lastActivityRef from server's lastActivity
  useEffect(() => {
    if (serverLastActivity) {
      lastActivityRef.current = serverLastActivity;
    }
  }, [serverLastActivity]);

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    updateActivity();
    
    // If warning is showing and user interacts, extend session
    if (showWarning) {
      setShowWarning(false);
      warningShownRef.current = false;
    }
  }, [updateActivity, showWarning]);

  // Set up activity listeners and periodic server ping
  useEffect(() => {
    // Only track if user is logged in and sessionTimeout is set (not "remember me")
    if (!user || sessionTimeout === null) {
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic server ping to keep session alive (every 5 minutes if active)
    let lastPingTime = Date.now();
    const pingInterval = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const timeSincePing = Date.now() - lastPingTime;
      
      // Only ping if user has been active in the last 5 minutes
      // and we haven't pinged in the last 5 minutes
      if (timeSinceActivity < 5 * 60 * 1000 && timeSincePing >= 5 * 60 * 1000) {
        try {
          const response = await api.auth.ping();
          lastPingTime = Date.now();
          if (response.lastActivity) {
            setServerLastActivity(response.lastActivity);
            lastActivityRef.current = response.lastActivity;
          }
        } catch (error) {
          console.error('Session ping failed:', error);
        }
      }
    }, 60 * 1000); // Check every minute

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(pingInterval);
    };
  }, [user, sessionTimeout, handleActivity, setServerLastActivity]);

  // Check for inactivity
  useEffect(() => {
    // Only check if user is logged in and sessionTimeout is set
    if (!user || sessionTimeout === null) {
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const remaining = inactivityTimeout - timeSinceActivity;

      // If remaining time is less than warning threshold, show warning
      if (remaining <= WARNING_BEFORE_TIMEOUT && remaining > 0) {
        if (!warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
        }
        setTimeRemaining(Math.ceil(remaining / 1000)); // Convert to seconds
      }

      // If time has run out, log out
      if (remaining <= 0) {
        signOut('inactivity');
      }
    };

    // Initial check
    checkInactivity();

    // Set up interval
    const interval = setInterval(checkInactivity, CHECK_INTERVAL);

    // Also update the countdown more frequently when warning is shown
    let countdownInterval: ReturnType<typeof setInterval> | null = null;
    if (showWarning) {
      countdownInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityRef.current;
        const remaining = inactivityTimeout - timeSinceActivity;
        
        if (remaining <= 0) {
          signOut('inactivity');
        } else {
          setTimeRemaining(Math.ceil(remaining / 1000));
        }
      }, 1000);
    }

    return () => {
      clearInterval(interval);
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [user, sessionTimeout, signOut, showWarning, inactivityTimeout]);

  const handleStayLoggedIn = async () => {
    const now = Date.now();
    lastActivityRef.current = now;
    updateActivity();
    setShowWarning(false);
    warningShownRef.current = false;
    
    // Ping server to extend session
    try {
      const response = await api.auth.ping();
      if (response.lastActivity) {
        setServerLastActivity(response.lastActivity);
        lastActivityRef.current = response.lastActivity;
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  const handleLogout = () => {
    signOut('manual');
    setShowWarning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no user or if "remember me" is enabled
  if (!user || sessionTimeout === null) {
    return null;
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <DialogTitle>Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your session is about to expire due to inactivity.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6">
          <div className="flex items-center gap-2 text-3xl font-bold text-amber-500">
            <Clock className="h-8 w-8" />
            <span data-testid="text-countdown">{formatTime(timeRemaining)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Time remaining before automatic logout
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            data-testid="button-logout-now"
          >
            Log Out Now
          </Button>
          <Button 
            onClick={handleStayLoggedIn}
            data-testid="button-stay-logged-in"
          >
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
