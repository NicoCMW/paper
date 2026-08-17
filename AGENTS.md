# Agent guidance

## Project workflow

- This repository is the local checkout of `NicoCMW/paper`; preserve the existing remote and work through normal Git branches and commits.
- Work items, specifications, and implementation tickets live locally under `.scratch/`, one feature directory at a time.
- Before implementing, establish the product language and decisions in `CONTEXT.md` and record hard-to-reverse choices in `docs/adr/`.
- Prefer a small, complete vertical slice that can be demonstrated or verified independently.
- Drive implementation through tests at agreed seams, run the relevant checks frequently, and review the finished diff against both the specification and repository standards.

## Deep-module design

Design for depth: put substantial behaviour behind a small interface at a clean seam.

- Use the terms **Module**, **Interface**, **Implementation**, **Depth**, **Seam**, **Adapter**, **Leverage**, and **Locality** consistently.
- Treat the Interface as everything a caller must know: types, invariants, ordering, errors, configuration, and performance expectations.
- Prefer fewer methods, simpler parameters, and more hidden complexity when that makes the module easier to use correctly.
- Keep callers and tests on the same public interface; if tests must reach into an implementation, reconsider the module shape or seam.
- Introduce an Adapter and a seam when variation is real, not speculatively. Internal seams may remain private to a module's implementation.
- Apply the deletion test: a module earns its place when removing it would spread its complexity across callers.
- Optimise for Leverage for callers and Locality for maintainers: one change, one place to understand, verify, and fix.

## Agent skills

### Issue tracker

Work items are local Markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical labels `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository with a root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
