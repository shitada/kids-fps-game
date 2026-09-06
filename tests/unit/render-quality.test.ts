import { describe, expect, it } from 'vitest';
import { RenderQuality } from '@/game/config/RenderQuality';
import { QUALITY } from '@/game/config/visuals';

describe('visual-only adaptive resolution', () => {
  it('waits for a complete sample and never exceeds the device cap', () => {
    const quality = new RenderQuality(1.5);
    for (let i = 0; i < QUALITY.sampleFrames - 1; i++) quality.sample(30);
    expect(quality.pixelRatio).toBe(1.5);
    quality.sample(30);
    expect(quality.pixelRatio).toBeCloseTo(1.35);
    for (let i = 0; i < 3000; i++) quality.sample(16);
    expect(quality.pixelRatio).toBe(1.5);
  });

  it('ignores invalid samples and resets sample windows between scenes', () => {
    const quality = new RenderQuality(2);
    for (let i = 0; i < 1000; i++) quality.sample(Number.NaN);
    expect(quality.pixelRatio).toBe(2);
    for (let i = 0; i < QUALITY.sampleFrames - 1; i++) quality.sample(30);
    quality.reset();
    quality.sample(30);
    expect(quality.pixelRatio).toBe(2);
  });

  it('still reduces resolution when active rendering is slower than 10fps', () => {
    const quality = new RenderQuality(1.5);
    for (let i = 0; i < QUALITY.sampleFrames; i++) quality.sample(150);
    expect(quality.pixelRatio).toBeCloseTo(1.35);
  });

  it('has a lower bound and requires sustained fast frames to recover', () => {
    const quality = new RenderQuality(1.5);
    for (let i = 0; i < QUALITY.sampleFrames * 16; i++) quality.sample(40);
    expect(quality.pixelRatio).toBe(0.8);
    for (let i = 0; i < QUALITY.sampleFrames * 3; i++) quality.sample(16);
    expect(quality.pixelRatio).toBe(0.8);
    for (let i = 0; i < QUALITY.sampleFrames; i++) quality.sample(16);
    expect(quality.pixelRatio).toBeCloseTo(0.9);
  });
});
