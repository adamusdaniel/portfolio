# Portfolio v2 — organisation and editing

Develop and publish changes on `v2`. Do not update `main` without the owner's explicit approval. Keep private plaintext and passwords outside the repository and the web-server root. Access-management work is deferred; do not introduce a paid service without approval.

## Files

- `index.html`: shared shell, homepage, project views and contact form markup.
- `css/portfolio-v2.css`: the active v2 stylesheet. The other stylesheets support legacy pages.
- `js/portfolio-v2.js`: navigation, shared case-study components, filters, image preview and homepage interactions.
- `content/projects.js`: editable public cases, cards, image references and image metadata. Card titles and tags come from the matching case, so edit them in one place.
- `content/tauron/case.js`: the public English TAURON case. Its content remains separate for a future move to private access. Moving it later cannot remove copies already downloaded or stored in Git history.
- `content/media/`: extracted public images whose bytes differ from the original asset files. Other image references reuse matching files already present in the repository. Keep image contents unchanged when relocating them.
- `tools/private-projects.py`: private-source encryption helper. See `tools/PRIVATE-PROJECTS.md` for its separate workflow.

There is no build step for the site. Start `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root. Netlify publishes the selected branch; the Python server does not implement Netlify Forms.

## Shared components and data

Two layouts remain intentional: `long` for narrative case studies, and `showcase` for shorter image-led projects. Do not add unverified research, outcomes or client details to make their narratives match.

Use case `tags` from this vocabulary: Product design, UI design, Design strategy, Design systems, Web, Mobile app, Email, Accessibility. Filters use exact tags, and cards display all tags used for filtering. The case header uses the same tags.

Metadata describes what is known: Role; Client or Industry; Platforms where available; a Product website, Company website or Organisation website link where appropriate. Do not invent a client or a live product URL. Use `iOS, Android, Web` for platform lists.

`blocks` and `description` contain text, lists, headings, illustrations and occasional rich HTML. Section headings render as h2; subsections as h3. Sequential lists use the shared numbered-card style. Research statistics and process diagrams retain distinct components. Text supports trusted HTML only. Use `<strong>` for emphasis.

Illustrations use one renderer for both layouts. Provide `alt`, `caption`, `width`, and `height` on image blocks or in the shared `media` map. Captions describe what a screen shows; they must not imply a research result. Hero images and illustrations open through the same accessible preview. Tab enters image controls; Enter/Space opens the preview; Escape closes it and returns focus. The preview traps Tab between its controls.

Current layout: hero, title, introduction and metadata use the main case width; narrative content uses a centred column up to 720px, with text left aligned. More projects uses the original wider layout. Mobile-screen pairs are intentional. Test at 375, 768 and 1440px when changing the shared layout.

## Verification

```bash
python3 -B -m unittest discover -s tools -p 'test_*.py'
node --check js/portfolio-v2.js
node --check content/projects.js
node --check content/tauron/case.js
```

With Playwright and Chromium installed, start the local server, then run:

```bash
node tools/test-portfolio-browser.cjs
```

Override `PORTFOLIO_TEST_URL` for a different local port. The checks cover all 11 cases, titles/tags, filters, metadata, captions/alt text, image decoding, keyboard access, focus trapping/return, overflow and page-title restoration. They never submit contact forms. Confirm remote publication separately after pushing `v2`.
