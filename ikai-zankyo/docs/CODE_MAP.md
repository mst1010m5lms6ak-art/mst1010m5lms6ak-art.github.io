# 「異界残響」コード地図（ファイル・関数・行番号インデックス）

> **目的**：次回以降の開発でコード全体を読まず、該当ファイルの必要行範囲だけを読んでトークンを大幅削減するための精密マップ。コード変更後は必ず該当行番号を更新すること。
> **基準パス**：`c:\Users\ABC\AppData\Local\Temp\newapp1\ikai-zankyo\`

---

## 1. 変更目的別・最速アクセス早見表
| やりたい改修 | 開くファイルと行番号 |
|---|---|
| iOS PWA SafeArea・上下50:50比率・フォント・縦横スクロール | `css/base.css` L1-L323 |
| 10異界テーマ・属性/ロール/レアリティ/品質/範囲バッジ・リッチボタン | `css/theme.css` L1-L268 |
| 戦闘3段内部完結カード・SVG攻撃軌跡・中央レーン・行動順・DPS見た目 | `css/battle.css` L1-L933 |
| 非戦闘プレビュー・召喚魔法陣＆演出・横ピル・固定高さステージ・図鑑 | `css/screens.css` L1-L797 |
| 暗号化・HMAC改ざん検知・引き継ぎコード・数値フォーマット | `js/security.js` L10-L270 |
| 汎用SVGアイコン追加・編集（出撃交差剣・魂晶・覇印含む） | `js/icons.js` L5-L58 |
| Web Audio 効果音追加・召喚演出SE調整 | `js/audio.js` L8-L107 |
| 10異界・100ステージ・敵66種＆公式ソート・討伐属性順・塔100F・PvE5種 | `js/data_worlds.js` L5-L1042 |
| プレイアブルキャラ52体（討伐ボスUR6・塔限定4含む）・共鳴盤ノード | `js/data_chars.js` L6-L670 |
| 装備20シリーズ80部位（個別紹介文・部位順ソート）・自由アビリティ30種・シナジー | `js/data_equip.js` L6-L456 |
| 必須4段ソート・総合ステ計算・召喚UR・覇王降臨・共鳴・売却/還元・セーブ | `js/state.js` L15-L1109 |
| ノンストップATB・SVG軌跡連携・範囲対象・乱入抽選・周回継続・報酬適用 | `js/battle.js` L18-L963 |
| 戦闘DOM差分＆FX描画・召喚魔法陣演出・図鑑・横スクロール＆位置保持 | `js/ui_render.js` L1-L2411 |
| iOS安全域ガード・召喚演出タイマー・画面状態 `ui`・操作ハンドラ・SW登録 | `js/app.js` L15-L645 |

---

## 2. 全ファイル詳細マップ（実測行番号）

### ルート＆PWA基盤
- **`index.html`（51行）**
  - `L1-L24`：viewport (`viewport-fit=cover`)・CSP・PWAメタ（`mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`）・SVGアイコン・CSS読込
  - `L25-L37`：DOM骨格（`#device-stage` > `#app-shell` > `.safe-area-top` / `.safe-boundary-top` / `#game-viewport`［`#upper-display` + `.split-divider` + `#lower-control`］ / `.safe-boundary-bottom` / `.safe-area-bottom`）
  - `L39-L49`：JS10本の `defer` 読込順
- **`manifest.json`（27行）**：PWAスタンドアロン・縦画面固定・テーマ色 `#05070d`・SVGデータURIアイコン
- **`sw.js`（51行）**
  - `L1-L20`：`CACHE_NAME`（現在 `'ikai-zankyo-v5'`）・キャッシュ対象 `ASSETS`
  - `L22-L35`：`install` / `activate`（旧キャッシュ削除＆即有効化）
  - `L36-L50`：`fetch`（Network-First＋オフラインキャッシュフォールバック）

### スタイルシート（`css/`）
- **`css/base.css`（323行）**
  - `L1-L65`：リセット・CSS変数・オフライン最適フォント（`--font-display` / `--font-sans`）・`position: fixed; inset: 0` 基盤・等幅数値 `.num`
  - `L66-L150`：`#device-stage`（物理100%固定）・`#app-shell`・PC閲覧時iPhone14実寸枠・`.safe-area-top/bottom`（`env()`直評価）・`.safe-boundary`
  - `L151-L220`：`#game-viewport`（上下50:50）・`#upper-display`（`pointer-events: none`）・`.split-divider`・`#lower-control`
  - `L221-L323`：`.scroll-list`・`.h-scroll-wrap`（右端フェード付き横スクロール）＆ `.h-scroll-row`・ボタン・テキスト入力・省略禁止
