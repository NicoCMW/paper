# ADR 0006: Persist a local catalog of named Canvases

## Status

Accepted

## Decision

The local workspace persists a Canvas catalog containing multiple named Canvases and one active Canvas. Each Canvas owns its Assets, Boards, Selection, Groups, and spatial arrangement. Creating a Canvas adds a new empty entry and activates it; switching changes the active view without mutating the other entries; renaming only changes the active Canvas name.

The catalog remains local in `.paper-data/state.json`. No remote project service or cross-Canvas Asset sharing is introduced in this slice.

## Rationale

The top-left Canvas switcher is a core part of the product language, not a placeholder. Keeping the catalog behind the domain `Workspace` interface lets the client and Codex-facing MCP adapter use the same operations while leaving persistence details in the storage adapter.

## Consequences

- Existing single-Canvas state is migrated into a one-entry catalog when loaded.
- Undo and redo are scoped to the active Canvas, so switching Canvases never leaks movement or deletion history into another Canvas.
- Canvas-level operations are exposed through both the local HTTP API and MCP.
