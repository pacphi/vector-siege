import { describe, expect, it } from 'vitest';
import { initialState, mulberry32, spawnWave, step } from './logic';

describe('game logic', () => {
  it('creates deterministic waves', () => {
    const a = initialState(), b = initialState();
    spawnWave(a, mulberry32(42)); spawnWave(b, mulberry32(42));
    expect(a.enemies.map(e => [e.kind, e.position])).toEqual(b.enemies.map(e => [e.kind, e.position]));
  });
  it('keeps the opening wave near the far edge of the arena', () => {
    const s = initialState();
    spawnWave(s, mulberry32(7));
    for (const enemy of s.enemies) {
      expect(Math.hypot(enemy.position.x, enemy.position.z)).toBeGreaterThanOrEqual(58);
    }
  });
  it('moves the player in its facing direction', () => {
    const s = initialState(); s.phase = 'playing'; spawnWave(s, () => .2);
    step(s, { forward: 1, turn: 0, fire: false }, .05, () => .5);
    expect(s.player.position.z).toBeGreaterThan(0);
  });
  it('fires with a cooldown', () => {
    const s = initialState(); s.phase = 'playing'; spawnWave(s, () => .2);
    step(s, { forward: 0, turn: 0, fire: true }, .01, () => .5);
    step(s, { forward: 0, turn: 0, fire: true }, .01, () => .5);
    expect(s.shots.filter(x => x.owner === 'player')).toHaveLength(1);
  });
  it('allows one projectile to hit only one overlapping target', () => {
    const s = initialState(); s.phase = 'playing'; spawnWave(s, () => .2);
    s.enemies = s.enemies.slice(0, 2);
    for (const e of s.enemies) {
      e.position = { x: 0, z: 3 };
      e.hp = 1;
    }
    step(s, { forward: 0, turn: 0, fire: true }, .03, () => .5);
    expect(s.enemies).toHaveLength(1);
    expect(s.score).toBe(100);
    expect(s.impacts).toHaveLength(1);
    expect(s.impacts[0]).toMatchObject({ destroyed: true, kind: 'tank' });
  });
  it('emits a non-destructive impact when a tougher enemy is hit', () => {
    const s = initialState(); s.phase = 'playing'; spawnWave(s, () => .2);
    const target = s.enemies[0];
    target.kind = 'drone';
    target.hp = 2;
    target.position = { x: 0, z: 3 };
    s.enemies = [target];
    step(s, { forward: 0, turn: 0, fire: true }, .03, () => .5);
    expect(s.enemies[0].hp).toBe(1);
    expect(s.impacts[0]).toMatchObject({ destroyed: false, kind: 'drone' });
  });
  it('keeps non-hostile saucers from damaging the player by contact', () => {
    const s = initialState(); s.phase = 'playing'; spawnWave(s, () => .2);
    const saucer = s.enemies[0];
    saucer.kind = 'saucer';
    saucer.position = { ...s.player.position };
    s.enemies = [saucer];
    step(s, { forward: 0, turn: 0, fire: false }, .01, () => .5);
    expect(s.lives).toBe(3);
  });
});
