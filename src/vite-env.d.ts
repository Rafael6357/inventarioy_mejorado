/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GROQ_KEY_1: string
  readonly VITE_GROQ_KEY_2: string
  readonly VITE_GROQ_KEY_3: string
  readonly VITE_GROQ_KEY_4: string
  readonly VITE_GROQ_KEY_5: string
  readonly VITE_GROQ_KEY_6: string
  readonly VITE_GROQ_KEY_7: string
  readonly VITE_GROQ_KEY_8: string
  readonly VITE_GROQ_KEY_9: string
  readonly VITE_GROQ_KEY_10: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
