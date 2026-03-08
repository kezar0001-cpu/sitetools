# Public Website Media Sources

This log tracks media used in the public website and provides a clear handoff for final licensed assets.

## Current production approach

- Public pages now consume a centralized media registry in `lib/public-media.ts`.
- The homepage uses named slots for hero, SitePlan workflow, workspace app coordination, and optional support video.
- All slots currently point to local files under `public/branding/` to ensure stable rendering, performance, and deterministic builds.

## Why slot-based media now

A slot approach keeps the website launch-ready while media approvals are finalized:

1. Maintains commercial-safe operation with no hot-linked external assets.
2. Preserves alt text and source metadata in one place.
3. Allows seamless swap-in for approved Pexels/Unsplash files with no layout rewrites.

## Media slot register

| Slot key | File | Current source | License status | Intended final replacement |
|---|---|---|---|---|
| `site-sign-hero` | `public/branding/site-sign-hero-field.svg` | Buildstate local production slot | Internal placeholder slot | High-quality field photo/video still of QR check-in and supervisor tablet workflow |
| `site-plan-workflow` | `public/branding/site-plan-workflow.svg` | Buildstate local production slot | Internal placeholder slot | Planning/programme coordination photo (engineer + plans/tablet) |
| `workspace-apps` | `public/branding/workspace-apps-coordination.svg` | Buildstate local production slot | Internal placeholder slot | Team coordination photo for connected workspace operations |
| `operations-loop` | `public/branding/site-operations-loop.mp4` + `public/branding/video-poster.svg` | Reserved local media slot | Pending final licensed footage | Short muted civil-delivery loop (safe work scene, practical site context) |

## Approved sourcing checklist (Pexels / Unsplash)

When replacing slots with stock media:

1. Select assets showing civil construction delivery context (attendance board, setout, trenching, concrete, planning checks, supervision).
2. Verify commercial-use permissions from source platform terms.
3. Record creator name, source URL, and download date in this file.
4. Save original file name in `/tmp/media-sources/` (or equivalent) and optimized web derivative in `public/branding/`.
5. Keep descriptive alt text focused on work activity (not generic office scenes).

## Follow-up to finalize

- Replace slot SVGs with approved photo assets (`.webp` preferred).
- Add one final licensed support video or remove autoplay block if no video is approved.
- Update `lib/public-media.ts` source metadata with final creator + license links.
