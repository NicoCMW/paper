# Global local Asset library and contextual Preview

The workspace keeps one local Asset library outside individual Canvases, while Preview remains a temporary read-only view of the current Selection for YouTube or carousel contexts. This preserves reuse across Canvases without introducing a second spatial document model, and keeps presentation checks from changing the user's Canvas arrangement.

## Consequences

- Library metadata is persisted with the local workspace document and reuses the existing local image files.
- Inserting a library Asset creates a new Canvas Asset at a nearby available position.
- Preview has no independent saved state in this iteration; it follows the active Selection.
