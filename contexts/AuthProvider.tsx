"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import type { Company, Profile } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  refreshAll: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function fetchCompany(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchProfile(supabase, user.id);
    setProfile(nextProfile);
  }, [supabase, user]);

  const refreshCompany = useCallback(async () => {
    if (!user) {
      setCompany(null);
      return;
    }

    const nextCompany = await fetchCompany(supabase, user.id);
    setCompany(nextCompany);
  }, [supabase, user]);

  const refreshAll = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setCompany(null);
      return;
    }

    const [nextProfile, nextCompany] = await Promise.all([
      fetchProfile(supabase, user.id),
      fetchCompany(supabase, user.id),
    ]);

    setProfile(nextProfile);
    setCompany(nextCompany);
  }, [supabase, user]);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!mounted) {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const [nextProfile, nextCompany] = await Promise.all([
            fetchProfile(supabase, currentSession.user.id),
            fetchCompany(supabase, currentSession.user.id),
          ]);

          if (mounted) {
            setProfile(nextProfile);
            setCompany(nextCompany);
          }
        } else {
          setProfile(null);
          setCompany(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load session."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        try {
          const [nextProfile, nextCompany] = await Promise.all([
            fetchProfile(supabase, nextSession.user.id),
            fetchCompany(supabase, nextSession.user.id),
          ]);
          setProfile(nextProfile);
          setCompany(nextCompany);
          setError(null);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to refresh profile."
          );
        }
      } else {
        setProfile(null);
        setCompany(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      throw new Error(signOutError.message);
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    setCompany(null);
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      company,
      loading,
      error,
      signOut,
      refreshProfile,
      refreshCompany,
      refreshAll,
    }),
    [
      user,
      session,
      profile,
      company,
      loading,
      error,
      signOut,
      refreshProfile,
      refreshCompany,
      refreshAll,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("Auth hooks must be used within AuthProvider.");
  }

  return context;
}

export function useAuth() {
  const { user, session, loading, error, signOut } = useAuthContext();
  return { user, session, loading, error, signOut };
}

export function useProfile() {
  const { profile, loading, error, refreshProfile } = useAuthContext();
  return { profile, loading, error, refreshProfile };
}

export function useCompany() {
  const { company, loading, error, refreshCompany } = useAuthContext();
  return { company, loading, error, refreshCompany };
}
