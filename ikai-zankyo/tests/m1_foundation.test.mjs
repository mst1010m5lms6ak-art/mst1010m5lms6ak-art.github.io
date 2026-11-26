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

function loadIkaiContext({ secure = false, storage = new Map(), protocol = 'file:' } = {}) {
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
  for (const file of ['namespace.js', 'master-data.js', 'save-security.js', 'state-store.js']) {
    const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}

function toHost(val) {
  return JSON.parse(JSON.stringify(val));
}

function collectFilesRecursive(dir, skipDirs = new Set()) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) {
        continue;
      }
      out.push(...collectFilesRecursive(path.join(dir, entry.name), skipDirs));
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// =========================================================================
// Part A: Node Unit / Security / MasterData / StateStore / Static Audit
// =========================================================================

test('A1. Pure-JS RFC 2104 HMAC-SHA256 matches node:crypto byte-for-byte', () => {
  const ctx = loadIkaiContext({ secure: false });
  const { hmacSha256HexPureJs, sha256HexPureJs } = ctx.IkaiApp.SaveSecurity._internal;

  const vectors = [
    { key: 'short-key', msg: 'hello world' },
    { key: 'a'.repeat(64), msg: '' },
    { key: 'k'.repeat(100), msg: '異界残響録：桐生貴史・残響石1500' },
    { key: '秘密鍵テスト🔑', msg: '𠮟る・絵文字🛡️・UTF8マルチバイト境界検証' }
  ];

  for (const vec of vectors) {
    const expectedSha = crypto.createHash('sha256').update(vec.msg, 'utf8').digest('hex');
    assert.equal(sha256HexPureJs(vec.msg), expectedSha);

    const expectedHmac = crypto.createHmac('sha256', Buffer.from(vec.key, 'utf8'))
      .update(Buffer.from(vec.msg, 'utf8'))
      .digest('hex');
    const actualHmac = hmacSha256HexPureJs(vec.key, vec.msg);
    assert.equal(actualHmac, expectedHmac);
    assert.match(actualHmac, /^[0-9a-f]{64}$/);
  }
});

test('A2. Web Crypto and Pure-JS fallback cross-verify backups identically', async () => {
  const fileCtx = loadIkaiContext({ secure: false, protocol: 'file:' });
  const pwaCtx = loadIkaiContext({ secure: true, protocol: 'https:' });

  const stateFromFile = fileCtx.IkaiApp.StateStore.createInitialState();
  const backupFromFile = await fileCtx.IkaiApp.SaveSecurity.exportBackup(stateFromFile);
  const importedOnPwa = await pwaCtx.IkaiApp.SaveSecurity.importBackup(backupFromFile);
  assert.equal(importedOnPwa.ok, true);
  assert.deepEqual(toHost(importedOnPwa.state), toHost(stateFromFile));

  const stateFromPwa = pwaCtx.IkaiApp.StateStore.createInitialState();
  stateFromPwa.currencies.echoStones = 2400;
  const backupFromPwa = await pwaCtx.IkaiApp.SaveSecurity.exportBackup(stateFromPwa);
  const importedOnFile = await fileCtx.IkaiApp.SaveSecurity.importBackup(backupFromPwa);
  assert.equal(importedOnFile.ok, true);
  assert.equal(importedOnFile.state.currencies.echoStones, 2400);
});

test('A3. SaveSecurity detects 1-char payload tampering and MAC tampering without throwing', async () => {
  const ctx = loadIkaiContext({ secure: false });
  const { SaveSecurity, StateStore } = ctx.IkaiApp;
  const initial = StateStore.createInitialState();
  const backupJson = await SaveSecurity.exportBackup(initial);

  const parsedPayloadTamper = JSON.parse(backupJson);
  parsedPayloadTamper.payload.currencies.echoStones += 1;
  const res1 = await SaveSecurity.verifyAndParse(JSON.stringify(parsedPayloadTamper));
  assert.equal(res1.ok, false);
  assert.ok(res1.reason);

  const parsedMacTamper = JSON.parse(backupJson);
  const lastChar = parsedMacTamper.mac.slice(-1);
  parsedMacTamper.mac = parsedMacTamper.mac.slice(0, -1) + (lastChar === '0' ? '1' : '0');
  const res2 = await SaveSecurity.verifyAndParse(JSON.stringify(parsedMacTamper));
  assert.equal(res2.ok, false);
  assert.ok(res2.reason);
});

test('A4. SaveSecurity validateSchema rejects R5 forbidden keys and malformed payloads', async () => {
  const ctx = loadIkaiContext({ secure: true });
  const { SaveSecurity, StateStore } = ctx.IkaiApp;

  const makeValid = () => StateStore.createInitialState();

  const cases = [
    (s) => { s.roster.char_todo_seiichi.lv = 10; },
    (s) => { s.equips[0]['レベル'] = 5; },
    (s) => { s.equips[0].subOptions = []; },
    (s) => { s.currencies.echoStones = -1; },
    (s) => { s.roster.char_nonexistent = s.roster.char_todo_seiichi; },
    (s) => { s.party = ['char_todo_seiichi', 'char_todo_seiichi', null, null]; },
    (s) => { s.unknownTopKey = 123; }
  ];

  for (const mutate of cases) {
    const s = makeValid();
    mutate(s);
    const v = SaveSecurity.validateSchema(s);
    assert.equal(v.ok, false);
  }

  const badJsonRes = await SaveSecurity.verifyAndParse('{not valid json');
  assert.equal(badJsonRes.ok, false);
});

