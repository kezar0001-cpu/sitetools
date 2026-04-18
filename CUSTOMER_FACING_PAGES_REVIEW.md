# Customer-Facing Pages Review Report

**Date:** April 18, 2026  
**Scope:** All public-facing marketing pages, module landing pages, tools directory, authentication, and legal pages  
**Review Type:** Comprehensive (UI/UX, Content, Technical)

---

## Executive Summary

The Buildstate customer-facing pages are **well-architected with strong visual consistency** and effective messaging for the civil construction audience. The codebase demonstrates good Next.js patterns with proper server/client component separation. However, there are **opportunities for improvement** in color palette consistency, accessibility, and conversion optimization.

**Overall Grade: B+ (Good with room for polish)**

---

## Critical Issues (Fix Immediately)

### 1. Color Palette Inconsistency — Pricing Page
**Severity:** High  
**Location:** `app/(public)/pricing/page.tsx`

**Issue:** The pricing page uses `slate-*` color palette while the entire rest of the site uses `zinc-*`. This creates visual jarring when navigating between pages.

**Evidence:**
```tsx
// Pricing page uses slate (wrong)
<div className="bg-zinc-900 min-h-screen">  // Background is zinc
  <div className="bg-zinc-950 rounded-3xl border border-slate-200 p-8">  // Border is slate
    <p className="text-slate-400">  // Text is slate
```

**Fix:** Replace all `slate-*` with `zinc-*` equivalents in pricing page:
- `slate-200` → `zinc-200`
- `slate-400` → `zinc-400`
- `slate-100` → `zinc-100`
- `bg-slate-100` → `bg-zinc-100`
- `text-slate-600` → `text-zinc-600`

---

### 2. Login Page Color Inconsistency
**Severity:** High  
**Location:** `app/(public)/login/LoginClient.tsx`

**Issue:** Login page uses `slate-*`, `gray-*`, and `zinc-*` mixed together.

**Evidence:**
```tsx
<div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-4 py-20">  // gray
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-gray-200/50">  // gray
        <h1 className="text-2xl font-black text-slate-900">  // slate
```

**Fix:** Standardize to `zinc-*` palette matching the rest of the site.

---

### 3. Missing Alt Text on Critical Images
**Severity:** High (Accessibility)  
**Location:** `components/modules/ModulePageTemplate.tsx`

**Issue:** Hero images have `alt=""` and `aria-hidden="true"`, making them invisible to screen readers.

**Evidence:**
```tsx
<img
  src={hero.heroImage.src}
  alt=""           // Empty alt
  aria-hidden="true"  // Hidden from screen readers
  className="absolute inset-0 h-full w-full object-cover"
/>
```

**Fix:** Use the provided `hero.heroImage.alt` prop:
```tsx
<img
  src={hero.heroImage.src}
  alt={hero.heroImage.alt}  // Use the actual alt text
  className="absolute inset-0 h-full w-full object-cover"
/>
```

---

## High Priority Issues

### 4. Privacy/Terms Pages Don't Match Site Design
**Severity:** High  
**Location:** `app/(public)/privacy/page.tsx`, `app/(public)/terms/page.tsx`

**Issue:** Legal pages use white background (`bg-white`) and `slate-*` colors, completely breaking from the dark `zinc-950` theme used throughout the site. This looks like a different website.

**Evidence:**
```tsx
// Current - doesn't match site
<main className="bg-white py-16">
  <h1 className="text-3xl font-black tracking-tight text-slate-900">
```

**Fix:** Apply consistent dark theme:
```tsx
<main className="bg-zinc-950 min-h-screen py-16">
  <h1 className="text-3xl font-black tracking-tight text-zinc-50">
```

---

### 5. Email Address Inconsistency
**Severity:** Medium-High  
**Location:** `app/(public)/contact/page.tsx`, `app/(public)/privacy/page.tsx`, `app/(public)/terms/page.tsx`

