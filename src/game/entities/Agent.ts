import * as THREE from 'three';
import type { SkinConfig, WeaponId } from '@/types';
import { WEAPONS, WEAPON_ORDER } from '@/game/config/weapons';
import { AgentVisual, buildAgentMesh } from '@/game/entities/AgentVisual';

/** みずぎれから復帰できるみずの割合 */
const WATER_READY_RATIO = 0.3;

export interface AgentLoadout {
  hp: number;
  hpMax: number;
  weapon: WeaponId;
  ammo: Record<WeaponId, number>;
  wood: number;
  stone: number;
  hasWeapon: Record<WeaponId, boolean>;
}

export class Agent {
  id: string;
  isCpu: boolean;
  skin: SkinConfig;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  onGround = false;
  loadout: AgentLoadout;
  eliminated = false;
  eliminations = 0;
  lastFireMs = 0;
  reloadingUntil = 0;
  visual: AgentVisual;
  mesh: THREE.Group;
  radius = 0.5;
  height = 1.7;
  speed = 7;
  /** 小数点以下を持ち越すためのバッファ（自動回復用） */
  private refillCarry = 0;
  /** みずぎれ中は、ある程度たまるまで撃てない（ポタポタ撃ちを防ぐ） */
  private waterRecharging = false;

  constructor(id: string, isCpu: boolean, skin: SkinConfig) {
    this.id = id;
    this.isCpu = isCpu;
    this.skin = skin;
    const hpMax = 100 + skin.abilities.hpBonus;
    const waterMax = this.ammoMax('water-gun');
    this.loadout = {
      hp: hpMax,
      hpMax,
      weapon: 'water-gun',
      ammo: { 'water-gun': waterMax, 'balloon-launcher': 0, 'bubble-shower': 0 },
      wood: 30 + skin.abilities.materialBonus,
      stone: 30 + skin.abilities.materialBonus,
      hasWeapon: { 'water-gun': true, 'balloon-launcher': false, 'bubble-shower': false },
    };
    this.visual = new AgentVisual(skin);
    this.mesh = this.visual.root;
  }

  get eyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y + this.height * 0.4, this.position.z);
  }

  forward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  rightVec(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  lookDirection(): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp).normalize();
  }

  syncMesh(elapsedSec = 0): void {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
    this.mesh.visible = !this.eliminated;
    this.visual.setWeapon(this.loadout.weapon);
    this.visual.update({
      elapsedSec,
      moveSpeed: Math.hypot(this.velocity.x, this.velocity.z),
      onGround: this.onGround,
      aimPitch: this.pitch,
      hpRatio: this.loadout.hp / this.loadout.hpMax,
    });
  }

  takeDamage(amount: number): boolean {
    if (this.eliminated) return false;
    this.loadout.hp = Math.max(0, this.loadout.hp - amount);
    if (this.loadout.hp <= 0) {
      this.eliminated = true;
      return true;
    }
    return false;
  }

  switchWeapon(w: WeaponId): void {
    if (this.loadout.hasWeapon[w]) this.loadout.weapon = w;
  }

  cycleWeapon(): void {
    const idx = WEAPON_ORDER.indexOf(this.loadout.weapon);
    for (let i = 1; i <= WEAPON_ORDER.length; i++) {
      const next = WEAPON_ORDER[(idx + i) % WEAPON_ORDER.length];
      if (this.loadout.hasWeapon[next]) {
        this.loadout.weapon = next;
        return;
      }
    }
  }

  giveWeapon(w: WeaponId): void {
    this.loadout.hasWeapon[w] = true;
    this.loadout.ammo[w] = this.ammoMax(w);
    if (w !== 'water-gun') this.loadout.weapon = w;
  }

  refillWater(amount: number): void {
    const cap = this.ammoMax('water-gun');
    this.loadout.ammo['water-gun'] = Math.min(cap, this.loadout.ammo['water-gun'] + amount);
    if (this.loadout.ammo['water-gun'] >= cap * WATER_READY_RATIO) this.waterRecharging = false;
  }

  /** みずをためている最中かどうか。HUD とはっしゃ判定で使う。 */
  get isRechargingWater(): boolean {
    return this.waterRecharging;
  }

  /** その武器がいま撃てるか（クールダウンは別で見る）。 */
  canFireWeapon(w: WeaponId): boolean {
    if (this.loadout.ammo[w] < WEAPONS[w].ammoPerShot) return false;
    if (w === 'water-gun' && this.waterRecharging) return false;
    return true;
  }

  /** 撃ったぶんのみずを減らす。からになったら「ためなおし」に入る。 */
  consumeAmmo(w: WeaponId): void {
    this.loadout.ammo[w] = Math.max(0, this.loadout.ammo[w] - WEAPONS[w].ammoPerShot);
    if (w === 'water-gun' && this.loadout.ammo[w] <= 0) {
      this.waterRecharging = true;
      this.refillCarry = 0;
    }
  }

  /**
   * せなかのタンクからみずでっぽうがゆっくり回復する。
   * みずぎれで何もできない時間が続くと、子供はすぐ飽きてしまうため。
   */
  regenAmmo(dt: number, nowMs: number): void {
    const conf = WEAPONS['water-gun'];
    if (conf.refillPerSecond <= 0) return;
    if (nowMs < this.lastFireMs + conf.refillDelayMs) {
      this.refillCarry = 0;
      return;
    }
    const cap = this.ammoMax('water-gun');
    if (this.loadout.ammo['water-gun'] >= cap) {
      this.refillCarry = 0;
      this.waterRecharging = false;
      return;
    }
    this.refillCarry += conf.refillPerSecond * dt;
    const whole = Math.floor(this.refillCarry);
    if (whole <= 0) return;
    this.refillCarry -= whole;
    this.loadout.ammo['water-gun'] = Math.min(cap, this.loadout.ammo['water-gun'] + whole);
    if (this.loadout.ammo['water-gun'] >= cap * WATER_READY_RATIO) this.waterRecharging = false;
  }

  ammoMax(w: WeaponId): number {
    return WEAPONS[w].ammoMax + (w === 'water-gun' ? this.skin.abilities.waterAmmoBonus : 0);
  }

  fireCooldownMs(w: WeaponId): number {
    return WEAPONS[w].cooldownMs * this.skin.abilities.cooldownMultiplier;
  }

  applyBaseSpeed(baseSpeed: number): void {
    this.speed = baseSpeed * this.skin.abilities.speedMultiplier;
  }

  playFireVisual(nowSec: number): void {
    this.visual.playFire(nowSec);
  }

  playHitVisual(nowSec: number): void {
    this.visual.playHit(nowSec);
  }
}

export function agentColliderId(agentId: string): string {
  return `agent-${agentId}`;
}

export { buildAgentMesh };
