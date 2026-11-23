# はちゃめちゃ世界 — コード地図 (CODE_MAP)

> **トークン節約用クイックナビゲーション**
> コード全体を最初から読み込まず、変更したい機能に対応するファイルと行番号だけを指定して読み込むこと。

---

## 1. 機能別クイック索引（修正時の最短ルート）

| やりたいこと | 対象ファイルと行番号 |
| :--- | :--- |
| セーフエリア・ズーム/長押し禁止・ルート固定 | `index.html` (L1-L21), `src/main.tsx` (L1-L51), `src/styles/base.css` (L1-L89), `src/styles/theme.css` (L1-L20) |
| 属性相性・種族共鳴・ロールアビリティ・混沌法則 | `src/data/constants.ts` (L3-L141) |
| ユニット追加・技3つ・専用武器バランス調整 | `src/data/units.ts` (L3-L1697) |
| ステージ・異界ボス・素材収集・無限塔生成 | `src/data/stages.ts` (L56-L627) |
| 装備ドロップ・ランダムオプション・強化コスト | `src/data/equipment.ts` (L1-L181) |
| ユニット並び替え規則（属性→種族(1/2)→ロール） | `src/engine/sort.ts` (L26-L45) |
| ステータス・種族共鳴・戦力・LvUPコスト計算 | `src/engine/stats.ts` (L12-L143) |
| 戦闘ロジック（CTB・ダメージ/回復・DPS4指標・カオス法則・AI） | `src/engine/battle.ts` (L21-L936) |
| セーブ保存(IDB/LS)・実績・コード書き出し/復元 | `src/engine/storage.ts` (L9-L285) |
| Web Audio API 合成効果音 | `src/engine/sound.ts` (L1-L82) |
| 自動売却・報酬反映・周回累計・編成/装備/専用武器操作 | `src/state/store.ts` (L18-L452) |
| 戦闘ループ・3倍速・自動周回・戦闘中ナビ遷移ロック | `src/App.tsx` (L90-L289, L428-L445) |
| 戦闘画面UI・D&Dスキル/オーブ・周回バナー・親指ドック | `src/components/BattleScreen.tsx` (L59-L585) |
| 行動順タイムライン表示 | `src/components/BattleTimeline.tsx` (L8-L27) |
| 1行固定ログ表示 | `src/components/BattleLog.tsx` (L7-L19), `src/styles/layout.css` (L626-L654) |
| DPSメーター（与ダメ/被ダメ/与回復/被回復） | `src/components/DpsMeter.tsx` (L20-L83) |
| 通常リザルト＆周回リザルト画面 | `src/components/ResultModal.tsx` (L17-L236) |
| 幾何学エンブレムSVG描画（キャライラスト無し） | `src/components/Emblem.tsx` (L12-L97) |
| 戦闘エフェクトCanvas 2Dパーティクル | `src/components/BattleCanvas.tsx` (L22-L157) |
| 出撃画面（旅路/無限塔/異界ボス/素材） | `src/components/StageScreen.tsx` (L21-L198) |
| 編成画面（D&D編成・Lv強化・専用武器モーダル） | `src/components/PartyScreen.tsx` (L28-L476) |
| 装備画面（着脱・強化・売却・ロック・自動売却切替） | `src/components/EquipScreen.tsx` (L26-L303) |
| 仲間解放・実績・戦術辞典画面 | `src/components/ArchiveScreen.tsx` (L18-L260) |
| 設定（利き手・SE・自動売却・セーブ管理） | `src/components/SettingsScreen.tsx` (L13-L234) |

---

## 2. ファイル別 詳細行番号マップ

### ルート・設定・CI (10ファイル)
- `.github/workflows/deploy.yml`: GitHub Actions による GitHub Pages 自動ビルド＆デプロイ
- `package.json`: 依存関係（`preact`, `vite`, `@preact/preset-vite`, `vite-plugin-pwa`, `typescript`）
- `tsconfig.json`: TypeScript strict 設定 (`jsxImportSource: "preact"`)
- `vite.config.ts`: `base: './'` + `VitePWA` オフラインプリキャッシュ設定
- `capacitor.config.json`: 将来の Capacitor iOS アプリ化設定 (`webDir: "dist"`)
- `index.html`: iOS PWA メタタグ (`viewport-fit=cover`, `black-translucent`, `apple-touch-icon`)
- `public/manifest.webmanifest`: PWA マニフェスト (`standalone`, `portrait`)
- `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`: 軽量アイコン群

### 型・データ層 (`src/types/`, `src/data/`)
- **`src/types/game.ts` (360行)**
  - L1-L10: 基本列挙型（`ElementType`, `RaceType`, `RoleType`, `Rarity`, `EquipSlot`, `TargetType`, `MainTab`, `StageCategory`, `BattleSpeed`, `DpsMetric`）
  - L12-L89: スキル・専用武器・ユニット定義型（`SkillEffect`, `SkillDef`, `SignatureWeaponDef`, `UnitDef`）
  - L91-L131: 装備・所持ユニット・算出ステータス型（`EquipmentItem`, `OwnedUnitState`, `ComputedStats`）
  - L133-L166: 敵・ステージ定義型（`EnemyTemplate`, `StageDef`）
  - L168-L316: 戦闘状態・ログ・DPS・リザルト・周回集計型（`BattleActor`, `ChaosLaw`, `BattleLogEntry`, `DpsEntry`, `BattleRewardSummary`, `RepeatSessionSummary`, `BattleState`）
  - L318-L360: 設定・実績・セーブデータ型（`AutoSellSettings`, `UserSettings`, `AchievementDef`, `SaveData`）
