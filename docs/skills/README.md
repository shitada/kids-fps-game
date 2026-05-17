# 🧠 公式ベストプラクティス資料 — INDEX

このディレクトリには、本プロジェクト（**スプラッシュキッズバトル** — TypeScript + Three.js + Vite ブラウザ FPS）の設計・開発で役立つ、Microsoft / Google / OpenAI / Anthropic 各社の **公式資料** を整理して収録しています。

## 取扱方針（重要）

各社の公式ドキュメントは多くがコピー再配布不可です。本ディレクトリでは以下の方針を取ります：

1. **本文の全文コピーは行わない**。代わりに「要約 + 公式リンク + ライセンス情報」を整理して掲載します。
2. すべての引用には必ず **出典 URL** を明示します。
3. **公開された API / フォーマット仕様** （例：AGENTS.md コミュニティ仕様、TypeScript Handbook のサンプルコード、web.dev のオープンソースサンプル）は、各社が公開しているライセンス（多くは CC-BY 4.0 / Apache-2.0 / MIT）に従って引用します。

## 構成

```
docs/skills/
├── README.md                     # このファイル
├── anthropic/                    # Claude Code / Skills / Prompt Engineering
│   └── README.md
├── openai/                       # GPT-5 / Codex / Cookbook
│   └── README.md
├── microsoft/                    # Copilot / AGENTS.md / TypeScript / MakeCode Arcade
│   └── README.md
└── google/                       # web.dev / WebGL / Gemini Code Assist / Material for Kids
    └── README.md
```

## このプロジェクトでどう使うか

実装時に Copilot が直接参照する実務ルールは、長い常時インストラクションではなく `.github/skills/` に用途別 Skill として整理しています。

| Copilot カスタマイズ | 役割 |
| --- | --- |
| `.github/agents/splash-kids-game.agent.md` | スプラッシュキッズバトル専用の custom agent |
| `.github/skills/splash-kids-design-safety/SKILL.md` | 子供向け安全性・UX・ゲーム表現 |
| `.github/skills/splash-kids-systems-architecture/SKILL.md` | TypeScript strict・ゲームシステム設計 |
| `.github/skills/splash-kids-webgl-performance/SKILL.md` | Three.js / WebGL / モバイル性能 |
| `.github/skills/splash-kids-validation-workflow/SKILL.md` | テスト・レビュー・ライセンス・コミット前確認 |

下記の企業別資料は、それら Skill の背景資料・出典集です。

| シーン | 参考にしたガイド |
| --- | --- |
| ゲームの仕様作成 / 機能分割 | Anthropic「Skills」設計指針、Microsoft「Spec-driven development」 |
| TypeScript 設計（strict mode・型ガード） | Microsoft「TypeScript Handbook」 |
| Three.js / WebGL の描画パフォーマンス | Google「web.dev WebGL Best Practices」 |
| Web 全般のレンダリング・メモリ最適化 | Google「web.dev Performance」 |
| 子供向け UI（ひらがな・カラフル・大きなタップ領域） | Google「Material for Kids」「Designing for Kids」 |
| AI コーディング補助のプロンプト | Anthropic「Claude Code Best Practices」、OpenAI Cookbook、Microsoft Copilot 公式ガイド |
| CPU AI ボットのふるまい設計 | Microsoft MakeCode Arcade ゲーム設計ガイド |

## 著作権について

- 各リンク先のドキュメントは各社の著作物です。本プロジェクトはこれらを **引用** の範囲で要約・参照しています。
- 再配布が必要になった場合は、各社のライセンス・利用規約を確認してください。
