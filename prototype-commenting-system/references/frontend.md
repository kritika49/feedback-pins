# Frontend

The reference client is `examples/frontend-example.js`. Section names below match its `// ---------- X ----------` markers.

## Isolation

- One fixed, zero-size host `<div data-cm-host>` appended to `body`, with `attachShadow({mode:'open'})`. All UI and its `<style>` live in the shadow root, so app CSS can't reach it.
- `attach()` re-appends the host if the app replaced `body` content (some SPAs do).
- Listeners use the capture phase on `document` and ignore events from inside the host (`e.composedPath().indexOf(host) !== -1`).

## Menu

- The `contextmenu` listener prevents the browser menu and shows a one-item "Comment" menu at the cursor. If the target is inside an `<svg>`, the whole SVG is the target (paths are too fragile to anchor to).
- If the app itself uses right-click (canvas editors, custom menus), don't override it globally: use a modifier (Alt+right-click), a "comment mode" toggle, or skip targets inside the app's own menu zones.

## Composer

- Records the anchor at click time: `scrollerOf(target)` (nearest scrollable ancestor), position inside it, and, unless the target is the scroller/body itself, the element's CSS path, tag, text snippet and click offset.
- Name is stored in `localStorage` (`cm-author`), wrapped in try/catch.
- Sends on button or Cmd/Ctrl+Enter; on failure shows a toast and keeps the text.

## Anchoring (finding the element again)

`findEl(c)` tries, in order:
1. The saved CSS path, if the element there still starts with the saved snippet. If it's hidden at this window size, use its nearest visible ancestor.
2. Any element with the same tag whose text starts with the snippet (handles re-ordered or re-rendered lists).
3. Same, but with digits and separators stripped (handles counts and dates that changed).

If none match, a comment that was on an element is **hidden** (not shown at a guessed spot), except when forced open from the list. Comments on empty page area use the scroll-container position, and only when the active tabs (`sig`) match.

Adapt this when:
- The project has stable attributes (`id`, `data-testid`, `data-id`): prefer them in `pathOf()`; stop climbing at the first element with a stable id.
- Text is the same on many elements (e.g. rows of "Edit"): include an ancestor's text in the snippet, or anchor to the row.
- Lists are virtualised: the element may not exist until scrolled; deep-link via `nav()` to the record instead.
- Content is in iframes or canvas: run a layer per iframe; for canvas, anchor to coordinates within the canvas plus app state.

## Rendering loop

`render()` runs on scroll (capture), resize, hashchange and a ~120 ms tick. For each comment: `locate()` → hide if context differs or not visible (`inView` checks every clipping ancestor, so pins never float over headers or outside scroll areas) → position the pin. It also repositions the open popup and draws an outline around the commented element. If the context changes while a popup is open, everything closes.

Cost is fine for dozens of comments. For hundreds, filter by `ctx` first and only run `findEl` for comments on the current screen (it already returns early on context mismatch).

## Comment list and navigation

`goTo(c)` restores the screen step by step, waiting between steps for the app to render:
1. person/area via `__protoNav.switchPerson(person, domain)`
2. language via `__protoNav.nav({lang})`
3. clear selection, then `location.hash = c.view`
4. app state via `__protoNav.nav(c.nav)`, or click the nav button whose text equals the saved heading
5. click tabs matching the saved `sig`
6. poll until context matches or the element appears, then scroll it into view and open the thread; toast if the element is gone.

### The nav adapter

For apps with internal state, expose:

```js
window.__protoNav = {
  snap: () => ({ page, area, tab, selectedId }),   // small, JSON-serialisable
  nav: (partial) => store.setState(partial),       // apply any subset of snap()'s keys
  switchPerson: (person, domain) => store.preview(person, domain)
};
```

In React, set it in a top-level effect from your router/store; in Vue/Pinia, from the root component. Keep `snap()` small: it's stored with each comment.

## Touch devices

`contextmenu` fires on long-press in Android Chrome, but **not in iOS Safari**. If reviewers use iPhones/iPads, add one of:
- a "Comment mode" toggle on the Comments button: while on, the next tap opens the composer for that element (and is prevented from reaching the app);
- a long-press handler (`touchstart` + ~500 ms timer, cancelled by `touchmove`/`touchend`).
Make pins at least 28 px and keep popups inside the viewport (`place()` clamps them).

## Styling

Styles are a single minified string in the shadow root. Change colours to match a brand if asked, but keep pins high-contrast with a white border so they show on any background. Don't run a formatter over the string concatenation.

## Configuration (`window.PROTO_COMMENTS`, set before the script)

| key | use |
|---|---|
| `api` | full URL of the comments API |
| `prod` | live origin, used when opened from `file://` |
| `app` | id of this app/role build |
| `session()` | returns `{domain, person, role, lang}` for the context |
| `who()` | short label of the current preview, shown in the list |
| `heading` | selector for the element that names the screen |
| `legacyCtx` | `[domain, person, role, lang]` the prototype opens in; used only for old comments saved without `ctx` |
| `fabBottom` | px offset of the Comments button |
