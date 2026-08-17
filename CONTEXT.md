# Visual workspace

This project is a private, local visual workspace for arranging image assets and directing creative work through Codex.

## Language

**Canvas**:
An independent spatial workspace that holds a visual arrangement and the assets belonging to it.
_Avoid_: campaign, camba

**Asset**:
A visual item that can live on a Canvas, such as an imported image or a generated image.
_Avoid_: file, picture

**Note**:
Editable text placed directly on a Canvas. A Note is spatial, persistent, and independently selectable, with its own font size, text color, and background (including transparent); it is not an Asset, Board, or comment.
_Avoid_: comment, text file

**Text tool**:
The Canvas tool used to draw a Note rectangle and begin editing its text.
_Avoid_: annotation mode

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

**Board**:
A titled white spatial container inside a Canvas for arranging related Assets. A Board is a visual container, not a Selection or a Group; its Assets remain individually movable.
_Avoid_: group, campaign, camba

**Marquee selection**:
A rectangular Selection created by dragging over empty Canvas space; it selects the Assets intersecting the rectangle.
_Avoid_: lasso

**Canvas pan**:
Moving the visible viewport over the Canvas without moving Assets. It is performed with the hand tool or by holding Space while dragging.
_Avoid_: moving the Canvas

**Asset resize**:
Changing an Asset's displayed dimensions through its corner handles while preserving its aspect ratio by default.
_Avoid_: crop

**Canvas switcher**:
The top-left control used to list named Canvas workspaces, change the active Canvas, create one, and rename the current one.
_Avoid_: project selector

**Canvas catalog**:
The local collection of named Canvases available to this workspace. Each Canvas keeps its own Assets, Boards, Selection, Groups, and spatial arrangement.
_Avoid_: remote project list

**Asset library**:
A workspace-wide local collection of reusable Assets that can be inserted into any Canvas without depending on that Canvas's membership.
_Avoid_: asset folder, cloud library

**Preview**:
A temporary contextual view of the current Selection that shows how one or more Assets read in a YouTube or carousel surface without changing the Canvas arrangement.
_Avoid_: export, mockup

**Board creation**:
A Board is created by dragging the Board tool across the Canvas to define its size. A newly created Board has a white surface and an editable initial title.
_Avoid_: auto-generated group

**Board membership**:
An Asset belongs to a Board when it is placed inside that Board. Moving an unlocked Board moves its member Assets; moving an Asset out removes membership; moving an Asset into a Board adds membership. A locked Board keeps its boundary and member Assets together until it is explicitly unlocked. Boards do not auto-layout or clip their Assets.
_Avoid_: layer, folder

**Board lock**:
A Board lock is an explicit protection on a Board and its member Assets. While locked, the Board and its members can still be selected, but they cannot be moved or resized until the lock is removed.
_Avoid_: hidden group state

**Board title**:
The visible title of a Board is edited in place by double-clicking it.
_Avoid_: metadata label

**Selection toolbar**:
A compact floating action bar shown for a non-empty Selection. It exposes Group, Create Board, Duplicate, and Delete; it does not contain a Codex text composer in this iteration.
_Avoid_: prompt bar

**Multi-selection movement**:
Moving a Multi-selection translates all selected Assets together while preserving their relative distances.
_Avoid_: batch move

**Multi-Asset resize**:
Resizing a Multi-selection is part of the current iteration. The selection scales as one spatial arrangement from its geometric center; relative distances and individual image proportions remain preserved.
_Avoid_: batch crop

**Board resize**:
Resizing a Board changes only the Board's boundary. Its member Assets keep their displayed dimensions and positions.
_Avoid_: scale contents

**Board and Asset targeting**:
Clicking an Asset targets that Asset. Clicking empty space inside a Board targets the Board. Moving a Board moves its member Assets; moving an Asset moves only that Asset.
_Avoid_: nested selection ambiguity

**Selection-to-Board**:
Create Board from a Multi-selection creates a Board around the selected Assets with an interior margin and makes them Board members.
_Avoid_: wrapping group

**Toolbar iconography**:
The left toolbar uses icons without persistent labels. Tooltips appear on hover, and the active tool has a subtle highlighted surface.
_Avoid_: labeled toolbar

**Contextual controls**:
The Canvas has no permanent right panel. Selection actions and Asset or Board details appear close to the relevant selection only when needed.
_Avoid_: inspector sidebar

**Asset selection appearance**:
Selected Assets use a thin light-blue outline without a fill or shadow. Multi-selection uses the same outline with slightly stronger emphasis.
_Avoid_: selected card chrome

**Board appearance**:
A Board uses a white surface, a small corner radius, and a light title placed above the Board. It remains visually simple and does not use decorative effects.
_Avoid_: glass panel

**Asset appearance**:
An Asset displays its image without a permanent card or label. Its name and dimensions appear on hover or while selected.
_Avoid_: thumbnail card

**Canvas switcher appearance**:
The Canvas switcher is a compact dark capsule in the top-left, showing the current Canvas name and an icon that opens the Canvas menu.
_Avoid_: project sidebar

**Canvas empty state**:
An empty Canvas shows a discreet centered `Drop images here` hint with a secondary clipboard-paste hint.
_Avoid_: onboarding screen

**Zoom controls**:
The Canvas exposes the current zoom percentage with plus and minus controls in the fixed top-right chrome. Zoom is centered around the pointer position or the viewport center; the Canvas chrome stays fixed.
_Avoid_: zoom panel

**Layer order**:
When Assets overlap, the most recently created or moved Asset is visually in front. Explicit layer controls are not part of the current iteration.
_Avoid_: z-index control

**Canvas surface**:
The Canvas uses a flat dark-gray surface without a visible grid. Zoom controls and the current zoom percentage live in the top-right area.
_Avoid_: infinite grid
