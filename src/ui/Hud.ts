import type { WeaponId, BuildPieceKind } from '@/types';
import { WEAPONS } from '@/game/config/weapons';
import { BUILD_PIECES } from '@/game/config/build';

export class Hud {
  private root: HTMLElement;
  private el: HTMLDivElement;
  private hpBar!: HTMLDivElement;
  private hpText!: HTMLDivElement;
  private weaponEl!: HTMLDivElement;
  private ammoEl!: HTMLDivElement;
  private materialsEl!: HTMLDivElement;
  private remainingEl!: HTMLDivElement;
  private modeEl!: HTMLDivElement;
  private crosshair!: HTMLDivElement;
  private zoneEl!: HTMLDivElement;
  private messageEl!: HTMLDivElement;
  private messageTimer: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'skb-hud';
    this.el.style.cssText = `
      position:absolute; inset:0; pointer-events:none; color:#fff;
      font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    `;
    this.build();
    this.root.appendChild(this.el);
  }

  private build(): void {
    // 左下：ぬれ度ゲージ
    const hpWrap = document.createElement('div');
    hpWrap.style.cssText = 'position:absolute;left:18px;bottom:18px;width:280px;';
    const label = document.createElement('div');
    label.textContent = 'ぬれ度';
    label.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:6px;';
    hpWrap.appendChild(label);
    const barOuter = document.createElement('div');
    barOuter.style.cssText = 'height:18px;background:rgba(0,0,0,0.35);border-radius:9px;overflow:hidden;border:2px solid rgba(255,255,255,0.6);';
    const barInner = document.createElement('div');
    barInner.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#4fc3f7,#1976d2);transition:width 0.15s;';
    barOuter.appendChild(barInner);
    hpWrap.appendChild(barOuter);
    const hpText = document.createElement('div');
    hpText.style.cssText = 'font-size:14px;margin-top:4px;';
    hpWrap.appendChild(hpText);
    this.el.appendChild(hpWrap);
    this.hpBar = barInner;
    this.hpText = hpText;

    // 右下：武器・弾数
    const weaponWrap = document.createElement('div');
    weaponWrap.style.cssText = 'position:absolute;right:18px;bottom:18px;text-align:right;';
    const weaponName = document.createElement('div');
    weaponName.style.cssText = 'font-size:22px;font-weight:700;';
    weaponWrap.appendChild(weaponName);
    const ammoText = document.createElement('div');
    ammoText.style.cssText = 'font-size:36px;font-weight:900;';
    weaponWrap.appendChild(ammoText);
    this.el.appendChild(weaponWrap);
    this.weaponEl = weaponName;
    this.ammoEl = ammoText;

    // 左上：素材
    const matWrap = document.createElement('div');
    matWrap.style.cssText = 'position:absolute;left:18px;top:18px;font-size:18px;font-weight:700;';
    this.el.appendChild(matWrap);
    this.materialsEl = matWrap;

    // 中央上：残り人数
    const remain = document.createElement('div');
    remain.style.cssText = 'position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:18px;font-weight:700;background:rgba(0,0,0,0.35);padding:6px 14px;border-radius:14px;';
    this.el.appendChild(remain);
    this.remainingEl = remain;

    // 右上：モード（撃つ/つくる）
    const mode = document.createElement('div');
    mode.style.cssText = 'position:absolute;right:18px;top:18px;font-size:18px;font-weight:700;background:rgba(0,0,0,0.35);padding:6px 14px;border-radius:14px;';
    this.el.appendChild(mode);
    this.modeEl = mode;

    // 中央：クロスヘア
    const ch = document.createElement('div');
    ch.className = 'crosshair';
    this.el.appendChild(ch);
    this.crosshair = ch;

    // ゾーン警告
    const zone = document.createElement('div');
    zone.style.cssText = 'position:absolute;left:50%;top:60px;transform:translateX(-50%);font-size:16px;font-weight:700;color:#ff6f3c;background:rgba(0,0,0,0.45);padding:6px 12px;border-radius:10px;display:none;';
    zone.textContent = '☀️ そとはあぶないよ！なかにはいろう！';
    this.el.appendChild(zone);
    this.zoneEl = zone;

    // メッセージ
    const msg = document.createElement('div');
    msg.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:36px;font-weight:900;color:#fff;background:rgba(0,0,0,0.4);padding:14px 24px;border-radius:18px;display:none;';
    this.el.appendChild(msg);
    this.messageEl = msg;
  }

  setHp(hp: number, max: number): void {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    this.hpBar.style.width = `${pct}%`;
    this.hpText.textContent = `${Math.round(hp)} / ${max}`;
  }

  setWeapon(w: WeaponId, ammo: number): void {
    const wc = WEAPONS[w];
    this.weaponEl.textContent = `${wc.emoji} ${wc.nameHiragana}`;
    this.ammoEl.textContent = `${ammo} / ${wc.ammoMax}`;
  }

  setBuildMode(active: boolean, kind?: BuildPieceKind): void {
    if (active && kind) {
      const conf = BUILD_PIECES[kind];
      const labels: Record<BuildPieceKind, string> = { wall: 'かべ', floor: 'ゆか', stair: 'かいだん' };
      this.modeEl.textContent = `🔨 つくる：${labels[kind]} (${conf.costMaterial})`;
      this.modeEl.style.color = '#ffd166';
    } else {
      this.modeEl.textContent = '💦 たたかう';
      this.modeEl.style.color = '#fff';
    }
  }

  setMaterials(wood: number, stone: number): void {
    this.materialsEl.innerHTML = `🌳 ${wood} &nbsp;&nbsp; 🪨 ${stone}`;
  }

  setRemaining(alive: number, total: number): void {
    this.remainingEl.textContent = `のこり ${alive} / ${total}`;
  }

  setZoneWarning(show: boolean): void {
    this.zoneEl.style.display = show ? 'block' : 'none';
  }

  showMessage(text: string, durationMs = 1500): void {
    this.messageEl.textContent = text;
    this.messageEl.style.display = 'block';
    if (this.messageTimer) window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => {
      this.messageEl.style.display = 'none';
    }, durationMs);
  }

  setCrosshair(visible: boolean): void {
    this.crosshair.style.display = visible ? 'block' : 'none';
  }

  destroy(): void {
    if (this.messageTimer) window.clearTimeout(this.messageTimer);
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }
}
