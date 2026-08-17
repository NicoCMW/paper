---
name: canvas-codex
description: Use when a user asks Codex to read, reference, import, generate, place, or organize image Assets in the local Codex Canvas. The skill coordinates the local Canvas MCP tools and the Codex image-generation capability; it is required whenever the task mentions selected Canvas images, references, Boards, or returning a generated image to the Canvas.
---

# Canvas Codex

Use the local Canvas MCP as the source of truth for Assets. The MCP exposes the live Canvas state and image bytes; this skill supplies the operating procedure. A skill cannot inspect the ChatGPT interface or expose images by itself.

## Preconditions

1. Confirm that the Canvas MCP tools are available in the current task, especially `canvas_get_state`, `canvas_get_selection`, and `canvas_receive_generated_asset`.
2. If those tools are unavailable, report that the Canvas MCP is not loaded for this task. Ask the user to start the local runtime with `npm run dev` from the repository and start a new Codex task. Do not ask the user to re-attach images as the first recovery step.
3. Read `AGENTS.md` and the domain vocabulary in `CONTEXT.md` when changing the product. For the current implementation, the deep workspace module is under `src/domain`, local persistence is `src/server/storage.ts`, and the Codex adapter is `src/server/mcp.ts`.

## Read selected Assets

When the user refers to “los Assets seleccionados”, “las imágenes seleccionadas”, or “las referencias del Canvas”:

1. Call `canvas_get_state` to establish the active Canvas and selection IDs.
2. Call `canvas_get_selection`. This returns Asset metadata and the selected image bytes as image content blocks. Use those image blocks as the visual references.
3. Treat an empty selection as a real empty state. Say that the Canvas currently has zero selected Assets and ask the user to select them in the Canvas; do not claim that the interface is inaccessible if the MCP call succeeded.
4. Preserve the returned Asset IDs. They are the provenance references for any generated result.

## Generate and return an image

When the user asks for a new image from selected references:

1. Use the Codex image-generation capability with the image blocks returned by `canvas_get_selection` and the user’s instruction.
2. Respect requested dimensions. If the user asks for 16:9, use a 16:9 output such as 1536×864 or 1024×576.
3. After generation, call `canvas_receive_generated_asset` with:
   - `path` or `data_url` for the generated image;
   - a useful `filename`;
   - the exact user instruction in `instruction`;
   - the selected Asset IDs in `reference_ids`;
   - the generated width and height.
4. The MCP copies the bytes into the local Asset store, records `origin: "codex"` and provenance, and places the result near the references. Do not manually edit `state.json` or copy files into `.paper-data` from the agent.
5. Call `canvas_get_state` after the receive operation and verify that the new Asset exists, has the expected provenance, and is placed on the active Canvas before reporting success.

## Import or organize existing Assets

- For a local image path supplied by the user, call `canvas_import_asset` with `path` and `filename`.
- For an image already selected in the Canvas, use its returned bytes from `canvas_get_selection`; do not search Finder or invent a path.
- Use `canvas_select_assets`, `canvas_group_selection`, `canvas_undo`, and `canvas_redo` for the corresponding Canvas operations.
- Keep the user’s wording and references literal. Do not replace the Canvas workflow with a direct OpenAI API call or an external storage integration.

## Completion criteria

The task is complete only when the MCP response confirms the relevant operation and a follow-up `canvas_get_state` verifies the resulting Canvas state. If the MCP is missing, the task is blocked by the current Codex task configuration, not by missing image attachments.
