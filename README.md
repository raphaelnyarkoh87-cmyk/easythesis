# EasyThesis

Thesis and dissertation drafting (Chapters 1 to 5) for the social sciences and humanities, built on literature retrieved from scholarly databases, with every citation checked against Crossref.

## Build stages

| Stage | What it adds | Status |
|---|---|---|
| 1 | Feasibility research and plan | Done |
| 2 | Interface: landing, pricing, sign in, dashboard, new thesis, chapter workspace, upgrade | Done |
| 3 | Supabase: real accounts, database, document storage, plan limits enforced in the database | Done |
| 4 | Literature engine: OpenAlex, Semantic Scholar, Crossref verification (Consensus later) | Done |
| 5 | Writing engine: chapter drafting grounded only in retrieved sources and the student's own data | Next |
| 6 | Paystack: MTN MoMo, Telecel Cash, AirtelTigo Money, card and bank; 30-day Premium pass | |
| 7 | Word export, terms, privacy policy, launch | |

## Where things live

- `src/lib/plans.ts`: prices and free/premium limits. Change the numbers here.
- `src/lib/academic.ts`: disciplines, levels, referencing styles and the chapter structure.
- `src/lib/example.ts`: the example thesis. Every source in it is a real paper with a real DOI.
- `src/lib/store.ts`: reading and writing data in Supabase (accounts, projects, uploads).
- `src/lib/supabase/`: Supabase connection settings.
- `src/lib/literature/`: OpenAlex and Semantic Scholar search, Crossref DOI checks.
- `src/lib/server/guard.ts`: sign-in, project ownership and plan-limit checks for server routes.
- `src/app/api/`: server routes.
- `supabase/migrations/`: database tables and security rules. Run new files in Supabase's SQL Editor.
- `src/app/`: pages. `src/app/app/` is the signed-in area.
- `src/components/`: shared interface pieces.

## Testing Premium before payments exist

In Supabase, open Table Editor -> profiles, find your row, set `plan` to `premium` and `premium_until` to a future date.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Design

Green and white. Forest `#0f3d2e` for brand text, leaf `#1e7b4f` for actions, sprout `#cfe8d6` for verified-source highlights, mint `#f1f8f3` for quiet surfaces. Source Serif 4 for anything that reads like the thesis; Instrument Sans for the interface.
