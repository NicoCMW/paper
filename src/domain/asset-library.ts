import type { Asset, CanvasState, LibraryAsset, Point } from "./model";

/**
 * The library keeps a durable reference to the local file already owned by
 * the workspace. Canvas membership can change without invalidating the
 * reusable Asset, which is why the library does not own a second image copy.
 */
export function libraryAssetFrom(asset: Asset, name = asset.name): LibraryAsset {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || asset.name,
    mime: asset.mime,
    path: asset.path,
    width: asset.width,
    height: asset.height,
    createdAt: new Date().toISOString(),
    sourceAssetId: asset.id,
  };
}

export function libraryDisplaySize(asset: LibraryAsset, maxWidth = 640, maxHeight = 420): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / asset.width, maxHeight / asset.height);
  return {
    width: Math.max(80, Math.round(asset.width * scale)),
    height: Math.max(60, Math.round(asset.height * scale)),
  };
}

export function libraryInsertionPoint(state: CanvasState, asset: LibraryAsset): Point {
  const anchor = state.assets.find((candidate) => state.selection.includes(candidate.id));
  const candidates = anchor
    ? [
        { x: anchor.x + anchor.width + 32, y: anchor.y },
        { x: anchor.x, y: anchor.y + anchor.height + 32 },
        { x: anchor.x, y: Math.max(24, anchor.y - asset.height - 32) },
        { x: Math.max(24, anchor.x - asset.width - 32), y: anchor.y },
      ]
    : [{ x: 160, y: 120 }];
  const occupied = [...state.assets, ...state.boards];
  return candidates.find((candidate) => !occupied.some((item) =>
    item.x < candidate.x + asset.width &&
    item.x + item.width > candidate.x &&
    item.y < candidate.y + asset.height &&
    item.y + item.height > candidate.y,
  )) ?? candidates[0];
}
