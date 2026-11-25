# はちゃめちゃ世界 — コード地図（ファイル＆行番号インデックス）

変更したい機能の場所へ直接ジャンプしてトークン消費を最小限に抑えるための行番号マップです。

## `index.html`（全66行）
- 設定・エントリファイル

## `manifest.webmanifest`（全27行）
- 設定・エントリファイル

## `sw.js`（全71行）
- 設定・エントリファイル

## `capacitor.config.json`（全13行）
- 設定・エントリファイル

## `package.json`（全11行）
- 設定・エントリファイル

## `scripts/sync-capacitor.mjs`（全27行）
- 設定・エントリファイル

## `.github/workflows/pages.yml`（全35行）
- 設定・エントリファイル

## `css/base.css`（全207行）
- L21: /* Element neon palette */
- L29: /* Role palette */
- L35: /* Safe area variables (JS updates --safe-top-js fallback on cold-start standalone iOS) */
- L107: /* Invisible CSS env() probe for iOS standalone cold-start guard */
- L124: /* Full-bleed edge-to-edge stylish background layer */
- L168: /* Scrollbar design that never collides with card borders */
- L190: /* Element color helpers */

## `css/layout.css`（全338行）
- L1: /* App shell pinned inside safe area; centered portrait frame on tablets/desktop */
- L26: /* Top bar: purely informational (zero clickable controls in upper zone) */
- L106: /* Main viewport container */
- L116: /* Split layout: Upper Display (non-interactive) + Lower Thumb Control Zone */
- L152: /* Lower sub-tab bar (always positioned in thumb zone) */
- L187: /* Bottom primary navigation */
- L228: /* Bottom Sheet modal: all interactive buttons placed strictly in lower thumb zone */
- L299: /* Toast notifications (non-blocking, sits safely above bottom nav) */

## `css/battle.css`（全609行）
- L1: /* Battle Screen: Upper 58% Pure Display Arena + Lower 42% Thumb Control Dock */
- L12: /* Battle Status Header (non-interactive) */
- L60: /* Real-time Turn Order Bar (3 spacious full-name slots: zero clipping on 375px+) */
- L120: /* Arena fixed container (prevents any shift when enemies are 1-4 or buffs change) */
- L142: /* Single / 2-enemy centering inside fixed 153px arena without shifting layout */
- L162: /* Central Skill Callout + VFX strip */
- L185: /* Unit Card inside Battle */
- L227: /* GPU-composited combat animations */
- L287: /* Silky smooth bars (transform: scaleX) */
- L342: /* Skill CT + Buff/Debuff/Status fixed-height footer row */
- L418: /* VFX & Floating Damage Overlay inside Arena */
- L493: /* Lower Battle Thumb Dock (Logs / DPS / Synergy + Action Bar) */
- L514: /* Combat log with anti-shift block flow */
- L551: /* DPS Meter */

## `css/components.css`（全382行）
- L1: /* Shared Stylish Cards, Buttons, Chips, Quality 100% Rainbow Frame, Lists */
- L33: /* Badges & Chips */
- L94: /* Primary & Secondary Thumb Buttons */
- L144: /* Selection Card Rows */
- L192: /* Max Quality (100%) Prismatic Highlight */
- L209: /* 2-column compact card grids */
- L231: /* Stat mini grid */
- L257: /* Flavor lore text */
- L268: /* Skill card inside Upper Display or Sheet */
- L294: /* Result Screen */
- L331: /* Synergy pill row */
- L347: /* Expedition progress bar */
- L362: /* Filter chips strip */
- L369: /* Textarea for backup export/import */

## `js/core/namespace.js`（全163行）
- L15: const ELEMENTS
- L24: const RACES
- L34: const ROLES
- L41: const EQUIP_SLOTS
- L48: const TARGET_META
- L58: const STATUS_META
- L83: formatRaces()
- L88: compareUnits()
- L110: getElementAffinity()

## `js/core/dom.js`（全166行）
- L6: el()
- L53: clear()
- L57: formatNum()
- L64: formatTime()
- L73: makeElBadge()
- L78: makeRoleBadge()
- L83: makeTargetBadge()
- L88: showToast()
- L105: syncSafeArea()
- L138: initSafeAreaWatchers()

## `js/core/storage.js`（全179行）
- L12: computeChecksum()
- L26: wrapEnvelope()
- L36: unwrapEnvelope()
- L52: openDB()
- L74: save()
- L98: load()
- L130: clearAll()
- L148: exportCode()
- L156: importCode()

## `js/core/pwa.js`（全43行）
- L6: init()

## `js/data/abilities.js`（全196行）
- L7: const ROLE_ABILITIES

## `js/data/characters.js`（全756行）
- L8: const CHARACTERS

## `js/data/equipment.js`（全248行）
- L7: const EQUIP_SETS
- L123: const EQUIP_ITEMS
- L212: getQualityMultiplier()
- L217: calcItemStats()
- L232: getSellValue()

