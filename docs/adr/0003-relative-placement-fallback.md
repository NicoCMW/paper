---
status: accepted
---

# Place new Assets relative to the second Selection

When an operation creates a new Asset from selected references, the second selected Asset is the Placement anchor. The Canvas tries to place the new Asset to the anchor's right, then below, then above, then to the left. If those candidate spaces are occupied, it places the Asset in the nearest available space. The user can reposition it manually afterward.

The rule keeps Codex's placement interface small: Codex only needs to create the Asset and identify the relevant Selection; the Canvas owns spatial resolution and collision avoidance.
