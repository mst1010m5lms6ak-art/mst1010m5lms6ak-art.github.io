(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * 装備10セット（通常8セット + 闘技場限定2セット）× 4部位 ＝ 40種
   * 装備強化無し・ランダムサブオプ無し。純粋に品質(1〜100%)倍率とセット効果で勝負。
   */
  HW.EQUIP_SETS = [
    {
      id: 'set_crimson',
      name: '紅蓮轟炎',
      arenaOnly: false,
      color: '#ff5744',
      bonus2: { desc: '攻撃力+14%', mod: { atkPct: 0.14 } },
      bonus4: { desc: '与ダメージ+18%、会心ダメ+18%', mod: { dmgUp: 0.18, critDmg: 0.18 } },
      lore: '異界の火山鍛冶炉と宇宙ロケットの推進材を混ぜて鍛え上げた熱血装備群。着るだけで気温が3度上がる。'
    },
    {
      id: 'set_aegis',
      name: '蒼穹要塞',
      arenaOnly: false,
      color: '#38bdf8',
      bonus2: { desc: '最大HP+15%、防御力+12%', mod: { hpPct: 0.15, defPct: 0.12 } },
      bonus4: { desc: '被ダメ-14%、WAVE開始時HP16%盾', mod: { dmgRed: 0.14, waveShieldPct: 0.16 } },
      lore: '天空城の城壁と最新型装甲車のプレートを溶接した超頑丈装備。見た目より軽く肩が凝らないと評判。'
    },
    {
      id: 'set_gale',
      name: '疾風電光',
      arenaOnly: false,
      color: '#35e58f',
      bonus2: { desc: '速度+15', mod: { spdFlat: 15 } },
      bonus4: { desc: '速度+15、開戦時行動ゲージ+25%', mod: { spdFlat: 15, startGauge: 0.25 } },
      lore: '妖精の羽根とリニアモーターのコイルを編み込んだ超加速装備。立ち止まると少しそわそわする。'
    },
    {
      id: 'set_photon',
      name: '閃光必殺',
      arenaOnly: false,
      color: '#ffd54a',
      bonus2: { desc: '会心率+15%', mod: { crit: 0.15 } },
      bonus4: { desc: '会心ダメージ+42%、攻撃力+10%', mod: { critDmg: 0.42, atkPct: 0.10 } },
      lore: '光学レーザーの照準器に神話の黄金レンズを載せた会心特化装備。当たればだいたい光り輝く。'
    },
    {
      id: 'set_blossom',
      name: '聖樹慈愛',
      arenaOnly: false,
      color: '#4ade80',
      bonus2: { desc: '与回復量+18%、最大HP+10%', mod: { healOutPct: 0.18, hpPct: 0.10 } },
      bonus4: { desc: '与回復量+24%、毎行動HP7%再生', mod: { healOutPct: 0.24, turnRegenPct: 0.07 } },
      lore: '世界樹の若葉と高級ハーブティーの抽出液で仕立てた癒やし装備。戦場でもいい香りが漂う。'
    },
    {
      id: 'set_abyss',
      name: '深淵呪毒',
      arenaOnly: false,
      color: '#b668ff',
      bonus2: { desc: '効果命中+25%、攻撃力+10%', mod: { effHit: 0.25, atkPct: 0.10 } },
      bonus4: { desc: '状態異常中の敵へ与ダメ+30%', mod: { ailmentBonus: 0.30 } },
      lore: '魔王城の地下蔵で300年熟成された呪具にサイバー暗号を刻んだ装備。扱う者の笑い声が低くなる。'
    },
    {
      id: 'set_vamp',
      name: '鮮血輪廻',
      arenaOnly: false,
      color: '#ff3e9d',
      bonus2: { desc: '吸血率+14%、最大HP+10%', mod: { lifesteal: 0.14, hpPct: 0.10 } },
      bonus4: { desc: '吸血率+16%、攻撃力+18%', mod: { lifesteal: 0.16, atkPct: 0.18 } },
      lore: '吸血鬼の晩餐服と自動輸血ナノマシンが合体した異色装備。殴れば殴るほど顔色が良くなる。'
    },
    {
      id: 'set_chrono',
      name: '時空歯車',
      arenaOnly: false,
      color: '#2de2e6',
      bonus2: { desc: '速度+10、異常耐性+18%', mod: { spdFlat: 10, res: 0.18 } },
      bonus4: { desc: '行動時35%で技CT1短縮、与ダメ+12%', mod: { extraCtChance: 0.35, dmgUp: 0.12 } },
      lore: '壊れた懐中時計と量子クロックを無理やり噛み合わせた装備。たまに昨日食べたメニューを思い出す。'
    },
    {
      id: 'set_gladiator',
      name: '覇王闘神',
      arenaOnly: true,
      color: '#ff9248',
      bonus2: { desc: '攻撃力+18%、防御貫通+12%', mod: { atkPct: 0.18, defPen: 0.12 } },
      bonus4: { desc: '追撃率+22%、会心率+14%、与ダメ+16%', mod: { extraHitChance: 0.22, crit: 0.14, dmgUp: 0.16 } },
      lore: '異界闘技場の頂点に立つ者だけに許される覇者の礼装。観客の歓声エネルギーをそのまま火力へ変換する。'
    },
    {
      id: 'set_paradox',
      name: '万象混沌',
      arenaOnly: true,
      color: '#e879f9',
      bonus2: { desc: '全基礎ステ+10%、速度+8', mod: { hpPct: 0.10, atkPct: 0.10, defPct: 0.10, spdFlat: 8 } },
      bonus4: { desc: '戦闘中1度不屈(HP30%)、味方与ダメ+12%', mod: { guts: 0.30, teamDmgUp: 0.12 } },
      lore: 'はちゃめちゃ世界のあらゆる法則を一つに封じ込めた闘技場秘宝。装備すると理不尽すら味方につく。'
    }
  ];

  const SLOT_NAMES = {
    set_crimson: { weapon: '紅蓮大剣', armor: '轟炎外殻', accessory: '灼熱リング', core: '炎獄リアクタ' },
    set_aegis: { weapon: '蒼穹戦盾', armor: '要塞重鎧', accessory: '守護腕輪', core: '蒼天ジェネ' },
    set_gale: { weapon: '疾風双刃', armor: '電光スーツ', accessory: '羽根ブーツ', core: 'ターボ核' },
    set_photon: { weapon: '閃光ライフル', armor: '光学マント', accessory: '必殺レンズ', core: '光子プリズム' },
    set_blossom: { weapon: '聖樹の杖', armor: '慈愛ローブ', accessory: '花の首飾り', core: '生命の種核' },
    set_abyss: { weapon: '深淵の大鎌', armor: '呪紋コート', accessory: '悪夢ブローチ', core: '虚無セル' },
    set_vamp: { weapon: '鮮血レイピア', armor: '紅月ドレス', accessory: '輪廻ピアス', core: '紅血ポンプ' },
    set_chrono: { weapon: '時空の針剣', armor: '歯車ジャケット', accessory: '懐中クロノ', core: '量子振り子' },
    set_gladiator: { weapon: '覇王の戦斧', armor: '闘神プレート', accessory: '王者の冠輪', core: '闘気エンジン' },
    set_paradox: { weapon: '万象ブレード', armor: '混沌オーバー', accessory: '歪みの指輪', core: '世界樹コア' }
  };

  const SLOT_BASE = {
    weapon: { atk: 110, hp: 160, def: 15, spd: 3, crit: 0.03 },
    armor: { atk: 18, hp: 520, def: 78, spd: 0, crit: 0 },
    accessory: { atk: 58, hp: 260, def: 34, spd: 8, crit: 0.04 },
    core: { atk: 68, hp: 340, def: 42, spd: 6, crit: 0.02 }
  };

  HW.EQUIP_TEMPLATES = [];
  HW.EQUIP_SETS.forEach((set) => {
    const names = SLOT_NAMES[set.id];
    const arenaBoost = set.arenaOnly ? 1.15 : 1.0;
    HW.EQUIP_SLOTS.forEach((slot) => {
      const b = SLOT_BASE[slot.id];
      HW.EQUIP_TEMPLATES.push({
        id: set.id + '_' + slot.id,
        setId: set.id,
        setName: set.name,
        slot: slot.id,
        slotName: slot.name,
        name: names[slot.id],
        arenaOnly: set.arenaOnly,
        base: {
          atk: Math.round(b.atk * arenaBoost),
          hp: Math.round(b.hp * arenaBoost),
          def: Math.round(b.def * arenaBoost),
          spd: Math.round(b.spd * arenaBoost),
          crit: Number((b.crit * arenaBoost).toFixed(3))
        },
        lore: set.lore
      });
    });
  });

  HW.getEquipSet = function (setId) {
    return HW.EQUIP_SETS.find((s) => s.id === setId) || HW.EQUIP_SETS[0];
  };

  HW.getEquipTemplate = function (tplId) {
    return HW.EQUIP_TEMPLATES.find((t) => t.id === tplId) || HW.EQUIP_TEMPLATES[0];
  };

  /**
   * 品質(1〜100%)による装備実ステータス算出（強化なし・純粋品質スケール）
   * 品質1% = 0.65倍、品質100%「極」 = 1.60倍（99%から100%への特別ボーナス込み）
   */
  HW.calcEquipStats = function (item) {
    const tpl = HW.getEquipTemplate(item.tplId);
    const q = Math.max(1, Math.min(100, Math.round(item.quality || 50)));
    const mult = q >= 100 ? 1.6 : 0.65 + (q / 100) * 0.85;
    return {
      atk: Math.round(tpl.base.atk * mult),
      hp: Math.round(tpl.base.hp * mult),
      def: Math.round(tpl.base.def * mult),
      spd: Math.round(tpl.base.spd * (0.75 + (q / 100) * 0.5)),
      crit: Number((tpl.base.crit * mult).toFixed(3))
    };
  };

  HW.getEquipSellValue = function (item) {
    const tpl = HW.getEquipTemplate(item.tplId);
    const q = item.quality || 50;
    const base = tpl.arenaOnly ? 420 : 180;
    return Math.round(base * (0.6 + (q / 100) * 1.4));
  };
})();
