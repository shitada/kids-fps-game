import type { GameScene, SceneContext } from './Scene';
import type { MatchResult } from '@/types';
import { bigButton } from './TitleScene';

export class ResultScene implements GameScene {
  private el!: HTMLDivElement;
  private result: MatchResult;

  constructor(result: MatchResult) {
    this.result = result;
  }

  enter(ctx: SceneContext): void {
    const r = this.result;
    ctx.audio.startBgm(r.victory ? 'result-victory' : 'result-rank');
    const bg = r.victory ? 'linear-gradient(180deg,#fff59d,#ffb74d)' : 'linear-gradient(180deg,#b3e5fc,#80deea)';
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;color:#1a2540;font-family:'Zen Maru Gothic',sans-serif;`;

    const headline = document.createElement('div');
    headline.textContent = r.victory ? '🏆 ゆうしょう！' : `${r.rank}い`;
    headline.style.cssText = `font-size:${r.victory ? 96 : 72}px;font-weight:900;color:${r.victory ? '#e65100' : '#0d47a1'};margin-bottom:16px;`;
    el.appendChild(headline);

    const subtitle = document.createElement('div');
    subtitle.textContent = r.victory ? 'ぜんいんびしょぬれにしたよ！' : `${r.totalPlayers}にんちゅう ${r.rank}い だったよ！`;
    subtitle.style.cssText = 'font-size:24px;margin-bottom:8px;';
    el.appendChild(subtitle);

    const stats = document.createElement('div');
    stats.innerHTML = `びしょぬれにしたかず：${r.eliminations} <br/> じかん：${Math.floor(r.durationSec)}びょう`;
    stats.style.cssText = 'font-size:20px;text-align:center;margin-bottom:32px;';
    el.appendChild(stats);

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:20px;';
    const again = bigButton('▶ もういっかい', () => {
      ctx.audio.playSfx('click');
      ctx.goto({ id: 'map-select' });
    });
    btns.appendChild(again);
    const home = bigButton('🏠 さいしょへ', () => {
      ctx.audio.playSfx('click');
      ctx.goto({ id: 'title' });
    });
    home.style.background = '#90caf9';
    home.style.boxShadow = '0 6px 0 #1976d2';
    btns.appendChild(home);
    el.appendChild(btns);

    ctx.uiOverlay.appendChild(el);
    this.el = el;
  }

  exit(): void {
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }
}
