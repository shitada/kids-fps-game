# 🟥 Google 公式ガイド — 要約とリンク集

Google の web.dev / Material Design / Gemini Code Assist から、本プロジェクトに役立つトピックを整理しています。**本文はコピーせず、要約とリンクのみ**。

## 出典・参照リンク

| 資料 | URL | ライセンス |
| --- | --- | --- |
| web.dev — Web パフォーマンス | https://web.dev/performance/ | CC-BY 4.0（多くのコンテンツ） |
| web.dev — Rendering Performance | https://web.dev/rendering-performance/ | CC-BY 4.0 |
| web.dev — Memory Management | https://web.dev/articles/memory-leaks | CC-BY 4.0 |
| web.dev — Core Web Vitals | https://web.dev/articles/vitals | CC-BY 4.0 |
| WebGL Fundamentals（webglfundamentals.org） | https://webglfundamentals.org/ | CC-BY 4.0 / コード MIT |
| Google Fonts（Zen Maru Gothic） | https://fonts.google.com/specimen/Zen+Maru+Gothic | OFL-1.1（埋込可） |
| Material Design 3 | https://m3.material.io/ | CC-BY 4.0 |
| Designing for Kids（Material） | https://m3.material.io/foundations/designing/designing-for-kids | CC-BY 4.0 |
| Gemini Code Assist（公式） | https://cloud.google.com/gemini/docs/codeassist/overview | 著作物 |

## 1. Web パフォーマンスの基本（本プロジェクトへの適用）

1. **初回表示を 3 秒以内に**：本プロジェクトは Three.js を別チャンクに分けて遅延ロード可能にしている（`vite.config.ts` の `manualChunks`）。
2. **60fps を維持**：JS のメインスレッド占有時間を 16ms 以内に。`requestAnimationFrame` を使い、毎フレームの計算を最小化する。
3. **GC を抑える**：`new THREE.Vector3()` の頻繁な生成を避けるため、本プロジェクトでも将来的にプールやキャッシュ化を導入予定。
4. **テクスチャ・ジオメトリは使い回す**：本プロジェクトでは `WaterSplashPool` がインスタンスを再利用。
5. **モバイルで `devicePixelRatio` を制限**：本プロジェクトは `Math.min(window.devicePixelRatio, 2)` を適用済み。

## 2. Three.js / WebGL のベストプラクティス

WebGL Fundamentals と web.dev から：

- **ジオメトリ・マテリアルは共有**：`new THREE.MeshLambertMaterial({ color })` を毎回作らず、同色なら共有する（本プロジェクトでも `WaterSplashPool` で 1 つを clone）。
- **`InstancedMesh`** を使えば同種の物体（木、石、パーティクル）を 1 ドローコールで描画可能（v2 で導入予定）。
- **影は最低限**：本プロジェクトでは影描画を無効化し、フェイク影は使わない。
- **ポストエフェクト最小**：BloomPass などは iPad Safari で重いため、本プロジェクトでは未使用。
- **シーンのフォグでドローコール削減**：遠景フォグを使用済み（`THREE.Fog`）。

## 3. 子供向け UI 設計（Designing for Kids）

Material の「Designing for Kids」要点：

1. **大きなタップ領域（最低 56dp）**：本プロジェクトのボタンは 56px 以上。
2. **強い色と高コントラスト**：パステル背景 + 鮮やかなアクセント色を使用。
3. **テキストは最小限**：ひらがな中心、アイコン併用。
4. **明確なフィードバック**：効果音・色変化・スケールアニメーションで「押された」を強調。
5. **ペアレンタル設定の場所を明示**：本プロジェクトの v2 で「おうちのひと」設定を分離予定。

## 4. Gemini Code Assist のヒント

ゲーム本体は Gemini を使わないが、開発補助で：

- **コミット前にコードレビュー**：Gemini Code Assist でファイル単位の差分レビューを実行。
- **テスト生成**：「この関数の Vitest を書いて」と指示する。
- **ライセンス・依存スキャン**：依存ライブラリの安全性確認。

## 5. Google Fonts — Zen Maru Gothic

本プロジェクトの `index.html` で読み込んでいる **Zen Maru Gothic**：

- ライセンス：SIL Open Font License 1.1（OFL-1.1）
- 子供向けのまるい字形でひらがな表示に最適
- Web フォントとして無料で埋込可、ローカル fallback として `Hiragino Maru Gothic ProN` を指定

## ライセンス

- web.dev / WebGL Fundamentals / Material Design は CC-BY 4.0。本ファイルではリンクと要約のみを掲載し、独自の文章で記述しています。
- Google Fonts は OFL-1.1 で再配布・埋込が可能。
