import { describe, expect, it } from "vitest";
import { createInitialState } from "../domain/model";
import type { Workspace } from "../domain/model";
import { CanvasMcpAdapter } from "./mcp";

const workspace = { getState: () => createInitialState() } as Workspace;
const store = {} as ConstructorParameters<typeof CanvasMcpAdapter>[1];

describe("Canvas MCP protocol surface", () => {
  it("negotiates the client's supported protocol version", async () => {
    const adapter = new CanvasMcpAdapter(workspace, store);
    const response = await adapter.call({ id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect(response).toMatchObject({ result: { protocolVersion: "2025-03-26", capabilities: { tools: {} } } });
  });

  it("handles initialized notifications without a response body", async () => {
    const adapter = new CanvasMcpAdapter(workspace, store);
    await expect(adapter.call({ method: "notifications/initialized" })).resolves.toBeUndefined();
  });

  it("publishes the Canvas tools required by the operator skill", async () => {
    const adapter = new CanvasMcpAdapter(workspace, store);
    const response = await adapter.call({ id: 2, method: "tools/list" });
    const names = (response as { result: { tools: Array<{ name: string }> } }).result.tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(["canvas_get_state", "canvas_get_selection", "canvas_receive_generated_asset"]));
  });
});
