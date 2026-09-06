export interface PauseOverlayActions {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

/** Rest keeps focus in the dialog and returns it to the game on resume. */
export class PauseOverlay {
  private el: HTMLDivElement;
  private visible = false;
  private previousFocus: HTMLElement | null = null;
  private inertSiblings: Array<{ el: HTMLElement; wasInert: boolean }> = [];

  constructor(private parent: HTMLElement, actions: PauseOverlayActions) {
    this.el = document.createElement('div');
    this.el.id = 'skb-pause';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'pause-title');
    this.el.style.display = 'none';
    this.el.innerHTML = `
      <section class="pause-panel">
        <h2 id="pause-title">おやすみちゅう</h2>
        <p>すきなときに もどれるよ</p>
        <div class="pause-actions"></div>
      </section>`;
    const buttons = this.el.querySelector('.pause-actions')!;
    buttons.append(
      this.makeButton('▶ つづける', actions.onResume),
      this.makeButton('🔄 もういっかい', actions.onRestart, true),
      this.makeButton('🏠 タイトルへ', actions.onQuit, true),
    );
    this.el.addEventListener('keydown', this.trapFocus);
    parent.appendChild(this.el);
  }

  private makeButton(text: string, onClick: () => void, secondary = false): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `park-button${secondary ? ' park-button-secondary' : ''}`;
    button.textContent = text;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    return button;
  }

  private trapFocus = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(this.el.querySelectorAll('button'));
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // The overlay can be mounted in either UI root. Keep all other controls out of tab order.
    for (const root of document.querySelectorAll<HTMLElement>('#hud, #ui-overlay')) {
      for (const sibling of Array.from(root.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === this.el || sibling.contains(this.el)) continue;
        this.inertSiblings.push({ el: sibling, wasInert: sibling.inert });
        sibling.inert = true;
      }
    }
    this.el.style.display = 'flex';
    this.el.querySelector('button')?.focus({ preventScroll: true });
  }

  hide(): void {
    this.visible = false;
    this.el.style.display = 'none';
    this.restoreInert();
    if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.previousFocus = null;
  }

  private restoreInert(): void {
    for (const sibling of this.inertSiblings) sibling.el.inert = sibling.wasInert;
    this.inertSiblings = [];
  }

  toggle(): boolean {
    if (this.visible) this.hide();
    else this.show();
    return this.visible;
  }

  get isVisible(): boolean { return this.visible; }

  destroy(): void {
    this.restoreInert();
    this.el.removeEventListener('keydown', this.trapFocus);
    if (this.el.parentElement === this.parent) this.el.remove();
  }
}
