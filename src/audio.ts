export class Sound {
  private context?: AudioContext;
  private lastTreadAt = 0;
  private treadSide = false;
  muted = false;

  toggle() {
    this.muted = !this.muted;
    if (this.muted) this.lastTreadAt = 0;
    return this.muted;
  }
  private ctx() { return this.context ??= new AudioContext(); }
  tone(frequency: number, duration: number, type: OscillatorType = 'square', volume = .025) {
    if (this.muted) return;
    const c = this.ctx(), osc = c.createOscillator(), gain = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination); osc.start(); osc.stop(c.currentTime + duration);
  }
  shoot() { this.tone(105, .12, 'sawtooth', .04); }
  hit() { this.tone(48, .35, 'square', .055); }
  wave() { this.tone(420, .15, 'sine', .03); setTimeout(() => this.tone(620, .2, 'sine', .03), 100); }

  enemyImpact(destroyed: boolean) {
    if (this.muted) return;
    const c = this.ctx();
    const duration = destroyed ? .52 : .26;
    const now = c.currentTime;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const decay = Math.pow(1 - i / data.length, destroyed ? 2.4 : 3.5);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(destroyed ? 1250 : 850, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);
    gain.gain.setValueAtTime(destroyed ? .12 : .075, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    noise.connect(filter).connect(gain).connect(c.destination);
    noise.start(now);

    const boom = c.createOscillator();
    const boomGain = c.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(destroyed ? 92 : 145, now);
    boom.frequency.exponentialRampToValueAtTime(34, now + duration);
    boomGain.gain.setValueAtTime(destroyed ? .075 : .04, now);
    boomGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    boom.connect(boomGain).connect(c.destination);
    boom.start(now);
    boom.stop(now + duration);

    if (destroyed) {
      setTimeout(() => this.tone(43, .32, 'square', .045), 75);
    }
  }

  movement(amount: number, active: boolean, nowMs: number) {
    if (!active || this.muted || amount < .05) {
      this.lastTreadAt = 0;
      return;
    }
    const interval = 170 - Math.min(1, amount) * 72;
    if (this.lastTreadAt && nowMs - this.lastTreadAt < interval) return;
    this.lastTreadAt = nowMs;
    this.treadSide = !this.treadSide;

    const c = this.ctx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime((this.treadSide ? 54 : 46) + amount * 15, now);
    osc.frequency.exponentialRampToValueAtTime(31, now + .075);
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    gain.gain.setValueAtTime(.032, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .085);
    osc.connect(filter).connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + .09);
  }
}
