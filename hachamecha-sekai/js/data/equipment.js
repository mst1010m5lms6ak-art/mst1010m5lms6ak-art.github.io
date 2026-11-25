(function () {
  'use strict';

  const HS = window.HS;

  // 14 Sets (6 Normal Area + 2 Special/Intruder/Constraint + 6 Raid-Exclusive) x 4 Slots = 56 Items
  const EQUIP_SETS = [
    {
      id: 'ruin_guard',
      name: '境界鉄衛',
      sourceLabel: '境界の廃都市',
      raidOnly: false,
      bonus2: { desc: '最大HP+14%、防御力+10%', effect: { hpPct: 0.14, defPct: 0.10 } },
      bonus4: { desc: 'WAVE開始時HP16%障壁、被ダメージ-8%', effect: { waveShieldPct: 0.16, dmgTakenMult: -0.08 } }
    },
    {
      id: 'forge_flame',
      name: '紅蓮機甲',
      sourceLabel: '紅蓮機甲溶炉',
      raidOnly: false,
      bonus2: { desc: '攻撃力+15%', effect: { atkPct: 0.15 } },
      bonus4: { desc: '攻撃時30%で火傷付与、炎属性ダメージ+20%', effect: { onHitBurn: 0.30, elDmgFire: 0.20 } }
    },
    {
      id: 'crystal_tide',
      name: '蒼穹水晶',
      sourceLabel: '蒼穹の水晶海',
      raidOnly: false,
      bonus2: { desc: '与回復量+18%、状態異常耐性+15%', effect: { healOutPct: 0.18, resistPct: 0.15 } },
      bonus4: { desc: '行動終了時HP6%回復、水属性ダメージ+20%', effect: { turnRegenPct: 0.06, elDmgWater: 0.20 } }
    },
    {
      id: 'gale_fang',
      name: '翠嵐獣牙',
      sourceLabel: '翠嵐の獣王峡',
      raidOnly: false,
      bonus2: { desc: '行動速度+12%、会心率+8%', effect: { spdPct: 0.12, critRate: 0.08 } },
      bonus4: { desc: '攻撃後25%で追撃発生、風属性ダメージ+20%', effect: { extraHitChance: 0.25, extraHitMult: 0.55, elDmgWind: 0.20 } }
    },
    {
      id: 'astral_halo',
      name: '星界光輪',
      sourceLabel: '閃光の天界回廊',
      raidOnly: false,
      bonus2: { desc: '会心率+14%、会心ダメージ+20%', effect: { critRate: 0.14, critDmg: 0.20 } },
      bonus4: { desc: '会心発生時行動ゲージ+15%、光属性ダメージ+20%', effect: { critAtbGain: 0.15, elDmgLight: 0.20 } }
    },
    {
      id: 'abyss_eclipse',
      name: '深淵蝕刻',
      sourceLabel: '終焉の混沌深淵',
      raidOnly: false,
      bonus2: { desc: '攻撃力+12%、防御貫通+12%', effect: { atkPct: 0.12, defPen: 0.12 } },
      bonus4: { desc: '異常中の敵へ与ダメ+26%、闇属性ダメージ+20%', effect: { debuffBonusDmg: 0.26, elDmgDark: 0.20 } }
    },
    {
      id: 'wander_chaos',
      name: '異界乱入者',
      sourceLabel: '乱入敵・制約異界',
      raidOnly: false,
      bonus2: { desc: '行動速度+10%、攻撃力+10%', effect: { spdPct: 0.10, atkPct: 0.10 } },
      bonus4: { desc: '開始ゲージ+25%、技3ダメージ+25%', effect: { startAtbPct: 0.25, s3DmgPct: 0.25 } }
    },
    {
      id: 'oath_restraint',
      name: '制約誓約',
      sourceLabel: '制約異界・異界塔',
      raidOnly: false,
      bonus2: { desc: '最大HP+12%、与回復量+12%、防御力+12%', effect: { hpPct: 0.12, healOutPct: 0.12, defPct: 0.12 } },
      bonus4: { desc: '味方全体攻撃+8%、味方全体防御+8%、耐性+20%', effect: { partyAtkPct: 0.08, partyDefPct: 0.08, resistPct: 0.20 } }
    },
    // 6 Raid-Exclusive Sets
    {
      id: 'raid_inferno',
      name: '業火覇竜',
      sourceLabel: '炎レイド限定',
      raidOnly: true,
      bonus2: { desc: '攻撃力+20%、会心ダメージ+24%', effect: { atkPct: 0.20, critDmg: 0.24 } },
      bonus4: { desc: '火傷付与+45%、敵防御20%無視、炎与ダメ+30%', effect: { onHitBurn: 0.45, defPen: 0.20, elDmgFire: 0.30 } }
    },
    {
      id: 'raid_leviathan',
      name: '深海覇皇',
      sourceLabel: '水レイド限定',
      raidOnly: true,
      bonus2: { desc: '最大HP+22%、与回復量+24%', effect: { hpPct: 0.22, healOutPct: 0.24 } },
      bonus4: { desc: '過剰回復70%障壁化、毎行動全体HP5%回復、水与ダメ+30%', effect: { overhealShieldPct: 0.70, turnPartyHealPct: 0.05, elDmgWater: 0.30 } }
    },
    {
      id: 'raid_tempest',
      name: '神風天翔',
      sourceLabel: '風レイド限定',
      raidOnly: true,
      bonus2: { desc: '行動速度+18%、会心率+14%', effect: { spdPct: 0.18, critRate: 0.14 } },
      bonus4: { desc: '追撃率+35%、味方全体速度+8%、風与ダメ+30%', effect: { extraHitChance: 0.35, extraHitMult: 0.65, partySpdPct: 0.08, elDmgWind: 0.30 } }
    },
    {
      id: 'raid_seraph',
      name: '天穹審判',
      sourceLabel: '光レイド限定',
      raidOnly: true,
      bonus2: { desc: '防御力+20%、味方全体攻撃+10%', effect: { defPct: 0.20, partyAtkPct: 0.10 } },
      bonus4: { desc: 'WAVE開始味方障壁14%、被ダメ-12%、光与ダメ+30%', effect: { allyWaveShieldPct: 0.14, dmgTakenMult: -0.12, elDmgLight: 0.30 } }
    },
    {
      id: 'raid_nihil',
      name: '永劫虚無',
      sourceLabel: '闇レイド限定',
      raidOnly: true,
      bonus2: { desc: '攻撃力+18%、デバフ命中+25%', effect: { atkPct: 0.18, effHitPct: 0.25 } },
      bonus4: { desc: '吸血12%、敵デバフ毎与ダメ+10%、闇与ダメ+30%', effect: { lifestealPct: 0.12, perDebuffDmg: 0.10, elDmgDark: 0.30 } }
    },
    {
      id: 'raid_origin',
      name: '無垢原初',
      sourceLabel: '無レイド限定',
      raidOnly: true,
      bonus2: { desc: '全基礎能力(HP/攻/防/速)+12%', effect: { hpPct: 0.12, atkPct: 0.12, defPct: 0.12, spdPct: 0.12 } },
      bonus4: { desc: '会心率+18%、会心ダメ+35%、無与ダメ+35%', effect: { critRate: 0.18, critDmg: 0.35, elDmgNone: 0.35 } }
    }
  ];

  const EQUIP_ITEMS = [
    // 1. ruin_guard
    { id: 'eq_rg_w', setId: 'ruin_guard', slot: 'weapon',    name: '境界鋼の戦槍',     kana: 'きょうかいこうのせんそう', baseStats: { atk: 58, hp: 160 }, lore: '廃都市の防壁鉄材を鍛え直した長槍。受け流しと突きを両立する堅実な造り。' },
    { id: 'eq_rg_a', setId: 'ruin_guard', slot: 'armor',     name: '廃都守衛の重鎧',   kana: 'はいとしゅえいのじゅうがい', baseStats: { def: 52, hp: 260 }, lore: '異界干渉の衝撃を幾度も受け止めてきた複合装甲。傷跡が誇りの証。' },
    { id: 'eq_rg_x', setId: 'ruin_guard', slot: 'accessory', name: '防壁紋の銀徽章',   kana: 'ぼうへきもんのぎんきしょう', baseStats: { def: 28, hp: 180, spd: 4 }, lore: '境界警備隊が授けた銀の徽章。携える者の歩調を揺るぎないものにする。' },
    { id: 'eq_rg_c', setId: 'ruin_guard', slot: 'core',      name: '鉄衛の安定核',     kana: 'てつえいのあんていかく', baseStats: { hp: 300, def: 34 }, lore: '静かな青光を放つ動力核。装着者の周囲に微細な衝撃吸収膜を張る。' },

    // 2. forge_flame
    { id: 'eq_ff_w', setId: 'forge_flame', slot: 'weapon',    name: '溶炉熱刃ブレイズ', kana: 'ようろねつじんぶれいず', baseStats: { atk: 92, critRate: 0.05 }, lore: '高熱炉のプラズマを刃先に纏わせた機甲剣。装甲ごと焼き切る圧巻の火力。' },
    { id: 'eq_ff_a', setId: 'forge_flame', slot: 'armor',     name: '紅蓮耐熱フレーム', kana: 'ぐれんたいねつふれーむ', baseStats: { def: 56, atk: 24, hp: 220 }, lore: '排熱フィンを備えた赤熱外装。受けた熱量をそのまま推進力へ変換する。' },
    { id: 'eq_ff_x', setId: 'forge_flame', slot: 'accessory', name: '過給点火リング',   kana: 'かきゅうてんかりんぐ', baseStats: { atk: 44, spd: 7, critDmg: 0.08 }, lore: '魔導回路と内燃機構を融合した指輪。一撃ごとに火花が弾ける。' },
    { id: 'eq_ff_c', setId: 'forge_flame', slot: 'core',      name: '竜炉の灼熱核',     kana: 'りゅうろのしゃくねつかく', baseStats: { atk: 62, hp: 240 }, lore: '竜の吐息を封じ込めた炉心ユニット。脈打つ鼓動が戦意を煽り立てる。' },

    // 3. crystal_tide
    { id: 'eq_ct_w', setId: 'crystal_tide', slot: 'weapon',    name: '蒼水晶の霊杖',     kana: 'あおずいしょうのれいじょう', baseStats: { atk: 78, hp: 220, spd: 6 }, lore: '深海の清流を閉じ込めた結晶杖。魔力の循環を澄み渡らせる。' },
    { id: 'eq_ct_a', setId: 'crystal_tide', slot: 'armor',     name: '潮騒の妖精衣',     kana: 'しおさいのようせいい', baseStats: { def: 62, hp: 320 }, lore: '水膜を織り込んだ軽やかな法衣。状態異常の瘴気をさらりと弾き返す。' },
    { id: 'eq_ct_x', setId: 'crystal_tide', slot: 'accessory', name: '水鏡の雫耳飾',     kana: 'みずかがみのしずくみみかざり', baseStats: { hp: 260, def: 32, spd: 8 }, lore: '波紋のように穏やかな癒しを広げる装身具。持ち主の心を凪へ導く。' },
    { id: 'eq_ct_c', setId: 'crystal_tide', slot: 'core',      name: '海神殿の澄水核',   kana: 'かいしんでんのちょうすいかく', baseStats: { hp: 380, def: 38, atk: 28 }, lore: '永遠に濁ることのない蒼玉の核。傷ついた肉体を静かに満たす。' },

    // 4. gale_fang
    { id: 'eq_gf_w', setId: 'gale_fang', slot: 'weapon',    name: '翠嵐の双獣爪',     kana: 'すいらんのそうじゅうそう', baseStats: { atk: 108, spd: 12, critRate: 0.06 }, lore: '疾風を裂く獣王の牙を削り出した双爪。視認する前に二度斬り刻む。' },
    { id: 'eq_gf_a', setId: 'gale_fang', slot: 'armor',     name: '風翔の軽装毛皮',   kana: 'ふうしょうのけいそうけがわ', baseStats: { def: 66, spd: 11, hp: 260 }, lore: '空気抵抗を極限まで削いだ獣族の戦衣。宙を蹴るような軽快さを与える。' },
    { id: 'eq_gf_x', setId: 'gale_fang', slot: 'accessory', name: '旋風羽の足輪',     kana: 'せんぷうばねのあしわ', baseStats: { spd: 16, critRate: 0.06, atk: 34 }, lore: '古遺跡の風精が編み上げた足輪。踏み出しの一歩が瞬時に加速する。' },
    { id: 'eq_gf_c', setId: 'gale_fang', slot: 'core',      name: '嵐獣の疾駆核',     kana: 'らんじゅうのしっくかく', baseStats: { atk: 68, spd: 14, hp: 250 }, lore: '渦巻く緑風が封じられた核。回転するたびに全身の反射神経を研ぎ澄ます。' },

    // 5. astral_halo
    { id: 'eq_ah_w', setId: 'astral_halo', slot: 'weapon',    name: '星輝裁きの光剣',   kana: 'せいきさばきのこうけん', baseStats: { atk: 126, critRate: 0.09, critDmg: 0.14 }, lore: '星間要塞の集光鏡から削り出された刃。急所を照らし正確に貫く。' },
    { id: 'eq_ah_a', setId: 'astral_halo', slot: 'armor',     name: '天界回廊の白鎧',   kana: 'てんかいかいろうのしろよろい', baseStats: { def: 82, hp: 360, critRate: 0.04 }, lore: '光を屈折させる純白の礼装鎧。神域の威厳と機動性を兼ね備える。' },
    { id: 'eq_ah_x', setId: 'astral_halo', slot: 'accessory', name: '恒星軌道の冠輪',   kana: 'こうせいきどうのかんりん', baseStats: { critRate: 0.08, critDmg: 0.16, spd: 10 }, lore: '星々の巡りを象った黄金輪。会心の一閃を次なる行動へ繋げる。' },
    { id: 'eq_ah_c', setId: 'astral_halo', slot: 'core',      name: '閃光星核プリズム', kana: 'せんこうせいかくぷりずむ', baseStats: { atk: 84, hp: 320, critDmg: 0.12 }, lore: '七色に屈折する多面体コア。純粋な星力を攻撃へ転換する。' },

    // 6. abyss_eclipse
    { id: 'eq_ae_w', setId: 'abyss_eclipse', slot: 'weapon',    name: '深淵蝕む魔大鎌',   kana: 'しんえんむしばむまおおかま', baseStats: { atk: 146, critDmg: 0.16, spd: 8 }, lore: '混沌深淵の闇を凝縮した大鎌。装甲の隙間から魂を直接刈り取る。' },
    { id: 'eq_ae_a', setId: 'abyss_eclipse', slot: 'armor',     name: '終焉黒殻マント',   kana: 'しゅうえんこくかくまんと', baseStats: { def: 94, hp: 410, atk: 32 }, lore: '魔界の黒曜鱗を縫い合わせた外套。闇の波動を纏い敵の防御を鈍らせる。' },
    { id: 'eq_ae_x', setId: 'abyss_eclipse', slot: 'accessory', name: '蝕月呪刻の首飾',   kana: 'しょくげつじゅこくのくびかざり', baseStats: { atk: 66, critRate: 0.07, spd: 10 }, lore: '蝕まれた月を封じた魔導具。弱った敵への追撃に鋭い毒気を宿す。' },
    { id: 'eq_ae_c', setId: 'abyss_eclipse', slot: 'core',      name: '混沌深淵の闇核',   kana: 'こんとんしんえんのやみかく', baseStats: { atk: 98, hp: 370, def: 36 }, lore: 'あらゆる世界の残滓が渦巻く漆黒の核。強大な力と引き換えに冷たく輝く。' },

    // 7. wander_chaos
    { id: 'eq_wc_w', setId: 'wander_chaos', slot: 'weapon',    name: '次元跳躍の奇剣',   kana: 'じげんちょうやくのきけん', baseStats: { atk: 122, spd: 13, critRate: 0.06 }, lore: '複数の世界線が重なり合う刃。抜刀と同時に空間を歪めて先手を取る。' },
    { id: 'eq_wc_a', setId: 'wander_chaos', slot: 'armor',     name: '異界渡りの外套',   kana: 'いかいわたりのがいとう', baseStats: { def: 78, hp: 340, spd: 10 }, lore: '乱入者たちが纏う虹色の裏地を持つ外套。常識外の軌道で攻撃を逸らす。' },
    { id: 'eq_wc_x', setId: 'wander_chaos', slot: 'accessory', name: '時空羅針の懐中',   kana: 'じくうらしんのかいちゅう', baseStats: { spd: 15, atk: 54, critDmg: 0.10 }, lore: '針が逆回転する不思議な懐中時計。大技の詠唱を一瞬で引き寄せる。' },
    { id: 'eq_wc_c', setId: 'wander_chaos', slot: 'core',      name: '狭間乱流の星核',   kana: 'はざまらんりゅうのせいかく', baseStats: { atk: 86, spd: 12, hp: 310 }, lore: '世界の裂け目から採取された不安定核。予測不能な爆発力を秘める。' },

    // 8. oath_restraint
    { id: 'eq_or_w', setId: 'oath_restraint', slot: 'weapon',    name: '誓約の白銀錫杖',   kana: 'せいやくのはくぎんしゃくじょう', baseStats: { atk: 112, def: 46, hp: 320 }, lore: '厳しい試練を乗り越えた者へ贈られる錫杖。仲間全体を鼓舞する響きを放つ。' },
    { id: 'eq_or_a', setId: 'oath_restraint', slot: 'armor',     name: '試練踏破の聖甲',   kana: 'しれんとうはのせいこう', baseStats: { def: 102, hp: 460 }, lore: '制約の鎖を断ち切った証として鍛えられた甲冑。揺るがぬ守護の象徴。' },
    { id: 'eq_or_x', setId: 'oath_restraint', slot: 'accessory', name: '均衡天秤の腕輪',   kana: 'きんこうてんびんのうでわ', baseStats: { hp: 310, def: 48, spd: 10 }, lore: '攻守の均衡を保つ古代の腕輪。いかなる制約下でも実力を引き出す。' },
    { id: 'eq_or_c', setId: 'oath_restraint', slot: 'core',      name: '塔頂の秩序結晶',   kana: 'とうちょうのちつじょけっしょう', baseStats: { hp: 440, def: 52, atk: 52 }, lore: '異界塔の頂付近でのみ結晶化する秩序核。パーティの結束を強固にする。' },

    // 9. raid_inferno (Fire Raid Exclusive)
    { id: 'eq_ri_w', setId: 'raid_inferno', slot: 'weapon',    name: '覇竜業火の大剣',   kana: 'はりゅうごうかのたいけん', baseStats: { atk: 186, critRate: 0.08, critDmg: 0.22 }, lore: '炎のレイド覇竜の脊髄から鍛えた紅蓮大剣。一振りで大地ごと焦土と化す。' },
    { id: 'eq_ri_a', setId: 'raid_inferno', slot: 'armor',     name: '業火竜鱗の覇鎧',   kana: 'ごうかりゅうりんのはがい', baseStats: { def: 110, hp: 470, atk: 54 }, lore: '決して冷めぬ竜鱗を連ねた最高位の鎧。纏う熱気が敵の防御を溶かす。' },
    { id: 'eq_ri_x', setId: 'raid_inferno', slot: 'accessory', name: '紅蓮覇王の印環',   kana: 'ぐれんはおうのいんかん', baseStats: { atk: 88, critDmg: 0.20, spd: 10 }, lore: '業火を統べる者の印環。燃え盛る敵に対して容赦ない追撃を叩き込む。' },
    { id: 'eq_ri_c', setId: 'raid_inferno', slot: 'core',      name: '原初業火の竜心',   kana: 'げんしょごうかのりゅうしん', baseStats: { atk: 124, hp: 420, critRate: 0.06 }, lore: '炎界の心臓と呼ばれし覇竜の炉心。際限なき破壊衝動を純化する。' },

    // 10. raid_leviathan (Water Raid Exclusive)
    { id: 'eq_rl_w', setId: 'raid_leviathan', slot: 'weapon',    name: '深海覇皇の三叉戟', kana: 'しんかいはおうのさんさげき', baseStats: { atk: 152, hp: 460, def: 46 }, lore: '海淵の支配者が振るった蒼銀の戟。荒波のごとき癒しと奔流を操る。' },
    { id: 'eq_rl_a', setId: 'raid_leviathan', slot: 'armor',     name: '海淵蒼鱗の法鎧',   kana: 'かいえんそうりんのほうがい', baseStats: { def: 122, hp: 620 }, lore: '深海の水圧に耐え抜いた蒼鱗の外殻。溢れた生命力を強固な障壁へ変える。' },
    { id: 'eq_rl_x', setId: 'raid_leviathan', slot: 'accessory', name: '永海真珠の冠飾',   kana: 'えいかいしんじゅのかんしょく', baseStats: { hp: 450, def: 58, spd: 12 }, lore: '千年海溝で育まれた大真珠。戦場の仲間全員へ絶え間ない潤いを届ける。' },
    { id: 'eq_rl_c', setId: 'raid_leviathan', slot: 'core',      name: '蒼覇皇の海流核',   kana: 'そうはおうのかいりゅうかく', baseStats: { hp: 640, def: 62, atk: 58 }, lore: '大海そのものを圧縮した碧玉核。枯れることのない再生の源泉。' },

    // 11. raid_tempest (Wind Raid Exclusive)
    { id: 'eq_rt_w', setId: 'raid_tempest', slot: 'weapon',    name: '神風天翔の雙刃',   kana: 'かみかぜてんしょうのそうじん', baseStats: { atk: 168, spd: 20, critRate: 0.10 }, lore: '嵐の主の翼刃を鋳直した双剣。視界から消える速度で連撃を刻む。' },
    { id: 'eq_rt_a', setId: 'raid_tempest', slot: 'armor',     name: '蒼穹翼の疾風鎧',   kana: 'そうきゅうよくのしっぷうがい', baseStats: { def: 102, hp: 440, spd: 18 }, lore: '風神の羽根を織り込んだ超軽量装甲。味方全体の歩調すら加速させる。' },
    { id: 'eq_rt_x', setId: 'raid_tempest', slot: 'accessory', name: '天翔風輪の首環',   kana: 'てんしょうふうりんのくびわ', baseStats: { spd: 22, critRate: 0.10, atk: 68 }, lore: '真空の刃を纏う風輪。一撃の余波がさらなる追撃を呼び起こす。' },
    { id: 'eq_rt_c', setId: 'raid_tempest', slot: 'core',      name: '暴風主の蒼嵐核',   kana: 'ぼうふうしゅのそうらんかく', baseStats: { atk: 106, spd: 20, hp: 380 }, lore: '永劫の竜巻が封じられた結晶核。戦場の主導権を完全に掌握する。' },

    // 12. raid_seraph (Light Raid Exclusive)
    { id: 'eq_rs_w', setId: 'raid_seraph', slot: 'weapon',    name: '天穹審判の聖槍',   kana: 'てんきゅうしんぱんのせいそう', baseStats: { atk: 166, def: 64, hp: 420 }, lore: '熾天使機の主砲槍を転用した聖槍。貫く光が味方の盾となる。' },
    { id: 'eq_rs_a', setId: 'raid_seraph', slot: 'armor',     name: '熾天光翼の聖甲',   kana: 'してんこうよくのせいこう', baseStats: { def: 132, hp: 580 }, lore: '六枚の光翼を展開する最高級神装。あらゆる災厄から隊列を守護する。' },
    { id: 'eq_rs_x', setId: 'raid_seraph', slot: 'accessory', name: '聖域光輪の宝珠',   kana: 'せいいきこうりんのほうじゅ', baseStats: { def: 66, hp: 420, atk: 54, spd: 12 }, lore: '天穹の祝福を宿す黄金宝珠。戦場へ踏み出した瞬間から聖壁が降りる。' },
    { id: 'eq_rs_c', setId: 'raid_seraph', slot: 'core',      name: '審判天使の光核',   kana: 'しんぱんてんしのこうかく', baseStats: { hp: 560, def: 74, atk: 72 }, lore: '純白の恒星炉を模した神核。絶望的な戦況をも覆す希望の灯火。' },

    // 13. raid_nihil (Dark Raid Exclusive)
    { id: 'eq_rn_w', setId: 'raid_nihil', slot: 'weapon',    name: '永劫虚無の絶剣',   kana: 'えいごうきょむのぜっけん', baseStats: { atk: 184, critRate: 0.08, spd: 14 }, lore: '虚無の魔王が携えた漆黒の魔剣。切り裂いた傷口から命を吸い上げる。' },
    { id: 'eq_rn_a', setId: 'raid_nihil', slot: 'armor',     name: '虚無纏う冥王衣',   kana: 'きょむまとうめいおうい', baseStats: { def: 108, hp: 480, atk: 62 }, lore: '光すら呑み込む冥界織の戦衣。敵が弱るほど攻撃の鋭さが増す。' },
    { id: 'eq_rn_x', setId: 'raid_nihil', slot: 'accessory', name: '深闇呪縛の魔眼',   kana: 'しんあんじゅばくのまがん', baseStats: { atk: 86, spd: 14, critDmg: 0.16 }, lore: '虚無の深淵を見つめ続ける魔眼宝飾。抵抗を許さぬ呪いを刻み込む。' },
    { id: 'eq_rn_c', setId: 'raid_nihil', slot: 'core',      name: '冥王虚無の黒核',   kana: 'めいおうきょむのこくかく', baseStats: { atk: 120, hp: 430, def: 48 }, lore: '崩壊の果てに残された黒色特異点。尽きぬ魔力を吸血の刃へと変える。' },

    // 14. raid_origin (None Raid Exclusive)
    { id: 'eq_ro_w', setId: 'raid_origin', slot: 'weapon',    name: '無垢原初の創刃',   kana: 'むくげんしょのそうじん', baseStats: { atk: 176, def: 44, spd: 14, critRate: 0.10 }, lore: '属性分化する以前の純粋物質から削り出された創世刃。万象を等しく断つ。' },
    { id: 'eq_ro_a', setId: 'raid_origin', slot: 'armor',     name: '原初零式の万能鎧', kana: 'げんしょぜろしきのばんのうがい', baseStats: { def: 120, hp: 540, spd: 12, atk: 44 }, lore: '異界のあらゆる物理法則に適応する白銀外装。弱点という概念を持たない。' },
    { id: 'eq_ro_x', setId: 'raid_origin', slot: 'accessory', name: '創世幾何の極環',   kana: 'そうせいきかのきょくかん', baseStats: { atk: 74, def: 44, spd: 14, critDmg: 0.22 }, lore: '完全な対称性を描く幾何学指輪。持ち主の全能力を一段階引き上げる。' },
    { id: 'eq_ro_c', setId: 'raid_origin', slot: 'core',      name: '零点原初の純核',   kana: 'れいてんげんしょのじゅんかく', baseStats: { hp: 520, atk: 102, def: 58, spd: 14 }, lore: '世界が生まれた最初の閃光を宿す無色の核。すべての力の原点。' }
  ];

  const EQUIP_SET_MAP = Object.fromEntries(EQUIP_SETS.map((s) => [s.id, s]));
  const EQUIP_ITEM_MAP = Object.fromEntries(EQUIP_ITEMS.map((item) => [item.id, item]));

  function getQualityMultiplier(quality) {
    const q = Math.max(1, Math.min(100, Math.round(Number(quality) || 1)));
    return 1 + ((q - 1) / 99) * 0.55;
  }

  function calcItemStats(itemId, quality) {
    const def = EQUIP_ITEM_MAP[itemId];
    if (!def) return {};
    const mult = getQualityMultiplier(quality);
    const out = {};
    for (const [k, v] of Object.entries(def.baseStats)) {
      if (k === 'critRate' || k === 'critDmg') {
        out[k] = Math.round(v * mult * 1000) / 1000;
      } else {
        out[k] = Math.round(v * mult);
      }
    }
    return out;
  }

  function getSellValue(itemId, quality) {
    const def = EQUIP_ITEM_MAP[itemId];
    if (!def) return 20;
    const set = EQUIP_SET_MAP[def.setId];
    const base = set && set.raidOnly ? 260 : 65;
    return Math.round(base * (0.65 + (quality / 100) * 1.15));
  }

  HS.Data.EQUIP_SETS = EQUIP_SETS;
  HS.Data.EQUIP_ITEMS = EQUIP_ITEMS;
  HS.Data.EQUIP_SET_MAP = EQUIP_SET_MAP;
  HS.Data.EQUIP_ITEM_MAP = EQUIP_ITEM_MAP;
  HS.Data.getQualityMultiplier = getQualityMultiplier;
  HS.Data.calcItemStats = calcItemStats;
  HS.Data.getSellValue = getSellValue;
})();
