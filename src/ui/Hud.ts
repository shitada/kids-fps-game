import type { WeaponId, BuildPieceKind } from '@/types';
import { WEAPONS } from '@/game/config/weapons';
import { BUILD_PIECES } from '@/game/config/build';

export interface RadarBlip {
  /** プレイヤーから見た相対座標（メートル） */
  x: number;
  z: number;
  color: number;
  kind: 'enemy' | 'water' | 'chest';
}

interface FloatingText {
  el: HTMLDivElement;
  bornAt: number;
  life: number;
  x: number;
  y: number;
}

interface DamageArrow {
  el: HTMLDivElement;
  bornAt: number;
  angleRad: number;
}

const FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif";
const RADAR_RANGE = 45;
const DAMAGE_ARROW_MS = 1100;

/**
 * ワールド上の相対位置（dx, dz）を、画面上の「まうえを 0 とした時計まわりの角度」に変換する。
 * このプロジェクトの向きの決まりは forward = (-sin yaw, 0, -cos yaw)、right = (cos yaw, 0, -sin yaw)。
 * レーダーの回転と、ダメージ方向の矢印の両方でこの式を使う。
 */
export function screenBearingRad(dx: number, dz: number, yaw: number): number {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const right = dx * cos - dz * sin;
  const forward = -(dx * sin + dz * cos);
  return Math.atan2(right, forward);
}

