# はちゃめちゃ世界｜コード地図（CODE_MAP）

トークン消費を抑えるため、全ファイルを読み込まずに目的の関数・定義の行番号へ直接ジャンプするための索引です（総34ファイル）。

---

## ルート・PWA・公開設定

| ファイル | 行数 | 役割・主要ポイント |
| :--- | ---: | :--- |
| `index.html` | 61 | iOSセーフエリアmeta・`#top-viewport`/`#bottom-thumb-zone`/`#overlay-root`/`#toast-root`骨格・全JS読み込み順 |
| `manifest.webmanifest` | 26 | PWA `standalone` / `portrait` / アイコン定義 |
| `sw.js` | 64 | `CACHE_NAME` (L1), `CORE_ASSETS` (L2), Network-First＋オフラインフォールバック (L49-63) |
| `capacitor.config.json` | 14 | 将来のCapacitor iOSアプリ化設定 (`webDir: "."`) |
| `.github/workflows/deploy-pages.yml` | 34 | GitHub Pages自動デプロイワークフロー |
| `assets/icon-192.png`, `icon-512.png` | - | PWAホーム画面用PNGアイコン（キャライラストではない） |

---

## スタイルシート（`css/`）

- **`css/tokens.css`** (135行): 配色・6属性色・4ロール色・品質色・safe-area変数 (L1-63), リセット＆誤操作防止 (L65-107), `@keyframes` 極品質虹金・乱入・トースト (L114-135)
- **`css/layout.css`** (253行): `.app-shell` セーフエリア内包 (L11-36), `.top-viewport` 上半分非操作 (L38-50), `.bottom-thumb-zone` 親指ゾーン (L52-70), `.bottom-nav` (L72-119), `.overlay-root`/`compact-anchor` (L121-176), `.toast-root` 上下境界配置 (L178-214), `@media (max-height: 720px)` iPhone SE調整 (L217-253)
- **`css/components.css`** (515行): `.view-header` (L1-42), `.panel` (L44-59), `.note-text` 折り返し注釈 (L61-69), 属性/ロール/種族/範囲バッジ (L71-107), `.q-perfect`/`.card-perfect` 極品質 (L109-131), `.sub-tabs` (L133-161), `.btn`系 (L163-230), `.pager-bar` (L232-250), `.item-tile` (L252-300), `.ability-tile` (L302-325), `.unit-name-full` 省略禁止 (L327-350), ぬるぬるゲージ (L352-378), 詳細カード/パーティスロット (L380-496), `@media (max-height: 720px)` (L499-515)
- **`css/battle.css`** (478行): `.battle-hud-bar` (L12-44), `.turn-order-bar`/`.turn-chips-grid` 4体均等 (L46-109), `.battle-arena` (L111-137), `.battle-mid-lane` 中央専用イベント帯 (L139-188), `.battle-unit-card` 固定高カード (L190-272), `.bu-status-strip` バフ6枠固定帯 (L274-300), `.battle-log-viewport`/`.log-row` 1行固定ログ (L315-364), `.dps-*` 4指標DPS (L366-421), リザルトカード (L431-469), `@media (max-height: 720px)` (L471-478)

---

## 基盤モジュール（`js/`）

- **`js/namespace.js`** (211行)
  - `ELEMENTS` (L14), `RACES` (L24), `ROLES` (L35), `EQUIP_SLOTS` (L42), `SCOPE_META` (L48), `STATUS_META` (L60)
  - `getElementMultiplier` (L109): 属性相性倍率
  - `compareRosterEntities` (L121): **厳密固定ソート**（属性→主種族→副種族→ロール→五十音）
  - `getQualityInfo` (L142): 品質1〜100%評価＆極品質倍率
- **`js/storage.js`** (272行)
  - IndexedDB操作: `openIDB` (L12), `idbGet` (L35), `idbSet` (L51)
  - 初期セーブ生成: `createDefaultCharProgress` (L67), `createInitialState` (L79), `hydrateState` (L152)
  - 読込・保存・入出力: `loadSave` (L200), `persistNow` (L221), `saveState` (L230), `exportSaveString` (L243), `importSaveString` (L248), `resetSave` (L258)
- **`js/audio.js`** (106行)
  - Web Audio ゼロファイル合成SE: `ensureCtx` (L7), `tone` (L22), `audio.play` (L45-102)

---

## ゲームデータ（`js/data/`）

