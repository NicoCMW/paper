import { describe, expect, it } from "vitest";
import type { Asset } from "./model";
import { createInitialState } from "./model";
import { generatedAssetDisplaySize } from "./generated-asset";

const asset = (id: string, width: number, height: number): Asset => ({
  id,
  name: `${id}.png`,
  mime: "image/png",
  path: `assets/${id}.png`,
  x: 0,
  y: 0,
  width,
  height,
  origin: "imported",
  createdAt: new Date(0).toISOString(),
});

describe("generatedAssetDisplaySize", () => {
  it("fits a generated 16:9 Asset inside the largest selected reference", () => {
    const state = { ...createInitialState(), assets: [asset("small", 320, 180), asset("large", 640, 360)] };

    expect(generatedAssetDisplaySize(state, ["small", "large"], 1536, 864)).toEqual({ width: 640, height: 360 });
  });

  it("keeps a generated Asset bounded when no reference is provided", () => {
    expect(generatedAssetDisplaySize(createInitialState(), [], 4096, 4096)).toEqual({ width: 420, height: 420 });
  });
});
