import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function loadBrowserBundle(options = {}) {
  const localStorageMap = new Map();
  if (options.initialStorage) {
    for (const [k, v] of Object.entries(options.initialStorage)) {
      localStorageMap.set(k, String(v));
    }
  }
  const fakeWindow = {
    location: { protocol: options.protocol || 'http:', href: options.href || 'http://127.0.0.1/' },
    localStorage: {
      getItem: (k) => (localStorageMap.has(k) ? localStorageMap.get(k) : null),
      setItem: (k, v) => { localStorageMap.set(k, String(v)); },
      removeItem: (k) => { localStorageMap.delete(k); },
      clear: () => { localStorageMap.clear(); }
    },
    matchMedia: () => ({ matches: false }),
    navigator: { serviceWorker: null }
  };
  const fakeDocument = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };
  const ctx = vm.createContext({
    window: fakeWindow,
    globalThis: null,
    document: fakeDocument,
    localStorage: fakeWindow.localStorage,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint32Array,
    ArrayBuffer,
    Math,
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Promise,
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    crypto: options.noSubtle ? undefined : globalThis.crypto,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    console
  });
  ctx.globalThis = ctx;
  fakeWindow.globalThis = ctx;
  fakeWindow.TextEncoder = TextEncoder;
  fakeWindow.TextDecoder = TextDecoder;
  fakeWindow.crypto = ctx.crypto;

  const scripts = [
    'js/namespace.js',
    'js/master-data.js',
    'js/save-security.js',
    'js/state-store.js',
    'js/audio-se.js',
    'js/svg-icons.js',
    'js/combat-engine.js',
    'js/progression.js'
  ];
  for (const rel of scripts) {
    const code = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
    vm.runInContext(code, ctx, { filename: rel });
  }
  return { ctx, IkaiApp: fakeWindow.IkaiApp || ctx.IkaiApp };
}

function makeFreshState(IkaiApp) {
  return IkaiApp.StateStore.createInitialState();
}

function createUnitRosterEntry(IkaiApp) {
  const s = IkaiApp.StateStore.createInitialState();
  return JSON.parse(JSON.stringify(s.roster.char_todo_seiichi));
}

// =========================================================================
// PART A: Unit Tests for M4 Mechanics, AI, Progression & Static Rules
// =========================================================================

test('M4-01. MasterData boss telegraph matches stun status & firstClearRewards include masteryBooks', () => {
  const { IkaiApp } = loadBrowserBundle();
  const { MasterData } = IkaiApp;

  const kifujin = MasterData.ENEMIES.b2_kifujin;
  assert.ok(kifujin, 'b2_kifujin should exist');
  const sk1 = kifujin.skills.find((s) => s.id === 'esk_b2_kifujin_1');
  assert.ok(sk1, 'esk_b2_kifujin_1 should exist');
  assert.equal(sk1.effects.some((ef) => ef.type === 'debuff' && ef.stat === 'stun'), true);
  assert.ok(
    sk1.telegraph && sk1.telegraph.warningText.includes('気絶'),
    `Expected telegraph.warningText to mention 気絶 instead of 凍結, got: ${sk1.telegraph && sk1.telegraph.warningText}`
  );
  assert.equal(sk1.telegraph.warningText.includes('凍結'), false);

  const stage11 = MasterData.STAGE_MAP['1-1'];
  const stage13 = MasterData.STAGE_MAP['1-3'];
  assert.ok(stage11.firstClearRewards.masteryBooks >= 1, 'Normal stage firstClearRewards should grant masteryBooks');
  assert.ok(stage13.firstClearRewards.masteryBooks >= 2, 'Boss stage firstClearRewards should grant >=2 masteryBooks');
});

