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

function loadCombatContext({ secure = false, storage = new Map(), protocol = 'file:' } = {}) {
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
  for (const file of ['namespace.js', 'master-data.js', 'save-security.js', 'state-store.js', 'combat-engine.js']) {
    const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    vm.runInContext(code, ctx, { filename: file });
  }
  return ctx;
}

function toHost(val) {
  return JSON.parse(JSON.stringify(val));
}

// =========================================================================
// Part A: Node Deterministic Combat Engine Verification
// =========================================================================

test('A1. CombatEngine produces identical deterministic outcomes with same seed and supports 1-arg & 2-arg APIs', () => {
  const ctx1 = loadCombatContext();
  const ctx2 = loadCombatContext();

  const CE1 = ctx1.IkaiApp.CombatEngine;
  const CE2 = ctx2.IkaiApp.CombatEngine;

  const b1 = CE1.createBattle({ mode: 'stage', stageId: '1-1', seed: 424242, speed: 2 });
  const b2 = CE2.createBattle({ mode: 'stage', stageId: '1-1', seed: 424242, speed: 2 });

  let snap1 = CE1.getSnapshot(b1);
  let snap2 = CE2.getSnapshot(); // 1-arg / active battle form
  assert.equal(snap1.allies.length, 4);
  assert.equal(snap1.timeline.length, 8);

  // Check timeline projection is non-mutating
  const snap1After = CE1.getSnapshot(b1);
  assert.deepEqual(toHost(snap1After.allies.map((a) => a.gauge)), toHost(snap1.allies.map((a) => a.gauge)));

  let guard = 0;
  while (snap1.status === 'ongoing' && guard < 300) {
    guard += 1;
    snap1 = CE1.step(b1, 200); // 2-arg form
    snap2 = CE2.step(200);     // 1-arg active form
  }

  assert.equal(snap1.status, 'victory');
  assert.equal(snap2.status, 'victory');
  assert.equal(snap1.turnCount, snap2.turnCount);
  assert.deepEqual(toHost(snap1.dpsMeters), toHost(snap2.dpsMeters));

  // Verify 4-metric sum consistency
  const sumDealt = snap1.dpsMeters.byUnit.reduce((acc, u) => acc + u.damageDealt, 0);
  const sumTaken = snap1.dpsMeters.byUnit.reduce((acc, u) => acc + u.damageTaken, 0);
  const sumHeal = snap1.dpsMeters.byUnit.reduce((acc, u) => acc + u.healingDone, 0);
  const sumHealed = snap1.dpsMeters.byUnit.reduce((acc, u) => acc + u.healingReceived, 0);
  assert.equal(snap1.dpsMeters.totals.damageDealt, sumDealt);
  assert.equal(snap1.dpsMeters.totals.damageTaken, sumTaken);
  assert.equal(snap1.dpsMeters.totals.healingDone, sumHeal);
  assert.equal(snap1.dpsMeters.totals.healingReceived, sumHealed);
  assert.ok(sumDealt > 0);
  assert.ok(sumTaken > 0);
});

test('A2. Stage 1-3 & 1-6 bosses activate telegraph state machine and Stage 1-6 completes 5 waves', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;

  // Give party slight awakening/equip boost via custom state so 1-3 and 1-6 clear reliably
  const state = ctx.IkaiApp.StateStore.createInitialState();
  for (const cid of state.party) {
    state.roster[cid].awakening = 1;
  }

  const b13 = CE.createBattle({ mode: 'stage', stageId: '1-3', state, seed: 13013, speed: 3 });
  let snap = CE.getSnapshot(b13);
  let sawBossWave = false;
  let sawTelegraph = false;

  for (let i = 0; i < 400 && snap.status === 'ongoing'; i += 1) {
    snap = CE.step(b13, 150);
    if (snap.waveIndex === 4) {
      sawBossWave = true;
      assert.equal(snap.isBossWave, true);
      if (snap.bossTelegraph !== null) {
        sawTelegraph = true;
      }
    }
  }
  assert.equal(sawBossWave, true);
  assert.equal(sawTelegraph, true);
  assert.equal(snap.status, 'victory');

  // Stage 1-6 area boss
  const b16 = CE.createBattle({ mode: 'stage', stageId: '1-6', state, seed: 16016, speed: 3 });
  let snap16 = CE.getSnapshot(b16);
  let sawAreaBossTelegraph = false;
  for (let i = 0; i < 500 && snap16.status === 'ongoing'; i += 1) {
    snap16 = CE.step(b16, 150);
    if (snap16.waveIndex === 4 && snap16.bossTelegraph !== null) {
      sawAreaBossTelegraph = true;
    }
  }
  assert.equal(sawAreaBossTelegraph, true);
  assert.equal(snap16.status, 'victory');
});

