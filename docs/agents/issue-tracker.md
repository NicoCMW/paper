# Issue tracker: Local Markdown

Issues and specifications for this repository live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The specification is `.scratch/<feature-slug>/spec.md`.
- Implementation tickets live one per file under `.scratch/<feature-slug>/issues/`, numbered from `01` in dependency order.
- Each ticket declares its blocking tickets and has a `Status:` line near the top.
- Conversation history and resolutions append to the bottom of the relevant file under `## Comments` or `## Answer`.

## Tracker operations

- When a skill says to publish an issue, create the corresponding Markdown file under `.scratch/<feature-slug>/`.
- When a skill references a ticket, read the referenced path directly.
- For wayfinding, use `.scratch/<effort>/map.md` plus one child ticket per file under `.scratch/<effort>/issues/`.
- A ticket is available when its blockers are resolved and it is unclaimed.
