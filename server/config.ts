import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const envLocal = resolve(process.cwd(), ".env.local");
const envDefault = resolve(process.cwd(), ".env");

if (existsSync(envLocal)) dotenv.config({ path: envLocal });
else if (existsSync(envDefault)) dotenv.config({ path: envDefault });

export interface WorkshopConfig {
  baseUrl: string;
  apiKey: string;
  agentId: string;
  endUserId: string;
  mockMode: boolean;
  port: number;
}

export interface AgentOpsConnectionConfig {
  baseUrl: string;
  apiKey: string;
}

function required(name: string, value: string | undefined, mockMode: boolean): string {
  if (value?.trim()) return value.trim();
  if (mockMode) return `mock-${name.toLowerCase()}`;
  throw new Error(`Missing required environment variable: ${name}`);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WorkshopConfig {
  const mockMode = env["WORKSHOP_MOCK_MODE"] === "true";
  const port = Number(env["WORKSHOP_SERVER_PORT"] ?? "8787");
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("WORKSHOP_SERVER_PORT must be a valid TCP port");
  }

  return {
    baseUrl: required("AGENTOPS_BASE_URL", env["AGENTOPS_BASE_URL"], mockMode),
    apiKey: required("AGENTOPS_API_KEY", env["AGENTOPS_API_KEY"], mockMode),
    agentId: required("AGENTOPS_AGENT_ID", env["AGENTOPS_AGENT_ID"], mockMode),
    endUserId: required("AGENTOPS_END_USER_ID", env["AGENTOPS_END_USER_ID"], mockMode),
    mockMode,
    port,
  };
}

export function loadAgentOpsConnectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): AgentOpsConnectionConfig {
  return {
    baseUrl: required("AGENTOPS_BASE_URL", env["AGENTOPS_BASE_URL"], false),
    apiKey: required("AGENTOPS_API_KEY", env["AGENTOPS_API_KEY"], false),
  };
}
