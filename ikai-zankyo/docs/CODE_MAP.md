# 「異界残響」コード地図（ファイル・関数・行番号インデックス）

> **目的**：次回以降の開発でコード全体を読まず、該当ファイルの必要行範囲だけを読んでトークンを大幅削減するための精密マップ。コード変更後は必ず該当行番号を更新すること。
> **基準パス**：`c:\Users\ABC\AppData\Local\Temp\newapp1\ikai-zankyo\`

---

## 1. 変更目的別・最速アクセス早見表
| やりたい改修 | 開くファイルと行番号 |
|---|---|
| SafeArea・上下50:50比率・PC表示枠・スクロール制御 | `css/base.css` L64-L202 |
| 6異界の背景色・属性/ロール/レアリティ/品質/範囲バッジ配色 | `css/theme.css` L3-L154 |
| 戦闘カード・デュアルレーン行動順・ボス/乱入演出・DPSメーター見た目 | `css/battle.css` L3-L729 |
| 非戦闘プレビュー・トースト・戦力バッジ・フィルタ・下部ナビ見た目 | `css/screens.css` L3-L558 |
| 暗号化・HMAC改ざん検知・引き継ぎコード・数値フォーマット | `js/security.js` L10-L270 |
| 汎用SVGアイコン追加・編集 | `js/icons.js` L5-L56 |
| Web Audio 効果音追加・音量調整 | `js/audio.js` L21-L97 |
| 異界・ステージ・通常敵/ボス/乱入/討伐ボス・PvE5種データ | `js/data_worlds.js` L5-L616 |
| プレイアブルキャラ36体・共鳴盤ノード定義 | `js/data_chars.js` L6-L480 |
| 装備品質・13装備シリーズ・自由アビリティ28種・3軸シナジー計算 | `js/data_equip.js` L6-L253 |
| 必須ソート・総合ステ計算・召喚・覚醒・共鳴盤・リンク・売却・セーブ | `js/state.js` L15-L1015 |
| ATBタイムライン・属性相性・AI・範囲対象・乱入抽選・DPS集計・自動周回 | `js/battle.js` L18-L878 |
| 戦闘中DOM差分更新・行動順2パス配置・リザルト・全6タブUI描画 | `js/ui_render.js` L16-L1835 |
| タップイベント処理・画面状態 `ui`・戦闘開始・SW登録 | `js/app.js` L15-L490 |

---

## 2. 全ファイル詳細マップ（実測行番号）

### ルート＆PWA基盤
- **`index.html`（50行）**
  - `L1-L24`：viewport (`viewport-fit=cover`)・CSP・PWAメタ・SVGアイコン・CSS読込
  - `L25-L36`：DOM骨格（`#device-stage` > `#app-shell` > `.safe-area-top` / `.safe-boundary-top` / `#game-viewport`［`#upper-display` + `.split-divider` + `#lower-control`］ / `.safe-boundary-bottom` / `.safe-area-bottom`）
  - `L38-L48`：JS10本の `defer` 読込順
- **`manifest.json`（27行）**：PWAスタンドアロン・縦画面固定・SVGデータURIアイコン
- **`sw.js`（51行）**
  - `L1-L20`：`CACHE_NAME`（現在 `'ikai-zankyo-v3'`）・キャッシュ対象 `ASSETS`
  - `L22-L35`：`install` / `activate`（旧キャッシュ削除＆即有効化）
  - `L36-L50`：`fetch`（Network-First＋オフラインキャッシュフォールバック）

### スタイルシート（`css/`）
- **`css/base.css`（255行）**
  - `L1-L57`：リセット・CSS変数・`100dvh`・`overflow: hidden`・`touch-action: manipulation`
  - `L58-L63`：等幅数値 `.num`（`tabular-nums`）
  - `L64-L101`：`#device-stage` / `#app-shell`・PC閲覧時iPhone14実寸枠
  - `L102-L125`：`.safe-area-top` / `.safe-area-bottom` / `.safe-boundary`（発光境界線）
  - `L126-L184`：`#game-viewport`（上下50:50）・`#upper-display`（`pointer-events: none`）・`.split-divider`・`#lower-control`
  - `L185-L202`：`.scroll-list`（スクロールバー完全非表示）
  - `L203-L255`：高感度ボタン・テキスト入力(16px)・省略禁止・SVG共通
- **`css/theme.css`（217行）**
  - `L3-L40`：6異界テーマカラー（`[data-world="w1"]`〜`w6`）
  - `L41-L64`：6属性カラー＆`.el-badge`
  - `L65-L84`：4ロールカラー＆`.role-badge`
  - `L85-L113`：5レアリティ装飾＆`.rar-tag`
  - `L114-L137`：5品質装飾＆`.qual-tag`
  - `L138-L154`：対象範囲バッジ（単体/範囲/全体/パッシブ）
  - `L155-L217`：リッチボタン群＆軽量背景幾何学パターン
