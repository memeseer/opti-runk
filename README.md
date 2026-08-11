# Optimum Discord Rankings

An English-language Discord community leaderboard and collectible card generator built with React and Vite.

## Local development

```bash
cd leaderboard
npm ci
npm run dev
```

## Data update

The root `user_stats.py` collector reads its credentials from environment variables and supports incremental updates.

Required environment variables:

- `DISCORD_TOKEN` — Discord authorization token. Store this only in local `.env` files or GitHub Actions secrets.
- `GUILD_ID` — Discord server ID.
- `MODE=incremental` — fetch only messages newer than the saved checkpoint.

The scheduled GitHub Actions workflow runs once every 24 hours and may also be started manually. It updates:

- `checkpoint.json`
- `users.json`
- `leaderboard/public/leaderboard-data.json`

Add `DISCORD_TOKEN` under **Repository settings → Secrets and variables → Actions → New repository secret** before running the workflow.

## Vercel

The root `vercel.json` installs and builds the app from the `leaderboard` directory. Import the repository into Vercel without changing the root directory or build settings.