- **`src/data/constants.ts` (141行)**
  - L3-L6: ソート基準順序配列（`ELEMENT_ORDER`, `RACE_ORDER`, `ROLE_ORDER`, `RARITY_ORDER`）
  - L8-L77: 属性・種族共鳴・ロールアビリティ・レアリティメタ定義
  - L79-L101: `getElementMultiplier`（属性相性倍率計算）
  - L103-L141: `CHAOS_LAWS`（6種の混沌法則）
- **`src/data/units.ts` (1697行)**
  - L3-L1695: `UNIT_DEFS` 全24体ユニット定義
    - L4-L281: 炎属性 4体（バルド / カイン / イグナ / フレア）
    - L282-L565: 水属性 4体（ミオ / レン / カイ / シズク）
    - L566-L843: 風属性 4体（カナデ / ゼファー / ガロウ / シルフ）
    - L844-L1126: 光属性 4体（ルナ / イージス / ソラ / プリズム）
    - L1127-L1411: 闇属性 4体（クロウ / ヴリトラ / ノクス / ユラ）
    - L1412-L1695: 無属性 4体（ゼロ / ギア / カオス / ミミ）
  - L1696: `UNIT_MAP`（ID引き辞書）
- **`src/data/stages.ts` (627行)**
  - L3-L54: `mkEnemy`（敵テンプレート生成ヘルパー）
  - L56-L401: 混沌の旅路 12ステージ（`st_01`〜`st_12`）
  - L402-L493: 異界ボス 4ステージ（`boss_fire`, `boss_water`, `boss_twins`, `boss_chaos`）
  - L494-L564: 素材特化周回 3ステージ（`farm_gold`, `farm_exp`, `farm_shard`）
  - L566: `STAGE_MAP`
  - L578-L627: `generateTowerStage`（無限塔エンドレス動的生成）
- **`src/data/equipment.ts` (181行)**
  - L12-L48: 装備テンプレート・接頭辞・サブオプション候補
  - L64-L103: `rollEquipmentDrop`（ランダム装備生成）
  - L105-L143: `getEquipEffectiveMainValue`, `getEquipUpgradeCost`, `getStatLabel`, `getSlotLabel`
  - L145-L181: `createStarterEquipment`（初期装備2点）

### エンジン・状態層 (`src/engine/`, `src/state/`)
- **`src/engine/sort.ts` (54行)**
  - L26-L40: `compareUnits`（属性→第1種族→第2種族→ロール厳密ソート）
  - L42-L54: `sortUnits`, `sortEquipment`
- **`src/engine/stats.ts` (143行)**
  - L12-L18: `getExpForNextLevel`, `getLevelUpGoldCost`
  - L20-L41: `getPartySynergies`（2種族持ち両カウント対応）
  - L43-L125: `computeUnitStats`（Lv・装備・専用武器・種族共鳴合算）
  - L127-L143: `calcUnitPower`, `calcPartyPower`
- **`src/engine/battle.ts` (936行)**
  - L21-L110: `createAllyActors`, `createEnemyActors`
  - L112-L176: `createBattleState`
  - L178-L253: `getEffectiveSpeed`, `predictTimeline`（CTB行動順予測）
  - L255-L301: `pushLog`, `pushFloat`, `pushFx`, `addStatus`, `getEffectiveAtk`, `getEffectiveDef`
  - L303-L331: `triggerChaosIfFull`, `addChaosGauge`
  - L333-L450: `applyDamage`（属性相性・会心・タンク軽減＆全体盾・反撃・ディーラー追撃・専用武器・DPS与被ダメ集計）
  - L452-L494: `applyHeal`（ヒーラー超過回復シールド変換・弱体解除・DPS与被回復集計）
  - L496-L547: `chooseEnemyTarget`, `chooseAutoSkillAndTarget`
  - L549-L797: `executeActorSkill`（技実行・CD更新・1行ログ追加・法則減算・Wave/勝敗判定）
  - L799-L867: `triggerChaosOrb`（敵砲撃 / 味方覚醒モード）
  - L869-L936: `advanceTimelineStep`（ゲージ進行・気絶判定・サポーター加速アビリティ）
- **`src/engine/storage.ts` (285行)**
  - L9-L93: `ACHIEVEMENTS`（実績10種定義）
  - L95-L159: `createInitialSave`
  - L161-L258: `openDb`, `sanitizeSave`, `requestPersistentStorage`, `loadSaveData`, `persistSaveData`
  - L260-L285: `exportSaveCode`, `importSaveCode`
