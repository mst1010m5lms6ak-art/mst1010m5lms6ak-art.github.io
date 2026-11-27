import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, it } from 'node:test';
import {
  CdpBrowser,
  MOBILE_VIEWPORT,
  bootIkaiApp,
  openTab,
  resolveProjectContext,
  startStaticServer
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

async function setViewportAndSafeArea(browser, width, height, safeTop, safeBottom) {
  await browser.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 3,
    mobile: true
  });
  await browser.eval(`(() => {
    document.documentElement.style.setProperty('--safe-top', '${safeTop}px');
    document.documentElement.style.setProperty('--safe-bottom', '${safeBottom}px');
    return true;
  })()`);
}

async function auditFullViewportGeometry(browser, label, width, height) {
  const split = await browser.auditUpperLowerSplit({ expectedWidth: width, expectedHeight: height });
  assert.equal(split.ok, true, `[${label}] split violation: ${split.violations.join('; ')}`);

  const ell = await browser.auditNoEllipsisAndOverflow();
  assert.equal(ell.ok, true, `[${label}] ellipsis/overflow: ${JSON.stringify(ell)}`);

  const details = await browser.eval(`(() => {
    const upper = document.getElementById('upper-stage');
    const battleStage = upper ? upper.querySelector('.battle-stage') : null;
    const resultStage = upper ? upper.querySelector('.result-stage') : null;
    const smallControls = [];
    const tinyTexts = [];

    for (const c of document.querySelectorAll('#lower-deck button, #lower-deck input, #lower-deck select, #lower-deck textarea')) {
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = c.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.height < 39.5) {
        smallControls.push({ action: c.dataset?.action || '', h: Math.round(r.height * 10) / 10, text: (c.textContent || '').trim().slice(0, 20) });
      }
    }

    for (const el of document.querySelectorAll('#app-shell *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      let hasDirectText = false;
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim().length > 0) {
          hasDirectText = true;
          break;
        }
      }
      if (hasDirectText && el.namespaceURI === 'http://www.w3.org/1999/xhtml') {
        const fsPx = parseFloat(cs.fontSize);
        if (fsPx > 0 && fsPx < 9.95) {
          tinyTexts.push({ cls: el.className, fs: fsPx, text: el.textContent.trim().slice(0, 20) });
        }
      }
    }

    return {
      upperOverflowY: upper ? upper.scrollHeight > upper.clientHeight + 1 : false,
      upperScrollH: upper ? upper.scrollHeight : 0,
      upperClientH: upper ? upper.clientHeight : 0,
      battleOverflowY: battleStage ? battleStage.scrollHeight > battleStage.clientHeight + 1 : false,
      battleScrollH: battleStage ? battleStage.scrollHeight : 0,
      battleClientH: battleStage ? battleStage.clientHeight : 0,
      resultOverflowY: resultStage ? resultStage.scrollHeight > resultStage.clientHeight + 1 : false,
      smallControls,
      tinyTexts
    };
  })()`);

  assert.equal(details.upperOverflowY, false, `[${label}] .upper-stage vertical overflow (${details.upperScrollH} > ${details.upperClientH})`);
  assert.equal(details.battleOverflowY, false, `[${label}] .battle-stage vertical overflow (${details.battleScrollH} > ${details.battleClientH})`);
  assert.equal(details.resultOverflowY, false, `[${label}] .result-stage vertical overflow`);
  assert.deepEqual(details.smallControls, [], `[${label}] touch target < 40px: ${JSON.stringify(details.smallControls)}`);
  assert.deepEqual(details.tinyTexts, [], `[${label}] tiny font < 10px: ${JSON.stringify(details.tinyTexts)}`);
}

const ROSTER_ENTRY_EXPR = `({
  awakening: 0,
  shards: 0,
  emblemNodes: [],
  equipped: { '主器': null, '護符': null, '装具': null, '印章': null },
  skills: [null, null],
  tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'unique_first' }
})`;

