# 💦 スプラッシュキッズバトル / Splash Kids Battle

> こどもむけの ブラウザ FPS（フォートナイトふう・けんちくあり・CPUたいせん）

カラフルな「みずあそびランド」で、**みずでっぽうと みずふうせん** を つかって、CPU プレイヤーたちと たたかうゲームです。けんちくモードで かべや ゆかを つくって みをまもることも できます。**1人プレイ専用** で、**りゅうけつ表現はゼロ**。びしょぬれになって 雲になったら脱落、というソフトな演出です。

あそべるページ: https://shitada.github.io/kids-fps-game/

- 対象：6〜10 歳
- デバイス：PC（キーボード+マウス）、iPad / スマホ（タッチ）
- 言語：UI はすべて **ひらがな中心**

---

## 🎮 あそびかた

### PC（キーボード ＋ マウス）

| そうさ | キー |
| --- | --- |
| まえ・うしろ・ひだり・みぎ | `W` `A` `S` `D` |
| ジャンプ | `Space` |
| みまわす | マウス |
| みずをうつ | クリック（左ボタン） |
| ぶきをかえる | `1` `2` `3` |
| けんちくモード | `Q` |
| けんちく：かべ／ゆか／かいだん | `1` `2` `3` |
| ピース回転 | `R` |
| ポインタロック解除 | `Esc` |

### タッチ（iPad / スマホ）

- ひだり半分：移動スティック
- みぎ半分：視点ドラッグ
- ボタン：ジャンプ、うつ、けんちく、ぶきえらび

---

## ✨ 主な機能

- 3 つのマップ：プールパーク / おしろのおにわ / くものうえひろば
- 3 つのぶき：みずでっぽう / みずふうせんランチャー / バブルシャワー
- 5 つのスキン：くま / うさぎ / ねこ / ロボ / おさかな（しょうりかずで かいきん）
- フォートナイトふうの **けんちくシステム**（かべ・ゆか・かいだん）
- 「**たいよう**」エフェクトで セーフゾーンが だんだん せまくなる
- 3 段階の むずかしさ：かんたん / ふつう / むずかしい
- セーブはローカル（ブラウザ内、`localStorage`）

---

## 🛠 技術スタック

| カテゴリ | 採用技術 |
| --- | --- |
| 3D 描画 | [Three.js](https://threejs.org/) v0.170 |
| 言語 | TypeScript 5.7（`strict: true`） |
| ビルドツール | [Vite](https://vite.dev/) 6 |
| ユニットテスト | [Vitest](https://vitest.dev/) 3 + jsdom |
| E2E テスト | [Playwright](https://playwright.dev/) |
| サウンド | Web Audio API（プログラマティック生成） |
| デプロイ | GitHub Pages + GitHub Actions |
| フォント | [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic) (OFL-1.1) |

参考にしたゲーム：[shitada/universe-kids-race](https://github.com/shitada/universe-kids-race)（同じ技術スタック・同じデザイン思想）

---

## 🚀 セットアップ

```bash
# 依存パッケージインストール
npm install

# 開発サーバー起動（http://localhost:5173/kids-fps-game/）
npm run dev

# ユニットテスト
npm test

# E2E テスト
npm run test:e2e

# プロダクションビルド
npm run build

# ビルド成果物のローカル確認
npm run preview
```

---

## 🗂 ディレクトリ構成

```
src/
├── game/
│   ├── audio/          # BGM・効果音 (Web Audio API)
│   ├── config/         # マップ・武器・難易度などの設定
│   ├── effects/        # 水しぶきなどのパーティクル
│   ├── entities/       # Agent (プレイヤー/CPU), Projectile, BuildPiece, Pickup
│   ├── input/          # KB+Mouse, タッチ仮想スティック
│   ├── scenes/         # Title, SkinSelect, MapSelect, Battle, Result
│   ├── storage/        # SaveStorage (localStorage)
│   └── systems/        # Collision, AI, SafeZone, WorldBuilder
├── ui/                 # HUD
├── types/              # 型定義
└── main.ts             # エントリポイント
tests/
├── unit/               # Vitest
└── e2e/                # Playwright
docs/
└── skills/             # Microsoft / Google / OpenAI / Anthropic の公式ベストプラクティス
.github/
├── workflows/          # CI と GitHub Pages デプロイ
└── copilot-instructions.md
```

---

## 📚 公式ベストプラクティス資料

`docs/skills/` 配下に、本プロジェクトで参考にしている各社の公式ガイドの要約・出典 URL・ライセンスを整理しています。

- [📘 INDEX](./docs/skills/README.md)
- [🟧 Anthropic — Claude Code / Skills / Prompt Engineering](./docs/skills/anthropic/README.md)
- [🟩 OpenAI — GPT-5 / Codex / Cookbook](./docs/skills/openai/README.md)
- [🟦 Microsoft — Copilot / AGENTS.md / TypeScript / MakeCode Arcade](./docs/skills/microsoft/README.md)
- [🟥 Google — web.dev / WebGL / Material for Kids / Gemini Code Assist](./docs/skills/google/README.md)

各社のドキュメント本文は著作権の関係でコピーせず、要約と公式 URL のみを掲載しています。

### Copilot 用 Skill / Custom Agent

重複する公式ガイドの要点は、Copilot が必要なときだけ参照できるように `.github/skills/` に用途別 Skill として整理しています。

| ファイル | 目的 |
| --- | --- |
| `.github/agents/splash-kids-game.agent.md` | このゲーム専用の custom agent |
| `.github/skills/splash-kids-design-safety/SKILL.md` | 子供向け安全性・UX・表現ルール |
| `.github/skills/splash-kids-systems-architecture/SKILL.md` | TypeScript / ゲームシステム設計 |
| `.github/skills/splash-kids-webgl-performance/SKILL.md` | Three.js / WebGL 性能 |
| `.github/skills/splash-kids-validation-workflow/SKILL.md` | テスト・レビュー・ライセンス確認 |

---

## 🛡 安全とアクセシビリティ

- 流血・暴力表現ゼロ（水しぶきと「ぽよん」だけ）
- 全 UI ひらがな中心
- 課金要素・外部リンクなし
- ボイス／テキストチャットなし（オンライン交流ゼロ）
- 連続プレイ警告（v2 で実装予定）
- 色覚に配慮したカラーパレット

---

## 🧩 今後の拡張（v2 以降）

- ローカル分割画面 2 人プレイ
- マップエディタ（こどもがブロックを置いて遊ぶ）
- スキンの色塗りカスタマイズ
- きせつイベントスキン
- ペアレンタル設定（おうちのひとモード）

---

## 📝 ライセンス

- ソースコード：MIT License
- フォント（Zen Maru Gothic）：SIL Open Font License 1.1
- `docs/skills/` 配下の参照資料：各社の著作物（要約と公式 URL のみ掲載）

---

## 🙏 クレジット

- ゲームデザイン参考：[shitada/universe-kids-race](https://github.com/shitada/universe-kids-race)
- 描画エンジン：[Three.js](https://threejs.org/)（MIT License）
- フォント：[Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic)（OFL-1.1）
- AI 補助：GitHub Copilot CLI（GPT-5.4）
