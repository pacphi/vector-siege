# Deployment and Interaction Guide

Vector Siege supports two primary run modes: an authenticated ChatGPT Site and
a local Vite or Docker deployment.

## Deploying to ChatGPT Sites

### Prerequisites

- Access to ChatGPT Sites in Codex
- Git and Node.js 22+
- A clean, tested source commit
- `.openai/hosting.json` containing the opaque Sites `project_id`

Never invent or edit the `project_id`. If the file already contains one, reuse
that project instead of creating another Site.

### Validate and prepare the source

```bash
npm ci
npm run check
npm run test:e2e
git status
```

`npm run check` runs type checking, unit tests, the production build, and the
Sites packaging test. The build generates:

- `dist/server/index.js`: Cloudflare Worker entrypoint
- `dist/assets/index.html`: static-binding application shell
- `dist/assets/assets/`: fingerprinted JavaScript and CSS
- `dist/.openai/hosting.json`: project provenance

Commit only after all checks pass. The commit SHA saved in Sites must identify
exactly the source that produced the deployment.

### Publish from Codex

Ask Codex to:

1. Read `.openai/hosting.json`.
2. Create or refresh the short-lived Sites repository credential.
3. Push the current `main` commit to the Site source repository.
4. Save a new Site version using the exact pushed commit SHA.
5. Deploy that saved version.
6. Poll until deployment reaches `succeeded` or `failed`.
7. Make an authenticated request to `/` and one fingerprinted asset.
8. Inspect production worker logs if either request fails.

The Site is currently owner-only. Opening its URL redirects through **Sign in
with ChatGPT**. Sign in using an account listed in the Site access policy, then
return to the same URL.

Saving a version does not deploy it. A `succeeded` deployment only proves that
the host accepted the artifact; authenticated HTTP smoke checks confirm that
the application and its assets are actually being served.

### Play the ChatGPT deployment

After authenticating:

1. Choose **START MISSION**.
2. Drive with `W`/`S` or the up/down arrows.
3. Turn with `A`/`D`, left/right arrows, or captured mouse movement.
4. Fire with `Space` or primary click.
5. Pause with `P` or `Esc`.
6. Toggle sound with `M` and fullscreen with `F`.

Clicking the battlefield captures the mouse pointer. Press `Esc` to release it.
High score and sound preference are stored in that browser.

### Updating or rolling back

For an update, repeat validation, commit, push, save-version, and deployment.
Never deploy an unsaved working tree.

Sites retains prior saved versions. To roll back, select the known-good version
ID from version history and deploy it. Report the human-facing version number
in release notes; treat project, version, and deployment IDs as opaque values.

## Running locally with Vite

### Development mode

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. TypeScript and
CSS changes reload automatically.

### Production preview

```bash
npm ci
npm run check
npm run preview
```

Open the printed preview URL, normally `http://localhost:4173`. This serves the
optimized bundle and is the closest local equivalent to static hosting.

Controls are identical to the ChatGPT deployment. Browser audio begins only
after the first user gesture. Pointer lock may require clicking the battlefield.

## Running locally with Docker

Build and run the production image:

```bash
docker build -t vector-siege:local .
docker run --rm -p 8080:8080 vector-siege:local
```

Open [http://localhost:8080](http://localhost:8080). The container runs
unprivileged Nginx and exposes a health endpoint:

```bash
curl --fail http://localhost:8080/healthz
```

Stop the foreground container with `Ctrl+C`.

## Troubleshooting

### ChatGPT Site shows “Sign in required”

Authenticate with an account allowed by the Site access policy. Authentication
is separate from the game; no player account or game data is sent to it.

### ChatGPT Site returns 404 after authentication

Confirm the deployed version contains the Sites package layout listed above.
Check worker logs for `GET /`, then verify that the static binding resolves
`/index.html` and `/assets/<fingerprinted-file>`. Do not rely solely on
deployment status.

### The game is visible but controls do not respond

Choose **START MISSION**, click the battlefield, and confirm the game is not
paused. Keyboard-only controls work without pointer lock.

### There is no sound

Interact with the page once to unlock Web Audio, then press `M` or select the
sound button. Some browsers suppress audio in background tabs.

### A local port is already in use

```bash
npm run dev -- --port 5174
npm run preview -- --port 4174
docker run --rm -p 8081:8080 vector-siege:local
```
