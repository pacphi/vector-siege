export type Vec2 = { x: number; z: number };
export type EnemyKind = 'tank' | 'fast' | 'drone' | 'saucer';
export type Phase = 'title' | 'playing' | 'paused' | 'gameover';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  position: Vec2;
  heading: number;
  hp: number;
  cooldown: number;
}

export interface Shot {
  id: number;
  owner: 'player' | 'enemy';
  position: Vec2;
  velocity: Vec2;
  ttl: number;
}

export interface GameState {
  phase: Phase;
  score: number;
  highScore: number;
  lives: number;
  wave: number;
  player: { position: Vec2; heading: number; cooldown: number; invulnerable: number };
  enemies: Enemy[];
  shots: Shot[];
}

export interface InputFrame {
  forward: number;
  turn: number;
  fire: boolean;
}
