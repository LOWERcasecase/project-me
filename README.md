# Project Me

A private dashboard for my Project Me plan: daily check-ins, training, meals,
finances and every Horizon 1 project.

## What's in here

| File | What it is |
|---|---|
| `public/index.html`, `public/styles.css`, `public/app.js` | The site. No need to edit these. |
| `public/theme.css` | **The look:** druid's grove & kitchen witch's hearth. Colours, fonts, knotwork, herbs. Change the variables at the top to retune it. |
| `public/fonts/` | Cormorant Garamond and Lora, hosted with the site (open font licence). |
| `public/data.js` | **The plan.** Projects, tasks, training plans, menus, finance snapshots. |
| `public/artifacts.js` | **The plan documents** shown on the Artifacts tab (meal plan, tri plans, study plan...). |
| `public/books.js` | **Your library** (from the shelf photos) and the starting reading log. What you log on the Reading page is saved to the database. |
| `public/calendar.js` | **Fixed dates** for the Calendar (paydays, races, Christmas plan, reviews). Events you add on the site are saved to the database instead. |
| `functions/api/garmin.js` | Reads your Garmin Connect data (read-only) through Garmin's official Personal API. |
| `functions/api/gcal.js` | Reads your Google Calendars (read-only) so they show on the Calendar page. |
| `functions/api/state.js` | Saves ticks and check-ins to the Cloudflare database so they sync between devices. |
| `wrangler.toml` | Tells Cloudflare where the site and database are. |

Everything you tick or type on the site is saved to the database, not to the
files, so editing the plan never wipes your progress.

## How it's hosted
- Cloudflare Pages project `project-me` → https://project-me-1tk.pages.dev
- Login: Cloudflare Zero Trust → Access → Applications → Project Me (policy "mylogin")
- Database: Cloudflare KV namespace `project-me`, bound as `PROJECT_ME`

## Google Calendar
The site reads your Google Calendars through their private iCal addresses, stored as the
encrypted secret `GCAL_FEEDS` (never in a file). To add or change calendars:

1. Google Calendar on a computer → ⚙ Settings → click a calendar under "Settings for my calendars"
   → "Integrate calendar" → copy **Secret address in iCal format**.
2. In the Codespace terminal (after the `export` lines):
   `npx wrangler@latest pages secret put GCAL_FEEDS --project-name project-me`
   and paste all the addresses, separated by commas. Then publish.

Skip "Workout Block" and "School/ Study Block": the site builds those from your plans.

## Garmin
The site reads your Garmin data with Garmin's free Personal API. Your key is stored as the
encrypted secret `GARMIN_API_KEY` (never in a file).

1. Go to https://connect.garmin.com/app/settings/personalApiToken → **Create Key**, accept the
   terms, pick **1 year**, and copy the key (it's shown only once).
2. In the Codespace terminal (after the `export` lines):
   `npx wrangler@latest pages secret put GARMIN_API_KEY --project-name project-me`
   and paste the key. Then publish.
3. When the key expires (Garmin emails you a week before), create a new one and repeat step 2.

## Publishing a change
In the Codespace terminal:

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
git add -A && git commit -m "Update plan" && git push
npx wrangler@latest pages deploy
```

The two `export` lines are only needed once per terminal. Never put the token in a file.

---

## Everyday use

- **Daily check-in**: workout from whichever training plan is running, macros,
  meds, German, study, notes. Use "Previous day" to fill in a day you missed.
- **Monthly money check-in** (Finances page): add a snapshot with your wife.
  The KPI cards, net worth trend, debt timeline and savings bars update from it.
- **Change the plan**: edit `public/data.js`, then publish (see above).
  Add new tasks at the end of a project's list, because ticks are matched by position.
- **Add a plan document**: in `public/artifacts.js`, find its "todo" entry, paste
  the plan into `md`, set `status: "ready"`, then publish.
- **New training plan**: copy one of the two entries in `programs` in
  `data.js` and change the start date, modules and weeks.
- **Backup**: Settings → Download backup. The database also keeps one
  automatic backup per day for 60 days.

## If it says "Not synced"
Your changes are still saved on that device. Usually the login expired:
reload the page and sign in again. If it persists, check `wrangler.toml` has
the right database id and binding `PROJECT_ME`, then publish again.
