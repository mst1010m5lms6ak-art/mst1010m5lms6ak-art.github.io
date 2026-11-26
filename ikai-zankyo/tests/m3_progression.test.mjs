import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'js');
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function loadM3Context({ secure = false, storage = new Map(), protocol = 'file:' } = {}) {
  const ctx = {
    console,
    TextEncoder,
    TextDecoder,
    structuredClone,
    Uint8Array,
    Uint32Array,
    isSecureContext: secure,
    crypto: secure ? crypto.webcrypto : undefined,
    location: {
      protocol,
      hostname: protocol === 'http:' ? '127.0.0.1' : ''
    },
    localStorage: {
      getItem: (k) => (storage.has(String(k)) ? storage.get(String(k)) : null),
      setItem: (k, v) => { storage.set(String(k), String(v)); },
      removeItem: (k) => { storage.delete(String(k)); },
      clear: () => { storage.clear(); }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const file of ['namespace.js', 'master-data.js', 'save-security.js', 'state-store.js', 'combat-engine.js', 'progression.js']) {
    const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}

function toHost(val) {
  return JSON.parse(JSON.stringify(val));
}

function makeSeqRng(values, fallback = 0.99) {
  let idx = 0;
  return () => {
    if (idx < values.length) {
      return values[idx++];
    }
    return fallback;
  };
}

// =========================================================================
// Part A: Node Unit & Integration Tests (M3-01 .. M3-10)
// =========================================================================

test('M3-01. Equipment stats, sell values, quality drop distribution, and auto-sell (protecting 極)', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, MasterData } = ctx.IkaiApp;

  const statsQ0 = Progression.getEquipStats('eq_teppeki_main', 0);
  const statsQ4 = Progression.getEquipStats('eq_teppeki_main', 4);
  assert.deepEqual(toHost(statsQ0), { atk: 72, def: 18 });
  assert.deepEqual(toHost(statsQ4), { atk: Math.round(72 * 1.75), def: Math.round(18 * 1.75) });

  assert.equal(Progression.getEquipSellValue('eq_teppeki_main', 0), 80);
  assert.equal(Progression.getEquipSellValue('eq_teppeki_main', 4), 1280);

  // Quality drop weights [55, 28, 12, 4.2, 0.8]
  assert.equal(Progression.pickDropQualityIdx(() => 0.0, 0), 0);
  assert.equal(Progression.pickDropQualityIdx(() => 0.56, 0), 1);
  assert.equal(Progression.pickDropQualityIdx(() => 0.85, 0), 2);
  assert.equal(Progression.pickDropQualityIdx(() => 0.96, 0), 3);
  assert.equal(Progression.pickDropQualityIdx(() => 0.995, 0), 4);
  // minQualityIdx = 2 restricts pool to [2, 3, 4]
  assert.equal(Progression.pickDropQualityIdx(() => 0.0, 2), 2);
  assert.equal(Progression.pickDropQualityIdx(() => 0.99, 2), 4);

  // Auto-sell when quality <= autoSellMaxQualityIdx (3), never auto-sells 極 (4)
  const s = StateStore.createInitialState();
  s.settings.autoSellMaxQualityIdx = 3;
  const coinsBefore = s.currencies.starCoins;
  const equipsBefore = s.equips.length;

  const resAuto = Progression.grantEquipOrAutoSell(s, 'eq_teppeki_main', 3, () => 0.1);
  assert.equal(resAuto.autoSold, true);
  assert.equal(resAuto.coinsGained, 80 * 8);
  assert.equal(s.currencies.starCoins, coinsBefore + 640);
  assert.equal(s.equips.length, equipsBefore);

  const resKiwami = Progression.grantEquipOrAutoSell(s, 'eq_teppeki_main', 4, () => 0.2);
  assert.equal(resKiwami.autoSold, false);
  assert.equal(resKiwami.coinsGained, 0);
  assert.equal(s.equips.length, equipsBefore + 1);
  assert.equal(s.equips[s.equips.length - 1].qualityIdx, 4);

  assert.equal(MasterData.QUALITY_RANKS.length, 5);
});

test('M3-02. Equip slots awakening gates, ownership transfer, lock, and bulkSellEquips protection', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  // Add accessory, seal, and a 極 equip
  state.equips.push(
    { uid: 'eq_acc_t', equipId: 'eq_teppeki_accessory', qualityIdx: 1, locked: false },
    { uid: 'eq_seal_t', equipId: 'eq_teppeki_seal', qualityIdx: 2, locked: false },
    { uid: 'eq_kiwami_t', equipId: 'eq_zankyo_main', qualityIdx: 4, locked: false }
  );

  // Awakening 0 blocks 装具 and 印章
  const failAcc = Progression.equipItem(state, 'char_todo_seiichi', 'eq_acc_t');
  assert.equal(failAcc.ok, false);
  const failSeal = Progression.equipItem(state, 'char_todo_seiichi', 'eq_seal_t');
  assert.equal(failSeal.ok, false);

  // Equip 主器 on 藤堂 誠一, then transfer same uid to 小林 翔平
  let res = Progression.equipItem(state, 'char_todo_seiichi', 'eq_init_1');
  assert.equal(res.ok, true);
  state = res.state;
  assert.equal(state.roster.char_todo_seiichi.equipped['主器'], 'eq_init_1');

  res = Progression.equipItem(state, 'char_kobayashi_shohei', 'eq_init_1');
  assert.equal(res.ok, true);
  state = res.state;
  assert.equal(state.roster.char_todo_seiichi.equipped['主器'], null);
  assert.equal(state.roster.char_kobayashi_shohei.equipped['主器'], 'eq_init_1');

  // Unlock awakening 1 -> 装具 ok; awakening 3 -> 印章 ok
  state.currencies.universalShards = 10;
  state = Progression.awakenCharacter(state, 'char_todo_seiichi').state;
  assert.equal(Progression.equipItem(state, 'char_todo_seiichi', 'eq_acc_t').ok, true);
  assert.equal(Progression.equipItem(state, 'char_todo_seiichi', 'eq_seal_t').ok, false);
  state = Progression.awakenCharacter(state, 'char_todo_seiichi').state;
  state = Progression.awakenCharacter(state, 'char_todo_seiichi').state;
  res = Progression.equipItem(state, 'char_todo_seiichi', 'eq_seal_t');
  assert.equal(res.ok, true);
  state = res.state;

  // Lock eq_init_2; invalid maxQualityIdx (4 or -1) rejected
  state = Progression.toggleEquipLock(state, 'eq_init_2').state;
  assert.equal(Progression.bulkSellEquips(state, 4).ok, false);
  assert.equal(Progression.bulkSellEquips(state, -1).ok, false);

  // Bulk sell up to 優(3): eq_init_1 (equipped), eq_seal_t (equipped), eq_init_2 (locked), eq_kiwami_t (品質極) must survive!
  const coinsBefore = state.currencies.starCoins;
  const bulkRes = Progression.bulkSellEquips(state, 3);
  assert.equal(bulkRes.ok, true);
  state = bulkRes.state;
  const remainingUids = new Set(state.equips.map((e) => e.uid));
  assert.equal(remainingUids.has('eq_init_1'), true);
  assert.equal(remainingUids.has('eq_seal_t'), true);
  assert.equal(remainingUids.has('eq_init_2'), true);
  assert.equal(remainingUids.has('eq_kiwami_t'), true);
  assert.equal(remainingUids.has('eq_init_3'), false);
  assert.equal(remainingUids.has('eq_acc_t'), false);
  assert.ok(state.currencies.starCoins > coinsBefore);
  assert.equal(SaveSecurity.validateSchema(state).ok, true);
});

