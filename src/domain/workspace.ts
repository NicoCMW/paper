import type { Asset, Board, CanvasState, CanvasSummary, EntityId, LibraryAsset, Note, Rect, Workspace, WorkspaceCommand, WorkspaceDocument } from "./model";
import { createInitialState } from "./model";

type CanvasHistory = {
  past: CanvasState[];
  future: CanvasState[];
};

const clone = <T>(value: T): T => structuredClone(value);

const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const boundsOf = (items: Array<Pick<Rect, "x" | "y" | "width" | "height">>): Rect => {
  const left = Math.min(...items.map((item) => item.x));
  const top = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const bottom = Math.max(...items.map((item) => item.y + item.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const syncMembership = (state: CanvasState, asset: Asset): Asset => {
  const board = state.boards.find((candidate) => contains(candidate, asset));
  return { ...asset, parentBoardId: board?.id };
};

const lockedBoardFor = (state: CanvasState, asset: Asset): Board | undefined => {
  if (!asset.parentBoardId) return undefined;
  const board = state.boards.find((candidate) => candidate.id === asset.parentBoardId);
  return board?.locked ? board : undefined;
};

const syncBoardMembers = (boards: Board[], assets: Asset[]): Board[] => boards.map((board) => ({
  ...board,
  memberAssetIds: assets.filter((asset) => asset.parentBoardId === board.id).map((asset) => asset.id),
}));

const selectIntersecting = (state: CanvasState, rect: Rect, additive: boolean): CanvasState => {
  const hitIds = [
    ...state.assets.filter((asset) => intersects(asset, rect)).map((asset) => asset.id),
    ...state.notes.filter((note) => intersects(note, rect)).map((note) => note.id),
  ];
  const selection = additive
    ? [...state.selection, ...hitIds.filter((id) => !state.selection.includes(id))]
    : hitIds;
  return { ...state, selection };
};

function applyCommand(previous: CanvasState, command: WorkspaceCommand): CanvasState {
  switch (command.type) {
    case "import-asset":
      return { ...previous, assets: [...previous.assets, command.asset], selection: [command.asset.id] };
    case "create-note":
      return { ...previous, notes: [...previous.notes, command.note], selection: [command.note.id] };
    case "update-note-text":
      return { ...previous, notes: previous.notes.map((note) => note.id === command.id ? { ...note, text: command.text } : note) };
    case "update-note-style":
      return {
        ...previous,
        notes: previous.notes.map((note) => note.id === command.id ? {
          ...note,
          ...(command.fontSize === undefined ? {} : { fontSize: Math.min(96, Math.max(8, command.fontSize)) }),
          ...(command.backgroundColor === undefined ? {} : { backgroundColor: command.backgroundColor }),
          ...(command.textColor === undefined ? {} : { textColor: command.textColor }),
        } : note),
      };
    case "select": {
      const selection = command.additive
        ? command.ids.reduce<EntityId[]>(
            (result, id) => result.includes(id) ? result.filter((selected) => selected !== id) : [...result, id],
            previous.selection,
          )
        : command.ids;
      return { ...previous, selection };
    }
    case "select-rect":
      return selectIntersecting(previous, command.rect, Boolean(command.additive));
    case "move-asset": {
      const current = previous.assets.find((asset) => asset.id === command.id);
      if (!current || lockedBoardFor(previous, current)) return previous;
      const assets = previous.assets.map((asset) =>
        asset.id === command.id
          ? syncMembership(previous, { ...asset, x: asset.x + command.dx, y: asset.y + command.dy })
          : asset,
      );
      const boards = syncBoardMembers(previous.boards, assets);
      return { ...previous, assets, boards };
    }
    case "move-board": {
      const board = previous.boards.find((candidate) => candidate.id === command.id);
      if (!board || board.locked) return previous;
      const memberIds = new Set(board.memberAssetIds);
      return {
        ...previous,
        boards: previous.boards.map((candidate) =>
          candidate.id === command.id
            ? { ...candidate, x: candidate.x + command.dx, y: candidate.y + command.dy }
            : candidate,
        ),
        assets: previous.assets.map((asset) =>
          memberIds.has(asset.id)
            ? { ...asset, x: asset.x + command.dx, y: asset.y + command.dy }
            : asset,
        ),
      };
    }
    case "move-selection": {
      const selectedIds = new Set(command.ids ?? previous.selection);
      const selectedBoards = previous.boards.filter((board) => selectedIds.has(board.id));
      const lockedMemberIds = new Set(selectedBoards.filter((board) => board.locked).flatMap((board) => board.memberAssetIds));
      const movedMemberIds = new Set(selectedBoards.filter((board) => !board.locked).flatMap((board) => board.memberAssetIds));
      const movedAssets = previous.assets.map((asset) => {
        if (lockedMemberIds.has(asset.id) || (!selectedIds.has(asset.id) && !movedMemberIds.has(asset.id))) return asset;
        if (selectedIds.has(asset.id) && lockedBoardFor(previous, asset)) return asset;
        return { ...asset, x: asset.x + command.dx, y: asset.y + command.dy };
      });
      const notes = previous.notes.map((note) => selectedIds.has(note.id) ? { ...note, x: note.x + command.dx, y: note.y + command.dy } : note);
      const boards = previous.boards.map((board) =>
        selectedIds.has(board.id) && !board.locked ? { ...board, x: board.x + command.dx, y: board.y + command.dy } : board,
      );
      const movedState = { ...previous, assets: movedAssets, boards };
      const assets = movedAssets.map((asset) =>
        selectedIds.has(asset.id) && !movedMemberIds.has(asset.id) && !lockedMemberIds.has(asset.id) && !lockedBoardFor(previous, asset)
          ? syncMembership(movedState, asset)
          : asset,
      );
      const nextBoards = syncBoardMembers(boards, assets);
      return { ...previous, assets, boards: nextBoards, notes, selection: command.ids ?? previous.selection };
    }
    case "resize-selection": {
      const selectedAssets = previous.assets.filter((asset) => previous.selection.includes(asset.id) && !lockedBoardFor(previous, asset));
      const selectedNotes = previous.notes.filter((note) => previous.selection.includes(note.id));
      const selected = [...selectedAssets, ...selectedNotes];
      if (selected.length === 0 || command.scale <= 0) return previous;
      const bounds = boundsOf(selected);
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const assets = previous.assets.map((asset) => {
        if (!selectedAssets.some((selectedAsset) => selectedAsset.id === asset.id)) return asset;
        const nextWidth = asset.width * command.scale;
        const nextHeight = asset.height * command.scale;
        return {
          ...asset,
          x: center.x + (asset.x + asset.width / 2 - center.x) * command.scale - nextWidth / 2,
          y: center.y + (asset.y + asset.height / 2 - center.y) * command.scale - nextHeight / 2,
          width: nextWidth,
          height: nextHeight,
        };
      });
      const notes = previous.notes.map((note) => {
        if (!selectedNotes.some((selectedNote) => selectedNote.id === note.id)) return note;
        const nextWidth = note.width * command.scale;
        const nextHeight = note.height * command.scale;
        return {
          ...note,
          x: center.x + (note.x + note.width / 2 - center.x) * command.scale - nextWidth / 2,
          y: center.y + (note.y + note.height / 2 - center.y) * command.scale - nextHeight / 2,
          width: nextWidth,
          height: nextHeight,
        };
      });
      return { ...previous, assets, notes };
    }
    case "resize-note": {
      const note = previous.notes.find((candidate) => candidate.id === command.id);
      if (!note) return previous;
      let { x, y, width, height } = note;
      const minWidth = 140;
      const minHeight = 72;
      if (command.anchor.includes("right")) width = Math.max(minWidth, width + command.dw);
      if (command.anchor.includes("left")) {
        const nextWidth = Math.max(minWidth, width - command.dw);
        x += width - nextWidth;
        width = nextWidth;
      }
      if (command.anchor.includes("bottom")) height = Math.max(minHeight, height + command.dh);
      if (command.anchor.includes("top")) {
        const nextHeight = Math.max(minHeight, height - command.dh);
        y += height - nextHeight;
        height = nextHeight;
      }
      return { ...previous, notes: previous.notes.map((candidate) => candidate.id === note.id ? { ...candidate, x, y, width, height } : candidate) };
    }
    case "resize-board": {
      const board = previous.boards.find((candidate) => candidate.id === command.id);
      if (!board || board.locked) return previous;
      const minWidth = 160;
      const minHeight = 120;
      let { x, y, width, height } = board;
      if (command.anchor.includes("right")) width = Math.max(minWidth, width + command.dw);
      if (command.anchor.includes("left")) {
        const nextWidth = Math.max(minWidth, width - command.dw);
        x += width - nextWidth;
        width = nextWidth;
      }
      if (command.anchor.includes("bottom")) height = Math.max(minHeight, height + command.dh);
      if (command.anchor.includes("top")) {
        const nextHeight = Math.max(minHeight, height - command.dh);
        y += height - nextHeight;
        height = nextHeight;
      }
      return { ...previous, boards: previous.boards.map((candidate) => candidate.id === board.id ? { ...candidate, x, y, width, height } : candidate) };
    }
    case "create-board": {
      const memberAssetIds = previous.assets.filter((asset) => contains(command.rect, asset)).map((asset) => asset.id);
      const board: Board = {
        id: crypto.randomUUID(),
        title: command.title ?? "Untitled Board",
        ...command.rect,
        memberAssetIds,
        locked: false,
      };
      const assets = previous.assets.map((asset) => memberAssetIds.includes(asset.id) ? { ...asset, parentBoardId: board.id } : asset);
      return { ...previous, assets, boards: syncBoardMembers([...previous.boards, board], assets), selection: [board.id] };
    }
    case "update-board-title":
      return { ...previous, boards: previous.boards.map((board) => board.id === command.id ? { ...board, title: command.title || "Untitled Board" } : board) };
    case "toggle-board-lock":
      return { ...previous, boards: previous.boards.map((board) => board.id === command.id ? { ...board, locked: !board.locked } : board) };
    case "create-board-from-selection": {
      const selected = previous.assets.filter((asset) => previous.selection.includes(asset.id));
      if (selected.length === 0) return previous;
      const margin = 32;
      const bounds = boundsOf(selected);
      const board: Board = {
        id: crypto.randomUUID(),
        title: command.title ?? "Untitled Board",
        x: bounds.x - margin,
        y: bounds.y - margin,
        width: bounds.width + margin * 2,
        height: bounds.height + margin * 2,
        memberAssetIds: selected.map((asset) => asset.id),
        locked: false,
      };
      const assets = previous.assets.map((asset) =>
        previous.selection.includes(asset.id) ? { ...asset, parentBoardId: board.id } : asset,
      );
      return { ...previous, assets, boards: syncBoardMembers([...previous.boards, board], assets), selection: [board.id] };
    }
    case "group-selection": {
      const ids = previous.selection.filter((id) => previous.assets.some((asset) => asset.id === id));
      if (ids.length < 2) return previous;
      return { ...previous, groups: { ...previous.groups, [crypto.randomUUID()]: ids } };
    }
    case "duplicate-selection": {
      const selected = previous.assets.filter((asset) => previous.selection.includes(asset.id));
      const duplicates = selected.map((asset) => ({ ...asset, id: crypto.randomUUID(), x: asset.x + 32, y: asset.y + 32 }));
      const selectedNotes = previous.notes.filter((note) => previous.selection.includes(note.id));
      const noteDuplicates: Note[] = selectedNotes.map((note) => ({ ...note, id: crypto.randomUUID(), x: note.x + 32, y: note.y + 32 }));
      const assets = [...previous.assets, ...duplicates];
      return { ...previous, assets, notes: [...previous.notes, ...noteDuplicates], boards: syncBoardMembers(previous.boards, assets), selection: [...duplicates.map((asset) => asset.id), ...noteDuplicates.map((note) => note.id)] };
    }
    case "delete-selection": {
      const deleted = new Set(previous.selection);
      return {
        ...previous,
        assets: previous.assets.filter((asset) => !deleted.has(asset.id)),
        notes: previous.notes.filter((note) => !deleted.has(note.id)),
        boards: previous.boards.filter((board) => !deleted.has(board.id)).map((board) => ({
          ...board,
          memberAssetIds: board.memberAssetIds.filter((id) => !deleted.has(id)),
        })),
        groups: Object.fromEntries(Object.entries(previous.groups).filter(([, ids]) => !ids.some((id) => deleted.has(id)))),
        selection: [],
      };
    }
  }
}

const normalizeCanvasState = (state: CanvasState): CanvasState => ({
  ...state,
  notes: (state.notes ?? []).map((note) => ({
    ...note,
    backgroundColor: note.backgroundColor ?? "#252525",
    textColor: note.textColor ?? "#e4e4df",
    fontSize: note.fontSize ?? 16,
  })),
});

const documentFrom = (initial: CanvasState | WorkspaceDocument): WorkspaceDocument => {
  if ("canvases" in initial) {
    const canvases = initial.canvases.length > 0 ? initial.canvases.map(normalizeCanvasState) : [createInitialState()];
    const activeCanvasId = canvases.some((canvas) => canvas.canvas.id === initial.activeCanvasId)
      ? initial.activeCanvasId
      : canvases[0].canvas.id;
    return clone({ activeCanvasId, canvases, library: initial.library ?? [] });
  }
  return { activeCanvasId: initial.canvas.id, canvases: [clone(normalizeCanvasState(initial))], library: [] };
};

const activeCanvas = (document: WorkspaceDocument): CanvasState => {
  return document.canvases.find((canvas) => canvas.canvas.id === document.activeCanvasId) ?? document.canvases[0];
};

const withActiveCanvas = (document: WorkspaceDocument, next: CanvasState): WorkspaceDocument => ({
  ...document,
  canvases: document.canvases.map((canvas) => canvas.canvas.id === next.canvas.id ? clone(next) : canvas),
});

const summariesOf = (document: WorkspaceDocument): CanvasSummary[] => document.canvases.map((canvas) => ({
  ...canvas.canvas,
  assetCount: canvas.assets.length,
  boardCount: canvas.boards.length,
}));

export function createWorkspace(initial: CanvasState | WorkspaceDocument = createInitialState()): Workspace {
  let document = documentFrom(initial);
  const histories = new Map<EntityId, CanvasHistory>();

  const historyFor = (canvasId: EntityId): CanvasHistory => {
    const existing = histories.get(canvasId);
    if (existing) return existing;
    const created: CanvasHistory = { past: [], future: [] };
    histories.set(canvasId, created);
    return created;
  };

  const commit = (next: WorkspaceDocument): CanvasState => {
    if (JSON.stringify(next) === JSON.stringify(document)) return clone(activeCanvas(document));
    const current = activeCanvas(document);
    const nextActive = activeCanvas(next);
    if (document.activeCanvasId === next.activeCanvasId && current.canvas.id === nextActive.canvas.id) {
      const history = historyFor(current.canvas.id);
      history.past = [...history.past, clone(current)];
      history.future = [];
    }
    document = clone(next);
    return clone(activeCanvas(document));
  };

  return {
    getState: () => clone(activeCanvas(document)),
    getDocument: () => clone(document),
    getCanvases: () => summariesOf(document),
    getLibrary: () => clone(document.library),
    addLibraryAsset: (asset: LibraryAsset) => {
      const existing = document.library.find((item) => item.path === asset.path);
      if (!existing) document = { ...document, library: [...document.library, clone(asset)] };
      return clone(document.library);
    },
    dispatch: (command) => {
      const current = activeCanvas(document);
      const next = applyCommand(current, command);
      const nextDocument = withActiveCanvas(document, next);
      if (command.type === "select" || command.type === "select-rect") {
        document = clone(nextDocument);
        return clone(next);
      }
      return commit(nextDocument);
    },
    createCanvas: (name) => {
      const title = name.trim() || `Canvas ${document.canvases.length + 1}`;
      const canvas = createInitialState({ id: crypto.randomUUID(), name: title });
      document = { activeCanvasId: canvas.canvas.id, canvases: [...document.canvases, canvas], library: document.library };
      return clone(canvas);
    },
    switchCanvas: (id) => {
      if (!document.canvases.some((canvas) => canvas.canvas.id === id)) return clone(activeCanvas(document));
      document = { ...document, activeCanvasId: id };
      return clone(activeCanvas(document));
    },
    renameCanvas: (name) => {
      const current = activeCanvas(document);
      const title = name.trim() || current.canvas.name;
      const next = { ...current, canvas: { ...current.canvas, name: title } };
      document = withActiveCanvas(document, next);
      return clone(next);
    },
    undo: () => {
      const current = activeCanvas(document);
      const history = historyFor(current.canvas.id);
      const previous = history.past.pop();
      if (!previous) return clone(activeCanvas(document));
      history.future = [clone(current), ...history.future];
      document = withActiveCanvas(document, previous);
      return clone(activeCanvas(document));
    },
    redo: () => {
      const current = activeCanvas(document);
      const history = historyFor(current.canvas.id);
      const next = history.future.shift();
      if (!next) return clone(activeCanvas(document));
      history.past = [...history.past, clone(current)];
      document = withActiveCanvas(document, next);
      return clone(activeCanvas(document));
    },
  };
}
