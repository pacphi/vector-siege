# Maintainer Guide

## Prerequisites and common commands

Use Node.js 22+ and npm.

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run check
```

`npm run dev` starts hot reload. `npm run build` type-checks and emits static assets to `dist/`. `npm run check` is the local equivalent of the main CI quality gate.

## Project map

- `src/logic.ts`: deterministic gameplay and wave rules
- `src/types.ts`: state and entity contracts
- `src/view.ts`: Three.js scene and generated polygon geometry
- `src/audio.ts`: synthesized effects
- `src/main.ts`: browser lifecycle, controls, HUD, radar, and persistence
- `src/style.css`: responsive cockpit and menus
- `src/logic.test.ts`: simulation-level regression tests
- `tests/e2e/`: browser smoke tests
- `.github/workflows/ci.yml`: CI pipeline
- `Dockerfile`, `nginx.conf`: production container
- `docs/DEPLOYMENT.md`: ChatGPT Sites and local deployment runbook

## Design rules

Keep gameplay state independent from Three.js and the DOM. Pass normalized input into the simulation and render from state snapshots. Prefer seeded randomness in gameplay so failures can be reproduced. Generate or properly license every audiovisual asset; the current build deliberately synthesizes all of them.

The game targets desktop keyboard and mouse but its menus and HUD must remain usable at narrow viewports. Preserve visible focus, semantic buttons, reduced-motion behavior, the live status region, and keyboard alternatives whenever controls change.

## Testing changes

Put rules and edge cases in Vitest. Browser tests should cover wiring that a pure test cannot: starting, inputs, pausing, restarting, local persistence, and rendering without console errors. Keep E2E assertions semantic and expose a small read-only debug state only if deterministic browser setup requires it.

Before merging:

```bash
npm run check
npm run build
npm run test:e2e
```

Then serve `dist/` once and inspect the title, active play, pause, hit/game-over, and restart states at desktop and narrow viewport sizes.

## Release and operations

The app needs no runtime secrets or environment variables. CI builds the static bundle and uploads it as an artifact. The container stage runs unprivileged Nginx and includes an HTTP health check. Deploy immutable image tags and retain the prior tag for rollback.

Cache fingerprinted `/assets/` files for one year; keep `index.html` uncached so releases are discovered immediately. The included Nginx policy does both and adds baseline security headers.

See the [Deployment and Interaction Guide](DEPLOYMENT.md) for the complete
ChatGPT Sites publish sequence, authenticated smoke checks, local Vite use,
Docker use, and player interaction instructions.
