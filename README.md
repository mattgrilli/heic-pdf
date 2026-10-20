# Chameleon

Convert and compress images entirely in the browser — no uploads, no accounts.
Live at [ic.mattgrilli.com](https://ic.mattgrilli.com).

## What it does

- Converts HEIC, JPEG, PNG, GIF, WebP, BMP, and TIFF to JPEG, PNG, or WebP
- Compresses with a real quality slider, resize presets, and an optional target file size
- Never inflates: if the output would be bigger than the input in the same format, the original is kept
- Batch rename, rotate and watermark, camera capture, ZIP download, copy to clipboard

Every file is processed client-side; nothing is sent to a server.

## Running locally

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build (fails on type errors)
```

## Environment

| Variable | Needed for |
| --- | --- |
| `STRIPE_SECRET_KEY` | The "Buy me a coffee" donation checkout. The app builds and runs without it; only donations are disabled. |

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS with shadcn/ui components, heic2any for HEIC decoding,
JSZip for archives, Vercel Analytics. Deployed on Vercel from `main`.

## Brand

- Name: Chameleon — it changes its colors; this changes your photos' formats
- Colors: leaf green primary, amber accent, mossy neutrals (Tailwind's `gray` scale is overridden in `tailwind.config.ts`)
- Type: Bricolage Grotesque for display, Inter for body
- Art: `public/mascot.webp`, `public/logo.webp`, `app/icon.png`, `public/og.jpg`

Originally scaffolded with v0.
