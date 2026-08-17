---
status: accepted
---

# The Canvas owns visual state and Codex owns instruction context

The local application owns Canvases, Assets, Selection, Placement, grouping, and local persistence. The user supplies instructions in the Codex conversation rather than through a prompt field in the application. Codex reads the current Selection as Codex context, performs the reasoning or generation, and requests visual changes back through the local integration.

This keeps the Canvas focused on spatial work and keeps natural-language instruction where the user already works: Codex. It also means the application must make Selection and Asset identity legible to Codex without requiring the user to copy files or restate which images are involved.

## Consequences

- The first UI needs import, selection, grouping, spatial placement, and local persistence.
- Multi-selection uses the normal modifier-click interaction; the Canvas does not need visible selection-order badges.
- The Codex-facing interface needs operations for creating Canvases, adding Assets, reading Selection, grouping, and placing results.
- The application does not need a prompt editor or Flow editor in the first version.
- The real Codex-to-Canvas image return path must be proven with a small integration prototype before the main build.
- Generated Assets retain local Provenance for their References, Codex instruction, creation time, and Canvas.
