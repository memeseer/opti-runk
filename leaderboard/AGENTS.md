# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable design decisions

- The selected visual source is `reference-option-3.png`: a dark, table-first Optimum leaderboard.
- All user-facing interface copy must be in English.
- Rankings must be derived from the real `../users.json` dataset, with total messages, active channels, and selected-channel messages as the primary metrics.
- Use the supplied Geist font, Optimum logo, mascot, and metablob assets from `../brand kit`; do not redraw or approximate them.

## Follow-up design revision (2026-08-11)

- Keep one leaderboard only; do not show metric tabs for Active channels or Messages by channel.
- The channel filter must include `All channels` and default to it. Selecting a channel changes the message ranking.
- The table columns are Rank, Member, Messages, and Favorite channel. Do not show member IDs, Activity share, or Active channels.
- Do not show a profile control in the top-right navigation.
- Use the exact leaning mascot appearance extracted from `reference-option-3.png` rather than a different pose from the brand kit.
## Follow-up correction (2026-08-11)

- Never use a rectangular crop from a screen mock as the final mascot asset. Wait for a clean user-supplied PNG/WebP, preferably transparent.
- Messages and Favorite channel must remain clearly separate table columns. Center message values in their own column and keep Favorite channel in a distinct right-side column with visible separation.
## Card generator revision (2026-08-11)

- Keep only the Leaderboard item in the primary navigation.
- Use the user-supplied transparent mascot lockup at public/assets/optimum-mascot-reference.png without a rectangular background.
- Place Card Generator below the leaderboard. It accepts a Discord username and renders avatar, total messages, top three channels with message counts, all-time rank, and rarity.
- Rarity thresholds are all-time rank 1–100 Legendary, 101–1,000 Epic, 1,001–10,000 Rare, and 10,001+ Common.


## Dedicated generator tab revision (2026-08-11)

- Card Generator is a separate primary navigation tab next to Leaderboard, never a section below the leaderboard.
- The initial generator view follows the centered, sparse wrapped-style reference in Optimum colors.
- Do not show an empty card before submission; render the member card only after a valid Discord username is submitted.


- After successful card generation, hide the complete generator prompt and center the card in the viewport.


## Excluded member and card sharing revision (2026-08-11)

- Exclude MEE6#4876 in client-side data mapping only; never modify users.json for this rule.
- Generated cards have three actions below them: Download PNG, Copy PNG, and Share on X.
- The X share text must remain English and include https://www.optimum-discord-rank.vercel.app plus @makssay_eth, @kentlinyy, and @blockchainjeff.

## Twitter leaderboard placeholder revision (2026-08-11)

- The main Discord page heading is Discord Leaderboard.
- Primary navigation includes Twitter Leaderboard as a separate tab.
- Twitter Leaderboard shows a dedicated Optimum-branded placeholder with a large SOON message.
