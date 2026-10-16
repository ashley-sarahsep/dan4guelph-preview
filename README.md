# Dan Atkinson for School Board Trustee

The campaign website for Dan Atkinson, candidate for school board trustee with
the Upper Grand District School Board in Guelph, Ontario - Wards 2, 3 and 4.
Election day is Monday, 26 October 2026.

Live at <https://dan4guelph.ca>

## What this is

One static HTML page. No build step, no framework, no bundler, no package
manager. Clone it and open `index.html`, or serve the folder with anything:

    python3 -m http.server 8000

Nothing to install, nothing to compile.

## Files

    index.html          the page
    assets/site.css     one stylesheet
    assets/site.js      one script
    assets/*.jpg        photographs, with larger copies under assets/large/
    fonts/              self-hosted woff2 files and their licences
    .nojekyll           tells GitHub Pages to serve the files as they are
    CNAME               the custom domain

## No tracking

No analytics, no tracking, no cookies, no third-party requests. The fonts are
served from this repository rather than from Google, so nothing about a visitor
is sent anywhere at all. The accessibility panel saves its settings in the
reader's own browser and nowhere else.

All of that is checkable in a browser's network tab, which is the point of
saying it.

## Accessibility

Built to WCAG 2.1 AA and tested with axe at 360px, 768px and 1280px, in every
accessibility mode the page offers.

The page is fully readable and navigable with JavaScript disabled. The script
only adds a settings panel, two copy buttons and the photograph lightbox -
nothing you need in order to read the page or reach the campaign.

The settings panel offers high contrast, larger text, OpenDyslexic, wider text
spacing, stronger focus outlines and reduced motion.

## Fonts

All three are under the SIL Open Font License, and their licence files sit
beside them in `fonts/`. Keep them there.

- **Archivo** - `fonts/Archivo-LICENSE.txt`
- **Source Sans 3** - `fonts/SourceSans3-LICENSE.txt`
- **OpenDyslexic** - `fonts/OpenDyslexic-LICENSE.txt`

## Contact

<dan4guelph@gmail.com>

---

Authorized by Dan Atkinson. Not affiliated with the City of Guelph or the
Upper Grand District School Board.