test('A3. Raid bosses, Abyss floors, and Trial 2-char battles initialize and run cleanly', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;

  for (const diff of ['easy', 'deep', 'extreme']) {
    const rb = CE.createBattle({ mode: 'raid', raidId: 'raid_zerogo', difficultyId: diff, seed: 777 });
    const s0 = CE.getSnapshot(rb);
    assert.equal(s0.enemies.length, 1);
    assert.equal(s0.enemies[0].isBoss, true);
    const s1 = CE.step(rb, 2500);
    assert.ok(s1.turnCount >= 1);
  }

  const ab = CE.createBattle({ mode: 'abyss', floor: 5, seed: 555 });
  assert.equal(CE.getSnapshot(ab).isBossWave, true);
  assert.ok(CE.step(ab, 2500).turnCount >= 1);

  const tr = CE.createBattle({
    mode: 'trial',
    trialId: 'trial_5',
    partyIds: ['char_kobayashi_shohei', 'char_nakamura_yui'],
    seed: 999
  });
  assert.equal(CE.getSnapshot(tr).allies.length, 2);
  assert.ok(CE.step(tr, 2500).turnCount >= 1);
});

test('A4. Mid-battle interventions, M3 hooks, stun recovery, and edge-case loop guards work cleanly', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;
  const state = ctx.IkaiApp.StateStore.createInitialState();

  // Apply M3 hooks: awakening, equips + 4-set, emblem nodes 1..12, resonance slot, mastery rank 5
  state.roster.char_todo_seiichi.awakening = 3;
  state.roster.char_todo_seiichi.emblemNodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  state.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', 'sk_r_shogekiha'];
  state.skillInventory.sk_r_kiriharai.rank = 5;
  state.resonanceSlots[0] = 'char_watanabe_aoi';

  const battle = CE.createBattle({ mode: 'stage', stageId: '1-3', state, seed: 10101 });
  const initialSnap = CE.getSnapshot(battle);
  assert.ok(initialSnap.allies[0].maxHp > 3500); // awakening + emblems + resonance applied
  assert.equal(initialSnap.allies[0].collectSkills.length, 2);
  assert.equal(initialSnap.allies[0].collectSkills[0].cooldown, 1); // Mastery rank 5 cdReduction

  // Test interventions (1-arg and 2-arg)
  assert.equal(CE.setGlobalTactic(battle, 'aggressive'), true);
  assert.equal(CE.setTargetPriority('boss_first'), true);
  assert.equal(CE.setTactic('char_todo_seiichi', { policy: 'defensive' }), true);
  assert.equal(CE.reserveSkill('char_kobayashi_shohei', 'unique'), true);
  assert.equal(CE.setSpeed(3), 3);
  assert.equal(CE.setAutoRepeat(true), 10);

  const afterCtrl = CE.getSnapshot(battle);
  assert.equal(afterCtrl.globalTactic, 'aggressive');
  assert.equal(afterCtrl.globalTargetPolicy, 'boss_first');
  assert.equal(afterCtrl.allies[0].tactic.policy, 'defensive');
  assert.equal(afterCtrl.allies[1].reservedSkillId, 'unique');
  assert.equal(afterCtrl.speed, 3);
  assert.equal(afterCtrl.autoRepeat, 10);

  // Edge cases: negative/NaN/zero dtMs must not mutate or throw
  const sZero = CE.step(battle, 0);
  const sNeg = CE.step(battle, -100);
  const sNaN = CE.step(battle, Number.NaN);
  assert.equal(sZero.turnCount, afterCtrl.turnCount);
  assert.equal(sNeg.turnCount, afterCtrl.turnCount);
  assert.equal(sNaN.turnCount, afterCtrl.turnCount);

  // Stun recovery + boss telegraph pause
  battle.allies[0].debuffs.push({ stat: 'stun', value: 1, duration: 1 });
  for (let i = 0; i < 40; i += 1) {
    CE.step(battle, 100);
  }
  const postStun = CE.getSnapshot(battle);
  assert.equal(postStun.allies[0].debuffs.some((d) => d.stat === 'stun'), false);
});

