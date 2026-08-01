import * as THREE from 'three';
import type { GameScene, SceneContext } from './Scene';
import type { InputState, MapConfig, MatchResult, WeaponId, BuildPieceKind } from '@/types';
import { getMapById } from '@/game/config/maps';
import { buildWorld } from '@/game/systems/WorldBuilder';
import { CollisionWorld, makeAABB, distanceXZ } from '@/game/systems/CollisionWorld';
import { Agent, agentColliderId } from '@/game/entities/Agent';
import { createFirstPersonWaterGun } from '@/game/entities/AgentVisual';
import { SKINS, SKIN_ORDER } from '@/game/config/skins';
import { WEAPONS } from '@/game/config/weapons';
import { BUILD_ORDER, BUILD_PIECES, BUILD_PIECE_SIZE } from '@/game/config/build';
import { PICKUPS } from '@/game/config/pickups';
import { BuildManager, placePieceAabb } from '@/game/entities/BuildPiece';
import { createPickup, setPickupAvailable, refreshPickupRotation, type Pickup } from '@/game/entities/Pickup';
import { spawnProjectile, disposeProjectile, syncProjectileVisual, type Projectile } from '@/game/entities/Projectile';
import { WaterSplashPool } from '@/game/effects/WaterSplash';
import { AiSystem } from '@/game/systems/AiSystem';
import { DIFFICULTY } from '@/game/config/difficulty';
import { SafeZone } from '@/game/systems/SafeZone';
import { disposeObject3D } from '@/game/systems/disposeObject';
import { applyAimAssist, aimAssistParamsFor, type AimAssistTarget } from '@/game/systems/AimAssist';
import { InputManager } from '@/game/input/InputManager';
import { isTouchDevice } from '@/game/input/touchDevice';
import { battleTrackForMap } from '@/game/audio/AudioEngine';
import { Hud, screenBearingRad, type RadarBlip } from '@/ui/Hud';
import { AgentNameplates, type NameplateTarget } from '@/ui/AgentNameplates';
import { PauseOverlay } from '@/ui/PauseOverlay';

