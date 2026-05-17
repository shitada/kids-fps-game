import * as THREE from 'three';
import type { GameScene, SceneContext } from './Scene';
import type { MapConfig, MatchResult, WeaponId, BuildPieceKind } from '@/types';
import { getMapById } from '@/game/config/maps';
import { buildWorld } from '@/game/systems/WorldBuilder';
import { CollisionWorld, makeAABB, distanceXZ } from '@/game/systems/CollisionWorld';
import { Agent } from '@/game/entities/Agent';
import { createFirstPersonWaterGun } from '@/game/entities/AgentVisual';
import { SKINS, SKIN_ORDER } from '@/game/config/skins';
import { WEAPONS } from '@/game/config/weapons';
import { BUILD_ORDER, BUILD_PIECES } from '@/game/config/build';
import { PICKUPS } from '@/game/config/pickups';
import { BuildManager } from '@/game/entities/BuildPiece';
import { createPickup, setPickupAvailable, refreshPickupRotation, type Pickup } from '@/game/entities/Pickup';
import { spawnProjectile, disposeProjectile, type Projectile } from '@/game/entities/Projectile';
import { WaterSplashPool } from '@/game/effects/WaterSplash';
import { AiSystem } from '@/game/systems/AiSystem';
import { DIFFICULTY } from '@/game/config/difficulty';
import { SafeZone } from '@/game/systems/SafeZone';
import { InputManager } from '@/game/input/InputManager';
import { battleTrackForMap } from '@/game/audio/AudioEngine';
import { Hud } from '@/ui/Hud';

const PLAYER_ID = 'player';
const NUM_BOTS = 6;
const GRAVITY = 22;
const JUMP_VELOCITY = 9;
const MOVE_SPEED = 7.5;
const MOUSE_SENS = 0.0028;
const TOUCH_SENS = 0.005;

export class BattleScene implements GameScene {
  private mapId: string;
  private map!: MapConfig;
  private ctx!: SceneContext;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private collision!: CollisionWorld;
  private input = new InputManager();
  private hud!: Hud;
  private agents: Agent[] = [];
  private player!: Agent;
  private projectiles: Projectile[] = [];
  private build!: BuildManager;
  private pickups: Pickup[] = [];
  private splash!: WaterSplashPool;
  private ai!: AiSystem;
  private safeZone!: SafeZone;
  private buildMode = false;
  private buildKindIndex = 0;
  private buildYawIndex = 0;
  private buildPreview!: THREE.Mesh;
  private firstPersonGun!: THREE.Group;
  private firstPersonGunNozzle: THREE.Object3D | null = null;
  private firstPersonGunUntil = 0;
  private elapsed = 0;
  private rafId = 0;
  private lastFrame = 0;
  private resizeHandler!: () => void;
  private done = false;
  private startedAt = 0;
  private collisionByAgent = new Map<string, string>();

  constructor(mapId: string) {
    this.mapId = mapId;
  }

