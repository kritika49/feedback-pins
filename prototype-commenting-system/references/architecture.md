# Architecture

## Components

```
┌──────────────────────── prototype page ────────────────────────┐
│  app (untouched)                                               │
│                                                                │
│  comment layer  ── Shadow DOM host, fixed, z-index max         │
│   ├─ context-menu listener (capture phase, document level)     │
│   ├─ composer (name + text) and draft pin                      │
│   ├─ pin layer (one pin per visible comment)                   │
│   ├─ thread popup + element highlight                          │
│   ├─ "Comments (N)" button + list panel                        │
│   ├─ context adapter  → which screen is this?                  │
│   └─ nav adapter (optional) → snap()/nav() app state           │
└───────────────┬────────────────────────────────────────────────┘
                │ fetch  GET / POST / DELETE  (poll every ~8 s)
        ┌───────▼────────┐
        │ comments API    │  serverless function or existing API
        └───────┬────────┘
        ┌───────▼────────┐
        │ shared store    │  Netlify Blobs / KV / DB table
        └────────────────┘
```

## Data flow

1. Right-click → menu → composer. The layer records the anchor (element + scroll container) and the current screen context.
2. POST to the API; the stored comment comes back with `id` and `ts`; it's added locally and rendered.
3. A render loop (~every 120 ms plus scroll/resize) recomputes each pin's position: hide if context differs, find element, compute viewport position, hide if clipped.
4. Every ~8 s, GET refreshes the list so other people's comments appear.
5. From the list: restore context (person, language, page, tab, app state) → wait for the screen to settle → scroll element into view → open thread.

## Data model

| field | meaning |
|---|---|
| `id`, `ts` | set by the server |
| `author`, `body` | required; trimmed and length-limited server-side |
| `selector`, `tag`, `snippet`, `dx`, `dy`, `label` | element anchor: CSS path, tag, first ~24 chars of text, click offset inside element, human label |
| `scroller`, `sx`, `sy` | fallback anchor: CSS path of nearest scroll container + position inside its content |
| `ctx`, `ctxLabel` | screen context key and its readable name |
| `sig` | labels of the active tabs/toggles, used when there's no element anchor |
| `view` | `location.hash` (or path) at creation |
| `nav` | app state from `__protoNav.snap()`, replayed by `nav()` |
| `app` | which app/role build it was made in (multi-app setups) |

Add fields if a project needs them (e.g. `status: open/resolved`, `replies`, `screenshot`), and whitelist them in the API.

## Integration patterns

**Single HTML file.** Inline a config `<script>` and the client before `</body>`. Keeps the file portable.

**Bundled SPA (React/Vue/Svelte).** Either add the client as a static script in `index.html`, or import it once at the app root (e.g. in `main.tsx`, guarded so it runs once). Expose `window.__protoNav` from the router/store so comments can deep-link. Don't render the layer as React components inside the app tree; it must survive app re-renders and route changes.

**Multi-page site.** Include the script in the shared layout/template. `ctx` should include the path.

**Multi-role / multi-app shell (apps in iframes, or a role selector that swaps whole apps).** Each inner app runs its own layer with a distinct `app` id; all share one API. For cross-app navigation from the list: inner app → `parent.postMessage({protoCmGo:{app,id}})`; the shell switches frame, waits for the app's ready signal, then posts `{protoCmOpen:id}`; the inner app runs `goTo` for that id. The reference client doesn't include this wiring; add it when needed.

**Generated builds (a script assembles per-role outputs).** Put the layer in the shared source that every output includes, not in one role's file, and add a post-build check that each output contains the layer's marker.

**Existing implementation.** Treat it as the baseline: diff against `examples/frontend-example.js` for missing fixes, but keep the project's storage, field names and stored comments compatible. Never migrate or rewrite stored comments without asking.
