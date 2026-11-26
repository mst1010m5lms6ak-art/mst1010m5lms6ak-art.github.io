import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, it } from 'node:test';
import {
  CdpBrowser,
  EXPECTED_SORT_ORDER_NAMES,
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

async function ensureBootedHttp(clearStorage = true) {
  await bootIkaiApp(sharedBrowser, getAppUrl(), { clearStorage });
}

async function runBattleToCompletion(browser, { maxSteps = 120, stepMs = 1000, requireFinish = true } = {}) {
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

describe('Tier 3: Cross-Feature Pairwise Interactions (18 scenarios)', () => {
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

  it('T3-PW-01: 自動周回 × 自動売却 × 異界調査（派遣戦闘回数進行）', async () => {
    await ensureBootedHttp(true);
    const initial = await sharedBrowser.eval(`(() => {
      let st = IkaiApp.StateStore.createInitialState();
      const bench = IkaiApp.MasterData.CHARACTERS.find(c => !st.party.includes(c.id));
      st.roster[bench.id] = ${ROSTER_ENTRY_EXPR};
      st.settings.autoSellMaxQualityIdx = 0;
      const started = IkaiApp.Progression.startExpedition(st, IkaiApp.MasterData.EXPEDITION_ZONES[0].id, [bench.id]);
      st = started.state || started;
      IkaiApp.StateStore.setState(st);
      return {
        q0Count: st.equips.filter(e => e.qualityIdx === 0).length,
        coins: st.currencies.starCoins
      };
    })()`);

    for (let b = 0; b < 3; b++) {
      await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
      const fin = await runBattleToCompletion(sharedBrowser);
      assert.equal(fin.victory, true);
    }

    const afterBattles = await sharedBrowser.eval(`(() => {
      const st = IkaiApp.StateStore.getState();
      const exp = st.expeditions[0];
      const beforeClaimCoins = st.currencies.starCoins;
      const beforeClaimStones = st.currencies.echoStones;
      const claimed = IkaiApp.Progression.claimExpedition(st, 0);
      const next = claimed.state || claimed;
      IkaiApp.StateStore.setState(next);
      return {
        battlesDone: exp?.battlesDone || 0,
        q0Count: st.equips.filter(e => e.qualityIdx === 0).length,
        coinsGained: next.currencies.starCoins - beforeClaimCoins,
        stonesGained: next.currencies.echoStones - beforeClaimStones
      };
    })()`);
    assert.ok(afterBattles.battlesDone >= 3, `Expected >=3 real-battle expedition progress, got ${afterBattles.battlesDone}`);
    assert.equal(afterBattles.q0Count <= initial.q0Count, true, 'Auto-sell must not accumulate 並 equips');
    assert.ok(afterBattles.coinsGained > 0 || afterBattles.stonesGained > 0, 'Claiming expedition must grant rewards');
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-02: 共鳴支援4枠 × パーティ基礎ステ × タイムライン戦闘', async () => {
    await ensureBootedHttp(true);
    const res = await sharedBrowser.eval(`(() => {
      IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      const b0 = IkaiApp.CombatEngine.getSnapshot().allies[0];
      let st = JSON.parse(JSON.stringify(IkaiApp.StateStore.getState()));
      const resIds = ['char_kiryu_takashi', 'char_kujo_renji', 'char_minase_shiori', 'char_kanzaki_mio'];
      resIds.forEach((cid, idx) => {
        st.roster[cid] = ${ROSTER_ENTRY_EXPR};
        const out = IkaiApp.Progression.setResonance(st, idx, cid);
        st = out.state || out;
      });
      IkaiApp.StateStore.setState(st);
      IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      const b1 = IkaiApp.CombatEngine.getSnapshot().allies[0];
      return {
        resCount: st.resonanceSlots.filter(Boolean).length,
        before: { atk: b0.atk, def: b0.def, spd: b0.spd, crit: b0.crit },
        after: { atk: b1.atk, def: b1.def, spd: b1.spd, crit: b1.crit }
      };
    })()`);
    assert.equal(res.resCount, 4);
    assert.ok(res.after.atk > res.before.atk, 'Resonance ATK+12% must apply in battle');
    assert.ok(res.after.def > res.before.def, 'Resonance DEF+12% must apply in battle');
    assert.ok(res.after.spd > res.before.spd, 'Resonance SPD+8 must apply in battle');
    assert.ok(res.after.crit > res.before.crit, 'Resonance Crit+8% must apply in battle');
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-03: 覚醒3段階 × 4セット装備 × 技熟練度Rank5 相乗反映', async () => {
    await ensureBootedHttp(true);
    const res = await sharedBrowser.eval(`(() => {
      let st = IkaiApp.StateStore.createInitialState();
      const cid = st.party[0];
      const setId = IkaiApp.MasterData.SETS[2].id;
      const setEquips = IkaiApp.MasterData.EQUIPS.filter(e => e.setId === setId).slice(0, 4);
      const eqMap = { '主器': null, '護符': null, '装具': null, '印章': null };
      setEquips.forEach((tpl, i) => {
        const uid = 'pw3_' + i;
        st.equips.push({ uid, equipId: tpl.id, qualityIdx: 4, locked: false });
        eqMap[tpl.slot] = uid;
      });
      st.roster[cid].shards = 999;
      st.currencies.masteryBooks = 999;
      for (let i = 0; i < 3; i++) {
        const out = IkaiApp.Progression.awakenCharacter(st, cid);
        st = out.state || out;
      }
      st.roster[cid].equipped = eqMap;
      const sid = Object.keys(st.skillInventory)[0];
      st.skillInventory[sid].uses = 150;
      for (let i = 0; i < 6; i++) {
        const out = IkaiApp.Progression.upgradeSkillMastery(st, sid, cid);
        st = out.state || out;
      }
      IkaiApp.StateStore.setState(st);
      IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      const ally = IkaiApp.CombatEngine.getSnapshot().allies[0];
      return {
        awakening: st.roster[cid].awakening,
        equipCount: Object.values(st.roster[cid].equipped).filter(Boolean).length,
        skillRank: st.skillInventory[sid].rank,
        crit: ally.crit,
        critDmg: ally.critDmg
      };
    })()`);
    assert.equal(res.awakening, 3);
    assert.equal(res.equipCount, 4);
    assert.equal(res.skillRank, 5);
    assert.ok(res.crit >= 23, `Expected 4-set crit bonus, got ${res.crit}`);
    assert.ok(res.critDmg >= 180, `Expected 4-set critDmg bonus, got ${res.critDmg}`);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-04: 召喚被り × 覚醒3超過変換 × 結晶ショップ × 収集技装備', async () => {
    await ensureBootedHttp(true);
    const res = await sharedBrowser.eval(`(() => {
      let st = IkaiApp.StateStore.createInitialState();
      st.currencies.echoStones = 15000;
      st.currencies.exchangeCrystals = 0;
      for (const c of IkaiApp.MasterData.CHARACTERS) {
        st.roster[c.id] = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3 };
      }
      const pull = IkaiApp.Progression.rollSummon(st, IkaiApp.MasterData.BANNERS[0].id, 10);
      st = pull.state || pull;
      const crystalsAfterPull = st.currencies.exchangeCrystals;
      const item = IkaiApp.MasterData.CRYSTAL_SHOP_ITEMS.find(x => x.id === 'shop_sk_sr_seifu');
      const buy = IkaiApp.Progression.exchangeCrystalItem(st, item.id);
      st = buy.state || buy;
      const crystalsAfterBuy = st.currencies.exchangeCrystals;
      const hasSkill = Boolean(st.skillInventory.sk_sr_seifu);
      if (hasSkill) {
        st.roster[st.party[0]].skills[0] = 'sk_sr_seifu';
      }
      IkaiApp.StateStore.setState(st);
      return {
        crystalsAfterPull,
        cost: item.costCrystals,
        crystalsAfterBuy,
        hasSkill,
        equippedSkill: st.roster[st.party[0]].skills[0]
      };
    })()`);
    assert.ok(res.crystalsAfterPull >= 60);
    assert.equal(res.crystalsAfterBuy, res.crystalsAfterPull - res.cost);
    assert.equal(res.hasSkill, true);
    assert.equal(res.equippedSkill, 'sk_sr_seifu');
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-05: 同種装備合成昇格 × 装備中保護一括売却', async () => {
    await ensureBootedHttp(true);
    const res = await sharedBrowser.eval(`(() => {
      const tpl = IkaiApp.MasterData.EQUIPS[0];
      let st = IkaiApp.StateStore.createInitialState();
      st.currencies.starCoins = 99999;
      const cid = st.party[0];
      st.equips = [
        { uid: 'pw5_base', equipId: tpl.id, qualityIdx: 0, locked: false },
        { uid: 'pw5_m1', equipId: tpl.id, qualityIdx: 0, locked: false },
        { uid: 'pw5_m2', equipId: tpl.id, qualityIdx: 0, locked: false },
        { uid: 'pw5_m3', equipId: tpl.id, qualityIdx: 0, locked: false },
        { uid: 'pw5_junk', equipId: tpl.id, qualityIdx: 0, locked: false }
      ];
      for (let i = 1; i <= 3; i++) {
        const out = IkaiApp.Progression.synthesizeEquip(st, 'pw5_base', 'pw5_m' + i);
        st = out.state || out;
        if (st.equips.find(e => e.uid === 'pw5_base')?.qualityIdx >= 1) break;
      }
      st.roster[cid].equipped[tpl.slot] = 'pw5_base';
      const sold = IkaiApp.Progression.bulkSellEquips(st, 1);
      st = sold.state || sold;
      return {
        keptEquipped: st.equips.some(e => e.uid === 'pw5_base'),
        junkRemoved: !st.equips.some(e => e.uid === 'pw5_junk')
      };
    })()`);
    assert.equal(res.keptEquipped, true);
    assert.equal(res.junkRemoved, true);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-06: 制約試練 × 3段ソート一覧 × R編成変更クリア検証', async () => {
    await ensureBootedHttp(true);
    const prep = await sharedBrowser.eval(`(() => {
      const sorted = IkaiApp.StateStore.sortUnits(IkaiApp.MasterData.CHARACTERS.slice());
      const rOnly = sorted.filter(c => c.rarity === 'R').slice(0, 4);
      const valid = IkaiApp.MasterData.validateTrialParty('trial_2', rOnly);
      IkaiApp.StateStore.update(s => {
        rOnly.forEach(c => {
          s.roster[c.id] = { ...(${ROSTER_ENTRY_EXPR}), awakening: 3, emblemNodes: [1, 2, 3, 4] };
        });
        s.party = rOnly.map(c => c.id);
      });
      IkaiApp.App.startBattle('trial', { trialId: 'trial_2' });
      return { rCount: rOnly.length, validOk: valid.ok, lastSortedName: sorted[sorted.length - 1].name };
    })()`);
    assert.equal(prep.rCount, 4);
    assert.equal(prep.validOk, true);
    assert.equal(prep.lastSortedName, EXPECTED_SORT_ORDER_NAMES[19]);
    const fin = await runBattleToCompletion(sharedBrowser);
    assert.equal(fin.victory, true, 'Geared R-only party must win trial_2');
    const cleared = await sharedBrowser.eval('IkaiApp.StateStore.getState().progress.trialsCleared');
    assert.equal(cleared.includes('trial_2'), true);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-07: 戦術AI事前設定 × 戦闘中下半分介入（切り札予約・目標切替）', async () => {
    await ensureBootedHttp(true);
    await openTab(sharedBrowser, 'party');
    const policySpec = { labelRegex: /作戦方針|作戦/, testId: 'tactic-policy-select', selector: 'select[data-testid="tactic-policy-select"], select[data-tactic="policy"]', scope: 'lower' };
    assert.equal((await sharedBrowser.queryControl(policySpec)).found, true);
    await sharedBrowser.selectValue(policySpec, /温存|conserve/);

    await openTab(sharedBrowser, 'sortie');
    await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
    await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());

    const trumpSpec = { labelRegex: /切り札|予約/, testId: 'trump-reserve-btn', scope: 'lower' };
    assert.equal((await sharedBrowser.queryControl(trumpSpec)).found, true);
    await sharedBrowser.tap(trumpSpec);

    const targetCtrl = await sharedBrowser.queryControl({ testId: 'battle-target-select', selector: 'select[data-testid="battle-target-select"], [data-testid="battle-target-btn"]', scope: 'lower' });
    assert.equal(targetCtrl.found, true, 'In-battle target policy control must exist in lower deck');
    if (targetCtrl.tagName === 'select') {
      await sharedBrowser.selectValue({ testId: 'battle-target-select', scope: 'lower' }, /ボス|boss_first/);
    } else {
      await sharedBrowser.tap({ testId: 'battle-target-btn', scope: 'lower' });
    }

    const res = await sharedBrowser.eval(`(() => {
      const snap0 = IkaiApp.CombatEngine.getSnapshot();
      const reserved = snap0.allies.some(a => Boolean(a.reservedSkillId)) || Boolean(snap0.reservedSkill);
      for (let i = 0; i < 6; i++) IkaiApp.CombatEngine.step(800);
      const snap1 = IkaiApp.CombatEngine.getSnapshot();
      return {
        policy: IkaiApp.StateStore.getState().roster[IkaiApp.StateStore.getState().party[0]].tactic.policy,
        reserved,
        logsLen: (snap1.logs || []).length
      };
    })()`);
    assert.equal(res.policy, 'conserve');
    assert.equal(res.reserved, true);
    assert.ok(res.logsLen >= 1);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-08: Stage 6 ボス技予告バー × 4項目DPSメーター（被ダメ・回復・被回復）', async () => {
    await ensureBootedHttp(true);
    await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 5, startWave: 4 })`);
    await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
    for (let i = 0; i < 12; i++) {
      const ok = await sharedBrowser.eval('Boolean(IkaiApp.CombatEngine.step(700))');
      assert.equal(ok, true);
    }
    const res = await sharedBrowser.eval(`({
      txt: document.querySelector('.upper-stage')?.innerText || '',
      dealt: IkaiApp.CombatEngine.getSnapshot()?.dps?.dealt || 0
    })`);
    for (const lbl of ['与ダメージ', '被ダメージ', '回復量', '被回復量']) {
      assert.ok(res.txt.includes(lbl), `Missing ${lbl} during Stage 6 boss`);
    }
    assert.ok(res.dealt > 0);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-09: 収集技（単体/範囲/全体）× 複数敵＆挑発ターゲット解決', async () => {
    await ensureBootedHttp(true);
    await sharedBrowser.eval(`(() => {
      IkaiApp.StateStore.update(s => {
        for (const sid of ['sk_r_kiriharai', 'sk_r_soutou', 'sk_r_shogekiha']) {
          if (!s.skillInventory[sid]) s.skillInventory[sid] = { ownedCount: 1, rank: 1, uses: 0 };
        }
        s.roster.char_kiryu_takashi = ${ROSTER_ENTRY_EXPR};
        s.roster.char_kiryu_takashi.skills = ['sk_r_kiriharai', null];
        s.roster[s.party[1]].skills = ['sk_r_soutou', null];
        s.roster[s.party[2]].skills = ['sk_r_shogekiha', null];
        s.party[0] = 'char_kiryu_takashi';
        s.roster[s.party[1]].tactic.skillPriority = 'collect_first';
        s.roster[s.party[2]].tactic.skillPriority = 'collect_first';
      });
      IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
    })()`);
    await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
    const res = await sharedBrowser.eval(`(() => {
      let tauntSeen = false;
      for (let i = 0; i < 40; i++) {
        IkaiApp.CombatEngine.step(800);
        const s = IkaiApp.CombatEngine.getSnapshot();
        if (s.allies.some(a => (a.buffs || []).some(b => b.stat === 'taunt' || b.id === 'taunt'))) {
          tauntSeen = true;
        }
        if (s.finished) break;
      }
      const inv = IkaiApp.StateStore.getState().skillInventory;
      return {
        tauntSeen,
        rangeUses: inv.sk_r_soutou.uses,
        allUses: inv.sk_r_shogekiha.uses
      };
    })()`);
    assert.equal(res.tauntSeen, true, 'Taunt must be observed during multi-enemy battle');
    assert.ok(res.rangeUses >= 1 && res.allUses >= 1, 'Range and AOE collectible skills must trigger');
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-10: 紋章ボード × 固有特性（初期行動ゲージ合算スタート）', async () => {
    await ensureBootedHttp(true);
    await sharedBrowser.eval(`(() => {
      const cid = 'char_minase_shiori';
      IkaiApp.StateStore.update(s => {
        s.roster[cid] = { ...(${ROSTER_ENTRY_EXPR}), awakening: 2, emblemNodes: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
        s.party = [cid, ...s.party.filter(x => x && x !== cid).slice(0, 3)];
      });
      IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
    })()`);
    const snap = await sharedBrowser.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
    const shiori = snap.allies.find((a) => a.id === 'char_minase_shiori');
    const other = snap.allies.find((a) => a.id !== 'char_minase_shiori');
    const shioriGauge = shiori.gauge ?? shiori.atb ?? 0;
    const otherGauge = other.gauge ?? other.atb ?? 0;
    assert.ok(shioriGauge >= 30, `Shiori must start with >=30% gauge (20% trait + 10% emblem), got ${shioriGauge}`);
    assert.ok(otherGauge >= 20, `Other allies must receive >=20% gauge from Shiori trait, got ${otherGauge}`);
    assert.ok(shioriGauge > otherGauge, 'Shiori with Node 9 must have higher initial gauge than ally without Node 9');
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-11: 異界討伐（単体レイド）× 4項目DPSメーター × 蒼焔の印4セット', async () => {
    await ensureBootedHttp(true);
    const critCheck = await sharedBrowser.eval(`(() => {
      const souen = IkaiApp.MasterData.EQUIPS.filter(e => e.setId === 'set_souen');
      IkaiApp.StateStore.update(s => {
        const cid = s.party[0];
        s.roster[cid].awakening = 3;
        souen.forEach((tpl, i) => {
          s.equips.push({ uid: 'pw11_' + i, equipId: tpl.id, qualityIdx: 3, locked: false });
          s.roster[cid].equipped[tpl.slot] = 'pw11_' + i;
        });
      });
      IkaiApp.App.startBattle('raid', { raidId: IkaiApp.MasterData.RAID_BOSSES[0].id, difficulty: 0 });
      return IkaiApp.CombatEngine.getSnapshot().allies[0].crit;
    })()`);
    assert.ok(critCheck >= 20, `Expected 蒼焔の印 crit bonus applied, got ${critCheck}`);
    for (let i = 0; i < 10; i++) {
      const ok = await sharedBrowser.eval('Boolean(IkaiApp.CombatEngine.step(700))');
      assert.equal(ok, true);
    }
    const res = await sharedBrowser.eval(`({
      txt: document.querySelector('.upper-stage')?.innerText || '',
      dealt: IkaiApp.CombatEngine.getSnapshot()?.dps?.dealt || 0
    })`);
    assert.ok(res.txt.includes('与ダメージ') && res.txt.includes('被回復量'));
    assert.ok(res.dealt > 0);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-12: 無限深淵 × 10階層節目報酬 × 召喚リソース循環', async () => {
    await ensureBootedHttp(true);
    const before = await sharedBrowser.eval(`(() => {
      IkaiApp.StateStore.update(s => {
        s.progress.abyssMaxFloor = 9;
        for (const cid of s.party) {
          s.roster[cid].awakening = 3;
          s.roster[cid].emblemNodes = [1, 2, 3, 4, 5, 6, 7, 8];
        }
      });
      const st = IkaiApp.StateStore.getState();
      return { stones: st.currencies.echoStones, crystals: st.currencies.exchangeCrystals };
    })()`);
    await sharedBrowser.eval(`IkaiApp.App.startBattle('abyss', { floor: 10 })`);
    const fin = await runBattleToCompletion(sharedBrowser);
    assert.equal(fin.victory, true, 'Abyss 10F must be cleared with geared party');
    const afterAbyss = await sharedBrowser.eval(`(() => {
      const st = IkaiApp.StateStore.getState();
      return {
        maxFloor: st.progress.abyssMaxFloor,
        stones: st.currencies.echoStones,
        crystals: st.currencies.exchangeCrystals
      };
    })()`);
    assert.equal(afterAbyss.maxFloor, 10);
    assert.ok(afterAbyss.stones >= before.stones + 300, '10F milestone must award >=300 echoStones');
    assert.ok(afterAbyss.crystals >= before.crystals + 15, '10F milestone must award >=15 exchangeCrystals');

    const summonRes = await sharedBrowser.eval(`(() => {
      const st = IkaiApp.StateStore.getState();
      const out = IkaiApp.Progression.rollSummon(st, IkaiApp.MasterData.BANNERS[0].id, 1);
      const next = out.state || out;
      return { before: st.currencies.echoStones, after: next.currencies.echoStones };
    })()`);
    assert.equal(summonRes.after, summonRes.before - 150);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-13: Web Audio SE設定 × HMAC署名 × バックアップ書き出し/復元', async () => {
    await ensureBootedHttp(true);
    const backup = await sharedBrowser.eval(`(async () => {
      IkaiApp.AudioSE.setVolume(0.65);
      IkaiApp.AudioSE.setMuted(false);
      IkaiApp.StateStore.update(s => { s.settings.soundVolume = 0.65; s.settings.soundMuted = false; });
      await IkaiApp.StateStore.saveNow();
      return await IkaiApp.SaveSecurity.exportBackup(IkaiApp.StateStore.getState());
    })()`);
    await sharedBrowser.eval('IkaiApp.AudioSE.setVolume(0.1); IkaiApp.AudioSE.setMuted(true);');
    const restored = await sharedBrowser.eval(`(async (b) => {
      const imp = await IkaiApp.SaveSecurity.importBackup(b);
      IkaiApp.StateStore.setState(imp.state);
      IkaiApp.AudioSE.setVolume(imp.state.settings.soundVolume);
      IkaiApp.AudioSE.setMuted(imp.state.settings.soundMuted);
      return IkaiApp.AudioSE.getSettings();
    })(${JSON.stringify(backup)})`);
    assert.ok(Math.abs(restored.volume - 0.65) < 0.05);
    assert.equal(restored.muted, false);
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-14: file:// 環境 × 上下50%分離 × 戦闘フルサイクル', async () => {
    const fb = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT });
    try {
      await bootIkaiApp(fb, ctx.fileUrl, { clearStorage: true });
      await openTab(fb, 'sortie');
      await fb.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
      const fin = await runBattleToCompletion(fb);
      assert.equal(fin.finished, true);
      const split = await fb.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      const ell = await fb.auditNoEllipsisAndOverflow();
      assert.equal(ell.ok, true, JSON.stringify(ell));
      await fb.assertZeroErrors();
    } finally {
      await fb.close();
    }
  });

  it('T3-PW-15: キャラ図鑑更新 × 召喚新規獲得 × 3段ソート再配置', async () => {
    await ensureBootedHttp(true);
    const ownedCount = await sharedBrowser.eval(`(() => {
      const st = IkaiApp.StateStore.createInitialState();
      st.currencies.echoStones = 15000;
      const out = IkaiApp.Progression.rollSummon(st, IkaiApp.MasterData.BANNERS[0].id, 10);
      const next = out.state || out;
      IkaiApp.StateStore.setState(next);
      return Object.keys(next.roster).length;
    })()`);
    assert.ok(ownedCount > 5, `Expected newly summoned characters in roster (>5), got ${ownedCount}`);
    await openTab(sharedBrowser, 'codex');
    const domOrder = await sharedBrowser.eval(`(() => {
      const expected = ${JSON.stringify(EXPECTED_SORT_ORDER_NAMES)};
      const text = document.querySelector('.lower-deck')?.innerText || '';
      return expected.map(name => ({ name, idx: text.indexOf(name) }));
    })()`);
    for (let i = 1; i < domOrder.length; i++) {
      assert.ok(domOrder[i - 1].idx > -1, `Missing ${domOrder[i - 1].name}`);
      assert.ok(domOrder[i].idx > domOrder[i - 1].idx, `Sort mismatch after summon: ${domOrder[i - 1].name}`);
    }
    const split = await sharedBrowser.auditUpperLowerSplit();
    assert.equal(split.ok, true, split.violations.join('; '));
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-16: 自動周回 × 敗北安全停止 × 強化後再出撃', async () => {
    await ensureBootedHttp(true);
    await sharedBrowser.eval(`(() => {
      IkaiApp.StateStore.update(s => {
        s.settings.autoRepeatCount = 3;
        s.party = ['char_nakamura_yui', null, null, null];
      });
      IkaiApp.App.startBattle('main', { areaId: 'area_5', stageIndex: 5, startWave: 4 });
    })()`);
    const defeatSnap = await runBattleToCompletion(sharedBrowser);
    assert.equal(defeatSnap.victory, false, 'Solo R healer on 5-6 must lose');
    const repeatAfterDefeat = await sharedBrowser.eval('IkaiApp.StateStore.getState().settings.autoRepeatCount');
    assert.equal(repeatAfterDefeat, 0, 'Auto-repeat must stop safely on defeat');

    await openTab(sharedBrowser, 'enhance');
    await sharedBrowser.eval(`IkaiApp.StateStore.update(s => {
      s.party = ['char_todo_seiichi', 'char_kobayashi_shohei', 'char_saito_riko', 'char_nakamura_yui'];
      s.roster.char_todo_seiichi.emblemNodes.push(1);
    })`);
    await openTab(sharedBrowser, 'sortie');
    await sharedBrowser.tap({ labelRegex: /1-1|終電後の改札/, testId: 'stage-select-1-1', scope: 'lower' });
    await sharedBrowser.tap({ labelRegex: /出撃開始|出撃する/, testId: ['start-battle-btn', 'sortie-start-btn'], scope: 'lower' });
    const winSnap = await runBattleToCompletion(sharedBrowser);
    assert.equal(winSnap.victory, true, 'Re-sortie on 1-1 after enhancement must win');
    await sharedBrowser.assertZeroErrors();
  });

  it('T3-PW-17: SafeArea エミュレーション × 最長名4名 × 戦闘プレート＋DPS', async () => {
    const b = await CdpBrowser.launch({ viewport: MOBILE_VIEWPORT, emulateSafeArea: { top: 47, bottom: 34 } });
    try {
      await bootIkaiApp(b, getAppUrl(), { clearStorage: true });
      const pads = await b.eval(`({
        top: parseFloat(getComputedStyle(document.querySelector('.upper-stage')).paddingTop),
        bottom: parseFloat(getComputedStyle(document.querySelector('.lower-deck')).paddingBottom)
      })`);
      assert.ok(pads.top >= 47 && pads.bottom >= 34);
      await b.eval(`(() => {
        const ids = ['char_himuro_soichiro', 'char_hasegawa_haruto', 'char_kobayashi_shohei', 'char_shiraishi_sumika'];
        IkaiApp.StateStore.update(s => {
          for (const id of ids) if (!s.roster[id]) s.roster[id] = ${ROSTER_ENTRY_EXPR};
          s.party = ids;
        });
        IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 });
      })()`);
      await b.waitFor(() => IkaiApp.CombatEngine.getSnapshot());
      const split = await b.auditUpperLowerSplit();
      assert.equal(split.ok, true, split.violations.join('; '));
      const ell = await b.auditNoEllipsisAndOverflow();
      assert.equal(ell.ok, true, JSON.stringify(ell));
      await b.assertZeroErrors();
    } finally {
      await b.close();
    }
  });

  it('T3-PW-18: 固有技＋収集技ハイブリッド × 熟練度加算 × 戦闘リザルト', async () => {
    await ensureBootedHttp(true);
    const beforeUses = await sharedBrowser.eval(`(() => {
      const sid = 'sk_r_kiriharai';
      IkaiApp.StateStore.update(s => {
        const cid = s.party[0];
        s.roster[cid].skills[0] = sid;
        s.roster[cid].tactic.skillPriority = 'collect_first';
      });
      return IkaiApp.StateStore.getState().skillInventory[sid].uses;
    })()`);
    await sharedBrowser.eval(`IkaiApp.App.startBattle('main', { areaId: 'area_1', stageIndex: 0 })`);
    const fin = await runBattleToCompletion(sharedBrowser);
    assert.equal(fin.victory, true);
    const after = await sharedBrowser.eval(`({
      uses: IkaiApp.StateStore.getState().skillInventory.sk_r_kiriharai.uses,
      txt: (document.querySelector('[data-testid="dps-meter-result"], .upper-stage, .lower-deck')?.innerText || '')
    })`);
    assert.ok(after.uses > beforeUses, `Expected collectible skill uses to increase (${beforeUses} -> ${after.uses})`);
    assert.ok(after.txt.includes('与ダメージ') && after.txt.includes('被回復量'));
    await sharedBrowser.assertZeroErrors();
  });
});