test('A5. Self-applied 1T taunt (Murakami Kenta) persists after his turn and redirects the next enemy attack', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;
  const state = ctx.IkaiApp.StateStore.createInitialState();
  state.roster.char_murakami_kenta = {
    awakening: 0,
    shards: 0,
    emblemNodes: [],
    equipped: { '主器': null, '護符': null, '装具': null, '印章': null },
    skills: [null, null],
    tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'unique_first' }
  };

  const battle = CE.createBattle({
    mode: 'stage',
    stageId: '1-1',
    state,
    partyIds: ['char_murakami_kenta', 'char_kobayashi_shohei'],
    seed: 5151
  });

  // Make Shohei critically low HP so enemy lowest_hp AI would target Shohei without taunt
  battle.allies[0].gauge = 100;
  battle.allies[1].gauge = 0;
  battle.allies[1].hp = Math.max(1, Math.round(battle.allies[1].maxHp * 0.1));
  battle.enemies.forEach((e, idx) => {
    e.gauge = idx === 0 ? 96 : 0;
  });

  // Step just enough for Kenta to execute his turn
  const snapAfterKenta = CE.step(battle, 1);
  const kentaAfterTurn = snapAfterKenta.allies[0];
  assert.ok(snapAfterKenta.logs.some((l) => l.includes('踏み込み盾撃')));
  assert.deepEqual(
    toHost(kentaAfterTurn.buffs.filter((b) => b.stat === 'taunt')),
    [{ stat: 'taunt', value: 1, duration: 1 }]
  );
  assert.equal(kentaAfterTurn.uniqueSkill.currentCd, 2);

  // Advance until first enemy acts; damage event must target Kenta due to taunt
  let enemyAttackEvents = [];
  for (let i = 0; i < 20; i += 1) {
    const s = CE.step(battle, 50);
    const hits = s.events.filter((ev) => ev.type === 'damage' && ev.targetSide === 'ally');
    if (hits.length > 0) {
      enemyAttackEvents = hits;
      break;
    }
  }
  assert.ok(enemyAttackEvents.length > 0);
  assert.ok(enemyAttackEvents.every((ev) => ev.targetId === 'char_murakami_kenta'));
});

