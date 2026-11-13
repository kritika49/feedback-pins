# Context detection: "which screen is this?"

A pin should show only where it was made. The URL is rarely enough: role switchers, "preview as", language, site/tenant toggles and tabs often change the screen without changing the URL, and some prototypes have no routes at all. If context is too coarse, pins leak onto the wrong screens; if it includes unstable values, pins vanish.

## The context key

The reference builds `ctx = [domain, person, role, lang, heading, route].join('|')`, plus per comment the `tabs` that control the element and a `sig` of active toggles (for page-area comments). Comments saved without the route part (older data) match any route.

- `session()` (from config) supplies domain/person/role/lang: whatever defines *whose view* is being previewed.
- `heading` is the visible page title (first `main h1`, `h1`, `main h2`, `h2`, or a configured selector), cut to 60 chars.
- `route` is `location.pathname` plus hash routes (`#/…`, `#!…`); plain `#section` anchors are ignored. Override with `route()` when the app keeps the route elsewhere (e.g. in a store) or when the path contains volatile parts.
- Tabs and modals are deliberately **not** in `ctx`: opening a modal or switching a tab doesn't hide every comment on the page, only the ones tied to them (see frontend.md, Layers and Tabs).
- `sig` is the text of up to 8 elements under `main` that are `.is-on`, `[aria-selected=true]` or `[aria-pressed=true]`. It is only required to match for comments on empty page area; element-anchored comments rely on finding the element.

## How to find the right inputs

1. Click through the prototype and list every control that changes what's on screen: role/person/preview selectors, language, site/plant/tenant, dark/light (usually *not* context), tabs, filters, drawers, selected record.
2. For each, find where the app keeps it: URL (hash/path/query), localStorage/sessionStorage (search for `localStorage.setItem`), a global store (`window.__store`, Redux, Zustand, Pinia), or only the DOM (an `aria-pressed` button, a select's value).
3. Read it the cheapest stable way. Order of preference: app store/global > URL > storage > DOM text.

Examples:

```js
// state in localStorage
session: () => {
  const s = JSON.parse(localStorage.getItem('app-state-v3') || '{}');
  return { domain: s.site, person: s.userId, role: s.role, lang: s.lang };
}
// state only in the DOM
session: () => ({
  role: document.querySelector('[data-role-switch] [aria-pressed=true]')?.textContent.trim(),
  lang: document.documentElement.lang
})
// route-based app: put the path in the heading slot
heading: '[data-page-title]'
```

## Rules

- **Use ids, not display text, where possible** (`person: 'u42'` not "Alex Doe (Team lead)"): text changes with language and copy edits.
- **Strip volatile parts**: counts ("Tickets 12"), dates, times. The reference strips trailing digits when matching nav buttons; do the same for headings that include counts.
- **Version keys**: prototypes often bump their storage key (`state-v11` → `v12`) when seed data changes. If `session()` reads a stale key, every comment looks like it's on another screen. Read the key from the same constant the app uses, or match the newest `^app-state-v\d+$` key.
- **Don't include**: theme, window size, scroll position, open tooltips, form field values.
- **Multi-app**: add the `app` id so identical page names in two apps don't collide.
- **Changing the context format later** orphans existing comments. Keep old comments reachable: map them with a legacy table (the reference has `LEGACY_PAGES` for comments that only stored `view`), and never rewrite stored data without asking.

## Navigating back

The context is also what `goTo` restores. For each input you used, make sure there's a way to set it: `__protoNav.switchPerson`, `__protoNav.nav({lang})`, the hash, or clicking the matching control. If one can't be restored automatically, the list should still open the comment's screen as far as possible and say what's different (the reference toasts).
