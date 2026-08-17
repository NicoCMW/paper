import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Asset, Board, CanvasState, CanvasSummary, EntityId, LibraryAsset, Point, Rect, WorkspaceCommand } from "../domain/model";
import { api, assetUrl } from "./api";
import { AssetLibraryPanel } from "./AssetLibraryPanel";
import { PreviewPanel } from "./PreviewPanel";

type Tool = "select" | "pan" | "board" | "import";
type PreviewMode = "youtube" | "carousel";
type PreviewDevice = "desktop" | "mobile";
type Viewport = { x: number; y: number; zoom: number };
type ResizeAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type Interaction =
  | { kind: "move"; pointerId: number; start: Point; ids: EntityId[]; dx: number; dy: number }
  | { kind: "marquee"; pointerId: number; start: Point; current: Point }
  | { kind: "board"; pointerId: number; start: Point; current: Point }
  | { kind: "pan"; pointerId: number; start: Point; origin: Point }
  | { kind: "resize-assets"; pointerId: number; anchor: ResizeAnchor; start: Point; scale: number }
  | { kind: "resize-board"; pointerId: number; boardId: EntityId; anchor: ResizeAnchor; start: Point; dw: number; dh: number };

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 4000;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalizeRect = (start: Point, end: Point): Rect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

const boundsOf = (items: Array<Pick<Rect, "x" | "y" | "width" | "height">>): Rect | null => {
  if (items.length === 0) return null;
  const x = Math.min(...items.map((item) => item.x));
  const y = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const bottom = Math.max(...items.map((item) => item.y + item.height));
  return { x, y, width: right - x, height: bottom - y };
};

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
  reader.readAsDataURL(file);
});

const imageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, 640 / image.naturalWidth, 420 / image.naturalHeight);
    resolve({ width: Math.max(80, Math.round(image.naturalWidth * scale)), height: Math.max(60, Math.round(image.naturalHeight * scale)) });
  };
  image.onerror = () => resolve({ width: 640, height: 360 });
  image.src = dataUrl;
});

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "select") return <svg {...common}><path d="M5 3.7 19 14l-6.1.5 3.4 5.5-2.2 1.3-3.4-5.6-4.2 4.3L5 3.7Z" /></svg>;
  if (name === "pan") return <svg {...common}><path d="M7.2 11.1V6.6a1.5 1.5 0 0 1 3 0v3.6-5.7a1.5 1.5 0 0 1 3 0v5.1-4.1a1.5 1.5 0 0 1 3 0v5.3-2.2a1.5 1.5 0 0 1 3 0v5.1c0 4.1-2.4 6.1-6.2 6.1h-1.8c-2.5 0-3.4-1.2-4.6-2.8L4.5 14a1.7 1.7 0 0 1 2.7-2.1Z" /></svg>;
  if (name === "board") return <svg {...common}><rect x="3.5" y="4" width="17" height="16" rx="1.5" /><path d="M7 8h10M7 12h6M7 16h8" /></svg>;
  if (name === "import") return <svg {...common}><path d="M12 3v11m0 0 4-4m-4 4-4-4" /><path d="M4 15.5v3A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-3" /></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "minus") return <svg {...common}><path d="M5 12h14" /></svg>;
  if (name === "group") return <svg {...common}><rect x="3.5" y="5" width="9" height="9" rx="1.2" /><rect x="11.5" y="10" width="9" height="9" rx="1.2" /></svg>;
  if (name === "duplicate") return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="1.5" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></svg>;
  if (name === "trash") return <svg {...common}><path d="M4.5 7h15M9 4h6l1 3H8l1-3ZM7 7l.7 13h8.6L17 7M10 10.5v6M14 10.5v6" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
  if (name === "unlock") return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 7-2.7" /></svg>;
  if (name === "chevron") return <svg {...common}><path d="m7 9 5 5 5-5" /></svg>;
  if (name === "undo") return <svg {...common}><path d="M9 8 4 12l5 4" /><path d="M5 12h8a6 6 0 0 1 6 6" /></svg>;
  if (name === "folder") return <svg {...common}><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3.5 9h17" /></svg>;
  if (name === "preview") return <svg {...common}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></svg>;
  if (name === "close") return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.8" cy="10.8" r="5.8" /><path d="m15.2 15.2 4.3 4.3" /></svg>;
  if (name === "arrow-left") return <svg {...common}><path d="m14 5-7 7 7 7" /></svg>;
  if (name === "arrow-right") return <svg {...common}><path d="m10 5 7 7-7 7" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

