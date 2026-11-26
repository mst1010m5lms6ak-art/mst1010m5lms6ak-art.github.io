import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  CdpBrowser,
  EXPECTED_SORT_ORDER_NAMES,
  MOBILE_VIEWPORT,
  TAB_SPECS,
  bootIkaiApp,
  openTab,
  resolveProjectContext,
  startStaticServer,
  waitForIkaiBooted
} from './cdp_harness.mjs';

const ctx = resolveProjectContext();
let sharedServer = null;
let sharedBrowser = null;
let ownedServer = false;

function getHttpUrl() {
  if (!sharedServer && !ctx.baseUrl) return null;
  return `${ctx.baseUrl || sharedServer.baseUrl}/index.html`;
}

function getAppUrl() {
  if (ctx.mode === 'file') return ctx.fileUrl;
  return getHttpUrl() || ctx.fileUrl;
}

async function ensureBootedHttp(clearStorage = false) {
  await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage });
}

async function withTempHttpUrl(fn) {
  const existing = getHttpUrl();
  if (existing) return await fn(existing);
  const srv = await startStaticServer(ctx.projectDir);
  try {
    return await fn(`${srv.baseUrl}/index.html`);
  } finally {
    await srv.close();
  }
}

async function runBattleToCompletion(browser, { maxSteps = 100, stepMs = 1000, requireFinish = true } = {}) {
  await browser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'combat start' });
  let snap = null;
  for (let i = 0; i < maxSteps; i++) {
    snap = await browser.eval(`(() => {
      const r = IkaiApp.CombatEngine.step(${stepMs});
      const cur = r || IkaiApp.CombatEngine.getSnapshot();
      return cur ? {
        finished: Boolean(cur.finished),
        victory: Boolean(cur.victory ?? (cur.result === 'victory'))
      } : null;
    })()`);
    if (snap?.finished) {
      return snap;
    }
  }
  if (requireFinish) {
    assert.fail(`Battle did not finish within ${maxSteps} steps (${maxSteps * stepMs}ms)`);
  }
  return snap;
}

const ROSTER_ENTRY_EXPR = `({
  awakening: 0,
  shards: 0,
  emblemNodes: [],
  equipped: { '主器': null, '護符': null, '装具': null, '印章': null },
  skills: [null, null],
  tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'unique_first' }
})`;