  async enter(ctx: SceneContext): Promise<void> {
    this.ctx = ctx;
    this.map = getMapById(this.mapId);

    this.renderer = new THREE.WebGLRenderer({ canvas: ctx.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resizeRenderer();

    const viewport = gameViewportSize();
    this.camera = new THREE.PerspectiveCamera(72, viewport.width / viewport.height, 0.1, 500);
    const built = buildWorld(this.map);
    this.scene = built.scene;
    this.collision = built.collision;

    this.build = new BuildManager(this.scene, this.collision);
    this.splash = new WaterSplashPool(this.scene);
    const diffParams = DIFFICULTY[ctx.save.difficulty];
    this.ai = new AiSystem(diffParams);

    this.safeZone = new SafeZone(this.map.sizeMeters / 2 - 2, 8, 180);
    this.safeZone.attach(this.scene);

    this.spawnAgents(diffParams.moveSpeed);
    this.spawnPickups();
    this.scene.add(this.camera);
    this.firstPersonGun = createFirstPersonWaterGun(this.player.skin);
    this.firstPersonGun.position.set(0.36, -0.28, -0.78);
    this.firstPersonGun.rotation.set(-0.12, -0.24, 0.05);
    this.firstPersonGunNozzle = this.firstPersonGun.getObjectByName('first-person-water-gun-nozzle') ?? null;
    this.camera.add(this.firstPersonGun);

    const previewGeo = new THREE.BoxGeometry(1, 1, 1);
    const previewMat = new THREE.MeshBasicMaterial({ color: 0x80d4ff, transparent: true, opacity: 0.45, wireframe: false });
    this.buildPreview = new THREE.Mesh(previewGeo, previewMat);
    this.buildPreview.visible = false;
    this.scene.add(this.buildPreview);

    this.hud = new Hud(ctx.rootEl);
    this.hud.setHp(this.player.loadout.hp, this.player.loadout.hpMax);
    this.hud.setWeapon(this.player.loadout.weapon, this.player.loadout.ammo[this.player.loadout.weapon], this.player.ammoMax(this.player.loadout.weapon));
    this.hud.setMaterials(this.player.loadout.wood, this.player.loadout.stone);
    this.hud.setRemaining(this.aliveCount(), this.agents.length);
    this.hud.setBuildMode(false);

    this.input.attachKeyboardMouse(ctx.canvas);
    this.input.attachTouch(ctx.rootEl);

    this.resizeHandler = () => {
      this.resizeRenderer();
    };
    window.addEventListener('resize', this.resizeHandler);
    window.visualViewport?.addEventListener('resize', this.resizeHandler);

    if (!ctx.save.tutorialSeen) {
      const tutorial = navigator.maxTouchPoints > 0 ? 'みぎがわでみる！\n💦でうつ！' : '💦 クリックでみる！うつ！';
      this.hud.showMessage(tutorial, 3500);
      ctx.saveUpdate({ tutorialSeen: true });
    } else {
      this.hud.showMessage(`📍 ${this.map.nameHiragana}`, 1500);
    }

    ctx.audio.startBgm(battleTrackForMap(this.map.id));
    this.startedAt = performance.now();
    this.lastFrame = performance.now();
    this.loop();
  }

  private spawnAgents(cpuSpeed: number): void {
    const playerSkin = SKINS[this.ctx.save.selectedSkin];
    const spawnPoints = this.map.spawnPoints.slice();
    this.player = new Agent(PLAYER_ID, false, playerSkin);
    this.player.applyBaseSpeed(MOVE_SPEED);
    const sp = spawnPoints.shift() ?? [0, 0];
    this.player.position.set(sp[0], 0.85, sp[1]);
    this.agents.push(this.player);
    this.scene.add(this.player.mesh);

    const otherSkins = SKIN_ORDER.filter((s) => s !== this.ctx.save.selectedSkin);
    for (let i = 0; i < NUM_BOTS; i++) {
      const skin = SKINS[otherSkins[i % otherSkins.length]];
      const bot = new Agent(`cpu-${i}`, true, skin);
      bot.applyBaseSpeed(cpuSpeed);
      const point = spawnPoints[i % spawnPoints.length] ?? [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50];
      bot.position.set(point[0], 0.85, point[1]);
      this.agents.push(bot);
      this.scene.add(bot.mesh);
    }
    this.agents.forEach((a) => this.addAgentCollider(a));
  }

  private addAgentCollider(a: Agent): void {
    const id = `agent-${a.id}`;
    this.collisionByAgent.set(a.id, id);
    this.collision.add({
      id,
      aabb: makeAABB(
        new THREE.Vector3(a.position.x, a.position.y, a.position.z),
        new THREE.Vector3(0.9, 1.7, 0.9),
      ),
      blocksMovement: false,
      blocksProjectile: true,
    });
  }

  private updateAgentCollider(a: Agent): void {
    const id = this.collisionByAgent.get(a.id);
    if (!id) return;
    const col = (this.collision as unknown as { byId: Map<string, { aabb: ReturnType<typeof makeAABB> }> }).byId.get(id);
    if (col) {
      const half = new THREE.Vector3(0.45, 0.85, 0.45);
      col.aabb.min.set(a.position.x - half.x, a.position.y - half.y, a.position.z - half.z);
      col.aabb.max.set(a.position.x + half.x, a.position.y + half.y + 0.85, a.position.z + half.z);
    }
  }

  private spawnPickups(): void {
    const make = (kind: Pickup['kind'], list: Array<[number, number]>) => {
      list.forEach((xz) => {
        const p = createPickup(this.scene, kind, xz);
        this.pickups.push(p);
      });
    };
    make('water-tank', this.map.waterTanks);
    make('weapon-chest', this.map.weaponChests);
    make('wood-node', this.map.woodNodes);
    make('stone-node', this.map.stoneNodes);
  }

  private aliveCount(): number {
    return this.agents.filter((a) => !a.eliminated).length;
  }

  private loop = (): void => {
    if (this.done) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.elapsed += dt;
    this.tick(dt, now);
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private tick(dt: number, now: number): void {
    const input = this.input.poll();

    if (!this.player.eliminated) {
      const sensX = document.pointerLockElement ? MOUSE_SENS : TOUCH_SENS;
      this.player.yaw -= input.pointerDeltaX * sensX;
      this.player.pitch -= input.pointerDeltaY * sensX;
      this.player.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.player.pitch));

      if (input.toggleBuild) {
        this.buildMode = !this.buildMode;
        this.ctx.audio.playSfx('click');
        this.hud.setBuildMode(this.buildMode, BUILD_ORDER[this.buildKindIndex]);
        this.buildPreview.visible = this.buildMode;
      }
      if (input.buildIndex >= 0 && input.buildIndex < BUILD_ORDER.length) {
        this.buildKindIndex = input.buildIndex;
        this.hud.setBuildMode(this.buildMode, BUILD_ORDER[this.buildKindIndex]);
      }
      if (input.rotateBuild) this.buildYawIndex = (this.buildYawIndex + 1) % 4;

      const forward = this.player.forward();
      const right = this.player.rightVec();
      const moveX = forward.x * input.forward + right.x * input.right;
      const moveZ = forward.z * input.forward + right.z * input.right;
      const len = Math.hypot(moveX, moveZ);
      const vx = len > 0 ? (moveX / len) * this.player.speed : 0;
      const vz = len > 0 ? (moveZ / len) * this.player.speed : 0;
      this.player.velocity.x = vx;
      this.player.velocity.z = vz;

      if (input.jump && this.player.onGround) {
        this.player.velocity.y = JUMP_VELOCITY;
        this.player.onGround = false;
        this.ctx.audio.playSfx('jump');
      }

      if (input.fire) {
        if (this.buildMode) this.tryBuild(this.player);
        else this.tryFire(this.player, this.player.lookDirection(), now);
      }

      if (input.reload) this.player.cycleWeapon();
    }

    for (const a of this.agents) {
      if (a.eliminated) continue;
      a.velocity.y -= GRAVITY * dt;
      if (a.isCpu) {
        const cpuCtx = this.ai.tick(a, dt, now, this.agents, this.pickups, this.collision, this.map.sizeMeters / 2);
        if (cpuCtx.moveDir.lengthSq() > 0) {
          a.velocity.x = cpuCtx.moveDir.x * a.speed;
          a.velocity.z = cpuCtx.moveDir.z * a.speed;
        } else {
          a.velocity.x = 0;
          a.velocity.z = 0;
        }
        if (cpuCtx.fire && cpuCtx.aim) this.tryFire(a, cpuCtx.aim, now);
      }
      const desired = a.position.clone().add(a.velocity.clone().multiplyScalar(dt));
      const halfExt = new THREE.Vector3(0.45, 0.85, 0.45);
      const center = a.position.clone();
      center.y += halfExt.y;
      const desiredCenter = desired.clone();
      desiredCenter.y += halfExt.y;
      const res = this.collision.resolveCapsuleMove(center, halfExt, desiredCenter);
      a.position.copy(res.position);
      a.position.y -= halfExt.y;
      a.onGround = res.onGround;
      if (res.onGround) a.velocity.y = Math.max(0, a.velocity.y);
      if (this.safeZone.isOutside(a.position)) {
        const damage = this.safeZone.damagePerSecond * dt;
        if (a.takeDamage(damage)) this.onEliminated(a, null);
      }
      a.syncMesh(this.elapsed);
      this.updateAgentCollider(a);
    }

    for (const a of this.agents) {
      if (a.eliminated) continue;
      for (const p of this.pickups) {
        if (!p.available) continue;
        if (distanceXZ(a.position, p.position) > 1.6) continue;
        this.applyPickup(a, p);
        setPickupAvailable(p, false, now);
        this.ctx.audio.playSfx('pickup');
        if (a.id === PLAYER_ID) {
          this.hud.showMessage(`${PICKUPS[p.kind].emoji} ${PICKUPS[p.kind].nameHiragana} ゲット！`, 1000);
        }
      }
    }
    for (const p of this.pickups) {
      if (!p.available && now >= p.respawnAt) setPickupAvailable(p, true, now);
      refreshPickupRotation(p, dt);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life += dt;
      pr.velocity.y -= pr.gravity * dt;
      const prev = pr.position.clone();
      pr.position.add(pr.velocity.clone().multiplyScalar(dt));
      pr.mesh.position.copy(pr.position);
      const segDir = pr.position.clone().sub(prev);
      const segLen = segDir.length();
      if (segLen > 0) {
        segDir.normalize();
        const hit = this.collision.raycast(prev, segDir, segLen, `agent-${pr.attackerId}`);
        if (hit) {
          this.onProjectileHit(pr, hit.point, hit.collider.id);
          disposeProjectile(this.scene, pr);
          this.projectiles.splice(i, 1);
          continue;
        }
      }
      if (pr.life > pr.maxLife || pr.position.y < -2) {
        this.splash.burst(pr.position, 4, 3);
        disposeProjectile(this.scene, pr);
        this.projectiles.splice(i, 1);
      }
    }

    this.splash.update(dt);
    this.safeZone.update(dt);

    if (!this.player.eliminated) {
      const eye = this.player.eyePosition;
      this.camera.position.copy(eye);
      const dir = this.player.lookDirection();
      this.camera.lookAt(eye.clone().add(dir));
      this.player.mesh.visible = false;
      this.updateFirstPersonGun(now);
      if (this.buildMode) {
        const previewPos = eye.clone().add(this.player.lookDirection().setY(0).normalize().multiplyScalar(4));
        previewPos.y = 0;
        const snapped = new THREE.Vector3(Math.round(previewPos.x / 4) * 4, 0, Math.round(previewPos.z / 4) * 4);
        const kind = BUILD_ORDER[this.buildKindIndex];
        snapped.y = kind === 'floor' ? 0.2 : 2;
        this.buildPreview.position.copy(snapped);
        const horizontal = this.buildYawIndex % 2 === 0;
        if (kind === 'wall') {
          this.buildPreview.scale.set(horizontal ? 4 : 0.4, 4, horizontal ? 0.4 : 4);
        } else if (kind === 'floor') {
          this.buildPreview.scale.set(4, 0.4, 4);
        } else {
          this.buildPreview.scale.set(4, 4, 4);
        }
        this.buildPreview.visible = true;
      } else {
        this.buildPreview.visible = false;
      }
    } else {
      if (this.firstPersonGun) this.firstPersonGun.visible = false;
      const t = this.elapsed * 0.3;
      this.camera.position.set(Math.cos(t) * 30, 35, Math.sin(t) * 30);
      this.camera.lookAt(0, 0, 0);
    }

    this.hud.setHp(this.player.loadout.hp, this.player.loadout.hpMax);
    this.hud.setWeapon(this.player.loadout.weapon, this.player.loadout.ammo[this.player.loadout.weapon], this.player.ammoMax(this.player.loadout.weapon));
    this.hud.setMaterials(this.player.loadout.wood, this.player.loadout.stone);
    this.hud.setRemaining(this.aliveCount(), this.agents.length);
    this.hud.setZoneWarning(this.safeZone.isOutside(this.player.position) && !this.player.eliminated);
    this.hud.setCrosshair(!this.buildMode && !this.player.eliminated);

    const alive = this.agents.filter((a) => !a.eliminated);
    const playerWon = alive.length === 1 && alive[0].id === PLAYER_ID;
    const playerLost = this.player.eliminated;
    if (!this.done && playerWon) {
      this.endMatch(true);
    } else if (!this.done && alive.length === 0) {
      this.endMatch(false);
    } else if (!this.done && playerLost && alive.length <= 1) {
      this.endMatch(false);
    }
  }

  private tryFire(a: Agent, dir: THREE.Vector3, now: number): void {
    const weapon = WEAPONS[a.loadout.weapon];
    if (now < a.lastFireMs + a.fireCooldownMs(a.loadout.weapon)) return;
    if (a.loadout.ammo[a.loadout.weapon] < weapon.ammoPerShot) {
      if (a.id === PLAYER_ID) this.hud.showMessage('💧 みずがない！タンクへ！', 1200);
      return;
    }
    a.lastFireMs = now;
    a.loadout.ammo[a.loadout.weapon] -= weapon.ammoPerShot;
    a.playFireVisual(now / 1000);
    if (a.id === PLAYER_ID && weapon.id === 'water-gun') {
      this.firstPersonGunUntil = now + 260;
    }

    const eye = a.eyePosition;
    const damageMult = a.isCpu ? DIFFICULTY[this.ctx.save.difficulty].damageMultiplier : 1;
    for (let i = 0; i < weapon.pellets; i++) {
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * weapon.spreadRad,
        (Math.random() - 0.5) * weapon.spreadRad,
        (Math.random() - 0.5) * weapon.spreadRad,
      );
      const d = dir.clone().add(spread).normalize();
      const muzzle = eye.clone().add(d.clone().multiplyScalar(0.6));
      const pr = spawnProjectile(this.scene, weapon.id, weapon, muzzle, d, a.id, weapon.damage * damageMult);
      this.projectiles.push(pr);
    }

    const sfx: Record<WeaponId, 'water-shot' | 'balloon-shot' | 'bubble-shot'> = {
      'water-gun': 'water-shot',
      'balloon-launcher': 'balloon-shot',
      'bubble-shower': 'bubble-shot',
    };
    this.ctx.audio.playSfx(sfx[weapon.id]);
  }

