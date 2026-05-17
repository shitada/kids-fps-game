import type { GameScene, SceneContext } from './Scene';
import { SKIN_ORDER, SKINS } from '@/game/config/skins';

export class TitleScene implements GameScene {
  private ctx!: SceneContext;
  private el!: HTMLDivElement;

  enter(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.audio.startBgm('title');
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      background:linear-gradient(180deg,#bdf,#9cf);
      color:#1a2540;font-family:'Zen Maru Gothic',sans-serif;
      pointer-events:auto;
      padding:calc(20px + env(safe-area-inset-top,0px)) calc(16px + env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) calc(16px + env(safe-area-inset-left,0px));
      overflow:auto;
    `;

    const title = document.createElement('div');
    title.innerHTML = `💦 スプラッシュ <br/>キッズバトル 🎈`;
    title.style.cssText = 'font-size:clamp(34px,8vw,64px);font-weight:900;text-align:center;color:#0d47a1;text-shadow:0 4px 0 rgba(255,255,255,0.7);margin-bottom:clamp(12px,3vw,24px);line-height:1.08;';
    el.appendChild(title);

    const sub = document.createElement('div');
    sub.textContent = 'みずでっぽうで みんなを びしょびしょに しよう！';
    sub.style.cssText = 'font-size:clamp(15px,3.2vw,22px);margin-bottom:clamp(18px,4vw,36px);text-align:center;';
    el.appendChild(sub);

    const play = bigButton('▶ あそぶ', () => {
      ctx.audio.resume();
      ctx.audio.playSfx('click');
      ctx.goto({ id: 'skin-select' });
    });
    el.appendChild(play);

    const diff = document.createElement('div');
    diff.style.cssText = 'margin-top:clamp(18px,4vw,30px);font-size:clamp(14px,2.8vw,18px);display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;';
    diff.innerHTML = `<span>むずかしさ:</span>`;
    (['easy', 'normal', 'hard'] as const).forEach((d) => {
      const labels = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' };
      const btn = document.createElement('button');
      btn.textContent = labels[d];
      btn.style.cssText = btnStyle(ctx.save.difficulty === d);
      btn.onclick = () => {
        ctx.audio.playSfx('click');
        ctx.saveUpdate({ difficulty: d });
        diff.querySelectorAll('button').forEach((b, i) => {
          b.style.cssText = btnStyle((['easy', 'normal', 'hard'] as const)[i] === d);
        });
      };
      diff.appendChild(btn);
    });
    el.appendChild(diff);

    const wins = document.createElement('div');
    wins.style.cssText = 'position:absolute;bottom:20px;right:20px;font-size:14px;color:#0d47a1;';
    wins.textContent = `かちすう: ${ctx.save.totalWins} / プレイすう: ${ctx.save.totalMatches}`;
    el.appendChild(wins);

    ctx.uiOverlay.appendChild(el);
    this.el = el;
  }

  exit(): void {
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }
}

function bigButton(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = `
    font-family:'Zen Maru Gothic',sans-serif;
    font-size:clamp(22px,5vw,36px);font-weight:900;color:#fff;background:#ff7043;
    border:none;border-radius:24px;padding:clamp(12px,2.5vw,18px) clamp(30px,8vw,56px);cursor:pointer;
    box-shadow:0 6px 0 #d84315;
    transition:transform 0.05s;
  `;
  b.onmousedown = () => b.style.transform = 'translateY(4px)';
  b.onmouseup = () => b.style.transform = '';
  b.onmouseleave = () => b.style.transform = '';
  b.onclick = onClick;
  return b;
}

function btnStyle(active: boolean): string {
  return `
    font-family:'Zen Maru Gothic',sans-serif;
    font-size:18px;padding:8px 18px;border-radius:14px;border:none;cursor:pointer;
    background:${active ? '#0d47a1' : '#fff'};color:${active ? '#fff' : '#0d47a1'};
    box-shadow:0 3px 0 ${active ? '#082c66' : '#bdd'};
  `;
}

export { bigButton, btnStyle };
