const FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif";

export interface PauseOverlayActions {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

/** バトル中の「おやすみ」画面。やめる・つづける・やりなおすが選べる。 */
export class PauseOverlay {
  private el: HTMLDivElement;
  private parent: HTMLElement;
  private visible = false;

  constructor(parent: HTMLElement, actions: PauseOverlayActions) {
    this.parent = parent;
    this.el = document.createElement('div');
    this.el.id = 'skb-pause';
    this.el.style.cssText = `
      position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;
      background:rgba(10,54,92,0.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
      pointer-events:auto;z-index:40;font-family:${FONT};color:#fff;gap:18px;
    `;

    const title = document.createElement('div');
    title.textContent = '⏸ おやすみちゅう';
    title.style.cssText = 'font-size:clamp(28px,6vw,44px);font-weight:900;text-shadow:0 3px 8px rgba(0,0,0,0.4);';
    this.el.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = 'すきなときに もどれるよ';
    hint.style.cssText = 'font-size:clamp(14px,3vw,20px);opacity:0.9;margin-bottom:6px;';
    this.el.appendChild(hint);

    this.el.appendChild(this.makeButton('▶ つづける', '#ff7043', '#d84315', actions.onResume));
    this.el.appendChild(this.makeButton('🔄 もういっかい', '#4fc3f7', '#0277bd', actions.onRestart));
    this.el.appendChild(this.makeButton('🏠 タイトルへ', '#90caf9', '#1976d2', actions.onQuit));

    parent.appendChild(this.el);
  }

  private makeButton(text: string, bg: string, shadow: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `
      font-family:${FONT};font-size:clamp(18px,4vw,28px);font-weight:900;color:#fff;background:${bg};
      border:none;border-radius:20px;padding:clamp(10px,2vw,15px) clamp(26px,7vw,48px);cursor:pointer;
      box-shadow:0 5px 0 ${shadow};min-width:min(74vw,300px);
    `;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    return b;
  }

  show(): void {
    this.visible = true;
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }

  toggle(): boolean {
    if (this.visible) this.hide();
    else this.show();
    return this.visible;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    if (this.el.parentElement === this.parent) this.parent.removeChild(this.el);
  }
}