- **`css/battle.css`（729行）**
  - `L3-L91`：`.battle-stage`・ステージ/WAVE/周回HUD・`BOSS`/`乱入`バッジ
  - `L92-L209`：デュアルレーン行動順タイムライン（`.timeline-dual`, `.ally-lane`, `.enemy-lane`, `.timeline-pip`）
  - `L210-L343`：敵味方グリッド・2段レイアウト戦術カード・単独BOSS/単独乱入大型プレート
  - `L344-L422`：HP残像バー・HPバー・ATBバー（ぬるぬるトランジション）
  - `L423-L495`：バフ/デバフチップ・CT表示・敵強技予告
  - `L496-L585`：発動技バナー・フローティングダメージ数値・ボス/乱入フラッシュバナー
  - `L586-L729`：下半分一括DPSメーター（4人×4項目）・戦闘操作バー
- **`css/screens.css`（558行）**
  - `L3-L192`：上半分非戦闘プレビュー・通貨バー・情報カード・技一覧・シナジー・編成4枠
  - `L193-L322`：トースト（ヘッダー上端）・戦力比較バッジ・固定高さステージカード・フィルタチップ・リザルト装備グリッド・ロック強調・敵ミニチップ・収集率バー
  - `L323-L467`：下半分操作エリア・サブタブ・リスト項目・アクションバー・下部6タブナビ
  - `L468-L558`：共鳴盤ノード・召喚グリッド・図鑑紹介文ボックス・品質ドット・リザルトバナー

### 基盤・データモジュール（`js/`）
- **`js/security.js`（270行）** — 公開：`window.__IZ_SEC__`
  - `L10-L20`：`escapeHtml`（XSS対策）
  - `L21-L130`：`sha256Hex`, `signPayload`, `xorStream`, Base64, `genNonce`
  - `L131-L168`：`sealData` / `unsealData`（暗号化＋HMAC改ざん検証）
  - `L169-L216`：`saveSecure` / `loadSecure` / `clearSecure`（二重バックアップ自動復旧）
  - `L217-L236`：`exportTransferCode` / `importTransferCode`（`IZ1-...`）
  - `L237-L253`：`clampInt` / `formatNum`（万・億桁圧縮）
- **`js/icons.js`（56行）** — 公開：`window.__IZ_ICON__`
  - `L5-L42`：`PATHS`（属性6・ロール4・部位4・UI記号12の汎用SVGパス）
  - `L43-L47`：`svg(name, size)`
- **`js/audio.js`（97行）** — 公開：`window.__IZ_AUDIO__`
  - `L8-L39`：`ensureCtx` / `tone`
  - `L40-L81`：`play(kind)`（`tap/hit/crit/heal/boss/intruder/summon/rare/win`）
  - `L82-L89`：`setEnabled` / `isEnabled`
- **`js/data_worlds.js`（616行）** — 公開：`window.__IZ_WORLDS__`
  - `L5-L28`：`ELEMENTS`, `ROLES`, `RARITIES`（ソート順 `order` 含む）
  - `L29-L127`：`WORLDS`（6異界×6ステージ・ドロップ・乱入ID）
  - `L129-L298`：`ENEMIES` 通常敵18種（各技2つ＋紹介文）
  - `L299-L408`：`ENEMIES` ステージ3・6単独ボス12体
  - `L409-L464`：`ENEMIES` 単独乱入敵6体
  - `L465-L521`：`ENEMIES` 異界討伐単独巨大ボス6体
  - `L523-L532`：`RAIDS`（異界討伐6種・限定素材＆限定キャラ鍵）
  - `L533-L560`：`GAUNTLETS`（総力連戦3コース）
  - `L561-L581`：`TOWER_MAX_FLOOR`(30) / `getTowerFloor`
  - `L582-L600`：`TRIALS`（試練の狭間8種） / `getWorldNormalEnemies`
- **`js/data_chars.js`（480行）** — 公開：`window.__IZ_CHARS__`
  - `L6-L13`：`BOARD_TEMPLATES`（共鳴盤6ノード定義）
  - `L22-L72`：`CHARS` UR 4体（異界討伐限定）
  - `L73-L170`：`CHARS` SSR 8体
  - `L171-L292`：`CHARS` SR 10体
  - `L293-L390`：`CHARS` R 8体
  - `L391-L465`：`CHARS` N 6体
