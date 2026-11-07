# 395 Squadron Website (2026–2027)

The website for **395 Edmonton “Griffon” Royal Canadian Air Cadet Squadron**, rebuilt from the
Squarespace site at [395squadron.ca](https://www.395squadron.ca). Every page, announcement,
photo and document from that site is kept, and some new tools for cadets and parents have been added.

It is a fast, static site built with [Eleventy](https://www.11ty.dev/). Content lives in plain
text files (Markdown and YAML) so anyone can update it, including straight from the GitHub website.

---

## What’s on the site

| Page | Address | Notes |
| --- | --- | --- |
| Home | `/` | Photo slideshow, parade-night info, **upcoming events**, training highlights, latest announcement, quick links, 80th anniversary |
| Training | `/training/` | All 12 activities + scholarships & PAMRA forms |
| **Calendar** *(new)* | `/calendar/` | Month & list views, filters, event details, add-to-calendar, **subscribe feed** |
| Announcements | `/announcements/` | Every post from the old site (Fall 2024 → today) + RSS feed |
| Supply | `/supply/` | Uniform info, C3/C5 dress guides, how-to videos |
| **Parents & Cadets** *(new)* | `/parents/` | First weeks, weekly routine, absences, costs, ranks, searchable glossary |
| **Contact** *(new)* | `/contact/` | Map, **absence report tool**, places we train |
| Join Now | `/join/` | Registration steps, office info, FAQ |
| 80th Anniversary | `/80th-anniversary/` | Event recap + keepsakes |
| Squadron History | `/squadron-history/` | Full history, former COs, trips, achievements, PDF |
| Newsletters | `/newsletters/` | All alumni newsletters (2011 → 2026) |
| Alumni Gallery | `/gallery/` | 40 archive photos with a full-screen viewer |
| Join Alumni | `/join-alumni/` | Alumni sign-up form |

### New features at a glance
- **Squadron calendar** – the monthly announcements said “the schedule is in the calendar on the
  squadron website”; now there really is one. Parents can **subscribe** once (Google, Apple, Outlook) and
  new events appear on their phone automatically. Each event can also be added individually.
- **One source of truth** – events are entered once (`src/_data/events.yaml`) and appear in the
  calendar, the subscription feed, the home page “Coming up” list *and* the monthly announcement.
- **Absence reporter** – fills in Rank / Name / Date and opens the parent’s email or text app with the
  message ready to send to the squadron (nothing is sent by the website itself).
- **Parents & New Cadets guide** – what to wear, who to ask, a typical week, air cadet ranks and an A–Z of cadet acronyms.
- **Site-wide alert banner** for cancellations or stand-downs, and a **waitlist switch** for recruiting.
- **Old links keep working** – every old Squarespace announcement URL (and `/s/…` document link)
  redirects to its new home.
- Mobile-friendly, dark mode, print-friendly announcements, accessible (keyboard, screen-reader labels),
  RSS feed, sitemap and search-engine metadata.

---

## Editing the site

You can edit any file directly on GitHub: open the file, click the ✏️ pencil, make your change and
**Commit changes**. The site rebuilds and publishes itself in about a minute (see *Publishing* below).
If something is wrong (e.g. a typo in a YAML file) the build fails and the live site stays as it was –
check the **Actions** tab for the error message.

### Post the monthly announcement
1. Go to `src/announcements/posts/` and copy the newest file, e.g. `2026-10-31-november-2026.md`.
2. Name the new file `YYYY-MM-DD-month-year.md` (the date is the posting date), e.g. `2026-11-30-december-2026.md`.
3. Update the top section (“front matter”):
   ```yaml
   ---
   title: "December 2026"
   date: 2026-11-30
   summary: "One or two sentences shown on the home page and announcement list."
   author: "Your Name"
   ---
   ```
4. Write the announcement in [Markdown](https://www.markdownguide.org/cheat-sheet/) (`**bold**`, `- bullet`, `[link text](https://…)`).
5. Where you want the month’s schedule to appear, put:
   ```
   {% monthSchedule "2026-12" %}
   ```
   It lists every December event from the calendar automatically – no need to type the events twice.

### Add or change calendar events
Edit `src/_data/events.yaml`. Instructions and a template are at the top of the file. Example:
```yaml
- title: Regular Training Night – All Cadets
  date: 2026-12-01
  start: "18:15"        # 24-hour time, in quotes
  end: "21:15"
  location: nonsuch     # key from src/_data/locations.yaml, or any text
  category: training    # key from src/_data/categories.yaml
  who: All cadets to attend.
  dress: FTU
```
- Leave out `start`/`end` for an all-day item (deadlines, stand-downs).
- Add `endDate:` for multi-day events (FTX weekends).
- Add `cancelled: true` to cancel an event without deleting it.
- Times are Edmonton local time.

### Show an alert banner (cancellations, stand-down, weather)
In `src/_data/site.json` set `"alert"` → `"show": true` and edit the `message`. `tone` can be
`info`, `warning` or `urgent`. The banner hides itself after the `expires` date.

### Recruiting / waitlist
In `src/_data/site.json` set `"recruiting"` → `"open": false` to show the waitlist message on the
Home and Join pages. Set it back to `true` when registration reopens.

### Contact details, parade night, social links
All in `src/_data/site.json` – they update everywhere on the site at once.

### Add a newsletter
Upload the PDF into `src/s/`, then add a line at the **top** of `src/_data/newsletters.yaml`.

### Add gallery photos
Put the photo (max ~1400 px wide) in `src/assets/img/gallery/` and a small copy (~640 px wide, same
file name) in `src/assets/img/gallery/thumbs/`, then add it to `src/_data/gallery.yaml` with a caption.
Also add its thumbnail size to `src/_data/gallerySizes.json`.

### Other content
| What | File |
| --- | --- |
| Training activities | `src/_data/training.yaml` |
| Supply how-to videos | `src/_data/supplyVideos.yaml` |
| Glossary of cadet terms | `src/_data/glossary.yaml` |
| Former COs, trips, achievements | `src/_data/history.yaml` |
| Navigation menu | `src/_data/navigation.json` |
| Page text | `src/*.njk` (e.g. `src/join.njk`) |

### Join Alumni form
By default, submitting the form opens the visitor’s email app addressed to the Alumni Association
(`395alumn@telus.net`). To receive submissions directly instead, create a free form at a service such as
[Formspree](https://formspree.io) and paste its endpoint URL into `src/_data/site.json` →
`"forms"` → `"alumniEndpoint"`.

---

## Working on your computer (optional)

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install     # once
npm start       # live preview at http://localhost:8080 – refreshes as you edit
npm test        # full build + check every internal link
```

---

## Publishing

`.github/workflows/deploy.yml` builds the site, checks all links and publishes it with **GitHub Pages**
whenever changes reach the `main` branch. Pull requests are built and checked but not published.

**One-time setup:** repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site will first appear at `https://<github-user>.github.io/395-Squadron-Website-2026-2027/`
(the build adjusts links for that sub-folder automatically).

**Moving www.395squadron.ca over from Squarespace:**
1. In **Settings → Pages → Custom domain**, enter `www.395squadron.ca`.
2. At the domain registrar, point `www` to GitHub Pages with a `CNAME` record to `<github-user>.github.io`
   (see [GitHub’s guide](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. Make sure `"url"` in `src/_data/site.json` matches the domain (it’s used for the calendar
   subscription link, RSS feed, sitemap and social-media previews).

The site is plain HTML/CSS/JS in `_site/` after `npm run build`, so it can be hosted anywhere
(Netlify, Cloudflare Pages, any web server) if you prefer.

---

## Project layout

```
src/
  _data/            ← most content lives here (YAML/JSON)
  _includes/        ← page layouts, header, footer
  _lib/             ← small helpers (dates/time zones, icons)
  announcements/    ← announcement posts (Markdown) + list page + RSS feed
  assets/           ← CSS, JavaScript, images
  s/                ← PDFs and Word documents (same paths as the old site)
  *.njk             ← one file per page
scripts/check-links.mjs   ← link checker used by `npm test` and the deploy workflow
eleventy.config.js        ← site build settings
```

Times are converted using the `America/Edmonton` time zone database, so calendar subscriptions show
the right time on any phone.
