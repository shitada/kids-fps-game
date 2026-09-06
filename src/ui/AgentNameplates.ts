import * as THREE from 'three';

export interface NameplateTarget {
  id: string;
  label: string;
  color: number;
  hpRatio: number;
  /** ワールド座標での表示位置（頭の上あたり） */
  position: THREE.Vector3;
  visible: boolean;
}

interface NameplateElements {
  root: HTMLDivElement;
  name: HTMLDivElement;
  barFill: HTMLDivElement;
  lastLabel: string;
  lastColor: number;
  lastPct: number;
  hidden: boolean;
}

const MAX_DISTANCE = 70;
const FADE_START = 45;

/**
 * 敵キャラの頭の上に「なまえ」と「ぬれ度バー」を出す。
 * 広いマップで敵を見つけられない・当てても手ごたえがない、という問題への対応。
 */
export class AgentNameplates {
  private root: HTMLDivElement;
  private byId = new Map<string, NameplateElements>();
  private projected = new THREE.Vector3();

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'skb-nameplates';
    this.root.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    parent.appendChild(this.root);
  }

  update(targets: NameplateTarget[], camera: THREE.PerspectiveCamera, width: number, height: number): void {
    const seen = new Set<string>();
    const camPos = camera.position;

    for (const t of targets) {
      const el = this.ensure(t.id);
      seen.add(t.id);
      if (!t.visible) {
        this.hide(el);
        continue;
      }
      const distance = camPos.distanceTo(t.position);
      if (distance > MAX_DISTANCE || distance < 1.2) {
        this.hide(el);
        continue;
      }
      this.projected.copy(t.position).project(camera);
      if (this.projected.z > 1 || Math.abs(this.projected.x) > 1.25 || Math.abs(this.projected.y) > 1.25) {
        this.hide(el);
        continue;
      }
      const x = (this.projected.x * 0.5 + 0.5) * width;
      const y = (-this.projected.y * 0.5 + 0.5) * height;
      // 画面のはしで切れないように内側へ寄せる
      const clampedX = THREE.MathUtils.clamp(x, 44, width - 44);
      const clampedY = THREE.MathUtils.clamp(y, 34, height - 20);
      const fade = distance <= FADE_START ? 1 : Math.max(0.22, 1 - (distance - FADE_START) / (MAX_DISTANCE - FADE_START));
      const scale = THREE.MathUtils.clamp(1.15 - distance / 90, 0.6, 1.15);

      if (el.hidden) {
        el.root.style.display = 'block';
        el.hidden = false;
      }
      el.root.style.opacity = fade.toFixed(2);
      el.root.style.transform = `translate(-50%, -100%) translate(${Math.round(clampedX)}px, ${Math.round(clampedY)}px) scale(${scale.toFixed(2)})`;
      if (el.lastLabel !== t.label) {
        el.name.textContent = t.label;
        el.lastLabel = t.label;
      }
      if (el.lastColor !== t.color) {
        el.name.style.setProperty('--nameplate-color', `#${t.color.toString(16).padStart(6, '0')}`);
        el.lastColor = t.color;
      }
      const pct = Math.round(Math.max(0, Math.min(1, t.hpRatio)) * 100);
      if (el.lastPct !== pct) {
        el.barFill.style.width = `${pct}%`;
        el.barFill.style.background = pct > 55 ? '#38988a' : pct > 25 ? '#dca739' : '#df795f';
        el.lastPct = pct;
      }
    }

    for (const [id, el] of this.byId) {
      if (!seen.has(id)) {
        el.root.remove();
        this.byId.delete(id);
      }
    }
  }

  private hide(el: NameplateElements): void {
    if (el.hidden) return;
    el.root.style.display = 'none';
    el.hidden = true;
  }

  private ensure(id: string): NameplateElements {
    const existing = this.byId.get(id);
    if (existing) return existing;

    const root = document.createElement('div');
    root.className = 'skb-nameplate';

    const name = document.createElement('div');
    name.className = 'skb-nameplate-name';
    root.appendChild(name);

    const bar = document.createElement('div');
    bar.className = 'skb-nameplate-track';
    const fill = document.createElement('div');
    fill.className = 'skb-nameplate-fill';
    bar.appendChild(fill);
    root.appendChild(bar);

    this.root.appendChild(root);
    const el: NameplateElements = { root, name, barFill: fill, lastLabel: '', lastColor: -1, lastPct: -1, hidden: false };
    this.byId.set(id, el);
    return el;
  }

  destroy(): void {
    this.byId.clear();
    this.root.remove();
  }
}
