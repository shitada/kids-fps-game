import type { GameScene, SceneContext } from './Scene';
import { SKIN_ORDER, SKINS, isUnlocked } from '@/game/config/skins';
import { bigButton } from './TitleScene';
import { MenuStage } from './MenuStage';

export class SkinSelectScene implements GameScene {
  private el!: HTMLDivElement;
  private stage!: MenuStage;

  enter(ctx: SceneContext): void {
    ctx.audio.startBgm('skin-select');
    const el = document.createElement('div');
    el.className = 'park-menu skin-menu';
    el.innerHTML = `
      <header class="menu-header"><h1>どのこで あそぶ？</h1><span class="step-label">なかま → ひろば</span></header>
      <main class="skin-layout">
        <section class="selected-mascot">
          <div class="menu-preview" role="img"></div>
          <div class="mascot-caption"><h2></h2><p>いっしょに みずあそび！</p></div>
        </section>
        <section class="skin-collection" aria-label="なかまを えらぶ"><div class="skin-grid"></div></section>
      </main>
      <footer class="menu-actions"></footer>`;
    const actions = el.querySelector('.menu-actions')!;
    actions.append(
      bigButton('← もどる', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'title' }); }, true),
      bigButton('つぎへ ▶', () => { ctx.audio.playSfx('click'); ctx.goto({ id: 'map-select' }); }),
    );
    ctx.uiOverlay.appendChild(el);
    this.el = el;
    const preview = el.querySelector<HTMLElement>('.menu-preview')!;
    this.stage = new MenuStage(ctx, preview, ctx.save.selectedSkin, 'skin');
    const caption = el.querySelector('h2')!;
    caption.textContent = SKINS[ctx.save.selectedSkin].nameHiragana;
    preview.setAttribute('aria-label', `${caption.textContent}の りったいプレビュー`);
    const grid = el.querySelector('.skin-grid')!;

    for (const id of SKIN_ORDER) {
      const skin = SKINS[id];
      const unlocked = isUnlocked(skin, ctx.save.totalWins);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'skin-card';
      card.setAttribute('aria-pressed', String(ctx.save.selectedSkin === id));
      card.setAttribute('aria-disabled', String(!unlocked));
      const image = document.createElement('img');
      image.className = 'skin-thumbnail';
      image.src = this.stage.skinThumbnail(id);
      image.alt = '';
      image.width = 256;
      image.height = 256;
      const info = document.createElement('span');
      info.className = 'skin-card-info';
      const name = document.createElement('strong');
      name.textContent = skin.nameHiragana;
      const abilities = document.createElement('span');
      abilities.className = 'skin-abilities';
      abilities.textContent = skin.abilityLabels.join(' / ');
      const status = document.createElement('span');
      status.className = 'skin-status';
      status.textContent = unlocked ? (ctx.save.selectedSkin === id ? '✓ えらんでいるよ' : 'えらべるよ') : `🔒 ${skin.unlockWins}かい かつ`;
      info.append(name, abilities, status);
      card.append(image, info);
      card.onclick = () => {
        if (!unlocked) return;
        ctx.audio.playSfx('click');
        ctx.selectSkin(id);
        grid.querySelectorAll<HTMLButtonElement>('button').forEach((other) => {
          other.setAttribute('aria-pressed', String(other === card));
          if (other.getAttribute('aria-disabled') === 'false') {
            other.querySelector('.skin-status')!.textContent = other === card ? '✓ えらんでいるよ' : 'えらべるよ';
          }
        });
        caption.textContent = skin.nameHiragana;
        preview.setAttribute('aria-label', `${skin.nameHiragana}の りったいプレビュー`);
        this.stage.selectSkin(id);
      };
      grid.appendChild(card);
    }
  }

  exit(): void {
    this.stage.dispose();
    this.el.remove();
  }
}