test('M4-02. CombatEngine generates unique battle IDs, tuned gauge pace, balanced healer cleanse & conserve support AI', () => {
  const { IkaiApp } = loadBrowserBundle();
  const { CombatEngine, MasterData, StateStore } = IkaiApp;

  const s1 = StateStore.createInitialState();
  const b1 = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state: s1, seed: 101 });
  const b2 = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state: s1, seed: 101 });
  assert.notEqual(b1.id, b2.id, 'Concurrent createBattle calls must yield unique IDs');

  // Verify tuned GAUGE_RATE (0.58) functionally via 200ms step before any turn fires
  const bGauge = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state: s1, seed: 105, speed: 1 });
  const seiichiPre = bGauge.allies.find((u) => u.id === 'char_todo_seiichi');
  assert.ok(seiichiPre);
  CombatEngine.step(bGauge, 200);
  const expectedMinGauge = seiichiPre.spd * 0.55 * 0.2;
  assert.ok(seiichiPre.gauge >= expectedMinGauge, `Expected gauge >= ${expectedMinGauge}, got ${seiichiPre.gauge}`);

  // Balanced healer cleanse when >= 2 debuffs present even above 88% HP
  const healerState = makeFreshState(IkaiApp);
  healerState.roster.char_shiraishi_sumika = createUnitRosterEntry(IkaiApp);
  healerState.party = ['char_shiraishi_sumika', 'char_todo_seiichi', 'char_kobayashi_shohei', null];
  const bHeal = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state: healerState, seed: 202 });
  const sumika = bHeal.allies.find((u) => u.id === 'char_shiraishi_sumika');
  const seiichi = bHeal.allies.find((u) => u.id === 'char_todo_seiichi');
  assert.ok(sumika && seiichi);
  sumika.tactic.policy = 'balanced';
  sumika.hp = sumika.maxHp;
  seiichi.hp = seiichi.maxHp; // Full HP (> 88%), yet afflicted by 2 debuffs
  seiichi.debuffs = [
    { stat: 'burn', value: 120, turns: 2, duration: 2 },
    { stat: 'atkDown', value: 15, turns: 2, duration: 2 }
  ];
  sumika.uniqueSkill.currentCd = 0;
  sumika.gauge = 99;
  for (const u of bHeal.allies) {
    if (u.id !== sumika.id) u.gauge = 0;
  }
  for (const e of bHeal.enemies) e.gauge = 0;
  const logBeforeHeal = bHeal.logs.length;
  CombatEngine.step(bHeal, 100);
  const newLogsHeal = bHeal.logs.slice(logBeforeHeal);
  const sumikaUnique = MasterData.CHARACTER_MAP.char_shiraishi_sumika.uniqueSkill;
  assert.ok(
    newLogsHeal.some((l) => l.includes(sumika.name) && l.includes(sumikaUnique.name)),
    `Balanced healer should cast unique cleanse/heal when ally has >= 2 debuffs even above 88% HP; logs=${JSON.stringify(newLogsHeal)}`
  );

  // Conserve AI saves offensive skill (attacker) while allowing emergency heal (< 60% HP)
  const conserveState = makeFreshState(IkaiApp);
  conserveState.roster.char_shiraishi_sumika = createUnitRosterEntry(IkaiApp);
  conserveState.party = ['char_todo_seiichi', 'char_shiraishi_sumika', null, null];
  const cb = CombatEngine.createBattle({ mode: 'stage', stageId: '1-1', state: conserveState, seed: 303 });
  const attacker = cb.allies.find((u) => u.id === 'char_todo_seiichi');
  const healer = cb.allies.find((u) => u.id === 'char_shiraishi_sumika');
  attacker.tactic.policy = 'conserve';
  attacker.uniqueSkill.currentCd = 0;
  attacker.gauge = 99;
  healer.gauge = 0;
  for (const e of cb.enemies) e.gauge = 0;
  const logBeforeAtk = cb.logs.length;
  CombatEngine.step(cb, 100);
  const atkStepLogs = cb.logs.slice(logBeforeAtk);
  const seiichiUnique = MasterData.CHARACTER_MAP.char_todo_seiichi.uniqueSkill;
  assert.equal(
    atkStepLogs.some((l) => l.includes(seiichiUnique.name)),
    false,
    'Conserve attacker without reservedSkillId should save offensive unique skill and use normal attack'
  );

  healer.tactic.policy = 'conserve';
  healer.uniqueSkill.currentCd = 0;
  healer.gauge = 99;
  attacker.gauge = 0;
  attacker.hp = Math.floor(attacker.maxHp * 0.45); // < 60% emergency
  for (const e of cb.enemies) e.gauge = 0;
  const logBeforeEmerg = cb.logs.length;
  CombatEngine.step(cb, 100);
  const emergLogs = cb.logs.slice(logBeforeEmerg);
  assert.ok(
    emergLogs.some((l) => l.includes(healer.name) && l.includes(sumikaUnique.name)),
    `Conserve healer should still cast emergency heal when ally HP < 60%; logs=${JSON.stringify(emergLogs)}`
  );

  // Conserve healer also cleanses incapacitated/debuffed ally regardless of remaining shield
  healer.uniqueSkill.currentCd = 0;
  healer.gauge = 99;
  attacker.hp = attacker.maxHp;
  attacker.shield = 500;
  attacker.debuffs = [{ stat: 'stun', value: 1, turns: 1, duration: 1 }];
  attacker.gauge = 0;
  for (const e of cb.enemies) e.gauge = 0;
  const logBeforeCleanse = cb.logs.length;
  CombatEngine.step(cb, 100);
  const cleanseLogs = cb.logs.slice(logBeforeCleanse);
  assert.ok(
    cleanseLogs.some((l) => l.includes(healer.name) && l.includes(sumikaUnique.name)),
    `Conserve healer should cleanse incapacitated ally even with active shield; logs=${JSON.stringify(cleanseLogs)}`
  );
});

test('M4-03. Progression.autoEquipBest & autoFitTrialParty work validly and preserve R5 invariants', () => {
  const { IkaiApp } = loadBrowserBundle();
  const { Progression, SaveSecurity } = IkaiApp;

  const st = makeFreshState(IkaiApp);
  const eqRes = Progression.autoEquipBest(st, 'char_todo_seiichi');
  assert.equal(eqRes.ok, true);
  assert.ok(eqRes.equippedCount >= 1, 'autoEquipBest should equip unlocked equipment slots');
  assert.equal(SaveSecurity.validateSchema(eqRes.state).ok, true);

  // Give enough characters including SSR for trial_1 (no SSR allowed)
  for (const cid of ['char_kujo_renji', 'char_shiraishi_sumika', 'char_hozumi_saya']) {
    st.roster[cid] = createUnitRosterEntry(IkaiApp);
  }
  st.party = ['char_kujo_renji', 'char_todo_seiichi', 'char_kobayashi_shohei', 'char_saito_riko']; // Renji is SSR -> violates trial_1
  const beforeCheck = Progression.validateTrialEntry(st, 'trial_1', st.party);
  assert.equal(beforeCheck.ok, false);

  const fitRes = Progression.autoFitTrialParty(st, 'trial_1');
  assert.equal(fitRes.ok, true);
  const afterCheck = Progression.validateTrialEntry(fitRes.state, 'trial_1', fitRes.party);
  assert.equal(afterCheck.ok, true, `Fitted party should satisfy trial_1: ${(afterCheck.reasons || []).join(', ')}`);
  const vFit = SaveSecurity.validateSchema(fitRes.state);
  assert.equal(vFit.ok, true, `validateSchema failed: ${vFit.reason}`);
});

