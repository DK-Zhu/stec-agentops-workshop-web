import { Download, File, FileSpreadsheet, FileText, Folder, UploadCloud } from "lucide-react";
import { useRef } from "react";
import type { WorkspaceFile } from "../../shared/contracts";

interface WorkspacePanelProps {
  files: WorkspaceFile[];
  disabled: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  downloadUrl: (name: string) => string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ file }: { file: WorkspaceFile }) {
  if (file.type === "directory") return <Folder className="file-icon folder" size={22} />;
  const suffix = file.name.split(".").pop()?.toLowerCase();
  if (suffix === "xlsx" || suffix === "csv") return <FileSpreadsheet className="file-icon sheet" size={22} />;
  if (suffix === "docx" || suffix === "pdf") return <FileText className="file-icon doc" size={22} />;
  return <File className="file-icon" size={22} />;
}

export function WorkspacePanel({
  files,
  disabled,
  uploading,
  onUpload,
  downloadUrl,
}: WorkspacePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <aside className="workspace-panel">
      <div className="workspace-head">
        <div>
          <h2>Workspace</h2>
          <p>当前 Session 的资料与产物</p>
        </div>
        <span className="file-count">{files.length}</span>
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.currentTarget.value = "";
        }}
      />
      <button
        className="upload-button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloud size={18} />
        {uploading ? "正在上传…" : "上传文件"}
      </button>

      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-files">
            <UploadCloud size={28} />
            <p>还没有文件</p>
            <span>上传资料后，Agent 可以在 Workspace 中读取</span>
          </div>
        ) : (
          files.map((file) => (
            <div className={`file-row ${file.type === "directory" ? "directory" : ""}`} key={file.name}>
              <FileIcon file={file} />
              <div className="file-main">
                <div className="file-name" title={file.name}>{file.name}</div>
                <div className="file-meta">
                  {file.type === "directory" ? "文件夹" : formatBytes(file.size)} · {new Date(file.modifiedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {file.type === "directory" ? (
                <span className="directory-badge">目录</span>
              ) : (
                <a className="download-button" href={downloadUrl(file.name)} aria-label={`下载 ${file.name}`}>
                  <Download size={17} />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
