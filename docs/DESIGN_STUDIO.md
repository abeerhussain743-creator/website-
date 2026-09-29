# Design Studio

Generate hooks, captions, hashtags, and branded PNG designs from Brand DNA.

## Features

- 10 template families: minimal, bold, editorial, corporate, playful, luxury, quote, stat, listicle, tip
- Platform sizes: 1080×1350, 1080×1080, 1080×1920, 1200×627
- Quality critic scores hook, brand voice, clarity, value, originality, platform fit, CTA
- Edit copy / swap template / re-render
- Carousel slide selector when format is CAROUSEL

## APIs

- `POST /api/studio/generate` — structured post JSON
- `POST /api/studio/render` — PNG via Satori + resvg, stored as MediaAsset

## UI

`/app/studio`
