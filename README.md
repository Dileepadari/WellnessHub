<p align="center">
  <img src="./client/src/assets/logo-mark.png" width="96" alt="ADK DEV">
</p>

# WellnessHub

A keyboard-driven console for tracking health, money and insurance in one place, where
looking after them earns points, streaks and levels.

Most trackers cover one of the three and present it as a wall of cards. WellnessHub treats
them as one habit and shows them the way a trading terminal shows a portfolio: dense tables,
tabular figures, inline sparklines, everything on one screen.

For architecture, data model and setup, see **[DEVDOC.md](./DEVDOC.md)**.

## Features

### Health
- Log steps, water, workouts, sleep, weight and meditation, with the time they happened
- Every figure is aggregated from the log, so correcting or deleting an entry corrects the totals
- Daily and weekly goals per metric, with progress and a 7 to 90 day sparkline per row
- Streaks derived from the days you actually logged, tolerant of today not being logged yet
- Weight is treated as a reading, not a quantity: the latest value carries forward

### Wealth
- Record income and expenses against categories that differ by kind
- Monthly income, expenses, net and savings rate computed from the transactions
- Spend broken down by category with a share bar, and a 6 month income/expense trend
- Savings goals whose progress is the sum of their contributions, marked achieved automatically

### Insurance
- A policy register with coverage, premium, billing cycle and renewal date
- Premiums annualised so monthly, quarterly and annual policies are comparable
- Alerts for renewals due, policies already lapsed, and essential cover you do not hold
- A coverage score, and premium as a share of income

### Challenges and community
- Browse and join challenges by category and difficulty
- **Progress is measured, not self-reported**: a steps challenge advances as you log steps, and
  completes itself when you hit the target
- Achievements unlock from what you have actually done, and cascade - completing your first
  challenge unlocks the achievement for it in the same moment
- Teams you can browse and join, an activity feed, and a points leaderboard

### Throughout
- `⌘K` command palette for navigation and actions
- `g` then a section key to jump (`g h` for Health), `t` to cycle the theme
- Live updates: completing a challenge or unlocking an achievement appears without a refresh
- Light and dark from one palette, following your device by default
- Works down to a phone-width viewport, with wide tables scrolling inside their panel

## How points and levels work

Every logged activity is worth points, scaled to the metric: steps award 5 per thousand,
water 2 per glass, a workout 10 per ten minutes. One entry is capped at 200 points so a single
large number cannot farm the leaderboard.

Points accumulate into a total that never decreases, and every 1,000 points is one level.
A separate `availablePoints` balance is what gets spent on rewards, so spending never costs you
a level.

Logging on consecutive days builds a streak. Because the streak is recomputed from the log
rather than stored, backdating an entry repairs a broken streak and deleting one corrects it.
Your longest streak is kept after a current streak ends.

## Tech stack

React 19 and TypeScript on Vite for the console, Express 5 and MongoDB for the API. No chart
library: the sparklines are hand-rolled SVG. Details in [DEVDOC.md](./DEVDOC.md).

## Getting started

```bash
cp .env.example .env    # then fill in JWT_SECRET and MONGODB_URI
./start.sh              # API on :5000, console on :3000
cd server && npm run seed   # optional: 90 days of sample history
```

The seed prints its login credentials. Full setup, including Docker, is in
[DEVDOC.md](./DEVDOC.md#local-setup).
