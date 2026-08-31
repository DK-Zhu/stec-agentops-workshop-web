import type {
  ApiErrorPayload,
  BootstrapPayload,
  WorkshopMessage,
  WorkshopSession,
  WorkshopStreamEvent,
  WorkspaceFile,
} from "../../shared/contracts";
import { NdjsonDecoder } from "./ndjson";

export class WorkshopApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WorkshopApiError";
  }
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new WorkshopApiError(
      payload?.error.message ?? `Request failed with HTTP ${response.status}`,
      payload?.error.code ?? "request_failed",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export const workshopApi = {
  bootstrap: (): Promise<BootstrapPayload> => json("/api/bootstrap"),

  createSession: (title?: string): Promise<WorkshopSession> =>
    json("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),

  messages: (sessionId: string): Promise<WorkshopMessage[]> =>
    json(`/api/sessions/${encodeURIComponent(sessionId)}/messages`),

  files: (sessionId: string): Promise<WorkspaceFile[]> =>
    json(`/api/sessions/${encodeURIComponent(sessionId)}/workspace/files`),

  upload: async (sessionId: string, file: File): Promise<WorkspaceFile> => {
    const form = new FormData();
    form.append("file", file);
    return json(`/api/sessions/${encodeURIComponent(sessionId)}/workspace/files`, {
      method: "POST",
      body: form,
    });
  },

  downloadUrl: (sessionId: string, name: string): string =>
    `/api/sessions/${encodeURIComponent(sessionId)}/workspace/files/${encodeURIComponent(name)}`,

  abort: (sessionId: string): Promise<{ status: "idle" }> =>
    json(`/api/sessions/${encodeURIComponent(sessionId)}/abort`, { method: "POST" }),
};

export async function* streamMessage(
  sessionId: string,
  content: string,
): AsyncGenerator<WorkshopStreamEvent> {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new WorkshopApiError(
      payload?.error.message ?? `Message request failed with HTTP ${response.status}`,
      payload?.error.code ?? "message_failed",
      response.status,
    );
  }
  if (!response.body) throw new Error("The browser did not expose a streaming response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const ndjson = new NdjsonDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      for (const event of ndjson.push(decoder.decode(value, { stream: !done }))) yield event;
      if (done) break;
    }
    for (const event of ndjson.finish()) yield event;
  } finally {
    reader.releaseLock();
  }
}
