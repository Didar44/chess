type EnvConfig = {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

export function readEnv(): EnvConfig {
  const {
    VITE_GEMINI_API_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_URL,
  } = import.meta.env;

  return {
    geminiApiKey: VITE_GEMINI_API_KEY || undefined,
    supabaseUrl: VITE_SUPABASE_URL || undefined,
    supabasePublishableKey: VITE_SUPABASE_PUBLISHABLE_KEY || undefined,
  };
}
