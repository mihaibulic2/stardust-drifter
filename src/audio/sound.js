// Fully synthesized audio (no asset files): chiptune-soft SFX + a cozy lo-fi pad.
// The AudioContext is created on the first user gesture (browser autoplay rules).
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let muted = false;
  let musicTimer = null;
  let noiseBuffer = null;

  // pentatonic-ish cozy scale (Hz) for the ambient bells
  const SCALE = [261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 587.33];
  let step = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1.0;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0;
    musicBus.connect(master);

    // white-noise buffer for percussive/explosion sounds
    const len = ctx.sampleRate * 1.0;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    startMusic();
  }

  function resume() {
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    // fade music in
    if (!muted) musicBus.gain.setTargetAtTime(0.16, ctx.currentTime, 1.2);
  }

  function tone({ freq = 440, dur = 0.15, type = 'sine', gain = 0.3, slideTo = null, attack = 0.005, bus }) {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(bus || sfxBus);
    o.start(now);
    o.stop(now + dur + 0.03);
  }

  function noise({ dur = 0.2, gain = 0.3, freq = 1000, q = 0.7, type = 'bandpass', bus }) {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filt).connect(g).connect(bus || sfxBus);
    src.start(now);
    src.stop(now + dur + 0.03);
  }

  function arp(freqs, spacing = 0.06, opts = {}) {
    freqs.forEach((f, i) => {
      const now = ctx.currentTime + i * spacing;
      const o = ctx.createOscillator();
      o.type = opts.type || 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(opts.gain || 0.25, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (opts.dur || 0.18));
      o.connect(g).connect(sfxBus);
      o.start(now);
      o.stop(now + (opts.dur || 0.18) + 0.03);
    });
  }

  const SFX = {
    ui: () => tone({ freq: 660, dur: 0.08, type: 'triangle', gain: 0.18, slideTo: 880 }),
    laser: () => tone({ freq: 1200, dur: 0.09, type: 'sawtooth', gain: 0.06, slideTo: 500 }),
    efire: () => tone({ freq: 320, dur: 0.12, type: 'square', gain: 0.05, slideTo: 180 }),
    missile: () => {
      tone({ freq: 200, dur: 0.3, type: 'sawtooth', gain: 0.1, slideTo: 600 });
      noise({ dur: 0.3, gain: 0.08, freq: 1800, type: 'highpass' });
    },
    explosion: () => {
      noise({ dur: 0.4, gain: 0.35, freq: 700, type: 'lowpass' });
      tone({ freq: 160, dur: 0.35, type: 'sine', gain: 0.18, slideTo: 50 });
    },
    hit: () => {
      noise({ dur: 0.18, gain: 0.25, freq: 500, type: 'lowpass' });
      tone({ freq: 220, dur: 0.18, type: 'square', gain: 0.12, slideTo: 110 });
    },
    seed: () => arp([784, 1046], 0.05, { gain: 0.18, dur: 0.16, type: 'sine' }),
    power: () => arp([523, 659, 784, 1046], 0.05, { gain: 0.2, dur: 0.18 }),
    oneup: () => arp([523, 659, 784, 1046, 1318], 0.07, { gain: 0.24, dur: 0.2 }),
    ultimate: () => {
      tone({ freq: 200, dur: 0.6, type: 'sawtooth', gain: 0.22, slideTo: 1600 });
      noise({ dur: 0.6, gain: 0.18, freq: 2400, type: 'highpass' });
    },
    bossEnter: () => {
      tone({ freq: 90, dur: 0.9, type: 'sawtooth', gain: 0.22, slideTo: 70 });
      tone({ freq: 135, dur: 0.9, type: 'sine', gain: 0.14 });
    },
    playerDown: () => {
      tone({ freq: 440, dur: 0.7, type: 'triangle', gain: 0.25, slideTo: 80 });
      noise({ dur: 0.5, gain: 0.2, freq: 600, type: 'lowpass' });
    },
    relight: () => arp([523, 659, 784, 1046, 1318, 1568], 0.08, { gain: 0.22, dur: 0.5, type: 'sine' }),
    gameover: () => arp([440, 392, 330, 262], 0.18, { gain: 0.22, dur: 0.5, type: 'triangle' }),
  };

  function startMusic() {
    // sustained warm pad (two detuned saws through a gentle lowpass)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 700;
    padFilter.Q.value = 0.6;
    padFilter.connect(musicBus);
    [110, 110.6, 164.81].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.06;
      o.connect(g).connect(padFilter);
      o.start();
    });
    // slow LFO opening/closing the filter for a breathing feel
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(padFilter.frequency);
    lfo.start();

    // gentle bell arpeggio, scheduled softly
    musicTimer = setInterval(() => {
      if (!ctx || muted || ctx.state !== 'running') return;
      step = (step + 1) % 16;
      if (step % 2 === 0 || Math.random() < 0.4) {
        const f = SCALE[Math.floor(Math.random() * SCALE.length)] * (Math.random() < 0.3 ? 2 : 1);
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.05, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        o.connect(g).connect(musicBus);
        o.start(now);
        o.stop(now + 1.0);
      }
    }, 420);
  }

  return {
    resume,
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      if (ctx) {
        master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.05);
      }
      return muted;
    },
    handleEvents(events) {
      if (!ctx || muted || ctx.state !== 'running') return;
      for (const ev of events) {
        if (ev.type === 'sfx' && SFX[ev.name]) {
          try {
            SFX[ev.name]();
          } catch (e) {
            /* never let a sound crash the loop */
          }
        }
      }
    },
  };
}