test('A5. MasterData is deeply frozen and covers 5 areas x 6 stages x 5 waves (150 waves) + 30 enemies', () => {
  const ctx = loadIkaiContext();
  const { MasterData } = ctx.IkaiApp;

  assert.equal(MasterData.TITLE, '異界残響録');
  assert.equal(Object.isFrozen(MasterData), true);
  assert.equal(Object.isFrozen(MasterData.AREAS), true);
  assert.equal(Object.isFrozen(MasterData.AREAS[0].stages[0].waves), true);
  assert.equal(MasterData.AREAS.length, 5);

  let totalWaves = 0;
  let bossStagesCount = 0;
  for (const area of MasterData.AREAS) {
    assert.equal(area.stages.length, 6);
    for (const stage of area.stages) {
      assert.equal(stage.waves.length, 5);
      totalWaves += stage.waves.length;

      for (const wave of stage.waves) {
        assert.ok(wave.enemyIds.length >= 1);
        for (const eid of wave.enemyIds) {
          assert.ok(MasterData.ENEMIES[eid], `Missing enemy ${eid}`);
        }
      }

      if (stage.stageNum === 3 || stage.stageNum === 6) {
        assert.equal(stage.isBossStage, true);
        assert.ok(stage.bossId);
        bossStagesCount += 1;
        const boss = MasterData.ENEMIES[stage.bossId];
        assert.equal(boss.isBoss, true);
        assert.ok(boss.skills.length >= 2);
        for (const sk of boss.skills) {
          assert.ok(['単体', '範囲', '全体'].includes(sk.targetType));
          assert.equal(sk.telegraph.enabled, true);
          assert.ok(sk.telegraph.warningText);
        }
      } else {
        assert.equal(stage.isBossStage, false);
      }
    }
  }
  assert.equal(totalWaves, 150);
  assert.equal(bossStagesCount, 10);

  const allEnemies = Object.values(MasterData.ENEMIES);
  assert.equal(allEnemies.length, 30);
  const normalEnemies = allEnemies.filter((e) => !e.isBoss);
  const bossEnemies = allEnemies.filter((e) => e.isBoss);
  assert.equal(normalEnemies.length, 20);
  assert.equal(bossEnemies.length, 10);
  for (const ne of normalEnemies) {
    assert.ok(ne.skills.length >= 1);
    assert.ok(['単体', '範囲', '全体'].includes(ne.skills[0].targetType));
  }

  const serialized = JSON.stringify(MasterData);
  assert.equal(/"(lv|level|レベル)"\s*:/.test(serialized), false);
});

