# Vector Siege

Vector Siege is an original, browser-playable polygonal tank combat game inspired by the immediacy and visual economy of early vector arcades. Scan the radar, use geometric cover, and survive increasingly dangerous waves of tanks, scouts, drones, and bonus saucers.

This project is an independent homage. It uses no original game code, names, artwork, audio, or other assets and is not affiliated with Atari, Rebellion, or Sony.

## Play locally

You need Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For a production check:

```bash
npm run check
npm run build
npm run preview
```

## Documentation

- [Player guide](docs/PLAYER_GUIDE.md)
- [Maintainer guide](docs/MAINTAINER_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Research and design context](docs/RESEARCH.md)

## Stack

TypeScript provides strict game logic, Three.js renders the WebGL polygonal battlefield, and Vite supplies the development and production toolchain. Vitest covers deterministic simulation rules; Playwright covers the browser journey. GitHub Actions, a multi-stage Docker image, and an unprivileged Nginx runtime provide a small, portable delivery path.

## License

MIT. See [LICENSE](LICENSE).
