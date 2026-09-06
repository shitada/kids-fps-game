import type { GameScene, SceneContext } from './Scene';
import { MenuStage } from './MenuStage';

export class TitleScene implements GameScene {
  private el!: HTMLDivElement;
  private stage!: MenuStage;

  enter(ctx: SceneContext): void {
    ctx.audio.startBgm('title');
    const el = document.createElement('div');
    el.className = 'park-menu title-menu';
    el.innerHTML = `
      <main class="title-layout">
        <section class="title-copy">
          <h1 class="park-logo"><span>スプラッシュ</span><br>キッズバトル<span class="logo-drop" aria-hidden="true"></span></h1>
          <p class="title-description">みずでっぽうで みんなを<br>びしょびしょに しよう！</p>
          <div class="title-play"></div>
          <fieldset class="difficulty"><legend>むずかしさ</legend><div class="difficulty-options"></div></fieldset>
        </section>
        <div class="menu-preview title-preview" role="img" aria-label="みずあそびパークの なかまたち"></div>
      </main>
      <footer class="menu-footer"><span>ひとりで あそべる みずあそび</span><span class="play-record"></span></footer>`;
    el.querySelector('.title-play')!.appendChild(bigButton('▶ あそぶ', () => {
      ctx.audio.resume();
      ctx.audio.playSfx('click');
      ctx.goto({ id: 'skin-select' });
    }));
    const options = el.querySelector('.difficulty-options')!;
    for (const [id, label] of [['easy', 'かんたん'], ['normal', 'ふつう'], ['hard', 'むずかしい']] as const) {
      const button = document.createElement('button');
      button.className = 'choice-button';
      button.textContent = label;
      button.setAttribute('aria-pressed', String(ctx.save.difficulty === id));
      button.onclick = () => {
        ctx.audio.playSfx('click');
        ctx.saveUpdate({ difficulty: id });
        options.querySelectorAll('button').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      };
      options.appendChild(button);
    }
    el.querySelector('.play-record')!.textContent = `かちすう: ${ctx.save.totalWins} / プレイすう: ${ctx.save.totalMatches}`;
    ctx.uiOverlay.appendChild(el);
    this.el = el;
    this.stage = new MenuStage(ctx, el.querySelector('.menu-preview')!, ctx.save.selectedSkin, 'title');
  }

  exit(): void {
    this.stage.dispose();
    this.el.remove();
  }
}

export function bigButton(text: string, onClick: () => void, secondary = false): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `park-button${secondary ? ' park-button-secondary' : ''}`;
  button.textContent = text;
  button.onclick = onClick;
  return button;
}