- **`src/engine/sound.ts` (82行)**
  - L1-L82: `SoundEngine`（Web Audio API 合成SE：`unlock`, `tap`, `hit`, `heal`, `chaos`, `victory`, `defeat`）
- **`src/state/store.ts` (452行)**
  - L18-L32: `resolveStage`, `shouldAutoSell`
  - L34-L200: `applyBattleOutcome`（報酬・自動売却・インベントリ上限整理・初回加入・LvUP）
  - L202-L257: `mergeRepeatSession`（周回累計合算）
  - L259-L364: `assignUnitToPartySlot`, `removeUnitFromPartySlot`, `levelUpUnitWithGold`, `unlockUnitByShard`, `forgeOrUpgradeSignatureWeapon`
  - L366-L450: `equipItemToUnit`, `upgradeEquipmentItem`, `sellEquipmentItem`, `toggleEquipmentLock`, `claimAchievement`

### アプリ・コンポーネント層 (`src/main.tsx`, `src/App.tsx`, `src/components/`)
- **`src/main.tsx` (51行)**: iOS誤操作抑止（長押し・ピンチ・ダブルタップズーム）、`requestPersistentStorage()`、SW登録、`render(<App />)`
- **`src/App.tsx` (448行)**
  - L45-L88: セーブ読込・自動保存・実績バッジ集計
  - L91-L156: `startBattle`, `finalizeBattleIfNeeded`
  - L159-L192: `handleUseSkill`, `handleTriggerOrb`
  - L194-L281: 戦闘リアルタイム進行ループ（3倍速・オートAI・オーブ自動発動・周回カウントダウン）
  - L284-L289: `handleSelectTab`（戦闘中遷移ロック）
  - L293-L445: 上部リソースバー・メイン画面切替・下部メインナビ（戦闘中非表示）
- **`src/components/BattleScreen.tsx` (585行)**
  - L40-L57: `statusLabel`
  - L94-L195: Pointer Events D&D（スキル→敵味方 / オーブ→敵味方・タップ兼用）
  - L199-L290: `renderActorCard`（HP/シールド/ゲージ/状態異常/アニメーション/浮遊数値）
  - L298-L383: 上部情報・行動順・カオス帯・1行ログ・戦場・中央カオス陣
  - L385-L491: DPSオーバーレイ・下部親指ドック（3技・オーブ・倍速/AUTO/周回/DPS/撤退）
  - L500-L583: 周回インターバル速報・通常/周回リザルト・撤退確認モーダル
- **`src/components/BattleTimeline.tsx` (27行)**: 行動順6チップ表示
- **`src/components/BattleLog.tsx` (19行)**: 最大4行の1行固定ログ表示
- **`src/components/BattleCanvas.tsx` (157行)**: Canvas 2D パーティクル・斬撃・波動演出
- **`src/components/DpsMeter.tsx` (83行)**: 4指標（与ダメ/被ダメ/与回復/被回復）バー＆秒間値表示
- **`src/components/Emblem.tsx` (97行)**: 属性・第1/第2種族幾何学パターン・ロール記号SVG
- **`src/components/ResultModal.tsx` (236行)**: L20-L120 周回リザルト / L122-L236 通常リザルト
- **`src/components/StageScreen.tsx` (198行)**: PvE 4カテゴリ選択＋下部親指ドック（通常出撃 / 無限自動周回）
- **`src/components/PartyScreen.tsx` (476行)**: L55-L111 編成D&D / L127-L220 パーティ4枠・種族共鳴・厳密ソート一覧 / L223-L290 下部操作ドック / L299-L473 詳細・3技・専用武器モーダル
- **`src/components/EquipScreen.tsx` (303行)**: L64-L149 装備者＆3枠 / L151-L207 インベントリ / L209-L301 下部キャラ切替・スロット・44px統一4ボタン操作ドック
- **`src/components/ArchiveScreen.tsx` (260行)**: L45-L120 仲間解放（厳密ソート・専用武器1行表示）/ L122-L162 実績 / L164-L215 戦術辞典 / L218-L257 下部サブタブ
- **`src/components/SettingsScreen.tsx` (234行)**: 利き手・戦闘初期値・自動売却・SE・コード書き出し/復元・初期化確認

### スタイル層 (`src/styles/`)
- **`src/styles/base.css` (89行)**: 誤操作抑止・`100dvh` 固定・`#app` 背景・`.scroll-area`
- **`src/styles/theme.css` (117行)**: CSS変数（セーフエリア含む L1-L20）・全11種の`@keyframes`アニメーション（L22-L117）
- **`src/styles/layout.css` (1248行)**
  - L1-L82: `.app-shell`・上部ステータスバー
  - L84-L144: `.main-body`・`.bottom-nav`
  - L146-L347: 共通画面・親指ドック・`.thumb-row`・ボタン群（44px統一・2行スタック）
  - L348-L518: ステージカード・編成スロット・種族共鳴・ユニットグリッド
  - L519-L1020: 戦闘画面全体（行動順・カオス帯・1行ログ L626-L654・戦場・中央カオス陣・親指コマンドドック）
  - L1021-L1248: ドラッグゴースト・モーダル・DPSオーバーレイ・周回暗転バナー・統計カード
