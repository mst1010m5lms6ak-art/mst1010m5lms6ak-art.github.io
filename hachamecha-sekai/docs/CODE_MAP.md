# はちゃめちゃ世界 コード地図（ファイル＆行番号マップ）

> トークン節約用インデックスです。改修時はファイル全体を読まず、該当行範囲だけを開いて作業してください。

## index.html (80行)
- L1-L80: 構成・設定ファイル

## manifest.json (26行)
- L1-L26: 構成・設定ファイル

## sw.js (78行)
- L1-L78: 構成・設定ファイル

## capacitor.config.json (12行)
- L1-L12: 構成・設定ファイル

## .github/workflows/pages.yml (35行)
- L1-L35: 構成・設定ファイル

## css/base.css (196行)
- L1: :root {

## css/layout.css (411行)
- L2: .app-root {
- L48: /* ========== 上半分：閲覧専用ビューポート（ボタン類は一切置かない） ========== */
- L50: .top-stage {
- L112: /* ========== 下半分：親指操作ドック ========== */
- L113: .bottom-dock {
- L148: /* ========== 最下部メインナビ（親指最優先領域） ========== */
- L149: .bottom-nav {
- L288: .sheet-overlay {
- L354: .toast-layer {
- L395: @media (min-height: 780px) {
- L396: .top-stage { flex: 0 0 38%; }
- L401: @media (max-height: 700px) {
- L402: .top-stage { flex: 0 0 43%; padding: 4px 8px 4px; }
- L404: .bottom-dock { padding: 4px 8px 4px; gap: 4px; }
- L405: .bottom-nav { flex: 0 0 50px; padding: 3px 5px 4px; }
- L409: .toast-layer { bottom: calc(var(--safe-bottom) + 56px); }

## css/battle.css (585行)
- L1: /* ========== バトル上部ステージ（完全閲覧専用） ========== */
- L62: .turn-order-bar {
- L193: .unit-card {
- L210: .unit-card.enemy-card {
- L216: .unit-card.boss-card {
- L222: .unit-card.intruder-card {
- L228: .unit-card.acting {
- L234: .unit-card.targeted {
- L238: .unit-card.dead {
- L265: .unit-card.hit-shake {
- L436: /* ========== バトル下部親指ドック（ログ／DPS切替＋操作ボタン） ========== */
- L457: .battle-log-list {
- L485: .dps-controls {
- L575: @media (max-height: 700px) {
- L576: .unit-card { padding: 3px 5px; gap: 2px; }

## css/screens.css (524行)
- L1: /* ========== 共通プレビューカード（上半分ビューポート用） ========== */
- L129: /* ========== キャラカードリスト（下半分・2列で名前見切れゼロ） ========== */
- L189: /* ========== ノンスクロール5×5アビリティマトリクス ========== */
- L190: .ab-matrix {
- L242: /* ========== プリコネ式 6枠RANKアップ盤面（ノンスクロール） ========== */
- L243: .rank-board {
- L276: /* ========== 装備4部位スロット（ノンスクロール） ========== */
- L297: /* ========== 編成スロット（4メイン + 4バディリンク） ========== */
- L326: /* ========== 冒険・ステージ・闘技場リスト ========== */
- L365: .formation-grid {
- L515: @media (max-height: 700px) {

## js/core/namespace.js (162行)
- L6: HW.ELEMENTS = [
- L15: HW.RACES = [
- L25: HW.ROLES = [
- L32: HW.EQUIP_SLOTS = [
- L39: HW.TARGET_LABELS = {
- L50: HW.STATUS_META = {
- L71: HW.RANK_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
- L73: HW.STAR_SHARD_COST = {
- L82: HW.RANK_MATERIALS = [
- L91: HW.getElement = function (id) {
- L95: HW.getRace = function (id) {
- L99: HW.getRole = function (id) {
- L103: HW.getElementMultiplier = function (atkEl, defEl) {
- L121: HW.compareCharacters = function (a, b) {
- L142: HW.formatNum = function (n) {
- L149: HW.getQualityMeta = function (quality) {
- L158: HW.uid = function (prefix) {

## js/core/security.js (90行)
- L7: function fnv1a(str, seed) {
- L16: function signPayload(jsonStr) {
- L23: function escapeHtml(value) {
- L32: function encodeSave(saveObj) {
- L38: function decodeSave(rawStr) {
- L59: function exportBackupCode(saveObj) {
- L67: function importBackupCode(code) {
- L82: HW.Security = {

## js/core/storage.js (137行)
- L12: function openDb() {
- L68: function saveNow(stateObj) {
- L78: function scheduleSave(stateObj) {
- L130: HW.Storage = {

## js/core/audio.js (84行)
- L8: function ensureCtx() {
- L21: function tone(freq, dur, type, vol, slideTo) {
- L38: HW.Audio = {
- L39: setEnabled: function (flag) {
- L42: isEnabled: function () {
- L45: unlock: function () {
- L48: tap: function () {
- L51: hit: function (isCrit) {
- L59: heal: function () {
- L63: spark: function () {
- L67: rankUp: function () {
- L72: maxDrop: function () {
- L77: win: function () {

## js/core/icons.js (58行)
- L41: HW.icon = function (name, size, color) {

## js/core/state.js (438行)
- L6: function createInitialState() {
- L93: function migrateState(data) {
- L123: HW.State = {
- L138: save: function (immediate) {
- L151: getUnlockedAbilityTiers: function (charId) {
- L160: getRankSlotMaterialId: function (charId, slotIdx) {
- L167: getRankSlotCost: function (charId) {
- L172: fillRankSlot: function (charId, slotIdx) {
- L184: promoteRank: function (charId) {
- L203: unlockOrStarUp: function (charId, useOmni) {
- L245: unlockSpecialGear: function (charId, kind) {
- L271: setAbility: function (charId, tierIdx, colIdx) {
- L282: getEquipById: function (eqId) {
- L287: getEquipOwner: function (eqId) {
- L298: equipItem: function (charId, eqId) {
- L313: unequipSlot: function (charId, slotId) {
- L321: toggleEquipLock: function (eqId) {
- L329: sellEquip: function (eqId) {
- L342: grantEquipmentDrop: function (setId, minQuality, slotOverride) {
- L376: unlockFormation: function (formId) {
- L385: isStageUnlocked: function (stageId) {
- L394: getBusyDispatchChars: function () {
- L407: buyShopItem: function (shopId) {

## js/data/abilities.js (197行)
- L10: HW.ABILITIES = {
- L184: HW.getAllAbilitiesFlat = function () {

## js/data/equipments.js (181行)
- L10: HW.EQUIP_SETS = [
- L12: 装備セット 紅蓮轟炎
- L21: 装備セット 蒼穹要塞
- L30: 装備セット 疾風電光
- L39: 装備セット 閃光必殺
- L48: 装備セット 聖樹慈愛
- L57: 装備セット 深淵呪毒
- L66: 装備セット 鮮血輪廻
- L75: 装備セット 時空歯車
- L84: 装備セット 覇王闘神
- L93: 装備セット 万象混沌
- L123: HW.EQUIP_TEMPLATES = [];
- L149: HW.getEquipSet = function (setId) {
- L153: HW.getEquipTemplate = function (tplId) {
- L161: HW.calcEquipStats = function (item) {
- L174: HW.getEquipSellValue = function (item) {

## js/data/formations.js (229行)
- L10: HW.FORMATIONS = [
- L12: 陣形 均衡スクエア
- L24: 陣形 鳳天一点陣
- L36: 陣形 電光突撃陣
- L48: 陣形 竜顎破砕陣
- L60: 陣形 双盾要塞陣
- L72: 陣形 混沌呪術陣
- L84: 陣形 聖樹循環陣
- L96: 陣形 はちゃめちゃ乱舞陣
- L109: HW.getFormation = function (id) {
- L116: HW.evaluateSynergies = function (mainIds, linkIds) {
- L124: function addMod(m) {

## js/data/characters.js (516行)
- L11: HW.CHARACTERS = [
- L12: // ==================== 炎属性 (4体) ====================
- L14: キャラ id: 'c_kagura' (カグラ)
- L34: キャラ id: 'c_ignis_rex' (バルカノス)
- L55: キャラ id: 'c_piro' (ピロロ)
- L75: キャラ id: 'c_homura' (ホムラ)
- L95: // ==================== 水属性 (4体) ====================
- L97: キャラ id: 'c_suiren' (スイレン)
- L117: キャラ id: 'c_mizuchi' (ミヅチ)
- L137: キャラ id: 'c_kurage' (クラゲール)
- L157: キャラ id: 'c_shizuku' (シズク)
- L177: // ==================== 風属性 (4体) ====================
- L179: キャラ id: 'c_zephyr' (ゼフィル)
- L199: キャラ id: 'c_garuda' (ガルダイン)
- L219: キャラ id: 'c_bambo' (バンブオー)
- L239: キャラ id: 'c_aria' (アリアナ)
- L259: // ==================== 光属性 (4体) ====================
- L261: キャラ id: 'c_lumina' (ルミナ)
- L281: キャラ id: 'c_sol_knight' (アポロン零)
- L302: キャラ id: 'c_paladin' (レオハルト)
- L322: キャラ id: 'c_ray' (レイヴン)
- L342: // ==================== 闇属性 (4体) ====================
- L344: キャラ id: 'c_noctis' (ノクティス)
- L365: キャラ id: 'c_lilith' (リリスベル)
- L385: キャラ id: 'c_dullahan' (デュラハーン)
- L405: キャラ id: 'c_nyx' (ニュクス)
- L425: // ==================== 無属性 (4体) ====================
- L427: キャラ id: 'c_zero_mk' (ゼロギア)
- L447: キャラ id: 'c_musashi' (ムサシ丸)
- L467: キャラ id: 'c_chronos' (クロノア)
- L487: キャラ id: 'c_mille' (ミルフィー)
- L510: HW.CHARACTERS_SORTED = HW.CHARACTERS.slice().sort(HW.compareCharacters);
- L512: HW.getCharDef = function (id) {

## js/data/enemies.js (347行)
- L10: HW.ENEMIES = [
- L11: // ========== エリア1（ネオン商店街×剣と魔法）通常敵4 + ボス1 ==========
- L13: 敵 電脳スライム
- L22: 敵 ロックゴブリン
- L31: 敵 暴走ドローン
- L40: 敵 看板バケネコ
- L49: 敵 魔神デパトス
- L59: // ========== エリア2（深海竜宮×軌道エレベーター）通常敵4 + ボス1 ==========
- L61: 敵 珊瑚アーマー兵
- L70: 敵 光学イカ兵
- L79: 敵 泡玉妖精
- L88: 敵 海竜シードラ
- L97: 敵 海皇ポセイドン
- L107: // ========== エリア3（妖精遊園地×戦国要塞）通常敵4 + ボス1 ==========
- L109: 敵 具足クマ侍
- L118: 敵 道化インプ
- L127: 敵 カラクリ忍犬
- L136: 敵 綿あめ術師
- L145: 敵 妖精将軍フウ
- L155: // ========== エリア4（古代神殿×仮想電脳空間）通常敵4 + ボス1 ==========
- L157: 敵 電脳戦乙女
- L166: 敵 論理スフィンクス
- L175: 敵 バグ飛竜
- L184: 敵 電脳巫女
- L193: 敵 電脳神ゼウスOS
- L203: // ========== エリア5（はちゃめちゃ終着点・万象交差点）通常敵4 + ボス1 ==========
- L205: 敵 混沌騎士カオス
- L214: 敵 星屑タイタン
- L223: 敵 夢幻ミラージュ
- L232: 敵 終末の聖天使
- L241: 敵 混沌王オムニバス
- L251: // ========== 通常エリア限定・超低確率乱入敵3種 ==========
- L253: 敵 黄金ミミック
- L262: 敵 迷子の勇者
- L271: 敵 七色メタル竜
- L280: // ========== 異界総力戦 6属性レイドボス ==========
- L282: 敵 紅蓮機イグニオン
- L292: 敵 深淵竜アビサロス
- L302: 敵 暴風王テンペスタ
- L312: 敵 審判機セラフィム
- L322: 敵 虚無帝アビス
- L332: 敵 星竜オメガコア
- L343: HW.getEnemyDef = function (id) {

## js/data/contents.js (327行)
- L70: HW.AREAS = AREA_THEMES.map((a) => {
- L98: HW.getStageDef = function (stageId) {
- L107: HW.TOWERS = [
- L112: HW.getTowerFloorDef = function (towerId, floor) {
- L145: HW.RAIDS = [
- L155: HW.RESTRICTIONS = [
- L210: function seededRand(seed) {
- L220: HW.getArenaOpponent = function (rank) {
- L288: HW.DISPATCH_MISSIONS = [
- L312: HW.SHOP_ITEMS = [

## js/engine/stats.js (219行)
- L6: function mergeMod(dst, src) {
- L16: HW.computeCharStats = function (charId, customState, opts) {
- L165: HW.buildTeamCombatants = function (memberIds, linkIds, formationId, customMemb

## js/engine/dispatch.js (114行)
- L6: HW.Dispatch = {
- L7: getRemainingSec: function (missionId) {
- L14: isComplete: function (missionId) {
- L19: hasAnyComplete: function () {
- L23: start: function (missionId, charIds) {
- L40: onBattleVictory: function () {
- L54: claim: function (missionId) {

## js/engine/vfx.js (250行)
- L25: function attach(el) {
- L35: function resize() {
- L47: function clear() {
- L55: function getUnitRect(unitDomId) {
- L72: function spawnAttack(fromDomId, toDomId, color, isHeavy) {
- L104: function spawnHeal(targetDomId) {
- L121: function spawnPopup(targetDomId, text, color, isBig) {
- L146: function updateAndDraw(dt) {
- L240: HW.VFX = {

## js/engine/battle.js (1385行)
- L53: start: function (config, callbacks) {
- L75: createEmptySummary: function () {
- L95: stopLoopOnly: function () {
- L104: requestStopLoop: function () {
- L111: toggleLoop: function () {
- L127: cycleSpeed: function () {
- L136: addLog: function (text, kind) {
- L143: initDpsForAllies: function (units) {
- L159: makeAllyUnit: function (built, idx) {
- L198: makeEnemyUnit: function (enemyId, scale, idx, isBoss, isIntruder) {
- L242: makeArenaEnemyUnit: function (built, idx) {
- L251: beginSingleRun: function (isFirstRun) {
- L305: applyBattleStartEffects: function (units) {
- L313: spawnWave: function (waveNum) {
- L432: hasEffect: function (unit, id) {
- L436: addEffect: function (unit, id, dur, casterMod) {
- L454: cleanseUnit: function (unit, count) {
- L465: getAlive: function (side) {
- L469: getTurnOrderPreview: function () {
- L492: tick: function (ts) {
- L558: executeUnitTurn: function (unit) {
- L681: processTurnStartEffects: function (unit) {
- L705: tickEffectsDuration: function (unit) {
- L712: chooseSkill: function (unit) {
- L731: pickWeightedTarget: function (list) {
- L743: selectTargets: function (unit, skill) {
- L764: resolveSkill: function (caster, skill, targets, isFollowUp) {
- L996: tryInflict: function (caster, target, spec) {
- L1004: triggerCounter: function (defender, attacker) {
- L1011: applyDamage: function (caster, target, amount, isCrit, elMult, skillName) {
- L1051: applyDirectDamage: function (caster, target, amount, label) {
- L1061: handleDeathCheck: function (unit) {
- L1091: applyHeal: function (caster, target, rawAmount) {
- L1136: checkWaveOrBattleEnd: function () {
- L1179: grantIntruderBonus: function () {
- L1191: recordEquipDrop: function (drop) {
- L1208: handleRunEnd: function (win) {
- L1255: grantVictoryRewards: function () {
- L1357: grantRaidParticipationRewards: function (defeated) {
- L1383: HW.Battle = Battle;

## js/ui/dom.js (176行)
- L6: HW.esc = function (v) {
- L10: HW.renderStageHeader = function (titleText) {
- L24: HW.badgeElement = function (elId) {
- L29: HW.badgeRole = function (roleId, compact) {
- L34: HW.badgeRaces = function (races) {
- L40: HW.badgeTarget = function (target) {
- L45: HW.badgeQuality = function (quality) {
- L53: HW.starsText = function (star) {
- L58: HW.DOM = {
- L59: toast: function (text, tone) {
- L72: openSheet: function (title, bodyHtml, actionsHtml, onBind) {
- L93: closeSheet: function () {
- L101: setupMobileGuard: function () {

## js/ui/render_battle.js (361行)
- L11: function renderUnitCard(u, isActing, isTargeted) {
- L72: function renderTurnOrderBar() {
- L84: function getBattleHeaderTitle() {
- L103: function renderDpsInner() {
- L137: function renderLogInner() {
- L146: HW.RenderBattle = {
- L147: mount: function (topEl, bottomEl) {
- L186: sync: function (full) {
- L232: refreshPanel: function () {
- L251: refreshControls: function () {
- L277: showResultSheet: function (result, onDone, onReplay) {

## js/ui/render_adventure.js (467行)
- L16: function getArenaCandidates() {
- L28: function openArenaInspectSheet(opp) {
- L83: function renderTopPreview() {
- L225: HW.RenderAdventure = {
- L226: render: function (topEl, bottomEl) {

## js/ui/render_party.js (339行)
- L11: function openCharPicker(title, currentId, excludedIds, allowClear, onPick) {
- L56: HW.RenderParty = {
- L57: render: function (topEl, bottomEl) {

## js/ui/render_roster.js (424行)
- L12: function openEquipPicker(charId, slotId) {
- L62: function renderTopCharacterPreview() {
- L135: HW.RenderRoster = {
- L136: render: function (topEl, bottomEl) {

## js/ui/render_equip.js (162行)
- L11: HW.RenderEquip = {
- L12: render: function (topEl, bottomEl) {

## js/ui/render_hub.js (323行)
- L11: function formatSec(sec) {
- L17: function openDispatchPicker(mission) {
- L83: function openBackupSheet() {
- L117: HW.RenderHub = {
- L118: render: function (topEl, bottomEl) {

## js/ui/render_codex.js (187行)
- L18: HW.RenderCodex = {
- L19: render: function (topEl, bottomEl) {

## js/ui/app.js (146行)
- L15: HW.App = {
- L42: go: function (screenId) {
- L52: launchBattle: function (config) {
- L86: renderNav: function () {
- L123: render: function () {

