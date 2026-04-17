# FinWise Frontend

Next.js frontend for the FinWise personal finance application.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Runs on `http://localhost:3000`, expects backend at `http://localhost:8000`.

## Project Structure

```
src/
├── app/                         # Pages (one folder per route)
│   ├── auth/                    # Login/register + remember me + forgot password
│   ├── dashboard/               # Charts, stats, recent activity
│   ├── transactions/            # Table with filters + CRUD
│   ├── budgets/                 # Budget cards with progress tracking
│   ├── goals/                   # Savings goals with deadlines
│   ├── recurring/               # Recurring transaction rules
│   ├── layout.tsx               # Root layout (providers, global CSS)
│   ├── page.tsx                 # Entry point
│   └── AppShell.tsx             # Authenticated shell (sidebar + routing)
├── components/
│   ├── ui/                      # 11 reusable primitives
│   ├── layout/                  # Sidebar, TopBar
│   └── charts/                  # SpendingPieChart, BudgetBarChart
├── hooks/                       # useAuth (with remember me), useMonthNav
├── lib/                         # api.ts, constants.ts, utils.ts
├── styles/                      # globals.css, tokens.css (design system)
└── types/                       # TypeScript interfaces
```

## Design System

- **Color palette**: Teal (#0D9488) + Indigo (#4F46E5) + Coral + Amber on gray base
- **Font**: Inter
- **CSS Modules** for scoped styles
- **Design tokens** in `tokens.css` — single source of truth