**Issue:** Contact page shows `admin@buildstate.com.au` but privacy/terms reference `support@buildstate.com`.

**Evidence:**
```tsx
// contact/page.tsx
<a href="mailto:admin@buildstate.com.au">admin@buildstate.com.au</a>

// privacy/page.tsx
<a href="mailto:support@buildstate.com">support@buildstate.com</a>
```

**Fix:** Standardize on one email address across all pages.

---

### 6. Free Tools Page Visual Disconnect
**Severity:** Medium  
**Location:** `app/(public)/free-tools/page.tsx`

**Issue:** Free tools uses `bg-slate-50` (light theme) while the rest of the marketing site is dark. This may be intentional to distinguish tools from marketing, but the transition is jarring when coming from dark pages.

**Evidence:**
```tsx
<div className="bg-slate-50 min-h-full py-12">  // Light background
  <section className="rounded-2xl bg-slate-900 text-white p-7">  // Dark card
```

**Recommendation:** Consider adding a theme toggle or transition animation, OR add a visual indicator that you're entering the "tools" section.

---

## Medium Priority Issues

### 7. Navbar Hover State Inconsistency
**Severity:** Medium  
**Location:** `components/layout/PublicNavbar.tsx`

**Issue:** "Get started free" CTA in navbar doesn't have the same hover scale effect as other primary CTAs on the site.

**Evidence:**
```tsx
// Navbar CTA - missing hover:scale-105
<Link href="/login?signup=1" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-amber-200 shadow-sm transition-all hover:scale-105 hover:bg-black">
```

Wait, this one actually HAS the scale. Let me re-check.

Actually the navbar is fine - the CTA buttons are consistent. Moving on.

---

### 8. Module Template Text Contrast Issue
**Severity:** Medium (Accessibility)  
**Location:** `components/modules/ModulePageTemplate.tsx:357`

**Issue:** Comparison table header uses `text-slate-400` on a dark background, which may not meet WCAG AA contrast requirements.

**Evidence:**
```tsx
<p className="text-xs font-black uppercase tracking-widest text-slate-400">Scenario</p>
```

**Fix:** Use `text-zinc-400` for consistency, or increase to `text-zinc-300` for better contrast.

---

### 9. No Focus Visible States on Mobile Menu
**Severity:** Medium (Accessibility)  
**Location:** `components/layout/PublicNavbar.tsx`

**Issue:** Mobile menu links don't have visible focus indicators for keyboard navigation.

**Fix:** Add `focus-visible:ring-2 focus-visible:ring-amber-400` to mobile menu links.

---

### 10. Missing Structured Data / JSON-LD
**Severity:** Medium (SEO)  
**Location:** All pages

**Issue:** No structured data for:
- Organization info
- Product modules (SoftwareApplication)
- Pricing (Offer)
- FAQ pages

**Fix:** Add JSON-LD structured data to improve search result appearance.

---

## Low Priority / Polish Items

### 11. Testimonial Data is Hardcoded
**Severity:** Low  
**Location:** `app/(public)/page.tsx:154-170`

**Issue:** Testimonials are static array in code. Hard to update without deployment.

**Evidence:**
```tsx
const TESTIMONIALS = [
  {
    quote: "Replaced our paper sign-in book the first day...",
    name: "Site Supervisor",  // Generic, not real
    company: "NSW Civil Contractor",  // Generic, not real
  },
```

**Recommendation:** Consider moving to CMS for easier updates and real customer quotes.

---

### 12. Module Page Template Comparison Table Header Color
**Severity:** Low  
**Location:** `components/modules/ModulePageTemplate.tsx:357`

**Issue:** Uses `text-slate-400` instead of `text-zinc-400` for consistency.

**Fix:** Replace `slate` with `zinc`.

---

### 13. Free Tools Featured Cards Missing Visual Hierarchy
**Severity:** Low  
**Location:** `app/(public)/free-tools/page.tsx:55-62`