function ToolbarButton({ label, icon, active, onClick, disabled }: { label: string; icon: string; active?: boolean; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className={`tool-button${active ? " is-active" : ""}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}><Icon name={icon} /></button>;
}

export function App() {
  const [state, setState] = useState<CanvasState | null>(null);
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [view, setView] = useState<Viewport>({ x: 130, y: 88, zoom: 1 });
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [canvasMenuOpen, setCanvasMenuOpen] = useState(false);
  const [editingCanvas, setEditingCanvas] = useState(false);
  const [canvasDraft, setCanvasDraft] = useState("");
  const [editingBoardId, setEditingBoardId] = useState<EntityId | null>(null);
  const [boardDraft, setBoardDraft] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("youtube");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeDark, setYoutubeDark] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.state(), api.canvases(), api.library()])
      .then(([nextState, nextCanvases, nextLibrary]) => { setState(nextState); setCanvases(nextCanvases); setLibrary(nextLibrary.assets); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load Canvas"));
  }, []);

  const run = useCallback((command: WorkspaceCommand): Promise<CanvasState | undefined> => {
    setError(null);
    return api.dispatch(command)
      .then(async (next) => { setState(next); setCanvases(await api.canvases()); return next; })
      .catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : "Canvas action failed"); return undefined; });
  }, []);

  const saveToLibrary = useCallback(async (asset: Asset) => {
    setError(null);
    try {
      const next = await api.saveLibraryAsset(asset.id);
      setLibrary(next.assets);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save Asset to the library");
    }
  }, []);

  const insertFromLibrary = useCallback(async (asset: LibraryAsset) => {
    setError(null);
    try {
      const next = await api.insertLibraryAsset(asset.id);
      setState(next.state);
      setLibrary(next.assets);
      setCanvases(await api.canvases());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not insert library Asset");
    }
  }, []);

  const runImport = useCallback(async (files: File[], origin?: Point) => {
    setError(null);
    let next = state;
    for (const [index, file] of files.entries()) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const dimensions = await imageDimensions(dataUrl);
        next = await api.importImage(dataUrl, file.name, {
          x: (origin?.x ?? 160) + index * 40,
          y: (origin?.y ?? 120) + index * 40,
          ...dimensions,
        });
        setState(next);
        setCanvases(await api.canvases());
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not import image");
      }
    }
  }, [state]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.code === "Space" && !editing) { event.preventDefault(); setSpaceHeld(true); }
      if (editing || !state) return;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); run({ type: "delete-selection" }); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); api.undo().then(setState); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); api.redo().then(setState); }
      if (event.key === "Escape") { setInteraction(null); setTool("select"); }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === "Space") setSpaceHeld(false); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [run, state]);

  const toWorld = useCallback((event: { clientX: number; clientY: number }): Point => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return { x: 0, y: 0 };
    return { x: (event.clientX - viewport.left - view.x) / view.zoom, y: (event.clientY - viewport.top - view.y) / view.zoom };
  }, [view]);

  const zoomBy = useCallback((delta: number, anchor?: Point) => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    const focus = anchor ?? (viewport ? { x: viewport.width / 2, y: viewport.height / 2 } : { x: 0, y: 0 });
    setView((current) => {
      const zoom = clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM);
      const worldPoint = { x: (focus.x - current.x) / current.zoom, y: (focus.y - current.y) / current.zoom };
      return { zoom, x: focus.x - worldPoint.x * zoom, y: focus.y - worldPoint.y * zoom };
    });
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    // Use a native non-passive listener so macOS pinch cannot fall through to
    // browser page zoom. A plain two-finger scroll pans the Canvas instead.
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const focus = { x: event.clientX - viewport.left, y: event.clientY - viewport.top };
      setView((current) => {
        const zoom = clamp(current.zoom * Math.exp(-event.deltaY * 0.01), MIN_ZOOM, MAX_ZOOM);
        const worldPoint = { x: (focus.x - current.x) / current.zoom, y: (focus.y - current.y) / current.zoom };
        return { zoom, x: focus.x - worldPoint.x * zoom, y: focus.y - worldPoint.y * zoom };
      });
      return;
    }
    setView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [handleWheel, Boolean(state)]);

  const selectedAssets = useMemo(() => state?.assets.filter((asset) => state.selection.includes(asset.id)) ?? [], [state]);
  const selectedBoards = useMemo(() => state?.boards.filter((board) => state.selection.includes(board.id)) ?? [], [state]);
  const openPreview = useCallback(() => {
    setPreviewOpen(true);
    setCarouselIndex(0);
    if (selectedAssets[0]) setYoutubeTitle(selectedAssets[0].name.replace(/\.[^.]+$/, ""));
  }, [selectedAssets]);
  const selectionBounds = useMemo(() => boundsOf([...selectedAssets, ...selectedBoards]), [selectedAssets, selectedBoards]);
  const activeMoveIds = useMemo(() => {
    if (!state || !interaction || interaction.kind !== "move") return new Set<EntityId>();
    const ids = new Set(interaction.ids);
    state.boards.filter((board) => ids.has(board.id)).flatMap((board) => board.memberAssetIds).forEach((id) => ids.add(id));
    return ids;
  }, [interaction, state]);

  const previewRect = useCallback((item: Asset | Board): Rect => {
    let rect: Rect = { x: item.x, y: item.y, width: item.width, height: item.height };
    if (interaction?.kind === "move" && activeMoveIds.has(item.id)) rect = { ...rect, x: rect.x + interaction.dx, y: rect.y + interaction.dy };
    if (interaction?.kind === "resize-assets" && selectedAssets.some((asset) => asset.id === item.id)) {
      const bounds = boundsOf(selectedAssets);
      if (bounds) {
        const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        rect = { width: rect.width * interaction.scale, height: rect.height * interaction.scale, x: center.x + (rect.x + rect.width / 2 - center.x) * interaction.scale - rect.width * interaction.scale / 2, y: center.y + (rect.y + rect.height / 2 - center.y) * interaction.scale - rect.height * interaction.scale / 2 };
      }
    }
    if (interaction?.kind === "resize-board" && item.id === interaction.boardId) {
      const board = item as Board;
      const dw = interaction.dw;
      const dh = interaction.dh;
      if (interaction.anchor.includes("right")) rect.width = Math.max(160, board.width + dw);
      if (interaction.anchor.includes("left")) { const width = Math.max(160, board.width - dw); rect.x = board.x + board.width - width; rect.width = width; }
      if (interaction.anchor.includes("bottom")) rect.height = Math.max(120, board.height + dh);
      if (interaction.anchor.includes("top")) { const height = Math.max(120, board.height - dh); rect.y = board.y + board.height - height; rect.height = height; }
    }
    return rect;
  }, [activeMoveIds, interaction, selectedAssets]);

  const beginMove = (event: ReactPointerEvent, id: EntityId, kind: "asset" | "board") => {
    if (event.button !== 0 || tool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    const isSelected = state?.selection.includes(id) ?? false;
    const locked = kind === "board"
      ? state?.boards.some((board) => board.id === id && board.locked) ?? false
      : state?.assets.some((asset) => asset.id === id && asset.parentBoardId && state.boards.some((board) => board.id === asset.parentBoardId && board.locked)) ?? false;
    if (locked) {
      if (event.shiftKey) { void run({ type: "select", ids: [id], additive: true }); return; }
      if (!isSelected) {
        setState((current) => current ? { ...current, selection: [id] } : current);
        void run({ type: "select", ids: [id] });
      }
      return;
    }
    if (event.shiftKey) {
      if (isSelected) { void run({ type: "select", ids: [id], additive: true }); return; }
      viewportRef.current?.setPointerCapture(event.pointerId);
      const ids = [...(state?.selection ?? []), id];
      setState((current) => current ? { ...current, selection: ids } : current);
      void run({ type: "select", ids });
      setInteraction({ kind: "move", pointerId: event.pointerId, start: toWorld(event), ids, dx: 0, dy: 0 });
      return;
    }
    const ids = isSelected ? (state?.selection ?? [id]) : [id];
    viewportRef.current?.setPointerCapture(event.pointerId);
    if (!isSelected) { setState((current) => current ? { ...current, selection: ids } : current); void run({ type: "select", ids }); }
    setInteraction({ kind: "move", pointerId: event.pointerId, start: toWorld(event), ids, dx: 0, dy: 0 });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    const point = toWorld(event);
    const panning = tool === "pan" || spaceHeld || event.button === 1;
    if (panning) { event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind: "pan", pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { x: view.x, y: view.y } }); return; }
    if (tool === "board") { event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind: "board", pointerId: event.pointerId, start: point, current: point }); return; }
    if (tool !== "select") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({ kind: "marquee", pointerId: event.pointerId, start: point, current: point });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (interaction.kind === "pan") { setView((current) => ({ ...current, x: interaction.origin.x + event.clientX - interaction.start.x, y: interaction.origin.y + event.clientY - interaction.start.y })); return; }
    const point = toWorld(event);
    if (interaction.kind === "move") setInteraction({ ...interaction, dx: point.x - interaction.start.x, dy: point.y - interaction.start.y });
    if (interaction.kind === "marquee" || interaction.kind === "board") setInteraction({ ...interaction, current: point });
    if (interaction.kind === "resize-assets") {
      const bounds = boundsOf(selectedAssets);
      if (!bounds) return;
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const startDistance = Math.max(1, Math.hypot(interaction.start.x - center.x, interaction.start.y - center.y));
      setInteraction({ ...interaction, scale: clamp(Math.hypot(point.x - center.x, point.y - center.y) / startDistance, 0.1, 8) });
    }
    if (interaction.kind === "resize-board") setInteraction({ ...interaction, dw: point.x - interaction.start.x, dh: point.y - interaction.start.y });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interaction || interaction.pointerId !== event.pointerId || !state) return;
    const completed = interaction;
    const finish = async () => {
      try {
        if (completed.kind === "move" && (Math.abs(completed.dx) > 0.5 || Math.abs(completed.dy) > 0.5)) {
          await run({ type: "move-selection", ids: completed.ids, dx: completed.dx, dy: completed.dy });
        }
        if (completed.kind === "resize-assets" && Math.abs(completed.scale - 1) > 0.005) {
          await run({ type: "resize-selection", scale: completed.scale });
        }
        if (completed.kind === "resize-board" && (Math.abs(completed.dw) > 0.5 || Math.abs(completed.dh) > 0.5)) {
          await run({ type: "resize-board", id: completed.boardId, anchor: completed.anchor, dw: completed.dw, dh: completed.dh });
        }
        if (completed.kind === "marquee") {
          const rect = normalizeRect(completed.start, completed.current);
          if (rect.width > 4 || rect.height > 4) await run({ type: "select-rect", rect, additive: event.shiftKey });
          else if (!event.shiftKey) await run({ type: "select", ids: [] });
        }
        if (completed.kind === "board") {
          const rect = normalizeRect(completed.start, completed.current);
          if (rect.width > 80 && rect.height > 60) await run({ type: "create-board", rect, title: "Untitled Board" });
          setTool("select");
        }
      } finally {
        setInteraction(null);
      }
    };
    void finish();
  };

  const startAssetResize = (event: ReactPointerEvent, anchor: ResizeAnchor) => {
    event.preventDefault(); event.stopPropagation();
    if (!selectionBounds || selectedAssets.length === 0) return;
    viewportRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ kind: "resize-assets", pointerId: event.pointerId, anchor, start: toWorld(event), scale: 1 });
  };

  const startBoardResize = (event: ReactPointerEvent, board: Board, anchor: ResizeAnchor) => {
    event.preventDefault(); event.stopPropagation();
    viewportRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ kind: "resize-board", pointerId: event.pointerId, boardId: board.id, anchor, start: toWorld(event), dw: 0, dh: 0 });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = [...event.dataTransfer.files];
    if (files.length) runImport(files, toWorld(event));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = [...event.clipboardData.files];
    if (files.length) { event.preventDefault(); runImport(files); }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : [];
    if (files.length) runImport(files);
    event.target.value = "";
  };

  const startEditingBoard = (board: Board) => { setEditingBoardId(board.id); setBoardDraft(board.title); };
  const commitBoardTitle = (board: Board) => { run({ type: "update-board-title", id: board.id, title: boardDraft.trim() || board.title }); setEditingBoardId(null); };

  const switchCanvas = async (id: string) => {
    setError(null);
    try {
      const next = await api.switchCanvas(id);
      setState(next.state);
      setCanvases(next.canvases);
      setCanvasMenuOpen(false);
      setEditingCanvas(false);
      setView({ x: 130, y: 88, zoom: 1 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not switch Canvas");
    }
  };

  const createCanvas = async () => {
    setError(null);
    try {
      const next = await api.createCanvas(`Canvas ${canvases.length + 1}`);
      setState(next.state);
      setCanvases(next.canvases);
      setCanvasDraft(next.state.canvas.name);
      setEditingCanvas(true);
      setCanvasMenuOpen(true);
      setView({ x: 130, y: 88, zoom: 1 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create Canvas");
    }
  };

  const beginCanvasRename = () => { if (!state) return; setCanvasDraft(state.canvas.name); setEditingCanvas(true); };
  const commitCanvasRename = async () => {
    setError(null);
    try {
      const next = await api.renameCanvas(canvasDraft);
      setState(next.state);
      setCanvases(next.canvases);
      setEditingCanvas(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not rename Canvas");
    }
  };

  if (!state) return <main className="loading-screen">Loading Canvas<span className="loading-dot">.</span><span className="loading-dot">.</span><span className="loading-dot">.</span></main>;

  const marquee = interaction?.kind === "marquee" ? normalizeRect(interaction.start, interaction.current) : null;
  const boardPreview = interaction?.kind === "board" ? normalizeRect(interaction.start, interaction.current) : null;
  const displayedSelectionBounds = interaction?.kind === "resize-assets" || interaction?.kind === "move"
    ? boundsOf([...selectedAssets.map((asset) => previewRect(asset)), ...selectedBoards.map((board) => previewRect(board))])
    : selectionBounds;
  const toolbarBounds = displayedSelectionBounds;

  return <main className={`app-shell tool-${tool}${spaceHeld ? " is-space-held" : ""}`} onPaste={handlePaste} tabIndex={0}>
    <header className="topbar">
      <div className="canvas-switcher-wrap">
        <button type="button" className="canvas-switcher" onClick={() => setCanvasMenuOpen((open) => !open)} aria-expanded={canvasMenuOpen}>
          <span className="canvas-dot" />
          <span>{state.canvas.name}</span>
          <Icon name="chevron" size={14} />
        </button>
        {canvasMenuOpen && <div className="canvas-menu">
          <div className="canvas-menu-label">Local Canvases</div>
          {canvases.map((canvas) => <button key={canvas.id} type="button" className={`canvas-menu-item${canvas.id === state.canvas.id ? " is-current" : ""}`} onClick={() => switchCanvas(canvas.id)}>
            <span className="canvas-dot" />
            <span className="canvas-menu-copy"><span>{canvas.name}</span><small>{canvas.assetCount} assets · {canvas.boardCount} boards</small></span>
            {canvas.id === state.canvas.id && <span className="canvas-check">✓</span>}
          </button>)}
          <div className="canvas-menu-actions">
            {editingCanvas ? <div className="canvas-rename-row">
              <input autoFocus value={canvasDraft} onChange={(event) => setCanvasDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void commitCanvasRename(); if (event.key === "Escape") setEditingCanvas(false); }} aria-label="Canvas name" />
              <button type="button" onClick={() => void commitCanvasRename()} aria-label="Save Canvas name">✓</button>
            </div> : <button type="button" className="canvas-menu-action" onClick={beginCanvasRename}>Rename current</button>}
            <button type="button" className="canvas-menu-action canvas-menu-action-primary" onClick={() => void createCanvas()}><Icon name="plus" size={13} />New Canvas</button>
          </div>
        </div>}
      </div>
      <div className="topbar-right">
        <button type="button" className="zoom-control" onClick={() => zoomBy(-0.1)} aria-label="Zoom out"><Icon name="minus" size={15} /></button>
        <span className="zoom-value">{Math.round(view.zoom * 100)}%</span>
        <button type="button" className="zoom-control" onClick={() => zoomBy(0.1)} aria-label="Zoom in"><Icon name="plus" size={15} /></button>
      </div>
    </header>

    {libraryOpen && <AssetLibraryPanel assets={library} onInsert={(asset) => void insertFromLibrary(asset)} onClose={() => setLibraryOpen(false)} />}
    {previewOpen && <PreviewPanel assets={selectedAssets} contextAssets={state.assets} mode={previewMode} device={previewDevice} carouselIndex={carouselIndex} youtubeTitle={youtubeTitle} youtubeDark={youtubeDark} onModeChange={(mode) => { setPreviewMode(mode); setCarouselIndex(0); }} onDeviceChange={setPreviewDevice} onCarouselIndexChange={setCarouselIndex} onYoutubeTitleChange={setYoutubeTitle} onYoutubeDarkChange={setYoutubeDark} onClose={() => setPreviewOpen(false)} />}

    <aside className="tool-rail" aria-label="Canvas tools">
      <div className="tool-rail-group">
        <ToolbarButton label="Select" icon="select" active={tool === "select"} onClick={() => setTool("select")} />
        <ToolbarButton label="Pan Canvas" icon="pan" active={tool === "pan"} onClick={() => setTool("pan")} />
        <span className="rail-divider" />
        <ToolbarButton label="Create Board" icon="board" active={tool === "board"} onClick={() => setTool("board")} />
        <ToolbarButton label="Import images" icon="import" active={tool === "import"} onClick={() => { setTool("select"); fileInput.current?.click(); }} />
        <span className="rail-divider" />
        <ToolbarButton label="Assets library" icon="folder" active={libraryOpen} onClick={() => setLibraryOpen((open) => !open)} />
        <ToolbarButton label="Preview selection" icon="preview" active={previewOpen} onClick={openPreview} />
      </div>
      <div className="tool-rail-bottom"><span className="shortcut-hint">{spaceHeld ? "PAN" : "SPACE"}</span></div>
    </aside>

    <div ref={viewportRef} className="canvas-viewport" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <div className="world" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {state.boards.map((board) => {
          const rect = previewRect(board);
          const selected = state.selection.includes(board.id);
          return <div key={board.id} data-entity-id={board.id} className={`board${selected ? " is-selected" : ""}`} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: selected ? 4 : 1 }} onPointerDown={(event) => beginMove(event, board.id, "board")}>
            <div className="board-title" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => { event.stopPropagation(); startEditingBoard(board); }}>
              {editingBoardId === board.id ? <input autoFocus value={boardDraft} onChange={(event) => setBoardDraft(event.target.value)} onBlur={() => commitBoardTitle(board)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setEditingBoardId(null); }} /> : board.title}
            </div>
            {board.locked && <button type="button" className="board-lock" aria-label="Unlock Board" title="Unlock Board" onPointerDown={(event) => event.stopPropagation()} onClick={() => void run({ type: "toggle-board-lock", id: board.id })}><Icon name="lock" size={12} /></button>}
            {selected && <div className="board-resize-handles" onPointerDown={(event) => event.stopPropagation()}>{(["top-left", "top-right", "bottom-left", "bottom-right"] as ResizeAnchor[]).map((anchor) => <button key={anchor} type="button" className={`resize-handle ${anchor}`} aria-label={`Resize board ${anchor}`} onPointerDown={(event) => startBoardResize(event, board, anchor)} />)}</div>}
          </div>;
        })}
        {state.assets.map((asset) => {
          const rect = previewRect(asset);
          const selected = state.selection.includes(asset.id);
          return <div key={asset.id} data-entity-id={asset.id} className={`asset${selected ? " is-selected" : ""}${asset.origin === "codex" ? " is-generated" : ""}`} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: selected ? 8 : 5 }} onPointerDown={(event) => beginMove(event, asset.id, "asset")}>
            <img src={assetUrl(asset.path)} alt={asset.name} draggable={false} />
            {selected && <div className="asset-selection-meta"><span>{asset.name}</span><span>{Math.round(rect.width)} × {Math.round(rect.height)}</span></div>}
          </div>;
        })}
        {marquee && <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}
        {boardPreview && <div className="board-preview" style={{ left: boardPreview.x, top: boardPreview.y, width: boardPreview.width, height: boardPreview.height }} />}
        {toolbarBounds && state.selection.length > 0 && <div className="selection-overlay" style={{ left: toolbarBounds.x, top: toolbarBounds.y, width: toolbarBounds.width, height: toolbarBounds.height }}>
          {selectedAssets.length > 0 && (["top-left", "top-right", "bottom-left", "bottom-right"] as ResizeAnchor[]).map((anchor) => <button key={anchor} type="button" className={`resize-handle ${anchor}`} aria-label={`Resize selection ${anchor}`} onPointerDown={(event) => startAssetResize(event, anchor)} />)}
          <div className="selection-toolbar" style={{ transform: `scale(${1 / view.zoom})` }} onPointerDown={(event) => event.stopPropagation()}>
            <span className="selection-count">{state.selection.length} selected</span>
            {selectedBoards.length === 1 && <button type="button" onClick={() => void run({ type: "toggle-board-lock", id: selectedBoards[0].id })}><Icon name={selectedBoards[0].locked ? "unlock" : "lock"} size={15} />{selectedBoards[0].locked ? "Unlock" : "Lock"}</button>}
            {selectedAssets.length > 1 && <button type="button" onClick={() => run({ type: "group-selection" })}><Icon name="group" size={15} />Group</button>}
            {selectedAssets.length > 0 && <button type="button" onClick={() => run({ type: "create-board-from-selection" })}><Icon name="board" size={15} />Board</button>}
            {selectedAssets.length === 1 && <button type="button" onClick={() => void saveToLibrary(selectedAssets[0])}><Icon name="folder" size={15} />Save</button>}
            {selectedAssets.length > 0 && <button type="button" onClick={openPreview}><Icon name="preview" size={15} />Preview</button>}
            {selectedAssets.length > 0 && <button type="button" onClick={() => run({ type: "duplicate-selection" })}><Icon name="duplicate" size={15} />Duplicate</button>}
            <button type="button" className="danger-action" onClick={() => run({ type: "delete-selection" })}><Icon name="trash" size={15} /></button>
          </div>
        </div>}
      </div>
      {state.assets.length === 0 && !interaction && <div className="empty-canvas"><div className="empty-title">Drop images here</div><div className="empty-subtitle">or paste from your clipboard</div></div>}
      <div className="canvas-status">{state.assets.length} assets <span>·</span> {state.boards.length} boards</div>
    </div>
    <input ref={fileInput} className="hidden-input" type="file" accept="image/*" multiple onChange={handleFileChange} />
    {error && <button type="button" className="error-toast" onClick={() => setError(null)}>{error}<span>×</span></button>}
  </main>;
}
