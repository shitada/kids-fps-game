import * as THREE from 'three';
import type { Agent } from '@/game/entities/Agent';
import type { CollisionWorld } from '@/game/systems/CollisionWorld';
import type { Pickup } from '@/game/entities/Pickup';
import type { DifficultyParams } from '@/game/config/difficulty';
import { WEAPONS } from '@/game/config/weapons';
import { distanceXZ } from '@/game/systems/CollisionWorld';

type AiState = 'wander' | 'engage' | 'pickup' | 'flee';

interface AiBrain {
  state: AiState;
  target: Agent | null;
  waypoint: THREE.Vector3 | null;
  pickupTarget: Pickup | null;
  reactionUntil: number;
  nextDecisionAt: number;
  nextShotChanceAt: number;
}

export class AiSystem {
  private brains = new Map<string, AiBrain>();
  private params: DifficultyParams;

  constructor(params: DifficultyParams) {
    this.params = params;
  }

  ensure(agent: Agent): AiBrain {
    let brain = this.brains.get(agent.id);
    if (!brain) {
      brain = {
        state: 'wander',
        target: null,
        waypoint: null,
        pickupTarget: null,
        reactionUntil: 0,
        nextDecisionAt: 0,
        nextShotChanceAt: 0,
      };
      this.brains.set(agent.id, brain);
    }
    return brain;
  }

  /**
   * 1 体の CPU エージェントの行動を 1 ティック分進める。
   * 戻り値は「いま発射するか」と「進む方向（ワールド座標で正規化済み）」。
   */
  tick(
    agent: Agent,
    dt: number,
    now: number,
    others: Agent[],
    pickups: Pickup[],
    collision: CollisionWorld,
    mapHalfSize: number,
  ): { fire: boolean; aim: THREE.Vector3 | null; moveDir: THREE.Vector3 } {
    const brain = this.ensure(agent);
    const moveDir = new THREE.Vector3();

    if (now >= brain.nextDecisionAt) {
      this.decideState(agent, brain, others, pickups);
      brain.nextDecisionAt = now + 400 + Math.random() * 600;
    }

    // 視点更新（ターゲットがいれば向ける）
    if (brain.target && !brain.target.eliminated) {
      const toTarget = brain.target.position.clone().sub(agent.position);
      const desiredYaw = Math.atan2(-toTarget.x, -toTarget.z);
      agent.yaw = lerpAngle(agent.yaw, desiredYaw, Math.min(1, dt * 6));
      agent.pitch = Math.atan2(brain.target.position.y - agent.eyePosition.y + 0.5, Math.max(0.1, toTarget.length()));
    } else if (brain.waypoint) {
      const toWp = brain.waypoint.clone().sub(agent.position);
      if (toWp.length() < 1.5) brain.waypoint = null;
      else {
        const desiredYaw = Math.atan2(-toWp.x, -toWp.z);
        agent.yaw = lerpAngle(agent.yaw, desiredYaw, Math.min(1, dt * 3));
      }
    }

    // 移動目標の選択
    let goal: THREE.Vector3 | null = null;
    if (brain.state === 'engage' && brain.target) {
      const dist = distanceXZ(agent.position, brain.target.position);
      const weapon = WEAPONS[agent.loadout.weapon];
      const ideal = weapon.rangeMeters * 0.6;
      const toTarget = brain.target.position.clone().sub(agent.position);
      const dir = toTarget.clone().setY(0).normalize();
      if (dist > ideal + 2) goal = agent.position.clone().add(dir.clone().multiplyScalar(2));
      else if (dist < ideal - 2) goal = agent.position.clone().add(dir.clone().multiplyScalar(-2));
      else {
        // 横移動でストレイフ
        const strafe = new THREE.Vector3(-dir.z, 0, dir.x);
        if (Math.sin(now / 700 + agent.id.length) > 0) goal = agent.position.clone().add(strafe.multiplyScalar(2));
        else goal = agent.position.clone().add(strafe.multiplyScalar(-2));
      }
    } else if (brain.state === 'pickup' && brain.pickupTarget) {
      goal = brain.pickupTarget.position.clone();
    } else if (brain.state === 'flee' && brain.target) {
      const dir = agent.position.clone().sub(brain.target.position).setY(0).normalize();
      goal = agent.position.clone().add(dir.multiplyScalar(5));
    } else {
      if (!brain.waypoint) {
        brain.waypoint = randomPointInMap(mapHalfSize * 0.8);
      }
      goal = brain.waypoint.clone();
    }

    if (goal) {
      const dir = goal.sub(agent.position).setY(0);
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        moveDir.copy(dir);
      }
    }

