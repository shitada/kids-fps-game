import type { GameScene, SceneContext } from './Scene';
import { MAPS } from '@/game/config/maps';
import { bigButton } from './TitleScene';
import { MenuStage } from './MenuStage';

export class MapSelectScene implements GameScene {
  private el!: HTMLDivElement;
  private stage!: MenuStage;

  enter(ctx: SceneContext): void {
    ctx.audio.startBgm('map-select');
    const el = document.createElement('div');
    el.className = 'park-menu map-menu';
    el.innerHTML = `
      <header class="menu-header"><h1>どこで あそぶ？</h1><span class="step-label">ひろばを えらんで スタート</span></header>
      <main class="map-layout"><div class="map-grid"></div></main>
      <footer class="menu-actions"><p>すきな ひろばを おしてね</p></footer>
      <div class="menu-preview map-stage-preview" aria-hidden="true"></div>`;
    el.querySelector('.menu-actions')!.prepend(bigButton('← もどる', () => {
      ctx.audio.playSfx('click');
      ctx.goto({ id: 'skin-select' });
    }, true));
    ctx.uiOverlay.appendChild(el);
    this.el = el;
    this.stage = new MenuStage(ctx, el.querySelector('.menu-preview')!, ctx.save.selectedSkin, 'map');
    const grid = el.querySelector('.map-grid')!;
    const descriptions = ['みずいろの プールと まるいパイプ', 'つみきの おしろと ふんすい', 'にじの アーチと ふわふわの くも'];
    MAPS.forEach((map, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'map-card';
      const image = document.createElement('img');
      image.className = 'map-thumbnail';
      image.src = this.stage.mapThumbnail(map);
      image.alt = '';
      image.width = 528;
      image.height = 320;
      const content = document.createElement('span');
      content.className = 'map-card-content';
      const title = document.createElement('strong');
      title.textContent = map.nameHiragana;
      const description = document.createElement('span');
      description.className = 'map-description';
      description.textContent = descriptions[index];
      const action = document.createElement('span');
      action.className = 'map-card-action';
      action.textContent = 'ここで あそぶ →';
      content.append(title, description, action);
      card.append(image, content);
      card.onclick = () => {
        ctx.audio.playSfx('click');
        ctx.selectMap(map.id);
        ctx.goto({ id: 'battle', mapId: map.id });
      };
      grid.appendChild(card);
    });
  }

  exit(): void {
    this.stage.dispose();
    this.el.remove();
  }
}
