# Visual direction: Codex Canvas

## Intent

Codex Canvas is a quiet spatial editor for visual work. The interface should feel like a dark working surface with a small number of precise tools. The supplied Paper screenshots are visual references only; they are not implementation instructions.

The product should feel close to Paper's editing posture: the Canvas dominates, the toolbar is narrow, Boards are simple white work surfaces, and controls appear only when they help with the current Selection.

## Screen composition

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  [ Canvas name ▾ ]                                      [ 100% − + Fit ] │
│                                                                         │
│  ┌───┐                                                                  │
│  │   │                 dark flat Canvas surface                         │
│  │   │       ┌──────────── Board title                                  │
│  │   │       │  ┌────────┐  ┌────────┐                                  │
│  │   │       │  │ Asset  │  │ Asset  │                                  │
│  │   │       │  └────────┘  └────────┘                                  │
│  │   │       └────────────────────────                                  │
│  └───┘                                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

- Top-left: compact dark Canvas switcher.
- Left edge: icon-only tool strip with Select, Pan, Board, Import, and Zoom.
- Top-right: percentage, plus, minus, and Fit.
- Center: flat dark Canvas with no visible grid.
- Boards: white, small corner radius, light title above, no decorative effects.
- Assets: image-only by default; name and dimensions appear on hover or selection.
- Selection: thin light-blue outline, with contextual actions beside it.
- No permanent inspector or right sidebar.

## Visual tokens

- Canvas: `#2D2D2D`.
- Canvas chrome: `#252525` and `#383838`.
- Board: `#FFFFFF`.
- Primary text: `#F3F3F3`.
- Muted text: `#9D9D9D`.
- Selection: `#8CB9FF`.
- Selection action surface: `#202020` with a restrained light edge.
- Board radius: `6px`.
- Canvas switcher radius: `8px`.
- Toolbar width: narrow and fixed; icons carry the meaning, tooltips carry the label.

## Interaction posture

- Empty-space drag creates marquee selection.
- `Shift + click` adds or removes Assets from the Selection.
- `Space + drag` and the Pan tool move the Canvas viewport.
- Dragging an Asset moves it.
- Corner handles resize one Asset or a Multi-selection from the geometric center while preserving image proportions.
- A Board is created by dragging the Board tool.
- `Create Board` around a Multi-selection creates a white Board with an interior margin.
- Group, Create Board, Duplicate, and Delete appear in the contextual Selection toolbar.

## Deliberate omissions

- No prompt composer inside the Canvas yet.
- No permanent right inspector.
- No decorative grid.
- No text, pen, connector, or free-form shape tools in the first product slice.
- No external integrations or remote persistence.

## Visual acceptance

The first real frontend is acceptable when a user can identify the current Canvas, move around a dark surface, create a white Board, place and resize Assets, select by click or marquee, and perform contextual actions without leaving the Canvas or opening a permanent side panel.
