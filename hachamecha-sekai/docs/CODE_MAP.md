# 『はちゃめちゃ世界』精密コード地図（CODE_MAP）

トークン消費を抑えるため、改修時はこの地図から**該当ファイルと行番号だけ**を参照してピンポイント読み込みしてください。
（総ファイル数: **32ファイル** / アプリ本体容量: **約300KB** / 外部依存ゼロ）

---

## 1. やりたいこと別 逆引きインデックス

| やりたいこと | 対象ファイル & 行番号 |
|---|---|
| iOS Safe Area・誤操作防止・カラー変数 | `css/base.css` L1-161 / `index.html` L1-20 |
| 上半分表示専用・下半分親指操作・ボトムナビ・ボトムシート | `css/layout.css` L20-234 |
| 行動順バー・ログ1行固定・DPSバー・スキルカード・D&D枠見た目 | `css/components.css` L202-1051 |
| 属性・相性倍率・種族・ロールアビリティ・厳格ソート・3倍速上限・異変定義 | `js/core/constants.js` L9-219 |
| 数値整形・パーティシナジー計算・最終ステータス計算 | `js/core/utils.js` L33-281 |
| オフライン二重保存（IndexedDB/LS）・セーブコード入出力 | `js/core/storage.js` L15-157 |
| 効果音（Web Audio 合成音） | `js/core/audio.js` L37-101 |
| キャラ追加・技3種・専用武器定義（全21体） | `js/data/units.js` L10-469 |
| 冒険20面・属性ボス6体・無限カオス塔の敵と報酬調整 | `js/data/stages.js` L9-328 |
| ハクスラ装備生成・付加効果・強化コスト・自動売却ルール判定 | `js/data/equipment.js` L9-158 |
| 初期セーブ・セーブ後方互換・育成/編成/装備/オフライン報酬ロジック | `js/game/state.js` L11-570 |
| ATB行動順・ダメ/回復/障壁計算・専用武器パッシブ・異変・周回制御 | `js/game/combat.js` L37-1049 |
| Canvas2D 戦場背景・幾何学エンブレム配置・VFX・ポップアップ描画 | `js/game/renderer.js` L10-279 |
| Pointer Events ドラッグ＆ドロップ制御 | `js/ui/dragdrop.js` L13-158 |
| 出撃準備・戦闘中HUD・1行ログ・4指標DPS・通常/周回別リザルトUI | `js/ui/render-battle.js` L9-716 |
| 編成画面（4スロット・シナジー・厳格ソート一覧） | `js/ui/render-party.js` L9-155 |
| 育成画面（Lv/覚醒/魂片加入・専用武器モーダル） | `js/ui/render-units.js` L9-179 |
| 装備画面（D&D装着/売却・強化・自動売却設定モーダル） | `js/ui/render-gear.js` L9-227 |
| 記録画面（放置報酬・図鑑・セーブ書出/読込・初期化） | `js/ui/render-world.js` L9-185 |
| タブ切替（戦闘中ロック）・全クリック/D&D振り分け・メインループ | `js/main.js` L9-816 |
| オフラインキャッシュ一覧・キャッシュバージョン更新 | `sw.js` L1-73 |
| GitHub Actions 公開 / Capacitor iOS 設定 | `.github/workflows/deploy-pages.yml` / `capacitor.config.json` |

---

## 2. ファイル別 詳細行番号マップ

### ルート構成ファイル
- `index.html` (76L)
  - L1-20: Viewport (`viewport-fit=cover`)・PWAマニフェスト・iOSアイコン・CSS読込
  - L23-27: `#upper-zone`（`#top-bar`, `#upper-content`）
  - L31-34: `#lower-zone`（`#lower-content`, `#bottom-nav`）
  - L37-45: `#sheet-backdrop`, `#bottom-sheet`, `#toast-box`, `#drag-ghost`
  - L49-73: `<script defer>` 読込順（core → data → game → ui → main）
- `sw.js` (73L)
  - L1: `CACHE_NAME`（更新時は必ずバージョンアップ）
  - L2-29: `PRECACHE_ASSETS`（相対パス配列）
  - L31-43: `install`（`cache: 'reload'` で最新プリキャッシュ＋`skipWaiting`）
  - L54-72: `fetch`（Network-First＋オフラインキャッシュフォールバック）
- `manifest.webmanifest` (26L) / `.nojekyll` / `capacitor.config.json` (16L) / `.github/workflows/deploy-pages.yml` (40L)

### CSS (`css/`)
- `css/base.css` (161L)
  - L5-50: CSS変数（背景・ネオン色・属性色・レアリティ色・`--sat/sab/sal/sar`）
  - L52-80: リセット・iOS長押し/選択/ダブルタップズーム抑止・`100dvh`固定
  - L104-111: `input, textarea` の `font-size: 16px` 固定（iOS自動ズーム防止）
  - L145-161: `.scroll-box`（許可領域のみスクロール）
