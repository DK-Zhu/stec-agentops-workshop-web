import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { BootstrapPayload, WorkshopSession, WorkspaceFile } from "../shared/contracts";
import { ChatComposer } from "./components/ChatComposer";
import { ConversationView } from "./components/ConversationView";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { chatReducer, initialChatState } from "./features/chat/chat-state";
import { streamMessage, workshopApi } from "./lib/api";

const ACTIVE_SESSION_KEY = "stec-agentops-workshop.active-session.v1";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "发生未知错误";
}

export default function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(() => window.matchMedia("(min-width: 821px)").matches);
  const [rightOpen, setRightOpen] = useState(() => window.matchMedia("(min-width: 1121px)").matches);
  const [chat, dispatch] = useReducer(chatReducer, initialChatState);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [messages, workspaceFiles] = await Promise.all([
        workshopApi.messages(sessionId),
        workshopApi.files(sessionId),
      ]);
      dispatch({ type: "history", messages });
      setFiles(workspaceFiles);
      setActiveSessionId(sessionId);
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await workshopApi.bootstrap();
        let nextSessions = payload.sessions;
        if (nextSessions.length === 0) {
          nextSessions = [await workshopApi.createSession("AgentOps Workshop")];
        }
        setBootstrap(payload);
        setSessions(nextSessions);
        const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
        const initial = nextSessions.find((session) => session.sessionId === saved) ?? nextSessions[0];
        if (initial) await loadSession(initial.sessionId);
      } catch (bootError) {
        setError(errorMessage(bootError));
        setLoading(false);
      }
    })();
  }, [loadSession]);

  const createSession = async () => {
    if (chat.runStatus === "running") return;
    try {
      const session = await workshopApi.createSession(`培训会话 ${sessions.length + 1}`);
      setSessions((current) => [session, ...current]);
      dispatch({ type: "reset" });
      setFiles([]);
      await loadSession(session.sessionId);
    } catch (sessionError) {
      setError(errorMessage(sessionError));
    }
  };

  const send = async (content: string) => {
    if (!activeSessionId || chat.runStatus === "running") return;
    setDraft("");
    setError(null);
    const stamp = new Date().toISOString();
    const userId = `local-user-${crypto.randomUUID()}`;
    const assistantId = `local-assistant-${crypto.randomUUID()}`;
    dispatch({ type: "start", userId, assistantId, content, timestamp: stamp });
    try {
      for await (const event of streamMessage(activeSessionId, content)) {
        dispatch({ type: "event", assistantId, event });
      }
      setFiles(await workshopApi.files(activeSessionId));
      setSessions((current) => current.map((session) =>
        session.sessionId === activeSessionId ? { ...session, updatedAt: new Date().toISOString() } : session,
      ));
    } catch (streamError) {
      dispatch({ type: "failed", assistantId, message: errorMessage(streamError) });
    }
  };

  const abort = async () => {
    if (!activeSessionId) return;
    try {
      await workshopApi.abort(activeSessionId);
    } catch (abortError) {
      setError(errorMessage(abortError));
    }
  };

  const uploadFile = async (file: File) => {
    if (!activeSessionId) return;
    setUploading(true);
    setError(null);
    try {
      await workshopApi.upload(activeSessionId, file);
      setFiles(await workshopApi.files(activeSessionId));
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-root">
      <Header
        agentName={bootstrap?.agentName ?? ""}
        connected={bootstrap?.connected ?? false}
        mockMode={bootstrap?.mockMode ?? false}
        onNewSession={() => void createSession()}
        onToggleLeft={() => setLeftOpen((value) => !value)}
        onToggleRight={() => setRightOpen((value) => !value)}
      />
      <div className={`app-grid ${leftOpen ? "" : "left-closed"} ${rightOpen ? "" : "right-closed"}`}>
        {leftOpen ? (
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            endUserId={bootstrap?.endUserId ?? ""}
            connected={bootstrap?.connected ?? false}
            onSelectSession={(sessionId) => {
              if (chat.runStatus !== "running") void loadSession(sessionId);
            }}
            onExample={setDraft}
          />
        ) : null}
        <main className="chat-main">
          {error ? (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => setError(null)}>关闭</button>
            </div>
          ) : null}
          <ConversationView items={chat.items} loading={loading} />
          <div className="composer-wrap">
            <ChatComposer
              draft={draft}
              disabled={!activeSessionId || loading}
              running={chat.runStatus === "running"}
              onDraftChange={setDraft}
              onSend={(content) => void send(content)}
              onAbort={() => void abort()}
              onPickFile={() => filePickerRef.current?.click()}
            />
            <p className="composer-note">Agent 的输出可能存在错误，请结合业务资料进行核验</p>
          </div>
        </main>
        {rightOpen ? (
          <WorkspacePanel
            files={files}
            disabled={!activeSessionId}
            uploading={uploading}
            onUpload={(file) => void uploadFile(file)}
            downloadUrl={(name) => activeSessionId ? workshopApi.downloadUrl(activeSessionId, name) : "#"}
          />
        ) : null}
      </div>
      <input
        ref={filePickerRef}
        type="file"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
