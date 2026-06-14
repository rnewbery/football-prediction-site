# Gary's Football Comps

A custom football prediction competition website built for a private client-style use case. The site allows participants to submit score predictions for a multi-week football competition, while administrators can manage fixtures, approve entries, enter results, and publish leaderboard updates.

## Live Website

https://www.garysfootballcomps.co.uk

## Project Overview

Gary's Football Comps was built to replace a spreadsheet-based football prediction process with a cleaner online workflow.

Participants can enter predictions for all fixtures in a competition, while the organiser can approve entries, update match results, and produce a live leaderboard. The leaderboard includes both total scores and a game-by-game points breakdown, allowing the organiser to share weekly updates as results come in.

## Key Features

* Public homepage for the active competition
* Prediction form for participants
* Access-code-protected public leaderboard
* Public leaderboard print and CSV export
* Game-by-game points breakdown
* Previous competitions archive
* Admin login area
* Admin fixture management
* Manual result entry and score recalculation
* Entry approval and rejection workflow
* Admin leaderboard with full CSV export
* Archived competition deletion for test competitions
* Custom domain deployed through Vercel

## Tech Stack

* Next.js
* TypeScript
* React
* Supabase
* PostgreSQL
* Vercel
* Cloudflare DNS / Registrar
* CSS Modules / global CSS

## Database

The project uses Supabase/PostgreSQL for:

* Competitions
* Fixtures
* Participants
* Entries
* Predictions
* Leaderboard scoring
* Game breakdown reporting

Scoring and leaderboard data are generated using PostgreSQL functions, allowing the application to return calculated totals and fixture-level breakdowns without exposing private admin workflows.

## Admin Workflow

The organiser can:

1. Create a competition.
2. Add fixtures and assign them to weekly groups.
3. Review participant entries.
4. Approve paid entries.
5. Enter match results.
6. Recalculate scores.
7. Export or print the leaderboard.
8. Archive completed competitions.

## Security Notes

Admin pages are protected using Supabase authentication. Public leaderboard access is controlled by a competition access code. Environment variables are used for sensitive configuration and are not committed to the repository.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

The project expects environment variables for Supabase and any optional external football data provider. These should be stored locally in `.env.local` and configured separately in Vercel.

Example variable names:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
API_FOOTBALL_KEY
```

Do not commit real environment values to GitHub.

## Deployment

The project is deployed on Vercel and connected to a custom domain managed through Cloudflare DNS.

## Portfolio Notes

This project demonstrates:

* Full-stack web application development
* Database-backed application design
* Authentication-protected admin workflows
* Public/private route separation
* CSV export functionality
* Custom reporting and leaderboard calculations
* Deployment with a custom domain
* Practical client-focused feature development
