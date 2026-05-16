# Copilot 向けの指示

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

## コーディング規約

- 子供向け UI 文言は **ひらがな中心**。漢字を使う場合はルビ（`<ruby>`）を必ず付ける。
- ファイルパスのエイリアスは `@/...` （`src/` 配下）を使う。
- `strict: true` 前提。`any` を増やさない。
- 暴力表現・流血表現・課金・外部通信・チャットは一切入れない。
- 過剰なコメントを避ける（自明な箇所はコメント不要）。

## ディレクトリ

`src/game/` 配下に `audio / config / effects / entities / input / scenes / storage / systems`。UI は `src/ui/`、型は `src/types/`、テストは `tests/`、外部資料は `docs/skills/`。

## 開発手順

```bash
npm install
npm run dev        # ローカル開発
npm run test       # Vitest
npm run build      # 本番ビルド
npm run preview    # 本番プレビュー
npm run test:e2e   # Playwright E2E
```
