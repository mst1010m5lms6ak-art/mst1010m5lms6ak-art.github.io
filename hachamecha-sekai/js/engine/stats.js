(function () {
  'use strict';

  const Hacha = window.Hacha;

  /* 装備1個の実効ステータス（品質倍率のみ反映・ランダムOP無し） */
  function getEquipEffectiveStats(itemInstance) {
    if (!itemInstance) return { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
    const tpl = Hacha.data.EQUIPMENT_MAP[itemInstance.templateId];
    if (!tpl) return { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
    const qInfo = Hacha.util.getQualityInfo(itemInstance.quality);
    const m = qInfo.mult;
    return {
      hp:   Math.round((tpl.base.hp || 0) * m),
      atk:  Math.round((tpl.base.atk || 0) * m),
      def:  Math.round((tpl.base.def || 0) * m),
      spd:  Math.round((tpl.base.spd || 0) * m),
      crit: +(((tpl.base.crit || 0) * m)).toFixed(3)
    };
  }

  function getEquipSellPrice(itemInstance) {
    const tpl = Hacha.data.EQUIPMENT_MAP[itemInstance.templateId];
    if (!tpl) return 50;
    const qInfo = Hacha.util.getQualityInfo(itemInstance.quality);
    return Math.round(tpl.sellBase * (0.65 + qInfo.q * 0.008));
  }

  /* キャラが装備中のインスタンス一覧 */
  function getEquippedItems(state, charId) {
    const prog = state.chars[charId];
    if (!prog) return { weapon: null, armor: null, charm: null };
    const map = {};
    state.inventory.forEach((it) => { map[it.uid] = it; });
    return {
      weapon: prog.equip.weapon ? (map[prog.equip.weapon] || null) : null,
      armor:  prog.equip.armor  ? (map[prog.equip.armor]  || null) : null,
      charm:  prog.equip.charm  ? (map[prog.equip.charm]  || null) : null
    };
  }

  /* 選択中のロールアビリティ効果を集約 */
  function collectCharAbilities(state, charId) {
    const def = Hacha.data.CHARACTER_MAP[charId];
    const prog = state.chars[charId];
    const mods = {};
    const list = [];
    if (!def || !prog) return { mods, list };

    const roleTiers = Hacha.data.ABILITIES_BY_ROLE[def.role] || [];
    for (let t = 0; t < prog.abilityTier && t < roleTiers.length; t++) {
      const choiceIdx = prog.abilityChoices[t] || 0;
      const ab = roleTiers[t][choiceIdx];
      if (ab) {
        list.push(ab);
        Object.keys(ab.mod || {}).forEach((k) => {
          if (typeof ab.mod[k] === 'boolean') mods[k] = mods[k] || ab.mod[k];
          else mods[k] = (mods[k] || 0) + ab.mod[k];
        });
      }
    }

    /* 固有パッシブ技（技2＋パッシブ構成のキャラ）も統合 */
    (def.skills || []).forEach((sk, idx) => {
      if (sk.scope === 'passive' && sk.passive) {
        const rankBonus = 1 + ((prog.skillRanks[idx] || 1) - 1) * 0.06;
        Object.keys(sk.passive).forEach((k) => {
          mods[k] = (mods[k] || 0) + sk.passive[k] * rankBonus;
        });
      }
    });

    return { mods, list };
  }

  /* 単体キャラの基礎実効ステータス（パーティ共鳴・世界法則適用前） */
  function computeSingleCharStats(state, charId, includeLink) {
    const def = Hacha.data.CHARACTER_MAP[charId];
    const prog = state.chars[charId];
    if (!def || !prog) return null;

    const awakeMult = 1 + (prog.awakening || 0) * 0.14;
    const eqs = getEquippedItems(state, charId);
    let eqHp = 0, eqAtk = 0, eqDef = 0, eqSpd = 0, eqCrit = 0;
    ['weapon', 'armor', 'charm'].forEach((s) => {
      if (eqs[s]) {
        const st = getEquipEffectiveStats(eqs[s]);
        eqHp += st.hp; eqAtk += st.atk; eqDef += st.def; eqSpd += st.spd; eqCrit += st.crit;
      }
    });

    const { mods, list } = collectCharAbilities(state, charId);

    let hp  = Math.round((def.base.hp * awakeMult + eqHp) * (1 + (mods.hpPct || 0)));
    let defVal = Math.round((def.base.def * awakeMult + eqDef) * (1 + (mods.defPct || 0)));
    let atk = Math.round((def.base.atk * awakeMult + eqAtk) * (1 + (mods.atkPct || 0)) + defVal * (mods.defToAtk || 0));
    let spd = Math.round((def.base.spd * (1 + (prog.awakening || 0) * 0.03) + eqSpd) * (1 + (mods.spdPct || 0)));
    let crit = +(def.base.crit + eqCrit + (mods.critFlat || 0) + (prog.awakening || 0) * 0.015).toFixed(3);

    /* 支援リンクからのステータス加算（控えの18%を上乗せ） */
    let linkedChar = null;
    if (includeLink) {
      const partyIdx = state.party.indexOf(charId);
      if (partyIdx >= 0 && state.links[partyIdx]) {
        const linkId = state.links[partyIdx];
        if (linkId && state.chars[linkId] && state.chars[linkId].unlocked) {
          linkedChar = Hacha.data.CHARACTER_MAP[linkId];
          const linkBase = computeSingleCharStats(state, linkId, false);
          if (linkBase) {
            hp += Math.round(linkBase.hp * 0.18);
            atk += Math.round(linkBase.atk * 0.18);
            defVal += Math.round(linkBase.def * 0.18);
            spd += Math.round(linkBase.spd * 0.10);
            crit = +(crit + 0.02).toFixed(3);
          }
        }
      }
    }

    const power = Math.round(hp * 0.28 + atk * 2.4 + defVal * 1.9 + spd * 3.2 + crit * 450);

    return {
      hp, atk, def: defVal, spd, crit: Math.min(0.95, crit),
      power, mods, abilities: list, linkedChar
    };
  }

  /* 世界共鳴シナジー算出（主力4人＋支援リンク4人の属性＆種族。2種族持ちは両方カウント！） */
  function computeActiveResonances(state, partyIds, linkIds) {
    const pIds = partyIds || state.party;
    const lIds = linkIds || state.links;

    const elCounts = {};
    const raceCounts = {};
    const involved = [];

    pIds.forEach((cid, i) => {
      if (cid && Hacha.data.CHARACTER_MAP[cid]) involved.push(Hacha.data.CHARACTER_MAP[cid]);
      const lid = lIds && lIds[i];
      if (lid && Hacha.data.CHARACTER_MAP[lid]) involved.push(Hacha.data.CHARACTER_MAP[lid]);
    });

    involved.forEach((c) => {
      elCounts[c.element] = (elCounts[c.element] || 0) + 1;
      (c.races || []).forEach((r) => {
        raceCounts[r] = (raceCounts[r] || 0) + 1;
      });
    });

    const uniqueElements = Object.keys(elCounts).length;
    const uniqueRaces = Object.keys(raceCounts).length;
    const active = [];
    const totals = {
      hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0,
      heal: 0, chainGain: 0, chainPower: 0, shieldStart: 0,
      pen: 0, statusRate: 0, burnBonus: 0
    };

    Hacha.data.RESONANCES.forEach((res) => {
      let ok = false;
      if (res.kind === 'race') ok = (raceCounts[res.target] || 0) >= res.need;
      else if (res.kind === 'element') ok = (elCounts[res.target] || 0) >= res.need;
      else if (res.kind === 'unique_elements') ok = uniqueElements >= res.need;
      else if (res.kind === 'unique_races') ok = uniqueRaces >= res.need;
      if (ok) {
        active.push(res);
        Object.keys(res.effect || {}).forEach((k) => {
          totals[k] = (totals[k] || 0) + res.effect[k];
        });
      }
    });

    return { active, totals, elCounts, raceCounts, uniqueElements, uniqueRaces };
  }

  /* 戦闘出撃時の最終パーティステータス（共鳴＋全体アビリティ＋世界法則込み） */
  function buildBattlePartySpecs(state, stage) {
    const rule = Hacha.data.WORLD_RULES[stage.ruleId] || { mods: {} };
    const rm = rule.mods || {};
    const resInfo = computeActiveResonances(state, state.party, state.links);
    const activePartyIds = state.party.filter((id) => id && state.chars[id] && state.chars[id].unlocked);

    /* 味方全体共有アビリティ集計 */
    const partyMods = {
      partyHpPct: 0, partyAtkPct: 0, partyDefPct: 0, partySpdPct: 0,
      partyCritFlat: 0, partyCritDmg: 0, partyDmgRed: 0, partyWeakBonus: 0,
      partyDotBonus: 0, chainPowerBonus: 0, chainRefund: 0, chainPartyShield: 0
    };

    const singles = activePartyIds.map((cid) => {
      const s = computeSingleCharStats(state, cid, true);
      Object.keys(partyMods).forEach((k) => {
        if (s.mods[k]) partyMods[k] += s.mods[k];
      });
      return { cid, single: s };
    });

    const units = singles.map(({ cid, single }) => {
      const def = Hacha.data.CHARACTER_MAP[cid];
      const prog = state.chars[cid];
      const ruleHitEl = rm.boostElements && rm.boostElements.includes(def.element);
      const ruleHitRace = rm.boostRaces && def.races.some((r) => rm.boostRaces.includes(r));
      const ruleMatch = ruleHitEl || ruleHitRace;

      const hpMult  = 1 + resInfo.totals.hp + partyMods.partyHpPct + (ruleMatch && rm.hpBonus ? rm.hpBonus : 0);
      const atkMult = 1 + resInfo.totals.atk + partyMods.partyAtkPct + (ruleMatch && rm.atkBonus ? rm.atkBonus : 0);
      const defMult = 1 + resInfo.totals.def + partyMods.partyDefPct + (ruleMatch && rm.defBonus ? rm.defBonus : 0) + (!rm.boostElements && !rm.boostRaces && rm.defBonus ? rm.defBonus : 0);
      const spdMult = 1 + resInfo.totals.spd + partyMods.partySpdPct + (ruleMatch && rm.spdBonus ? rm.spdBonus : 0);

      const maxHp = Math.round(single.hp * hpMult);
      const atk   = Math.round(single.atk * atkMult);
      const defV  = Math.round(single.def * defMult);
      const spd   = Math.round(single.spd * spdMult);
      const crit  = Math.min(0.95, single.crit + resInfo.totals.crit + partyMods.partyCritFlat + (rm.critFlat || 0));

      return {
        charId: cid,
        def,
        prog,
        maxHp,
        atk,
        defVal: defV,
        spd,
        crit,
        mods: single.mods,
        partyMods,
        resTotals: resInfo.totals,
        linkedChar: single.linkedChar
      };
    });

    return { units, resInfo, partyMods, rule };
  }

  /* 縛り試練の出撃条件チェック */
  function checkStageRestriction(state, stage) {
    if (!stage || !stage.restriction) return { ok: true, reason: '' };
    const r = stage.restriction;
    const members = state.party.filter(Boolean).map((id) => Hacha.data.CHARACTER_MAP[id]).filter(Boolean);
    if (members.length === 0) return { ok: false, reason: '編成が空です' };

    const condText = r.label.replace(/^出撃条件：/, '');
    for (const c of members) {
      if (r.type === 'elements' && !r.allowed.includes(c.element)) {
        return { ok: false, reason: `${c.name}は条件外（${condText}）` };
      }
      if (r.type === 'races' && !c.races.some((rc) => r.allowed.includes(rc))) {
        return { ok: false, reason: `${c.name}は条件外（${condText}）` };
      }
    }
    return { ok: true, reason: '' };
  }

  /* 装備ドロップ生成＋自動売却処理 */
  function rollEquipmentDrop(state, dropPool, minQuality, bonusPerfectRate) {
    if (!dropPool || !dropPool.length) return null;
    const templateId = Hacha.util.pickRandom(dropPool);
    const minQ = Hacha.util.clamp(minQuality || 30, 1, 95);

    /* 極品質(100%)は高難度・乱入ほど狙いやすい爽快な確率曲線 */
    let quality;
    const perfectRoll = Math.random();
    const perfectChance = 0.025 + (bonusPerfectRate || 0) + (minQ >= 80 ? 0.03 : 0);
    if (perfectRoll < perfectChance) {
      quality = 100;
    } else {
      const r1 = Math.random();
      const r2 = Math.random();
      const skewed = Math.pow((r1 + r2) * 0.5, 0.85);
      quality = Hacha.util.clamp(Math.round(minQ + skewed * (99 - minQ)), 1, 99);
    }

    const item = {
      uid: Hacha.util.uid('eq'),
      templateId,
      quality,
      locked: quality >= 100
    };

    const isNewCodex = !state.codex.equips.includes(templateId);
    if (isNewCodex) state.codex.equips.push(templateId);

    const threshold = state.settings.autoSellBelow || 0;
    const protectNew = state.settings.keepNewCodexGear && isNewCodex;
    const shouldSell = threshold > 0 && quality < threshold && !protectNew && quality < 100;

    if (shouldSell) {
      const coins = getEquipSellPrice(item);
      state.resources.coins += coins;
      return { item, autoSold: true, sellCoins: coins, isNewCodex };
    }

    state.inventory.push(item);
    return { item, autoSold: false, sellCoins: 0, isNewCodex };
  }

  /* キャラがどこに配置中かを判定（主力・支援リンク・異界派遣） */
  function getCharAssignment(state, charId) {
    const pIdx = state.party.indexOf(charId);
    if (pIdx >= 0) return { type: 'party', slot: pIdx, label: `主力${pIdx + 1}` };
    const lIdx = state.links.indexOf(charId);
    if (lIdx >= 0) return { type: 'link', slot: lIdx, label: `支援${lIdx + 1}` };
    for (let i = 0; i < state.dispatches.length; i++) {
      const d = state.dispatches[i];
      if (d.active && d.charIds.includes(charId)) {
        return { type: 'dispatch', slot: i, label: `派遣${i + 1}` };
      }
    }
    return { type: 'free', slot: -1, label: '待機' };
  }

  Hacha.engine.stats = {
    getEquipEffectiveStats,
    getEquipSellPrice,
    getEquippedItems,
    collectCharAbilities,
    computeSingleCharStats,
    computeActiveResonances,
    buildBattlePartySpecs,
    checkStageRestriction,
    rollEquipmentDrop,
    getCharAssignment
  };
})();
