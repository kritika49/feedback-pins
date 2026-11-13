# Claude skills

Skills for [Claude Code](https://claude.com/claude-code) and Claude.ai.

## prototype-commenting-system

Adds shared, Figma-style review comments to an interactive prototype or web app. Reviewers right-click any element, choose **Comment**, and a numbered pin sticks to that element for everyone who opens the link. A **Comments (N)** list takes you back to the exact screen each comment was made on (same role, language, page and tab).

The skill tells Claude to inspect the project first and adapt the system to it: a plain HTML file, a React/Vue app, a multi-role dashboard or several apps in one shell. It also covers the backend (Netlify Functions + Blobs by default, with Vercel, Cloudflare, Supabase/Firebase or an existing API as alternatives) and testing across browsers and devices.

```
prototype-commenting-system/
├── SKILL.md                    workflow and principles
├── references/                 architecture, frontend, backend, context detection, testing
└── examples/                   reference client (vanilla JS) and Netlify Function
```

### Install

**Claude Code** (personal, all projects):

```sh
git clone https://github.com/kritika49/claude-skills.git
cp -R claude-skills/prototype-commenting-system ~/.claude/skills/
```

For one project only, copy it into that project's `.claude/skills/` instead.

**Claude.ai**: zip the `prototype-commenting-system` folder and upload it under Settings → Capabilities → Skills.

Then ask something like *"add right-click comments to this prototype so the client can leave feedback"*.

### One-command setup (plain HTML prototype on Netlify)

```sh
node prototype-commenting-system/scripts/install.mjs path/to/index.html --prod https://your-site.netlify.app
cd path/to && npm install && netlify deploy --prod --dir . --functions netlify/functions
```

It adds the comment layer to the HTML (safe to re-run) and writes the Netlify function, `package.json` and `netlify.toml`. Pages, routes, tabs and modals that use standard markup work straight away. Role or person switchers that don't change the URL need a small `session()` setting; see `references/context-detection.md`.

### Tests

`prototype-commenting-system/examples/test/` runs 18 checks (modals, nested modals, tabs, routes, pages, jump-to-comment) in headless Chrome.

### Known limitations of the reference implementation

- No authentication: anyone with the link can read, add and delete comments. Protect the site if the prototype is confidential.
- iOS Safari doesn't fire right-click events; the skill asks for a long-press or "comment mode" fallback when touch reviewers matter.