test('M3-03. Equipment synthesis rules, validation rejections, catalyst bonus, and pity ceiling [3,4,5,6]', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  state.currencies.starCoins = 50000;
  state.currencies.qualityCatalysts = 2;
  // Equip base eq_init_1 on char_todo_seiichi (equipped base is allowed!)
  state = Progression.equipItem(state, 'char_todo_seiichi', 'eq_init_1').state;

  // Add materials for tests
  state.equips.push(
    { uid: 'mat_diff_id', equipId: 'eq_zankyo_main', qualityIdx: 0, locked: false },
    { uid: 'mat_diff_q', equipId: 'eq_teppeki_main', qualityIdx: 1, locked: false },
    { uid: 'mat_locked', equipId: 'eq_teppeki_main', qualityIdx: 0, locked: true },
    { uid: 'mat_equipped', equipId: 'eq_teppeki_main', qualityIdx: 0, locked: false },
    { uid: 'mat_s1', equipId: 'eq_teppeki_main', qualityIdx: 0, locked: false },
    { uid: 'mat_s2', equipId: 'eq_teppeki_main', qualityIdx: 0, locked: false },
    { uid: 'mat_s3', equipId: 'eq_teppeki_main', qualityIdx: 0, locked: false }
  );
  state = Progression.equipItem(state, 'char_kobayashi_shohei', 'mat_equipped').state;

  // Rejections
  assert.equal(Progression.synthesizeEquip(state, 'eq_init_1', 'eq_init_1').ok, false);
  assert.equal(Progression.synthesizeEquip(state, 'eq_init_1', 'mat_diff_id').ok, false);
  assert.equal(Progression.synthesizeEquip(state, 'eq_init_1', 'mat_diff_q').ok, false);
  assert.equal(Progression.synthesizeEquip(state, 'eq_init_1', 'mat_locked').ok, false);
  assert.equal(Progression.synthesizeEquip(state, 'eq_init_1', 'mat_equipped').ok, false);

  // Pity ceiling for q0 -> q1 is pityMax = 3
  // Fail twice (rng=0.99 >= 0.50), 3rd attempt guarantees upgrade even with rng=0.99!
  let s1 = Progression.synthesizeEquip(state, 'eq_init_1', 'mat_s1', { rng: () => 0.99 });
  assert.equal(s1.ok, true);
  assert.equal(s1.succeeded, false);
  assert.equal(s1.pityCount, 1);
  state = s1.state;

  let s2 = Progression.synthesizeEquip(state, 'eq_init_1', 'mat_s2', { rng: () => 0.99 });
  assert.equal(s2.ok, true);
  assert.equal(s2.succeeded, false);
  assert.equal(s2.pityCount, 2);
  state = s2.state;

  let s3 = Progression.synthesizeEquip(state, 'eq_init_1', 'mat_s3', { rng: () => 0.99 });
  assert.equal(s3.ok, true);
  assert.equal(s3.succeeded, true);
  assert.equal(s3.isCeiling, true);
  assert.equal(s3.newQualityIdx, 1);
  assert.equal(s3.pityCount, 0);
  state = s3.state;
  assert.equal(state.synthesisPity['eq_teppeki_main:0'], 0);

  // Catalyst adds +0.25 (q1->q2 baseRate=0.40 + 0.25 = 0.65 -> rng=0.60 succeeds!)
  let sCat = Progression.synthesizeEquip(state, 'eq_init_1', 'mat_diff_q', { useCatalyst: true, rng: () => 0.60 });
  assert.equal(sCat.ok, true);
  assert.equal(sCat.succeeded, true);
  assert.equal(sCat.newQualityIdx, 2);
  assert.equal(sCat.state.currencies.qualityCatalysts, 1);
  assert.equal(SaveSecurity.validateSchema(sCat.state).ok, true);
});

test('M3-04. Emblem board 12 nodes, layer/awakening gates, sorted order, and CombatEngine integration', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, CombatEngine, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  state.currencies.emblemShards = 1000;
  state.currencies.universalShards = 10;

  // Layer 1 (id 1..4) at awakening 0
  for (const nid of [4, 2, 1, 3]) {
    const r = Progression.unlockEmblemNode(state, 'char_todo_seiichi', nid);
    assert.equal(r.ok, true);
    state = r.state;
  }
  assert.deepEqual(toHost(state.roster.char_todo_seiichi.emblemNodes), [1, 2, 3, 4]);

  // Layer 2 blocked at awakening 0/1
  assert.equal(Progression.unlockEmblemNode(state, 'char_todo_seiichi', 5).ok, false);
  state = Progression.awakenCharacter(state, 'char_todo_seiichi').state;
  assert.equal(Progression.unlockEmblemNode(state, 'char_todo_seiichi', 5).ok, false);
  state = Progression.awakenCharacter(state, 'char_todo_seiichi').state; // awakening 2

  // Layer 3 blocked until all Layer 2 nodes (5,6,7,8) unlocked
  state = Progression.unlockEmblemNode(state, 'char_todo_seiichi', 5).state;
  assert.equal(Progression.unlockEmblemNode(state, 'char_todo_seiichi', 9).ok, false);
  state = Progression.unlockEmblemNode(state, 'char_todo_seiichi', 6).state;
  state = Progression.unlockEmblemNode(state, 'char_todo_seiichi', 7).state;
  state = Progression.unlockEmblemNode(state, 'char_todo_seiichi', 8).state;

  for (const nid of [9, 10, 11, 12]) {
    const r = Progression.unlockEmblemNode(state, 'char_todo_seiichi', nid);
    assert.equal(r.ok, true);
    state = r.state;
  }
  assert.deepEqual(toHost(state.roster.char_todo_seiichi.emblemNodes), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(SaveSecurity.validateSchema(state).ok, true);

  // Verify CombatEngine reflects node 12 role bonus (斉藤 莉子 is サポーター -> allySpd +6)
  state.currencies.emblemShards = 1000;
  state.currencies.universalShards = 10;
  state = Progression.awakenCharacter(state, 'char_saito_riko').state;
  state = Progression.awakenCharacter(state, 'char_saito_riko').state;
  for (let nid = 1; nid <= 12; nid += 1) {
    state = Progression.unlockEmblemNode(state, 'char_saito_riko', nid).state;
  }
  const bBase = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', seed: 11 });
  const bBuffed = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state, seed: 11 });
  assert.ok(bBuffed.allies[0].spd >= bBase.allies[0].spd + 6);
});

