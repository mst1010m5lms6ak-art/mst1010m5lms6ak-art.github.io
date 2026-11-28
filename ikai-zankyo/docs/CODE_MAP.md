# 「異界残響」コード地図（ファイル・関数・行番号インデックス）

> **目的**：次回以降の開発でコード全体を読まず、該当ファイルの必要行範囲だけを読んでトークンを大幅削減するための精密マップ。コード変更後は必ず該当行番号を更新すること。
> **基準パス**：`c:\Users\ABC\AppData\Local\Temp\newapp1\ikai-zankyo\`

---

## 1. 変更目的別・最速アクセス早見表
| やりたい改修 | 開くファイルと行番号 |
|---|---|
| iOS PWA SafeArea・`--app-vh`・上下50:50比率・フォント・縦横スクロール | `css/base.css` L1-L326 |
| 10異界テーマ・属性/ロール/レアリティ/品質/範囲/倍率・CTバッジ・リッチボタン | `css/theme.css` L1-L306 |
| 行動順キュー・HP非表示3段カード・2体/単独適正枠・SVG軌跡・DPS＆至宝ボード | `css/battle.css` L1-L1043 |
| 非戦闘プレビュー・リザルト貫通ゼロ8マス・覚醒ロードマップ・5タブナビ・召喚演出 | `css/screens.css` L1-L1002 |
| 暗号化・HMAC改ざん検知・引き継ぎコード・数値桁圧縮フォーマット | `js/security.js` L10-L270 |
| 汎用SVGアイコン追加・編集（出撃交差剣・魂晶・覇印・歯車含む） | `js/icons.js` L5-L57 |
| Web Audio 効果音追加・召喚演出SE調整 | `js/audio.js` L8-L106 |
| 10異界・100ステージ・敵66種＆公式ソート・討伐属性順・塔100F・PvE5種 | `js/data_worlds.js` L5-L1041 |
| プレイアブルキャラ56体（通常UR6全属性含む）・刻印12種 | `js/data_chars.js` L6-L720 |
| 装備20シリーズ80部位（個別紹介文・部位順ソート）・自由アビリティ30種・シナジー | `js/data_equip.js` L6-L455 |
| 必須4段ソート・総合ステ計算・刻印12種・被り非覚醒変換・軽量速度・セーブ | `js/state.js` L15-L1118 |
| ノンストップATB・行動順予測・DPS時間計測・至宝追跡・30fps低発熱ループ | `js/battle.js` L21-L1044 |
| 低発熱キャッシュ戦闘描画・技倍率・統合キャラ/独立設定タブ・召喚・図鑑 | `js/ui_render.js` L1-L2645 |
| iOS安全域実測ガード・召喚陣自動復帰・画面状態 `ui`・全操作ハンドラ・SW登録 | `js/app.js` L15-L685 |

---

## 2. 全ファイル詳細マップ（実測行番号）

### ルート＆PWA基盤
- **`index.html`（50行）**
  - `L1-L21`：viewport (`viewport-fit=cover`)・CSP・PWAメタ（`apple-mobile-web-app-status-bar-style: black` で下部謎余白＆上部暗転防止）・SVGアイコン・CSS読込
  - `L22-L38`：DOM骨格（`#device-stage` > `#app-shell` > `.safe-area-top` / `.safe-boundary-top` / `#game-viewport`［`#upper-display` + `.split-divider` + `#lower-control`］ / `.safe-boundary-bottom` / `.safe-area-bottom`）
  - `L39-L50`：JS10本の `defer` 読込順
- **`manifest.json`（26行）**：PWAスタンドアロン・縦画面固定・テーマ色 `#05070d`・SVGデータURIアイコン
- **`sw.js`（50行）**
  - `L1-L20`：`CACHE_NAME`（現在 `'ikai-zankyo-v6'`）・キャッシュ対象 `ASSETS`
  - `L22-L35`：`install` / `activate`（旧キャッシュ削除＆即有効化）
  - `L36-L50`：`fetch`（Network-First＋オフラインキャッシュフォールバック）

### スタイルシート（`css/`）
- **`css/base.css`（326行）**
  - `L1-L67`：リセット・CSS変数（`--app-vh`, `--safe-top-pad`含む）・オフライン最適フォント・等幅数値 `.num`
  - `L68-L152`：`#device-stage`（`var(--app-vh, 100dvh)`）・`#app-shell`・PC閲覧時iPhone14実寸枠・`.safe-area-top/bottom`・`.safe-boundary`
  - `L153-L220`：`#game-viewport`（上下50:50）・`#upper-display`（`pointer-events: none`）・`.split-divider`・`#lower-control`
  - `L221-L326`：`.scroll-list`・`.h-scroll-wrap`＆`.h-scroll-row`・ボタン・テキスト入力・省略禁止
- **`css/theme.css`（306行）**
  - `L3-L75`：10異界テーマカラー（`[data-world="w1"]`〜`w10`）
  - `L76-L234`：6属性・4ロール・5レアリティ・5品質・対象範囲・技倍率（`.mult-badge`）・CT（`.ct-badge`）バッジ装飾
  - `L235-L306`：リッチタクティカルボタン群＆クリスタル幾何学背景パターン
