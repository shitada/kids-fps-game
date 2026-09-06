import { QUALITY } from './visuals';

export class RenderQuality {
  pixelRatio: number;
  private total = 0;
  private samples = 0;
  private fastWindows = 0;

  constructor(readonly maximum: number) {
    this.pixelRatio = maximum;
  }

  reset(): void {
    this.total = 0;
    this.samples = 0;
    this.fastWindows = 0;
  }

  sample(frameMs: number): number {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return this.pixelRatio;
    this.total += Math.min(frameMs, 100);
    if (++this.samples < QUALITY.sampleFrames) return this.pixelRatio;
    const average = this.total / this.samples;
    if (average > QUALITY.slowFrameMs) {
      this.pixelRatio = Math.max(Math.min(this.maximum, QUALITY.minPixelRatio), this.pixelRatio - 0.15);
      this.fastWindows = 0;
    } else if (average < QUALITY.fastFrameMs) {
      if (++this.fastWindows >= 4) {
        this.pixelRatio = Math.min(this.maximum, this.pixelRatio + 0.1);
        this.fastWindows = 0;
      }
    } else {
      this.fastWindows = 0;
    }
    this.total = 0;
    this.samples = 0;
    return this.pixelRatio;
  }
}
