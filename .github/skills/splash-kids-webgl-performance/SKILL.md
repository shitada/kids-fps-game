---
name: splash-kids-webgl-performance
description: Use when changing Splash Kids Battle Three.js scenes, rendering, world geometry, particles, materials, camera behavior, effects, or mobile/iPad performance-sensitive code.
argument-hint: "[rendering or effect area]"
---

# Splash Kids WebGL performance

Use this skill when the task touches Three.js, WebGL, effects, world generation, or frame-time sensitive code.

## Performance targets

- Optimize for browser play on desktop and iPad Safari.
- Aim for smooth 60fps in normal gameplay.
- Keep startup lightweight and compatible with Vite chunking.
- Avoid visual features that are impressive but expensive for children on tablets.

## Three.js rules

- Reuse geometries and materials when possible.
- Avoid allocating many `THREE.Vector3`, `Color`, geometry, or material objects inside hot per-frame paths.
- Use object pools for repeatable effects such as water splashes, bubbles, and temporary markers.
- Consider `InstancedMesh` for many repeated objects of the same shape.
- Prefer simple lights, fog, color, scale, and motion over heavy post-processing.
- Avoid real-time shadows unless a task explicitly requires them and performance is verified.
- Keep `devicePixelRatio` capped, normally at `Math.min(window.devicePixelRatio, 2)`.

## Visual style rules

- Keep the look bright, low-poly, and readable.
- Favor clear silhouettes and pastel colors over detailed textures.
- Do not add scary, realistic, or weapon-like visuals.
- Effects should communicate water, bubbles, sun, clouds, and playground energy.

## Hot path checklist

Before finishing rendering work, check:

- Does this allocate objects every frame?
- Can geometry or material be shared?
- Can repeated meshes be instanced or pooled?
- Is the effect readable without shadows or post-processing?
- Does the change work with both desktop and touch layouts?

## Validation

- Run `npm run build` after rendering or Three.js type changes.
- If the change affects gameplay visibility or UI layout, manually check the local dev server.
- Use unit tests for pure math or system logic rather than visual-only behavior.

## Background references

- Google web.dev performance and rendering guidance: [`docs/skills/google/README.md`](../../../docs/skills/google/README.md)
- WebGL Fundamentals notes summarized in the same file: [`docs/skills/google/README.md`](../../../docs/skills/google/README.md)
