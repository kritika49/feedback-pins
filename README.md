# Feedback Pins

**Let clients and teammates leave comments directly on your prototype, pinned to the exact button, card or table cell they're talking about.**

Right-click anything → **Comment** → a numbered pin appears there for everyone who opens the link. A **Comments (N)** button lists every comment, and clicking one takes you straight back to where it was made, on the right page, tab and modal.

It works on interactive HTML prototypes, React/Vue apps, multi-role dashboards and other web apps. It comes as a **skill for [Claude Code](https://claude.com/claude-code) / Claude.ai**: you ask Claude to add it, and Claude adapts it to your project. For a plain HTML prototype on Netlify there is also a one-command installer.

---

## What reviewers see

| They do | They get |
|---|---|
| Right-click any element and choose **Comment** | A box for their name (asked once) and the comment; Cmd/Ctrl+Enter sends |
| Send it | A numbered pin on that element, visible to everyone within about 8 seconds |
| Scroll, resize, switch page/tab/role/language | Pins stay on their element and only show on the screen they were made on |
| Comment inside a modal | The pin lives on the modal, hides when it closes, and page pins hide while the modal covers them |
| Click **Comments (N)** | Every comment in one list, with ones from other screens marked |
| Click a comment in the list | The app goes back to that page, tab and modal, scrolls to the spot, outlines it and opens the comment |
| Click a pin | The comment, with **Delete** and **Close** |

The comment layer runs in its own isolated layer (Shadow DOM): your prototype's styles can't break it, and it doesn't change how the prototype works.

---

## Get started

You need [Claude Code](https://claude.com/claude-code) (terminal, desktop or VS Code) or Claude.ai, and somewhere to host the prototype. Netlify is the default.

### 1. Install the skill (once)

**Claude Code**: makes it available in all your projects:

```sh
git clone https://github.com/kritika49/feedback-pins.git
cp -R feedback-pins/feedback-pins ~/.claude/skills/
```

To use it in one project only, copy it into that project's `.claude/skills/` instead.

**Claude.ai**: zip the `feedback-pins` folder (or use the `feedback-pins.zip` you were sent) and upload it under **Settings → Capabilities → Skills**.

### 2. Ask Claude to add it

Open your prototype's folder in Claude Code and say, for example:

> Add Feedback Pins to this prototype so the client can leave comments on it.

Claude will:

1. Look at how your prototype works: pages, routes, tabs, modals, role or person switchers, language, and how it's built and hosted.
2. Add the comment layer everywhere it's needed, and the backend that stores comments (a Netlify Function by default).
3. Set it up so it knows which screen is showing, so pins never leak onto the wrong page, tab or role.
4. Test it: adding, viewing, deleting and jumping to comments, across two browsers.
5. Ask before deploying, then tell you any limits that apply to your project.

### Or: one command, for a plain HTML prototype on Netlify

```sh
node feedback-pins/scripts/install.mjs path/to/index.html --prod https://your-site.netlify.app
cd path/to
npm install
netlify deploy --prod --dir . --functions netlify/functions
```

The installer adds the comment layer to the HTML file and creates `netlify/functions/comments.mjs`, `package.json` and `netlify.toml`. Run it again any time to update; it replaces its own block. Add `--dry-run` to preview. Pages, hash routes, tabs and modals that use standard markup (`role="tab"`, `role="dialog"`) work straight away.

| option | use |
|---|---|
| `--dir <folder>` | deploy folder, if it's not the HTML file's folder |
| `--prod <url>` | live site address, so comments also load when the file is opened from disk |
| `--app <id>` | label stored on each comment, when several prototypes share one site |
| `--config '<json>'` | extra settings, e.g. `'{"layers":".modal","tabs":".tab"}'` |
| `--dry-run` | show what would change without writing anything |

---

## When you need Claude, not just the installer

The installer can't know these things about your prototype. Ask Claude, or set them yourself (see [`references/context-detection.md`](feedback-pins/references/context-detection.md)):

- **A role, person or "preview as" switcher that doesn't change the page address.** Add a small `session()` setting that reads it. Otherwise comments show for every role.
- **Modals or tabs built without standard markup** (only custom classes like `.modal` or `.tab.active`). Name them in the `layers` and `tabs` settings.
- **Jumping back to a specific record or panel that has no address of its own.** Expose a small `__protoNav` hook from the app.
- **Hosting other than Netlify** (Vercel, Cloudflare, Supabase, Firebase, your own API). Claude writes the backend for that host, using the same API.
- **A React/Vue app, several apps in one shell, or per-role builds.** Claude mounts the layer in the right place so every screen gets it.

---

## Good to know

- **No login.** Anyone with the link can read, add and delete comments. For a confidential prototype, password-protect the site (for example with Netlify's site protection).
- **iPhone and iPad:** Safari doesn't support right-click. If reviewers use iOS, ask Claude to add a long-press or "comment mode" option.
- **Modals reopen by clicking the same button again.** A modal that opens on its own, from a keyboard shortcut or from a link can only be reopened from the list if the app exposes `__protoNav`.
- **Comment data:** comments are stored in the site's Netlify Blobs store. They stay until deleted, also after redeploys.

---

## What's in this repo

```
feedback-pins/
├── SKILL.md                      instructions Claude follows: paths, steps, "done means" checklist
├── scripts/install.mjs           one-command Netlify setup
├── examples/
│   ├── frontend-example.js       the comment layer (plain JavaScript, no dependencies)
│   ├── comments.mjs              the Netlify Function: list, create, delete comments
│   ├── netlify/                  package.json and netlify.toml for that function
│   └── test/                     test page, local server, and 18 automated browser checks
└── references/
    ├── architecture.md           how the pieces fit; setups for each kind of project
    ├── frontend.md               pins, modals, tabs, jumping to comments, touch, styling, all settings
    ├── backend.md                API, Netlify setup, other hosts, security
    ├── context-detection.md      how it decides which screen is showing, and how to adapt it
    └── testing.md                automated tests and a manual checklist
```

### Run the tests

Needs Node 22 and Google Chrome (or set `CHROME` to a Chrome/Chromium binary):

```sh
cd feedback-pins/examples/test
node server.mjs 8766 ../comments.mjs ../frontend-example.js &
node run-tests.mjs 8766
```

It checks modals, nested modals, hidden and same-content tabs, routes, a second page and jumping to comments from the list: 18 checks, all expected to print `OK`.
