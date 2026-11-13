# Testing

Test on the **deployed URL** (comments need the API). Use the browser automation tools if available; otherwise give the user this checklist. Report what was tested, on what, and what failed, with honest wording: an untested device is "not tested", not "should work".

## Before deploy

- The script is syntactically valid (`node --check file.js` for standalone scripts) and the page loads with no console errors.
- Every output that should have comments contains the layer (search built files for `data-cm-host` or your marker). In multi-app/role builds check each one.
- The API responds: `curl <api>` → `[]` or a list; `curl -X POST -H 'Content-Type: application/json' -d '{"scroller":"html","author":"test","body":"hi"}' <api>` → `201`; delete that test comment afterwards.

## Automated baseline

`examples/test/` runs 18 checks in headless Chrome against a page with a modal, a nested modal, hidden tab panels, same-content tabs, two hash routes and a second page:

```sh
cd examples/test
node server.mjs 8766 ../comments.mjs ../frontend-example.js &
node run-tests.mjs 8766      # set CHROME=/path/to/chrome if needed
```

Run it after changing the client. For the real project, repeat the same scenarios on its own screens (manually or by adapting the runner).

## Functional

1. Right-click a button, a table cell, a card, an icon (SVG) and empty page area → menu appears at the cursor; browser menu does not.
2. Post a comment → pin appears at the click point; count on the button increases.
3. Reload → pin is still on the same element.
4. Scroll the page and any inner scroll area → pin moves with its element and hides when the element scrolls out of its container (never floats over a sticky header).
5. Resize to tablet and phone widths → pin follows the element or its visible parent.
6. Trigger a re-render (change a filter, open/close a drawer, sort a list) → pin finds its element again or hides; it is never shown on an unrelated element.
7. Switch role/person, language, page and tab → pin hides on other screens and returns when you switch back.
8. Modals: comment inside a modal → pin is on the modal; close it → pin hidden; while a modal is open, page pins under it are hidden; same for a modal opened from a modal, drawers and dropdowns.
9. Tabs: comment inside a tab → hidden on other tabs (including tabs that show the same layout/text), back when you return; content outside the tab panel is unaffected.
10. Routes and pages: a comment on one route/page doesn't show on another with the same heading.
11. Open the list from another screen and click the comment → app returns to the right person, language, page/route, tab and record, re-opens the modal (and its parent modal) it was in; element is scrolled into view, outlined and the thread is open. Repeat for a comment on another real page.
12. Delete from the popup → pin disappears for everyone after the next refresh.
13. Escape and clicking elsewhere close menus and popups; the prototype's own clicks, keyboard shortcuts and forms still work while the layer is loaded.
14. Network failure (offline in DevTools) → posting shows an error toast and keeps the typed text.

## Across users and browsers

- Two browsers (e.g. Chrome and Safari or Firefox) or a normal and a private window: a comment posted in one appears in the other within ~10 s without reload; deletes propagate.
- Names are per browser; check a different name shows correctly.
- Opened from `file://` (if the prototype is shared as a file): comments load from the `prod` URL.

## Devices

- Android Chrome: long-press opens the menu.
- iOS Safari: `contextmenu` does not fire; check the comment-mode or long-press fallback works, or tell the user touch commenting isn't available on iOS.
- Pins and popups are tappable and stay inside the viewport on a phone.

## Report back

State: URL tested, browsers/devices used, checklist results, known limitations (no auth, touch support, screens that can't be deep-linked, old comments that predate a context change), and anything left untested.
