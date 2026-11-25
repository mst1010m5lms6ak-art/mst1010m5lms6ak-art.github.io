# はちゃめちゃ世界 — 完全コード地図（CODE_MAP）

> 本書は Node スクリプトによる全実ファイルの機械スキャンで自動生成された正確な行番号地図です。次回改修時は本書と [DATA_CATALOG.md](./DATA_CATALOG.md) で対象箇所の行番号を特定し、**必要最小限の行範囲のみ**を読み込んでトークンを節約してください。

## 1. 全ファイル一覧（全37ファイル／上限100ファイル厳守）

- 実ゲーム構成ファイル: **33ファイル**（HTML 1 / Manifest 1 / SW 1 / Pages設定 2 / PNGアイコン 3 / CSS 5 / JS 20）
- 引継ぎドキュメント: **4ファイル**（`docs/*.md`）
- **ワークスペース総ファイル数: 37ファイル**（100ファイル上限に対し十分な余裕あり）

| ファイルパス | 行数 | 役割 |
| --- | ---: | --- |
| `index.html` | 71 | アプリ単一エントリ（ルート直下配置・file://直開き・SafeArea/PWAメタ・DOM骨格・defer読込順） |
| `manifest.webmanifest` | 34 | PWA マニフェスト（standalone・縦固定・相対パスアイコン定義） |
| `sw.js` | 85 | PWA Service Worker（全アセット事前キャッシュ・オフライン応答・`CACHE_NAME`管理） |
| `.nojekyll` | 0 | GitHub Pages で Jekyll ビルドを無効化し静的ファイルをそのまま配信 |
| `.github/workflows/deploy-pages.yml` | 38 | GitHub Actions による GitHub Pages 自動デプロイ定義 |
| `assets/icons/icon-180.png` | PNG | iOS ホーム画面用アプリアイコン (180×180 PNG) |
| `assets/icons/icon-192.png` | PNG | PWA/Android 用アイコン (192×192 PNG) |
| `assets/icons/icon-512.png` | PNG | PWA スプラッシュ/ストア用アイコン (512×512 PNG) |
| `css/base.css` | 368 | ベースリセット・10px以上フォント規約・HIGタップサイズ・2層スクロール枠(`.scroll-frame`/`.scroll-body`) |
| `css/theme.css` | 372 | 7世界観シンクロテーマ(`#app[data-world]`)・6属性/4ロール色・品質1〜100＆👑極100スタイル |
| `css/layout.css` | 504 | 50:50携帯筐体シェル・上50%操作不可(`pointer-events:none`)・SafeArea・下50%シート＆暗幕・トースト |
| `css/battle.css` | 1532 | 戦闘画面・行動順バー・ユニットカード・カットイン帯・ログ・4指標DPS・待機/リザルト・`@container upper`圧縮 |
| `css/screens.css` | 1313 | 編成/育成/冒険/図鑑/設定の全UIカード・差分表示・`@container upper`3段階自動圧縮 |
| `js/namespace.js` | 65 | グローバル名前空間 `HS`・アプリバージョン・全共通定数（属性/種族/ロール/品質帯/上限値） |
| `js/utils.js` | 338 | 厳格ソート（属性→種族［単一→複合辞書順］→ロール→五十音）・品質倍率・数値整形・DOMビルダー |
| `js/storage.js` | 281 | IndexedDB主保存＋localStorage副保存＋チェックサム付き`HS1:`バックアップ文字列の入出力 |
| `js/data/elements_races.js` | 195 | 6属性＆相性倍率・7種族・4ロール（控えリンク効果）・7世界観・17状態効果・37編成シナジー定義 |
| `js/data/abilities.js` | 258 | ロール共有アビリティ全100種（4ロール×5段階×5択）と段階解放コスト定義 |
| `js/data/characters.js` | 1525 | 全28キャラ定義（基礎ステ・全3技/パッシブ・スキル覚醒I〜III・異界共鳴1〜5・入手ルート・ロア） |
| `js/data/enemies.js` | 732 | 全48敵定義（通常24・エリアボス4・乱入8・超ボス3・タワー＆リレー強敵9） |
| `js/data/equipment.js` | 398 | 全10装備セット（2/4セット効果）と全40装備アイテム（4部位・ランダムオプション無し） |
| `js/data/stages_pve.js` | 602 | 10素材/通貨・4エリア×10面(40面)・混線タワー20階・超ボス3体・リレー3難度・指名手配8件・別働隊6ルート・世界遺物12種 |
| `js/engine/state.js` | 1401 | セーブ状態管理・パーティ/控えリンク/装備/自動売却/育成/加入/図鑑/設定の全ミューテーション＆イベントバス |
| `js/engine/calc.js` | 624 | 最終ステータス合算（装備品質・セット・控えリンク・シナジー・ロールアビ・共鳴・パッシブ・遺物・タワー規則）＆差分計算 |
| `js/engine/expedition.js` | 364 | 出撃勝利数連動・別働隊2枠エンジン（実時間タイマー無し・複合種族W適性・自動再出撃/停止再開） |
| `js/engine/battle.js` | 2040 | 逐次ATBバトルエンジン（攻撃中ゲージ継続進行・乱入・自動周回/今回で停止・4指標累計DPS・5大PvEモード制御） |
| `js/ui/anim.js` | 648 | 単一rAFループ・GPU専用`scaleX`ゲージ更新・28ノード固定ダメージポップアッププール・カットイン帯・世界観切替 |
| `js/ui/app.js` | 666 | アプリ起動・下5タブナビ＆戦闘中移動ロック・下50%限定ボトムシート・自動売却シート・最新1件トースト・WakeLock・SW安全登録 |
| `js/ui/battle_view.js` | 1903 | 戦闘タブUI（待機/戦闘中/通常リザルト/周回リザルト・行動順4枠・バフ最大2チップ+N・ログ・4指標DPS・戦術確認） |
| `js/ui/party_view.js` | 1353 | 編成タブUI（出撃4枠・控えリンク4枠・装備換装・世界遺物3枠・上50%リアルタイム差分プレビュー） |
| `js/ui/growth_view.js` | 1040 | 育成タブUI（ロール共有アビ・スキル覚醒I〜III・異界共鳴1〜5＆5段階2枠追加・酒場加入） |
| `js/ui/quest_view.js` | 1195 | 冒険タブUI（メイン冒険・混線タワー20階・超ボス3体・多部隊リレー3軍編成・指名手配8件・別働隊2枠） |
| `js/ui/codex_view.js` | 940 | 図鑑・設定タブUI（観賞用図鑑4種［ステボーナス無し］・設定・バックアップ文字列/ファイル保存・2段階初期化） |
| `docs/HANDOFF_SPEC.md` | doc | 次回指示用の完全引継ぎ仕様書（進め方・全実装済み仕様・全禁止事項・公開/Capacitor手順） |
| `docs/NEXT_PROMPT.md` | doc | 次回セッション用コピペ指示プロンプトテンプレート |
| `docs/CODE_MAP.md` | doc | 全ファイルの機械スキャン正確な行番号付きコード地図＆逆引き索引（本書） |
| `docs/DATA_CATALOG.md` | doc | 全実装固有名詞・改名用データ完全名簿（全行番号付き） |

## 2. 目的別 逆引きクイック索引（「〇〇を直したいとき」）