test('A6. Self-applied heal trait dmgDown (1T) and regen (2T) remain on Shiraishi Sumika after her turn', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;
  const state = ctx.IkaiApp.StateStore.createInitialState();
  state.roster.char_shiraishi_sumika = {
    awakening: 0,
    shards: 0,
    emblemNodes: [],
    equipped: { '主器': null, '護符': null, '装具': null, '印章': null },
    skills: [null, null],
    tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'unique_first' }
  };

  const battle = CE.createBattle({
    mode: 'stage',
    stageId: '1-1',
    state,
    partyIds: ['char_shiraishi_sumika', 'char_todo_seiichi'],
    seed: 6262
  });

  // Injure both allies so balanced healer triggers unique healing skill
  battle.allies[0].hp = Math.round(battle.allies[0].maxHp * 0.5);
  battle.allies[1].hp = Math.round(battle.allies[1].maxHp * 0.5);
  battle.allies[0].gauge = 100;
  battle.allies[1].gauge = 0;
  battle.enemies.forEach((e) => { e.gauge = 0; });

  const snap = CE.step(battle, 1);
  assert.ok(snap.logs.some((l) => l.includes('清冽の彼岸灯')));

  const sumikaDmgDown = snap.allies[0].buffs.find((b) => b.stat === 'dmgDown');
  const sumikaRegen = snap.allies[0].buffs.find((b) => b.stat === 'regen');
  assert.deepEqual(toHost(sumikaDmgDown), { stat: 'dmgDown', value: 10, duration: 1 });
  assert.deepEqual(toHost(sumikaRegen), { stat: 'regen', value: 10, duration: 2 });

  const allyDmgDown = snap.allies[1].buffs.find((b) => b.stat === 'dmgDown');
  const allyRegen = snap.allies[1].buffs.find((b) => b.stat === 'regen');
  assert.deepEqual(toHost(allyDmgDown), { stat: 'dmgDown', value: 10, duration: 1 });
  assert.deepEqual(toHost(allyRegen), { stat: 'regen', value: 10, duration: 2 });
});

test('A7. Used skill cooldown (CT2 and Rank 5 CT1) is not decremented on the same turn it is used', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;
  const state = ctx.IkaiApp.StateStore.createInitialState();

  state.roster.char_kobayashi_shohei.awakening = 3;
  state.roster.char_kobayashi_shohei.skills = ['sk_r_kiriharai', null];
  state.roster.char_kobayashi_shohei.tactic = { policy: 'aggressive', target: 'lowest_hp', skillPriority: 'collect_first' };
  state.skillInventory.sk_r_kiriharai = { ownedCount: 1, rank: 5, uses: 100 };

  const battle1 = CE.createBattle({
    mode: 'stage',
    stageId: '1-1',
    state,
    partyIds: ['char_kobayashi_shohei'],
    seed: 7373
  });
  assert.equal(battle1.allies[0].collectSkills[0].cooldown, 1);
  battle1.allies[0].gauge = 100;
  battle1.enemies.forEach((e) => { e.gauge = 0; });

  // Turn 1: uses Rank 5 sk_r_kiriharai (cooldown 1) -> must stay currentCd === 1 after turn end
  const snap1 = CE.step(battle1, 1);
  assert.ok(snap1.logs.some((l) => l.includes('斬り払い')));
  assert.equal(snap1.allies[0].collectSkills[0].currentCd, 1);

  // Turn 2: sk_r_kiriharai is still on CD, so uniqueSkill (cooldown 2) runs -> uniqueSkill stays 2, sk_r_kiriharai ticks 1 -> 0
  battle1.allies[0].gauge = 100;
  battle1.enemies.forEach((e) => { e.gauge = 0; });
  const snap2 = CE.step(battle1, 1);
  assert.ok(snap2.logs.some((l) => l.includes('一点突破突き')));
  assert.equal(snap2.allies[0].uniqueSkill.currentCd, 2);
  assert.equal(snap2.allies[0].collectSkills[0].currentCd, 0);
});

