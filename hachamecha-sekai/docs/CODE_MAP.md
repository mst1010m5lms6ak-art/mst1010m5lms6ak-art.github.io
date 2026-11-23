# 【はちゃめちゃ世界】コード地図（CODE_MAP）

> コード全体を読み込まずに目的の箇所へ直接ジャンプし、トークン消費を最小化するためのマップです。
> 総ファイル数：**28ファイル**（上限100ファイル以内）／ 総容量：約 **270KB**

---

## 1. 逆引きクイックガイド（目的別ジャンプ先）

| やりたいこと | 対象ファイル & 行番号 |
|---|---|
| キャラ追加・ステータス/3技/専用武器調整 | `js/data-characters.js` L9-L430 |
| 属性相性・種族シナジー・ロールアビリティ・カオス法則変更 | `js/constants.js` L5-L195 |
| キャラ並び替え（属性→種族→ロール）ロジック確認 | `js/constants.js` L122-L137 |
| ステージ・敵・深淵無限タワー・報酬バランス調整 | `js/data-stages.js` L5-L202 |
| ハクスラ装備生成・ランダムOP・自動売却判定・戦力計算 | `js/data-equip.js` L5-L217 |
| セーブ項目追加・初期状態・localStorage/IndexedDB保存 | `js/storage.js` L5-L182 |
| 戦闘計算（ダメージ/回復/ロール特性/カオス/バースト/周回） | `js/battle-engine.js` L33-L972 |
| 戦闘Canvas2Dエフェクト・ダメージポップ重なり回避 | `js/battle-fx.js` L14-L261 |
| 戦闘画面・行動順・1行固定ログ・4指標DPS・通常/周回別リザルト | `js/ui-battle.js` L16-L473 |
| 5画面UI（出撃/編成/装備・専用・自動売却/仲間/記録設定） | `js/ui-screens.js` L5-L593 |
| 画面遷移・戦闘中他画面移動ロック・全クリック/D&Dアクション | `js/app.js` L57-L636 |
| iOS対応Pointer Eventsドラッグ＆ドロップ調整 | `js/ui-drag.js` L18-L169 |
| キャライラスト無しの幾何学SVG紋章・装備アイコン調整 | `js/ui-svg.js` L5-L80 |
| 合成SE（Web Audio API）調整 | `js/audio.js` L8-L72 |
| セーフエリア・iOS誤操作防止・テーマ色トークン | `css/base.css` L1-L149 |
| 上下分割比率（親指ゾーン）・ボトムシート・375x667対応 | `css/layout.css` L1-L315 |
| 戦闘ユニット枠・1行ログ高さ・DPSバー・技カード・低画面調整 | `css/battle.css` L1-L525 |
| PWAオフラインキャッシュ更新（改修時は必ずバージョン更新） | `sw.js` L1-L58 |

---

## 2. ルート＆設定ファイル一覧

| ファイル | 行数 | 役割 |
|---|---|---|
| `index.html` | 52 | 通常HTMLエントリーポイント（`viewport-fit=cover`, iOS PWAメタ, `<script defer>`読込） |
| `manifest.webmanifest` | 31 | PWA設定（`standalone`, `portrait`, 相対パス `./`） |
| `sw.js` | 58 | Service Worker（L1:`CACHE_NAME`, L2-L27:`ASSETS`, L29-L58:Cache-First制御） |
| `capacitor.config.json` | 12 | 将来のCapacitor iOSアプリ化用設定（`webDir: "."`） |
| `.github/workflows/pages.yml` | 34 | GitHub ActionsによるGitHub Pages自動デプロイ定義 |
| `icons/icon.svg` | 28 | ベクターアプリアイコン |
| `icons/icon-180.png`, `192.png`, `512.png` | - | iOS `apple-touch-icon` および PWA マニフェスト用PNGアイコン |
| `docs/HANDOVER_SPEC.md` | - | 次回指示用引継ぎ仕様書（絶対禁止事項・全仕様） |
| `docs/CODE_MAP.md` | - | 本ファイル（全コード行番号地図） |

---

## 3. CSS ファイル詳細マップ

