---
name: splash-kids-validation-workflow
description: Use before finishing Splash Kids Battle changes, preparing commits, updating docs, reviewing generated code, running tests/builds, or checking official-source/license handling.
argument-hint: "[change summary]"
---

# Splash Kids validation workflow

Use this skill near the end of a change, during review, or whenever docs and official sources are updated.

## Work style

- Keep changes small and focused on one feature or fix.
- Prefer editing existing files over adding new files unless a new responsibility is clear.
- Do not mix unrelated refactors with gameplay or documentation changes.
- Preserve child-safety, privacy, and no-online assumptions unless the user explicitly changes scope.

## Validation commands

Use existing scripts only:

```bash
npm test
npm run build
npm run test:e2e
```

- Run `npm test` after logic, system, entity, config, or storage changes.
- Run `npm run build` after TypeScript, Three.js, scene, or config changes.
- Run `npm run test:e2e` for scene-flow, startup, routing, or interaction changes.
- Documentation-only changes do not require tests unless links or generated docs affect the app.

## Documentation and source handling

- Do not copy full official documentation text into this repository.
- Summarize in original wording and link to official sources.
- Keep license notes near external-source summaries.
- `docs/skills/` is a background source index.
- `.github/skills/` contains practical project workflows for Copilot.

## Commit and push rules

- Check `git status --short` before committing.
- Do not revert user changes.
- Use concise commit messages.
- When creating commits, include:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Final review checklist

- Safety: no blood, realistic weapons, chat, purchases, ads, or external communication.
- UX: child-facing text is simple and kind.
- TypeScript: no new `any`, no unnecessary casts.
- Performance: no obvious per-frame allocation or heavy rendering feature.
- Tests/build: the appropriate existing command was run.
- Docs: README and skills links remain accurate.

## Background references

- Anthropic Claude Code best practices: [`docs/skills/anthropic/README.md`](../../../docs/skills/anthropic/README.md)
- OpenAI prompt/checklist guidance: [`docs/skills/openai/README.md`](../../../docs/skills/openai/README.md)
- Microsoft/GitHub Copilot instructions guidance: [`docs/skills/microsoft/README.md`](../../../docs/skills/microsoft/README.md)
