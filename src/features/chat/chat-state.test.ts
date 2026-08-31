import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState } from "./chat-state";

describe("chatReducer", () => {
  it("assembles reasoning, tool activity and answer events into one assistant item", () => {
    let state = chatReducer(initialChatState, {
      type: "start",
      userId: "u1",
      assistantId: "a1",
      content: "分析经营指标",
      timestamp: "2026-08-31T00:00:00.000Z",
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: { type: "part.new", partId: "r1", partType: "reasoning", partSegment: "answer" },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: { type: "part.delta", partId: "r1", delta: "先查询资料" },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: {
        type: "tool_call.start",
        toolCallId: "t1",
        toolName: "Mock_STEC_query_financial_indicators",
        input: { company_names: ["上海路桥"] },
      },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: {
        type: "tool_call.result",
        toolCallId: "t1",
        toolName: "Mock_STEC_query_financial_indicators",
        output: "ok",
      },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: { type: "part.new", partId: "p1", partType: "text", partSegment: "answer" },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: { type: "part.delta", partId: "p1", delta: "分析完成" },
    });

    const assistant = state.items[1];
    expect(assistant?.reasoning).toBe("先查询资料");
    expect(assistant?.content).toBe("分析完成");
    expect(assistant?.tools[0]).toMatchObject({
      name: "Mock_STEC_query_financial_indicators",
      status: "success",
      output: "ok",
    });
  });

  it("marks the current assistant response complete on idle", () => {
    let state = chatReducer(initialChatState, {
      type: "start",
      userId: "u1",
      assistantId: "a1",
      content: "hello",
      timestamp: "2026-08-31T00:00:00.000Z",
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: { type: "session.status", status: "idle" },
    });
    expect(state.runStatus).toBe("idle");
    expect(state.items[1]?.streaming).toBe(false);
  });

  it("tracks the complete Agent SDK 1.2.0 subagent progress lifecycle", () => {
    let state = chatReducer(initialChatState, {
      type: "start",
      userId: "u1",
      assistantId: "a1",
      content: "并行分析经营指标",
      timestamp: "2026-09-01T00:00:00.000Z",
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: {
        type: "subagent.progress",
        subagentRunId: "sub-1",
        description: "分析财务指标",
        name: "财务分析",
        background: false,
        kind: "started",
      },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: {
        type: "subagent.progress",
        subagentRunId: "sub-1",
        description: "分析财务指标",
        background: false,
        kind: "tool_start",
        toolCallId: "sub-tool-1",
        toolName: "Mock_STEC_query_financial_indicators",
        inputPreview: "{\"company_names\":[\"上海路桥\"]}",
      },
    });
    state = chatReducer(state, {
      type: "event",
      assistantId: "a1",
      event: {
        type: "subagent.progress",
        subagentRunId: "sub-1",
        description: "分析财务指标",
        background: false,
        kind: "completed",
        status: "completed",
      },
    });

    expect(state.items[1]?.subagents[0]).toEqual({
      id: "sub-1",
      name: "财务分析",
      description: "分析财务指标",
      background: false,
      status: "success",
      toolCallId: "sub-tool-1",
      toolName: "Mock_STEC_query_financial_indicators",
      inputPreview: "{\"company_names\":[\"上海路桥\"]}",
      outcome: "completed",
    });
  });
});
