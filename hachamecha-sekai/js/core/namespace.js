(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  HW.ELEMENTS = [
    { id: 'fire', name: '炎', order: 0, color: '#ff5744', cls: 'el-fire' },
    { id: 'water', name: '水', order: 1, color: '#2cb5ff', cls: 'el-water' },
    { id: 'wind', name: '風', order: 2, color: '#35e58f', cls: 'el-wind' },
    { id: 'light', name: '光', order: 3, color: '#ffd54a', cls: 'el-light' },
    { id: 'dark', name: '闇', order: 4, color: '#b668ff', cls: 'el-dark' },
    { id: 'none', name: '無', order: 5, color: '#b8c2d8', cls: 'el-none' }
  ];

  HW.RACES = [
    { id: 'human', name: '人間', order: 0 },
    { id: 'dragon', name: '竜', order: 1 },
    { id: 'god', name: '神', order: 2 },
    { id: 'monster', name: '魔物', order: 3 },
    { id: 'fairy', name: '妖精', order: 4 },
    { id: 'beast', name: '獣', order: 5 },
    { id: 'machine', name: '機械', order: 6 }
  ];

  HW.ROLES = [
    { id: 'tank', name: 'タンク', short: '盾', order: 0, color: '#38bdf8', cls: 'role-tank' },
    { id: 'dealer', name: 'ディーラー', short: '攻', order: 1, color: '#ff5c7a', cls: 'role-dealer' },
    { id: 'supporter', name: 'サポーター', short: '援', order: 2, color: '#c084fc', cls: 'role-supporter' },
    { id: 'healer', name: 'ヒーラー', short: '癒', order: 3, color: '#4ade80', cls: 'role-healer' }
  ];

  HW.EQUIP_SLOTS = [
    { id: 'weapon', name: '武器' },
    { id: 'armor', name: '防具' },
    { id: 'accessory', name: '装飾' },
    { id: 'core', name: 'コア' }
  ];

  HW.TARGET_LABELS = {
    single: { text: '単体', cls: 'target-single' },
    splash: { text: '範囲', cls: 'target-splash' },
    all: { text: '全体', cls: 'target-all' },
    allySingle: { text: '単体', cls: 'target-single' },
    allySplash: { text: '範囲', cls: 'target-splash' },
    allyAll: { text: '全体', cls: 'target-all' },
    self: { text: '単体', cls: 'target-single' },
    passive: { text: '常時', cls: 'target-passive' }
  };

  HW.STATUS_META = {
    atkUp: { name: '攻UP', kind: 'buff' },
    defUp: { name: '防UP', kind: 'buff' },
    spdUp: { name: '速UP', kind: 'buff' },
    critUp: { name: '会心', kind: 'buff' },
    regen: { name: '再生', kind: 'buff' },
    taunt: { name: '挑発', kind: 'buff' },
    evade: { name: '見切', kind: 'buff' },
    atkDown: { name: '攻DN', kind: 'debuff' },
    defDown: { name: '防DN', kind: 'debuff' },
    spdDown: { name: '鈍化', kind: 'debuff' },
    healDown: { name: '治減', kind: 'debuff' },
    burn: { name: '火傷', kind: 'ailment' },
    poison: { name: '毒', kind: 'ailment' },
    bleed: { name: '出血', kind: 'ailment' },
    freeze: { name: '凍結', kind: 'ailment' },
    paralyze: { name: '麻痺', kind: 'ailment' },
    silence: { name: '沈黙', kind: 'ailment' },
    curse: { name: '呪い', kind: 'ailment' }
  };

  HW.RANK_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  // アビリティ5段階の解放条件（覚醒★とRANKの両方必須）
  HW.ABILITY_TIER_REQ = [
    { tier: 1, star: 1, rank: 1, label: '初期解放' },
    { tier: 2, star: 2, rank: 3, label: '★2 & R-III' },
    { tier: 3, star: 3, rank: 5, label: '★3 & R-V' },
    { tier: 4, star: 4, rank: 7, label: '★4 & R-VII' },
    { tier: 5, star: 5, rank: 9, label: '★5 & R-IX' }
  ];

  // 戦技開眼（最大40・戦闘中ランダム開花）のロール別節目ボーナス
  HW.KAIKAN_MAX = 40;
  HW.KAIKAN_MILESTONES = {
    tank: [
      { need: 10, title: '一門', desc: '被ダメ軽減+4%', mod: { dmgRed: 0.04 } },
      { need: 20, title: '二門', desc: '異常耐性+10%', mod: { res: 0.10 } },
      { need: 30, title: '三門', desc: '最大HP+10%', mod: { hpPct: 0.10 } },
      { need: 40, title: '極門', desc: '味方被ダメ軽減+5%', mod: { teamDmgRed: 0.05 } }
    ],
    dealer: [
      { need: 10, title: '一門', desc: '会心率+5%', mod: { crit: 0.05 } },
      { need: 20, title: '二門', desc: '会心ダメ+14%', mod: { critDmg: 0.14 } },
      { need: 30, title: '三門', desc: '防御貫通+8%', mod: { defPen: 0.08 } },
      { need: 40, title: '極門', desc: '与ダメージ+12%', mod: { dmgUp: 0.12 } }
    ],
    supporter: [
      { need: 10, title: '一門', desc: '効果命中+10%', mod: { effHit: 0.10 } },
      { need: 20, title: '二門', desc: '速度+6', mod: { spdFlat: 6 } },
      { need: 30, title: '三門', desc: '味方攻撃+5%', mod: { teamAtkPct: 0.05 } },
      { need: 40, title: '極門', desc: '味方与ダメ+8%', mod: { teamDmgUp: 0.08 } }
    ],
    healer: [
      { need: 10, title: '一門', desc: '与回復量+8%', mod: { healOutPct: 0.08 } },
      { need: 20, title: '二門', desc: '異常耐性+10%', mod: { res: 0.10 } },
      { need: 30, title: '三門', desc: '毎行動HP4%再生', mod: { turnRegenPct: 0.04 } },
      { need: 40, title: '極門', desc: '与回復+14%・開戦加速', mod: { healOutPct: 0.14, startGauge: 0.15 } }
    ]
  };

  HW.getKaikanMilestones = function (role) {
    return HW.KAIKAN_MILESTONES[role] || HW.KAIKAN_MILESTONES.dealer;
  };

  HW.STAR_SHARD_COST = {
    unlock: 30,
    2: 40,
    3: 60,
    4: 90,
    5: 130,
    6: 200
  };

  HW.RANK_MATERIALS = [
    { id: 'mat_spark', name: '混沌の欠片', color: '#2de2e6' },
    { id: 'mat_gear', name: '異界の歯車', color: '#ffd24c' },
    { id: 'mat_scale', name: '星竜の鱗片', color: '#ff5744' },
    { id: 'mat_petal', name: '妖精の結晶', color: '#47f59a' },
    { id: 'mat_orb', name: '神話の宝珠', color: '#c084fc' },
    { id: 'mat_core', name: '時空の核石', color: '#ff3e9d' }
  ];

  HW.getElement = function (id) {
    return HW.ELEMENTS.find((e) => e.id === id) || HW.ELEMENTS[5];
  };

  HW.getRace = function (id) {
    return HW.RACES.find((r) => r.id === id) || HW.RACES[0];
  };

  HW.getRole = function (id) {
    return HW.ROLES.find((r) => r.id === id) || HW.ROLES[1];
  };

  HW.getElementMultiplier = function (atkEl, defEl) {
    if (atkEl === 'fire' && defEl === 'wind') return 1.3;
    if (atkEl === 'wind' && defEl === 'water') return 1.3;
    if (atkEl === 'water' && defEl === 'fire') return 1.3;
    if (atkEl === 'fire' && defEl === 'water') return 0.8;
    if (atkEl === 'water' && defEl === 'wind') return 0.8;
    if (atkEl === 'wind' && defEl === 'fire') return 0.8;
    if ((atkEl === 'light' && defEl === 'dark') || (atkEl === 'dark' && defEl === 'light')) return 1.25;
    return 1.0;
  };

  /**
   * 厳密4段階並び替え：
   * 1. 属性（炎→水→風→光→闇→無）
   * 2. 種族（人間→竜→神→魔物→妖精→獣→機械。2種族持ちは「人間→人間竜→人間神…」の順）
   * 3. ロール（タンク→ディーラー→サポーター→ヒーラー）
   * 4. 五十音順（kana）
   */
  HW.compareCharacters = function (a, b) {
    const ea = HW.getElement(a.element).order;
    const eb = HW.getElement(b.element).order;
    if (ea !== eb) return ea - eb;

    const ra = (a.races || ['human']).map((id) => HW.getRace(id).order).sort((x, y) => x - y);
    const rb = (b.races || ['human']).map((id) => HW.getRace(id).order).sort((x, y) => x - y);
    if (ra[0] !== rb[0]) return ra[0] - rb[0];
    const ra2 = ra.length > 1 ? ra[1] : -1;
    const rb2 = rb.length > 1 ? rb[1] : -1;
    if (ra2 !== rb2) return ra2 - rb2;

    const roa = HW.getRole(a.role).order;
    const rob = HW.getRole(b.role).order;
    if (roa !== rob) return roa - rob;

    const ka = a.kana || a.name || '';
    const kb = b.kana || b.name || '';
    return ka.localeCompare(kb, 'ja');
  };

  HW.formatNum = function (n) {
    const v = Math.floor(Number(n) || 0);
    if (v >= 100000000) return (v / 100000000).toFixed(2).replace(/\.00$/, '') + '億';
    if (v >= 100000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return v.toLocaleString('ja-JP');
  };

  // バトルカード・通貨バー用の超コンパクト数値表記（桁膨張でも見切れゼロ）
  HW.formatCompact = function (n) {
    const v = Math.floor(Number(n) || 0);
    if (v >= 100000000) return (v / 100000000).toFixed(1).replace(/\.0$/, '') + '億';
    if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return v.toLocaleString('ja-JP');
  };

  HW.getQualityMeta = function (quality) {
    const q = Math.max(1, Math.min(100, Math.round(quality)));
    if (q >= 100) return { label: '極', color: '#ffd24c', isMax: true, tier: 4 };
    if (q >= 90) return { label: '特', color: '#c084fc', isMax: false, tier: 3 };
    if (q >= 75) return { label: '優', color: '#38bdf8', isMax: false, tier: 2 };
    if (q >= 55) return { label: '良', color: '#4ade80', isMax: false, tier: 1 };
    return { label: '並', color: '#cbd5e1', isMax: false, tier: 0 };
  };

  HW.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  };
})();
