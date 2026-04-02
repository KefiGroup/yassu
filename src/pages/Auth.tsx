import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Rocket, Mail, Lock, User, ShieldAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const brand = useBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  
  const logoutReason = searchParams.get('reason');
  const modeParam = searchParams.get('mode');
  const inviteToken = searchParams.get('invite');
  const defaultTab = modeParam === 'signup' ? 'signup' : 'signin';

  useEffect(() => {
    if (!loading && user) {
      if (inviteToken) {
        navigate(`/accept-group-invite?token=${inviteToken}`);
      } else {
        navigate('/portal');
      }
    }
  }, [user, loading, navigate, inviteToken]);

  const validateLogin = () => {
    const newErrors: typeof errors = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: typeof errors = {};
    
    try {
      nameSchema.parse(fullName);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.name = e.errors[0].message;
      }
    }
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password, rememberMe);
    setIsLoading(false);
    
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      trackEvent('login', { method: 'email' });
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      if (inviteToken) {
        navigate(`/accept-group-invite?token=${inviteToken}`);
      } else {
        navigate('/portal');
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);
    
    if (error) {
      const friendlyMessage = error.message.includes('already registered')
        ? 'An account with this email already exists. Try signing in instead.'
        : error.message;
      
      toast({
        title: 'Sign up failed',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } else {
      trackEvent('sign_up', { method: 'email' });
      toast({
        title: 'Account created!',
        description: `Welcome to ${brand.name}. Let's complete your profile first.`,
      });
      if (inviteToken) {
        navigate(`/accept-group-invite?token=${inviteToken}`);
      } else {
        navigate('/portal/profile?welcome=true');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <a href={`${brand.basePath}/`} className="inline-flex items-center justify-center">
            <img src={brand.logoPath} alt={brand.name} className="h-28 w-auto" />
          </a>
          <p className="text-muted-foreground mt-2">{brand.tagline}</p>
        </div>

        {logoutReason === 'inactivity' && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">Session Expired</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              For your security, you have been logged out due to inactivity. Please sign in again to continue.
            </AlertDescription>
          </Alert>
        )}

        <Card className="glass-strong border-border/50">
          <CardHeader>
            <CardTitle className="text-center">Get Started</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      data-testid="checkbox-remember-me"
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me for 30 days
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  

                  <div className="text-center mt-4">
                    <a 
                      href={`${brand.basePath}/forgot-password`} 
                      className="text-sm text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot your password?
                    </a>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Jane Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                  

                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground mt-6 space-y-1">
          <p>
            By continuing, you agree to our{' '}
            <a href={`${brand.basePath}/terms`} className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href={`${brand.basePath}/privacy`} className="text-primary hover:underline">Privacy Policy</a>
          </p>
          {brand.id !== 'yassu' && (
            <p className="text-muted-foreground/60 text-xs">Powered by <a href="https://yassu.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Yassu</a></p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
