import { describe, it, expect } from 'vitest';
import { SKINS } from '@/game/config/skins';
import { WEAPONS } from '@/game/config/weapons';
import { Agent, agentColliderId } from '@/game/entities/Agent';

describe('Agent', () => {
  it('starts with full HP and water gun loaded', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    expect(a.loadout.hp).toBe(100);
    expect(a.loadout.weapon).toBe('water-gun');
    expect(a.loadout.ammo['water-gun']).toBe(WEAPONS['water-gun'].ammoMax);
    expect(a.eliminated).toBe(false);
  });

  it('applies stronger skin abilities to agent stats', () => {
    const base = new Agent('base', false, SKINS.kuma);
    const strong = new Agent('strong', false, SKINS.sakana);

    expect(strong.loadout.hpMax).toBeGreaterThan(base.loadout.hpMax);
    expect(strong.ammoMax('water-gun')).toBeGreaterThan(base.ammoMax('water-gun'));
    expect(strong.loadout.ammo['water-gun']).toBe(strong.ammoMax('water-gun'));
    expect(strong.fireCooldownMs('water-gun')).toBeLessThan(base.fireCooldownMs('water-gun'));

    base.applyBaseSpeed(10);
    strong.applyBaseSpeed(10);
    expect(strong.speed).toBeGreaterThan(base.speed);
  });

  it('syncs a richer humanoid visual without changing gameplay state', () => {
    const a = new Agent('cpu-1', true, SKINS.usagi);
    a.position.set(1, 0, 2);
    a.velocity.set(3, 0, 4);
    a.yaw = 0.5;
    a.pitch = 0.2;
    a.onGround = true;
    a.loadout.hp = 50;

    a.syncMesh(2);

    expect(a.mesh.userData.kind).toBe('agent-visual');
    expect(a.mesh.position.x).toBe(1);
    expect(a.mesh.position.z).toBe(2);
    expect(a.mesh.rotation.y).toBeCloseTo(0.5);
    expect(a.mesh.visible).toBe(true);

    let visibleWetDrops = 0;
    a.mesh.traverse((obj) => {
      if (obj.userData.kind === 'wet-drop' && obj.visible) visibleWetDrops += 1;
    });
    expect(visibleWetDrops).toBe(3);
  });

  it('shows a stronger water-gun firing visual during the fire pulse', () => {
    const a = new Agent('cpu-1', true, SKINS.usagi);

    a.playFireVisual(1);
    a.syncMesh(1.15);

    let muzzleVisible = false;
    a.mesh.traverse((obj) => {
      if (obj.userData.kind === 'muzzle-splash' && obj.visible) muzzleVisible = true;
    });
    expect(muzzleVisible).toBe(true);
  });

  it('shows wet feedback when hit even before HP drops are large', () => {
    const a = new Agent('cpu-1', true, SKINS.neko);

    a.playHitVisual(2);
    a.syncMesh(2.16);

    let visibleWetDrops = 0;
    a.mesh.traverse((obj) => {
      if (obj.userData.kind === 'wet-drop' && obj.visible) visibleWetDrops += 1;
    });
    expect(visibleWetDrops).toBe(3);
  });

  it('takeDamage decreases HP and returns true on elimination', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    expect(a.takeDamage(30)).toBe(false);
    expect(a.loadout.hp).toBe(70);
    expect(a.takeDamage(80)).toBe(true);
    expect(a.eliminated).toBe(true);
    expect(a.loadout.hp).toBe(0);
  });

  it('takeDamage on eliminated agent returns false (idempotent)', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    a.takeDamage(200);
    expect(a.takeDamage(10)).toBe(false);
  });

  it('giveWeapon unlocks new weapon and switches to it', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    expect(a.loadout.hasWeapon['balloon-launcher']).toBe(false);
    a.giveWeapon('balloon-launcher');
    expect(a.loadout.hasWeapon['balloon-launcher']).toBe(true);
    expect(a.loadout.weapon).toBe('balloon-launcher');
    expect(a.loadout.ammo['balloon-launcher']).toBe(WEAPONS['balloon-launcher'].ammoMax);
  });

  it('refillWater is capped at ammoMax', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    a.loadout.ammo['water-gun'] = 5;
    a.refillWater(1000);
    expect(a.loadout.ammo['water-gun']).toBe(WEAPONS['water-gun'].ammoMax);
  });

  it('cycleWeapon skips weapons the agent does not own', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    a.cycleWeapon();
    expect(a.loadout.weapon).toBe('water-gun');
    a.giveWeapon('bubble-shower');
    a.cycleWeapon();
    expect(a.loadout.weapon).toBe('water-gun');
  });

  it('lookDirection returns a unit vector', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    a.yaw = 0.7;
    a.pitch = -0.3;
    const d = a.lookDirection();
    expect(d.length()).toBeCloseTo(1, 5);
  });
});

