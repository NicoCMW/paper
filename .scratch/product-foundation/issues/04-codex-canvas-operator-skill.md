# Codex Canvas operator skill

Status: ready-for-human

Labels: ready-for-human

## Objective

Make a new Codex task reliably use the local Canvas MCP when the user refers to selected Assets or asks for image generation from Canvas references.

## Decision

The project-local skill `.agents/skills/canvas-codex/SKILL.md` is the procedural operator. The MCP adapter remains the live integration seam: it returns state and image bytes, receives generated files, persists provenance, and verifies the resulting Asset.

## Verification

- The local server is running at `http://127.0.0.1:29980`.
- Codex has the MCP registration `codex-canvas-prototype` pointing at `/mcp`.
- The skill instructs Codex to call `canvas_get_selection` before generation and to report a missing MCP separately from an empty selection.