    // 射撃判定
    let fire = false;
    let aim: THREE.Vector3 | null = null;
    if (brain.state === 'engage' && brain.target && !brain.target.eliminated && now >= brain.reactionUntil) {
      const weapon = WEAPONS[agent.loadout.weapon];
      const dist = distanceXZ(agent.position, brain.target.position);
      const hasLOS = lineOfSight(agent.eyePosition, brain.target.eyePosition, collision, agent.id, brain.target.id);
      if (dist <= weapon.rangeMeters && hasLOS && now >= brain.nextShotChanceAt) {
        // 確率的に撃つ（連射過多を防ぐ）
        const chance = this.params.firingChancePerSec * dt;
        if (Math.random() < chance) {
          fire = true;
          // 照準誤差
          const aimOffset = new THREE.Vector3(
            (Math.random() - 0.5) * this.params.aimErrorRad * dist,
            (Math.random() - 0.5) * this.params.aimErrorRad * dist,
            (Math.random() - 0.5) * this.params.aimErrorRad * dist,
          );
          aim = brain.target.eyePosition.clone().add(aimOffset).sub(agent.eyePosition).normalize();
          brain.nextShotChanceAt = now + weapon.cooldownMs;
        }
      }
    }

    return { fire, aim, moveDir };
  }

  private decideState(agent: Agent, brain: AiBrain, others: Agent[], pickups: Pickup[]): void {
    // 標的を選ぶ：最も近い生存者
    let nearest: Agent | null = null;
    let nearestDist = Infinity;
    for (const a of others) {
      if (a.id === agent.id || a.eliminated) continue;
      const d = distanceXZ(agent.position, a.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = a;
      }
    }
    brain.target = nearest;

    // HP低いなら逃げる
    if (agent.loadout.hp < 30 && nearest) {
      brain.state = 'flee';
      return;
    }

    // 水切れなら給水
    const waterAmmo = agent.loadout.ammo['water-gun'];
    if (waterAmmo < 8) {
      const tank = nearestAvailablePickup(pickups, agent.position, 'water-tank');
      if (tank) {
        brain.state = 'pickup';
        brain.pickupTarget = tank;
        return;
      }
    }

    if (nearest && nearestDist < 50) {
      brain.state = 'engage';
      return;
    }

    brain.state = 'wander';
    brain.pickupTarget = null;
    if (!brain.waypoint) brain.waypoint = randomPointInMap(35);
  }

  remove(id: string): void {
    this.brains.delete(id);
  }
}

function lineOfSight(
  from: THREE.Vector3,
  to: THREE.Vector3,
  collision: CollisionWorld,
  ignoreA: string,
  ignoreB: string,
): boolean {
  const dir = to.clone().sub(from);
  const dist = dir.length();
  dir.normalize();
  const hit = collision.raycast(from, dir, dist, undefined);
  if (!hit) return true;
  if (hit.collider.id === ignoreA || hit.collider.id === ignoreB) return true;
  return hit.distance >= dist - 0.4;
}

function randomPointInMap(half: number): THREE.Vector3 {
  return new THREE.Vector3((Math.random() - 0.5) * half * 2, 0, (Math.random() - 0.5) * half * 2);
}

function nearestAvailablePickup(pickups: Pickup[], from: THREE.Vector3, kind: Pickup['kind']): Pickup | null {
  let best: Pickup | null = null;
  let bestDist = Infinity;
  for (const p of pickups) {
    if (p.kind !== kind || !p.available) continue;
    const d = distanceXZ(from, p.position);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}
