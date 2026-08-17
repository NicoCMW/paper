import { describe, expect, it } from "vitest";
import { selectionBoundsFollowInteraction } from "./selection-geometry";

describe("selection geometry", () => {
  it("keeps the selection overlay attached while a Note is being resized", () => {
    expect(selectionBoundsFollowInteraction("resize-note")).toBe(true);
  });

  it("does not move selection chrome for non-spatial interactions", () => {
    expect(selectionBoundsFollowInteraction("note")).toBe(false);
    expect(selectionBoundsFollowInteraction("resize-board")).toBe(false);
  });
});
