import { AgentOpsClient } from "@aip/agent-sdk";
import { loadAgentOpsConnectionConfig } from "../server/config.js";
import {
  WORKSHOP_AGENT_DEFINITION,
  WORKSHOP_AGENT_MODEL,
  WORKSHOP_AGENT_NAME,
  diffWorkshopAgent,
  missingWorkshopTools,
} from "../server/workshop-agent.js";

function printHelp(): void {
  console.log(`用法：
  npm run agent:provision             创建或复用培训 Agent
  npm run agent:provision -- --update 将同名 Agent 更新为源码中的定义

需要在 .env.local 中配置 AGENTOPS_BASE_URL 和具有 Agent 管理权限的 AGENTOPS_API_KEY。`);
}

function compact(value: unknown): string {
  const rendered = JSON.stringify(value);
  return rendered.length > 160 ? `${rendered.slice(0, 157)}...` : rendered;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }
  const unknownArgs = [...args].filter((arg) => arg !== "--update");
  if (unknownArgs.length > 0) throw new Error(`Unknown argument: ${unknownArgs.join(", ")}`);

  const config = loadAgentOpsConnectionConfig();
  const client = new AgentOpsClient({ baseURL: config.baseUrl, apiKey: config.apiKey });

  const models = await client.models.list();
  if (!models.some((model) => model.name === WORKSHOP_AGENT_MODEL)) {
    throw new Error(`Model is not available on this AgentOps deployment: ${WORKSHOP_AGENT_MODEL}`);
  }

  const matches = (await client.agents.list()).filter((agent) => agent.name === WORKSHOP_AGENT_NAME);
  if (matches.length > 1) {
    throw new Error(`Multiple agents use the workshop name: ${WORKSHOP_AGENT_NAME}`);
  }

  let agent = matches[0];
  if (agent === undefined) {
    console.log(`未找到同名 Agent，正在创建：${WORKSHOP_AGENT_NAME}`);
    agent = await client.agents.create(WORKSHOP_AGENT_DEFINITION);
    console.log("✓ 培训 Agent 已创建");
  } else {
    const drift = diffWorkshopAgent(agent);
    if (drift.length === 0) {
      console.log(`✓ 已复用现有培训 Agent：${agent.agentId}`);
    } else if (!args.has("--update")) {
      console.log("检测到平台 Agent 与源码定义不一致：");
      for (const item of drift) {
        console.log(`- ${item.field}\n  期望：${compact(item.expected)}\n  当前：${compact(item.actual)}`);
      }
      console.log("\n确认需要覆盖平台配置后，请运行：npm run agent:provision -- --update");
      process.exitCode = 2;
      return;
    } else {
      console.log(`正在更新现有培训 Agent：${agent.agentId}`);
      agent = await client.agents.update(agent.agentId, WORKSHOP_AGENT_DEFINITION);
      console.log("✓ 培训 Agent 已更新");
    }
  }

  const missingTools = missingWorkshopTools(agent);
  if (missingTools.length > 0) {
    throw new Error(`Workshop agent is missing registered tools: ${missingTools.join(", ")}`);
  }

  console.log(`✓ 模型：${agent.primary}`);
  console.log(`✓ MCP 工具和平台工具已注册`);
  console.log(`\nAGENTOPS_AGENT_ID=${agent.agentId}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n✗ Agent provisioning failed: ${message}`);
  process.exit(1);
});
