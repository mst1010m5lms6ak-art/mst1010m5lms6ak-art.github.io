/* 装備12シリーズ×4部位（品質5段階・ランダムOPなし・装備Lvなし）・自由アビリティ28種・3軸編成シナジー */
(function () {
  'use strict';

  /* 品質5段階（高品質ほど低確率） */
  const QUALITIES = [
    { id: 0, name: '標準', mult: 1.00, setMult: 1.00, sellVal: 40,  weight: 50 },
    { id: 1, name: '上質', mult: 1.18, setMult: 1.08, sellVal: 95,  weight: 28 },
    { id: 2, name: '精巧', mult: 1.40, setMult: 1.18, sellVal: 210, weight: 14 },
    { id: 3, name: '逸品', mult: 1.68, setMult: 1.30, sellVal: 480, weight: 6  },
    { id: 4, name: '至宝', mult: 2.05, setMult: 1.45, sellVal: 1100, weight: 2 }
  ];

  const SLOTS = [
    { id: 'weapon',    name: '武器', baseStat: 'atk', baseVal: 58 },
    { id: 'armor',     name: '防具', baseStat: 'def', baseVal: 36 },
    { id: 'accessory', name: '装飾', baseStat: 'hp',  baseVal: 310 },
    { id: 'emblem',    name: '紋章', baseStat: 'spd', baseVal: 12 }
  ];

  /* 装備12シリーズ（通常ドロップ8種＋限定クラフト4種） */
  const EQUIP_SERIES = [
    /* 通常ドロップ8シリーズ（メイン異界1〜6で獲得） */
    {
      id: 's_sky', name: '蒼穹の羽装', limited: false, tier: 1.0,
      partNames: { weapon: '蒼風の細剣', armor: '白羽の外套', accessory: '蒼天の首飾', emblem: '蒼穹の紋章' },
      set2: { desc: '速度 +8', stat: 'spd', val: 8 },
      set4: { desc: '与ダメージ +16% / 開幕行動ゲージ +15%', dmgPct: 0.16, startGauge: 15 },
      lore: '蒼穹の廃都で騎士団が身に纏った軽装武具。風を切るように素早い立ち回りを可能にする。'
    },
    {
      id: 's_oath', name: '白王の誓装', limited: false, tier: 1.04,
      partNames: { weapon: '誓約の直剣', armor: '白石の重鎧', accessory: '王家の指輪', emblem: '誓約の紋章' },
      set2: { desc: '最大HP +14%', stat: 'hpPct', val: 0.14 },
      set4: { desc: '防御力 +22% / 被ダメージ -10%', defPct: 0.22, dmgCut: 0.10 },
      lore: '廃都の白王へ忠誠を誓った近衛隊の礼装。堅牢な守りで前線の仲間を支え続ける。'
    },
    {
      id: 's_forge', name: '紅蓮の鍛装', limited: false, tier: 1.12,
      partNames: { weapon: '溶鉄の大剣', armor: '黒鉄の胸甲', accessory: '炉心の腕輪', emblem: '紅蓮の紋章' },
      set2: { desc: '攻撃力 +15%', stat: 'atkPct', val: 0.15 },
      set4: { desc: '会心率 +14% / 会心ダメージ +24%', crit: 0.14, critDmg: 0.24 },
      lore: '紅蓮の溶鉄炉で幾度も焼き入れられた攻撃特化の武具。振るうたび烈火のごとき威力を放つ。'
    },
    {
      id: 's_sakura', name: '幽玄の桜装', limited: false, tier: 1.18,
      partNames: { weapon: '夜桜の太刀', armor: '薄紅の羽織', accessory: '桜雫の根付', emblem: '夜桜の紋章' },
      set2: { desc: '会心率 +10%', stat: 'crit', val: 0.10 },
      set4: { desc: '技威力 +20% / 速度 +8', skillPct: 0.20, spd: 8 },
      lore: '幽玄の桜京に伝わる雅な戦装束。優美な意匠の裏に鋭利な必殺の技が込められている。'
    },
    {
      id: 's_abyss', name: '深海の瑠璃装', limited: false, tier: 1.24,
      partNames: { weapon: '珊瑚の霊杖', armor: '瑠璃の法衣', accessory: '真珠の耳飾', emblem: '深海の紋章' },
      set2: { desc: '回復量 +16%', stat: 'healPct', val: 0.16 },
      set4: { desc: '最大HP +20% / 被回復量 +20%', hpPct: 0.20, healRcvPct: 0.20 },
      lore: '海底の沈黙神殿で祈りを捧げる巫女が用いた瑠璃の装具。生命の水脈を穏やかに巡らせる。'
    },
    {
      id: 's_tide', name: '激流の蒼装', limited: false, tier: 1.28,
      partNames: { weapon: '渦潮の双槍', armor: '蒼鱗の軽鎧', accessory: '海流の護符', emblem: '蒼海の紋章' },
      set2: { desc: '攻撃力 +14% / 速度 +4', stat: 'atkPct', val: 0.14, extraSpd: 4 },
      set4: { desc: '範囲・全体技の与ダメージ +24%', aoePct: 0.24 },
      lore: '荒波を割る潮流の勢いを封じ込めた戦装具。複数の敵を一挙に押し流す連戦に適している。'
    },
    {
      id: 's_clock', name: '白銀の星刻装', limited: false, tier: 1.36,
      partNames: { weapon: '時針の光刃', armor: '白金の機甲', accessory: '天球の懐中', emblem: '星刻の紋章' },
      set2: { desc: '速度 +12', stat: 'spd', val: 12 },
      set4: { desc: '攻撃力 +18% / 行動時ゲージ回収 +10%', atkPct: 0.18, afterGauge: 10 },
      lore: '白銀の星刻機構で製造された精密な機甲武具。刻の律動に同調し圧倒的な回転率を生み出す。'
    },
    {
      id: 's_void', name: '虚無の星雲装', limited: false, tier: 1.44,
      partNames: { weapon: '零点の虚刃', armor: '星影の外套', accessory: '星雲の結晶', emblem: '虚無の紋章' },
      set2: { desc: '攻撃力 +18%', stat: 'atkPct', val: 0.18 },
      set4: { desc: '与ダメージ +22% / 被ダメージ -12%', dmgPct: 0.22, dmgCut: 0.12 },
      lore: '星間回廊の境界から削り出された終焉の装具。攻防の均衡を超えた異次元の力を宿す。'
    },
    {
      id: 's_veil', name: '宵闇の紗装', limited: false, tier: 1.32,
      partNames: { weapon: '宵影の短剣', armor: '薄闇の羽衣', accessory: '月露の耳飾', emblem: '宵闇の紋章' },
      set2: { desc: '会心率 +12%', stat: 'crit', val: 0.12 },
      set4: { desc: '会心ダメージ +28% / 速度 +10', critDmg: 0.28, spd: 10 },
      lore: '幽玄の桜京と星間の狭間で織られた薄闇の戦装束。影のように軽やかな歩みから必殺の一撃を放つ。'
    },

    /* 限定クラフト4シリーズ（異界討伐・総力連戦の限定素材で製作） */
    {
      id: 's_lim_storm', name: '嵐帝の覇装', limited: true, matId: 'mat_storm', matCost: 4, tier: 1.46,
      partNames: { weapon: '嵐帝の翼槍', armor: '嵐帝の蒼鎧', accessory: '嵐帝の風環', emblem: '嵐帝の覇紋' },
      set2: { desc: '速度 +14 / 会心率 +8%', stat: 'spd', val: 14, extraCrit: 0.08 },
      set4: { desc: '与ダメージ +26% / 開幕行動ゲージ +25%', dmgPct: 0.26, startGauge: 25 },
      lore: '嵐帝ヴァルキリアの羽核から鍛え上げた限定覇装。初動から戦場を支配する疾風を纏う。'
    },
    {
      id: 's_lim_flame', name: '炎魔の業装', limited: true, matId: 'mat_flame', matCost: 4, tier: 1.50,
      partNames: { weapon: '炎魔の巨剣', armor: '炎魔の紅甲', accessory: '炎魔の核輪', emblem: '炎魔の業紋' },
      set2: { desc: '攻撃力 +22%', stat: 'atkPct', val: 0.22 },
      set4: { desc: '単体・ボスへの与ダメージ +30% / 会心ダメ +25%', bossPct: 0.30, critDmg: 0.25 },
      lore: '炎魔機イグニスの炉核を封じた限定武具。強大な単独ボスを打ち砕くために生まれ落ちた。'
    },
    {
      id: 's_lim_sakura', name: '妖桜の神装', limited: true, matId: 'mat_sakura', matCost: 4, tier: 1.54,
      partNames: { weapon: '妖桜の神刀', armor: '妖桜の霊衣', accessory: '妖桜の勾玉', emblem: '妖桜の神紋' },
      set2: { desc: '最大HP +18% / 回復量 +18%', stat: 'hpPct', val: 0.18, extraHeal: 0.18 },
      set4: { desc: '味方全体へのバフ・回復効率 +25% / 被ダメージ -14%', healPct: 0.25, dmgCut: 0.14 },
      lore: '妖桜帝クチナワの霊核を織り込んだ限定神装。揺るがぬ生命力と清浄な霊力で部隊を守り抜く。'
    },
    {
      id: 's_lim_omega', name: '終焉の零装', limited: true, matId: 'mat_omega', matCost: 4, tier: 1.66,
      partNames: { weapon: '零皇の断剣', armor: '零皇の星鎧', accessory: '零皇の星環', emblem: '零皇の終紋' },
      set2: { desc: '全基礎ステータス +16%', stat: 'allPct', val: 0.16 },
      set4: { desc: '与ダメージ +30% / 技威力 +20% / 被ダメージ -15%', dmgPct: 0.30, skillPct: 0.20, dmgCut: 0.15 },
      lore: '終焉残響オメガの零核から再構成された至高の限定装備。全異界の理を掌中に収める象徴。'
    }
  ];

  const SERIES_MAP = {};
  EQUIP_SERIES.forEach((s) => { SERIES_MAP[s.id] = s; });

  /* 自由アビリティ28種（キャラの自由枠に付け替え可能） */
  const FREE_ABILITIES = [
    /* 初期所持6種 */
    { id: 'ab_atk1',    name: '剛力の心得',   desc: '攻撃力 +12%',                 unlockedByDefault: true,  effect: { atkPct: 0.12 } },
    { id: 'ab_hp1',     name: '健壮の心得',   desc: '最大HP +14%',                 unlockedByDefault: true,  effect: { hpPct: 0.14 } },
    { id: 'ab_def1',    name: '守護の心得',   desc: '防御力 +16%',                 unlockedByDefault: true,  effect: { defPct: 0.16 } },
    { id: 'ab_spd1',    name: '疾駆の心得',   desc: '速度 +8',                     unlockedByDefault: true,  effect: { spd: 8 } },
    { id: 'ab_crit1',   name: '急所見切り',   desc: '会心率 +10%',                 unlockedByDefault: true,  effect: { crit: 0.10 } },
    { id: 'ab_heal1',   name: '慈愛の祈り',   desc: '回復量 +16%',                 unlockedByDefault: true,  effect: { healPct: 0.16 } },

    /* 残響結晶交換・被り自動変換で解放できる戦術アビリティ12種 */
    { id: 'ab_first',   name: '先制の残響',   desc: '開幕行動ゲージ +25%',         costSoul: 120, effect: { startGauge: 25 } },
    { id: 'ab_boss',    name: '巨敵討ち',     desc: 'ボス・乱入敵への与ダメ +20%', costSoul: 160, effect: { bossPct: 0.20 } },
    { id: 'ab_aoe',     name: '広域制圧',     desc: '範囲・全体技の与ダメ +18%',   costSoul: 150, effect: { aoePct: 0.18 } },
    { id: 'ab_cut',     name: '金剛の構え',   desc: '被ダメージ -12%',             costSoul: 150, effect: { dmgCut: 0.12 } },
    { id: 'ab_cdmg',    name: '必殺の極意',   desc: '会心ダメージ +30%',           costSoul: 180, effect: { critDmg: 0.30 } },
    { id: 'ab_rcvh',    name: '生命の器',     desc: '被回復量 +24% / HP +10%',     costSoul: 140, effect: { healRcvPct: 0.24, hpPct: 0.10 } },
    { id: 'ab_drain',   name: '残響吸収',     desc: '与ダメージの8%を自身回復',    costSoul: 200, effect: { lifesteal: 0.08 } },
    { id: 'ab_cycle',   name: '連環の律動',   desc: '行動終了時にゲージ +12%',     costSoul: 220, effect: { afterGauge: 12 } },
    { id: 'ab_skill',   name: '奥義研鑽',     desc: '全技の威力・回復量 +16%',     costSoul: 200, effect: { skillPct: 0.16 } },
    { id: 'ab_guard',   name: '不動の盾心',   desc: '防御 +20% / 被ダメ -8%',      costSoul: 180, effect: { defPct: 0.20, dmgCut: 0.08 } },
    { id: 'ab_swift',   name: '神速の残響',   desc: '速度 +14 / 会心率 +6%',       costSoul: 240, effect: { spd: 14, crit: 0.06 } },
    { id: 'ab_titan',   name: '不屈の巨体',   desc: '最大HP +24% / 防御 +12%',     costSoul: 240, effect: { hpPct: 0.24, defPct: 0.12 } },

    /* 試練の狭間 報酬アビリティ8種 */
    { id: 'ab_fire_master',  name: '紅蓮の極印',   desc: '攻撃 +18% / 与ダメ +10%',       trialOnly: true, effect: { atkPct: 0.18, dmgPct: 0.10 } },
    { id: 'ab_water_master', name: '蒼海の極印',   desc: '回復量 +22% / HP +16%',         trialOnly: true, effect: { healPct: 0.22, hpPct: 0.16 } },
    { id: 'ab_wind_master',  name: '翠風の極印',   desc: '速度 +16 / 開幕ゲージ +20%',    trialOnly: true, effect: { spd: 16, startGauge: 20 } },
    { id: 'ab_ld_master',    name: '光闇の極印',   desc: '会心率 +14% / 会心ダメ +28%',   trialOnly: true, effect: { crit: 0.14, critDmg: 0.28 } },
    { id: 'ab_none_master',  name: '無垢の極印',   desc: '全ステータス +14%',             trialOnly: true, effect: { allPct: 0.14 } },
    { id: 'ab_iron_wall',    name: '鉄壁の極印',   desc: '防御 +25% / 被ダメ -14%',       trialOnly: true, effect: { defPct: 0.25, dmgCut: 0.14 } },
    { id: 'ab_underdog',     name: '反骨の極印',   desc: '技威力 +24% / 与ダメ +12%',     trialOnly: true, effect: { skillPct: 0.24, dmgPct: 0.12 } },
    { id: 'ab_trio_pride',   name: '三傑の極印',   desc: '攻撃 +20% / 速度 +10 / 被ダメ-8%', trialOnly: true, effect: { atkPct: 0.20, spd: 10, dmgCut: 0.08 } },

    /* 深淵の塔 節目報酬2種（5の倍数階で順次獲得） */
    { id: 'ab_tower_5',  name: '深淵踏破の証', desc: '全ステータス +12% / 与ダメ +10%', towerOnly: true, effect: { allPct: 0.12, dmgPct: 0.10 } },
    { id: 'ab_tower_15', name: '深淵覇者の印', desc: '攻撃 +22% / 速度 +12 / 吸収6%',   towerOnly: true, effect: { atkPct: 0.22, spd: 12, lifesteal: 0.06 } }
  ];

  const ABILITY_MAP = {};
  FREE_ABILITIES.forEach((a) => { ABILITY_MAP[a.id] = a; });

  /* 3軸編成シナジー計算（属性構成・ロール構成・出身異界） */
  function computePartySynergies(charList) {
    const valid = charList.filter(Boolean);
    const active = [];
    const totals = { atkPct: 0, hpPct: 0, defPct: 0, spd: 0, crit: 0, healPct: 0, dmgPct: 0, dmgCut: 0 };
    if (valid.length === 0) return { active, totals };

    const elCounts = {};
    const roleCounts = {};
    const worldCounts = {};
    valid.forEach((c) => {
      elCounts[c.el] = (elCounts[c.el] || 0) + 1;
      roleCounts[c.role] = (roleCounts[c.role] || 0) + 1;
      worldCounts[c.world] = (worldCounts[c.world] || 0) + 1;
    });

    /* ① 属性軸 */
    const distinctEls = Object.keys(elCounts).length;
    const maxElEntry = Object.entries(elCounts).sort((a, b) => b[1] - a[1])[0];
    const elNameMap = { fire: '炎', water: '水', wind: '風', light: '光', dark: '闇', none: '無' };
    if (maxElEntry && maxElEntry[1] >= 4) {
      active.push({ axis: '属性', name: `${elNameMap[maxElEntry[0]]}極単色(4)`, desc: '攻撃+22% / 会心+10%' });
      totals.atkPct += 0.22; totals.crit += 0.10;
    } else if (maxElEntry && maxElEntry[1] === 3) {
      active.push({ axis: '属性', name: `${elNameMap[maxElEntry[0]]}共鳴(3)`, desc: '攻撃+15% / HP+8%' });
      totals.atkPct += 0.15; totals.hpPct += 0.08;
    } else if (maxElEntry && maxElEntry[1] === 2) {
      active.push({ axis: '属性', name: `${elNameMap[maxElEntry[0]]}双鳴(2)`, desc: '攻撃+10%' });
      totals.atkPct += 0.10;
    }
    if (distinctEls >= 4) {
      active.push({ axis: '属性', name: '四彩調和', desc: '全能力+10% / 速度+6' });
      totals.atkPct += 0.10; totals.hpPct += 0.10; totals.defPct += 0.10; totals.spd += 6;
    }
    if (elCounts.light >= 1 && elCounts.dark >= 1) {
      active.push({ axis: '属性', name: '光闇交差', desc: '与ダメージ+10%' });
      totals.dmgPct += 0.10;
    }

    /* ② ロール軸 */
    const distinctRoles = Object.keys(roleCounts).length;
    if (distinctRoles === 4) {
      active.push({ axis: 'ロール', name: '均衡四極', desc: 'HP+12% / 攻撃+12% / 回復+12%' });
      totals.hpPct += 0.12; totals.atkPct += 0.12; totals.healPct += 0.12;
    } else {
      if ((roleCounts.dealer || 0) >= 2) {
        active.push({ axis: 'ロール', name: '猛攻陣', desc: '与ダメージ+14%' });
        totals.dmgPct += 0.14;
      }
      if ((roleCounts.tank || 0) >= 1 && (roleCounts.healer || 0) >= 1) {
        active.push({ axis: 'ロール', name: '鉄壁守護', desc: '防御+16% / 被ダメ-8%' });
        totals.defPct += 0.16; totals.dmgCut += 0.08;
      }
      if ((roleCounts.support || 0) >= 2) {
        active.push({ axis: 'ロール', name: '戦術指揮', desc: '速度+10 / 会心+8%' });
        totals.spd += 10; totals.crit += 0.08;
      }
    }

    /* ③ 出身異界軸 */
    const worldNames = { w1: '蒼穹', w2: '紅蓮', w3: '桜京', w4: '深海', w5: '星刻', w6: '星間' };
    Object.entries(worldCounts).forEach(([wId, cnt]) => {
      if (cnt >= 3) {
        active.push({ axis: '異界', name: `${worldNames[wId]}の絆(${cnt})`, desc: 'HP+12% / 攻撃+12% / 速度+6' });
        totals.hpPct += 0.12; totals.atkPct += 0.12; totals.spd += 6;
      } else if (cnt === 2) {
        active.push({ axis: '異界', name: `${worldNames[wId]}の縁(2)`, desc: 'HP+8% / 攻撃+8%' });
        totals.hpPct += 0.08; totals.atkPct += 0.08;
      }
    });

    return { active, totals };
  }

  Object.defineProperty(window, '__IZ_EQUIP__', {
    value: Object.freeze({
      QUALITIES,
      SLOTS,
      EQUIP_SERIES,
      SERIES_MAP,
      FREE_ABILITIES,
      ABILITY_MAP,
      computePartySynergies
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
