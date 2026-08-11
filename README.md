# Glyph — Waitlist Site

Single-page waitlist landing page for **Glyph**, the classroom that lives inside your notebook.

## Features
- Handwriting headline animation (a pencil writes the tagline on load)
- Demo video slot (autoplays muted, click to pause, unmute button)
- Interactive Desmos graph
- Email capture stored in **MongoDB** via a serverless function

## How the email capture works
MongoDB cannot be called safely from the browser, so emails are submitted to a
serverless function at `api/join.js`. The frontend `POST`s `{ email }` to
`/api/join`; the function inserts it into MongoDB. The connection string is a
secret env var and is never sent to the browser.

## Setup / deploy (Vercel)
1. Import this repo into **Vercel** (vercel.com/new). Because there is an `api/`
   folder, Vercel automatically runs `api/join.js` as a serverless function.
2. In **Vercel → Project → Settings → Environment Variables**, add:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `MONGODB_DB` = `glyph` (optional; defaults to `glyph`)
   The function writes to the `waitlist` collection.
3. In **MongoDB Atlas → Network Access**, allow Vercel (add `0.0.0.0/0` or
   Vercel's IPs) so the function can connect.
4. Deploy. Emails land in `glyph.waitlist`.

> Note: this needs Vercel (or Netlify Functions) — plain static hosting like
> GitHub Pages can't run the serverless function.

## Other keys
- **Desmos** — the interactive graph uses a Desmos API key in the `<script src>`
  URL in `index.html`.
- **Demo video** — drop `demo.mp4` in this folder and uncomment the `<source>`
  line (or replace the `<video>` with a YouTube `<iframe>`).

## Run locally
Opening `index.html` directly runs the form in demo mode (no email is stored).
To test the real MongoDB flow, run `vercel dev` with `MONGODB_URI` set.
