import { describe, it, expect } from 'vitest';
import { buildWaveSchedule, waveSpawnCount, spawnPosition, validateWave } from '../src/core/spawn.js';
import { SECTORS } from '../src/core/levels.js';
import { makeRng } from '../src/core/rng.js';
import { FIELD } from '../src/core/entities.js';

describe('spawn: schedule', () => {
  const wave = {
    entries: [
      { type: 'mote', count: 3, interval: 0.5, pattern: 'top' },
      { type: 'swarmer', count: 2, interval: 1, delay: 2, pattern: 'sides' },
    ],
  };

  it('flattens entries into the right number of spawns', () => {
    expect(buildWaveSchedule(wave)).toHaveLength(5);
    expect(waveSpawnCount(wave)).toBe(5);
  });

  it('sorts spawns by time', () => {
    const sched = buildWaveSchedule(wave);
    for (let i = 1; i < sched.length; i++) {
      expect(sched[i].at).toBeGreaterThanOrEqual(sched[i - 1].at);
    }
  });

  it('computes spawn times from delay + index*interval', () => {
    const sched = buildWaveSchedule(wave);
    const motes = sched.filter((s) => s.type === 'mote').map((s) => s.at);
    expect(motes).toEqual([0, 0.5, 1]);
    const swarm = sched.filter((s) => s.type === 'swarmer').map((s) => s.at);
    expect(swarm).toEqual([2, 3]);
  });
});

describe('spawn: positions', () => {
  it('places enemies within or just outside the field', () => {
    const rng = makeRng(5);
    for (const pat of ['top', 'sides', 'ring', 'boss', 'random']) {
      for (let i = 0; i < 6; i++) {
        const p = spawnPosition(pat, i, 6, rng);
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThan(FIELD.minX - 6);
        expect(p.x).toBeLessThan(FIELD.maxX + 6);
      }
    }
  });
});

describe('spawn: level data integrity', () => {
  it('all sectors have valid waves referencing real enemy types', () => {
    expect(SECTORS).toHaveLength(5);
    for (const sector of SECTORS) {
      expect(sector.waves.length).toBeGreaterThan(0);
      for (const wave of sector.waves) {
        expect(validateWave(wave)).toBe(true);
      }
    }
  });

  it('sectors 3 and 5 end with a boss wave', () => {
    const s3 = SECTORS[2].waves;
    const s5 = SECTORS[4].waves;
    expect(s3[s3.length - 1].boss).toBe(true);
    expect(s5[s5.length - 1].boss).toBe(true);
  });
});
