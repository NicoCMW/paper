import { describe, expect, it } from "vitest";
import type { Asset } from "./model";
import { createInitialState } from "./model";
import { createWorkspace } from "./workspace";

const asset = (id: string, x: number, y: number, width = 100, height = 60): Asset => ({
  id, name: `${id}.png`, mime: "image/png", path: `assets/${id}.png`, origin: "imported", createdAt: "2026-01-01T00:00:00.000Z", x, y, width, height,
});

describe("Canvas workspace", () => {
  it("creates, renames, and switches between named Canvases", () => {
    const workspace = createWorkspace();
    const firstId = workspace.getState().canvas.id;

    workspace.renameCanvas("YouTube thumbnails");
    const second = workspace.createCanvas("Ideas");

    expect(workspace.getState().canvas.id).toBe(second.canvas.id);
    expect(workspace.getCanvases().map((canvas) => canvas.name)).toEqual(["YouTube thumbnails", "Ideas"]);

    workspace.switchCanvas(firstId);
    expect(workspace.getState().canvas.name).toBe("YouTube thumbnails");
    expect(workspace.getDocument().canvases).toHaveLength(2);
  });

  it("selects assets intersecting a marquee rectangle", () => {
    const workspace = createWorkspace({ ...createInitialState(), assets: [asset("a", 10, 10), asset("b", 300, 300)] });
    workspace.dispatch({ type: "select-rect", rect: { x: 0, y: 0, width: 150, height: 120 } });
    expect(workspace.getState().selection).toEqual(["a"]);
  });

  it("creates a Board around selected assets and records membership", () => {
    const workspace = createWorkspace({ ...createInitialState(), assets: [asset("a", 100, 100), asset("b", 260, 160)] });
    workspace.dispatch({ type: "select", ids: ["a", "b"] });
    workspace.dispatch({ type: "create-board-from-selection", title: "References" });
    const state = workspace.getState();
    expect(state.boards).toHaveLength(1);
    expect(state.boards[0].title).toBe("References");
    expect(state.boards[0].memberAssetIds).toEqual(["a", "b"]);
    expect(state.assets.every((item) => item.parentBoardId === state.boards[0].id)).toBe(true);
  });

  it("moves a Board and its member assets together", () => {
    const workspace = createWorkspace({ ...createInitialState(), assets: [asset("a", 100, 100)] });
    workspace.dispatch({ type: "select", ids: ["a"] });
    workspace.dispatch({ type: "create-board-from-selection" });
    const board = workspace.getState().boards[0];
    workspace.dispatch({ type: "select", ids: [board.id] });
    workspace.dispatch({ type: "move-selection", dx: 40, dy: 25 });
    expect(workspace.getState().boards[0]).toMatchObject({ x: board.x + 40, y: board.y + 25 });
    expect(workspace.getState().assets[0]).toMatchObject({ x: 140, y: 125 });
  });

  it("resizes a multi-selection around its geometric center", () => {
    const workspace = createWorkspace({ ...createInitialState(), assets: [asset("a", 0, 0), asset("b", 200, 0)] });
    workspace.dispatch({ type: "select", ids: ["a", "b"] });
    workspace.dispatch({ type: "resize-selection", scale: 2 });
    const [first, second] = workspace.getState().assets;
    expect(first).toMatchObject({ x: -150, width: 200, height: 120 });
    expect(second).toMatchObject({ x: 250, width: 200, height: 120 });
  });

  it("supports undo and redo for a structural change", () => {
    const workspace = createWorkspace({ ...createInitialState(), assets: [asset("a", 10, 10)] });
    workspace.dispatch({ type: "select", ids: ["a"] });
    workspace.dispatch({ type: "move-selection", dx: 50, dy: 20 });
    expect(workspace.getState().assets[0].x).toBe(60);
    workspace.undo();
    expect(workspace.getState().assets[0].x).toBe(10);
    workspace.redo();
    expect(workspace.getState().assets[0].x).toBe(60);
  });
});
