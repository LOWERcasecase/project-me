# Project Me

A private dashboard for my Project Me plan: daily check-ins, training, meals,
finances and every Horizon 1 project.

## What's in here

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The site. No need to edit these. |
| `data.js` | **The plan.** Projects, tasks, training plans, menus, finance snapshots. Edit this to change the plan. |
| `functions/api/state.js` | A tiny server function that saves ticks and check-ins to a Cloudflare database so they sync between phone and laptop. |

Everything you tick or type on the site (check-ins, sessions, measurements,
monthly money snapshots, home spaces, bucket list) is saved to the database,
not to `data.js`, so editing the plan never wipes your progress.

---

## One-time setup (about 20 minutes, all free)

### 1. Make the GitHub repo private
Repo → **Settings** → scroll to **Danger Zone** → **Change visibility** → **Private**.
`data.js` contains personal and financial details, so the repo must stay private.

### 2. Upload these files
Repo → **Add file → Upload files** → drag in everything from this folder,
**including the `functions` folder** (drag the folder itself so the path stays
`functions/api/state.js`). Commit.

### 3. Create the site on Cloudflare Pages
1. Sign up free at **dash.cloudflare.com**.
2. **Workers & Pages → Create → Pages → Connect to Git**. Authorize GitHub and
   pick this repo (Cloudflare can read private repos).
3. Build settings: Framework preset **None**, build command **empty**,
   build output directory **`/`**. Click **Save and Deploy**.
4. You get an address like `project-me-abc.pages.dev`. Don't share it yet.

### 4. Add the database (for syncing)
1. **Storage & Databases → KV → Create** a namespace called `project-me`.
2. Your Pages project → **Settings → Bindings → Add → KV namespace**.
   Variable name: **`PROJECT_ME`** (exactly). Namespace: `project-me`. Save.
3. **Deployments** → on the latest deployment choose **Retry deployment**
   so the binding takes effect.

### 5. Put a login in front of it (Cloudflare Access)
1. In the dashboard sidebar open **Zero Trust**. Pick a team name and the
   **Free** plan (up to 50 users; it may ask for a card but charges $0).
2. **Access → Applications → Add an application → Self-hosted**.
3. Name: `Project Me`. Add the domain `project-me-abc.pages.dev`
   (yours), and a second one `*.project-me-abc.pages.dev` to cover preview links.
4. Policy: **Allow**, Include → **Emails** → your email and your wife's.
5. Leave the login method as **One-time PIN** (a code is emailed to you). Save.

### 6. Check it
- Open the site in a **private/incognito window**. You should see a Cloudflare
  sign-in page, not your dashboard. If you see the dashboard, Access isn't
  covering that address yet: re-check step 5.
- Sign in with the emailed code. The bottom of the menu should say **Synced**.
  Tick something, open the site on your phone, and the tick is there.

Optional extra lock: Pages project → **Settings → Variables** → add
`ALLOWED_EMAILS` = `you@example.com,wife@example.com`. The sync function will
then refuse anyone else even if Access is changed by mistake.

---

## Everyday use

- **Daily check-in**: workout from whichever training plan is running, macros,
  meds, German, study, notes. Use "Previous day" to fill in a day you missed.
- **Monthly money check-in** (Finances page): add a snapshot with your wife.
  The KPI cards, net worth trend, debt timeline and savings bars update from it.
- **Change the plan**: edit `data.js` on GitHub (pencil icon) and commit.
  The site redeploys in about a minute. Add new tasks at the end of a
  project's list, because ticks are matched by position.
- **New training plan**: copy one of the two entries in `programs` in
  `data.js` and change the start date, modules and weeks.
- **Backup**: Settings → Download backup. The database also keeps one
  automatic backup per day for 60 days.

## If it says "Not synced"
Your changes are still saved on that device. Usually the login expired:
reload the page and sign in again. If it persists, check the KV binding
name is exactly `PROJECT_ME` and that you retried the deployment after adding it.