### `css/base.css`（149行）
- **L1-L49**: `:root` テーマ変数（背景・テキスト・ネオンアクセント・属性色・レア色・ロール色・`env(safe-area-inset-*)`）
- **L51-L106**: グローバルリセット・iOS誤操作防止（`-webkit-touch-callout: none`, `user-select: none`, `touch-action: none`, `100dvh`, `input font-size: 16px`）
- **L107-L149**: `.hidden`, `.scroll-y` (`touch-action: pan-y`), `.scroll-x` (`touch-action: pan-x`), `.truncate`, `.num`

### `css/layout.css`（315行）
- **L2-L41**: `#app-root`, `#app-shell`（最大幅480px中央縦枠、セーフエリアpadding適用）
- **L44-L123**: `#top-display`（上部閲覧専用：通常46% / 戦闘中55%）、`.top-status-strip`, `.top-visual-body`
- **L126-L196**: `#bottom-control`（下部親指操作：通常54% / 戦闘中45%）、`#control-body`, `#bottom-nav`（戦闘中 `display: none`）, `.nav-btn`
- **L199-L257**: `#sheet-overlay`, `#sheet-panel`（下部展開ボトムシート）
- **L260-L301**: `#toast-layer`, `#drag-ghost`
- **L304-L315**: `@media (max-height: 700px)`（iPhone SE等の低画面最適化：通常46%/54%、戦闘59%/41%）

### `css/components.css`（454行）
- **L2-L64**: `.btn`, `.btn-sm`, `.btn-primary`, `.btn-cyan`, `.btn-gold`, `.btn-danger`, `.btn-ghost`, `.active-toggle`
- **L67-L96**: `.subtabs`, `.subtab`
- **L99-L127**: `.badge`, 属性カラー `.el-*`, ロールカラー `.role-*`, レアリティ `.rar-*`
- **L130-L159**: `.display-card`, `.display-card-hero`, `.section-label`
- **L162-L221**: `.party-slots`, `.party-slot`（D&D `.drop-over` 状態含む）
- **L224-L299**: `.roster-grid`, `.unit-tile`, `.unit-emblem-wrap`, `.mini-tag`
- **L302-L381**: `.stage-list`, `.stage-row`, `.equip-row`, `.equip-slot-grid`, `.equip-slot-box`
- **L384-L454**: `.synergy-bar`, `.syn-chip`, `.skill-mini-list`, `.stat-grid-4`, `.action-row`

### `css/battle.css`（525行）
- **L4-L51**: `.battle-top-wrap`, `.shake`, `.battle-hud-bar`, `.chaos-law-pill`
- **L54-L103**: `.timeline-bar`, `.tl-item`（行動順表示）
- **L106-L245**: `.battle-arena`, `#battle-fx-canvas`, `.unit-row`, `.b-unit`, HP/障壁/ATBバー, `.b-buffs`
- **L248-L268**: `.chaos-meter-strip`, `.chaos-track`, `.chaos-fill`
- **L271-L306**: `.combat-log-box`（固定高さ92px）, `.log-line`（固定高さ21px・1行固定）, 色分けクラス
- **L309-L354**: `.dps-panel`, `.dps-row`, `.dps-row-lg`, 4指標バー色 `.dps-fg-dealt/taken/healOut/healIn`
- **L357-L436**: `.battle-ctrl-wrap`, `.battle-toolbar`, `.target-strip`, `.skill-deck` (`max-height: 146px`), `.skill-card-btn`, `.battle-role-strip`
- **L438-L468**: `@media (max-height: 700px)`（375×667用：ユニット26px紋章・ログ80px/18px行・技カード104px）
- **L470-L525**: `.burst-btn`, `.result-banner`（win/lose/loop-theme）, `.loop-progress-bar`

---

## 4. JS ファイル詳細マップ

