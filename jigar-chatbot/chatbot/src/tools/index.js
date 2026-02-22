import { listMetrics, getMetric, topK, summarizeMetric } from "./policymapTools.js";

export const TOOL_DEFS = [
  { name: "list_metrics", description: "List available PolicyMap metrics.", parameters: { type: "object", properties: {} }, handler: listMetrics },
  {
    name: "get_metric",
    description: "Get metric value for a GeoID or Geography Name.",
    parameters: {
      type: "object",
      properties: { metric: { type: "string" }, geoid: { type: "string" }, geography_name: { type: "string" } },
      required: ["metric"]
    },
    handler: getMetric
  },
  {
    name: "top_k",
    description: "Top K geographies by a metric.",
    parameters: {
      type: "object",
      properties: { metric: { type: "string" }, k: { type: "number" }, order: { type: "string", enum: ["desc", "asc"] } },
      required: ["metric"]
    },
    handler: topK
  },
  {
    name: "summarize_metric",
    description: "Summary stats for a metric.",
    parameters: { type: "object", properties: { metric: { type: "string" } }, required: ["metric"] },
    handler: summarizeMetric
  }
];

export function geminiToolConfig() {
  return [{
    functionDeclarations: TOOL_DEFS.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }))
  }];
}

export async function runTool(name, args) {
  const tool = TOOL_DEFS.find(t => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return await tool.handler(args);
}
