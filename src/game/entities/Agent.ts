import * as THREE from 'three';
import type { SkinConfig, WeaponId } from '@/types';
import { WEAPONS, WEAPON_ORDER } from '@/game/config/weapons';
import { AgentVisual, buildAgentMesh } from '@/game/entities/AgentVisual';

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

  constructor(id: string, isCpu: boolean, skin: SkinConfig) {
    this.id = id;
    this.isCpu = isCpu;
    this.skin = skin;
    this.loadout = {
      hp: 100,
      hpMax: 100,
      weapon: 'water-gun',
      ammo: { 'water-gun': WEAPONS['water-gun'].ammoMax, 'balloon-launcher': 0, 'bubble-shower': 0 },
      wood: 30,
      stone: 30,
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
    this.loadout.ammo[w] = WEAPONS[w].ammoMax;
    if (w !== 'water-gun') this.loadout.weapon = w;
  }

  refillWater(amount: number): void {
    const cap = WEAPONS['water-gun'].ammoMax;
    this.loadout.ammo['water-gun'] = Math.min(cap, this.loadout.ammo['water-gun'] + amount);
  }
}

export { buildAgentMesh };
