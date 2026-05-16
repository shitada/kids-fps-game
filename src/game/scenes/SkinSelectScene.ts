import type { GameScene, SceneContext } from './Scene';
import { SKIN_ORDER, SKINS, isUnlocked } from '@/game/config/skins';
import { bigButton } from './TitleScene';

export class SkinSelectScene implements GameScene {
  private el!: HTMLDivElement;

  enter(ctx: SceneContext): void {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;background:linear-gradient(180deg,#fff5d6,#ffd6e0);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;color:#1a2540;`;
    const title = document.createElement('div');
    title.textContent = 'どのこで あそぶ？';
    title.style.cssText = 'font-size:42px;font-weight:900;margin-bottom:24px;';
    el.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;gap:20px;flex-wrap:wrap;justify-content:center;max-width:900px;margin-bottom:32px;';
    el.appendChild(grid);

    const selected = { id: ctx.save.selectedSkin };

    SKIN_ORDER.forEach((id) => {
      const skin = SKINS[id];
      const unlocked = isUnlocked(skin, ctx.save.totalWins);
      const card = document.createElement('button');
      card.style.cssText = `
        width:140px;height:180px;border-radius:20px;cursor:pointer;border:none;
        background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:12px;font-family:'Zen Maru Gothic',sans-serif;
        ${selected.id === id ? 'box-shadow:0 0 0 6px #ff7043;transform:scale(1.05);' : 'box-shadow:0 4px 0 #ccc;'}
        opacity:${unlocked ? 1 : 0.5};
      `;
      const dot = document.createElement('div');
      dot.style.cssText = `width:80px;height:80px;border-radius:50%;background:#${skin.color.toString(16).padStart(6, '0')};box-shadow:inset 0 0 0 6px #${skin.accent.toString(16).padStart(6, '0')};`;
      card.appendChild(dot);
      const name = document.createElement('div');
      name.textContent = skin.nameHiragana;
      name.style.cssText = 'font-size:18px;font-weight:700;margin-top:10px;';
      card.appendChild(name);
      if (!unlocked) {
        const lock = document.createElement('div');
        lock.textContent = `🔒 ${skin.unlockWins}かい かつ`;
        lock.style.cssText = 'font-size:12px;margin-top:4px;';
        card.appendChild(lock);
      }
      card.onclick = () => {
        if (!unlocked) return;
        ctx.audio.playSfx('click');
        selected.id = id;
        ctx.selectSkin(id);
        Array.from(grid.children).forEach((c) => {
          (c as HTMLElement).style.boxShadow = '0 4px 0 #ccc';
          (c as HTMLElement).style.transform = '';
        });
        (card as HTMLElement).style.boxShadow = '0 0 0 6px #ff7043';
        (card as HTMLElement).style.transform = 'scale(1.05)';
      };
      grid.appendChild(card);
    });

    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:20px;';
    const back = bigButton('← もどる', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'title' }); });
    back.style.background = '#90caf9';
    back.style.boxShadow = '0 6px 0 #1976d2';
    buttons.appendChild(back);
    const next = bigButton('つぎへ ▶', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'map-select' }); });
    buttons.appendChild(next);
    el.appendChild(buttons);

    ctx.uiOverlay.appendChild(el);
    this.el = el;
  }

  exit(): void {
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }
}