test('A8. computePartyAuras respects unlockedSlots at awakening 0 and balanced healer prioritizes healing under collect_first', () => {
  const ctx = loadCombatContext();
  const CE = ctx.IkaiApp.CombatEngine;
  const state = ctx.IkaiApp.StateStore.createInitialState();

  // Equip 4 pieces of set_hoshiyomi onto awakening 0 char_todo_seiichi
  state.equips.push(
    { uid: 'eq_test_h1', equipId: 'eq_hoshiyomi_main', qualityIdx: 0, locked: false },
    { uid: 'eq_test_h2', equipId: 'eq_hoshiyomi_amulet', qualityIdx: 0, locked: false },
    { uid: 'eq_test_h3', equipId: 'eq_hoshiyomi_accessory', qualityIdx: 0, locked: false },
    { uid: 'eq_test_h4', equipId: 'eq_hoshiyomi_seal', qualityIdx: 0, locked: false }
  );
  state.roster.char_todo_seiichi.awakening = 0;
  state.roster.char_todo_seiichi.equipped = {
    '主器': 'eq_test_h1',
    '護符': 'eq_test_h2',
    '装具': 'eq_test_h3',
    '印章': 'eq_test_h4'
  };

  const bAwk0 = CE.createBattle({ mode: 'stage', stageId: '1-1', state, seed: 8484 });
  assert.equal(bAwk0.allies[1].passiveModifiers.dmgDealtPct, 0);

  state.roster.char_todo_seiichi.awakening = 3;
  const bAwk3 = CE.createBattle({ mode: 'stage', stageId: '1-1', state, seed: 8484 });
  assert.equal(bAwk3.allies[1].passiveModifiers.dmgDealtPct, 12);

  // Balanced healer with collect_first and offensive collectible skill prioritizes healing when ally HP < 88%
  state.roster.char_shiraishi_sumika = {
    awakening: 1,
    shards: 0,
    emblemNodes: [],
    equipped: { '主器': null, '護符': null, '装具': null, '印章': null },
    skills: ['sk_r_kiriharai', null],
    tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'collect_first' }
  };
  const bHeal = CE.createBattle({
    mode: 'stage',
    stageId: '1-1',
    state,
    partyIds: ['char_shiraishi_sumika', 'char_kobayashi_shohei'],
    seed: 8585
  });
  bHeal.allies[1].hp = Math.round(bHeal.allies[1].maxHp * 0.5); // 50% < 88%
  bHeal.allies[0].gauge = 100;
  bHeal.allies[1].gauge = 0;
  bHeal.enemies.forEach((e) => { e.gauge = 0; });

  const snapHeal = CE.step(bHeal, 1);
  assert.ok(snapHeal.logs.some((l) => l.includes('清冽の彼岸灯')));
  assert.equal(snapHeal.allies[0].uniqueSkill.currentCd, 3);
  assert.equal(snapHeal.allies[0].collectSkills[0].currentCd, 0);
});

// =========================================================================
// Part B: Headless Chrome CDP 390x844 + iPhone 14 SafeArea Verification
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