const PLAYER_ID = 'player';
const NUM_BOTS = 6;
const GRAVITY = 22;
const JUMP_VELOCITY = 9;
const MOVE_SPEED = 7.5;
const MOUSE_SENS = 0.0028;
const TOUCH_SENS = 0.0038;
/** 視点のガタつきを抑えるための追従率（1 に近いほどキビキビ動く） */
const LOOK_SMOOTHING = 0.35;
const ZONE_GRACE_SEC = 25;
const BUILD_DISTANCE = 5;
/** スポーン時に「開けている」とみなす距離（メートル） */
const SPAWN_CLEAR_METERS = 14;
/** 一人称のみずでっぽうの基準位置（カメラからの相対） */
const FP_GUN_BASE = { x: 0.32, y: -0.3, z: -0.9 };

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
  private nameplates!: AgentNameplates;
  private pauseOverlay!: PauseOverlay;
  private agents: Agent[] = [];
  private player!: Agent;
  private projectiles: Projectile[] = [];
  private build!: BuildManager;
  private pickups: Pickup[] = [];
  private splash!: WaterSplashPool;
  private ai!: AiSystem;
  private safeZone!: SafeZone;
  private worldUpdate: (dt: number) => void = () => {};
  private buildMode = false;
  private buildKindIndex = 0;
  private buildYawIndex = 0;
  private buildPreview!: THREE.Mesh;
  private buildPreviewMaterial!: THREE.MeshBasicMaterial;
  private firstPersonGun!: THREE.Group;
  private firstPersonGunNozzle: THREE.Object3D | null = null;
  private firstPersonGunUntil = 0;
  private cameraWobbleUntil = 0;
  private cameraWobbleStart = 0;
  private cameraWobbleStrength = 0;
  private elapsed = 0;
  private rafId = 0;
  private lastFrame = 0;
  private resizeHandler!: () => void;
  private done = false;
  private paused = false;
  private startedAt = 0;
  private collisionByAgent = new Map<string, string>();
  private touch = false;
  private lookVelX = 0;
  private lookVelY = 0;
  private viewport = { width: 1, height: 1 };
  private radarBlips: RadarBlip[] = [];
  private nameplateTargets: NameplateTarget[] = [];
  private aimTargets: AimAssistTarget[] = [];
  private tmpVec = new THREE.Vector3();
  private tmpVec2 = new THREE.Vector3();
  private tmpCenter = new THREE.Vector3();
  private colliderSize = new THREE.Vector3(0.9, 1.7, 0.9);
  private nextOutOfWaterMessageAt = 0;
  private nextHitSfxAt = 0;

  constructor(mapId: string) {
    this.mapId = mapId;
  }

  async enter(ctx: SceneContext): Promise<void> {
    this.ctx = ctx;
    this.map = getMapById(this.mapId);
    this.touch = isTouchDevice();

    this.renderer = new THREE.WebGLRenderer({ canvas: ctx.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resizeRenderer();

    this.camera = new THREE.PerspectiveCamera(74, this.viewport.width / this.viewport.height, 0.1, 600);
    const built = buildWorld(this.map);
    this.scene = built.scene;
    this.collision = built.collision;
    this.worldUpdate = built.update;

    this.build = new BuildManager(this.scene, this.collision);
    this.splash = new WaterSplashPool(this.scene);
    const diffParams = DIFFICULTY[ctx.save.difficulty];
    this.ai = new AiSystem(diffParams);

    this.safeZone = new SafeZone(this.map.sizeMeters / 2 - 2, {
      minRadius: 10,
      shrinkSeconds: 170,
      graceSeconds: ZONE_GRACE_SEC,
    });
    this.safeZone.attach(this.scene);

    this.spawnAgents(diffParams.moveSpeed);
    this.spawnPickups();
    this.scene.add(this.camera);
    this.firstPersonGun = createFirstPersonWaterGun(this.player.skin);
    this.firstPersonGun.position.set(FP_GUN_BASE.x, FP_GUN_BASE.y, FP_GUN_BASE.z);
    this.firstPersonGun.rotation.set(-0.04, 0.26, 0.02);
    this.firstPersonGun.scale.setScalar(0.62);
    this.firstPersonGunNozzle = this.firstPersonGun.getObjectByName('first-person-water-gun-nozzle') ?? null;
    this.camera.add(this.firstPersonGun);

    const previewGeo = new THREE.BoxGeometry(1, 1, 1);
    this.buildPreviewMaterial = new THREE.MeshBasicMaterial({ color: 0x80d4ff, transparent: true, opacity: 0.45 });
    this.buildPreview = new THREE.Mesh(previewGeo, this.buildPreviewMaterial);
    this.buildPreview.visible = false;
    this.scene.add(this.buildPreview);

    this.hud = new Hud(ctx.rootEl);
    this.hud.onPause(() => this.togglePause());
    this.nameplates = new AgentNameplates(ctx.rootEl);
    this.pauseOverlay = new PauseOverlay(ctx.uiOverlay, {
      onResume: () => this.setPaused(false),
      onRestart: () => {
        this.ctx.audio.playSfx('click');
        this.ctx.goto({ id: 'battle', mapId: this.mapId });
      },
      onQuit: () => {
        this.ctx.audio.playSfx('click');
        this.ctx.goto({ id: 'title' });
      },
    });

    this.hud.setHp(this.player.loadout.hp, this.player.loadout.hpMax);
    this.hud.setWeapon(
      this.player.loadout.weapon,
      this.player.loadout.ammo[this.player.loadout.weapon],
      this.player.ammoMax(this.player.loadout.weapon),
      this.player.isRechargingWater,
    );
    this.hud.setMaterials(this.player.loadout.wood, this.player.loadout.stone);
    this.hud.setRemaining(this.aliveCount(), this.agents.length);
    this.hud.setBuildMode(false);

    this.input.attachKeyboardMouse(ctx.canvas);
    this.input.attachTouch(ctx.rootEl);
    document.body.classList.toggle('skb-touch-mode', this.touch);

    this.resizeHandler = () => {
      this.resizeRenderer();
    };
    window.addEventListener('resize', this.resizeHandler);
    window.visualViewport?.addEventListener('resize', this.resizeHandler);

    if (!ctx.save.tutorialSeen) {
      const tutorial = this.touch
        ? '👈 うごく　👉 みる\n💦ボタンで みずをかける！'
        : '👀 クリックで みまわす\n💦 おしっぱなしで みずをかける！';
      this.hud.showMessage(tutorial, 4200);
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
    this.player.yaw = this.clearSpawnYaw(this.player.position);
    this.agents.push(this.player);
    this.scene.add(this.player.mesh);

    const otherSkins = SKIN_ORDER.filter((s) => s !== this.ctx.save.selectedSkin);
    for (let i = 0; i < NUM_BOTS; i++) {
      const skin = SKINS[otherSkins[i % otherSkins.length]];
      const bot = new Agent(`cpu-${i}`, true, skin);
      bot.applyBaseSpeed(cpuSpeed);
      const point = spawnPoints[i % spawnPoints.length] ?? [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50];
      bot.position.set(point[0], 0.85, point[1]);
      bot.yaw = this.clearSpawnYaw(bot.position);
      this.agents.push(bot);
      this.scene.add(bot.mesh);
    }
    this.agents.forEach((a) => this.addAgentCollider(a));
  }

  /**
   * スタート直後に壁を向いていると「なにも見えない」ので、
   * ひろばの中心方向から順に見て、いちばん開けている向きを選ぶ。
   */
  private clearSpawnYaw(position: THREE.Vector3): number {
    const eye = position.clone();
    eye.y += 1.4;
    const toCenter = Math.atan2(-(0 - position.x), -(0 - position.z));
    const steps = 12;
    let bestYaw = toCenter;
    let bestClearance = -1;
    for (let i = 0; i < steps; i++) {
      const yaw = toCenter + (i * Math.PI * 2) / steps;
      const dir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const hit = this.collision.raycast(eye, dir, SPAWN_CLEAR_METERS);
      const clearance = hit ? hit.distance : SPAWN_CLEAR_METERS;
      if (clearance >= SPAWN_CLEAR_METERS) return yaw;
      if (clearance > bestClearance) {
        bestClearance = clearance;
        bestYaw = yaw;
      }
    }
    return bestYaw;
  }

  private addAgentCollider(a: Agent): void {
    const id = agentColliderId(a.id);
    this.collisionByAgent.set(a.id, id);
    this.collision.add({
      id,
      aabb: makeAABB(new THREE.Vector3(a.position.x, a.position.y + 0.85, a.position.z), this.colliderSize),
      blocksMovement: false,
      blocksProjectile: true,
    });
  }

  private updateAgentCollider(a: Agent): void {
    const id = this.collisionByAgent.get(a.id);
    if (!id) return;
    this.tmpCenter.set(a.position.x, a.position.y + 0.85, a.position.z);
    this.collision.updateAabb(id, this.tmpCenter, this.colliderSize);
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
    // ポーズ中も入力は毎フレーム読む。読まないと Esc が押しっぱなし扱いで
    // 残ってしまい、「つづける」を押した直後にまたポーズしてしまう。
    const input = this.input.poll();
    if (input.pause) this.togglePause();
    if (!this.paused) {
      this.elapsed += dt;
      this.tick(input, dt, now);
    }
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private togglePause(): void {
    this.setPaused(!this.paused);
  }

  private setPaused(paused: boolean): void {
    if (this.done) return;
    this.paused = paused;
    if (paused) {
      this.pauseOverlay.show();
      this.ctx.audio.playSfx('click');
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      this.pauseOverlay.hide();
      this.lastFrame = performance.now();
    }
  }

  private tick(input: InputState, dt: number, now: number): void {
    if (!this.player.eliminated) {
      this.updatePlayerLook(input.pointerDeltaX, input.pointerDeltaY, dt);

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
      if (input.rotateBuild) {
        this.buildYawIndex = (this.buildYawIndex + 1) % 4;
        if (this.buildMode) this.ctx.audio.playSfx('click');
      }

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
        else this.tryFire(this.player, this.playerAimDirection(), now);
      }

      if (input.reload) {
        this.player.cycleWeapon();
        this.ctx.audio.playSfx('click');
      }
    }

    for (const a of this.agents) {
      if (a.eliminated) continue;
      a.regenAmmo(dt, now);
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
        // 外に出るほど強く乾く。ふちギリギリならやさしくしておく。
        const outside = this.safeZone.distanceOutside(a.position);
        const intensity = 0.5 + Math.min(1, outside / 12);
        const damage = this.safeZone.damagePerSecond * intensity * dt;
        if (a.takeDamage(damage)) this.onEliminated(a, null);
      }
      a.syncMesh(this.elapsed);
      this.updateAgentCollider(a);
    }

    for (const a of this.agents) {
      if (a.eliminated) continue;
      for (const p of this.pickups) {
        if (!p.available) continue;
        if (distanceXZ(a.position, p.position) > 1.8) continue;
        this.applyPickup(a, p);
        setPickupAvailable(p, false, now);
        if (a.id === PLAYER_ID) {
          this.ctx.audio.playSfx('pickup');
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
      syncProjectileVisual(pr);
      const segDir = pr.position.clone().sub(prev);
      const segLen = segDir.length();
      if (segLen > 0) {
        segDir.normalize();
        const hit = this.collision.raycast(prev, segDir, segLen, agentColliderId(pr.attackerId));
        if (hit) {
          this.onProjectileHit(pr, hit.point, hit.collider.id);
          disposeProjectile(this.scene, pr);
          this.projectiles.splice(i, 1);
          continue;
        }
      }
      if (pr.position.y <= 0.08) {
        this.splash.burst(pr.position, 7, 3.4);
        this.playNearbySfx('splash', pr.position, 26);
        disposeProjectile(this.scene, pr);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (pr.life > pr.maxLife) {
        this.splash.burst(pr.position, 5, 3);
        disposeProjectile(this.scene, pr);
        this.projectiles.splice(i, 1);
      }
    }

    this.splash.update(dt);
    this.safeZone.update(dt);
    this.worldUpdate(dt);

    if (!this.player.eliminated) {
      const eye = this.player.eyePosition;
      this.camera.position.copy(eye);
      this.applyCameraWobble(now);
      const dir = this.player.lookDirection();
      this.camera.lookAt(eye.clone().add(dir));
      this.player.mesh.visible = false;
      this.updateFirstPersonGun(now);
      this.updateBuildPreview();
    } else {
      if (this.firstPersonGun) this.firstPersonGun.visible = false;
      this.buildPreview.visible = false;
      const t = this.elapsed * 0.3;
      this.camera.position.set(Math.cos(t) * 30, 35, Math.sin(t) * 30);
      this.camera.lookAt(0, 0, 0);
    }

    this.hud.setHp(this.player.loadout.hp, this.player.loadout.hpMax);
    this.hud.setWeapon(
      this.player.loadout.weapon,
      this.player.loadout.ammo[this.player.loadout.weapon],
      this.player.ammoMax(this.player.loadout.weapon),
      this.player.isRechargingWater,
    );
    this.hud.setMaterials(this.player.loadout.wood, this.player.loadout.stone);
    this.hud.setRemaining(this.aliveCount(), this.agents.length);
    this.hud.setZoneWarning(
      this.safeZone.isOutside(this.player.position) && !this.player.eliminated,
      this.safeZone.secondsUntilShrink,
    );
    this.hud.setCrosshair(!this.buildMode && !this.player.eliminated);
    this.updateOverlays(now);

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

  /** 視点をなめらかに追従させる。タッチのガタつき対策。 */
  private updatePlayerLook(deltaX: number, deltaY: number, dt: number): void {
    const sens = document.pointerLockElement ? MOUSE_SENS : TOUCH_SENS;
    const blend = Math.min(1, LOOK_SMOOTHING + dt * 6);
    this.lookVelX += (deltaX * sens - this.lookVelX) * blend;
    this.lookVelY += (deltaY * sens - this.lookVelY) * blend;
    if (Math.abs(this.lookVelX) < 0.00002) this.lookVelX = 0;
    if (Math.abs(this.lookVelY) < 0.00002) this.lookVelY = 0;
    this.player.yaw -= this.lookVelX;
    this.player.pitch -= this.lookVelY;
    this.player.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.player.pitch));
  }

  /** プレイヤーの狙い。指では狙いにくいのでエイムアシストを弱くかける。 */
  private playerAimDirection(): THREE.Vector3 {
    const look = this.player.lookDirection();
    this.aimTargets.length = 0;
    for (const a of this.agents) {
      if (a.eliminated || a.id === PLAYER_ID) continue;
      this.aimTargets.push({ id: a.id, point: a.eyePosition });
    }
    const params = aimAssistParamsFor(this.touch, this.ctx.save.difficulty);
    const eye = this.player.eyePosition;
    const result = applyAimAssist(eye, look, this.aimTargets, params, (target) => {
      this.tmpVec.copy(target.point).sub(eye);
      const dist = this.tmpVec.length();
      if (dist < 0.001) return false;
      this.tmpVec.divideScalar(dist);
      const hit = this.collision.raycast(eye, this.tmpVec, dist, agentColliderId(PLAYER_ID));
      return !hit || hit.collider.id === agentColliderId(target.id);
    });
    return result.direction;
  }

  private updateBuildPreview(): void {
    if (!this.buildMode) {
      this.buildPreview.visible = false;
      return;
    }
    const kind = BUILD_ORDER[this.buildKindIndex];
    const snapped = this.buildTargetPosition();
    const { center, size } = placePieceAabb(kind, snapped, this.buildYawIndex);
    this.buildPreview.position.copy(center);
    this.buildPreview.scale.copy(size);
    const cost = BUILD_PIECES[kind].costMaterial;
    const canAfford = this.player.loadout.wood + this.player.loadout.stone >= cost;
    const blocked = this.build.isBlocked(kind, snapped, this.buildYawIndex);
    // おけるかどうかを色で伝える（みずいろ = おける／あかむらさき = おけない）
    this.buildPreviewMaterial.color.setHex(canAfford && !blocked ? 0x80d4ff : 0xff8a80);
    this.buildPreviewMaterial.opacity = canAfford && !blocked ? 0.45 : 0.3;
    this.buildPreview.visible = true;
  }

  private buildTargetPosition(): THREE.Vector3 {
    const eye = this.player.eyePosition;
    this.tmpVec2.copy(this.player.lookDirection()).setY(0);
    if (this.tmpVec2.lengthSq() < 0.0001) this.tmpVec2.set(0, 0, -1);
    this.tmpVec2.normalize().multiplyScalar(BUILD_DISTANCE);
    const candidate = eye.clone().add(this.tmpVec2);
    return new THREE.Vector3(
      Math.round(candidate.x / BUILD_PIECE_SIZE) * BUILD_PIECE_SIZE,
      0,
      Math.round(candidate.z / BUILD_PIECE_SIZE) * BUILD_PIECE_SIZE,
    );
  }

  private updateOverlays(now: number): void {
    this.radarBlips.length = 0;
    this.nameplateTargets.length = 0;
    const px = this.player.position.x;
    const pz = this.player.position.z;

    for (const a of this.agents) {
      if (a.id === PLAYER_ID) continue;
      if (!a.eliminated) {
        this.radarBlips.push({ x: a.position.x - px, z: a.position.z - pz, color: 0xff7043, kind: 'enemy' });
      }
      this.nameplateTargets.push({
        id: a.id,
        label: a.skin.nameHiragana,
        color: a.skin.color,
        hpRatio: a.loadout.hp / a.loadout.hpMax,
        position: this.nameplateAnchor(a),
        visible: !a.eliminated && !this.player.eliminated,
      });
    }
    for (const p of this.pickups) {
      if (!p.available) continue;
      if (p.kind === 'water-tank') {
        this.radarBlips.push({ x: p.position.x - px, z: p.position.z - pz, color: 0x4fc3f7, kind: 'water' });
      } else if (p.kind === 'weapon-chest') {
        this.radarBlips.push({ x: p.position.x - px, z: p.position.z - pz, color: 0xffd166, kind: 'chest' });
      }
    }

    this.hud.update(now, this.radarBlips, this.player.yaw);
    this.nameplates.update(this.nameplateTargets, this.camera, this.viewport.width, this.viewport.height);
  }

  private nameplateAnchor(a: Agent): THREE.Vector3 {
    return new THREE.Vector3(a.position.x, a.position.y + 2.15, a.position.z);
  }

  private tryFire(a: Agent, dir: THREE.Vector3, now: number): void {
    const weapon = WEAPONS[a.loadout.weapon];
    if (now < a.lastFireMs + a.fireCooldownMs(a.loadout.weapon)) return;
    if (!a.canFireWeapon(a.loadout.weapon)) {
      if (a.id === PLAYER_ID && now >= this.nextOutOfWaterMessageAt) {
        this.nextOutOfWaterMessageAt = now + 2600;
        this.hud.showMessage(
          weapon.refillPerSecond > 0 ? '💧 みずを ためてるよ… ちょっとまってね' : '💧 みずがない！タンクへ！',
          1300,
        );
      }
      return;
    }
    a.lastFireMs = now;
    a.consumeAmmo(a.loadout.weapon);
    // AgentVisual はバトル開始からの経過秒で動くので、performance.now() ではなく elapsed を渡す
    a.playFireVisual(this.elapsed);
    if (a.id === PLAYER_ID) {
      this.firstPersonGunUntil = now + 260;
    }

    const eye = a.eyePosition;
    if (a.isCpu) this.splash.burst(eye.clone().add(dir.clone().multiplyScalar(0.75)), 3, 2.2);
    const damageMult = a.isCpu ? DIFFICULTY[this.ctx.save.difficulty].damageMultiplier : 1;
    const fromPlayer = a.id === PLAYER_ID;
    for (let i = 0; i < weapon.pellets; i++) {
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * weapon.spreadRad,
        (Math.random() - 0.5) * weapon.spreadRad,
        (Math.random() - 0.5) * weapon.spreadRad,
      );
      const d = dir.clone().add(spread).normalize();
      const muzzle = eye.clone().add(d.clone().multiplyScalar(0.6));
      const pr = spawnProjectile(this.scene, weapon.id, weapon, muzzle, d, a.id, weapon.damage * damageMult, fromPlayer);
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
    this.splash.burst(point, 12, 5.5);
    this.playNearbySfx('splash', point, 34);
    const reactedAgents = new Set<string>();

    const agent = this.agents.find((a) => this.collisionByAgent.get(a.id) === hitColliderId);
    if (agent) {
      this.applyProjectileDamage(agent, pr.damage, pr.attackerId, point, reactedAgents);
    } else if (hitColliderId.startsWith('build-')) {
      const destroyed = this.build.damagePiece(hitColliderId, pr.damage);
      if (destroyed) this.splash.burst(point, 10, 4);
    }

    if (pr.splashRadius > 0) {
      for (const a of this.agents) {
        if (a.eliminated) continue;
        const d = a.position.distanceTo(point);
        if (d <= pr.splashRadius) {
          const falloff = 1 - d / pr.splashRadius;
          this.applyProjectileDamage(a, pr.damage * 0.5 * falloff, pr.attackerId, point, reactedAgents);
        }
      }
    }
  }

  private applyProjectileDamage(
    agent: Agent,
    damage: number,
    attackerId: string,
    point: THREE.Vector3,
    reactedAgents: Set<string>,
  ): void {
    if (agent.eliminated) return;
    const attacker = this.agents.find((a) => a.id === attackerId) ?? null;
    if (!reactedAgents.has(agent.id)) {
      agent.playHitVisual(this.elapsed);
      const splashPoint = agent.position.clone();
      splashPoint.y += 1;
      this.splash.burst(splashPoint.lerp(point, 0.35), agent.id === PLAYER_ID ? 10 : 7, agent.id === PLAYER_ID ? 4.5 : 3.4);
      if (agent.id === PLAYER_ID && attackerId !== PLAYER_ID) {
        this.showPlayerHitFeedback(attacker);
      }
      reactedAgents.add(agent.id);
    }
    const eliminated = agent.takeDamage(damage);
    if (attackerId === PLAYER_ID && agent.id !== PLAYER_ID) {
      this.hud.showHitMarker(damage, eliminated);
      // バブルシャワーは 1 回で 7 発とぶので、音が重ならないよう間引く
      const now = performance.now();
      if (now >= this.nextHitSfxAt) {
        this.nextHitSfxAt = now + 70;
        this.ctx.audio.playSfx('water-hit');
      }
    }
    if (eliminated) {
      if (attacker && attacker.id !== agent.id) attacker.eliminations += 1;
      this.onEliminated(agent, attacker);
    }
  }

  private showPlayerHitFeedback(attacker: Agent | null): void {
    this.hud.showHitFeedback();
    this.ctx.audio.playSfx('water-hit');
    if (attacker) {
      // 画面中央からどっち方向に相手がいるかを矢印で示す（レーダーと同じ式を使う）
      const bearing = screenBearingRad(
        attacker.position.x - this.player.position.x,
        attacker.position.z - this.player.position.z,
        this.player.yaw,
      );
      this.hud.showDamageDirection(bearing);
    }
    this.cameraWobbleStart = performance.now();
    this.cameraWobbleUntil = this.cameraWobbleStart + 260;
    this.cameraWobbleStrength = 0.07;
  }

  private applyCameraWobble(now: number): void {
    if (now >= this.cameraWobbleUntil) return;
    const remaining = (this.cameraWobbleUntil - now) / Math.max(1, this.cameraWobbleUntil - this.cameraWobbleStart);
    const strength = this.cameraWobbleStrength * remaining;
    this.camera.position.x += Math.sin(now * 0.055) * strength;
    this.camera.position.y += Math.cos(now * 0.071) * strength * 0.55;
  }

  /**
   * 遠くの音は鳴らさない。CPU が同時に撃つと音が重なってうるさく、
   * 合成コストも無駄になるため。
   */
  private playNearbySfx(name: 'splash', position: THREE.Vector3, maxDistance: number): void {
    if (this.player.position.distanceTo(position) > maxDistance) return;
    this.ctx.audio.playSfx(name);
  }

  private onEliminated(victim: Agent, attacker: Agent | null): void {
    this.ctx.audio.playSfx('eliminated');
    // ぽよんと はじけるあわ（けがや流血の表現はしない）
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    );
    cloud.position.copy(victim.position);
    cloud.position.y += 1;
    this.scene.add(cloud);
    this.splash.burst(cloud.position, 18, 6);
    setTimeout(() => {
      this.scene.remove(cloud);
      cloud.geometry.dispose();
      (cloud.material as THREE.Material).dispose();
    }, 1200);
    if (victim.id === PLAYER_ID) {
      this.hud.showMessage('💦 びしょぬれ！\nみんなを おうえんしよう', 2200);
    } else if (attacker?.id === PLAYER_ID) {
      this.hud.showMessage(`🎯 ${victim.skin.nameHiragana} を びしょぬれ！`, 1400);
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
    const snapped = this.buildTargetPosition();
    const placed = this.build.tryPlace(kind, snapped, this.buildYawIndex, a.id, a.skin.color);
    if (!placed) {
      this.hud.showMessage('🔨 ここにはおけないよ', 900);
      return;
    }
    const useWood = Math.min(a.loadout.wood, cost);
    a.loadout.wood -= useWood;
    a.loadout.stone -= cost - useWood;
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
    document.body.classList.remove('skb-touch-mode');
    this.hud.destroy();
    this.nameplates.destroy();
    this.pauseOverlay.destroy();
    this.projectiles.forEach((p) => disposeProjectile(this.scene, p));
    this.projectiles = [];
    this.splash.dispose();
    this.build.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    // 同じ canvas を使いまわす（WebGL コンテキストが残る）ので、
    // ジオメトリとマテリアルを明示的に破棄しないと再戦のたびにリークする。
    this.camera.remove(this.firstPersonGun);
    disposeObject3D(this.firstPersonGun);
    disposeObject3D(this.scene);
    this.agents = [];
    this.pickups = [];
    this.renderer.dispose();
  }

  private resizeRenderer(): void {
    this.viewport = gameViewportSize();
    this.renderer.setSize(this.viewport.width, this.viewport.height, false);
    if (this.camera) {
      this.camera.aspect = this.viewport.width / this.viewport.height;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateFirstPersonGun(now: number): void {
    if (!this.firstPersonGun) return;
    // 手にみずでっぽうが常に見えていた方が「じぶんが持っている」と分かりやすい
    this.firstPersonGun.visible = true;
    const pulse = Math.max(0, Math.min(1, (this.firstPersonGunUntil - now) / 260));
    // 撃った瞬間がいちばん強くなるようにする（sin だと反動が遅れて見える）
    const kick = pulse * (2 - pulse);
    const moving = Math.hypot(this.player.velocity.x, this.player.velocity.z) > 0.5;
    const bobPhase = this.elapsed * (moving ? 8.5 : 1.6);
    const bobX = Math.sin(bobPhase) * (moving ? 0.016 : 0.004);
    const bobY = Math.abs(Math.cos(bobPhase)) * (moving ? 0.014 : 0.004);

    this.firstPersonGun.position.set(
      FP_GUN_BASE.x + bobX + kick * 0.02,
      FP_GUN_BASE.y + bobY - kick * 0.03,
      FP_GUN_BASE.z + kick * 0.1,
    );
    this.firstPersonGun.rotation.set(-0.04 - kick * 0.2 + bobY * 0.6, 0.26 + bobX * 0.8, 0.02 + kick * 0.05);
    if (this.firstPersonGunNozzle) {
      this.firstPersonGunNozzle.visible = kick > 0.05;
      this.firstPersonGunNozzle.scale.setScalar(0.6 + kick * 1.6);
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
