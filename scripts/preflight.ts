import { AgentOpsClient } from "@aip/agent-sdk";
import { loadConfig } from "../server/config.js";
import {
  WORKSHOP_AGENT_MODEL,
  WORKSHOP_AGENT_NAME,
  WORKSHOP_MCP_SERVER,
  diffWorkshopAgent,
  missingWorkshopTools,
} from "../server/workshop-agent.js";

function ok(label: string, detail: string): void {
  console.log(`✓ ${label.padEnd(20)} ${detail}`);
}

function fail(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n✗ Preflight failed: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error(
      `Node.js 22.12 or newer is required (current: ${process.version}). Install Node.js 24 LTS from https://nodejs.org/en/download`,
    );
  }
  ok("Node.js", process.version);

  const config = loadConfig();
  ok("Configuration", config.mockMode ? "mock mode" : "required values loaded");
  ok("End user", config.endUserId);

  if (config.mockMode) {
    ok("AgentOps", "skipped in mock mode");
    ok("Workshop Agent", WORKSHOP_AGENT_NAME);
    ok("Default model", WORKSHOP_AGENT_MODEL);
    ok("Mock MCP", WORKSHOP_MCP_SERVER.connection.url);
    return;
  }

  const client = new AgentOpsClient({ baseURL: config.baseUrl, apiKey: config.apiKey });
  const [agent, models] = await Promise.all([
    client.agents.retrieve(config.agentId),
    client.models.list(),
  ]);
  const drift = diffWorkshopAgent(agent);
  if (drift.length > 0) {
    throw new Error(`Workshop agent differs from source definition: ${drift.map((item) => item.field).join(", ")}`);
  }
  const missingTools = missingWorkshopTools(agent);
  if (missingTools.length > 0) {
    throw new Error(`Workshop agent is missing registered tools: ${missingTools.join(", ")}`);
  }
  if (!models.some((model) => model.name === WORKSHOP_AGENT_MODEL)) {
    throw new Error(`Model is not available on this AgentOps deployment: ${WORKSHOP_AGENT_MODEL}`);
  }
  ok("AgentOps", config.baseUrl);
  ok("Workshop Agent", `${agent.name} (${agent.agentId})`);
  ok("Default model", agent.primary);
  ok("Registered tools", String(agent.toolPack.entries.length));
  ok("Mock MCP", WORKSHOP_MCP_SERVER.connection.url);
}

main().catch(fail);
