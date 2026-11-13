# Backend

## API contract

Keep this contract whatever the store, so the client works unchanged:

| request | response |
|---|---|
| `GET  /comments` | `200` JSON array of all comments (client sorts by `ts`) |
| `POST /comments` with JSON body | `201` the stored comment, including server-set `id` and `ts`; `400` if `author`, `body` or `scroller` is missing |
| `DELETE /comments?id=<uuid>` | `200 {"ok":true}`; `400` for a malformed id |
| `OPTIONS` | `204` with CORS headers |

Server-side rules (all in `examples/comments.mjs`):
- **Whitelist fields** and length-limit each string; coerce numbers; never store the raw body.
- Set `id` (`crypto.randomUUID()`) and `ts` (`Date.now()`) on the server.
- Validate the delete id format.
- `Cache-Control: no-store` so polling sees fresh data.
- CORS `*` lets the same backend serve a local file or another preview domain; narrow it if the project has a fixed origin.

If the project needs more per-comment data (status, replies, app id), add it to the whitelist; otherwise the server silently drops it.

## Reference: Netlify Function + Netlify Blobs

Files: `examples/comments.mjs` → `netlify/functions/comments.mjs`, plus `examples/netlify/package.json` and `netlify.toml` (publish `.`, functions `netlify/functions`). Endpoint: `/.netlify/functions/comments`.

- One blob per comment (key = id), store `comments`, `consistency: "strong"` so a reload right after posting sees the new comment.
- GET lists keys and loads each. Fine up to a few hundred comments; beyond that, keep an index blob or paginate.
- Deploy: `npm install`, then `netlify deploy --prod --dir . --functions netlify/functions` from the linked folder. Check which Netlify account owns the site before deploying, and ask before production deploys.
- Local testing: `netlify dev` serves the function and a local Blobs sandbox.

## Alternatives

Pick what the project already uses; keep the contract above.

- **Vercel**: an API route (`api/comments.js`) on Vercel KV/Upstash Redis (hash `comments`, field = id) or Vercel Blob.
- **Cloudflare Pages/Workers**: a Pages Function on Workers KV (one key per comment, `list()` for GET) or D1.
- **Supabase / Firebase**: a `comments` table/collection. The client can talk to them directly with the anon key, but then add row-level security (insert/select/delete for anon only on that table) and swap `api()` in the client for the SDK calls. Their realtime subscriptions can replace polling.
- **Existing project API/DB**: add the three endpoints there, behind the project's auth if it has one.
- **No backend allowed**: a localStorage-only mode works for solo review but is not shared. Tell the user clearly; offer export/import JSON as a stopgap.

## Security and privacy

- The reference has **no authentication**: anyone with the URL can read, add and delete comments. Fine for review prototypes; say so to the user. If the prototype is confidential, protect the site (Netlify password/site protection, Vercel protection, Cloudflare Access) or add a shared token header checked by the function.
- Only `textContent` is ever rendered from comments (never `innerHTML`), so stored text can't inject markup. Keep it that way in adaptations.
- Don't log comment bodies in function logs.
- Comments may quote client data from the prototype; treat the store with the same care as the prototype.
