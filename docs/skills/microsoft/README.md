# 🟦 Microsoft 公式ガイド — 要約とリンク集

Microsoft / GitHub の公式ドキュメントから、本プロジェクトに役立つトピックを整理しています。**本文はコピーせず、要約とリンクのみ**。

## 出典・参照リンク

| 資料 | URL | ライセンス |
| --- | --- | --- |
| GitHub Copilot Coding Agent / `.github/copilot-instructions.md` | https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot | 著作物（参照可） |
| AGENTS.md コミュニティ仕様 | https://agents.md/ | CC-BY |
| GitHub Copilot Best Practices for Prompts | https://docs.github.com/en/copilot/using-github-copilot/prompt-engineering-for-github-copilot | 著作物 |
| TypeScript Handbook | https://www.typescriptlang.org/docs/handbook/intro.html | Apache-2.0 |
| TypeScript Do's and Don'ts | https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html | Apache-2.0 |
| MakeCode Arcade Game Design ガイド | https://arcade.makecode.com/ | CC-BY |
| Spec-driven development (Spec Kit) | https://github.com/spec-kit/specify-cli | MIT |

## 1. GitHub Copilot のプロンプト指針（本プロジェクトへの適用）

1. **`.github/copilot-instructions.md` を必ず置く**：本リポジトリでは「子供向け（ひらがな）」「流血禁止」「Three.js v0.170」を明記している。
2. **コメント駆動開発**：実装したい内容を関数コメントとして先に書くと、補完精度が上がる。
3. **小さなチャンクで仕事を頼む**：1 関数 / 1 コンポーネント単位。
4. **テストを先に書く**：本プロジェクトでは `tests/unit/` を実装より先に用意する習慣をつける。
5. **ファイル全体ではなく該当範囲だけ提示**：ノイズを減らす。

## 2. AGENTS.md コミュニティ仕様

AGENTS.md は複数の AI コーディングツールが共通参照できるプロジェクト規約ファイルの仕様。本プロジェクトでは `.github/copilot-instructions.md` がその役割を兼ねていますが、AGENTS.md 風の項目をそのまま流用しています：

- プロジェクト概要
- 技術スタック
- コーディング規約
- ディレクトリ構成
- 開発手順

## 3. TypeScript Handbook 抜粋（重要原則）

本プロジェクトの `tsconfig.json` は `strict: true`。実務で効く原則を要約：

1. **`any` を最後の手段に**：型推論で済むなら書かない。
2. **`unknown` を `any` の代わりに**：受け取った値はガード関数で型確定させる。
3. **Discriminated Union で状態を表現**：本プロジェクトでは `SceneTarget` がこの形（`{ id: 'battle'; mapId: string }` など）。
4. **`as` キャストは局所化**：型を欺くのではなく、できれば型ガード関数を書く。
5. **`readonly` を積極的に**：イミュータブルなコンフィグ（`WEAPONS`, `MAPS`）は将来 `Readonly<T>` で守れる。
6. **`Record<K, V>` で網羅性チェック**：`Record<WeaponId, WeaponConfig>` のように使い、新しい武器を増やしたら自動的に定義漏れを検出。

## 4. MakeCode Arcade のゲーム設計ガイド（子供向け）

MakeCode Arcade は 6-12 歳向けのゲーム作成プラットフォーム。子供向けゲーム設計の知見：

- **チュートリアルは 3 ステップ以内**：本プロジェクトでも初回プレイ時の表示は 1 つに絞る。
- **失敗のフィードバックは前向きに**：「もういっかい」ボタンを大きく。本プロジェクトの Result Scene と一致。
- **コントロールは可能な限り少なく**：本プロジェクトの建設システムも、Fortnite の「編集」は省略して操作を最小化。
- **明確な達成感**：勝った時に色・音・エフェクトで強く演出。

## 5. Spec Kit（仕様駆動開発）

Microsoft が GitHub で公開している Spec Kit は、機能ごとに `specs/00X-feature/` を作り、仕様 → 計画 → 実装 → テスト の流れを徹底するワークフロー。参照リポ（universe-kids-race）と同様に本リポジトリでも将来導入予定。

## ライセンス

- TypeScript ドキュメントは Apache-2.0 で、自由に引用・改変・再配布が可能（要ライセンス通知）。
- GitHub / Microsoft の公式ドキュメントは Microsoft の著作物。要約と公式 URL の引用のみ。
- AGENTS.md コミュニティ仕様は CC-BY、引用可。
