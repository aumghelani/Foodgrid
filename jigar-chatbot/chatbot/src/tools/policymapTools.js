import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

let CACHE = null;

function loadAll() {
  if (CACHE) return CACHE;

  const dataDir = process.env.DATA_DIR || "./src/data/policymap";
  const abs = path.resolve(dataDir);

  if (!fs.existsSync(abs)) throw new Error(`DATA_DIR not found: ${abs}`);

  const files = fs.readdirSync(abs).filter(f => f.toLowerCase().endsWith(".csv"));
  if (files.length === 0) throw new Error(`No CSV files found in ${abs}`);

  const datasets = {};

  for (const f of files) {
    const full = path.join(abs, f);
    const txt = fs.readFileSync(full, "utf8");

    // Robust CSV parsing (handles quotes + commas inside quotes)
    const records = parse(txt, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true
    });

    const headers = Object.keys(records[0] || {});
    const metricCol = headers[5]; // PolicyMap metric is typically 6th column

    const cleaned = records.filter(r => /^\d+$/.test(String(r["GeoID"] || "").replace(/[^0-9]/g, "")));

    // keep largest file if duplicates
    if (!datasets[metricCol] || cleaned.length > datasets[metricCol].rows.length) {
      datasets[metricCol] = { metric: metricCol, sourceFile: f, rows: cleaned, headers };
    }
  }

  CACHE = { datasets };
  return CACHE;
}

function resolveMetric(datasets, metricInput) {
  if (!metricInput) return null;
  const keys = Object.keys(datasets);

  if (datasets[metricInput]) return metricInput;

  const q = metricInput.trim().toLowerCase();

  const ciExact = keys.find(k => k.toLowerCase() === q);
  if (ciExact) return ciExact;

  const subs = keys.filter(k => k.toLowerCase().includes(q)).sort((a, b) => a.length - b.length);
  if (subs.length) return subs[0];

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = keys
    .map(k => {
      const kl = k.toLowerCase();
      let score = 0;
      for (const t of tokens) if (kl.includes(t)) score++;
      return { k, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.k.length - b.k.length);

  return scored.length ? scored[0].k : null;
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  // remove commas, percent signs, etc.
  const cleaned = s.replace(/,/g, "").replace(/%/g, "").replace(/[^\d.\-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export async function listMetrics() {
  const { datasets } = loadAll();
  return { metrics: Object.keys(datasets).sort() };
}

export async function getMetric({ metric, geoid, geography_name }) {
  const { datasets } = loadAll();
  const resolved = resolveMetric(datasets, metric);
  if (!resolved) return { error: "unknown_metric", metric, available: Object.keys(datasets).sort() };

  const ds = datasets[resolved];

  let hit = null;
  if (geoid) {
    const g = geoid.replace(/[^0-9]/g, "");
    hit = ds.rows.find(r => String(r["GeoID"] || "").replace(/[^0-9]/g, "") === g);
  }
  if (!hit && geography_name) {
    const q = geography_name.toLowerCase();
    hit = ds.rows.find(r => String(r["Geography Name"] || "").toLowerCase().includes(q));
  }

  if (!hit) return { found: false, metric: resolved, source: ds.sourceFile };

  return {
    found: true,
    metric: resolved,
    source: ds.sourceFile,
    geography_name: hit["Geography Name"],
    geography_type: hit["Geography Type Description"],
    state: hit["Sits in State"],
    geoid: hit["GeoID"],
    value: hit[resolved],
    value_number: toNumber(hit[resolved]),
    time_period: hit["Data Time Period"],
    data_source: hit["Data Source"]
  };
}

export async function topK({ metric, k = 10, order = "desc" }) {
  const { datasets } = loadAll();
  const resolved = resolveMetric(datasets, metric);
  if (!resolved) return { error: "unknown_metric", metric, available: Object.keys(datasets).sort() };

  const ds = datasets[resolved];

  const parsed = ds.rows
    .map(r => ({
      geoid: r["GeoID"],
      name: r["Geography Name"],
      value: toNumber(r[resolved]),
      raw: r[resolved]
    }))
    .filter(x => x.value !== null);

  parsed.sort((a, b) => (order === "asc" ? a.value - b.value : b.value - a.value));

  return { metric: resolved, source: ds.sourceFile, items: parsed.slice(0, k) };
}

export async function summarizeMetric({ metric }) {
  const { datasets } = loadAll();
  const resolved = resolveMetric(datasets, metric);
  if (!resolved) return { error: "unknown_metric", metric, available: Object.keys(datasets).sort() };

  const ds = datasets[resolved];

  const vals = ds.rows.map(r => toNumber(r[resolved])).filter(v => v !== null);
  if (!vals.length) return { metric: resolved, source: ds.sourceFile, count: 0 };

  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    metric: resolved,
    source: ds.sourceFile,
    count: vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    mean: sum / vals.length
  };
}
