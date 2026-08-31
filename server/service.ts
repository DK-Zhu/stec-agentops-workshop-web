import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { AgentOpsClient } from "@aip/agent-sdk";
import type { MessageStreamEvent } from "@aip/agent-sdk";
import type {
  BootstrapPayload,
  WorkshopMessage,
  WorkshopSession,
  WorkshopStreamEvent,
  WorkspaceFile,
} from "../shared/contracts.js";
import type { WorkshopConfig } from "./config.js";
import {
  WORKSHOP_AGENT_NAME,
  WORKSHOP_MCP_TOOL_NAMES,
  WORKSHOP_RUNTIME_CONTEXT,
} from "./workshop-agent.js";

export type EventStream = AsyncIterable<WorkshopStreamEvent> & { close?: () => void | Promise<void> };

export interface DownloadedFile {
  stream: NodeJS.ReadableStream;
  size: number;
  contentType?: string;
}

export interface WorkshopService {
  bootstrap(): Promise<BootstrapPayload>;
  createSession(title?: string): Promise<WorkshopSession>;
  listMessages(sessionId: string): Promise<WorkshopMessage[]>;
  streamMessage(sessionId: string, content: string): EventStream;
  abort(sessionId: string): Promise<void>;
  listFiles(sessionId: string): Promise<WorkspaceFile[]>;
  uploadFile(sessionId: string, file: { name: string; data: Buffer; contentType?: string }): Promise<WorkspaceFile>;
  downloadFile(sessionId: string, name: string): Promise<DownloadedFile>;
}

function sessionView(session: {
  sessionId: string;
  title: string;
  status: WorkshopSession["status"];
  createdAt: string;
  updatedAt: string;
}): WorkshopSession {
  return {
    sessionId: session.sessionId,
    title: session.title,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

class RealWorkshopService implements WorkshopService {
  private readonly client: AgentOpsClient;

  constructor(private readonly config: WorkshopConfig) {
    this.client = new AgentOpsClient({ baseURL: config.baseUrl, apiKey: config.apiKey });
  }

  async bootstrap(): Promise<BootstrapPayload> {
    const [agent, sessions] = await Promise.all([
      this.client.agents.retrieve(this.config.agentId),
      this.client.sessions.list(this.config.agentId, this.config.endUserId),
    ]);
    return {
      connected: true,
      mockMode: false,
      agentName: agent.name,
      agentId: agent.agentId,
      endUserId: this.config.endUserId,
      sessions: sessions.map(sessionView).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  }

  async createSession(title = "AgentOps Workshop"): Promise<WorkshopSession> {
    const session = await this.client.sessions.create(
      {
        agentId: this.config.agentId,
        title,
        runtimeContext: WORKSHOP_RUNTIME_CONTEXT,
      },
      this.config.endUserId,
    );
    return sessionView(session);
  }

  async listMessages(sessionId: string): Promise<WorkshopMessage[]> {
    const messages = await this.client.messages.list(sessionId, this.config.endUserId);
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      ...(message.thinking !== undefined ? { thinking: message.thinking } : {}),
      timestamp: message.timestamp,
    }));
  }

  streamMessage(sessionId: string, content: string): EventStream {
    const stream = this.client.messages.stream(
      sessionId,
      content,
      this.config.endUserId,
      { runtimeContext: WORKSHOP_RUNTIME_CONTEXT },
    );
    return stream as AsyncIterable<MessageStreamEvent> & EventStream;
  }

  async abort(sessionId: string): Promise<void> {
    await this.client.sessions.abort(sessionId, this.config.endUserId);
  }

  async listFiles(sessionId: string): Promise<WorkspaceFile[]> {
    return this.client.workspace.listFiles(sessionId, this.config.endUserId);
  }

  async uploadFile(
    sessionId: string,
    file: { name: string; data: Buffer; contentType?: string },
  ): Promise<WorkspaceFile> {
    return this.client.workspace.uploadFile(sessionId, this.config.endUserId, file);
  }

  downloadFile(sessionId: string, name: string): Promise<DownloadedFile> {
    return this.client.workspace.downloadFile(sessionId, this.config.endUserId, name);
  }
}

interface MockFile extends WorkspaceFile {
  data?: Buffer;
}

const wait = (ms: number): Promise<void> => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

