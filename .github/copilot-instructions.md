# Copilot 向けの短い常時指示

## プロジェクト概要

子供（6〜10歳）向けのブラウザ FPS。フォートナイト風（建設＋射撃）だが、武器は **水鉄砲・水風船**、ダメージは「ぬれ度」表現で流血ゼロ。1人プレイ専用、対戦相手は CPU。

## 技術スタック

- Three.js v0.170（プロシージャル 3D、外部 3D アセット不使用）
- TypeScript 5.7 (strict)
- Vite 6（ビルド）
- Vitest 3 + jsdom（ユニットテスト）
- Playwright（E2E、Chrome / iPad WebKit）
- Web Audio API（プログラマティック合成、外部音源不使用）
- GitHub Pages + Actions でデプロイ

## 常時守る禁止事項

- 暴力表現・流血表現・リアル武器・悲鳴は入れない。
- 課金・広告・外部通信・チャット・ユーザー間交流は入れない。
- UI 文言は **ひらがな中心**。漢字を使う場合は必要に応じて `<ruby>` を使う。
- `strict: true` 前提。`any` を増やさない。

## 詳細ルール

長い実務ルールは常時コンテキストに入れず、用途別 Skill と custom agent に分ける。

- 専用 custom agent: `.github/agents/splash-kids-game.agent.md`
- 子供向け安全性・UX: `.github/skills/splash-kids-design-safety/SKILL.md`
- TypeScript / ゲームシステム設計: `.github/skills/splash-kids-systems-architecture/SKILL.md`
- Three.js / WebGL 性能: `.github/skills/splash-kids-webgl-performance/SKILL.md`
- テスト・レビュー・ライセンス確認: `.github/skills/splash-kids-validation-workflow/SKILL.md`

## 開発手順

```bash
npm install
npm run dev        # ローカル開発
npm run test       # Vitest
npm run build      # 本番ビルド
npm run preview    # 本番プレビュー
npm run test:e2e   # Playwright E2E
```
