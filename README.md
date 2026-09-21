# Emmanuel Church app

Prayer requests, Sunday volunteer signups, and feast/event signups for Emmanuel Church.

## Stack

- Vite + React + TypeScript (client)
- Convex (database, server functions, cron jobs)
- Clerk (auth), wired to Convex via `ConvexProviderWithClerk`
- Resend (email), sent from a Convex internal action
- Static hosting on DreamHost (same host as `emmanuel.org`, so subdomains like `app.emmanuel.org` don't need any DNS delegation), published by a GitHub Actions workflow. A Cloudflare Workers setup (`wrangler.toml`, `church.butaud.com`) still exists from an earlier iteration; see the Deployment section.

## Local development

1. `pnpm install`
2. `.env.local` needs: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_FRONTEND_API_URL`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS` (plus `CONVEX_DEPLOYMENT`/`VITE_CONVEX_URL`, written automatically by `npx convex dev`).
3. Run `npx convex dev` once to log in and create/select a Convex dev deployment.
4. Set the deployment's server-only env vars (Resend key, issuer domain, app URL — these must NOT be exposed to the browser):
   ```
   node scripts/set-convex-env.cjs
   ```
   This reads the values above out of `.env.local` and runs `convex env set` for each. **This needs to be re-run (with `--prod`, see Deployment below) any time a new deployment is created** — it's easy to set these up for dev and forget production, which fails silently (emails just don't send; see the note below).
5. In Clerk dashboard → Configure → Sessions → Customize session token, add:
   ```json
   { "email": "{{user.primary_email_address}}", "name": "{{user.full_name}}" }
   ```
   Convex identifies users by the `email` claim on the session token, so this step is required.
6. Seed default volunteer job types (Setup/Cleanup/Snacks/Communion): `npx convex run seed:seedJobTypes`
7. Promote your own account to admin once you've signed up in the app — there's no in-app way to create the first admin, do it via `npx convex data users` / the Convex dashboard, or write a one-off `internalMutation` like the app's `convex/seed.ts` file already demonstrates.
8. Run `npx convex dev` (watch mode) and `pnpm dev` in separate terminals.

## Deployment

### DreamHost via GitHub Actions (current)

`.github/workflows/deploy.yml` runs on every push to the **`release`** branch (deliberately not `main`, so pushing to `main` never touches the live site — promote by fast-forwarding/merging `main` into `release` when ready). It runs `pnpm build:production` (same Convex-deploy-then-build step as below) and rsyncs `dist/` over SSH to DreamHost, after copying `deploy/.htaccess` into it for SPA routing (DreamHost is Apache-based, so this replaces what `wrangler.toml`'s `not_found_handling` did on Cloudflare).

Configure in the GitHub repo (Settings → Secrets and variables → Actions):

**Secrets:**
- `CONVEX_DEPLOY_KEY` — a production deploy key from the Convex dashboard (same one used for Cloudflare, if that's still around)
- `DREAMHOST_SSH_PRIVATE_KEY` — private key for a keypair whose public half is authorized on the DreamHost shell user for this site

**Variables:**
- `VITE_CLERK_PUBLISHABLE_KEY` — production Clerk publishable key
- `DREAMHOST_SSH_HOST` — the SSH hostname DreamHost gives you for this user (visible in the DreamHost panel under the shell user's settings)
- `DREAMHOST_SSH_USER` — the DreamHost shell username
- `DREAMHOST_REMOTE_PATH` — target directory on the server for this subdomain (e.g. wherever `app.emmanuel.org` is configured to serve from in the DreamHost panel)

Also needs, one-time, in the DreamHost panel: the subdomain (e.g. `app.emmanuel.org`) created and pointed at that directory, with SSH access enabled for the user and its public key added. None of this touches DNS for the rest of `emmanuel.org`.

Once this is confirmed live, update `APP_URL` on the production Convex deployment (currently `https://church.butaud.com`) to the new domain, since it's used to build links in emails:
```
npx convex env set APP_URL https://app.emmanuel.org --prod
```

### Cloudflare Workers (earlier setup, may be retired)

Connect this repository to Cloudflare (Workers → Create → connect to Git) with:

- Build command: `pnpm build:production`
- Deploy command: `npx wrangler deploy`
- Build output is `dist/`, served as static assets per `wrangler.toml` (SPA fallback to `index.html`).

`pnpm build:production` runs `convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'vite build'`, which deploys the Convex functions to production first and bakes the resulting deployment URL into the client build.

Cloudflare **build environment variables** (dashboard → project → Settings → Environment variables) should only contain:
- `VITE_CLERK_PUBLISHABLE_KEY` (production Clerk publishable key)
- `CONVEX_DEPLOY_KEY` (a production deploy key from the Convex dashboard)

Everything else (`CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `APP_URL`) belongs on the **production Convex deployment** via `convex env set` (or the Convex dashboard), never in Cloudflare's build environment, since that would expose them to the client bundle. Set the Resend/APP_URL ones with:
```
node scripts/set-convex-env.cjs --prod
```
`CLERK_JWT_ISSUER_DOMAIN` (the production Clerk instance's Frontend API URL) and `CLERK_WEBHOOK_SECRET` (from Clerk's Webhooks page, once the `/clerk-webhook` endpoint is registered there) have to be set manually, since they come from the production Clerk instance rather than `.env.local`.

The production Clerk instance also needs the same session token customization as step 5 above, plus a webhook endpoint pointed at `<production-convex-site-url>/clerk-webhook` subscribed to `user.created` and `user.updated`, so profile edits (name/email) sync into the app.

**If reminder or notification emails silently don't arrive**, check `npx convex env list --prod` for all five vars above — a missing `RESEND_API_KEY`/`RESEND_FROM_ADDRESS` fails silently (logs an error, doesn't throw) rather than breaking the request.
