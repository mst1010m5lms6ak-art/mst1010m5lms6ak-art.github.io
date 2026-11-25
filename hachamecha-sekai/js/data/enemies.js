(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * 敵データ：通常敵20種 + エリアボス5種 + 超低確率乱入敵3種 + 異界総力戦6属性レイドボス6種 ＝ 計34種
   * 名前は行動順バー・ユニットカード・図鑑のすべてで1文字も見切れない自然な6〜8文字に統一。
   */
  HW.ENEMIES = [
    // ========== エリア1（ネオン商店街×剣と魔法）通常敵4 + ボス1 ==========
    {
      id: 'e_slime_bot', name: '電脳スライム', element: 'water', races: ['monster', 'machine'], role: 'tank', kind: 'normal',
      base: { hp: 920, atk: 140, def: 85, spd: 92 },
      skills: [
        { slot: 1, name: 'ジェル体当たり', target: 'single', ct: 0, mult: 1.0 },
        { slot: 2, name: '冷却コート', target: 'self', ct: 3, shieldSelfPct: 0.22, buffSelf: { id: 'defUp', dur: 2 } }
      ],
      lore: '自販機の冷却水とスライムが融合した街角の定番魔物。夏場はちょっと涼しい。'
    },
    {
      id: 'e_gob_punk', name: 'ロックゴブリン', element: 'fire', races: ['monster'], role: 'dealer', kind: 'normal',
      base: { hp: 780, atk: 175, def: 65, spd: 108 },
      skills: [
        { slot: 1, name: 'スパナ殴り', target: 'single', ct: 0, mult: 1.05 },
        { slot: 2, name: '爆音リフ', target: 'splash', ct: 3, mult: 1.32, ailment: { id: 'burn', chance: 0.30, dur: 2 } }
      ],
      lore: 'エレキギターを鈍器代わりに振り回す商店街の騒音ゴブリン。演奏は意外と上手い。'
    },
    {
      id: 'e_wind_drone', name: '暴走ドローン', element: 'wind', races: ['machine'], role: 'supporter', kind: 'normal',
      base: { hp: 820, atk: 155, def: 75, spd: 118 },
      skills: [
        { slot: 1, name: 'プロペラ斬', target: 'single', ct: 0, mult: 0.98 },
        { slot: 2, name: '急送ブースト', target: 'allyAll', ct: 3, buffAlly: { id: 'spdUp', dur: 2 }, gaugeAlly: 0.14 }
      ],
      lore: '置き配指定を誤解して冒険者の頭上に荷物を落とし続ける暴走ドローン。'
    },
    {
      id: 'e_stray_cat', name: '看板バケネコ', element: 'light', races: ['beast'], role: 'healer', kind: 'normal',
      base: { hp: 860, atk: 145, def: 80, spd: 104 },
      skills: [
        { slot: 1, name: '招きパンチ', target: 'single', ct: 0, mult: 0.96 },
        { slot: 2, name: 'ご利益ミャオ', target: 'allyAll', ct: 3, healMult: 1.15 }
      ],
      lore: 'ネオン看板の上で昼寝している巨大招き猫。鳴き声で仲間の疲れを癒やす。'
    },
    {
      id: 'b_area1', name: '魔神デパトス', element: 'fire', races: ['monster', 'machine'], role: 'tank', kind: 'boss',
      base: { hp: 5200, atk: 245, def: 135, spd: 104 },
      skills: [
        { slot: 1, name: '特売ハンマー', target: 'single', ct: 0, mult: 1.08 },
        { slot: 2, name: '電子レンジ熱波', target: 'splash', ct: 3, mult: 1.48, ailment: { id: 'burn', chance: 0.45, dur: 2 } },
        { slot: 3, name: '全館セール砲', target: 'all', ct: 4, mult: 1.85, debuff: { id: 'defDown', chance: 0.45, dur: 2 } }
      ],
      lore: '閉店後の家電量販店が異界の魔力と合体して生まれたエリア1の支配者。必殺技の威力が割引率に比例する。'
    },

    // ========== エリア2（深海竜宮×軌道エレベーター）通常敵4 + ボス1 ==========
    {
      id: 'e_coral_guard', name: '珊瑚アーマー兵', element: 'water', races: ['human', 'beast'], role: 'tank', kind: 'normal',
      base: { hp: 1450, atk: 215, def: 135, spd: 96 },
      skills: [
        { slot: 1, name: '珊瑚の矛', target: 'single', ct: 0, mult: 1.02 },
        { slot: 2, name: '鉄壁貝殻', target: 'self', ct: 3, buffSelf: { id: 'taunt', dur: 2 }, shieldSelfPct: 0.25 }
      ],
      lore: '竜宮城の門番を務める重装兵。軌道エレベーターの定期券を首から下げている。'
    },
    {
      id: 'e_laser_squid', name: '光学イカ兵', element: 'light', races: ['beast', 'machine'], role: 'dealer', kind: 'normal',
      base: { hp: 1220, atk: 270, def: 105, spd: 114 },
      skills: [
        { slot: 1, name: 'イカ墨レーザー', target: 'single', ct: 0, mult: 1.08 },
        { slot: 2, name: '十本同時照射', target: 'splash', ct: 3, mult: 1.52, debuff: { id: 'atkDown', chance: 0.35, dur: 2 } }
      ],
      lore: '10本の触手すべてに光学砲を装備した深海サイボーグイカ。光りすぎて夜釣りの名所になっている。'
    },
    {
      id: 'e_aqua_pixie', name: '泡玉妖精', element: 'water', races: ['fairy'], role: 'healer', kind: 'normal',
      base: { hp: 1280, atk: 220, def: 115, spd: 112 },
      skills: [
        { slot: 1, name: 'バブル弾', target: 'single', ct: 0, mult: 0.96 },
        { slot: 2, name: '深海泡風呂', target: 'allyAll', ct: 3, healMult: 1.28, buffAlly: { id: 'regen', dur: 2 } }
      ],
      lore: '高圧酸素バブルを配り歩く海の妖精。泡に入ると深海でもなぜか呼吸ができる。'
    },
    {
      id: 'e_abyss_wyrm', name: '海竜シードラ', element: 'dark', races: ['dragon'], role: 'dealer', kind: 'normal',
      base: { hp: 1360, atk: 265, def: 120, spd: 110 },
      skills: [
        { slot: 1, name: '海竜咬み', target: 'single', ct: 0, mult: 1.06 },
        { slot: 2, name: '漆黒渦潮', target: 'all', ct: 4, mult: 1.45, ailment: { id: 'freeze', chance: 0.28, dur: 1 } }
      ],
      lore: '深海溝を回遊する気性の荒い幼竜。光るエレベーターケーブルを追いかけ回す癖がある。'
    },
    {
      id: 'b_area2', name: '海皇ポセイドン', element: 'water', races: ['dragon', 'machine'], role: 'dealer', kind: 'boss',
      base: { hp: 9200, atk: 365, def: 195, spd: 112 },
      skills: [
        { slot: 1, name: '高圧三叉槍', target: 'single', ct: 0, mult: 1.12 },
        { slot: 2, name: '凍結タービン波', target: 'splash', ct: 3, mult: 1.56, ailment: { id: 'freeze', chance: 0.45, dur: 1 } },
        { slot: 3, name: '津波レール砲', target: 'all', ct: 4, mult: 1.98, debuff: { id: 'spdDown', chance: 0.55, dur: 2 } }
      ],
      lore: '竜宮城の中枢と衛星軌道を直結させる巨大機竜。本人はいたって礼儀正しい海運会社の社長でもある。'
    },

    // ========== エリア3（妖精遊園地×戦国要塞）通常敵4 + ボス1 ==========
    {
      id: 'e_samurai_bear', name: '具足クマ侍', element: 'wind', races: ['beast'], role: 'tank', kind: 'normal',
      base: { hp: 2250, atk: 315, def: 195, spd: 102 },
      skills: [
        { slot: 1, name: '十文字斬り', target: 'single', ct: 0, mult: 1.05 },
        { slot: 2, name: '仁王立ち演武', target: 'self', ct: 3, buffSelf: { id: 'taunt', dur: 2 }, buffSelf2: { id: 'defUp', dur: 2 } }
      ],
      lore: '戦国甲冑を着込んだ遊園地のマスコット熊。記念撮影を断ると太刀を抜く。'
    },
    {
      id: 'e_clown_imp', name: '道化インプ', element: 'dark', races: ['monster', 'fairy'], role: 'supporter', kind: 'normal',
      base: { hp: 1850, atk: 335, def: 155, spd: 122 },
      skills: [
        { slot: 1, name: 'びっくり刃', target: 'single', ct: 0, mult: 1.00, ailment: { id: 'poison', chance: 0.35, dur: 2 } },
        { slot: 2, name: '狂乱パレード', target: 'all', ct: 3, mult: 1.30, ailment: { id: 'curse', chance: 0.40, dur: 2 } }
      ],
      lore: 'メリーゴーランドに棲みついた悪戯妖精魔物。風船を割る音で呪いをかけてくる。'
    },
    {
      id: 'e_ninja_bot', name: 'カラクリ忍犬', element: 'wind', races: ['beast', 'machine'], role: 'dealer', kind: 'normal',
      base: { hp: 1780, atk: 380, def: 145, spd: 130 },
      skills: [
        { slot: 1, name: '手裏剣連射', target: 'single', ct: 0, mult: 1.10 },
        { slot: 2, name: '分身風車', target: 'splash', ct: 3, mult: 1.58, ailment: { id: 'bleed', chance: 0.40, dur: 2 } }
      ],
      lore: '戦国からくり技術と最新サーボモーターで動く忍者犬。お座りを命じると煙幕を張って逃げる。'
    },
    {
      id: 'e_candy_witch', name: '綿あめ術師', element: 'fire', races: ['human', 'fairy'], role: 'healer', kind: 'normal',
      base: { hp: 1960, atk: 320, def: 165, spd: 114 },
      skills: [
        { slot: 1, name: 'キャラメル弾', target: 'single', ct: 0, mult: 0.98 },
        { slot: 2, name: '糖分チャージ', target: 'allyAll', ct: 3, healMult: 1.36, buffAlly: { id: 'atkUp', dur: 2 } }
      ],
      lore: '屋台の綿あめ機で回復薬を紡ぎ出す陽気な術師。食べ過ぎるとテンションが爆発する。'
    },
    {
      id: 'b_area3', name: '妖精将軍フウ', element: 'wind', races: ['human', 'fairy'], role: 'supporter', kind: 'boss',
      base: { hp: 14800, atk: 495, def: 265, spd: 124 },
      skills: [
        { slot: 1, name: '軍配嵐撃', target: 'single', ct: 0, mult: 1.12 },
        { slot: 2, name: '絶叫コースター', target: 'allyAll', ct: 3, buffAlly: { id: 'spdUp', dur: 2 }, buffAlly2: { id: 'atkUp', dur: 2 }, gaugeAlly: 0.18 },
        { slot: 3, name: '天下布武祭', target: 'all', ct: 4, mult: 2.08, ailment: { id: 'silence', chance: 0.35, dur: 1 } }
      ],
      lore: 'お城の天守閣を巨大観覧車に改造してしまった風流な妖精大名。戦の合間に花火大会を主催する。'
    },

    // ========== エリア4（古代神殿×仮想電脳空間）通常敵4 + ボス1 ==========
    {
      id: 'e_valkyrie_ai', name: '電脳戦乙女', element: 'light', races: ['god', 'machine'], role: 'dealer', kind: 'normal',
      base: { hp: 2780, atk: 510, def: 225, spd: 124 },
      skills: [
        { slot: 1, name: 'コード槍撃', target: 'single', ct: 0, mult: 1.12 },
        { slot: 2, name: '断罪パッチ', target: 'splash', ct: 3, mult: 1.65, debuff: { id: 'defDown', chance: 0.45, dur: 2 } }
      ],
      lore: '神殿のセキュリティを守る電子戦乙女。バグと見なした侵入者を光の槍で即座に検疫する。'
    },
    {
      id: 'e_sphinx_cpu', name: '論理スフィンクス', element: 'none', races: ['god', 'beast'], role: 'tank', kind: 'normal',
      base: { hp: 3450, atk: 420, def: 290, spd: 105 },
      skills: [
        { slot: 1, name: '謎かけ重撃', target: 'single', ct: 0, mult: 1.04 },
        { slot: 2, name: '絶対命題盾', target: 'allyAll', ct: 3, shieldPct: 0.24, buffSelf: { id: 'taunt', dur: 2 } }
      ],
      lore: '二進法でなぞなぞを出題する神獣。答えを間違えても正解してもとりあえず前足で殴ってくる。'
    },
    {
      id: 'e_virus_drake', name: 'バグ飛竜', element: 'dark', races: ['dragon', 'machine'], role: 'dealer', kind: 'normal',
      base: { hp: 2680, atk: 525, def: 210, spd: 128 },
      skills: [
        { slot: 1, name: 'ノイズ吐息', target: 'single', ct: 0, mult: 1.08, ailment: { id: 'paralyze', chance: 0.30, dur: 1 } },
        { slot: 2, name: 'データ破壊波', target: 'all', ct: 4, mult: 1.60, ailment: { id: 'curse', chance: 0.45, dur: 2 } }
      ],
      lore: 'ポリゴンが半分透けている電脳竜。鳴き声が懐かしいモデム接続音にそっくり。'
    },
    {
      id: 'e_oracle_bug', name: '電脳巫女', element: 'light', races: ['human', 'god'], role: 'healer', kind: 'normal',
      base: { hp: 2920, atk: 435, def: 235, spd: 118 },
      skills: [
        { slot: 1, name: '光符ショット', target: 'single', ct: 0, mult: 0.98 },
        { slot: 2, name: 'クラウド復元', target: 'allyAll', ct: 3, healMult: 1.48, cleanse: 1 }
      ],
      lore: '古代神殿の祈りとクラウド復元を同時実行する巫女端末。おみくじの結果がJSONで返ってくる。'
    },
    {
      id: 'b_area4', name: '電脳神ゼウスOS', element: 'light', races: ['god', 'machine'], role: 'dealer', kind: 'boss',
      base: { hp: 23500, atk: 650, def: 345, spd: 126 },
      skills: [
        { slot: 1, name: '神雷ロジック', target: 'single', ct: 0, mult: 1.15, ailment: { id: 'paralyze', chance: 0.35, dur: 1 } },
        { slot: 2, name: '再起動パルス', target: 'splash', ct: 3, mult: 1.72, debuff: { id: 'atkDown', chance: 0.50, dur: 2 } },
        { slot: 3, name: '蒼天強制終了', target: 'all', ct: 4, mult: 2.25, ailment: { id: 'paralyze', chance: 0.40, dur: 1 } }
      ],
      lore: '神々の王と次世代OSがうっかり統合された超絶知性体。雷を落とす前に利用規約への同意を求めてくる。'
    },

    // ========== エリア5（はちゃめちゃ終着点・万象交差点）通常敵4 + ボス1 ==========
    {
      id: 'e_chaos_knight', name: '混沌騎士カオス', element: 'dark', races: ['human', 'dragon'], role: 'dealer', kind: 'normal',
      base: { hp: 3850, atk: 685, def: 310, spd: 128 },
      skills: [
        { slot: 1, name: '次元両断', target: 'single', ct: 0, mult: 1.15 },
        { slot: 2, name: '黒焔クロス', target: 'splash', ct: 3, mult: 1.72, ailment: { id: 'bleed', chance: 0.45, dur: 2 } }
      ],
      lore: 'あらゆる異世界の武具を全身に装着した流浪の騎士。右手が聖剣で左手がレーザーブレードという欲張り構成。'
    },
    {
      id: 'e_astral_titan', name: '星屑タイタン', element: 'none', races: ['god', 'machine'], role: 'tank', kind: 'normal',
      base: { hp: 4950, atk: 560, def: 390, spd: 106 },
      skills: [
        { slot: 1, name: '重力パンチ', target: 'single', ct: 0, mult: 1.08 },
        { slot: 2, name: '銀河障壁', target: 'allyAll', ct: 3, shieldPct: 0.26, buffAlly: { id: 'defUp', dur: 2 } }
      ],
      lore: '小惑星帯の岩石と巨大ロボットが合体した歩哨。一歩歩くたびに周囲の重力がちょっとだけ軽くなる。'
    },
    {
      id: 'e_mirage_queen', name: '夢幻ミラージュ', element: 'fire', races: ['fairy', 'monster'], role: 'supporter', kind: 'normal',
      base: { hp: 3650, atk: 615, def: 280, spd: 134 },
      skills: [
        { slot: 1, name: '幻惑リップ', target: 'single', ct: 0, mult: 1.04, ailment: { id: 'silence', chance: 0.35, dur: 1 } },
        { slot: 2, name: '万華鏡ワルツ', target: 'all', ct: 3, mult: 1.55, debuff: { id: 'defDown', chance: 0.55, dur: 2 }, buffAlly: { id: 'critUp', dur: 2 } }
      ],
      lore: '鏡の迷宮から抜け出してきた悪戯女王。現実と夢の境界線を気まぐれにシャッフルする。'
    },
    {
      id: 'e_genesis_angel', name: '終末の聖天使', element: 'light', races: ['god', 'fairy'], role: 'healer', kind: 'normal',
      base: { hp: 4100, atk: 570, def: 315, spd: 122 },
      skills: [
        { slot: 1, name: '天界フェザー', target: 'single', ct: 0, mult: 1.02 },
        { slot: 2, name: '奇跡のリセット', target: 'allyAll', ct: 3, healMult: 1.62, cleanse: 2 }
      ],
      lore: '万象交差点の秩序を保つはずが混沌に染まってしまった大天使。笑顔で仲間を完全蘇生級の光で包み込む。'
    },
    {
      id: 'b_area5', name: '混沌王オムニバス', element: 'none', races: ['dragon', 'god'], role: 'dealer', kind: 'boss',
      base: { hp: 36000, atk: 840, def: 440, spd: 132 },
      skills: [
        { slot: 1, name: '法則破壊拳', target: 'single', ct: 0, mult: 1.18, defPen: 0.20 },
        { slot: 2, name: '五世界ごちゃ弾', target: 'splash', ct: 3, mult: 1.82, ailment: { id: 'curse', chance: 0.55, dur: 2 } },
        { slot: 3, name: '極大はちゃめちゃ', target: 'all', ct: 4, mult: 2.45, debuff: { id: 'defDown', chance: 0.60, dur: 2 } }
      ],
      lore: 'ファンタジー・SF・神話・日常すべてを一つの鍋で煮込んだ結果誕生した混沌王。実は誰よりもこの世界を楽しんでいる。'
    },

    // ========== 通常エリア限定・超低確率乱入敵3種 ==========
    {
      id: 'i_gold_mimic', name: '黄金ミミック', element: 'light', races: ['monster', 'machine'], role: 'supporter', kind: 'intruder',
      base: { hp: 2200, atk: 240, def: 260, spd: 136 },
      skills: [
        { slot: 1, name: 'コインシャワー', target: 'all', ct: 0, mult: 0.85 },
        { slot: 2, name: '大盤振る舞い盾', target: 'self', ct: 3, shieldSelfPct: 0.30, buffSelf: { id: 'evade', dur: 1 } }
      ],
      lore: '通常エリアの空間裂け目から超低確率で乱入してくる動く宝箱。撃破すると大量の万能欠片と高品質装備をばらまく。'
    },
    {
      id: 'i_stray_hero', name: '迷子の勇者', element: 'none', races: ['human'], role: 'dealer', kind: 'intruder',
      base: { hp: 2600, atk: 320, def: 190, spd: 132 },
      skills: [
        { slot: 1, name: 'とりあえず斬', target: 'single', ct: 0, mult: 1.15 },
        { slot: 2, name: '道聞き聖剣', target: 'all', ct: 3, mult: 1.60 }
      ],
      lore: '隣のRPGから地図を逆さに持って迷い込んできた伝説の勇者。道を尋ねるつもりで全力の必殺技を放ってくる。'
    },
    {
      id: 'i_rainbow_drake', name: '七色メタル竜', element: 'wind', races: ['dragon', 'fairy'], role: 'tank', kind: 'intruder',
      base: { hp: 2900, atk: 270, def: 320, spd: 138 },
      skills: [
        { slot: 1, name: 'プリズム尾撃', target: 'splash', ct: 0, mult: 1.00 },
        { slot: 2, name: '極彩オーラ', target: 'self', ct: 3, buffSelf: { id: 'spdUp', dur: 2 }, shieldSelfPct: 0.25 }
      ],
      lore: '虹色に輝く超希少な小型竜。遭遇できたら運気が爆上がりすると噂され、必ず高品質以上の秘宝を落としていく。'
    },

    // ========== 異界総力戦 6属性レイドボス ==========
    {
      id: 'r_fire', name: '紅蓮機イグニオン', element: 'fire', races: ['god', 'machine'], role: 'dealer', kind: 'raid',
      base: { hp: 85000, atk: 540, def: 260, spd: 118 },
      skills: [
        { slot: 1, name: '熔鉄ナックル', target: 'single', ct: 0, mult: 1.15, ailment: { id: 'burn', chance: 0.45, dur: 2 } },
        { slot: 2, name: 'プロミネンス斬', target: 'splash', ct: 2, mult: 1.65, ailment: { id: 'burn', chance: 0.60, dur: 2 } },
        { slot: 3, name: '太陽炉暴走砲', target: 'all', ct: 4, mult: 2.25, debuff: { id: 'defDown', chance: 0.60, dur: 2 } }
      ],
      lore: '太陽のコアを炉心に据えた炎属性レイド機神。圧倒的な火傷と全体熱波に対し、水属性と浄化編成で挑むのが定石。'
    },
    {
      id: 'r_water', name: '深淵竜アビサロス', element: 'water', races: ['dragon', 'monster'], role: 'tank', kind: 'raid',
      base: { hp: 92000, atk: 510, def: 290, spd: 116 },
      skills: [
        { slot: 1, name: '氷結の尾撃', target: 'single', ct: 0, mult: 1.12, ailment: { id: 'freeze', chance: 0.35, dur: 1 } },
        { slot: 2, name: '高圧氷壁', target: 'self', ct: 3, shieldSelfPct: 0.12, buffSelf: { id: 'defUp', dur: 2 } },
        { slot: 3, name: '永久凍土津波', target: 'all', ct: 4, mult: 2.15, debuff: { id: 'spdDown', chance: 0.65, dur: 2 } }
      ],
      lore: '海溝の底で千年眠っていた水属性レイド巨竜。分厚い氷壁と鈍化・凍結のコンボを風属性の高回転火力で砕け。'
    },
    {
      id: 'r_wind', name: '暴風王テンペスタ', element: 'wind', races: ['fairy', 'beast'], role: 'supporter', kind: 'raid',
      base: { hp: 82000, atk: 530, def: 245, spd: 136 },
      skills: [
        { slot: 1, name: '音速鎌鼬', target: 'single', ct: 0, mult: 1.12, ailment: { id: 'bleed', chance: 0.45, dur: 2 } },
        { slot: 2, name: '神速の渦', target: 'self', ct: 2, buffSelf: { id: 'spdUp', dur: 2 }, buffSelf2: { id: 'evade', dur: 1 } },
        { slot: 3, name: '超級タイフーン', target: 'all', ct: 4, mult: 2.18, ailment: { id: 'silence', chance: 0.40, dur: 1 } }
      ],
      lore: '超高速で戦場をかき乱す風属性レイド妖王。見切りと沈黙への対策を整え、炎属性の連撃で一気に焼き払おう。'
    },
    {
      id: 'r_light', name: '審判機セラフィム', element: 'light', races: ['god', 'machine'], role: 'healer', kind: 'raid',
      base: { hp: 88000, atk: 560, def: 270, spd: 122 },
      skills: [
        { slot: 1, name: '裁きの光柱', target: 'single', ct: 0, mult: 1.16 },
        { slot: 2, name: '天界リペア', target: 'self', ct: 3, healMult: 2.5, buffSelf: { id: 'atkUp', dur: 2 } },
        { slot: 3, name: 'ラグナロク光線', target: 'all', ct: 4, mult: 2.35, debuff: { id: 'atkDown', chance: 0.55, dur: 2 } }
      ],
      lore: '自己修復と殲滅光線を併せ持つ光属性レイド天機。闇属性の治癒低下や高貫通バーストで押し切るのが鍵。'
    },
    {
      id: 'r_dark', name: '虚無帝アビス', element: 'dark', races: ['monster', 'god'], role: 'dealer', kind: 'raid',
      base: { hp: 90000, atk: 590, def: 265, spd: 124 },
      skills: [
        { slot: 1, name: '深淵の一閃', target: 'single', ct: 0, mult: 1.18, ailment: { id: 'curse', chance: 0.45, dur: 2 } },
        { slot: 2, name: '絶望の瘴気', target: 'all', ct: 3, mult: 1.55, ailment: { id: 'poison', chance: 0.60, dur: 2 }, debuff: { id: 'healDown', chance: 0.55, dur: 2 } },
        { slot: 3, name: 'ブラックホール', target: 'all', ct: 4, mult: 2.40, defPen: 0.25 }
      ],
      lore: 'あらゆる状態異常をばらまく闇属性レイド魔皇帝。光属性の浄化＆シールド部隊を軸に複数部隊で撃破を狙え。'
    },
    {
      id: 'r_none', name: '星竜オメガコア', element: 'none', races: ['dragon', 'machine'], role: 'dealer', kind: 'raid',
      base: { hp: 105000, atk: 610, def: 300, spd: 126 },
      skills: [
        { slot: 1, name: '次元崩壊爪', target: 'single', ct: 0, mult: 1.20, defPen: 0.20 },
        { slot: 2, name: '重力圧縮波', target: 'splash', ct: 3, mult: 1.78, debuff: { id: 'defDown', chance: 0.60, dur: 2 } },
        { slot: 3, name: 'オメガ混沌砲', target: 'all', ct: 4, mult: 2.50, ailment: { id: 'bleed', chance: 0.55, dur: 2 } }
      ],
      lore: '弱点属性を持たない無属性レイド星竜。純粋な育成の到達点・バディリンク・3部隊リレー戦術のすべてが試される。'
    }
  ];

  HW.getEnemyDef = function (id) {
    return HW.ENEMIES.find((e) => e.id === id) || HW.ENEMIES[0];
  };
})();
