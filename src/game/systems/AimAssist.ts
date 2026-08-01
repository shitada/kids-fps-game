import * as THREE from 'three';

export interface AimAssistTarget {
  id: string;
  /** ねらう点（相手の目の高さあたり） */
  point: THREE.Vector3;
}

export interface AimAssistParams {
  /** この角度いない（ラジアン）の相手だけ補正の対象にする */
  maxAngleRad: number;
  /** この距離いないの相手だけ対象にする（メートル） */
  maxDistance: number;
  /** 0 = 補正なし、1 = 完全に相手へ向く */
  strength: number;
}

export interface AimAssistResult {
  direction: THREE.Vector3;
  targetId: string | null;
}

/**
 * 子供が指で狙うのは難しいので、近くて画面中央に近い相手へ少しだけ狙いを寄せる。
 * ねらいを「奪う」のではなく、角度差に応じて弱く寄せるだけにしている。
 */
export function applyAimAssist(
  origin: THREE.Vector3,
  lookDirection: THREE.Vector3,
  targets: readonly AimAssistTarget[],
  params: AimAssistParams,
  hasLineOfSight?: (target: AimAssistTarget) => boolean,
): AimAssistResult {
  const dir = lookDirection.clone().normalize();
  if (params.strength <= 0 || targets.length === 0) return { direction: dir, targetId: null };

  const toTarget = new THREE.Vector3();
  let best: { id: string; dir: THREE.Vector3; angle: number } | null = null;

  for (const t of targets) {
    toTarget.copy(t.point).sub(origin);
    const distance = toTarget.length();
    if (distance < 0.5 || distance > params.maxDistance) continue;
    toTarget.divideScalar(distance);
    const dot = THREE.MathUtils.clamp(toTarget.dot(dir), -1, 1);
    const angle = Math.acos(dot);
    if (angle > params.maxAngleRad) continue;
    if (hasLineOfSight && !hasLineOfSight(t)) continue;
    if (!best || angle < best.angle) best = { id: t.id, dir: toTarget.clone(), angle };
  }

  if (!best) return { direction: dir, targetId: null };

  // 画面中央に近いほど強く、はしっこの相手には弱くかかる
  const closeness = 1 - best.angle / params.maxAngleRad;
  const t = THREE.MathUtils.clamp(params.strength * closeness, 0, 1);
  return { direction: dir.lerp(best.dir, t).normalize(), targetId: best.id };
}

export function aimAssistParamsFor(touch: boolean, difficulty: 'easy' | 'normal' | 'hard'): AimAssistParams {
  const strengthByDifficulty: Record<'easy' | 'normal' | 'hard', number> = {
    easy: 0.55,
    normal: 0.35,
    hard: 0.18,
  };
  const base = strengthByDifficulty[difficulty];
  return {
    maxAngleRad: touch ? 0.17 : 0.1,
    maxDistance: 42,
    strength: touch ? Math.min(1, base + 0.2) : base * 0.55,
  };
}