test('M3-05. Awakening 0->3 priority (char shards first, then universal) and surplus shard crystal conversion', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  // Give 藤堂 誠一 (SR -> 15 crystals/surplus shard) 8 char shards + 2 universal shards
  state.roster.char_todo_seiichi.shards = 8;
  state.currencies.universalShards = 2;

  // 0->1 costs 1
  let r1 = Progression.awakenCharacter(state, 'char_todo_seiichi');
  assert.equal(r1.ok, true);
  assert.equal(r1.usedCharShards, 1);
  assert.equal(r1.usedUniversalShards, 0);
  state = r1.state;

  // 1->2 costs 2
  let r2 = Progression.awakenCharacter(state, 'char_todo_seiichi');
  assert.equal(r2.ok, true);
  assert.equal(r2.usedCharShards, 2);
  state = r2.state;

  // 2->3 costs 3 -> 2 shards left -> auto-converted to 2 * 15 = 30 exchangeCrystals!
  let r3 = Progression.awakenCharacter(state, 'char_todo_seiichi');
  assert.equal(r3.ok, true);
  assert.equal(r3.newAwakening, 3);
  assert.equal(r3.usedCharShards, 3);
  assert.equal(r3.overflowCrystals, 30);
  state = r3.state;
  assert.equal(state.roster.char_todo_seiichi.shards, 0);
  assert.equal(state.currencies.exchangeCrystals, 30);

  // Awakening >3 rejected
  assert.equal(Progression.awakenCharacter(state, 'char_todo_seiichi').ok, false);

  // Test universal shard fallback
  let rUniv = Progression.awakenCharacter(state, 'char_kobayashi_shohei'); // shards 0, universal 2
  assert.equal(rUniv.ok, true);
  assert.equal(rUniv.usedCharShards, 0);
  assert.equal(rUniv.usedUniversalShards, 1);
  assert.equal(SaveSecurity.validateSchema(rUniv.state).ok, true);
});

test('M3-06. Hybrid collect skill equip rules, CombatEngine skillUses tracking, and mastery Rank 1..5', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, CombatEngine, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  state.currencies.universalShards = 5;
  state.currencies.masteryBooks = 100;

  // Slot 1 blocked at awakening 0; duplicate skill blocked at awakening 1
  assert.equal(Progression.equipCollectSkill(state, 'char_kobayashi_shohei', 1, 'sk_r_kiriharai').ok, false);
  state = Progression.awakenCharacter(state, 'char_kobayashi_shohei').state;
  state = Progression.equipCollectSkill(state, 'char_kobayashi_shohei', 0, 'sk_r_kiriharai').state;
  assert.equal(Progression.equipCollectSkill(state, 'char_kobayashi_shohei', 1, 'sk_r_kiriharai').ok, false);
  state = Progression.equipCollectSkill(state, 'char_kobayashi_shohei', 1, 'sk_r_shogekiha').state;

  // Force collect_first tactic and run battle to verify CombatEngine.skillUses
  state.roster.char_kobayashi_shohei.tactic.skillPriority = 'collect_first';
  const battle = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state, seed: 42 });
  let snap = CombatEngine.getSnapshot(battle);
  for (let i = 0; i < 300 && snap.status === 'ongoing'; i += 1) {
    snap = CombatEngine.step(battle, 200);
  }
  assert.equal(snap.status, 'victory');
  assert.ok((snap.skillUses.sk_r_kiriharai || 0) + (snap.skillUses.sk_r_shogekiha || 0) > 0);

  // Apply battle outcome -> uses accumulated
  const outRes = Progression.applyBattleOutcome(state, snap, { rng: () => 0.5 });
  assert.equal(outRes.ok, true);
  state = outRes.state;
  assert.ok(state.skillInventory.sk_r_kiriharai.uses > 0 || state.skillInventory.sk_r_shogekiha.uses > 0);

  // Auto-rankup when snapshot carries 30 uses
  const fakeSnap = Object.assign({}, toHost(snap), { skillUses: { sk_r_oukyu: 30 } });
  state = Progression.applyBattleOutcome(state, fakeSnap, { rng: () => 0.5 }).state;
  assert.equal(state.skillInventory.sk_r_oukyu.rank, 3);

  // Upgrade via masteryBooks to Rank 5
  state = Progression.upgradeSkillMastery(state, 'sk_r_oukyu').state; // 3->4 (10 books)
  state = Progression.upgradeSkillMastery(state, 'sk_r_oukyu').state; // 4->5 (18 books)
  assert.equal(state.skillInventory.sk_r_oukyu.rank, 5);
  assert.equal(Progression.upgradeSkillMastery(state, 'sk_r_oukyu').ok, false);
  assert.equal(SaveSecurity.validateSchema(state).ok, true);
});

