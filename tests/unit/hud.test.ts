import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hud, screenBearingRad } from '@/ui/Hud';

let root: HTMLDivElement;
let hud: Hud;

function q(selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
}

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  hud = new Hud(root);
});

afterEach(() => {
  hud.destroy();
  root.remove();
});

describe('Hud wetness gauge', () => {
  it('turns from aqua to amber to coral as the player gets wetter', () => {
    hud.setHp(100, 100);
    expect(q('.skb-meter-fill').style.background).toBe('rgb(56, 152, 138)');
    hud.setHp(40, 100);
    expect(q('.skb-meter-fill').style.background).toBe('rgb(220, 167, 57)');
    hud.setHp(10, 100);
    expect(q('.skb-meter-fill').style.background).toBe('rgb(223, 121, 95)');
    expect(q('[role="meter"]').getAttribute('aria-valuenow')).toBe('10');
  });

  it('shows a screen vignette only when nearly soaked', () => {
    hud.setHp(100, 100);
    expect(q('.skb-low-hp').style.opacity).toBe('0');
    hud.setHp(15, 100);
    expect(Number(q('.skb-low-hp').style.opacity)).toBeGreaterThan(0);
  });

  it('handles a zero max without dividing by zero', () => {
    hud.setHp(0, 0);
    expect(q('.skb-hp div div').style.width).toBe('0%');
  });
});

describe('Hud hit feedback', () => {
  it('flashes the hit marker and shows a damage number when the player lands a shot', () => {
    hud.showHitMarker(12);
    expect(q('.skb-hitmarker').style.opacity).toBe('1');
    const texts = root.querySelectorAll('div');
    const damage = Array.from(texts).find((el) => el.textContent === '+12');
    expect(damage).toBeDefined();
  });

  it('rounds damage up so kids never see +0', () => {
    hud.showHitMarker(0.2);
    const damage = Array.from(root.querySelectorAll('div')).find((el) => el.textContent === '+1');
    expect(damage).toBeDefined();
  });

  it('shows an arrow pointing at whoever splashed the player', () => {
    hud.showDamageDirection(Math.PI / 2);
    const arrow = Array.from(root.querySelectorAll('div')).find((el) => el.style.transform.includes('rotate'));
    expect(arrow).toBeDefined();
    expect(arrow!.style.transform).toContain('1.5707');
  });

  it('removes expired floating text and arrows on update', () => {
    const now = performance.now();
    vi.spyOn(performance, 'now').mockReturnValue(now);
    hud.showHitMarker(10);
    hud.showDamageDirection(0);
    const before = root.querySelectorAll('div').length;
    vi.spyOn(performance, 'now').mockReturnValue(now + 5000);
    hud.update(now + 5000, [], 0);
    expect(root.querySelectorAll('div').length).toBeLessThan(before);
    vi.restoreAllMocks();
  });
});

describe('Hud water recharge state', () => {
  it('tells the player the tank is refilling', () => {
    hud.setWeapon('water-gun', 0, 60, true);
    expect(q('.skb-weapon-name').textContent).toContain('みずをためてるよ');
    expect(q('.skb-ammo').style.color).toBe('rgb(145, 100, 20)');
  });

  it('goes back to the weapon name once water is available', () => {
    hud.setWeapon('water-gun', 0, 60, true);
    hud.setWeapon('water-gun', 30, 60, false);
    expect(q('.skb-weapon-name').textContent).toContain('みずでっぽう');
  });
});

describe('Hud safe zone messaging', () => {
  it('warns when the player is outside', () => {
    hud.setZoneWarning(true);
    expect(q('.skb-zone').style.display).toBe('block');
    expect(q('.skb-zone').textContent).toContain('そとはあついよ');
  });

  it('counts down before the play area shrinks', () => {
    hud.setZoneWarning(false, 6);
    expect(q('.skb-zone').style.display).toBe('block');
    expect(q('.skb-zone').textContent).toContain('6びょう');
  });

  it('stays hidden while there is nothing to warn about', () => {
    hud.setZoneWarning(false, 60);
    expect(q('.skb-zone').style.display).toBe('none');
  });
});