test('M4-04. Static R5 compliance audit (zero ellipsis, zero inline style, zero R5 prohibited words across M4 changes)', () => {
  const targets = [
    'index.html',
    'sw.js',
    'css/tokens.css',
    'css/layout.css',
    'css/components.css',
    'css/animations.css',
    'js/master-data.js',
    'js/combat-engine.js',
    'js/progression.js',
    'js/ui-renderer.js',
    'js/router-input.js',
    'js/app.js'
  ];
  const forbiddenWords = /\bLv\b|レベル|陣形|デイリー|ウィークリー|マンスリー|実績|\bPvP\b/;
  for (const rel of targets) {
    const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
    assert.equal(/text-overflow\s*:\s*ellipsis/i.test(content), false, `ellipsis found in ${rel}`);
    assert.equal(content.includes('・・・'), false, `・・・ found in ${rel}`);
    assert.equal(content.includes('...'), false, `... literal found in ${rel}`);
    assert.equal(forbiddenWords.test(content), false, `Forbidden R5 term found in ${rel}`);
    if (rel.endsWith('.js')) {
      assert.equal(content.includes('innerHTML'), false, `innerHTML found in ${rel}`);
      assert.equal(/setAttribute\s*\(\s*['"]style['"]/.test(content), false, `inline style found in ${rel}`);
    }
  }
});

// =========================================================================
// PART B: CDP Multi-Viewport Playtest & Interactive Flow Verification
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
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
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
    const timeout = setTimeout(() => reject(new Error('Chrome DevTools timeout: ' + stderrBuf)), 15000);
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

async function auditLayout(page, label) {
  const res = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const docOverflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const bodyOverflowY = document.body.scrollHeight > document.body.clientHeight;
      const upper = document.getElementById('upper-stage');
      const upperRect = upper ? upper.getBoundingClientRect() : null;
      const upperOverflowY = upper ? (upper.scrollHeight > upper.clientHeight + 1) : false;
      const upperOverflowX = upper ? (upper.scrollWidth > upper.clientWidth + 1) : false;
      const upperInteractive = upper ? upper.querySelectorAll('a,button,input,select,textarea,[tabindex]').length : 0;
      const upperCs = upper ? getComputedStyle(upper) : null;
      const battleStage = upper ? upper.querySelector('.battle-stage') : null;
      const battleStageOverflowY = battleStage ? (battleStage.scrollHeight > battleStage.clientHeight + 1) : false;
      const lowerScroll = document.querySelector('#lower-deck .lower-scroll');
      const lowerOverflowX = lowerScroll ? (lowerScroll.scrollWidth > lowerScroll.clientWidth + 2) : false;

      // Check zero ellipsis and zero tiny fonts < 10px on visible text nodes
      const tinyTexts = [];
      const ellipsisViolations = [];
      const allEls = Array.from(document.querySelectorAll('#app-shell *'));
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (cs.textOverflow === 'ellipsis') ellipsisViolations.push(el.className || el.tagName);
        let hasText = false;
        for (const n of el.childNodes) {
          if (n.nodeType === 3 && n.textContent.trim().length > 0) { hasText = true; break; }
        }
        if (hasText && el.namespaceURI === 'http://www.w3.org/1999/xhtml') {
          const fsPx = parseFloat(cs.fontSize);
          if (fsPx > 0 && fsPx < 9.95) {
            tinyTexts.push({ tag: el.tagName, cls: el.className, fs: fsPx, text: el.textContent.trim().slice(0, 24) });
          }
          if (el.textContent.includes('...') || el.textContent.includes('・・・')) {
            ellipsisViolations.push(el.textContent.trim().slice(0, 24));
          }
        }
      }

      // Check touch targets >= 40px height for visible interactive buttons/inputs inside #lower-deck
      const smallControls = [];
      const controls = Array.from(document.querySelectorAll('#lower-deck button, #lower-deck input, #lower-deck select, #lower-deck textarea'));
      for (const c of controls) {
        const r = c.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const cs = getComputedStyle(c);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (r.height < 39.5) {
          smallControls.push({ cls: c.className, h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10, action: c.getAttribute('data-action') || '' });
        }
      }

      return {
        label: ${JSON.stringify(label)},
        docOverflowX,
        bodyOverflowY,
        upperOverflowY,
        upperOverflowX,
        upperInteractive,
        upperPointerEvents: upperCs ? upperCs.pointerEvents : '',
        battleStageOverflowY,
        lowerOverflowX,
        upperHeight: upperRect ? Math.round(upperRect.height) : 0,
        tinyTexts,
        ellipsisViolations,
        smallControls
      };
    })()`,
    returnByValue: true
  });
  const info = res.result.value;
  assert.equal(info.docOverflowX, false, `[${label}] docOverflowX must be false`);
  assert.equal(info.bodyOverflowY, false, `[${label}] bodyOverflowY must be false`);
  assert.equal(info.upperOverflowY, false, `[${label}] upperOverflowY must be false (height=${info.upperHeight})`);
  assert.equal(info.upperOverflowX, false, `[${label}] upperOverflowX must be false`);
  assert.equal(info.battleStageOverflowY, false, `[${label}] battleStageOverflowY must be false`);
  assert.equal(info.lowerOverflowX, false, `[${label}] lowerOverflowX must be false`);
  assert.equal(info.upperInteractive, 0, `[${label}] upperInteractive must be 0`);
  assert.equal(info.upperPointerEvents, 'none', `[${label}] upperPointerEvents must be none`);
  assert.deepEqual(info.ellipsisViolations, [], `[${label}] zero ellipsis violations`);
  assert.deepEqual(info.tinyTexts, [], `[${label}] zero tiny texts < 10px`);
  assert.deepEqual(info.smallControls, [], `[${label}] all interactive controls must be >= 40px tall`);
  return info;
}

async function runM4CdpSuite(targetUrl, modeLabel) {
  const baseTmp = process.env.IKAI_TMP_DIR || os.tmpdir();
  fs.mkdirSync(baseTmp, { recursive: true });
  const profileDir = fs.mkdtempSync(path.join(baseTmp, `ikai_m4_${modeLabel}_`));
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

    const setViewportAndSafeArea = async (width, height, topPx, bottomPx) => {
      await page.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 3,
        mobile: true
      });
      await page.send('Runtime.evaluate', {
        expression: `(() => {
          document.documentElement.style.setProperty('--safe-top', '${topPx}px');
          document.documentElement.style.setProperty('--safe-bottom', '${bottomPx}px');
          return true;
        })()`,
        returnByValue: true
      });
    };

    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
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

    const loadDone = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`[${modeLabel}] Page.loadEventFired timeout`)), 15000);
      page.on('Page.loadEventFired', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await page.send('Page.navigate', { url: targetUrl });
    await loadDone;

    // Wait until App.boot() completes
    let booted = false;
    for (let i = 0; i < 100; i += 1) {
      const bootRes = await page.send('Runtime.evaluate', {
        expression: 'Boolean(window.IkaiApp && window.IkaiApp.App && window.IkaiApp.App.getUiState().booted)',
        returnByValue: true
      });
      if (bootRes.exceptionDetails) {
        throw new Error(`[${modeLabel}] Boot polling failed: ` + JSON.stringify(bootRes.exceptionDetails));
      }
      if (bootRes.result && bootRes.result.value) {
        booted = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(booted, true, `[${modeLabel}] App.boot() did not complete within timeout`);

    // Apply iPhone 15 Pro SafeArea (59 / 34) via CSS custom properties for strict worst-case verification
    await setViewportAndSafeArea(393, 852, 59, 34);
    await new Promise((r) => setTimeout(r, 120));

    // 1. Check initial selectedCharId is first owned unit & apple-touch-icon present (M4-C2, M4-A5)
    const initAudit = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const ui = window.IkaiApp.App.getUiState();
        const appleTouch = document.querySelector('link[rel="apple-touch-icon"]');
        return {
          selectedCharId: ui.selectedCharId,
          activeTab: ui.activeTab,
          hasAppleTouch: !!appleTouch,
          booted: ui.booted
        };
      })()`,
      returnByValue: true
    });
    assert.equal(initAudit.exceptionDetails, undefined, `[${modeLabel}] initAudit threw: ${JSON.stringify(initAudit.exceptionDetails)}`);
    assert.ok(initAudit.result && initAudit.result.value, `[${modeLabel}] initAudit returned empty value`);
    assert.equal(initAudit.result.value.booted, true);
    assert.equal(initAudit.result.value.activeTab, 'roster');
    assert.equal(initAudit.result.value.selectedCharId, 'char_todo_seiichi');
    assert.equal(initAudit.result.value.hasAppleTouch, true);
    await auditLayout(page, `${modeLabel}-393x852-initial-roster`);

    // 2. Test Role filter chips in roster preserving 3-tier sort & collectible skill slot 2 visibility (M4-C5)
    const rosterCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const tankChip = document.querySelector('[data-action="set-role-filter"][data-role="タンク"]');
        if (tankChip) tankChip.click();
        const rows = Array.from(document.querySelectorAll('#lower-deck .roster-row .unit-name')).map((e) => e.textContent.trim());
        const allChip = document.querySelector('[data-action="set-role-filter"][data-role="all"]');
        if (allChip) allChip.click();
        const lowerText = document.getElementById('lower-deck').textContent;
        return { tankCount: rows.length, hasCollectSlot2Guide: lowerText.includes('収集技枠2') };
      })()`,
      returnByValue: true
    });
    assert.ok(rosterCheck.result.value.tankCount >= 1 && rosterCheck.result.value.tankCount < 20, `Role filter should narrow roster list (got ${rosterCheck.result.value.tankCount})`);
    assert.equal(rosterCheck.result.value.hasCollectSlot2Guide, true, 'Roster detail should show slot 2 guidance');

    // 3. Test Enhance -> Equip filters, sort, autoEquipBest, bulk-sell preview (M4-C4)
    const enhanceCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('[data-action="switch-enhance-sub"][data-sub="equips"]').click();
        const autoBtn = document.querySelector('[data-action="auto-equip-char"]');
        if (autoBtn) autoBtn.click();
        const weaponChip = document.querySelector('[data-action="set-equip-slot-filter"][data-slot="主器"]');
        if (weaponChip) weaponChip.click();
        const sortBtn = document.querySelector('[data-action="toggle-equip-sort"]');
        if (sortBtn) sortBtn.click();
        const bulkPreview = document.querySelector('[data-action="bulk-sell-equips"]');
        const bodyText = document.getElementById('lower-deck').textContent;
        return {
          hasAutoBtn: !!autoBtn,
          hasWeaponChip: !!weaponChip,
          hasSortBtn: !!sortBtn,
          hasBulkPreview: !!bulkPreview,
          hasSetSummary: bodyText.includes('装着セット効果')
        };
      })()`,
      returnByValue: true
    });
    assert.deepEqual(enhanceCheck.result.value, {
      hasAutoBtn: true,
      hasWeaponChip: true,
      hasSortBtn: true,
      hasBulkPreview: true,
      hasSetSummary: true
    });
    await auditLayout(page, `${modeLabel}-393x852-enhance-equip`);

    // 3b. Verify pruneEquipSelection clears synthMatUid on base qualityIdx >= 4, quality mismatch, or equipId mismatch
    const pruneSynthCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const eqIdA = window.IkaiApp.MasterData.EQUIPS[0].id;
        const eqIdB = window.IkaiApp.MasterData.EQUIPS[1].id;
        const st0 = window.IkaiApp.StateStore.getState();
        const backupEquips = JSON.parse(JSON.stringify(st0.equips));
        const st1 = JSON.parse(JSON.stringify(st0));
        st1.equips.push(
          { uid: 'eq_prune_base', equipId: eqIdA, qualityIdx: 0, locked: false },
          { uid: 'eq_prune_mat', equipId: eqIdA, qualityIdx: 0, locked: false },
          { uid: 'eq_prune_dummy', equipId: eqIdB, qualityIdx: 0, locked: false }
        );
        window.IkaiApp.StateStore.setState(st1);
        document.querySelector('[data-action="set-equip-slot-filter"][data-slot="all"]').click();
        document.querySelector('[data-action="set-synth-base"][data-uid="eq_prune_base"]').click();
        document.querySelector('[data-action="set-synth-mat"][data-uid="eq_prune_mat"]').click();
        const selectedBefore = document.getElementById('lower-deck').textContent.includes('素材選択済');

        // Case 1: base qualityIdx >= 4
        const stMax = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
        stMax.equips.find((e) => e.uid === 'eq_prune_base').qualityIdx = 4;
        window.IkaiApp.StateStore.setState(stMax);
        document.querySelector('[data-action="toggle-equip-lock"][data-uid="eq_prune_dummy"]').click();
        const clearedOnMaxQuality = !document.getElementById('lower-deck').textContent.includes('素材選択済') &&
          !document.querySelector('[data-action="set-synth-mat"][data-uid="eq_prune_mat"]').textContent.includes('✓');

        // Case 2: base qualityIdx !== mat qualityIdx
        const stQReset = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
        stQReset.equips.find((e) => e.uid === 'eq_prune_base').qualityIdx = 0;
        window.IkaiApp.StateStore.setState(stQReset);
        document.querySelector('[data-action="set-synth-base"][data-uid="eq_prune_base"]').click();
        document.querySelector('[data-action="set-synth-mat"][data-uid="eq_prune_mat"]').click();
        const stQMismatch = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
        stQMismatch.equips.find((e) => e.uid === 'eq_prune_base').qualityIdx = 1;
        window.IkaiApp.StateStore.setState(stQMismatch);
        document.querySelector('[data-action="toggle-equip-lock"][data-uid="eq_prune_dummy"]').click();
        const clearedOnQualityMismatch = !document.getElementById('lower-deck').textContent.includes('素材選択済') &&
          !document.querySelector('[data-action="set-synth-mat"][data-uid="eq_prune_mat"]').textContent.includes('✓');

        // Case 3: base equipId !== mat equipId
        const stIdReset = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
        stIdReset.equips.find((e) => e.uid === 'eq_prune_base').qualityIdx = 0;
        window.IkaiApp.StateStore.setState(stIdReset);
        document.querySelector('[data-action="set-synth-base"][data-uid="eq_prune_base"]').click();
        document.querySelector('[data-action="set-synth-mat"][data-uid="eq_prune_mat"]').click();
        const stIdMismatch = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
        stIdMismatch.equips.find((e) => e.uid === 'eq_prune_base').equipId = eqIdB;
        window.IkaiApp.StateStore.setState(stIdMismatch);
        document.querySelector('[data-action="toggle-equip-lock"][data-uid="eq_prune_dummy"]').click();
        const clearedOnEquipMismatch = !document.getElementById('lower-deck').textContent.includes('素材選択済') &&
          !document.querySelector('[data-action="set-synth-mat"][data-uid="eq_prune_mat"]').textContent.includes('✓');

        // Restore original equips cleanly and prune temporary UIDs
        const stRestore = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
        stRestore.equips = backupEquips;
        window.IkaiApp.StateStore.setState(stRestore);
        if (backupEquips[0]) {
          const lockBtn1 = document.querySelector('[data-action="toggle-equip-lock"][data-uid="' + backupEquips[0].uid + '"]');
          if (lockBtn1) lockBtn1.click();
          const lockBtn2 = document.querySelector('[data-action="toggle-equip-lock"][data-uid="' + backupEquips[0].uid + '"]');
          if (lockBtn2) lockBtn2.click();
        }
        return { selectedBefore, clearedOnMaxQuality, clearedOnQualityMismatch, clearedOnEquipMismatch };
      })()`,
      returnByValue: true
    });
    assert.equal(pruneSynthCheck.exceptionDetails, undefined, `pruneSynthCheck threw: ${JSON.stringify(pruneSynthCheck.exceptionDetails)}`);
    assert.deepEqual(pruneSynthCheck.result.value, {
      selectedBefore: true,
      clearedOnMaxQuality: true,
      clearedOnQualityMismatch: true,
      clearedOnEquipMismatch: true
    });

    // 4. Test Expedition candidate sync when assigning resonance/party (M4-A1) + Party full tactics & resonance (M4-C5)
    const syncAndPartyCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('[data-action="switch-tab"][data-tab-id="expedition"]').click();
        const candBtns = Array.from(document.querySelectorAll('[data-action="toggle-exp-char"]'));
        if (candBtns[0]) candBtns[0].click();
        const targetId = candBtns[0] ? candBtns[0].getAttribute('data-char-id') : null;
        const beforeCands = window.IkaiApp.App.getUiState().expCandidateIds.slice();
        if (targetId) {
          const st = window.IkaiApp.StateStore.getState();
          const res = window.IkaiApp.Progression.setResonance(st, 0, targetId);
          if (res.ok) window.IkaiApp.StateStore.setState(res.state);
        }
        document.querySelector('[data-action="switch-tab"][data-tab-id="expedition"]').click();
        const afterCands = window.IkaiApp.App.getUiState().expCandidateIds.slice();
        document.querySelector('[data-action="switch-tab"][data-tab-id="party"]').click();
        const partyText = document.getElementById('lower-deck').textContent;
        return {
          targetId,
          beforeHas: beforeCands.includes(targetId),
          afterHas: afterCands.includes(targetId),
          hasResonanceSection: partyText.includes('共鳴：')
        };
      })()`,
      returnByValue: true
    });
    assert.equal(syncAndPartyCheck.result.value.beforeHas, true);
    assert.equal(syncAndPartyCheck.result.value.afterHas, false, 'M4-A1: expCandidateIds must filter out characters assigned to resonance/party');
    assert.equal(syncAndPartyCheck.result.value.hasResonanceSection, true);
    await auditLayout(page, `${modeLabel}-393x852-party`);

    // 5. Test Summon 10x stagger classes + SSR glow & NEW tag (M4-D4)
    await page.send('Runtime.evaluate', {
      expression: `(() => {
        const st = window.IkaiApp.StateStore.getState();
        st.currencies.echoStones = 3000;
        window.IkaiApp.StateStore.setState(st);
        document.querySelector('[data-action="switch-tab"][data-tab-id="summon"]').click();
        const pull10 = document.querySelector('[data-action="roll-summon"][data-count="10"]');
        if (pull10) pull10.click();
        return true;
      })()`,
      returnByValue: true
    });
    await new Promise((r) => setTimeout(r, 120));
    const summonDom = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const chips = Array.from(document.querySelectorAll('#upper-stage .summon-pop-chip'));
        const hasStagger0 = chips.some((c) => c.classList.contains('stagger-0'));
        const hasStagger9 = chips.some((c) => c.classList.contains('stagger-9'));
        return { count: chips.length, hasStagger0, hasStagger9 };
      })()`,
      returnByValue: true
    });
    assert.equal(summonDom.result.value.count, 10);
    assert.equal(summonDom.result.value.hasStagger0, true);
    assert.equal(summonDom.result.value.hasStagger9, true);

    // 6. Test Codex Buff/Debuff legend (M4-B6) + Backup copy button & 2-step reset (M4-C8) + Sticky Areas CTA (M4-C3)
    const recordsAndAreasCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('[data-action="switch-tab"][data-tab-id="codex"]').click();
        const hasBuffLegend = document.getElementById('lower-deck').textContent.includes('付与状態（強化・弱体）凡例');

        document.querySelector('[data-action="switch-tab"][data-tab-id="records"]').click();
        const hasCopyBtn = !!document.querySelector('[data-action="copy-backup"]');
        const rst1 = document.querySelector('[data-action="reset-save"]');
        if (rst1) rst1.click();
        const hasConfirmBtn = !!document.querySelector('[data-action="confirm-reset-save"]');
        const cancelBtn = document.querySelector('[data-action="cancel-reset-save"]');
        if (cancelBtn) cancelBtn.click();
        const hasConfirmAfterCancel = !!document.querySelector('[data-action="confirm-reset-save"]');

        document.querySelector('[data-action="switch-tab"][data-tab-id="areas"]').click();
        const stickyCta = document.querySelector('#lower-deck .lower-sticky-cta');
        return { hasBuffLegend, hasCopyBtn, hasConfirmBtn, hasConfirmAfterCancel, hasStickyCta: !!stickyCta };
      })()`,
      returnByValue: true
    });
    assert.deepEqual(recordsAndAreasCheck.result.value, {
      hasBuffLegend: true,
      hasCopyBtn: true,
      hasConfirmBtn: true,
      hasConfirmAfterCancel: false,
      hasStickyCta: true
    });
    await auditLayout(page, `${modeLabel}-393x852-areas-sticky`);

    // 7. Test Trial Mode: auto-fit button, repeat lock, 制約試練 pill, 2-col result (M4-A2, M4-A7, M4-E4)
    const trialPrep = await page.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const st = window.IkaiApp.StateStore.getState();
          const draft = JSON.parse(JSON.stringify(st));
          const baseEntry = JSON.parse(JSON.stringify(draft.roster.char_todo_seiichi));
          baseEntry.equipped = { '主器': null, '護符': null, '装具': null, '印章': null };
          for (const cid of ['char_todo_seiichi', 'char_kobayashi_shohei', 'char_saito_riko', 'char_nakamura_yui', 'char_kujo_renji']) {
            if (!draft.roster[cid]) draft.roster[cid] = JSON.parse(JSON.stringify(baseEntry));
            draft.roster[cid].awakening = 2;
          }
          draft.party = ['char_kujo_renji', 'char_todo_seiichi', null, null];
          window.IkaiApp.StateStore.setState(draft);
          document.querySelector('[data-action="switch-areas-pillar"][data-pillar="trial"]').click();
          const violText = document.getElementById('lower-deck').textContent.includes('違反：');
          const fitBtn = document.querySelector('[data-action="auto-fit-trial"]');
          if (fitBtn) fitBtn.click();
          const startTrialBtn = document.querySelector('[data-action="start-trial"]');
          const canStart = Boolean(startTrialBtn && !startTrialBtn.disabled);
          if (startTrialBtn) startTrialBtn.click();
          return { ok: true, violText, hadFitBtn: !!fitBtn, started: canStart };
        } catch (err) {
          return { ok: false, err: String(err && err.stack || err) };
        }
      })()`,
      returnByValue: true
    });
    assert.equal(trialPrep.result.value && trialPrep.result.value.ok, true, `trialPrep failed: ${JSON.stringify(trialPrep.result.value)}`);
    assert.equal(trialPrep.result.value.violText, true);
    assert.equal(trialPrep.result.value.hadFitBtn, true);
    assert.equal(trialPrep.result.value.started, true);
    await new Promise((r) => setTimeout(r, 150));

    const trialBattleCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const repeatBtn = document.querySelector('[data-action="toggle-battle-repeat"]');
        const pills = Array.from(document.querySelectorAll('#upper-stage .battle-pill')).map((e) => e.textContent.trim());
        if (repeatBtn) repeatBtn.click();
        const snap = window.IkaiApp.App.getBattleSnapshot();
        return {
          disabled: repeatBtn ? repeatBtn.disabled : false,
          hasTrialPill: pills.includes('制約試練'),
          repeatAfterClick: snap ? Boolean(snap.autoRepeat) : false
        };
      })()`,
      returnByValue: true
    });
    assert.equal(trialBattleCheck.result.value.disabled, true, 'M4-A2: Trial battle repeat button must be disabled');
    assert.equal(trialBattleCheck.result.value.hasTrialPill, true, 'M4-A2: Trial battle must show 制約試練 pill');
    assert.equal(trialBattleCheck.result.value.repeatAfterClick, false, 'M4-A2: Trial battle repeat mutation must be rejected');

    // Retreat trial battle to check 2-col result grid (M4-A7)
    await page.send('Runtime.evaluate', {
      expression: `(() => {
        const retBtn = document.querySelector('[data-action="retreat-battle"]');
        if (retBtn) retBtn.click();
        return true;
      })()`,
      returnByValue: true
    });
    await new Promise((r) => setTimeout(r, 100));
    const trialResultCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const nextBtn = document.querySelector('[data-action="next-stage"]');
        const logBtn = document.querySelector('[data-action="toggle-result-logs"]');
        const grid2 = document.querySelector('#lower-deck .btn-grid-2');
        return { hasNextStageBtn: !!nextBtn, hasLogBtn: !!logBtn, hasGrid2: !!grid2 };
      })()`,
      returnByValue: true
    });
    assert.equal(trialResultCheck.result.value.hasNextStageBtn, false, 'M4-A7: Trial result should omit Next Stage button');
    assert.equal(trialResultCheck.result.value.hasLogBtn, true, 'M4-C7: Result should have collapsible log toggle');
    assert.equal(trialResultCheck.result.value.hasGrid2, true);

    // 8. Worst-case Stage 1-3 Wave 5 Boss Battle + Multi-Viewport SafeArea checks (390x844, 393x852, 430x932) + Battle controls (M4-B1, M4-B4, M4-B5, M4-C6, M4-C7, M4-D2, M4-D3)
    const stage13Prep = await page.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          document.querySelector('[data-action="return-hub"]').click();
          const st = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
          st.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', null];
          st.currencies.masteryBooks = 5;
          st.party = ['char_todo_seiichi', 'char_kobayashi_shohei', 'char_saito_riko', 'char_nakamura_yui'];
          if (!st.progress.clearedStages.includes('1-1')) st.progress.clearedStages.push('1-1');
          if (!st.progress.clearedStages.includes('1-2')) st.progress.clearedStages.push('1-2');
          window.IkaiApp.StateStore.setState(st);
          document.querySelector('[data-action="switch-tab"][data-tab-id="areas"]').click();
          document.querySelector('[data-action="switch-areas-pillar"][data-pillar="story"]').click();
          document.querySelector('[data-action="select-stage"][data-stage-id="1-3"]').click();
          document.querySelector('[data-action="start-stage"]').click();
          return { ok: true, hasSnap: !!window.IkaiApp.App.getBattleSnapshot() };
        } catch (err) {
          return { ok: false, err: String(err && err.stack || err) };
        }
      })()`,
      returnByValue: true
    });
    assert.equal(stage13Prep.result.value && stage13Prep.result.value.ok, true, `stage13Prep failed: ${JSON.stringify(stage13Prep.result.value)}`);
    await new Promise((r) => setTimeout(r, 350));

    // Verify battle UI details (collect skill reserve toggle, detail mode tabs, .is-acting-next, .dps-rate, .battle-elapsed, .battle-ticker, .meter-lag)
    const battleControlsCheck = await page.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const collectBtn = document.querySelector('[data-action="reserve-skill"][data-unit-id="char_todo_seiichi"][data-skill-id="sk_r_kiriharai"]');
          const uniqBtn = document.querySelector('[data-action="reserve-skill"][data-unit-id="char_todo_seiichi"][data-skill-id="unique"]');
          if (collectBtn) collectBtn.click();
          const snap1 = window.IkaiApp.App.getBattleSnapshot();
          const afterCollect = snap1 ? snap1.allies.find((a) => a.id === 'char_todo_seiichi').reservedSkillId : null;
          if (uniqBtn) uniqBtn.click();
          const snap2 = window.IkaiApp.App.getBattleSnapshot();
          const afterUniq = snap2 ? snap2.allies.find((a) => a.id === 'char_todo_seiichi').reservedSkillId : null;
          if (uniqBtn) uniqBtn.click();
          const snap3 = window.IkaiApp.App.getBattleSnapshot();
          const afterCancel = snap3 ? snap3.allies.find((a) => a.id === 'char_todo_seiichi').reservedSkillId : 'not_null';

          const dpsToggle = document.querySelector('[data-action="toggle-dps-detail"]');
          if (dpsToggle) dpsToggle.click();
          document.querySelector('[data-action="switch-battle-detail"][data-detail-mode="logs"]').click();
          const hasLogsView = !!document.querySelector('#lower-deck .battle-log-list');
          document.querySelector('[data-action="switch-battle-detail"][data-detail-mode="buffs"]').click();
          const hasBuffsView = !!document.querySelector('#lower-deck .battle-log-list');
          document.querySelector('[data-action="switch-battle-detail"][data-detail-mode="dps"]').click();
          if (dpsToggle) dpsToggle.click();

          return {
            ok: true,
            hasCollectBtn: !!collectBtn,
            afterCollect,
            afterUniq,
            afterCancel,
            hasLogsView,
            hasBuffsView,
            hasActingNext: !!document.querySelector('#upper-stage .is-acting-next'),
            hasDpsRate: !!document.querySelector('#upper-stage .dps-rate'),
            hasElapsed: !!document.querySelector('#upper-stage .battle-elapsed'),
            hasTicker: !!document.querySelector('#upper-stage .battle-ticker'),
            hasMeterLag: !!document.querySelector('#upper-stage .meter-lag')
          };
        } catch (err) {
          return { ok: false, err: String(err && err.stack || err) };
        }
      })()`,
      returnByValue: true
    });
    assert.equal(battleControlsCheck.result.value && battleControlsCheck.result.value.ok, true, `battleControlsCheck failed: ${JSON.stringify(battleControlsCheck.result.value)}`);
    assert.equal(battleControlsCheck.result.value.hasCollectBtn, true);
    assert.equal(battleControlsCheck.result.value.afterCollect, 'sk_r_kiriharai');
    assert.equal(battleControlsCheck.result.value.afterUniq, 'unique');
    assert.equal(battleControlsCheck.result.value.afterCancel, null);
    assert.equal(battleControlsCheck.result.value.hasLogsView, true);
    assert.equal(battleControlsCheck.result.value.hasBuffsView, true);
    assert.equal(battleControlsCheck.result.value.hasActingNext, true);
    assert.equal(battleControlsCheck.result.value.hasDpsRate, true);
    assert.equal(battleControlsCheck.result.value.hasElapsed, true);
    assert.equal(battleControlsCheck.result.value.hasTicker, true);
    assert.equal(battleControlsCheck.result.value.hasMeterLag, true);

    // Multi-viewport layout verification on worst-case Stage 1-3 Wave 5 boss fight
    await page.send('Runtime.evaluate', {
      expression: `(() => {
        const b = window.IkaiApp.CombatEngine.getActiveBattle();
        if (b) {
          b.waveIndex = 4;
          for (const e of b.enemies) e.hp = 0;
          window.IkaiApp.CombatEngine.step(b, 150);
          window.IkaiApp.CombatEngine.step(b, 600);
          window.IkaiApp.App.renderAll();
        }
        return true;
      })()`,
      returnByValue: true
    });
    await new Promise((r) => setTimeout(r, 80));

    await setViewportAndSafeArea(390, 844, 47, 34);
    await new Promise((r) => setTimeout(r, 80));
    await auditLayout(page, `${modeLabel}-390x844-boss-battle`);

    await setViewportAndSafeArea(393, 852, 59, 34);
    await new Promise((r) => setTimeout(r, 80));
    await auditLayout(page, `${modeLabel}-393x852-boss-battle`);

    await setViewportAndSafeArea(430, 932, 59, 34);
    await new Promise((r) => setTimeout(r, 80));
    await auditLayout(page, `${modeLabel}-430x932-boss-battle`);

    // 9. Complete Stage 1-1 at 3x with auto-repeat + verify rankedUpSkills + proceed-auto-repeat & summary (M4-A3, M4-E1)
    await setViewportAndSafeArea(393, 852, 59, 34);
    const repeatFlow = await page.send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const retBtn = document.querySelector('[data-action="retreat-battle"]');
          if (retBtn) retBtn.click();
          document.querySelector('[data-action="return-hub"]').click();
          const st = JSON.parse(JSON.stringify(window.IkaiApp.StateStore.getState()));
          st.skillInventory.sk_r_kiriharai = { ownedCount: 1, rank: 1, uses: 9 }; // 1 use away from Rank 2 threshold (10)
          st.roster.char_todo_seiichi.skills = ['sk_r_kiriharai', null];
          st.roster.char_todo_seiichi.tactic.skillPriority = 'collect_first';
          st.settings.autoRepeatCount = 2;
          window.IkaiApp.StateStore.setState(st);
          document.querySelector('[data-action="select-stage"][data-stage-id="1-1"]').click();
          document.querySelector('[data-action="start-stage"]').click();
          document.querySelector('[data-action="battle-speed"][data-speed="3"]').click();
          return { ok: true };
        } catch (err) {
          return { ok: false, err: String(err && err.stack || err) };
        }
      })()`,
      returnByValue: true
    });
    assert.equal(repeatFlow.result.value && repeatFlow.result.value.ok, true, `repeatFlow failed: ${JSON.stringify(repeatFlow.result.value)}`);

    // Wait up to 12s for Stage 1-1 victory & autoRepeatPending result screen
    let repeatResult = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const snap = await page.send('Runtime.evaluate', {
        expression: `(() => {
          const ui = window.IkaiApp.App.getUiState();
          const skipBtn = document.querySelector('[data-action="proceed-auto-repeat"]');
          const mvp = document.querySelector('#upper-stage .mvp-chip');
          const resultText = document.getElementById('lower-deck').textContent;
          return {
            hasSkipBtn: !!skipBtn,
            hasMvp: !!mvp,
            hasRankUpSection: resultText.includes('収集技 熟練度昇格！'),
            autoRepeatPending: !!ui.autoRepeatPending
          };
        })()`,
        returnByValue: true
      });
      if (snap.result.value.hasSkipBtn || snap.result.value.hasMvp) {
        repeatResult = snap.result.value;
        break;
      }
    }
    assert.ok(repeatResult && repeatResult.hasMvp, 'Stage 1-1 result should render MVP chip');
    assert.equal(repeatResult.hasRankUpSection, true, 'M4-A3: Skill rank-up section should appear on result screen');

    // Verify CSP, runtime exceptions, console errors, network failures all zero
    const cspRes = await page.send('Runtime.evaluate', { expression: 'window.__cspViolations || []', returnByValue: true });
    assert.deepEqual(cspRes.result.value, [], `[${modeLabel}] CSP violations must be empty`);
    assert.deepEqual(exceptions, [], `[${modeLabel}] JS exceptions must be empty`);
    assert.deepEqual(consoleErrors, [], `[${modeLabel}] console errors must be empty`);
    assert.deepEqual(logIssues, [], `[${modeLabel}] Log.entryAdded errors/warnings must be empty`);
    assert.deepEqual(networkFailures, [], `[${modeLabel}] Network failures must be empty`);
    assert.deepEqual(httpErrors, [], `[${modeLabel}] HTTP >=400 errors must be empty`);
  } finally {
    if (cdp) {
      try { await cdp.browser.send('Browser.close'); } catch (_) {}
      cdp.page.close();
      cdp.browser.close();
    }
    if (proc && !proc.killed) {
      try { proc.kill('SIGKILL'); } catch (_) {}
    }
    await new Promise((r) => setTimeout(r, 250));
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (_) {}
  }
}

test('M4-05. Headless Chrome Multi-Viewport (390/393/430 SafeArea) & All M4 Flows on file://', { timeout: 60000 }, async () => {
  const targetUrl = pathToFileURL(path.join(ROOT_DIR, 'index.html')).href;
  await runM4CdpSuite(targetUrl, 'file');
});

test('M4-06. Headless Chrome Multi-Viewport (390/393/430 SafeArea) & All M4 Flows on http://127.0.0.1', { timeout: 60000 }, async () => {
  const { server, port } = await startStaticServer(ROOT_DIR);
  try {
    await runM4CdpSuite(`http://127.0.0.1:${port}/index.html`, 'http');
  } finally {
    server.close();
  }
});
