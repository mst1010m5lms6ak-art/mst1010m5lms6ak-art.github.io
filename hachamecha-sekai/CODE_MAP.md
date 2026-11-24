# はちゃめちゃ世界｜コード地図（CODE_MAP）

トークン消費を抑えるため、全ファイルを読み込まずに目的の関数・定義の行番号へ直接ジャンプするための索引です（総35ファイル）。

---

## ルート・PWA・公開設定

| ファイル | 行数 | 役割・主要ポイント |
| :--- | ---: | :--- |
| `index.html` | 62 | iOSセーフエリアmeta（`status-bar-style=black`）・`#top-viewport`/`#bottom-thumb-zone`/`#overlay-root`/`#toast-root`骨格・全JS読み込み順（`screen-settings.js`含む） |
| `manifest.webmanifest` | 26 | PWA `standalone` / `portrait` / `#070b16` テーマ＆アイコン定義 |
| `sw.js` | 73 | `CACHE_NAME` (`v5`, L1), `CORE_ASSETS` (L2), `cache:'reload'` インストール (L35-47), Network-First＋オフラインフォールバック (L59-72) |
| `capacitor.config.json` | 14 | 将来のCapacitor iOSアプリ化設定 (`webDir: "."`) |
| `.github/workflows/deploy-pages.yml` | 34 | GitHub Pages自動デプロイワークフロー |
| `assets/icon-192.png`, `icon-512.png` | - | PWAホーム画面用PNGアイコン（キャライラストではない） |

---

## スタイルシート（`css/`）

- **`css/tokens.css`** (135行): 配色・6属性色・4ロール色・品質色・safe-area変数 (L1-63), リセット＆`touch-action: manipulation` (L65-107), `@keyframes` 極品質虹金・乱入・トースト (L114-135)
- **`css/layout.css`** (273行): `.app-shell` セーフエリア内包＋`::before`上部不透明ガード＋`display-mode: standalone`調整 (L12-55), `.top-viewport` 上半分非操作 (L57-69), `.bottom-thumb-zone` (L71-89), `.bottom-nav` 6タブ横並び (L91-138), `.overlay-root`/`overlay-top-view`中央揃え＆`compact-anchor` (L140-196), `.toast-root` 上半分下端基準・上方向スタック (L198-235), `@media (max-height: 720px)` iPhone SE調整 (L237-273)
- **`css/components.css`** (664行): `.view-header` 独立合成レイヤ (L1-45), `.panel`・`.note-text`・各種バッジ・極品質 (L47-134), `.sub-tabs`・`.btn`系（高視認性disabled含む） (L136-235), `.scroll-list-v`/`.scroll-grid-2`/`.scroll-list-1`/`.scroll-strip-h`/`.char-chip-btn` スクロールバー非表示リスト群 (L237-339), `.item-tile`/`.ability-tile`/`.unit-name-full` (L359-457), ぬるぬるゲージ＆`.gauge-hp-trail`ダメージ残像 (L459-491), `.detail-grid-stats`/`.detail-grid-stats-5`5列均等比較＆`.textarea-io`スクロールバー非表示 (L493-633), `@media (max-height: 720px)` (L635-664)
- **`css/battle.css`** (483行): `.battle-hud-bar` (L12-44), `.turn-order-bar`/`.turn-chips-grid` 4体均等 (L46-109), `.battle-arena` (L111-137), `.battle-mid-lane` 中央専用イベント帯 (L139-188), `.battle-unit-card` 固定高カード (L190-272), `.bu-status-strip` バフ6枠固定帯 (L274-300), `.battle-log-viewport`上詰め＋`.log-row-latest`最新行強調 (L315-370), `.dps-*` 4指標DPS (L372-426), リザルトカード (L436-474), `@media (max-height: 720px)` (L476-483)

---

## 基盤モジュール（`js/`）

- **`js/namespace.js`** (211行)
  - `ELEMENTS` (L14), `RACES` (L24), `ROLES` (L35), `EQUIP_SLOTS` (L42), `SCOPE_META` (L48), `STATUS_META` (L60), `AUTO_SELL_OPTIONS` (L98)
  - `getElementMultiplier` (L109): 属性相性倍率
  - `compareRosterEntities` (L121): **厳密固定ソート**（属性→主種族→副種族→ロール→五十音）
  - `getQualityInfo` (L142): 品質1〜100%評価＆極品質倍率
