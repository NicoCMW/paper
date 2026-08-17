# ADR-0005: Streamable HTTP compatibility for the Canvas MCP

## Status

Accepted

## Decision

The Canvas MCP endpoint remains a stateless Streamable HTTP endpoint at `/mcp`. It negotiates the protocol version requested by the client when that version is supported, returns `202 Accepted` for notifications, and returns `405 Method Not Allowed` for the optional server-to-client `GET` stream.

## Why

Codex must be able to discover the MCP server and its tools from a fresh task. The skill can prescribe the `canvas_get_state` → `canvas_get_selection` → generation → `canvas_receive_generated_asset` workflow, but it cannot make an unavailable MCP transport appear. Correct HTTP status handling and version negotiation are therefore part of the integration seam.

## Consequences

- Codex clients can negotiate `2025-03-26`, `2025-11-25`, or the legacy `2024-11-05` version used by the current adapter.
- The server does not maintain MCP session IDs because Canvas state is persisted through the local workspace store.
- If a future client requires server-to-client streaming, the same endpoint can add SSE without changing the Canvas tools or domain module.
