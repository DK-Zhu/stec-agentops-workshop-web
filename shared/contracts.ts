export const MAX_WORKSPACE_FILE_SIZE_MIB = 10;
export const MAX_WORKSPACE_FILE_SIZE_BYTES = MAX_WORKSPACE_FILE_SIZE_MIB * 1024 * 1024;

export type SessionStatus = "initialized" | "running" | "idle" | "archived";

export interface WorkshopSession {
  sessionId: string;
  title: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  timestamp: string;
}

export interface WorkspaceFile {
  name: string;
  size: number;
  modifiedAt: string;
  contentType?: string;
  type?: "file" | "directory";
}

export interface BootstrapPayload {
  connected: boolean;
  mockMode: boolean;
  agentName: string;
  agentId: string;
  endUserId: string;
  sessions: WorkshopSession[];
}

export type WorkshopStreamEvent =
  | { type: "session.status"; status: "running" | "idle" }
  | {
      type: "part.new";
      partId: string;
      partType: "reasoning" | "text";
      partSegment: "answer" | "compact";
      text?: string;
    }
  | { type: "part.delta"; partId: string; delta: string }
  | { type: "part.close"; partId: string }
  | {
      type: "tool_call.start";
      toolCallId: string;
      toolName: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_call.result";
      toolCallId: string;
      toolName: string;
      output: unknown;
      isError?: boolean;
    }
  | {
      type: "agent.done";
      finishReason: "stop" | "iteration_limit" | "aborted";
      iterationsUsed: number;
      totalTokens?: [number, number];
      totalCachedTokens?: number;
      ttftFirstMs?: number;
      ttftLastMs?: number;
    }
  | { type: "error"; code: string; message: string }
  | {
      type: "subagent.progress";
      subagentRunId: string;
      description: string;
      name?: string;
      background: boolean;
      kind: "started" | "tool_start" | "tool_end" | "completed" | "terminated";
      toolCallId?: string;
      toolName?: string;
      inputPreview?: string;
      isError?: boolean;
      status?: string;
      reason?: string;
    };

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}
