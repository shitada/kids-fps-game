import { describe, it, expect } from 'vitest';
import { SKINS } from '@/game/config/skins';
import { WEAPONS } from '@/game/config/weapons';
import { Agent } from '@/game/entities/Agent';

describe('Agent', () => {
  it('starts with full HP and water gun loaded', () => {
    const a = new Agent('p1', false, SKINS.kuma);
    expect(a.loadout.hp).toBe(100);
    expect(a.loadout.weapon).toBe('water-gun');
    expect(a.loadout.ammo['water-gun']).toBe(WEAPONS['water-gun'].ammoMax);
    expect(a.eliminated).toBe(false);
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