class MockWorkshopService implements WorkshopService {
  private readonly sessions = new Map<string, WorkshopSession>();
  private readonly messages = new Map<string, WorkshopMessage[]>();
  private readonly files = new Map<string, Map<string, MockFile>>();

  constructor(private readonly config: WorkshopConfig) {
    const session = this.seedSession();
    this.sessions.set(session.sessionId, session);
    this.messages.set(session.sessionId, [
      {
        id: "msg_seed_user",
        role: "user",
        content: "请分析上海路桥 2025 年的营业收入、净利润和市场中标情况。",
        timestamp: new Date(Date.now() - 60_000).toISOString(),
      },
      {
        id: "msg_seed_assistant",
        role: "assistant",
        content:
          "已完成初步经营分析。你可以继续指定月份、对比企业，或上传经营材料生成管理层简报。",
        thinking: "先解析公司范围，再分别查询财务指标和市场指标，最后统一口径进行分析。",
        timestamp: new Date(Date.now() - 45_000).toISOString(),
      },
    ]);
    this.files.set(
      session.sessionId,
      new Map([
        [
          "经营指标明细.xlsx",
          {
            name: "经营指标明细.xlsx",
            size: 12_748,
            modifiedAt: new Date(Date.now() - 30_000).toISOString(),
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            type: "file",
            data: Buffer.from("Workshop mock file: business indicator details"),
          },
        ],
        [
          "经营分析简报.docx",
          {
            name: "经营分析简报.docx",
            size: 25_948,
            modifiedAt: new Date(Date.now() - 20_000).toISOString(),
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            type: "file",
            data: Buffer.from("Workshop mock file: business analysis brief"),
          },
        ],
        [
          "分析产物",
          {
            name: "分析产物",
            size: 0,
            modifiedAt: new Date(Date.now() - 10_000).toISOString(),
            type: "directory",
          },
        ],
      ]),
    );
  }

  private seedSession(): WorkshopSession {
    const now = new Date().toISOString();
    return {
      sessionId: `mock_${randomUUID()}`,
      title: "经营数据分析",
      status: "idle",
      createdAt: now,
      updatedAt: now,
    };
  }

