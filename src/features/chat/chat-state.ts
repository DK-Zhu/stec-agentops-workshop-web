import type { WorkshopMessage, WorkshopStreamEvent } from "../../../shared/contracts";

export interface ToolActivity {
  id: string;
  name: string;
  status: "running" | "success" | "error";
  input: Record<string, unknown>;
  output?: unknown;
}

export interface SubagentActivity {
  id: string;
  name?: string;
  description: string;
  background: boolean;
  status: "running" | "success" | "error";
  toolCallId?: string;
  toolName?: string;
  inputPreview?: string;
  outcome?: string;
}

export interface RunMetrics {
  iterations: number;
  totalTokens?: [number, number];
  cachedTokens?: number;
  ttftMs?: number;
}

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: string;
  tools: ToolActivity[];
  subagents: SubagentActivity[];
  parts: Record<string, "reasoning" | "text">;
  streaming?: boolean;
  metrics?: RunMetrics;
}

export interface ChatState {
  items: ChatItem[];
  runStatus: "idle" | "running";
}

export type ChatAction =
  | { type: "history"; messages: WorkshopMessage[] }
  | { type: "start"; userId: string; assistantId: string; content: string; timestamp: string }
  | { type: "event"; assistantId: string; event: WorkshopStreamEvent }
  | { type: "failed"; assistantId: string; message: string }
  | { type: "reset" };

export const initialChatState: ChatState = { items: [], runStatus: "idle" };

function updateAssistant(
  state: ChatState,
  assistantId: string,
  update: (item: ChatItem) => ChatItem,
): ChatState {
  return {
    ...state,
    items: state.items.map((item) => (item.id === assistantId ? update(item) : item)),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "history":
      return {
        runStatus: "idle",
        items: action.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          ...(message.thinking ? { reasoning: message.thinking } : {}),
          timestamp: message.timestamp,
          tools: [],
          subagents: [],
          parts: {},
        })),
      };
    case "start":
      return {
        runStatus: "running",
        items: [
          ...state.items,
          {
            id: action.userId,
            role: "user",
            content: action.content,
            timestamp: action.timestamp,
            tools: [],
            subagents: [],
            parts: {},
          },
          {
            id: action.assistantId,
            role: "assistant",
            content: "",
            reasoning: "",
            timestamp: action.timestamp,
            tools: [],
            subagents: [],
            parts: {},
            streaming: true,
          },
        ],
      };
    case "event": {
      const event = action.event;
      if (event.type === "session.status") {
        return {
          ...state,
          runStatus: event.status,
          items:
            event.status === "idle"
              ? state.items.map((item) =>
                  item.id === action.assistantId ? { ...item, streaming: false } : item,
                )
              : state.items,
        };
      }
      return updateAssistant(state, action.assistantId, (item) => {
        switch (event.type) {
          case "part.new": {
            const parts = { ...item.parts, [event.partId]: event.partType };
            if (!event.text) return { ...item, parts };
            return event.partType === "reasoning"
              ? { ...item, parts, reasoning: `${item.reasoning ?? ""}${event.text}` }
              : { ...item, parts, content: `${item.content}${event.text}` };
          }
          case "part.delta":
            return item.parts[event.partId] === "reasoning"
              ? { ...item, reasoning: `${item.reasoning ?? ""}${event.delta}` }
              : { ...item, content: `${item.content}${event.delta}` };
          case "tool_call.start":
            return {
              ...item,
              tools: [
                ...item.tools,
                {
                  id: event.toolCallId,
                  name: event.toolName,
                  status: "running",
                  input: event.input,
                },
              ],
            };
          case "tool_call.result":
            return {
              ...item,
              tools: item.tools.map((tool) =>
                tool.id === event.toolCallId
                  ? {
                      ...tool,
                      status: event.isError ? "error" : "success",
                      output: event.output,
                    }
                  : tool,
              ),
            };
          case "subagent.progress": {
            const current = item.subagents.find(
              (subagent) => subagent.id === event.subagentRunId,
            );
            const status: SubagentActivity["status"] =
              event.kind === "terminated"
                ? "error"
                : event.kind === "completed"
                  ? event.status === undefined || event.status === "completed"
                    ? "success"
                    : "error"
                  : "running";
            const next: SubagentActivity = {
              id: event.subagentRunId,
              description: event.description,
              background: event.background,
              status,
              ...(event.name !== undefined
                ? { name: event.name }
                : current?.name !== undefined
                  ? { name: current.name }
                  : {}),
              ...(event.toolCallId !== undefined
                ? { toolCallId: event.toolCallId }
                : current?.toolCallId !== undefined
                  ? { toolCallId: current.toolCallId }
                  : {}),
              ...(event.toolName !== undefined
                ? { toolName: event.toolName }
                : current?.toolName !== undefined
                  ? { toolName: current.toolName }
                  : {}),
              ...(event.inputPreview !== undefined
                ? { inputPreview: event.inputPreview }
                : current?.inputPreview !== undefined
                  ? { inputPreview: current.inputPreview }
                  : {}),
              ...(event.status !== undefined
                ? { outcome: event.status }
                : event.reason !== undefined
                  ? { outcome: event.reason }
                  : current?.outcome !== undefined
                    ? { outcome: current.outcome }
                    : {}),
            };
            return {
              ...item,
              subagents: current
                ? item.subagents.map((subagent) =>
                    subagent.id === event.subagentRunId ? next : subagent,
                  )
                : [...item.subagents, next],
            };
          }
          case "agent.done":
            return {
              ...item,
              metrics: {
                iterations: event.iterationsUsed,
                ...(event.totalTokens !== undefined ? { totalTokens: event.totalTokens } : {}),
                ...(event.totalCachedTokens !== undefined
                  ? { cachedTokens: event.totalCachedTokens }
                  : {}),
                ...(event.ttftLastMs !== undefined ? { ttftMs: event.ttftLastMs } : {}),
              },
            };
          case "error":
            return {
              ...item,
              content: item.content || `运行失败：${event.message}`,
              streaming: false,
            };
          default:
            return item;
        }
      });
    }
    case "failed":
      return {
        ...updateAssistant(state, action.assistantId, (item) => ({
          ...item,
          content: item.content || `请求失败：${action.message}`,
          streaming: false,
        })),
        runStatus: "idle",
      };
    case "reset":
      return initialChatState;
  }
}
