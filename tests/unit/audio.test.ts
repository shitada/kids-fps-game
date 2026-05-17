import { describe, expect, it } from 'vitest';
import { BGM_TRACKS, battleTrackForMap, type BgmTrackId } from '@/game/audio/AudioEngine';

describe('BGM tracks', () => {
  it('provides distinct music for scenes and stages', () => {
    const expected: BgmTrackId[] = [
      'title',
      'skin-select',
      'map-select',
      'battle-pool-park',
      'battle-castle-garden',
      'battle-cloud-plaza',
      'result-victory',
      'result-rank',
    ];

    expect(Object.keys(BGM_TRACKS).sort()).toEqual([...expected].sort());
    for (const id of expected) {
      expect(BGM_TRACKS[id].steps.length).toBeGreaterThan(0);
    }
  });

  it('uses at least three-note chords for battle tracks', () => {
    const battleTracks: BgmTrackId[] = ['battle-pool-park', 'battle-castle-garden', 'battle-cloud-plaza'];

    for (const id of battleTracks) {
      const track = BGM_TRACKS[id];
      expect(track.tempo).toBeGreaterThanOrEqual(130);
      for (const step of track.steps) {
        expect(step.chord.length).toBeGreaterThanOrEqual(3);
        expect(step.chord.every((note) => Number.isFinite(note.frequency) && note.frequency > 0)).toBe(true);
      }
    }
  });

  it('maps each stage to its battle track', () => {
    expect(battleTrackForMap('pool-park')).toBe('battle-pool-park');
    expect(battleTrackForMap('castle-garden')).toBe('battle-castle-garden');
    expect(battleTrackForMap('cloud-plaza')).toBe('battle-cloud-plaza');
    expect(battleTrackForMap('unknown')).toBe('battle-pool-park');
  });
});