test('M3-07. 4-pillar PvE progression, retreat guard, raidBestDamage on defeat, and trial validation', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  // Stage unlocking
  assert.equal(Progression.isStageUnlocked(state, '1-1'), true);
  assert.equal(Progression.isStageUnlocked(state, '1-2'), false);
  assert.equal(Progression.isStageUnlocked(state, '2-1'), false);

  // Retreat does not increment totalBattles or advance expeditions
  state.roster.char_watanabe_aoi && state.expeditions.push({
    zoneId: 'exp_1', charIds: ['char_watanabe_aoi'], battlesDone: 0, requiredBattles: 3, claimed: false
  });
  const retreatRes = Progression.applyBattleOutcome(state, { mode: 'stage', stageId: '1-1', status: 'defeat' }, { isRetreat: true });
  assert.equal(retreatRes.state.progress.totalBattles, 0);
  assert.equal(retreatRes.state.expeditions[0].battlesDone, 0);

  // Stage 1-1 victory unlocks 1-2 and advances expedition
  const stg1 = Progression.applyBattleOutcome(state, { mode: 'stage', stageId: '1-1', status: 'victory', dpsMeters: { totals: { damageDealt: 1000 } } }, { rng: () => 0.1 });
  state = stg1.state;
  assert.equal(Progression.isStageUnlocked(state, '1-2'), true);
  assert.equal(state.progress.totalBattles, 1);
  assert.equal(state.expeditions[0].battlesDone, 1);

  // Abyss floor 10 first clear vs repeat
  const ab10 = Progression.applyBattleOutcome(state, { mode: 'abyss', floor: 10, status: 'victory' }, { rng: () => 0.2 });
  state = ab10.state;
  assert.equal(state.progress.abyssMaxFloor, 10);
  assert.ok(ab10.summary.echoStones >= 350);
  assert.equal(ab10.summary.exchangeCrystals, 15);
  const ab10Rep = Progression.applyBattleOutcome(state, { mode: 'abyss', floor: 10, status: 'victory' }, { rng: () => 0.2 });
  assert.equal(ab10Rep.summary.exchangeCrystals, 3);
  state = ab10Rep.state;

  // Raid updates raidBestDamage even on defeat, increments raidCleared on victory
  const raidDefeat = Progression.applyBattleOutcome(state, {
    mode: 'raid', raidId: 'raid_zerogo', difficultyId: 'easy', status: 'defeat',
    dpsMeters: { totals: { damageDealt: 12345 } }
  }, { rng: () => 0.5 });
  state = raidDefeat.state;
  assert.equal(state.progress.raidBestDamage.raid_zerogo.easy, 12345);
  assert.equal(Boolean(state.progress.raidCleared.raid_zerogo), false);

  const raidWin = Progression.applyBattleOutcome(state, {
    mode: 'raid', raidId: 'raid_zerogo', difficultyId: 'easy', status: 'victory',
    dpsMeters: { totals: { damageDealt: 20000 } }
  }, { rng: () => 0.5 });
  state = raidWin.state;
  assert.equal(state.progress.raidBestDamage.raid_zerogo.easy, 20000);
  assert.equal(state.progress.raidCleared.raid_zerogo.easy, 1);

  // Trials validation & reward
  assert.equal(Progression.validateTrialEntry(state, 'trial_2', state.party).ok, false); // 藤堂 is SR
  const rParty = ['char_watanabe_aoi', 'char_kobayashi_shohei', 'char_saito_riko', 'char_nakamura_yui'];
  assert.equal(Progression.validateTrialEntry(state, 'trial_2', rParty).ok, true);
  assert.equal(Progression.validateTrialEntry(state, 'trial_3', rParty).ok, false); // has healer
  assert.equal(Progression.validateTrialEntry(state, 'trial_4', state.party).ok, false); // initial party has 藤堂(タンク)
  assert.equal(Progression.validateTrialEntry(state, 'trial_5', ['char_kobayashi_shohei', 'char_saito_riko']).ok, true);

  const trWin = Progression.applyBattleOutcome(state, { mode: 'trial', trialId: 'trial_2', status: 'victory' }, { rng: () => 0.5 });
  state = trWin.state;
  assert.deepEqual(toHost(state.progress.trialsCleared), ['trial_2']);
  assert.equal(state.currencies.universalShards, 1);
  assert.equal(SaveSecurity.validateSchema(state).ok, true);
});

test('M3-08. Buy-once summon guarantees (10x SR+, 40x SR+, 80x PU SSR), crystal conversion, and shop', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  // Insufficient stones rejected
  state.currencies.echoStones = 100;
  assert.equal(Progression.rollSummon(state, 'banner_pu_1', 1).ok, false);

  // 10-pull with all-R rng (0.99) triggers 10th pull SR guarantee!
  state.currencies.echoStones = 30000;
  const tenRes = Progression.rollSummon(state, 'banner_pu_1', 10, { rng: () => 0.99 });
  assert.equal(tenRes.ok, true);
  assert.equal(tenRes.results.length, 10);
  assert.equal(tenRes.results[9].rarity, 'SR');
  assert.equal(tenRes.srPityCount, 0);
  assert.equal(tenRes.pityCount, 10);
  state = tenRes.state;

  // 40-pull SR+ guarantee: set srPityCount = 39, single pull with 0.99 yields SR & resets srPityCount
  state.summon.srPityCount = 39;
  const sr40Res = Progression.rollSummon(state, 'banner_pu_1', 1, { rng: () => 0.99 });
  assert.equal(sr40Res.results[0].rarity, 'SR');
  assert.equal(sr40Res.srPityCount, 0);
  state = sr40Res.state;

  // 80-pull SSR pickup ceiling: set pityCount = 79, single pull yields pickup SSR and resets both pityCount & srPityCount
  state.summon.pityCount = 79;
  state.summon.srPityCount = 15;
  const ssr80Res = Progression.rollSummon(state, 'banner_pu_1', 1, { rng: () => 0.99 });
  assert.equal(ssr80Res.results[0].rarity, 'SSR');
  assert.equal(ssr80Res.results[0].isCeiling, true);
  assert.ok(['char_himuro_soichiro', 'char_kanzaki_mio'].includes(ssr80Res.results[0].charId));
  assert.equal(ssr80Res.pityCount, 0);
  assert.equal(ssr80Res.srPityCount, 0);
  state = ssr80Res.state;

  // Max-awakened SSR dupe converts to 50 exchangeCrystals
  const pulledSsrId = ssr80Res.results[0].charId;
  state.roster[pulledSsrId].awakening = 3;
  state.summon.pityCount = 79;
  const pickIdxVal = pulledSsrId === 'char_himuro_soichiro' ? 0.0 : 0.99;
  const dupeMaxRes = Progression.rollSummon(state, 'banner_pu_1', 1, { rng: makeSeqRng([pickIdxVal], pickIdxVal) });
  assert.equal(dupeMaxRes.results[0].charId, pulledSsrId);
  assert.equal(dupeMaxRes.results[0].outcome, 'crystal');
  assert.equal(dupeMaxRes.results[0].crystalsGained, 50);
  state = dupeMaxRes.state;

  // Crystal shop purchase & duplicate skill block
  const buySkill = Progression.exchangeCrystalItem(state, 'shop_sk_ssr_hoshiochi');
  assert.equal(buySkill.ok, true);
  state = buySkill.state;
  assert.equal(state.skillInventory.sk_ssr_hoshiochi.ownedCount, 1);
  assert.equal(Progression.exchangeCrystalItem(state, 'shop_sk_ssr_hoshiochi').ok, false);
  assert.equal(SaveSecurity.validateSchema(state).ok, true);
});