### `js/constants.js`（235行）→ `HS.CONST`
- **L5-L14**: `ELEMENTS`, `ELEMENT_MAP`（6属性と相性定義）
- **L16-L24**: `RACES`, `RACE_MAP`（5種族定義）
- **L26-L65**: `ROLES`, `ROLE_MAP`（4ロール＋固有アビリティ定義）
- **L67-L81**: `RARITIES`, `RARITY_MAP`, `EQUIP_SLOTS`
- **L83-L92**: `CHAOS_LAWS`（8種のカオス法則）
- **L94-L113**: `getElementMult(atkEl, defEl, lawId)`（属性相性倍率計算）
- **L122-L137**: `getCharSortKey(ch)`, `sortCharacters(list)`（厳密ソート：属性→種族/2種族→ロール）
- **L139-L195**: `calcPartySynergies(charDefs)`（種族シナジー＆属性共鳴計算）
- **L197-L214**: `fmtNum`, `esc`, `raceText`

### `js/data-characters.js`（442行）→ `HS.CHARS`
- **L9-L430**: `RAW_CHARACTERS`（全24体：炎L11-L97 / 水L99-L185 / 風L187-L273 / 光L275-L361 / 闇L363-L394付近〜無L430、各3技＋専用武器）
- **L432-L441**: `CHARACTERS`（起動時自動厳密ソート）、`HS.CHARS.get(id)`

### `js/data-stages.js`（212行）→ `HS.STAGES`
- **L5-L24**: `ENEMY_TEMPLATES`（17種の敵・ボス定義）
- **L26-L77**: `AREA_NAMES`, `JOURNEY_STAGES`（混沌紀行 5エリア×5＝25ステージ自動構築）
- **L79-L111**: `TRIAL_STAGES`（異端試練 5ボス）
- **L113-L142**: `RUSH_STAGES`（カオス乱闘 3ボスラッシュ）
- **L144-L190**: `buildAbyssStage(floor)`（カオス深淵 無限階層生成）
- **L192-L202**: `getStageById(id)`

### `js/data-equip.js`（229行）→ `HS.EQUIP`
- **L5-L29**: `NAME_PREFIXES`, `SLOT_NOUNS`, `SUB_OP_POOL`（9種のランダムOP）
- **L35-L95**: `rollRarity`, `generateEquip(minTier, stageScale)`
- **L97-L126**: `getEquipMainValue`, `getUpgradeCost`, `getSellValue`, `isEquippedBy`, `shouldAutoSell`
- **L128-L217**: `calcCharStats(charId, save)`（レベル・凸・3部位装備・専用武器統合計算）, `calcPartyPower(save)`

### `js/storage.js`（192行）→ `HS.STORAGE`
- **L5-L7**: `SAVE_KEY`, `IDB_NAME`, `IDB_STORE`
- **L9-L68**: `createInitialSave()`（初期所持6体・4人編成・初期装備・デフォルト設定）
- **L70-L97**: `mergeSave(raw)`（マイグレーション＆3倍速上限クランプ）
- **L99-L135**: `openIDB`, `writeIDB`, `readIDB`
- **L137-L182**: `load`, `save`, `tryRecoverFromIDB`, `exportJson`, `importJson`, `reset`

### `js/audio.js`（73行）→ `HS.AUDIO`
- **L8-L38**: `ensureCtx`, `tone`（Web Audio API オシレーター生成）
- **L40-L72**: `setEnabled`, `tap`, `hit`, `heal`, `chaos`, `win`, `lose`

### `js/ui-svg.js`（82行）→ `HS.SVG`
- **L5-L30**: `racePath(race, r)`（5種族の幾何学SVGパス）
- **L36-L62**: `emblem(unit, size)`（属性オーラ＋1/2種族二重紋章＋ロール印）
- **L64-L79**: `equipIcon(slot, rarity, size)`

### `js/ui-drag.js`（172行）→ `HS.DRAG`
- **L10-L52**: `ghostEl`, `clearHighlights`, `beginDragVisual`, `updateDropHover`, `cleanup`
- **L54-L150**: `onPointerDown`, `onPointerMove`, `onPointerUp`（スクロールと長押し/横ドラッグ両立）
- **L152-L169**: `init(callback)`（クリック誤爆抑止含む）

