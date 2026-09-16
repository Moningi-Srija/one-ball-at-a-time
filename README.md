# One Ball at a Time

> Five in the air, one in hand.

**One Ball at a Time** is a personal focus tracker for the moment when choosing feels harder than doing. Pick what matters, start one concrete task, finish it, and keep visible proof of the life you actually lived.

## Try the public demo

[Open the no-login public demo](https://one-ball-at-a-time.onrender.com/demo)

The demo keeps its task state separate from the owner's private task state:

- its task data is never sent to the app's private state API;
- its sample tasks and every change you make stay in your browser's `localStorage`;
- **Reset demo** restores the original sample board;
- the public copy uses generic protected body and future-building slots.

The normal root URL (`/`) remains the owner's PIN-protected, database-backed app.

## What it does

- Keeps a focused board of five: three flexible priorities plus protected body and future-building slots.
- Tracks an **Eat the Frog** task, notes, quarter-point values, priority quadrants, and live task timers.
- Records completed tasks with category, points, timestamps, duration, and notes.
- Shows today's progress against a configurable daily goal.
- Includes an Eisenhower Matrix, category/date-filterable log, points dashboard, streaks, consistency map, category rankings, and all-time/category charts.
- Lets you select a point on an all-time chart and jump to that day's log.
- Persists a private deployment in PostgreSQL and protects it with a server-side session.

## Choose how to use it

### Just explore

Use the [public demo](https://one-ball-at-a-time.onrender.com/demo). No PIN, account, or installation is required, and your changes stay on your device.

### Make it yours

1. [Fork this repository](https://github.com/Moningi-Srija/one-ball-at-a-time/fork).
2. Rename the categories and protected slots in `app.js`.
3. Change the notebook theme in `style.css`.
4. Run it locally or deploy your fork with its own database and secrets.

This is currently a **single-owner, self-hosted app**, not a multi-user SaaS product. One deployment has one private board and one PIN. If several people need independent accounts on the same deployment, user authentication and user-scoped database records must be added first.

## Run locally

Requirements: Node.js 18+ and PostgreSQL.

```bash
git clone https://github.com/Moningi-Srija/one-ball-at-a-time.git
cd one-ball-at-a-time
npm ci
cp .env.example .env
```

Create a PostgreSQL database, then replace the sample values in `.env`. Start the app:

```bash
npm start
```

Open [http://localhost:8791](http://localhost:8791) for the private app or [http://localhost:8791/demo](http://localhost:8791/demo) for the browser-only demo. The app creates its state and session tables on startup.

## Deploy your fork

On Render or another Node hosting provider:

1. Create a PostgreSQL database. It is currently required at server startup even when visitors only use `/demo`.
2. Create a web service from your fork.
3. Use `npm ci` as the build command and `npm start` as the start command.
4. Set these private environment variables:

   - `DATABASE_URL` — your PostgreSQL connection string
   - `ACCESS_PIN` — a strong private passphrase or PIN for the owner view
   - `SESSION_SECRET` — a long random secret, for example from `openssl rand -hex 32`
   - `NODE_ENV=production`
   - `TRUST_PROXY=1` only when the service is behind a trusted reverse proxy (Render is detected automatically)

Never commit `.env`, your database URL, PIN, or session secret. Rotate any secret that has ever been posted or shared.

## Customize it

The main personalization points are intentionally easy to find:

- `CATEGORIES` in `app.js` controls category names, icons, descriptions, default points, and colors.
- `BODY_SLOT_MESSAGES`, `CAREER_SLOT_MESSAGES`, and `CAREER_SLOT_COPY` control the two protected promises.
- `DEFAULT_TARGETS` controls day, week, weekend, and month point goals.
- The variables at the top of `style.css` control the pink-notebook palette.
- `createDemoState()` controls the public demo's sample tasks and history.

Keep private or personally identifying copy out of the demo constants and sample state.

## Data and privacy model

The private app stores four shared JSON records in PostgreSQL: `active`, `log`, `targets`, and `frog`. Sessions are also stored in PostgreSQL. API routes require an authenticated session, and repeated failed PIN attempts are rate-limited.

The login throttle is intentionally simple and in-memory. It is per server instance and resets when the service restarts; use an edge/platform rate limiter as well if you expect meaningful public traffic.

The demo does not call those private task-state API routes. It uses the browser key `one-ball-at-a-time-demo-v1`; clearing site data removes that demo state. Because `/demo` shares an origin with the private app, use a separate hostname or service if you need a strict infrastructure-level isolation boundary.

## Tests

```bash
npm test
```

The current automated tests cover timing-safe PIN comparison and login throttling. Before changing persistence or timer behavior, also test the private and demo routes in a browser.

## Product notes

The philosophy is one task at a time, but the current prototype does not yet enforce a single running timer. Multiple task timers can run concurrently. The private persistence model is also app-wide rather than user-scoped.

Charts and web fonts are loaded from external CDNs, so those parts need an internet connection.

- [View the product deck as a PDF](docs/one-ball-at-a-time-product-deck.pdf)
- [Download the editable PowerPoint deck](docs/one-ball-at-a-time-product-deck.pptx)

## License and assets

The source code is licensed under the [MIT License](LICENSE). See [ASSET_NOTICE.md](ASSET_NOTICE.md) before redistributing legacy reference images or the product deck.

---

*Pick less. Start sooner. Let momentum prove the task was smaller than the fear.*
