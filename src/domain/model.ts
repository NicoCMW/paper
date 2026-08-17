export type EntityId = string;

export type Point = { x: number; y: number };

export type Rect = Point & { width: number; height: number };

export type AssetOrigin = "imported" | "codex";

export type AssetProvenance = {
  references: EntityId[];
  instruction: string;
  createdAt: string;
  canvasId: EntityId;
};

export type Placement = {
  anchorId: EntityId;
  direction: "right" | "below" | "above" | "left" | "nearest";
};

export type Asset = Rect & {
  id: EntityId;
  name: string;
  mime: string;
  path: string;
  origin: AssetOrigin;
  createdAt: string;
  parentBoardId?: EntityId;
  provenance?: AssetProvenance;
  placement?: Placement;
};

export type Note = Rect & {
  id: EntityId;
  text: string;
  fontSize: number;
  createdAt: string;
};

export type LibraryAsset = {
  id: EntityId;
  name: string;
  mime: string;
  path: string;
  width: number;
  height: number;
  createdAt: string;
  sourceAssetId?: EntityId;
};

export type Board = Rect & {
  id: EntityId;
  title: string;
  memberAssetIds: EntityId[];
  locked: boolean;
};

export type Canvas = {
  id: EntityId;
  name: string;
};

export type CanvasState = {
  canvas: Canvas;
  assets: Asset[];
  boards: Board[];
  notes: Note[];
  selection: EntityId[];
  groups: Record<EntityId, EntityId[]>;
};

export type CanvasSummary = Canvas & {
  assetCount: number;
  boardCount: number;
};

export type WorkspaceDocument = {
  activeCanvasId: EntityId;
  canvases: CanvasState[];
  library: LibraryAsset[];
};

export type ImportAssetCommand = {
  type: "import-asset";
  asset: Asset;
};

export type WorkspaceCommand =
  | ImportAssetCommand
  | { type: "create-note"; note: Note }
  | { type: "update-note-text"; id: EntityId; text: string }
  | { type: "select"; ids: EntityId[]; additive?: boolean }
  | { type: "select-rect"; rect: Rect; additive?: boolean }
  | { type: "move-asset"; id: EntityId; dx: number; dy: number }
  | { type: "move-board"; id: EntityId; dx: number; dy: number }
  | { type: "move-selection"; dx: number; dy: number; ids?: EntityId[] }
  | { type: "resize-selection"; scale: number }
  | { type: "resize-board"; id: EntityId; dw: number; dh: number; anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right" }
  | { type: "create-board"; rect: Rect; title?: string }
  | { type: "update-board-title"; id: EntityId; title: string }
  | { type: "toggle-board-lock"; id: EntityId }
  | { type: "create-board-from-selection"; title?: string }
  | { type: "group-selection" }
  | { type: "duplicate-selection" }
  | { type: "delete-selection" };

export type Workspace = {
  getState(): CanvasState;
  getDocument(): WorkspaceDocument;
  getCanvases(): CanvasSummary[];
  getLibrary(): LibraryAsset[];
  addLibraryAsset(asset: LibraryAsset): LibraryAsset[];
  dispatch(command: WorkspaceCommand): CanvasState;
  createCanvas(name: string): CanvasState;
  switchCanvas(id: EntityId): CanvasState;
  renameCanvas(name: string): CanvasState;
  undo(): CanvasState;
  redo(): CanvasState;
};

export const DEFAULT_CANVAS: Canvas = { id: "canvas-main", name: "Canvas" };

export function createInitialState(canvas: Canvas = DEFAULT_CANVAS): CanvasState {
  return { canvas, assets: [], boards: [], notes: [], selection: [], groups: {} };
}
