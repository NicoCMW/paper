import type { CanvasState, CanvasSummary, LibraryAsset, WorkspaceCommand } from "../domain/model";

const json = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const api = {
  async state(): Promise<CanvasState> {
    return json(await fetch("/api/state"));
  },

  async canvases(): Promise<CanvasSummary[]> {
    return json(await fetch("/api/canvases"));
  },

  async library(): Promise<{ assets: LibraryAsset[] }> {
    return json(await fetch("/api/library"));
  },

  async saveLibraryAsset(assetId: string, name?: string): Promise<{ assets: LibraryAsset[]; saved: LibraryAsset }> {
    return json(await fetch("/api/library/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, name }),
    }));
  },

  async insertLibraryAsset(libraryAssetId: string, placement?: { x?: number; y?: number }): Promise<{ state: CanvasState; assets: LibraryAsset[] }> {
    return json(await fetch("/api/library/insert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryAssetId, ...placement }),
    }));
  },

  async createCanvas(name: string): Promise<{ state: CanvasState; canvases: CanvasSummary[] }> {
    return json(await fetch("/api/canvas/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }));
  },

  async switchCanvas(id: string): Promise<{ state: CanvasState; canvases: CanvasSummary[] }> {
    return json(await fetch("/api/canvas/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }));
  },

  async renameCanvas(name: string): Promise<{ state: CanvasState; canvases: CanvasSummary[] }> {
    return json(await fetch("/api/canvas/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }));
  },

  async dispatch(command: WorkspaceCommand): Promise<CanvasState> {
    return json(await fetch("/api/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    }));
  },

  async importImage(dataUrl: string, filename: string, placement?: { x: number; y: number; width?: number; height?: number }): Promise<CanvasState> {
    return json(await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, filename, ...placement }),
    }));
  },

  async undo(): Promise<CanvasState> {
    return json(await fetch("/api/undo", { method: "POST" }));
  },

  async redo(): Promise<CanvasState> {
    return json(await fetch("/api/redo", { method: "POST" }));
  },
};

export const assetUrl = (path: string): string => `/assets/${path.replace(/^assets\//, "")}`;