**Issue:** Featured tools cards don't have distinct visual treatment compared to directory cards.

**Fix:** Add subtle amber accent or border to distinguish featured tools.

---

## Positive Findings (What's Working Well)

### 1. Strong Component Architecture
The `ModulePageTemplate` component (`components/modules/ModulePageTemplate.tsx`) is an excellent example of a reusable template system with:
- Comprehensive theme system for each module (amber, blue, sky, violet, cyan)
- Consistent section structure (Hero → Demo → Features → Comparison → CTA)
- TypeScript props interface for type safety
- Clean separation of content from presentation

### 2. Good Server/Client Component Separation
- Login page correctly wraps client component in Suspense
- Module pages are async server components
- Dynamic imports for animation components (code splitting)

### 3. Consistent Module Branding
Each module has a consistent color theme maintained throughout:
- SiteSign: amber-400
- SitePlan: blue-600
- SiteCapture: sky-500
- SiteITP: violet-600
- SiteDocs: cyan-500

### 4. Responsive Design
All pages use consistent responsive patterns:
- Mobile-first breakpoints (`sm:`, `md:`, `lg:`)
- Flexible grids that stack on mobile
- Touch-friendly button sizing

### 5. Good Meta Tag Implementation
Every page has proper metadata:
```tsx
export const metadata: Metadata = {
  title: "SiteSign — Digital Site Sign-In for Construction | Buildstate",
  description: "...",
};
```

### 6. CMS Integration for Media
Pages use `resolveMediaSlot()` for CMS-managed images, allowing marketing team to update visuals without code changes.

---

## Recommendations by Priority

### Immediate (This Week)
1. Fix color palette inconsistencies (pricing, login, privacy, terms)
2. Add proper alt text to hero images in ModulePageTemplate
3. Standardize email address across all pages

### Short Term (Next Sprint)
4. Add JSON-LD structured data for SEO
5. Improve keyboard navigation focus states
6. Add loading states for CMS image fallbacks
7. Add analytics tracking to CTA buttons

### Medium Term (Next Month)
8. Move testimonials to CMS
9. Add A/B testing framework for CTA copy
10. Implement breadcrumbs for module pages
11. Add "Features" rich snippets to module pages

---

## Code Quality Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Architecture** | A | Excellent component patterns, proper template system |
| **TypeScript** | A | Good type coverage, proper interfaces |
| **Accessibility** | C+ | Missing alt text, some contrast issues, needs keyboard focus work |
| **SEO** | B | Good meta tags, missing structured data |
| **Performance** | B+ | Dynamic imports, server components, could optimize images |
| **Consistency** | C+ | Color palette inconsistencies are the main issue |

---

## Quick Win Code Fixes

### Fix 1: Pricing Page Color Standardization
```diff
- border-slate-200
+ border-zinc-200

- text-slate-400
+ text-zinc-400

- bg-slate-100
+ bg-zinc-100
```

### Fix 2: ModulePageTemplate Alt Text
```diff
- alt=""
- aria-hidden="true"
+ alt={hero.heroImage.alt}
```

### Fix 3: Privacy/Terms Dark Theme
```diff
- <main className="bg-white py-16">
+ <main className="bg-zinc-950 min-h-screen py-16">

- <h1 className="text-3xl font-black text-slate-900">
+ <h1 className="text-3xl font-black text-zinc-50">
```

---

## Conclusion

The customer-facing pages are **solidly built** with good architectural decisions. The main issues are **visual consistency** (color palette mixing) and **accessibility gaps** (alt text, focus states). These are easy fixes that will significantly improve the professional appearance and usability of the site.

The messaging is **well-targeted** to civil construction teams, and the module landing pages effectively communicate value propositions. The free tools directory is a strong SEO and lead generation asset.

**Estimated time to address all issues:** 4-6 hours
