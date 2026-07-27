# Architecture

## Shape of the application

Vector Siege is a static client application. There is no server-side game state or account system.

```text
keyboard / pointer
        │
        ▼
 input action frame ──► deterministic simulation ──► readonly game state
                                │                           │
                                │                           ├──► Three.js scene
                                │                           ├──► DOM HUD + radar
                                │                           └──► synthesized audio
                                ▼
                      score and wave rules
                                │
                                ▼
                       local browser storage
```

The simulation in `src/logic.ts` owns player movement, seeded wave creation, enemy steering, projectiles, collision, lives, and scoring. It has no WebGL or DOM dependency, so Vitest can exercise it directly.

`src/view.ts` maps the current state into generated Three.js geometry. Meshes are reused by entity identifier and removed when their entities expire. All visuals are generated at runtime; there is no art-asset pipeline.

The browser composition layer owns the animation loop, actions, overlays, HUD/radar, persistence, pause behavior, and audio event bridging. `src/audio.ts` uses Web Audio oscillators and noise rather than downloaded samples.

## Runtime decisions

- A capped simulation delta prevents a backgrounded tab from producing a large physics jump.
- Enemy and scenery placement use seeded pseudo-random values for reproducible unit tests.
- Device pixel ratio is capped at 2 to control fill cost on high-density displays.
- The build is entirely static and can run from Nginx, GitHub Pages, or any object-storage CDN.
- High scores and sound preference stay local to the browser.

## Extension points

Add an enemy by extending `EnemyKind`, its spawn selection and behavior in `logic.ts`, then adding a generated mesh in `view.ts`. Keep scoring and health values centralized near those rules and add a deterministic unit test.

For richer collision, introduce obstacle data to the simulation rather than reading Three.js meshes from game logic. For multiplayer, create a separate authoritative protocol and server; do not synchronize mutable Three.js objects.
