# Internal CMS for Buildstate

## Architecture
- **Data**: `cms_pages` (page metadata + ordered `blocks` JSON), `cms_site_settings` (global nav/footer/brand/seo defaults), `cms_media` (image/video registry).
- **Rendering**: public routes load published CMS pages and render typed block components via `CmsPageRenderer`.
- **Admin**: `/dashboard/cms` for page list/create, `/dashboard/cms/pages/[id]` for block editing and publish state, `/dashboard/cms/media` for media upload/library, `/dashboard/cms/settings` for global content.

## Supported blocks
- hero
- textMedia
- featureGrid
- productCards
- howItWorks
- faq
- cta
- roadmapGrid
- demoVideo
- richText

## Extend block system
1. Add a new block type in `lib/cms/types.ts`.
2. Add validation in `lib/cms/validation.ts`.
3. Add renderer mapping in `components/cms/CmsBlockRenderer.tsx`.
4. Add template option in `createBlockTemplate` and editor dropdown.

## Draft/publish workflow
- Set page status in editor.
- Public routes only read `status = published`.
- Draft saves do not affect live pages until status is switched to `published`.

## Section operations
In page editor:
- **Add** block from dropdown.
- **Edit** block payload in JSON panel.
- **Reorder** with arrow controls.
- **Duplicate** with duplicate button.
- **Hide/show** with visibility toggle.
- **Remove** with remove button.

## Seeded pages
Migration seeds:
- homepage (`slug: ''`)
- SiteSign (`slug: tools/site-sign-in`)
- SitePlan (`slug: tools/planner`)
- global navigation/footer defaults.
