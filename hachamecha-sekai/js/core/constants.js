/* ==========================================================================
   constants.js - 属性・相性・種族・ロール・厳格ソート・はちゃめちゃ異変定義
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const ATTRIBUTES = [
    { id: 'fire',  idx: 0, name: '炎', color: '#ff5a4f', bg: 'rgba(255,90,79,0.22)' },
    { id: 'water', idx: 1, name: '水', color: '#29b6f6', bg: 'rgba(41,182,246,0.22)' },
    { id: 'wind',  idx: 2, name: '風', color: '#34d399', bg: 'rgba(52,211,153,0.22)' },
    { id: 'light', idx: 3, name: '光', color: '#ffd54f', bg: 'rgba(255,213,79,0.22)' },
    { id: 'dark',  idx: 4, name: '闇', color: '#c084fc', bg: 'rgba(192,132,252,0.22)' },
    { id: 'null',  idx: 5, name: '無', color: '#f472b6', bg: 'rgba(244,114,182,0.22)' }
  ];

  const ATTR_MAP = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a]));

  const RACES = [
    { id: 'human',   idx: 0, name: '人間', short: '人', synergy2: '全ステ+8%',   synergy3: '全ステ+16%' },
    { id: 'dragon',  idx: 1, name: '竜',   short: '竜', synergy2: 'ATK+12%',     synergy3: 'ATK+24%・会心ダメ+20%' },
    { id: 'monster', idx: 2, name: '魔物', short: '魔', synergy2: '会心率+10%',  synergy3: '会心率+18%・吸血+6%' },
    { id: 'fairy',   idx: 3, name: '妖精', short: '妖', synergy2: '回復+15%',    synergy3: '回復+30%・開幕SP+25' },
    { id: 'machine', idx: 4, name: '機械', short: '機', synergy2: 'SPD+10%',     synergy3: 'SPD+18%・開幕障壁15%' }
  ];

  const RACE_MAP = Object.fromEntries(RACES.map((r) => [r.id, r]));

  const ROLES = [
    {
      id: 'tank',
      idx: 0,
      name: 'タンク',
      short: '盾',
      icon: '🛡',
      ability: {
        name: '守護の楔',
        desc: '戦闘開始時に最大HP22%の障壁を展開。被ダメージ18%軽減、狙われやすく被弾時にカオス値+4。'
      }
    },
    {
      id: 'dealer',
      idx: 1,
      name: 'ディーラー',
      short: '剣',
      icon: '⚔',
      ability: {
        name: '混沌追撃',
        desc: '会心率+12%・会心ダメ+25%。会心または弱点命中ごとに攻撃力+5%（最大8重）。'
      }
    },
    {
      id: 'supporter',
      idx: 2,
      name: 'サポーター',
      short: '奏',
      icon: '✦',
      ability: {
        name: '加速共鳴',
        desc: '味方全体の行動速度+10%。技使用時、最も行動ゲージが低い味方のゲージを+16%加速。'
      }
    },
    {
      id: 'healer',
      idx: 3,
      name: 'ヒーラー',
      short: '癒',
      icon: '✚',
      ability: {
        name: '再生の波動',
        desc: '回復量+20%。最大HPを超えた超過回復の50%を障壁に変換し、対象の弱体効果を1つ解除。'
      }
    }
  ];

  const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.id, r]));

  const RARITIES = [
    { id: 'N',     idx: 0, name: 'N',     color: '#9aa0b8', mult: 1.0,  affixCount: 1, sellGold: 45,   sellDust: 2 },
    { id: 'R',     idx: 1, name: 'R',     color: '#38bdf8', mult: 1.35, affixCount: 2, sellGold: 120,  sellDust: 5 },
    { id: 'SR',    idx: 2, name: 'SR',    color: '#c084fc', mult: 1.85, affixCount: 3, sellGold: 320,  sellDust: 14 },
    { id: 'SSR',   idx: 3, name: 'SSR',   color: '#fbbf24', mult: 2.55, affixCount: 4, sellGold: 850,  sellDust: 36 },
    { id: 'CHAOS', idx: 4, name: 'CHAOS', color: '#ff3898', mult: 3.45, affixCount: 4, sellGold: 2200, sellDust: 95 }
  ];

  const RARITY_MAP = Object.fromEntries(RARITIES.map((r) => [r.id, r]));

  const EQUIP_SLOTS = [
    { id: 'weapon',    name: '武器', icon: '⚔' },
    { id: 'armor',     name: '防具', icon: '🛡' },
    { id: 'accessory', name: '装飾', icon: '◈' }
  ];

  const SPEED_STEPS = [1, 2, 3];

  const CHAOS_ANOMALIES = [
    {
      id: 'meteor',
      name: '重力反転メテオ',
      desc: '敵全体へ毎秒ランダム隕石雨＋味方全体SPD+35%',
      color: '#ff5a4f',
      duration: 8
    },
    {
      id: 'fever',
      name: '倍々カオスフィーバー',
      desc: '全与ダメージ・回復量×1.55＆会心率+30%',
      color: '#ffd633',
      duration: 8
    },
    {
      id: 'shuffle',
      name: '属性シャッフル暴走',
      desc: '味方の全攻撃にランダム属性の連鎖追撃が発生',
      color: '#2ee6ff',
      duration: 8
    },
    {
      id: 'chrono',
      name: '時空バグ加速',
      desc: '行動ゲージ獲得量×1.6＆クールタイム高速短縮',
      color: '#c084fc',
      duration: 8
    },
    {
      id: 'parade',
      name: '大回復パレード',
      desc: '毎秒味方全体回復＆超過分が爆発障壁に変換',
      color: '#52f29b',
      duration: 8
    }
  ];

  /**
   * 属性相性倍率
   * 炎 > 風 > 水 > 炎 (1.35 / 0.75)
   * 光 ⇄ 闇 (1.30 相互弱点)
   * 無 (1.0 固定)
   */
  function getAttrMultiplier(atkAttr, defAttr) {
    if (atkAttr === 'null' || defAttr === 'null') return { mult: 1.0, relation: 'normal' };
    if (
      (atkAttr === 'fire' && defAttr === 'wind') ||
      (atkAttr === 'wind' && defAttr === 'water') ||
      (atkAttr === 'water' && defAttr === 'fire')
    ) {
      return { mult: 1.35, relation: 'weak' };
    }
    if (
      (atkAttr === 'wind' && defAttr === 'fire') ||
      (atkAttr === 'water' && defAttr === 'wind') ||
      (atkAttr === 'fire' && defAttr === 'water')
    ) {
      return { mult: 0.75, relation: 'resist' };
    }
    if (
      (atkAttr === 'light' && defAttr === 'dark') ||
      (atkAttr === 'dark' && defAttr === 'light')
    ) {
      return { mult: 1.30, relation: 'weak' };
    }
    return { mult: 1.0, relation: 'normal' };
  }

  /**
   * 厳格ソート順:
   * 1. 属性 (炎0 < 水1 < 風2 < 光3 < 闇4 < 無5)
   * 2. 主種族 (人間0 < 竜1 < 魔物2 < 妖精3 < 機械4)
   * 3. 第2種族 (なし-1 < 人間0 < 竜1 < 魔物2 < 妖精3 < 機械4)
   *    例: 人間 -> 人間・竜 -> 人間・魔物
   * 4. ロール (タンク0 < ディーラー1 < サポーター2 < ヒーラー3)
   */
  function getUnitSortTuple(unit) {
    const attrIdx = ATTR_MAP[unit.attr] ? ATTR_MAP[unit.attr].idx : 99;
    const raceIndices = (unit.races || []).map((r) => (RACE_MAP[r] ? RACE_MAP[r].idx : 99)).sort((a, b) => a - b);
    const r1 = raceIndices[0] ?? 99;
    const r2 = raceIndices.length > 1 ? raceIndices[1] : -1;
    const roleIdx = ROLE_MAP[unit.role] ? ROLE_MAP[unit.role].idx : 99;
    return [attrIdx, r1, r2, roleIdx];
  }

  function compareUnitsCanonical(a, b) {
    const ta = getUnitSortTuple(a);
    const tb = getUnitSortTuple(b);
    for (let i = 0; i < 4; i++) {
      if (ta[i] !== tb[i]) return ta[i] - tb[i];
    }
    return (a.id || '').localeCompare(b.id || '');
  }

  function sortUnitsCanonical(list) {
    return [...list].sort(compareUnitsCanonical);
  }

  function formatRacesLabel(races) {
    return (races || []).map((id) => (RACE_MAP[id] ? RACE_MAP[id].name : id)).join('・');
  }

  HS.CONST = {
    ATTRIBUTES,
    ATTR_MAP,
    RACES,
    RACE_MAP,
    ROLES,
    ROLE_MAP,
    RARITIES,
    RARITY_MAP,
    EQUIP_SLOTS,
    SPEED_STEPS,
    CHAOS_ANOMALIES,
    getAttrMultiplier,
    getUnitSortTuple,
    compareUnitsCanonical,
    sortUnitsCanonical,
    formatRacesLabel
  };
})(window);
