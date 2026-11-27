import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, it } from 'node:test';
import {
  CdpBrowser,
  MOBILE_VIEWPORT,
  TAB_SPECS,
  bootIkaiApp,
  openTab,
  resolveProjectContext,
  scanStaticR5,
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

const ROSTER_ENTRY_EXPR = `({
  awakening: 0,
  shards: 0,
  emblemNodes: [],
  equipped: { '主器': null, '護符': null, '装具': null, '印章': null },
  skills: [null, null],
  tactic: { policy: 'balanced', target: 'lowest_hp', skillPriority: 'unique_first' }
})`;

async function runBattleToCompletion(browser, maxSteps = 100) {
  await browser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'combat start' });
  for (let i = 0; i < maxSteps; i++) {
    const snap = await browser.eval(`(() => {
      const r = IkaiApp.CombatEngine.step(1000);
      const cur = r || IkaiApp.CombatEngine.getSnapshot();
      return cur ? {
        status: cur.status,
        finished: cur.status !== 'ongoing',
        victory: cur.status === 'victory'
      } : null;
    })()`);
    if (snap?.finished) {
      await browser.waitFor(
        () => {
          const ui = IkaiApp.App.getUiState();
          return ui && ui.mode === 'result';
        },
        { timeoutMs: 5000, label: 'battle result mode settled' }
      );
      return snap;
    }
  }
  assert.fail(`Battle did not finish within ${maxSteps} steps`);
}

