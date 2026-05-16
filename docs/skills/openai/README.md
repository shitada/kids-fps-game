# 🟩 OpenAI 公式ガイド — 要約とリンク集

OpenAI 公式ドキュメント / Cookbook から、本プロジェクトに役立つトピックを整理しています。**本文はコピーせず、要約とリンクのみ**。

## 出典・参照リンク

| 資料 | URL |
| --- | --- |
| OpenAI Platform Docs（GPT 一般） | https://platform.openai.com/docs/overview |
| Prompt Engineering Best Practices | https://platform.openai.com/docs/guides/prompt-engineering |
| Function Calling / Structured Outputs | https://platform.openai.com/docs/guides/function-calling |
| OpenAI Cookbook（GitHub・MIT License） | https://github.com/openai/openai-cookbook |
| Codex CLI（GitHub） | https://github.com/openai/codex |
| GPT-5 / GPT-5-Codex プロンプティングガイド（Cookbook） | https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide |
| Realtime API（音声・対話） | https://platform.openai.com/docs/guides/realtime |

## 1. GPT-5 / Codex プロンプティングガイド（要点抜粋）

公式 Cookbook の `GPT-5 prompting guide` から、コード生成タスクで効くポイントを要約：

1. **役割・目的・対象読者を冒頭で明確化**：「Three.js + TypeScript の子供向け FPS のコードを書く」など。
2. **正しいコードの定義を出す**：型エラーゼロ、Vitest が通る、命名規則、ファイル配置を提示する。
3. **失敗例も提示**：「`any` を使うのは禁止」「`document.cookie` は禁止」などを明示。
4. **段階的に複雑度を上げる**：最初に最小版 → 後でリッチ化。
5. **チェックリストで自己レビュー**：実装後にチェック項目を提示し、エージェントに評価させる。

## 2. Function Calling / Structured Outputs

- ゲーム本体は GPT を呼ばないが、開発補助で **ツール定義（関数スキーマ）** を JSON Schema で渡す形は、本プロジェクトの型定義（`src/types/`）の整理方針と一致する。
- Structured Outputs（JSON Schema 出力）の考え方：型を最初に決め、振る舞いは後から決める。本プロジェクトでは `MatchResult`, `SaveData`, `MapConfig` 等を最初に定義して合意した。

## 3. Realtime API のヒント（将来拡張用）

- 子供向けの音声操作（「あさって」と話したらマップ移動など）を将来追加する場合に役立つ。
- ただし子供向け製品で外部 API を使う際は、**音声データの取り扱い・年齢確認** に注意が必要。
- 本プロジェクトの v1 では Realtime API は使わない。

## 4. Cookbook の活用

OpenAI Cookbook（GitHub、MIT License）から本プロジェクトに役立つレシピ：

- **`techniques_to_improve_reliability.ipynb`**：プロンプトの自己検証技術
- **GPT-5 prompting guide**：上記参照
- **JSON mode / Structured Outputs 例**：型整合のためのテンプレ

## ライセンス

- OpenAI Cookbook は MIT License。必要に応じてコード片を取り込み可（要ライセンス明記）。
- OpenAI 公式ドキュメントは著作物。要約と公式 URL の引用のみ。
