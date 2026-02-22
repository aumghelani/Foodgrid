/**
 * ollamaClient — calls the local Ollama API.
 *
 * Env vars:
 *   OLLAMA_URL   — defaults to http://localhost:11434
 *   MODEL        — defaults to llama3.1:8b
 */

const DEFAULT_URL   = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1:8b";

/**
 * @param {{ messages: {role:'user'|'assistant'|'system', content:string}[], systemPrompt?: string }} opts
 * @returns {Promise<string>}
 */
export async function ollamaChat({ messages, systemPrompt }) {
  const base  = (process.env.OLLAMA_URL   || DEFAULT_URL).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || process.env.MODEL || DEFAULT_MODEL;

  // Build full message array: system prompt first (if provided), then conversation
  const all = [];

  if (systemPrompt) {
    all.push({ role: "system", content: systemPrompt });
  }

  // Include any system messages already in the array (de-dupe if systemPrompt also set)
  for (const m of messages) {
    if (m.role === "system" && systemPrompt) continue; // already added above
    all.push({ role: m.role, content: m.content });
  }

  const body = {
    model,
    messages: all,
    stream: false,
    options: {
      temperature: 0.7,
      num_predict: 512,
    },
  };

  const res = await fetch(`${base}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Ollama ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data?.message?.content ?? "";
}
