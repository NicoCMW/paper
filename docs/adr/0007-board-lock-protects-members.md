# ADR 0007: A Board lock protects its spatial contents

## Status

Accepted

## Decision

A Board has an explicit lock state. When locked, the Board cannot be moved or resized, and direct movement or resizing of any Asset whose membership points to that Board is ignored. Selection remains available so the user can discover the lock control and unlock the Board. Unlocking restores the normal independent-Asset and Board movement rules.

Creating a Board over Assets records those Assets as members immediately. The Board and Asset membership records are reconciled after structural movement operations so a Board never claims an Asset that belongs elsewhere.

## Rationale

Boards are spatial containers rather than Groups: their members remain individual Assets, but the user needs a reversible way to protect a composed arrangement while navigating the Canvas. A lock preserves that distinction without introducing a second grouping model.

## Consequences

- Existing Boards load unlocked for backward compatibility.
- The lock is represented in the domain state and therefore survives runtime restarts.
- Client controls and Codex/domain commands use the same lock invariant.