- **`js/data_equip.js`（253行）** — 公開：`window.__IZ_EQUIP__`
  - `L6-L20`：`QUALITIES`（品質5段階・重み・倍率・売値）・`SLOTS`（4部位）
  - `L22-L121`：`EQUIP_SERIES`（通常9種［`s_veil`含む］＋限定クラフト4種＝13シリーズ）
  - `L123-L163`：`FREE_ABILITIES`（自由アビリティ28種）
  - `L165-L237`：`computePartySynergies`（①属性軸 `L180` / ②ロール軸 `L203` / ③出身異界軸 `L223`）

### ゲームロジック・UI・アプリ制御（`js/`）
- **`js/state.js`（1015行）** — 公開：`window.__IZ_STATE__`（生状態 `S` は非露出）
  - `L15-L37`：`compareChar` / `sortCharIds` / `getAllCharIdsSorted`（必須4段ソート）
  - `L43-L258`：`createInitialState` / `sanitizeState` / `init` / `persist`
  - `L266-L294`：装備所有者検索・単体値計算・アビリティ枠数計算
  - `L295-L497`：`getCharComputed`（基礎×覚醒＋共鳴盤 `L337`＋装備＆セット `L351`＋自由アビリティ `L405`＋共鳴リンク `L432`＋3軸シナジー `L452`）
  - `L499-L568`：`grantChar`（上限超過時魂晶自動変換）・`doSummon`・`exchangeRaidChar`
  - `L569-L646`：`awakeWithSoul`・`unlockBoardNode`・`unlockAbility`・`toggleCharAbility`・`setCharLink`
  - `L647-L687`：`setPartySlot`・`setGauntletSlot`
  - `L688-L846`：`rollQuality`・`grantEquipDrop`（自動売却判定）・`craftLimitedEquip`・`equipItem`・`unequipSlot`・`autoEquipChar`・`autoFillGauntletParties`・`toggleEquipLock`・`bulkSellEquips`・`buyResourceWithGold`
  - `L847-L910`：`applyBattleReward`・`checkTrialRule`
  - `L911-L970`：`getSnapshot`・設定変更・引き継ぎコード発行/復元・初期化
- **`js/battle.js`（878行）** — 公開：`window.__IZ_BATTLE__`
  - `L18-L36`：`getElementMult`（属性相性計算）
  - `L37-L121`：`buildAllyUnits` / `buildEnemyUnit`
  - `L122-L175`：バフ/デバフ管理＆実効ステ計算（`effAtk`, `effDef`, `effSpd`）
  - `L176-L263`：`spawnWave`（メイン5WAVE・単独ボス・単独乱入抽選・討伐・総力・塔・試練）
  - `L264-L345`：`getDpsRec`・`pickTargets`（陣形なし範囲選出）・`chooseAllySkill`・`chooseEnemySkill`
  - `L346-L539`：`executeTurn`（継続ダメ・回復・バフ・攻撃・会心・WEAK/RESIST・吸血・DPS4項目集計・パッシブ）
  - `L540-L673`：`finishSingleRun`（全5モード報酬・自動周回リトライ＆手動停止後トータルリザルト）
  - `L674-L865`：`startRunInstance`・`tick`（60fps ATB進行）・`start`・`toggleAutoLoop`
- **`js/ui_render.js`（1835行）** — 公開：`window.__IZ_UI__`
  - `L16-L119`：バッジ生成ヘルパー・`timelineCallName`・属性/ロールフィルタ描画
  - `L125-L321`：戦闘DOM初回構築（`buildBattleUnitCardHtml` 2段カード `L139`、`mountBattleDom` `L212`）
  - `L322-L500`：`updateLanePips`（2パス完全非重複 `L322`）・`renderBattle`（60fps差分更新 `L356`）
  - `L507-L624`：リザルト画面描画（上半分トータル＆装備詳細＆MVP `L507`、下半分累計DPS `L576`）
  - `L628-L1209`：非戦闘上半分（①出撃 `L633` / ②編成 `L855` / ③育成 `L921` / ④装備 `L970` / ⑤召喚 `L1035` / ⑥図鑑＆設定 `L1075` ※紹介文はここ限定）
  - `L1213-L1792`：下部ナビ（`L1213`）＆非戦闘下半分（①出撃 `L1237` / ②編成 `L1379` / ③育成 `L1420` / ④装備 `L1524` / ⑤召喚 `L1653` / ⑥図鑑＆設定 `L1706`）
  - `L1793-L1826`：`renderFull`（世界観テーマ切替＆戦闘/非戦闘振り分け）
- **`js/app.js`（490行）**
  - `L15-L64`：UI状態オブジェクト `ui`・`clearToast`・`showToast`
  - `L65-L118`：`buildBattleConfig`・`launchBattle`
  - `L119-L457`：`handleAction`（全操作イベントのディスパッチ）
  - `L458-L490`：`registerServiceWorker`・`boot`（下半分限定クリック委譲＆ズーム抑止）
