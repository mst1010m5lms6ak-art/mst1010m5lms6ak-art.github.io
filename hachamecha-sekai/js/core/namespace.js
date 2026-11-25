(function () {
  'use strict';

  const HS = {
    VERSION: '1.0.0',
    CONST: {},
    DOM: {},
    Storage: {},
    PWA: {},
    Data: {},
    Engine: {},
    UI: {}
  };

  const ELEMENTS = [
    { id: 'fire',  name: '炎', icon: '🔥', cls: 'el-fire',  color: '#ff6248' },
    { id: 'water', name: '水', icon: '💧', cls: 'el-water', color: '#3bb6ff' },
    { id: 'wind',  name: '風', icon: '🌪️', cls: 'el-wind',  color: '#39e596' },
    { id: 'light', name: '光', icon: '✨', cls: 'el-light', color: '#ffd859' },
    { id: 'dark',  name: '闇', icon: '🌑', cls: 'el-dark',  color: '#c074ff' },
    { id: 'none',  name: '無', icon: '💠', cls: 'el-none',  color: '#b6c4dc' }
  ];

  const RACES = [
    { id: 'human',   name: '人間', icon: '👤' },
    { id: 'dragon',  name: '竜',   icon: '🐉' },
    { id: 'god',     name: '神',   icon: '👑' },
    { id: 'demon',   name: '魔物', icon: '😈' },
    { id: 'fairy',   name: '妖精', icon: '🧚' },
    { id: 'beast',   name: '獣',   icon: '🐺' },
    { id: 'machine', name: '機械', icon: '⚙️' }
  ];

  const ROLES = [
    { id: 'tank',      name: 'タンク',     short: '盾', icon: '🛡️', cls: 'role-tank',      color: '#52a8ff' },
    { id: 'dealer',    name: 'ディーラー', short: '攻', icon: '⚔️', cls: 'role-dealer',    color: '#ff6478' },
    { id: 'supporter', name: 'サポーター', short: '援', icon: '🔮', cls: 'role-supporter', color: '#c67dff' },
    { id: 'healer',    name: 'ヒーラー',   short: '癒', icon: '💚', cls: 'role-healer',    color: '#45e69e' }
  ];

  const EQUIP_SLOTS = [
    { id: 'weapon',    name: '武器', icon: '⚔️' },
    { id: 'armor',     name: '防具', icon: '🛡️' },
    { id: 'accessory', name: '装飾', icon: '💍' },
    { id: 'core',      name: '核',   icon: '💠' }
  ];

  const TARGET_META = {
    single:     { label: '単体', cls: 'target-single' },
    range:      { label: '範囲', cls: 'target-range' },
    all:        { label: '全体', cls: 'target-all' },
    allySingle: { label: '味単', cls: 'target-single' },
    allyRange:  { label: '味範', cls: 'target-range' },
    allyAll:    { label: '味全', cls: 'target-all' },
    self:       { label: '自身', cls: 'target-single' }
  };

  const STATUS_META = {
    atkUp:   { name: '攻↑', kind: 'buff',    desc: '攻撃力+28%' },
    defUp:   { name: '防↑', kind: 'buff',    desc: '防御力+30%' },
    spdUp:   { name: '速↑', kind: 'buff',    desc: '行動速度+25%' },
    critUp:  { name: '会↑', kind: 'buff',    desc: '会心率+22%' },
    regen:   { name: '再生', kind: 'buff',   desc: '行動時HP9%回復' },
    taunt:   { name: '挑発', kind: 'buff',   desc: '敵の単体攻撃を引き受ける' },
    counter: { name: '反撃', kind: 'buff',   desc: '被弾時に反撃を行う' },
    atkDown: { name: '攻↓', kind: 'debuff',  desc: '攻撃力-22%' },
    defDown: { name: '防↓', kind: 'debuff',  desc: '防御力-25%' },
    spdDown: { name: '速↓', kind: 'debuff',  desc: '行動速度-22%' },
    vuln:    { name: '被↑', kind: 'debuff',  desc: '被ダメージ+20%' },
    burn:    { name: '火傷', kind: 'ailment', desc: '行動時、攻撃依存の炎継続ダメージ' },
    poison:  { name: '毒',   kind: 'ailment', desc: '行動時、最大HP6%の継続ダメージ' },
    freeze:  { name: '凍結', kind: 'ailment', desc: '行動ゲージ進行-45%' },
    stun:    { name: '気絶', kind: 'ailment', desc: '次の行動を1回スキップ' },
    silence: { name: '沈黙', kind: 'ailment', desc: 'CT技を使用不可' },
    blind:   { name: '暗闇', kind: 'ailment', desc: '攻撃命中率低下' }
  };

  const EL_MAP = Object.fromEntries(ELEMENTS.map((e, i) => [e.id, { ...e, order: i }]));
  const RACE_MAP = Object.fromEntries(RACES.map((r, i) => [r.id, { ...r, order: i }]));
  const ROLE_MAP = Object.fromEntries(ROLES.map((r, i) => [r.id, { ...r, order: i }]));
  const SLOT_MAP = Object.fromEntries(EQUIP_SLOTS.map((s, i) => [s.id, { ...s, order: i }]));

  function formatRaces(races) {
    return races.map((id) => (RACE_MAP[id] ? RACE_MAP[id].name : id)).join('・');
  }

  // Master Sort: Element -> Race (single before dual, e.g. 人間 -> 人間・竜 -> 人間・魔物) -> Role -> Kana (50-on)
  function compareUnits(a, b) {
    const ea = EL_MAP[a.element]?.order ?? 99;
    const eb = EL_MAP[b.element]?.order ?? 99;
    if (ea !== eb) return ea - eb;

    const ra0 = RACE_MAP[a.races[0]]?.order ?? 99;
    const rb0 = RACE_MAP[b.races[0]]?.order ?? 99;
    if (ra0 !== rb0) return ra0 - rb0;

    const ra1 = a.races.length > 1 ? (RACE_MAP[a.races[1]]?.order ?? 99) : -1;
    const rb1 = b.races.length > 1 ? (RACE_MAP[b.races[1]]?.order ?? 99) : -1;
    if (ra1 !== rb1) return ra1 - rb1;

    const roa = ROLE_MAP[a.role]?.order ?? 99;
    const rob = ROLE_MAP[b.role]?.order ?? 99;
    if (roa !== rob) return roa - rob;

    const ka = a.kana || a.name || '';
    const kb = b.kana || b.name || '';
    return ka.localeCompare(kb, 'ja');
  }

  function getElementAffinity(atkEl, defEl) {
    if (
      (atkEl === 'fire' && defEl === 'wind') ||
      (atkEl === 'wind' && defEl === 'water') ||
      (atkEl === 'water' && defEl === 'fire')
    ) {
      return { mult: 1.3, tag: 'weak', label: '弱点' };
    }
    if (
      (atkEl === 'wind' && defEl === 'fire') ||
      (atkEl === 'water' && defEl === 'wind') ||
      (atkEl === 'fire' && defEl === 'water')
    ) {
      return { mult: 0.8, tag: 'resist', label: '耐性' };
    }
    if ((atkEl === 'light' && defEl === 'dark') || (atkEl === 'dark' && defEl === 'light')) {
      return { mult: 1.25, tag: 'weak', label: '相剋' };
    }
    return { mult: 1.0, tag: 'neutral', label: '' };
  }

  HS.CONST = {
    ELEMENTS,
    RACES,
    ROLES,
    EQUIP_SLOTS,
    TARGET_META,
    STATUS_META,
    EL_MAP,
    RACE_MAP,
    ROLE_MAP,
    SLOT_MAP,
    formatRaces,
    compareUnits,
    getElementAffinity,
    ABILITY_COSTS: [
      { gold: 180, crystal: 4 },
      { gold: 420, crystal: 9 },
      { gold: 900, crystal: 18 },
      { gold: 1800, crystal: 32 },
      { gold: 3200, crystal: 54 }
    ],
    AWAKEN_COSTS: [
      { gold: 650, shard: 6 },
      { gold: 1850, shard: 16 },
      { gold: 4200, shard: 34 }
    ],
    MASTERY_XP_TABLE: [0, 20, 55, 115, 210],
    AUTO_SELL_OPTIONS: [0, 50, 70, 80, 90, 95, 100]
  };

  window.HS = HS;
})();
