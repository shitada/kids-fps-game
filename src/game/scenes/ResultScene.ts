import type { GameScene, SceneContext } from './Scene';
import type { MatchResult } from '@/types';
import { SKINS } from '@/game/config/skins';
import { bigButton } from './TitleScene';
import { MenuStage } from './MenuStage';

export class ResultScene implements GameScene {
  private el!: HTMLDivElement;
  private stage!: MenuStage;

  constructor(private result: MatchResult) {}

  enter(ctx: SceneContext): void {
    const r = this.result;
    ctx.audio.startBgm(r.victory ? 'result-victory' : 'result-rank');
    const el = document.createElement('div');
    el.className = 'park-menu result-menu';
    el.innerHTML = `
      <main class="result-layout">
        <div class="menu-preview result-preview" role="img" aria-label="${SKINS[ctx.save.selectedSkin].nameHiragana}と おいわい"></div>
        <section class="result-panel">
          <h1>${r.victory ? 'ゆうしょう！' : `${r.rank}い`}</h1>
          <p class="result-summary">${r.victory ? 'ぜんいんびしょぬれにしたよ！' : `${r.totalPlayers}にんちゅう ${r.rank}い だったよ！`}</p>
          <dl class="result-stats">
            <div><dt>びしょぬれにしたかず</dt><dd>${r.eliminations}<small>にん</small></dd></div>
            <div><dt>じかん</dt><dd>${Math.floor(r.durationSec)}<small>びょう</small></dd></div>
          </dl>
          <p class="result-kind-note">たくさん あそんだね！</p>
          <div class="result-actions"></div>
        </section>
      </main>`;
    el.querySelector('.result-actions')!.append(
      bigButton('▶ もういっかい', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'map-select' }); }),
      bigButton('🏠 さいしょへ', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'title' }); }, true),
    );
    ctx.uiOverlay.appendChild(el);
    this.el = el;
    this.stage = new MenuStage(ctx, el.querySelector('.menu-preview')!, ctx.save.selectedSkin, 'result');
  }

  exit(): void {
    this.stage.dispose();
    this.el.remove();
  }
}
