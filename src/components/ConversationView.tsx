import { Bot, BrainCircuit, CheckCircle2, LoaderCircle, UserRound } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatItem } from "../features/chat/chat-state";
import { SubagentActivityCard } from "./SubagentActivityCard";
import { ToolActivityCard } from "./ToolActivityCard";

function RunningStatus({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000) || 0);
  const duration = elapsed < 60 ? `${elapsed} 秒` : `${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒`;
  return (
    <div className="run-pending">
      <LoaderCircle className="spin" size={16} aria-hidden="true" />
      <span role="status">仍在运行，等待后续结果</span>
      <span className="run-elapsed" aria-live="off">本轮已等待 {duration}</span>
    </div>
  );
}

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
                  <BrainCircuit size={17} />
                  <span>查看思考过程</span>
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
        ) : null}

        {item.streaming ? <RunningStatus startedAt={item.timestamp} /> : null}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const followBottomRef = useRef(true);
  useLayoutEffect(() => {
    if (loading || items.length === 0) followBottomRef.current = true;
    const container = scrollRef.current;
    if (container && followBottomRef.current) {
      // Follow streamed updates only while the user is reading at the bottom.
      // Avoid smooth animations that compete with manual scrolling.
      container.scrollTop = container.scrollHeight;
    }
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
    <div
      className="conversation-scroll"
      ref={scrollRef}
      onScroll={(event) => {
        const container = event.currentTarget;
        followBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight <= 32;
      }}
    >
      <div className="conversation-content">
        {items.map((item) => item.role === "user" ? <UserMessage key={item.id} item={item} /> : <AssistantMessage key={item.id} item={item} />)}
      </div>
    </div>
  );
}
