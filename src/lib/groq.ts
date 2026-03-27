const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_KEY_1,
  import.meta.env.VITE_GROQ_KEY_2,
  import.meta.env.VITE_GROQ_KEY_3,
  import.meta.env.VITE_GROQ_KEY_4,
  import.meta.env.VITE_GROQ_KEY_5,
  import.meta.env.VITE_GROQ_KEY_6,
  import.meta.env.VITE_GROQ_KEY_7,
  import.meta.env.VITE_GROQ_KEY_8,
  import.meta.env.VITE_GROQ_KEY_9,
  import.meta.env.VITE_GROQ_KEY_10,
].filter(Boolean);

if (import.meta.env.DEV && GROQ_KEYS.length === 0) {
  console.warn('[Groq] No API keys configured. Set VITE_GROQ_KEY_1, VITE_GROQ_KEY_2, etc. in your .env file.');
}

let currentKeyIndex = 0;

export function getCurrentKey(): string | null {
  if (GROQ_KEYS.length === 0) return null;
  return GROQ_KEYS[currentKeyIndex];
}

export function rotateKey(): void {
  if (GROQ_KEYS.length > 0) {
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  }
}

export function resetKeyRotation(): void {
  currentKeyIndex = 0;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function sendToGroq(
  messages: Message[],
  model: string = 'llama-3.3-70b-versatile',
  maxRetries: number = GROQ_KEYS.length
): Promise<string> {
  if (GROQ_KEYS.length === 0) {
    throw new Error('No Groq API keys configured');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getCurrentKey();
    
    if (!apiKey) {
      rotateKey();
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        rotateKey();
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';

    } catch (error) {
      lastError = error as Error;
      rotateKey();
    }
  }

  throw lastError || new Error('Failed to get response from Groq API after all retries');
}

export function getAvailableKeysCount(): number {
  return GROQ_KEYS.length;
}