  private onProjectileHit(pr: Projectile, point: THREE.Vector3, hitColliderId: string): void {
    this.splash.burst(point, 10, 5);
    this.ctx.audio.playSfx('splash');

    const agent = this.agents.find((a) => this.collisionByAgent.get(a.id) === hitColliderId);
    if (agent) {
      if (agent.takeDamage(pr.damage)) {
        const attacker = this.agents.find((a) => a.id === pr.attackerId) ?? null;
        if (attacker && attacker.id !== agent.id) attacker.eliminations += 1;
        this.onEliminated(agent, attacker);
      }
    } else if (hitColliderId.startsWith('build-')) {
      this.build.damagePiece(hitColliderId, pr.damage);
    }

    if (pr.splashRadius > 0) {
      for (const a of this.agents) {
        if (a.eliminated) continue;
        const d = a.position.distanceTo(point);
        if (d <= pr.splashRadius) {
          const falloff = 1 - d / pr.splashRadius;
          if (a.takeDamage(pr.damage * 0.5 * falloff)) {
            const attacker = this.agents.find((x) => x.id === pr.attackerId) ?? null;
            if (attacker && attacker.id !== a.id) attacker.eliminations += 1;
            this.onEliminated(a, attacker);
          }
        }
      }
    }
  }

  private onEliminated(victim: Agent, attacker: Agent | null): void {
    this.ctx.audio.playSfx('eliminated');
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    );
    cloud.position.copy(victim.position);
    cloud.position.y += 1;
    this.scene.add(cloud);
    setTimeout(() => this.scene.remove(cloud), 1200);
    if (victim.id === PLAYER_ID) {
      this.hud.showMessage('💦 びしょぬれ！\n かんせんモード', 2000);
    } else if (attacker?.id === PLAYER_ID) {
      this.hud.showMessage(`🎯 ${victim.skin.nameHiragana} を びしょぬれ！`, 1200);
    }
  }

  private applyPickup(a: Agent, p: Pickup): void {
    switch (p.kind) {
      case 'water-tank':
        a.refillWater(PICKUPS['water-tank'].amount);
        break;
      case 'weapon-chest':
        if (p.containedWeapon) a.giveWeapon(p.containedWeapon);
        break;
      case 'wood-node':
        a.loadout.wood += PICKUPS['wood-node'].amount;
        break;
      case 'stone-node':
        a.loadout.stone += PICKUPS['stone-node'].amount;
        break;
    }
  }

  private tryBuild(a: Agent): void {
    const kind: BuildPieceKind = BUILD_ORDER[this.buildKindIndex];
    const conf = BUILD_PIECES[kind];
    const cost = conf.costMaterial;
    if (a.loadout.wood + a.loadout.stone < cost) {
      this.hud.showMessage('🪵 そざいがたりない！', 1000);
      return;
    }
    const useWood = Math.min(a.loadout.wood, cost);
    a.loadout.wood -= useWood;
    a.loadout.stone -= cost - useWood;

    const eye = a.eyePosition;
    const candidate = eye.clone().add(a.lookDirection().setY(0).normalize().multiplyScalar(4));
    candidate.y = 0;
    const snapped = new THREE.Vector3(Math.round(candidate.x / 4) * 4, 0, Math.round(candidate.z / 4) * 4);
    const placed = this.build.tryPlace(kind, snapped, this.buildYawIndex, a.id, a.skin.color);
    if (!placed) {
      a.loadout.wood += useWood;
      a.loadout.stone += cost - useWood;
      this.hud.showMessage('🔨 ここにはおけないよ', 900);
      return;
    }
    this.ctx.audio.playSfx('build');
  }

  private endMatch(victory: boolean): void {
    if (this.done) return;
    this.done = true;
    const totalAgents = this.agents.length;
    const eliminatedRank = this.agents.filter((a) => a.eliminated && a.id !== PLAYER_ID).length;
    const rank = victory ? 1 : Math.max(1, totalAgents - eliminatedRank);
    const result: MatchResult = {
      rank: Math.max(1, Math.min(totalAgents, rank)),
      totalPlayers: totalAgents,
      eliminations: this.player.eliminations,
      durationSec: (performance.now() - this.startedAt) / 1000,
      victory,
    };
    this.ctx.audio.stopBgm();
    if (victory) this.ctx.audio.playSfx('victory');
    this.ctx.saveUpdate({
      totalMatches: this.ctx.save.totalMatches + 1,
      totalWins: this.ctx.save.totalWins + (victory ? 1 : 0),
    });
    setTimeout(() => {
      this.ctx.goto({ id: 'result', result });
    }, 1200);
  }

  resize(): void {
    if (!this.renderer) return;
    this.resizeRenderer();
  }

  async exit(): Promise<void> {
    this.done = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
    window.visualViewport?.removeEventListener('resize', this.resizeHandler);
    this.input.detach();
    this.hud.destroy();
    this.projectiles.forEach((p) => disposeProjectile(this.scene, p));
    this.build.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.renderer.dispose();
  }

  private resizeRenderer(): void {
    const viewport = gameViewportSize();
    this.renderer.setSize(viewport.width, viewport.height, false);
    if (this.camera) {
      this.camera.aspect = viewport.width / viewport.height;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateFirstPersonGun(now: number): void {
    if (!this.firstPersonGun) return;
    const pulse = Math.max(0, Math.min(1, (this.firstPersonGunUntil - now) / 260));
    if (pulse <= 0) {
      this.firstPersonGun.visible = false;
      if (this.firstPersonGunNozzle) this.firstPersonGunNozzle.visible = false;
      return;
    }
    const kick = Math.sin(pulse * Math.PI);
    this.firstPersonGun.visible = true;
    this.firstPersonGun.position.set(0.36 + kick * 0.02, -0.28 - kick * 0.02, -0.78 + kick * 0.12);
    this.firstPersonGun.rotation.set(-0.12 - kick * 0.08, -0.24, 0.05 + kick * 0.04);
    if (this.firstPersonGunNozzle) {
      this.firstPersonGunNozzle.visible = pulse > 0.25;
      this.firstPersonGunNozzle.scale.setScalar(1 + kick * 1.4);
    }
  }
}

function gameViewportSize(): { width: number; height: number } {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}