### `js/battle-fx.js`（264行）→ `HS.FX`
- **L14-L64**: `attach`, `detach`, `resize`, `getUnitCenter`
- **L66-L75**: `pickNonOverlappingPos`（ダメージ/回復ポップの重なり回避）
- **L77-L160**: `spawnHit`, `spawnHeal`, `spawnChaosFlash`
- **L162-L261**: `loop(ts)`（60fps Canvas2D描画ループ）

### `js/battle-engine.js`（988行）→ `HS.BATTLE`
- **L13-L31**: `resetLoopSession(stageId)`（無限周回累計セッション初期化）
- **L33-L129**: `makeAllyUnit`, `makeEnemyWave`（戦闘ユニット生成・開幕障壁）
- **L131-L173**: `addLog`, `getAlive`, `effectiveSpeed`, `getActionOrder(count)`（次行動順予測）
- **L175-L200**: `addChaos`, `triggerRandomChaosLaw`
- **L202-L368**: `applyDamage`（相性・会心・障壁・専用武器・ロール特性・DPS計測）, `applyHeal`（超過回復障壁化＆浄化）, `cleanseOne`
- **L370-L408**: `pickEnemyTarget`, `pickAllyTargetForEnemy`（タンク狙われ率）, `tickStatusStart`
- **L410-L596**: `executeSkill`（3技処理・追撃・CT短縮・隕石）, `applyDebuffsFromSkill`, `triggerChaosBurst`
- **L598-L638**: `chooseAiSkill`, `checkWaveOrEnd`
- **L640-L800**: `finishBattle`（報酬・LvUP・自動売却・通常/周回分岐・累計更新）, `startLoopCountdown`
- **L802-L864**: `stepTick`（1x〜3x ATB進行）, `manualUseSkill`, `stopTimers`
- **L866-L972**: `start`, `retreat`, `toggleLoopPause`, `setTarget`, `setAutoMode`, `cycleSpeed`, `toggleLoopDuringBattle`

### `js/ui-battle.js`（485行）→ `HS.UI_BATTLE`
- **L16-L31**: `renderLogLine`（1行固定カラーログHTML）
- **L33-L58**: `renderDpsPanelHtml`（4指標バー＋DPS/sまたはシェア%）
- **L60-L98**: `renderUnitCard`
- **L100-L114**: `mountBattleShell`（Canvasを壊さない初回骨格マウント）
- **L116-L283**: `renderFighting`（戦闘中上部HUD/行動順/戦場/カオス/ログorDPS＋下部親指操作）
- **L285-L379**: `renderNormalResult`（通常リザルト画面）
- **L381-L462**: `renderLoopResult`（周回専用リザルト画面）
- **L464-L484**: `render`, `resetState`, `setFeedTab`, `setResultMetricTab`

### `js/ui-screens.js`（602行）→ `HS.UI_SCREENS`
- **L5-L82**: `renderTopHeader`, `renderSynergyChips`, `renderCharPreviewCard`
- **L85-L222**: `renderQuest`（出撃：4モード・ステージ選択・無限周回/自動売却トグル）
- **L225-L290**: `renderParty`（編成：4枠D&D＆タップ・厳密ソート一覧・最強自動編成）
- **L293-L470**: `renderEquip`（装備装着D&D・強化/保護/売却・専用武器・自動売却設定＆一括売却）
- **L473-L540**: `renderRoster`（仲間解放：全24体厳密ソート・確定解放・LvUP・限界突破）
- **L543-L593**: `renderSettings`（戦績・属性相性＆種族表・SE/速度/オート・データ入出力/初期化）

### `js/app.js`（690行）→ アプリ制御エントリー
- **L6-L55**: `uiState`, `NAV_ITEMS`, `toast`, `triggerShake`, `openSheet`, `closeSheet`
- **L57-L89**: `renderNav`, `render`（L73-L77：戦闘中他画面ロック制御）
- **L91-L152**: `assignCharToSlot`, `wearEquip`, `handleDrop`（編成・装備・戦闘スキルD&Dハンドラ）
- **L154-L636**: `handleAction`（全画面の `data-action` クリックイベント集約）
- **L638-L689**: `initGestureGuards`（iOSズーム抑止）, `registerSW`, `boot`
