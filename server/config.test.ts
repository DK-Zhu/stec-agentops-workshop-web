import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("loads required AgentOps settings", () => {
    const config = loadConfig({
      AGENTOPS_BASE_URL: "https://example.test/api/v1",
      AGENTOPS_API_KEY: "test-key",
      AGENTOPS_AGENT_ID: "agent-1",
      AGENTOPS_END_USER_ID: "workshop-a-001",
    });
    expect(config).toMatchObject({
      baseUrl: "https://example.test/api/v1",
      agentId: "agent-1",
      endUserId: "workshop-a-001",
      mockMode: false,
    });
  });

  it("allows an empty credential set in explicit mock mode", () => {
    const config = loadConfig({ WORKSHOP_MOCK_MODE: "true" });
    expect(config.mockMode).toBe(true);
    expect(config.endUserId).toBe("mock-agentops_end_user_id");
  });

  it("fails fast when real mode credentials are missing", () => {
    expect(() => loadConfig({})).toThrow(/AGENTOPS_BASE_URL/);
  });
});
