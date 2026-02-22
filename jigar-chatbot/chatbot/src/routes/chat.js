import express from "express";
import { z } from "zod";
import { ollamaChat } from "../llm/ollamaClient.js";
import { listMetrics, getMetric } from "../tools/policymapTools.js";

const router = express.Router();

const reqSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1)
  })).min(1)
});

function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function extractGeoID(text) {
  // geoid: 25025000101 OR GeoID 25025000101 OR just number
  const m =
    text.match(/\bgeoid\b[^0-9]*([0-9]{8,12})\b/i) ||
    text.match(/\b([0-9]{8,12})\b/);
  return m ? m[1] : null;
}

function extractMetric(text) {
  // metric: Median Household Income
  // metric="Median Household Income"
  const m = text.match(/metric\s*[:=]\s*["']?([^"'\n]+)["']?/i);
  return m ? m[1].trim() : null;
}

function detectLanguageInstruction(text) {
  const t = text.toLowerCase();
  if (t.includes("responde en español") || t.includes("en español") || t.includes("español")) return "Spanish";
  if (t.includes("हिंदी") || t.includes("hindi")) return "Hindi";
  if (t.includes("العربية") || t.includes("arabic")) return "Arabic";
  if (t.includes("français") || t.includes("french")) return "French";
  if (t.includes("中文") || t.includes("chinese")) return "Chinese";
  return null;
}

async function resolveMetricName(userMetric) {
  // PolicyMap metric names must match column headers exactly.
  // We'll do a case-insensitive "best match" search from list_metrics.
  const all = await listMetrics();
  const metrics = all.metrics || [];
  const q = userMetric.toLowerCase();

  // exact (case-insensitive)
  let best = metrics.find(m => m.toLowerCase() === q);
  if (best) return best;

  // contains
  best = metrics.find(m => m.toLowerCase().includes(q));
  if (best) return best;

  // reverse contains
  best = metrics.find(m => q.includes(m.toLowerCase()));
  if (best) return best;

  return null;
}

router.post("/", async (req, res) => {
  try {
    const parsed = reqSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_request" });

    const messages = parsed.data.messages.slice(-12);
    const text = lastUserText(messages);

    const geoid = extractGeoID(text);
    const userMetric = extractMetric(text);
    const lang = detectLanguageInstruction(text);

    // ✅ HARD RULE: if metric + geoid provided, ALWAYS fetch from CSV (no guessing)
    if (geoid && userMetric) {
      const metric = await resolveMetricName(userMetric);

      if (!metric) {
        const all = await listMetrics();
        return res.json({
          reply: `I couldn't find metric "${userMetric}". Try one of these:\n- ${all.metrics.slice(0, 20).join("\n- ")}\n(Use: metric: <exact name> geoid: <number>)`
        });
      }

      const out = await getMetric({ metric, geoid });

      if (!out.found) {
        return res.json({
          reply: `No row found for GeoID ${geoid} under metric "${metric}".`
        });
      }

      // If user asked for a specific language, let Llama phrase the answer BUT using our retrieved value
      if (lang) {
        const system = {
          role: "system",
          content: `You are a helpful assistant. Respond ONLY in ${lang}. Do not change numbers.`
        };

        const dataMessage = {
          role: "user",
          content:
`Use this factual data exactly:
- metric: ${out.metric}
- GeoID: ${out.geoid}
- Geography Name: ${out.geography_name}
- value: ${out.value}
- time period: ${out.time_period}
- source: ${out.data_source}

Now answer the user's question in ${lang} in 1–2 sentences.`
        };

        const reply = await ollamaChat({ messages: [system, dataMessage] });
        return res.json({ reply });
      }

      // Default (English): return exact data
      return res.json({
        reply: `${out.metric} for GeoID ${out.geoid} (${out.geography_name}) = ${out.value}\nTime: ${out.time_period}\nSource: ${out.data_source}`
      });
    }

    // Fallback normal chat (no data request)
    const system = {
      role: "system",
      content: `You are Foodgrid's assistant. If the user wants CSV data, ask them to provide:\nmetric: <name>\ngeoid: <number>\nSuggest: "list metrics".`
    };

    const reply = await ollamaChat({ messages: [system, ...messages] });
    return res.json({ reply });

  } catch (e) {
    console.error("Chat error:", e);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