- **`css/battle.css`（1043行）**
  - `L3-L70`：`.battle-stage`・`.battle-fx-layer`（SVG攻撃軌跡ビーム＆着弾リング）
  - `L71-L240`：上部HUD・強敵/乱入バッジ・敵味方混合行動順キュー（`.action-queue-box` / `.aq-item`）
  - `L241-L650`：敵味方グリッド（2体・単独ボス/乱入の適正高さ中央寄せ）・HP非表示3段戦術カード・GPU `scaleX` HP/ATBバー・中央アタックレーン
  - `L651-L785`：カード中央ゲージ帯フローティングポップ（`.float-pop`）・強敵/乱入フラッシュ・至宝獲得フラッシュ（`.treasure-flash`）
  - `L786-L1043`：下半分リアルタイムDPS＆戦績ボード（`.dps-summary-bar`, `.treasure-pill`, `.dps-main-bar-fill`, 4項目グリッド）・戦闘操作バー
- **`css/screens.css`（1002行）**
  - `L3-L340`：上半分非戦闘プレビュー・通貨バー・クリスタル情報カード・リザルト8マス（`.result-stat-grid`）・出撃パーティミニ帯・育成装備ミニ帯・覚醒ロードマップ・召喚UR6体グリッド・コンパクト編成行・スクロールバーなし2行 `textarea.transfer-area`・危険操作枠
  - `L341-L625`：トースト（下端非干渉配置）・戦力比較・固定高さステージカード・フィルタ・横ピル・1行リザルト獲得装備・進捗バー
  - `L626-L785`：下半分操作エリア・サブタブ・リスト項目・アクションバー・下部5タブナビ（`.bottom-nav`）・均一高さ刻印12種ノード（`.node-card`）
  - `L786-L1002`：召喚魔法陣＆光柱収束・レアリティフラッシュ・カード公開演出・図鑑紹介文ボックス・リザルトバナー

### 基盤・データモジュール（`js/`）
- **`js/security.js`（270行）** — 公開：`window.__IZ_SEC__`
  - `L10-L20`：`escapeHtml` / `L21-L130`：SHA-256・HMAC・XOR・Base64
  - `L131-L235`：`sealData` / `unsealData` / `saveSecure` / `loadSecure` / `clearSecure` / `exportTransferCode` / `importTransferCode`
  - `L237-L250`：`clampInt` / `formatNum`（10万〜万、1000万〜整数万、1億〜億で最大6〜7文字収容）
- **`js/icons.js`（57行）** — 公開：`window.__IZ_ICON__`
  - `L5-L43`：`PATHS`（属性6・ロール4・部位4・出撃交差剣・魂晶・覇印・歯車等UI記号） / `L45-L49`：`svg(name, size)`
- **`js/audio.js`（106行）** — 公開：`window.__IZ_AUDIO__`
  - `L8-L39`：`ensureCtx` / `tone` / `L40-L91`：`play(kind)` / `L92-L99`：`setEnabled` / `isEnabled`
- **`js/data_worlds.js`（1041行）** — 公開：`window.__IZ_WORLDS__`
  - `L5-L36`：`ELEMENTS`, `ROLES`, `RARITIES`, `ENEMY_KIND_ORDER`
  - `L37-L210`：`WORLDS`（10異界×10ステージ・5と10が単独ボス）
  - `L211-L881`：`ENEMIES`（通常30・乱入10・エリアボス20・異界討伐ボス6＝計66種・全種 `kana`＆`spawnText`＆2技＆紹介文）
  - `L882-L921`：`RAIDS`（異界討伐6種・属性順 炎→水→風→光→闇→無）
  - `L922-L957`：`GAUNTLETS`（総力連戦4コース）
  - `L958-L990`：`TOWER_MAX_FLOOR`(100) / `TOWER_MILESTONES` / `getTowerFloor`
  - `L991-L1020`：`TRIALS`（8種） / `getWorldNormalEnemies` / `compareEnemy` / `getAllEnemiesSorted`
- **`js/data_chars.js`（720行）** — 公開：`window.__IZ_CHARS__`
  - `L6-L19`：`BOARD_TEMPLATES`（刻印12種定義）
  - `L26-L709`：`CHARS` 全56体（UR 17［討伐ボス6・討伐限定4・塔100F 1・通常召喚6全属性］ / SSR 12 / SR 13 / R 8 / N 6）
- **`js/data_equip.js`（455行）** — 公開：`window.__IZ_EQUIP__`
  - `L6-L24`：`QUALITIES`（品質5段階）・`SLOTS`（武器→防具→装飾→紋章）・`SLOT_MAP`
  - `L26-L295`：`EQUIP_SERIES`（通常14＋限定クラフト6＝20シリーズ・全80部位個別紹介文 `partLores`）
  - `L296-L322`：`EQUIP_PARTS`（80部位・武器→防具→装飾→紋章順ソート済）・`PART_MAP`
  - `L323-L369`：`FREE_ABILITIES`（30種＋旧セーブ互換）
  - `L370-L438`：`computePartySynergies`（全10異界・3軸シナジー）

