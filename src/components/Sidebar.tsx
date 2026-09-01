import { BarChart3, FileText, ListChecks, MessageSquareText, Sparkles } from "lucide-react";
import type { WorkshopSession } from "../../shared/contracts";

const examples = [
  {
    label: "分析经营指标",
    prompt: "请分析上海路桥 2025 年的营业收入、净利润和市场中标情况，并总结主要变化。",
    icon: BarChart3,
  },
  {
    label: "对比下属公司",
    prompt: "请对比上海路桥和市政集团 2025 年的营业收入、净利润和中标金额。",
    icon: ListChecks,
  },
  {
    label: "生成经营简报",
    prompt: "请读取 Workspace 中的经营材料，结合指标查询结果生成一份管理层经营分析简报。",
    icon: FileText,
  },
];

interface SidebarProps {
  sessions: WorkshopSession[];
  activeSessionId: string | null;
  endUserId: string;
  connected: boolean;
  onSelectSession: (sessionId: string) => void;
  onExample: (prompt: string) => void;
}

function timeLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function Sidebar({
  sessions,
  activeSessionId,
  endUserId,
  connected,
  onSelectSession,
  onExample,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <section className="sessions-section">
        <h2 className="section-heading">会话</h2>
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              className={`session-row ${session.sessionId === activeSessionId ? "active" : ""}`}
              onClick={() => onSelectSession(session.sessionId)}
            >
              <MessageSquareText size={17} />
              <span className="session-title">{session.title || "未命名会话"}</span>
              <span className="session-time">{timeLabel(session.updatedAt)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="example-section">
        <h2 className="section-heading">示例任务</h2>
        <div className="example-list">
          {examples.map(({ label, prompt, icon: Icon }) => (
            <button key={label} className="example-row" onClick={() => onExample(prompt)}>
              <Icon size={18} />
              <span>{label}</span>
              <span className="example-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <div className="connection-card">
        <div className="connection-title">
          <span className={`status-dot ${connected ? "connected" : ""}`} />
          {connected ? "连接正常" : "连接异常"}
        </div>
        <div className="connection-user">
          <Sparkles size={14} />
          <span title={endUserId}>{endUserId || "等待配置"}</span>
        </div>
      </div>
    </aside>
  );
}