- `css/layout.css` (289L)
  - L5-39: `#app-shell`, `#app-frame`（Safe Area padding・480px縦画面枠）
  - L42-75: `#upper-zone`（47%・`pointer-events: none`）, `#top-bar`, `#upper-content`
  - L77-89: `#chaos-divider`（ネオン境界アニメ）
  - L91-162: `#lower-zone`（53%）, `#lower-content`, `#bottom-nav`, `.nav-btn.locked`
  - L164-233: `#sheet-backdrop`, `#bottom-sheet`, `.sheet-head/.sheet-body/.sheet-foot`
  - L235-289: `#toast-box`, `#drag-ghost`
- `css/components.css` (1051L)
  - L1-188: リソースピル・ボタン各種・属性/種族/ロール/レアタグ・`.unit-crest` 幾何学紋章
  - L202-261: `.order-bar`・`.order-chip`（6枠均等表示）
  - L263-353: `.arena-stage`, `#battle-canvas`, 混沌ゲージ, 異変バナー, 周回ライブバー
  - L354-419: `.arena-overlay`（不透明 `#100c22`）・`.dps-row`/`.dps-bar-fill`
  - L420-494: `.live-log-box`（68px）・`.log-row`（固定1行 `22px`）
  - L495-705: 戦闘下部操作（敵ターゲット・味方パッド・`.skill-card`＆`.skill-card-desc`・カオスオーブ・ユーティリティ行・`.world-grid` 5等分）
  - L706-985: ステージカード・編成4スロット（`.party-slot`）・キャラチップ（`.unit-chip`）・装備D&D枠（`.gear-slot-box`）・装備カード（`.gear-card`）・ステータス/シナジー
  - L986-1051: リザルトバナー（`.result-banner`）・集計グリッド・スキルプレビュー

### コア (`js/core/`)
- `js/core/constants.js` (219L)
  - L9-18: `ATTRIBUTES` / `ATTR_MAP`（炎水風光闇無）
  - L20-28: `RACES` / `RACE_MAP`（人間・竜・魔物・妖精・機械）
  - L30-77: `ROLES` / `ROLE_MAP`（4ロール＋固有アビリティ定義）
  - L79-95: `RARITIES`, `EQUIP_SLOTS`, `SPEED_STEPS = [1, 2, 3]`
  - L97-132: `CHAOS_ANOMALIES`（はちゃめちゃ異変5種）
  - L141-164: `getAttrMultiplier()`（属性相性倍率）
  - L174-199: `getUnitSortTuple()`, `compareUnitsCanonical()`, `sortUnitsCanonical()`, `formatRacesLabel()`
- `js/core/utils.js` (281L)
  - L9-48: `clamp`, `rand`, `randInt`, `pick`, `escHtml`, `fmtNum`, `fmtTime`
  - L51-158: `calcPartySynergies()`（2種族同時カウント・属性共鳴・4ロール制覇）
  - L163-267: `calcUnitStats()`（Lv・覚醒・装備・専用武器・ロール補正・シナジー統合算出）
- `js/core/storage.js` (157L)
  - L15-48: `openDB()`, `requestPersistence()`
  - L49-105: `save()`, `load()`（IndexedDB + localStorage 二重保存・最新タイムスタンプ採用）
  - L107-146: `exportCode()`, `importCode()`, `clearAll()`
- `js/core/audio.js` (101L)
  - L12-52: `ensureContext()`, `unlock()`, `tone()`
  - L54-97: `play(kind)`（`tap/hit/crit/heal/buff/chaos/win/lose/drop`）

### データ (`js/data/`)
- `js/data/units.js` (469L) — 全21体定義（末尾で `sortUnitsCanonical` 実行）
  - L11-117: 炎属性 5体（カグラ・ホムラ・レックス・アザミ・イグナ）
  - L118-203: 水属性 4体（シズク・ヴァル・ギアマル・ミオ）
  - L204-268: 風属性 3体（ハヤテ・ゼフィラ・リル）
  - L269-333: 光属性 3体（ソラリス・オーロラ・ルミナス）
  - L334-398: 闇属性 3体（クロウ・ノクス・メア）
  - L399-464: 無属性 3体（ミコト・メチャコ・ゼロワン）
- `js/data/stages.js` (328L)
  - L9-15: `WORLDS`（5章定義）
  - L21-210: `STORY_STAGES`（冒険20ステージ `w1-1`〜`w5-4`）
  - L212-265: `BOSS_STAGES`（属性ボス6体 `boss-fire`〜`boss-null`）
  - L267-306: `buildTowerStage(floor)`（無限カオス塔 動的生成）
  - L311-317: `getStage()`
- `js/data/equipment.js` (158L)
  - L9-37: `PREFIXES`, `SLOT_BASES`, `AFFIX_POOL`（11種付加効果）
  - L41-93: `rollRarity()`, `generateEquipment()`
  - L95-143: `calcEquipScore()`, `getEnhanceCost()`, `getSellValue()`, `shouldAutoSell()`, `formatAffix()`