- **`js/storage.js`** (271行)
  - IndexedDB操作: `openIDB` (L12), `idbGet` (L35), `idbSet` (L51)
  - 初期セーブ生成: `createDefaultCharProgress` (L67), `createInitialState` (`arenaCleared`含む, L79), `hydrateState` (L152)
  - 読込・保存・入出力: `loadSave` (L200), `persistNow` (L221), `saveState` (L230), `exportSaveString` (L243), `importSaveString` (L248), `resetSave` (L258)
- **`js/audio.js`** (106行)
  - Web Audio ゼロファイル合成SE: `ensureCtx` (L7), `tone` (L22), `audio.play` (L45-102)

---

## ゲームデータ（`js/data/`）

- **`js/data/rules.js`** (152行): `WORLD_RULES` 10種 (L7), `RESONANCES` 15種 (L81), `DISPATCH_MISSIONS` 4種 (L102)
- **`js/data/abilities.js`** (209行): `ABILITY_UNLOCK_COSTS` (L11), `ABILITIES_BY_ROLE` 全100種 (L18: tank/dealer/supporter/healer), `ABILITY_LIST`/`ABILITY_MAP` (L193-194)
- **`js/data/characters.js`** (320行): `CHARACTERS` 全24体・純カタカナRPG名統一（炎 L13, 水 L63, 風 L113, 光 L163, 闇 L213, 無 L263）、末尾で厳密ソート実行
- **`js/data/enemies.js`** (400行): `ENEMIES` 全36種（エリア1 L11, エリア2 L64, エリア3 L117, エリア4 L170, エリア5 L223, 乱入6種 L276, 異界レイドボス5種 L338）
- **`js/data/equipment.js`** (109行): `EQUIPMENT` 全42種（武器14 L13, 防具14 L43, 装飾14 L73）
- **`js/data/stages.js`** (348行): `MAIN_AREAS` 5エリア50戦生成（通常WAVE乱入0.3%, L15-104）, `RAID_BOSSES` 5種 (L106), `TRIAL_STAGES` 6種 (L150), `ARENA_STAGES` 異界闘技場6階級・4vs4模擬戦 (L208), `buildTowerStage` 異界塔動的生成 (L306)

---

## コアエンジン（`js/engine/`）

- **`js/engine/stats.js`** (324行)
  - 装備計算: `getEquipEffectiveStats` (L7), `getEquipSellPrice` (L22), `getEquippedItems` (L30)
  - ステ＆共鳴: `collectCharAbilities` (L43), `computeSingleCharStats` (L77), `computeActiveResonances` (L129), `buildBattlePartySpecs` (L177)
  - 制限＆ドロップ: `checkStageRestriction` (L236), `rollEquipmentDrop` (L255), `getCharAssignment` (L298)
- **`js/engine/dispatch.js`** (116行)
  - `advanceDispatchesOnVictory` (L7): 戦闘勝利回数連動の異界派遣進行
  - `SCOUT_RULES` (L75, 闘技場・累計勝利条件含む) & `checkScoutUnlocks` (L96): ガチャ無しキャラ加入判定
- **`js/engine/battle-vfx.js`** (209行)
  - `createVfxLayer` (L10), `getUnitPoint` (L37), `spawnBeam` (L48), `spawnBurst` (L60), `spawnRing` (L70), `spawnChainNova` (L75), `spawnIntrusionWave` (L82), `spawnFloatText` (L86), `step` (L106)
