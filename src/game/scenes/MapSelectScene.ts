import type { GameScene, SceneContext } from './Scene';
import { MAPS } from '@/game/config/maps';
import { bigButton } from './TitleScene';

export class MapSelectScene implements GameScene {
  private el!: HTMLDivElement;

  enter(ctx: SceneContext): void {
    ctx.audio.startBgm('map-select');
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;background:linear-gradient(180deg,#c8f7c5,#7fd1ff);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;color:#1a2540;padding:calc(18px + env(safe-area-inset-top,0px)) calc(14px + env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) calc(14px + env(safe-area-inset-left,0px));overflow:auto;`;
    const title = document.createElement('div');
    title.textContent = 'どこで あそぶ？';
    title.style.cssText = 'font-size:clamp(26px,6vw,42px);font-weight:900;margin-bottom:clamp(14px,3vw,24px);text-align:center;';
    el.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;gap:clamp(10px,2vw,20px);flex-wrap:wrap;justify-content:center;max-width:900px;margin-bottom:clamp(16px,3vw,32px);';
    el.appendChild(grid);

    MAPS.forEach((m) => {
      const card = document.createElement('button');
      card.style.cssText = `
        width:clamp(132px,28vw,220px);height:clamp(126px,26vw,200px);border-radius:24px;cursor:pointer;border:none;
        background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
        box-shadow:0 6px 0 #ccc;
        font-family:'Zen Maru Gothic',sans-serif;
      `;
      const emoji = document.createElement('div');
      emoji.textContent = m.emoji;
      emoji.style.cssText = 'font-size:clamp(46px,10vw,80px);';
      card.appendChild(emoji);
      const name = document.createElement('div');
      name.textContent = m.nameHiragana;
      name.style.cssText = 'font-size:clamp(15px,3vw,22px);font-weight:700;margin-top:8px;';
      card.appendChild(name);
      card.onclick = () => {
        ctx.audio.playSfx('click');
        ctx.selectMap(m.id);
        ctx.goto({ id: 'battle', mapId: m.id });
      };
      grid.appendChild(card);
    });

    const back = bigButton('← もどる', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'skin-select' }); });
    back.style.background = '#90caf9';
    back.style.boxShadow = '0 6px 0 #1976d2';
    el.appendChild(back);

    ctx.uiOverlay.appendChild(el);
    this.el = el;
  }

  exit(): void {
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }
}
