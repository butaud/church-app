# Shared ownership of the app's providers

Goal: no single person is a point of failure for maintaining the app. Every
provider below should have at least two church officers with admin access, and
each account should be isolated from anyone's personal projects.

This is the plan of record from the planning discussion on 2026-09-19/20, plus
the Azure/Entra tenant added on 2026-10-04. **Status is not tracked here** -
fill in the "Status" column as moves are completed.

## Why not just invite people to the existing accounts?

Some providers scope access per resource and some per account. Inviting someone
to the account-wide ones would expose the owner's unrelated projects and the
secrets for this app (Clerk secret key, Resend API key, Convex deploy keys).

- **Scoped to this project already:** GitHub (repo collaborators), Google Cloud (per-project IAM).
- **Account/team-wide:** Cloudflare, Convex, Clerk, Resend. Move this app into a
  dedicated container first, then invite people to that container.

## Plan per provider

| Provider | Used for | Plan | Status |
|---|---|---|---|
| GitHub | Source, `main`/`release` branches, deploy Actions workflow | Add officers as collaborators (Settings -> Collaborators). Optionally move the repo to a free GitHub org for role separation. | |
| Google Cloud | OAuth client for "Continue with Google" | IAM & Admin -> IAM -> Grant Access to officers' Google accounts (Owner for a second owner). No Workspace needed. Set the OAuth consent screen to "In production" (basic scopes only, no verification review needed) so the 100 test-user cap does not apply. | |
| Cloudflare | Staging worker built from `main`, DNS for `emmanuel.org` if moved | Members invites are account-wide. Use a dedicated church account (new account under a church email, or a second account), move the worker and DNS there, and invite officers. Most manual move: needs a Worker redeploy and, for DNS, a zone move. | |
| Convex | Backend, database, crons (dev and prod deployments) | Move the project to a new church team (project settings -> move to a different team), rename the team (e.g. "Emmanuel Church"), then invite officers via Team Settings -> Members. | |
| Clerk | Authentication, webhook to Convex | Create a new workspace ("Emmanuel Church"), then in the app: Settings -> Danger Zone -> Transfer ownership. Keys, domains and the webhook are unchanged. Invite officers to the new workspace. After the first teammate accepts, confirm they see only the church app. | |
| Resend | Notification and reminder email | Create a new Team from the same login and use Domain Claim for `notifications.app.emmanuel.org` (DNS TXT verification, then SPF/DKIM). Domains with recent sending may require contacting Resend support. API keys are per-team: generate a new `RESEND_API_KEY` and update it in Convex (`node scripts/set-convex-env.cjs --prod`). | |
| Microsoft Entra (Azure) | "Sign in with Microsoft" via Clerk | See below. | |

## Microsoft Entra tenant (added 2026-10-04)

A dedicated tenant hosts the Entra app registration that Clerk uses for
Microsoft SSO. It was created because the original maintainer's personal Hotmail
account was locked out of the Azure portal by stale two-factor methods, and the
church has no Microsoft 365 subscription.

- **Owning account:** `emmanuel-devs@outlook.com`, a Microsoft account created
  for the church rather than a personal one.
- **Tenant:** created by signing up for the Azure free account with that
  account; it is the account's Global Administrator. The tenant is free, as are
  Entra app registrations. The Azure free-account sign-up required a credit card
  for identity verification; do not create paid resources in it.
- **App registration:** supports both personal and work/school accounts; the
  redirect URI is the one Clerk shows on its Microsoft connection settings.
- **Secrets:** the app's client secret is in Clerk's Microsoft connection
  settings. It expires, so keep a calendar reminder for rotation and record the
  expiry date here: `__________`.

To remove the single point of failure here:

- [ ] Register at least two two-factor methods on `emmanuel-devs@outlook.com`
      (e.g. Authenticator app and a phone number) so a lost phone cannot lock the
      church out.
- [ ] Add at least one other officer as Global Administrator of the tenant
      (Entra ID -> Roles and administrators), using their own account.
- [ ] Record who holds the `emmanuel-devs@outlook.com` password and recovery
      details, in the church's password manager (not in this repo).
- [ ] After the Azure free trial ends, confirm Microsoft sign-in still works
      (the tenant and app registration should not depend on the subscription).

## Operating notes

- Production and staging use separate Convex deployments and separate Clerk
  instances. Anything set on one (Convex env vars especially) must also be set
  on the other. Production once silently sent no email because the Resend vars
  were only set on dev; `scripts/set-convex-env.cjs` supports `--prod`.
- Moving an app between Clerk workspaces or Convex teams does not change keys,
  but moving Resend or Cloudflare does: update the affected secrets in Convex
  env vars, the GitHub Actions `production` environment secrets, and the
  Cloudflare build variables.
- Do not put credentials in this repo. Record where they live instead.
