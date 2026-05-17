import type { GameScene, SceneContext } from './Scene';
import type { SkinConfig } from '@/types';
import { SKIN_ORDER, SKINS, isUnlocked } from '@/game/config/skins';
import { bigButton } from './TitleScene';

export class SkinSelectScene implements GameScene {
  private el!: HTMLDivElement;

  enter(ctx: SceneContext): void {
    ctx.audio.startBgm('skin-select');
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;background:linear-gradient(180deg,#fff5d6,#ffd6e0);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;color:#1a2540;padding:calc(18px + env(safe-area-inset-top,0px)) calc(14px + env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) calc(14px + env(safe-area-inset-left,0px));overflow:auto;`;
    const title = document.createElement('div');
    title.textContent = 'どのこで あそぶ？';
    title.style.cssText = 'font-size:clamp(26px,6vw,42px);font-weight:900;margin-bottom:clamp(14px,3vw,24px);text-align:center;';
    el.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;gap:clamp(10px,2vw,20px);flex-wrap:wrap;justify-content:center;max-width:900px;margin-bottom:clamp(16px,3vw,32px);';
    el.appendChild(grid);

    const selected = { id: ctx.save.selectedSkin };

    SKIN_ORDER.forEach((id) => {
      const skin = SKINS[id];
      const unlocked = isUnlocked(skin, ctx.save.totalWins);
      const card = document.createElement('button');
      card.style.cssText = `
        width:clamp(96px,18vw,140px);height:clamp(132px,24vw,180px);border-radius:20px;cursor:pointer;border:none;
        background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:10px;font-family:'Zen Maru Gothic',sans-serif;
        ${selected.id === id ? 'box-shadow:0 0 0 6px #ff7043;transform:scale(1.05);' : 'box-shadow:0 4px 0 #ccc;'}
        opacity:${unlocked ? 1 : 0.5};
      `;
      card.appendChild(createSkinIcon(skin));
      const name = document.createElement('div');
      name.textContent = skin.nameHiragana;
      name.style.cssText = 'font-size:clamp(14px,2.8vw,18px);font-weight:700;margin-top:8px;';
      card.appendChild(name);
      const abilities = document.createElement('div');
      abilities.style.cssText = 'font-size:clamp(10px,2vw,12px);line-height:1.25;margin-top:4px;color:#0d47a1;font-weight:700;';
      abilities.textContent = skin.abilityLabels.slice(0, 2).join(' / ');
      card.appendChild(abilities);
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
    buttons.style.cssText = 'display:flex;gap:clamp(10px,3vw,20px);flex-wrap:wrap;justify-content:center;';
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

function createSkinIcon(skin: SkinConfig): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    width:clamp(62px,10.5vw,86px);height:clamp(62px,10.5vw,86px);
    border-radius:28px;background:linear-gradient(180deg,#fff,#${skin.accent.toString(16).padStart(6, '0')});
    box-shadow:inset 0 0 0 5px #${skin.color.toString(16).padStart(6, '0')},0 4px 10px rgba(0,0,0,0.12);
    display:flex;align-items:center;justify-content:center;position:relative;
  `;

  const icon = document.createElement('div');
  icon.textContent = skin.icon;
  icon.style.cssText = 'font-size:clamp(34px,6.5vw,54px);filter:drop-shadow(0 2px 0 rgba(255,255,255,0.75));';
  wrap.appendChild(icon);

  const badge = document.createElement('div');
  badge.textContent = skin.abilities.hpBonus > 0 ? 'つよい' : skin.abilities.speedMultiplier > 1 ? 'はやい' : 'きほん';
  badge.style.cssText = `
    position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);
    background:#ff7043;color:#fff;border-radius:999px;padding:2px 7px;
    font-size:10px;font-weight:900;white-space:nowrap;box-shadow:0 2px 0 #d84315;
  `;
  wrap.appendChild(badge);
  return wrap;
}
