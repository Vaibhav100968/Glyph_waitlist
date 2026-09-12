# Glyph — Waitlist Site

Single-page waitlist site for **Glyph**, the classroom that lives inside your notebook.
Static (HTML/CSS/JS), served by GitHub Pages at [glyphedu.tech](https://glyphedu.tech). Emails land in a Google Sheet.

## Layout

```
index.html        the page
privacy.html      privacy policy (shares css/site.css)
css/site.css      all styling — paper/ink palette, type, motion
js/site.js        behaviour: word-stagger, reveals, film, steps rail, form
js/lenis.min.js   vendored smooth scroll (lenis, MIT)
fonts/            self-hosted woff2: Instrument Serif, Geist (variable), Space Mono
video/nib.mp4     hero: the fountain-pen macro from the film (1.5 s, plays once, 0.6 MB)
video/nib-end.jpg the macro's last frame — the hero still for reduced motion and blocked autoplay
video/film.mp4    the full GlyphInk film, 1440×1080 with audio (13 MB, loaded lazily)
video/film-720.mp4 the same film at 960×720 (4 MB) — served on phones and to Data Saver
img/app/          app plates + the Blender object render (from ../glyph/Glyph/out/plates and blender/out)
img/kit/          the toolkit gallery's images, each cut to its own subject
img/*.jpg         the original September screenshots the kit crops come from
img/og.jpg        social preview (1200×630)
apps-script/      Google Apps Script that stores emails + sends the confirmation
```

No third-party requests: fonts, video and scripts are all served from this repo (the privacy page promises no trackers).

## Design

The brief and rubric the page follows live in the build notes ("Ink on paper"): paper `#F5F2EC`, ink `#161512`,
Instrument Serif for display, Geist for UI, Space Mono for `( LABELS )`, one easing (`cubic-bezier(.22,1,.36,1)`),
reveals that rise from blur, the nib video as the hero, a full-bleed ink block for the stance, and an edge-to-edge
wordmark cropped at its baseline to close. Keep colour out of the chrome, and keep boxes off the page: the toolkit
is an editorial gallery of captioned images, not a card grid.

## Email capture (Google Sheets, free)
1. Google Sheet, row 1 headers: `A1 = Timestamp`, `B1 = Email`.
2. Extensions → Apps Script, paste `apps-script/Code.gs`, deploy as a Web app (execute as me, anyone can access).
3. Put the Web app URL in `SCRIPT_URL` at the top of the email-capture block in `js/site.js`.

## Regenerating media
- Hero nib: `ffmpeg -framerate 60 -i ../glyph/Glyph/blender/out/macro_ink/f_%04d.png -vf "crop=1920:1080:0:200,format=yuv420p" -c:v libx264 -crf 20 -movflags +faststart video/nib.mp4`
- Film: `ffmpeg -i ../glyph/Glyph/out/GlyphInk_1x1_scored_share.mp4 -vf scale=1440:1080 -c:v libx264 -crf 23 -c:a aac -b:a 128k -movflags +faststart video/film.mp4`
- OG image: open `index.html?og` at 1200×630 and screenshot it.
- Object plate: `blender/scene_web.py` (a copy of the film's scene with a `device_web` camera) renders it; the render is then cropped to 2200×1120 and warmed toward paper with ffmpeg `eq`/`colorbalance`.

## Run locally
Any static server works, e.g. `python3 -m http.server 8765` then open http://localhost:8765/.
Without a `SCRIPT_URL` the form runs in demo mode (no email stored).
