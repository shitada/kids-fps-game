import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { SKINS, SKIN_ORDER } from '@/game/config/skins';
import { WEAPON_ORDER } from '@/game/config/weapons';
import { Agent } from '@/game/entities/Agent';
import { AgentVisual, buildAgentMesh, createFirstPersonWaterGun } from '@/game/entities/AgentVisual';
import { createToolVisual, setToolFiring } from '@/game/entities/ToolVisual';
import { disposeObject3D } from '@/game/systems/disposeObject';
import type { SkinId } from '@/types';

const idle = {
  elapsedSec: 1,
  moveSpeed: 0,
  onGround: true,
  aimPitch: 0,
  hpRatio: 1,
};

function part(root: THREE.Object3D, name: string): THREE.Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`Missing visual part: ${name}`);
  return found;
}

function mesh(root: THREE.Object3D, name: string): THREE.Mesh {
  const found = part(root, name);
  if (!(found instanceof THREE.Mesh)) throw new Error(`Not a mesh: ${name}`);
  return found;
}

describe('rounded mascot geometry', () => {
  it.each(SKIN_ORDER)('%s keeps its core silhouette in the 1.7-high gameplay body', (id) => {
    const agent = new Agent('mascot', true, SKINS[id]);
    agent.mesh.updateMatrixWorld(true);
    const head = part(agent.mesh, `${id}-head-shell`);
    const headBounds = new THREE.Box3().setFromObject(head);
    expect(headBounds.max.y).toBeGreaterThanOrEqual(1.65);
    expect(headBounds.max.y).toBeLessThanOrEqual(1.701);
    expect(headBounds.max.y - headBounds.min.y).toBeGreaterThanOrEqual(0.65);

    const feet: THREE.Object3D[] = [];
    agent.mesh.traverse((object) => {
      if (object.name === 'mascot-foot') feet.push(object);
    });
    expect(feet).toHaveLength(2);
    for (const foot of feet) {
      expect(new THREE.Box3().setFromObject(foot).min.y).toBeCloseTo(0, 5);
    }
    const torso = new THREE.Box3().setFromObject(part(agent.mesh, 'mascot-torso'));
    expect(torso.min.y).toBeLessThan(0.4);
    expect(torso.max.y).toBeGreaterThan(1.1);
    expect(headBounds.min.y).toBeLessThan(torso.max.y);
    expect(agent.height).toBe(1.7);
    expect(agent.radius).toBe(0.5);
    expect(agent.eyePosition.y).toBeCloseTo(0.68);
  });

  const signature: Record<SkinId, string[]> = {
    kuma: ['bear-ear-left', 'bear-ear-right', 'bear-button-tail', 'mascot-muzzle'],
    usagi: ['rabbit-ear-left', 'rabbit-ear-right', 'rabbit-pom-tail', 'mascot-muzzle'],
    neko: ['cat-ear-left', 'cat-ear-right', 'cat-curled-tail', 'mascot-muzzle'],
    robo: ['robot-face-panel', 'robot-spring-antenna', 'robot-belly-panel'],
    sakana: ['fish-dorsal-fin', 'fish-side-fin-left', 'fish-side-fin-right', 'fish-fan-tail'],
  };

  it.each(SKIN_ORDER)('%s has an animal/robot silhouette, a friendly face and a strapped tank', (id) => {
    const root = buildAgentMesh(SKINS[id]);
    for (const name of signature[id]) expect(part(root, name)).toBeDefined();
    for (const name of ['mascot-eye-left', 'mascot-eye-right']) {
      const eye = part(root, name);
      expect(eye.position.z).toBeLessThan(0);
      expect(part(eye, 'eye-catchlight')).toBeDefined();
    }
    expect(part(root, 'mascot-smile').position.z).toBeLessThan(-0.35);
    expect(part(root, 'mascot-water-pack').position.z).toBeGreaterThan(0);
    expect(part(root, 'tank-strap-left')).toBeDefined();
    expect(part(root, 'tank-strap-right')).toBeDefined();
    expect(root.getObjectByName('hair')).toBeUndefined();
    expect(root.getObjectByName('neck')).toBeUndefined();
  });

  it('keeps decorative rabbit ears outside the unchanged core body height', () => {
    const root = buildAgentMesh(SKINS.usagi);
    root.updateMatrixWorld(true);
    const ear = new THREE.Box3().setFromObject(part(root, 'rabbit-ear-left'));
    expect(ear.max.y).toBeGreaterThan(2.1);
    expect(ear.max.y).toBeLessThan(2.3);
  });

  it('places the fish fan tail behind the body rather than inside it', () => {
    const root = buildAgentMesh(SKINS.sakana);
    root.updateMatrixWorld(true);
    const tail = new THREE.Box3().setFromObject(part(root, 'fish-fan-tail'));
    expect(tail.max.z).toBeGreaterThan(0.6);
  });

  it('moves named limb and ear pivots without changing the root or growing the scene', () => {
    const visual = new AgentVisual(SKINS.usagi);
    const leg = part(visual.root, 'mascot-leg-left');
    const ear = part(visual.root, 'rabbit-ear-left');
    let before = 0;
    visual.root.traverse(() => before++);
    visual.update({ ...idle, moveSpeed: 5 });
    const legX = leg.rotation.x;
    const earZ = ear.rotation.z;
    visual.update({ ...idle, elapsedSec: 1.15, moveSpeed: 5 });
    expect(leg.rotation.x).not.toBe(legX);
    expect(ear.rotation.z).not.toBe(earZ);
    expect(visual.root.position.lengthSq()).toBe(0);
    let after = 0;
    visual.root.traverse(() => after++);
    expect(after).toBe(before);
    visual.update({ ...idle, onGround: false });
    // BattleScene owns support-projected shadows, not the jumping visual rig.
    expect(visual.root.getObjectByName('contact-shadow')).toBeUndefined();
  });
});

