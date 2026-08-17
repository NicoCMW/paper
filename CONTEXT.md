# Visual workspace

This project is a private, local visual workspace for arranging image assets and directing creative work through Codex.

## Language

**Canvas**:
An independent spatial workspace that holds a visual arrangement and the assets belonging to it.
_Avoid_: campaign, camba

**Asset**:
A visual item that can live on a Canvas, such as an imported image or a generated image.
_Avoid_: file, picture

**Reference image**:
An Asset deliberately selected as input or inspiration for a new image generation.
_Avoid_: source file

**Selection**:
One or more Assets currently designated for an operation.
_Avoid_: highlighted files

**Multi-selection**:
A Selection containing multiple Assets, created through the Canvas's normal modifier-click interaction.
_Avoid_: ordered selection badges

**Import**:
The act of turning an image from Finder, the clipboard, or a multi-file picker into a local Asset managed by a Canvas.
_Avoid_: upload

**Codex context**:
The selected Assets and the information needed for Codex to understand and reference them during a conversation.
_Avoid_: prompt field

**Placement**:
The position and spatial relationship of an Asset within a Canvas.
_Avoid_: upload location

**Placement anchor**:
The second Asset selected in an operation; new Assets are placed relative to it.
_Avoid_: target file

**Placement fallback**:
The ordered search used when placing a new Asset: right, below, above, left, then the nearest available space.
_Avoid_: manual coordinates

**Provenance**:
The local record of the References, Codex instruction, creation time, and Canvas associated with a Generated Asset.
_Avoid_: generation log

**Flow**:
A repeatable, user-defined sequence of operations that Codex can carry out against a Canvas and its Assets.
_Avoid_: macro, script

**Codex action**:
A request from Codex to inspect or change the local visual workspace on the user's behalf.
_Avoid_: API call

**Generated Asset**:
An Asset produced by Codex from one or more selected Reference images and an instruction supplied in the Codex conversation.
_Avoid_: export
