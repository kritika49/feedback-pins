---
name: feedback-pins
description: Feedback Pins — add, adapt, debug or maintain shared review comments on an interactive prototype or web app. Reviewers right-click (or long-press) any element, choose "Comment", and a numbered pin sticks to that element for everyone who opens the link; a "Comments (N)" list jumps back to the exact screen, tab or modal each comment was made on. Works for plain HTML prototypes, React/Vue apps, multi-role dashboards and multi-app shells, with Netlify (one-command installer included) or another shared store. Use this whenever the user wants clients, teammates or stakeholders to leave feedback directly on a prototype, mockup, staging site or demo, asks for "comment mode", "feedback pins", "annotations", "Figma-style comments on the prototype", or reports that existing prototype comments are missing, misplaced or showing on the wrong screen — even if they don't name a backend.
---

# Feedback Pins

Shared, pinned review comments on top of an existing prototype, without changing how the prototype works. Reviewers comment on the real thing, in place, and everyone with the link sees the same comments.

## What the reviewer gets

- **Right-click → Comment** on any element (button, card, table cell, icon, empty space). They type their name once and a comment; Cmd/Ctrl+Enter sends.
- **A numbered pin** stays on that element while scrolling, resizing and re-rendering.
- **Pins only show where they belong**: same page, route, tab, language and previewed role/person. A comment made in a modal shows only while that modal is open; page pins hide while a modal, drawer or dropdown covers them.
- **"Comments (N)" button**: every comment in one list, with the ones from other screens marked. Clicking one goes back to that screen, re-opens its tab and modal, scrolls to it, outlines the element and opens the comment.
- **Shared and live**: comments appear for everyone within about 8 seconds, without reloading. Anyone can delete a comment from its popup.

## Choose a path

**A. Plain HTML prototype hosted (or to be hosted) on Netlify** → use the installer, then do steps 4, 6 and 7 below.

```sh
node scripts/install.mjs <prototype.html> --dry-run            # see what will change
node scripts/install.mjs <prototype.html> [--dir <deploy folder>] [--prod https://<site>.netlify.app] [--app <id>] [--config '<json>']
cd <deploy folder> && npm install && netlify deploy --prod --dir . --functions netlify/functions   # ask the user first
```

It inlines the comment layer before `</body>` between `<!-- feedback-pins:start/end -->` markers (re-running replaces it, so it is safe after updating the skill) and writes `netlify/functions/comments.mjs`, `package.json` and `netlify.toml`. It never deploys. Pages, hash routes, tabs and modals that use standard markup work with no setup.

**B. Anything else** (React/Vue/Svelte app, multi-page site, several apps in iframes, per-role builds from a script, a host other than Netlify, or an existing comment layer to fix) → follow all steps.

## Steps

1. **Inspect the project before changing anything.** Find out:
   - the stack and build: single HTML file, bundled app, multi-page site, iframes, generated per-role outputs;
   - the hosting and a realistic backend: Netlify, Vercel, Cloudflare, an existing API/DB, Supabase/Firebase, or none;
   - how navigation works: hash routes, path routes, or in-memory state with no URL change;
   - **everything that changes the screen without changing the URL**: role/person/"preview as" switchers, language, site/tenant toggles, tabs, modals, drawers, the selected record;
   - how it renders: frequent re-renders, virtualised lists, responsive layouts;
   - whether a comment layer already exists (search for `contextmenu`, `data-cm-host`, `/comments`). If it does, you are maintaining it: read it and keep its stored comments working; don't replace it.
2. **Pick where the script goes** so it loads on *every* screen, role and app that should take comments and survives the build. → `references/architecture.md`
3. **Pick the backend.** Prefer what the project already has, and keep the same API contract whatever the store. → `references/backend.md`
4. **Tell it which screen is showing.** If the app has role/person/area switchers or language state that the URL doesn't show, add a `session()` config that reads them. Add `layers` / `tabs` config if modals or tabs don't use ARIA roles. This is the step most likely to go wrong. → `references/context-detection.md`
5. **Adapt the client** from `examples/frontend-example.js`: anchoring for the project's DOM, the `__protoNav` hook so the list can restore app state (page, record, tab), touch input if reviewers use iPhones/iPads, colours if asked. → `references/frontend.md`
6. **Test on the deployed URL**, with two browsers or users, and on touch devices if relevant. Run `examples/test/` after changing the client. → `references/testing.md`
7. **Tell the user the limits in plain words**: no login (anyone with the link can read and delete), iOS needs a long-press or comment-mode fallback, which screens can't be reopened from the list, and that older comments made before a context change may not show.

## Done means

- [ ] Every page, role and app that should take comments has the layer (each build output contains `data-cm-host`).
- [ ] A comment survives a reload and appears in a second browser.
- [ ] Pins hide on other routes, pages, tabs, roles and languages, and return when you switch back.
- [ ] Modal comments sit on the modal, hide when it closes, and the list reopens the modal.
- [ ] The list takes you to every comment's screen and opens it.
- [ ] Delete works; posting while offline shows an error and keeps the text.
- [ ] The prototype's own clicks, shortcuts and forms still work.
- [ ] Limitations reported to the user.

## Principles

- **Adapt to the project; don't make the project fit the example.** Use the app's own API, auth or database if it has one. In a React app, mount the layer once at the root, not inside components.
- **No changes to app markup are required**, but stable hooks (`id`, `data-testid`, `data-comment-anchor`) beat CSS paths when they exist.
- **A missing pin is better than a wrong pin.** If the element can't be found confidently, hide the pin and keep the comment reachable from the list.
- **The server keeps only the fields it lists.** Any new field the client sends must be added to the function's list, or it is silently dropped.
- **Keep review notes out of the prototype's own UI**, and don't change its seed data or storage keys.
- **Ask before deploying** to production or creating hosted resources, and check nobody else has deployed a newer version first.

## Files

| file | what it is |
|---|---|
| `scripts/install.mjs` | one-command setup for path A |
| `examples/frontend-example.js` | the client: menu, composer, pins, list, context detection, navigation (no dependencies; configured with `window.PROTO_COMMENTS`) |
| `examples/comments.mjs` | the Netlify Function: list, create, delete, stored in Netlify Blobs |
| `examples/netlify/` | `package.json` and `netlify.toml` for that function |
| `examples/test/` | test page (modals, nested modals, tabs, routes, second page), a server running the real function, and a headless-Chrome runner with 18 checks |
| `references/architecture.md` | how the pieces fit, the comment fields, integration per project type |
| `references/frontend.md` | anchoring, modals, tabs, rendering, list navigation, touch, styling, all config keys |
| `references/backend.md` | the API contract, Netlify setup, alternatives (Vercel, Cloudflare, Supabase/Firebase, own API), security |
| `references/context-detection.md` | how "which screen is this" is decided, and how to adapt it |
| `references/testing.md` | automated tests and the manual checklist |