## `js/data/enemies.js`（全433行）
- L7: const ENEMIES

## `js/data/stages.js`（全470行）
- L7: const NORMAL_AREAS
- L107: const TOWERS
- L135: const RAIDS
- L145: const CONSTRAINTS
- L237: const EXPEDITIONS
- L273: buildBattlePlan()

## `js/engine/state.js`（全823行）
- L10: makeUid()
- L14: makeDefaultCharProgress()
- L24: createInitialState()
- L95: sanitizeState()
- L221: emitChange()
- L228: scheduleSave()
- L236: init()
- L243: getState()
- L247: subscribe()
- L252: getCharProgress()
- L259: isUnlocked()
- L263: unlockCharacter()
- L272: buyShopCharacter()
- L282: getMasteryRank()
- L291: gainBattleMastery()
- L301: trainMastery()
- L324: unlockAbilityTier()
- L339: selectAbilityChoice()
- L347: unlockAwakening()
- L362: getCharAssignment()
- L374: setFrontSlot()
- L401: setReserveSlot()
- L429: getEquipOwnerMap()
- L440: equipItem()
- L457: unequipSlot()
- L465: toggleLockEquip()
- L473: sellEquip()
- L487: bulkSellEquips()
- L514: rollEquipmentDrop()
- L535: receiveEquipDrop()
- L553: isNormalStageUnlocked()
- L559: isTowerUnlocked()
- L567: getIdleChars()
- L571: startExpedition()
- L587: getExpeditionStatus()
- L597: accelerateExpeditionsByBattle()
- L609: claimExpedition()
- L636: cancelExpedition()
- L644: commitBattleVictory()
- L749: markEnemiesDiscovered()
- L760: updateSetting()
- L765: updateUiSelection()
- L770: importBackup()
- L779: resetSave()

## `js/engine/stats.js`（全289行）
- L6: const RACE_SYNERGY_DEFS
- L16: addEffects()
- L33: computePartySynergies()
- L118: getEquippedSets()
- L146: collectCharSelfModifiers()
- L197: computeUnitStats()
- L227: buildPartyCombatSnapshots()

## `js/engine/battle.js`（全1023行）
- L12: class BattleSession
- L13: constructor()
- L62: getSpeedMult()
- L67: pushLog()
- L74: emitVisual()
- L78: startRun()
- L148: spawnWave()
- L233: getEffectiveSpd()
- L241: getEffectiveAtk()
- L251: getEffectiveDef()
- L259: countNegativeStatuses()
- L268: applyStatus()
- L294: cleanseUnit()
- L312: recordDps()
- L318: applyHeal()
- L353: applyDamage()
- L505: pickTargets()
- L533: chooseSkillIndex()
- L553: processStartOfTurnStatuses()
- L585: tickStatusesAndCts()
- L595: executeTurn()
- L803: executeCounter()
- L817: getPredictedTurnOrder()
- L844: requestStopLoop()
- L849: retreat()
- L866: finishBattle()
- L934: tick()

## `js/ui/battleView.js`（全907行）
- L17: isActive()
- L21: getStatusLabel()
- L27: stopLoopRaf()
- L34: startBattle()
- L68: frameLoop()
- L81: createUnitCard()
- L141: rebuildUnitsDOM()
- L167: updateHeaderPills()
- L183: syncUnitCard()
- L259: syncTurnOrder()
- L277: syncDpsDrawer()
- L315: syncFrameDOM()
- L336: getUnitCenterInArena()
- L346: triggerClassAnim()
- L354: spawnVfxNode()
- L365: handleVisualEvent()
- L430: appendLogEntry()
- L440: renderDrawerContent()
- L503: renderBattleLive()
- L654: renderSingleResult()
- L793: renderLoopResult()
- L890: render()

## `js/ui/deployView.js`（全406行）
- L7: render()

## `js/ui/partyView.js`（全375行）
- L12: renderFormation()
- L174: renderExpedition()
- L338: render()

## `js/ui/growthView.js`（全402行）
- L12: ensureSelectedChar()
- L19: renderUpperCharSummary()
- L77: openCharPickerSheet()
- L108: render()

## `js/ui/equipView.js`（全458行）
- L13: formatItemStatsText()
- L24: qualityClass()
- L31: qualityChip()
- L37: ensureChar()
- L44: openCharPicker()
- L71: renderEquipSub()
- L209: renderBagSub()
- L319: renderAutoSellSub()
- L422: render()

## `js/ui/archiveView.js`（全418行）
- L14: renderCharsDex()
- L72: renderEnemiesDex()
- L123: renderEquipsDex()
- L169: renderAbilitiesDex()
- L225: renderSettings()
- L378: render()

## `js/ui/app.js`（全154行）
- L10: const NAV_ITEMS
- L18: renderTopBar()
- L45: renderBottomNav()
- L73: render()
- L92: openSheet()
- L106: closeSheet()
- L111: boot()