| 改修・調査したい機能 | 読むべきファイル＆正確行番号 |
| --- | --- |
| SafeArea・PWA上部見切れ対策・50:50画面分割 | `index.html` L5-L10 / `css/layout.css` L32-L128 / `css/layout.css` L55-L71 / `css/base.css` L12-L36 |
| 上半分50%の操作禁止ガード・下50%限定ボトムシート | `css/layout.css` L32-L128 / `css/layout.css` L290-L300 / `css/layout.css` L313-L332 / `js/ui/app.js` L191-L217 / `js/ui/app.js` L459-L559 |
| 7世界観シンクロテーマ（配色・模様・切欠き枠） | `css/theme.css` L55-L245 / `js/data/elements_races.js` L89-L118 / `js/ui/anim.js` L76-L94 |
| 2層スクロール枠（枠とスクロールバー被り防止） | `css/base.css` L274-L284 |
| SE / SE+SafeArea 向け `@container upper` 自動圧縮 | `css/battle.css` L1275-L1371 / `css/battle.css` L1373-L1532 / `css/screens.css` L1018-L1052 / `css/screens.css` L1054-L1163 / `css/screens.css` L1165-L1313 |
| 属性相性（炎/水/風/光/闇/無の倍率） | `js/data/elements_races.js` L7-L14 / `js/data/elements_races.js` L16-L33 / `js/engine/battle.js` L190-L195 |
| 厳格ソート順（属性→種族［単一→複合辞書順］→ロール→五十音） | `js/utils.js` L55-L65 / `js/utils.js` L81-L102 / `js/utils.js` L104-L106 / `js/utils.js` L116-L127 |
| 品質1〜100倍率・👑極100の見た目と保護 | `js/namespace.js` L8-L58 / `js/utils.js` L143-L150 / `js/utils.js` L152-L156 / `js/engine/calc.js` L150-L168 / `css/theme.css` L307-L372 |
| 最終ステータス計算＆リアルタイム差分プレビュー | `js/engine/calc.js` L330-L560 / `js/engine/calc.js` L562-L574 / `js/engine/calc.js` L576-L593 |
| 編成シナジー（37種・控えリンク込み＆複合種族両カウント） | `js/data/elements_races.js` L140-L194 / `js/engine/calc.js` L191-L270 |
| 行動ゲージ継続進行・逐次攻撃ロック（同時攻撃禁止） | `js/engine/battle.js` L1881-L1952 / `js/engine/battle.js` L1152-L1330 / `js/ui/anim.js` L537-L577 |
| 行動順先読みバー（4枠固定グリッド） | `js/engine/battle.js` L1745-L1792 / `js/ui/battle_view.js` L631-L705 / `css/battle.css` L88-L98 |
| ユニットカード表示（HP/ATB/技バッジ/バフ最大2チップ+N） | `js/ui/battle_view.js` L400-L495 / `js/ui/battle_view.js` L720-L770 / `js/ui/battle_view.js` L502-L522 / `css/battle.css` L207-L223 |
| ダメージ計算・会心・防護壁・不屈・蘇生・状態異常 | `js/engine/battle.js` L940-L1058 / `js/engine/battle.js` L442-L463 / `js/engine/battle.js` L836-L892 / `js/engine/battle.js` L894-L910 |
| 非ボスWAVE乱入（乱入判定・乱入バナー・指名手配） | `js/engine/battle.js` L531-L579 / `js/ui/anim.js` L354-L369 / `js/data/stages_pve.js` L393-L470 |
| 自動周回・今回で停止・周回累計4指標DPS・リザルト画面 | `js/engine/battle.js` L1954-L1974 / `js/engine/battle.js` L1985-L1991 / `js/engine/battle.js` L1578-L1617 / `js/ui/battle_view.js` L829-L935 / `js/ui/battle_view.js` L938-L1025 / `js/ui/battle_view.js` L1289-L1358 |
| 戦闘ログ（上詰め見切れゼロ・自動追従・最新へピル） | `js/engine/battle.js` L109-L126 / `js/ui/battle_view.js` L1181-L1222 |
| 自動売却設定・一括売却・👑極保護 | `js/engine/state.js` L634-L645 / `js/engine/state.js` L1043-L1063 / `js/engine/state.js` L1080-L1102 / `js/ui/app.js` L234-L327 |
| 出撃連動・別働隊2枠（実時間タイマー無し・停止/再開） | `js/data/stages_pve.js` L476-L519 / `js/engine/expedition.js` L42-L118 / `js/engine/expedition.js` L272-L359 / `js/engine/expedition.js` L173-L186 / `js/ui/quest_view.js` L961-L1113 |
| 1対1控えリンク4枠（ロール効果＋同属性/同種族一致ボーナス） | `js/data/elements_races.js` L45-L74 / `js/data/elements_races.js` L76-L87 / `js/engine/calc.js` L272-L310 / `js/engine/state.js` L876-L899 / `js/ui/party_view.js` L857-L1009 |
| 多部隊リレー総力戦（3軍編成・自動バトンタッチ） | `js/data/stages_pve.js` L338-L387 / `js/engine/state.js` L936-L954 / `js/engine/battle.js` L1619-L1636 / `js/ui/quest_view.js` L801-L888 |
| 育成5軸（ロールアビ100・覚醒I〜III・共鳴1〜5・遺物12） | `js/engine/state.js` L1117-L1135 / `js/engine/state.js` L1177-L1191 / `js/engine/state.js` L1195-L1219 / `js/engine/state.js` L1232-L1246 / `js/ui/growth_view.js` L984-L1008 |
| ガチャ無しキャラ加入（4ルート・酒場勧誘・手配3勝加入） | `js/engine/state.js` L801-L811 / `js/engine/state.js` L815-L825 / `js/ui/growth_view.js` L898-L963 |
| 観賞用図鑑4種＆設定（バックアップ・WakeLock・2段階初期化） | `js/ui/codex_view.js` L876-L909 / `js/ui/codex_view.js` L640-L704 / `js/ui/codex_view.js` L706-L741 / `js/ui/codex_view.js` L743-L785 / `js/ui/app.js` L392-L409 |
| セーブ永続化（IndexedDB主・localStorage副・HS1文字列） | `js/storage.js` L184-L196 / `js/storage.js` L198-L212 / `js/storage.js` L214-L222 / `js/storage.js` L224-L259 / `js/engine/state.js` L284-L492 |
| GPU専用アニメ（`scaleX`ゲージ・28ノード固定プール・カットイン帯） | `js/ui/anim.js` L129-L193 / `js/ui/anim.js` L206-L215 / `js/ui/anim.js` L240-L317 / `js/ui/anim.js` L322-L349 |
| PWA キャッシュ更新・`file://` & Capacitor SWガード | `sw.js` L3 / `sw.js` L5-L37 / `js/ui/app.js` L445-L452 |
| トースト表示（最新1件差し替え・中央仕切り上）＆戦闘中タブ移動ロック | `js/ui/app.js` L344-L360 / `js/ui/app.js` L561-L608 / `js/ui/app.js` L151-L162 / `css/layout.css` L385-L397 |

## 3. ルート・PWA・デプロイ定義ファイル詳細

### `index.html` (71行)
- L3-L20: PWA・SafeAreaメタタグ（`viewport-fit=cover`, `black-translucent`）、アイコン、CSS 5本読込
- L22-L26: 上半分50%ライブ表示領域（`#viewport-upper`, `#top-hud`, `#upper-stage`, `#fx-layer`）
- L28-L32: 中央仕切り帯（`#cockpit-divider`, `#divider-world-tag`）
- L33-L37: 下半分50%親指操作デッキ（`#lower-panel`, `#context-bar`, `#bottom-nav`）
- L38-L47: 下50%限定ボトムシート（`#sheet-backdrop`, `#bottom-sheet`）＆トースト（`#toast-stack`）
- L50-L69: JS 20本の厳格な `defer` 読込順（`namespace` → `utils` → `storage` → `data/*` → `engine/*` → `ui/*` → `app`）

### `manifest.webmanifest` (34行)
- L1-L13: アプリ名・`start_url: "./"`・`scope: "./"`・`display: "standalone"`・`orientation: "portrait"`・テーマ色
- L14-L33: 相対パス `./assets/icons/` アイコン配列（180 / 192 / 512）

### `sw.js` (85行)
- `CACHE_NAME`: L3
- `PRECACHE_ASSETS`: L5-L37
- `addEventListener('install')`: L39-L45
- `addEventListener('activate')`: L47-L57
- `addEventListener('fetch')`: L59-L85

### `.github/workflows/deploy-pages.yml` (38行)
- L1-L17: `main` ブランチ push / 手動起動トリガー・権限・concurrency
- L18-L38: ルートディレクトリ `path: '.'` をそのまま GitHub Pages へ自動デプロイ

## 4. CSS ファイル詳細地図（全5ファイル）

### `css/base.css` (368行)

**主要セクション**
- L1-L120: はちゃめちゃ世界 — Base Reset, Typography, Touch Rules & Scroll Primitives
- L121-L269: Standard Tactile Buttons & Pills (HIG touch targets >= 42px x 44px)
- L270-L368: 2-Layer Zero-Bug Scrollable Container (ONLY scrollable primitive in app)

**主要ルール・メディアクエリ・コンテナクエリ**
- `.scroll-frame`: L274-L284
- `@media (max-height: 700px)`: L362-L368

### `css/theme.css` (372行)

