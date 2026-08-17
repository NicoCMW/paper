# ADR-0004: TypeScript/React local runtime

## Status

Accepted

## Decision

The first product implementation uses a TypeScript domain core, a React/Vite frontend, and a small Node local runtime. Workspace state and imported/generated assets are persisted under `.paper-data` in the local project directory.

Codex remains the only AI integration surface. The local runtime exposes the Canvas MCP endpoint and is not an OpenAI API client. The frontend talks only to the local runtime over HTTP.

## Why

- The workspace needs direct manipulation with a responsive browser UI.
- The domain rules benefit from a pure, testable module that is independent of React and HTTP.
- Local JSON plus a managed assets directory is enough for the first private product slice and keeps the persistence seam explicit.
- The MCP adapter can evolve without leaking JSON-RPC or filesystem details into the Canvas UI.

## Consequences

- The active workspace is local-only and single-user for this slice.
- Multi-Canvas storage, prompt composition, and remote integrations remain separate future modules.
- Moving to a richer local database later should replace `LocalWorkspaceStore`, not the domain model or frontend interaction model.