test('M3-09. Expeditions (battle-count only), Resonance, and Party mutual exclusion safety', () => {
  const ctx = loadM3Context();
  const { Progression, StateStore, SaveSecurity } = ctx.IkaiApp;

  let state = StateStore.createInitialState();
  // Cannot send party member on expedition
  assert.equal(Progression.startExpedition(state, 'exp_1', ['char_todo_seiichi']).ok, false);

  // Send 渡辺 葵 on exp_1 (3 battles)
  let r = Progression.startExpedition(state, 'exp_1', ['char_watanabe_aoi']);
  assert.equal(r.ok, true);
  state = r.state;

  // Cannot assign expedition char to party or resonance (clean error, no throw)
  assert.equal(Progression.setPartySlot(state, 0, 'char_watanabe_aoi').ok, false);
  assert.equal(Progression.setResonance(state, 0, 'char_watanabe_aoi').ok, false);
  // Cannot clear last party member
  let pRes = Progression.setPartySlot(state, 1, null);
  pRes = Progression.setPartySlot(pRes.state, 2, null);
  pRes = Progression.setPartySlot(pRes.state, 3, null);
  assert.equal(Progression.setPartySlot(pRes.state, 0, null).ok, false);

  // Advance 3 battles and claim
  state = Progression.advanceExpeditionsOnBattle(state).state;
  state = Progression.advanceExpeditionsOnBattle(state).state;
  assert.equal(Progression.claimExpedition(state, 0).ok, false);
  state = Progression.advanceExpeditionsOnBattle(state).state;
  const claimRes = Progression.claimExpedition(state, 0);
  assert.equal(claimRes.ok, true);
  state = claimRes.state;
  assert.equal(state.expeditions.length, 0);

  // Assign 渡辺 葵 to resonance, then move to party -> auto-evicts from resonance
  state = Progression.setResonance(state, 0, 'char_watanabe_aoi').state;
  assert.equal(state.resonanceSlots[0], 'char_watanabe_aoi');
  state = Progression.setPartySlot(state, 0, 'char_watanabe_aoi').state;
  assert.equal(state.party[0], 'char_watanabe_aoi');
  assert.equal(state.resonanceSlots[0], null);
  assert.equal(SaveSecurity.validateSchema(state).ok, true);
});

test('M3-10. Backward-compatible schema validation, strict M3 schema checks, and R5 static audit on progression.js', async () => {
  const ctx = loadM3Context({ secure: true });
  const { SaveSecurity, StateStore } = ctx.IkaiApp;

  // M1/M2 legacy save fixture without srPityCount and raidBestDamage
  const legacy = StateStore.createInitialState();
  delete legacy.summon.srPityCount;
  delete legacy.progress.raidBestDamage;
  assert.equal(SaveSecurity.validateSchema(legacy).ok, true);

  // Signed round-trip of full M3 initial state
  const current = StateStore.createInitialState();
  assert.equal(SaveSecurity.validateSchema(current).ok, true);
  const signed = await SaveSecurity.signState(current);
  const parsed = await SaveSecurity.verifyAndParse(JSON.stringify(signed));
  assert.equal(parsed.ok, true);

  // Reject tampered srPityCount / raidBestDamage
  const badSr1 = StateStore.createInitialState();
  badSr1.summon.srPityCount = 41;
  assert.equal(SaveSecurity.validateSchema(badSr1).ok, false);

  const badSr2 = StateStore.createInitialState();
  badSr2.summon.srPityCount = -1;
  assert.equal(SaveSecurity.validateSchema(badSr2).ok, false);

  const badRaidDmg = StateStore.createInitialState();
  badRaidDmg.progress.raidBestDamage = { fake_boss: { easy: 100 } };
  assert.equal(SaveSecurity.validateSchema(badRaidDmg).ok, false);

  const badRaidDmgVal = StateStore.createInitialState();
  badRaidDmgVal.progress.raidBestDamage = { raid_zerogo: { easy: -5 } };
  assert.equal(SaveSecurity.validateSchema(badRaidDmgVal).ok, false);

  // Static audit on js/progression.js
  const progSrc = fs.readFileSync(path.join(JS_DIR, 'progression.js'), 'utf8');
  assert.equal(/Date\.now/.test(progSrc), false, 'progression.js must not call Date.now()');
  assert.equal(/innerHTML/i.test(progSrc), false, 'progression.js must not use innerHTML');
  assert.equal(/ellipsis/i.test(progSrc), false, 'progression.js must not mention ellipsis');
  const r5Re = /(?<![a-zA-Z0-9_])Lv(?![a-zA-Z0-9_])|レベル|陣形|デイリー|ウィークリー|マンスリー|実績|(?<![a-zA-Z0-9_])PvP(?![a-zA-Z0-9_])/i;
  assert.equal(r5Re.test(progSrc), false, 'progression.js must have 0 R5 prohibited words');
});

// =========================================================================
// Part B: Headless Chrome CDP 390x844 M3 Full E2E Verification
// =========================================================================

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://127.0.0.1');
    let relPath = decodeURIComponent(reqUrl.pathname);
    if (relPath === '/') relPath = '/index.html';
    const targetPath = path.resolve(rootDir, '.' + relPath);
    if (!targetPath.startsWith(rootDir)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      res.writeHead(404); res.end('Not Found'); return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(targetPath) });
    fs.createReadStream(targetPath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function launchHeadlessChrome(profileDir) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    'about:blank'
  ];
  const proc = spawn(CHROME_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderrBuf = '';
  const wsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome DevTools startup timeout: ' + stderrBuf)), 15000);
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString('utf8');
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\r\n]+)/);
      if (m) { clearTimeout(timeout); resolve(m[1].trim()); }
    });
    proc.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Chrome exited ${code}: ${stderrBuf}`)); });
  });
  return { proc, wsUrl };
}

async function createCdpClient(browserWsUrl) {
  const browserWs = new WebSocket(browserWsUrl);
  await new Promise((resolve, reject) => {
    browserWs.addEventListener('open', resolve, { once: true });
    browserWs.addEventListener('error', reject, { once: true });
  });

  function makeSender(ws) {
    let nextId = 1;
    const pending = new Map();
    const listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id) {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          if (msg.error) entry.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else entry.resolve(msg.result);
        }
      } else if (msg.method) {
        const set = listeners.get(msg.method);
        if (set) for (const fn of set) fn(msg.params);
      }
    });
    return {
      send(method, params = {}) {
        const id = nextId++;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          ws.send(JSON.stringify({ id, method, params }));
        });
      },
      on(method, fn) {
        if (!listeners.has(method)) listeners.set(method, new Set());
        listeners.get(method).add(fn);
      },
      close() { try { ws.close(); } catch (_) {} }
    };
  }

  const browser = makeSender(browserWs);
  const { targetInfos } = await browser.send('Target.getTargets');
  let pageTarget = targetInfos.find((t) => t.type === 'page');
  if (!pageTarget) {
    const created = await browser.send('Target.createTarget', { url: 'about:blank' });
    pageTarget = { targetId: created.targetId };
  }
  const browserUrlObj = new URL(browserWsUrl);
  const pageWsUrl = `ws://${browserUrlObj.host}/devtools/page/${pageTarget.targetId}`;
  const pageWs = new WebSocket(pageWsUrl);
  await new Promise((resolve, reject) => {
    pageWs.addEventListener('open', resolve, { once: true });
    pageWs.addEventListener('error', reject, { once: true });
  });
  return { browser, page: makeSender(pageWs) };
}

