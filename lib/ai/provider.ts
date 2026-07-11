/**
 * Server-only AI provider. Prefers OpenAI (per docs/ARCHITECTURE.md), falls
 * back to Anthropic if that's the key available, and returns null when no key
 * is configured — callers then use the deterministic heuristic layer so the
 * app keeps working with AI switched off.
 */

export type AiResult = { json: Record<string, unknown>; source: string };

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function callAiJson(
  system: string,
  user: string,
): Promise<AiResult | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const json = extractJson(data.choices?.[0]?.message?.content ?? "");
    if (!json) throw new Error("OpenAI returned non-JSON content");
    return { json, source: `openai:${model}` };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok)
      throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("")
      : "";
    const json = extractJson(text);
    if (!json) throw new Error("Anthropic returned non-JSON content");
    return { json, source: `anthropic:${model}` };
  }

  return null;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}