- **`css/theme.css`（268行）**
  - `L3-L75`：10異界テーマカラー（`[data-world="w1"]`〜`w10`）
  - `L76-L200`：6属性・4ロール・5レアリティ・5品質・対象範囲バッジ装飾
  - `L201-L268`：リッチタクティカルボタン群＆クリスタル幾何学背景パターン
- **`css/battle.css`（933行）**
  - `L3-L80`：`.battle-stage`・`.battle-fx-layer`（SVG攻撃軌跡ビーム＆着弾リングアニメーション）
  - `L81-L270`：上部HUD・`強敵`/`乱入`バッジ・デュアルレーン行動順タイムライン
  - `L271-L680`：敵味方グリッド・固定3段内部完結戦術カード（`.unit-head-row` / `.gauge-stack` / `.unit-foot-row`）・単独強敵/乱入大型プレート・中央アタックレーン（`.action-banner`）
  - `L681-L779`：カード下段配置フローティングポップ（`.float-pop`）・強敵/乱入フラッシュバナー
  - `L780-L933`：下半分一括DPSメーター（4人×4項目）・戦闘操作バー
- **`css/screens.css`（797行）**
  - `L3-L414`：上半分非戦闘プレビュー・通貨バー・クリスタル情報カード・戦力比較・固定高さステージカード（`.stage-card-head`）・コンパクトフィルタ・横ピル・1行リザルト獲得装備グリッド・ラベル付き進捗バー
  - `L415-L585`：下半分操作エリア・サブタブ・リスト項目・アクションバー・下部6タブナビ・均一高さ共鳴盤ノード（`min-height: 48px`）
  - `L586-L797`：召喚魔法陣＆光柱収束・レアリティフラッシュ・カード公開アニメーション・図鑑紹介文ボックス・リザルトバナー

### 基盤・データモジュール（`js/`）
- **`js/security.js`（270行）** — 公開：`window.__IZ_SEC__`
  - `L10-L20`：`escapeHtml` / `L21-L130`：SHA-256・HMAC・XOR・Base64
  - `L131-L236`：`sealData` / `unsealData` / `saveSecure` / `loadSecure` / `clearSecure` / `exportTransferCode` / `importTransferCode`
  - `L237-L253`：`clampInt` / `formatNum`
- **`js/icons.js`（58行）** — 公開：`window.__IZ_ICON__`
  - `L5-L44`：`PATHS`（属性6・ロール4・部位4・新出撃交差剣・魂晶・覇印等UI記号） / `L45-L49`：`svg(name, size)`
- **`js/audio.js`（107行）** — 公開：`window.__IZ_AUDIO__`
  - `L8-L39`：`ensureCtx` / `tone` / `L40-L91`：`play(kind)`（`summonCharge`, `summonUR` 含む） / `L92-L99`：`setEnabled` / `isEnabled`
- **`js/data_worlds.js`（1042行）** — 公開：`window.__IZ_WORLDS__`
  - `L5-L36`：`ELEMENTS`, `ROLES`, `RARITIES`, `ENEMY_KIND_ORDER`
  - `L37-L210`：`WORLDS`（10異界×10ステージ・5と10が単独ボス）
  - `L211-L881`：`ENEMIES`（通常30・乱入10・エリアボス20・異界討伐ボス6＝計66種・全種 `kana`＆`spawnText`＆2技＆紹介文）
  - `L882-L921`：`RAIDS`（異界討伐6種・属性順 炎→水→風→光→闇→無・`bossCharId`＆`bossMarkName`）
  - `L922-L957`：`GAUNTLETS`（総力連戦4コース）
  - `L958-L990`：`TOWER_MAX_FLOOR`(100) / `TOWER_MILESTONES`（25/50/75/100F限定キャラ＋10/40/65/90Fアビリティ） / `getTowerFloor`
  - `L991-L1020`：`TRIALS`（8種） / `getWorldNormalEnemies` / `compareEnemy` / `getAllEnemiesSorted`
- **`js/data_chars.js`（670行）** — 公開：`window.__IZ_CHARS__`
  - `L6-L13`：`BOARD_TEMPLATES`（共鳴盤6ノード定義）
  - `L20-L658`：`CHARS` 全52体（UR 13［討伐ボス6・討伐限定4・塔100F 1・通常召喚2］ / SSR 12 / SR 13 / R 8 / N 6・短縮名＆正確kana統一）
- **`js/data_equip.js`（456行）** — 公開：`window.__IZ_EQUIP__`
  - `L6-L24`：`QUALITIES`（品質5段階）・`SLOTS`（武器→防具→装飾→紋章）・`SLOT_MAP`
  - `L26-L295`：`EQUIP_SERIES`（通常14＋限定クラフト6［属性順］＝20シリーズ・全80部位個別紹介文 `partLores`）
  - `L296-L322`：`EQUIP_PARTS`（80部位・武器→防具→装飾→紋章順ソート済）・`PART_MAP`
  - `L323-L369`：`FREE_ABILITIES`（30種＋旧セーブ互換エイリアス）
  - `L370-L438`：`computePartySynergies`（全10異界・3軸シナジー）

