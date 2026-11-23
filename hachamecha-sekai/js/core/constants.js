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

  /* 統一サイズ幾何学SVGアイコン（iOS PWAでの文字グリフ縮小・絵文字差異を完全解消） */
  const SVG_PATHS = {
    // ロール4種
    tank: '<path d="M12 2.2 4 5.4v6.1c0 5 3.4 9.2 8 10.3 4.6-1.1 8-5.3 8-10.3V5.4L12 2.2zm0 2.5 5.6 2.2v4.6c0 3.7-2.3 6.9-5.6 7.9-3.3-1-5.6-4.2-5.6-7.9V6.9L12 4.7z"/><path d="M12 7.2v9.4M8.4 11h7.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    dealer: '<path d="M19.8 3.2 14.3 4.1 6.7 11.7l-1.9-1.9-1.6 1.6 2.8 2.8-2.6 2.6 2 2 2.6-2.6 2.8 2.8 1.6-1.6-1.9-1.9 7.6-7.6.9-5.5zm-3.5 4.4-5.9 5.9-1.1-1.1 5.9-5.9 1.6-.3-.5 1.4z"/><path d="M4.2 3.2 9.7 4.1l2.8 2.8-1.8 1.8-2.1-2.1-1.6-.3.5 1.4 1.6 1.6-1.8 1.8L5.1 8.8 4.2 3.2zm11.9 11.4 2.8 2.8-2 2-2.6-2.6-1.4 1.4-1.6-1.6 1.9-1.9 1.1-1.1 1.8 1z"/>',
    supporter: '<path d="M12 2.2 14.6 9.4 21.8 12l-7.2 2.6L12 21.8l-2.6-7.2L2.2 12l7.2-2.6L12 2.2z"/><circle cx="5.2" cy="5.2" r="1.7"/><circle cx="18.8" cy="5.2" r="1.7"/><circle cx="5.2" cy="18.8" r="1.7"/><circle cx="18.8" cy="18.8" r="1.7"/>',
    healer: '<path d="M9.4 3h5.2v6.4H21v5.2h-6.4V21H9.4v-6.4H3V9.4h6.4V3z"/>',

    // 装備スロット3種
    weapon: '<path d="M20.2 3.8 14.6 4.7 7 12.3l-2-2-1.7 1.7 2.9 2.9-2.7 2.7 2 2 2.7-2.7 2.9 2.9 1.7-1.7-2-2 7.6-7.6.9-5.6zm-3.6 4.5-6.1 6.1-1.1-1.1 6.1-6.1 1.6-.3-.5 1.4z"/>',
    armor: '<path d="M12 2.2 4 5.4v6.1c0 5 3.4 9.2 8 10.3 4.6-1.1 8-5.3 8-10.3V5.4L12 2.2zm0 2.6 5.5 2.2v4.5c0 3.6-2.3 6.8-5.5 7.8-3.2-1-5.5-4.2-5.5-7.8V7L12 4.8z"/>',
    accessory: '<path d="M12 2.4 20.4 12 12 21.6 3.6 12 12 2.4zm0 3.7L6.8 12 12 17.9 17.2 12 12 6.1z"/><circle cx="12" cy="12" r="2.6"/>',

    // ボトムナビ6種
    nav_battle: '<path d="M19.8 3.2 14.3 4.1 6.7 11.7l-1.9-1.9-1.6 1.6 2.8 2.8-2.6 2.6 2 2 2.6-2.6 2.8 2.8 1.6-1.6-1.9-1.9 7.6-7.6.9-5.5z"/><path d="M4.2 3.2 9.7 4.1l2.7 2.7-1.8 1.8-2.1-2.1-1.6-.3.5 1.4 1.6 1.6-1.8 1.8-2.1-2.1-.9-5.7zm11.9 11.4 2.8 2.8-2 2-2.6-2.6-1.4 1.4-1.6-1.6 1.9-1.9 1.1-1.1 1.8 1z"/>',
    nav_party: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    nav_units: '<path d="M12 2.4 19.6 10h-4.4v5.2h-6.4V10H4.4L12 2.4z"/><rect x="6.2" y="17.4" width="11.6" height="3.4" rx="1.4"/>',
    nav_gear: '<path d="M12 2.2 4 5.4v6.1c0 5 3.4 9.2 8 10.3 4.6-1.1 8-5.3 8-10.3V5.4L12 2.2zm0 3.2 5 2v4.1c0 3.2-2 6-5 7-3-1-5-3.8-5-7V7.4l5-2z"/>',
    nav_codex: '<path d="M4 4.2A2.2 2.2 0 0 1 6.2 2H11v18H6.2A2.2 2.2 0 0 0 4 21.8V4.2zm9-2.2h4.8A2.2 2.2 0 0 1 20 4.2v17.6A2.2 2.2 0 0 0 17.8 20H13V2z"/><path d="M6.5 6.8h2.5M6.5 10.4h2.5M15 6.8h2.5M15 10.4h2.5" stroke="#141028" stroke-width="1.8" stroke-linecap="round"/>',
    nav_world: '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 6.8v5.6l3.8 2.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  function renderSvgIcon(key, cls) {
    const body = SVG_PATHS[key] || SVG_PATHS.supporter;
    return `<svg class="ico-svg${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  function renderRoleIcon(roleId, cls) {
    return renderSvgIcon(roleId, cls);
  }

  function renderSlotIcon(slotId, cls) {
    return renderSvgIcon(slotId, cls);
  }

  function renderNavIcon(navId, cls) {
    return renderSvgIcon(`nav_${navId}`, cls);
  }

  /**
   * キャラ幾何学紋章（色で属性を判別・中央にロールアイコンのみ配置）
   */
  function renderUnitCrest(unitOrAttr, sizeClass) {
    const attr = typeof unitOrAttr === 'string' ? unitOrAttr : (unitOrAttr?.attr || 'null');
    const role = typeof unitOrAttr === 'string' ? 'dealer' : (unitOrAttr?.role || 'dealer');
    const sz = sizeClass ? ` ${sizeClass}` : '';
    return `<div class="unit-crest${sz} attr-${attr}"><span class="crest-role">${renderRoleIcon(role)}</span></div>`;
  }

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
   * 5. 名前（五十音順）
   */
  function toKanaSortKey(str) {
    return String(str || '').replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  }

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
    const nameCmp = toKanaSortKey(a.name).localeCompare(toKanaSortKey(b.name), 'ja');
    if (nameCmp !== 0) return nameCmp;
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
    renderSvgIcon,
    renderRoleIcon,
    renderSlotIcon,
    renderNavIcon,
    renderUnitCrest,
    toKanaSortKey,
    getAttrMultiplier,
    getUnitSortTuple,
    compareUnitsCanonical,
    sortUnitsCanonical,
    formatRacesLabel
  };
})(window);