describe('Tier 5: White-Box Adversarial Probes & Coverage Hardening', () => {
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
  // Part A: Confirmed Bug Regression Probes (must FAIL before fix, PASS after)
  // =========================================================================
  describe('Part A: Discovered White-Box Bugs & Layout Regressions', () => {
    it('T5-BUG-01: App.startBattle(trial) は options.skipTrialCheck 等で制約検証をバイパスさせない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        const st = JSON.parse(JSON.stringify(IkaiApp.StateStore.getState()));
        st.roster.char_kujo_renji = ${ROSTER_ENTRY_EXPR};
        st.party = ['char_kujo_renji', 'char_todo_seiichi', null, null];
        IkaiApp.StateStore.setState(st);
        const normal = IkaiApp.App.startBattle('trial', { trialId: 'trial_1' });
        const bypass = IkaiApp.App.startBattle('trial', { trialId: 'trial_1' }, { skipTrialCheck: true });
        return { normalBlocked: normal === null, bypassBlocked: bypass === null };
      })()`);
      assert.equal(res.normalBlocked, true);
      assert.equal(res.bypassBlocked, true, 'App.startBattle("trial") must never bypass validateTrialEntry via skipTrialCheck');
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-BUG-02: 被弾揺れアニメーション(.anim-hit)中に .battle-stage.scrollWidth > clientWidth が発生しない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await setViewportAndSafeArea(sharedBrowser, 393, 852, 59, 34);
      await sharedBrowser.eval(`(() => {
        IkaiApp.App.startBattle('stage', { stageId: '5-6' });
        const b = IkaiApp.CombatEngine.getActiveBattle();
        b.waveIndex = 3;
        for (const e of b.enemies) e.hp = 0;
        b.allies[0].gauge = 100;
        IkaiApp.CombatEngine.step(b, 100);
        const snap = IkaiApp.CombatEngine.getSnapshot(b);
        IkaiApp.UIRenderer.patchBattleFrame(
          document.getElementById('upper-stage'),
          document.getElementById('lower-deck'),
          snap,
          IkaiApp.App.getUiState()
        );
        document.querySelectorAll('.ally-plate, .enemy-plate, .boss-frame').forEach(el => {
          el.classList.remove('anim-hit');
          void el.offsetWidth;
          el.classList.add('anim-hit');
        });
      })()`);

      for (const delayMs of [35, 35, 35, 35]) {
        await new Promise((r) => setTimeout(r, delayMs));
        const check = await sharedBrowser.eval(`(() => {
          const stg = document.querySelector('.battle-stage');
          return { sw: stg ? stg.scrollWidth : 0, cw: stg ? stg.clientWidth : 0 };
        })()`);
        assert.ok(
          check.sw <= check.cw + 1,
          `.battle-stage horizontal overflow during .anim-hit: scrollWidth=${check.sw} > clientWidth=${check.cw}`
        );
        const ell = await sharedBrowser.auditNoEllipsisAndOverflow();
        assert.equal(ell.ok, true, `Overflow during .anim-hit: ${JSON.stringify(ell.overflowHits)}`);
      }
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-BUG-03: 戦闘詳細パネル展開中(showDpsDetail)に切替ボタンDOMが毎フレーム破棄・再生成されない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await sharedBrowser.eval(`(() => {
        IkaiApp.App.startBattle('stage', { stageId: '1-6' });
        document.querySelector('[data-action="toggle-dps-detail"]').click();
        window.__t5DetailBtnRef = document.querySelector('[data-action="switch-battle-detail"][data-detail-mode="logs"]');
      })()`);
      await new Promise((r) => setTimeout(r, 120));
      const preserved = await sharedBrowser.eval(`(() => {
        const cur = document.querySelector('[data-action="switch-battle-detail"][data-detail-mode="logs"]');
        return Boolean(window.__t5DetailBtnRef && cur && window.__t5DetailBtnRef === cur);
      })()`);
      assert.equal(preserved, true, 'Battle detail switcher buttons must not be destroyed/recreated every animation frame');
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-BUG-04: CombatEngine.createBattle は重複 partyIds を許容せず一意化する', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        const b = IkaiApp.CombatEngine.createBattle({
          mode: 'stage',
          stageId: '1-1',
          state: st,
          partyIds: ['char_todo_seiichi', 'char_todo_seiichi', 'char_kobayashi_shohei']
        });
        const ids = b ? b.allies.map(a => a.id) : [];
        return { ids, uniqueCount: new Set(ids).size };
      })()`);
      assert.equal(res.ids.length, res.uniqueCount, `Duplicate ally unit IDs in battle: ${JSON.stringify(res.ids)}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-BUG-05: 切り札予約中の味方が戦闘不能(HP 0)になると予約状態が解除されKOプレートに予約表示が残らない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        const b = IkaiApp.App.startBattle('stage', { stageId: '1-1' });
        const ally = b.allies[0];
        IkaiApp.CombatEngine.reserveSkill(b, ally.id, 'unique');
        // Deal lethal damage through a normal enemy turn or direct lethal step via high enemy ATK
        b.enemies[0].atk = 999999;
        b.enemies[0].gauge = 100;
        b.allies.forEach(a => { a.gauge = 0; });
        // Ensure target is allies[0]
        b.allies.forEach((a, idx) => { if (idx > 0) a.hp = a.maxHp; });
        ally.hp = 1;
        IkaiApp.CombatEngine.step(b, 100);
        const snap = IkaiApp.CombatEngine.getSnapshot(b);
        IkaiApp.UIRenderer.patchBattleFrame(
          document.getElementById('upper-stage'),
          document.getElementById('lower-deck'),
          snap,
          IkaiApp.App.getUiState()
        );
        const koUnit = snap.allies.find(a => a.id === ally.id);
        const koReservedTags = document.querySelectorAll('.ally-plate.is-ko .reserved-tag.is-visible').length;
        return {
          hp: koUnit.hp,
          reservedSkillId: koUnit.reservedSkillId,
          koReservedTags
        };
      })()`);
      assert.equal(res.hp, 0);
      assert.equal(res.reservedSkillId, null, 'KO unit must clear reservedSkillId');
      assert.equal(res.koReservedTags, 0, 'KO ally plate must not display reserved tag');
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-BUG-06: 393x852 (SA 59/34) 5-3 Wave 5 で長文ティッカー＋予兆バー折り返し時も .battle-stage が縦溢れしない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await setViewportAndSafeArea(sharedBrowser, 393, 852, 59, 34);
      const res = await sharedBrowser.eval(`(() => {
        const st = JSON.parse(JSON.stringify(IkaiApp.StateStore.getState()));
        const ids = ['char_himuro_soichiro', 'char_hasegawa_haruto', 'char_miyamoto_tsumugi', 'char_shiraishi_sumika'];
        for (const id of ids) {
          if (!st.roster[id]) st.roster[id] = ${ROSTER_ENTRY_EXPR};
          st.roster[id].awakening = 3;
        }
        st.party = ids;
        IkaiApp.StateStore.setState(st);
        const b = IkaiApp.App.startBattle('stage', { stageId: '5-3' });
        b.waveIndex = 3;
        for (const e of b.enemies) e.hp = 0;
        b.allies[0].gauge = 100;
        IkaiApp.CombatEngine.step(b, 100);
        const boss = b.enemies.find(e => e.isBoss);
        const tSkill = boss.skills.find(s => s.telegraph);
        boss.activeTelegraph = {
          skillId: tSkill.id,
          skillName: tSkill.name,
          targetType: tSkill.targetType,
          warningText: '敵全体特大連続斬撃・防御低下・遅延効果の予兆：双界断絶斬（極限境界解放）',
          remainingTurns: 1,
          totalTurns: 2
        };
        b.logs.push('境界の看守・黒曜の双剣の反撃！ 氷室 宗一郎に99999ダメージ（会心・連続特大斬撃の予兆：双界断絶斬発動直前）');
        const snap = IkaiApp.CombatEngine.getSnapshot(b);
        IkaiApp.UIRenderer.patchBattleFrame(
          document.getElementById('upper-stage'),
          document.getElementById('lower-deck'),
          snap,
          IkaiApp.App.getUiState()
        );
        const upper = document.getElementById('upper-stage');
        const stage = upper.querySelector('.battle-stage');
        const dps = upper.querySelector('.dps-meter-panel');
        return {
          stageSH: stage.scrollHeight,
          stageCH: stage.clientHeight,
          dpsBottom: Math.round(dps.getBoundingClientRect().bottom * 10) / 10,
          upperBottom: Math.round(upper.getBoundingClientRect().bottom * 10) / 10
        };
      })()`);
      assert.ok(
        res.stageSH <= res.stageCH + 1 && res.dpsBottom <= res.upperBottom + 0.5,
        `5-3 W5 vertical overflow/clip at 393x852 SA 59/34: ${JSON.stringify(res)}`
      );
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // Part B: Untested Edge Paths (Security, Multi-Viewport Sub-Views, Engine, Progression)
  // =========================================================================
  describe('Part B: Adversarial Hardening Coverage', () => {
    it('T5-SEC-01: SaveSecurity 原型汚染・NaN/Infinity/負数通貨・WebCrypto/純粋JS HMAC完全一致・大容量バックアップ往復', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const sec = await sharedBrowser.eval(`(async () => {
        const st = IkaiApp.StateStore.createInitialState();
        // 200 equips roundtrip
        for (let i = 0; i < 200; i++) {
          const tpl = IkaiApp.MasterData.EQUIPS[i % IkaiApp.MasterData.EQUIPS.length];
          st.equips.push({ uid: 't5_eq_' + i, equipId: tpl.id, qualityIdx: i % 5, locked: i % 2 === 0 });
        }
        const signed = await IkaiApp.SaveSecurity.signState(st);
        const backupJson = await IkaiApp.SaveSecurity.exportBackup(st);
        const reimported = await IkaiApp.SaveSecurity.importBackup(backupJson);

        const canonical = IkaiApp.SaveSecurity._internal.canonicalStringify({
          format: signed.format,
          schemaVersion: signed.schemaVersion,
          alg: signed.alg,
          savedAt: signed.savedAt,
          payload: signed.payload
        });
        const pureMac = IkaiApp.SaveSecurity._internal.hmacSha256HexPureJs('ikai-zankyo:save-integrity:v1:2026', canonical);

        const protoJson = '{"format":"ikai-zankyo-save","schemaVersion":1,"alg":"HMAC-SHA256","savedAt":"2026-01-01T00:00:00Z","payload":{"__proto__":{"t5Polluted":true}},"mac":"' + 'a'.repeat(64) + '"}';
        const rProto = await IkaiApp.SaveSecurity.verifyAndParse(protoJson);

        const stCtor = JSON.parse(JSON.stringify(st));
        Object.defineProperty(stCtor.currencies, 'constructor', { value: 99, enumerable: true });
        const rCtor = IkaiApp.SaveSecurity.validateSchema(stCtor);

        const stNaN = JSON.parse(JSON.stringify(st));
        stNaN.currencies.starCoins = NaN;
        const rNaN = IkaiApp.SaveSecurity.validateSchema(stNaN);

        const stInf = JSON.parse(JSON.stringify(st));
        stInf.currencies.echoStones = Infinity;
        const rInf = IkaiApp.SaveSecurity.validateSchema(stInf);

        const stNeg = JSON.parse(JSON.stringify(st));
        stNeg.currencies.exchangeCrystals = -5;
        const rNeg = IkaiApp.SaveSecurity.validateSchema(stNeg);

        const stBadId = JSON.parse(JSON.stringify(st));
        stBadId.party[0] = 'char_nonexistent_hack';
        const rBadId = IkaiApp.SaveSecurity.validateSchema(stBadId);

        return {
          reimportOk: reimported.ok && reimported.state.equips.length === 206,
          hmacParity: signed.mac === pureMac,
          protoRejected: !rProto.ok,
          globalClean: !Boolean(({}).t5Polluted),
          ctorRejected: !rCtor.ok,
          nanRejected: !rNaN.ok,
          infRejected: !rInf.ok,
          negRejected: !rNeg.ok,
          badIdRejected: !rBadId.ok
        };
      })()`);
      assert.deepEqual(sec, {
        reimportOk: true,
        hmacParity: true,
        protoRejected: true,
        globalClean: true,
        ctorRejected: true,
        nanRejected: true,
        infRejected: true,
        negRejected: true,
        badIdRejected: true
      });
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-SEC-02: DOM XSS 防御（図鑑検索ペイロード＆改ざんlocalStorageキーの非HTML解釈）', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await openTab(sharedBrowser, 'codex');
      await sharedBrowser.setInputValue({ selector: '#codex-search-input', scope: 'lower' }, '<img src=x onerror="window.__xssHit=1">');
      const codexXss = await sharedBrowser.eval(`({
        hit: Boolean(window.__xssHit),
        imgCount: document.querySelectorAll('img').length
      })`);
      assert.deepEqual(codexXss, { hit: false, imgCount: 0 });

      await sharedBrowser.eval(`(() => {
        localStorage.setItem(
          IkaiApp.StateStore.STORAGE_KEY,
          JSON.stringify({
            format: 'ikai-zankyo-save',
            schemaVersion: 1,
            alg: 'HMAC-SHA256',
            savedAt: '2026-01-01T00:00:00Z',
            payload: { '<script>window.__xssHit=2</script>': 1 },
            mac: '0'.repeat(64)
          })
        );
      })()`);
      await sharedBrowser.reload();
      await sharedBrowser.waitFor(() => Boolean(window.IkaiApp && window.IkaiApp.App?.getUiState()?.booted));
      await openTab(sharedBrowser, 'settings');
      const tamperUi = await sharedBrowser.eval(`({
        hit: Boolean(window.__xssHit),
        warningText: document.querySelector('.upper-stage')?.innerText || '',
        noticeText: document.querySelector('.lower-deck')?.innerText || ''
      })`);
      assert.equal(tamperUi.hit, false);
      assert.ok(tamperUi.warningText.includes('不正データを検知') || tamperUi.noticeText.includes('署名'));
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-LAYOUT-01: 全サブビュー網羅（areas 4柱 / enhance 4サブ / summon 2サブ / codex 4カテゴリ / party / expedition / settings / battle詳細3種 / result）× 3ビューポートSafeArea検証', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const viewports = [
        { name: '390x844', w: 390, h: 844, t: 47, b: 34 },
        { name: '393x852', w: 393, h: 852, t: 59, b: 34 },
        { name: '430x932', w: 430, h: 932, t: 59, b: 34 }
      ];

      for (const vp of viewports) {
        await setViewportAndSafeArea(sharedBrowser, vp.w, vp.h, vp.t, vp.b);

        await openTab(sharedBrowser, 'sortie');
        for (const pillar of ['story', 'abyss', 'raid', 'trial']) {
          await sharedBrowser.eval(`document.querySelector('[data-action="switch-areas-pillar"][data-pillar="${pillar}"]').click()`);
          await auditFullViewportGeometry(sharedBrowser, `${vp.name}-areas-${pillar}`, vp.w, vp.h);
        }

        await openTab(sharedBrowser, 'enhance');
        for (const sub of ['chars', 'emblem', 'skills', 'equips']) {
          await sharedBrowser.eval(`document.querySelector('[data-action="switch-enhance-sub"][data-sub="${sub}"]').click()`);
          await auditFullViewportGeometry(sharedBrowser, `${vp.name}-enhance-${sub}`, vp.w, vp.h);
        }

        await openTab(sharedBrowser, 'summon');
        for (const sub of ['pull', 'shop']) {
          await sharedBrowser.eval(`document.querySelector('[data-action="switch-summon-sub"][data-sub="${sub}"]').click()`);
          await auditFullViewportGeometry(sharedBrowser, `${vp.name}-summon-${sub}`, vp.w, vp.h);
        }

        await openTab(sharedBrowser, 'codex');
        for (const cat of ['chars', 'enemies', 'equips', 'skills']) {
          await sharedBrowser.eval(`document.querySelector('[data-action="switch-codex-cat"][data-category="${cat}"]').click()`);
          await auditFullViewportGeometry(sharedBrowser, `${vp.name}-codex-${cat}`, vp.w, vp.h);
        }

        for (const tab of ['party', 'expedition', 'settings']) {
          await openTab(sharedBrowser, tab);
          await auditFullViewportGeometry(sharedBrowser, `${vp.name}-tab-${tab}`, vp.w, vp.h);
        }
      }

      // Battle detail modes (dps/logs/buffs) & Result view across 3 viewports
      await sharedBrowser.eval(`(() => {
        IkaiApp.App.startBattle('stage', { stageId: '1-3' });
        IkaiApp.CombatEngine.step(1000);
        document.querySelector('[data-action="toggle-dps-detail"]').click();
      })()`);
      for (const vp of viewports) {
        await setViewportAndSafeArea(sharedBrowser, vp.w, vp.h, vp.t, vp.b);
        for (const mode of ['dps', 'logs', 'buffs']) {
          await sharedBrowser.eval(`document.querySelector('[data-action="switch-battle-detail"][data-detail-mode="${mode}"]').click()`);
          await auditFullViewportGeometry(sharedBrowser, `${vp.name}-battle-detail-${mode}`, vp.w, vp.h);
        }
      }

      await sharedBrowser.eval(`(() => {
        const b = IkaiApp.CombatEngine.getActiveBattle();
        b.status = 'victory';
        IkaiApp.CombatEngine.step(100);
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.App.getUiState()?.mode === 'result', { label: 'result mode' });
      await sharedBrowser.eval(`document.querySelector('[data-action="toggle-result-logs"]')?.click()`);
      for (const vp of viewports) {
        await setViewportAndSafeArea(sharedBrowser, vp.w, vp.h, vp.t, vp.b);
        await auditFullViewportGeometry(sharedBrowser, `${vp.name}-result-logs`, vp.w, vp.h);
      }

      await sharedBrowser.assertZeroErrors();
    });

    it('T5-LAYOUT-02: 393x852 (SA 59/34) にて全20キャラ・全30ステージ上半分プレビューが縦クリップしない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await setViewportAndSafeArea(sharedBrowser, 393, 852, 59, 34);

      await openTab(sharedBrowser, 'enhance');
      const charOver = await sharedBrowser.eval(`(() => {
        const bad = [];
        const upper = document.getElementById('upper-stage');
        for (const c of IkaiApp.MasterData.CHARACTERS) {
          document.querySelector('[data-action="select-char"][data-char-id="' + c.id + '"]').click();
          if (upper.scrollHeight > upper.clientHeight + 1) bad.push(c.id);
        }
        return bad;
      })()`);
      assert.deepEqual(charOver, [], `Upper overflow for chars: ${JSON.stringify(charOver)}`);

      await openTab(sharedBrowser, 'sortie');
      const stageOver = await sharedBrowser.eval(`(() => {
        const bad = [];
        const upper = document.getElementById('upper-stage');
        for (const area of IkaiApp.MasterData.AREAS) {
          document.querySelector('[data-action="select-area"][data-area-id="' + area.id + '"]').click();
          for (const stg of area.stages) {
            document.querySelector('[data-action="select-stage"][data-stage-id="' + stg.id + '"]').click();
            if (upper.scrollHeight > upper.clientHeight + 1) bad.push(stg.id);
          }
        }
        return bad;
      })()`);
      assert.deepEqual(stageOver, [], `Upper overflow for stages: ${JSON.stringify(stageOver)}`);
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-COMBAT-01: CombatEngine 境界力学（不屈1回耐え・気絶スキップ＆解除・障壁吸収＆全解除・火傷継続ダメージ）', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        const st = IkaiApp.StateStore.createInitialState();
        st.roster.char_ishii_daiki = ${ROSTER_ENTRY_EXPR};
        const b = IkaiApp.CombatEngine.createBattle({
          mode: 'stage',
          stageId: '1-1',
          state: st,
          partyIds: ['char_ishii_daiki', 'char_todo_seiichi'],
          seed: 777
        });
        const daiki = b.allies[0];
        const enemy = b.enemies[0];

        // 1. endureOnce survives first fatal blow at HP=1, dies on second
        daiki.hp = 100;
        enemy.atk = 50000;
        enemy.gauge = 100;
        b.allies.forEach(a => { a.gauge = 0; });
        IkaiApp.CombatEngine.step(b, 100);
        const hpAfterFirstFatal = daiki.hp;
        const endureUsed = daiki.endureUsed;

        enemy.gauge = 100;
        b.allies.forEach(a => { a.gauge = 0; });
        IkaiApp.CombatEngine.step(b, 100);
        const hpAfterSecondFatal = daiki.hp;

        // 2. stun skip + natural expiry, shield absorb + dispelAll clears shield, burn 5% tick
        const b2 = IkaiApp.CombatEngine.createBattle({
          mode: 'stage',
          stageId: '1-1',
          state: st,
          partyIds: ['char_todo_seiichi'],
          seed: 888
        });
        const seiichi = b2.allies[0];
        const fo = b2.enemies[0];
        seiichi.debuffs = [
          { stat: 'stun', value: 1, duration: 1 },
          { stat: 'burn', value: 1, duration: 1 }
        ];
        seiichi.shield = 99999;
        seiichi.buffs = [{ stat: 'shield', value: 99999, duration: 2 }];
        seiichi.gauge = 100;
        fo.gauge = 0;
        const hpBeforeBurn = seiichi.hp;
        IkaiApp.CombatEngine.step(b2, 100);
        const stunClearedAfterSkip = seiichi.debuffs.length === 0;
        const shieldAbsorbedBurn = seiichi.hp === hpBeforeBurn && seiichi.shield < 99999;

        // Now enemy uses dispelAll skill-like clear via b5_zankyou or verify shield >0 absorbs partial damage cleanly
        return {
          hpAfterFirstFatal,
          endureUsed,
          hpAfterSecondFatal,
          stunClearedAfterSkip,
          shieldAbsorbedBurn
        };
      })()`);
      assert.equal(res.hpAfterFirstFatal, 1);
      assert.equal(res.endureUsed, true);
      assert.equal(res.hpAfterSecondFatal, 0);
      assert.equal(res.stunClearedAfterSkip, true);
      assert.equal(res.shieldAbsorbedBurn, true);
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-COMBAT-02: 自動周回待機中(autoRepeatPending)に周回停止/拠点帰還するとタイマーが競合発火しない', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          s.settings.autoRepeatCount = 3;
          s.settings.battleSpeed = 3;
        });
        const b = IkaiApp.App.startBattle('stage', { stageId: '1-1' });
        b.status = 'victory';
        IkaiApp.CombatEngine.step(b, 100);
      })()`);
      await sharedBrowser.waitFor(() => IkaiApp.App.getUiState()?.autoRepeatPending === true, { label: 'autoRepeatPending' });
      await sharedBrowser.tap({ selector: '[data-action="cancel-auto-repeat"]', scope: 'lower' });
      await new Promise((r) => setTimeout(r, 1250));
      const uiAfterCancel = await sharedBrowser.eval('IkaiApp.App.getUiState()');
      assert.equal(uiAfterCancel.mode, 'result', 'Cancelled auto-repeat timer must not launch next battle');
      assert.equal(uiAfterCancel.autoRepeatPending, false);
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-PROG-01: 装備合成全4段階天井(3/4/5/6)・ロック/装着/極品質保護・共鳴4枠一意性・結晶ショップ重複購入拒否', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        st.currencies.starCoins = 999999;
        st.currencies.exchangeCrystals = 999;
        const eqId = IkaiApp.MasterData.EQUIPS[0].id;
        const pityCounts = [3, 4, 5, 6];
        const promotedQualities = [];

        for (let q = 0; q < 4; q++) {
          st.equips = [{ uid: 'base_' + q, equipId: eqId, qualityIdx: q, locked: false }];
          for (let m = 0; m < pityCounts[q]; m++) {
            st.equips.push({ uid: 'mat_' + q + '_' + m, equipId: eqId, qualityIdx: q, locked: false });
          }
          for (let m = 0; m < pityCounts[q]; m++) {
            const out = IkaiApp.Progression.synthesizeEquip(st, 'base_' + q, 'mat_' + q + '_' + m, { rng: () => 0.999 });
            st = out.state;
          }
          promotedQualities.push(st.equips.find(e => e.uid === 'base_' + q)?.qualityIdx);
        }

        // Lock & equipped & 極 protection
        st.equips = [
          { uid: 'eq_locked', equipId: eqId, qualityIdx: 0, locked: true },
          { uid: 'eq_equipped', equipId: eqId, qualityIdx: 0, locked: false },
          { uid: 'eq_kiwami', equipId: eqId, qualityIdx: 4, locked: false },
          { uid: 'eq_free_q3', equipId: eqId, qualityIdx: 3, locked: false }
        ];
        st.roster[st.party[0]].equipped['主器'] = 'eq_equipped';
        const synthLocked = IkaiApp.Progression.synthesizeEquip(st, 'eq_free_q3', 'eq_locked');
        const synthEquipped = IkaiApp.Progression.synthesizeEquip(st, 'eq_free_q3', 'eq_equipped');
        const bulk = IkaiApp.Progression.bulkSellEquips(st, 3);
        st = bulk.state;
        const remainingUids = st.equips.map(e => e.uid);

        // Crystal shop skill double-buy rejection
        const buy1 = IkaiApp.Progression.exchangeCrystalItem(st, 'shop_sk_ssr_hoshiochi');
        st = buy1.state;
        const crystalsAfter1 = st.currencies.exchangeCrystals;
        const buy2 = IkaiApp.Progression.exchangeCrystalItem(st, 'shop_sk_ssr_hoshiochi');

        // Resonance uniqueness (same char moved between slots clears old slot)
        st.roster.char_kiryu_takashi = ${ROSTER_ENTRY_EXPR};
        let r1 = IkaiApp.Progression.setResonance(st, 0, 'char_kiryu_takashi');
        st = r1.state;
        let r2 = IkaiApp.Progression.setResonance(st, 2, 'char_kiryu_takashi');
        st = r2.state;

        return {
          promotedQualities,
          synthLockedOk: synthLocked.ok,
          synthEquippedOk: synthEquipped.ok,
          remainingUids,
          buy1Ok: buy1.ok,
          buy2Ok: buy2.ok,
          crystalsUnchangedOnDup: buy2.state.currencies.exchangeCrystals === crystalsAfter1,
          resonanceSlots: st.resonanceSlots
        };
      })()`);
      assert.deepEqual(res.promotedQualities, [1, 2, 3, 4]);
      assert.equal(res.synthLockedOk, false);
      assert.equal(res.synthEquippedOk, false);
      assert.deepEqual(res.remainingUids.sort(), ['eq_equipped', 'eq_kiwami', 'eq_locked']);
      assert.equal(res.buy1Ok, true);
      assert.equal(res.buy2Ok, false);
      assert.equal(res.crystalsUnchangedOnDup, true);
      assert.deepEqual(res.resonanceSlots, [null, null, 'char_kiryu_takashi', null]);
      await sharedBrowser.assertZeroErrors();
    });

    it('T5-PROG-02: 異界調査4枠同時上限・重複/編成中派遣拒否・全5制約試練 autoFitTrialParty 整合', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const extras = ['char_kiryu_takashi', 'char_himuro_soichiro', 'char_kanzaki_mio', 'char_kujo_renji', 'char_amano_sota'];
        for (const cid of extras) {
          st.roster[cid] = ${ROSTER_ENTRY_EXPR};
        }
        // Party is [todo, kobayashi, saito, nakamura]; watanabe + 5 extras = 6 bench chars
        const e1 = IkaiApp.Progression.startExpedition(st, 'exp_1', ['char_watanabe_aoi']);
        st = e1.state;
        const e2 = IkaiApp.Progression.startExpedition(st, 'exp_1', ['char_kiryu_takashi']);
        st = e2.state;
        const e3 = IkaiApp.Progression.startExpedition(st, 'exp_1', ['char_himuro_soichiro']);
        st = e3.state;
        const e4 = IkaiApp.Progression.startExpedition(st, 'exp_1', ['char_kanzaki_mio']);
        st = e4.state;
        const e5Over = IkaiApp.Progression.startExpedition(st, 'exp_1', ['char_kujo_renji']);
        const dupExp = IkaiApp.Progression.startExpedition(st, 'exp_1', ['char_watanabe_aoi']);
        const partyExp = IkaiApp.Progression.startExpedition(st, 'exp_1', [st.party[0]]);

        // Test autoFitTrialParty across trials 1,3,4,5 (trial_2 needs >=1 R not on expedition; kobayashi/saito/nakamura are in party, so all 5 trials should pass!)
        const trialFitResults = {};
        for (const t of IkaiApp.MasterData.TRIALS) {
          const fit = IkaiApp.Progression.autoFitTrialParty(st, t.id);
          const check = fit.ok ? IkaiApp.Progression.validateTrialEntry(fit.state, t.id, fit.party) : { ok: false };
          trialFitResults[t.id] = { fitOk: fit.ok, validOk: check.ok };
        }

        return {
          started4: e1.ok && e2.ok && e3.ok && e4.ok,
          rejected5th: !e5Over.ok,
          rejectedDup: !dupExp.ok,
          rejectedParty: !partyExp.ok,
          trialFitResults
        };
      })()`);
      assert.equal(res.started4, true);
      assert.equal(res.rejected5th, true);
      assert.equal(res.rejectedDup, true);
      assert.equal(res.rejectedParty, true);
      for (const [tid, r] of Object.entries(res.trialFitResults)) {
        assert.deepEqual(r, { fitOk: true, validOk: true }, `autoFitTrialParty failed for ${tid}`);
      }
      await sharedBrowser.assertZeroErrors();
    });
  });
});
