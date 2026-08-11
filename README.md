# Glyph — Waitlist Site

Single-page waitlist landing page for **Glyph**, the classroom that lives inside your notebook.

## Features
- Handwriting headline animation (a pencil writes the tagline on load)
- Notebook mockup showing the circle-to-answer feature
- Demo video slot (autoplays muted, click to pause, unmute button)
- Interactive Desmos graph
- Email capture wired to Supabase

## Setup before going live
1. **Supabase** — create a `waitlist` table with a text `email` column and an INSERT policy for the `anon` role, then paste your project URL + anon key into the CONFIG block in `index.html`.
2. **Desmos** — get a free API key at https://www.desmos.com/api and swap it into the Desmos `<script src>` URL.
3. **Demo video** — drop `demo.mp4` in this folder and uncomment the `<source>` line (or replace the `<video>` with a YouTube `<iframe>`).
4. **Deploy** — Netlify Drop or `vercel`.

## Run locally
Just open `index.html` in a browser.
