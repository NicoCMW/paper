# Product foundation specification

## Slice

Deliver the first real Codex Canvas surface after the throwaway MCP bridge. The surface is a Paper-like spatial editor: dark Canvas, narrow icon toolbar, white Boards, image Assets, contextual selection controls, and local persistence.

## User-visible contract

- Import one or many images by Finder drag-and-drop, clipboard paste, or file picker.
- Select with click, toggle with Shift-click, or drag a marquee through empty Canvas space.
- Move Assets, Boards, and multi-selections while preserving relative distances.
- Resize one or multiple Assets from corner handles, preserving proportions and scaling the group around its geometric center.
- Create a Board by dragging the Board tool, edit its title, or create a Board around the current Asset selection.
- List, create, rename, and switch between multiple named local Canvases without losing the Assets in the previous Canvas.
- Move a Board with its member Assets. An Asset entering a Board becomes a member; leaving it removes membership.
- Use contextual Group, Board, Duplicate, and Delete actions without a permanent inspector.
- Pan with Space-drag or the Pan tool, and zoom the Canvas content with the compact top-right control or the macOS trackpad pinch gesture while the fixed app chrome remains visible.
- Display a Codex-generated Asset at a size bounded by the largest selected Reference image, even when the generated source image is high resolution.
- Persist state and image bytes locally under `.paper-data`.

## Explicit non-goals for this slice

Prompt composer, direct image-generation UI, remote persistence, external integrations, visible grid, text/pen/connector tools, and automatic layout of Assets inside Boards.

## Module boundaries

- `src/domain`: the deep workspace module and its small `Workspace` interface.
- `src/client`: Canvas interaction and visual presentation; no filesystem or MCP knowledge.
- `src/server/storage.ts`: local persistence and asset bytes.
- `src/server/mcp.ts`: Codex-facing adapter; it translates MCP operations into domain commands.
- `src/server/main.ts`: HTTP composition root.
