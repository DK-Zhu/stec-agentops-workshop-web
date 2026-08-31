import { CirclePlus, PanelLeftClose, PanelRightClose } from "lucide-react";

interface HeaderProps {
  agentName: string;
  connected: boolean;
  mockMode: boolean;
  onNewSession: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function Header({
  agentName,
  connected,
  mockMode,
  onNewSession,
  onToggleLeft,
  onToggleRight,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">STEC</span>
        <span className="brand-divider" />
        <span className="brand-title">AgentOps Workshop</span>
      </div>
      <div className="topbar-actions">
        <button className="icon-button panel-toggle" onClick={onToggleLeft} aria-label="切换会话侧栏">
          <PanelLeftClose size={19} />
        </button>
        <div className="agent-indicator">
          <span className={`status-dot ${connected ? "connected" : ""}`} />
          <span>{agentName || "培训智能体"}</span>
          {mockMode ? <span className="mode-note">演示模式</span> : null}
        </div>
        <button className="icon-button panel-toggle" onClick={onToggleRight} aria-label="切换工作区侧栏">
          <PanelRightClose size={19} />
        </button>
        <button className="primary-outline" onClick={onNewSession}>
          <CirclePlus size={18} />
          新建会话
        </button>
      </div>
    </header>
  );
}