describe('Agent water regeneration', () => {
  it('refills the water gun after the delay', () => {
    const a = new Agent('p', false, SKINS.kuma);
    a.loadout.ammo['water-gun'] = 0;
    a.lastFireMs = 1000;
    a.regenAmmo(0.5, 1200);
    expect(a.loadout.ammo['water-gun']).toBe(0);
    a.regenAmmo(1, 3000);
    expect(a.loadout.ammo['water-gun']).toBeGreaterThan(0);
  });

  it('never exceeds the ammo cap', () => {
    const a = new Agent('p', false, SKINS.kuma);
    const cap = a.ammoMax('water-gun');
    a.loadout.ammo['water-gun'] = cap;
    a.regenAmmo(10, 100000);
    expect(a.loadout.ammo['water-gun']).toBe(cap);
  });

  it('does not regenerate the special weapons', () => {
    const a = new Agent('p', false, SKINS.kuma);
    a.giveWeapon('balloon-launcher');
    a.loadout.ammo['balloon-launcher'] = 0;
    a.regenAmmo(10, 100000);
    expect(a.loadout.ammo['balloon-launcher']).toBe(0);
  });

  it('accumulates fractional refills instead of losing them', () => {
    const a = new Agent('p', false, SKINS.kuma);
    a.loadout.ammo['water-gun'] = 0;
    a.lastFireMs = 0;
    for (let i = 0; i < 10; i++) a.regenAmmo(0.1, 5000);
    expect(a.loadout.ammo['water-gun']).toBe(6);
  });
});

describe('agentColliderId', () => {
  it('prefixes agent ids consistently', () => {
    expect(agentColliderId('player')).toBe('agent-player');
    expect(agentColliderId('cpu-3')).toBe('agent-cpu-3');
  });
});

describe('Agent fire visual', () => {
  const findMuzzleSplash = (a: Agent) => {
    let found: { visible: boolean } | null = null;
    a.mesh.traverse((obj) => {
      if (obj.userData.kind === 'muzzle-splash') found = obj as unknown as { visible: boolean };
    });
    return found as { visible: boolean } | null;
  };

  it('shows the muzzle splash when fire and sync use the same clock', () => {
    const a = new Agent('p', false, SKINS.kuma);
    const nowSec = 12.5;
    a.playFireVisual(nowSec);
    a.syncMesh(nowSec);
    const splash = findMuzzleSplash(a);
    expect(splash).not.toBeNull();
    expect(splash!.visible).toBe(true);
  });

  it('hides the muzzle splash again after the pulse ends', () => {
    const a = new Agent('p', false, SKINS.kuma);
    a.playFireVisual(12.5);
    a.syncMesh(12.5);
    a.syncMesh(13.5);
    expect(findMuzzleSplash(a)!.visible).toBe(false);
  });

  it('does not show the muzzle splash when nothing was fired', () => {
    const a = new Agent('p', false, SKINS.kuma);
    a.syncMesh(4);
    expect(findMuzzleSplash(a)!.visible).toBe(false);
  });
});
