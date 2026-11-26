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

describe('Tier 2: Boundary, Negative & Corner-Case Tests (F1-F15, 75 tests)', () => {
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
  // F1 Boundaries (5)
  // =========================================================================
  describe('F1 Boundaries', () => {
    it('T2-F01-01: 存在しないハッシュ/クエリ付 URL (?mode=invalid#unknown) で安全起動', async () => {
      await bootIkaiApp(sharedBrowser, `${getAppUrl()}?mode=invalid#unknown`, { clearStorage: true });
      const audit = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(audit.ok, true, audit.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F01-02: serviceWorker API 非存在環境 (file://) でのガード起動', async () => {
      const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(b, ctx.fileUrl, { clearStorage: true });
        const info = await b.eval(`({
          isFile: IkaiApp.Env.isFile(),
          canUseSw: IkaiApp.Env.canUseServiceWorker(),
          hasUpper: Boolean(document.querySelector('.upper-stage')),
          hasLower: Boolean(document.querySelector('.lower-deck'))
        })`);
        assert.equal(info.isFile, true);
        assert.equal(info.canUseSw, false);
        assert.equal(info.hasUpper, true);
        assert.equal(info.hasLower, true);
        const split = await b.auditUpperLowerSplit();
        assert.equal(split.ok, true, split.violations.join('; '));
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });

    it('T2-F01-03: 連続高速リロード（3回連続 Page.reload）無エラー確認', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.reload();
      await sharedBrowser.reload();
      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);
      const stateCheck = await sharedBrowser.eval(`({
        partyLen: IkaiApp.StateStore.getState().party.filter(Boolean).length,
        hasUpper: Boolean(document.querySelector('.upper-stage')),
        hasLower: Boolean(document.querySelector('.lower-deck'))
      })`);
      assert.ok(stateCheck.partyLen >= 1);
      assert.equal(stateCheck.hasUpper, true);
      assert.equal(stateCheck.hasLower, true);
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F01-04: manifest.webmanifest 内の全アイコンパス実在検証', async () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(ctx.projectDir, 'manifest.webmanifest'), 'utf8'));
      for (const icon of manifest.icons || []) {
        const resolved = path.resolve(ctx.projectDir, icon.src);
        assert.equal(fs.existsSync(resolved), true, `Missing manifest icon: ${icon.src}`);
      }
    });

    it('T2-F01-05: sw.js キャッシュリスト内の全パス実在検証', async () => {
      const swText = fs.readFileSync(path.join(ctx.projectDir, 'sw.js'), 'utf8');
      const matches = [...swText.matchAll(/['"](\.\/[^'"]+)['"]/g)].map((m) => m[1]);
      assert.ok(matches.length >= 5, 'sw.js must list precache shell assets');
      for (const rel of matches) {
        const target = rel === './' ? path.join(ctx.projectDir, 'index.html') : path.resolve(ctx.projectDir, rel);
        assert.equal(fs.existsSync(target), true, `sw.js precache missing asset: ${rel}`);
      }
    });
  });

  // =========================================================================
  // F2 Boundaries (5)
  // =========================================================================
  describe('F2 Boundaries', () => {
    it('T2-F02-01: 最長フルネーム群（氷室 宗一郎・長谷川 悠人等）4人同時編成非省略', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const ids = ['char_himuro_soichiro', 'char_hasegawa_haruto', 'char_kobayashi_shohei', 'char_shiraishi_sumika'];
        IkaiApp.StateStore.update(s => {
          for (const id of ids) if (!s.roster[id]) s.roster[id] = ${ROSTER_ENTRY_EXPR};
          s.party = ids;
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.auditNoEllipsisAndOverflow();
      assert.equal(res.ok, true, JSON.stringify(res));
    });

    it('T2-F02-02: 極端 SafeArea 値 (--sat: 59px; --sab: 34px) 注入で上下分離維持', async () => {
      const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT, emulateSafeArea: { top: 59, bottom: 34 } });
      try {
        await bootIkaiApp(b, getAppUrl(), { clearStorage: true });
        const pads = await b.eval(`(() => {
          const u = getComputedStyle(document.querySelector('.upper-stage'));
          const l = getComputedStyle(document.querySelector('.lower-deck'));
          return { top: parseFloat(u.paddingTop), bottom: parseFloat(l.paddingBottom) };
        })()`);
        assert.ok(pads.top >= 59, `Expected upper paddingTop >= 59, got ${pads.top}`);
        assert.ok(pads.bottom >= 34, `Expected lower paddingBottom >= 34, got ${pads.bottom}`);
        const audit = await b.auditUpperLowerSplit();
        assert.equal(audit.ok, true, audit.violations.join('; '));
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });

    it('T2-F02-03: 狭小モバイル境界 (320×568) で横オーバーフロー・省略ゼロ', async () => {
      const b = await CdpBrowser.launch({
        viewport: { width: 320, height: 568, deviceScaleFactor: 2, mobile: true, screenWidth: 320, screenHeight: 568 }
      });
      try {
        await bootIkaiApp(b, getAppUrl(), { clearStorage: true });
        const audit = await b.auditUpperLowerSplit({ expectedWidth: 320, expectedHeight: 568 });
        assert.equal(audit.ok, true, audit.violations.join('; '));
        const ell = await b.auditNoEllipsisAndOverflow();
        assert.equal(ell.ok, true, JSON.stringify(ell));
      } finally {
        await b.close();
      }
    });

    it('T2-F02-04: 上半分中心座標 (195, 211) タップの完全無反応確認', async () => {
      await ensureBootedHttp(true);
      const before = await sharedBrowser.eval('JSON.stringify(IkaiApp.StateStore.getState())');
      await sharedBrowser.tapPoint(195, 211);
      const after = await sharedBrowser.eval('JSON.stringify(IkaiApp.StateStore.getState())');
      assert.equal(after, before);
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F02-05: 長文エリア名・スキル説明の右端はみ出しゼロ確認', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'codex');
      const overflow = await sharedBrowser.eval('document.documentElement.scrollWidth <= window.innerWidth + 1');
      assert.equal(overflow, true);
    });
  });

  // =========================================================================
  // F3 Boundaries (5)
  // =========================================================================
  describe('F3 Boundaries', () => {
    it('T2-F03-01: localStorage 改ざん (echoStones +999999) の署名検知・拒否', async () => {
      await ensureBootedHttp(true);
      const saveRes = await sharedBrowser.eval('await IkaiApp.StateStore.saveNow()');
      assert.equal(saveRes?.ok, true, 'StateStore.saveNow() must succeed');
      const tamperOk = await sharedBrowser.eval(`(async () => {
        const raw = localStorage.getItem(IkaiApp.StateStore.STORAGE_KEY);
        if (!raw) return false;
        const obj = JSON.parse(raw);
        obj.payload.currencies.echoStones = 999999;
        const res = await IkaiApp.SaveSecurity.verifyAndParse(JSON.stringify(obj));
        return res?.ok === false;
      })()`);
      assert.equal(tamperOk, true, 'Tampered HMAC save payload must be rejected');
    });

    it('T2-F03-02: 署名文字列1文字改変バックアップ JSON のインポート拒否', async () => {
      await ensureBootedHttp(true);
      const rejected = await sharedBrowser.eval(`(async () => {
        const st = IkaiApp.StateStore.createInitialState();
        const json = await IkaiApp.SaveSecurity.exportBackup(st);
        const obj = JSON.parse(json);
        obj.mac = (obj.mac[0] === 'a' ? 'b' : 'a') + obj.mac.slice(1);
        const out = await IkaiApp.SaveSecurity.importBackup(JSON.stringify(obj));
        return out?.ok === false;
      })()`);
      assert.equal(rejected, true);
    });

    it('T2-F03-03: 構文エラー文字列 ("{broken json") や空文字インポートの安全拒否', async () => {
      await ensureBootedHttp(true);
      const rejected = await sharedBrowser.eval(`(async () => {
        for (const bad of ['{broken json', '', 'null', '[]']) {
          const out = await IkaiApp.SaveSecurity.importBackup(bad);
          if (out?.ok !== false) return false;
        }
        return true;
      })()`);
      assert.equal(rejected, true);
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F03-04: スキーマ不正（負の echoStones / 必須キー欠落 / 禁止キー lv）の拒否', async () => {
      await ensureBootedHttp(true);
      const rejected = await sharedBrowser.eval(`(() => {
        const bad1 = IkaiApp.StateStore.createInitialState();
        bad1.currencies.echoStones = -100;
        const v1 = IkaiApp.SaveSecurity.validateSchema(bad1);
        const v2 = IkaiApp.SaveSecurity.validateSchema({});
        const bad3 = IkaiApp.StateStore.createInitialState();
        bad3.lv = 1;
        const v3 = IkaiApp.SaveSecurity.validateSchema(bad3);
        return v1.ok === false && v2.ok === false && v3.ok === false;
      })()`);
      assert.equal(rejected, true);
    });

    it('T2-F03-05: XSS ペイロード注入 (<img src=x onerror=window.__xss=1>) 無害化', async () => {
      await ensureBootedHttp(true);
      const apiRes = await sharedBrowser.eval(`(async () => {
        window.__xss = undefined;
        const out = await IkaiApp.SaveSecurity.importBackup('<img src=x onerror=window.__xss=1>');
        return { xss: window.__xss !== undefined, ok: out?.ok };
      })()`);
      assert.equal(apiRes.xss, false);
      assert.equal(apiRes.ok, false);

      await openTab(sharedBrowser, 'settings');
      const importSpec = { testId: 'save-import-input', selector: 'textarea.backup-textarea, #backup-json-input', scope: 'lower' };
      const input = await sharedBrowser.queryControl(importSpec);
      assert.equal(input.found, true);
      await sharedBrowser.setInputValue(importSpec, '<img src=x onerror=window.__xss=1>');
      await sharedBrowser.tap({ labelRegex: /復元|インポート/, testId: 'save-import-btn', scope: 'lower' });
      const domRes = await sharedBrowser.eval(`({
        xss: window.__xss !== undefined,
        imgCount: document.querySelectorAll('img').length,
        bodyHasImgTag: document.body.innerHTML.includes('<img src=x')
      })`);
      assert.equal(domRes.xss, false);
      assert.equal(domRes.imgCount, 0);
      assert.equal(domRes.bodyHasImgTag, false);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F4 Boundaries (5)
  // =========================================================================
  describe('F4 Boundaries', () => {
    it('T2-F04-01: 同一レア・同一ロール間の五十音境界（さくらい vs はせがわ）決定性', async () => {
      await ensureBootedHttp(false);
      const pair = await sharedBrowser.eval(`(() => {
        const sub = IkaiApp.MasterData.CHARACTERS.filter(c => c.rarity === 'SR' && c.role === 'サポーター');
        return IkaiApp.StateStore.sortUnits(sub.slice().reverse()).map(c => c.name);
      })()`);
      assert.deepEqual(pair, ['桜井 凛', '長谷川 悠人']);
    });

    it('T2-F04-02: 空配列 [] と 1要素配列に対する sortUnits', async () => {
      await ensureBootedHttp(false);
      const res = await sharedBrowser.eval(`(() => {
        const empty = IkaiApp.StateStore.sortUnits([]);
        const one = IkaiApp.StateStore.sortUnits([IkaiApp.MasterData.CHARACTERS[0]]);
        return { emptyLen: empty.length, oneLen: one.length };
      })()`);
      assert.deepEqual(res, { emptyLen: 0, oneLen: 1 });
    });

    it('T2-F04-03: AudioSE 音量境界値 (0, 1) および範囲外 (-0.5, 2.5) クランプ', async () => {
      await ensureBootedHttp(false);
      const res = await sharedBrowser.eval(`(() => {
        IkaiApp.AudioSE.setVolume(-0.5);
        const low = IkaiApp.AudioSE.getSettings().volume;
        IkaiApp.AudioSE.setVolume(2.5);
        const high = IkaiApp.AudioSE.getSettings().volume;
        IkaiApp.AudioSE.setVolume(0);
        const z = IkaiApp.AudioSE.getSettings().volume;
        return { low, high, z };
      })()`);
      assert.equal(res.low, 0);
      assert.equal(res.high, 1);
      assert.equal(res.z, 0);
    });

    it('T2-F04-04: ミュート ON 状態での全 SE 種再生試行で例外ゼロ', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        IkaiApp.AudioSE.setMuted(true);
        const results = {};
        for (const id of ['ui_tap', 'ui_tab', 'battle_attack', 'battle_crit', 'battle_heal', 'boss_telegraph', 'summon_ssr', 'victory', 'defeat']) {
          results[id] = IkaiApp.AudioSE.play(id);
        }
        return { muted: IkaiApp.AudioSE.getSettings().muted, results };
      })()`);
      assert.equal(res.muted, true);
      for (const [id, ok] of Object.entries(res.results)) {
        assert.equal(ok, false, `Muted AudioSE.play(${id}) must return false`);
      }
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F04-05: 不明な SE ID 呼び出し時の安全無視', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const before = IkaiApp.AudioSE.getSettings();
        const played = IkaiApp.AudioSE.play('non_existent_se_id');
        const after = IkaiApp.AudioSE.getSettings();
        return { before, after, played };
      })()`);
      assert.equal(typeof res.played, 'boolean');
      assert.equal(res.after.muted, res.before.muted);
      assert.equal(res.after.volume, res.before.volume);
      assert.equal(res.after.unlocked, res.before.unlocked);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F5 Boundaries (5)
  // =========================================================================
  describe('F5 Boundaries', () => {
    it('T2-F05-01: 全20キャラ基礎ステ (HP/ATK/DEF/SPD/会心) 正値・非NaN確認', async () => {
      await ensureBootedHttp(false);
      const bad = await sharedBrowser.eval(`IkaiApp.MasterData.CHARACTERS.filter(c => {
        const s = c.baseStats;
        return !(s.hp > 0 && s.atk > 0 && s.def > 0 && s.spd > 0 && s.crit > -1);
      }).map(c => c.id)`);
      assert.deepEqual(bad, []);
    });

    it('T2-F05-02: Stage 3・Stage 6 のボスフラグおよび固有技・予告設定検証', async () => {
      await ensureBootedHttp(false);
      const check = await sharedBrowser.eval(`(() => {
        const errs = [];
        for (const a of IkaiApp.MasterData.AREAS) {
          for (const idx of [2, 5]) {
            const st = a.stages[idx];
            if (!st || !st.isBossStage || !st.bossId) errs.push(a.id + ':' + idx);
          }
        }
        return errs;
      })()`);
      assert.deepEqual(check, []);
    });

    it('T2-F05-03: 全18収集技のターゲット区分・クールタイム妥当性', async () => {
      await ensureBootedHttp(false);
      const bad = await sharedBrowser.eval(`IkaiApp.MasterData.SKILLS.filter(s => !(s.cooldown >= 1 && ['単体', '範囲', '全体'].includes(s.targetType))).map(s => s.id)`);
      assert.deepEqual(bad, []);
    });

    it('T2-F05-04: 品質ランク5段階（並<良<秀<優<極）の倍率厳密昇順', async () => {
      await ensureBootedHttp(false);
      const mults = await sharedBrowser.eval('IkaiApp.MasterData.QUALITY_RANKS.map(q => q.multiplier)');
      for (let i = 1; i < mults.length; i++) {
        assert.ok(mults[i] > mults[i - 1], `Multiplier not strictly ascending at ${i}`);
      }
    });

    it('T2-F05-05: 未解放ステージ (5-6) 選択試行のロック制御', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      const area5Spec = { labelRegex: /5\.|暁闇高架/, testId: 'area-select-area_5', scope: 'lower' };
      const area5Btn = await sharedBrowser.queryControl(area5Spec);
      assert.equal(area5Btn.found, true, 'Area 5 selector must exist in sortie');
      await sharedBrowser.tap(area5Spec);
      const stage56Spec = { labelRegex: /5-6|境界の中心核/, testId: 'stage-select-5-6', scope: 'lower' };
      const stage56 = await sharedBrowser.queryControl(stage56Spec);
      assert.equal(stage56.found, true, 'Stage 5-6 button must render in Area 5');
      assert.equal(stage56.disabled, true, 'Locked stage 5-6 button must be disabled');
      const snap = await sharedBrowser.eval('IkaiApp.CombatEngine.getSnapshot()');
      assert.equal(snap, null, 'Locked stage must not start combat');
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F6 Boundaries (5)
  // =========================================================================
  describe('F6 Boundaries', () => {
    it('T2-F06-01: パーティ 0人での出撃ブロック', async () => {
      await ensureBootedHttp(true);
      const rejected = await sharedBrowser.eval(`(() => {
        const bad = IkaiApp.StateStore.createInitialState();
        bad.party = [null, null, null, null];
        const schemaBlocked = IkaiApp.SaveSecurity.validateSchema(bad).ok === false;
        let startBlocked = false;
        try {
          IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0, partyOverride: [null, null, null, null] });
          startBlocked = IkaiApp.CombatEngine.getSnapshot() === null;
        } catch (_) {
          startBlocked = true;
        }
        return { schemaBlocked, startBlocked };
      })()`);
      assert.equal(rejected.schemaBlocked, true);
      assert.equal(rejected.startBlocked, true);
      await openTab(sharedBrowser, 'party');
      const removeBtns = await sharedBrowser.eval(`(() => {
        const btns = [...document.querySelectorAll('.lower-deck button')];
        return btns.filter(b => /外す|解除/.test(b.textContent || '')).length;
      })()`);
      assert.ok(removeBtns >= 1 && removeBtns <= 4, `Expected 1..4 party remove buttons, got ${removeBtns}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F06-02: 同キャラ重複編成の防止', async () => {
      await ensureBootedHttp(true);
      const rejected = await sharedBrowser.eval(`(() => {
        const bad = IkaiApp.StateStore.createInitialState();
        bad.party = [bad.party[0], bad.party[0], null, null];
        return IkaiApp.SaveSecurity.validateSchema(bad).ok === false;
      })()`);
      assert.equal(rejected, true, 'Duplicate party member must be rejected by schema');
    });

    it('T2-F06-03: 1人少人数パーティでのタイムライン戦闘完走', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          s.roster.char_kiryu_takashi = { ...(${ROSTER_ENTRY_EXPR}), awakening: 2 };
          s.party = ['char_kiryu_takashi', null, null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      const snap = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      assert.equal(snap.allies.length, 1);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.finished, true);
      assert.equal(fin.victory, true, 'Solo Kiryu must complete and win stage 1-1');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F06-04: 切り札予約中に該当キャラが戦闘不能になった場合の正常進行', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIP_MAP.eq_teppeki_amulet;
        IkaiApp.StateStore.update(s => {
          s.roster.char_kiryu_takashi = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3, emblemNodes: [1, 2, 3, 4] };
          s.equips.push({ uid: 'f64_hp', equipId: tpl.id, qualityIdx: 4, locked: false });
          s.roster.char_kiryu_takashi.equipped['護符'] = 'f64_hp';
          s.party = ['char_nakamura_yui', 'char_kiryu_takashi', null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_5', stageIndex: 5, startWave: 4 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        IkaiApp.CombatEngine.reserveSkill('char_nakamura_yui', 'unique');
        let observedKo = false;
        let finishedAfterKo = false;
        for (let i = 0; i < 100; i++) {
          const r = IkaiApp.CombatEngine.step(800);
          const s = r || IkaiApp.CombatEngine.getSnapshot();
          const yui = s.allies.find(a => a.id === 'char_nakamura_yui');
          if (yui && yui.hp <= 0) observedKo = true;
          if (s.finished) {
            finishedAfterKo = true;
            break;
          }
        }
        return { observedKo, finishedAfterKo };
      })()`);
      assert.equal(res.observedKo, true, 'Fragile reserved unit must reach KO in 5-6 boss wave');
      assert.equal(res.finishedAfterKo, true, 'Battle must finish without deadlock after reserved unit KO');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F06-05: 倍速 ×3 中の連続作戦切替・目標切替連打', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'sortie');
      await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const spdSpec = { labelRegex: /×1|×2|×3|倍速/, testId: 'battle-speed-btn', scope: 'lower' };
      await sharedBrowser.tap(spdSpec);
      await sharedBrowser.tap(spdSpec);
      const speed = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.battleSpeed');
      assert.equal(speed, 3, `Expected battleSpeed === 3 after two taps, got ${speed}`);

      const steps = [
        { tactic: 'defensive', target: 'lowest_hp' },
        { tactic: 'conserve', target: 'boss_first' },
        { tactic: 'balanced', target: 'fastest_enemy' },
        { tactic: 'aggressive', target: 'debuffed_first' }
      ];
      for (const item of steps) {
        const stepRes = await sharedBrowser.eval(`(() => {
          const tacticOk = IkaiApp.CombatEngine.setGlobalTactic(${JSON.stringify(item.tactic)});
          const targetOk = IkaiApp.CombatEngine.setGlobalTargetPolicy(${JSON.stringify(item.target)});
          const snap = IkaiApp.CombatEngine.step(300) || IkaiApp.CombatEngine.getSnapshot();
          return {
            tacticOk,
            targetOk,
            globalTactic: snap?.globalTactic ?? null,
            globalTargetPolicy: snap?.globalTargetPolicy ?? null,
            alliesMatch: Array.isArray(snap?.allies) && snap.allies.every(
              a => a.tactic?.policy === ${JSON.stringify(item.tactic)} && a.tactic?.target === ${JSON.stringify(item.target)}
            ),
            speed: snap?.speed ?? null
          };
        })()`);
        assert.equal(stepRes.tacticOk, true, `setGlobalTactic(${item.tactic}) must return true`);
        assert.equal(stepRes.targetOk, true, `setGlobalTargetPolicy(${item.target}) must return true`);
        assert.equal(stepRes.globalTactic, item.tactic);
        assert.equal(stepRes.globalTargetPolicy, item.target);
        assert.equal(stepRes.alliesMatch, true, `Allies tactic must match ${JSON.stringify(item)}`);
        assert.equal(stepRes.speed, 3);
      }

      const finalSnap = await sharedBrowser.eval(`(() => {
        const s = IkaiApp.CombatEngine.getSnapshot();
        return {
          globalTactic: s?.globalTactic ?? null,
          globalTargetPolicy: s?.globalTargetPolicy ?? null,
          speed: s?.speed ?? null
        };
      })()`);
      assert.equal(finalSnap.globalTactic, 'aggressive');
      assert.equal(finalSnap.globalTargetPolicy, 'debuffed_first');
      assert.equal(finalSnap.speed, 3);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F7 Boundaries (5)
  // =========================================================================
  describe('F7 Boundaries', () => {
    it('T2-F07-01: 敵1体のみへの「範囲」「全体」スキル命中（空参照例外ゼロ）', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          for (const sid of ['sk_r_soutou', 'sk_r_shogekiha']) {
            if (!s.skillInventory[sid]) s.skillInventory[sid] = { ownedCount: 1, rank: 1, uses: 0 };
          }
          s.roster[s.party[0]].skills = ['sk_r_soutou', null];
          s.roster[s.party[1]].skills = ['sk_r_shogekiha', null];
          s.roster[s.party[0]].tactic.skillPriority = 'collect_first';
          s.roster[s.party[1]].tactic.skillPriority = 'collect_first';
        });
        IkaiApp.App.startBattle('raid', { raidId: IkaiApp.MasterData.RAID_BOSSES[0].id, difficulty: 0 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        const bRange = IkaiApp.StateStore.getState().skillInventory.sk_r_soutou.uses;
        const bAll = IkaiApp.StateStore.getState().skillInventory.sk_r_shogekiha.uses;
        for (let i = 0; i < 25; i++) IkaiApp.CombatEngine.step(700);
        const inv = IkaiApp.StateStore.getState().skillInventory;
        const snap = IkaiApp.CombatEngine.getSnapshot();
        return {
          rangeDelta: inv.sk_r_soutou.uses - bRange,
          allDelta: inv.sk_r_shogekiha.uses - bAll,
          dealt: snap.dps?.dealt || 0
        };
      })()`);
      assert.ok(res.rangeDelta >= 1 && res.allDelta >= 1, 'Both 範囲 and 全体 skills must execute against single raid boss');
      assert.ok(res.dealt > 0);
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F07-02: ボス撃破直後の幽霊ボス技不発と勝利遷移', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 2, startWave: 4 })`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.finished, true);
      assert.equal(fin.victory, true, 'Stage 1-3 boss wave must end in victory');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F07-03: 挑発（タンク）と HP最低狙いの優先順位処理', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          s.roster.char_kiryu_takashi = ${ROSTER_ENTRY_EXPR};
          s.roster.char_kiryu_takashi.tactic.skillPriority = 'unique_first';
          s.party = ['char_kiryu_takashi', 'char_kobayashi_shohei', null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        let tauntObserved = false;
        let tankHitsWhileTaunt = 0;
        let prevTankTaken = 0;
        for (let i = 0; i < 25; i++) {
          IkaiApp.CombatEngine.step(500);
          const s = IkaiApp.CombatEngine.getSnapshot();
          const tank = s.allies.find(a => a.id === 'char_kiryu_takashi');
          const hasTaunt = Boolean(tank?.buffs?.some(b => b.stat === 'taunt' || b.id === 'taunt' || b.type === 'taunt'));
          if (tauntObserved && (tank?.dps?.damageTaken || 0) > prevTankTaken) {
            tankHitsWhileTaunt++;
          }
          if (hasTaunt) tauntObserved = true;
          prevTankTaken = tank?.dps?.damageTaken || 0;
          if (s.finished) break;
        }
        return { tauntObserved, tankHitsWhileTaunt };
      })()`);
      assert.equal(res.tauntObserved, true, 'Kiryu must apply taunt buff');
      assert.ok(res.tankHitsWhileTaunt >= 1, 'Enemies must attack taunting tank');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F07-04: スタン/凍結デバフ中の行動スキップ境界', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          for (const cid of s.party) {
            s.roster[cid].awakening = 3;
            s.roster[cid].emblemNodes = [1, 2, 3, 4];
          }
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_3', stageIndex: 2, startWave: 4 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        let stunObserved = false;
        let skipObserved = false;
        for (let i = 0; i < 50; i++) {
          IkaiApp.CombatEngine.step(500);
          const s = IkaiApp.CombatEngine.getSnapshot();
          if (s.allies.some(a => (a.debuffs || []).concat(a.buffs || []).some(d => d.stat === 'stun' || d.id === 'stun' || d.type === 'stun'))) {
            stunObserved = true;
          }
          const logText = (s.logs || []).map(l => typeof l === 'string' ? l : (l.text || '')).join('\n');
          if (/スタン|行動不能|スキップ/.test(logText)) {
            skipObserved = true;
          }
          if (stunObserved && skipObserved) break;
          if (s.finished) break;
        }
        return { stunObserved, skipObserved };
      })()`);
      assert.equal(res.stunObserved || res.skipObserved, true, 'b3_zeroshiki stun debuff / action skip must occur');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F07-05: 累積バフ上限（最大5回等）の超過防止', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIP_MAP.eq_teppeki_amulet;
        IkaiApp.StateStore.update(s => {
          s.roster.char_kiryu_takashi = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3, emblemNodes: [1, 3] };
          s.equips.push({ uid: 'f75_hp', equipId: tpl.id, qualityIdx: 4, locked: false });
          s.roster.char_kiryu_takashi.equipped['護符'] = 'f75_hp';
          s.party = ['char_kiryu_takashi', null, null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_2', stageIndex: 0, startWave: 4 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        let maxStacks = 0;
        let exceeded = false;
        let prevTaken = 0;
        let hitCount = 0;
        for (let i = 0; i < 50; i++) {
          IkaiApp.CombatEngine.step(500);
          const s = IkaiApp.CombatEngine.getSnapshot();
          const k = s.allies[0];
          if ((k.dps?.damageTaken || 0) > prevTaken) {
            hitCount++;
            prevTaken = k.dps.damageTaken;
          }
          const stackBuffs = (k.buffs || []).filter(b => b.stat === 'defPct' || b.id === 'trt_kiryu_takashi' || (b.name || '').includes('鉄壁の沈着'));
          const stacks = stackBuffs.reduce((mx, b) => Math.max(mx, b.stacks || b.count || Math.round((b.value || 0) / 5) || 1), 0);
          if (stacks > maxStacks) maxStacks = stacks;
          if (stacks > 5) exceeded = true;
          if (s.finished || hitCount >= 8) break;
        }
        return { hitCount, maxStacks, exceeded };
      })()`);
      assert.ok(res.hitCount >= 6, `Expected >=6 hits on solo Kiryu, got ${res.hitCount}`);
      assert.equal(res.maxStacks, 5, `Expected defPct stack cap of 5, got ${res.maxStacks}`);
      assert.equal(res.exceeded, false);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F8 Boundaries (5)
  // =========================================================================
  describe('F8 Boundaries', () => {
    it('T2-F08-01: 戦闘開始直後（0ms / 全値0）の DPS メーター（NaN%禁止）', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const meter = await sharedBrowser.eval(`(() => {
        const upper = document.querySelector('.upper-stage');
        const html = upper ? upper.innerHTML : '';
        const text = upper ? upper.innerText : '';
        return { hasNaN: html.includes('NaN') || text.includes('NaN'), text };
      })()`);
      assert.equal(meter.hasNaN, false, 'DPS meter must never output NaN at 0ms');
      for (const lbl of ['与ダメージ', '被ダメージ', '回復量', '被回復量']) {
        assert.ok(meter.text.includes(lbl), `Missing zero-state DPS label: ${lbl}`);
      }
    });

    it('T2-F08-02: ヒーラー無し編成（回復0・被回復0）でも4項目同時表示', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const dpsIds = IkaiApp.MasterData.CHARACTERS.filter(c => c.role !== 'ヒーラー').slice(0, 4).map(c => c.id);
        IkaiApp.StateStore.update(s => {
          for (const id of dpsIds) if (!s.roster[id]) s.roster[id] = ${ROSTER_ENTRY_EXPR};
          s.party = dpsIds;
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      await runBattleToCompletion(sharedBrowser);
      const txt = await sharedBrowser.eval(`document.querySelector('.upper-stage')?.innerText || ''`);
      for (const lbl of ['与ダメージ', '被ダメージ', '回復量', '被回復量']) {
        assert.ok(txt.includes(lbl), `Missing DPS label without healer: ${lbl}`);
      }
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F08-03: 大値/微小値混在時の DPS バー幅 100% 上限保証', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIP_MAP.eq_zankyo_main;
        IkaiApp.StateStore.update(s => {
          s.roster.char_kanzaki_mio = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3 };
          s.roster.char_ishii_daiki = ${ROSTER_ENTRY_EXPR};
          s.equips.push({ uid: 'f83_wep', equipId: tpl.id, qualityIdx: 4, locked: false });
          s.roster.char_kanzaki_mio.equipped['主器'] = 'f83_wep';
          s.party = ['char_kanzaki_mio', 'char_ishii_daiki', null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 6; i++) IkaiApp.CombatEngine.step(700);
        const snap = IkaiApp.CombatEngine.getSnapshot();
        const k = snap.allies.find(a => a.id === 'char_kanzaki_mio')?.dps?.damageDealt || 0;
        const d = snap.allies.find(a => a.id === 'char_ishii_daiki')?.dps?.damageDealt || 0;
        const meter = document.querySelector('[data-testid="dps-meter"], .dps-meter');
        const bars = meter ? [...meter.querySelectorAll('[style*="width"]')] : [];
        const widths = bars.map(b => parseFloat(b.style.width));
        return { k, d, barCount: bars.length, badWidths: widths.filter(w => !(w > -1 && w <= 100.1)) };
      })()`);
      assert.ok(res.barCount >= 4, `Expected >=4 DPS bars in active combat, got ${res.barCount}`);
      assert.ok(res.k > res.d && res.d > 0, `Expected skewed DPS values (kanzaki=${res.k}, ishii=${res.d})`);
      assert.deepEqual(res.badWidths, []);
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F08-04: 戦闘不能味方プレート残留＆DPS記録保持', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIP_MAP.eq_teppeki_amulet;
        IkaiApp.StateStore.update(s => {
          s.roster.char_kiryu_takashi = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3 };
          s.equips.push({ uid: 'f84_hp', equipId: tpl.id, qualityIdx: 4, locked: false });
          s.roster.char_kiryu_takashi.equipped['護符'] = 'f84_hp';
          s.party = ['char_nakamura_yui', 'char_kiryu_takashi', null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_5', stageIndex: 5, startWave: 4 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const res = await sharedBrowser.eval(`(() => {
        let koAlly = null;
        for (let i = 0; i < 60; i++) {
          IkaiApp.CombatEngine.step(800);
          const s = IkaiApp.CombatEngine.getSnapshot();
          const yui = s.allies.find(a => a.id === 'char_nakamura_yui');
          if (yui && yui.hp <= 0) {
            koAlly = yui;
            break;
          }
          if (s.finished) break;
        }
        const upperTxt = document.querySelector('.upper-stage')?.innerText || '';
        return {
          koFound: Boolean(koAlly),
          nameStillInDom: upperTxt.includes('中村 結衣'),
          taken: koAlly?.dps?.damageTaken
        };
      })()`);
      assert.equal(res.koFound, true, 'Fragile ally must be KOed in 5-6');
      assert.equal(res.nameStillInDom, true, 'KOed ally plate must remain visible in upper stage');
      assert.ok(Number.isFinite(res.taken) && res.taken > 0, 'KOed ally DPS record must be preserved');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F08-05: バフ・デバフ多数付与時の上半分 422px 境界維持', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        const ids = ['char_kiryu_takashi', 'char_minase_shiori', 'char_sakurai_rin', 'char_shiraishi_sumika'];
        IkaiApp.StateStore.update(s => {
          for (const id of ids) s.roster[id] = ${ROSTER_ENTRY_EXPR};
          s.party = ids;
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_2', stageIndex: 5, startWave: 4 });
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const buffCheck = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 6; i++) IkaiApp.CombatEngine.step(600);
        const s = IkaiApp.CombatEngine.getSnapshot();
        const totalEffects = s.allies.reduce((sum, a) => sum + (a.buffs?.length || 0) + (a.debuffs?.length || 0), 0);
        return { totalEffects };
      })()`);
      assert.ok(buffCheck.totalEffects >= 2, `Expected multiple buffs/debuffs applied, got ${buffCheck.totalEffects}`);
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F9 Boundaries (5)
  // =========================================================================
  describe('F9 Boundaries', () => {
    it('T2-F09-01: 装備インベントリ空状態での一括売却安全動作', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        st.equips = [];
        const beforeCoins = st.currencies.starCoins;
        const out = IkaiApp.Progression.bulkSellEquips(st, 2);
        const next = out.state || out;
        return { sameCoins: next.currencies.starCoins === beforeCoins };
      })()`);
      assert.equal(res.sameCoins, true);
    });

    it('T2-F09-02: 「装備中」アイテムの品質一括売却 100% 保護', async () => {
      await ensureBootedHttp(true);
      const protectedOk = await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIPS[0];
        const st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.equips = [
          { uid: 'equipped_001', equipId: tpl.id, qualityIdx: 0, locked: false },
          { uid: 'unequipped_002', equipId: tpl.id, qualityIdx: 0, locked: false }
        ];
        st.roster[cid].equipped[tpl.slot] = 'equipped_001';
        const out = IkaiApp.Progression.bulkSellEquips(st, 0);
        const next = out.state || out;
        const hasEq = next.equips.some(e => e.uid === 'equipped_001');
        const hasUn = next.equips.some(e => e.uid === 'unequipped_002');
        return { hasEq, hasUn };
      })()`);
      assert.equal(protectedOk.hasEq, true, 'Equipped item must NEVER be bulk-sold');
      assert.equal(protectedOk.hasUn, false, 'Unequipped matching item must be sold');
    });

    it('T2-F09-03: 最高品質「極」装備に対する合成昇格拒否（素材保護）', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIPS[0];
        const st = IkaiApp.StateStore.createInitialState();
        st.equips = [
          { uid: 'max_1', equipId: tpl.id, qualityIdx: 4, locked: false },
          { uid: 'max_2', equipId: tpl.id, qualityIdx: 4, locked: false }
        ];
        const out = IkaiApp.Progression.synthesizeEquip(st, 'max_1', 'max_2');
        const next = out.state || out;
        return { count: next.equips.length, q: next.equips[0].qualityIdx };
      })()`);
      assert.equal(res.count, 2);
      assert.equal(res.q, 4);
    });

    it('T2-F09-04: 異種または異品質装備同士の合成拒否', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const t1 = IkaiApp.MasterData.EQUIPS[0];
        const t2 = IkaiApp.MasterData.EQUIPS[1];
        const st = IkaiApp.StateStore.createInitialState();
        st.equips = [
          { uid: 'diff_1', equipId: t1.id, qualityIdx: 0, locked: false },
          { uid: 'diff_2', equipId: t2.id, qualityIdx: 0, locked: false },
          { uid: 'diff_3', equipId: t1.id, qualityIdx: 1, locked: false }
        ];
        const outA = IkaiApp.Progression.synthesizeEquip(st, 'diff_1', 'diff_2');
        const nextA = outA.state || outA;
        const outB = IkaiApp.Progression.synthesizeEquip(nextA, 'diff_1', 'diff_3');
        const nextB = outB.state || outB;
        return { count: nextB.equips.length };
      })()`);
      assert.equal(res.count, 3);
    });

    it('T2-F09-05: 合成昇格天井境界（並→良:3, 良→秀:4, 秀→優:5, 優→極:6）全段階昇格保証', async () => {
      await ensureBootedHttp(true);
      const allTiersOk = await sharedBrowser.eval(`(() => {
        const tpl = IkaiApp.MasterData.EQUIPS[0];
        const ceilings = [3, 4, 5, 6];
        for (let q = 0; q < 4; q++) {
          let st = IkaiApp.StateStore.createInitialState();
          st.currencies.starCoins = 999999;
          st.equips = [];
          for (let i = 0; i <= ceilings[q] + 1; i++) {
            st.equips.push({ uid: 'c_' + q + '_' + i, equipId: tpl.id, qualityIdx: q, locked: false });
          }
          let promoted = false;
          for (let k = 1; k <= ceilings[q]; k++) {
            const out = IkaiApp.Progression.synthesizeEquip(st, 'c_' + q + '_0', 'c_' + q + '_' + k);
            st = out.state || out;
            const base = st.equips.find(e => e.uid === 'c_' + q + '_0');
            if (base && base.qualityIdx === q + 1) {
              promoted = true;
              break;
            }
          }
          if (!promoted) return { ok: false, failedQualityIdx: q };
        }
        return { ok: true };
      })()`);
      assert.equal(allTiersOk.ok, true, JSON.stringify(allTiersOk));
    });
  });

  // =========================================================================
  // F10 Boundaries (5)
  // =========================================================================
  describe('F10 Boundaries', () => {
    it('T2-F10-01: 覚醒0状態で紋章第2層・第3層ノード解放拒否', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.currencies.emblemShards = 999;
        const out = IkaiApp.Progression.unlockEmblemNode(st, cid, 5);
        const next = out.state || out;
        return { nodes: next.roster[cid].emblemNodes };
      })()`);
      assert.equal(res.nodes.includes(5), false);
    });

    it('T2-F10-02: 素材0個状態での強化ボタン押下でマイナス残高にならない', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.currencies.emblemShards = 0;
        st.currencies.masteryBooks = 0;
        const o1 = IkaiApp.Progression.unlockEmblemNode(st, cid, 1);
        const s1 = o1.state || o1;
        return { shards: s1.currencies.emblemShards, nodes: s1.roster[cid].emblemNodes.length };
      })()`);
      assert.equal(res.shards, 0);
      assert.equal(res.nodes, 0);
    });

    it('T2-F10-03: 覚醒3段階・熟練Rank5 上限到達後の追加強化拒否', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.roster[cid].shards = 999;
        for (let i = 0; i < 6; i++) {
          const out = IkaiApp.Progression.awakenCharacter(st, cid);
          st = out.state || out;
        }
        const sid = Object.keys(st.skillInventory)[0];
        st.skillInventory[sid].uses = 999;
        st.currencies.masteryBooks = 999;
        for (let i = 0; i < 8; i++) {
          const out = IkaiApp.Progression.upgradeSkillMastery(st, sid, cid);
          st = out.state || out;
        }
        return { awakening: st.roster[cid].awakening, rank: st.skillInventory[sid].rank };
      })()`);
      assert.equal(res.awakening, 3);
      assert.equal(res.rank, 5, 'Skill mastery rank must cap at 5 even with excess uses and books');
    });

    it('T2-F10-04: 覚醒1未達（熟練上限 Rank 3）での Rank 4 昇格ブロック', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.roster[cid].awakening = 0;
        const sid = Object.keys(st.skillInventory)[0];
        st.skillInventory[sid].uses = 999;
        st.currencies.masteryBooks = 999;
        for (let i = 0; i < 10; i++) {
          const out = IkaiApp.Progression.upgradeSkillMastery(st, sid, cid);
          st = out.state || out;
        }
        return { r: st.skillInventory[sid].rank };
      })()`);
      assert.equal(res.r, 3, `Expected strict Rank 3 cap before Awakening 2, got ${res.r}`);
    });

    it('T2-F10-05: 自動周回中の全滅（敗北）発生時の安全停止確認', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          s.settings.autoRepeatCount = 3;
          s.party = ['char_nakamura_yui', null, null, null];
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_5', stageIndex: 5, startWave: 4 });
      })()`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, false, 'Underpowered solo healer on 5-6 must lose');
      const repeatAfter = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.autoRepeatCount');
      assert.equal(repeatAfter, 0, 'Auto-repeat must safely stop (reset to 0) on defeat');
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F11 Boundaries (5)
  // =========================================================================
  describe('F11 Boundaries', () => {
    it('T2-F11-01: 制約試練「SSR禁止」に SSR 1体を含めた違反検知', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const ssr = IkaiApp.MasterData.CHARACTERS.find(c => c.rarity === 'SSR');
        return IkaiApp.MasterData.validateTrialParty('trial_1', [ssr]);
      })()`);
      assert.equal(res.ok, false);
      assert.ok(res.reasons.some((r) => r.includes('SSR')));
    });

    it('T2-F11-02: 制約試練（Rのみ/ヒーラー禁止/タンク禁止/2人以下）の違反検知網羅', async () => {
      await ensureBootedHttp(false);
      const check = await sharedBrowser.eval(`(() => {
        const ssrTank = IkaiApp.MasterData.CHARACTERS.find(c => c.rarity === 'SSR' && c.role === 'タンク');
        const rHeal = IkaiApp.MasterData.CHARACTERS.find(c => c.rarity === 'R' && c.role === 'ヒーラー');
        const rDps = IkaiApp.MasterData.CHARACTERS.filter(c => c.rarity === 'R');
        return {
          t2_onlyR: IkaiApp.MasterData.validateTrialParty('trial_2', [ssrTank]).ok === false,
          t3_noHeal: IkaiApp.MasterData.validateTrialParty('trial_3', [rHeal]).ok === false,
          t4_noTank: IkaiApp.MasterData.validateTrialParty('trial_4', [ssrTank]).ok === false,
          t5_max2: IkaiApp.MasterData.validateTrialParty('trial_5', rDps.slice(0, 3)).ok === false
        };
      })()`);
      assert.deepEqual(check, { t2_onlyR: true, t3_noHeal: true, t4_noTank: true, t5_max2: true });
    });

    it('T2-F11-03: 制約試練「0人編成」出撃ブロック', async () => {
      await ensureBootedHttp(true);
      const check = await sharedBrowser.eval(`IkaiApp.MasterData.validateTrialParty('trial_1', [])`);
      assert.equal(check.ok, false);
    });

    it('T2-F11-04: 無限深淵の最深記録が下位階クリアで逆戻りしない', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => { s.progress.abyssMaxFloor = 10; });
        IkaiApp.App.startBattle('abyss', { floor: 1 });
      })()`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true, 'Abyss 1F must be cleared');
      const maxFloor = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.abyssMaxFloor');
      assert.equal(maxFloor, 10, 'Clearing lower Abyss floor must NOT regress abyssMaxFloor');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F11-05: 異界討伐の3難易度存在と安全敗北リザルト', async () => {
      await ensureBootedHttp(true);
      const diffs = await sharedBrowser.eval('IkaiApp.MasterData.RAID_BOSSES[0].difficulties.length');
      assert.equal(diffs, 3);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => { s.party = ['char_nakamura_yui', null, null, null]; });
        IkaiApp.App.startBattle('raid', { raidId: 'raid_zankyo_ryu', difficulty: 2 });
      })()`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, false, 'Solo R healer vs extreme raid must lose safely');
      const raidCleared = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.raidCleared');
      assert.equal(Boolean(raidCleared?.raid_zankyo_ryu?.extreme), false);
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // F12 Boundaries (5)
  // =========================================================================
  describe('F12 Boundaries', () => {
    it('T2-F12-01: 残響石不足（149個）での単発召喚ブロック（負数禁止）', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        st.currencies.echoStones = 149;
        const out = IkaiApp.Progression.rollSummon(st, IkaiApp.MasterData.BANNERS[0].id, 1);
        const next = out.state || out;
        return { stones: next.currencies.echoStones };
      })()`);
      assert.equal(res.stones, 149);
    });

    it('T2-F12-02: 天井 79/80 からの単発召喚でピックアップSSR確定＆天井0リセット', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        st.currencies.echoStones = 300;
        st.summon.pityCount = 79;
        const banner = IkaiApp.MasterData.BANNERS[0];
        const out = IkaiApp.Progression.rollSummon(st, banner.id, 1);
        const next = out.state || out;
        const pulled = (out.results || out.pulled || [])[0];
        const char = IkaiApp.MasterData.CHARACTER_MAP[pulled?.charId || pulled?.id];
        return {
          pityAfter: next.summon.pityCount,
          rarity: char?.rarity,
          charId: char?.id,
          pickupIds: banner.pickupCharIds
        };
      })()`);
      assert.equal(res.rarity, 'SSR', '80th summon must guarantee SSR');
      assert.equal(res.pityAfter, 0, 'Pity counter must reset to 0 on SSR');
      assert.ok(res.pickupIds.includes(res.charId), `80th summon must yield pickup SSR, got ${res.charId}`);
    });

    it('T2-F12-03: 80連未満でのピックアップSSR出現時天井リセット整合性', async () => {
      await ensureBootedHttp(true);
      const res = await sharedBrowser.eval(`(() => {
        const bid = IkaiApp.MasterData.BANNERS[0].id;
        for (let attempt = 0; attempt < 5; attempt++) {
          let st = IkaiApp.StateStore.createInitialState();
          st.currencies.echoStones = 30000;
          st.summon.pityCount = 0;
          for (let batch = 0; batch < 7; batch++) {
            const out = IkaiApp.Progression.rollSummon(st, bid, 10);
            st = out.state || out;
            const results = out.results || out.pulled || [];
            let lastSsrIdx = -1;
            results.forEach((r, idx) => {
              if (IkaiApp.MasterData.CHARACTER_MAP[r.charId || r.id]?.rarity === 'SSR') {
                lastSsrIdx = idx;
              }
            });
            if (lastSsrIdx > -1) {
              return {
                hitNaturalSsrBelow80: true,
                pityAfter: st.summon.pityCount,
                expectedPity: results.length - 1 - lastSsrIdx
              };
            }
          }
        }
        return { hitNaturalSsrBelow80: false };
      })()`);
      assert.equal(res.hitNaturalSsrBelow80, true, 'Must hit a natural SSR within 70 pulls (<80 pity)');
      assert.equal(res.pityAfter, res.expectedPity, 'Pity counter must reset exactly at the SSR pull index');
      assert.ok(res.pityAfter < 10);
    });

    it('T2-F12-04: 覚醒3段階到達済みキャラの重複召喚で交換結晶変換 (50/15/5)', async () => {
      await ensureBootedHttp(true);
      const conv = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        st.currencies.echoStones = 30000;
        st.currencies.exchangeCrystals = 0;
        for (const c of IkaiApp.MasterData.CHARACTERS) {
          st.roster[c.id] = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3 };
        }
        const out = IkaiApp.Progression.rollSummon(st, IkaiApp.MasterData.BANNERS[0].id, 10);
        const next = out.state || out;
        const results = out.results || out.pulled || [];
        let expected = 0;
        for (const item of results) {
          const ch = IkaiApp.MasterData.CHARACTER_MAP[item.charId || item.id];
          expected += ch.rarity === 'SSR' ? 50 : ch.rarity === 'SR' ? 15 : 5;
        }
        return { actual: next.currencies.exchangeCrystals, expected };
      })()`);
      assert.equal(conv.actual, conv.expected);
    });

    it('T2-F12-05: 編成中キャラの共鳴支援重複セット禁止', async () => {
      await ensureBootedHttp(true);
      const blocked = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        const activeId = st.party[0];
        const o1 = IkaiApp.Progression.setResonance(st, 0, activeId);
        const s1 = o1.state || o1;
        return !s1.resonanceSlots.includes(activeId);
      })()`);
      assert.equal(blocked, true, 'Active party member must be excluded from resonance slot');
    });
  });

  // =========================================================================
  // F13 Boundaries (5)
  // =========================================================================
  describe('F13 Boundaries', () => {
    it('T2-F13-01: 初期所持最小状態と全20体所持状態の両極端での図鑑カウント', async () => {
      await ensureBootedHttp(true);
      await openTab(sharedBrowser, 'codex');
      const before = await sharedBrowser.eval(`({
        count: Object.keys(IkaiApp.StateStore.getState().roster).length,
        txt: document.querySelector('.lower-deck')?.innerText || ''
      })`);
      assert.equal(before.count, 5);
      assert.match(before.txt, /5\s*\/\s*20|所持[^\d]*5/);
      await sharedBrowser.eval(`IkaiApp.StateStore.update(s => {
        for (const c of IkaiApp.MasterData.CHARACTERS) if (!s.roster[c.id]) s.roster[c.id] = ${ROSTER_ENTRY_EXPR};
      })`);
      const after = await sharedBrowser.eval(`({
        count: Object.keys(IkaiApp.StateStore.getState().roster).length,
        txt: document.querySelector('.lower-deck')?.innerText || ''
      })`);
      assert.equal(after.count, 20);
      assert.match(after.txt, /20\s*\/\s*20|全仲間\s*\(20\)|所持[^\d]*20/);
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F13-02: 全画面で同一3段ソート規則が適用される', async () => {
      await ensureBootedHttp(false);
      const sorted = await sharedBrowser.eval(`IkaiApp.StateStore.sortUnits(IkaiApp.MasterData.CHARACTERS.slice().reverse()).map(c => c.name)`);
      assert.deepEqual(sorted, EXPECTED_SORT_ORDER_NAMES);
    });

    it('T2-F13-03: 全画面 DOM に対する Lv / レベル 禁止語句境界確認', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const audit = await sharedBrowser.auditProhibitedContent();
        const lvHits = audit.textHits.filter((h) => h.id === 'lv_abbr' || h.id === 'level_word');
        assert.deepEqual(lvHits, [], `Lv/レベル found on ${tabKey}`);
      }
    });

    it('T2-F13-04: 全テキスト中の省略記号境界 (・・・ / … / ...)', async () => {
      await ensureBootedHttp(false);
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const ell = await sharedBrowser.auditNoEllipsisAndOverflow();
        assert.equal(ell.ellipsisHits.length, 0, `Ellipsis on ${tabKey}: ${JSON.stringify(ell.ellipsisHits)}`);
      }
    });

    it('T2-F13-05: 設定変更直後のリロード保存整合性', async () => {
      await ensureBootedHttp(true);
      const saveRes = await sharedBrowser.eval(`(async () => {
        IkaiApp.AudioSE.setVolume(0.42);
        IkaiApp.StateStore.update(s => { s.settings.soundVolume = 0.42; });
        return await IkaiApp.StateStore.saveNow();
      })()`);
      assert.equal(saveRes?.ok, true, 'StateStore.saveNow() must succeed after volume update');
      await sharedBrowser.reload();
      await waitForIkaiBooted(sharedBrowser);
      const v = await sharedBrowser.eval('IkaiApp.AudioSE.getSettings().volume');
      assert.ok(Math.abs(v - 0.42) < 0.02);
    });
  });

  // =========================================================================
  // F14 Boundaries (5)
  // =========================================================================
  describe('F14 Boundaries', () => {
    it('T2-F14-01: 装備120個所持時の下半分スクロール＆上半分固定維持', async () => {
      await ensureBootedHttp(true);
      await sharedBrowser.eval(`IkaiApp.StateStore.update(s => {
        for (let i = 0; i < 120; i++) {
          const tpl = IkaiApp.MasterData.EQUIPS[i % IkaiApp.MasterData.EQUIPS.length];
          s.equips.push({ uid: 'stress_' + i, equipId: tpl.id, qualityIdx: i % 5, locked: false });
        }
      })`);
      await openTab(sharedBrowser, 'enhance');
      const scrollRes = await sharedBrowser.eval(`(() => {
        const sc = document.querySelector('.lower-scroll');
        const upper = document.querySelector('.upper-stage');
        const beforeTop = upper.getBoundingClientRect().top;
        const canScroll = Boolean(sc && sc.scrollHeight > sc.clientHeight);
        if (sc) sc.scrollTop = 250;
        return {
          hasScroller: Boolean(sc),
          canScroll,
          scrollTopAfter: sc ? sc.scrollTop : 0,
          beforeTop,
          afterTop: upper.getBoundingClientRect().top
        };
      })()`);
      assert.equal(scrollRes.hasScroller, true);
      assert.equal(scrollRes.canScroll, true, '120 equips must scroll inside .lower-scroll');
      assert.ok(scrollRes.scrollTopAfter > 0);
      assert.equal(scrollRes.beforeTop, scrollRes.afterTop);
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F14-02: モーダル展開中のタブ切替でデッドロック・ゴースト残留なし', async () => {
      await ensureBootedHttp(false);
      await openTab(sharedBrowser, 'codex');
      await sharedBrowser.tap({ labelRegex: /桐生 貴史/, scope: 'lower' });
      const opened = await sharedBrowser.eval(`Boolean(document.querySelector('[data-testid="detail-modal"], .detail-sheet, .modal')) || (document.querySelector('.lower-deck')?.innerText || '').includes('固有技')`);
      assert.equal(opened, true, 'Detail modal/sheet must open when tapping character');
      await openTab(sharedBrowser, 'sortie');
      const ghost = await sharedBrowser.eval(`Boolean(document.querySelector('[data-testid="detail-modal"], .detail-sheet, .modal'))`);
      assert.equal(ghost, false, 'Old detail modal must not remain after switching tabs');
      const split = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F14-03: SafeArea 下端付近ボタンの実タップ反応確認', async () => {
      const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT, emulateSafeArea: { top: 47, bottom: 34 } });
      try {
        await bootIkaiApp(b, getAppUrl(), { clearStorage: true });
        await openTab(b, 'settings');
        const bottomPad = await b.eval('parseFloat(getComputedStyle(document.querySelector(".lower-deck")).paddingBottom)');
        assert.ok(bottomPad >= 34, `Expected lower paddingBottom >= 34, got ${bottomPad}`);
        const tabSpec = { labelRegex: /^出撃$/, testId: 'tab-sortie', scope: 'lower' };
        const tabInfo = await b.queryControl(tabSpec);
        assert.equal(tabInfo.found, true);
        assert.ok(tabInfo.rect.bottom <= 844 - 34 + 2, `Bottom tab rect (${tabInfo.rect.bottom}) intrudes into SafeArea`);
        await b.tap(tabSpec);
        const sortieActive = await b.eval(`(document.querySelector('.lower-deck')?.innerText || '').includes('本編')`);
        assert.equal(sortieActive, true, 'Tapping bottom tab inside SafeArea must switch to sortie');
        const split = await b.auditUpperLowerSplit();
        assert.equal(split.ok, true, split.violations.join('; '));
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });

    it('T2-F14-04: 同一タブ・ボタンの高速連続タップでの二重実行防止', async () => {
      await ensureBootedHttp(true);

      const sortieTabSpec = { labelRegex: /^出撃$/, testId: 'tab-sortie', scope: 'lower' };
      const tabCtrl = await sharedBrowser.queryControl(sortieTabSpec);
      assert.equal(tabCtrl.found, true, 'Sortie tab button must exist');
      const tabCx = tabCtrl.rect.left + tabCtrl.rect.width / 2;
      const tabCy = tabCtrl.rect.top + tabCtrl.rect.height / 2;
      for (let i = 0; i < 4; i++) {
        await sharedBrowser.tapPoint(tabCx, tabCy);
      }
      const tabDom = await sharedBrowser.eval(`({
        tabCount: document.querySelectorAll('.lower-deck nav button, .lower-deck [role="tab"]').length,
        panelCount: document.querySelectorAll('.lower-deck .sortie-panel, .lower-deck [data-testid="sortie-panel"]').length,
        hasMain: (document.querySelector('.lower-deck')?.innerText || '').includes('本編')
      })`);
      assert.equal(tabDom.tabCount, Object.keys(TAB_SPECS).length, 'Rapid tab taps must not duplicate nav tabs');
      assert.ok(tabDom.panelCount <= 1, `Sortie panel must not duplicate, got ${tabDom.panelCount}`);
      assert.equal(tabDom.hasMain, true);
      const splitAfterTabs = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitAfterTabs.ok, true, splitAfterTabs.violations.join('; '));

      const beforeBattles = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.totalBattles');
      const startSpec = { labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' };
      const startCtrl = await sharedBrowser.queryControl(startSpec);
      assert.equal(startCtrl.found, true, 'Sortie start button must exist');
      const startCx = startCtrl.rect.left + startCtrl.rect.width / 2;
      const startCy = startCtrl.rect.top + startCtrl.rect.height / 2;
      await Promise.all([
        sharedBrowser.tapPoint(startCx, startCy),
        sharedBrowser.tapPoint(startCx, startCy)
      ]);
      const snap0 = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'single battle start' });
      assert.ok(snap0 && snap0.id, 'Battle snapshot must be created');

      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true, 'Single battle from rapid double tap must complete in victory');
      const afterState = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.getState();
        return {
          totalBattles: st.progress.totalBattles,
          clear11Count: st.progress.clearedStages.filter(id => id === '1-1').length
        };
      })()`);
      assert.equal(
        afterState.totalBattles,
        beforeBattles + 1,
        `Rapid double tap must execute exactly 1 battle (${beforeBattles} -> ${afterState.totalBattles})`
      );
      assert.equal(afterState.clear11Count, 1, 'Cleared stage 1-1 must not be recorded twice');
      await sharedBrowser.assertZeroErrors();
    });

    it('T2-F14-05: 非戦闘アイドル待機中に異界調査が実時間で勝手進行しない', async () => {
      await ensureBootedHttp(true);
      const before = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const bench = IkaiApp.MasterData.CHARACTERS.find(c => !st.party.includes(c.id));
        st.roster[bench.id] = ${ROSTER_ENTRY_EXPR};
        const started = IkaiApp.Progression.startExpedition(st, IkaiApp.MasterData.EXPEDITION_ZONES[0].id, [bench.id]);
        IkaiApp.StateStore.setState(started.state || started);
        return JSON.stringify(IkaiApp.StateStore.getState().expeditions);
      })()`);
      await new Promise((r) => setTimeout(r, 400));
      const after = await sharedBrowser.eval('JSON.stringify(IkaiApp.StateStore.getState().expeditions)');
      assert.equal(after, before, 'Expedition must progress ONLY by battle count, not real-time timer');
    });
  });

  // =========================================================================
  // F15 Boundaries (5)
  // =========================================================================
  describe('F15 Boundaries', () => {
    it('T2-F15-01: 空 localStorage からのコールドスタート安全起動', async () => {
      await ensureBootedHttp(true);
      const st = await sharedBrowser.eval('IkaiApp.StateStore.getState()');
      assert.ok(Array.isArray(st.party) && st.party.filter(Boolean).length >= 1);
    });

    it('T2-F15-02: SW オフライン切替直後リロードでの起動保証', async () => {
      await withTempHttpUrl(async (httpUrl) => {
        const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
        try {
          await bootIkaiApp(b, httpUrl, { clearStorage: true });
          const sw = await b.waitForServiceWorkerReady(10000);
          assert.equal(sw.supported, true);
          await b.reload();
          await waitForIkaiBooted(b);
          await b.setOffline(true);
          await b.reload();
          await waitForIkaiBooted(b);
          const offState = await b.eval(`({
            controlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
            partyLen: IkaiApp.StateStore.getState().party.filter(Boolean).length,
            hasUpper: Boolean(document.querySelector('.upper-stage')),
            hasLower: Boolean(document.querySelector('.lower-deck'))
          })`);
          assert.equal(offState.controlled, true, 'SW controller must persist during offline reload');
          assert.ok(offState.partyLen >= 1);
          assert.equal(offState.hasUpper && offState.hasLower, true);
          const split = await b.auditUpperLowerSplit();
          assert.equal(split.ok, true, split.violations.join('; '));
          await b.setOffline(false);
          await b.assertZeroErrors();
        } finally {
          await b.close();
        }
      });
    });

    it('T2-F15-03: バックアップ JSON 日本語文字コード（UTF-8）整合性', async () => {
      await ensureBootedHttp(true);
      const ok = await sharedBrowser.eval(`(async () => {
        const st = IkaiApp.StateStore.createInitialState();
        const raw = await IkaiApp.SaveSecurity.exportBackup(st);
        const restored = await IkaiApp.SaveSecurity.importBackup(raw);
        return Boolean(restored?.ok);
      })()`);
      assert.equal(ok, true);
    });

    it('T2-F15-04: 別ポートオリジン間 (portA -> portB) バックアップ移行成功', async () => {
      const s2 = await startStaticServer(ctx.projectDir);
      try {
        const backup = await withTempHttpUrl(async (httpUrl) => {
          await bootIkaiApp(sharedBrowser, httpUrl, { clearStorage: true });
          return await sharedBrowser.eval(`(async () => {
            const st = IkaiApp.StateStore.createInitialState();
            st.currencies.echoStones = 8888;
            return await IkaiApp.SaveSecurity.exportBackup(st);
          })()`);
        });
        await bootIkaiApp(sharedBrowser, `${s2.baseUrl}/index.html`, { clearStorage: true });
        const imp = await sharedBrowser.eval(`(async (j) => await IkaiApp.SaveSecurity.importBackup(j))(${JSON.stringify(backup)})`);
        assert.equal(imp.ok, true);
        assert.equal(imp.state.currencies.echoStones, 8888);
      } finally {
        await s2.close();
      }
    });

    it('T2-F15-05: file:// 環境で全7タブ遷移時の SecurityError ゼロ確認', async () => {
      const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(b, ctx.fileUrl, { clearStorage: true });
        assert.equal(await b.eval('IkaiApp.Env.isFile()'), true);
        for (const tabKey of Object.keys(TAB_SPECS)) {
          await openTab(b, tabKey);
          const textLen = await b.eval(`(document.querySelector('.lower-deck')?.innerText || '').trim().length`);
          assert.ok(textLen > 0, `file:// tab ${tabKey} must render content`);
        }
        const split = await b.auditUpperLowerSplit();
        assert.equal(split.ok, true, split.violations.join('; '));
        await b.assertZeroErrors();
      } finally {
        await b.close();
      }
    });
  });
});
