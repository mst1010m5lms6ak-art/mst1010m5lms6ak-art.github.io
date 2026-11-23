/* ==========================================================================
   utils.js - 数値整形・乱数・ステータス計算・パーティシナジー算出
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtNum(n) {
    const v = Math.floor(Number(n) || 0);
    const abs = Math.abs(v);
    if (abs >= 100000000) return (v / 100000000).toFixed(2).replace(/\.?0+$/, '') + '億';
    if (abs >= 100000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return v.toLocaleString('ja-JP');
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  /**
   * パーティシナジー計算（2種族持ちは両種族に加算）
   */
  function calcPartySynergies(partyUnitIds) {
    const ids = (partyUnitIds || []).filter(Boolean);
    const units = ids.map((id) => HS.UNITS_MAP[id]).filter(Boolean);

    const attrCounts = {};
    const raceCounts = {};
    const roleSet = new Set();

    for (const u of units) {
      attrCounts[u.attr] = (attrCounts[u.attr] || 0) + 1;
      for (const r of u.races) {
        raceCounts[r] = (raceCounts[r] || 0) + 1;
      }
      roleSet.add(u.role);
    }

    const bonuses = {
      hpPct: 0,
      atkPct: 0,
      defPct: 0,
      spdPct: 0,
      critAdd: 0,
      cdmgAdd: 0,
      healPct: 0,
      lifesteal: 0,
      startShieldPct: 0,
      startSp: 0,
      chaosGainPct: 0
    };
    const activeTags = [];

    // 種族シナジー
    if ((raceCounts.human || 0) >= 3) {
      bonuses.hpPct += 0.16; bonuses.atkPct += 0.16; bonuses.defPct += 0.16;
      activeTags.push('人間×3 全+16%');
    } else if ((raceCounts.human || 0) >= 2) {
      bonuses.hpPct += 0.08; bonuses.atkPct += 0.08; bonuses.defPct += 0.08;
      activeTags.push('人間×2 全+8%');
    }

    if ((raceCounts.dragon || 0) >= 3) {
      bonuses.atkPct += 0.24; bonuses.cdmgAdd += 0.20;
      activeTags.push('竜×3 攻+24%');
    } else if ((raceCounts.dragon || 0) >= 2) {
      bonuses.atkPct += 0.12;
      activeTags.push('竜×2 攻+12%');
    }

    if ((raceCounts.monster || 0) >= 3) {
      bonuses.critAdd += 0.18; bonuses.lifesteal += 0.06;
      activeTags.push('魔物×3 会心+18%');
    } else if ((raceCounts.monster || 0) >= 2) {
      bonuses.critAdd += 0.10;
      activeTags.push('魔物×2 会心+10%');
    }

    if ((raceCounts.fairy || 0) >= 3) {
      bonuses.healPct += 0.30; bonuses.startSp += 25;
      activeTags.push('妖精×3 癒+30%');
    } else if ((raceCounts.fairy || 0) >= 2) {
      bonuses.healPct += 0.15;
      activeTags.push('妖精×2 癒+15%');
    }

    if ((raceCounts.machine || 0) >= 3) {
      bonuses.spdPct += 0.18; bonuses.startShieldPct += 0.15;
      activeTags.push('機械×3 速+18%');
    } else if ((raceCounts.machine || 0) >= 2) {
      bonuses.spdPct += 0.10;
      activeTags.push('機械×2 速+10%');
    }

    // 属性シナジー
    const uniqueAttrs = Object.keys(attrCounts).length;
    if (uniqueAttrs >= 4) {
      bonuses.atkPct += 0.12;
      bonuses.chaosGainPct += 0.22;
      activeTags.push('虹色混沌 攻+12%・混沌+22%');
    } else {
      for (const [attr, cnt] of Object.entries(attrCounts)) {
        const aName = HS.CONST.ATTR_MAP[attr]?.name || attr;
        if (cnt >= 3) {
          bonuses.atkPct += 0.16; bonuses.hpPct += 0.12;
          activeTags.push(`${aName}共鳴×${cnt} 攻+16%`);
        } else if (cnt >= 2) {
          bonuses.atkPct += 0.07; bonuses.hpPct += 0.06;
          activeTags.push(`${aName}共鳴×2 攻+7%`);
        }
      }
    }

    // 無属性カオス加速
    if ((attrCounts.null || 0) >= 1) {
      bonuses.chaosGainPct += 0.15 * attrCounts.null;
      activeTags.push(`無共鳴 混沌+${15 * attrCounts.null}%`);
    }

    // 4ロール完全編成
    if (roleSet.size === 4) {
      bonuses.hpPct += 0.10;
      bonuses.atkPct += 0.10;
      bonuses.defPct += 0.10;
      bonuses.spdPct += 0.06;
      activeTags.push('4ロール制覇 全+10%');
    }

    return { bonuses, activeTags, attrCounts, raceCounts, roleCount: roleSet.size };
  }

  /**
   * ユニット最終ステータス計算
   */
  function calcUnitStats(unitDef, unitSave, equipMap, synergyBonuses) {
    const lv = unitSave?.level || 1;
    const awake = unitSave?.awakening || 0;
    const exLv = unitSave?.exWeaponLv || 0;

    const lvMult = 1 + (lv - 1) * 0.135;
    const awakeMult = 1 + awake * 0.14;

    let hp = unitDef.base.hp * lvMult * awakeMult;
    let atk = unitDef.base.atk * lvMult * awakeMult;
    let def = unitDef.base.def * lvMult * awakeMult;
    let spd = unitDef.base.spd + Math.floor((lv - 1) * 0.65) + awake * 3;
    let crit = unitDef.base.crit;
    let cdmg = 1.5;
    let healPct = 0;
    let dmgRed = 0;
    let lifesteal = 0;
    let chaosGain = 0;
    let attrBonus = 0;

    // 装備加算
    const eqIds = unitSave?.equips || {};
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const itemId = eqIds[slot];
      const item = itemId ? equipMap[itemId] : null;
      if (!item) continue;
      const enhMult = 1 + (item.enhance || 0) * 0.12;
      const mVal = Math.round(item.mainVal * enhMult);
      if (item.mainStat === 'atk') atk += mVal;
      else if (item.mainStat === 'hp') hp += mVal;
      else if (item.mainStat === 'def') def += mVal;
      else if (item.mainStat === 'spd') spd += mVal;

      for (const af of item.affixes || []) {
        const av = af.val * (1 + (item.enhance || 0) * 0.05);
        switch (af.type) {
          case 'atkPct': atk *= 1 + av / 100; break;
          case 'hpPct': hp *= 1 + av / 100; break;
          case 'defPct': def *= 1 + av / 100; break;
          case 'spd': spd += av; break;
          case 'crit': crit += av / 100; break;
          case 'cdmg': cdmg += av / 100; break;
          case 'healPct': healPct += av / 100; break;
          case 'dmgRed': dmgRed += av / 100; break;
          case 'lifesteal': lifesteal += av / 100; break;
          case 'chaosGain': chaosGain += av / 100; break;
          case 'attrDmg': attrBonus += av / 100; break;
          default: break;
        }
      }
    }

    // 専用武器ステータス加算
    if (exLv > 0 && unitDef.exWeapon) {
      const exScale = 1 + (exLv - 1) * 0.35;
      hp += (unitDef.exWeapon.stats.hp || 0) * exScale;
      atk += (unitDef.exWeapon.stats.atk || 0) * exScale;
      def += (unitDef.exWeapon.stats.def || 0) * exScale;
      spd += Math.round((unitDef.exWeapon.stats.spd || 0) * exScale);
      crit += ((unitDef.exWeapon.stats.crit || 0) * exScale) / 100;
    }

    // ロール固有アビリティ基礎補正
    if (unitDef.role === 'tank') dmgRed += 0.18;
    if (unitDef.role === 'dealer') { crit += 0.12; cdmg += 0.25; }
    if (unitDef.role === 'healer') healPct += 0.20;

    // シナジー補正
    const syn = synergyBonuses || {};
    hp *= 1 + (syn.hpPct || 0);
    atk *= 1 + (syn.atkPct || 0);
    def *= 1 + (syn.defPct || 0);
    spd *= 1 + (syn.spdPct || 0);
    crit = clamp(crit + (syn.critAdd || 0), 0.05, 0.95);
    cdmg += syn.cdmgAdd || 0;
    healPct += syn.healPct || 0;
    lifesteal += syn.lifesteal || 0;
    chaosGain += syn.chaosGainPct || 0;
    dmgRed = clamp(dmgRed, 0, 0.65);

    const finalStats = {
      hp: Math.max(50, Math.round(hp)),
      atk: Math.max(10, Math.round(atk)),
      def: Math.max(5, Math.round(def)),
      spd: Math.max(50, Math.round(spd)),
      crit,
      cdmg,
      healPct,
      dmgRed,
      lifesteal,
      chaosGain,
      attrBonus
    };

    finalStats.power = Math.round(
      finalStats.hp * 0.22 +
      finalStats.atk * 2.6 +
      finalStats.def * 1.9 +
      finalStats.spd * 3.2 +
      finalStats.crit * 450 +
      exLv * 280
    );

    return finalStats;
  }

  HS.UTIL = {
    clamp,
    rand,
    randInt,
    pick,
    escHtml,
    fmtNum,
    fmtTime,
    calcPartySynergies,
    calcUnitStats
  };
})(window);
