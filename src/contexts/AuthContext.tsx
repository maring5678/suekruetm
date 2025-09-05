import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (username: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch profile on specific events, not all
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            await fetchProfile(session.user.id);
          } catch (error) {
            console.error('Profile fetch error:', error);
          }
        } else if (!session?.user) {
          setProfile(null);
        }
        
        // Only set loading false once during initialization
        if (!isInitialized) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    );

    // Check for existing session only once
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          if (isMounted) {
            setLoading(false);
            setIsInitialized(true);
          }
          return;
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Only fetch profile if we have a session but no profile yet
          if (session?.user) {
            try {
              await fetchProfile(session.user.id);
            } catch (error) {
              console.error('Initial profile fetch error:', error);
            }
          }
          
          setLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        if (isMounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Leeres Dependency-Array!

  const signUp = async (username: string, password: string, displayName: string) => {
    // Erstelle eine gültige Email aus dem Benutzernamen
    const email = `${username}@tournament-app.com`;
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
          username: username
        }
      }
    });

    // Automatisch den Benutzer bestätigen wenn erfolgreich erstellt
    if (!error && data.user) {
      try {
        await supabase.functions.invoke('auto-confirm-user', {
          body: { userId: data.user.id }
        });
      } catch (confirmError) {
        console.warn('Auto-confirm failed:', confirmError);
        // Trotzdem fortfahren, da der Benutzer erstellt wurde
      }
    }
    
    return { error };
  };

  const signIn = async (username: string, password: string) => {
    // Erstelle die gültige Email aus dem Benutzernamen
    const email = `${username}@tournament-app.com`;
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};