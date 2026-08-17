import type { Asset, CanvasState, EntityId, Placement } from "../domain/model";
import type { Workspace } from "../domain/model";
import { generatedAssetDisplaySize } from "../domain/generated-asset";
import { LocalWorkspaceStore } from "./storage";

type JsonRpcRequest = { id?: number | string; method: string; params?: Record<string, unknown> };

const DEFAULT_PROTOCOL_VERSION = "2025-03-26";
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-03-26", "2025-11-25", "2024-11-05"]);

const json = (value: unknown) => JSON.stringify(value);

const success = (id: number | string | undefined, result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const failure = (id: number | string | undefined, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message } });

const tools = [
  { name: "canvas_list", description: "List the named local Canvases available in this workspace.", inputSchema: { type: "object", properties: {} } },
  { name: "canvas_create", description: "Create and activate a new local Canvas without changing existing Canvases.", inputSchema: { type: "object", properties: { name: { type: "string" } } } },
  { name: "canvas_switch", description: "Switch the active local Canvas by id.", inputSchema: { type: "object", properties: { canvas_id: { type: "string" } }, required: ["canvas_id"] } },
  { name: "canvas_rename", description: "Rename the active local Canvas.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "canvas_get_state", description: "Read the active Canvas and its local Assets.", inputSchema: { type: "object", properties: {} } },
  { name: "canvas_get_selection", description: "Read selected Asset metadata and image content blocks.", inputSchema: { type: "object", properties: {} } },
  { name: "canvas_select_assets", description: "Set the active Asset Selection.", inputSchema: { type: "object", properties: { asset_ids: { type: "array", items: { type: "string" } } }, required: ["asset_ids"] } },
  { name: "canvas_import_asset", description: "Import a local image into the Canvas.", inputSchema: { type: "object", properties: { path: { type: "string" }, data_url: { type: "string" }, filename: { type: "string" }, width: { type: "number" }, height: { type: "number" } }, required: ["filename"] } },
  { name: "canvas_receive_generated_asset", description: "Receive a Codex-generated image, preserve provenance, and place it near the selected references.", inputSchema: { type: "object", properties: { path: { type: "string" }, data_url: { type: "string" }, filename: { type: "string" }, instruction: { type: "string" }, reference_ids: { type: "array", items: { type: "string" } }, width: { type: "number" }, height: { type: "number" } }, required: ["filename", "instruction", "reference_ids"] } },
  { name: "canvas_group_selection", description: "Group the selected Assets.", inputSchema: { type: "object", properties: {} } },
  { name: "canvas_undo", description: "Undo the last Canvas change.", inputSchema: { type: "object", properties: {} } },
  { name: "canvas_redo", description: "Redo the last Canvas change.", inputSchema: { type: "object", properties: {} } },
];

const stateView = (state: CanvasState) => ({
  ...state,
  assets: state.assets.map((asset) => ({ ...asset, selected: state.selection.includes(asset.id) })),
});

function placementFor(state: CanvasState, width: number, height: number, referenceIds: EntityId[]): { x: number; y: number; placement?: Placement } {
  const references = state.assets.filter((asset) => referenceIds.includes(asset.id));
  if (references.length === 0) return { x: 80, y: 80 };
  const anchor = references[1] ?? references[0];
  const occupied = [...state.assets, ...state.boards];
  const candidates: Array<{ direction: Placement["direction"]; x: number; y: number }> = [
    { direction: "right", x: anchor.x + anchor.width + 32, y: anchor.y },
    { direction: "below", x: anchor.x, y: anchor.y + anchor.height + 32 },
    { direction: "above", x: anchor.x, y: Math.max(24, anchor.y - height - 32) },
    { direction: "left", x: Math.max(24, anchor.x - width - 32), y: anchor.y },
  ];
  const free = (candidate: { x: number; y: number }) => !occupied.some((item) => item.x < candidate.x + width && item.x + item.width > candidate.x && item.y < candidate.y + height && item.y + item.height > candidate.y);
  const found = candidates.find(free);
  if (found) return { x: found.x, y: found.y, placement: { anchorId: anchor.id, direction: found.direction } };
  return { x: anchor.x + anchor.width + 32, y: anchor.y + anchor.height + 32, placement: { anchorId: anchor.id, direction: "nearest" } };
}

export class CanvasMcpAdapter {
  constructor(private readonly workspace: Workspace, private readonly store: LocalWorkspaceStore) {}

  async call(request: JsonRpcRequest) {
    if (request.method === "initialize") {
      const requested = String(request.params?.protocolVersion ?? "");
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : DEFAULT_PROTOCOL_VERSION;
      return success(request.id, { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "codex-canvas", version: "0.1.0" }, instructions: "Use canvas_get_selection to read the selected local image Assets before generating or transforming an image." });
    }
    if (request.method === "notifications/initialized") return undefined;
    if (request.method === "tools/list") return success(request.id, { tools });
    if (request.method !== "tools/call") return failure(request.id, `Unsupported MCP method: ${request.method}`);

    const params = request.params ?? {};
    const name = String(params.name ?? "");
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    const state = this.workspace.getState();

    if (name === "canvas_list") return success(request.id, { content: [{ type: "text", text: json({ activeCanvasId: state.canvas.id, canvases: this.workspace.getCanvases() }) }], structuredContent: { activeCanvasId: state.canvas.id, canvases: this.workspace.getCanvases() } });
    if (name === "canvas_get_state") return success(request.id, { content: [{ type: "text", text: json(stateView(state)) }], structuredContent: stateView(state) });
    if (name === "canvas_get_selection") {
      const selected = state.assets.filter((asset) => state.selection.includes(asset.id));
      const content: Array<Record<string, unknown>> = [{ type: "text", text: json({ selection: selected.map((asset) => ({ ...asset, selected: true })) }) }];
      for (const asset of selected) content.push({ type: "image", data: (await this.store.readAsset(asset.path)).toString("base64"), mimeType: asset.mime });
      return success(request.id, { content, structuredContent: { canvas: state.canvas, selection: selected } });
    }
    if (name === "canvas_select_assets") {
      const next = this.workspace.dispatch({ type: "select", ids: (args.asset_ids as string[]) ?? [] });
      await this.store.save(this.workspace.getDocument());
      return success(request.id, { content: [{ type: "text", text: `Selected ${next.selection.length} Asset(s).` }], structuredContent: stateView(next) });
    }
    if (name === "canvas_group_selection") return this.dispatch(request.id, { type: "group-selection" });
    if (name === "canvas_undo") { const next = this.workspace.undo(); await this.store.save(this.workspace.getDocument()); return success(request.id, { content: [{ type: "text", text: "Canvas undo completed." }], structuredContent: stateView(next) }); }
    if (name === "canvas_redo") { const next = this.workspace.redo(); await this.store.save(this.workspace.getDocument()); return success(request.id, { content: [{ type: "text", text: "Canvas redo completed." }], structuredContent: stateView(next) }); }
    if (name === "canvas_create") {
      const next = this.workspace.createCanvas(String(args.name ?? ""));
      await this.store.save(this.workspace.getDocument());
      return success(request.id, { content: [{ type: "text", text: `Canvas ${next.canvas.name} is active.` }], structuredContent: stateView(next) });
    }
    if (name === "canvas_switch") {
      const next = this.workspace.switchCanvas(String(args.canvas_id ?? ""));
      await this.store.save(this.workspace.getDocument());
      return success(request.id, { content: [{ type: "text", text: `Canvas ${next.canvas.name} is active.` }], structuredContent: stateView(next) });
    }
    if (name === "canvas_rename") {
      const next = this.workspace.renameCanvas(String(args.name ?? ""));
      await this.store.save(this.workspace.getDocument());
      return success(request.id, { content: [{ type: "text", text: `Canvas renamed to ${next.canvas.name}.` }], structuredContent: stateView(next) });
    }
    if (name === "canvas_import_asset" || name === "canvas_receive_generated_asset") {
      const filename = String(args.filename ?? "asset.png");
      const saved = typeof args.data_url === "string"
        ? await this.store.saveDataUrl(args.data_url, filename)
        : await this.store.copyLocalFile(String(args.path), filename);
      const references = name === "canvas_receive_generated_asset" ? (args.reference_ids as string[]) ?? [] : [];
      const requestedWidth = Number(args.width ?? 640);
      const requestedHeight = Number(args.height ?? 360);
      const displaySize = name === "canvas_receive_generated_asset"
        ? generatedAssetDisplaySize(state, references, requestedWidth, requestedHeight)
        : { width: requestedWidth, height: requestedHeight };
      const { width, height } = displaySize;
      const placement = name === "canvas_receive_generated_asset" ? placementFor(state, width, height, references) : { x: 80, y: 80 };
      const asset: Asset = { id: crypto.randomUUID(), name: filename, mime: saved.mime, path: saved.relativePath, x: placement.x, y: placement.y, width, height, origin: name === "canvas_receive_generated_asset" ? "codex" : "imported", createdAt: new Date().toISOString(), placement: placement.placement };
      if (name === "canvas_receive_generated_asset") asset.provenance = { references, instruction: String(args.instruction ?? ""), createdAt: asset.createdAt, canvasId: state.canvas.id };
      const next = this.workspace.dispatch({ type: "import-asset", asset });
      await this.store.save(this.workspace.getDocument());
      const message = name === "canvas_receive_generated_asset" ? `Received Generated Asset ${asset.id} and placed it ${asset.placement?.direction ?? "near"} the selected references.` : `Imported Asset ${asset.id}.`;
      return success(request.id, { content: [{ type: "text", text: message }], structuredContent: stateView(next) });
    }
    return failure(request.id, `Unknown Canvas tool: ${name}`);
  }

  private async dispatch(id: number | string | undefined, command: Parameters<Workspace["dispatch"]>[0]) {
    const next = this.workspace.dispatch(command);
    await this.store.save(this.workspace.getDocument());
    return success(id, { content: [{ type: "text", text: "Canvas updated." }], structuredContent: stateView(next) });
  }
}
