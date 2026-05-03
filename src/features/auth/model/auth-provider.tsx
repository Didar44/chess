import { startTransition, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  clearCachedProfile,
  ensureProfile,
  getCachedProfile,
  getInitialSession,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  loadProfile,
  onSessionChange,
  upsertProfile,
} from "@/features/auth/lib/supabase";
import { AuthContext } from "@/features/auth/model/auth-context";
import type { AuthContextValue, AuthStatus, PlayerProfile } from "@/features/auth/model/types";

async function loadAndSetProfile(user: User) {
  const profile = await ensureProfile(user);
  return profile;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured() ? "loading" : "disabled",
  );
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    let isMounted = true;

    getInitialSession()
      .then((session) => {
        if (!isMounted) {
          return;
        }

        const cachedProfile = session?.user ? getCachedProfile(session.user.id) : null;

        startTransition(() => {
          setSessionUser(session?.user ?? null);
          setProfile(cachedProfile);
          setStatus(session?.user ? "loading" : "guest");
        });
      })
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Auth failed.");
        setStatus("guest");
      });

    const unsubscribe = onSessionChange((session: Session | null) => {
      if (!isMounted) {
        return;
      }

      const cachedProfile = session?.user ? getCachedProfile(session.user.id) : null;

      startTransition(() => {
        setSessionUser(session?.user ?? null);
        setProfile(cachedProfile);
        setStatus(session?.user ? "loading" : "guest");
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured || !sessionUser) {
      return;
    }

    let isMounted = true;

    loadAndSetProfile(sessionUser)
      .then((nextProfile) => {
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setProfile(nextProfile);
          setStatus("authenticated");
        });
      })
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(
          nextError instanceof Error ? nextError.message : "Profile load failed.",
        );
        setStatus("guest");
      });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, sessionUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isConfigured,
      profile,
      refreshProfile: async () => {
        if (!sessionUser) {
          return;
        }

        clearCachedProfile(sessionUser.id);
        const nextProfile = await loadProfile(sessionUser);
        if (nextProfile) {
          setProfile(nextProfile);
        }
      },
      sessionUser,
      signIn: async ({ email, password }) => {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        setError(null);
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        const cachedProfile = data.user ? getCachedProfile(data.user.id) : null;

        startTransition(() => {
          setSessionUser(data.user);
          setProfile(cachedProfile);
          setStatus(data.user ? "loading" : "guest");
        });
      },
      signOut: async () => {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          return;
        }

        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
          throw signOutError;
        }

        if (sessionUser) {
          clearCachedProfile(sessionUser.id);
        }

        startTransition(() => {
          setSessionUser(null);
          setProfile(null);
          setStatus("guest");
        });
      },
      signUp: async ({ city, displayName, email, password }) => {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        setError(null);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              city,
              display_name: displayName,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.user) {
          const ensuredProfile = await ensureProfile(data.user, { city, displayName });

          startTransition(() => {
            setProfile(ensuredProfile);
          });
        }

        startTransition(() => {
          setSessionUser(data.user ?? null);
          setStatus(data.user && data.session ? "loading" : "guest");
        });
      },
      status,
      updateProfile: async ({ city, displayName }) => {
        if (!sessionUser) {
          throw new Error("You must be signed in.");
        }

        const nextProfile = await upsertProfile({
          city,
          displayName,
          email: sessionUser.email ?? profile?.email ?? "",
          userId: sessionUser.id,
        });

        setProfile(nextProfile);
      },
    }),
    [error, isConfigured, profile, sessionUser, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
