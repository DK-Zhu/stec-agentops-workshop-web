import { Bot, BrainCircuit, CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatItem } from "../features/chat/chat-state";
import { SubagentActivityCard } from "./SubagentActivityCard";
import { ToolActivityCard } from "./ToolActivityCard";

function AssistantMessage({ item }: { item: ChatItem }) {
  const hasWork = Boolean(item.reasoning) || item.subagents.length > 0 || item.tools.length > 0;
  return (
    <article className="assistant-message">
      <div className="avatar assistant-avatar"><Bot size={19} /></div>
      <div className="assistant-body">
        {hasWork ? (
          <div className="run-trace">
            {item.reasoning ? (
              <details className="reasoning" open={item.streaming}>
                <summary>
                  {item.streaming ? <LoaderCircle className="spin" size={17} /> : <BrainCircuit size={17} />}
                  <span>{item.streaming ? "Agent 正在思考" : "查看思考过程"}</span>
                </summary>
                <p>{item.reasoning}</p>
              </details>
            ) : null}
            {item.subagents.map((subagent) => (
              <SubagentActivityCard key={subagent.id} subagent={subagent} />
            ))}
            {item.tools.map((tool) => <ToolActivityCard key={tool.id} tool={tool} />)}
          </div>
        ) : null}

        {item.content ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
          </div>
        ) : item.streaming ? (
          <div className="answer-waiting"><span /><span /><span /></div>
        ) : null}

        {!item.streaming && item.metrics ? (
          <div className="run-complete">
            <CheckCircle2 size={16} />
            <span>任务已完成</span>
            <span className="run-metrics">
              {item.metrics.iterations} 轮
              {item.metrics.totalTokens ? ` · ${item.metrics.totalTokens[0] + item.metrics.totalTokens[1]} tokens` : ""}
              {item.metrics.ttftMs ? ` · TTFT ${item.metrics.ttftMs}ms` : ""}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function UserMessage({ item }: { item: ChatItem }) {
  return (
    <article className="user-message">
      <div className="user-bubble">{item.content}</div>
      <div className="avatar user-avatar"><UserRound size={18} /></div>
    </article>
  );
}

export function ConversationView({ items, loading }: { items: ChatItem[]; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth", block: "end" });
  }, [items, loading]);

  if (loading) {
    return <div className="conversation-state"><LoaderCircle className="spin" size={22} />正在载入会话…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="conversation-empty">
        <div className="empty-symbol"><Bot size={26} /></div>
        <h1>开始体验 Agent 的完整运行链路</h1>
        <p>选择左侧示例任务，或上传一份资料后直接提问。</p>
      </div>
    );
  }

  return (
    <div className="conversation-scroll">
      <div className="conversation-content">
        {items.map((item) => item.role === "user" ? <UserMessage key={item.id} item={item} /> : <AssistantMessage key={item.id} item={item} />)}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