describe('Hud radar', () => {
  it('renders without a 2d context in jsdom', () => {
    expect(() =>
      hud.update(performance.now() + 1000, [{ x: 5, z: -5, color: 0xff0000, kind: 'enemy' }], 0.5),
    ).not.toThrow();
  });
});

describe('Hud pause button', () => {
  it('calls the handler when tapped', () => {
    const spy = vi.fn();
    hud.onPause(spy);
    q('.skb-pause-btn').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

});

describe('Hud build placement', () => {
  it('shows placement text only while building without replacing the selected piece', () => {
    hud.setBuildPlacement(true);
    expect(q('.skb-build-validity').textContent).toBe('');
    hud.setBuildMode(true, 'wall');
    hud.setBuildPlacement(true);
    expect(q('.skb-build-validity').textContent).toBe('ここに おける');
    expect(q('.skb-mode').textContent).toContain('かべ');
    hud.setBuildPlacement(false);
    expect(q('.skb-build-validity').textContent).toBe('ここには おけない');
    expect(q('.skb-mode').textContent).toContain('かべ');
    hud.setBuildMode(false);
    expect(q('.skb-build-validity').style.display).toBe('none');
    hud.setBuildPlacement(false);
    expect(q('.skb-build-validity').style.display).toBe('none');
    expect(q('.skb-build-validity').textContent).toBe('');
    hud.setBuildMode(true, 'stair');
    hud.setBuildPlacement(true);
    expect(q('.skb-build-validity').style.display).toBe('block');
    expect(q('.skb-mode').textContent).toContain('かいだん');
  });
});

describe('screenBearingRad', () => {
  // このプロジェクトの向きの決まり
  const forward = (yaw: number) => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });
  const right = (yaw: number) => ({ x: Math.cos(yaw), z: -Math.sin(yaw) });

  it('returns 0 for a target straight ahead', () => {
    for (const yaw of [0, 0.7, -1.9, Math.PI, 2.6]) {
      const f = forward(yaw);
      expect(screenBearingRad(f.x * 10, f.z * 10, yaw)).toBeCloseTo(0, 6);
    }
  });

  it('returns +90deg for a target on the right', () => {
    for (const yaw of [0, 0.7, -1.9, Math.PI]) {
      const r = right(yaw);
      expect(screenBearingRad(r.x * 10, r.z * 10, yaw)).toBeCloseTo(Math.PI / 2, 6);
    }
  });

  it('returns -90deg for a target on the left', () => {
    for (const yaw of [0, 0.7, -1.9, Math.PI]) {
      const r = right(yaw);
      expect(screenBearingRad(-r.x * 10, -r.z * 10, yaw)).toBeCloseTo(-Math.PI / 2, 6);
    }
  });

  it('matches the true bearing for arbitrary yaw and offsets', () => {
    for (let i = 0; i < 12; i++) {
      const yaw = -Math.PI + (i / 12) * Math.PI * 2;
      for (let j = 0; j < 12; j++) {
        const angle = (j / 12) * Math.PI * 2;
        const dx = Math.cos(angle) * 7;
        const dz = Math.sin(angle) * 7;
        const f = forward(yaw);
        const r = right(yaw);
        const expected = Math.atan2(dx * r.x + dz * r.z, dx * f.x + dz * f.z);
        expect(screenBearingRad(dx, dz, yaw)).toBeCloseTo(expected, 6);
      }
    }
  });

  it('is not mirrored: a target behind-right stays on the right', () => {
    // yaw = PI/2 のとき forward は -X。(0,-10) はプレイヤーの右がわ。
    expect(screenBearingRad(0, -10, Math.PI / 2)).toBeGreaterThan(0);
  });
});
