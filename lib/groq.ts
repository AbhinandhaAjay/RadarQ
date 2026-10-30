// Server-only Groq client. The API key never leaves the server.

const DEFAULT_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

function models(): string[] {
  const fromEnv = process.env.GROQ_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return fromEnv && fromEnv.length ? fromEnv : DEFAULT_MODELS;
}

function parseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error("Model did not return valid JSON");
  }
}

/**
 * Ask Groq for a JSON object. Tries each model in turn, so a rate limit
 * on one free-tier model falls through to the next.
 */
export async function chatJSON<T>(system: string, user: string, maxTokens = 4000): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set on the server");

  let lastError = "Unknown error";
  for (const model of models()) {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_completion_tokens: maxTokens,
    };
    if (model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        lastError = `${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`;
        continue;
      }
      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";
      return parseJSON(content) as T;
    } catch (err) {
      lastError = `${model}: ${(err as Error).message}`;
    }
  }
  throw new Error(`All AI models failed. Last error: ${lastError}`);
}
