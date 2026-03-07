# Brand Media Generation Runbook

This project is wired for AI-generated branding assets.

## Prerequisites
- `OPENAI_API_KEY` environment variable set
- Python available (`python`)
- Optional: `uv` for dependency bootstrapping

## Generate homepage photos

```powershell
$env:CODEX_HOME = "$HOME/.codex"
$imageCli = "$env:CODEX_HOME/skills/imagegen/scripts/image_gen.py"

uv run --with openai python $imageCli generate --prompt-file tmp/imagegen/hero-photo.txt --no-augment --size 1536x1024 --quality high --out public/branding/hero-site-team.png
uv run --with openai python $imageCli generate --prompt-file tmp/imagegen/qr-photo.txt --no-augment --size 1536x1024 --quality high --out public/branding/hero-qr-checkin.png
```

Optional third photo:

```powershell
uv run --with openai python $imageCli generate --prompt "Use case: photorealistic-natural\nAsset type: dashboard scene\nPrimary request: construction supervisor reviewing live attendance dashboard on rugged tablet beside site office\nConstraints: no third-party logos, no watermark" --size 1536x1024 --quality high --out public/branding/hero-dashboard-summary.png
```

## Generate homepage video

```powershell
$env:CODEX_HOME = "$HOME/.codex"
$soraCli = "$env:CODEX_HOME/skills/sora/scripts/sora.py"

uv run --with openai python $soraCli create-and-poll --prompt-file tmp/sora/hero-video.txt --no-augment --model sora-2 --size 1280x720 --seconds 4 --download --variant video --out public/branding/site-operations-story.mp4
```

## Swap from SVG placeholders to generated media

After generating PNG files, update these references in `app/(public)/page.tsx`:
- `/branding/hero-site-team.svg` -> `/branding/hero-site-team.png`
- `/branding/hero-qr-checkin.svg` -> `/branding/hero-qr-checkin.png`
- `/branding/hero-dashboard-summary.svg` -> `/branding/hero-dashboard-summary.png`

The video path is already set to:
- `/branding/site-operations-story.mp4`
