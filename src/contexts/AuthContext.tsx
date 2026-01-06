import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  fullName: string | null;
  linkedinId?: string | null;
}

interface Profile {
  id: number;
  userId: number;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  universityId: string | null;
  otherUniversity: string | null;
  clubId: string | null;
  major: string | null;
  graduationYear: number | null;
  skills: string[];
  interests: string[];
  availability: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  bio: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  onboardingCompleted: boolean;
}

interface UserRole {
  role: 'student' | 'alumni' | 'founder_pro' | 'investor' | 'sponsor' | 'admin';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      console.log('[AuthContext] Fetching user data...');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      );
      const data = await Promise.race([
        api.auth.me(),
        timeoutPromise
      ]) as any;
      console.log('[AuthContext] User data fetched:', data);
      setUser(data.user);
      setProfile(data.profile);
      setRoles(data.roles as UserRole[]);
    } catch (error) {
      console.log('[AuthContext] Auth failed:', error);
      setUser(null);
      setProfile(null);
      setRoles([]);
    } finally {
      console.log('[AuthContext] Setting loading to false');
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const profileData = await api.profile.get();
        setProfile(profileData);
      } catch (error) {
        console.error('Failed to refresh profile:', error);
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await api.auth.register(email, password, fullName);
      setUser(data.user);
      await fetchUserData();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.auth.login(email, password);
      setUser(data.user);
      await fetchUserData();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch {
    } finally {
      setUser(null);
      setProfile(null);
      setRoles([]);
    }
  };

  const hasRole = (role: string) => {
    // Hardcoded superadmin
    if (user?.email === 'paulinet77@gmail.com' && role === 'admin') {
      return true;
    }
    return roles.some(r => r.role === role);
  };

  const isVerified = profile?.verificationStatus === 'verified';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        hasRole,
        isVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