describe('Tier 1: Feature Coverage (F1-F15, 75 tests)', () => {
  before(async () => {
    if (!fs.existsSync(ctx.indexHtmlPath)) {
      throw new Error(`Missing entrypoint: ${ctx.indexHtmlPath}`);
    }
    if (!ctx.baseUrl && ctx.mode !== 'file') {
      sharedServer = await startStaticServer(ctx.projectDir);
      ownedServer = true;
    }
    sharedBrowser = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
  });

  after(async () => {
    if (sharedBrowser) await sharedBrowser.close();
    if (ownedServer && sharedServer) await sharedServer.close();
  });

  // =========================================================================
  // F1: ルート直下構成・PWA・Capacitor (5 tests)
  // =========================================================================
  describe('F1: ルート直下構成・PWA・Capacitor', () => {
    it('T1-F01-01: file:// 直開き起動＆エラーゼロ', async () => {
      const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(b, ctx.fileUrl, { clearStorage: true });
        const info = await b.eval('({ title: document.title, isFile: IkaiApp.Env.isFile(), hasUpper: Boolean(document.querySelector(".upper-stage")), hasLower: Boolean(document.querySelector(".lower-deck")) })');
        assert.ok(info.title.includes('異界残響録'));
        assert.equal(info.isFile, true);
        assert.equal(info.hasUpper, true);
        assert.equal(info.hasLower, true);
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });

    it('T1-F01-02: ローカルHTTP起動＆エラーゼロ', async () => {
      await withTempHttpUrl(async (httpUrl) => {
        await bootIkaiApp(sharedBrowser, httpUrl, { clearStorage: true });
        const info = await sharedBrowser.eval('({ title: document.title, isHttp: IkaiApp.Env.isHttp(), hasUpper: Boolean(document.querySelector(".upper-stage")), hasLower: Boolean(document.querySelector(".lower-deck")) })');
        assert.ok(info.title.includes('異界残響録'));
        assert.equal(info.isHttp, true);
        assert.equal(info.hasUpper, true);
        assert.equal(info.hasLower, true);
        await sharedBrowser.assertZeroErrors();
      });
    });

    it('T1-F01-03: PWA manifest.webmanifest 妥当性＆SVGアイコンのみ', async () => {
      const manifestPath = path.join(ctx.projectDir, 'manifest.webmanifest');
      assert.equal(fs.existsSync(manifestPath), true, 'manifest.webmanifest must exist');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.equal(manifest.name, '異界残響録');
      assert.equal(manifest.display, 'standalone');
      assert.ok(manifest.start_url);
      assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 1);
      for (const icon of manifest.icons) {
        assert.ok(String(icon.src).endsWith('.svg'), `Icon must be SVG, got ${icon.src}`);
        assert.equal(icon.type, 'image/svg+xml');
        assert.equal(/\.(png|jpe?g|webp)$/i.test(icon.src), false);
      }
    });

    it('T1-F01-04: sw.js 登録（HTTP）と file:// スキップ', async () => {
      await withTempHttpUrl(async (httpUrl) => {
        const hb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
        try {
          await bootIkaiApp(hb, httpUrl, { clearStorage: true });
          const sw = await hb.waitForServiceWorkerReady(10000);
          assert.equal(sw.supported, true);
          assert.equal(sw.activeState, 'activated');
          const swText = fs.readFileSync(path.join(ctx.projectDir, 'sw.js'), 'utf8');
          assert.ok(swText.includes('caches.open'));
          await hb.assertZeroErrors();
        } finally {
          await hb.close();
        }
      });

      const fb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(fb, ctx.fileUrl, { clearStorage: true });
        const fileSw = await fb.eval(`({
          canUseSw: IkaiApp.Env.canUseServiceWorker(),
          hasController: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)
        })`);
        assert.equal(fileSw.canUseSw, false, 'file:// must skip ServiceWorker registration');
        assert.equal(fileSw.hasController, false);
        await fb.assertZeroErrors();
      } finally {
        await fb.close();
      }
    });

    it('T1-F01-05: capacitor.config.json ＆ 幾何学SVGアイコン（ラスターなし）', async () => {
      const capPath = path.join(ctx.projectDir, 'capacitor.config.json');
      assert.equal(fs.existsSync(capPath), true, 'capacitor.config.json must exist');
      const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
      assert.equal(cap.webDir, '.');
      assert.ok(String(cap.appName).includes('異界残響録'));

      const svgPath = path.join(ctx.projectDir, 'assets', 'icons', 'emblem.svg');
      assert.equal(fs.existsSync(svgPath), true, 'assets/icons/emblem.svg must exist');
      const svgContent = fs.readFileSync(svgPath, 'utf8');
      assert.ok(svgContent.includes('<svg') && !/<image\b/i.test(svgContent));
    });
  });

  // =========================================================================
  // F2: 上下50%分離・iPhone SafeArea・省略禁止 (5 tests)
  // =========================================================================
  describe('F2: 上下50%分離・iPhone SafeArea・省略禁止', () => {
    it('T1-F02-01: 上下50/50幾何分割（390×844）', async () => {
      await ensureBootedHttp(true);
      const audit = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(audit.ok, true, audit.violations.join('\n'));
      assert.ok(Math.abs(audit.metrics.upperRect.height - 422) <= 2);
      assert.ok(Math.abs(audit.metrics.lowerRect.top - 422) <= 2);
      assert.ok(Math.abs(audit.metrics.lowerRect.bottom - 844) <= 2);
    });

    it('T1-F02-02: 上半分操作要素ゼロ＆pointer-events:none', async () => {
      await ensureBootedHttp(false);
      const audit = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(audit.ok, true, audit.violations.join('\n'));
      await sharedBrowser.tapPoint(195, 200);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F02-03: 下半分操作完結＆水平オーバーフローゼロ', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const audit = await sharedBrowser.auditUpperLowerSplit();
        assert.equal(audit.ok, true, `Tab ${tabKey}: ${audit.violations.join('; ')}`);
      }
    });

    it('T1-F02-04: PWA SafeArea＆上部ズレ防止 CSS検証', async () => {
      const b = await CdpBrowser.launch({
        viewport: MOBILE_VIEWPORT,
        emulateSafeArea: { top: 47, bottom: 34 }
      });
      try {
        await bootIkaiApp(b, getAppUrl(), { clearStorage: true });
        const meta = await b.eval(`(() => {
          const vp = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
          const shellCs = getComputedStyle(document.querySelector('.app-shell'));
          const htmlCs = getComputedStyle(document.documentElement);
          const uCs = getComputedStyle(document.querySelector('.upper-stage'));
          const lCs = getComputedStyle(document.querySelector('.lower-deck'));
          return {
            vp,
            shellPos: shellCs.position,
            overscroll: htmlCs.overscrollBehaviorY || htmlCs.overscrollBehavior,
            upperTopPad: parseFloat(uCs.paddingTop),
            lowerBottomPad: parseFloat(lCs.paddingBottom)
          };
        })()`);
        assert.ok(meta.vp.includes('viewport-fit=cover'));
        assert.equal(meta.shellPos, 'fixed');
        assert.ok(meta.overscroll.includes('none'));
        assert.ok(meta.upperTopPad >= 47, `Expected upper paddingTop >= 47, got ${meta.upperTopPad}`);
        assert.ok(meta.lowerBottomPad >= 34, `Expected lower paddingBottom >= 34, got ${meta.lowerBottomPad}`);
        const audit = await b.auditUpperLowerSplit();
        assert.equal(audit.ok, true, audit.violations.join('; '));
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });

    it('T1-F02-05: 省略記号・・・ / ellipsis 完全ゼロ', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const res = await sharedBrowser.auditNoEllipsisAndOverflow();
        assert.equal(res.ok, true, `Tab ${tabKey}: ${JSON.stringify(res)}`);
      }
    });
  });

  // =========================================================================
  // F3: セーブ署名・スキーマ・CSP/XSS (5 tests)
  // =========================================================================
  describe('F3: セーブ署名・スキーマ・CSP/XSS', () => {
    it('T1-F03-01: HMAC-SHA256 署名付き自動保存（HTTP）', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval('IkaiApp.StateStore.update(s => { s.currencies.echoStones += 150; })');
      const saveRes = await sharedBrowser.eval('await IkaiApp.StateStore.saveNow()');
      assert.equal(saveRes?.ok, true, 'StateStore.saveNow() must succeed');
      const verified = await sharedBrowser.eval(`(async () => {
        const raw = localStorage.getItem(IkaiApp.StateStore.STORAGE_KEY);
        if (!raw) return { found: false };
        const parsed = await IkaiApp.SaveSecurity.verifyAndParse(raw);
        return { found: true, valid: Boolean(parsed?.ok), stones: parsed?.state?.currencies?.echoStones };
      })()`);
      assert.equal(verified.found, true);
      assert.equal(verified.valid, true);
      assert.equal(verified.stones, 1650);
    });

    it('T1-F03-02: file:// 非SecureContext での純粋JS HMAC署名フォールバック', async () => {
      const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT, maskCryptoSubtle: true });
      try {
        await bootIkaiApp(b, ctx.fileUrl, { clearStorage: true });
        const hasSubtle = await b.eval('Boolean(window.crypto && window.crypto.subtle)');
        assert.equal(hasSubtle, false, 'crypto.subtle must be masked for fallback test');
        const sigRes = await b.eval(`(async () => {
          const st = IkaiApp.StateStore.createInitialState();
          st.currencies.echoStones = 777;
          const signed = await IkaiApp.SaveSecurity.signState(st);
          const raw = JSON.stringify(signed);
          const verified = await IkaiApp.SaveSecurity.verifyAndParse(raw);
          return { ok: Boolean(verified?.ok), stones: verified?.state?.currencies?.echoStones, rawLen: raw.length };
        })()`);
        assert.ok(sigRes.rawLen > 20);
        assert.equal(sigRes.ok, true);
        assert.equal(sigRes.stones, 777);
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });

    it('T1-F03-03: 厳格 CSP メタタグ検証', async () => {
      const html = fs.readFileSync(ctx.indexHtmlPath, 'utf8');
      const m = html.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=["']([^"']+)["']/i);
      assert.ok(m, 'CSP meta tag must exist');
      const csp = m[1];
      assert.ok(csp.includes("default-src 'self'"));
      assert.equal(csp.includes("'unsafe-inline'"), false);
      assert.equal(csp.includes("'unsafe-eval'"), false);
    });

    it('T1-F03-04: バックアップ JSON 書き出し機能', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'settings');
      const exportBtn = await sharedBrowser.queryControl({ labelRegex: /バックアップ書出|書き出し|エクスポート/, testId: 'save-export-btn', scope: 'lower' });
      assert.equal(exportBtn.found, true, 'Save export button must exist in settings');
      await sharedBrowser.tap({ labelRegex: /バックアップ書出|書き出し|エクスポート/, testId: 'save-export-btn', scope: 'lower' });
      const uiJson = await sharedBrowser.waitFor(() => {
        const ta = document.querySelector('[data-testid="save-export-output"], [data-testid="save-import-input"], textarea.backup-textarea, #backup-json-input');
        return ta && ta.value && ta.value.trim().length > 50 ? ta.value : false;
      }, { label: 'UI backup export textarea populated' });
      const verified = await sharedBrowser.eval(`(async (txt) => {
        const v = await IkaiApp.SaveSecurity.verifyAndParse(txt);
        return {
          len: txt.length,
          ok: Boolean(v?.ok),
          schemaOk: Boolean(v?.ok && IkaiApp.SaveSecurity.validateSchema(v.state)?.ok)
        };
      })(${JSON.stringify(uiJson)})`);
      assert.ok(verified.len > 50);
      assert.equal(verified.ok, true, 'UI exported backup must verify HMAC signature');
      assert.equal(verified.schemaOk, true);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F03-05: バックアップ JSON 復元機能', async () => {
      await ensureBootedHttp(true);
      const backupJson = await sharedBrowser.eval(`(async () => {
        const st = IkaiApp.StateStore.createInitialState();
        st.currencies.echoStones = 4321;
        return await IkaiApp.SaveSecurity.exportBackup(st);
      })()`);
      await openTab(sharedBrowser, 'settings');
      const importSpec = { testId: 'save-import-input', selector: 'textarea.backup-textarea, #backup-json-input', scope: 'lower' };
      const importInput = await sharedBrowser.queryControl(importSpec);
      assert.equal(importInput.found, true, 'Backup input must exist');
      await sharedBrowser.setInputValue(importSpec, backupJson);
      await sharedBrowser.tap({ labelRegex: /復元|インポート/, testId: 'save-import-btn', scope: 'lower' });
      const stonesAfter = await sharedBrowser.waitFor(() => {
        const s = IkaiApp.StateStore.getState().currencies.echoStones;
        return s === 4321 ? s : false;
      }, { label: 'restored echoStones === 4321' });
      assert.equal(stonesAfter, 4321);
      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);
      const stonesReloaded = await sharedBrowser.eval('IkaiApp.StateStore.getState().currencies.echoStones');
      assert.equal(stonesReloaded, 4321);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F4: 状態管理・厳密3段ソート・Web Audio SE (5 tests)
  // =========================================================================
  describe('F4: 状態管理・厳密3段ソート・Web Audio SE', () => {
    it('T1-F04-01: 厳密3段ソート順（レア→ロール→五十音）', async () => {
      await ensureBootedHttp(true);
      const sortedNames = await sharedBrowser.eval(`IkaiApp.StateStore.sortUnits(IkaiApp.MasterData.CHARACTERS.slice()).map(c => c.name)`);
      assert.deepEqual(sortedNames, EXPECTED_SORT_ORDER_NAMES);

      await sharedBrowser.eval(`IkaiApp.StateStore.update(s => {
        for (const c of IkaiApp.MasterData.CHARACTERS) {
          if (!s.roster[c.id]) s.roster[c.id] = ${ROSTER_ENTRY_EXPR};
        }
      })`);
      await openTab(sharedBrowser, 'codex');
      const domOrder = await sharedBrowser.eval(`(() => {
        const expected = ${JSON.stringify(EXPECTED_SORT_ORDER_NAMES)};
        const text = document.querySelector('.lower-deck')?.innerText || '';
        return expected.map(name => ({ name, idx: text.indexOf(name) }));
      })()`);
      for (let i = 1; i < domOrder.length; i++) {
        assert.ok(domOrder[i - 1].idx > -1, `Missing char in codex: ${domOrder[i - 1].name}`);
        assert.ok(domOrder[i].idx > domOrder[i - 1].idx, `Sort violation between ${domOrder[i - 1].name} and ${domOrder[i].name}`);
      }
    });

    it('T1-F04-02: StateStore 更新と永続化・購読通知', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(async () => {
        let notified = 0;
        const unsub = IkaiApp.StateStore.subscribe(() => { notified++; });
        IkaiApp.StateStore.update(s => { s.currencies.starCoins += 500; });
        await IkaiApp.StateStore.saveNow();
        unsub();
        return { notified, coins: IkaiApp.StateStore.getState().currencies.starCoins };
      })()`);
      assert.ok(res.notified >= 1);
      assert.ok(res.coins >= 500);
      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);
      const coinsReloaded = await sharedBrowser.eval('IkaiApp.StateStore.getState().currencies.starCoins');
      assert.equal(coinsReloaded, res.coins);
    });

    it('T1-F04-03: Web Audio SE 初回タップアンロック＆再生', async () => {
      await ensureBootedHttp(true);
      const beforeTap = await sharedBrowser.eval(`(() => ({
        settings: IkaiApp.AudioSE.getSettings(),
        userActive: Boolean(navigator.userActivation && (navigator.userActivation.hasBeenActive || navigator.userActivation.isActive)),
        unlockBefore: IkaiApp.AudioSE.unlock(),
        playBefore: IkaiApp.AudioSE.play('ui_tap')
      }))()`);
      assert.equal(beforeTap.settings.supported, true, 'Web Audio API must be supported');
      assert.equal(beforeTap.settings.muted, false, 'SE must not be muted initially');
      assert.equal(beforeTap.settings.unlocked, false, 'SE must remain locked before first user gesture');
      assert.equal(beforeTap.userActive, false);
      assert.equal(beforeTap.unlockBefore, false, 'unlock() must return false before user activation');
      assert.equal(beforeTap.playBefore, false, 'play() must return false before user activation');

      await openTab(sharedBrowser, 'party');
      await sharedBrowser.waitFor(
        () => Boolean(IkaiApp.AudioSE.getSettings().unlocked),
        { timeoutMs: 5000, label: 'AudioSE unlocked after real tap' }
      );

      const afterTap = await sharedBrowser.eval(`(() => ({
        unlockRet: IkaiApp.AudioSE.unlock(),
        playTabRet: IkaiApp.AudioSE.play('ui_tab'),
        playTapRet: IkaiApp.AudioSE.play('ui_tap'),
        settings: IkaiApp.AudioSE.getSettings()
      }))()`);
      assert.equal(afterTap.unlockRet, true, 'AudioSE.unlock() must return true after user tap');
      assert.equal(afterTap.playTabRet, true, 'AudioSE.play("ui_tab") must return true when unlocked');
      assert.equal(afterTap.playTapRet, true, 'AudioSE.play("ui_tap") must return true when unlocked');
      assert.equal(afterTap.settings.supported, true);
      assert.equal(afterTap.settings.unlocked, true);
      assert.equal(afterTap.settings.muted, false);
      assert.ok(afterTap.settings.volume > 0 && afterTap.settings.volume <= 1);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F04-04: SE 消音（ミュート）トグル＆永続化', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'settings');
      await sharedBrowser.tap({ labelRegex: /消音|ミュート/, testId: 'se-mute-toggle', scope: 'lower' });
      const saveRes = await sharedBrowser.eval('await IkaiApp.StateStore.saveNow()');
      assert.equal(saveRes?.ok, true, 'StateStore.saveNow() must succeed after mute toggle');
      const mutedBefore = await sharedBrowser.eval('IkaiApp.AudioSE.getSettings().muted');
      assert.equal(mutedBefore, true);
      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);
      const mutedAfter = await sharedBrowser.eval('IkaiApp.AudioSE.getSettings().muted');
      assert.equal(mutedAfter, true);
    });

    it('T1-F04-05: SE 音量スライダー調整＆永続化', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'settings');
      const spec = {
        labelRegex: /音量|SE音量/,
        testId: 'se-volume-slider',
        selector: 'input[type="range"][aria-label*="音量"], input[type="range"][data-action="volume-range"]',
        scope: 'lower'
      };
      const slider = await sharedBrowser.queryControl(spec);
      assert.equal(slider.found, true, 'SE volume slider must exist in settings');
      await sharedBrowser.setInputValue(spec, '30');
      const saveRes = await sharedBrowser.eval('await IkaiApp.StateStore.saveNow()');
      assert.equal(saveRes?.ok, true, 'StateStore.saveNow() must succeed after volume change');
      const volBefore = await sharedBrowser.eval('IkaiApp.AudioSE.getSettings().volume');
      assert.ok(Math.abs(volBefore - 0.3) < 0.05);
      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);
      const volAfter = await sharedBrowser.eval('IkaiApp.AudioSE.getSettings().volume');
      assert.ok(Math.abs(volAfter - 0.3) < 0.05);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F5: 完全マスタデータ（大ボリューム） (5 tests)
  // =========================================================================
  describe('F5: 完全マスタデータ（大ボリューム）', () => {
    it('T1-F05-01: 本編 5エリア × 6ステージ × 5WAVE 構成', async () => {
      await ensureBootedHttp(false);
      const areas = await sharedBrowser.eval(`IkaiApp.MasterData.AREAS.map(a => ({
        id: a.id, name: a.name, stages: a.stages.length,
        wavesPerStage: a.stages.map(s => s.waves.length)
      }))`);
      assert.ok(areas.length >= 5, `Expected >= 5 areas, got ${areas.length}`);
      let totalWaves = 0;
      for (const a of areas) {
        assert.equal(a.stages, 6, `Area ${a.name} must have 6 stages`);
        for (const wc of a.wavesPerStage) {
          assert.equal(wc, 5, 'Every stage must have 5 waves');
          totalWaves += wc;
        }
      }
      assert.ok(totalWaves >= 150);
    });

    it('T1-F05-02: プレイアブル20体・全ロール・かな読み完備', async () => {
      await ensureBootedHttp(false);
      const chars = await sharedBrowser.eval('IkaiApp.MasterData.CHARACTERS');
      assert.equal(chars.length, 20);
      const roles = new Set(chars.map((c) => c.role));
      assert.equal(roles.size, 4);
      for (const c of chars) {
        assert.ok(c.name && c.name.length >= 2);
        assert.ok(c.kana && c.kana.length >= 2, `Missing kana for ${c.name}`);
      }
    });

    it('T1-F05-03: 収集技18種（R/SR/SSR × 単体/範囲/全体）', async () => {
      await ensureBootedHttp(false);
      const skills = await sharedBrowser.eval('IkaiApp.MasterData.SKILLS');
      assert.ok(skills.length >= 18, `Expected >=18 collectible skills, got ${skills.length}`);
      const rarities = new Set(skills.map((s) => s.rarity));
      const targets = new Set(skills.map((s) => s.targetType));
      assert.deepEqual([...rarities].sort(), ['R', 'SR', 'SSR']);
      assert.ok(targets.has('単体') && targets.has('範囲') && targets.has('全体'));
    });

    it('T1-F05-04: 装備4部位 × 6セット効果 × 5品質ランク', async () => {
      await ensureBootedHttp(false);
      const data = await sharedBrowser.eval(`({
        equips: IkaiApp.MasterData.EQUIPS.length,
        slots: [...new Set(IkaiApp.MasterData.EQUIPS.map(e => e.slot))],
        sets: IkaiApp.MasterData.SETS.length,
        qualities: IkaiApp.MasterData.QUALITY_RANKS.length
      })`);
      assert.equal(data.slots.length, 4);
      assert.ok(data.sets >= 6);
      assert.equal(data.qualities, 5);
    });

    it('T1-F05-05: 大ボリューム他マスタ（討伐3×3・試練5・バナー4・調査4）', async () => {
      await ensureBootedHttp(false);
      const data = await sharedBrowser.eval(`({
        raids: IkaiApp.MasterData.RAID_BOSSES.length,
        trials: IkaiApp.MasterData.TRIALS.length,
        banners: IkaiApp.MasterData.BANNERS.length,
        zones: IkaiApp.MasterData.EXPEDITION_ZONES.length,
        shop: IkaiApp.MasterData.CRYSTAL_SHOP_ITEMS.length
      })`);
      assert.ok(data.raids >= 3);
      assert.ok(data.trials >= 5);
      assert.ok(data.banners >= 4);
      assert.ok(data.zones >= 4);
      assert.ok(data.shop >= 3);
    });
  });

  // =========================================================================
  // F6: 速度タイムライン戦闘・戦術AI・下半分介入 (5 tests)
  // =========================================================================
  describe('F6: 速度タイムライン戦闘・戦術AI・下半分介入', () => {
    it('T1-F06-01: 4人自由編成（同ロール重複可含む）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'party');
      const res = await sharedBrowser.eval(`(() => {
        // ディーラー2名＋サポーター2名の同ロール重複4人編成
        const dealers = IkaiApp.MasterData.CHARACTERS.filter(c => c.role === 'ディーラー').slice(0, 2);
        const sups = IkaiApp.MasterData.CHARACTERS.filter(c => c.role === 'サポーター').slice(0, 2);
        const chars = [...dealers, ...sups];
        const ids = chars.map(c => c.id);
        IkaiApp.StateStore.update(s => {
          for (const id of ids) if (!s.roster[id]) s.roster[id] = ${ROSTER_ENTRY_EXPR};
          s.party = ids;
        });
        const schemaOk = IkaiApp.SaveSecurity.validateSchema(IkaiApp.StateStore.getState()).ok;
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        return { len: IkaiApp.StateStore.getState().party.length, schemaOk, names: chars.map(c => c.name) };
      })()`);
      assert.equal(res.len, 4);
      assert.equal(res.schemaOk, true);
      const snap = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'dup-role battle start' });
      assert.equal(snap.allies.length, 4);
      const upperTxt = await sharedBrowser.eval(`document.querySelector('.upper-stage')?.innerText || ''`);
      for (const n of res.names) {
        assert.ok(upperTxt.includes(n), `Missing ally name in upper-stage: ${n}`);
      }
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F06-02: 速度ゲージタイムライン進行（フルオート）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
      const snap1 = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'combat snapshot' });
      assert.ok(snap1);
      const stepped = await sharedBrowser.eval('Boolean(IkaiApp.CombatEngine.step(800) && IkaiApp.CombatEngine.step(800))');
      assert.equal(stepped, true, 'CombatEngine.step must return snapshot');
      const snap2 = await sharedBrowser.eval('IkaiApp.CombatEngine.getSnapshot()');
      assert.notDeepEqual(snap1, snap2);
      const progressed =
        (snap2.elapsedMs || 0) > (snap1.elapsedMs || 0) ||
        (snap2.turnCount || 0) > (snap1.turnCount || 0) ||
        (snap2.logs?.length || 0) > (snap1.logs?.length || 0);
      assert.equal(progressed, true, 'CombatEngine.step must advance elapsedMs/turnCount/logs');
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F06-03: 事前戦術AI設定（作戦・目標優先・技優先度）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'party');
      const policySpec = {
        labelRegex: /作戦方針|作戦/,
        testId: 'tactic-policy-select',
        selector: 'select[data-testid="tactic-policy-select"], select[data-tactic="policy"]',
        scope: 'lower'
      };
      const policySel = await sharedBrowser.queryControl(policySpec);
      assert.equal(policySel.found, true, 'Tactic policy <select> must exist in party tab');
      await sharedBrowser.selectValue(policySpec, /防御|defensive/);

      const targetSpec = {
        labelRegex: /目標方針|ターゲット/,
        testId: 'tactic-target-select',
        selector: 'select[data-testid="tactic-target-select"], select[data-tactic="target"]',
        scope: 'lower'
      };
      const targetSel = await sharedBrowser.queryControl(targetSpec);
      assert.equal(targetSel.found, true, 'Tactic target <select> must exist in party tab');
      await sharedBrowser.selectValue(targetSpec, /ボス|boss_first/);

      const savedTactic = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.getState();
        return st.roster[st.party[0]].tactic;
      })()`);
      assert.equal(savedTactic.policy, 'defensive');
      assert.equal(savedTactic.target, 'boss_first');
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F06-04: 戦闘中・下半分からの戦術介入（作戦/目標/倍速）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'battle active' });
      const spdSpec = { labelRegex: /×1|×2|×3|倍速/, testId: 'battle-speed-btn', scope: 'lower' };
      const spdBtn = await sharedBrowser.queryControl(spdSpec);
      assert.equal(spdBtn.found, true, 'Speed button must be in lower deck');
      assert.ok(spdBtn.rect.top >= 421, 'Speed button must be in lower 50%');
      const speedBefore = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.battleSpeed');
      await sharedBrowser.tap(spdSpec);
      const speedAfter = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.battleSpeed');
      const spdBtnAfter = await sharedBrowser.queryControl(spdSpec);
      assert.ok(
        speedAfter !== speedBefore || spdBtnAfter.text !== spdBtn.text,
        `Battle speed must change on tap (${speedBefore} -> ${speedAfter})`
      );
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F06-05: 戦闘中「切り札予約」トグル発動', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'battle active' });
      const trumpSpec = { labelRegex: /切り札|予約/, testId: 'trump-reserve-btn', scope: 'lower' };
      const trumpBtn = await sharedBrowser.queryControl(trumpSpec);
      assert.equal(trumpBtn.found, true, 'Trump reserve button must exist in lower deck');
      assert.ok(trumpBtn.rect.top >= 421, 'Trump reserve button must be in lower 50%');
      await sharedBrowser.tap(trumpSpec);
      const afterTap = await sharedBrowser.eval(`(() => {
        const snap = IkaiApp.CombatEngine.getSnapshot();
        const reserved = snap.allies.some(a => Boolean(a.reservedSkillId)) || Boolean(snap.reservedSkill);
        for (let i = 0; i < 6; i++) IkaiApp.CombatEngine.step(800);
        const snap2 = IkaiApp.CombatEngine.getSnapshot();
        return { reserved, logsLen: (snap2.logs || []).length };
      })()`);
      assert.equal(afterTap.reserved, true, 'Tapping trump button must reserve a skill in CombatEngine');
      assert.ok(afterTap.logsLen >= 1);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F7: ボス明示・敵固有技・ハイブリッド技実行 (5 tests)
  // =========================================================================
  describe('F7: ボス明示・敵固有技・ハイブリッド技実行', () => {
    it('T1-F07-01: Stage 3 中ボス大型枠＆技予告バー表示', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 2, startWave: 4 })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'stage 1-3 boss wave' });
      const bossUi = await sharedBrowser.eval(`(() => {
        const upper = document.querySelector('.upper-stage')?.innerText || '';
        const hasBossPlate = Boolean(document.querySelector('[data-testid="boss-plate"], .boss-plate'));
        const hasTelegraph = Boolean(document.querySelector('[data-testid="boss-telegraph"], .boss-telegraph'));
        return { upper, hasBossPlate, hasTelegraph };
      })()`);
      assert.ok(bossUi.hasBossPlate || bossUi.upper.includes('九十九') || bossUi.upper.includes('ボス'));
      assert.ok(bossUi.hasTelegraph || bossUi.upper.includes('予告') || bossUi.upper.includes('遮断'));
    });

    it('T1-F07-02: Stage 6 エリアボス大型枠＆技予告バー表示', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 5, startWave: 4 })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'stage 1-6 boss wave' });
      const bossUi = await sharedBrowser.eval(`(() => {
        const upper = document.querySelector('.upper-stage')?.innerText || '';
        const hasBossPlate = Boolean(document.querySelector('[data-testid="boss-plate"], .boss-plate'));
        const hasTelegraph = Boolean(document.querySelector('[data-testid="boss-telegraph"], .boss-telegraph'));
        return { upper, hasBossPlate, hasTelegraph };
      })()`);
      assert.ok(bossUi.hasBossPlate || bossUi.upper.includes('白無垢') || bossUi.upper.includes('ボス'));
      assert.ok(bossUi.hasTelegraph || bossUi.upper.includes('予告') || bossUi.upper.includes('終電'));
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F07-03: 通常敵およびボスの固有技発動', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'normal enemy battle' });
      const normalRes = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 20; i++) {
          IkaiApp.CombatEngine.step(600);
          const s = IkaiApp.CombatEngine.getSnapshot();
          const taken = s.dps?.taken || (s.allies || []).reduce((acc, a) => acc + (a.dps?.damageTaken || 0), 0);
          if (taken > 0) return { taken };
        }
        const s = IkaiApp.CombatEngine.getSnapshot();
        return { taken: s.dps?.taken || 0 };
      })()`);
      assert.ok(normalRes.taken > 0, `Normal enemy battle must deal damage > 0, got ${normalRes.taken}`);

      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 2, startWave: 4 })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'boss battle' });
      const bossRes = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 25; i++) {
          IkaiApp.CombatEngine.step(600);
          const s = IkaiApp.CombatEngine.getSnapshot();
          const taken = s.dps?.taken || (s.allies || []).reduce((acc, a) => acc + (a.dps?.damageTaken || 0), 0);
          const logText = (s.logs || []).map(l => typeof l === 'string' ? l : (l.text || l.skillName || '')).join(' ');
          if (taken > 0 && (logText.includes('遮断の赤鐘') || logText.includes('無音の警報') || logText.includes('九十九'))) {
            return { taken, matchedSkill: true };
          }
        }
        const s = IkaiApp.CombatEngine.getSnapshot();
        return { taken: s.dps?.taken || 0, matchedSkill: false };
      })()`);
      assert.ok(bossRes.taken > 0, `Boss battle damageTaken must be > 0, got ${bossRes.taken}`);
      assert.equal(bossRes.matchedSkill, true, 'Boss unique skill must appear in combat logs');
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F07-04: キャラ固有技＆固有特性の自動発動', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          s.roster.char_minase_shiori = ${ROSTER_ENTRY_EXPR};
          s.party = ['char_minase_shiori', ...s.party.filter(id => id && id !== 'char_minase_shiori').slice(0, 3)];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      const snap0 = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'trait battle' });
      assert.equal(snap0.allies.length, 4);
      assert.equal(
        snap0.allies.every((a) => (a.gauge ?? a.atb ?? 0) >= 20),
        true,
        'Shiori onBattleStart trait must grant +20% initial gauge to all allies'
      );
      const after = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 12; i++) IkaiApp.CombatEngine.step(600);
        const s = IkaiApp.CombatEngine.getSnapshot();
        return { elapsedMs: s.elapsedMs || 0, logsLen: (s.logs || []).length };
      })()`);
      assert.ok(after.elapsedMs > 0 && after.logsLen >= 1);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F07-05: 付け替え収集技（単体・範囲・全体）の装備と発動', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          const ids = ['sk_r_kiriharai', 'sk_r_soutou', 'sk_r_shogekiha'];
          for (const sid of ids) {
            if (!s.skillInventory[sid]) s.skillInventory[sid] = { ownedCount: 1, rank: 1, uses: 0 };
          }
          s.roster[s.party[0]].skills = ['sk_r_kiriharai', null];
          s.roster[s.party[1]].skills = ['sk_r_soutou', null];
          s.roster[s.party[2]].skills = ['sk_r_shogekiha', null];
          for (let i = 0; i < 3; i++) s.roster[s.party[i]].tactic.skillPriority = 'collect_first';
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        const before = {
          single: IkaiApp.StateStore.getState().skillInventory.sk_r_kiriharai.uses,
          range: IkaiApp.StateStore.getState().skillInventory.sk_r_soutou.uses,
          all: IkaiApp.StateStore.getState().skillInventory.sk_r_shogekiha.uses
        };
        for (let i = 0; i < 60; i++) {
          const r = IkaiApp.CombatEngine.step(1000);
          if (r?.finished || IkaiApp.CombatEngine.getSnapshot()?.finished) break;
        }
        const inv = IkaiApp.StateStore.getState().skillInventory;
        return {
          before,
          after: { single: inv.sk_r_kiriharai.uses, range: inv.sk_r_soutou.uses, all: inv.sk_r_shogekiha.uses }
        };
      })()`);
      assert.ok(res.after.single > res.before.single, '単体 collectible skill must execute and increment uses');
      assert.ok(res.after.range > res.before.range, '範囲 collectible skill must execute and increment uses');
      assert.ok(res.after.all > res.before.all, '全体 collectible skill must execute and increment uses');
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F8: タクティカル戦場＆4項目DPSメーター (5 tests)
  // =========================================================================
  describe('F8: タクティカル戦場＆4項目DPSメーター', () => {
    it('T1-F08-01: 行動順バーの表示と動的更新', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      await sharedBrowser.waitFor(() => document.querySelector('[data-testid="battle-timeline"], .battle-timeline'));
      const before = await sharedBrowser.eval(`({
        txt: document.querySelector('[data-testid="battle-timeline"], .battle-timeline')?.innerText || '',
        snap: IkaiApp.CombatEngine.getSnapshot()
      })`);
      assert.ok(before.txt.length > 0);
      const stepped = await sharedBrowser.eval('Boolean(IkaiApp.CombatEngine.step(1200))');
      assert.equal(stepped, true);
      const after = await sharedBrowser.eval(`({
        txt: document.querySelector('[data-testid="battle-timeline"], .battle-timeline')?.innerText || '',
        snap: IkaiApp.CombatEngine.getSnapshot()
      })`);
      assert.ok(
        after.txt !== before.txt || JSON.stringify(after.snap.timeline) !== JSON.stringify(before.snap.timeline),
        'Timeline bar must dynamically update after stepping combat'
      );
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F08-02: 味方4人プレート必須構成要素の検証', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      const snap = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      for (let i = 0; i < 5; i++) {
        const ok = await sharedBrowser.eval('Boolean(IkaiApp.CombatEngine.step(600))');
        assert.equal(ok, true);
      }
      const check = await sharedBrowser.eval(`(() => {
        const upper = document.querySelector('.upper-stage');
        const svgs = upper ? upper.querySelectorAll('svg').length : 0;
        const rarityFrames = upper ? upper.querySelectorAll('.rarity-SSR, .rarity-SR, .rarity-R').length : 0;
        const gauges = upper ? upper.querySelectorAll('[class*="hp"], [class*="gauge"], [class*="bar"]').length : 0;
        const text = upper ? upper.innerText : '';
        return { svgs, rarityFrames, gauges, text };
      })()`);
      assert.ok(check.svgs >= 4, `Expected >=4 role SVG emblems, got ${check.svgs}`);
      assert.ok(check.rarityFrames >= 4, `Expected >=4 rarity frames, got ${check.rarityFrames}`);
      assert.ok(check.gauges >= 4, `Expected >=4 HP/action gauge elements, got ${check.gauges}`);
      for (const ally of snap.allies) {
        assert.ok(check.text.includes(ally.name), `Missing ally full name in upper stage: ${ally.name}`);
      }
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F08-03: 戦闘中4項目同時表示 DPS メーター', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      for (let i = 0; i < 5; i++) {
        const ok = await sharedBrowser.eval('Boolean(IkaiApp.CombatEngine.step(600))');
        assert.equal(ok, true);
      }
      const res = await sharedBrowser.eval(`(() => {
        const upperText = document.querySelector('.upper-stage')?.innerText || '';
        const snap = IkaiApp.CombatEngine.getSnapshot();
        return { upperText, dealt: snap.dps?.dealt || 0 };
      })()`);
      for (const label of ['与ダメージ', '被ダメージ', '回復量', '被回復量']) {
        assert.ok(res.upperText.includes(label), `Combat DPS meter missing label: ${label}`);
      }
      assert.ok(res.dealt > 0, `Expected non-zero DPS dealt after 3000ms, got ${res.dealt}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F08-04: DPS メーターのぬるぬるアニメーション CSS', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      await sharedBrowser.waitFor(() => document.querySelector('[data-testid="dps-meter"], .dps-meter'));
      const anim = await sharedBrowser.eval(`(() => {
        const meter = document.querySelector('[data-testid="dps-meter"], .dps-meter');
        const bars = meter ? [...meter.querySelectorAll('[class*="bar"], [class*="fill"], .meter-fill, [data-dps-bar]')] : [];
        return bars.map(el => {
          const cs = getComputedStyle(el);
          return { prop: cs.transitionProperty, dur: cs.transitionDuration };
        });
      })()`);
      assert.ok(anim.length >= 4, `Expected >=4 DPS bar elements inside dps-meter, got ${anim.length}`);
      const hasAnimated = anim.some((a) => (a.prop.includes('width') || a.prop.includes('transform')) && parseFloat(a.dur) > 0);
      assert.equal(hasAnimated, true, `Expected animated CSS transition on DPS bars: ${JSON.stringify(anim)}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F08-05: リザルト画面での4項目 DPS メーター表示', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.finished, true);
      const res = await sharedBrowser.eval(`({
        text: document.querySelector('[data-testid="dps-meter-result"], .upper-stage, .lower-deck')?.innerText || '',
        dealt: IkaiApp.CombatEngine.getSnapshot()?.dps?.dealt || 0
      })`);
      for (const label of ['与ダメージ', '被ダメージ', '回復量', '被回復量']) {
        assert.ok(res.text.includes(label), `Result DPS missing label: ${label}`);
      }
      assert.ok(res.dealt > 0);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F9: 装備品質・合成昇格天井・一括/自動売却 (5 tests)
  // =========================================================================
  describe('F9: 装備品質・合成昇格天井・一括/自動売却', () => {
    it('T1-F09-01: 装備着脱と固定性能・品質倍率反映', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const qRanks = IkaiApp.MasterData.QUALITY_RANKS;
        const mults = qRanks.map(q => q.multiplier);
        const tpl = IkaiApp.MasterData.EQUIP_MAP.eq_zankyo_main;
        IkaiApp.StateStore.update(s => {
          s.equips.push(
            { uid: 'f9_q0', equipId: tpl.id, qualityIdx: 0, locked: false },
            { uid: 'f9_q4', equipId: tpl.id, qualityIdx: 4, locked: false }
          );
          s.roster[s.party[0]].equipped[tpl.slot] = 'f9_q0';
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const atk0 = IkaiApp.CombatEngine.getSnapshot().allies[0].atk;
        IkaiApp.StateStore.update(s => {
          s.roster[s.party[0]].equipped[tpl.slot] = 'f9_q4';
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const atk4 = IkaiApp.CombatEngine.getSnapshot().allies[0].atk;
        return { qLen: qRanks.length, mults, atk0, atk4 };
      })()`);
      assert.equal(res.qLen, 5);
      assert.deepEqual(res.mults, [1.0, 1.15, 1.32, 1.52, 1.75]);
      assert.ok(res.atk4 - res.atk0 >= 65, `Expected 極 weapon ATK boost >= 65, got ${res.atk0} -> ${res.atk4}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F09-02: 2セット＆4セット効果の発動', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const sets = IkaiApp.MasterData.SETS;
        const eqs = IkaiApp.MasterData.EQUIPS.filter(e => e.setId === 'set_zankyo');
        IkaiApp.StateStore.update(s => {
          const cid = s.party[0];
          s.roster[cid].awakening = 3;
          s.roster[cid].equipped = { '主器': null, '護符': null, '装具': null, '印章': null };
          eqs.forEach((tpl, i) => {
            s.equips.push({ uid: 'f9s_' + i, equipId: tpl.id, qualityIdx: 0, locked: false });
          });
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const s0 = IkaiApp.CombatEngine.getSnapshot().allies[0];
        IkaiApp.StateStore.update(s => {
          const cid = s.party[0];
          s.roster[cid].equipped['護符'] = 'f9s_1';
          s.roster[cid].equipped['装具'] = 'f9s_2';
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const s2 = IkaiApp.CombatEngine.getSnapshot().allies[0];
        IkaiApp.StateStore.update(s => {
          const cid = s.party[0];
          s.roster[cid].equipped['主器'] = 'f9s_0';
          s.roster[cid].equipped['印章'] = 'f9s_3';
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const s4 = IkaiApp.CombatEngine.getSnapshot().allies[0];
        return {
          setsLen: sets.length,
          atk0: s0.atk,
          atk2: s2.atk,
          crit2: s2.crit,
          crit4: s4.crit,
          critDmg2: s2.critDmg,
          critDmg4: s4.critDmg
        };
      })()`);
      assert.ok(res.setsLen >= 6);
      assert.ok(res.atk2 > res.atk0, `2-set ATK+18% must raise ATK (${res.atk0} -> ${res.atk2})`);
      assert.ok(res.crit4 >= res.crit2 + 15, `4-set crit+15% must apply (${res.crit2} -> ${res.crit4})`);
      assert.ok(res.critDmg4 >= res.critDmg2 + 30, `4-set critDmg+30% must apply (${res.critDmg2} -> ${res.critDmg4})`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F09-03: 同種装備合成と失敗時天井蓄積・確定昇格', async () => {
      await ensureBootedHttp(true);
      const synthRes = await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIPS[0];
        let st = IkaiApp.StateStore.createInitialState();
        for (let i = 0; i < 6; i++) {
          st.equips.push({ uid: 'eq_test_' + i, equipId: tpl.id, qualityIdx: 0, locked: false });
        }
        const currentUid = 'eq_test_0';
        for (let i = 1; i <= 4; i++) {
          const out = IkaiApp.Progression.synthesizeEquip(st, currentUid, 'eq_test_' + i);
          st = out.state || out;
          const target = st.equips.find(e => e.uid === currentUid);
          if (target && target.qualityIdx >= 1) return { promoted: true, qualityIdx: target.qualityIdx, step: i };
        }
        return { promoted: false };
      })()`);
      assert.equal(synthRes.promoted, true, 'Same-equip synthesis must guarantee promotion within pity ceiling');
    });

    it('T1-F09-04: 品質指定の一括売却機能', async () => {
      await ensureBootedHttp(true);
      const sellRes = await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIPS[0];
        let st = IkaiApp.StateStore.createInitialState();
        const beforeCoins = st.currencies.starCoins;
        st.equips.push(
          { uid: 'bulk_1', equipId: tpl.id, qualityIdx: 0, locked: false },
          { uid: 'bulk_2', equipId: tpl.id, qualityIdx: 0, locked: false }
        );
        const out = IkaiApp.Progression.bulkSellEquips(st, 0);
        const next = out.state || out;
        return {
          afterCoins: next.currencies.starCoins,
          beforeCoins,
          remaining: next.equips.filter(e => e.uid.startsWith('bulk_')).length
        };
      })()`);
      assert.equal(sellRes.remaining, 0);
      assert.ok(sellRes.afterCoins > sellRes.beforeCoins);
    });

    it('T1-F09-05: リザルト連動の自動売却設定', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'settings');
      const autoSellSpec = {
        labelRegex: /自動売却/,
        testId: 'equip-auto-sell',
        selector: 'select[data-testid="equip-auto-sell"], select[data-action="auto-sell"]',
        scope: 'lower'
      };
      const autoSellCtrl = await sharedBrowser.queryControl(autoSellSpec);
      assert.equal(autoSellCtrl.found, true, 'Auto-sell <select> must exist in settings');
      await sharedBrowser.selectValue(autoSellSpec, /並/);
      const settingVal = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.autoSellMaxQualityIdx');
      assert.equal(settingVal, 0);
      const before = await sharedBrowser.eval('({ eq: IkaiApp.StateStore.getState().equips.filter(e => e.qualityIdx === 0).length, coins: IkaiApp.StateStore.getState().currencies.starCoins })');
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true);
      const after = await sharedBrowser.eval('({ eq: IkaiApp.StateStore.getState().equips.filter(e => e.qualityIdx === 0).length, coins: IkaiApp.StateStore.getState().currencies.starCoins })');
      assert.equal(after.eq <= before.eq, true, 'Auto-sell must not retain newly dropped 並 equipment');
      assert.ok(after.coins > before.coins);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F10: やり込み育成＆自動周回 (5 tests)
  // =========================================================================
  describe('F10: やり込み育成＆自動周回', () => {
    it('T1-F10-01: 紋章ボード（第1層ノード選択解放）', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.currencies.emblemShards = 999;
        const out = IkaiApp.Progression.unlockEmblemNode(st, cid, 1);
        const next = out.state || out;
        return { nodes: next.roster[cid].emblemNodes, shards: next.currencies.emblemShards };
      })()`);
      assert.equal(res.nodes.includes(1), true);
      assert.equal(res.shards, 989);
    });

    it('T1-F10-02: 覚醒1〜3段階による枠＆上限拡張', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.roster[cid].shards = 99;
        for (let i = 0; i < 3; i++) {
          const out = IkaiApp.Progression.awakenCharacter(st, cid);
          st = out.state || out;
        }
        return { awakening: st.roster[cid].awakening, shards: st.roster[cid].shards };
      })()`);
      assert.equal(res.awakening, 3);
      assert.equal(res.shards, 93);
    });

    it('T1-F10-03: 技熟練度（Rank 1〜5）の昇格（熟練の書）', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const sid = Object.keys(st.skillInventory)[0];
        st.skillInventory[sid].uses = 10;
        st.currencies.masteryBooks = 99;
        const out = IkaiApp.Progression.upgradeSkillMastery(st, sid);
        const next = out.state || out;
        return { rank: next.skillInventory[sid].rank, books: next.currencies.masteryBooks };
      })()`);
      assert.equal(res.rank, 2);
      assert.equal(res.books, 97);
    });

    it('T1-F10-04: 戦闘使用による技熟練度経験蓄積', async () => {
      await ensureBootedHttp(true);
      const before = await sharedBrowser.eval(`(() => {
        const sid = 'sk_r_kiriharai';
        IkaiApp.StateStore.update(s => {
          if (!s.skillInventory[sid]) s.skillInventory[sid] = { ownedCount: 1, rank: 1, uses: 0 };
          s.roster[s.party[0]].skills = [sid, null];
          s.roster[s.party[0]].tactic.skillPriority = 'collect_first';
        });
        return IkaiApp.StateStore.getState().skillInventory[sid].uses;
      })()`);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      await runBattleToCompletion(sharedBrowser);
      const after = await sharedBrowser.eval(`IkaiApp.StateStore.getState().skillInventory.sk_r_kiriharai.uses`);
      assert.ok(after > before, `Expected skill uses to increase after battle (${before} -> ${after})`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F10-05: 自動周回トグル（回数指定・連続周回）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      const spec = { labelRegex: /自動周回/, testId: 'auto-repeat-toggle', scope: 'lower' };
      const toggle = await sharedBrowser.queryControl(spec);
      assert.equal(toggle.found, true, 'Auto-repeat toggle must exist in lower deck');
      const beforeCount = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.autoRepeatCount');
      await sharedBrowser.tap(spec);
      const afterOn = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.autoRepeatCount');
      assert.ok(afterOn > beforeCount && afterOn > 0, `Expected autoRepeatCount > 0 after toggle, got ${afterOn}`);
      await sharedBrowser.tap(spec);
      const afterOff = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.autoRepeatCount');
      assert.equal(afterOff, 0, `Expected autoRepeatCount === 0 on second toggle, got ${afterOff}`);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F11: PvE 4本柱コンテンツ (5 tests)
  // =========================================================================
  describe('F11: PvE 4本柱コンテンツ', () => {
    it('T1-F11-01: ① 本編異界エリア進行＆ステージ解放', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      const mainSpec = { labelRegex: /本編|異界エリア/, testId: 'pve-pillar-main', scope: 'lower' };
      const mainBtn = await sharedBrowser.queryControl(mainSpec);
      assert.equal(mainBtn.found, true);
      await sharedBrowser.tap(mainSpec);
      await sharedBrowser.tap({ labelRegex: /1-1|終電後の改札/, testId: 'stage-select-1-1', scope: 'lower' });
      await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true);
      const cleared = await sharedBrowser.eval(`IkaiApp.StateStore.getState().progress.clearedStages`);
      assert.equal(cleared.includes('1-1'), true);
      await openTab(sharedBrowser, 'sortie');
      const stage12 = await sharedBrowser.queryControl({ labelRegex: /1-2|霧に沈む/, testId: 'stage-select-1-2', scope: 'lower' });
      assert.equal(stage12.found, true);
      assert.equal(stage12.disabled, false, 'Stage 1-2 must unlock after clearing 1-1');
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F11-02: ② 無限深淵の階層踏破＆最深記録更新', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      const abyssSpec = { labelRegex: /無限深淵/, testId: 'pve-pillar-abyss', scope: 'lower' };
      const abyssBtn = await sharedBrowser.queryControl(abyssSpec);
      assert.equal(abyssBtn.found, true);
      await sharedBrowser.tap(abyssSpec);
      await sharedBrowser.tap({ labelRegex: /出撃開始|挑む|深淵/, testId: ['start-battle-btn', 'sortie-start-btn', 'abyss-start-btn'], scope: 'lower' });
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true);
      const maxFloor = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.abyssMaxFloor');
      assert.ok(maxFloor >= 1, `Expected abyssMaxFloor >= 1, got ${maxFloor}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F11-03: ③ 異界討伐（単体レイドボス戦）出撃＆クリア', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          for (const cid of s.party) {
            s.roster[cid].awakening = 3;
            s.roster[cid].emblemNodes = [1, 2, 3, 4, 5, 6];
          }
        });
      })()`);
      await openTab(sharedBrowser, 'sortie');
      const raidSpec = { labelRegex: /異界討伐/, testId: 'pve-pillar-raid', scope: 'lower' };
      const raidBtn = await sharedBrowser.queryControl(raidSpec);
      assert.equal(raidBtn.found, true);
      await sharedBrowser.tap(raidSpec);
      await sharedBrowser.tap({ labelRegex: /出撃開始|討伐開始|挑む/, testId: ['start-battle-btn', 'sortie-start-btn', 'raid-start-btn'], scope: 'lower' });
      const fin = await runBattleToCompletion(sharedBrowser, { maxSteps: 120 });
      assert.equal(fin.victory, true);
      const raidRes = await sharedBrowser.eval(`({
        cleared: IkaiApp.StateStore.getState().progress.raidCleared,
        upper: document.querySelector('.upper-stage')?.innerText || ''
      })`);
      assert.ok(Object.keys(raidRes.cleared).length >= 1, 'Raid clear must be recorded');
      assert.ok(raidRes.upper.includes('与ダメージ') && raidRes.upper.includes('被回復量'));
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F11-04: ④ 制約試練（条件準拠編成での出撃＆クリア）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      const trialSpec = { labelRegex: /制約試練/, testId: 'pve-pillar-trial', scope: 'lower' };
      const trialBtn = await sharedBrowser.queryControl(trialSpec);
      assert.equal(trialBtn.found, true);
      await sharedBrowser.tap(trialSpec);
      await sharedBrowser.tap({ labelRegex: /出撃開始|試練開始|挑む/, testId: ['start-battle-btn', 'sortie-start-btn', 'trial-start-btn'], scope: 'lower' });
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true);
      const trialsCleared = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.trialsCleared');
      assert.equal(trialsCleared.includes('trial_1'), true);
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F11-05: 4本柱ナビゲーション統合', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'sortie');
      const lowerText = await sharedBrowser.eval(`document.querySelector('.lower-deck')?.innerText || ''`);
      for (const pillar of ['本編', '無限深淵', '異界討伐', '制約試練']) {
        assert.ok(lowerText.includes(pillar), `Missing PvE pillar label: ${pillar}`);
      }
    });
  });

  // =========================================================================
  // F12: 買い切り召喚＆余剰キャラ3系統 (5 tests)
  // =========================================================================
  describe('F12: 買い切り召喚＆余剰キャラ3系統', () => {
    it('T1-F12-01: 買い切り召喚（単発・10連・残響石消費）', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval('IkaiApp.StateStore.update(s => { s.currencies.echoStones = 3000; })');
      await openTab(sharedBrowser, 'summon');
      const btn10 = await sharedBrowser.queryControl({ labelRegex: /10回召喚|10連/, testId: 'summon-pull-10', scope: 'lower' });
      assert.equal(btn10.found, true);
      await sharedBrowser.tap({ labelRegex: /10回召喚|10連/, testId: 'summon-pull-10', scope: 'lower' });
      const st = await sharedBrowser.eval('({ stones: IkaiApp.StateStore.getState().currencies.echoStones, pity: IkaiApp.StateStore.getState().summon.pityCount })');
      assert.equal(st.stones, 1500);
      assert.ok(Number.isInteger(st.pity) && st.pity > -1 && st.pity <= 10);
    });

    it('T1-F12-02: ピックアップバナー切替＆80連天井カウント', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'summon');
      const bannerSpec = {
        labelRegex: /バナー|召喚切替|ピックアップ/,
        testId: 'summon-banner-select',
        selector: 'select[data-testid="summon-banner-select"], select[data-action="select-banner"]',
        scope: 'lower'
      };
      const bannerSel = await sharedBrowser.queryControl(bannerSpec);
      assert.equal(bannerSel.found, true);
      await sharedBrowser.selectValue(bannerSpec, /紫電|banner_pu_2/);
      const res = await sharedBrowser.eval(`({
        selected: IkaiApp.StateStore.getState().summon.selectedBannerId,
        count: IkaiApp.MasterData.BANNERS.length,
        txt: document.querySelector('.lower-deck')?.innerText || ''
      })`);
      assert.ok(res.count >= 4);
      assert.equal(res.selected, 'banner_pu_2');
      assert.ok(res.txt.includes('九条') || res.txt.includes('紫電'));
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F12-03: 余剰系統① 異界調査（派遣＆戦闘回数進行）', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const bench = IkaiApp.MasterData.CHARACTERS.find(c => !st.party.includes(c.id));
        st.roster[bench.id] = ${ROSTER_ENTRY_EXPR};
        const started = IkaiApp.Progression.startExpedition(st, IkaiApp.MasterData.EXPEDITION_ZONES[0].id, [bench.id]);
        st = started.state || started;
        const adv = IkaiApp.Progression.advanceExpeditionsOnBattle(st);
        st = adv.state || adv;
        return { slots: st.expeditions };
      })()`);
      assert.ok(Array.isArray(res.slots) && res.slots.length >= 1);
      assert.equal(res.slots[0].battlesDone, 1);
    });

    it('T1-F12-04: 余剰系統② 共鳴支援4枠の編成とステータス反映', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const defBefore = IkaiApp.CombatEngine.getSnapshot().allies[0].def;
        let st = IkaiApp.StateStore.getState();
        st = JSON.parse(JSON.stringify(st));
        st.roster.char_kiryu_takashi = ${ROSTER_ENTRY_EXPR};
        const out = IkaiApp.Progression.setResonance(st, 0, 'char_kiryu_takashi');
        const next = out.state || out;
        IkaiApp.StateStore.setState(next);
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
        const defAfter = IkaiApp.CombatEngine.getSnapshot().allies[0].def;
        return { resonance: next.resonanceSlots, defBefore, defAfter };
      })()`);
      assert.equal(res.resonance[0], 'char_kiryu_takashi');
      assert.ok(res.defAfter > res.defBefore, `Expected resonance DEF+12% to raise ally DEF (${res.defBefore} -> ${res.defAfter})`);
    });

    it('T1-F12-05: 余剰系統③ 被り覚醒片変換＆交換結晶ショップ', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        st.currencies.exchangeCrystals = 100;
        const item = IkaiApp.MasterData.CRYSTAL_SHOP_ITEMS[0];
        const out = IkaiApp.Progression.exchangeCrystalItem(st, item.id);
        const next = out.state || out;
        return {
          afterCrystals: next.currencies.exchangeCrystals,
          expectedCrystals: 100 - item.costCrystals,
          universalShards: next.currencies.universalShards
        };
      })()`);
      assert.equal(res.afterCrystals, res.expectedCrystals);
      assert.ok(res.universalShards >= 1);
    });
  });

  // =========================================================================
  // F13: 図鑑・設定・禁止ルール全画面統合 (5 tests)
  // =========================================================================
  describe('F13: 図鑑・設定・禁止ルール全画面統合', () => {
    it('T1-F13-01: キャラ図鑑（所持カラー／未所持識別表示）', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'codex');
      const res = await sharedBrowser.eval(`(() => {
        const lower = document.querySelector('.lower-deck');
        const text = lower ? lower.innerText : '';
        const ownedChips = lower ? lower.querySelectorAll('.tag-chip-owned, [data-owned="true"]').length : 0;
        const unownedMarks = text.includes('未契約') || text.includes('未所持') || Boolean(lower?.querySelector('[data-owned="false"], .is-unowned'));
        return { text, ownedChips, unownedMarks };
      })()`);
      assert.ok(res.text.includes('桐生 貴史'));
      assert.ok(res.text.includes('中村 結衣'));
      assert.ok(res.ownedChips >= 1 && res.unownedMarks, 'Codex must visually distinguish owned vs unowned characters');
    });

    it('T1-F13-02: 設定画面の統合機能確認', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'settings');
      const text = await sharedBrowser.eval(`document.querySelector('.lower-deck')?.innerText || ''`);
      assert.ok(text.includes('音量') || text.includes('消音') || text.includes('SE'));
      assert.ok(text.includes('書き出し') || text.includes('書出') || text.includes('バックアップ'));
    });

    it('T1-F13-03: 禁則事項UI（Lv/陣形/デイリー/実績/PvP）不在', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const audit = await sharedBrowser.auditProhibitedContent();
        assert.equal(audit.ok, true, `Prohibited content on ${tabKey}: ${JSON.stringify(audit)}`);
      }
    });

    it('T1-F13-04: キャライラスト＆ラスターアイコン不在確認', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const audit = await sharedBrowser.auditProhibitedContent();
        assert.equal(audit.mediaHits.length, 0, `Raster/forbidden media on ${tabKey}: ${JSON.stringify(audit.mediaHits)}`);
      }
    });

    it('T1-F13-05: 開発メタ発言不在確認', async () => {
      await ensureBootedHttp(false);
      const metaCheck = await sharedBrowser.eval(`(() => {
        const str = JSON.stringify(IkaiApp.MasterData);
        return ['テスト版', 'デバッグ用', '買い切り仕様', 'ダミー実装'].filter(w => str.includes(w));
      })()`);
      assert.deepEqual(metaCheck, []);
    });
  });

  // =========================================================================
  // F14: 実機相当全画面レイアウト・操作・UI完全性チェック (5 tests)
  // =========================================================================
  describe('F14: 実機相当全画面レイアウト・操作・UI完全性チェック', () => {
    it('T1-F14-01: 全7メインタブ切替時の下半分収まり', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const split = await sharedBrowser.auditUpperLowerSplit();
        assert.equal(split.ok, true, `Tab ${tabKey}: ${split.violations.join('; ')}`);
      }
    });

    it('T1-F14-02: 下半分モーダル／詳細シートの50%制約', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'codex');
      await sharedBrowser.tap({ labelRegex: /桐生 貴史|石井 大輝/, scope: 'lower' });
      const detail = await sharedBrowser.eval(`(() => {
        const modal = document.querySelector('[data-testid="detail-modal"], .detail-sheet, .modal');
        const lowerText = document.querySelector('.lower-deck')?.innerText || '';
        const upperText = document.querySelector('.upper-stage')?.innerText || '';
        return {
          hasModal: Boolean(modal),
          hasSkillInfo: lowerText.includes('固有技') || upperText.includes('固有技')
        };
      })()`);
      assert.equal(detail.hasModal || detail.hasSkillInfo, true, 'Tapping character in codex must open detail sheet or detail view');
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T1-F14-03: 下半分縦スクロール正常性（上半分固定維持）', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'codex');
      const rects = await sharedBrowser.eval(`(() => {
        const scroller = document.querySelector('.lower-scroll');
        const upper = document.querySelector('.upper-stage');
        const before = upper.getBoundingClientRect().top;
        const canScroll = Boolean(scroller && scroller.scrollHeight > scroller.clientHeight);
        if (scroller) scroller.scrollTop = 200;
        const after = upper.getBoundingClientRect().top;
        return {
          hasScroller: Boolean(scroller),
          canScroll,
          scrollTopAfter: scroller ? scroller.scrollTop : 0,
          before,
          after
        };
      })()`);
      assert.equal(rects.hasScroller, true, '.lower-scroll container must exist');
      assert.equal(rects.canScroll, true, 'Codex list must overflow vertically inside .lower-scroll');
      assert.ok(rects.scrollTopAfter > 0, `Expected .lower-scroll.scrollTop > 0, got ${rects.scrollTopAfter}`);
      assert.equal(rects.before, rects.after);
      const splitAfter = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitAfter.ok, true, splitAfter.violations.join('; '));
    });

    it('T1-F14-04: 主要ボタン間の重なり・最小タップ領域検証', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'sortie');
      const overlapCheck = await sharedBrowser.eval(`(() => {
        const btns = [...document.querySelectorAll('.lower-deck nav button, .lower-deck [role="tab"]')];
        const rects = btns.map(b => {
          const r = b.getBoundingClientRect();
          return { text: b.textContent.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
        });
        for (let i = 0; i < rects.length; i++) {
          if (rects[i].height < 24) return { ok: false, reason: 'too small: ' + rects[i].text };
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            if (ox > 2 && oy > 2) return { ok: false, reason: 'overlap: ' + a.text + ' vs ' + b.text };
          }
        }
        return { ok: true, count: rects.length };
      })()`);
      assert.equal(overlapCheck.ok, true, JSON.stringify(overlapCheck));
    });

    it('T1-F14-05: 画面遷移・リロード後のUI整合性', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'party');
      await openTab(sharedBrowser, 'enhance');
      await openTab(sharedBrowser, 'summon');
      await openTab(sharedBrowser, 'sortie');

      const saveRes = await sharedBrowser.eval(`(async () => {
        IkaiApp.StateStore.update(s => { s.currencies.echoStones = 2468; });
        return await IkaiApp.StateStore.saveNow();
      })()`);
      assert.equal(saveRes?.ok, true, 'State save before reload must succeed');

      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);

      const postReload = await sharedBrowser.eval(`(() => {
        const upper = document.querySelector('.upper-stage');
        const lower = document.querySelector('.lower-deck');
        const navBtns = [...document.querySelectorAll('.lower-deck nav button, .lower-deck [role="tab"]')];
        return {
          hasUpper: Boolean(upper),
          hasLower: Boolean(lower),
          upperText: upper ? upper.innerText.trim() : '',
          lowerText: lower ? lower.innerText.trim() : '',
          navCount: navBtns.length,
          echoStones: IkaiApp.StateStore.getState().currencies.echoStones
        };
      })()`);
      assert.equal(postReload.hasUpper, true);
      assert.equal(postReload.hasLower, true);
      assert.ok(postReload.upperText.length > 0, '.upper-stage must render content after reload');
      assert.ok(postReload.lowerText.length > 0, '.lower-deck must render content after reload');
      assert.equal(postReload.navCount, Object.keys(TAB_SPECS).length, 'All navigation tabs must render after reload');
      assert.equal(postReload.echoStones, 2468, 'Persisted state must survive reload');
      assert.ok(postReload.upperText.includes('2468'), 'Reloaded UI topbar must reflect persisted echoStones');

      const splitReload = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitReload.ok, true, `Post-reload split: ${splitReload.violations.join('; ')}`);
      const ellReload = await sharedBrowser.auditNoEllipsisAndOverflow();
      assert.equal(ellReload.ok, true, `Post-reload ellipsis/overflow: ${JSON.stringify(ellReload)}`);

      await openTab(sharedBrowser, 'codex');
      const splitAfterNav = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitAfterNav.ok, true, splitAfterNav.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F15: E2Eオフライン/クロス環境・総合回帰検証 (5 tests)
  // =========================================================================
  describe('F15: E2Eオフライン/クロス環境・総合回帰検証', () => {
    it('T1-F15-01: file:// → HTTP バックアップクロスインポート', async () => {
      const fb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      let backup;
      try {
        await bootIkaiApp(fb, ctx.fileUrl, { clearStorage: true });
        backup = await fb.eval(`(async () => {
          const st = IkaiApp.StateStore.createInitialState();
          st.currencies.echoStones = 2222;
          return await IkaiApp.SaveSecurity.exportBackup(st);
        })()`);
      } finally {
        await fb.close();
      }
      await withTempHttpUrl(async (httpUrl) => {
        await bootIkaiApp(sharedBrowser, httpUrl, { clearStorage: true });
        const imported = await sharedBrowser.eval(`(async (j) => await IkaiApp.SaveSecurity.importBackup(j))(${JSON.stringify(backup)})`);
        assert.equal(imported.ok, true);
        assert.equal(imported.state.currencies.echoStones, 2222);
      });
    });

    it('T1-F15-02: HTTP → file:// バックアップクロスインポート', async () => {
      const backup = await withTempHttpUrl(async (httpUrl) => {
        await bootIkaiApp(sharedBrowser, httpUrl, { clearStorage: true });
        return await sharedBrowser.eval(`(async () => {
          const st = IkaiApp.StateStore.createInitialState();
          st.currencies.echoStones = 3333;
          return await IkaiApp.SaveSecurity.exportBackup(st);
        })()`);
      });
      const fb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(fb, ctx.fileUrl, { clearStorage: true });
        const imported = await fb.eval(`(async (j) => await IkaiApp.SaveSecurity.importBackup(j))(${JSON.stringify(backup)})`);
        assert.equal(imported.ok, true);
        assert.equal(imported.state.currencies.echoStones, 3333);
      } finally {
        await fb.close();
      }
    });

    it('T1-F15-03: Standalone PWA 表示モード相当での起動', async () => {
      await ensureBootedHttp(false);
      const res = await sharedBrowser.eval('typeof IkaiApp.Env.isStandalone === "function"');
      assert.equal(res, true);
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
    });

    it('T1-F15-04: Capacitor WebView 相当ホスト判定耐性・相対パス参照検査', async () => {
      const html = fs.readFileSync(ctx.indexHtmlPath, 'utf8');
      assert.equal(/(href|src)=["']\/(?!\/)/i.test(html), false, 'Absolute root paths break file:// and Capacitor');
      await ensureBootedHttp(false);
      const hasCapFn = await sharedBrowser.eval('typeof IkaiApp.Env.isCapacitor === "function"');
      assert.equal(hasCapFn, true);
    });

    it('T1-F15-05: 全機能連続ナビゲーション・例外ゼロ回帰', async () => {
      await ensureBootedHttp(true);
      const visited = [];
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const split = await sharedBrowser.auditUpperLowerSplit();
        assert.equal(split.ok, true, `Tab ${tabKey}: ${split.violations.join('; ')}`);
        const textLen = await sharedBrowser.eval(`(document.querySelector('.lower-deck')?.innerText || '').trim().length`);
        assert.ok(textLen > 0, `Tab ${tabKey} must render non-empty lower-deck content`);
        visited.push(tabKey);
      }
      assert.equal(visited.length, Object.keys(TAB_SPECS).length);
      await sharedBrowser.assertZeroErrors();
    });
  });
});