describe('Tier 4: Real-World Journeys, R5 Full Compliance Sweep & SW Offline Verification', () => {
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
  // Part A: 8 Realistic End-to-End Journeys
  // =========================================================================
  describe('Part A: Real-World User Journeys (8 scenarios)', () => {
    it('T4-SC-01: 初回起動〜本編エリア1進撃・ボス戦 (1-3/1-6) 完走ジャーニー (file:// & HTTP)', async () => {
      const fb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(fb, ctx.fileUrl, { clearStorage: true });
        const splitFile = await fb.auditUpperLowerSplit();
        assert.equal(splitFile.ok, true, splitFile.violations.join('; '));
        await fb.assertZeroErrors();
      } finally {
        await fb.close();
      }

      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await sharedBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-1' })`);
      const b1 = await runBattleToCompletion(sharedBrowser);
      assert.equal(b1.finished, true);
      assert.equal(b1.victory, true);

      await sharedBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-3' })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'stage 1-3 start' });
      const reachedBossWave = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 60; i++) {
          const s = IkaiApp.CombatEngine.step(800);
          if (!s) break;
          if (s.waveIndex === 4) return { ok: true, waveIndex: s.waveIndex, isBossWave: s.isBossWave, status: s.status };
          if (s.status !== 'ongoing') return { ok: false, waveIndex: s.waveIndex, status: s.status };
        }
        const cur = IkaiApp.CombatEngine.getSnapshot();
        return { ok: Boolean(cur && cur.waveIndex === 4), waveIndex: cur?.waveIndex, status: cur?.status };
      })()`);
      assert.equal(reachedBossWave.ok, true, `Expected stage 1-3 to reach boss wave 5 (idx 4), got ${JSON.stringify(reachedBossWave)}`);
      await sharedBrowser.waitFor(() => document.querySelector('[data-testid="boss-plate"]'), { label: 'stage 1-3 boss plate DOM' });
      const midBossTxt = await sharedBrowser.eval(`document.querySelector('.upper-stage')?.innerText || ''`);
      assert.ok(midBossTxt.includes('九十九') || midBossTxt.includes('ボス'));
      const b2 = await runBattleToCompletion(sharedBrowser);
      assert.equal(b2.finished, true);
      assert.equal(b2.victory, true);

      await sharedBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-6' })`);
      const b3 = await runBattleToCompletion(sharedBrowser);
      assert.equal(b3.finished, true);
      assert.equal(b3.victory, true);

      const cleared = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.clearedStages');
      assert.equal(cleared.includes('1-1'), true);
      assert.equal(cleared.includes('1-3'), true);
      assert.equal(cleared.includes('1-6'), true);
      const splitHttp = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitHttp.ok, true, splitHttp.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });

    it('T4-SC-02: 4ロール編成・戦術AI事前設定・戦闘中下半分介入＋4項目DPS整合検証', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const dealerId = await sharedBrowser.eval(`(() => {
        const tank = IkaiApp.MasterData.CHARACTERS.find(c => c.role === 'タンク');
        const dealer = IkaiApp.MasterData.CHARACTERS.find(c => c.role === 'ディーラー');
        const sup = IkaiApp.MasterData.CHARACTERS.find(c => c.role === 'サポーター');
        const heal = IkaiApp.MasterData.CHARACTERS.find(c => c.role === 'ヒーラー');
        const ids = [tank.id, dealer.id, sup.id, heal.id];
        IkaiApp.StateStore.update(s => {
          for (const id of ids) if (!s.roster[id]) s.roster[id] = ${ROSTER_ENTRY_EXPR};
          s.roster[dealer.id].tactic = { policy: 'aggressive', target: 'boss_first', skillPriority: 'unique_first' };
          s.party = ids;
        });
        IkaiApp.App.startBattle('stage', { stageId: '1-1' });
        return dealer.id;
      })()`);

      const snap0 = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const dealerInit = snap0.allies.find((a) => a.id === dealerId);
      assert.ok(dealerInit, 'Dealer must be present in battle snapshot');
      assert.equal(dealerInit.tactic.policy, 'aggressive', 'Pre-battle StateStore tactic.policy must apply at battle start');
      assert.equal(dealerInit.tactic.target, 'boss_first', 'Pre-battle StateStore tactic.target must apply at battle start');

      const inBattleTactic = await sharedBrowser.eval(`((did) => {
        const ok = IkaiApp.CombatEngine.setTactic(did, { policy: 'defensive', target: 'debuffed_first' });
        const snap = IkaiApp.CombatEngine.getSnapshot();
        const d = snap.allies.find(a => a.id === did);
        return { ok, policy: d?.tactic?.policy, target: d?.tactic?.target };
      })(${JSON.stringify(dealerId)})`);
      assert.equal(inBattleTactic.ok, true, 'In-battle CombatEngine.setTactic must return true');
      assert.equal(inBattleTactic.policy, 'defensive');
      assert.equal(inBattleTactic.target, 'debuffed_first');

      await sharedBrowser.tap({ labelRegex: /^×2$/, selector: '[data-action="battle-speed"][data-speed="2"]', scope: 'lower' });
      const speedAfterTap = await sharedBrowser.eval('IkaiApp.CombatEngine.getSnapshot()?.speed');
      assert.equal(speedAfterTap, 2, 'Tapping ×2 speed button must set battle speed to 2');

      const targetSpec = {
        labelRegex: /^HP最低$|^ボス優先$/,
        selector: 'button[data-action="battle-global-target"][data-target="lowest_hp"], button[data-action="battle-global-target"][data-target="boss_first"]',
        scope: 'lower'
      };
      const targetCtrl = await sharedBrowser.queryControl(targetSpec);
      assert.equal(targetCtrl.found, true, 'Target policy control must exist in lower deck');
      await sharedBrowser.tap(targetSpec);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.finished, true);
      assert.equal(fin.victory, true);

      const dps = await sharedBrowser.eval(`({
        hasResultDps: Boolean(document.querySelector('.dps-meter-panel.is-result')),
        text: (document.querySelector('.dps-meter-panel.is-result')?.innerText || ''),
        dealt: IkaiApp.CombatEngine.getSnapshot()?.dpsMeters?.totals?.damageDealt || 0
      })`);
      assert.equal(dps.hasResultDps, true, 'Result screen must render .dps-meter-panel.is-result');
      for (const lbl of ['与ダメージ', '被ダメージ', '回復量', '被回復量']) {
        assert.ok(dps.text.includes(lbl), `DPS result missing ${lbl}`);
      }
      assert.ok(dps.dealt > 0);
      await sharedBrowser.assertZeroErrors();
    });

    it('T4-SC-03: 自動周回＋自動売却設定＋異界調査（戦闘回数進行）＋報酬回収サイクル', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const before = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        const bench = IkaiApp.MasterData.CHARACTERS.find(c => !st.party.includes(c.id));
        st.roster[bench.id] = ${ROSTER_ENTRY_EXPR};
        st.settings.autoSellMaxQualityIdx = 1;
        const zone = IkaiApp.MasterData.EXPEDITION_ZONES[0];
        const started = IkaiApp.Progression.startExpedition(st, zone.id, [bench.id]);
        st = started.state || started;
        IkaiApp.StateStore.setState(st);
        return {
          required: zone.requiredBattles,
          lowEquips: st.equips.filter(e => e.qualityIdx <= 1).length
        };
      })()`);

      for (let i = 0; i < before.required; i++) {
        await sharedBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-1' })`);
        const fin = await runBattleToCompletion(sharedBrowser);
        assert.equal(fin.victory, true);
      }

      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.getState();
        const doneCount = st.expeditions[0]?.battlesDone || 0;
        const beforeCoins = st.currencies.starCoins;
        const beforeStones = st.currencies.echoStones;
        const lowEquipsAfter = st.equips.filter(e => e.qualityIdx <= 1).length;
        const claimed = IkaiApp.Progression.claimExpedition(st, 0);
        st = claimed.state || claimed;
        IkaiApp.StateStore.setState(st);
        return {
          doneCount,
          lowEquipsAfter,
          gained: st.currencies.starCoins > beforeCoins || st.currencies.echoStones > beforeStones
        };
      })()`);
      assert.ok(res.doneCount >= before.required, `Expected expedition battlesDone >= ${before.required}, got ${res.doneCount}`);
      assert.equal(res.lowEquipsAfter <= before.lowEquips, true, 'Auto-sell <= 良 must not accumulate junk equips');
      assert.equal(res.gained, true, 'Claiming completed expedition must grant rewards');
      await sharedBrowser.assertZeroErrors();
    });

    it('T4-SC-04: 装備合成天井昇格→覚醒3段階→4セット効果→紋章＆熟練度強化ジャーニー', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        const setId = IkaiApp.MasterData.SETS[2].id;
        const setTemplates = IkaiApp.MasterData.EQUIPS.filter(e => e.setId === setId).slice(0, 4);
        let st = IkaiApp.StateStore.createInitialState();
        const cid = st.party[0];
        st.currencies.starCoins = 99999;
        st.currencies.emblemShards = 9999;
        st.currencies.masteryBooks = 99;
        st.roster[cid].shards = 99;
        st.equips = [
          { uid: 'sc4_b', equipId: setTemplates[0].id, qualityIdx: 0, locked: false },
          { uid: 'sc4_m1', equipId: setTemplates[0].id, qualityIdx: 0, locked: false },
          { uid: 'sc4_m2', equipId: setTemplates[0].id, qualityIdx: 0, locked: false },
          { uid: 'sc4_m3', equipId: setTemplates[0].id, qualityIdx: 0, locked: false },
          { uid: 'sc4_s1', equipId: setTemplates[1].id, qualityIdx: 0, locked: false },
          { uid: 'sc4_s2', equipId: setTemplates[2].id, qualityIdx: 0, locked: false },
          { uid: 'sc4_s3', equipId: setTemplates[3].id, qualityIdx: 0, locked: false }
        ];
        for (let i = 1; i <= 3; i++) {
          const sOut = IkaiApp.Progression.synthesizeEquip(st, 'sc4_b', 'sc4_m' + i);
          st = sOut.state || sOut;
        }
        for (let i = 0; i < 3; i++) {
          const aOut = IkaiApp.Progression.awakenCharacter(st, cid);
          st = aOut.state || aOut;
        }
        st.roster[cid].equipped = {
          [setTemplates[0].slot]: 'sc4_b',
          [setTemplates[1].slot]: 'sc4_s1',
          [setTemplates[2].slot]: 'sc4_s2',
          [setTemplates[3].slot]: 'sc4_s3'
        };
        for (let n = 1; n <= 4; n++) {
          const eOut = IkaiApp.Progression.unlockEmblemNode(st, cid, n);
          st = eOut.state || eOut;
        }
        const sid = Object.keys(st.skillInventory)[0];
        st.skillInventory[sid].uses = 10;
        const mOut = IkaiApp.Progression.upgradeSkillMastery(st, sid, cid);
        st = mOut.state || mOut;
        IkaiApp.StateStore.setState(st);
        IkaiApp.App.startBattle('stage', { stageId: '1-1' });
        const ally = IkaiApp.CombatEngine.getSnapshot().allies[0];
        return {
          awakening: st.roster[cid].awakening,
          emblems: st.roster[cid].emblemNodes.length,
          promotedQ: st.equips.find(e => e.uid === 'sc4_b')?.qualityIdx,
          masteryRank: st.skillInventory[sid].rank,
          crit: ally.crit,
          critDmg: ally.critDmg
        };
      })()`);
      assert.equal(res.awakening, 3);
      assert.ok(res.emblems >= 4);
      assert.ok(res.promotedQ >= 1);
      assert.equal(res.masteryRank, 2);
      assert.ok(res.crit >= 23 && res.critDmg >= 180, '4-set crit & critDmg bonuses must apply in battle');
      await sharedBrowser.tap({ labelRegex: /^撤退$/, selector: '[data-action="retreat-battle"]', scope: 'lower' });
      await sharedBrowser.waitFor(() => IkaiApp.App.getUiState()?.mode === 'result', { label: 'T4-SC-04 retreat result' });
      await sharedBrowser.tap({ labelRegex: /^拠点へ戻る$/, selector: '[data-action="return-hub"]', scope: 'lower' });
      await sharedBrowser.waitFor(() => IkaiApp.App.getUiState()?.mode === 'hub', { label: 'T4-SC-04 return hub' });
      await sharedBrowser.assertZeroErrors();
    });

    it('T4-SC-05: 買い切り召喚（PU切替・10連・80天井）→上限超過結晶変換→結晶ショップ→技装備', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      const res = await sharedBrowser.eval(`(() => {
        let st = IkaiApp.StateStore.createInitialState();
        st.currencies.echoStones = 15000;
        for (const c of IkaiApp.MasterData.CHARACTERS) {
          st.roster[c.id] = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3 };
        }
        const banner = IkaiApp.MasterData.BANNERS[1];
        st.summon.selectedBannerId = banner.id;
        const ten = IkaiApp.Progression.rollSummon(st, banner.id, 10);
        st = ten.state || ten;
        st.summon.pityCount = 79;
        const pull = IkaiApp.Progression.rollSummon(st, banner.id, 1);
        st = pull.state || pull;
        const crystals = st.currencies.exchangeCrystals;
        const pityReset = st.summon.pityCount === 0;
        const item = IkaiApp.MasterData.CRYSTAL_SHOP_ITEMS.find(x => x.id === 'shop_sk_ssr_hoshiochi');
        const buy = IkaiApp.Progression.exchangeCrystalItem(st, item.id);
        st = buy.state || buy;
        st.roster[st.party[0]].skills[0] = 'sk_ssr_hoshiochi';
        IkaiApp.StateStore.setState(st);
        return {
          crystals,
          pityReset,
          hasSkill: Boolean(st.skillInventory.sk_ssr_hoshiochi),
          equipped: st.roster[st.party[0]].skills[0]
        };
      })()`);
      assert.equal(res.pityReset, true);
      assert.ok(res.crystals >= 50);
      assert.equal(res.hasSkill, true);
      assert.equal(res.equipped, 'sk_ssr_hoshiochi');
      await sharedBrowser.assertZeroErrors();
    });

    it('T4-SC-06: PvE 4本柱横断（本編・無限深淵・異界討伐・制約試練）', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      await openTab(sharedBrowser, 'sortie');
      const pillarSpecs = [
        { labelRegex: /^本編異界$/, selector: '[data-action="switch-areas-pillar"][data-pillar="story"]', scope: 'lower' },
        { labelRegex: /^無限深淵$/, selector: '[data-action="switch-areas-pillar"][data-pillar="abyss"]', scope: 'lower' },
        { labelRegex: /^異界討伐$/, selector: '[data-action="switch-areas-pillar"][data-pillar="raid"]', scope: 'lower' },
        { labelRegex: /^制約試練$/, selector: '[data-action="switch-areas-pillar"][data-pillar="trial"]', scope: 'lower' }
      ];
      for (const spec of pillarSpecs) {
        const ctrl = await sharedBrowser.queryControl(spec);
        assert.equal(ctrl.found, true, `Missing PvE pillar control: ${spec.selector}`);
        await sharedBrowser.tap(spec);
      }

      // 1. 本編 1-1 クリア
      await sharedBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-1' })`);
      assert.equal((await runBattleToCompletion(sharedBrowser)).victory, true);

      // 2. 無限深淵 1F クリア
      await sharedBrowser.eval(`IkaiApp.App.startBattle('abyss', { floor: 1 })`);
      assert.equal((await runBattleToCompletion(sharedBrowser)).victory, true);

      // 3. 異界討伐 初級クリア
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          for (const cid of s.party) {
            s.roster[cid].awakening = 3;
            s.roster[cid].emblemNodes = [1, 2, 3, 4, 5, 6];
          }
        });
        IkaiApp.App.startBattle('raid', { raidId: 'raid_zerogo', difficultyId: 'easy' });
      })()`);
      assert.equal((await runBattleToCompletion(sharedBrowser, 120)).victory, true);

      // 4. 制約試練: SSR含む違反ブロック → 非SSR編成で trial_1 クリア
      const trialCheck = await sharedBrowser.eval(`(() => {
        const ssr = IkaiApp.MasterData.CHARACTERS.find(c => c.rarity === 'SSR');
        return IkaiApp.MasterData.validateTrialParty('trial_1', [ssr]).ok;
      })()`);
      assert.equal(trialCheck, false);
      await sharedBrowser.eval(`(() => {
        IkaiApp.StateStore.update(s => {
          s.party = ['char_todo_seiichi', 'char_kobayashi_shohei', 'char_saito_riko', 'char_nakamura_yui'];
        });
        IkaiApp.App.startBattle('trial', { trialId: 'trial_1' });
      })()`);
      assert.equal((await runBattleToCompletion(sharedBrowser)).victory, true);

      const prog = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress');
      assert.equal(prog.clearedStages.includes('1-1'), true);
      assert.ok(prog.abyssMaxFloor >= 1);
      assert.ok(Object.keys(prog.raidCleared).length >= 1);
      assert.equal(prog.trialsCleared.includes('trial_1'), true);
      await sharedBrowser.assertZeroErrors();
    });

    it('T4-SC-07: file:// 書き出し→改ざん拒否→HTTP 環境インポート復元＆SE設定永続化', async () => {
      let exported;
      const fb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(fb, ctx.fileUrl, { clearStorage: true });
        exported = await fb.eval(`(async () => {
          IkaiApp.AudioSE.setVolume(0.75);
          IkaiApp.StateStore.update(s => {
            s.currencies.echoStones = 5555;
            s.settings.soundVolume = 0.75;
          });
          return await IkaiApp.SaveSecurity.exportBackup(IkaiApp.StateStore.getState());
        })()`);
      } finally {
        await fb.close();
      }

      await withTempHttpUrl(async (httpUrl) => {
        await bootIkaiApp(sharedBrowser, httpUrl, { clearStorage: true });
        const badRejected = await sharedBrowser.eval(`(async (raw) => {
          const obj = JSON.parse(raw);
          obj.payload.currencies.echoStones = 9999999;
          const r = await IkaiApp.SaveSecurity.importBackup(JSON.stringify(obj));
          return r?.ok === false;
        })(${JSON.stringify(exported)})`);
        assert.equal(badRejected, true);

        const restored = await sharedBrowser.eval(`(async (raw) => {
          const r = await IkaiApp.SaveSecurity.importBackup(raw);
          IkaiApp.StateStore.setState(r.state);
          IkaiApp.AudioSE.setVolume(r.state.settings.soundVolume);
          return { stones: IkaiApp.StateStore.getState().currencies.echoStones, vol: IkaiApp.AudioSE.getSettings().volume };
        })(${JSON.stringify(exported)})`);
        assert.equal(restored.stones, 5555);
        assert.ok(Math.abs(restored.vol - 0.75) < 0.05);
        await sharedBrowser.assertZeroErrors();
      });
    });

    it('T4-SC-08: 全7タブ・全サブビュー巡回 実機操作導線（見切れ/重なり/50:50）完全確認', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const split = await sharedBrowser.auditUpperLowerSplit();
        assert.equal(split.ok, true, `Tab ${tabKey} split violation: ${split.violations.join('; ')}`);
        const ell = await sharedBrowser.auditNoEllipsisAndOverflow();
        assert.equal(ell.ok, true, `Tab ${tabKey} ellipsis/overflow: ${JSON.stringify(ell)}`);
      }
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // Part B: R5 Static & Runtime Compliance Sweeps
  // =========================================================================
  describe('Part B: R5 Prohibited Rules Full Sweeps', () => {
    it('T4-R5-STATIC: コードベース静的監査（ellipsisゼロ・ラスター画像ゼロ・禁則語ゼロ・CSP厳格）', async () => {
      const scan = scanStaticR5(ctx.projectDir);
      assert.ok(scan.filesScanned >= 3, 'Must scan project files');
      assert.equal(scan.ok, true, `R5 static violations: ${JSON.stringify(scan, null, 2)}`);
    });

    it('T4-R5-RUNTIME: 全画面・戦闘・リザルト巡回時の実行時DOM R5完全監査', async () => {
      await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage: true });
      for (const tabKey of Object.keys(TAB_SPECS)) {
        await openTab(sharedBrowser, tabKey);
        const r5 = await sharedBrowser.auditProhibitedContent();
        assert.equal(r5.ok, true, `R5 runtime violation on ${tabKey}: ${JSON.stringify(r5)}`);
      }
      await sharedBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-3' })`);
      await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot(), { label: 'R5 stage 1-3 start' });
      const reachedBossWave = await sharedBrowser.eval(`(() => {
        for (let i = 0; i < 60; i++) {
          const s = IkaiApp.CombatEngine.step(800);
          if (!s) break;
          if (s.waveIndex === 4) return { ok: true, waveIndex: s.waveIndex, isBossWave: s.isBossWave, status: s.status };
          if (s.status !== 'ongoing') return { ok: false, waveIndex: s.waveIndex, status: s.status };
        }
        const cur = IkaiApp.CombatEngine.getSnapshot();
        return { ok: Boolean(cur && cur.waveIndex === 4), waveIndex: cur?.waveIndex, status: cur?.status };
      })()`);
      assert.equal(reachedBossWave.ok, true, `Expected stage 1-3 to reach boss wave 5 (idx 4), got ${JSON.stringify(reachedBossWave)}`);
      await sharedBrowser.waitFor(() => document.querySelector('[data-testid="boss-plate"]'), { label: 'R5 stage 1-3 boss plate DOM' });
      const r5BossTxt = await sharedBrowser.eval(`document.querySelector('.upper-stage')?.innerText || ''`);
      assert.ok(r5BossTxt.includes('九十九') || r5BossTxt.includes('ボス'));
      const r5Battle = await sharedBrowser.auditProhibitedContent();
      assert.equal(r5Battle.ok, true, `R5 runtime violation in battle: ${JSON.stringify(r5Battle)}`);
      const splitBattle = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitBattle.ok, true, splitBattle.violations.join('; '));
      const ellBattle = await sharedBrowser.auditNoEllipsisAndOverflow();
      assert.equal(ellBattle.ok, true, `Ellipsis/overflow in boss battle: ${JSON.stringify(ellBattle)}`);

      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.finished, true);
      const r5Result = await sharedBrowser.auditProhibitedContent();
      assert.equal(r5Result.ok, true, `R5 runtime violation on result screen: ${JSON.stringify(r5Result)}`);
      const ellResult = await sharedBrowser.auditNoEllipsisAndOverflow();
      assert.equal(ellResult.ok, true, `Ellipsis/overflow on result screen: ${JSON.stringify(ellResult)}`);
      const splitResult = await sharedBrowser.auditUpperLowerSplit();
      assert.equal(splitResult.ok, true, splitResult.violations.join('; '));
      await sharedBrowser.assertZeroErrors();
    });
  });

  // =========================================================================
  // Part C: Service Worker True Offline Fetch Verification
  // =========================================================================
  describe('Part C: Service Worker Offline Fetch Verification', () => {
    it('T4-SW-OFFLINE: SWプリキャッシュ完了後、オフラインリロード＆サーバヒット0件で起動＆戦闘プレイ可能', async () => {
      const offServer = await startStaticServer(ctx.projectDir);
      const offBrowser = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
      try {
        await bootIkaiApp(offBrowser, `${offServer.baseUrl}/index.html`, { clearStorage: true });
        const swReady = await offBrowser.waitForServiceWorkerReady(12000);
        assert.equal(swReady.supported, true);
        assert.equal(swReady.activeState, 'activated');

        await offBrowser.reload();
        await waitForIkaiBooted(offBrowser);
        const controlled = await offBrowser.eval('Boolean(navigator.serviceWorker.controller)');
        assert.equal(controlled, true, 'ServiceWorker must control page after reload');

        await offBrowser.setOffline(true);
        offServer.resetHits();

        await offBrowser.reload();
        await waitForIkaiBooted(offBrowser);
        await offBrowser.waitFor(() => Boolean(window.IkaiApp && window.IkaiApp.StateStore && window.IkaiApp.CombatEngine));

        const offlineAssets = await offBrowser.eval(`Promise.all([
          fetch('./manifest.webmanifest').then(r => r.ok),
          fetch('./assets/icons/emblem.svg').then(r => r.ok)
        ])`);
        assert.deepEqual(offlineAssets, [true, true]);

        await offBrowser.eval(`IkaiApp.App.startBattle('stage', { stageId: '1-1' })`);
        await offBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());

        assert.equal(
          offServer.getHits().length,
          0,
          `Expected 0 HTTP server hits during offline reload & play, got: ${JSON.stringify(offServer.getHits())}`
        );

        await offBrowser.setOffline(false);
        await offBrowser.assertZeroErrors();
      } finally {
        await offBrowser.close();
        await offServer.close();
      }
    });
  });
});