### ゲームロジック・UI・アプリ制御（`js/`）
- **`js/state.js`（1109行）** — 公開：`window.__IZ_STATE__`
  - `L15-L37`：`compareChar` / `sortCharIds` / `getAllCharIdsSorted`（必須4段ソート）
  - `L43-L289`：`createInitialState` / `sanitizeState`（`bossMarks`・旧セーブ互換展開含む） / `init` / `persist`
  - `L291-L332`：`getEquipOwner` / `getEquipById` / `getEquipStatValue` / `getEquipPartPreviewValues` / `getAbilitySlotCount`
  - `L333-L563`：`getCharComputed`（全52体固有補正・共鳴盤・装備＆セット・自由アビ・共鳴・3軸シナジー）
  - `L565-L662`：`grantChar`・`doSummon`（UR3%含む）・`exchangeRaidChar`・`exchangeRaidBoss`（覇王の印5個）・`awakeWithSoul`
  - `L663-L764`：`unlockBoardNode`・`unlockAbility`・`toggleCharAbility`・`setCharLink`・`setPartySlot`・`setGauntletSlot`
  - `L765-L924`：`rollQuality`・`grantEquipDrop`・`craftLimitedEquip`・`equipItem`・`unequipSlot`・`autoEquipChar`・`autoFillGauntletParties`・`toggleEquipLock`・`bulkSellEquips`・`buyResourceWithGold`（1回/5回対応）
  - `L925-L1001`：`applyBattleReward`（覇王の印・塔限定キャラ加入対応）・`checkTrialRule`
  - `L1002-L1065`：`getSnapshot`・設定変更・引き継ぎコード・初期化
- **`js/battle.js`（963行）** — 公開：`window.__IZ_BATTLE__`
  - `L18-L182`：`getElementMult`・`buildAllyUnits`・`buildEnemyUnit`・バフ/デバフ＆実効ステ（`effAtk`, `effDef`, `effSpd`）
  - `L183-L357`：`spawnWave`・`getDpsRec`・`pickTargets`・`chooseAllySkill`・`chooseEnemySkill`・`scopeLabel`・`buildTargetSummary`
  - `L358-L580`：`executeTurn`（攻撃・回復・バフ・火傷死亡記録・`session.activeFx` SVG軌跡生成・DPS4項目集計）
  - `L581-L725`：`finishSingleRun`（全5モード報酬・覇王の印・塔限定キャラ・自動周回次周移行＆停止予約リザルト）
  - `L726-L950`：`startRunInstance`・`tick`（ノンストップATB進行＆周回RAF継続）・`stopLoop`・`start`・`toggleAutoLoop`
- **`js/ui_render.js`（2411行）** — 公開：`window.__IZ_UI__`
  - `L46-L176`：バッジ生成・横スクロールフィルタ（`.h-scroll-wrap`）・所持キャラ横切替ストリップ・入手元表示
  - `L177-L619`：戦闘DOM構築（3段内部完結カード `L190`）・SVG攻撃軌跡 `updateBattleFxSvg` (`L371`)・行動順ピップ `updateLanePips` (`L423`)・60fps差分更新 `renderBattle` (`L455`)
  - `L620-L750`：リザルト画面（1行獲得装備ピル・加入仲間/覇印・MVP・累計DPS）
  - `L751-L1646`：召喚魔法陣SVG (`L751`)・非戦闘上半分 `renderNonBattleUpper` (`L766`：全サブタブ完全連動・紹介文は図鑑専用)
  - `L1647-L2347`：下部6タブナビ (`L1647`)・非戦闘下半分 `renderNonBattleLower` (`L1666`：10異界横スクロール・1タップ自動売却・塔10F帯・召喚演出スキップ・覇王降臨・敵＆装備80部位図鑑)
  - `L2348-L2411`：`saveScrollPositions`・`restoreScrollPositions`・`renderFull`
- **`js/app.js`（645行）**
  - `L15-L57`：UI状態オブジェクト `ui`
  - `L58-L87`：`syncIosSafeAreaGuard`（実機iPhone PWA安全域保護）
  - `L88-L161`：トースト＆召喚演出タイマー制御（`startSummonAnimation`, `finishSummonAnim`）
  - `L162-L217`：`buildBattleConfig`・`launchBattle`
  - `L218-L607`：`handleAction`（全操作イベント・1タップ自動売却・覇王降臨・×5還元・図鑑フィルタ等）
  - `L608-L645`：`registerServiceWorker`・`boot`
