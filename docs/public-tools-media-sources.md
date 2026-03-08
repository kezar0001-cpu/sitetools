# Public Tools Media Sources

This file tracks media used in the public tools experience and provides a compliance trail for replacement assets.

## Current implementation

- UI wiring now uses explicit media slots (`hero-site-team`, `hero-dashboard-summary`, `hero-qr-checkin`, `site-operations-loop`) across homepage and public tools pages.
- Current slots are wired to local files under `public/branding/*` so page layouts remain stable while source media is curated.

## Source policy

For external stock media (for example Pexels):

1. Use only assets published for commercial-friendly use.
2. Record source URL and creator profile for each downloaded asset.
3. Keep original download filename and an optimized derivative in repo.
4. Ensure alt text describes practical civil construction context (not generic startup scenes).
5. Prefer photos showing real field workflows (setout, excavation, concrete works, planning on tablet, utility trenching, etc.).

## Asset slots to finalize

| Slot key | Target file | Intended usage |
|---|---|---|
| `hero-site-team` | `public/branding/hero-site-team.jpg` | Homepage + tools library hero |
| `hero-dashboard-summary` | `public/branding/hero-dashboard-summary.jpg` | Workspace bridge sections |
| `hero-qr-checkin` | `public/branding/hero-qr-checkin.jpg` | Tool detail support panel |
| `site-operations-loop` | `public/branding/site-operations-loop.mp4` | Optional short muted support video |

## Notes

- External image fetch was not available in this execution environment, so slot wiring and copy/access refactor were implemented first.
- Once media assets are approved, replace the `.svg` references with optimized `.jpg`/`.webp` and optional `.mp4` in the same slot names to avoid component changes.
