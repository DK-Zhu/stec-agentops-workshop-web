import type { Agent } from "@aip/agent-sdk";
import { describe, expect, it } from "vitest";
import {
  WORKSHOP_AGENT_DEFINITION,
  WORKSHOP_BUILTIN_TOOLS,
  WORKSHOP_MCP_SERVER,
  WORKSHOP_MCP_TOOL_NAMES,
  WORKSHOP_SKILLS,
  diffWorkshopAgent,
  missingWorkshopTools,
} from "./workshop-agent.js";

function workshopAgent(): Agent {
  return {
    agentId: "agent-workshop",
    platformOrgId: "org-stec",
    name: WORKSHOP_AGENT_DEFINITION.name,
    primary: WORKSHOP_AGENT_DEFINITION.model,
    systemPrompt: WORKSHOP_AGENT_DEFINITION.systemPrompt,
    builtinTools: [...WORKSHOP_BUILTIN_TOOLS],
    builtinSkills: [...WORKSHOP_SKILLS],
    mcpServers: [WORKSHOP_MCP_SERVER],
    toolPack: {
      schemas: [],
      entries: [
        ...WORKSHOP_BUILTIN_TOOLS.map((toolName) => ({ toolName, source: "builtin" as const })),
        ...WORKSHOP_MCP_TOOL_NAMES.map((toolName) => ({
          toolName,
          source: "mcp" as const,
          mcpServerName: WORKSHOP_MCP_SERVER.name,
        })),
      ],
    },
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

describe("workshop agent definition", () => {
  it("matches an Agent created from the committed definition", () => {
    const agent = workshopAgent();
    expect(diffWorkshopAgent(agent)).toEqual([]);
    expect(missingWorkshopTools(agent)).toEqual([]);
  });

  it("reports configuration drift and missing runtime tools", () => {
    const agent = workshopAgent();
    agent.primary = "another-model";
    agent.builtinSkills = ["pdf"];
    agent.toolPack.entries = agent.toolPack.entries.filter(
      (entry) => entry.toolName !== "Mock_STEC_execute_sql_query",
    );

    expect(diffWorkshopAgent(agent).map((item) => item.field)).toEqual(["model", "skills"]);
    expect(missingWorkshopTools(agent)).toEqual(["Mock_STEC_execute_sql_query"]);
  });
});