  async bootstrap(): Promise<BootstrapPayload> {
    return {
      connected: true,
      mockMode: true,
      agentName: WORKSHOP_AGENT_NAME,
      agentId: this.config.agentId,
      endUserId: this.config.endUserId,
      sessions: [...this.sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  }

  async createSession(title = "新的培训会话"): Promise<WorkshopSession> {
    const session = this.seedSession();
    session.title = title;
    this.sessions.set(session.sessionId, session);
    this.messages.set(session.sessionId, []);
    this.files.set(session.sessionId, new Map());
    return session;
  }

  async listMessages(sessionId: string): Promise<WorkshopMessage[]> {
    return [...(this.messages.get(sessionId) ?? [])];
  }

  streamMessage(sessionId: string, content: string): EventStream {
    const messages = this.messages.get(sessionId) ?? [];
    messages.push({
      id: `msg_${randomUUID()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    });
    this.messages.set(sessionId, messages);

    const answer = [
      "根据财务指标和市场指标查询结果，可以从以下维度观察经营情况：\n\n",
      "| 分析维度 | 关注指标 | 解读重点 |\n|---|---|---|\n",
      "| 经营规模 | 营业收入、净利润 | 对比年度目标及同比变化 |\n",
      "| 市场拓展 | 中标金额、投标金额 | 观察订单获取能力与后续储备 |\n",
      "| 经营质量 | ROE、应收账款 | 结合盈利能力和资金占用判断质量 |\n\n",
      "当前为本地 Mock 演示结果。连接培训 Agent 后，页面会展示 Mock_STEC MCP 返回的真实模拟指标。",
    ];

    const iterator = (async function* (): AsyncGenerator<WorkshopStreamEvent> {
      yield { type: "session.status", status: "running" };
      yield {
        type: "part.new",
        partId: "reasoning-1",
        partType: "reasoning",
        partSegment: "answer",
        text: "",
      };
      for (const delta of ["确认公司和时间范围。", "查询财务指标并核对统计口径。", "查询市场指标并汇总经营结论。"] ) {
        await wait(180);
        yield { type: "part.delta", partId: "reasoning-1", delta };
      }
      yield { type: "part.close", partId: "reasoning-1" };
      yield {
        type: "subagent.progress",
        subagentRunId: "subagent-finance-1",
        description: "分析财务指标",
        name: "财务分析",
        background: false,
        kind: "started",
      };
      yield {
        type: "subagent.progress",
        subagentRunId: "subagent-finance-1",
        description: "分析财务指标",
        name: "财务分析",
        background: false,
        kind: "tool_start",
        toolCallId: "subtool-finance-1",
        toolName: WORKSHOP_MCP_TOOL_NAMES[1],
        inputPreview: '{"company_names":["上海路桥"],"year_from":2025,"year_to":2025}',
      };
      yield {
        type: "tool_call.start",
        toolCallId: "tool-1",
        toolName: WORKSHOP_MCP_TOOL_NAMES[1],
        input: { company_names: ["上海路桥"], year_from: 2025, year_to: 2025 },
      };
      await wait(650);
      yield {
        type: "tool_call.result",
        toolCallId: "tool-1",
        toolName: WORKSHOP_MCP_TOOL_NAMES[1],
        output: "已返回上海路桥 2025 年财务指标记录",
      };
      yield {
        type: "subagent.progress",
        subagentRunId: "subagent-finance-1",
        description: "分析财务指标",
        name: "财务分析",
        background: false,
        kind: "tool_end",
        toolCallId: "subtool-finance-1",
        toolName: WORKSHOP_MCP_TOOL_NAMES[1],
        isError: false,
      };
      yield {
        type: "subagent.progress",
        subagentRunId: "subagent-finance-1",
        description: "分析财务指标",
        name: "财务分析",
        background: false,
        kind: "completed",
        status: "completed",
      };
      yield {
        type: "part.new",
        partId: "text-1",
        partType: "text",
        partSegment: "answer",
        text: "",
      };
      for (const delta of answer) {
        await wait(180);
        yield { type: "part.delta", partId: "text-1", delta };
      }
      yield { type: "part.close", partId: "text-1" };
      yield {
        type: "agent.done",
        finishReason: "stop",
        iterationsUsed: 2,
        totalTokens: [1840, 356],
        totalCachedTokens: 1230,
        ttftFirstMs: 620,
        ttftLastMs: 410,
      };
      yield { type: "session.status", status: "idle" };
      messages.push({
        id: `msg_${randomUUID()}`,
        role: "assistant",
        content: answer.join(""),
        thinking: "确认公司和时间范围。查询财务指标并核对统计口径。查询市场指标并汇总经营结论。",
        timestamp: new Date().toISOString(),
      });
    })();
    return iterator as EventStream;
  }

  async abort(): Promise<void> {
    return undefined;
  }

  async listFiles(sessionId: string): Promise<WorkspaceFile[]> {
    return [...(this.files.get(sessionId)?.values() ?? [])].map(({ data: _data, ...file }) => file);
  }

  async uploadFile(
    sessionId: string,
    file: { name: string; data: Buffer; contentType?: string },
  ): Promise<WorkspaceFile> {
    const entry: MockFile = {
      name: file.name,
      size: file.data.byteLength,
      modifiedAt: new Date().toISOString(),
      ...(file.contentType !== undefined ? { contentType: file.contentType } : {}),
      type: "file",
      data: file.data,
    };
    const bucket = this.files.get(sessionId) ?? new Map<string, MockFile>();
    bucket.set(file.name, entry);
    this.files.set(sessionId, bucket);
    const { data: _data, ...view } = entry;
    return view;
  }

  async downloadFile(sessionId: string, name: string): Promise<DownloadedFile> {
    const file = this.files.get(sessionId)?.get(name);
    if (file === undefined) throw new Error(`Workspace file not found: ${name}`);
    if (file.type === "directory" || file.data === undefined) {
      throw new Error(`Workspace directory cannot be downloaded: ${name}`);
    }
    return {
      stream: Readable.from(file.data),
      size: file.data.byteLength,
      ...(file.contentType !== undefined ? { contentType: file.contentType } : {}),
    };
  }
}

export function createWorkshopService(config: WorkshopConfig): WorkshopService {
  return config.mockMode ? new MockWorkshopService(config) : new RealWorkshopService(config);
}
