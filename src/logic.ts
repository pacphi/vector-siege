import type { Enemy, EnemyKind, GameState, InputFrame, Shot, Vec2 } from './types';

export const ARENA_RADIUS = 72;
const PLAYER_SPEED = 12;
let nextId = 1;

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
export const mulberry32 = (seed: number) => () => {
  let t = seed += 0x6d2b79f5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

export function initialState(highScore = 0): GameState {
  nextId = 1;
  return {
    phase: 'title', score: 0, highScore, lives: 3, wave: 0,
    player: { position: { x: 0, z: 0 }, heading: 0, cooldown: 0, invulnerable: 0 },
    enemies: [], shots: [], impacts: []
  };
}

function enemy(kind: EnemyKind, angle: number, radius: number): Enemy {
  const hp = kind === 'drone' ? 2 : 1;
  return {
    id: nextId++, kind, position: { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius },
    heading: angle + Math.PI, hp, cooldown: 0.5 + radius / 60
  };
}

export function spawnWave(state: GameState, random: () => number): void {
  state.wave++;
  const count = Math.min(3 + state.wave, 10);
  const minimumRadius = state.wave === 1 ? 58 : 48;
  const radiusRange = state.wave === 1 ? 10 : 19;
  for (let i = 0; i < count; i++) {
    const roll = random();
    const kind: EnemyKind = state.wave > 3 && roll > .75 ? 'drone' : state.wave > 1 && roll > .48 ? 'fast' : 'tank';
    state.enemies.push(enemy(kind, random() * Math.PI * 2, minimumRadius + random() * radiusRange));
  }
  if (state.wave % 2 === 0) state.enemies.push(enemy('saucer', random() * Math.PI * 2, 58));
}

function shot(owner: Shot['owner'], p: Vec2, heading: number, speed: number): Shot {
  return { id: nextId++, owner, position: { ...p }, velocity: { x: Math.sin(heading) * speed, z: Math.cos(heading) * speed }, ttl: 2.5 };
}

const clampArena = (p: Vec2) => {
  const d = Math.hypot(p.x, p.z);
  if (d > ARENA_RADIUS) { p.x *= ARENA_RADIUS / d; p.z *= ARENA_RADIUS / d; }
};

export function step(state: GameState, input: InputFrame, dt: number, random: () => number): void {
  dt = Math.min(dt, .05);
  for (const impact of state.impacts) impact.ttl -= dt;
  state.impacts = state.impacts.filter(impact => impact.ttl > 0);
  if (state.phase !== 'playing') return;
  const p = state.player;
  p.heading += input.turn * 1.8 * dt;
  p.position.x += Math.sin(p.heading) * input.forward * PLAYER_SPEED * dt;
  p.position.z += Math.cos(p.heading) * input.forward * PLAYER_SPEED * dt;
  clampArena(p.position);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  if (input.fire && p.cooldown === 0) {
    state.shots.push(shot('player', { x: p.position.x + Math.sin(p.heading) * 2, z: p.position.z + Math.cos(p.heading) * 2 }, p.heading, 34));
    p.cooldown = .38;
  }

  for (const e of state.enemies) {
    const dx = p.position.x - e.position.x, dz = p.position.z - e.position.z;
    const target = Math.atan2(dx, dz);
    const delta = Math.atan2(Math.sin(target - e.heading), Math.cos(target - e.heading));
    const turnRate = e.kind === 'drone' ? 2.4 : e.kind === 'fast' ? 1.7 : .9;
    e.heading += Math.sign(delta) * Math.min(Math.abs(delta), turnRate * dt);
    const d = Math.hypot(dx, dz);
    const speed = e.kind === 'drone' ? 10 : e.kind === 'fast' ? 8 : e.kind === 'saucer' ? 7 : 4.5;
    if (e.kind === 'saucer' || d > (e.kind === 'drone' ? 5 : 18)) {
      e.position.x += Math.sin(e.heading) * speed * dt;
      e.position.z += Math.cos(e.heading) * speed * dt;
    }
    clampArena(e.position);
    e.cooldown -= dt;
    if (e.kind !== 'saucer' && d < 45 && e.cooldown <= 0) {
      state.shots.push(shot('enemy', e.position, target + (random() - .5) * .09, e.kind === 'drone' ? 20 : 16));
      e.cooldown = (e.kind === 'fast' ? 1.5 : 2.3) + random();
    }
    if (e.kind !== 'saucer' && d < 2.5 && p.invulnerable === 0) damagePlayer(state);
  }

  for (const s of state.shots) {
    s.position.x += s.velocity.x * dt; s.position.z += s.velocity.z * dt; s.ttl -= dt;
    if (s.owner === 'player') {
      for (const e of state.enemies) {
        if (e.hp <= 0 || distance(s.position, e.position) >= (e.kind === 'saucer' ? 3 : 2.2)) continue;
        e.hp--; s.ttl = 0;
        state.impacts.push({
          id: nextId++,
          position: { ...e.position },
          kind: e.kind,
          destroyed: e.hp <= 0,
          ttl: e.hp <= 0 ? 1.15 : .7,
        });
        if (e.hp <= 0) state.score += e.kind === 'saucer' ? 500 : e.kind === 'drone' ? 250 : e.kind === 'fast' ? 150 : 100;
        break;
      }
    } else if (p.invulnerable === 0 && distance(s.position, p.position) < 1.7) {
      s.ttl = 0; damagePlayer(state);
    }
  }
  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.shots = state.shots.filter(s => s.ttl > 0 && Math.hypot(s.position.x, s.position.z) < ARENA_RADIUS + 10);
  state.highScore = Math.max(state.highScore, state.score);
  if (!state.enemies.length && state.phase === 'playing') spawnWave(state, random);
}

function damagePlayer(state: GameState) {
  state.lives--; state.player.invulnerable = 2.2;
  state.player.position = { x: 0, z: 0 };
  if (state.lives <= 0) state.phase = 'gameover';
}