### ゲームロジック・UI・アプリ制御（`js/`）
- **`js/state.js`（1118行）** — 公開：`window.__IZ_STATE__`
  - `L15-L37`：`compareChar` / `sortCharIds` / `getAllCharIdsSorted`（必須4段ソート）
  - `L43-L290`：`createInitialState` / `sanitizeState` / `init` / `persist`
  - `L291-L332`：`getEquipOwner` / `getEquipById` / `getEquipStatValue` / `getEquipPartPreviewValues` / `getAbilitySlotCount`
  - `L333-L574`：`getCharComputed`（全56体固有補正・刻印12種・装備＆セット・自由アビ・共鳴・3軸シナジー）
  - `L575-L667`：`grantChar`（被り非覚醒・即魂晶＆結晶変換）・`doSummon`・`exchangeRaidChar`・`exchangeRaidBoss`・`awakeWithSoul`
  - `L668-L769`：`unlockBoardNode`（刻印解放）・`unlockAbility`・`toggleCharAbility`・`setCharLink`・`setPartySlot`・`setGauntletSlot`
  - `L770-L929`：`rollQuality`・`grantEquipDrop`・`craftLimitedEquip`・`equipItem`・`unequipSlot`・`autoEquipChar`・`autoFillGauntletParties`・`toggleEquipLock`・`bulkSellEquips`・`buyResourceWithGold`
  - `L930-L1006`：`applyBattleReward`・`checkTrialRule`
  - `L1007-L1072`：`getSnapshot`・`getBattleSpeed`（軽量取得）・設定変更・引き継ぎコード・初期化
- **`js/battle.js`（1044行）** — 公開：`window.__IZ_BATTLE__`
  - `L21-L186`：`getElementMult`・`buildAllyUnits`・`buildEnemyUnit`・バフ/デバフ＆実効ステ（`effAtk`, `effDef`, `effSpd`）
  - `L187-L374`：`computeActionOrder`（行動順キュー予測）・`spawnWave`・`getDpsRec`・`pickTargets`・`chooseAllySkill`・`chooseEnemySkill`・`scopeLabel`・`buildTargetSummary`
  - `L375-L599`：`executeTurn`（攻撃・回復・バフ・火傷・`session.activeFx`・DPS4項目集計）
  - `L600-L765`：`finishSingleRun`（全5モード報酬・戦闘時間累計・至宝ドロップ追跡＆フラッシュ・自動周回移行）
  - `L766-L1044`：`startRunInstance`・`tick`（ノンストップATB＆30fps描画スロットリング）・`stopLoop`・`start`・`forceUpdate`・`toggleAutoLoop`
- **`js/ui_render.js`（2645行）** — 公開：`window.__IZ_UI__`
  - `L46-L195`：バッジ生成・技倍率/CT/範囲 `skillMetaHtml` (`L74`)・`formatDps`・横スクロールフィルタ・所持キャラ横切替ストリップ
  - `L196-L782`：戦闘カード `buildBattleUnitCardHtml` (`L229`)・上下分離マウント `mountBattleUpperDom` (`L299`) / `mountBattleLowerDom` (`L379`)・座標キャッシュSVG軌跡 `updateBattleFxSvg` (`L491`)・低発熱キャッシュ差分描画 `renderBattle` (`L540`)
  - `L783-L943`：リザルト画面（枠貫通ゼロ8マス・平均DPS/至宝帯・品質別内訳・累計DPSメーター）
  - `L944-L1881`：召喚魔法陣SVG (`L944`)・非戦闘上半分 `renderNonBattleUpper` (`L959`：ステージ選択乱入削除＆異界情景常時＆パーティミニ帯・統合キャラ・召喚・図鑑3種・独立設定)
  - `L1882-L2586`：下部5タブナビ `renderBottomNav` (`L1882`)・非戦闘下半分 `renderNonBattleLower` (`L1900`：統合キャラ6サブタブ［編成・刻印12種・覚醒ロードマップ・アビ・共鳴・装備4切替］・召喚UR6体詳細ジャンプ・図鑑3種・独立設定)
  - `L2587-L2645`：`saveScrollPositions`・`restoreScrollPositions`・`renderFull`
- **`js/app.js`（685行）**
  - `L15-L57`：UI状態オブジェクト `ui`（5タブ・`charSub` 等）
  - `L58-L100`：`syncIosSafeAreaGuard`（実測 `env()`＆`--app-vh` 二重安全域保護）
  - `L101-L174`：トースト＆召喚演出タイマー制御（`startSummonAnimation`, `finishSummonAnim`）
  - `L175-L230`：`buildBattleConfig`・`launchBattle`
  - `L231-L647`：`handleAction`（タブ切替召喚陣自動復帰・編成→育成キャラ同期・UR図鑑直通・速度設定・全操作ハンドラ）
  - `L648-L685`：`registerServiceWorker`・`boot`
