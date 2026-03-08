# Public Site Media Sources and Slot Registry

This registry documents all media shown on the public homepage and defines the production-ready replacement workflow.

## Why slot-based media is used now

The execution environment blocked direct external stock downloads (`curl` to Pexels returned `403 CONNECT tunnel failed`), so the homepage now uses **stable local slot files** with complete metadata and direct replacement instructions.

This keeps the website production-safe while allowing the team to swap in approved photo/video assets without code changes.

## Slot registry

### `siteSignHeroBackground` (video)
- **Current file/link:** `https://cdn.coverr.co/videos/coverr-construction-site-at-dusk-1579/1080p.mp4`
- **Poster:** `public/branding/video-poster.svg`
- **Homepage usage:** Full navy hero section background
- **Target content:** Short looped civil operations footage (site activity / equipment / workforce)
- **Preferred final type:** Hosted `.mp4` (plus static poster)
- **Notes:** This video slot is separate from the hero card image slot.

### `siteSignHeroCardImage`
- **Current file:** `public/branding/hero-site-team.svg`
- **Homepage usage:** Right-side hero card image
- **Target content:** Product/operations visual for SiteSign
- **Preferred final type:** `.webp` or `.jpg`
- **Notes:** Dedicated upload/link allocation for the hero card image only.

### `siteSignHero`
- **Current file:** `public/branding/hero-site-team.svg`
- **Homepage usage:** SiteSign card/supporting image slot
- **Target content:** QR sign-in at a real civil project gate / entry point
- **Preferred final type:** `.webp` or `.jpg` (plus optional hero video poster)
- **Alt text intent:** Site attendance, supervision, project access records

### `sitePlanWorkflow`
- **Current file:** `public/branding/hero-dashboard-summary.svg`
- **Homepage usage:** SitePlan product card
- **Target content:** Planner/engineer reviewing programme and progress on tablet or laptop near site plans
- **Preferred final type:** `.webp` or `.jpg`
- **Alt text intent:** Planning workflow, programme control, daily delivery tracking

### `workspaceApps`
- **Current file:** `public/branding/hero-qr-checkin.svg`
- **Homepage usage:** Workspace apps ecosystem section
- **Target content:** Team coordination context (site diary, checks, inspections, field updates)
- **Preferred final type:** `.webp` or `.jpg`
- **Alt text intent:** Connected apps across field and office teams

## License and compliance checklist for final assets

For each final replacement asset, capture:

1. Provider (Unsplash / Pexels / licensed internal photo bank)
2. Asset URL
3. Creator name and profile URL
4. License page URL
5. Download date and internal approver
6. Optimized output filenames committed under `public/branding/`

## Replacement steps

1. Export optimized media into `public/branding/` using same slot filenames (or update only `lib/publicSiteMedia.ts`).
2. Keep width/height values updated in `lib/publicSiteMedia.ts`.
3. Keep context-specific alt text focused on practical civil operations.
4. Re-run `npm run lint` and visual QA screenshot.
