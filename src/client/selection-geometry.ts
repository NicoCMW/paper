export type SelectionInteractionKind = "move" | "marquee" | "board" | "note" | "pan" | "resize-assets" | "resize-note" | "resize-board";

/** Selection chrome must follow any interaction that changes an item's live rectangle. */
export const selectionBoundsFollowInteraction = (kind: SelectionInteractionKind | null | undefined): boolean =>
  kind === "move" || kind === "resize-assets" || kind === "resize-note";
