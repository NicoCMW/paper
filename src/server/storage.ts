import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import type { CanvasState } from "../domain/model";
import { createInitialState } from "../domain/model";

const DATA_DIR = process.env.PAPER_DATA_DIR
  ? resolve(process.env.PAPER_DATA_DIR)
  : resolve(process.cwd(), ".paper-data");
const ASSETS_DIR = join(DATA_DIR, "assets");
const STATE_PATH = join(DATA_DIR, "state.json");

export class LocalWorkspaceStore {
  async load(): Promise<CanvasState> {
    try {
      return JSON.parse(await readFile(STATE_PATH, "utf8")) as CanvasState;
    } catch {
      const initial = createInitialState();
      await this.save(initial);
      return initial;
    }
  }

  async save(state: CanvasState): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  }

  async saveDataUrl(dataUrl: string, filename: string): Promise<{ relativePath: string; mime: string }> {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) throw new Error("The imported image must be a base64 data URL");
    const [, mime, encoded] = match;
    const safeExtension = extname(filename) || `.${mime.split("/")[1] || "bin"}`;
    const safeName = `${crypto.randomUUID()}${safeExtension.toLowerCase()}`;
    await mkdir(ASSETS_DIR, { recursive: true });
    await writeFile(join(ASSETS_DIR, safeName), Buffer.from(encoded, "base64"));
    return { relativePath: `assets/${safeName}`, mime };
  }

  async copyLocalFile(sourcePath: string, filename: string): Promise<{ relativePath: string; mime: string }> {
    const safeExtension = extname(filename) || extname(sourcePath) || ".png";
    const safeName = `${crypto.randomUUID()}${safeExtension.toLowerCase()}`;
    await mkdir(ASSETS_DIR, { recursive: true });
    await copyFile(resolve(sourcePath), join(ASSETS_DIR, safeName));
    const mime = safeExtension.toLowerCase() === ".jpg" || safeExtension.toLowerCase() === ".jpeg" ? "image/jpeg" : "image/png";
    return { relativePath: `assets/${safeName}`, mime };
  }

  async readAsset(relativePath: string): Promise<Buffer> {
    const absolute = resolve(DATA_DIR, normalize(relativePath));
    if (relative(DATA_DIR, absolute).startsWith("..")) throw new Error("Asset path escapes local data directory");
    return readFile(absolute);
  }

  assetUrl(relativePath: string): string {
    return `/assets/${relativePath.replace(/^assets\//, "")}`;
  }
}

export { DATA_DIR };
