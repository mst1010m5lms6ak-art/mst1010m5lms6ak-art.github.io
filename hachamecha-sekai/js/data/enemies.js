(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  var D = HS.Data = HS.Data || {};

  function sk(id, name, target, cd, power, desc, effects, extra) {
    var obj = {
      id: id,
      type: 'active',
      name: name,
      target: target,
      cd: cd,
      power: power,
      hits: (extra && extra.hits) || 1,
      desc: desc,
      effects: effects || []
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) { obj[k] = extra[k]; });
    }
    return obj;
  }

  // ==================== 通常敵 24体 (4エリア × 6体) ====================
  var NORMAL_ENEMIES = [
    // Area 1: 境界平原 × 機巧前線
    {
      id: 'en_gear_slime', kind: 'normal', name: '歯車スライム', kana: 'はぐるますらいむ',
      element: 'none', races: ['demon', 'mech'], role: 'tank', world: 'frontier',
      baseStats: { hp: 460, atk: 74, def: 58, spd: 86, crit: 0.05, critDmg: 1.45, res: 0.05 },
      skills: [
        sk('ek_gs_1', 'ねばり体当たり', 'single', 0, 0.95, '歯車ごと飛びついて敵単体を叩く。', []),
        sk('ek_gs_2', 'ギアシールド', 'self', 3, 0, '体内の歯車を噛み合わせて防護壁を張る。', [{ type: 'shield', hpPct: 0.20, turns: 2, target: 'self' }])
      ],
      lore: '機巧都市の廃油と草原のスライムがうっかり合体した珍生物。転がるたびカチコチと律儀に時を刻む。'
    },
    {
      id: 'en_steam_gob', kind: 'normal', name: '蒸気ゴブリン', kana: 'じょうきごぶりん',
      element: 'fire', races: ['demon'], role: 'dealer', world: 'mechcity',
      baseStats: { hp: 400, atk: 90, def: 44, spd: 98, crit: 0.08, critDmg: 1.45, res: 0.04 },
      skills: [
        sk('ek_sg_1', 'スパナ投げ', 'single', 0, 1.00, '熱々のレンチを投げつけて攻撃する。', []),
        sk('ek_sg_2', '蒸気ボム', 'area', 3, 1.15, '蒸気の詰まった缶を投げ範囲を焦がす。', [{ type: 'status', status: 'burn', chance: 0.40, turns: 2, target: 'target' }])
      ],
      lore: '背中のボイラーを自慢げに背負う小鬼。圧力を上げすぎて自分で吹き飛ぶことも珍しくない。'
    },
    {
      id: 'en_wild_wolf', kind: 'normal', name: '境界野狼', kana: 'きょうかいやろう',
      element: 'wind', races: ['beast'], role: 'dealer', world: 'frontier',
      baseStats: { hp: 420, atk: 92, def: 46, spd: 108, crit: 0.12, critDmg: 1.50, res: 0.05 },
      skills: [
        sk('ek_ww_1', '疾風噛みつき', 'single', 0, 1.02, '素早い踏み込みから鋭い牙で噛みつく。', []),
        sk('ek_ww_2', '群れの遠吠え', 'ally_all', 3, 0, '仲間の闘志を煽り攻撃上昇を付与する。', [{ type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' }])
      ],
      lore: '境界平原の風に乗って群れで駆ける俊敏な野狼。旅人の弁当を狙う嗅覚だけは一流。'
    },
    {
      id: 'en_clock_owl', kind: 'normal', name: '時計フクロウ', kana: 'とけいふくろう',
      element: 'light', races: ['beast', 'mech'], role: 'supporter', world: 'mechcity',
      baseStats: { hp: 410, atk: 80, def: 52, spd: 112, crit: 0.08, critDmg: 1.45, res: 0.10 },
      skills: [
        sk('ek_co_1', '時針の爪', 'single', 0, 0.95, '振り子のような軌道で急降下攻撃。', []),
        sk('ek_co_2', 'チクタク加速波', 'ally_all', 3, 0, '味方全体の行動ゲージを18%進める。', [{ type: 'gauge', amount: 0.18, target: 'ally_all' }])
      ],
      lore: '目が文字盤になっているからくりフクロウ。毎正時になると大音量で鳴いて戦場を驚かせる。'
    },
    {
      id: 'en_scrap_dog', kind: 'normal', name: '鉄屑ハウンド', kana: 'てつくずはうんど',
      element: 'none', races: ['mech'], role: 'dealer', world: 'mechcity',
      baseStats: { hp: 470, atk: 88, def: 62, spd: 96, crit: 0.08, critDmg: 1.45, res: 0.08 },
      skills: [
        sk('ek_sd_1', '鋼顎バイト', 'single', 0, 1.00, '鉄の顎で噛みつき防御低下を狙う。', [{ type: 'status', status: 'def_down', chance: 0.35, turns: 2, target: 'target' }]),
        sk('ek_sd_2', 'スクラップ突進', 'area', 3, 1.18, '部品を撒き散らしながら突撃する。', [])
      ],
      lore: '廃材置き場の金属が勝手に集まって犬の形になった機巧獣。光るネジを投げると喜んで追いかける。'
    },
    {
      id: 'en_volt_bat', kind: 'normal', name: '放電コウモリ', kana: 'ほうでんこうもり',
      element: 'light', races: ['beast'], role: 'supporter', world: 'frontier',
      baseStats: { hp: 390, atk: 84, def: 46, spd: 115, crit: 0.10, critDmg: 1.45, res: 0.08 },
      skills: [
        sk('ek_vb_1', 'ビリビリ羽ばたき', 'single', 0, 0.94, '静電気を浴びせて攻撃する。', []),
        sk('ek_vb_2', 'しびれ超音波', 'area', 3, 1.05, '痺れる音波で敵範囲の速度を落とす。', [{ type: 'status', status: 'spd_down', chance: 0.55, turns: 2, target: 'target' }])
      ],
      lore: '送電線にぶら下がって充電している器用なコウモリ。暗闇ではほのかに青白く光る。'
    },

    // Area 2: 紅蓮竜峰 × 星霧妖精郷
    {
      id: 'en_flame_kobold', kind: 'normal', name: '紅蓮コボルト', kana: 'ぐれんこぼると',
      element: 'fire', races: ['beast'], role: 'dealer', world: 'dragonpeak',
      baseStats: { hp: 560, atk: 116, def: 58, spd: 104, crit: 0.12, critDmg: 1.50, res: 0.08 },
      skills: [
        sk('ek_fk_1', '火打ち斧斬り', 'single', 0, 1.02, '火花を散らす斧で力強く叩き斬る。', [{ type: 'status', status: 'burn', chance: 0.35, turns: 2, target: 'target' }]),
        sk('ek_fk_2', '炎の雄叫び', 'self', 3, 0, '自身に攻撃上昇と会心上昇を付与する。', [
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' }
        ])
      ],
      lore: '竜峰の麓で溶岩石を掘る働き者の犬人。竜の落とし物を拾うと大喜びで武器に飾りつける。'
    },
    {
      id: 'en_magma_drake', kind: 'normal', name: '溶岩幼竜', kana: 'ようがんようりゅう',
      element: 'fire', races: ['dragon'], role: 'tank', world: 'dragonpeak',
      baseStats: { hp: 660, atk: 112, def: 76, spd: 94, crit: 0.08, critDmg: 1.50, res: 0.12 },
      skills: [
        sk('ek_md_1', '熱鱗タックル', 'single', 0, 1.00, '熱い鱗で突進する。', []),
        sk('ek_md_2', 'マグマ吐息', 'area', 3, 1.25, '溶岩の息を吐き範囲に火傷を与える。', [{ type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' }])
      ],
      lore: 'まだ飛ぶのが下手な紅蓮竜の子ども。くしゃみをするたびに小さな火の玉が飛び出す。'
    },
    {
      id: 'en_star_pixie', kind: 'normal', name: '星霧ピクシー', kana: 'ほしぎりぴくしー',
      element: 'wind', races: ['fairy'], role: 'supporter', world: 'fairyvale',
      baseStats: { hp: 510, atk: 106, def: 56, spd: 120, crit: 0.10, critDmg: 1.48, res: 0.16 },
      skills: [
        sk('ek_sp_1', 'いたずら星粉', 'single', 0, 0.96, 'キラキラ光る粉を吹きかける。', [{ type: 'status', status: 'atk_down', chance: 0.45, turns: 2, target: 'target' }]),
        sk('ek_sp_2', '妖精の早送り', 'ally_all', 3, 0, '味方全体に速度上昇を付与する。', [{ type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' }])
      ],
      lore: '旅人の靴ひもをこっそり結ぶのが趣味の小妖精。お菓子を分けると道案内してくれる。'
    },
    {
      id: 'en_dew_sprite', kind: 'normal', name: '露玉精霊', kana: 'つゆだませいれい',
      element: 'water', races: ['fairy'], role: 'healer', world: 'fairyvale',
      baseStats: { hp: 550, atk: 100, def: 64, spd: 108, crit: 0.06, critDmg: 1.45, res: 0.18 },
      skills: [
        sk('ek_ds_1', 'しずく弾き', 'single', 0, 0.92, '澄んだ水滴を弾き飛ばす。', []),
        sk('ek_ds_2', '朝露の恵み', 'ally_all', 3, 0, '仲間の傷を癒やし継続再生を付与する。', [
          { type: 'heal', mult: 1.15, hpPct: 0.12, target: 'ally_all' },
          { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' }
        ])
      ],
      lore: '大きな葉の上でぷるぷる跳ねる水の精霊。戦場でも仲間のケガを見つけると放っておけない。'
    },
    {
      id: 'en_cinder_wyrm', kind: 'normal', name: '火の粉ワーム', kana: 'ひのこわーむ',
      element: 'fire', races: ['dragon'], role: 'dealer', world: 'dragonpeak',
      baseStats: { hp: 600, atk: 122, def: 60, spd: 102, crit: 0.12, critDmg: 1.50, res: 0.10 },
      skills: [
        sk('ek_cw_1', '灼熱かみつき', 'single', 0, 1.05, '熱い牙で噛みつく。', []),
        sk('ek_cw_2', '火の粉ストーム', 'all', 3, 1.15, '敵全体に火の粉を撒き散らし火傷を狙う。', [{ type: 'status', status: 'burn', chance: 0.50, turns: 2, target: 'target' }])
      ],
      lore: '火山灰の砂丘を泳ぐように進む細長い竜種。通った跡がしばらく温かく、キャンプ客に密かに人気。'
    },
    {
      id: 'en_petal_moth', kind: 'normal', name: '花弁モス', kana: 'かべんもす',
      element: 'wind', races: ['fairy', 'beast'], role: 'supporter', world: 'fairyvale',
      baseStats: { hp: 530, atk: 108, def: 58, spd: 116, crit: 0.10, critDmg: 1.48, res: 0.14 },
      skills: [
        sk('ek_pm_1', '花風羽ばたき', 'single', 0, 0.98, '甘い香りの風を叩きつける。', []),
        sk('ek_pm_2', '眠りの鱗粉', 'area', 3, 1.12, '不思議な鱗粉で範囲へ沈黙を狙う。', [{ type: 'status', status: 'silence', chance: 0.45, turns: 2, target: 'target' }])
      ],
      lore: '羽が美しい花びらそっくりの大型蛾。森の花畑に紛れると妖精ですら見分けがつかない。'
    },

    // Area 3: 深淵魔界 × 極彩獣域
    {
      id: 'en_shadow_imp', kind: 'normal', name: '深淵インプ', kana: 'しんえんいんぷ',
      element: 'dark', races: ['demon'], role: 'supporter', world: 'abyss',
      baseStats: { hp: 680, atk: 138, def: 68, spd: 122, crit: 0.12, critDmg: 1.52, res: 0.14 },
      skills: [
        sk('ek_si_1', '影のつつき', 'single', 0, 1.00, '影から槍で突いて防御低下を狙う。', [{ type: 'status', status: 'def_down', chance: 0.45, turns: 2, target: 'target' }]),
        sk('ek_si_2', '悪戯の呪霧', 'area', 3, 1.20, '敵範囲に猛毒と脆弱を付与する。', [
          { type: 'status', status: 'poison', chance: 0.55, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.50, turns: 2, target: 'target' }
        ])
      ],
      lore: '紅月の下でくすくす笑う魔界の使い魔。イタズラが成功すると羽をぱたぱたさせて大喜びする。'
    },
    {
      id: 'en_venom_spider', kind: 'normal', name: '毒牙グモ', kana: 'どくがぐも',
      element: 'dark', races: ['demon', 'beast'], role: 'dealer', world: 'abyss',
      baseStats: { hp: 700, atk: 146, def: 70, spd: 118, crit: 0.14, critDmg: 1.55, res: 0.12 },
      skills: [
        sk('ek_vs_1', '猛毒バイト', 'single', 0, 1.05, '紫の毒牙で噛みつき猛毒を付与する。', [{ type: 'status', status: 'poison', chance: 0.60, turns: 2, target: 'target' }]),
        sk('ek_vs_2', '呪糸ネット', 'area', 3, 1.25, '粘着糸で範囲を絡め取り速度低下を与える。', [{ type: 'status', status: 'spd_down', chance: 0.65, turns: 2, target: 'target' }])
      ],
      lore: 'ネオンのように光る巣を張る大蜘蛛。獲物がかからない夜は巣の模様を芸術的に編み直している。'
    },
    {
      id: 'en_prism_tiger', kind: 'normal', name: '極彩トラ', kana: 'ごくさいとら',
      element: 'wind', races: ['beast'], role: 'dealer', world: 'wilds',
      baseStats: { hp: 740, atk: 154, def: 74, spd: 126, crit: 0.18, critDmg: 1.60, res: 0.12 },
      skills: [
        sk('ek_pt_1', '極彩連爪', 'single', 0, 1.08, '鮮やかな軌道で二連続の爪撃を放つ。', [], { hits: 2 }),
        sk('ek_pt_2', '猛獣の跳躍', 'area', 3, 1.40, '大跳躍からの衝撃波で範囲を切り裂く。', [{ type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' }])
      ],
      lore: '虹色の縞模様を誇る極彩獣域の俊足ハンター。見た目は派手だが狩りの腕前は超一流。'
    },
    {
      id: 'en_abyss_knight', kind: 'normal', name: '闇甲冑兵', kana: 'やみかっちゅうへい',
      element: 'dark', races: ['demon'], role: 'tank', world: 'abyss',
      baseStats: { hp: 880, atk: 134, def: 96, spd: 96, crit: 0.10, critDmg: 1.50, res: 0.18 },
      skills: [
        sk('ek_ak_1', '黒鉄の斬撃', 'single', 0, 1.02, '重い黒剣を振り下ろす。', []),
        sk('ek_ak_2', '漆黒の陣構え', 'self', 3, 0, '自身に挑発と防御上昇・防護壁を付与する。', [
          { type: 'status', status: 'taunt', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' },
          { type: 'shield', hpPct: 0.20, turns: 2, target: 'self' }
        ])
      ],
      lore: '魔界の城門を守っていた動く漆黒甲冑。中身の魔魂は礼儀正しく、倒されると律儀にお辞儀して消える。'
    },
    {
      id: 'en_horn_rhino', kind: 'normal', name: '剛角サイ', kana: 'ごうかくさい',
      element: 'fire', races: ['beast'], role: 'tank', world: 'wilds',
      baseStats: { hp: 920, atk: 140, def: 94, spd: 92, crit: 0.10, critDmg: 1.50, res: 0.15 },
      skills: [
        sk('ek_hr_1', '剛角突き上げ', 'single', 0, 1.05, '巨角で跳ね上げ30%で気絶させる。', [{ type: 'status', status: 'stun', chance: 0.30, turns: 1, target: 'target' }]),
        sk('ek_hr_2', '大地粉砕突進', 'area', 3, 1.35, '地響きを立てて範囲を蹴散らす。', [{ type: 'status', status: 'def_down', chance: 0.55, turns: 2, target: 'target' }])
      ],
      lore: '岩より硬い角を持つ大草原の重戦車。まっすぐ走るのが大好きで、曲がり角では大抵ずっこける。'
    },
    {
      id: 'en_curse_wisp', kind: 'normal', name: '呪炎ウィスプ', kana: 'じゅえんうぃすぷ',
      element: 'dark', races: ['demon'], role: 'healer', world: 'abyss',
      baseStats: { hp: 660, atk: 132, def: 72, spd: 116, crit: 0.10, critDmg: 1.50, res: 0.20 },
      skills: [
        sk('ek_cw2_1', '呪炎の鬼火弾', 'single', 0, 0.98, '青い炎を飛ばし火傷を狙う。', [{ type: 'status', status: 'burn', chance: 0.50, turns: 2, target: 'target' }]),
        sk('ek_cw2_2', '闇の魂分け', 'ally_all', 3, 0, '仲間の魔物たちのHPを回復し攻撃上昇を与える。', [
          { type: 'heal', mult: 1.25, hpPct: 0.12, target: 'ally_all' },
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' }
        ])
      ],
      lore: '深淵の街灯代わりにも使われる陽気な鬼火。仲間がピンチになると火力を上げて応援する。'
    },

    // Area 4: 白銀神域 × はちゃめちゃ交差線
    {
      id: 'en_silver_golem', kind: 'normal', name: '白銀ゴーレム', kana: 'しろがねごーれむ',
      element: 'light', races: ['god', 'mech'], role: 'tank', world: 'sanctum',
      baseStats: { hp: 1080, atk: 158, def: 118, spd: 96, crit: 0.10, critDmg: 1.50, res: 0.22 },
      skills: [
        sk('ek_sg2_1', '白銀鉄槌', 'single', 0, 1.06, '白金の拳で力強く打ち下ろす。', []),
        sk('ek_sg2_2', '神域障壁起動', 'ally_all', 3, 0, '味方全体へ防護壁と防御上昇を展開する。', [
          { type: 'shield', hpPct: 0.18, turns: 2, target: 'ally_all' },
          { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'ally_all' }
        ])
      ],
      lore: '白銀神域の柱がそのまま歩き出した神造機兵。彫刻のように美しいが拳の重さは冗談にならない。'
    },
    {
      id: 'en_halo_bird', kind: 'normal', name: '光輪バード', kana: 'こうりんばーど',
      element: 'light', races: ['god', 'beast'], role: 'supporter', world: 'sanctum',
      baseStats: { hp: 840, atk: 152, def: 86, spd: 132, crit: 0.14, critDmg: 1.52, res: 0.20 },
      skills: [
        sk('ek_hb_1', '閃光ダイブ', 'single', 0, 1.02, '光の輪を残して急降下する。', []),
        sk('ek_hb_2', '天界ファンファーレ', 'ally_all', 3, 0, '仲間の速度上昇と行動ゲージ+20%を授ける。', [
          { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' },
          { type: 'gauge', amount: 0.20, target: 'ally_all' }
        ])
      ],
      lore: '頭上に小さな光輪を浮かべた神域の伝令鳥。鳴き声が美しいハープの和音のように響く。'
    },
    {
      id: 'en_chrono_doll', kind: 'normal', name: '時針ドール', kana: 'じしんどーる',
      element: 'none', races: ['mech'], role: 'supporter', world: 'sanctum',
      baseStats: { hp: 860, atk: 156, def: 90, spd: 128, crit: 0.12, critDmg: 1.50, res: 0.18 },
      skills: [
        sk('ek_cd_1', '秒針レイピア', 'single', 0, 1.04, '鋭い時計針で敵を突く。', []),
        sk('ek_cd_2', '巻き戻しチャイム', 'area', 3, 1.25, '敵範囲の行動ゲージを18%押し戻す。', [{ type: 'gauge', amount: -0.18, target: 'target' }])
      ],
      lore: '白銀の時計塔を守る自動人形。時間をきっちり守るあまり、1秒遅刻した魔物にも説教する。'
    },
    {
      id: 'en_astral_drake', kind: 'normal', name: '星界飛竜', kana: 'せいかいひりゅう',
      element: 'light', races: ['dragon'], role: 'dealer', world: 'sanctum',
      baseStats: { hp: 960, atk: 176, def: 92, spd: 120, crit: 0.16, critDmg: 1.58, res: 0.16 },
      skills: [
        sk('ek_ad_1', '星光ブレス', 'single', 0, 1.10, '星の粒子を纏う光線を吐く。', []),
        sk('ek_ad_2', 'アストラル強襲', 'area', 3, 1.48, '星雲を裂く滑空で敵範囲を貫く。', [{ type: 'status', status: 'vulnerable', chance: 0.60, turns: 2, target: 'target' }])
      ],
      lore: '雲の上の星海を泳ぐ白銀の飛竜。鱗が星光を反射して流れ星のように見えるため願い事をされがち。'
    },
    {
      id: 'en_chaos_hound', kind: 'normal', name: '混沌ハウンド', kana: 'こんとんはうんど',
      element: 'dark', races: ['demon', 'beast'], role: 'dealer', world: 'abyss',
      baseStats: { hp: 900, atk: 180, def: 86, spd: 128, crit: 0.18, critDmg: 1.60, res: 0.15 },
      skills: [
        sk('ek_ch_1', '異界裂き牙', 'single', 0, 1.12, '次元の裂け目から現れ二連噛みつき。', [], { hits: 2 }),
        sk('ek_ch_2', 'カオスハウル', 'all', 3, 1.32, '敵全体に防御低下と脆弱を付与する。', [
          { type: 'status', status: 'def_down', chance: 0.65, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.55, turns: 2, target: 'target' }
        ])
      ],
      lore: '七界の境界線を駆け巡る謎多き猟犬。尻尾を振るたびに小さな異界の欠片がポロポロ落ちる。'
    },
    {
      id: 'en_aether_squid', kind: 'normal', name: '虚空イカ', kana: 'こくういか',
      element: 'water', races: ['god', 'demon'], role: 'healer', world: 'sanctum',
      baseStats: { hp: 880, atk: 150, def: 90, spd: 118, crit: 0.10, critDmg: 1.50, res: 0.22 },
      skills: [
        sk('ek_as_1', '星墨ジェット', 'single', 0, 1.00, '星屑混じりの墨を吹きかけ攻撃低下を与える。', [{ type: 'status', status: 'atk_down', chance: 0.55, turns: 2, target: 'target' }]),
        sk('ek_as_2', '虚空の癒し波', 'ally_all', 3, 0, '味方全体のHPを回復し状態異常を1つ解除する。', [
          { type: 'heal', mult: 1.40, hpPct: 0.14, target: 'ally_all' },
          { type: 'cleanse', count: 1, target: 'ally_all' }
        ])
      ],
      lore: '雲の上の空気を海のように泳ぐ不思議なイカ。神か魔物か誰も判別できないが、本人はぷかぷか楽しそう。'
    }
  ];

  // ==================== エリアボス 4体 ====================
  var AREA_BOSSES = [
    {
      id: 'boss_a1', kind: 'boss', name: '蒸気巨兵ガラン', kana: 'じょうききょへいがらん', title: '機巧前線の守護巨像',
      element: 'none', races: ['mech'], role: 'tank', world: 'mechcity',
      baseStats: { hp: 2200, atk: 122, def: 98, spd: 96, crit: 0.10, critDmg: 1.50, res: 0.20 },
      skills: [
        sk('bk_a1_1', 'メガトン鉄拳', 'single', 0, 1.12, '大地を砕く巨大な鋼鉄の拳を叩き込む。', [{ type: 'status', status: 'stun', chance: 0.25, turns: 1, target: 'target' }]),
        sk('bk_a1_2', '高圧蒸気噴射', 'area', 2, 1.30, '全身の排気弁から超高圧蒸気を噴き出し敵範囲を焼く。', [{ type: 'status', status: 'burn', chance: 0.60, turns: 2, target: 'target' }]),
        sk('bk_a1_3', '要塞オーバーヒート', 'all', 4, 1.55, '全体へ衝撃波を放ち、自身へ厚い防護壁と防御上昇を展開。', [
          { type: 'shield', hpPct: 0.18, turns: 2, target: 'self' },
          { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' }
        ])
      ],
      lore: '境界平原と機巧都市の境目にそびえ立つ巨大な蒸気守護兵。異界の混線により「通行証を持たない者を全員歓迎砲撃」する誤作動を起こしている。'
    },
    {
      id: 'boss_a2', kind: 'boss', name: '紅蓮妖竜ファフナ', kana: 'ぐれんようりゅうふぁふな', title: '炎と星霧の境界竜',
      element: 'fire', races: ['dragon', 'fairy'], role: 'dealer', world: 'dragonpeak',
      baseStats: { hp: 3100, atk: 156, def: 108, spd: 112, crit: 0.15, critDmg: 1.55, res: 0.22 },
      skills: [
        sk('bk_a2_1', '紅霧の竜爪', 'single', 0, 1.15, '炎と星粉が混ざる翼爪で切り裂く。', [{ type: 'status', status: 'burn', chance: 0.50, turns: 2, target: 'target' }]),
        sk('bk_a2_2', '妖炎の輪舞', 'area', 2, 1.45, '紅蓮の花嵐で敵範囲を焼き、速度低下を付与。', [
          { type: 'status', status: 'burn', chance: 0.65, turns: 2, target: 'target' },
          { type: 'status', status: 'spd_down', chance: 0.55, turns: 2, target: 'target' }
        ]),
        sk('bk_a2_3', '星霧フレアストーム', 'all', 4, 1.75, '敵全体へ灼熱の星霧嵐を降り注がせ、自身に攻撃上昇を付与。', [
          { type: 'status', status: 'burn', chance: 0.80, turns: 2, target: 'target' },
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' }
        ])
      ],
      lore: '紅蓮竜峰と星霧妖精郷が重なった瞬間に誕生した華麗なる妖精竜。炎の翼と蝶の鱗粉を併せ持ち、美しいものには目がない。'
    },
    {
      id: 'boss_a3', kind: 'boss', name: '獣魔公ベヘモット', kana: 'じゅうまこうべへもっと', title: '深淵獣域の大覇王',
      element: 'dark', races: ['demon', 'beast'], role: 'dealer', world: 'abyss',
      baseStats: { hp: 4200, atk: 190, def: 124, spd: 118, crit: 0.18, critDmg: 1.60, res: 0.24 },
      skills: [
        sk('bk_a3_1', '深淵裂き猛爪', 'single', 0, 1.18, '魔獣の剛爪で敵単体を二連撃し猛毒を与える。', [{ type: 'status', status: 'poison', chance: 0.60, turns: 2, target: 'target' }], { hits: 2 }),
        sk('bk_a3_2', '百獣の魔哮', 'all', 3, 1.50, '咆哮と共に敵全体へ防御低下・脆弱を押し付ける。', [
          { type: 'status', status: 'def_down', chance: 0.75, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.65, turns: 2, target: 'target' }
        ]),
        sk('bk_a3_3', '黒月カタストロフ', 'all', 4, 1.90, '紅月の魔力を解き放ち敵全体を蹂躙する大技。', [
          { type: 'status', status: 'poison', chance: 0.85, turns: 2, target: 'target' },
          { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' }
        ])
      ],
      lore: '深淵魔界と極彩獣域の猛者たちを力比べで従えた伝説の獣魔公。強い挑戦者との戦いを何よりの娯楽として待ち構えている。'
    },
    {
      id: 'boss_a4', kind: 'boss', name: '境界機神クロノス', kana: 'きょうかいきしんくろのす', title: '七界交差の刻番',
      element: 'light', races: ['god', 'mech'], role: 'supporter', world: 'sanctum',
      baseStats: { hp: 5600, atk: 220, def: 146, spd: 126, crit: 0.18, critDmg: 1.62, res: 0.28 },
      skills: [
        sk('bk_a4_1', '星刻の光剣', 'single', 0, 1.20, '光の時針で敵単体を斬り、バフを1つ解除する。', [{ type: 'dispel', count: 1, target: 'target' }]),
        sk('bk_a4_2', '時空歯車の調律', 'all', 3, 1.55, '敵全体のゲージを20%後退させ、自身に速度上昇と防護壁を張る。', [
          { type: 'gauge', amount: -0.20, target: 'target' },
          { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'self' },
          { type: 'shield', hpPct: 0.16, turns: 2, target: 'self' }
        ]),
        sk('bk_a4_3', '七界収束ジャッジ', 'all', 4, 2.05, '七つの世界の光輪を重ね合わせ敵全体へ放つ神域最終砲。', [
          { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' },
          { type: 'status', status: 'silence', chance: 0.55, turns: 2, target: 'target' }
        ])
      ],
      lore: '白銀神域の奥座敷で七界の交差を観測し続ける古の機神。はちゃめちゃな世界のままでも楽しいのではないか、と密かに旅団の活躍を見守っている。'
    }
  ];

  // ==================== 乱入敵 8体 (WAVE乱入 ＆ 独立指名手配ターゲット!) ====================
  var INTRUDER_ENEMIES = [
    {
      id: 'int_joker', kind: 'intruder', name: '異界道化ジョーカー', kana: 'いかいどうけじょーかー', title: '神出鬼没の乱入者',
      element: 'none', races: ['demon'], role: 'supporter', world: 'abyss',
      recruitCharId: 'ch_joker', bountyId: 'bty_joker',
      baseStats: { hp: 1900, atk: 126, def: 86, spd: 132, crit: 0.16, critDmg: 1.55, res: 0.20 },
      skills: [
        sk('ik_jk_1', '奇襲トランプ', 'single', 0, 1.08, '奇襲カードで敵を斬り、バフを1つ奪い取る。', [{ type: 'dispel', count: 1, target: 'target' }]),
        sk('ik_jk_2', 'どっきりボックス', 'area', 2, 1.35, '飛び出す爆弾箱で範囲に脆弱と速度低下をばら撒く。', [
          { type: 'status', status: 'vulnerable', chance: 0.70, turns: 2, target: 'target' },
          { type: 'status', status: 'spd_down', chance: 0.65, turns: 2, target: 'target' }
        ]),
        sk('ik_jk_3', '乱入フィナーレ砲', 'all', 4, 1.65, '派手な花火と紙吹雪で敵全体を攻撃しゲージを20%下げる。', [{ type: 'gauge', amount: -0.20, target: 'target' }])
      ],
      lore: '「おっと主役は遅れて登場さ！」と叫びながら他人の戦場に割り込む道化師。負けても拍手して去っていく憎めない奴。'
    },
    {
      id: 'int_raiga', kind: 'intruder', name: '紅炎武者ライガ', kana: 'こうえんむしゃらいが', title: '道場破りの竜剣士',
      element: 'fire', races: ['human', 'dragon'], role: 'dealer', world: 'dragonpeak',
      recruitCharId: 'ch_raiga', bountyId: 'bty_raiga',
      baseStats: { hp: 2500, atk: 158, def: 102, spd: 116, crit: 0.18, critDmg: 1.60, res: 0.18 },
      skills: [
        sk('ik_rg_1', '炎竜抜刀', 'single', 0, 1.15, '灼熱の一刀で斬りつけ火傷を付与する。', [{ type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' }]),
        sk('ik_rg_2', '見切り反撃構え', 'self', 3, 0, '自身に反撃構えと攻撃上昇・会心上昇を付与する。', [
          { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ik_rg_3', '紅蓮覇竜斬', 'area', 4, 1.85, '炎の竜を纏わせた剛剣で範囲を焼き斬る。', [{ type: 'status', status: 'burn', chance: 0.80, turns: 2, target: 'target' }])
      ],
      lore: '腕自慢の旅団がいると聞けばどこへでも駆けつける竜人武者。戦う前に必ず正々堂々と名乗りを上げる。'
    },
    {
      id: 'int_piko', kind: 'intruder', name: '暴走星機ピコット', kana: 'ぼうそうせいきぴこっと', title: '超高速の迷子衛星',
      element: 'wind', races: ['mech'], role: 'supporter', world: 'mechcity',
      recruitCharId: 'ch_piko', bountyId: 'bty_piko',
      baseStats: { hp: 2300, atk: 146, def: 100, spd: 138, crit: 0.14, critDmg: 1.52, res: 0.20 },
      skills: [
        sk('ik_pk_1', 'ピコピコ連射', 'single', 0, 1.05, '星屑レーザーを二連射する。', [], { hits: 2 }),
        sk('ik_pk_2', 'ハイパー加速モード', 'ally_all', 3, 0, '敵味方お構いなしに大騒ぎし味方側のゲージを25%進める。', [
          { type: 'gauge', amount: 0.25, target: 'ally_all' },
          { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' }
        ]),
        sk('ik_pk_3', '軌道暴走レーザー', 'all', 4, 1.70, '上空から星屑ビームを乱射し防御低下を付与。', [{ type: 'status', status: 'def_down', chance: 0.75, turns: 2, target: 'target' }])
      ],
      lore: '「お祭り検知ピコ！」と戦場めがけて空から落ちてくる小型衛星。悪気はゼロだがビームの威力は本物。'
    },
    {
      id: 'int_lunaria', kind: 'intruder', name: '月蝕妖精ルナリア', kana: 'げっしょくようせいるなりあ', title: '夜更かし神格妖精',
      element: 'dark', races: ['god', 'fairy'], role: 'healer', world: 'fairyvale',
      recruitCharId: 'ch_lunaria', bountyId: 'bty_lunaria',
      baseStats: { hp: 2900, atk: 162, def: 110, spd: 122, crit: 0.14, critDmg: 1.55, res: 0.26 },
      skills: [
        sk('ik_ln_1', '黒月の雫', 'single', 0, 1.06, '魔力を吸う月光を放ち自身を回復する。', [], { drainPct: 0.30 }),
        sk('ik_ln_2', '月影の静寂', 'area', 3, 1.40, '敵範囲に沈黙と攻撃低下を与える。', [
          { type: 'status', status: 'silence', chance: 0.65, turns: 2, target: 'target' },
          { type: 'status', status: 'atk_down', chance: 0.70, turns: 2, target: 'target' }
        ]),
        sk('ik_ln_3', '月蝕ナイトメア', 'all', 4, 1.75, '黒月の奔流で敵全体を呑み込み、自身のHPも回復する。', [
          { type: 'status', status: 'poison', chance: 0.75, turns: 2, target: 'target' },
          { type: 'heal', hpPct: 0.16, target: 'self' }
        ])
      ],
      lore: '「うるさくて眠れないわ…」と不機嫌に現れる月蝕の妖精。お気に入りの紅茶を差し入れると機嫌が直るらしい。'
    },
    {
      id: 'int_gold_mimic', kind: 'intruder', name: '黄金大ミミック', kana: 'おうごんだいみみっく', title: '走るお宝金庫',
      element: 'light', races: ['demon', 'mech'], role: 'tank', world: 'frontier',
      bountyId: 'bty_mimic',
      baseStats: { hp: 2200, atk: 120, def: 126, spd: 112, crit: 0.12, critDmg: 1.50, res: 0.24 },
      skills: [
        sk('ik_gm_1', '金貨マシンガン', 'area', 0, 1.00, '口から大量の金貨を連射して攻撃する。', [], { hits: 2 }),
        sk('ik_gm_2', '黄金装甲ロック', 'self', 3, 0, '蓋を固く閉じて防護壁と防御上昇を張る。', [
          { type: 'shield', hpPct: 0.25, turns: 2, target: 'self' },
          { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ik_gm_3', '大当たり体当たり', 'all', 4, 1.55, '宝ごと飛び跳ねて全体へ突撃する大盤振る舞い。', [{ type: 'status', status: 'stun', chance: 0.30, turns: 1, target: 'target' }])
      ],
      lore: '戦利品の匂いを嗅ぎつけて乱入してくる豪華絢爛な機械仕掛けの宝箱魔物。倒すと大量のゴールドと高品質装備を落としてくれる。'
    },
    {
      id: 'int_frost_fenrir', kind: 'intruder', name: '氷牙フェンリル', kana: 'ひょうがふぇんりる', title: '吹雪を駆る銀狼王',
      element: 'water', races: ['beast'], role: 'dealer', world: 'wilds',
      bountyId: 'bty_fenrir',
      baseStats: { hp: 3100, atk: 174, def: 110, spd: 132, crit: 0.20, critDmg: 1.62, res: 0.20 },
      skills: [
        sk('ik_ff_1', '氷結の双牙', 'single', 0, 1.15, '凍てつく牙で二連撃し凍結を狙う。', [{ type: 'status', status: 'freeze', chance: 0.35, turns: 1, target: 'target' }], { hits: 2 }),
        sk('ik_ff_2', 'ブリザードハウル', 'area', 2, 1.48, '吹雪の遠吠えで速度低下と凍結を撒く。', [
          { type: 'status', status: 'spd_down', chance: 0.75, turns: 2, target: 'target' },
          { type: 'status', status: 'freeze', chance: 0.40, turns: 1, target: 'target' }
        ]),
        sk('ik_ff_3', '絶対零度ファング', 'all', 4, 1.90, '銀雪の嵐で敵全体を凍りつかせる狼王の奥義。', [
          { type: 'status', status: 'freeze', chance: 0.50, turns: 1, target: 'target' },
          { type: 'status', status: 'def_down', chance: 0.75, turns: 2, target: 'target' }
        ])
      ],
      lore: '極彩獣域の雪山から獲物を追って降りてきた気高き銀狼。足跡がすべて美しい氷の結晶になる。'
    },
    {
      id: 'int_blaze_hydra', kind: 'intruder', name: '灼熱ヒュドラ', kana: 'しゃくねつひゅどら', title: '三頭溶岩の暴れん坊',
      element: 'fire', races: ['dragon', 'demon'], role: 'dealer', world: 'dragonpeak',
      bountyId: 'bty_hydra',
      baseStats: { hp: 3800, atk: 192, def: 122, spd: 114, crit: 0.16, critDmg: 1.60, res: 0.22 },
      skills: [
        sk('ik_bh_1', '三頭連撃噛み', 'single', 0, 1.20, '三つの首が次々と噛みつき火傷と猛毒を付与。', [
          { type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' },
          { type: 'status', status: 'poison', chance: 0.55, turns: 2, target: 'target' }
        ], { hits: 3 }),
        sk('ik_bh_2', '再生の魔炎', 'self', 3, 0, '溶岩の熱で傷を塞ぎ継続再生と攻撃上昇を得る。', [
          { type: 'heal', hpPct: 0.16, target: 'self' },
          { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ik_bh_3', 'トリプルヘルフレア', 'all', 4, 2.00, '三方向から同時に灼熱火炎を浴びせる破壊の嵐。', [
          { type: 'status', status: 'burn', chance: 0.85, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.75, turns: 2, target: 'target' }
        ])
      ],
      lore: '三つの頭がそれぞれ別の好物を持っていて、いつも食事の行き先で揉めながら戦場に突っ込んでくる大怪竜。'
    },
    {
      id: 'int_prism_seraph', kind: 'intruder', name: '虹翼の熾天使', kana: 'にじよくのしてんし', title: '境界監査の特命神',
      element: 'light', races: ['god'], role: 'supporter', world: 'sanctum',
      bountyId: 'bty_seraph',
      baseStats: { hp: 4400, atk: 205, def: 138, spd: 130, crit: 0.18, critDmg: 1.62, res: 0.30 },
      skills: [
        sk('ik_ps_1', '七色光線', 'single', 0, 1.18, '虹色の光刃で斬りバフを1つ解除する。', [{ type: 'dispel', count: 1, target: 'target' }]),
        sk('ik_ps_2', '熾天使の審判輪', 'area', 2, 1.55, '範囲へ防御低下・脆弱を与え、自身に防護壁を張る。', [
          { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.75, turns: 2, target: 'target' },
          { type: 'shield', hpPct: 0.18, turns: 2, target: 'self' }
        ]),
        sk('ik_ps_3', 'プリズム・ヘヴン', 'all', 4, 2.10, '七界の虹光を束ねて敵全体へ降り注がせる究極裁定。', [
          { type: 'status', status: 'atk_down', chance: 0.80, turns: 2, target: 'target' },
          { type: 'status', status: 'silence', chance: 0.55, turns: 2, target: 'target' }
        ])
      ],
      lore: '「異界交差の安全点検に来ました！」と眩すぎる光輪と共に乱入してくる熾天使。点検基準がやたら厳しいが豪華な報酬を落としていく。'
    }
  ];

  // ==================== 超ボス計測戦 3体 ====================
  var SUPERBOSSES = [
    {
      id: 'sb_omega', kind: 'superboss', name: '機竜帝オメガ', kana: 'きりゅうていおめが', title: '超巨兵・鋼鉄竜帝',
      element: 'none', races: ['dragon', 'mech'], role: 'tank', world: 'mechcity',
      baseStats: { hp: 280000, atk: 168, def: 130, spd: 110, crit: 0.14, critDmg: 1.55, res: 0.25 },
      skills: [
        sk('sk_sbo_1', 'オメガ機関砲', 'area', 0, 1.10, '連装機関砲で前衛を掃射する。', [], { hits: 2 }),
        sk('sk_sbo_2', '重装炉心防壁', 'all', 3, 1.38, '衝撃波を放ち自身へ防御上昇を付与。', [{ type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' }]),
        sk('sk_sbo_3', '零式竜帝キャノン', 'all', 4, 1.85, '全エネルギーを解放する極太レーザー砲。', [{ type: 'status', status: 'burn', chance: 0.75, turns: 2, target: 'target' }])
      ],
      lore: '機巧都市と古竜の技術が奇跡的に融合した超巨大機動竜。その圧倒的な装甲は旅団の総火力を測る絶好の試金石。'
    },
    {
      id: 'sb_leviathan', kind: 'superboss', name: '蒼穹海竜リヴァイア', kana: 'そうきゅうかいりゅうりゔぁいあ', title: '超巨兵・星海の古神竜',
      element: 'water', races: ['dragon', 'god'], role: 'dealer', world: 'fairyvale',
      baseStats: { hp: 420000, atk: 205, def: 146, spd: 122, crit: 0.16, critDmg: 1.60, res: 0.28 },
      skills: [
        sk('sk_sbl_1', '蒼海の水刃', 'area', 0, 1.15, '高圧の水流刃で敵範囲を切り裂く。', [{ type: 'status', status: 'spd_down', chance: 0.55, turns: 2, target: 'target' }]),
        sk('sk_sbl_2', '氷霧の大渦潮', 'all', 3, 1.50, '大渦で全体を引き寄せ凍結と防御低下を狙う。', [
          { type: 'status', status: 'freeze', chance: 0.35, turns: 1, target: 'target' },
          { type: 'status', status: 'def_down', chance: 0.75, turns: 2, target: 'target' }
        ]),
        sk('sk_sbl_3', '星海大氾濫', 'all', 4, 2.00, '空の海を丸ごと叩きつける神竜の大災厄。', [{ type: 'status', status: 'atk_down', chance: 0.75, turns: 2, target: 'target' }])
      ],
      lore: '星霧の空を泳ぐ神話級の超巨大海竜。ひとたび尾を振るえば七つの世界に虹色の豪雨が降るという。'
    },
    {
      id: 'sb_chaos', kind: 'superboss', name: '混沌神カオスギア', kana: 'こんとんしんかおすぎあ', title: '超巨兵・はちゃめちゃの化身',
      element: 'dark', races: ['god', 'demon'], role: 'dealer', world: 'abyss',
      baseStats: { hp: 600000, atk: 242, def: 162, spd: 130, crit: 0.20, critDmg: 1.65, res: 0.32 },
      skills: [
        sk('sk_sbc_1', '混沌の魔手', 'area', 0, 1.22, '次元を歪める掌打で範囲を打ち据え猛毒を付与。', [{ type: 'status', status: 'poison', chance: 0.65, turns: 2, target: 'target' }]),
        sk('sk_sbc_2', '七界反転フィールド', 'all', 3, 1.62, 'バフを1つ剥がしつつ脆弱と沈黙を与える。', [
          { type: 'dispel', count: 1, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.80, turns: 2, target: 'target' },
          { type: 'status', status: 'silence', chance: 0.45, turns: 2, target: 'target' }
        ]),
        sk('sk_sbc_3', '混沌ビッグバン', 'all', 4, 2.20, '七界の魔力が大爆発する規格外の終極轟撃。', [
          { type: 'status', status: 'burn', chance: 0.75, turns: 2, target: 'target' },
          { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' }
        ])
      ],
      lore: '七つの世界が衝突した中心点から生まれた混沌の化身。強者が挑んでくるのを大歓迎しており、本気で戦うと世界が少しだけ楽しくなる。'
    }
  ];

  // ==================== タワー＆リレー総力戦 エリートボス 9体 ====================
  var ELITE_ENEMIES = [
    {
      id: 'el_t5', kind: 'elite', name: '鋼鉄番人バルカン', kana: 'こうてつばんにんばるかん', title: '混線塔5階守護者',
      element: 'fire', races: ['mech'], role: 'tank', world: 'mechcity',
      baseStats: { hp: 2600, atk: 136, def: 112, spd: 100, crit: 0.10, critDmg: 1.50, res: 0.20 },
      skills: [
        sk('ek_t5_1', '焼夷鉄槌', 'single', 0, 1.12, '灼熱ハンマーで単体を打ち火傷を付与。', [{ type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' }]),
        sk('ek_t5_2', '要塞鉄壁モード', 'self', 3, 0, '自身に防護壁と反撃構えを張る。', [
          { type: 'shield', hpPct: 0.22, turns: 2, target: 'self' },
          { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ek_t5_3', '熔鉱炉ブラスト', 'all', 4, 1.65, '熱風で敵全体を焼き払う。', [{ type: 'status', status: 'burn', chance: 0.75, turns: 2, target: 'target' }])
      ],
      lore: '混線タワー下層を警備する灼熱炉心搭載の重機兵。通行人の装備の出来栄えを勝手に採点する癖がある。'
    },
    {
      id: 'el_t10', kind: 'elite', name: '戦乙女ヴァルキア', kana: 'いくさおとめばるきあ', title: '混線塔10階試練官',
      element: 'water', races: ['god', 'mech'], role: 'tank', world: 'sanctum',
      baseStats: { hp: 3800, atk: 168, def: 132, spd: 114, crit: 0.14, critDmg: 1.55, res: 0.24 },
      skills: [
        sk('ek_t10_1', '蒼銀機槍', 'single', 0, 1.15, '神機槍で貫き自身に防護壁を張る。', [{ type: 'shield', hpPct: 0.12, turns: 2, target: 'self' }]),
        sk('ek_t10_2', '戦乙女の号令', 'ally_all', 3, 0, '味方全体へ防護壁と攻撃上昇を授ける。', [
          { type: 'shield', hpPct: 0.20, turns: 2, target: 'ally_all' },
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' }
        ]),
        sk('ek_t10_3', '蒼穹機神閃', 'all', 4, 1.82, '蒼銀の衝撃波で敵全体を穿ち凍結を狙う。', [{ type: 'status', status: 'freeze', chance: 0.40, turns: 1, target: 'target' }])
      ],
      lore: '混線タワー中層の門番を務める蒼銀の戦乙女。見事打ち破ればその実力を認め旅団へ加わる。'
    },
    {
      id: 'el_t15', kind: 'elite', name: '夢幻女王ティターナ', kana: 'むげんじょおうてぃたーな', title: '混線塔15階妖精王',
      element: 'wind', races: ['fairy'], role: 'supporter', world: 'fairyvale',
      baseStats: { hp: 4800, atk: 188, def: 128, spd: 134, crit: 0.16, critDmg: 1.58, res: 0.28 },
      skills: [
        sk('ek_t15_1', '星風リボン', 'single', 0, 1.12, '風のリボンで薙ぎ敵の速度を落とす。', [{ type: 'status', status: 'spd_down', chance: 0.65, turns: 2, target: 'target' }]),
        sk('ek_t15_2', '妖精宮の舞踏会', 'ally_all', 3, 0, '味方全体のHPを回復し速度上昇・ゲージ加速を与える。', [
          { type: 'heal', hpPct: 0.16, target: 'ally_all' },
          { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'ally_all' },
          { type: 'gauge', amount: 0.22, target: 'ally_all' }
        ]),
        sk('ek_t15_3', 'ミッドサマー嵐', 'all', 4, 1.92, '幻想の花嵐で敵全体に沈黙と脆弱を与える。', [
          { type: 'status', status: 'silence', chance: 0.55, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.75, turns: 2, target: 'target' }
        ])
      ],
      lore: '星霧妖精郷の夢幻宮殿を塔の15階にそのまま引っ越させた優雅な女王。お茶会を邪魔されると本気の嵐を呼ぶ。'
    },
    {
      id: 'el_t20', kind: 'elite', name: '黎明女神セレス', kana: 'れいめいめがみせれす', title: '混線塔最上階守護神',
      element: 'light', races: ['god', 'fairy'], role: 'healer', world: 'sanctum',
      baseStats: { hp: 6400, atk: 215, def: 150, spd: 130, crit: 0.16, critDmg: 1.60, res: 0.34 },
      skills: [
        sk('ek_t20_1', '黎明の星光', 'single', 0, 1.18, '星光で敵を打ち味方全体を少し回復する。', [{ type: 'heal', hpPct: 0.08, target: 'ally_all' }]),
        sk('ek_t20_2', '暁の聖域展開', 'ally_all', 3, 0, '味方全体へ防護壁・継続再生・攻撃上昇を付与する。', [
          { type: 'shield', hpPct: 0.22, turns: 2, target: 'ally_all' },
          { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'ally_all' },
          { type: 'status', status: 'atk_up', chance: 1.0, turns: 2, target: 'ally_all' }
        ]),
        sk('ek_t20_3', '星界創世ジャッジ', 'all', 4, 2.15, '暁の奔流で敵全体を圧倒するタワー最上階の試練。', [
          { type: 'dispel', count: 1, target: 'target' },
          { type: 'status', status: 'def_down', chance: 0.80, turns: 2, target: 'target' }
        ])
      ],
      lore: '混線タワーの頂に座す暁の女神。見事20階を踏破した旅団に祝福を授け、自ら仲間として歩み出す。'
    },
    {
      id: 'el_r1_p1', kind: 'elite', name: '境界番竜ヴリトラ', kana: 'きょうかいばんりゅうゔりとら', title: '総力戦先鋒の炎竜',
      element: 'fire', races: ['dragon'], role: 'dealer', world: 'frontier',
      baseStats: { hp: 3600, atk: 162, def: 112, spd: 114, crit: 0.15, critDmg: 1.55, res: 0.20 },
      skills: [
        sk('ek_r1a_1', '炎鱗の一撃', 'single', 0, 1.15, '灼熱の爪で敵単体を裂く。', [{ type: 'status', status: 'burn', chance: 0.55, turns: 2, target: 'target' }]),
        sk('ek_r1a_2', '火炎掃射息', 'area', 2, 1.48, '範囲へ炎息を浴びせ防御低下を付与。', [{ type: 'status', status: 'def_down', chance: 0.65, turns: 2, target: 'target' }]),
        sk('ek_r1a_3', '紅蓮大爆炎', 'all', 4, 1.85, '戦場全体を焼き尽くす竜の大咆哮。', [{ type: 'status', status: 'burn', chance: 0.85, turns: 2, target: 'target' }])
      ],
      lore: '境界線の防衛試験で第1陣として立ちはだかる巨竜。まずは手始めの腕試しとして豪快な炎を振るう。'
    },
    {
      id: 'el_r1_p2', kind: 'elite', name: '魔神王アビス', kana: 'まじんおうあびす', title: '総力戦大将の深淵王',
      element: 'dark', races: ['god', 'demon'], role: 'tank', world: 'abyss',
      baseStats: { hp: 5200, atk: 194, def: 138, spd: 118, crit: 0.16, critDmg: 1.60, res: 0.28 },
      skills: [
        sk('ek_r1b_1', '魔神の黒爪', 'single', 0, 1.18, '魔力を奪う一撃。', [{ type: 'status', status: 'poison', chance: 0.60, turns: 2, target: 'target' }], { drainPct: 0.25 }),
        sk('ek_r1b_2', '深淵玉座の威圧', 'all', 3, 1.50, '敵全体へ攻撃低下を与え自身へ防護壁と反撃構えを張る。', [
          { type: 'status', status: 'atk_down', chance: 0.80, turns: 2, target: 'target' },
          { type: 'shield', hpPct: 0.20, turns: 2, target: 'self' },
          { type: 'status', status: 'counter', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ek_r1b_3', '終焉の暗黒波', 'all', 4, 2.00, '深淵の力を解き放つ魔神王の大技。', [
          { type: 'status', status: 'vulnerable', chance: 0.80, turns: 2, target: 'target' },
          { type: 'status', status: 'silence', chance: 0.55, turns: 2, target: 'target' }
        ])
      ],
      lore: '多部隊リレー総力戦「境界防衛」の大将を務める魔神王。三部隊の連携で打ち倒せば旅団に忠誠を誓う。'
    },
    {
      id: 'el_r2_p1', kind: 'elite', name: '暴風獣帝ガルダ', kana: 'ぼうふうじゅうていがるだ', title: '総力戦の蒼穹翼王',
      element: 'wind', races: ['beast'], role: 'dealer', world: 'wilds',
      baseStats: { hp: 5000, atk: 205, def: 126, spd: 136, crit: 0.20, critDmg: 1.62, res: 0.22 },
      skills: [
        sk('ek_r2a_1', '烈風連斬翼', 'single', 0, 1.18, '暴風の翼で二連撃。', [], { hits: 2 }),
        sk('ek_r2a_2', '疾風昇天舞', 'area', 2, 1.55, '敵範囲を巻き上げ自身に速度上昇・会心上昇。', [
          { type: 'status', status: 'spd_up', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'crit_up', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ek_r2a_3', 'ハリケーン・ダイブ', 'all', 4, 2.05, '超音速の竜巻で敵全体を切り刻む。', [{ type: 'status', status: 'spd_down', chance: 0.80, turns: 2, target: 'target' }])
      ],
      lore: '極彩獣域の空を支配する黄金翼の怪鳥帝。嵐そのものを羽ばたきで操り、並の部隊を一瞬で吹き飛ばす。'
    },
    {
      id: 'el_r2_p2', kind: 'elite', name: '蒼氷機皇ゼロス', kana: 'そうひょうきこうぜろす', title: '総力戦の絶対零度機',
      element: 'water', races: ['mech'], role: 'tank', world: 'mechcity',
      baseStats: { hp: 6200, atk: 210, def: 158, spd: 112, crit: 0.14, critDmg: 1.55, res: 0.28 },
      skills: [
        sk('ek_r2b_1', '冷凍パイル打', 'single', 0, 1.16, '極低温パイルで貫き凍結を狙う。', [{ type: 'status', status: 'freeze', chance: 0.45, turns: 1, target: 'target' }]),
        sk('ek_r2b_2', '氷結リアクター', 'self', 3, 0, '防護壁と防御上昇・継続再生を同時展開。', [
          { type: 'shield', hpPct: 0.26, turns: 2, target: 'self' },
          { type: 'status', status: 'def_up', chance: 1.0, turns: 2, target: 'self' },
          { type: 'status', status: 'regen', chance: 1.0, turns: 2, target: 'self' }
        ]),
        sk('ek_r2b_3', '絶対零度キャノン', 'all', 4, 2.10, '戦場全体を凍りつかせる極寒砲撃。', [
          { type: 'status', status: 'freeze', chance: 0.50, turns: 1, target: 'target' },
          { type: 'status', status: 'atk_down', chance: 0.80, turns: 2, target: 'target' }
        ])
      ],
      lore: '機巧都市の深部冷却区画を守っていた白銀の機皇。周囲の空気ごと凍らせる冷却炉を背負う。'
    },
    {
      id: 'el_r3_p3', kind: 'elite', name: '七界融合体オムニ', kana: 'ななかいゆうごうたいおむに', title: '総力戦最終の万象機神',
      element: 'none', races: ['god', 'mech'], role: 'dealer', world: 'sanctum',
      baseStats: { hp: 7800, atk: 245, def: 162, spd: 132, crit: 0.20, critDmg: 1.65, res: 0.34 },
      skills: [
        sk('ek_r3c_1', '万象光刃', 'single', 0, 1.24, '全属性の輝きを宿す斬撃でバフを解除する。', [{ type: 'dispel', count: 1, target: 'target' }]),
        sk('ek_r3c_2', '七界共振波', 'all', 3, 1.70, '敵全体へ防御低下・脆弱・ゲージ後退を叩き込む。', [
          { type: 'status', status: 'def_down', chance: 0.85, turns: 2, target: 'target' },
          { type: 'status', status: 'vulnerable', chance: 0.80, turns: 2, target: 'target' },
          { type: 'gauge', amount: -0.20, target: 'target' }
        ]),
        sk('ek_r3c_3', 'はちゃめちゃ創世砲', 'all', 4, 2.35, '七つの世界の理を一撃に束ねた総力戦の最終試練。', [
          { type: 'status', status: 'burn', chance: 0.70, turns: 2, target: 'target' },
          { type: 'status', status: 'poison', chance: 0.70, turns: 2, target: 'target' }
        ])
      ],
      lore: '七界の魔力・機巧・神威が一つに収束した最終試練の機神。三部隊すべての力を結集した旅団だけがその頂を超えられる。'
    }
  ];

  D.ENEMIES = {
    normal: NORMAL_ENEMIES,
    boss: AREA_BOSSES,
    intruder: INTRUDER_ENEMIES,
    superboss: SUPERBOSSES,
    elite: ELITE_ENEMIES
  };

  D.ALL_ENEMIES = []
    .concat(NORMAL_ENEMIES)
    .concat(AREA_BOSSES)
    .concat(INTRUDER_ENEMIES)
    .concat(SUPERBOSSES)
    .concat(ELITE_ENEMIES);

  D.ENEMY_BY_ID = {};
  D.ALL_ENEMIES.forEach(function (en) {
    if (HS.Utils && HS.Utils.normalizeRaces) {
      en.races = HS.Utils.normalizeRaces(en.races);
    }
    D.ENEMY_BY_ID[en.id] = en;
  });
})(typeof window !== 'undefined' ? window : globalThis);
