# Buildstate Free Tools Layer Strategy

## Product category definition
Buildstate Free Tools is the public, no-login utility layer that sits above the logged-in Buildstate application suite.

### Role in the business
- Acquire high-intent traffic through practical civil/construction search terms.
- Deliver immediate trust through useful, fast calculators.
- Funnel users into account-based Buildstate workflows (Planner, Sign In, and upcoming modules).
- Establish monetization-ready ad inventory on public utility pages.

### Difference from logged-in SaaS modules
- **Free Tools:** Stateless, instant, anonymous, single-task pages.
- **Logged-in modules:** Multi-step workflows, saved records, collaboration, exports, and governance.

### Funnel architecture
1. User discovers a calculator via search.
2. User gets immediate value on a no-login page.
3. Contextual CTA offers project-based saved workflows.
4. User upgrades into Buildstate account and module ecosystem.

## Information architecture
- Directory route: `/free-tools`
- Individual pages: `/free-tools/[toolSlug]`
- Legacy product modules remain under `/tools`.

## Categories
- Quantity & Volume
- Materials
- Reinforcement
- Earthworks
- Geometry & Setout
- Estimating
- Conversions
- Productivity

## Launch sequencing
### Launch now (implemented)
- Concrete Volume Calculator
- Kerb Volume Calculator
- Trench Excavation Calculator
- Mesh Calculator
- Asphalt Tonnage Calculator
- Gravel / Fill Calculator
- Slope / Gradient Calculator
- Construction Unit Converter

### Launch next
- Topsoil Calculator
- Footing Calculator
- Cut / Fill Calculator
- Rebar Weight Calculator
- Chainage & Offset Helper
- Labour Hour Calculator

### Later
- Rate Build-Up Calculator
- Pipe Volume Calculator
- Additional estimating and productivity helpers

## SEO structure
- Dedicated URL per tool
- Tool-specific metadata and descriptions
- Internal links to related tools
- JSON-LD `SoftwareApplication` schema on each tool page
- Useful explanatory content: assumptions, notes, and examples

## Monetization scaffolding
- Reserved ad slot on tool detail pages (public-only surfaces)
- CTA modules for account creation and advanced modules

## How to add new tools
1. Add tool metadata and calculator logic in `lib/free-tools/catalog.ts`.
2. Ensure `status`, `category`, and funnel target fields are set.
3. Add notes/assumptions/example for SEO and trust.
4. Tool automatically appears in:
   - `/free-tools` directory
   - `/free-tools/[toolSlug]` route via static params
