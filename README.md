# Glyph — Waitlist Site

Single-page waitlist landing page for **Glyph**, the classroom that lives inside your notebook.
Static site (HTML/CSS/JS) — runs on GitHub Pages. Emails are stored in a Google Sheet.

## Features
- Handwriting headline animation (a pencil writes the tagline on load)
- Demo video slot (autoplays muted, click to pause, unmute button)
- Interactive Desmos graph
- Email capture stored in a **Google Sheet** (via Apps Script)

## Set up email capture (Google Sheets, free)
1. Create a Google Sheet. Row 1 headers: `A1 = Timestamp`, `B1 = Email`.
2. **Extensions → Apps Script**, paste the contents of `apps-script/Code.gs`.
3. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   Copy the **Web app URL**.
4. In `index.html`, set `SCRIPT_URL` to that URL.
5. Commit + push. Emails now land in your sheet (duplicates are ignored).

## Deploy on GitHub Pages (free)
1. Make the repo **public**.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. Live in ~1 min at `https://<user>.github.io/Glyph_waitlist/`.

## Other keys
- **Desmos** — the interactive graph uses a Desmos API key in the `<script src>`
  URL in `index.html`.
- **Demo video** — drop `demo.mp4` in this folder and uncomment the `<source>`
  line (or replace the `<video>` with a YouTube `<iframe>`).

## Run locally
Open `index.html` in a browser. Without a `SCRIPT_URL` set, the form runs in
demo mode (no email stored).
