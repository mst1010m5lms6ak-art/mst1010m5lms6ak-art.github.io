(function () {
  'use strict';

  const Hacha = (window.Hacha = window.Hacha || {
    consts: {},
    util: {},
    data: {},
    engine: {},
    ui: {},
    state: null
  });

  /* 6属性（厳密な並び順：炎・水・風・光・闇・無） */
  const ELEMENTS = [
    { id: 'fire',  name: '炎', icon: '🔥', color: '#ff6347', cls: 'el-fire' },
    { id: 'water', name: '水', icon: '💧', color: '#3ec6ff', cls: 'el-water' },
    { id: 'wind',  name: '風', icon: '🌪️', color: '#4be390', cls: 'el-wind' },
    { id: 'light', name: '光', icon: '✨', color: '#ffe066', cls: 'el-light' },
    { id: 'dark',  name: '闇', icon: '🌙', color: '#c084ff', cls: 'el-dark' },
    { id: 'none',  name: '無', icon: '⚪', color: '#d4deef', cls: 'el-none' }
  ];

  /* 7種族（厳密な並び順：人間・竜・神・魔物・妖精・獣・機械） */
  const RACES = [
    { id: 'human',   name: '人間', icon: '🧑' },
    { id: 'dragon',  name: '竜',   icon: '🐉' },
    { id: 'god',     name: '神',   icon: '👑' },
    { id: 'monster', name: '魔物', icon: '👹' },
    { id: 'fairy',   name: '妖精', icon: '🧚' },
    { id: 'beast',   name: '獣',   icon: '🐺' },
    { id: 'machine', name: '機械', icon: '⚙️' }
  ];

  /* 4ロール（厳密な並び順：タンク・ディーラー・サポーター・ヒーラー） */
  const ROLES = [
    { id: 'tank',      name: 'タンク',     short: '盾', icon: '🛡️', cls: 'role-tank',      crystalName: '守護結晶' },
    { id: 'dealer',    name: 'ディーラー', short: '剣', icon: '⚔️', cls: 'role-dealer',    crystalName: '猛攻結晶' },
    { id: 'supporter', name: 'サポーター', short: '奏', icon: '🎺', cls: 'role-supporter', crystalName: '共鳴結晶' },
    { id: 'healer',    name: 'ヒーラー',   short: '癒', icon: '💚', cls: 'role-healer',    crystalName: '慈愛結晶' }
  ];

  const EQUIP_SLOTS = [
    { id: 'weapon', name: '武器', icon: '🗡️' },
    { id: 'armor',  name: '防具', icon: '🥋' },
    { id: 'charm',  name: '装飾', icon: '📿' }
  ];

  const SCOPE_META = {
    single:      { label: '単体',     cls: 'scope-single' },
    area:        { label: '範囲',     cls: 'scope-area' },
    all:         { label: '全体',     cls: 'scope-all' },
    ally_single: { label: '味方単体', cls: 'scope-single' },
    ally_area:   { label: '味方範囲', cls: 'scope-area' },
    ally_all:    { label: '味方全体', cls: 'scope-all' },
    self:        { label: '自身',     cls: 'scope-single' },
    passive:     { label: 'パッシブ', cls: 'scope-passive' }
  };

  /* 戦闘中のバフ・デバフ・状態異常 */
  const STATUS_META = {
    atk_up:   { name: '攻撃上昇', tag: '攻↑', kind: 'buff',    cls: 'st-buff' },
    def_up:   { name: '防御上昇', tag: '防↑', kind: 'buff',    cls: 'st-buff' },
    spd_up:   { name: '速度上昇', tag: '速↑', kind: 'buff',    cls: 'st-buff' },
    crit_up:  { name: '会心上昇', tag: '会↑', kind: 'buff',    cls: 'st-buff' },
    regen:    { name: '継続回復', tag: '再',   kind: 'buff',    cls: 'st-buff' },
    taunt:    { name: '挑発',     tag: '挑',   kind: 'buff',    cls: 'st-buff' },
    shield:   { name: '障壁',     tag: '壁',   kind: 'buff',    cls: 'st-buff' },
    atk_down: { name: '攻撃低下', tag: '攻↓', kind: 'debuff',  cls: 'st-debuff' },
    def_down: { name: '防御低下', tag: '防↓', kind: 'debuff',  cls: 'st-debuff' },
    spd_down: { name: '速度低下', tag: '速↓', kind: 'debuff',  cls: 'st-debuff' },
    vuln:     { name: '被ダメ増', tag: '脆',   kind: 'debuff',  cls: 'st-debuff' },
    burn:     { name: '火傷',     tag: '🔥',  kind: 'ailment', cls: 'st-ailment' },
    poison:   { name: '毒',       tag: '☠',  kind: 'ailment', cls: 'st-ailment' },
    freeze:   { name: '凍結',     tag: '❄',  kind: 'ailment', cls: 'st-ailment' },
    stun:     { name: '気絶',     tag: '💫',  kind: 'ailment', cls: 'st-ailment' },
    silence:  { name: '沈黙',     tag: '🔇',  kind: 'ailment', cls: 'st-ailment' }
  };

  const ELEMENT_MAP = {};
  const ELEMENT_INDEX = {};
  ELEMENTS.forEach((e, i) => { ELEMENT_MAP[e.id] = e; ELEMENT_INDEX[e.id] = i; });

  const RACE_MAP = {};
  const RACE_INDEX = {};
  RACES.forEach((r, i) => { RACE_MAP[r.id] = r; RACE_INDEX[r.id] = i; });

  const ROLE_MAP = {};
  const ROLE_INDEX = {};
  ROLES.forEach((r, i) => { ROLE_MAP[r.id] = r; ROLE_INDEX[r.id] = i; });

  const SLOT_MAP = {};
  const SLOT_INDEX = {};
  EQUIP_SLOTS.forEach((s, i) => { SLOT_MAP[s.id] = s; SLOT_INDEX[s.id] = i; });

  Hacha.consts = {
    ELEMENTS, RACES, ROLES, EQUIP_SLOTS, SCOPE_META, STATUS_META,
    ELEMENT_MAP, ELEMENT_INDEX, RACE_MAP, RACE_INDEX, ROLE_MAP, ROLE_INDEX, SLOT_MAP, SLOT_INDEX,
    AUTO_SELL_OPTIONS: [
      { value: 0,   label: '自動売却OFF' },
      { value: 60,  label: '品質60%未満を売却' },
      { value: 80,  label: '品質80%未満を売却' },
      { value: 90,  label: '品質90%未満を売却' },
      { value: 95,  label: '品質95%未満を売却' },
      { value: 100, label: '極品質100%未満を売却' }
    ]
  };

  /* 属性相性倍率 */
  function getElementMultiplier(atkEl, defEl) {
    if (atkEl === 'fire' && defEl === 'wind') return 1.35;
    if (atkEl === 'wind' && defEl === 'water') return 1.35;
    if (atkEl === 'water' && defEl === 'fire') return 1.35;
    if (atkEl === 'wind' && defEl === 'fire') return 0.78;
    if (atkEl === 'water' && defEl === 'wind') return 0.78;
    if (atkEl === 'fire' && defEl === 'water') return 0.78;
    if ((atkEl === 'light' && defEl === 'dark') || (atkEl === 'dark' && defEl === 'light')) return 1.30;
    return 1.0;
  }

  /* 厳密な固定並び順：属性(炎水風光闇無) → 種族(人間→人間竜→人間魔物…) → ロール(盾剣奏癒) → 五十音順 */
  function compareRosterEntities(a, b) {
    const eDiff = (ELEMENT_INDEX[a.element] ?? 99) - (ELEMENT_INDEX[b.element] ?? 99);
    if (eDiff !== 0) return eDiff;

    const r1A = RACE_INDEX[a.races[0]] ?? 99;
    const r1B = RACE_INDEX[b.races[0]] ?? 99;
    if (r1A !== r1B) return r1A - r1B;

    const r2A = a.races.length > 1 ? (RACE_INDEX[a.races[1]] ?? 99) : -1;
    const r2B = b.races.length > 1 ? (RACE_INDEX[b.races[1]] ?? 99) : -1;
    if (r2A !== r2B) return r2A - r2B;

    const roleDiff = (ROLE_INDEX[a.role] ?? 99) - (ROLE_INDEX[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;

    const kanaA = a.kana || a.name || '';
    const kanaB = b.kana || b.name || '';
    return kanaA.localeCompare(kanaB, 'ja');
  }

  /* 品質1〜100%の評価・倍率・強調表示 */
  function getQualityInfo(quality) {
    const q = Math.max(1, Math.min(100, Math.round(quality || 1)));
    if (q >= 100) {
      return { q, key: 'perfect', label: '極品質', badgeClass: 'q-perfect', cardClass: 'card-perfect', mult: 1.52 };
    }
    if (q >= 95) {
      return { q, key: 'master', label: '逸品', badgeClass: 'q-master', cardClass: '', mult: +(1.32 + (q - 95) * 0.025).toFixed(3) };
    }
    if (q >= 85) {
      return { q, key: 'great', label: '秀逸', badgeClass: 'q-great', cardClass: '', mult: +(1.16 + (q - 85) * 0.015).toFixed(3) };
    }
    if (q >= 60) {
      return { q, key: 'good', label: '良質', badgeClass: 'q-good', cardClass: '', mult: +(0.95 + (q - 60) * 0.0084).toFixed(3) };
    }
    return { q, key: 'normal', label: '通常', badgeClass: 'q-normal', cardClass: '', mult: +(0.72 + (q - 1) * 0.0039).toFixed(3) };
  }

  function formatRaceNames(races) {
    return (races || []).map((id) => (RACE_MAP[id] ? RACE_MAP[id].name : id)).join('・');
  }

  function formatNum(n) {
    return Math.round(n || 0).toLocaleString('ja-JP');
  }

  function formatDuration(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}分${String(r).padStart(2, '0')}秒` : `${r}秒`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  Hacha.util = {
    getElementMultiplier,
    compareRosterEntities,
    getQualityInfo,
    formatRaceNames,
    formatNum,
    formatDuration,
    escapeHtml,
    uid,
    randInt,
    pickRandom,
    clamp
  };
})();
