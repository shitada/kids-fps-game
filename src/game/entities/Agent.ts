import * as THREE from 'three';
import type { SkinConfig, WeaponId } from '@/types';
import { WEAPONS, WEAPON_ORDER } from '@/game/config/weapons';

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
    this.mesh = buildAgentMesh(skin);
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

  syncMesh(): void {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
    this.mesh.visible = !this.eliminated;
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

export function buildAgentMesh(skin: SkinConfig): THREE.Group {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(0.9, 1.0, 0.6);
  const bodyMat = new THREE.MeshLambertMaterial({ color: skin.color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.7;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.45, 16, 12);
  const headMat = new THREE.MeshLambertMaterial({ color: skin.accent });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.55;
  group.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.13, 1.62, -0.4);
  group.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.13, 1.62, -0.4);
  group.add(eyeR);

  const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
  const armL = new THREE.Mesh(armGeo, bodyMat);
  armL.position.set(-0.58, 0.85, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, bodyMat);
  armR.position.set(0.58, 0.85, 0);
  group.add(armR);

  const legGeo = new THREE.BoxGeometry(0.3, 0.45, 0.3);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x444b66 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.22, 0.225, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.22, 0.225, 0);
  group.add(legR);

  return group;
}