- **`js/engine/battle.js`** (1423行)
  - ユニット構築: `createUnitFromAllySpec` (L39), `createUnitFromEnemyId` (L83), `createUnitFromArenaCharId` 闘技場4vs4用NPC生成 (L136)
  - ログ＆状態異常: `addLog` (L192), `applyStatus` (L210), `cleanseStatuses` (L237)
  - 回復＆ダメージ＆DPS: `recordDps` (L282), `applyHeal` (L288), `applyDamage` (L328)
  - 行動選択＆実行: `pickTargets` (L472), `chooseSkill` (L497), `recordSkillMastery` (L523), `executeTurn` (L540), `executeResonanceChain` (L751)
  - WAVE・乱入・行動順: `maybeTriggerIntrusion` 大陸通常WAVE限定0.3% (L798), `spawnWave` 闘技場3回戦対応 (L835), `predictTurnOrder` (L908)
  - 決着・一時停止・自動周回・滑らか補間・メインループ: `finalizeSingleBattle` (L946), `stopEngineLoop` (L1097), `setPaused` 撤退確認中ポーズ (L1106), `startSingleRun` (L1111), `startBattle` (L1154), `enableLoopMidBattle` (L1184), `finishLoopNow` (L1213), `requestStopLoop` 戦闘完了後リザルト遷移 (L1227), `retreat` (L1236), `stepSmoothGauges` HP/残像/シールド/共鳴補間 (L1246), `advanceCtGauges` 攻撃中CT継続進行 (L1273), `tick` (L1281), `getSnapshot` (L1385)

---

## 画面UI＆アプリ統合（`js/ui/`）

- **`js/ui/render-common.js`** (183行): 各種バッジ生成 (L8-40), `renderViewHeader` (L41), `showToast` (L66), `openBottomOverlay` (L79), `closeOverlay` (L94), `getAutoSellPrefixedLabel` (L107), `bindVerticalScrollState` (L114), `bindHorizontalStripState` 選択チップ自動可視化 (L127), `cycleAutoSellSetting` (L153)
- **`js/ui/screen-quest.js`** (436行): `getSelectedStage` (L18), `isMainStageUnlocked` (L38), `render` (L45: 上半分報酬4チップ＆闘技場決勝プレビュー / 下半分大陸・異界塔・レイド・試練・闘技場6階級縦スクロール), `advanceNextStageIfMain` (L404), `advanceNextArena` (L419)
- **`js/ui/screen-party.js`** (526行): `assignCharToSlot` (L37), `renderCharStripHtml` 横スクロール仲間帯 (L77), `render` (L96: 紹介文削除・戦力/アビ/共鳴折り返し表示・縦横スクロール＋装備画面キャラ連動), `resetToMainTab` (L523)
- **`js/ui/screen-equip.js`** (538行): `renderEquip` (L47: 自動売却タブ削除・紹介文削除・5列均等比較差分・横スクロール仲間帯・縦スクロール装備一覧・一括売却), `renderDispatch` (L369: 上半分3枠均等配分・選択任務報酬行・控え縦スクロール), `resetEquipTab` (L535)
- **`js/ui/screen-codex.js`** (321行): `render` (L39: キャラ/敵/装備/アビ4タブ、全タブ紹介文最下部統一・キャラ加入条件上部配置・縦スクロール位置保持), `resetToMainTab` (L314)
- **`js/ui/screen-settings.js`** (215行): 独立メインタブ設定画面 `render` (L11: 戦績＋主力総戦力・効果音・戦闘速度・初入手保護・自動売却基準・セーブ書き出し/復元/初期化), `resetState` (L211)
- **`js/ui/screen-battle.js`** (708行): `renderUnitCardInner` ダメージ残像バー付 (L17), `mountBattleLayout` 撤退確認中ポーズ＆周回終了UI (L53), `syncControlButtons` (L234), `rebuildUnitSlots` (L258), `patchUnitCard` ぬるぬるHP/残像/シールド/CT更新 (L277), `renderInfoPanel` 上詰め最新行強調ログ＆DPS (L323), `updateFrame` 闘技場表記＆共鳴ぬるぬる補間 (L411), `showNormalResult` 次階級ボタン付 (L487), `showLoopResult` (L613)
- **`js/ui/app.js`** (167行): `NAV_ITEMS` 6タブ定義 (L6), `battleController`接続 (L22), `renderNav` 戦闘中6タブ全ロック制御 (L47), `renderCurrent` (L80), `launchBattle` (L99), `exitBattleTo` (L113), `installTouchGuards` 連続タップ硬直なしガード (L128), `registerServiceWorker` `updateViaCache:'none'` (L148), `boot` (L158)