- **`js/data/rules.js`** (152行): `WORLD_RULES` 10種 (L7), `RESONANCES` 15種 (L81), `DISPATCH_MISSIONS` 4種 (L102)
- **`js/data/abilities.js`** (209行): `ABILITY_UNLOCK_COSTS` (L11), `ABILITIES_BY_ROLE` 全100種 (L18: tank/dealer/supporter/healer), `ABILITY_LIST`/`ABILITY_MAP` (L193-194)
- **`js/data/characters.js`** (322行): `CHARACTERS` 全24体（炎 L13, 水 L63, 風 L113, 光 L163, 闇 L213, 無 L263）、末尾で厳密ソート実行
- **`js/data/enemies.js`** (401行): `ENEMIES` 全36種（エリア1 L11, エリア2 L64, エリア3 L117, エリア4 L170, エリア5 L223, 乱入6種 L276, 異界大ボス5種 L338）
- **`js/data/equipment.js`** (109行): `EQUIPMENT` 全42種（武器14 L13, 防具14 L43, 装飾14 L73）
- **`js/data/stages.js`** (301行): `MAIN_AREAS` 5エリア50戦生成 (L15-104), `RAID_BOSSES` 5種 (L106), `TRIAL_STAGES` 6種 (L150), `CHAOS_RUSH_STAGES` 4種 (L208), `buildTowerStage` 無限塔動的生成 (L254)

---

## コアエンジン（`js/engine/`）

- **`js/engine/stats.js`** (324行)
  - 装備計算: `getEquipEffectiveStats` (L7), `getEquipSellPrice` (L22), `getEquippedItems` (L30)
  - ステ＆共鳴: `collectCharAbilities` (L43), `computeSingleCharStats` (L77), `computeActiveResonances` (L129), `buildBattlePartySpecs` (L177)
  - 制限＆ドロップ: `checkStageRestriction` (L236), `rollEquipmentDrop` (L255), `getCharAssignment` (L298)
- **`js/engine/dispatch.js`** (116行)
  - `advanceDispatchesOnVictory` (L7): 戦闘勝利回数連動の異界派遣進行
  - `SCOUT_RULES` (L75) & `checkScoutUnlocks` (L96): ガチャ無しキャラ加入判定
- **`js/engine/battle-vfx.js`** (209行)
  - `createVfxLayer` (L10), `getUnitPoint` (L37), `spawnBeam` (L48), `spawnBurst` (L60), `spawnRing` (L70), `spawnChainNova` (L75), `spawnIntrusionWave` (L82), `spawnFloatText` (L86), `step` (L106)
- **`js/engine/battle.js`** (1277行)
  - ユニット構築: `createUnitFromAllySpec` (L38), `createUnitFromEnemyId` (L79)
  - ログ＆状態異常: `addLog` (L127), `applyStatus` (L145), `cleanseStatuses` (L172)
  - 回復＆ダメージ＆DPS: `applyHeal` (L223), `applyDamage` (L263), `recordDps` (L217)
  - 行動選択＆実行: `pickTargets` (L407), `chooseSkill` (L432), `recordSkillMastery` (L458), `executeTurn` (L475), `executeResonanceChain` (L686)
  - WAVE・乱入・行動順: `maybeTriggerIntrusion` (L733), `spawnWave` (L767), `predictTurnOrder` (L826)
  - 決着・自動周回・メインループ: `finalizeSingleBattle` (L864), `startSingleRun` (L1023), `startBattle` (L1063), `enableLoopMidBattle` (L1093), `requestStopLoop` (L1122), `retreat` (L1128), `tick` (L1146), `getSnapshot` (L1241)

---

## 画面UI＆アプリ統合（`js/ui/`）

- **`js/ui/render-common.js`** (134行): 各種バッジ生成 (L8-40), `renderViewHeader` (L41), `showToast` (L66), `openBottomOverlay` (L79), `closeOverlay` (L94), `cycleAutoSellSetting` (L107)
- **`js/ui/screen-quest.js`** (379行): `getSelectedStage` (L18), `isMainStageUnlocked` (L38), `render` (L45: 上半分 L58 / 下半分 L136), `advanceNextStageIfMain` (L359)
- **`js/ui/screen-party.js`** (508行): `assignCharToSlot` (L37), `render` (L74: 上半分 L89 / 下半分 L147: 編成・リンク/アビリティ5択/技習熟/異界覚醒), `resetToMainTab` (L503)
- **`js/ui/screen-equip.js`** (535行): `renderEquip` (L39: 上半分 L69 / 下半分 L147: 装備装着＆自動売却設定), `renderDispatch` (L359: 異界派遣), `resetEquipTab` (L532)
- **`js/ui/screen-codex.js`** (451行): `render` (L29: キャラ/敵/装備/アビリティ観賞図鑑＆設定・セーブ入出力), `resetToMainTab` (L448)
- **`js/ui/screen-battle.js`** (645行): `renderUnitCardInner` (L17), `mountBattleLayout` (L48), `syncControlButtons` (L198), `rebuildUnitSlots` (L222), `patchUnitCard` (L241), `renderInfoPanel` (L280), `updateFrame` (L367), `showNormalResult` (L435), `showLoopResult` (L549)
- **`js/ui/app.js`** (172行): `NAV_ITEMS` (L6), `battleController`接続 (L21), `renderNav` 戦闘中ロック制御 (L46), `launchBattle` (L94), `exitBattleTo` (L108), `installTouchGuards` iOS誤操作防止 (L123), `registerServiceWorker` (L155), `boot` (L163)
