export class Sound {
  private context?: AudioContext;
  muted = false;

  toggle() { this.muted = !this.muted; return this.muted; }
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
}
