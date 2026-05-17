---
name: splash-kids-design-safety
description: Use when designing or changing Splash Kids Battle UI, tutorials, rewards, combat expression, skins, CPU difficulty, accessibility, or any child-safety behavior.
argument-hint: "[feature or UX area]"
---

# Splash Kids design and safety

Use this skill when the task touches what children see, read, hear, or experience in the game.

## Non-negotiable safety rules

- Target players are children ages 6-10.
- Keep the game single-player. Opponents are CPU bots only.
- Do not add online chat, player-to-player communication, user-generated text, accounts, ads, purchases, or external network features.
- Do not add blood, realistic weapons, death screams, gore, fear-based horror, or punishment-heavy language.
- Replace combat language with water-play language: `みずでっぽう`, `みずふうせん`, `ぬれ度`, `びしょぬれ`, `ぽよん`, and cloud-like exit effects.

## Kid-friendly UX rules

- Prefer hiragana-first Japanese for player-facing UI.
- Use kanji only when it clearly improves readability; add `<ruby>` when children may not know the reading.
- Use one main message per screen. Keep tutorials short and concrete.
- Initial tutorials should fit within three simple steps.
- Touch targets should be large enough for children on tablets.
- Failure states should be encouraging: use phrases like `もういっかい` instead of blame.
- Victory and unlocks should give clear positive feedback through color, animation, and sound.

## Gameplay boundaries

- Keep building simple: walls, floors, and stairs only.
- Do not add Fortnite-like editing complexity unless explicitly requested.
- CPU bots should not focus-fire the child player unfairly.
- Easy difficulty should allow frequent wins.
- Rewards should unlock skins or badges only; avoid gambling, loot boxes, purchases, or scarcity pressure.

## Review checklist

Before finishing a UI or gameplay change, verify:

- The child-facing text is easy to understand.
- The feature remains non-violent and water-play themed.
- There is no external communication, purchase, ad, or account flow.
- The failure path is kind and restartable.
- Touch and keyboard users both have a clear path.

## Background references

- Google child-friendly UI and Material guidance: [`docs/skills/google/README.md`](../../../docs/skills/google/README.md)
- Microsoft MakeCode Arcade game design notes: [`docs/skills/microsoft/README.md`](../../../docs/skills/microsoft/README.md)
- Prompt clarity and constraints from Anthropic/OpenAI summaries: [`docs/skills/anthropic/README.md`](../../../docs/skills/anthropic/README.md), [`docs/skills/openai/README.md`](../../../docs/skills/openai/README.md)
