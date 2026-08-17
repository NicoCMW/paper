# Codex Canvas bridge prototype

**Throwaway prototype.** It answers one question: can a local Canvas expose selected local images to Codex through MCP, receive a generated image through the same local bridge, preserve provenance, and place the result near the selected references?

## Run it

```bash
cd prototype/codex-canvas-bridge
python3 server.py
```

Open [http://127.0.0.1:29980/](http://127.0.0.1:29980/).

The prototype binds only to `127.0.0.1`. Its MCP endpoint is:

```text
http://127.0.0.1:29980/mcp
```

## Connect Codex

In Codex, add a custom MCP server using the Streamable HTTP transport:

- Name: `codex-canvas-prototype`
- URL: `http://127.0.0.1:29980/mcp`

Then use the Codex conversation, not a prompt field in the prototype. Try:

1. “Read the currently selected Assets.”
2. “Create a new image using the selected Assets as references, then send the generated image to the Canvas.”
3. “Group the selected Assets.”

The server exposes `canvas_receive_generated_asset`, which accepts a local path or a base64 data URL. This is the part that must be proven with the real Codex client.

## What to verify

- Finder import, drag-and-drop, paste, and multi-file import all create local Assets.
- Shift-click creates a multi-selection without visible order badges.
- `canvas_get_selection` returns Asset metadata and image content to Codex.
- Codex can call `canvas_receive_generated_asset` with the generated image.
- The new Asset is placed right, below, above, left, or in the nearest free space relative to the second selected Asset.
- Generated Asset provenance records references, instruction, timestamp, and Canvas.
- Undo and redo restore Canvas state.

State is intentionally in memory for the prototype. Imported and generated image files remain under `prototype/codex-canvas-bridge/assets/`; remove that directory when the experiment is finished.
