import './style.css';
import { Sound } from './audio';
import { initialState, mulberry32, spawnWave, step } from './logic';
import { View } from './view';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="game">
    <section class="hud">
      <div class="stats" role="status" aria-live="polite" aria-atomic="true" aria-label="Mission status">
        <div>SCORE <span id="score">000000</span></div>
        <div>HIGH <span id="high">000000</span></div>
        <div>WAVE <span id="wave">0</span></div>
        <div>LIVES <span id="lives">3</span></div>
      </div>
      <canvas id="radar" width="200" height="200" aria-label="Enemy radar"></canvas>
      <div class="reticle" aria-hidden="true"></div>
      <div class="cockpit" aria-hidden="true"><i></i><b></b><i></i></div>
      <div class="status">WASD / ARROWS · MOUSE AIM · CLICK / SPACE FIRE · P PAUSE</div>
      <div class="actions">
        <button class="icon-btn" id="mute" aria-pressed="false" title="Mute (M)">SOUND ON</button>
        <button class="icon-btn" id="full" title="Fullscreen (F)">FULLSCREEN</button>
      </div>
    </section>
    <div class="scanlines"></div>
    <section class="message" id="message">
      <div class="panel">
        <h1 id="title">VECTOR<br>SIEGE</h1>
        <p class="tagline" id="tagline">OUTNUMBERED. NEVER OUTGUNNED.</p>
        <p class="help" id="help">Drive with WASD or arrow keys. Aim with the mouse.<br>
          Fire with click or Space. Hunt hostiles on radar.<br>
          Fast strikers, homing drones, and bonus saucers await.</p>
        <button class="primary" id="start">START MISSION</button>
      </div>
    </section>
  </main>`;

const game = app.querySelector<HTMLElement>('.game')!;
const view = new View(game);
const sound = new Sound();
const stored = Number(localStorage.getItem('vector-siege-high') || 0);
const state = initialState(stored);
const random = mulberry32(Date.now());
const keys = new Set<string>();
let mouseTurn = 0, last = performance.now(), previousShots = 0, previousLives = state.lives, previousWave = 0;

const $ = (id: string) => document.getElementById(id)!;
const overlay = $('message'), start = $('start') as HTMLButtonElement;

function begin() {
  if (state.phase === 'gameover') {
    const fresh = initialState(state.highScore);
    Object.assign(state, fresh);
  }
  state.phase = 'playing';
  if (!state.enemies.length) spawnWave(state, random);
  overlay.hidden = true;
  game.querySelector('canvas')?.focus();
}

function showPause() {
  $('title').innerHTML = 'MISSION<br>PAUSED'; $('tagline').textContent = 'THE BATTLEFIELD IS HOLDING.';
  $('help').textContent = 'Press P or choose resume when you are ready.';
  start.textContent = 'RESUME'; overlay.hidden = false;
}

function togglePause() {
  if (state.phase === 'playing') { state.phase = 'paused'; showPause(); }
  else if (state.phase === 'paused') begin();
}

start.addEventListener('click', begin);
addEventListener('keydown', e => {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyF') toggleFullscreen();
});
addEventListener('keyup', e => keys.delete(e.code));
game.addEventListener('mousedown', e => {
  if (state.phase === 'playing') {
    keys.add('MouseFire');
    if (document.pointerLockElement !== view.renderer.domElement) view.renderer.domElement.requestPointerLock?.();
  }
});
addEventListener('mouseup', () => keys.delete('MouseFire'));
addEventListener('mousemove', e => { if (document.pointerLockElement === view.renderer.domElement) mouseTurn += e.movementX * .012; });
addEventListener('blur', () => { keys.clear(); if (state.phase === 'playing') togglePause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    keys.clear();
    if (state.phase === 'playing') togglePause();
  }
});

function toggleMute() {
  const muted = sound.toggle(), b = $('mute');
  b.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; b.setAttribute('aria-pressed', String(muted));
}
function toggleFullscreen() {
  if (!document.fullscreenElement) game.requestFullscreen?.(); else document.exitFullscreen?.();
}
$('mute').addEventListener('click', toggleMute);
$('full').addEventListener('click', toggleFullscreen);

function updateHud() {
  game.dataset.phase = state.phase;
  game.dataset.wave = String(state.wave);
  game.dataset.score = String(state.score);
  $('score').textContent = String(state.score).padStart(6, '0');
  $('high').textContent = String(state.highScore).padStart(6, '0');
  $('wave').textContent = String(state.wave); $('lives').textContent = String(state.lives);
  localStorage.setItem('vector-siege-high', String(state.highScore));
  const c = $('radar') as HTMLCanvasElement, ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 200, 200); ctx.strokeStyle = '#326c49'; ctx.beginPath();
  ctx.moveTo(100, 0); ctx.lineTo(100, 200); ctx.moveTo(0, 100); ctx.lineTo(200, 100); ctx.stroke();
  ctx.fillStyle = '#65ff9b'; ctx.fillRect(97, 97, 6, 6);
  const cos = Math.cos(-state.player.heading), sin = Math.sin(-state.player.heading);
  for (const e of state.enemies) {
    const dx = e.position.x - state.player.position.x, dz = e.position.z - state.player.position.z;
    const x = dx * cos - dz * sin, z = dx * sin + dz * cos;
    ctx.fillStyle = e.kind === 'saucer' ? '#ffca58' : '#ff594d';
    ctx.fillRect(98 + x * 1.15, 98 - z * 1.15, 4, 4);
  }
}

function loop(now: number) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  const turnKeys = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const turn = Math.max(-1, Math.min(1, turnKeys + mouseTurn)); mouseTurn *= .45;
  step(state, { forward, turn, fire: keys.has('Space') || keys.has('MouseFire') }, dt, random);
  if (state.shots.length > previousShots && state.shots.some(s => s.owner === 'player')) sound.shoot();
  if (state.lives < previousLives) sound.hit();
  if (state.wave > previousWave && previousWave > 0) sound.wave();
  previousShots = state.shots.length; previousLives = state.lives; previousWave = state.wave;
  if (state.phase === 'gameover' && overlay.hidden) {
    $('title').innerHTML = 'MISSION<br>ENDED'; $('tagline').textContent = `FINAL SCORE ${state.score}`;
    $('help').textContent = `You reached wave ${state.wave}. The arena remembers your high score.`;
    start.textContent = 'TRY AGAIN'; overlay.hidden = false; document.exitPointerLock?.();
  }
  updateHud(); view.render(state, now / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