describe('shared water-play tools', () => {
  it.each(WEAPON_ORDER)('%s points its named flash forward and never changes shared opacity', (weapon) => {
    const tool = createToolVisual(weapon, SKINS.kuma);
    const nozzle = part(tool, 'tool-nozzle');
    expect(tool.userData.weapon).toBe(weapon);
    expect(nozzle.position.z).toBeLessThan(-0.4);
    expect(nozzle.visible).toBe(false);
    setToolFiring(tool, 1);
    expect(nozzle.visible).toBe(true);
    expect(nozzle.scale.x).toBeGreaterThan(1);
    setToolFiring(tool, 0);
    expect(nozzle.visible).toBe(false);
    tool.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        expect(object.geometry.userData.sharedVisualResource).toBe(true);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) expect(material.opacity).toBe(1);
      }
    });
  });

  it('uses a bulb tank, a real open balloon cup and a seven-hole shower instead of one recolored model', () => {
    const pistol = createToolVisual('water-gun', SKINS.kuma);
    const balloon = createToolVisual('balloon-launcher', SKINS.kuma);
    const shower = createToolVisual('bubble-shower', SKINS.kuma);
    expect(part(pistol, 'pistol-bulb-tank')).toBeDefined();
    expect(mesh(balloon, 'balloon-open-cup').geometry.type).toBe('LatheGeometry');
    expect(part(balloon, 'loaded-water-balloon')).toBeDefined();
    for (let i = 0; i < 7; i++) expect(part(shower, `shower-hole-${i}`)).toBeDefined();
    expect(shower.getObjectByName('pistol-bulb-tank')).toBeUndefined();
  });

  it('syncs the gameplay weapon before updating its fire flash and reuses cached toys', () => {
    const agent = new Agent('cpu', true, SKINS.robo);
    agent.syncMesh(1);
    const pistol = part(agent.mesh, 'tool-water-gun');
    agent.giveWeapon('balloon-launcher');
    agent.playFireVisual(2);
    agent.syncMesh(2);
    expect(agent.mesh.getObjectByName('tool-water-gun')).toBeUndefined();
    expect(part(agent.mesh, 'tool-balloon-launcher')).toBeDefined();
    expect(part(agent.mesh, 'tool-nozzle').visible).toBe(true);
    agent.giveWeapon('bubble-shower');
    agent.syncMesh(3);
    expect(part(agent.mesh, 'tool-bubble-shower')).toBeDefined();
    expect(agent.mesh.getObjectByName('tool-balloon-launcher')).toBeUndefined();
    agent.switchWeapon('water-gun');
    agent.syncMesh(4);
    expect(part(agent.mesh, 'tool-water-gun')).toBe(pistol);
    expect(part(agent.mesh, 'tool-nozzle').visible).toBe(false);
    agent.syncMesh(5);
    expect(part(agent.mesh, 'tool-water-gun')).toBe(pistol);
  });

  it('retains the old first-person factory and flash alias', () => {
    const gun = createFirstPersonWaterGun(SKINS.kuma);
    expect(gun.name).toBe('first-person-water-gun');
    expect(gun.visible).toBe(false);
    const alias = part(gun, 'first-person-water-gun-nozzle');
    expect(alias.visible).toBe(false);
    expect(part(alias, 'tool-nozzle')).toBeDefined();
  });
});

describe('mascot resource ownership', () => {
  it('shares the toy shells but isolates wet opacity per mascot', () => {
    const wet = new AgentVisual(SKINS.kuma);
    const dry = new AgentVisual(SKINS.kuma);
    const wetShell = mesh(wet.root, 'kuma-head-shell');
    const dryShell = mesh(dry.root, 'kuma-head-shell');
    expect(wetShell.geometry).toBe(dryShell.geometry);
    expect(wetShell.material).toBe(dryShell.material);
    const wetDrop = mesh(wet.root, 'mascot-wet-drop-0');
    const dryDrop = mesh(dry.root, 'mascot-wet-drop-0');
    expect(wetDrop.geometry).toBe(dryDrop.geometry);
    expect(wetDrop.material).not.toBe(dryDrop.material);
    wet.update({ ...idle, hpRatio: 0.5 });
    dry.update(idle);
    expect(wetDrop.visible).toBe(true);
    expect(dryDrop.visible).toBe(false);
    if (!(wetDrop.material instanceof THREE.MeshBasicMaterial)) throw new Error('Expected wet material');
    if (!(dryDrop.material instanceof THREE.MeshBasicMaterial)) throw new Error('Expected wet material');
    expect(wetDrop.material.opacity).toBeCloseTo(0.7);
    expect(dryDrop.material.opacity).toBe(0);
    expect(wetDrop.material.userData.sharedVisualResource).not.toBe(true);
  });

  it('disposes the unique wet material once without disposing another mascot’s shared assets', () => {
    const visual = new AgentVisual(SKINS.neko);
    const shell = mesh(visual.root, 'neko-head-shell');
    const drop = mesh(visual.root, 'mascot-wet-drop-0');
    if (!(shell.material instanceof THREE.Material)) throw new Error('Expected one shell material');
    if (!(drop.material instanceof THREE.Material)) throw new Error('Expected one wet material');
    const geometryDispose = vi.spyOn(shell.geometry, 'dispose');
    const shellDispose = vi.spyOn(shell.material, 'dispose');
    const wetDispose = vi.spyOn(drop.material, 'dispose');
    disposeObject3D(visual.root);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(shellDispose).not.toHaveBeenCalled();
    expect(wetDispose).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