async function runM3CdpE2E(targetUrl, modeLabel) {
  const baseTmp = process.env.IKAI_TMP_DIR || os.tmpdir();
  fs.mkdirSync(baseTmp, { recursive: true });
  const profileDir = fs.mkdtempSync(path.join(baseTmp, `ikai_m3_${modeLabel}_`));
  let proc = null;
  let cdp = null;

  try {
    const launched = await launchHeadlessChrome(profileDir);
    proc = launched.proc;
    cdp = await createCdpClient(launched.wsUrl);
    const { page } = cdp;

    const exceptions = [];
    const consoleErrors = [];
    const logIssues = [];
    const networkFailures = [];
    const httpErrors = [];

    page.on('Runtime.exceptionThrown', (p) => exceptions.push(p));
    page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') consoleErrors.push(p); });
    page.on('Log.entryAdded', (p) => { if (p.entry && (p.entry.level === 'error' || p.entry.level === 'warning')) logIssues.push(p.entry); });
    page.on('Network.loadingFailed', (p) => networkFailures.push(p));
    page.on('Network.responseReceived', (p) => { if (p.response && p.response.status >= 400) httpErrors.push({ url: p.response.url, status: p.response.status }); });

    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (ev) => {
          window.__cspViolations.push({ violatedDirective: ev.violatedDirective, blockedURI: ev.blockedURI });
        });
      `
    });

    const loadDone = new Promise((resolve) => page.on('Page.loadEventFired', resolve));
    await page.send('Page.navigate', { url: targetUrl });
    await loadDone;

    const evalJson = async (expr) => {
      const res = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) throw new Error('Eval failed: ' + JSON.stringify(res.exceptionDetails));
      return res.result.value;
    };

    for (let i = 0; i < 40; i += 1) {
      if (await evalJson('Boolean(window.IkaiApp && window.IkaiApp.App && window.IkaiApp.App.getUiState().booted)')) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    // Inject iPhone 14 SafeArea insets
    await evalJson(`(() => {
      document.documentElement.style.setProperty('--safe-top', '47px');
      document.documentElement.style.setProperty('--safe-bottom', '34px');
      return true;
    })()`);

    const auditScreen = async (label) => {
      const a = await evalJson(`(() => {
        const upper = document.getElementById('upper-stage');
        const lower = document.getElementById('lower-deck');
        const upperRect = upper.getBoundingClientRect();
        const lowerRect = lower.getBoundingClientRect();
        const interactiveSel = 'button, a, input, select, textarea, [tabindex], [role="button"]';
        const upperInteractive = upper.querySelectorAll(interactiveSel).length;
        const leakedUpperRects = Array.from(document.querySelectorAll(interactiveSel)).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 421.5;
        }).length;
        const upperScrollable = Array.from(upper.querySelectorAll('*')).filter((el) => {
          const oy = getComputedStyle(el).overflowY;
          return oy === 'auto' || oy === 'scroll';
        }).length;
        const upperOverflowChildren = Array.from(upper.children).filter((ch) => {
          const r = ch.getBoundingClientRect();
          return r.bottom > upperRect.bottom + 0.5;
        }).length;
        const ellipsisEls = Array.from(document.querySelectorAll('*')).filter((el) => getComputedStyle(el).textOverflow === 'ellipsis').length;
        const truncatedNames = Array.from(document.querySelectorAll('.unit-name')).filter((el) => {
          const txt = el.textContent || '';
          return el.scrollWidth > el.clientWidth + 1 || txt.includes('...') || txt.includes('・・・');
        }).map((el) => el.textContent);

        return {
          upperBottom: upperRect.bottom,
          lowerTop: lowerRect.top,
          upperInteractive,
          leakedUpperRects,
          upperScrollable,
          upperOverflowChildren,
          ellipsisEls,
          truncatedNames,
          rootScrollHeight: document.documentElement.scrollHeight,
          rootScrollWidth: document.documentElement.scrollWidth,
          bodyText: document.body.innerText,
          cspViolations: window.__cspViolations
        };
      })()`);

      const r5Forbidden = /\bLv\b|レベル|陣形|デイリー|ウィークリー|マンスリー|実績|\bPvP\b/i;
      const techJargon = /Web Audio API|プロシージャル合成|スキーマ版|ikai-zankyo-save/;
      assert.equal(a.upperInteractive, 0, `${label}: upperInteractive`);
      assert.equal(a.leakedUpperRects, 0, `${label}: leakedUpperRects`);
      assert.equal(a.upperScrollable, 0, `${label}: upperScrollable`);
      assert.equal(a.upperOverflowChildren, 0, `${label}: upperOverflowChildren`);
      assert.ok(a.upperBottom <= 422.5, `${label}: upperBottom`);
      assert.ok(a.lowerTop >= 421.5, `${label}: lowerTop`);
      assert.equal(a.ellipsisEls, 0, `${label}: ellipsisEls`);
      assert.deepEqual(a.truncatedNames, [], `${label}: truncatedNames`);
      assert.ok(a.rootScrollHeight <= 844, `${label}: rootScrollHeight`);
      assert.ok(a.rootScrollWidth <= 390, `${label}: rootScrollWidth`);
      assert.equal(r5Forbidden.test(a.bodyText), false, `${label}: R5 forbidden text`);
      assert.equal(techJargon.test(a.bodyText), false, `${label}: tech jargon`);
      assert.deepEqual(a.cspViolations, [], `${label}: CSP violations`);
    };

    const waitForMode = async (targetMode) => {
      for (let i = 0; i < 300; i += 1) {
        const m = await evalJson('window.IkaiApp.App.getUiState().mode');
        if (m === targetMode) return true;
        await new Promise((r) => setTimeout(r, 80));
      }
      return false;
    };

    // 1. Audit all 7 tabs & subscreens
    for (const tabId of ['areas', 'party', 'roster', 'expedition', 'summon', 'codex', 'records']) {
      await evalJson(`document.querySelector('.lower-tabs .tab-btn[data-tab-id="${tabId}"]').click();`);
      await auditScreen(`tab:${tabId}`);
    }

    // Subscreens audit
    await evalJson(`document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();`);
    for (const pillar of ['abyss', 'raid', 'trial', 'story']) {
      await evalJson(`document.querySelector('[data-action="switch-areas-pillar"][data-pillar="${pillar}"]').click();`);
      await auditScreen(`areas:${pillar}`);
    }

    await evalJson(`document.querySelector('.lower-tabs .tab-btn[data-tab-id="roster"]').click();`);
    for (const sub of ['emblem', 'skills', 'equips', 'chars']) {
      await evalJson(`document.querySelector('[data-action="switch-enhance-sub"][data-sub="${sub}"]').click();`);
      await auditScreen(`roster:${sub}`);
    }

    // 2. Expedition start + Restricted Trial block -> unblock via Party -> complete Trial -> advances Expedition!
    const expStarted = await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="expedition"]').click();
      document.querySelector('[data-action="select-zone"][data-zone-id="exp_1"]').click();
      document.querySelector('[data-action="toggle-exp-char"][data-char-id="char_watanabe_aoi"]').click();
      document.querySelector('[data-action="start-expedition"]').click();
      return window.IkaiApp.StateStore.getState().expeditions.length;
    })()`);
    assert.equal(expStarted, 1);

    // Check trial_5 (maxPartySize: 2) & trial_2 (onlyR: true) blocked on initial party, then replace slot 0 with SR/R?
    // Wait: Watanabe Aoi is currently on expedition! So let's verify party safety blocks assigning Watanabe Aoi while on expedition,
    // and then test trial_5 (maxPartySize: 2) by clearing slots 2 and 3 in Party tab!
    const trialAndSafety = await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();
      document.querySelector('[data-action="switch-areas-pillar"][data-pillar="trial"]').click();
      document.querySelector('[data-action="select-trial"][data-trial-id="trial_5"]').click();
      const errBannerBefore = document.querySelector('#lower-deck .notice-banner.is-error');
      const startDisabledBefore = document.querySelector('[data-action="start-trial"]').disabled;

      // Attempt to assign expedition char to party -> safely shows notice error without crashing
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="party"]').click();
      const assignBtnDisabled = document.querySelector('[data-action="party-assign-char"][data-char-id="char_watanabe_aoi"]').disabled;
      const directRes = window.IkaiApp.Progression.setPartySlot(window.IkaiApp.StateStore.getState(), 0, 'char_watanabe_aoi');

      // Clear slots 2 and 3 to satisfy trial_5 (maxPartySize: 2)
      document.querySelector('[data-action="party-clear-slot"][data-slot-idx="2"]').click();
      document.querySelector('[data-action="party-clear-slot"][data-slot-idx="3"]').click();

      document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();
      const startDisabledAfter = document.querySelector('[data-action="start-trial"]').disabled;
      return {
        hasErrBefore: Boolean(errBannerBefore),
        startDisabledBefore,
        assignBtnDisabled,
        directBlocked: !directRes.ok,
        startDisabledAfter
      };
    })()`);
    assert.equal(trialAndSafety.hasErrBefore, true);
    assert.equal(trialAndSafety.startDisabledBefore, true);
    assert.equal(trialAndSafety.assignBtnDisabled, true);
    assert.equal(trialAndSafety.directBlocked, true);
    assert.equal(trialAndSafety.startDisabledAfter, false);

    // Restore 4-person party & execute Trial 1 (Area 1 mid-boss, clears reliably), advancing Expedition 1 -> 1/3
    await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="party"]').click();
      document.querySelector('[data-action="select-party-slot"][data-slot-idx="2"]').click();
      document.querySelector('[data-action="party-assign-char"][data-char-id="char_saito_riko"]').click();
      document.querySelector('[data-action="select-party-slot"][data-slot-idx="3"]').click();
      document.querySelector('[data-action="party-assign-char"][data-char-id="char_nakamura_yui"]').click();
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();
      document.querySelector('[data-action="select-trial"][data-trial-id="trial_1"]').click();
      document.querySelector('[data-action="start-trial"]').click();
      document.querySelector('[data-action="battle-speed"][data-speed="3"]').click();
      return true;
    })()`);
    assert.equal(await waitForMode('result'), true);
    await auditScreen('result:trial');

    const postTrial = await evalJson(`(() => {
      const s = window.IkaiApp.StateStore.getState();
      document.querySelector('[data-action="return-hub"]').click();
      return {
        trialsCleared: s.progress.trialsCleared.slice(),
        expBattlesDone: s.expeditions[0].battlesDone
      };
    })()`);
    assert.ok(postTrial.trialsCleared.includes('trial_1'));
    assert.equal(postTrial.expBattlesDone, 1);

    // 3. Abyss floor 1 battle (expedition battlesDone -> 2)
    await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();
      document.querySelector('[data-action="switch-areas-pillar"][data-pillar="abyss"]').click();
      document.querySelector('[data-action="start-abyss"]').click();
      document.querySelector('[data-action="battle-speed"][data-speed="3"]').click();
      return true;
    })()`);
    assert.equal(await waitForMode('result'), true);
    await auditScreen('result:abyss');

    const postAbyss = await evalJson(`(() => {
      const s = window.IkaiApp.StateStore.getState();
      document.querySelector('[data-action="return-hub"]').click();
      return { abyssMaxFloor: s.progress.abyssMaxFloor, expBattlesDone: s.expeditions[0].battlesDone };
    })()`);
    assert.ok(postAbyss.abyssMaxFloor >= 1);
    assert.equal(postAbyss.expBattlesDone, 2);

    // 4. Raid battle (expedition battlesDone -> 3/3 -> claim!)
    await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();
      document.querySelector('[data-action="switch-areas-pillar"][data-pillar="raid"]').click();
      document.querySelector('[data-action="start-raid"]').click();
      document.querySelector('[data-action="battle-speed"][data-speed="3"]').click();
      return true;
    })()`);
    assert.equal(await waitForMode('result'), true);
    await auditScreen('result:raid');

    const postRaidAndClaim = await evalJson(`(() => {
      const sBefore = window.IkaiApp.StateStore.getState();
      const raidDmg = sBefore.progress.raidBestDamage.raid_zerogo && sBefore.progress.raidBestDamage.raid_zerogo.easy;
      document.querySelector('[data-action="return-hub"]').click();
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="expedition"]').click();
      const claimBtn = document.querySelector('[data-action="claim-expedition"][data-slot-idx="0"]');
      const canClaim = Boolean(claimBtn && !claimBtn.disabled);
      if (claimBtn) claimBtn.click();
      const sAfter = window.IkaiApp.StateStore.getState();
      return {
        raidDmg,
        canClaim,
        expRemaining: sAfter.expeditions.length,
        echoStones: sAfter.currencies.echoStones
      };
    })()`);
    assert.ok(postRaidAndClaim.raidDmg > 0);
    assert.equal(postRaidAndClaim.canClaim, true);
    assert.equal(postRaidAndClaim.expRemaining, 0);
    assert.ok(postRaidAndClaim.echoStones >= 1500);

    // 5. Summon 10x + Upper Showcase Audit + Crystal Shop check
    await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="summon"]').click();
      document.querySelector('[data-action="select-banner"][data-banner-id="banner_pu_2"]').click();
      document.querySelector('[data-action="roll-summon"][data-count="10"]').click();
      return true;
    })()`);
    await auditScreen('summon:after10');
    const summonCheck = await evalJson(`(() => {
      const chips = document.querySelectorAll('#upper-stage .summon-showcase-grid .summon-pull-chip').length;
      const totalPulls = window.IkaiApp.StateStore.getState().summon.totalPulls;
      document.querySelector('[data-action="switch-summon-sub"][data-sub="shop"]').click();
      const shopBtns = document.querySelectorAll('[data-action="exchange-crystal"]').length;
      return { chips, totalPulls, shopBtns };
    })()`);
    assert.equal(summonCheck.chips, 10);
    assert.equal(summonCheck.totalPulls, 10);
    assert.equal(summonCheck.shopBtns, 7);

    // 6. Enhance (Emblem unlock + Skill Mastery + Equip + Bulk Sell)
    const enhanceCheck = await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="roster"]').click();
      document.querySelector('[data-action="select-char"][data-char-id="char_todo_seiichi"]').click();
      document.querySelector('[data-action="switch-enhance-sub"][data-sub="emblem"]').click();
      document.querySelector('[data-action="unlock-emblem"][data-node-id="1"]').click();
      const emblems = window.IkaiApp.StateStore.getState().roster.char_todo_seiichi.emblemNodes.slice();

      document.querySelector('[data-action="switch-enhance-sub"][data-sub="skills"]').click();
      document.querySelector('[data-action="select-skill"][data-skill-id="sk_r_kiriharai"]').click();
      document.querySelector('[data-action="equip-collect-skill"][data-slot-idx="0"]').click();
      document.querySelector('[data-action="upgrade-skill-mastery"][data-skill-id="sk_r_kiriharai"]').click();
      const skRank = window.IkaiApp.StateStore.getState().skillInventory.sk_r_kiriharai.rank;
      const skEquipped = window.IkaiApp.StateStore.getState().roster.char_todo_seiichi.skills[0];

      document.querySelector('[data-action="switch-enhance-sub"][data-sub="equips"]').click();
      document.querySelector('[data-action="equip-item"][data-uid="eq_init_1"]').click();
      document.querySelector('[data-action="toggle-equip-lock"][data-uid="eq_init_2"]').click();
      document.querySelector('[data-action="set-synth-base"][data-uid="eq_init_1"]').click();
      const countBeforeSell = window.IkaiApp.StateStore.getState().equips.length;
      document.querySelector('[data-action="bulk-sell-equips"][data-max-quality="0"]').click();
      const countAfterSell = window.IkaiApp.StateStore.getState().equips.length;
      const equippedUid = window.IkaiApp.StateStore.getState().roster.char_todo_seiichi.equipped['主器'];

      return { emblems, skRank, skEquipped, countBeforeSell, countAfterSell, equippedUid };
    })()`);
    assert.deepEqual(enhanceCheck.emblems, [1]);
    assert.equal(enhanceCheck.skRank, 2);
    assert.equal(enhanceCheck.skEquipped, 'sk_r_kiriharai');
    assert.ok(enhanceCheck.countAfterSell < enhanceCheck.countBeforeSell);
    assert.equal(enhanceCheck.equippedUid, 'eq_init_1');

    // 7. Codex search focus maintenance + filtering
    const codexCheck = await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="codex"]').click();
      const input = document.getElementById('codex-search-input');
      input.focus();
      input.value = '藤堂';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const activeId = document.activeElement ? document.activeElement.id : '';
      const rowNames = Array.from(document.querySelectorAll('#lower-deck .stage-card-btn .unit-name')).map((e) => e.textContent);
      return { activeId, rowNames };
    })()`);
    assert.equal(codexCheck.activeId, 'codex-search-input');
    assert.deepEqual(codexCheck.rowNames, ['藤堂 誠一']);

    // 8. Settings auto-sell + SW v3 check on http
    const settingsCheck = await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="records"]').click();
      document.querySelector('[data-action="set-auto-sell"][data-max-quality="1"]').click();
      return window.IkaiApp.StateStore.getState().settings.autoSellMaxQualityIdx;
    })()`);
    assert.equal(settingsCheck, 1);

    if (modeLabel === 'http') {
      const swInfo = await evalJson(`(async () => {
        for (let i = 0; i < 40; i += 1) {
          const reg = await navigator.serviceWorker.getRegistration();
          const keys = await caches.keys();
          if (reg && keys.includes('ikai-zankyo-shell-v3')) {
            const c = await caches.open('ikai-zankyo-shell-v3');
            const progCached = await c.match('./js/progression.js');
            return { keys, hasProg: Boolean(progCached) };
          }
          await new Promise((r) => setTimeout(r, 80));
        }
        return { keys: await caches.keys(), hasProg: false };
      })()`);
      assert.ok(swInfo.keys.includes('ikai-zankyo-shell-v3'));
      assert.equal(swInfo.hasProg, true);
    }

    assert.deepEqual(exceptions, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(logIssues, []);
    assert.deepEqual(networkFailures, []);
    assert.deepEqual(httpErrors, []);
  } finally {
    if (cdp) {
      try { await cdp.browser.send('Browser.close'); } catch (_) {}
      cdp.page.close();
      cdp.browser.close();
    }
    if (proc && proc.exitCode === null) {
      await new Promise((resolve) => {
        const t = setTimeout(() => { try { proc.kill('SIGKILL'); } catch (_) {} resolve(); }, 3000);
        proc.once('exit', () => { clearTimeout(t); resolve(); });
      });
    }
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 });
  }
}

test('B1. Headless Chrome 390x844 SafeArea M3 Full Flows on file://', async () => {
  assert.equal(fs.existsSync(CHROME_PATH), true, `Chrome not found at ${CHROME_PATH}`);
  const fileUrl = pathToFileURL(path.join(PROJECT_ROOT, 'index.html')).href;
  await runM3CdpE2E(fileUrl, 'file');
});

test('B2. Headless Chrome 390x844 SafeArea M3 Full Flows & SW v3 on http://127.0.0.1', async () => {
  assert.equal(fs.existsSync(CHROME_PATH), true, `Chrome not found at ${CHROME_PATH}`);
  const { server, port } = await startStaticServer(PROJECT_ROOT);
  try {
    await runM3CdpE2E(`http://127.0.0.1:${port}/index.html`, 'http');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
