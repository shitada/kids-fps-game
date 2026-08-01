import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AiSystem } from '@/game/systems/AiSystem';
import { Agent, agentColliderId } from '@/game/entities/Agent';
import { SKINS } from '@/game/config/skins';
import { CollisionWorld, makeAABB } from '@/game/systems/CollisionWorld';

function makeWorldWithAgents(): { world: CollisionWorld; bot: Agent; target: Agent } {
  const world = new CollisionWorld();
  const bot = new Agent('cpu-0', true, SKINS.kuma);
  bot.position.set(0, 0.85, 0);
  const target = new Agent('player', false, SKINS.usagi);
  target.position.set(0, 0.85, -12);

  for (const a of [bot, target]) {
    world.add({
      id: agentColliderId(a.id),
      aabb: makeAABB(new THREE.Vector3(a.position.x, a.position.y + 0.85, a.position.z), new THREE.Vector3(0.9, 1.7, 0.9)),
      blocksMovement: false,
      blocksProjectile: true,
    });
  }
  return { world, bot, target };
}

function runTicks(ai: AiSystem, bot: Agent, target: Agent, world: CollisionWorld, ticks: number): number {
  let fired = 0;
  let now = 0;
  for (let i = 0; i < ticks; i++) {
    now += 16;
    const res = ai.tick(bot, 0.016, now, [bot, target], [], world, 45);
    if (res.fire) fired++;
  }
  return fired;
}

describe('AiSystem line of sight', () => {
  it('shoots at a visible target instead of being blocked by its own collider', () => {
    const { world, bot, target } = makeWorldWithAgents();
    const ai = new AiSystem({
      aimErrorRad: 0.05,
      reactionMs: 0,
      firingChancePerSec: 60,
      buildChance: 0,
      moveSpeed: 6,
      damageMultiplier: 1,
    });
    const fired = runTicks(ai, bot, target, world, 200);
    expect(fired).toBeGreaterThan(0);
  });

  it('does not shoot through a solid wall', () => {
    const { world, bot, target } = makeWorldWithAgents();
    world.add({
      id: 'wall',
      aabb: makeAABB(new THREE.Vector3(0, 2, -6), new THREE.Vector3(8, 4, 1)),
      blocksMovement: true,
      blocksProjectile: true,
    });
    const ai = new AiSystem({
      aimErrorRad: 0.05,
      reactionMs: 0,
      firingChancePerSec: 60,
      buildChance: 0,
      moveSpeed: 6,
      damageMultiplier: 1,
    });
    const fired = runTicks(ai, bot, target, world, 200);
    expect(fired).toBe(0);
  });

  it('fires more often on higher firing chance', () => {
    const base = {
      aimErrorRad: 0.05,
      reactionMs: 0,
      buildChance: 0,
      moveSpeed: 6,
      damageMultiplier: 1,
    };
    const countFor = (firingChancePerSec: number): number => {
      const { world, bot, target } = makeWorldWithAgents();
      return runTicks(new AiSystem({ ...base, firingChancePerSec }), bot, target, world, 400);
    };
    expect(countFor(30)).toBeGreaterThan(countFor(0.2));
  });
});
