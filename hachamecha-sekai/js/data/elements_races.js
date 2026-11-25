(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var D = HS.Data = HS.Data || {};

  D.ELEMENTS_META = {
    fire:  { id: 'fire',  name: '炎', icon: '🔥', color: '#ff5d47', soft: 'rgba(255,93,71,0.18)',  strongAgainst: 'wind',  weakAgainst: 'water' },
    water: { id: 'water', name: '水', icon: '💧', color: '#3ea8ff', soft: 'rgba(62,168,255,0.18)', strongAgainst: 'fire',  weakAgainst: 'wind'  },
    wind:  { id: 'wind',  name: '風', icon: '🌪️', color: '#36d687', soft: 'rgba(54,214,135,0.18)', strongAgainst: 'water', weakAgainst: 'fire'  },
    light: { id: 'light', name: '光', icon: '☀️', color: '#ffd15c', soft: 'rgba(255,209,92,0.18)', strongAgainst: 'dark',  weakAgainst: 'dark'  },
    dark:  { id: 'dark',  name: '闇', icon: '🌙', color: '#b77bff', soft: 'rgba(183,123,255,0.18)',strongAgainst: 'light', weakAgainst: 'light' },
    none:  { id: 'none',  name: '無', icon: '❖',  color: '#b4c0d4', soft: 'rgba(180,192,212,0.18)',strongAgainst: null,    weakAgainst: null    }
  };

  D.ELEMENT_ADVANTAGE = function (atkEl, defEl) {
    if (!atkEl || !defEl || atkEl === 'none' || defEl === 'none' || atkEl === defEl) return 1.0;
    if ((atkEl === 'fire' && defEl === 'wind') ||
        (atkEl === 'wind' && defEl === 'water') ||
        (atkEl === 'water' && defEl === 'fire')) {
      return 1.3;
    }
    if ((atkEl === 'wind' && defEl === 'fire') ||
        (atkEl === 'water' && defEl === 'wind') ||
        (atkEl === 'fire' && defEl === 'water')) {
      return 0.75;
    }
    if ((atkEl === 'light' && defEl === 'dark') ||
        (atkEl === 'dark' && defEl === 'light')) {
      return 1.25;
    }
    return 1.0;
  };

  D.RACES_META = {
    human:  { id: 'human',  name: '人間', icon: '🧑', desc: '多彩な技と順応力で異界を駆ける冒険者たち。' },
    dragon: { id: 'dragon', name: '竜',   icon: '🐉', desc: '誇り高き鱗と灼熱の息吹を宿す古の覇者。' },
    god:    { id: 'god',    name: '神',   icon: '✨', desc: '天理と星光を操り世界の理を書き換える存在。' },
    demon:  { id: 'demon',  name: '魔物', icon: '😈', desc: '深淵の魔力と異形の力で戦場をかき乱す者たち。' },
    fairy:  { id: 'fairy',  name: '妖精', icon: '🦋', desc: '星霧と花の魔力を紡ぐ気まぐれな森の精霊。' },
    beast:  { id: 'beast',  name: '獣',   icon: '🐾', desc: '鋭い牙と野性の勘で獲物を追い詰める狩人。' },
    mech:   { id: 'mech',   name: '機械', icon: '⚙️', desc: '歯車と蒸気と光回路が織りなす鋼の機体群。' }
  };

  D.ROLES_META = {
    tank: {
      id: 'tank', name: 'タンク', short: '盾', badge: '守護', icon: '🛡️', color: '#4da6ff',
      desc: '敵の猛攻を受け止め、仲間を守り抜く前線の要。',
      linkName: '鉄壁の加護',
      linkDesc: '開幕シールド15%・防御+12%',
      linkBonus: { startShieldPct: 0.15, defPct: 0.12 }
    },
    dealer: {
      id: 'dealer', name: 'ディーラー', short: '攻', badge: '殲滅', icon: '⚔️', color: '#ff6b57',
      desc: '圧倒的な火力と連撃で強敵を打ち砕く主砲。',
      linkName: '猛攻の呼応',
      linkDesc: '攻撃+12%・追撃率+15%',
      linkBonus: { atkPct: 0.12, followUpRate: 0.15 }
    },
    supporter: {
      id: 'supporter', name: 'サポーター', short: '援', badge: '戦術', icon: '🎺', color: '#ffbe47',
      desc: '行動順や強化弱体を自在に操る戦場の指揮官。',
      linkName: '疾風の号令',
      linkDesc: '初期ゲージ+25%・速度+10%',
      linkBonus: { initGauge: 0.25, spdPct: 0.10 }
    },
    healer: {
      id: 'healer', name: 'ヒーラー', short: '癒', badge: '慈愛', icon: '💚', color: '#45d98c',
      desc: '傷を癒やし状態異常を祓う不屈の生命線。',
      linkName: '慈雨の恵み',
      linkDesc: 'WAVE開始HP回復15%・耐性+15%',
      linkBonus: { waveHealPct: 0.15, res: 0.15 }
    }
  };

  D.LINK_MATCH_BONUS = {
    sameElement: {
      name: '同属性リンク',
      desc: 'HP+5%・攻撃+5%',
      bonus: { hpPct: 0.05, atkPct: 0.05 }
    },
    sameRace: {
      name: '同種族リンク',
      desc: '防御+6%・会心+4%',
      bonus: { defPct: 0.06, crit: 0.04 }
    }
  };

  D.WORLDS_META = {
    frontier: {
      id: 'frontier', name: '境界平原', emblem: '⚜️', subtitle: '交差する旅立ちの大地',
      accent: '#f0b84c', desc: '七つの異界が最初に混ざり合った広大な草原と石畳の街。'
    },
    mechcity: {
      id: 'mechcity', name: '機巧都市', emblem: '⚙️', subtitle: '歯車とネオンの鋼鉄都',
      accent: '#3ad9ff', desc: '蒸気配管と青白い光回路が空まで伸びる超科学の要塞都市。'
    },
    dragonpeak: {
      id: 'dragonpeak', name: '紅蓮竜峰', emblem: '🌋', subtitle: '灼熱の翼が舞う火山の嶺',
      accent: '#ff5d47', desc: '溶岩の川と黒曜石の断崖に古竜の巣が連なる炎の聖域。'
    },
    fairyvale: {
      id: 'fairyvale', name: '星霧妖精郷', emblem: '🌿', subtitle: '星屑が降る永遠の霧森',
      accent: '#36d687', desc: '昼でも星が瞬く幻想の渓谷。いたずら好きな精霊が旅人を試す。'
    },
    abyss: {
      id: 'abyss', name: '深淵魔界', emblem: '🌒', subtitle: '紅き月が照らす魔性の谷',
      accent: '#b77bff', desc: '常識も重力もねじ曲がる夜の魔都。誇り高き魔族が群雄割拠する。'
    },
    sanctum: {
      id: 'sanctum', name: '白銀神域', emblem: '🏛️', subtitle: '雲上に浮かぶ白金の回廊',
      accent: '#ffd15c', desc: '純白の柱と黄金の時計塔が静かに時を刻む神々の空中庭園。'
    },
    wilds: {
      id: 'wilds', name: '極彩獣域', emblem: '🏕️', subtitle: '咆哮が響く大樹と草原の境',
      accent: '#ff9642', desc: '色鮮やかな巨樹と風が吹き抜ける大サバンナ。強き牙こそが礼儀。'
    }
  };

  D.STATUS_META = {
    atk_up:     { id: 'atk_up',     name: '攻撃上昇', short: '攻↑', icon: '⚔', kind: 'buff',    desc: '攻撃力が25%上昇する。' },
    def_up:     { id: 'def_up',     name: '防御上昇', short: '防↑', icon: '🛡', kind: 'buff',    desc: '防御力が30%上昇する。' },
    spd_up:     { id: 'spd_up',     name: '速度上昇', short: '速↑', icon: '≫', kind: 'buff',    desc: '行動速度が22%上昇する。' },
    crit_up:    { id: 'crit_up',    name: '会心上昇', short: '会↑', icon: '✦', kind: 'buff',    desc: '会心率が25%上昇する。' },
    regen:      { id: 'regen',      name: '継続再生', short: '再',  icon: '✚', kind: 'buff',    desc: '行動開始時に最大HPの10%を回復する。' },
    shield:     { id: 'shield',     name: '防護壁',   short: '壁',  icon: '◈', kind: 'buff',    desc: 'ダメージを肩代わりする障壁を張る。' },
    taunt:      { id: 'taunt',      name: '挑発',     short: '挑',  icon: '◎', kind: 'buff',    desc: '敵の単体攻撃を自身へ引きつける。' },
    counter:    { id: 'counter',    name: '反撃構え', short: '反',  icon: '↺', kind: 'buff',    desc: '攻撃を受けた際に自動で反撃する。' },
    atk_down:   { id: 'atk_down',   name: '攻撃低下', short: '攻↓', icon: '⚔', kind: 'debuff',  desc: '攻撃力が22%低下する。' },
    def_down:   { id: 'def_down',   name: '防御低下', short: '防↓', icon: '🛡', kind: 'debuff',  desc: '防御力が25%低下する。' },
    spd_down:   { id: 'spd_down',   name: '速度低下', short: '速↓', icon: '≪', kind: 'debuff',  desc: '行動速度が20%低下する。' },
    vulnerable: { id: 'vulnerable', name: '脆弱',     short: '脆',  icon: '▼', kind: 'debuff',  desc: '受けるダメージが20%増加する。' },
    burn:       { id: 'burn',       name: '火傷',     short: '灼',  icon: '🔥', kind: 'ailment', desc: '行動終了時に最大HPの7%ダメージを受ける。' },
    poison:     { id: 'poison',     name: '猛毒',     short: '毒',  icon: '☠', kind: 'ailment', desc: '行動終了時に最大HPの8%ダメージを受け回復量低下。' },
    stun:       { id: 'stun',       name: '気絶',     short: '暈',  icon: '★', kind: 'ailment', desc: '意識が朦朧とし、1回行動できなくなる。' },
    silence:    { id: 'silence',    name: '沈黙',     short: '黙',  icon: '✕', kind: 'ailment', desc: '基本技以外のスキルが封じられる。' },
    freeze:     { id: 'freeze',     name: '凍結',     short: '氷',  icon: '❄', kind: 'ailment', desc: '氷漬けになり1回行動不能、被ダメも増加する。' }
  };

  D.SYNERGIES = [
    // 属性シナジー (2 / 4 / 6)
    { id: 'syn_fire_2',  name: '炎の共鳴Ⅰ', kind: 'element', req: { element: 'fire', count: 2 },  desc: '炎属性2人以上：攻撃+8%', bonus: { atkPct: 0.08 } },
    { id: 'syn_fire_4',  name: '炎の共鳴Ⅱ', kind: 'element', req: { element: 'fire', count: 4 },  desc: '炎属性4人以上：攻撃+16%・会心+8%', bonus: { atkPct: 0.16, crit: 0.08 } },
    { id: 'syn_fire_6',  name: '紅蓮覇道',   kind: 'element', req: { element: 'fire', count: 6 },  desc: '炎属性6人以上：攻撃+26%・会心ダメ+25%', bonus: { atkPct: 0.26, critDmg: 0.25 } },

    { id: 'syn_water_2', name: '水の共鳴Ⅰ', kind: 'element', req: { element: 'water', count: 2 }, desc: '水属性2人以上：HP+8%・回復+8%', bonus: { hpPct: 0.08, healDealtPct: 0.08 } },
    { id: 'syn_water_4', name: '水の共鳴Ⅱ', kind: 'element', req: { element: 'water', count: 4 }, desc: '水属性4人以上：HP+16%・防御+10%・回復+15%', bonus: { hpPct: 0.16, defPct: 0.10, healDealtPct: 0.15 } },
    { id: 'syn_water_6', name: '蒼海加護',   kind: 'element', req: { element: 'water', count: 6 }, desc: '水属性6人以上：HP+25%・被ダメ-12%・WAVE回復+12%', bonus: { hpPct: 0.25, dmgTakenPct: -0.12, waveHealPct: 0.12 } },

    { id: 'syn_wind_2',  name: '風の共鳴Ⅰ', kind: 'element', req: { element: 'wind', count: 2 },  desc: '風属性2人以上：速度+7%', bonus: { spdPct: 0.07 } },
    { id: 'syn_wind_4',  name: '風の共鳴Ⅱ', kind: 'element', req: { element: 'wind', count: 4 },  desc: '風属性4人以上：速度+14%・追撃率+10%', bonus: { spdPct: 0.14, followUpRate: 0.10 } },
    { id: 'syn_wind_6',  name: '疾風迅雷',   kind: 'element', req: { element: 'wind', count: 6 },  desc: '風属性6人以上：速度+22%・初期ゲージ+25%・追撃率+18%', bonus: { spdPct: 0.22, initGauge: 0.25, followUpRate: 0.18 } },

    { id: 'syn_light_2', name: '光の共鳴Ⅰ', kind: 'element', req: { element: 'light', count: 2 }, desc: '光属性2人以上：開幕シールド10%・耐性+8%', bonus: { startShieldPct: 0.10, res: 0.08 } },
    { id: 'syn_light_4', name: '光の共鳴Ⅱ', kind: 'element', req: { element: 'light', count: 4 }, desc: '光属性4人以上：開幕シールド18%・与ダメ+10%・耐性+15%', bonus: { startShieldPct: 0.18, dmgDealtPct: 0.10, res: 0.15 } },
    { id: 'syn_light_6', name: '白銀天啓',   kind: 'element', req: { element: 'light', count: 6 }, desc: '光属性6人以上：開幕シールド28%・全能力+14%', bonus: { startShieldPct: 0.28, hpPct: 0.14, atkPct: 0.14, defPct: 0.14 } },

    { id: 'syn_dark_2',  name: '闇の共鳴Ⅰ', kind: 'element', req: { element: 'dark', count: 2 },  desc: '闇属性2人以上：会心+6%・異常付与+10%', bonus: { crit: 0.06, ailmentRate: 0.10 } },
    { id: 'syn_dark_4',  name: '闇の共鳴Ⅱ', kind: 'element', req: { element: 'dark', count: 4 },  desc: '闇属性4人以上：会心+12%・異常特攻+18%', bonus: { crit: 0.12, ailmentDmgPct: 0.18 } },
    { id: 'syn_dark_6',  name: '深淵支配',   kind: 'element', req: { element: 'dark', count: 6 },  desc: '闇属性6人以上：攻撃+20%・異常特攻+32%・異常付与+25%', bonus: { atkPct: 0.20, ailmentDmgPct: 0.32, ailmentRate: 0.25 } },

    { id: 'syn_none_2',  name: '無の調和Ⅰ', kind: 'element', req: { element: 'none', count: 2 },  desc: '無属性2人以上：HP・攻撃・防御+6%', bonus: { hpPct: 0.06, atkPct: 0.06, defPct: 0.06 } },
    { id: 'syn_none_4',  name: '無の調和Ⅱ', kind: 'element', req: { element: 'none', count: 4 },  desc: '無属性4人以上：全能力+12%・速度+8%', bonus: { hpPct: 0.12, atkPct: 0.12, defPct: 0.12, spdPct: 0.08 } },

    // 種族シナジー (2 / 4) — 複合種族は両種族にカウント！
    { id: 'syn_human_2',  name: '人間の団結', kind: 'race', req: { race: 'human', count: 2 },  desc: '人間2人以上：初期ゲージ+12%・攻撃+6%', bonus: { initGauge: 0.12, atkPct: 0.06 } },
    { id: 'syn_human_4',  name: '英雄同盟',   kind: 'race', req: { race: 'human', count: 4 },  desc: '人間4人以上：初期ゲージ+22%・全能力+10%', bonus: { initGauge: 0.22, hpPct: 0.10, atkPct: 0.10, defPct: 0.10 } },

    { id: 'syn_dragon_2', name: '竜の威圧',   kind: 'race', req: { race: 'dragon', count: 2 }, desc: '竜2人以上：攻撃+10%・HP+8%', bonus: { atkPct: 0.10, hpPct: 0.08 } },
    { id: 'syn_dragon_4', name: '古竜降臨',   kind: 'race', req: { race: 'dragon', count: 4 }, desc: '竜4人以上：攻撃+20%・HP+16%・与ダメ+12%', bonus: { atkPct: 0.20, hpPct: 0.16, dmgDealtPct: 0.12 } },

    { id: 'syn_god_2',    name: '神々の祝福', kind: 'race', req: { race: 'god', count: 2 },    desc: '神2人以上：耐性+12%・与ダメ+8%', bonus: { res: 0.12, dmgDealtPct: 0.08 } },
    { id: 'syn_god_4',    name: '万神殿',     kind: 'race', req: { race: 'god', count: 4 },    desc: '神4人以上：耐性+24%・与ダメ+18%・開幕シールド15%', bonus: { res: 0.24, dmgDealtPct: 0.18, startShieldPct: 0.15 } },

    { id: 'syn_demon_2',  name: '魔界の契約', kind: 'race', req: { race: 'demon', count: 2 },  desc: '魔物2人以上：異常付与+12%・会心ダメ+15%', bonus: { ailmentRate: 0.12, critDmg: 0.15 } },
    { id: 'syn_demon_4',  name: '百鬼夜行',   kind: 'race', req: { race: 'demon', count: 4 },  desc: '魔物4人以上：異常特攻+24%・会心ダメ+30%', bonus: { ailmentDmgPct: 0.24, critDmg: 0.30 } },

    { id: 'syn_fairy_2',  name: '妖精の輪舞', kind: 'race', req: { race: 'fairy', count: 2 },  desc: '妖精2人以上：速度+8%・回復+10%', bonus: { spdPct: 0.08, healDealtPct: 0.10 } },
    { id: 'syn_fairy_4',  name: '星霧大祝祭', kind: 'race', req: { race: 'fairy', count: 4 },  desc: '妖精4人以上：速度+16%・回復+20%・WAVE回復+10%', bonus: { spdPct: 0.16, healDealtPct: 0.20, waveHealPct: 0.10 } },

    { id: 'syn_beast_2',  name: '野性の群れ', kind: 'race', req: { race: 'beast', count: 2 },  desc: '獣2人以上：会心+8%・追撃率+8%', bonus: { crit: 0.08, followUpRate: 0.08 } },
    { id: 'syn_beast_4',  name: '百獣王陣',   kind: 'race', req: { race: 'beast', count: 4 },  desc: '獣4人以上：会心+16%・追撃率+18%・攻撃+12%', bonus: { crit: 0.16, followUpRate: 0.18, atkPct: 0.12 } },

    { id: 'syn_mech_2',   name: '機巧連携',   kind: 'race', req: { race: 'mech', count: 2 },   desc: '機械2人以上：防御+12%・開幕シールド10%', bonus: { defPct: 0.12, startShieldPct: 0.10 } },
    { id: 'syn_mech_4',   name: '超機導要塞', kind: 'race', req: { race: 'mech', count: 4 },   desc: '機械4人以上：防御+24%・開幕シールド22%・反撃率+15%', bonus: { defPct: 0.24, startShieldPct: 0.22, counterRate: 0.15 } },

    // 編成バランス・混成シナジー
    { id: 'syn_all_roles',  name: '四職円陣',       kind: 'all_roles',         req: { count: 4 }, desc: '全4ロール編成：全能力+6%・開幕シールド8%', bonus: { hpPct: 0.06, atkPct: 0.06, defPct: 0.06, startShieldPct: 0.08 } },
    { id: 'syn_rainbow_4',  name: '四界混成陣',     kind: 'distinct_elements', req: { count: 4 }, desc: '4属性以上混成：攻撃+8%・速度+8%・会心+5%', bonus: { atkPct: 0.08, spdPct: 0.08, crit: 0.05 } },
    { id: 'syn_rainbow_6',  name: 'はちゃめちゃ虹陣', kind: 'distinct_elements', req: { count: 6 }, desc: '全6属性混成：全能力+12%・与ダメ+12%・初期ゲージ+15%', bonus: { hpPct: 0.12, atkPct: 0.12, defPct: 0.12, dmgDealtPct: 0.12, initGauge: 0.15 } },
    { id: 'syn_dual_2',     name: '境界混血の絆',   kind: 'dual_race',         req: { count: 2 }, desc: '複合種族2人以上：会心+6%・会心ダメ+15%', bonus: { crit: 0.06, critDmg: 0.15 } },
    { id: 'syn_dual_4',     name: '異界融合極致',   kind: 'dual_race',         req: { count: 4 }, desc: '複合種族4人以上：全能力+10%・追撃+12%・耐性+10%', bonus: { hpPct: 0.10, atkPct: 0.10, defPct: 0.10, followUpRate: 0.12, res: 0.10 } },
    { id: 'syn_multi_race', name: '万象同盟',       kind: 'distinct_races',    req: { count: 5 }, desc: '5種族以上混成：HP+12%・被ダメ-8%・WAVE回復+8%', bonus: { hpPct: 0.12, dmgTakenPct: -0.08, waveHealPct: 0.08 } }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
