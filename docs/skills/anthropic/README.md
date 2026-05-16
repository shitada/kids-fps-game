# 🟧 Anthropic 公式ガイド — 要約とリンク集

Anthropic の Claude / Claude Code 向けのベストプラクティスから、本プロジェクトの開発に直接効くポイントを抜粋しています。**本文はコピーせず、要約とリンクのみ** を掲載しています。

## 出典・参照リンク

| 資料 | URL |
| --- | --- |
| Claude Code Best Practices（公式エンジニアリングブログ） | https://www.anthropic.com/engineering/claude-code-best-practices |
| Anthropic Skills（公式ドキュメント） | https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview |
| プロンプトエンジニアリング ガイド | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview |
| Claude Agent SDK（公式ドキュメント） | https://docs.anthropic.com/en/api/agent-sdk/overview |
| Anthropic Cookbook（GitHub） | https://github.com/anthropics/anthropic-cookbook |

## 1. Claude Code を使うときの要点（このプロジェクトでの適用）

1. **CLAUDE.md / `.claude/` でプロジェクト規約を明示**：本リポジトリでは `.github/copilot-instructions.md` が同じ役割を果たし、Claude Code / Copilot CLI どちらでも参照できる。
2. **小さく動くスコープに分割**：1 PR = 1 機能（例：水鉄砲だけ、建設だけ、CPU AI だけ）。
3. **テスト → 実装 → リファクタの順**：本プロジェクトでは Vitest をユニット層、Playwright を E2E 層に分離。
4. **エージェントには「いまの状態」と「ゴール」を必ず添える**：`plan.md` を session に保存して常時参照。
5. **既存ファイル編集を優先、新規ファイルは最小限**：本リポジトリでも `src/game/` 配下のディレクトリを最初に決め、ファイルを増やしすぎない。

## 2. Anthropic Skills 設計指針（このゲーム開発への適用）

Anthropic Skills は「ドメイン特化の知識・手順を `SKILL.md` + 補助スクリプトで束ねる」アーキテクチャ。本プロジェクトに置き換えると：

- ゲームロジックの各「サブシステム」（射撃 / 建設 / AI / セーフゾーン）は **独立した責務** を持ち、入出力（イベント、エンティティ参照）を明示する。
- `src/game/systems/` の各モジュールは、`SKILL.md` 的な役割：1 つのことだけを上手にやる。
- 設定（`src/game/config/`）と振る舞い（`src/game/systems/`）を **分離** して、難易度・武器・マップを差し替え可能にする。

## 3. プロンプトエンジニアリングの 6 原則（要約）

公式ガイドに掲載されている代表的な原則を、ゲーム開発文脈に書き下しています。

1. **具体的・明示的に指示**：「動く」「速い」ではなく「60fps を iPad Safari で維持」のような数値目標。
2. **役割と文脈を与える**：「子供向けの安全配慮（流血ゼロ、ひらがな）」をプロンプトで強調。
3. **例を示す**：望ましいコードのスタイル・命名・コメント密度の例を 1-2 件添える。
4. **思考の手順を促す**：「まず要件を箇条書きで整理してから実装」と分解。
5. **XML タグで構造化**：長文プロンプトは `<requirements>`, `<constraints>` 等で囲うと精度が上がる。
6. **チェックリストで自己検証**：実装後に「テストは通ったか / 子供向け配慮は満たされたか」を Claude に確認させる。

## 4. Agent SDK / Tool Use の本プロジェクト適用

ゲーム本体は AI を実行時に使わないが、開発支援として下記が便利：

- **Spec Kit**（universe-kids-race と同様）で `specs/00X-feature/` を作り、AI に渡す。
- スクリプト化された繰り返し作業（マップ生成、テストケース生成）は Claude Code の `--print` で自動化可能。

## ライセンス

- 上記リンク先のドキュメントは Anthropic の著作物です。本ファイルでは要約と引用のみを行っています。
- Anthropic Cookbook（GitHub）は MIT License で公開されており、必要に応じてサンプルコードを参照できます（再利用時はライセンス遵守）。
