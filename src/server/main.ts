import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { createWorkspace } from "../domain/workspace";
import type { Asset } from "../domain/model";
import { CanvasMcpAdapter } from "./mcp";
import { LocalWorkspaceStore } from "./storage";

const port = Number(process.env.PORT ?? 29980);
const store = new LocalWorkspaceStore();
const workspace = createWorkspace(await store.load());
const mcp = new CanvasMcpAdapter(workspace, store);

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const sendJson = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
  response.end(JSON.stringify(value));
};

const sendText = (response: ServerResponse, status: number, value: string, contentType = "text/plain; charset=utf-8") => {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(value);
};

const sendMcpResponse = (response: ServerResponse, value: unknown) => {
  if (value === undefined) {
    response.writeHead(202, { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
    return response.end();
  }
  return sendJson(response, 200, value);
};

const requestUrl = (request: IncomingMessage) => new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

const server = createServer(async (request, response) => {
  try {
    const url = requestUrl(request);
    if (request.method === "OPTIONS") { response.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }); return response.end(); }
    if (url.pathname === "/api/state" && request.method === "GET") return sendJson(response, 200, workspace.getState());
    if (url.pathname === "/api/dispatch" && request.method === "POST") {
      const body = await readJson(request);
      const next = workspace.dispatch(body.command as Parameters<typeof workspace.dispatch>[0]);
      await store.save(next);
      return sendJson(response, 200, next);
    }
    if (url.pathname === "/api/import" && request.method === "POST") {
      const body = await readJson(request);
      const dataUrl = String(body.dataUrl ?? "");
      const filename = String(body.filename ?? "asset.png");
      const saved = await store.saveDataUrl(dataUrl, filename);
      const asset: Asset = { id: crypto.randomUUID(), name: filename, mime: saved.mime, path: saved.relativePath, x: Number(body.x ?? 80), y: Number(body.y ?? 80), width: Number(body.width ?? 640), height: Number(body.height ?? 360), origin: "imported", createdAt: new Date().toISOString() };
      const next = workspace.dispatch({ type: "import-asset", asset });
      await store.save(next);
      return sendJson(response, 200, next);
    }
    if (url.pathname === "/api/undo" && request.method === "POST") { const next = workspace.undo(); await store.save(next); return sendJson(response, 200, next); }
    if (url.pathname === "/api/redo" && request.method === "POST") { const next = workspace.redo(); await store.save(next); return sendJson(response, 200, next); }
    if (url.pathname === "/mcp" && request.method === "GET") {
      response.writeHead(405, { Allow: "POST", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
      return response.end();
    }
    if (url.pathname === "/mcp" && request.method === "POST") return sendMcpResponse(response, await mcp.call(await readJson(request) as never));
    if (url.pathname.startsWith("/assets/") && request.method === "GET") {
      const relativePath = `assets/${url.pathname.slice("/assets/".length)}`;
      const content = await store.readAsset(relativePath);
      const ext = extname(relativePath).toLowerCase();
      const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
      response.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable" });
      return response.end(content);
    }
    if (url.pathname === "/health") return sendJson(response, 200, { ok: true, service: "codex-canvas" });
    return sendText(response, 404, "Codex Canvas server is running. Start Vite for the frontend.");
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Codex Canvas server: http://127.0.0.1:${port}`);
  console.log(`MCP endpoint: http://127.0.0.1:${port}/mcp`);
});
