(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  function mergeMod(dst, src) {
    if (!src) return;
    Object.keys(src).forEach((k) => {
      dst[k] = (dst[k] || 0) + src[k];
    });
  }

  /**
   * 任意キャラ状態（プレイヤー所持 or 異界闘技場AI）から実戦ステータス＆全モディファイアを算出
   */
  HW.computeCharStats = function (charId, customState, opts) {
    const def = HW.getCharDef(charId);
    if (!def) return null;
    const cs = customState || HW.State.data.chars[charId];
    const options = opts || {};

    // 1. 覚醒★倍率 & プリコネ式RANK倍率 & 6枠埋まり補正 & サガ式閃き極意補正
    const star = Math.max(1, cs.star || 1);
    const rank = Math.max(1, cs.rank || 1);
    const filledSlots = (cs.rankSlots || []).filter(Boolean).length;
    const mastery = cs.masteryCount || 0;

    const starMult = 1 + (star - 1) * 0.17 + (star >= 6 ? 0.14 : 0);
    const rankMult = 1 + (rank - 1) * 0.16 + filledSlots * 0.022;
    const masteryMult = 1 + Math.min(0.60, mastery * 0.015);
    const growth = starMult * rankMult * masteryMult;

    let flatHp = Math.round(def.base.hp * growth);
    let flatAtk = Math.round(def.base.atk * growth);
    let flatDef = Math.round(def.base.def * growth);
    let flatSpd = Math.round(def.base.spd + (rank - 1) * 2 + Math.min(18, Math.floor(mastery / 2)));
    let baseCrit = def.base.crit;

    const mod = {
      hpPct: 0, atkPct: 0, defPct: 0, spdFlat: 0,
      crit: 0, critDmg: 0, eva: 0, res: 0, effHit: 0,
      dmgUp: 0, dmgRed: 0, healOutPct: 0, healInPct: 0,
      lifesteal: 0, defPen: 0, extraHitChance: 0, counterChance: 0,
      counterDef: 0, ailmentBonus: 0, bossDmg: 0, aoeDmg: 0, singleDmg: 0,
      s3Dmg: 0, elemAdvBonus: 0, firstHitDmg: 0, killGauge: 0,
      startGauge: 0, startTeamGauge: 0, waveShieldPct: 0, teamWaveShield: 0,
      turnRegenPct: 0, turnTeamHeal: 0, overhealShield: 0, autoRevive: 0,
      guts: 0, assistChance: 0, extraCtChance: 0, teamDotBonus: 0,
      teamAtkPct: 0, teamDefPct: 0, teamHpPct: 0, teamSpdFlat: 0,
      teamCrit: 0, teamCritDmg: 0, teamDmgUp: 0, teamDmgRed: 0,
      teamRes: 0, teamLifesteal: 0, startTaunt: 0, startDefUp: 0,
      startEnemyBreak: 0, buffExt: 0, debuffExt: 0, healCleanse: 0,
      healRegen: 0, healAtkUp: 0, healDefUp: 0, healSpdUp: 0,
      healGauge: 0, healReflectDmg: 0, emergencyHeal: 0, rescueGauge: 0,
      waveCleanse: 0, selfCleanse: 0, waveTeamRegen: 0, critCtCut: 0,
      s3TeamCtCut: 0, onHitAtkDown: 0, onHitGauge: 0, onAtkDefDown: 0,
      onAtkBleed: 0, onAtkCurse: 0, onAtkSilence: 0, onAtkBreak: 0,
      lowHpDef: 0, lowHpRed: 0, defToAtk: 0, evaHeal: 0, tauntTeamDmg: 0,
      berserkDmg: 0, fullHpCrit: 0, fullHpAtk: 0, rampAtk: 0,
      actShieldLowest: 0, debuffVuln: 0, skillTeamGauge: 0
    };

    // 2. パッシブ技（技3がpassiveのキャラ）
    def.skills.forEach((sk) => {
      if (sk.target === 'passive' && sk.passiveMod) mergeMod(mod, sk.passiveMod);
    });

    // 2.5 戦技開眼のロール別節目ボーナス（10/20/30/40到達で順次開花）
    const kaikanMilestones = HW.getKaikanMilestones(def.role);
    const activeKaikan = [];
    kaikanMilestones.forEach((ms) => {
      if (mastery >= ms.need) {
        mergeMod(mod, ms.mod);
        activeKaikan.push(ms);
      }
    });

    // 3. 愛用品(★4) & 固有神器(★5)
    if (cs.favoriteUnlocked && def.favorite) mergeMod(mod, def.favorite.mod);
    if (cs.relicUnlocked && def.relic) mergeMod(mod, def.relic.mod);

    // 4. ロール別5段階×5択アビリティ
    const roleAbs = HW.ABILITIES[def.role] || [];
    const maxTiers = customState
      ? 5
      : HW.State.getUnlockedAbilityTiers(charId);
    (cs.abilities || []).forEach((col, ti) => {
      if (ti < maxTiers && col >= 0 && roleAbs[ti] && roleAbs[ti][col]) {
        mergeMod(mod, roleAbs[ti][col].mod);
      }
    });

    // 5. 装備4部位（品質計算＋2セット＆4セット効果）
    const setCounts = {};
    const activeSets = [];
    HW.EQUIP_SLOTS.forEach((slot) => {
      const ref = cs.equips && cs.equips[slot.id];
      if (!ref) return;
      const item = typeof ref === 'string' ? HW.State.getEquipById(ref) : ref;
      if (!item) return;
      const eqSt = HW.calcEquipStats(item);
      flatHp += eqSt.hp;
      flatAtk += eqSt.atk;
      flatDef += eqSt.def;
      flatSpd += eqSt.spd;
      baseCrit += eqSt.crit;
      const tpl = HW.getEquipTemplate(item.tplId);
      setCounts[tpl.setId] = (setCounts[tpl.setId] || 0) + 1;
    });

    Object.keys(setCounts).forEach((setId) => {
      const cnt = setCounts[setId];
      const setDef = HW.getEquipSet(setId);
      if (cnt >= 2) {
        mergeMod(mod, setDef.bonus2.mod);
        activeSets.push({ name: setDef.name + '(2)', desc: setDef.bonus2.desc });
      }
      if (cnt >= 4) {
        mergeMod(mod, setDef.bonus4.mod);
        activeSets.push({ name: setDef.name + '(4)', desc: setDef.bonus4.desc });
      }
    });

    // 6. バディリンク継承（裏枠キャラのステータス15%加算＋固有リンク特性）
    if (options.linkCharId) {
      const lDef = HW.getCharDef(options.linkCharId);
      const lState = HW.State.data.chars[options.linkCharId];
      if (lDef && lState && lState.unlocked) {
        const lStar = 1 + (lState.star - 1) * 0.16;
        const lRank = 1 + (lState.rank - 1) * 0.14;
        const lFactor = lStar * lRank * 0.15;
        flatHp += Math.round(lDef.base.hp * lFactor);
        flatAtk += Math.round(lDef.base.atk * lFactor);
        flatDef += Math.round(lDef.base.def * lFactor);
        flatSpd += Math.round(lDef.base.spd * 0.06);
        if (lDef.linkBonus) mergeMod(mod, lDef.linkBonus.mod);
      }
    }

    // 7. 陣形スロット補正 & チームシナジー & チーム全体アビリティオーラ
    if (options.slotMod) mergeMod(mod, options.slotMod);
    if (options.teamMod) mergeMod(mod, options.teamMod);

    const hp = Math.max(100, Math.round(flatHp * (1 + mod.hpPct)));
    const defVal = Math.max(10, Math.round(flatDef * (1 + mod.defPct)));
    const atk = Math.max(20, Math.round(flatAtk * (1 + mod.atkPct) + defVal * (mod.defToAtk || 0)));
    const spd = Math.max(40, Math.round(flatSpd + mod.spdFlat));
    const crit = Math.min(0.95, Math.max(0.02, baseCrit + mod.crit));
    const critDmg = Math.max(1.25, def.base.critDmg + mod.critDmg);
    const eva = Math.min(0.65, Math.max(0, def.base.eva + mod.eva));
    const res = Math.min(0.85, Math.max(0, def.base.res + mod.res));
    const effHit = Math.max(0, def.base.effHit + mod.effHit);

    const power = Math.round(hp * 0.28 + atk * 3.2 + defVal * 2.1 + spd * 8 + crit * 600);

    return {
      hp: hp,
      atk: atk,
      def: defVal,
      spd: spd,
      crit: crit,
      critDmg: critDmg,
      eva: eva,
      res: res,
      effHit: effHit,
      power: power,
      mod: mod,
      activeSets: activeSets,
      kaikanMilestones: activeKaikan
    };
  };

  /**
   * 4人チーム全体の最終戦闘ビルドを一括構築（味方全体オーラ・陣形・シナジー・リンク込み）
   */
  HW.buildTeamCombatants = function (memberIds, linkIds, formationId, customMembers) {
    const form = HW.getFormation(formationId);
    const ids = customMembers ? customMembers.map((m) => m.charId) : memberIds;
    const syn = HW.evaluateSynergies(ids, linkIds || []);

    // パス1：各自のチーム全体オーラ（teamAtkPct等）を集計
    const auraMod = Object.assign({}, syn.teamMod);
    ids.forEach((cid, idx) => {
      if (!cid) return;
      const cs = customMembers ? customMembers[idx] : HW.State.data.chars[cid];
      const baseCalc = HW.computeCharStats(cid, cs, {
        linkCharId: linkIds ? linkIds[idx] : null
      });
      if (!baseCalc) return;
      const m = baseCalc.mod;
      if (m.teamAtkPct) auraMod.atkPct = (auraMod.atkPct || 0) + m.teamAtkPct;
      if (m.teamDefPct) auraMod.defPct = (auraMod.defPct || 0) + m.teamDefPct;
      if (m.teamHpPct) auraMod.hpPct = (auraMod.hpPct || 0) + m.teamHpPct;
      if (m.teamSpdFlat) auraMod.spdFlat = (auraMod.spdFlat || 0) + m.teamSpdFlat;
      if (m.teamCrit) auraMod.crit = (auraMod.crit || 0) + m.teamCrit;
      if (m.teamCritDmg) auraMod.critDmg = (auraMod.critDmg || 0) + m.teamCritDmg;
      if (m.teamDmgUp) auraMod.dmgUp = (auraMod.dmgUp || 0) + m.teamDmgUp;
      if (m.teamDmgRed) auraMod.dmgRed = (auraMod.dmgRed || 0) + m.teamDmgRed;
      if (m.teamRes) auraMod.res = (auraMod.res || 0) + m.teamRes;
      if (m.teamLifesteal) auraMod.lifesteal = (auraMod.lifesteal || 0) + m.teamLifesteal;
      if (m.startTeamGauge) auraMod.startGauge = (auraMod.startGauge || 0) + m.startTeamGauge;
      if (m.teamWaveShield) auraMod.waveShieldPct = (auraMod.waveShieldPct || 0) + m.teamWaveShield;
      if (m.teamDotBonus) auraMod.teamDotBonus = (auraMod.teamDotBonus || 0) + m.teamDotBonus;
    });

    const units = [];
    ids.forEach((cid, idx) => {
      if (!cid) return;
      const cs = customMembers ? customMembers[idx] : HW.State.data.chars[cid];
      const def = HW.getCharDef(cid);
      const slotInfo = form.slots[idx] || form.slots[0];
      const calc = HW.computeCharStats(cid, cs, {
        linkCharId: linkIds ? linkIds[idx] : null,
        slotMod: slotInfo.mod,
        teamMod: auraMod
      });
      units.push({
        charId: cid,
        def: def,
        state: cs,
        slotIndex: idx,
        aggro: slotInfo.aggro,
        stats: calc
      });
    });

    return { units: units, synergies: syn.active, formation: form };
  };
})();
