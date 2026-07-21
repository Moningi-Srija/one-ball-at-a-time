# One Ball at a Time

> Five in the Air, One in Hand.

**One Ball at a Time** is a personal focus and completion tracker for the moment when choosing feels harder than doing.

I built it because I used to feel overwhelmed and procrastinate simply because I could not decide what to start. Once I actually began, the task was rarely as difficult as it had seemed in my head. This project turns that insight into a small loop: choose a task, start it, finish it, and keep visible proof of the win.

## Product deck

- [View the product deck as a PDF](docs/one-ball-at-a-time-product-deck.pdf)
- [Download the editable PowerPoint deck](docs/one-ball-at-a-time-product-deck.pptx)

The deck explains the product story, the current experience, the implementation, and the gap between the one-at-a-time philosophy and today's timer behavior.

## What the current prototype does

- Keeps up to **five active tasks** on the board.
- Lets you choose one active task as today's **Eat the Frog** priority; the selection persists for the local date and is marked complete when that task is finished.
- Lets you add, edit, or remove a task with a category and an editable points value.
- Assigns active tasks to an Eisenhower priority quadrant and groups them in a Matrix tab: **Do now**, **Schedule**, **Delegate / simplify**, or **Eliminate**.
- Starts a live timer on an individual task card.
- Finishes a task with confetti, removes it from the active board, and records its start time, finish time, duration, category, and points.
- Shows today's completed tasks, points by category, and progress toward the daily target.
- Provides a points dashboard for a day, week, weekend, or month, with previous/next and date-jump controls.
- Calculates streaks, task count, all-time points, a 30-day average, a 30-day trend, category share, best weekdays, and a 17-week consistency map.
- Includes a chronological task log, a 12-category points guide, and editable day/week/weekend/month targets.
- Protects the app behind a PIN-backed server session.
- Persists the active board, completed log, targets, and daily frog selection in PostgreSQL.

## Important current behavior

The name describes the product philosophy, but **the current code does not enforce one running task**. `startTask` starts the selected task without pausing or blocking another task, so multiple timers can run at the same time. Enforcing a single active timer is the most important next product milestone.

The current persistence model is also designed for a personal, single-owner deployment: `active`, `log`, `targets`, and `frog` are stored as app-wide records rather than being scoped to individual user accounts.

There is urgency-banner and daily-muse logic in `app.js`, but those modules are not wired into the visible interface in the current `index.html`.

## Tech stack

- Vanilla HTML, CSS, and JavaScript
- Node.js and Express
- PostgreSQL via `pg`
- `express-session` with `connect-pg-simple`
- Chart.js for analytics visualizations

## Run locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create a PostgreSQL database

The app creates its `app_state` table and session table automatically when the server starts.

### 3. Add a local `.env`

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
ACCESS_PIN=choose-a-private-pin
SESSION_SECRET=choose-a-long-random-secret
PORT=8791
NODE_ENV=development
```

`.env` is ignored by Git. Always set a strong `SESSION_SECRET` outside local development.

### 4. Start the app

```bash
npm start
```

Open [http://localhost:8791](http://localhost:8791) unless you changed `PORT`.

## Current data model

The `app_state` table stores four JSON values:

- `active`: up to five tasks on the board, including category, points, priority quadrant, and timer state
- `log`: completed tasks with timing and points metadata
- `targets`: day, week, weekend, and month point goals
- `frog`: the locally dated Eat the Frog choice and its completion state

Default targets are 25 points per day, 150 per week, 50 per weekend, and 600 per month.

## Next milestones

1. Enforce one active timer at a time.
2. Add an intentional pause/switch flow.
3. Scope boards, logs, and targets to individual accounts.
4. Add automated tests for start, switch, finish, and persistence behavior.
5. Wire the dormant urgency/muse modules into the UI or remove them.

---

*Pick less. Start sooner. Let momentum prove the task was smaller than the fear.*
