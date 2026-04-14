# FinWise Frontend

Next.js frontend for the FinWise personal finance application.

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The app runs on `http://localhost:3000` and expects the backend at `http://localhost:8000`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/               # Login & register page
│   ├── dashboard/          # Dashboard with charts & summaries
│   ├── transactions/       # Transaction list & CRUD
│   ├── budgets/            # Budget management & tracking
│   ├── goals/              # Savings goals with progress
│   ├── recurring/          # Recurring transaction rules
│   ├── layout.tsx          # Root layout (providers, global CSS)
│   ├── page.tsx            # Entry point
│   └── AppShell.tsx        # Authenticated shell (sidebar + routing)
├── components/
│   ├── ui/                 # Reusable UI primitives (Button, Card, Modal...)
│   ├── layout/             # Sidebar, TopBar
│   └── charts/             # Recharts wrappers (Pie, Bar)
├── hooks/                  # Custom React hooks (useAuth, useMonthNav)
├── lib/                    # Utilities, API client, constants
├── styles/                 # Global CSS, design tokens
└── types/                  # TypeScript interfaces (mirrors backend schemas)
```

## Design Decisions

- **CSS Modules** for scoped styles — no class name collisions, no runtime CSS-in-JS
- **Design tokens** in `styles/tokens.css` — single source of truth for colors, radii, shadows
- **Barrel exports** (`index.ts`) in each component folder — clean imports
- **API client** in `lib/api.ts` — every backend call goes through one module
- **Type safety** — TypeScript interfaces mirror the backend Pydantic schemas exactly