async function runBattleE2E(targetUrl, modeLabel) {
  const baseTmp = process.env.IKAI_TMP_DIR || os.tmpdir();
  fs.mkdirSync(baseTmp, { recursive: true });
  const profileDir = fs.mkdtempSync(path.join(baseTmp, `ikai_m2_${modeLabel}_`));
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
      if (p.type === 'error') consoleErrors.push(p);
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

    // Inject iPhone 14 SafeArea insets via CSSOM
    await evalJson(`(() => {
      document.documentElement.style.setProperty('--safe-top', '47px');
      document.documentElement.style.setProperty('--safe-bottom', '34px');
      return true;
    })()`);

    const auditUpperAndLayout = async () => evalJson(`(() => {
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
      const ellipsisEls = Array.from(document.querySelectorAll('*')).filter((el) => getComputedStyle(el).textOverflow === 'ellipsis').length;
      const truncatedNames = Array.from(document.querySelectorAll('.unit-name')).filter((el) => {
        const txt = el.textContent || '';
        return el.scrollWidth > el.clientWidth + 1 || txt.includes('...') || txt.includes('・・・');
      }).map((el) => el.textContent);

      const safeChildrenOverflow = Array.from(upper.children).filter((ch) => {
        const r = ch.getBoundingClientRect();
        return r.bottom > upperRect.bottom + 0.5;
      }).length;

      const battleSections = Array.from(upper.querySelectorAll('.battle-topbar, .turn-timeline, .enemy-field, .ally-grid, .dps-meter-panel'));
      const sectionOverflow = battleSections.filter((s) => {
        const r = s.getBoundingClientRect();
        return r.bottom > upperRect.bottom + 0.5;
      }).map((s) => s.className);

      return {
        mode: window.IkaiApp.App.getUiState().mode,
        upperBottom: upperRect.bottom,
        lowerTop: lowerRect.top,
        upperInteractive,
        leakedUpperRects,
        upperScrollable,
        ellipsisEls,
        truncatedNames,
        safeChildrenOverflow,
        sectionOverflow,
        rootScrollHeight: document.documentElement.scrollHeight,
        rootScrollWidth: document.documentElement.scrollWidth,
        cspViolations: window.__cspViolations
      };
    })()`);

    // 1. Hub: switch to areas tab, select stage 1-1, start battle
    await evalJson(`(() => {
      document.querySelector('.lower-tabs .tab-btn[data-tab-id="areas"]').click();
      document.querySelector('[data-action="select-stage"][data-stage-id="1-1"]').click();
      document.querySelector('[data-action="start-stage"]').click();
      return window.IkaiApp.App.getUiState().mode;
    })()`);

    const battleAudit1 = await auditUpperAndLayout();
    assert.equal(battleAudit1.mode, 'battle');
    assert.equal(battleAudit1.upperInteractive, 0);
    assert.equal(battleAudit1.leakedUpperRects, 0);
    assert.equal(battleAudit1.upperScrollable, 0);
    assert.equal(battleAudit1.ellipsisEls, 0);
    assert.deepEqual(battleAudit1.truncatedNames, []);
    assert.deepEqual(battleAudit1.sectionOverflow, []);
    assert.ok(battleAudit1.rootScrollHeight <= 844);
    assert.ok(battleAudit1.rootScrollWidth <= 390);
    assert.deepEqual(battleAudit1.cspViolations, []);

    // 2. Mid-battle interventions: toggle auto-repeat 0 -> 10 -> 0, speed x3, global policy, target policy, skill reservation, DPS detail toggle
    const ctrlState = await evalJson(`(() => {
      const getRepeatPillText = () => {
        const pills = Array.from(document.querySelectorAll('#upper-stage .battle-meta-pills .battle-pill'));
        return pills[2] ? pills[2].textContent : '';
      };
      const repeatPillBefore = getRepeatPillText();
      document.querySelector('[data-action="toggle-battle-repeat"]').click();
      const repeatPillOn = getRepeatPillText();
      const uiOn = window.IkaiApp.App.getUiState();
      // Toggle back off so Stage 1-1 finishes as a single run
      document.querySelector('[data-action="toggle-battle-repeat"]').click();
      const repeatPillOff = getRepeatPillText();

      document.querySelector('[data-action="battle-speed"][data-speed="3"]').click();
      document.querySelector('[data-action="battle-global-policy"][data-policy="aggressive"]').click();
      document.querySelector('[data-action="battle-global-target"][data-target="boss_first"]').click();
      const resBtns = document.querySelectorAll('[data-action="reserve-skill"]');
      if (resBtns[0]) resBtns[0].click();
      document.querySelector('[data-action="toggle-dps-detail"]').click();

      const snap = window.IkaiApp.App.getBattleSnapshot();
      const dpsLabels = Array.from(document.querySelectorAll('#upper-stage .dps-meter-panel .dps-label')).map((e) => e.textContent);
      const detailVisible = !document.querySelector('.dps-detail-box').classList.contains('is-hidden');
      const reservedVisible = Boolean(document.querySelector('#upper-stage .reserved-tag.is-visible'));
      const timelineCount = document.querySelectorAll('#upper-stage .turn-timeline .timeline-chip').length;
      return {
        repeatPillBefore,
        repeatPillOn,
        repeatDoneOn: uiOn.autoRepeatDone,
        repeatRemainingOn: uiOn.autoRepeatRemaining,
        repeatPillOff,
        speed: snap.speed,
        globalTactic: snap.globalTactic,
        globalTargetPolicy: snap.globalTargetPolicy,
        dpsLabels,
        detailVisible,
        reservedVisible,
        timelineCount
      };
    })()`);

    assert.equal(ctrlState.repeatPillBefore, '単発');
    assert.equal(ctrlState.repeatPillOn, '周回 1/10');
    assert.equal(ctrlState.repeatDoneOn, 1);
    assert.equal(ctrlState.repeatRemainingOn, 10);
    assert.equal(ctrlState.repeatPillOff, '単発');
    assert.equal(ctrlState.speed, 3);
    assert.equal(ctrlState.globalTactic, 'aggressive');
    assert.equal(ctrlState.globalTargetPolicy, 'boss_first');
    assert.deepEqual(ctrlState.dpsLabels, ['与ダメージ', '被ダメージ', '回復量', '被回復量']);
    assert.equal(ctrlState.detailVisible, true);
    assert.equal(ctrlState.reservedVisible, true);
    assert.equal(ctrlState.timelineCount, 8);

    // 3. Wait for Stage 1-1 completion -> mode === 'result'
    let reachedResult = false;
    for (let i = 0; i < 120; i += 1) {
      const m = await evalJson('window.IkaiApp.App.getUiState().mode');
      if (m === 'result') {
        reachedResult = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(reachedResult, true);

    const resultAudit = await auditUpperAndLayout();
    assert.equal(resultAudit.upperInteractive, 0);
    assert.equal(resultAudit.leakedUpperRects, 0);
    assert.equal(resultAudit.upperScrollable, 0);
    assert.equal(resultAudit.ellipsisEls, 0);
    assert.deepEqual(resultAudit.truncatedNames, []);

    const resultContent = await evalJson(`(() => {
      const dpsLabels = Array.from(document.querySelectorAll('#upper-stage .dps-meter-panel .dps-label')).map((e) => e.textContent);
      const dpsVals = Array.from(document.querySelectorAll('#upper-stage .dps-meter-panel .dps-val')).map((e) => Number(e.textContent));
      const detailRows = document.querySelectorAll('#lower-deck .dps-detail-box .dps-table-row').length;
      const totalBattles = window.IkaiApp.StateStore.getState().progress.totalBattles;
      const statusText = document.querySelector('#upper-stage .result-status-title').textContent;
      return { dpsLabels, dpsVals, detailRows, totalBattles, statusText };
    })()`);

    assert.deepEqual(resultContent.dpsLabels, ['与ダメージ', '被ダメージ', '回復量', '被回復量']);
    assert.ok(resultContent.dpsVals[0] > 0);
    assert.equal(resultContent.detailRows, 5); // 1 header + 4 allies
    assert.ok(resultContent.totalBattles >= 1);
    assert.equal(resultContent.statusText, '作戦成功');

    // 4. Return to hub, test Stage 1-3 (mid-boss with minions + telegraph) & Stage 1-6 (area boss)
    await evalJson(`(() => {
      document.querySelector('[data-action="return-hub"]').click();
      return window.IkaiApp.App.getUiState().mode;
    })()`);

    // Launch Stage 1-3 and advance to wave 5 boss wave cleanly via App + CombatEngine
    const bossCheck13 = await evalJson(`(() => {
      window.IkaiApp.App.startStageBattle('1-3', { seed: 30303 });
      const b = window.IkaiApp.CombatEngine.getActiveBattle();
      window.IkaiApp.CombatEngine.setSpeed(b, 3);
      for (let i = 0; i < 200; i += 1) {
        const s = window.IkaiApp.CombatEngine.step(b, 200);
        if (s.waveIndex === 4 && s.bossTelegraph !== null) {
          window.IkaiApp.UIRenderer.patchBattleFrame(
            document.getElementById('upper-stage'),
            document.getElementById('lower-deck'),
            s,
            window.IkaiApp.App.getUiState()
          );
          break;
        }
        if (s.status !== 'ongoing') break;
      }
      const upper = document.getElementById('upper-stage');
      const upperRect = upper.getBoundingClientRect();
      const bossFrame = upper.querySelector('.boss-frame.is-boss');
      const tgBar = upper.querySelector('.boss-telegraph-bar');
      const minions = upper.querySelectorAll('.enemy-minion-plate').length;
      const sections = Array.from(upper.querySelectorAll('.battle-topbar, .turn-timeline, .enemy-field, .ally-grid, .dps-meter-panel'));
      const overflow = sections.filter((sec) => sec.getBoundingClientRect().bottom > upperRect.bottom + 0.5).map((sec) => sec.className);
      const truncated = Array.from(upper.querySelectorAll('.unit-name')).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent);
      return {
        hasBossFrame: Boolean(bossFrame),
        hasTelegraphActive: Boolean(tgBar && tgBar.classList.contains('is-telegraph-active')),
        minions,
        overflow,
        truncated
      };
    })()`);

    assert.equal(bossCheck13.hasBossFrame, true);
    assert.equal(bossCheck13.hasTelegraphActive, true);
    assert.equal(bossCheck13.minions, 2);
    assert.deepEqual(bossCheck13.overflow, []);
    assert.deepEqual(bossCheck13.truncated, []);

    // Also verify Stage 1-6 area boss frame & telegraph
    const bossCheck16 = await evalJson(`(() => {
      window.IkaiApp.App.startStageBattle('1-6', { seed: 60606 });
      const b = window.IkaiApp.CombatEngine.getActiveBattle();
      window.IkaiApp.CombatEngine.setSpeed(b, 3);
      for (let i = 0; i < 250; i += 1) {
        const s = window.IkaiApp.CombatEngine.step(b, 200);
        if (s.waveIndex === 4 && s.bossTelegraph !== null) {
          window.IkaiApp.UIRenderer.patchBattleFrame(
            document.getElementById('upper-stage'),
            document.getElementById('lower-deck'),
            s,
            window.IkaiApp.App.getUiState()
          );
          break;
        }
        if (s.status !== 'ongoing') break;
      }
      const upper = document.getElementById('upper-stage');
      const upperRect = upper.getBoundingClientRect();
      const bossFrame = upper.querySelector('.boss-frame.is-boss');
      const tgBar = upper.querySelector('.boss-telegraph-bar');
      const sections = Array.from(upper.querySelectorAll('.battle-topbar, .turn-timeline, .enemy-field, .ally-grid, .dps-meter-panel'));
      const overflow = sections.filter((sec) => sec.getBoundingClientRect().bottom > upperRect.bottom + 0.5).map((sec) => sec.className);
      return {
        hasBossFrame: Boolean(bossFrame),
        hasTelegraphActive: Boolean(tgBar && tgBar.classList.contains('is-telegraph-active')),
        overflow
      };
    })()`);

    assert.equal(bossCheck16.hasBossFrame, true);
    assert.equal(bossCheck16.hasTelegraphActive, true);
    assert.deepEqual(bossCheck16.overflow, []);

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

test('B1. Headless Chrome 390x844 SafeArea M2 Battle E2E on file://', async () => {
  assert.equal(fs.existsSync(CHROME_PATH), true, `Chrome not found at ${CHROME_PATH}`);
  const fileUrl = pathToFileURL(path.join(PROJECT_ROOT, 'index.html')).href;
  await runBattleE2E(fileUrl, 'file');
});

test('B2. Headless Chrome 390x844 SafeArea M2 Battle E2E on http://127.0.0.1', async () => {
  assert.equal(fs.existsSync(CHROME_PATH), true, `Chrome not found at ${CHROME_PATH}`);
  const { server, port } = await startStaticServer(PROJECT_ROOT);
  try {
    await runBattleE2E(`http://127.0.0.1:${port}/index.html`, 'http');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