### ゲームロジック・描画 (`js/game/`)
- `js/game/state.js` (570L)
  - L11-71: `createInitialSave()`
  - L73-137: `mergeSave()`（後方互換・3倍速クランプ・装備/パーティ整合性検証）
  - L139-230: `STATE.ui`・`scheduleSave()`・`init()`・戦力/解放判定ヘルパー
  - L233-268: パーティ編成（`setPartySlot`, `swapPartySlots`, `removePartySlot`）
  - L271-362: 育成・覚醒・魂片加入・専用武器強化（`levelUpUnit`, `awakenUnit`, `unlockUnitByShards`, `upgradeExWeapon`）
  - L365-496: 装備ドロップ自動売却・装着/解除/最適装備・強化・ロック・単体/一括売却
  - L499-534: オフライン探索報酬（`getPendingOfflineRewards`, `claimOfflineRewards`）
- `js/game/combat.js` (1049L)
  - L11-44: `engine` 状態オブジェクト・`isActive()`・`isRepeating()`
  - L45-91: `addLog()`・`pushPopup()`（縦重なり回避付き）・`pushVfx()`
  - L93-188: `buildCombatants()`（ステータス・障壁・開幕パッシブ構築）
  - L190-262: `startBattle()`・`stopRepeatAndShowSummary()`・`retreatBattle()`
  - L264-318: `getEffSpd()`・`getActionOrder()`（行動順シミュレータ）
  - L320-352: `addChaos()`・`triggerChaosAnomaly()`（はちゃめちゃ異変発動）
  - L354-384: ターゲット選出（敵フォーカス・挑発/タンクヘイト重み）
  - L386-560: `applyHeal()`・`applyDamage()`（属性相性・会心・障壁・DPS4指標計測・全専用武器パッシブ）
  - L562-774: `tickStatus()`・`chooseAllySkillIndex()`・`executeAllyTurn()`・`executeEnemyTurn()`
  - L776-910: `settleBattle()`（報酬・ドロップ・自動売却・**通常リザルトと周回集計の完全分岐** L867〜）
  - L912-1006: `update(rawDt)`（3倍速クランプ・異変定期処理・ATB進行・周回自動再開）
  - L1008-1033: `queueAllySkill()`, `setFocusEnemy()`, `setSelectedAlly()`
- `js/game/renderer.js` (279L)
  - L10-20: `drawPolygon()`
  - L22-109: `drawUnitToken()`（画面高連動スケーリング・幾何学エンブレム・HP/障壁/ATBバー）
  - L111-276: `render()`（高DPI対応・背景カオス渦・味方/敵座標配置 L177〜・VFX・ポップアップ）

### UI・メイン (`js/ui/`, `js/main.js`)
- `js/ui/dragdrop.js` (158L)
  - L13-155: Pointer Events 統合D&D（即時ドラッグ `data-drag-immediate="1"` / `⠿` ハンドル / 長押し210ms判定・ゴースト追従・ドロップ判定）
- `js/ui/render-battle.js` (716L)
  - L9-53: `DPS_METRICS`・`renderLogRowHtml()`・`renderDpsRowsHtml()`
  - L56-248: 出撃前画面（`renderPrepUpper`, `renderPrepLower`, `.world-grid` 5等分）
  - L251-463: 戦闘中画面（`renderActiveUpper`, `renderActiveLower` — 行動順6枠・Canvas・不透明DPS/ログオーバーレイ・3行ライブログ・スキル3枚＋カオスオーブ）
  - L465-583: `updateLiveHud()`（Canvas再生成なしの軽量差分DOM更新）
  - L586-644: `buildNormalResultHtml()`（通常戦闘リザルト）
  - L647-691: `buildRepeatResultHtml()`（∞ 無限自動周回 集計リザルト）
- `js/ui/render-party.js` (155L): `renderUpper()`（L9）・`renderLower()`（L73）
- `js/ui/render-units.js` (179L): `renderUpper()`（L9）・`renderLower()`（L68）・`buildExWeaponSheet()`（L132）
- `js/ui/render-gear.js` (227L): `renderUpper()`（L23）・`renderLower()`（L99）・`buildAutoSellSheet()`（L193）
- `js/ui/render-world.js` (185L): `renderUpper()`（L9）・`renderLower()`（L83）・`buildSaveSheet()`（L141）
- `js/main.js` (816L)
  - L9-58: `NAV_ITEMS`, `showToast()`, `renderTopBar()`, `renderNav()`（戦闘中ロック描画）
  - L60-130: `renderAll()`, `openSheet()`, `closeSheet()`, `renderSheet()`
  - L133-210: `handleDrop()`（編成・装備・戦闘スキル/カオスオーブのD&D確定処理）
  - L213-730: `handleAction()`（`nav-tab` 戦闘中移動ロック L219・全画面アクション一括処理）
  - L732-784: `bindGlobalGuards()`（iOSジェスチャ抑止・バックグラウンド保存）, `registerServiceWorker()`, `mainLoop()`
  - L786-815: `boot()`
