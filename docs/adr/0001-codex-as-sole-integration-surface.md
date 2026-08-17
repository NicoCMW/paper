---
status: accepted
---

# Codex is the sole integration surface

The local application will not browse the Internet or call external APIs for its own workflows. Codex is the only external agent that searches, retrieves, or generates content, then asks the local application to receive, arrange, and persist the resulting Assets. This keeps the application's responsibility focused on the local visual workspace and makes the Codex-facing interface the primary seam.

The exact local protocol remains a design question, but it must be operated through Codex rather than by a direct application-to-provider integration.

## Consequences

- The application must have a small, stable interface for Canvas and Asset operations.
- Internet access and provider credentials belong outside the application core.
- A flow cannot assume that the application itself can fetch remote content.
- Image generation returns an Asset to the local workspace; it is not an application-owned provider call.
