import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import express from "express";
import multer from "multer";
import { ApiError } from "@aip/agent-sdk";
import { MAX_WORKSPACE_FILE_SIZE_BYTES, MAX_WORKSPACE_FILE_SIZE_MIB } from "../shared/contracts.js";
import type { ApiErrorPayload, WorkshopStreamEvent } from "../shared/contracts.js";
import { loadConfig } from "./config.js";
import { createWorkshopService } from "./service.js";

const config = loadConfig();
const service = createWorkshopService(config);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORKSPACE_FILE_SIZE_BYTES, files: 1 },
});

function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing route parameter: ${name}`);
  }
  return value;
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/bootstrap", async (_req, res, next) => {
  try {
    res.json(await service.bootstrap());
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions", async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : undefined;
    res.status(201).json(await service.createSession(title || undefined));
  } catch (error) {
    next(error);
  }
});

app.get("/api/sessions/:sessionId/messages", async (req, res, next) => {
  try {
    res.json(await service.listMessages(req.params.sessionId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:sessionId/messages/stream", async (req, res, next) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) {
    res.status(400).json({ error: { code: "message_required", message: "Message content is required" } });
    return;
  }

  let stream: ReturnType<typeof service.streamMessage> | undefined;
  try {
    stream = service.streamMessage(req.params.sessionId, content);
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.flushHeaders();

    for await (const event of stream) {
      if (res.destroyed) break;
      res.write(`${JSON.stringify(event satisfies WorkshopStreamEvent)}\n`);
    }
    if (!res.writableEnded) res.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
      return;
    }
    const message = error instanceof Error ? error.message : "Message stream failed";
    res.write(`${JSON.stringify({ type: "error", code: "stream_failed", message })}\n`);
    res.end();
  } finally {
    await stream?.close?.();
  }
});

app.post("/api/sessions/:sessionId/abort", async (req, res, next) => {
  try {
    await service.abort(req.params.sessionId);
    res.json({ status: "idle" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/sessions/:sessionId/workspace/files", async (req, res, next) => {
  try {
    res.json(await service.listFiles(req.params.sessionId));
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/sessions/:sessionId/workspace/files",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: { code: "file_required", message: "A file is required" } });
        return;
      }
      const file = await service.uploadFile(routeParam(req.params.sessionId, "sessionId"), {
        name: req.file.originalname,
        data: req.file.buffer,
        contentType: req.file.mimetype,
      });
      res.status(201).json(file);
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/sessions/:sessionId/workspace/files/:name", async (req, res, next) => {
  try {
    const file = await service.downloadFile(req.params.sessionId, req.params.name);
    res.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
    res.setHeader("Content-Length", String(file.size));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(req.params.name)}`,
    );
    await pipeline(file.stream, res);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isApiError = error instanceof ApiError;
  const isMulterError = error instanceof multer.MulterError;
  const status = isApiError ? error.status : isMulterError ? 413 : 500;
  const isFileTooLarge = isMulterError && error.code === "LIMIT_FILE_SIZE";
  const payload: ApiErrorPayload = {
    error: {
      code: isApiError ? error.code : isMulterError ? error.code : "internal_error",
      message: isFileTooLarge
        ? `单个文件不能超过 ${MAX_WORKSPACE_FILE_SIZE_MIB} MiB`
        : error instanceof Error ? error.message : "Unexpected server error",
    },
  };
  res.status(status).json(payload);
});

const distDir = resolve(process.cwd(), "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) {
      next();
      return;
    }
    createReadStream(resolve(distDir, "index.html")).pipe(res);
  });
}

app.listen(config.port, "127.0.0.1", () => {
  const mode = config.mockMode ? "mock" : "AgentOps";
  console.log(`Workshop server ready on http://127.0.0.1:${config.port} (${mode} mode)`);
});
