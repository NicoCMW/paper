import { describe, expect, it } from "vitest";
import type { Asset } from "../domain/model";
import { createYoutubePreviewVideos, YOUTUBE_SAMPLE_CATALOG } from "./youtube-preview";

const target: Asset = {
  id: "canvas-target",
  name: "my-thumbnail.png",
  mime: "image/png",
  path: "assets/my-thumbnail.png",
  x: 0,
  y: 0,
  width: 640,
  height: 360,
  origin: "imported",
  createdAt: new Date(0).toISOString(),
};

describe("YouTube preview context", () => {
  it("uses only catalog neighbours and moves the Canvas target between positions", () => {
    const previews = [1, 2, 3, 4, 5].map((seed) => createYoutubePreviewVideos(target, "My video", seed));
    const targetPositions = new Set(previews.map((videos) => videos.findIndex((video) => video.isTarget)));
    const catalogIds = new Set(YOUTUBE_SAMPLE_CATALOG.map((video) => video.id));

    expect(targetPositions.size).toBeGreaterThan(1);
    expect(previews.flat().filter((video) => !video.isTarget).every((video) => catalogIds.has(video.id))).toBe(true);
    expect(previews.flat().filter((video) => !video.isTarget).some((video) => video.asset)).toBe(false);
  });

  it("keeps the target title behind the same small interface", () => {
    expect(createYoutubePreviewVideos(target, "  New title  ", 42).find((video) => video.isTarget)).toMatchObject({ id: target.id, title: "New title", channel: "Your Channel" });
  });
});
