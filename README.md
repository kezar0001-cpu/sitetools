# Buildstate

Buildstate is a construction site management platform built for Australian civil contractors. It brings together digital site sign-in, quality and inspection management, document handling, site capture, and team coordination into a single web application — replacing paper-based workflows with a fast, mobile-friendly experience that works on the tools your crew already carry.

## Features

- 📋 **Site Sign-In** — QR-code-based check-in with digital signatures and inductee records
- ✅ **ITP Builder** — Create and manage Inspection and Test Plans with checklist sign-off
- 🗺️ **Site Plan** — Interactive map layer for marking up site areas and points of interest
- 📷 **Site Capture** — Photo and note capture linked directly to sites and tasks
- 📄 **Site Docs** — AI-assisted document parsing for drawings, specs, and compliance docs
- 🏗️ **Projects & Sites** — Manage multiple projects and sites with full status tracking
- 👥 **Team Management** — Role-based access control, invite codes, and join-request workflows
- 📊 **Dashboard** — Unified overview of active sites, pending sign-ins, ITPs, and team activity

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth & Database | Supabase (Auth + Row Level Security) |
| Data Fetching | TanStack Query v5 |
| Styling | Tailwind CSS |
| Rate Limiting | Upstash Redis |
| AI | Anthropic AI SDK (Claude) |
| Deployment | Vercel |

## Getting Started

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

   See `.env.example` for all required variables (Supabase URL/keys, Upstash Redis, Anthropic API key).

3. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

The recommended deployment target is [Vercel](https://vercel.com):

1. Push the repository to GitHub.
2. Import the project in the Vercel dashboard.
3. Add all environment variables from `.env.example` under **Settings → Environment Variables**.
4. Vercel will detect Next.js automatically and deploy on every push to `main`.

Supabase migrations should be applied to your production project before first deploy.

## Licence

© Buildstate. All rights reserved. Licence terms to be confirmed.

> Deployment note: a documentation-only commit can be used to trigger a fresh Vercel deployment when needed.
