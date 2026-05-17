---
name: splash-kids-systems-architecture
description: Use when changing Splash Kids Battle TypeScript types, configs, systems, entities, weapons, building, CPU AI, safe zones, pickups, storage, or scene architecture.
argument-hint: "[system, entity, or feature]"
---

# Splash Kids systems architecture

Use this skill when the task changes game logic or TypeScript structure.

## TypeScript rules

- The project assumes `strict: true`.
- Do not introduce `any`. Prefer explicit types, discriminated unions, `Record<K, V>`, and type guards.
- Keep casts local and justified; do not cast through `unknown` or `any` to bypass the type system.
- Design public data shapes first for saves, match results, configs, scene targets, and agent state.
- Keep IDs as typed unions when the value set is finite, such as weapons, maps, skins, and build pieces.

## Module responsibilities

- `src/game/config/`: tuneable data such as weapons, maps, skins, pickups, difficulty, and build costs.
- `src/game/entities/`: stateful objects such as agents, projectiles, pickups, and build pieces.
- `src/game/systems/`: behavior and orchestration such as collision, AI, world building, and safe zones.
- `src/game/scenes/`: scene lifecycle and wiring.
- `src/game/input/`: keyboard, mouse, and touch abstraction.
- `src/ui/`: HUD and DOM-facing UI.
- `src/types/`: shared type definitions.

Prefer changing existing modules that already own the behavior. Add a new module only when the responsibility is clearly separate.

## Game systems rules

- Keep player and CPU behavior compatible through shared entities where practical.
- Keep CPU AI understandable and fair: no perfect aim, no unavoidable focus-fire, and clear difficulty differences.
- Building remains child-friendly: wall, floor, and stair pieces with grid snapping.
- Weapon behavior should stay readable: water gun for simple rapid fire, water balloon for splash, bubble shower for short-range spread.
- Safe-zone effects should be framed as sun/drying pressure, not danger or violence.
- Save data should remain local and privacy-preserving through browser storage only.

## Change process

1. Identify the owning config, type, entity, system, and scene.
2. Update types and config before behavior.
3. Keep gameplay constants in config files when designers may tune them later.
4. Add or update unit tests for systems and entities.
5. Avoid broad fallbacks that hide invalid state; surface invalid assumptions through explicit errors or tests.

## Review checklist

- The new behavior has an obvious owning module.
- Types cover the new state without `any`.
- Config and behavior are separated.
- CPU behavior is fair for children.
- Save/local state changes are backward-compatible or intentionally migrated.

## Background references

- Microsoft TypeScript guidance: [`docs/skills/microsoft/README.md`](../../../docs/skills/microsoft/README.md)
- OpenAI structured-output style thinking: [`docs/skills/openai/README.md`](../../../docs/skills/openai/README.md)
- Anthropic Skills responsibility separation: [`docs/skills/anthropic/README.md`](../../../docs/skills/anthropic/README.md)