**主要セクション**
- L1-L54: はちゃめちゃ世界 — Vivid World-Sync Themes (7 Worlds), Elements, Roles & Quality
- L55-L245: 7 Vivid World-Sync Themes (#app[data-world="..."])
- L246-L306: Element & Role Semantic Classes & Data Attributes
- L307-L372: Equipment Quality Tiers (1-100) & High-Contrast Quality 100「極」 (.q-max)

**主要ルール・メディアクエリ・コンテナクエリ**
- `:root`: L6-L53
- `#app[data-world="frontier"]`: L60-L81
- `#app[data-world="mechcity"]`: L84-L105
- `#app[data-world="dragonpeak"]`: L108-L129
- `#app[data-world="fairyvale"]`: L132-L153
- `#app[data-world="abyss"]`: L156-L177
- `#app[data-world="sanctum"]`: L180-L201
- `#app[data-world="wilds"]`: L204-L225
- `.scroll-frame`: L232-L234

### `css/layout.css` (504行)

**主要セクション**
- L1-L31: はちゃめちゃ世界 — Live Handheld Cockpit 50:50 App Shell & Safe Area Layout
- L32-L128: UPPER 50% — Live Read-Only Display Viewport (ZERO interactive elements)
- L129-L167: CENTER 50% COCKPIT DIVIDER (World-Sync Accent Seam)
- L168-L283: LOWER 50% — Thumb-Zone Command Deck
- L284-L379: LOWER-50% BOTTOM SHEET & BACKDROP
- L380-L443: TOAST STACK — Ultra-Slim Single-Line Pill Centered Directly on Center Divider
- L444-L504: Compact Adjustments for Short Screens (iPhone SE 375x667 + Safe Area)

**主要ルール・メディアクエリ・コンテナクエリ**
- `@media (min-width: 456px)`: L19-L30
- `.sheet-backdrop`: L290-L300
- `.bottom-sheet`: L313-L332
- `.toast-stack`: L385-L397
- `@keyframes hs-toast-in`: L433-L442
- `@media (max-height: 700px)`: L448-L504

### `css/battle.css` (1532行)

**主要セクション**
- L1-L83: はちゃめちゃ世界 — Battle Stage, Silky GPU Gauges, Cards, FX, Log & DPS
- L84-L171: Turn-Order Timeline Bar — Fixed 4-Slot Equal Grid (ZERO Right-Edge Clip!)
- L172-L376: Enemy & Ally Rows + High-Density Fixed-Slot Unit Cards
- L377-L533: SILKY GPU GAUGES — Strictly transform: scaleX(var(--val, 0))
- L534-L670: FX Layer: Pooled Damage Popups, Seam Cut-In Ribbon & Intruder Warning
- L671-L804: LOWER 50% BATTLE DECK — Sub-tabs, Top-Aligned Log & Compact DPS Meter
- L805-L902: DPS Meter — Fixed Non-Scrolling 4-Bar Panel (ZERO Crush even on SE+SafeArea!)
- L903-L1186: Standby Stage & High-Density Result Boards (with Mini DPS Chart!)
- L1187-L1270: Short-Screen Battle Compaction (iPhone SE 375x667 + Safe Area)
- L1271-L1532: Container-Query Automatic Upper-50% Compaction (SE & SE+SafeArea ZERO Clip!)

**主要ルール・メディアクエリ・コンテナクエリ**
- `.battle-stage`: L9-L16
- `.turn-order-bar`: L88-L98
- `.unit-card`: L207-L223
- `@keyframes hs-hit-shake`: L279-L285
- `@keyframes hs-flash`: L575-L578
- `.dps-panel`: L809-L820
- `.standby-stage`: L907-L914
- `.result-board`: L1022-L1033
- `@media (max-height: 700px)`: L1191-L1269
- `@container upper (max-height: 315px)`: L1275-L1371
- `@container upper (max-height: 268px)`: L1373-L1532

### `css/screens.css` (1313行)

**主要セクション**
- L1-L8: はちゃめちゃ世界 — Non-Battle Screens (Party, Growth, Quest/PvE, Codex/Settings)
- L9-L202: Shared Upper 50% Read-Only Live Inspector & High-Density Briefing Cards
- L203-L479: PARTY / LINK / EQUIPMENT / RELICS (party_view.js)
- L480-L663: GROWTH — Role Abilities (5 Choices), Skill Awakening, Resonance, Tavern
- L664-L809: QUEST / 4 PvE MODES / EXPEDITIONS (quest_view.js)
- L810-L940: CODEX & SETTINGS (codex_view.js) — Zero Overflow on iPhone SE + Safe Area!
- L941-L1012: Short-Screen Compaction (iPhone SE 375x667 + Safe Area)
- L1013-L1313: Container-Query Automatic Upper-50% Compaction (15 Pro+SafeArea / SE / SE+SafeArea)

**主要ルール・メディアクエリ・コンテナクエリ**
- `@media (max-height: 700px)`: L946-L1011
- `@container upper (max-height: 355px)`: L1018-L1052
- `@container upper (max-height: 315px)`: L1054-L1163
- `@container upper (max-height: 268px)`: L1165-L1313

## 5. JS ファイル詳細地図（全20ファイル・全定数／関数／メソッド）

### `js/namespace.js` (65行) — グローバル名前空間 `HS`・アプリバージョン・全共通定数（属性/種族/ロール/品質帯/上限値）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 公開データ/API | `HS.VERSION` | L6 |
| 公開データ/API | `HS.CONST` | L8-L58 |

### `js/utils.js` (338行) — 厳格ソート（属性→種族［単一→複合辞書順］→ロール→五十音）・品質倍率・数値整形・DOMビルダー

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `ELEMENT_ORDER` | L7 |
| 定数/定義 | `RACE_ORDER` | L10 |
| 定数/定義 | `ROLE_ORDER` | L13 |
| 定数/定義 | `SLOT_ORDER` | L16 |
| 関数 | `elementIndex(el)` | L21-L23 |
| 関数 | `raceIndex(r)` | L25-L27 |
| 関数 | `roleIndex(role)` | L29-L32 |
| 関数 | `slotIndex(slot)` | L34-L37 |
| 関数 | `normalizeRaces(races)` | L39-L53 |
| 関数 | `compareRaces(racesA, racesB)` | L55-L65 |
| 関数 | `compareKana(a, b)` | L67-L72 |
| 関数 | `compareCatalog(a, b)` | L81-L102 |
| 関数 | `sortCharacters(list)` | L104-L106 |
| 関数 | `sortEnemies(list)` | L108-L110 |
| 関数 | `sortEquipDefs(list)` | L112-L114 |
| 関数 | `sortEquipItems(list, equipDefMap)` | L116-L127 |
| 関数 | `sortAbilities(list)` | L129-L137 |
| 関数 | `clamp(v, min, max)` | L139-L141 |
| 関数 | `getQualityTier(q)` | L143-L150 |
| 関数 | `qualityMultiplier(q)` | L152-L156 |
| 関数 | `formatExact(n)` | L158-L161 |
| 関数 | `formatNum(n)` | L163-L176 |
| 関数 | `formatPct(val, showSign)` | L178-L182 |
| 関数 | `randInt(min, max)` | L184-L188 |
| 関数 | `randFloat(min, max)` | L190-L192 |
| 関数 | `pickRandom(arr)` | L194-L197 |
| 関数 | `weightedPick(items, weightFn)` | L199-L216 |
| 関数 | `shuffle(arr)` | L218-L227 |
| 関数 | `uid(prefix)` | L229-L233 |
| 関数 | `deepClone(obj)` | L235-L238 |
| 関数 | `escapeHtml(str)` | L240-L247 |
| 関数 | `appendChildSafe(parent, child)` | L249-L262 |
| 関数 | `el(tag, attrs, children)` | L264-L306 |
| 公開データ/API | `HS.Utils` | L308-L337 |

### `js/storage.js` (281行) — IndexedDB主保存＋localStorage副保存＋チェックサム付き`HS1:`バックアップ文字列の入出力

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `DB_NAME` | L6 |
| 定数/定義 | `DB_VERSION` | L7 |
| 定数/定義 | `STORE_NAME` | L8 |
| 定数/定義 | `SAVE_KEY` | L9 |
| 定数/定義 | `LS_KEY` | L10 |
| 定数/定義 | `EXPORT_PREFIX` | L11 |
| 関数 | `computeChecksum(str)` | L17-L24 |
| 関数 | `utf8ToBase64(str)` | L26-L40 |
| 関数 | `base64ToUtf8(b64)` | L42-L55 |
| 関数 | `readLocalStorage()` | L57-L67 |
| 関数 | `writeLocalStorage(state)` | L69-L77 |
| 関数 | `removeLocalStorage()` | L79-L87 |
| 関数 | `init()` | L89-L125 |
| 関数 | `readIdb()` | L127-L146 |
| 関数 | `writeIdb(state)` | L148-L164 |
| 関数 | `clearIdb()` | L166-L182 |
| 関数 | `load()` | L184-L196 |
| 関数 | `save(state)` | L198-L212 |
| 関数 | `exportString(state)` | L214-L222 |
| 関数 | `importString(str)` | L224-L259 |
| 関数 | `clearAll()` | L261-L269 |
| 公開データ/API | `HS.Storage` | L271-L280 |

### `js/data/elements_races.js` (195行) — 6属性＆相性倍率・7種族・4ロール（控えリンク効果）・7世界観・17状態効果・37編成シナジー定義

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 公開データ/API | `D.ELEMENTS_META` | L7-L14 |
| 公開データ/API | `D.ELEMENT_ADVANTAGE` | L16-L33 |
| 公開データ/API | `D.RACES_META` | L35-L43 |
| 公開データ/API | `D.ROLES_META` | L45-L74 |
| 公開データ/API | `D.LINK_MATCH_BONUS` | L76-L87 |
| 公開データ/API | `D.WORLDS_META` | L89-L118 |
| 公開データ/API | `D.STATUS_META` | L120-L138 |
| 公開データ/API | `D.SYNERGIES` | L140-L194 |

### `js/data/abilities.js` (258行) — ロール共有アビリティ全100種（4ロール×5段階×5択）と段階解放コスト定義

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 公開データ/API | `D.ABILITY_TIER_COSTS` | L7-L13 |
| 定数/定義 | `ROLE_SPECS` | L16-L224 |
| 定数/定義 | `ABILITIES` | L226 |
| 定数/定義 | `ABILITY_BY_ID` | L227 |
| 公開データ/API | `D.ABILITIES` | L256 |
| 公開データ/API | `D.ABILITY_BY_ID` | L257 |

### `js/data/characters.js` (1525行) — 全28キャラ定義（基礎ステ・全3技/パッシブ・スキル覚醒I〜III・異界共鳴1〜5・入手ルート・ロア）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 関数 | `makeAwaken(areaMat1, areaMat2, areaMat3, specs)` | L7-L21 |
| 関数 | `makeResonance(matEarly, matMid, matLate, trait4Desc, trait4Mod)` | L23-L57 |
| 公開データ/API | `D.CHARACTERS` | L62-L1515 |
| 公開データ/API | `D.CHAR_BY_ID` | L1518 |

### `js/data/enemies.js` (732行) — 全48敵定義（通常24・エリアボス4・乱入8・超ボス3・タワー＆リレー強敵9）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 関数 | `sk(id, name, target, cd, power, desc, effects, extra)` | L7-L23 |
| 定数/定義 | `NORMAL_ENEMIES` | L26-L302 |
| 定数/定義 | `AREA_BOSSES` | L305-L372 |
| 定数/定義 | `INTRUDER_ENEMIES` | L375-L514 |
| 定数/定義 | `SUPERBOSSES` | L517-L561 |
| 定数/定義 | `ELITE_ENEMIES` | L564-L708 |
| 公開データ/API | `D.ENEMIES` | L710-L716 |
| 公開データ/API | `D.ALL_ENEMIES` | L718 |
| 公開データ/API | `D.ENEMY_BY_ID` | L725 |

### `js/data/equipment.js` (398行) — 全10装備セット（2/4セット効果）と全40装備アイテム（4部位・ランダムオプション無し）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 公開データ/API | `D.EQUIP_SETS` | L7-L128 |
| 公開データ/API | `D.EQUIP_DEFS` | L131-L391 |
| 公開データ/API | `D.EQUIP_SET_BY_ID` | L393 |
| 公開データ/API | `D.EQUIP_DEF_BY_ID` | L396 |

### `js/data/stages_pve.js` (602行) — 10素材/通貨・4エリア×10面(40面)・混線タワー20階・超ボス3体・リレー3難度・指名手配8件・別働隊6ルート・世界遺物12種

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 公開データ/API | `D.MATERIALS` | L8-L19 |
| 公開データ/API | `D.MATERIAL_LIST` | L21 |
| 定数/定義 | `AREA_CONFIGS` | L24-L129 |
| 公開データ/API | `D.AREAS` | L131 |
| 公開データ/API | `D.STAGE_BY_ID` | L132 |
| 定数/定義 | `TOWER_RULES` | L206-L215 |
| 定数/定義 | `TOWER_WORLDS` | L217 |
| 定数/定義 | `TOWER_POOLS` | L218-L223 |
| 定数/定義 | `TOWER_FLOOR_NAMES` | L225-L230 |
| 公開データ/API | `D.TOWER_FLOORS` | L232 |
| 公開データ/API | `D.TOWER_BY_ID` | L233 |
| 公開データ/API | `D.SUPERBOSSES` | L283-L332 |
| 公開データ/API | `D.SUPERBOSS_BY_ID` | L334 |
| 公開データ/API | `D.RELAY_RAIDS` | L338-L387 |
| 公開データ/API | `D.RELAY_BY_ID` | L389 |
| 公開データ/API | `D.BOUNTIES` | L393-L470 |
| 公開データ/API | `D.BOUNTY_BY_ID` | L472 |
| 公開データ/API | `D.EXPEDITIONS` | L476-L519 |
| 公開データ/API | `D.EXPEDITION_BY_ID` | L521 |
| 公開データ/API | `D.RELICS` | L525-L598 |
| 公開データ/API | `D.RELIC_BY_ID` | L600 |

### `js/engine/state.js` (1401行) — セーブ状態管理・パーティ/控えリンク/装備/自動売却/育成/加入/図鑑/設定の全ミューテーション＆イベントバス

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `DEFAULT_ROLES` | L12 |
| 定数/定義 | `DEFAULT_SLOTS` | L13 |
| 関数 | `getRoles()` | L15-L17 |
| 関数 | `getSlots()` | L19-L21 |
| 関数 | `genUid(prefix)` | L23-L26 |
| 関数 | `clamp(v, min, max)` | L28-L31 |
| 関数 | `deepClone(obj)` | L33-L36 |
| 関数 | `getCharsList()` | L38-L40 |
| 関数 | `getCharById(id)` | L42-L48 |
| 関数 | `getAbilitiesByRoleTier(role, tier)` | L50-L58 |
| 関数 | `getAbilityById(id)` | L60-L66 |
| 関数 | `getEquipDefById(id)` | L68-L74 |
| 関数 | `getRelicById(id)` | L76-L82 |
| 関数 | `getStarterCharIds()` | L84-L107 |
| 関数 | `getDefaultMaterials()` | L109-L131 |
| 関数 | `createEmptyCharProgress()` | L133-L139 |
| 関数 | `createDefaultState()` | L141-L282 |
| 関数 | `sanitizeState(raw)` | L284-L492 |
| 関数 | `emit(event, payload)` | L494-L512 |
| 関数 | `subscribe(event, fn)` | L514-L524 |
| 関数 | `saveNow()` | L526-L536 |
| 関数 | `scheduleSave()` | L538-L546 |
| 関数 | `notifyChange(subEvent, payload)` | L548-L552 |
| 関数 | `ensureInit()` | L554-L560 |
| 関数 | `removeCharFromExpeditions(charId)` | L562-L572 |
| 関数 | `normalizeCost(cost)` | L574-L586 |
| 関数 | `canAfford(cost)` | L588-L596 |
| 関数 | `spendCost(cost)` | L598-L608 |
| 関数 | `getEquippedOwner(uid)` | L610-L623 |
| 関数 | `getSellValue(item)` | L625-L632 |
| 関数 | `shouldAutoSell(item, ignoreEnabled)` | L634-L645 |
| 関数 | `getAbilityTierUnlockCost(role, tier)` | L647-L655 |
| 関数 | `getSkillAwakenCost(charId, skillIdx, nextLevel)` | L657-L666 |
| 関数 | `getResonanceCost(charId, nextStage)` | L668-L674 |
| 関数 | `getTavernCost(charObj)` | L676-L681 |
| 関数 | `findStageInfo(stageId)` | L683-L692 |
| 定数/定義 | `StateAPI` | L694-L1397 |
| APIメソッド | `.init()` | L695-L705 |
| APIメソッド | `.isReady()` | L707 |
| APIメソッド | `.get()` | L708 |
| APIメソッド | `.reset()` | L714-L727 |
| APIメソッド | `.exportSave()` | L729-L733 |
| APIメソッド | `.importSave(str)` | L735-L751 |
| APIメソッド | `.getGold()` | L753 |
| APIメソッド | `.getMaterial(matId)` | L754 |
| APIメソッド | `.addMaterial(matId, qty, silent)` | L756-L763 |
| APIメソッド | `.addMaterials(map, silent)` | L765-L773 |
| APIメソッド | `.spendCost(cost)` | L776-L780 |
| APIメソッド | `.isCharOwned(charId)` | L783 |
| APIメソッド | `.getOwnedChars()` | L785-L793 |
| APIメソッド | `.getCharProgress(charId)` | L795-L799 |
| APIメソッド | `.unlockChar(charId, source)` | L801-L811 |
| APIメソッド | `.recruitTavernChar(charId)` | L815-L825 |
| APIメソッド | `.isInParty(charId)` | L827 |
| APIメソッド | `.isInLinks(charId)` | L828 |
| APIメソッド | `.isInActivePartyOrLinks(charId)` | L829-L832 |
| APIメソッド | `.isInExpedition(charId)` | L833-L839 |
| APIメソッド | `.getLinkedChar(partySlotIdx)` | L840 |
| APIメソッド | `.getLinkedCharFor(charId)` | L841-L845 |
| APIメソッド | `.setPartySlot(slotIdx, charId)` | L847-L874 |
| APIメソッド | `.setLinkSlot(slotIdx, charId)` | L876-L899 |
| APIメソッド | `.getAvailableForLinks()` | L901-L904 |
| APIメソッド | `.getAvailableForExpedition(slotIdx)` | L906-L913 |
| APIメソッド | `.setRelaySlot(squadIdx, slotIdx, charId)` | L915-L934 |
| APIメソッド | `.toggleRelayChar(squadIdx, charId)` | L936-L954 |
| APIメソッド | `.autoFillRelaySquads()` | L956-L965 |
| APIメソッド | `.getItem(uid)` | L967-L971 |
| APIメソッド | `.equipItem(charId, uid)` | L975-L989 |
| APIメソッド | `.unequipSlot(charId, slot)` | L991-L998 |
| APIメソッド | `.autoEquipChar(charId)` | L1000-L1029 |
| APIメソッド | `.toggleLockItem(uid)` | L1031-L1038 |
| APIメソッド | `.receiveEquipment(defId, quality, opts)` | L1043-L1063 |
| APIメソッド | `.sellItem(uid)` | L1065-L1078 |
| APIメソッド | `.bulkAutoSell()` | L1080-L1102 |
| APIメソッド | `.updateAutoSell(patch)` | L1104-L1113 |
| APIメソッド | `.unlockAbilityTier(role, tier)` | L1117-L1135 |
| APIメソッド | `.equipAbility(role, tier, abilityId)` | L1137-L1150 |
| APIメソッド | `.equipExtraAbility(charId, tier, abilityId)` | L1152-L1173 |
| APIメソッド | `.awakenSkill(charId, skillIdx)` | L1177-L1191 |
| APIメソッド | `.advanceResonance(charId)` | L1195-L1219 |
| APIメソッド | `.unlockRelic(relicId)` | L1221-L1230 |
| APIメソッド | `.setRelicSlot(slotIdx, relicId)` | L1232-L1246 |
| APIメソッド | `.toggleEquipRelic(relicId)` | L1248-L1262 |
| APIメソッド | `.selectStage(areaId, stageId)` | L1264-L1270 |
| APIメソッド | `.isStageUnlocked(areaIdOrStageId, stageNum)` | L1272-L1288 |
| APIメソッド | `.isTowerFloorUnlocked(floorNum)` | L1290-L1293 |
| APIメソッド | `.recordStageClear(stageId)` | L1295-L1320 |
| APIメソッド | `.recordIntruderKill(intruderId)` | L1322-L1328 |
| APIメソッド | `.recordTowerClear(floorNum)` | L1330-L1339 |
| APIメソッド | `.recordSuperbossDamage(bossId, totalDamage)` | L1341-L1350 |
| APIメソッド | `.recordRelayClear(raidId)` | L1352-L1359 |
| APIメソッド | `.recordBountyClear(bountyId)` | L1361-L1368 |
| APIメソッド | `.markCodex(kind, id, silent)` | L1370-L1377 |
| APIメソッド | `.updateSettings(patch)` | L1379-L1388 |
| APIメソッド | `.cycleSpeed()` | L1390-L1396 |

### `js/engine/calc.js` (624行) — 最終ステータス合算（装備品質・セット・控えリンク・シナジー・ロールアビ・共鳴・パッシブ・遺物・タワー規則）＆差分計算

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `DEFAULT_SLOTS` | L7 |
| 関数 | `clamp(v, min, max)` | L9-L12 |
| 関数 | `getCharById(id)` | L14-L20 |
| 関数 | `getEquipDefById(id)` | L22-L28 |
| 関数 | `getEquipSetById(id)` | L30-L36 |
| 関数 | `getAbilityById(id)` | L38-L44 |
| 関数 | `getRelicById(id)` | L46-L52 |
| 関数 | `createEmptyModifiers()` | L55-L75 |
| 関数 | `applyMod(acc, mod, scale)` | L77-L138 |
| 関数 | `calcQualityMultiplier(quality)` | L141-L148 |
| 関数 | `calcEquipStats(defId, quality)` | L150-L168 |
| 関数 | `evaluateSynergy(syn, counts)` | L170-L180 |
| 関数 | `getSynergyFamilyKey(syn)` | L182-L189 |
| 関数 | `calcPartySynergies(partyIds, linkIds)` | L191-L270 |
| 関数 | `calcLinkBonus(frontCharId, linkCharId)` | L272-L310 |
| 関数 | `resolveEquipEntry(entry, s)` | L312-L328 |
| 関数 | `calcUnitStats(charId, opts)` | L330-L560 |
| 関数 | `calcStatDiff(before, after)` | L562-L574 |
| 関数 | `calcPartySummary(partyIds, linkIds, opts)` | L576-L593 |
| 関数 | `calcPartyDropBonuses()` | L595-L607 |
| 定数/定義 | `CalcAPI` | L609-L620 |

### `js/engine/expedition.js` (364行) — 出撃勝利数連動・別働隊2枠エンジン（実時間タイマー無し・複合種族W適性・自動再出撃/停止再開）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 関数 | `randInt(min, max)` | L7-L10 |
| 関数 | `pickRandom(arr)` | L12-L16 |
| 関数 | `getRouteById(routeId)` | L18-L25 |
| 関数 | `getCharById(id)` | L27-L33 |
| 関数 | `getEquipDefsBySetIds(setIds)` | L35-L40 |
| 関数 | `evaluateSquad(routeId, charIds)` | L42-L118 |
| 関数 | `rollQuality(qRange, bonus)` | L120-L128 |
| 定数/定義 | `ExpeditionAPI` | L130-L360 |
| APIメソッド | `.getRoutes()` | L131-L133 |
| APIメソッド | `.getSlot(slotIdx)` | L138-L141 |
| APIメソッド | `.setRoute(slotIdx, routeId)` | L143-L157 |
| APIメソッド | `.setAutoRestart(slotIdx, enabled)` | L159-L171 |
| APIメソッド | `.resume(slotIdx)` | L173-L186 |
| APIメソッド | `.restart(slotIdx)` | L188-L190 |
| APIメソッド | `.toggleChar(slotIdx, charId)` | L192-L221 |
| APIメソッド | `.setSquad(slotIdx, charIds)` | L223-L243 |
| APIメソッド | `.autoFillSquad(slotIdx)` | L245-L269 |
| APIメソッド | `.onBattleWin(context)` | L272-L359 |

### `js/engine/battle.js` (2040行) — 逐次ATBバトルエンジン（攻撃中ゲージ継続進行・乱入・自動周回/今回で停止・4指標累計DPS・5大PvEモード制御）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `GAUGE_MAX` | L7 |
| 定数/定義 | `BASE_GAUGE_RATE` | L8 |
| 定数/定義 | `ACTION_LOCK_BASE_MS` | L9 |
| 定数/定義 | `WAVE_DELAY_BASE_MS` | L10 |
| 定数/定義 | `REPEAT_DELAY_BASE_MS` | L11 |
| 定数/定義 | `MAX_LOG_ENTRIES` | L12 |
| 関数 | `createIdleState()` | L18-L61 |
| 関数 | `clamp(v, min, max)` | L63-L65 |
| 関数 | `randInt(min, max)` | L67-L70 |
| 関数 | `pickRandom(arr)` | L72-L75 |
| 関数 | `emit(event, payload)` | L77-L95 |
| 関数 | `subscribe(event, fn)` | L97-L107 |
| 関数 | `pushLog(tag, text, kind, meta)` | L109-L126 |
| 関数 | `getCharById(id)` | L129-L135 |
| 関数 | `getEnemyById(id)` | L137-L143 |
| 関数 | `getStageData(stageId)` | L145-L157 |
| 関数 | `getTowerFloor(floorIdOrNum)` | L159-L170 |
| 関数 | `getSuperboss(bossId)` | L172-L176 |
| 関数 | `getRelayRaid(raidId)` | L178-L182 |
| 関数 | `getBounty(bountyId)` | L184-L188 |
| 関数 | `getElementAdvantage(atkEl, defEl)` | L190-L195 |
| 関数 | `getTargetLabel(target)` | L197-L201 |
| 関数 | `getStatusLabel(statusId)` | L203-L205 |
| 関数 | `getStatusKind(statusId)` | L207-L214 |
| 関数 | `cloneEffect(ef)` | L217-L221 |
| 関数 | `normalizeSkills(rawSkills, fallbackName, awakenLevels)` | L223-L319 |
| 関数 | `buildAllyUnit(charId, slotIdx, partyIds, linkIds, towerRule)` | L321-L366 |
| 関数 | `buildEnemyUnit(enemyDefOrId, slotIdx, scaleFactor, flags)` | L368-L434 |
| 関数 | `hasStatus(unit, id)` | L437-L440 |
| 関数 | `applyStatus(target, id, turns, source)` | L442-L463 |
| 関数 | `cleanseStatuses(target, count)` | L465-L475 |
| 関数 | `dispelBuffs(target, count)` | L477-L487 |
| 関数 | `tickDownStatuses(unit)` | L489-L494 |
| 関数 | `getEffectiveSpeed(unit)` | L496-L502 |
| 関数 | `initDpsEntries(allies)` | L505-L516 |
| 関数 | `recordDps(charId, metric, amount)` | L518-L528 |
| 関数 | `spawnStageWave(wave)` | L531-L579 |
| 関数 | `spawnTowerWave(wave)` | L581-L600 |
| 関数 | `spawnSuperbossWave()` | L602-L612 |
| 関数 | `spawnRelayPhase(phaseNum)` | L614-L628 |
| 関数 | `spawnBountyWave(wave)` | L630-L648 |
| 関数 | `applyWaveStartTeamEffects()` | L650-L685 |
| 関数 | `spawnCurrentWave()` | L687-L708 |
| 関数 | `skillHasEffect(skill, typeName)` | L711-L713 |
| 関数 | `selectSkill(actor)` | L715-L765 |
| 関数 | `pickLowestHpAlly(livingAllies, fallback)` | L767-L773 |
| 関数 | `pickLowestGaugeAlly(actor, livingAllies)` | L775-L783 |
| 関数 | `resolveTargetsForScope(actor, scope, defaultTargets, ef)` | L785-L834 |
| 関数 | `pickPrimaryTargets(actor, skill)` | L836-L892 |
| 関数 | `tryHealerAutoRevive(fallenUnit)` | L894-L910 |
| 関数 | `handleUnitDefeat(target, killer, opts)` | L912-L929 |
| 関数 | `findUnitBySourceId(sourceId)` | L931-L938 |
| 関数 | `applyDamage(attacker, target, rawPower, opts)` | L940-L1058 |
| 関数 | `applyHealEffect(healer, target, ef)` | L1060-L1091 |
| 関数 | `processStartOfTurn(actor)` | L1093-L1123 |
| 関数 | `processEndOfTurnDots(actor)` | L1125-L1150 |
| 関数 | `executeTurn(actor)` | L1152-L1330 |
| 関数 | `rollEquipmentDrop(setIds, qRange, bonusQuality)` | L1333-L1352 |
| 関数 | `grantBattleRewards(won)` | L1354-L1535 |
| 関数 | `accumulateRepeatLoot(loot)` | L1537-L1576 |
| 関数 | `finishRun(won)` | L1578-L1617 |
| 関数 | `deployRelaySquad(squadIdx)` | L1619-L1636 |
| 関数 | `checkBattleProgress()` | L1638-L1684 |
| 関数 | `setupRunEntities(isRepeatContinuation)` | L1686-L1730 |
| 関数 | `getDpsSnapshot()` | L1732-L1743 |
| 関数 | `getTurnOrderPreview(count)` | L1745-L1792 |
| 定数/定義 | `BattleAPI` | L1794-L2036 |
| APIメソッド | `.getState()` | L1798 |
| APIメソッド | `.isActive()` | L1799 |
| APIメソッド | `.isLocked()` | L1800 |
| APIメソッド | `.startBattle(config)` | L1803-L1879 |
| APIメソッド | `.tick(dtMs)` | L1881-L1952 |
| APIメソッド | `.setAutoRepeat(enabled)` | L1954-L1974 |
| APIメソッド | `.toggleAutoRepeat()` | L1976-L1983 |
| APIメソッド | `.requestStopAfterCurrent()` | L1985-L1991 |
| APIメソッド | `.retreat()` | L1993-L2012 |
| APIメソッド | `.closeResult()` | L2014-L2020 |
| APIメソッド | `.getNextStageId(stageId)` | L2025-L2035 |

### `js/ui/anim.js` (648行) — 単一rAFループ・GPU専用`scaleX`ゲージ更新・28ノード固定ダメージポップアッププール・カットイン帯・世界観切替

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `POPUP_POOL_SIZE` | L6 |
| 定数/定義 | `MAX_DT_MS` | L7 |
| 定数/定義 | `VALID_KINDS` | L9-L18 |
| 関数 | `getSettings()` | L52-L58 |
| 関数 | `clamp01(v)` | L60-L65 |
| 関数 | `clampRange(v, lo, hi)` | L67-L70 |
| 関数 | `setWorldTheme(worldId)` | L76-L94 |
| 関数 | `getWorldTheme()` | L96-L98 |
| 関数 | `computeSeamTopPx()` | L104-L123 |
| 関数 | `initFxLayer(layerEl)` | L129-L193 |
| 関数 | `ensureFxReady()` | L195-L200 |
| 関数 | `setGauge(el, ratio)` | L206-L215 |
| 関数 | `setHpGauge(fillEl, delayEl, ratio)` | L220-L233 |
| 関数 | `spawnPopup(opts)` | L240-L317 |
| 関数 | `showCutin(opts)` | L322-L349 |
| 関数 | `showIntruderBanner(enemyName, extraText)` | L354-L369 |
| 関数 | `triggerFlash(color)` | L374-L390 |
| 関数 | `pulseCardClass(cardEl, className, durationMs)` | L395-L416 |
| 関数 | `triggerHitShake(cardEl)` | L418-L421 |
| 関数 | `triggerHealPulse(cardEl)` | L423-L425 |
| 関数 | `clearFx()` | L430-L453 |
| 関数 | `updateFx(dt)` | L455-L521 |
| 関数 | `addFrameListener(fn)` | L523-L528 |
| 関数 | `removeFrameListener(fn)` | L530-L535 |
| 関数 | `tickFrame(timestamp)` | L537-L577 |
| 関数 | `handleVisibilityChange()` | L579-L595 |
| 関数 | `startLoop()` | L599-L612 |
| 関数 | `stopLoop()` | L614-L621 |
| 関数 | `isRunning()` | L623-L625 |
| 公開データ/API | `HS.Anim` | L627-L647 |

### `js/ui/app.js` (666行) — アプリ起動・下5タブナビ＆戦闘中移動ロック・下50%限定ボトムシート・自動売却シート・最新1件トースト・WakeLock・SW安全登録

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `NAV_TABS` | L7-L13 |
| 定数/定義 | `TAB_TITLES` | L15-L21 |
| 定数/定義 | `BATTLE_MODE_LABELS` | L23-L29 |
| 関数 | `fmt(n)` | L56-L59 |
| 関数 | `h(tag, className, text)` | L61-L66 |
| 関数 | `getViewForTab(tabId)` | L68-L75 |
| 関数 | `findStageSummary(stageId)` | L77-L94 |
| 関数 | `renderTopHud()` | L101-L145 |
| 関数 | `syncBattleLockUI()` | L151-L162 |
| 関数 | `mountBottomNav()` | L164-L185 |
| 関数 | `openSheet(opts)` | L191-L217 |
| 関数 | `closeSheet()` | L219-L231 |
| 関数 | `openAutoSellSheet(onUpdated)` | L234-L327 |
| 関数 | `clearToast()` | L334-L342 |
| 関数 | `showToast(msg, kind)` | L344-L360 |
| 関数 | `isWakeLockSupported()` | L366-L368 |
| 関数 | `acquireWakeLock()` | L370-L383 |
| 関数 | `releaseWakeLock()` | L385-L390 |
| 関数 | `setWakeLock(enabled)` | L392-L409 |
| 関数 | `toggleWakeLock()` | L411-L414 |
| 関数 | `registerMobileGuards()` | L420-L443 |
| 関数 | `registerServiceWorkerSafely()` | L445-L452 |
| 定数/定義 | `App` | L458-L652 |
| APIメソッド | `.boot()` | L459-L559 |
| APIメソッド | `.switchTab(tabId, opts)` | L561-L608 |
| APIメソッド | `.startBattle(config)` | L610-L623 |
| APIメソッド | `.refreshCurrentView()` | L625-L631 |
| APIメソッド | `.getCurrentTab()` | L633-L635 |
| APIメソッド | `.getElements()` | L637-L639 |
| APIメソッド | `.isWakeLockActive()` | L651 |

### `js/ui/battle_view.js` (1903行) — 戦闘タブUI（待機/戦闘中/通常リザルト/周回リザルト・行動順4枠・バフ最大2チップ+N・ログ・4指標DPS・戦術確認）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `DPS_METRICS` | L7-L12 |
| 定数/定義 | `CARD_SCOPE_SHORT` | L15-L22 |
| 関数 | `fmt(n)` | L46-L49 |
| 関数 | `fmtExact(n)` | L51-L54 |
| 関数 | `elMeta(elId)` | L56-L59 |
| 関数 | `raceMeta(raceId)` | L61-L64 |
| 関数 | `roleMeta(roleId)` | L66-L69 |
| 関数 | `statusMeta(stId)` | L71-L74 |
| 関数 | `getMatMeta(matId)` | L76-L86 |
| 関数 | `getCharById(id)` | L88-L94 |
| 関数 | `getEnemyById(id)` | L96-L102 |
| 関数 | `getSetById(id)` | L104-L110 |
| 関数 | `getRelicById(id)` | L112-L118 |
| 関数 | `findStageInfo(stageId)` | L120-L132 |
| 関数 | `findTowerFloor(floorNum)` | L134-L142 |
| 関数 | `getTowerRuleLabel(bState)` | L144-L162 |
| 関数 | `getQualityTierClass(q)` | L164-L172 |
| 関数 | `getQualityBadgeText(q)` | L174-L177 |
| 関数 | `raceIconsText(races)` | L179-L184 |
| 関数 | `getShortLinkPassive(roleId)` | L186-L192 |
| 関数 | `h(tag, className, text)` | L194-L199 |
| 関数 | `isBattleRunningPhase(phase)` | L201-L203 |
| 関数 | `getBattlePhaseCategory(bState)` | L205-L210 |
| 関数 | `makeStatItem(k, v)` | L216-L221 |
| 関数 | `renderUpperIdle()` | L223-L391 |
| 関数 | `formatUnitHpLabel(unit)` | L393-L398 |
| 関数 | `buildUnitCard(unit, bState)` | L400-L495 |
| 関数 | `syncUnitBuffs(ref, unit)` | L502-L522 |
| 関数 | `renderUpperActiveBattle()` | L524-L572 |
| 関数 | `rebuildBattleMeta(bState)` | L574-L601 |
| 関数 | `rebuildEnemyCards(bState)` | L603-L614 |
| 関数 | `rebuildAllyCards(bState)` | L616-L626 |
| 関数 | `syncTurnOrder(bState)` | L631-L705 |
| 定数/定義 | `SKILL_NUM_BADGES` | L707 |
| 関数 | `formatUnitSkillLabel(u, isDead, isActing)` | L709-L718 |
| 関数 | `syncUnitStates(bState)` | L720-L770 |
| 関数 | `buildResultMiniDpsSection(dpsSnap, titleLabel)` | L776-L826 |
| 関数 | `renderUpperNormalResult(bState)` | L829-L935 |
| 関数 | `renderUpperRepeatResult(bState)` | L938-L1025 |
| 関数 | `makeKpi(label, val)` | L1027-L1032 |
| 関数 | `renderUpper()` | L1034-L1049 |
| 関数 | `renderLowerShell()` | L1055-L1096 |
| 関数 | `updateSubTabButtons()` | L1098-L1103 |
| 関数 | `renderLowerContent()` | L1105-L1120 |
| 関数 | `mapLogRowClass(entry)` | L1123-L1135 |
| 関数 | `createLogRowNode(entry)` | L1137-L1143 |
| 関数 | `buildLogPanel(container)` | L1145-L1179 |
| 関数 | `syncLogs(forceRebuild)` | L1181-L1222 |
| 関数 | `buildDpsPanel(container)` | L1225-L1287 |
| 関数 | `syncDpsPanel()` | L1289-L1358 |
| 関数 | `makePreviewRow(title, badgeText, descText)` | L1361-L1369 |
| 関数 | `buildTacticsPanel(container)` | L1371-L1451 |
| 関数 | `makeCtxBtn(label, cls, onClick, disabled)` | L1457-L1463 |
| 関数 | `openRetreatConfirmSheet()` | L1465-L1501 |
| 関数 | `renderContextBar()` | L1503-L1620 |
| 関数 | `onBattleAction(evt)` | L1626-L1700 |
| 関数 | `onFrame()` | L1702-L1726 |
| 関数 | `bindSubscriptions()` | L1728-L1861 |
| 関数 | `clearSubscriptions()` | L1863-L1871 |
| 定数/定義 | `BattleView` | L1873-L1900 |
| APIメソッド | `.mount(uEl, lEl, cEl)` | L1874-L1882 |
| APIメソッド | `.unmount()` | L1884-L1892 |
| APIメソッド | `.render()` | L1894-L1899 |

### `js/ui/party_view.js` (1353行) — 編成タブUI（出撃4枠・控えリンク4枠・装備換装・世界遺物3枠・上50%リアルタイム差分プレビュー）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `MODE_TABS` | L22-L27 |
| 定数/定義 | `LINK_SHORT` | L29-L34 |
| 関数 | `el(tag, attrs, children)` | L36-L38 |
| 関数 | `fmt(n)` | L40-L42 |
| 関数 | `fmtPctVal(v, isCritDmg)` | L44-L50 |
| 関数 | `fmtDiffVal(delta, isPct, isCritDmg)` | L52-L64 |
| 関数 | `getChar(id)` | L66-L68 |
| 関数 | `getEquipDef(id)` | L70-L72 |
| 関数 | `getEquipSet(id)` | L74-L76 |
| 関数 | `getRelic(id)` | L78-L80 |
| 関数 | `getElementMeta(elId)` | L82-L84 |
| 関数 | `getRoleMeta(roleId)` | L86-L88 |
| 関数 | `getRaceMeta(raceId)` | L90-L92 |
| 関数 | `getWorldMeta(worldId)` | L94-L96 |
| 関数 | `makeElBadge(elId)` | L98-L101 |
| 関数 | `makeRoleBadge(roleId)` | L103-L106 |
| 関数 | `makeRaceText(races)` | L108-L114 |
| 関数 | `makeQualityPill(q)` | L116-L120 |
| 関数 | `setWorld(worldId)` | L122-L126 |
| 関数 | `toast(msg, kind)` | L128-L132 |
| 関数 | `getSavedScrollTop()` | L134-L138 |
| 関数 | `restoreScrollTop(top)` | L140-L144 |
| 関数 | `clearPreviews()` | L146-L151 |
| 関数 | `buildStatCell(label, valText, diffVal, isPct, isCritDmg)` | L153-L164 |
| 関数 | `buildStatGrid(baseStats, diffObj)` | L166-L178 |
| 関数 | `buildSynergyDiffStrip(beforeSyns, afterSyns)` | L180-L208 |
| 関数 | `simulatePartyAssignment(s, slotIdx, charId)` | L210-L228 |
| 関数 | `simulateLinkAssignment(s, slotIdx, charId)` | L230-L245 |
| 関数 | `summarizeEquipBaseStats(defId, quality)` | L247-L258 |
| 関数 | `makeCompactSetTag(uStats)` | L260-L267 |
| 関数 | `renderUpperParty(s)` | L273-L417 |
| 関数 | `renderUpperLink(s)` | L419-L499 |
| 関数 | `renderUpperEquip(s)` | L501-L639 |
| 関数 | `renderUpperRelic(s)` | L641-L732 |
| 関数 | `renderLowerParty(s)` | L738-L855 |
| 関数 | `renderLowerLink(s)` | L857-L1009 |
| 関数 | `renderLowerEquip(s)` | L1011-L1191 |
| 関数 | `renderLowerRelic(s)` | L1193-L1275 |
| 関数 | `renderContextBar()` | L1277-L1292 |
| 関数 | `render()` | L1294-L1318 |
| 定数/定義 | `PartyView` | L1320-L1350 |
| APIメソッド | `.mount(upperEl, lowerEl, ctxEl)` | L1321-L1336 |
| APIメソッド | `.unmount()` | L1338-L1347 |

### `js/ui/growth_view.js` (1040行) — 育成タブUI（ロール共有アビ・スキル覚醒I〜III・異界共鳴1〜5＆5段階2枠追加・酒場加入）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `MODE_TABS` | L21-L26 |
| 定数/定義 | `ROMAN` | L28 |
| 関数 | `el(tag, attrs, children)` | L30-L32 |
| 関数 | `fmt(n)` | L34-L36 |
| 関数 | `fmtPctVal(v, isCritDmg)` | L38-L42 |
| 関数 | `fmtDiffVal(delta, isPct, isCritDmg)` | L44-L56 |
| 関数 | `getChar(id)` | L58-L60 |
| 関数 | `getAbility(id)` | L62-L64 |
| 関数 | `getRoleAbilities(role, tier)` | L66-L70 |
| 関数 | `getElementMeta(elId)` | L72-L74 |
| 関数 | `getRoleMeta(roleId)` | L76-L78 |
| 関数 | `getRaceText(races)` | L80-L85 |
| 関数 | `getWorldMeta(wId)` | L87-L89 |
| 関数 | `getMatMeta(matId)` | L91-L93 |
| 関数 | `setWorld(wId)` | L95-L99 |
| 関数 | `toast(msg, kind)` | L101-L105 |
| 関数 | `makeElBadge(elId)` | L107-L110 |
| 関数 | `makeRoleBadge(roleId)` | L112-L115 |
| 関数 | `makeCostBadges(cost, showOwned)` | L117-L129 |
| 関数 | `buildStatCell(label, valText, diffVal, isPct, isCritDmg)` | L131-L138 |
| 関数 | `makeTwoRowSkill(sk, extraBadge)` | L140-L152 |
| 関数 | `ensureSelectedChar(s)` | L154-L158 |
| 関数 | `defaultResFocus(charId)` | L160-L164 |
| 関数 | `getTavernChars()` | L166-L170 |
| 関数 | `getSavedScrollTop()` | L172-L176 |
| 関数 | `restoreScrollTop(top)` | L178-L182 |
| 関数 | `openCharPickerSheet(title, onPick)` | L184-L234 |
| 関数 | `openExtraAbilitySheet(charId, tier)` | L236-L295 |
| 関数 | `renderCharQuickBar(s, onSelect)` | L298-L325 |
| 関数 | `renderUpperAbility(s)` | L331-L427 |
| 関数 | `renderUpperAwaken(s)` | L429-L507 |
| 関数 | `renderUpperResonance(s)` | L509-L590 |
| 関数 | `renderUpperTavern(s)` | L592-L631 |
| 関数 | `renderLowerAbility(s)` | L637-L735 |
| 関数 | `renderLowerAwaken(s)` | L737-L805 |
| 関数 | `renderLowerResonance(s)` | L807-L896 |
| 関数 | `renderLowerTavern(s)` | L898-L963 |
| 関数 | `renderContextBar()` | L965-L982 |
| 関数 | `render()` | L984-L1008 |
| 定数/定義 | `GrowthView` | L1010-L1037 |
| APIメソッド | `.mount(upperEl, lowerEl, ctxEl)` | L1011-L1024 |
| APIメソッド | `.unmount()` | L1026-L1034 |

### `js/ui/quest_view.js` (1195行) — 冒険タブUI（メイン冒険・混線タワー20階・超ボス3体・多部隊リレー3軍編成・指名手配8件・別働隊2枠）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `CTX_TABS` | L24-L31 |
| 関数 | `el(tag, attrs, children)` | L33-L35 |
| 関数 | `fmt(n)` | L37-L39 |
| 関数 | `setWorld(wId)` | L41-L45 |
| 関数 | `toast(msg, kind)` | L47-L51 |
| 関数 | `getChar(id)` | L53-L55 |
| 関数 | `getEnemy(id)` | L57-L59 |
| 関数 | `getEquipSet(id)` | L61-L63 |
| 関数 | `getRelic(id)` | L65-L67 |
| 関数 | `getMatMeta(id)` | L69-L71 |
| 関数 | `getElementMeta(id)` | L73-L75 |
| 関数 | `getRoleMeta(id)` | L77-L79 |
| 関数 | `getRaceMeta(id)` | L81-L83 |
| 関数 | `getWorldMeta(id)` | L85-L87 |
| 関数 | `makeElBadge(elId)` | L89-L92 |
| 関数 | `makeRoleBadge(roleId)` | L94-L97 |
| 関数 | `makeRaceText(races)` | L99-L104 |
| 関数 | `makeTwoRowSkill(sk)` | L106-L115 |
| 関数 | `makeDropSetPreview(dropSetIds)` | L117-L125 |
| 関数 | `getSavedScrollTop()` | L127-L131 |
| 関数 | `restoreScrollTop(top)` | L133-L137 |
| 関数 | `makeScaleGauge(ratio, fillColor)` | L139-L161 |
| 関数 | `ensureSelections(s)` | L163-L182 |
| 関数 | `getAreaById(areaId)` | L184-L190 |
| 関数 | `renderUpperStage(s)` | L196-L278 |
| 関数 | `renderUpperTower(s)` | L280-L339 |
| 関数 | `renderUpperSuperboss(s)` | L341-L406 |
| 関数 | `renderUpperRelay(s)` | L408-L483 |
| 関数 | `renderUpperBounty(s)` | L485-L542 |
| 関数 | `renderUpperExpedition(s)` | L544-L614 |
| 関数 | `renderLowerStage(s)` | L620-L694 |
| 関数 | `renderLowerTower(s)` | L696-L754 |
| 関数 | `renderLowerSuperboss(s)` | L756-L799 |
| 関数 | `renderLowerRelay(s)` | L801-L888 |
| 関数 | `renderLowerBounty(s)` | L890-L959 |
| 関数 | `renderLowerExpedition(s)` | L961-L1113 |
| 関数 | `renderContextBar(s)` | L1115-L1130 |
| 関数 | `render()` | L1132-L1163 |
| 定数/定義 | `QuestView` | L1165-L1192 |
| APIメソッド | `.mount(upperEl, lowerEl, ctxEl)` | L1166-L1179 |
| APIメソッド | `.unmount()` | L1181-L1189 |

### `js/ui/codex_view.js` (940行) — 図鑑・設定タブUI（観賞用図鑑4種［ステボーナス無し］・設定・バックアップ文字列/ファイル保存・2段階初期化）

| 種別 | 定義名 | 行番号 |
| --- | --- | --- |
| 定数/定義 | `HS` | L4 |
| 定数/定義 | `MODE_TABS` | L20-L26 |
| 定数/定義 | `ENEMY_FILTERS` | L28-L34 |
| 定数/定義 | `ABILITY_FILTERS` | L36-L42 |
| 定数/定義 | `ENEMY_KIND_LABELS` | L44-L50 |
| 関数 | `el(tag, attrs, children)` | L52-L54 |
| 関数 | `fmt(n)` | L56-L58 |
| 関数 | `fmtPctVal(v, isCritDmg)` | L60-L64 |
| 関数 | `setWorld(wId)` | L66-L70 |
| 関数 | `toast(msg, kind)` | L72-L76 |
| 関数 | `getElementMeta(id)` | L78-L80 |
| 関数 | `getRoleMeta(id)` | L82-L84 |
| 関数 | `getRaceText(races)` | L86-L91 |
| 関数 | `getWorldMeta(id)` | L93-L95 |
| 関数 | `makeElBadge(elId)` | L97-L100 |
| 関数 | `makeRoleBadge(roleId)` | L102-L105 |
| 関数 | `makeTwoRowSkill(sk)` | L107-L116 |
| 関数 | `getSavedScrollTop()` | L118-L122 |
| 関数 | `restoreScrollTop(top)` | L124-L128 |
| 関数 | `buildStatCell(label, val)` | L130-L135 |
| 関数 | `summarizeEquipStats(defId, q)` | L137-L148 |
| 関数 | `getEnemyDropHint(enemyId)` | L150-L169 |
| 関数 | `renderUpperChars(s, sorted)` | L175-L237 |
| 関数 | `renderUpperEnemies(s, filtered)` | L239-L303 |
| 関数 | `renderUpperEquips(s, sorted)` | L305-L373 |
| 関数 | `renderUpperAbilities(s, filtered)` | L375-L435 |
| 関数 | `renderUpperSettings(s)` | L437-L475 |
| 関数 | `renderLowerCodexList(title, discoveredCount, totalCount, rowNodes, filterBarNode)` | L481-L494 |
| 関数 | `renderLowerChars(s, sorted)` | L496-L521 |
| 関数 | `filterEnemies(sorted)` | L523-L529 |
| 関数 | `renderLowerEnemies(s, allSorted, filtered)` | L531-L566 |
| 関数 | `renderLowerEquips(s, sorted)` | L568-L594 |
| 関数 | `filterAbilities(sorted)` | L596-L599 |
| 関数 | `renderLowerAbilities(s, allSorted, filtered)` | L601-L636 |
| 関数 | `openExportSheet()` | L640-L704 |
| 関数 | `openImportSheet()` | L706-L741 |
| 関数 | `openResetConfirmSheet()` | L743-L785 |
| 関数 | `renderLowerSettings(s)` | L787-L858 |
| 関数 | `renderContextBar()` | L860-L874 |
| 関数 | `render()` | L876-L909 |
| 定数/定義 | `CodexView` | L911-L937 |
| APIメソッド | `.mount(upperEl, lowerEl, ctxEl)` | L912-L924 |
| APIメソッド | `.unmount()` | L926-L934 |
