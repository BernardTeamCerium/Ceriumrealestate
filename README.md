# Cerium Real Estate — Accounting Dashboard

A self-contained accounting dashboard for tracking **expenses**, **projections**,
**money owed**, and **upcoming repairs/fixes** across the property portfolio.

No build step, no server, no dependencies to install — it's plain HTML, CSS, and
JavaScript. Charts are rendered with [Chart.js](https://www.chartjs.org/) loaded
from a CDN.

## Running it

Open `index.html` in any modern browser:

```bash
# from the project root
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or serve it (recommended so the CDN/scripts load cleanly):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's inside

| Section | What it shows |
|---|---|
| **Overview** | KPI cards (total expenses, payables, receivables, projected net), income-vs-expense chart, expenses-by-category doughnut, upcoming fixes, and an "Attention Needed" feed of everything overdue. |
| **Expenses** | Every recorded cost with category, property, amount, how much is still **owed** per expense, and a payment-progress bar. Add / edit / delete. |
| **Projections** | Forecasted monthly income vs expenses, cumulative net-position chart, and a month-by-month breakdown table. |
| **Money Owed** | Two ledgers — **payables** (what we owe vendors, derived from unpaid expenses) and **receivables** (rent/fees owed to us). One-click "Mark paid". |
| **Owner Funds** | Tracks owner/investor contributions and the running balance **owed back** to each owner. Contributions increase the balance; recorded repayments/distributions reduce it. Shows owed-back-by-owner and a full contributions ledger with per-entry outstanding amounts. |
| **Insurance** | Home/property insurance policies — provider, policy number, coverage, deductible, and annual/monthly cost, with renewal dates and a "renewing soon" count. |
| **Mortgages** | Loan balances, rates, and monthly payments per property, with a payoff-progress bar, projected payoff date (amortized from balance/rate/payment), and an aggregate payoff-trend chart. |
| **Upcoming Fixes** | Maintenance and repairs that need attention, with priority, due date, estimated cost, and status. Overdue items are flagged. |

## Data & persistence

- The app ships with realistic **sample data** (`assets/seed.js`).
- Any change you make (add/edit/delete, marking items paid) is saved to the
  browser's `localStorage`, so it survives page reloads.
- Use **↺ Reset to sample data** in the sidebar to wipe local changes and start
  fresh from the seed.

> Note: data lives in the browser only. To share data across machines or users,
> the storage layer in `assets/app.js` (`loadState` / `saveState`) can be swapped
> for a backend API.

## Project structure

```
index.html          # app shell + layout
assets/styles.css   # styling (dark theme)
assets/seed.js      # initial sample dataset
assets/app.js       # state, views, charts, CRUD
```