export class Hud {
  private root: HTMLElement;
  private el: HTMLDivElement;
  private hpBar!: HTMLDivElement;
  private hpText!: HTMLDivElement;
  private hpWrap!: HTMLDivElement;
  private weaponEl!: HTMLDivElement;
  private ammoEl!: HTMLDivElement;
  private materialsEl!: HTMLDivElement;
  private remainingEl!: HTMLDivElement;
  private modeEl!: HTMLDivElement;
  private crosshair!: HTMLDivElement;
  private hitMarker!: HTMLDivElement;
  private zoneEl!: HTMLDivElement;
  private messageEl!: HTMLDivElement;
  private hitFlashEl!: HTMLDivElement;
  private lowHpVignette!: HTMLDivElement;
  private floatLayer!: HTMLDivElement;
  private arrowLayer!: HTMLDivElement;
  private radarCanvas!: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D | null = null;
  private pauseButton!: HTMLButtonElement;
  private messageTimer: number | null = null;
  private hitTimer: number | null = null;
  private hitMarkerTimer: number | null = null;
  private floatingTexts: FloatingText[] = [];
  private damageArrows: DamageArrow[] = [];
  private lastHpRatio = 1;
  private lastRadarDrawAt = 0;
  private lastHpText = '';
  private lastWeaponText = '';
  private lastAmmoText = '';
  private lastMaterialsText = '';
  private lastRemainingText = '';
  private lastAmmoColor = '';
  private lastZoneText = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'skb-hud';
    this.el.style.cssText = `
      position:absolute; inset:0; pointer-events:none; color:#fff;
      font-family: ${FONT};
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    `;
    this.build();
    this.root.appendChild(this.el);
  }

  private build(): void {
    // 左下：ぬれ度ゲージ
    const hpWrap = document.createElement('div');
    hpWrap.className = 'skb-hp';
    hpWrap.style.cssText = 'position:absolute;left:18px;bottom:18px;width:280px;';
    const label = document.createElement('div');
    label.className = 'skb-hp-label';
    label.textContent = 'ぬれ度';
    label.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:6px;';
    hpWrap.appendChild(label);
    const barOuter = document.createElement('div');
    barOuter.style.cssText =
      'height:18px;background:rgba(0,0,0,0.35);border-radius:9px;overflow:hidden;border:2px solid rgba(255,255,255,0.6);';
    const barInner = document.createElement('div');
    barInner.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#7ee081,#34c759);transition:width 0.15s, background 0.2s;';
    barOuter.appendChild(barInner);
    hpWrap.appendChild(barOuter);
    const hpText = document.createElement('div');
    hpText.className = 'skb-hp-text';
    hpText.style.cssText = 'font-size:14px;margin-top:4px;';
    hpWrap.appendChild(hpText);
    this.el.appendChild(hpWrap);
    this.hpBar = barInner;
    this.hpText = hpText;
    this.hpWrap = hpWrap;

    // 右下：武器・弾数
    const weaponWrap = document.createElement('div');
    weaponWrap.className = 'skb-weapon';
    weaponWrap.style.cssText = 'position:absolute;right:18px;bottom:18px;text-align:right;';
    const weaponName = document.createElement('div');
    weaponName.className = 'skb-weapon-name';
    weaponName.style.cssText = 'font-size:22px;font-weight:700;';
    weaponWrap.appendChild(weaponName);
    const ammoText = document.createElement('div');
    ammoText.className = 'skb-ammo';
    ammoText.style.cssText = 'font-size:36px;font-weight:900;';
    weaponWrap.appendChild(ammoText);
    this.el.appendChild(weaponWrap);
    this.weaponEl = weaponName;
    this.ammoEl = ammoText;

    // 左上：素材
    const matWrap = document.createElement('div');
    matWrap.className = 'skb-materials';
    matWrap.style.cssText = 'position:absolute;left:18px;top:18px;font-size:18px;font-weight:700;';
    this.el.appendChild(matWrap);
    this.materialsEl = matWrap;

    // 中央上：残り人数
    const remain = document.createElement('div');
    remain.className = 'skb-remaining';
    remain.style.cssText =
      'position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:18px;font-weight:700;background:rgba(0,0,0,0.35);padding:6px 14px;border-radius:14px;';
    this.el.appendChild(remain);
    this.remainingEl = remain;

    // 右上：モード（撃つ/つくる）
    const mode = document.createElement('div');
    mode.className = 'skb-mode';
    mode.style.cssText =
      'position:absolute;right:18px;top:64px;font-size:18px;font-weight:700;background:rgba(0,0,0,0.35);padding:6px 14px;border-radius:14px;';
    this.el.appendChild(mode);
    this.modeEl = mode;

    // 右上：ポーズボタン（タッチでもキーボードでも押せる）
    const pause = document.createElement('button');
    pause.className = 'skb-pause-btn';
    pause.setAttribute('aria-label', 'おやすみ');
    pause.textContent = '⏸';
    pause.style.cssText = `
      position:absolute;right:18px;top:14px;width:42px;height:42px;border-radius:50%;
      border:2px solid rgba(255,255,255,0.75);background:rgba(0,0,0,0.35);color:#fff;
      font-size:20px;line-height:1;cursor:pointer;pointer-events:auto;font-family:${FONT};
      z-index:50;
    `;
    this.el.appendChild(pause);
    this.pauseButton = pause;

    // 左上：かんたんレーダー（敵とタンクの方向）
    const radar = document.createElement('canvas');
    radar.className = 'skb-radar';
    radar.width = 132;
    radar.height = 132;
    radar.style.cssText = 'position:absolute;left:18px;top:56px;width:110px;height:110px;opacity:0.92;';
    this.el.appendChild(radar);
    this.radarCanvas = radar;
    this.radarCtx = radar.getContext('2d');

    // 中央：クロスヘア
    const ch = document.createElement('div');
    ch.className = 'crosshair';
    this.el.appendChild(ch);
    this.crosshair = ch;

    // 命中マーカー
    const marker = document.createElement('div');
    marker.className = 'skb-hitmarker';
    marker.style.cssText =
      'position:absolute;left:50%;top:50%;width:34px;height:34px;transform:translate(-50%,-50%) scale(0.6);opacity:0;transition:opacity 0.1s, transform 0.1s;';
    marker.innerHTML =
      '<svg viewBox="0 0 34 34" width="34" height="34"><g stroke="#ffe066" stroke-width="3.4" stroke-linecap="round"><line x1="5" y1="5" x2="12" y2="12"/><line x1="29" y1="5" x2="22" y2="12"/><line x1="5" y1="29" x2="12" y2="22"/><line x1="29" y1="29" x2="22" y2="22"/></g></svg>';
    this.el.appendChild(marker);
    this.hitMarker = marker;

    // ゾーン警告
    const zone = document.createElement('div');
    zone.className = 'skb-zone';
    zone.style.cssText =
      'position:absolute;left:50%;top:60px;transform:translateX(-50%);font-size:16px;font-weight:700;color:#fff;background:rgba(230,81,0,0.82);padding:6px 12px;border-radius:10px;display:none;';
    zone.textContent = '☀️ そとはあついよ！まんなかへ！';
    zone.style.display = 'none';
    this.el.appendChild(zone);
    this.zoneEl = zone;

    // メッセージ
    const msg = document.createElement('div');
    msg.className = 'skb-message';
    msg.style.cssText =
      'position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);font-size:34px;font-weight:900;color:#fff;background:rgba(0,0,0,0.4);padding:14px 24px;border-radius:18px;display:none;white-space:pre-line;text-align:center;';
    msg.style.display = 'none';
    this.el.appendChild(msg);
    this.messageEl = msg;

    // みずがあたった時の短いフィードバック
    const hitFlash = document.createElement('div');
    hitFlash.className = 'skb-hit-flash';
    hitFlash.style.cssText = `
      position:absolute;inset:0;opacity:0;transition:opacity 0.16s ease-out;
      background:radial-gradient(circle at center, rgba(255,255,255,0.45), rgba(111,213,255,0.3) 26%, rgba(79,195,247,0.16) 54%, transparent 76%);
    `;
    this.el.appendChild(hitFlash);
    this.hitFlashEl = hitFlash;

    // ぬれ度が高いときの画面ふちの色
    const vignette = document.createElement('div');
    vignette.className = 'skb-low-hp';
    vignette.style.cssText = `
      position:absolute;inset:0;opacity:0;transition:opacity 0.3s;
      box-shadow: inset 0 0 90px 26px rgba(41,150,255,0.55);
    `;
    this.el.appendChild(vignette);
    this.lowHpVignette = vignette;

    // 被弾方向の矢印
    const arrows = document.createElement('div');
    arrows.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.el.appendChild(arrows);
    this.arrowLayer = arrows;

    // ダメージ数字などの浮き文字
    const floats = document.createElement('div');
    floats.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    this.el.appendChild(floats);
    this.floatLayer = floats;
  }

  onPause(handler: () => void): void {
    this.pauseButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handler();
    });
    this.pauseButton.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  setHp(hp: number, max: number): void {
    const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
    const pct = ratio * 100;
    this.hpBar.style.width = `${pct.toFixed(1)}%`;
    // ぬれ度は「体力」ではなく「まだ乾いている割合」として見せる
    this.hpBar.style.background =
      ratio > 0.55
        ? 'linear-gradient(90deg,#7ee081,#34c759)'
        : ratio > 0.25
          ? 'linear-gradient(90deg,#ffe066,#ffb300)'
          : 'linear-gradient(90deg,#ff8a65,#ff5252)';
    const text = `${Math.round(hp)} / ${max}`;
    if (text !== this.lastHpText) {
      this.hpText.textContent = text;
      this.lastHpText = text;
    }
    this.lowHpVignette.style.opacity = ratio < 0.3 ? String(0.35 + (0.3 - ratio) * 2) : '0';
    // Element.animate は古い WebKit にないことがあるので存在チェックしてから使う
    if (ratio <= 0.25 && this.lastHpRatio > 0.25 && typeof this.hpWrap.animate === 'function') {
      this.hpWrap.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], {
        duration: 380,
        easing: 'ease-out',
      });
    }
    this.lastHpRatio = ratio;
  }

  setWeapon(w: WeaponId, ammo: number, ammoMax = WEAPONS[w].ammoMax, recharging = false): void {
    const wc = WEAPONS[w];
    const name = recharging ? `${wc.emoji} みずをためてるよ` : `${wc.emoji} ${wc.nameHiragana}`;
    if (name !== this.lastWeaponText) {
      this.weaponEl.textContent = name;
      this.weaponEl.style.color = recharging ? '#ffd166' : '#fff';
      this.lastWeaponText = name;
    }
    const ammoText = `${ammo} / ${ammoMax}`;
    if (ammoText !== this.lastAmmoText) {
      this.ammoEl.textContent = ammoText;
      this.lastAmmoText = ammoText;
    }
    const color = recharging ? '#ffd166' : ammo <= 0 ? '#ff8a65' : '#fff';
    if (color !== this.lastAmmoColor) {
      this.ammoEl.style.color = color;
      this.lastAmmoColor = color;
    }
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
    const text = `🌳 ${wood} &nbsp;&nbsp; 🪨 ${stone}`;
    if (text === this.lastMaterialsText) return;
    this.materialsEl.innerHTML = text;
    this.lastMaterialsText = text;
  }

  setRemaining(alive: number, total: number): void {
    const text = `のこり ${alive} / ${total}`;
    if (text === this.lastRemainingText) return;
    this.remainingEl.textContent = text;
    this.lastRemainingText = text;
  }

  setZoneWarning(show: boolean, secondsToShrink?: number): void {
    let text = '';
    let background = '';
    if (show) {
      text = '☀️ そとはあついよ！まんなかへ！';
      background = 'rgba(230,81,0,0.85)';
    } else if (secondsToShrink !== undefined && secondsToShrink > 0 && secondsToShrink <= 10) {
      text = `☀️ ${Math.ceil(secondsToShrink)}びょうで ひろばが ちいさくなるよ`;
      background = 'rgba(2,119,189,0.8)';
    }
    if (text === this.lastZoneText) return;
    this.lastZoneText = text;
    if (!text) {
      this.zoneEl.style.display = 'none';
      return;
    }
    this.zoneEl.textContent = text;
    this.zoneEl.style.background = background;
    this.zoneEl.style.display = 'block';
  }

  showMessage(text: string, durationMs = 1500): void {
    this.messageEl.textContent = text;
    this.messageEl.style.display = 'block';
    if (this.messageTimer) window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => {
      this.messageEl.style.display = 'none';
    }, durationMs);
  }

  /** 自分がみずを浴びたとき */
  showHitFeedback(durationMs = 380): void {
    this.hitFlashEl.style.opacity = '1';
    if (this.hitTimer) window.clearTimeout(this.hitTimer);
    this.hitTimer = window.setTimeout(() => {
      this.hitFlashEl.style.opacity = '0';
    }, durationMs);
  }

  /** 自分が敵に当てたとき：クロスヘアがはじけてダメージ量が出る */
  showHitMarker(damage: number, eliminated = false): void {
    this.hitMarker.style.opacity = '1';
    this.hitMarker.style.transform = `translate(-50%,-50%) scale(${eliminated ? 1.5 : 1.1})`;
    if (this.hitMarkerTimer) window.clearTimeout(this.hitMarkerTimer);
    this.hitMarkerTimer = window.setTimeout(() => {
      this.hitMarker.style.opacity = '0';
      this.hitMarker.style.transform = 'translate(-50%,-50%) scale(0.6)';
    }, 190);
    this.spawnFloatingText(`+${Math.max(1, Math.round(damage))}`, eliminated ? '#ffe066' : '#eafcff', 26);
  }

  /** 被弾したときに、どっちから来たかを矢印で出す */
  showDamageDirection(angleRad: number): void {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;left:50%;top:50%;width:0;height:0;
      transform:rotate(${angleRad}rad);
    `;
    const arrow = document.createElement('div');
    arrow.textContent = '▲';
    arrow.style.cssText = `
      position:absolute;left:-16px;top:-130px;width:32px;text-align:center;
      font-size:28px;color:#ffb74d;text-shadow:0 2px 6px rgba(0,0,0,0.55);
    `;
    el.appendChild(arrow);
    this.arrowLayer.appendChild(el);
    this.damageArrows.push({ el, bornAt: performance.now(), angleRad });
    if (this.damageArrows.length > 6) {
      const oldest = this.damageArrows.shift();
      oldest?.el.remove();
    }
  }

  private spawnFloatingText(text: string, color: string, fontSize: number): void {
    const el = document.createElement('div');
    el.textContent = text;
    const jitterX = (Math.random() - 0.5) * 70;
    el.style.cssText = `
      position:absolute;left:50%;top:46%;font-size:${fontSize}px;font-weight:900;color:${color};
      text-shadow:0 2px 6px rgba(0,0,0,0.55);will-change:transform,opacity;
      transform:translate(calc(-50% + ${jitterX}px), 0);
    `;
    this.floatLayer.appendChild(el);
    this.floatingTexts.push({ el, bornAt: performance.now(), life: 750, x: jitterX, y: 0 });
    if (this.floatingTexts.length > 14) {
      const oldest = this.floatingTexts.shift();
      oldest?.el.remove();
    }
  }

  /** レーダーとアニメーションの更新。毎フレーム呼ぶ。 */
  update(now: number, blips: RadarBlip[], playerYaw: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      const t = (now - f.bornAt) / f.life;
      if (t >= 1) {
        f.el.remove();
        this.floatingTexts.splice(i, 1);
        continue;
      }
      f.el.style.transform = `translate(calc(-50% + ${f.x}px), ${(-46 * t).toFixed(1)}px) scale(${(1 + 0.25 * (1 - t)).toFixed(2)})`;
      f.el.style.opacity = String(1 - t * t);
    }

    for (let i = this.damageArrows.length - 1; i >= 0; i--) {
      const a = this.damageArrows[i];
      const t = (now - a.bornAt) / DAMAGE_ARROW_MS;
      if (t >= 1) {
        a.el.remove();
        this.damageArrows.splice(i, 1);
        continue;
      }
      a.el.style.opacity = String(1 - t);
    }

    // レーダーは毎フレーム描き直さなくても十分わかる（iPad の負荷対策）
    if (now - this.lastRadarDrawAt >= 90) {
      this.lastRadarDrawAt = now;
      this.drawRadar(blips, playerYaw);
    }
  }

  private drawRadar(blips: RadarBlip[], playerYaw: number): void {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const size = this.radarCanvas.width;
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(half, half, half - 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,40,70,0.42)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();

    // 自分の向きが常に上になるように回す
    const cos = Math.cos(playerYaw);
    const sin = Math.sin(playerYaw);
    for (const b of blips) {
      const rx = b.x * cos - b.z * sin;
      const rz = b.x * sin + b.z * cos;
      const dist = Math.hypot(rx, rz);
      const clamped = Math.min(dist, RADAR_RANGE);
      const scale = dist > 0 ? (clamped / dist) * ((half - 10) / RADAR_RANGE) : 0;
      const px = half + rx * scale;
      const py = half + rz * scale;
      const radius = b.kind === 'enemy' ? 6 : 4.5;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = `#${b.color.toString(16).padStart(6, '0')}`;
      ctx.fill();
      if (b.kind === 'enemy') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.stroke();
      }
    }

    // 自分（中央の三角）
    ctx.beginPath();
    ctx.moveTo(half, half - 9);
    ctx.lineTo(half - 6.5, half + 6);
    ctx.lineTo(half + 6.5, half + 6);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  setCrosshair(visible: boolean): void {
    this.crosshair.style.display = visible ? 'block' : 'none';
  }

  destroy(): void {
    if (this.messageTimer) window.clearTimeout(this.messageTimer);
    if (this.hitTimer) window.clearTimeout(this.hitTimer);
    if (this.hitMarkerTimer) window.clearTimeout(this.hitMarkerTimer);
    this.floatingTexts.forEach((f) => f.el.remove());
    this.damageArrows.forEach((a) => a.el.remove());
    this.floatingTexts = [];
    this.damageArrows = [];
    if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
  }
}