test('A6. MasterData covers 20 chars, 18 skills, 6 sets, 24 equips, 12 emblems, 3x3 raids, 5 trials, 4 banners, 4 expeditions', () => {
  const ctx = loadIkaiContext();
  const { MasterData } = ctx.IkaiApp;

  assert.equal(MasterData.CHARACTERS.length, 20);
  const countByRarity = { SSR: 0, SR: 0, R: 0 };
  const countByRole = { 'タンク': 0, 'ディーラー': 0, 'サポーター': 0, 'ヒーラー': 0 };
  for (const ch of MasterData.CHARACTERS) {
    countByRarity[ch.rarity] += 1;
    countByRole[ch.role] += 1;
    assert.ok(ch.kana && ch.kana.length > 0);
  }
  assert.deepEqual(countByRarity, { SSR: 6, SR: 7, R: 7 });
  assert.deepEqual(countByRole, { 'タンク': 5, 'ディーラー': 6, 'サポーター': 5, 'ヒーラー': 4 });

  assert.equal(MasterData.SKILLS.length, 18);
  const skillByRarity = { R: 0, SR: 0, SSR: 0 };
  for (const sk of MasterData.SKILLS) {
    skillByRarity[sk.rarity] += 1;
    assert.ok(['単体', '範囲', '全体'].includes(sk.targetType));
  }
  assert.deepEqual(skillByRarity, { R: 6, SR: 6, SSR: 6 });

  assert.equal(MasterData.SETS.length, 6);
  assert.equal(MasterData.QUALITY_RANKS.length, 5);
  const totalDropWeight = MasterData.QUALITY_RANKS.reduce((sum, q) => sum + q.dropWeight, 0);
  assert.ok(Math.abs(totalDropWeight - 100.0) < 0.001);
  assert.equal(MasterData.EQUIPS.length, 24);
  assert.deepEqual(toHost(MasterData.EQUIP_SYNTHESIS_RULES.map((r) => r.pityMax)), [3, 4, 5, 6]);

  assert.equal(MasterData.EMBLEM_NODES.length, 12);
  assert.equal(MasterData.RAID_BOSSES.length, 3);
  for (const rb of MasterData.RAID_BOSSES) {
    assert.equal(rb.difficulties.length, 3);
    for (const sk of rb.skills) {
      assert.equal(sk.telegraph.enabled, true);
    }
  }

  assert.equal(MasterData.TRIALS.length, 5);
  const ssrTank = MasterData.CHARACTER_MAP.char_kiryu_takashi;
  const rDealer = MasterData.CHARACTER_MAP.char_kobayashi_shohei;
  const rHealer = MasterData.CHARACTER_MAP.char_nakamura_yui;
  assert.equal(MasterData.validateTrialParty('trial_1', [ssrTank]).ok, false);
  assert.equal(MasterData.validateTrialParty('trial_1', [rDealer]).ok, true);
  assert.equal(MasterData.validateTrialParty('trial_3', [rHealer]).ok, false);
  assert.equal(MasterData.validateTrialParty('trial_5', [rDealer, rHealer, ssrTank]).ok, false);
  assert.equal(MasterData.validateTrialParty('trial_5', [rDealer, rHealer]).ok, true);

  assert.equal(MasterData.BANNERS.length, 4);
  assert.equal(MasterData.EXPEDITION_ZONES.length, 4);
  for (const ez of MasterData.EXPEDITION_ZONES) {
    assert.equal(Object.prototype.hasOwnProperty.call(ez, 'durationMs'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(ez, 'durationSec'), false);
    assert.ok(ez.requiredBattles > 0);
  }
  assert.ok(MasterData.CRYSTAL_SHOP_ITEMS.length >= 4);
});

test('A7. StateStore persistence round-trip and non-destructive tampered fallback', async () => {
  const storage = new Map();
  const ctx1 = loadIkaiContext({ secure: false, storage });
  const { StateStore, SaveSecurity } = ctx1.IkaiApp;

  const init = StateStore.createInitialState();
  assert.equal(SaveSecurity.validateSchema(init).ok, true);
  assert.equal(init.party.filter(Boolean).length, 4);

  StateStore.update((draft) => {
    draft.currencies.echoStones = 3210;
  }, { persist: false });
  const saveRes = await StateStore.saveNow();
  assert.equal(saveRes.ok, true);

  const ctx2 = loadIkaiContext({ secure: true, storage });
  const loadRes = await ctx2.IkaiApp.StateStore.loadSaved();
  assert.equal(loadRes.ok, true);
  assert.equal(ctx2.IkaiApp.StateStore.getState().currencies.echoStones, 3210);

  // Tamper stored payload directly
  const rawStored = storage.get(StateStore.STORAGE_KEY);
  const tampered = rawStored.replace('3210', '9999');
  storage.set(StateStore.STORAGE_KEY, tampered);

  const ctx3 = loadIkaiContext({ secure: false, storage });
  const fallbackRes = await ctx3.IkaiApp.StateStore.loadSaved();
  assert.equal(fallbackRes.ok, false);
  assert.equal(fallbackRes.fallback, true);
  assert.equal(ctx3.IkaiApp.StateStore.getState().currencies.echoStones, 1500);
  // Original corrupted string in storage must not be overwritten
  assert.equal(storage.get(StateStore.STORAGE_KEY), tampered);
});

test('A8. sortUnits sorts all 20 characters strictly by Rarity -> Role -> Gojuon without mutating input', () => {
  const ctx = loadIkaiContext();
  const { MasterData, StateStore } = ctx.IkaiApp;

  const expectedOrder = [
    '桐生 貴史', '氷室 宗一郎',
    '神崎 澪', '九条 蓮司',
    '水無瀬 栞',
    '白石 澄花',
    '藤堂 誠一',
    '天野 颯太', '黒田 千尋',
    '桜井 凛', '長谷川 悠人',
    '穂積 沙耶', '宮本 紬',
    '石井 大輝', '村上 健太',
    '小林 翔平', '渡辺 葵',
    '斉藤 莉子', '高橋 拓海',
    '中村 結衣'
  ];

  const reversed = MasterData.CHARACTERS.slice().reverse();
  const snapshotBefore = toHost(reversed.map((c) => c.id));
  const sorted = StateStore.sortUnits(reversed);
  assert.deepEqual(toHost(reversed.map((c) => c.id)), snapshotBefore);
  assert.deepEqual(toHost(sorted.map((c) => c.name)), expectedOrder);

  // Edge cases: dakuten, handakuten, small kana, katakana
  const edgeUnits = [
    { id: 'u4', rarity: 'R', role: 'タンク', kana: 'ぱな', name: 'ぱな' },
    { id: 'u2', rarity: 'R', role: 'タンク', kana: 'ばな', name: 'ばな' },
    { id: 'u5', rarity: 'R', role: 'タンク', kana: 'きむら', name: 'きむら' },
    { id: 'u1', rarity: 'R', role: 'タンク', kana: 'かぐら', name: 'かぐら' },
    { id: 'u6', rarity: 'R', role: 'タンク', kana: 'キャ', name: 'キャ' },
    { id: 'u3', rarity: 'R', role: 'タンク', kana: 'はな', name: 'はな' }
  ];
  const edgeSorted = StateStore.sortUnits(edgeUnits);
  assert.deepEqual(toHost(edgeSorted.map((u) => u.kana)), ['かぐら', 'きむら', 'キャ', 'はな', 'ばな', 'ぱな']);
});

test('A9. Static compliance audit across source files (no ellipsis, no inline style/script, no R5 prohibited words)', () => {
  const files = collectFilesRecursive(PROJECT_ROOT, new Set(['tests', 'docs']));
  const forbiddenWordRegex = /(?<![a-zA-Z0-9_])Lv(?![a-zA-Z0-9_])|レベル|陣形|デイリー|ウィークリー|マンスリー|実績|(?<![a-zA-Z0-9_])PvP(?![a-zA-Z0-9_])/i;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.html', '.css', '.js', '.svg', '.webmanifest', '.json'].includes(ext)) {
      continue;
    }
    const base = path.basename(filePath);
    const text = fs.readFileSync(filePath, 'utf8');

    assert.equal(/ellipsis/i.test(text), false, `Found ellipsis in ${base}`);
    assert.equal(/unsafe-inline|unsafe-eval/i.test(text), false, `Found unsafe CSP keyword in ${base}`);

    if (ext === '.html') {
      assert.equal(/<style\b/i.test(text), false, `Found <style> in ${base}`);
      assert.equal(/\sstyle\s*=/i.test(text), false, `Found inline style attr in ${base}`);
      assert.equal(/\son[a-z]+\s*=/i.test(text), false, `Found inline event attr in ${base}`);
      assert.equal(/rel\s*=\s*["']manifest["']/i.test(text), false, `Static manifest link must not be in ${base}`);
    }

    if (ext === '.js') {
      assert.equal(/innerHTML/i.test(text), false, `Found innerHTML in ${base}`);
      assert.equal(/setAttribute\(\s*['"]style['"]/i.test(text), false, `Found setAttribute('style') in ${base}`);
    }

    if (base !== 'save-security.js') {
      assert.equal(forbiddenWordRegex.test(text), false, `Found R5 prohibited term in ${base}`);
    } else {
      // In save-security.js, allow only the FORBIDDEN_KEYS detector definition lines
      const lines = text.split(/\r?\n/);
      for (let idx = 0; idx < lines.length; idx += 1) {
        const ln = lines[idx];
        if (idx >= 7 && idx <= 20) {
          continue;
        }
        assert.equal(forbiddenWordRegex.test(ln), false, `Found R5 prohibited term in save-security.js:${idx + 1}`);
      }
    }
  }
});

test('A10. SaveSecurity validateSchema enforces prototype-key, allowlist, and cross-entity invariants', async () => {
  const ctx = loadIkaiContext({ secure: true });
  const { SaveSecurity, StateStore } = ctx.IkaiApp;

  const makeValid = () => StateStore.createInitialState();

  // Baseline initial state passes strict validation and round-trips through sign/verify
  const baseline = makeValid();
  assert.equal(SaveSecurity.validateSchema(baseline).ok, true);
  const signedBaseline = await SaveSecurity.signState(baseline);
  const verifiedBaseline = await SaveSecurity.verifyAndParse(JSON.stringify(signedBaseline));
  assert.equal(verifiedBaseline.ok, true);

  const rejectCases = [
    // 1. __proto__ own property via JSON.parse and constructor/prototype keys
    (s) => { s.progress.raidCleared = JSON.parse('{"__proto__":{"isAdmin":true}}'); },
    (s) => { s.progress.raidCleared = JSON.parse('{"constructor":{"x":1}}'); },
    (s) => { s.synthesisPity = JSON.parse('{"prototype":1}'); },
    // 2. Object.prototype keys in dictionary lookups
    (s) => { s.equips[0].equipId = 'toString'; },
    (s) => { s.roster.constructor = StateStore.createInitialState().roster.char_todo_seiichi; },
    (s) => { s.skillInventory.valueOf = { ownedCount: 1, rank: 1, uses: 0 }; },
    (s) => { s.progress.clearedStages = ['hasOwnProperty']; },
    (s) => { s.synthesisPity = { toString: 1 }; },
    // 3. Unknown extra keys on nested objects
    (s) => { s.currencies.extraEvil = 1; },
    (s) => { s.equips[0].extraEvil = true; },
    (s) => { s.roster.char_todo_seiichi.extraEvil = 1; },
    (s) => { s.roster.char_todo_seiichi.equipped.extraEvil = null; },
    (s) => { s.roster.char_todo_seiichi.tactic.extraEvil = 1; },
    (s) => { s.skillInventory.sk_r_kiriharai.extraEvil = 1; },
    (s) => { s.progress.extraEvil = 1; },
    (s) => { s.summon.extraEvil = 1; },
    (s) => { s.settings.extraEvil = 1; },
    // 4. raidCleared and synthesisPity strict validation
    (s) => { s.progress.raidCleared = { fake_boss: { easy: true } }; },
    (s) => { s.progress.raidCleared = { raid_zerogo: { nightmare: true } }; },
    (s) => { s.progress.raidCleared = { raid_zerogo: { easy: 'yes' } }; },
    (s) => { s.synthesisPity = { fake_equip_id: 2 }; },
    (s) => { s.synthesisPity = { 'eq_teppeki_main:9': 1 }; },
    // 5. Duplicate equip UID across chars / slots
    (s) => {
      s.roster.char_todo_seiichi.equipped['主器'] = 'eq_init_1';
      s.roster.char_kobayashi_shohei.equipped['主器'] = 'eq_init_1';
    },
    (s) => {
      s.roster.char_todo_seiichi.equipped['主器'] = 'eq_init_1';
      s.roster.char_todo_seiichi.equipped['護符'] = 'eq_init_1';
    },
    // 6. Wrong equip slot
    (s) => { s.roster.char_todo_seiichi.equipped['主器'] = 'eq_init_2'; },
    // 7. Unawakened equip slots & skill slots & emblem layers
    (s) => {
      s.equips.push({ uid: 'eq_acc_1', equipId: 'eq_teppeki_accessory', qualityIdx: 0, locked: false });
      s.roster.char_todo_seiichi.equipped['装具'] = 'eq_acc_1';
    },
    (s) => {
      s.equips.push({ uid: 'eq_seal_1', equipId: 'eq_teppeki_seal', qualityIdx: 0, locked: false });
      s.roster.char_todo_seiichi.awakening = 2;
      s.roster.char_todo_seiichi.equipped['印章'] = 'eq_seal_1';
    },
    (s) => { s.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', 'sk_r_oukyu']; },
    (s) => { s.roster.char_todo_seiichi.emblemNodes = [5]; },
    (s) => {
      s.roster.char_todo_seiichi.awakening = 2;
      s.roster.char_todo_seiichi.emblemNodes = [5, 6, 9];
    },
    // 8. Unowned or duplicate skills
    (s) => { s.roster.char_todo_seiichi.skills = ['sk_ssr_hoshiochi', null]; },
    (s) => {
      s.skillInventory.sk_r_kiriharai.ownedCount = 0;
      s.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', null];
    },
    (s) => {
      s.roster.char_todo_seiichi.awakening = 1;
      s.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', 'sk_r_kiriharai'];
    },
    // 9. Duplicate progress arrays
    (s) => { s.progress.clearedStages = ['1-1', '1-1']; },
    (s) => { s.progress.trialsCleared = ['trial_1', 'trial_1']; },
    // 10. Expedition constraints (party overlap, resonance overlap, maxChars, requiredBattles, battlesDone)
    (s) => {
      s.expeditions = [{
        zoneId: 'exp_1', charIds: ['char_todo_seiichi'], battlesDone: 1, requiredBattles: 3, claimed: false
      }];
    },
    (s) => {
      s.resonanceSlots = ['char_watanabe_aoi', null, null, null];
      s.expeditions = [{
        zoneId: 'exp_1', charIds: ['char_watanabe_aoi'], battlesDone: 1, requiredBattles: 3, claimed: false
      }];
    },
    (s) => {
      s.expeditions = [{
        zoneId: 'exp_1', charIds: ['char_watanabe_aoi'], battlesDone: 1, requiredBattles: 1, claimed: false
      }];
    },
    (s) => {
      s.expeditions = [{
        zoneId: 'exp_1', charIds: ['char_watanabe_aoi'], battlesDone: 4, requiredBattles: 3, claimed: false
      }];
    },
    (s) => {
      s.roster.char_amano_sota = StateStore.createInitialState().roster.char_todo_seiichi;
      s.roster.char_kuroda_chihiro = StateStore.createInitialState().roster.char_todo_seiichi;
      s.expeditions = [{
        zoneId: 'exp_1',
        charIds: ['char_watanabe_aoi', 'char_amano_sota', 'char_kuroda_chihiro'],
        battlesDone: 0,
        requiredBattles: 3,
        claimed: false
      }];
    },
    (s) => {
      s.expeditions = [{
        zoneId: 'exp_1', charIds: ['char_watanabe_aoi'], battlesDone: 0, requiredBattles: 3, claimed: false, extraEvil: 1
      }];
    }
  ];

  for (let i = 0; i < rejectCases.length; i += 1) {
    const s = makeValid();
    rejectCases[i](s);
    const res = SaveSecurity.validateSchema(s);
    assert.equal(res.ok, false, `Expected rejectCases[${i}] to fail, got ok=true`);
  }

  // Valid rich state (awakening 3, all 4 slots, 2 skills, layer 3 emblem, raidCleared, synthesisPity, expedition)
  const rich = makeValid();
  rich.equips.push(
    { uid: 'eq_acc_ok', equipId: 'eq_teppeki_accessory', qualityIdx: 2, locked: true },
    { uid: 'eq_seal_ok', equipId: 'eq_teppeki_seal', qualityIdx: 4, locked: true }
  );
  rich.roster.char_todo_seiichi.awakening = 3;
  rich.roster.char_todo_seiichi.emblemNodes = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  rich.roster.char_todo_seiichi.equipped = {
    '主器': 'eq_init_1',
    '護符': 'eq_init_2',
    '装具': 'eq_acc_ok',
    '印章': 'eq_seal_ok'
  };
  rich.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', 'sk_r_kessoku'];
  rich.synthesisPity = { eq_teppeki_main: 2, 'eq_teppeki_amulet:1': 3 };
  rich.progress.clearedStages = ['1-1', '1-2'];
  rich.progress.raidCleared = { raid_zerogo: { easy: true, deep: 2 } };
  rich.progress.trialsCleared = ['trial_1'];
  rich.expeditions = [{
    zoneId: 'exp_1',
    charIds: ['char_watanabe_aoi'],
    battlesDone: 2,
    requiredBattles: 3,
    claimed: false
  }];
  assert.equal(SaveSecurity.validateSchema(rich).ok, true);
});

test('A11. MasterData.validateTrialParty rejects duplicate characters', () => {
  const ctx = loadIkaiContext();
  const { MasterData } = ctx.IkaiApp;
  const rDealer = MasterData.CHARACTER_MAP.char_kobayashi_shohei;
  const rHealer = MasterData.CHARACTER_MAP.char_nakamura_yui;

  const dupRes5 = MasterData.validateTrialParty('trial_5', [rDealer, rDealer]);
  assert.equal(dupRes5.ok, false);
  assert.ok(dupRes5.reasons.some((r) => r.includes('重複')));

  const dupRes1 = MasterData.validateTrialParty('trial_1', [rDealer, rDealer]);
  assert.equal(dupRes1.ok, false);

  assert.equal(MasterData.validateTrialParty('trial_5', [rDealer, rHealer]).ok, true);
});

test('A12. StateStore.sortUnits normalizes NFD dakuten / small ka-ke and serializes saveNow()', async () => {
  const storage = new Map();
  let signCallIdx = 0;
  const delayedCrypto = {
    subtle: {
      importKey: async (fmt, keyBytes, alg, extractable, usages) => (
        crypto.webcrypto.subtle.importKey(fmt, keyBytes, alg, extractable, usages)
      ),
      sign: async (alg, key, data) => {
        signCallIdx += 1;
        const delayMs = signCallIdx === 1 ? 60 : 5;
        await new Promise((r) => setTimeout(r, delayMs));
        return crypto.webcrypto.subtle.sign(alg, key, data);
      }
    }
  };
  const ctx = {
    console,
    TextEncoder,
    TextDecoder,
    structuredClone,
    Uint8Array,
    Uint32Array,
    isSecureContext: true,
    crypto: delayedCrypto,
    location: { protocol: 'https:', hostname: 'localhost' },
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
  for (const file of ['namespace.js', 'master-data.js', 'save-security.js', 'state-store.js']) {
    vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), 'utf8'), ctx, { filename: file });
  }

  const { StateStore, SaveSecurity } = ctx.IkaiApp;

  // NFD combining dakuten & small ヶ/ヵ normalization
  const kanaUnits = [
    { id: 'u_kau', rarity: 'R', role: 'ヒーラー', kana: 'かう', name: 'かう' },
    { id: 'u_nfd', rarity: 'R', role: 'ヒーラー', kana: '\u304b\u3099\u3042', name: 'NFDがあ' },
    { id: 'u_koa', rarity: 'R', role: 'ヒーラー', kana: 'こあ', name: 'こあ' },
    { id: 'u_ke_small', rarity: 'R', role: 'ヒーラー', kana: 'ヶ所', name: 'ヶ所' },
    { id: 'u_ka_small', rarity: 'R', role: 'ヒーラー', kana: 'ヵ月', name: 'ヵ月' }
  ];
  const sortedKana = StateStore.sortUnits(kanaUnits);
  assert.deepEqual(
    toHost(sortedKana.map((u) => u.id)),
    ['u_nfd', 'u_kau', 'u_ka_small', 'u_ke_small', 'u_koa']
  );

  // Serialized saveNow(): slower 1st save must never overwrite faster 2nd save
  StateStore.update((d) => { d.currencies.echoStones = 2001; }, { persist: false });
  const p1 = StateStore.saveNow();
  StateStore.update((d) => { d.currencies.echoStones = 3002; }, { persist: false });
  const p2 = StateStore.saveNow();

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);

  const parsed = await SaveSecurity.verifyAndParse(storage.get(StateStore.STORAGE_KEY));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.state.currencies.echoStones, 3002);
});

// =========================================================================
// Part B: Headless Chrome CDP 390x844 Verification (file:// & http://127.0.0.1)
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
    if (relPath === '/') {
      relPath = '/index.html';
    }
    const targetPath = path.resolve(rootDir, '.' + relPath);
    if (!targetPath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(targetPath) });
    fs.createReadStream(targetPath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
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
    const timeout = setTimeout(() => {
      reject(new Error('Chrome DevTools startup timeout. stderr: ' + stderrBuf));
    }, 15000);

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString('utf8');
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\r\n]+)/);
      if (m) {
        clearTimeout(timeout);
        resolve(m[1].trim());
      }
    });

    proc.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited prematurely with code ${code}: ${stderrBuf}`));
    });
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
          if (msg.error) {
            entry.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            entry.resolve(msg.result);
          }
        }
      } else if (msg.method) {
        const set = listeners.get(msg.method);
        if (set) {
          for (const fn of set) {
            fn(msg.params);
          }
        }
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
        if (!listeners.has(method)) {
          listeners.set(method, new Set());
        }
        listeners.get(method).add(fn);
      },
      close() {
        try { ws.close(); } catch (_) {}
      }
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
  const page = makeSender(pageWs);

  return { browser, page };
}

async function runBrowserSuiteForUrl(targetUrl, modeLabel) {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), `ikai_cdp_${modeLabel}_`));
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
    page.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') {
        consoleErrors.push(p);
      }
    });
    page.on('Log.entryAdded', (p) => {
      if (p.entry && (p.entry.level === 'error' || p.entry.level === 'warning')) {
        logIssues.push(p.entry);
      }
    });
    page.on('Network.loadingFailed', (p) => networkFailures.push(p));
    page.on('Network.responseReceived', (p) => {
      if (p.response && p.response.status >= 400) {
        httpErrors.push({ url: p.response.url, status: p.response.status });
      }
    });

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
          window.__cspViolations.push({
            violatedDirective: ev.violatedDirective,
            blockedURI: ev.blockedURI
          });
        });
      `
    });

    const loadDone = new Promise((resolve) => {
      page.on('Page.loadEventFired', resolve);
    });
    await page.send('Page.navigate', { url: targetUrl });
    await loadDone;

    // Wait until App.boot() completes
    const evalJson = async (expr) => {
      const res = await page.send('Runtime.evaluate', {
        expression: expr,
        awaitPromise: true,
        returnByValue: true
      });
      if (res.exceptionDetails) {
        throw new Error('Evaluation failed: ' + JSON.stringify(res.exceptionDetails));
      }
      return res.result.value;
    };

    for (let i = 0; i < 40; i += 1) {
      const booted = await evalJson('Boolean(window.IkaiApp && window.IkaiApp.App && window.IkaiApp.App.getUiState().booted)');
      if (booted) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    // Wait briefly for SW registration on HTTP
    if (modeLabel === 'http') {
      for (let i = 0; i < 40; i += 1) {
        const hasSw = await evalJson('(async () => Boolean(await navigator.serviceWorker.getRegistration()))()');
        if (hasSw) break;
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    // 1. Layout, 50%/50% separation, ellipsis, R5, CSP checks
    const domAudit = await evalJson(`(() => {
      const upper = document.getElementById('upper-stage');
      const lower = document.getElementById('lower-deck');
      const upperRect = upper.getBoundingClientRect();
      const lowerRect = lower.getBoundingClientRect();
      const upperStyle = getComputedStyle(upper);
      const bodyStyle = getComputedStyle(document.body);

      const interactiveSel = 'button, a, input, select, textarea, [tabindex], [role="button"]';
      const upperInteractive = upper.querySelectorAll(interactiveSel).length;
      const allInteractive = Array.from(document.querySelectorAll(interactiveSel));
      const leakedUpperRects = allInteractive.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top < 421.5;
      }).length;

      const upperScrollable = Array.from(upper.querySelectorAll('*')).filter((el) => {
        const oy = getComputedStyle(el).overflowY;
        return oy === 'auto' || oy === 'scroll';
      }).length;

      const allEls = Array.from(document.querySelectorAll('*'));
      const ellipsisEls = allEls.filter((el) => getComputedStyle(el).textOverflow === 'ellipsis').length;

      const unitNames = Array.from(document.querySelectorAll('.unit-name'));
      const truncatedNames = unitNames.filter((el) => {
        const txt = el.textContent || '';
        return el.scrollWidth > el.clientWidth + 1 || txt.includes('...') || txt.includes('・・・');
      }).map((el) => el.textContent);

      const rosterOrder = Array.from(document.querySelectorAll('#lower-deck .roster-row .unit-name')).map((el) => el.textContent);
      const expectedOrder = window.IkaiApp.StateStore.sortUnits(window.IkaiApp.MasterData.CHARACTERS).map((c) => c.name);

      return {
        bodyBg: bodyStyle.backgroundColor,
        upperRect: { top: upperRect.top, bottom: upperRect.bottom },
        lowerRect: { top: lowerRect.top, bottom: lowerRect.bottom },
        upperPointerEvents: upperStyle.pointerEvents,
        upperOverflow: upperStyle.overflow,
        upperInteractive,
        leakedUpperRects,
        upperScrollable,
        rootScrollHeight: document.documentElement.scrollHeight,
        rootScrollWidth: document.documentElement.scrollWidth,
        ellipsisEls,
        unitNameCount: unitNames.length,
        truncatedNames,
        rosterMatchesSort: JSON.stringify(rosterOrder) === JSON.stringify(expectedOrder),
        bodyText: document.body.innerText,
        cspViolations: window.__cspViolations,
        isFileEnv: window.IkaiApp.Env.isFile()
      };
    })()`);

    assert.equal(domAudit.bodyBg, 'rgb(9, 12, 18)');
    assert.equal(domAudit.upperRect.top, 0);
    assert.ok(domAudit.upperRect.bottom <= 422.5);
    assert.ok(domAudit.lowerRect.top >= 421.5);
    assert.ok(domAudit.lowerRect.bottom <= 844.5);
    assert.equal(domAudit.upperPointerEvents, 'none');
    assert.equal(domAudit.upperOverflow, 'hidden');
    assert.equal(domAudit.upperInteractive, 0);
    assert.equal(domAudit.leakedUpperRects, 0);
    assert.equal(domAudit.upperScrollable, 0);
    assert.ok(domAudit.rootScrollHeight <= 844);
    assert.ok(domAudit.rootScrollWidth <= 390);
    assert.equal(domAudit.ellipsisEls, 0);
    assert.ok(domAudit.unitNameCount >= 20);
    assert.deepEqual(domAudit.truncatedNames, []);
    assert.equal(domAudit.rosterMatchesSort, true);
    assert.deepEqual(domAudit.cspViolations, []);

    const r5Forbidden = /\bLv\b|レベル|陣形|デイリー|ウィークリー|マンスリー|実績|\bPvP\b/i;
    const techJargonForbidden = /Web Audio API|プロシージャル合成|スキーマ版|ikai-zankyo-save/;
    assert.equal(r5Forbidden.test(domAudit.bodyText), false);
    assert.equal(techJargonForbidden.test(domAudit.bodyText), false);

    // 2. 4-tab smoke test + owned roster auto-selection + tampered backup rejection
    const tabResults = [];
    for (const tabId of ['areas', 'audio_icons', 'records', 'roster']) {
      const upperSnapshot = await evalJson(`(() => {
        const btn = document.querySelector('.lower-tabs .tab-btn[data-tab-id="${tabId}"]');
        btn.click();
        return {
          activeTab: window.IkaiApp.App.getUiState().activeTab,
          upperText: document.getElementById('upper-stage').innerText,
          bodyText: document.body.innerText
        };
      })()`);
      assert.equal(upperSnapshot.activeTab, tabId);
      assert.equal(r5Forbidden.test(upperSnapshot.bodyText), false);
      assert.equal(techJargonForbidden.test(upperSnapshot.bodyText), false);
      tabResults.push(upperSnapshot.upperText);
    }
    // Ensure upper stage changes across tabs
    assert.notEqual(tabResults[0], tabResults[1]);
    assert.notEqual(tabResults[1], tabResults[2]);

    // Toggling filter-roster to 'owned' when an unowned char is selected auto-selects first owned char
    const ownedFilterCheck = await evalJson(`(() => {
      document.querySelector('[data-action="filter-roster"][data-filter="owned"]').click();
      const selectedAfterOwned = window.IkaiApp.App.getUiState().selectedCharId;
      const upperCharName = document.querySelector('#upper-stage .unit-name').textContent;
      const isOwnedSelected = Boolean(window.IkaiApp.StateStore.getState().roster[selectedAfterOwned]);
      document.querySelector('[data-action="filter-roster"][data-filter="all"]').click();
      return { selectedAfterOwned, upperCharName, isOwnedSelected };
    })()`);
    assert.equal(ownedFilterCheck.isOwnedSelected, true);
    assert.equal(ownedFilterCheck.selectedAfterOwned, 'char_todo_seiichi');
    assert.equal(ownedFilterCheck.upperCharName, '藤堂 誠一');

    // 3. Export backup & test tampered JSON rejection in 記録管理 tab
    const tamperResult = await evalJson(`(async () => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="records"]').click();
      document.querySelector('[data-action="export-backup"]').click();
      for (let i = 0; i < 30; i++) {
        const ta = document.getElementById('backup-json-input');
        if (ta && ta.value.includes('ikai-zankyo-save')) break;
        await new Promise((r) => setTimeout(r, 30));
      }
      const ta = document.getElementById('backup-json-input');
      const obj = JSON.parse(ta.value);
      obj.payload.currencies.echoStones = 99999;
      ta.value = JSON.stringify(obj);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-action="import-backup"]').click();
      for (let i = 0; i < 30; i++) {
        const errBanner = document.querySelector('.notice-banner.is-error');
        if (errBanner) break;
        await new Promise((r) => setTimeout(r, 30));
      }
      const errBanner = document.querySelector('.notice-banner.is-error');
      return {
        errorText: errBanner ? errBanner.textContent : '',
        echoStonesAfter: window.IkaiApp.StateStore.getState().currencies.echoStones
      };
    })()`);
    assert.ok(tamperResult.errorText.includes('復元拒否'));
    assert.equal(tamperResult.echoStonesAfter, 1500);

    // 4. Environment-specific check (SW on http, isFile on file)
    if (modeLabel === 'http') {
      const swReg = await evalJson('(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? r.scope : null; })()');
      assert.ok(swReg);
    } else {
      assert.equal(domAudit.isFileEnv, true);
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
        const t = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch (_) {}
          resolve();
        }, 3000);
        proc.once('exit', () => {
          clearTimeout(t);
          resolve();
        });
      });
    }
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 });
  }
}

test('B1. Headless Chrome 390x844 verification on file://', async () => {
  assert.equal(fs.existsSync(CHROME_PATH), true, `Chrome not found at ${CHROME_PATH}`);
  const fileUrl = pathToFileURL(path.join(PROJECT_ROOT, 'index.html')).href;
  await runBrowserSuiteForUrl(fileUrl, 'file');
});

test('B2. Headless Chrome 390x844 verification on http://127.0.0.1 with Service Worker', async () => {
  assert.equal(fs.existsSync(CHROME_PATH), true, `Chrome not found at ${CHROME_PATH}`);
  const { server, port } = await startStaticServer(PROJECT_ROOT);
  try {
    await runBrowserSuiteForUrl(`http://127.0.0.1:${port}/index.html`, 'http');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
