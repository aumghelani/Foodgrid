import express from "express";
import { z } from "zod";
import { ollamaChat } from "../llm/ollamaClient.js";
import { listMetrics, getMetric } from "../tools/policymapTools.js";

const router = express.Router();

// ─── Request schema ───────────────────────────────────────────────────────────
// Frontend (ChatPanel.tsx) sends:
//   { message: string, history: [{role, content}]?, language: string? }

const reqSchema = z.object({
  message:  z.string().min(1),
  history:  z.array(z.object({
    role:    z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional().default([]),
  language: z.string().optional().default("en"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANGUAGE_NAMES = {
  es: "Spanish", zh: "Chinese", pt: "Portuguese", fr: "French",
  hi: "Hindi",   ar: "Arabic",  de: "German",     ja: "Japanese",
};

function extractGeoID(text) {
  const m =
    text.match(/\bgeoid\b[^0-9]*([0-9]{8,12})\b/i) ||
    text.match(/\b([0-9]{8,12})\b/);
  return m ? m[1] : null;
}

function extractMetric(text) {
  const m = text.match(/metric\s*[:=]\s*["']?([^"'\n]+)["']?/i);
  return m ? m[1].trim() : null;
}

async function resolveMetricName(userMetric) {
  const all = await listMetrics();
  const metrics = all.metrics || [];
  const q = userMetric.toLowerCase();

  let best = metrics.find(m => m.toLowerCase() === q);
  if (best) return best;
  best = metrics.find(m => m.toLowerCase().includes(q));
  if (best) return best;
  best = metrics.find(m => q.includes(m.toLowerCase()));
  return best ?? null;
}

// ─── POST /chat ───────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const parsed = reqSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_request", detail: parsed.error.flatten() });
    }

    const { message: userText, history, language } = parsed.data;

    // Build the conversation array (last 10 turns of history + current message)
    const fullMessages = [
      ...history.slice(-10),
      { role: "user", content: userText },
    ];

    const langName = LANGUAGE_NAMES[language] ?? null;
    const langNote = langName ? ` Respond in ${langName}.` : "";

    const geoid      = extractGeoID(userText);
    const userMetric = extractMetric(userText);

    // ── Data query: metric + geoid both provided ──────────────────────────────
    if (geoid && userMetric) {
      const metric = await resolveMetricName(userMetric);

      if (!metric) {
        const all = await listMetrics();
        return res.json({
          reply: `I couldn't find metric "${userMetric}". Available metrics include:\n- ${all.metrics.slice(0, 15).join("\n- ")}\n\nTry: metric: <name>  geoid: <number>`,
        });
      }

      const out = await getMetric({ metric, geoid });

      if (!out.found) {
        return res.json({
          reply: `No data found for GeoID ${geoid} under metric "${metric}".`,
        });
      }

      // Non-English: let Gemini rephrase with the real data
      if (langName) {
        const systemPrompt = `You are FoodGrid Boston's data assistant. Respond ONLY in ${langName}. Do not change numbers or facts.`;
        const dataMessage = {
          role:    "user",
          content: `Provide this data in ${langName} in 1–2 sentences:\n- Metric: ${out.metric}\n- GeoID: ${out.geoid}\n- Area: ${out.geography_name}\n- Value: ${out.value}\n- Period: ${out.time_period}\n- Source: ${out.data_source}`,
        };
        const reply = await ollamaChat({ messages: [dataMessage], systemPrompt });
        return res.json({ reply });
      }

      // English: return exact data
      return res.json({
        reply: `${out.metric}\nArea: ${out.geography_name} (GeoID ${out.geoid})\nValue: ${out.value}\nPeriod: ${out.time_period}\nSource: ${out.data_source}`,
      });
    }

    // ── "list metrics" intent ─────────────────────────────────────────────────
    if (/\blist\s+metrics?\b/i.test(userText)) {
      const all = await listMetrics();
      return res.json({
        reply: `Available PolicyMap metrics (${all.metrics.length} total):\n- ${all.metrics.slice(0, 20).join("\n- ")}${all.metrics.length > 20 ? `\n…and ${all.metrics.length - 20} more.` : ""}`,
      });
    }

    // ── General conversation via Gemini ───────────────────────────────────────
    const systemPrompt =
      `You are FoodGrid Boston's food access assistant — friendly, concise, and factual.${langNote} ` +
      `Help residents find food resources, understand SNAP benefits, transit access, and local food programs in Boston. ` +
      `If the user wants specific census-tract data, ask them to provide: metric: <name>  geoid: <11-digit number>. ` +
      `Keep responses under 120 words.`;

    const reply = await ollamaChat({ messages: fullMessages, systemPrompt });
    return res.json({ reply });

  } catch (e) {
    console.error("Chat error:", e);
    return res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

export default router;
