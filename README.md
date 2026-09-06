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
| ぶきをかえる（けんちく中はピースをかえる） | `R` |
| けんちくモード | `Q` |
| けんちく：かべ／ゆか／かいだん | `1` `2` `3` |
| ピース回転 | `E` |
| おやすみ（ポーズ） | `Esc` |

### タッチ（iPad / スマホ）

- ひだり下：移動スティック
- みぎがわ：視点ドラッグ（下のボタン帯と右上のポーズボタンは除く）
- みぎ下のボタン列：💦うつ ／ ⬆️とぶ ／ 🔨つくる ／ 🔄きりかえ ／ ↩️むきをかえる
- 💦ボタンは おしっぱなしで れんしゃ。そのまま指を動かすと 視点も うごく
- けんちく中の「きりかえ」は、かべ → ゆか → かいだんの順にピースをかえる
- ボタンと HUD（ぬれ度ゲージ・のこりみず）は かさならない配置（E2E テストで検証）
- 指でねらうのは むずかしいので、**よわいエイムアシスト**が はたらく（かんたんほど つよい）

---

## ✨ 主な機能

- 3 つのマップ：プールパーク / おしろのおにわ / くものうえひろば
- 3 つのぶき：みずでっぽう / みずふうせんランチャー / バブルシャワー
- 5 つのスキン：くま / うさぎ / ねこ / ロボ / おさかな（しょうりかずで かいきん）
- フォートナイトふうの **けんちくシステム**（かべ・ゆか・かいだん、おける／おけないを色で表示）
- 「**たいよう**」エフェクトで セーフゾーンが だんだん せまくなる（さいしょの 25 びょうは ゆうよあり）
- 3 段階の むずかしさ：かんたん / ふつう / むずかしい
- セーブはローカル（ブラウザ内、`localStorage`）

### おもちゃの水あそびパーク

キャラ・3つのフィールド・道具・建設・メニューを、丸みのあるオリジナルのトイ風3Dで作り直しています。くま・うさぎ・ねこ・ロボ・さかなは、それぞれ異なる形のマスコット。スキンの能力と解放条件、CPU、武器性能、操作、ブラウザ内の保存データは引き継ぎます。

| マップ | 新しい景観 |
| --- | --- |
| プールパーク | 水盤、浮き輪、日よけ、水道パイプのある水あそびパーク |
| おしろのおにわ | 丸い積み木のお城、旗、噴水、生け垣のある庭 |
| くものうえひろば | 連続した足場を雲が包み、虹や気球が見える広場 |

プールの水面や背景の遊具は景観用です。泳ぐ・滑り台を滑るなどの新しい操作は追加していません。

### 見やすさ・わかりやすさのくふう

| くふう | ないよう |
| --- | --- |
| 素材と立体感 | 主役は適度な光沢のある樹脂風のPBR素材。生成した環境マップと軽量な接地影で丸みを表現 |
| 水の動き | 水盤の波紋と水しぶき。端末の「視差効果を減らす」設定では装飾的な動きを抑える |
| 世界のにぎやかさ | 見通しのよい道と目印を設計。繰り返す植栽や柵は共有・インスタンス化 |
| メニュー | ゲーム内と同じモデルを使うキャラプレビューとマップのジオラマ |
| 手元の道具 | 水鉄砲・風船・シャワーの切り替えに合わせて、一人称とCPUの道具の形も切り替わる |
| だれがどこに？ | 敵の頭の上に **なまえ＋ぬれ度バー**、左上に **レーダー**（じぶんの向きが つねに上） |
| あてた！ | **ヒットマーカー**＋ダメージすうじ＋みずしぶきリング＋こうかおん |
| あたった！ | 画面フラッシュ＋**どっちから来たかの矢印**＋カメラのゆれ |
| もうすぐびしょぬれ | ぬれ度バーが みどり→きいろ→あか、画面ふちが みずいろに光る |
| たまの見やすさ | 弾を大きく・すこし遅く・しっぽつき。敵の弾はオレンジのふちどり |
| みずぎれ対策 | せなかのタンクから **じどうで回復**（1.1 びょう待つと 6/びょう）。からのときは「みずを ためてるよ」と表示 |
| いつでも休める | 右上の ⏸ ボタン（または `Esc`）で つづける／もういっかい／タイトルへ |

---

## 🛠 技術スタック

| カテゴリ | 採用技術 |
| --- | --- |
| 3D 描画 | [Three.js](https://threejs.org/) v0.170 / WebGL2、PBR素材、プロシージャル造形 |
| 言語 | TypeScript 5.7（`strict: true`） |
| ビルドツール | [Vite](https://vite.dev/) 6 |
| ユニットテスト | [Vitest](https://vitest.dev/) 3 + jsdom |
| E2E テスト | [Playwright](https://playwright.dev/) |
| サウンド | Web Audio API（プログラマティック生成） |
| デプロイ | GitHub Pages + GitHub Actions |
| フォント | 端末にある日本語フォント（実行時の外部フォント取得なし） |

Three.jsは継続し、WebGPUを必須にはしていません。Babylon.js・PlayCanvas・Unityへの移行よりも、既存の遊びを守りながら造形・素材・光・動きを一新する方針です。[Three.js公式のrenderer比較](https://threejs.org/manual/en/webgpurenderer.html)では、WebGPUのWebGL2フォールバックと移行時の注意点も説明されています。

アプリ全体でrendererと生成素材を共有し、場面ごとに3Dオブジェクトを解放します。タッチ端末のDPR上限は1.5、PCは2を初期値とし、継続的な描画負荷に応じて解像度を調整します。画質によってCPU・弾・当たり判定は変わりません。60fpsを目標にしていますが、実機の世代によって性能は異なり、PlaywrightのiPad設定だけでは実iPadのGPU性能を保証できません。

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

開発サーバーでは、同じモデルを固定した構図で見るための確認用URLも使えます。通常のプレイや本番ビルドには影響しません。

```text
/kids-fps-game/?review=mascots
/kids-fps-game/?review=pool-park
/kids-fps-game/?review=castle-garden
/kids-fps-game/?review=cloud-plaza
/kids-fps-game/?review=pool-park&view=eye
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
│   └── systems/        # Collision, AI, SafeZone, WorldBuilder, AimAssist
├── ui/                 # HUD, ネームプレート, ポーズ画面
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
- まけたときは「もういっかい」など やさしい ことばだけ
- タッチのねらいをたすける エイムアシスト（CPU がわには つかわない）

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
- 3Dモデル・水面・効果はコードから生成。外部3Dアセットや外部音源は不使用
- `docs/skills/` 配下の参照資料：各社の著作物（要約と公式 URL のみ掲載）

---

## 🙏 クレジット

- ゲームデザイン参考：[shitada/universe-kids-race](https://github.com/shitada/universe-kids-race)
- 描画エンジン：[Three.js](https://threejs.org/)（MIT License）
- AI 補助：GitHub Copilot CLI
