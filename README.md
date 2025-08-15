GeoGPT — Next.js (App Router)
=============================

A Geoguessr-like web game where you compete with an LLM to guess locations from Mapillary street-level imagery. This repo uses Next.js (App Router) with client components for Mapillary and Leaflet. For now, it uses fake "GPT-5" guesses from a static list.

What’s included
---------------
- Next.js app (App Router, TypeScript)
- Mapillary viewer client component
- Leaflet map for placing your guess
- Simple scoring and reveal flow
- Example data under `public/data/`
- Stub API route at `app/api/llm/route.ts` (for future OpenAI integration)

Setup
-----
1) Install dependencies:
   - `npm install`

2) Create a Mapillary client token:
   - https://www.mapillary.com/dashboard/developers → Create token (browser)

3) Configure environment:
   - Create a `.env.local` in the repo root with:
     `NEXT_PUBLIC_MAPILLARY_TOKEN=YOUR_MAPILLARY_CLIENT_TOKEN`

4) Provide locations data:
   - Copy `public/data/locations.example.json` → `public/data/locations.json`
   - If `mapillaryImageId` is missing or set to `REPLACE_WITH_REAL_IMAGE_ID`, the app will auto-fetch the nearest Mapillary image to the `answer` coordinates using your token.
   - You can also manually set `mapillaryImageId` for more control.

   Finding an image id:
   - On https://www.mapillary.com/ open a place in the viewer and use Share/URL to get the image id (a long key). Use that as `mapillaryImageId`.
   - Or via Graph API (example near Eiffel Tower):
     `https://graph.mapillary.com/images?fields=id&limit=1&closeto=2.2945,48.8584&access_token=YOUR_TOKEN`

Run
---
- Dev server: `npm run dev` → open http://localhost:3000
- Production build: `npm run build && npm start`

How to play
-----------
- The Mapillary viewer shows the street-level image for this round
- Click on the map to place your guess (click again to move it)
- Click “Submit Guess” to reveal the answer and GPT’s guess and distances
- Click “Next Round” to continue

Structure
---------
- `app/page.tsx` — main UI and game state
- `components/MapillaryViewer.tsx` — Mapillary viewer client component
- `components/GuessMap.tsx` — Leaflet map client component
- `utils/geo.ts` — haversine and formatting helpers
- `app/api/llm/route.ts` — stub API route
- `public/data/locations.json` — your rounds (copy from the example)

Notes
-----
- Mapillary tokens are intended for client use; still rotate if leaked.
- Default OSM tiles are great for demos; consider a dedicated tile provider for production.
- The stub API currently returns 501. We’ll integrate OpenAI later.
 - Image IDs: The app attempts to look up a nearby image using `answer` coordinates if none is provided, which is usually good enough but not guaranteed to be the exact spot.
