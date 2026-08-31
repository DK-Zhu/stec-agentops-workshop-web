import { ArrowUp, Paperclip, Square } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface ChatComposerProps {
  draft: string;
  disabled: boolean;
  running: boolean;
  onDraftChange: (value: string) => void;
  onSend: (content: string) => void;
  onAbort: () => void;
  onPickFile: () => void;
}

export function ChatComposer({
  draft,
  disabled,
  running,
  onDraftChange,
  onSend,
  onAbort,
  onPickFile,
}: ChatComposerProps) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [draft]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || disabled || running) return;
    onSend(value);
  };

  return (
    <form className={`composer ${focused ? "focused" : ""}`} onSubmit={submit}>
      <button type="button" className="composer-icon" onClick={onPickFile} disabled={disabled} aria-label="上传文件">
        <Paperclip size={20} />
      </button>
      <textarea
        ref={textareaRef}
        value={draft}
        disabled={disabled}
        rows={1}
        placeholder="输入消息，体验 Agent 的完整运行链路"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {running ? (
        <button type="button" className="stop-button" onClick={onAbort} aria-label="中止运行">
          <Square size={15} fill="currentColor" />
        </button>
      ) : (
        <button type="submit" className="send-button" disabled={disabled || !draft.trim()} aria-label="发送消息">
          <ArrowUp size={20} />
        </button>
      )}
    </form>
  );
}
