import "server-only";

/**
 * One way to call a language model, whichever provider is configured.
 * Set the key(s) in Vercel; the first available provider is used and
 * the next one takes over if it is rate-limited or down.
 *
 *   GEMINI_API_KEY     (models: GEMINI_MODEL, default gemini-3.5-flash-lite;
 *                       optional GEMINI_FALLBACK_MODEL, tried when the first is rate-limited)
 *   CEREBRAS_API_KEY   (model: CEREBRAS_MODEL, default gpt-oss-120b)
 *   GROQ_API_KEY       (model: GROQ_MODEL, default openai/gpt-oss-120b)
 *   ANTHROPIC_API_KEY  (model: ANTHROPIC_MODEL, default claude-sonnet-5-5)
 *   AI_PROVIDER        optional: gemini | cerebras | groq | anthropic, to choose which goes first
 */

export type ProviderId = "gemini" | "cerebras" | "groq" | "anthropic";

interface Provider {
  id: ProviderId;
  label: string;
  available: () => boolean;
  call: (req: GenerateRequest) => Promise<string>;
}

export interface GenerateRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

async function openAiCompatible(
  baseUrl: string,
  key: string,
  model: string,
  label: string,
  req: GenerateRequest,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
        max_tokens: req.maxTokens ?? 4000,
        temperature: req.temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(50000),
    });
  } catch {
    throw new ProviderError(`${label} did not respond`, true);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ProviderError(
      `${label} returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      res.status === 429 || res.status >= 500 || res.status === 404,
    );
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError(`${label} returned an empty answer`, true);
  return text;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

async function geminiCall(model: string, req: GenerateRequest): Promise<string> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          // Gemini 3 models ignore temperature, so it is not sent.
          // Extra room because any reasoning tokens count towards this limit.
          generationConfig: {
            maxOutputTokens: Math.max(8192, (req.maxTokens ?? 4000) * 2),
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(55000),
      },
    );
  } catch {
    throw new ProviderError(`Gemini (${model}) did not respond`, true);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new ProviderError(
      `Gemini (${model}) returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      res.status === 429 || res.status >= 500 || res.status === 404,
    );
  }
  const json = (await res.json()) as GeminiResponse;
  if (json.promptFeedback?.blockReason) {
    throw new ProviderError(`Gemini blocked the request (${json.promptFeedback.blockReason})`, false);
  }
  const candidate = json.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  if (!text) {
    throw new ProviderError(
      `Gemini returned no text${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}`,
      candidate?.finishReason !== "SAFETY",
    );
  }
  return text;
}

const PROVIDERS: Provider[] = [
  {
    id: "gemini",
    label: "Gemini",
    available: () => !!process.env.GEMINI_API_KEY,
    call: async (req) => {
      const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
      const fallback = process.env.GEMINI_FALLBACK_MODEL;
      try {
        return await geminiCall(primary, req);
      } catch (e) {
        if (fallback && fallback !== primary && e instanceof ProviderError && e.retryable) {
          console.error(`[ai] ${e.message}; trying ${fallback}`);
          return geminiCall(fallback, req);
        }
        throw e;
      }
    },
  },
  {
    id: "cerebras",
    label: "Cerebras",
    available: () => !!process.env.CEREBRAS_API_KEY,
    call: (req) =>
      openAiCompatible(
        "https://api.cerebras.ai/v1",
        process.env.CEREBRAS_API_KEY!,
        process.env.CEREBRAS_MODEL || "gpt-oss-120b",
        "Cerebras",
        req,
      ),
  },
  {
    id: "groq",
    label: "Groq",
    available: () => !!process.env.GROQ_API_KEY,
    call: (req) =>
      openAiCompatible(
        "https://api.groq.com/openai/v1",
        process.env.GROQ_API_KEY!,
        process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        "Groq",
        req,
      ),
  },
  {
    id: "anthropic",
    label: "Claude",
    available: () => !!process.env.ANTHROPIC_API_KEY,
    call: async (req) => {
      let res: Response;
      try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
            max_tokens: req.maxTokens ?? 4000,
            temperature: req.temperature ?? 0.3,
            system: req.system,
            messages: [{ role: "user", content: req.prompt }],
          }),
          signal: AbortSignal.timeout(55000),
        });
      } catch {
        throw new ProviderError("Claude did not respond", true);
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new ProviderError(
          `Claude returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
          res.status === 429 || res.status >= 500 || res.status === 529,
        );
      }
      const json = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = (json.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("");
      if (!text) throw new ProviderError("Claude returned an empty answer", true);
      return text;
    },
  },
];

export function configuredProviders(): Provider[] {
  const preferred = process.env.AI_PROVIDER as ProviderId | undefined;
  const list = PROVIDERS.filter((p) => p.available());
  if (preferred) list.sort((a, b) => (a.id === preferred ? -1 : b.id === preferred ? 1 : 0));
  return list;
}

/** Calls the first available provider, falling back on rate limits and outages. */
export async function generate(req: GenerateRequest): Promise<{ text: string; provider: ProviderId }> {
  const providers = configuredProviders();
  if (providers.length === 0) throw new ProviderError("No writing engine is configured", false);
  let lastError: ProviderError | null = null;
  for (const p of providers) {
    try {
      return { text: await p.call(req), provider: p.id };
    } catch (e) {
      lastError = e instanceof ProviderError ? e : new ProviderError(String(e), true);
      console.error(`[ai] ${p.label} failed: ${lastError.message}`);
      if (!lastError.retryable) continue;
    }
  }
  throw lastError ?? new ProviderError("The writing engine failed", true);
}
