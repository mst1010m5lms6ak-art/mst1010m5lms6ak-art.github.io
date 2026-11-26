(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  function fallbackDeepFreeze(obj, seen) {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      return obj;
    }
    const visited = seen || new WeakSet();
    if (visited.has(obj)) {
      return obj;
    }
    visited.add(obj);
    const keys = Object.getOwnPropertyNames(obj);
    for (let i = 0; i < keys.length; i += 1) {
      const val = obj[keys[i]];
      if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
        fallbackDeepFreeze(val, visited);
      }
    }
    return Object.freeze(obj);
  }

  function makeTelegraph(skillName, targetType, chargeTurns, warningText) {
    return {
      enabled: true,
      skillName,
      targetType,
      chargeTurns,
      gaugeThreshold: 100,
      warningText
    };
  }

  const ENEMY_LIST = [
    // Area 1
    {
      id: 'e1_kagehei',
      name: '夜霧の影兵',
      areaId: 'area_1',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 520, atk: 95, def: 45, spd: 106, crit: 8 },
      skills: [
        {
          id: 'esk_e1_kagehei_1',
          name: '影薙ぎ',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.35,
          telegraph: null,
          effects: [{ type: 'damage', ratio: 1.35 }]
        }
      ]
    },
    {
      id: 'e1_mayoibi',
      name: '提灯の迷い火',
      areaId: 'area_1',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 460, atk: 88, def: 38, spd: 112, crit: 10 },
      skills: [
        {
          id: 'esk_e1_mayoibi_1',
          name: '鬼火の揺らめき',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.05,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.05 },
            { type: 'debuff', stat: 'burn', value: 1, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e1_joukyaku',
      name: '無言の乗客',
      areaId: 'area_1',
      isBoss: false,
      bossType: null,
      role: 'サポーター',
      baseStats: { hp: 550, atk: 84, def: 52, spd: 98, crit: 6 },
      skills: [
        {
          id: 'esk_e1_joukyaku_1',
          name: '虚ろな凝視',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.15,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.15 },
            { type: 'debuff', stat: 'atkDown', value: 15, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e1_ishi_bannin',
      name: '石灯籠の番人',
      areaId: 'area_1',
      isBoss: false,
      bossType: null,
      role: 'タンク',
      baseStats: { hp: 680, atk: 74, def: 78, spd: 88, crit: 5 },
      skills: [
        {
          id: 'esk_e1_ishi_bannin_1',
          name: '石壁の構え',
          targetType: '単体',
          side: 'self',
          cooldown: 3,
          powerRatio: 0,
          telegraph: null,
          effects: [
            { type: 'buff', stat: 'defUp', value: 30, duration: 2 },
            { type: 'buff', stat: 'taunt', value: 1, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'b1_tsukumo',
      name: '踏切の番影・九十九',
      areaId: 'area_1',
      isBoss: true,
      bossType: 'mid',
      role: 'サポーター',
      baseStats: { hp: 2800, atk: 135, def: 75, spd: 108, crit: 10 },
      skills: [
        {
          id: 'esk_b1_tsukumo_1',
          name: '遮断の赤鐘',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.15,
          telegraph: makeTelegraph('遮断の赤鐘', '全体', 2, '敵全体攻撃の予兆：遮断の赤鐘'),
          effects: [
            { type: 'damage', ratio: 1.15 },
            { type: 'debuff', stat: 'spdDown', value: 15, duration: 2 }
          ]
        },
        {
          id: 'esk_b1_tsukumo_2',
          name: '無音の警報',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.65,
          telegraph: makeTelegraph('無音の警報', '単体', 1, '単体強打の予兆：無音の警報'),
          effects: [
            { type: 'damage', ratio: 1.65 },
            { type: 'debuff', stat: 'defDown', value: 20, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'b1_ekimori',
      name: '幽駅主・白無垢の駅守',
      areaId: 'area_1',
      isBoss: true,
      bossType: 'area',
      role: 'ディーラー',
      baseStats: { hp: 4600, atk: 155, def: 92, spd: 114, crit: 12 },
      skills: [
        {
          id: 'esk_b1_ekimori_1',
          name: '終電なき夜行',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.30,
          telegraph: makeTelegraph('終電なき夜行', '全体', 2, '敵全体重撃の予兆：終電なき夜行'),
          effects: [
            { type: 'damage', ratio: 1.30 },
            { type: 'dispel', count: 1 }
          ]
        },
        {
          id: 'esk_b1_ekimori_2',
          name: '朱灯の魂送り',
          targetType: '単体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.90,
          telegraph: makeTelegraph('朱灯の魂送り', '単体', 1, '単体特大攻撃の予兆：朱灯の魂送り'),
          effects: [
            { type: 'damage', ratio: 1.90 },
            { type: 'selfShield', ratio: 0.15, duration: 2 }
          ]
        },
        {
          id: 'esk_b1_ekimori_3',
          name: '静寂の改札',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.25,
          telegraph: makeTelegraph('静寂の改札', '範囲', 1, '範囲攻撃の予兆：静寂の改札'),
          effects: [
            { type: 'damage', ratio: 1.25 },
            { type: 'gaugeDown', value: 20 }
          ]
        }
      ]
    },

    // Area 2
    {
      id: 'e2_shorei',
      name: '紙片の舞う書霊',
      areaId: 'area_2',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 740, atk: 142, def: 62, spd: 116, crit: 12 },
      skills: [
        {
          id: 'esk_e2_shorei_1',
          name: '墨文字の矢',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.40,
          telegraph: null,
          effects: [{ type: 'damage', ratio: 1.40 }]
        }
      ]
    },
    {
      id: 'e2_eishi',
      name: '錆びた甲冑の衛士',
      areaId: 'area_2',
      isBoss: false,
      bossType: null,
      role: 'タンク',
      baseStats: { hp: 980, atk: 128, def: 95, spd: 94, crit: 7 },
      skills: [
        {
          id: 'esk_e2_eishi_1',
          name: '重鉄の叩きつけ',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.35,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.35 },
            { type: 'debuff', stat: 'defDown', value: 20, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e2_shokudai',
      name: '硝子の燭台影',
      areaId: 'area_2',
      isBoss: false,
      bossType: null,
      role: 'ヒーラー',
      baseStats: { hp: 810, atk: 118, def: 70, spd: 110, crit: 8 },
      skills: [
        {
          id: 'esk_e2_shokudai_1',
          name: '琥珀の灯',
          targetType: '単体',
          side: 'ally',
          cooldown: 3,
          powerRatio: 1.40,
          telegraph: null,
          effects: [
            { type: 'heal', ratio: 1.40 },
            { type: 'buff', stat: 'atkUp', value: 20, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e2_karasu',
      name: '時計仕掛けの鴉',
      areaId: 'area_2',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 690, atk: 148, def: 56, spd: 132, crit: 16 },
      skills: [
        {
          id: 'esk_e2_karasu_1',
          name: '急降下の嘴',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.45,
          telegraph: null,
          effects: [{ type: 'damage', ratio: 1.45 }]
        }
      ]
    },
    {
      id: 'b2_yakatamori',
      name: '琥珀時計の館守',
      areaId: 'area_2',
      isBoss: true,
      bossType: 'mid',
      role: 'サポーター',
      baseStats: { hp: 4900, atk: 195, def: 108, spd: 114, crit: 12 },
      skills: [
        {
          id: 'esk_b2_yakatamori_1',
          name: '長針の裁断',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.75,
          telegraph: makeTelegraph('長針の裁断', '単体', 1, '防御貫通攻撃の予兆：長針の裁断'),
          effects: [{ type: 'damage', ratio: 1.75, defIgnore: 0.30 }]
        },
        {
          id: 'esk_b2_yakatamori_2',
          name: '逆行する秒針',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 0,
          telegraph: makeTelegraph('逆行する秒針', '全体', 2, '速度操作の予兆：逆行する秒針'),
          effects: [
            { type: 'allyGaugeUp', value: 20 },
            { type: 'debuff', stat: 'spdDown', value: 15, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'b2_kifujin',
      name: '黄昏館の主・時停めの貴婦人',
      areaId: 'area_2',
      isBoss: true,
      bossType: 'area',
      role: 'ディーラー',
      baseStats: { hp: 7800, atk: 225, def: 122, spd: 120, crit: 15 },
      skills: [
        {
          id: 'esk_b2_kifujin_1',
          name: '零時の鐘鳴り',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.35,
          telegraph: makeTelegraph('零時の鐘鳴り', '全体', 2, '全体気絶攻撃の予兆：零時の鐘鳴り'),
          effects: [
            { type: 'damage', ratio: 1.35 },
            { type: 'debuff', stat: 'stun', value: 1, duration: 1, chance: 0.35 }
          ]
        },
        {
          id: 'esk_b2_kifujin_2',
          name: '琥珀の封緘',
          targetType: '単体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.95,
          telegraph: makeTelegraph('琥珀の封緘', '単体', 1, '単体強打の予兆：琥珀の封緘'),
          effects: [
            { type: 'damage', ratio: 1.95 },
            { type: 'debuff', stat: 'healDown', value: 40, duration: 2 }
          ]
        },
        {
          id: 'esk_b2_kifujin_3',
          name: '黄昏の幕引き',
          targetType: '単体',
          side: 'self',
          cooldown: 3,
          powerRatio: 0,
          telegraph: makeTelegraph('黄昏の幕引き', '単体', 1, '自己強化の予兆：黄昏の幕引き'),
          effects: [
            { type: 'buff', stat: 'atkUp', value: 25, duration: 2 },
            { type: 'buff', stat: 'critUp', value: 20, duration: 2 }
          ]
        }
      ]
    },

    // Area 3
    {
      id: 'e3_kansokuki',
      name: '巡回用観測機',
      areaId: 'area_3',
      isBoss: false,
      bossType: null,
      role: 'サポーター',
      baseStats: { hp: 1050, atk: 185, def: 88, spd: 122, crit: 14 },
      skills: [
        {
          id: 'esk_e3_kansokuki_1',
          name: '照準レーザー',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.35,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.35 },
            { type: 'debuff', stat: 'vuln', value: 20, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e3_haguruma',
      name: '錆纏う歯車兵',
      areaId: 'area_3',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 1220, atk: 178, def: 104, spd: 106, crit: 11 },
      skills: [
        {
          id: 'esk_e3_haguruma_1',
          name: '回転刃連撃',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.30,
          telegraph: null,
          effects: [{ type: 'damage', ratio: 0.65, hits: 2 }]
        }
      ]
    },
    {
      id: 'e3_hebi',
      name: '配電線の蛇影',
      areaId: 'area_3',
      isBoss: false,
      bossType: null,
      role: 'サポーター',
      baseStats: { hp: 1020, atk: 172, def: 82, spd: 124, crit: 12 },
      skills: [
        {
          id: 'esk_e3_hebi_1',
          name: '漏電放電',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.15,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.15 },
            { type: 'debuff', stat: 'spdDown', value: 15, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e3_shuufuku',
      name: '旧型修復端末',
      areaId: 'area_3',
      isBoss: false,
      bossType: null,
      role: 'ヒーラー',
      baseStats: { hp: 1300, atk: 145, def: 112, spd: 100, crit: 6 },
      skills: [
        {
          id: 'esk_e3_shuufuku_1',
          name: '予備電源供給',
          targetType: '全体',
          side: 'ally',
          cooldown: 3,
          powerRatio: 0.90,
          telegraph: null,
          effects: [
            { type: 'heal', ratio: 0.90 },
            { type: 'shield', ratio: 0.12, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'b3_zeroshiki',
      name: '重装甲番兵・零式鉄塊',
      areaId: 'area_3',
      isBoss: true,
      bossType: 'mid',
      role: 'タンク',
      baseStats: { hp: 7600, atk: 255, def: 155, spd: 105, crit: 12 },
      skills: [
        {
          id: 'esk_b3_zeroshiki_1',
          name: '油圧粉砕撃',
          targetType: '単体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 2.00,
          telegraph: makeTelegraph('油圧粉砕撃', '単体', 1, '超重撃スタンの予兆：油圧粉砕撃'),
          effects: [
            { type: 'damage', ratio: 2.00 },
            { type: 'debuff', stat: 'stun', value: 1, duration: 1 }
          ]
        },
        {
          id: 'esk_b3_zeroshiki_2',
          name: '過負荷放電',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.40,
          telegraph: makeTelegraph('過負荷放電', '全体', 2, '全体雷撃の予兆：過負荷放電'),
          effects: [{ type: 'damage', ratio: 1.40 }]
        }
      ]
    },
    {
      id: 'b3_kyojin',
      name: '朽都の統括機・蒼炉の巨神',
      areaId: 'area_3',
      isBoss: true,
      bossType: 'area',
      role: 'タンク',
      baseStats: { hp: 12400, atk: 285, def: 168, spd: 112, crit: 14 },
      skills: [
        {
          id: 'esk_b3_kyojin_1',
          name: '炉心解放プロトコル',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.55,
          telegraph: makeTelegraph('炉心解放プロトコル', '全体', 2, '全体特大攻撃の予兆：炉心解放プロトコル'),
          effects: [
            { type: 'damage', ratio: 1.55 },
            { type: 'selfDmgDown', value: 25, duration: 2 }
          ]
        },
        {
          id: 'esk_b3_kyojin_2',
          name: '高圧磁気拘束',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.35,
          telegraph: makeTelegraph('高圧磁気拘束', '範囲', 1, '範囲遅延攻撃の予兆：高圧磁気拘束'),
          effects: [
            { type: 'damage', ratio: 1.35 },
            { type: 'gaugeDown', value: 50 }
          ]
        },
        {
          id: 'esk_b3_kyojin_3',
          name: '緊急修復稼働',
          targetType: '単体',
          side: 'self',
          cooldown: 4,
          powerRatio: 0,
          telegraph: makeTelegraph('緊急修復稼働', '単体', 2, '自己修復の予兆：緊急修復稼働'),
          effects: [
            { type: 'selfHealPct', ratio: 0.15 },
            { type: 'cleanseAll' }
          ]
        }
      ]
    },

    // Area 4
    {
      id: 'e4_seirei',
      name: '星雫の精霊',
      areaId: 'area_4',
      isBoss: false,
      bossType: null,
      role: 'ヒーラー',
      baseStats: { hp: 1480, atk: 215, def: 115, spd: 120, crit: 10 },
      skills: [
        {
          id: 'esk_e4_seirei_1',
          name: '星光の癒し',
          targetType: '全体',
          side: 'ally',
          cooldown: 3,
          powerRatio: 1.15,
          telegraph: null,
          effects: [{ type: 'heal', ratio: 1.15 }]
        }
      ]
    },
    {
      id: 'e4_sekizo',
      name: '白亜の石像兵',
      areaId: 'area_4',
      isBoss: false,
      bossType: null,
      role: 'タンク',
      baseStats: { hp: 1820, atk: 220, def: 148, spd: 98, crit: 8 },
      skills: [
        {
          id: 'esk_e4_sekizo_1',
          name: '神殿守護撃',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.45,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.45 },
            { type: 'selfDefUp', value: 25, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e4_amagumo',
      name: '雨雲の漂流影',
      areaId: 'area_4',
      isBoss: false,
      bossType: null,
      role: 'サポーター',
      baseStats: { hp: 1420, atk: 225, def: 108, spd: 126, crit: 13 },
      skills: [
        {
          id: 'esk_e4_amagumo_1',
          name: '冷雨の帳',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.00,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.00 },
            { type: 'debuff', stat: 'critDown', value: 15, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e4_shashu',
      name: '流星片の射手',
      areaId: 'area_4',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 1360, atk: 245, def: 102, spd: 134, crit: 18 },
      skills: [
        {
          id: 'esk_e4_shashu_1',
          name: '星矢連射',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.65,
          telegraph: null,
          effects: [{ type: 'damage', ratio: 0.55, hits: 3 }]
        }
      ]
    },
    {
      id: 'b4_tenbin',
      name: '星海衛士・蒼穹の天秤',
      areaId: 'area_4',
      isBoss: true,
      bossType: 'mid',
      role: 'ディーラー',
      baseStats: { hp: 11200, atk: 320, def: 175, spd: 122, crit: 16 },
      skills: [
        {
          id: 'esk_b4_tenbin_1',
          name: '星墜の裁き',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.45,
          telegraph: makeTelegraph('星墜の裁き', '全体', 2, '全体貫通攻撃の予兆：星墜の裁き'),
          effects: [{ type: 'damage', ratio: 1.45, defIgnore: 0.25 }]
        },
        {
          id: 'esk_b4_tenbin_2',
          name: '天秤の均衡',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.35,
          telegraph: makeTelegraph('天秤の均衡', '範囲', 1, 'バフ連動攻撃の予兆：天秤の均衡'),
          effects: [{ type: 'damage', ratio: 1.35, bonusPerBuff: 0.15 }]
        }
      ]
    },
    {
      id: 'b4_tenkyuugi',
      name: '星海神殿の守護者・永夜の天球儀',
      areaId: 'area_4',
      isBoss: true,
      bossType: 'area',
      role: 'サポーター',
      baseStats: { hp: 18500, atk: 355, def: 192, spd: 124, crit: 16 },
      skills: [
        {
          id: 'esk_b4_tenkyuugi_1',
          name: '銀河の奔流',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.60,
          telegraph: makeTelegraph('銀河の奔流', '全体', 2, '全体極大攻撃の予兆：銀河の奔流'),
          effects: [
            { type: 'damage', ratio: 1.60 },
            { type: 'debuff', stat: 'burn', value: 1, duration: 2 }
          ]
        },
        {
          id: 'esk_b4_tenkyuugi_2',
          name: '星辰の逆転',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 0,
          telegraph: makeTelegraph('星辰の逆転', '全体', 1, '全体弱体・加速の予兆：星辰の逆転'),
          effects: [
            { type: 'debuff', stat: 'atkDown', value: 20, duration: 2 },
            { type: 'selfSpdUp', value: 25, duration: 2 }
          ]
        },
        {
          id: 'esk_b4_tenkyuugi_3',
          name: '白亜の聖壁',
          targetType: '単体',
          side: 'self',
          cooldown: 4,
          powerRatio: 0,
          telegraph: makeTelegraph('白亜の聖壁', '単体', 2, '防御障壁・反撃の予兆：白亜の聖壁'),
          effects: [
            { type: 'selfShield', ratio: 0.18, duration: 2 },
            { type: 'buff', stat: 'counter', value: 1, duration: 2 }
          ]
        }
      ]
    },

    // Area 5
    {
      id: 'e5_kesshouhei',
      name: '境界の結晶兵',
      areaId: 'area_5',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 2050, atk: 305, def: 162, spd: 122, crit: 16 },
      skills: [
        {
          id: 'esk_e5_kesshouhei_1',
          name: '結晶衝',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 1.65,
          telegraph: null,
          effects: [{ type: 'damage', ratio: 1.65 }]
        }
      ]
    },
    {
      id: 'e5_eishousha',
      name: '残響の詠唱者',
      areaId: 'area_5',
      isBoss: false,
      bossType: null,
      role: 'サポーター',
      baseStats: { hp: 1850, atk: 290, def: 140, spd: 128, crit: 15 },
      skills: [
        {
          id: 'esk_e5_eishousha_1',
          name: '深層共鳴波',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.15,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.15 },
            { type: 'debuff', stat: 'defDown', value: 20, duration: 2 }
          ]
        }
      ]
    },
    {
      id: 'e5_kanshiei',
      name: '白夜の監視影',
      areaId: 'area_5',
      isBoss: false,
      bossType: null,
      role: 'ディーラー',
      baseStats: { hp: 1920, atk: 295, def: 145, spd: 136, crit: 20 },
      skills: [
        {
          id: 'esk_e5_kanshiei_1',
          name: '虚無の閃光',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.25,
          telegraph: null,
          effects: [
            { type: 'damage', ratio: 1.25 },
            { type: 'critGaugeDown', value: 20 }
          ]
        }
      ]
    },
    {
      id: 'e5_goeitai',
      name: '聖域の護衛体',
      areaId: 'area_5',
      isBoss: false,
      bossType: null,
      role: 'タンク',
      baseStats: { hp: 2400, atk: 260, def: 195, spd: 106, crit: 10 },
      skills: [
        {
          id: 'esk_e5_goeitai_1',
          name: '聖域障壁',
          targetType: '全体',
          side: 'ally',
          cooldown: 3,
          powerRatio: 0,
          telegraph: null,
          effects: [{ type: 'buff', stat: 'dmgDown', value: 20, duration: 2 }]
        }
      ]
    },
    {
      id: 'b5_souken',
      name: '境界の看守・黒曜の双剣',
      areaId: 'area_5',
      isBoss: true,
      bossType: 'mid',
      role: 'ディーラー',
      baseStats: { hp: 16500, atk: 410, def: 210, spd: 132, crit: 22 },
      skills: [
        {
          id: 'esk_b5_souken_1',
          name: '双界断絶斬',
          targetType: '単体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 2.50,
          telegraph: makeTelegraph('双界断絶斬', '単体', 1, '連続特大斬撃の予兆：双界断絶斬'),
          effects: [{ type: 'damage', ratio: 1.25, hits: 2 }]
        },
        {
          id: 'esk_b5_souken_2',
          name: '記憶の風化',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.45,
          telegraph: makeTelegraph('記憶の風化', '全体', 2, '全体遅延攻撃の予兆：記憶の風化'),
          effects: [
            { type: 'damage', ratio: 1.45 },
            { type: 'gaugeDown', value: 25 }
          ]
        }
      ]
    },
    {
      id: 'b5_zankyou',
      name: '深層聖域の調律者・無垢なる残響',
      areaId: 'area_5',
      isBoss: true,
      bossType: 'area',
      role: 'ディーラー',
      baseStats: { hp: 26000, atk: 450, def: 230, spd: 130, crit: 20 },
      skills: [
        {
          id: 'esk_b5_zankyou_1',
          name: '世界残響・終焉の調べ',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.70,
          telegraph: makeTelegraph('世界残響・終焉の調べ', '全体', 2, '終焉全体攻撃の予兆：世界残響・終焉の調べ'),
          effects: [
            { type: 'damage', ratio: 1.70 },
            { type: 'dispelAll' },
            { type: 'debuff', stat: 'healDown', value: 40, duration: 2 }
          ]
        },
        {
          id: 'esk_b5_zankyou_2',
          name: '境界収束の光刃',
          targetType: '単体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 2.30,
          targetPolicy: 'highest_atk',
          telegraph: makeTelegraph('境界収束の光刃', '単体', 1, '最高攻撃力狙撃の予兆：境界収束の光刃'),
          effects: [{ type: 'damage', ratio: 2.30, targetPolicy: 'highest_atk' }]
        },
        {
          id: 'esk_b5_zankyou_3',
          name: '虚白の再生',
          targetType: '単体',
          side: 'self',
          cooldown: 4,
          powerRatio: 0,
          telegraph: makeTelegraph('虚白の再生', '単体', 2, '自己再生強化の予兆：虚白の再生'),
          effects: [
            { type: 'selfHealPct', ratio: 0.12 },
            { type: 'cleanseAll' },
            { type: 'selfAtkUp', value: 20, duration: 2 },
            { type: 'selfSpdUp', value: 15, duration: 2 }
          ]
        }
      ]
    }
  ];

  const ENEMIES = {};
  for (let i = 0; i < ENEMY_LIST.length; i += 1) {
    ENEMIES[ENEMY_LIST[i].id] = ENEMY_LIST[i];
  }

  function buildStageWaves(stageNum, pool, midBossId, areaBossId) {
    const E0 = pool[0];
    const E1 = pool[1];
    const E2 = pool[2];
    const E3 = pool[3];

    if (stageNum === 1) {
      return [
        { waveNum: 1, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.90, enemyIds: [E0, E0] },
        { waveNum: 2, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.95, enemyIds: [E0, E1] },
        { waveNum: 3, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.00, enemyIds: [E0, E2, E1] },
        { waveNum: 4, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.05, enemyIds: [E1, E2, E3] },
        { waveNum: 5, isEliteWave: true, isBossWave: false, bossId: null, scale: 1.15, enemyIds: [E0, E1, E2, E3] }
      ];
    }
    if (stageNum === 2) {
      return [
        { waveNum: 1, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.92, enemyIds: [E0, E1] },
        { waveNum: 2, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.97, enemyIds: [E0, E2, E3] },
        { waveNum: 3, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.02, enemyIds: [E1, E1, E2] },
        { waveNum: 4, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.07, enemyIds: [E2, E3, E0] },
        { waveNum: 5, isEliteWave: true, isBossWave: false, bossId: null, scale: 1.16, enemyIds: [E3, E1, E2, E0] }
      ];
    }
    if (stageNum === 3) {
      return [
        { waveNum: 1, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.95, enemyIds: [E0, E1, E2] },
        { waveNum: 2, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.00, enemyIds: [E1, E2, E3] },
        { waveNum: 3, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.04, enemyIds: [E0, E0, E3] },
        { waveNum: 4, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.08, enemyIds: [E1, E2, E2, E3] },
        { waveNum: 5, isEliteWave: true, isBossWave: true, bossId: midBossId, scale: 1.00, enemyIds: [midBossId, E0, E3] }
      ];
    }
    if (stageNum === 4) {
      return [
        { waveNum: 1, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.96, enemyIds: [E1, E2, E0] },
        { waveNum: 2, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.01, enemyIds: [E2, E3, E1] },
        { waveNum: 3, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.06, enemyIds: [E0, E1, E2, E3] },
        { waveNum: 4, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.10, enemyIds: [E1, E1, E3, E2] },
        { waveNum: 5, isEliteWave: true, isBossWave: false, bossId: null, scale: 1.18, enemyIds: [E2, E3, E0, E1] }
      ];
    }
    if (stageNum === 5) {
      return [
        { waveNum: 1, isEliteWave: false, isBossWave: false, bossId: null, scale: 0.98, enemyIds: [E0, E2, E3] },
        { waveNum: 2, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.03, enemyIds: [E1, E2, E3, E0] },
        { waveNum: 3, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.08, enemyIds: [E2, E2, E3, E1] },
        { waveNum: 4, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.12, enemyIds: [E0, E1, E3, E3] },
        { waveNum: 5, isEliteWave: true, isBossWave: false, bossId: null, scale: 1.20, enemyIds: [E3, E2, E1, E0] }
      ];
    }
    return [
      { waveNum: 1, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.00, enemyIds: [E0, E1, E2] },
      { waveNum: 2, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.05, enemyIds: [E1, E2, E3, E0] },
      { waveNum: 3, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.10, enemyIds: [E2, E3, E0, E1] },
      { waveNum: 4, isEliteWave: false, isBossWave: false, bossId: null, scale: 1.15, enemyIds: [E3, E2, E1, E0] },
      { waveNum: 5, isEliteWave: true, isBossWave: true, bossId: areaBossId, scale: 1.00, enemyIds: [areaBossId] }
    ];
  }

  const STAGE_SCALES = [1.00, 1.06, 1.12, 1.18, 1.25, 1.32];

  const AREA_SPECS = [
    {
      id: 'area_1',
      order: 1,
      name: '無音駅の朱灯幽境',
      modernTheme: '終電後の無人駅',
      otherworldTheme: '和風幽界',
      description: '点滅する蛍光灯と朱鳥居の線路が交差する境界の入口。',
      enemies: ['e1_kagehei', 'e1_mayoibi', 'e1_joukyaku', 'e1_ishi_bannin'],
      midBoss: 'b1_tsukumo',
      areaBoss: 'b1_ekimori',
      stageNames: [
        { name: '終電後の改札口', subtitle: '雑踏の残滓', skillId: 'sk_r_soutou' },
        { name: '霧に沈む上りホーム', subtitle: '待合室の影', skillId: null },
        { name: '朱灯の踏切境界', subtitle: '中ボス戦', skillId: 'sk_r_habou' },
        { name: '朱鳥居の跨線橋', subtitle: '彼岸の石段', skillId: null },
        { name: '幽世の折返し線', subtitle: '鏡面の水面駅', skillId: null },
        { name: '彼岸行きの終着駅', subtitle: 'エリアボス戦', skillId: 'sk_sr_yogiri' }
      ]
    },
    {
      id: 'area_2',
      order: 2,
      name: '白霧校舎の黄昏洋館',
      modernTheme: '霧の旧校舎',
      otherworldTheme: '黄昏の洋館',
      description: '夕暮れに時が停まった木造校舎と琥珀時計の洋館。',
      enemies: ['e2_shorei', 'e2_eishi', 'e2_shokudai', 'e2_karasu'],
      midBoss: 'b2_yakatamori',
      areaBoss: 'b2_kifujin',
      stageNames: [
        { name: '閉ざされた昇降口', subtitle: '霧の靴箱', skillId: null },
        { name: '夕凪の音楽室', subtitle: '調律されぬ鍵盤', skillId: 'sk_sr_raigeki' },
        { name: '螺旋階段の踊り場', subtitle: '中ボス戦', skillId: 'sk_sr_kenshu' },
        { name: '硝子張りの図書回廊', subtitle: '閉じた頁', skillId: null },
        { name: '黄昏の温室', subtitle: '枯れぬ白薔薇', skillId: null },
        { name: '永劫黄昏の大時計塔', subtitle: 'エリアボス戦', skillId: 'sk_sr_jinsoku' }
      ]
    },
    {
      id: 'area_3',
      order: 3,
      name: '地下通路の錆鐘機都',
      modernTheme: '深夜の地下連絡通路',
      otherworldTheme: '朽ちた機械都市',
      description: 'シャッター裏の水音と青白い配電管が響く機械空洞。',
      enemies: ['e3_kansokuki', 'e3_haguruma', 'e3_hebi', 'e3_shuufuku'],
      midBoss: 'b3_zeroshiki',
      areaBoss: 'b3_kyojin',
      stageNames: [
        { name: '閉鎖シャッター裏', subtitle: '漏水の通路', skillId: null },
        { name: '無人の変電室', subtitle: '残響する直流音', skillId: 'sk_sr_kantsu' },
        { name: '旧式立坑の昇降機', subtitle: '中ボス戦', skillId: null },
        { name: '青銅配管の空中橋', subtitle: '蒸気霧の谷', skillId: null },
        { name: '停止した歯車広場', subtitle: '錆びた時計台', skillId: null },
        { name: '地下最深の中央演算炉', subtitle: 'エリアボス戦', skillId: 'sk_ssr_furaku' }
      ]
    },
    {
      id: 'area_4',
      order: 4,
      name: '秋雨屋上の星海神殿',
      modernTheme: '雨の屋上庭園',
      otherworldTheme: '星海神殿',
      description: '雨溜まりのネオンの彼方に白亜の星海柱廊が浮かぶ。',
      enemies: ['e4_seirei', 'e4_sekizo', 'e4_amagumo', 'e4_shashu'],
      midBoss: 'b4_tenbin',
      areaBoss: 'b4_tenkyuugi',
      stageNames: [
        { name: '雨粒打つ給水塔下', subtitle: '雲上のフェンス', skillId: null },
        { name: '水鏡の石畳', subtitle: '蒼い反射光', skillId: null },
        { name: '星見の白亜門', subtitle: '中ボス戦', skillId: 'sk_ssr_shien' },
        { name: '天蓋なき柱廊', subtitle: '潮騒の星風', skillId: null },
        { name: '流星群の祭壇路', subtitle: '白銀の橋', skillId: null },
        { name: '星海の最奥天蓋', subtitle: 'エリアボス戦', skillId: 'sk_ssr_kyoumei' }
      ]
    },
    {
      id: 'area_5',
      order: 5,
      name: '暁闇高架の深層聖域',
      modernTheme: '黎明前の高架下',
      otherworldTheme: '境界の深層聖域',
      description: '始発前の冷たい高架下と純白黒曜の境界中心核。',
      enemies: ['e5_kesshouhei', 'e5_eishousha', 'e5_kanshiei', 'e5_goeitai'],
      midBoss: 'b5_souken',
      areaBoss: 'b5_zankyou',
      stageNames: [
        { name: '暁闇のコンクリート柱', subtitle: '薄明の境界', skillId: null },
        { name: '残響の結晶回廊', subtitle: '記憶の断片', skillId: null },
        { name: '双界の門扉', subtitle: '中ボス戦', skillId: 'sk_ssr_shuukyoku' },
        { name: '無音の白夜空間', subtitle: '光の澱み', skillId: null },
        { name: '始発前の天頂階', subtitle: '最後の橋渡し', skillId: null },
        { name: '境界の中心核', subtitle: 'エリアボス戦', skillId: null }
      ]
    }
  ];

  const AREAS = [];
  const STAGE_MAP = {};

  for (let a = 0; a < AREA_SPECS.length; a += 1) {
    const spec = AREA_SPECS[a];
    const stages = [];
    for (let s = 1; s <= 6; s += 1) {
      const stageId = spec.order + '-' + s;
      const prevStageId = (a === 0 && s === 1)
        ? null
        : (s === 1 ? (spec.order - 1) + '-6' : spec.order + '-' + (s - 1));
      const isMid = s === 3;
      const isArea = s === 6;
      const isBossStage = isMid || isArea;
      const bossType = isMid ? 'mid' : (isArea ? 'area' : null);
      const bossId = isMid ? spec.midBoss : (isArea ? spec.areaBoss : null);
      const sInfo = spec.stageNames[s - 1];
      const rewardMult = spec.order;

      const stageObj = {
        id: stageId,
        areaId: spec.id,
        stageNum: s,
        name: sInfo.name,
        subtitle: sInfo.subtitle,
        isBossStage,
        bossType,
        bossId,
        statScale: STAGE_SCALES[s - 1],
        unlockCondition: prevStageId,
        firstClearRewards: {
          echoStones: (isBossStage ? 150 : 90) + (rewardMult - 1) * 30,
          starCoins: (isBossStage ? 1000 : 600) * rewardMult,
          emblemShards: (isBossStage ? 15 : 8) + (rewardMult - 1) * 4,
          masteryBooks: isBossStage ? 2 : 1,
          skillId: sInfo.skillId,
          equipDropGuaranteed: isBossStage || s === 1
        },
        repeatRewards: {
          starCoins: (isBossStage ? 350 : 220) * rewardMult,
          emblemShards: (isBossStage ? 6 : 3) + (rewardMult - 1) * 2,
          masteryBooks: isBossStage ? 2 : 1,
          equipDropChance: isBossStage ? 0.85 : 0.65
        },
        waves: buildStageWaves(s, spec.enemies, spec.midBoss, spec.areaBoss)
      };

      stages.push(stageObj);
      STAGE_MAP[stageId] = stageObj;
    }

    AREAS.push({
      id: spec.id,
      order: spec.order,
      name: spec.name,
      modernTheme: spec.modernTheme,
      otherworldTheme: spec.otherworldTheme,
      description: spec.description,
      stages
    });
  }

  const CHARACTERS = [
    {
      id: 'char_kiryu_takashi',
      name: '桐生 貴史',
      kana: 'きりゅう たかし',
      rarity: 'SSR',
      role: 'タンク',
      baseStats: { hp: 3400, atk: 210, def: 320, spd: 104, crit: 8, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_kiryu_takashi',
        name: '不動の境界壁',
        targetType: '全体',
        side: 'ally',
        cooldown: 3,
        description: '自身に挑発(2T)と味方全体へ最大HP22%分の障壁を付与する。',
        effects: [
          { type: 'buff', target: 'self', stat: 'taunt', value: 1, duration: 2 },
          { type: 'shield', target: 'allies', basis: 'casterMaxHp', ratio: 0.22, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_kiryu_takashi',
        name: '鉄壁の沈着',
        trigger: 'onHitTaken',
        description: '被弾時、自身のDEFを5%ずつ累積上昇（最大5回）。',
        effects: [{ type: 'stackBuff', stat: 'defPct', value: 5, maxStacks: 5 }]
      },
      resonance: {
        id: 'res_kiryu_takashi',
        name: '重厚なる境界守',
        description: '味方全体のDEF +12%',
        bonus: { stat: 'defPct', value: 12 }
      }
    },
    {
      id: 'char_himuro_soichiro',
      name: '氷室 宗一郎',
      kana: 'ひむろ そういちろう',
      rarity: 'SSR',
      role: 'タンク',
      baseStats: { hp: 3250, atk: 240, def: 300, spd: 108, crit: 10, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_himuro_soichiro',
        name: '凍夜の迎撃陣',
        targetType: '単体',
        side: 'enemy',
        cooldown: 3,
        description: '敵単体にATK180%の攻撃を行い、自身に反撃(2T)と挑発(2T)を付与する。',
        effects: [
          { type: 'damage', target: 'enemy', ratio: 1.80 },
          { type: 'buff', target: 'self', stat: 'counter', value: 1, duration: 2 },
          { type: 'buff', target: 'self', stat: 'taunt', value: 1, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_himuro_soichiro',
        name: '氷結の威圧',
        trigger: 'onCounterHit',
        description: '反撃命中時、対象のATKを15%低下(2T)。',
        effects: [{ type: 'debuff', stat: 'atkDown', value: 15, duration: 2 }]
      },
      resonance: {
        id: 'res_himuro_soichiro',
        name: '凍夜の護り',
        description: '味方全体の最大HP +10%',
        bonus: { stat: 'hpPct', value: 10 }
      }
    },
    {
      id: 'char_kanzaki_mio',
      name: '神崎 澪',
      kana: 'かんざき みお',
      rarity: 'SSR',
      role: 'ディーラー',
      baseStats: { hp: 1950, atk: 430, def: 150, spd: 124, crit: 22, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_kanzaki_mio',
        name: '蒼閃・残響断',
        targetType: '単体',
        side: 'enemy',
        cooldown: 3,
        description: '防御30%無視のATK310%単体攻撃。対象HP50%以下なら威力1.3倍。',
        effects: [{ type: 'damage', target: 'enemy', ratio: 3.10, defIgnore: 0.30, executeBelow50Scale: 1.30 }]
      },
      trait: {
        id: 'trt_kanzaki_mio',
        name: '宵闇の連撃',
        trigger: 'onCrit',
        description: '会心発生時、自身の行動ゲージを20%増加。',
        effects: [{ type: 'selfGaugeUp', value: 20 }]
      },
      resonance: {
        id: 'res_kanzaki_mio',
        name: '蒼閃の鋭気',
        description: '味方全体の会心率 +8%',
        bonus: { stat: 'crit', value: 8 }
      }
    },
    {
      id: 'char_kujo_renji',
      name: '九条 蓮司',
      kana: 'くじょう れんじ',
      rarity: 'SSR',
      role: 'ディーラー',
      baseStats: { hp: 2100, atk: 405, def: 165, spd: 118, crit: 18, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_kujo_renji',
        name: '紫電の界域展開',
        targetType: '全体',
        side: 'enemy',
        cooldown: 3,
        description: '敵全体にATK195%の攻撃＋防御20%低下(2T)。',
        effects: [
          { type: 'damage', target: 'enemies', ratio: 1.95 },
          { type: 'debuff', target: 'enemies', stat: 'defDown', value: 20, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_kujo_renji',
        name: '境界踏破者',
        trigger: 'onAttack',
        description: '敵が3体以上の時、自身の与ダメージ +20%。',
        effects: [{ type: 'conditionalDmgUp', minEnemies: 3, value: 20 }]
      },
      resonance: {
        id: 'res_kujo_renji',
        name: '紫電の加護',
        description: '味方全体のATK +12%',
        bonus: { stat: 'atkPct', value: 12 }
      }
    },
    {
      id: 'char_minase_shiori',
      name: '水無瀬 栞',
      kana: 'みなせ しおり',
      rarity: 'SSR',
      role: 'サポーター',
      baseStats: { hp: 2350, atk: 280, def: 210, spd: 128, crit: 12, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_minase_shiori',
        name: '星夜の調律譜',
        targetType: '全体',
        side: 'ally',
        cooldown: 3,
        description: '味方全体の行動ゲージ+25%＋ATK+25%(2T)＋速度+15%(2T)。',
        effects: [
          { type: 'gaugeUp', target: 'allies', value: 25 },
          { type: 'buff', target: 'allies', stat: 'atkUp', value: 25, duration: 2 },
          { type: 'buff', target: 'allies', stat: 'spdUp', value: 15, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_minase_shiori',
        name: '静謐な先導',
        trigger: 'onBattleStart',
        description: '戦闘開始時、味方全体の初期行動ゲージ +20%。',
        effects: [{ type: 'initGaugeUp', target: 'allies', value: 20 }]
      },
      resonance: {
        id: 'res_minase_shiori',
        name: '星夜の律動',
        description: '味方全体のSPD +8',
        bonus: { stat: 'spd', value: 8 }
      }
    },
    {
      id: 'char_shiraishi_sumika',
      name: '白石 澄花',
      kana: 'しらいし すみか',
      rarity: 'SSR',
      role: 'ヒーラー',
      baseStats: { hp: 2600, atk: 260, def: 220, spd: 116, crit: 10, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_shiraishi_sumika',
        name: '清冽の彼岸灯',
        targetType: '全体',
        side: 'ally',
        cooldown: 3,
        description: '味方全体のHPをATK220%分回復＋弱体2個解除＋継続回復(2T)。',
        effects: [
          { type: 'heal', target: 'allies', ratio: 2.20 },
          { type: 'cleanse', target: 'allies', count: 2 },
          { type: 'buff', target: 'allies', stat: 'regen', value: 10, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_shiraishi_sumika',
        name: '慈愛の余韻',
        trigger: 'onHeal',
        description: '回復した味方に被ダメージ10%軽減(1T)を付与。',
        effects: [{ type: 'buff', stat: 'dmgDown', value: 10, duration: 1 }]
      },
      resonance: {
        id: 'res_shiraishi_sumika',
        name: '彼岸の清癒',
        description: '味方全体の与回復・被回復効率 +12%',
        bonus: { stat: 'healPowerPct', value: 12 }
      }
    },
    {
      id: 'char_todo_seiichi',
      name: '藤堂 誠一',
      kana: 'とうどう せいいち',
      rarity: 'SR',
      role: 'タンク',
      baseStats: { hp: 2900, atk: 195, def: 265, spd: 102, crit: 8, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_todo_seiichi',
        name: '警護の鉄盾',
        targetType: '単体',
        side: 'enemy',
        cooldown: 3,
        description: '敵単体にATK150%攻撃＋自身に挑発(2T)＆被ダメ25%軽減(2T)。',
        effects: [
          { type: 'damage', target: 'enemy', ratio: 1.50 },
          { type: 'buff', target: 'self', stat: 'taunt', value: 1, duration: 2 },
          { type: 'buff', target: 'self', stat: 'dmgDown', value: 25, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_todo_seiichi',
        name: '不撓の姿勢',
        trigger: 'onTurnStart',
        description: 'HP50%以下でターン開始時、最大HPの10%を自己回復。',
        effects: [{ type: 'conditionalSelfHealPct', belowHpPct: 50, ratio: 0.10 }]
      },
      resonance: {
        id: 'res_todo_seiichi',
        name: '警護の構え',
        description: '味方全体のDEF +8%',
        bonus: { stat: 'defPct', value: 8 }
      }
    },
    {
      id: 'char_amano_sota',
      name: '天野 颯太',
      kana: 'あまの そうた',
      rarity: 'SR',
      role: 'ディーラー',
      baseStats: { hp: 1800, atk: 360, def: 135, spd: 122, crit: 16, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_amano_sota',
        name: '疾風の連続斬り',
        targetType: '単体',
        side: 'enemy',
        cooldown: 3,
        description: '敵単体にATK135%×2回攻撃＋自身に速度+20%(2T)。',
        effects: [
          { type: 'damage', target: 'enemy', ratio: 1.35, hits: 2 },
          { type: 'buff', target: 'self', stat: 'spdUp', value: 20, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_amano_sota',
        name: '風雅の加速',
        trigger: 'onTurnEnd',
        description: '行動後、自身の与ダメージ +6%（最大4重複）。',
        effects: [{ type: 'stackBuff', stat: 'dmgDealtPct', value: 6, maxStacks: 4 }]
      },
      resonance: {
        id: 'res_amano_sota',
        name: '疾風の余波',
        description: '味方全体のSPD +5',
        bonus: { stat: 'spd', value: 5 }
      }
    },
    {
      id: 'char_kuroda_chihiro',
      name: '黒田 千尋',
      kana: 'くろだ ちひろ',
      rarity: 'SR',
      role: 'ディーラー',
      baseStats: { hp: 1880, atk: 350, def: 145, spd: 112, crit: 15, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_kuroda_chihiro',
        name: '影縫いの楔',
        targetType: '範囲',
        side: 'enemy',
        cooldown: 3,
        description: '敵最大3体にATK165%攻撃＋速度20%低下(2T)。',
        effects: [
          { type: 'damage', target: 'range', ratio: 1.65 },
          { type: 'debuff', target: 'range', stat: 'spdDown', value: 20, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_kuroda_chihiro',
        name: '深影の追撃',
        trigger: 'onAttack',
        description: '弱体効果が付与された敵への与ダメージ +18%。',
        effects: [{ type: 'bonusVsDebuffed', value: 18 }]
      },
      resonance: {
        id: 'res_kuroda_chihiro',
        name: '影縫いの鋭刃',
        description: '味方全体のATK +8%',
        bonus: { stat: 'atkPct', value: 8 }
      }
    },
    {
      id: 'char_sakurai_rin',
      name: '桜井 凛',
      kana: 'さくらい りん',
      rarity: 'SR',
      role: 'サポーター',
      baseStats: { hp: 2150, atk: 245, def: 185, spd: 120, crit: 12, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_sakurai_rin',
        name: '夜桜の鼓舞',
        targetType: '全体',
        side: 'ally',
        cooldown: 3,
        description: '味方全体のATK+20%(2T)＆会心率+15%(2T)。',
        effects: [
          { type: 'buff', target: 'allies', stat: 'atkUp', value: 20, duration: 2 },
          { type: 'buff', target: 'allies', stat: 'critUp', value: 15, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_sakurai_rin',
        name: '凛然たる気配',
        trigger: 'onWaveStart',
        description: 'Wave開始時、ATKが最も高い味方の行動ゲージ +15%。',
        effects: [{ type: 'allyHighestAtkGaugeUp', value: 15 }]
      },
      resonance: {
        id: 'res_sakurai_rin',
        name: '夜桜の激励',
        description: '味方全体の会心率 +5%',
        bonus: { stat: 'crit', value: 5 }
      }
    },
    {
      id: 'char_hasegawa_haruto',
      name: '長谷川 悠人',
      kana: 'はせがわ はると',
      rarity: 'SR',
      role: 'サポーター',
      baseStats: { hp: 2200, atk: 255, def: 190, spd: 117, crit: 11, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_hasegawa_haruto',
        name: '霧散の解析札',
        targetType: '範囲',
        side: 'enemy',
        cooldown: 3,
        description: '敵最大3体にATK130%攻撃＋DEF25%低下＆被ダメ15%増加(2T)。',
        effects: [
          { type: 'damage', target: 'range', ratio: 1.30 },
          { type: 'debuff', target: 'range', stat: 'defDown', value: 25, duration: 2 },
          { type: 'debuff', target: 'range', stat: 'vuln', value: 15, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_hasegawa_haruto',
        name: '冷静な観測',
        trigger: 'passive',
        description: '敵の行動予告状態時、自身の行動速度 +12。',
        effects: [{ type: 'bonusSpdOnTelegraph', value: 12 }]
      },
      resonance: {
        id: 'res_hasegawa_haruto',
        name: '精緻な観測網',
        description: '味方全体の与ダメージ +6%',
        bonus: { stat: 'dmgDealtPct', value: 6 }
      }
    },
    {
      id: 'char_hozumi_saya',
      name: '穂積 沙耶',
      kana: 'ほづみ さや',
      rarity: 'SR',
      role: 'ヒーラー',
      baseStats: { hp: 2350, atk: 235, def: 195, spd: 113, crit: 9, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_hozumi_saya',
        name: '温もりの薬草香',
        targetType: '範囲',
        side: 'ally',
        cooldown: 3,
        description: '対象をATK260%回復、他味方をATK90%回復する。',
        effects: [
          { type: 'heal', target: 'lowestHpAlly', ratio: 2.60 },
          { type: 'heal', target: 'otherAllies', ratio: 0.90 }
        ]
      },
      trait: {
        id: 'trt_hozumi_saya',
        name: '救急の心得',
        trigger: 'onHeal',
        description: 'HP40%以下の味方を回復時、回復量 +25%。',
        effects: [{ type: 'lowHpHealBonus', belowPct: 40, value: 25 }]
      },
      resonance: {
        id: 'res_hozumi_saya',
        name: '薬草の滋養',
        description: '味方全体の最大HP +7%',
        bonus: { stat: 'hpPct', value: 7 }
      }
    },
    {
      id: 'char_miyamoto_tsumugi',
      name: '宮本 紬',
      kana: 'みやもと つむぎ',
      rarity: 'SR',
      role: 'ヒーラー',
      baseStats: { hp: 2300, atk: 230, def: 200, spd: 115, crit: 10, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_miyamoto_tsumugi',
        name: '月白の浄化風',
        targetType: '全体',
        side: 'ally',
        cooldown: 3,
        description: '味方全体のHPをATK165%回復＋弱体効果1個解除。',
        effects: [
          { type: 'heal', target: 'allies', ratio: 1.65 },
          { type: 'cleanse', target: 'allies', count: 1 }
        ]
      },
      trait: {
        id: 'trt_miyamoto_tsumugi',
        name: '静かなる守り',
        trigger: 'onWaveStart',
        description: 'Wave移行時、味方全体のHPを最大HPの8%回復。',
        effects: [{ type: 'waveHealPct', ratio: 0.08 }]
      },
      resonance: {
        id: 'res_miyamoto_tsumugi',
        name: '月白の安寧',
        description: '味方全体の与回復・被回復効率 +8%',
        bonus: { stat: 'healPowerPct', value: 8 }
      }
    },
    {
      id: 'char_ishii_daiki',
      name: '石井 大輝',
      kana: 'いしい だいき',
      rarity: 'R',
      role: 'タンク',
      baseStats: { hp: 2500, atk: 170, def: 225, spd: 98, crit: 6, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_ishii_daiki',
        name: '堅実な防壁',
        targetType: '単体',
        side: 'self',
        cooldown: 3,
        description: '自身に挑発(2T)＋DEF+35%(2T)。',
        effects: [
          { type: 'buff', target: 'self', stat: 'taunt', value: 1, duration: 2 },
          { type: 'buff', target: 'self', stat: 'defUp', value: 35, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_ishii_daiki',
        name: '現場の根性',
        trigger: 'onLethal',
        description: '戦闘中1度だけ致命ダメージをHP1で耐える。',
        effects: [{ type: 'endureOnce' }]
      },
      resonance: {
        id: 'res_ishii_daiki',
        name: '堅実の備え',
        description: '味方全体のDEF +5%',
        bonus: { stat: 'defPct', value: 5 }
      }
    },
    {
      id: 'char_murakami_kenta',
      name: '村上 健太',
      kana: 'むらかみ けんた',
      rarity: 'R',
      role: 'タンク',
      baseStats: { hp: 2450, atk: 180, def: 215, spd: 100, crit: 7, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_murakami_kenta',
        name: '踏み込み盾撃',
        targetType: '単体',
        side: 'enemy',
        cooldown: 2,
        description: '敵単体にATK150%攻撃＋敵のATK15%低下(2T)＋挑発(1T)。',
        effects: [
          { type: 'damage', target: 'enemy', ratio: 1.50 },
          { type: 'debuff', target: 'enemy', stat: 'atkDown', value: 15, duration: 2 },
          { type: 'buff', target: 'self', stat: 'taunt', value: 1, duration: 1 }
        ]
      },
      trait: {
        id: 'trt_murakami_kenta',
        name: '頑健な体躯',
        trigger: 'passive',
        description: '自身の最大HP +8%。',
        effects: [{ type: 'selfHpPct', value: 8 }]
      },
      resonance: {
        id: 'res_murakami_kenta',
        name: '頑健の支え',
        description: '味方全体の最大HP +4%',
        bonus: { stat: 'hpPct', value: 4 }
      }
    },
    {
      id: 'char_kobayashi_shohei',
      name: '小林 翔平',
      kana: 'こばやし しょうへい',
      rarity: 'R',
      role: 'ディーラー',
      baseStats: { hp: 1650, atk: 305, def: 125, spd: 112, crit: 12, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_kobayashi_shohei',
        name: '一点突破突き',
        targetType: '単体',
        side: 'enemy',
        cooldown: 2,
        description: '敵単体にATK235%の集中攻撃を行う。',
        effects: [{ type: 'damage', target: 'enemy', ratio: 2.35 }]
      },
      trait: {
        id: 'trt_kobayashi_shohei',
        name: '集中の一撃',
        trigger: 'onAttack',
        description: '単体攻撃の与ダメージ +12%。',
        effects: [{ type: 'singleTargetDmgUp', value: 12 }]
      },
      resonance: {
        id: 'res_kobayashi_shohei',
        name: '突破の気迫',
        description: '味方全体のATK +5%',
        bonus: { stat: 'atkPct', value: 5 }
      }
    },
    {
      id: 'char_watanabe_aoi',
      name: '渡辺 葵',
      kana: 'わたなべ あおい',
      rarity: 'R',
      role: 'ディーラー',
      baseStats: { hp: 1680, atk: 295, def: 130, spd: 114, crit: 13, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_watanabe_aoi',
        name: '弧月の一閃',
        targetType: '範囲',
        side: 'enemy',
        cooldown: 3,
        description: '敵最大3体にATK135%の斬撃を行う。',
        effects: [{ type: 'damage', target: 'range', ratio: 1.35 }]
      },
      trait: {
        id: 'trt_watanabe_aoi',
        name: '身軽な立ち回り',
        trigger: 'onBattleStart',
        description: '戦闘開始時の初動行動ゲージ +15%。',
        effects: [{ type: 'selfInitGaugeUp', value: 15 }]
      },
      resonance: {
        id: 'res_watanabe_aoi',
        name: '弧月の冴え',
        description: '味方全体の会心ダメージ +8%',
        bonus: { stat: 'critDmg', value: 8 }
      }
    },
    {
      id: 'char_saito_riko',
      name: '斉藤 莉子',
      kana: 'さいとう りこ',
      rarity: 'R',
      role: 'サポーター',
      baseStats: { hp: 1900, atk: 210, def: 165, spd: 116, crit: 10, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_saito_riko',
        name: '導きの合図',
        targetType: '全体',
        side: 'ally',
        cooldown: 3,
        description: '味方全体のATK+15%(2T)＋行動ゲージ+10%。',
        effects: [
          { type: 'buff', target: 'allies', stat: 'atkUp', value: 15, duration: 2 },
          { type: 'gaugeUp', target: 'allies', value: 10 }
        ]
      },
      trait: {
        id: 'trt_saito_riko',
        name: '明るい声援',
        trigger: 'onWaveStart',
        description: '味方全体が毎Wave初回攻撃時、与ダメージ +10%。',
        effects: [{ type: 'waveFirstHitDmgUp', value: 10 }]
      },
      resonance: {
        id: 'res_saito_riko',
        name: '導きの歩調',
        description: '味方全体のSPD +3',
        bonus: { stat: 'spd', value: 3 }
      }
    },
    {
      id: 'char_takahashi_takumi',
      name: '高橋 拓海',
      kana: 'たかはし たくみ',
      rarity: 'R',
      role: 'サポーター',
      baseStats: { hp: 1950, atk: 215, def: 170, spd: 113, crit: 9, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_takahashi_takumi',
        name: '足止めの札術',
        targetType: '単体',
        side: 'enemy',
        cooldown: 3,
        description: '敵単体にATK140%攻撃＋対象の行動ゲージ25%減少＆速度15%低下。',
        effects: [
          { type: 'damage', target: 'enemy', ratio: 1.40 },
          { type: 'gaugeDown', target: 'enemy', value: 25 },
          { type: 'debuff', target: 'enemy', stat: 'spdDown', value: 15, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_takahashi_takumi',
        name: '手堅い牽制',
        trigger: 'onDebuff',
        description: '敵の速度低下時、追加で自身の行動ゲージ +10%。',
        effects: [{ type: 'selfGaugeUpOnSpdDown', value: 10 }]
      },
      resonance: {
        id: 'res_takahashi_takumi',
        name: '堅実な連携',
        description: '味方全体のATK +4%',
        bonus: { stat: 'atkPct', value: 4 }
      }
    },
    {
      id: 'char_nakamura_yui',
      name: '中村 結衣',
      kana: 'なかむら ゆい',
      rarity: 'R',
      role: 'ヒーラー',
      baseStats: { hp: 2050, atk: 205, def: 175, spd: 110, crit: 8, critDmg: 150 },
      uniqueSkill: {
        id: 'usk_nakamura_yui',
        name: '安らぎの応急術',
        targetType: '単体',
        side: 'ally',
        cooldown: 2,
        description: '味方1体のHPをATK250%回復＋DEF+15%(2T)。',
        effects: [
          { type: 'heal', target: 'ally', ratio: 2.50 },
          { type: 'buff', target: 'ally', stat: 'defUp', value: 15, duration: 2 }
        ]
      },
      trait: {
        id: 'trt_nakamura_yui',
        name: '献身の歩み',
        trigger: 'onTurnEnd',
        description: '自身の行動後、最もHP割合が低い味方を最大HPの5%回復。',
        effects: [{ type: 'healLowestAllyPct', ratio: 0.05 }]
      },
      resonance: {
        id: 'res_nakamura_yui',
        name: '献身の慈雨',
        description: '味方全体の与回復・被回復効率 +5%',
        bonus: { stat: 'healPowerPct', value: 5 }
      }
    }
  ];

  const CHARACTER_MAP = {};
  for (let i = 0; i < CHARACTERS.length; i += 1) {
    CHARACTER_MAP[CHARACTERS[i].id] = CHARACTERS[i];
  }

  const AWAKENING_TIERS = [
    { tier: 0, shardCost: 0, equipSlots: 2, unlockedSlots: ['主器', '護符'], skillSlots: 1, maxEmblemLayer: 1, maxMasteryRank: 3, statMultiplier: 1.00, traitMultiplier: 1.00 },
    { tier: 1, shardCost: 1, equipSlots: 3, unlockedSlots: ['主器', '護符', '装具'], skillSlots: 2, maxEmblemLayer: 1, maxMasteryRank: 3, statMultiplier: 1.08, traitMultiplier: 1.00 },
    { tier: 2, shardCost: 2, equipSlots: 3, unlockedSlots: ['主器', '護符', '装具'], skillSlots: 2, maxEmblemLayer: 3, maxMasteryRank: 4, statMultiplier: 1.18, traitMultiplier: 1.00 },
    { tier: 3, shardCost: 3, equipSlots: 4, unlockedSlots: ['主器', '護符', '装具', '印章'], skillSlots: 2, maxEmblemLayer: 3, maxMasteryRank: 5, statMultiplier: 1.30, traitMultiplier: 1.25 }
  ];

  const SKILL_MASTERY_RANKS = [
    { rank: 1, label: '壱', scale: 1.00, cdReduction: 0, requiredUses: 0, bookCost: 0 },
    { rank: 2, label: '弐', scale: 1.08, cdReduction: 0, requiredUses: 10, bookCost: 2 },
    { rank: 3, label: '参', scale: 1.16, cdReduction: 0, requiredUses: 30, bookCost: 5 },
    { rank: 4, label: '肆', scale: 1.24, cdReduction: 0, requiredUses: 60, bookCost: 10 },
    { rank: 5, label: '伍', scale: 1.32, cdReduction: 1, requiredUses: 100, bookCost: 18 }
  ];

  const SKILLS = [
    // R (6)
    { id: 'sk_r_kiriharai', name: '斬り払い', rarity: 'R', targetType: '単体', side: 'enemy', cooldown: 2, powerRatio: 1.60, description: '敵単体にATK160%の攻撃を行う。', effects: [{ type: 'damage', ratio: 1.60 }] },
    { id: 'sk_r_soutou', name: '掃討の太刀筋', rarity: 'R', targetType: '範囲', side: 'enemy', cooldown: 3, powerRatio: 1.15, description: '敵最大3体にATK115%の攻撃を行う。', effects: [{ type: 'damage', ratio: 1.15 }] },
    { id: 'sk_r_shogekiha', name: '境界の衝撃波', rarity: 'R', targetType: '全体', side: 'enemy', cooldown: 3, powerRatio: 0.95, description: '敵全体にATK95%の攻撃を行う。', effects: [{ type: 'damage', ratio: 0.95 }] },
    { id: 'sk_r_oukyu', name: '応急手当', rarity: 'R', targetType: '単体', side: 'ally', cooldown: 2, powerRatio: 1.80, description: '味方単体のHPをATK180%分回復する。', effects: [{ type: 'heal', ratio: 1.80 }] },
    { id: 'sk_r_kessoku', name: '結束の掛け声', rarity: 'R', targetType: '全体', side: 'ally', cooldown: 3, powerRatio: 0, description: '味方全体のATKを2ターンの間+12%する。', effects: [{ type: 'buff', stat: 'atkUp', value: 12, duration: 2 }] },
    { id: 'sk_r_habou', name: '破防の印', rarity: 'R', targetType: '単体', side: 'enemy', cooldown: 3, powerRatio: 1.20, description: '敵単体にATK120%攻撃＋DEF15%低下(2T)。', effects: [{ type: 'damage', ratio: 1.20 }, { type: 'debuff', stat: 'defDown', value: 15, duration: 2 }] },
    // SR (6)
    { id: 'sk_sr_kantsu', name: '貫通の穿ち', rarity: 'SR', targetType: '単体', side: 'enemy', cooldown: 3, powerRatio: 2.05, description: '敵単体にDEF25%無視のATK205%攻撃を行う。', effects: [{ type: 'damage', ratio: 2.05, defIgnore: 0.25 }] },
    { id: 'sk_sr_raigeki', name: '連鎖の雷撃', rarity: 'SR', targetType: '範囲', side: 'enemy', cooldown: 3, powerRatio: 1.45, description: '敵最大3体にATK145%攻撃＋25%確率で速度低下(2T)。', effects: [{ type: 'damage', ratio: 1.45 }, { type: 'debuff', stat: 'spdDown', value: 15, duration: 2, chance: 0.25 }] },
    { id: 'sk_sr_yogiri', name: '夜霧の帳', rarity: 'SR', targetType: '全体', side: 'enemy', cooldown: 4, powerRatio: 1.25, description: '敵全体にATK125%攻撃＋ATK15%低下(2T)。', effects: [{ type: 'damage', ratio: 1.25 }, { type: 'debuff', stat: 'atkDown', value: 15, duration: 2 }] },
    { id: 'sk_sr_kenshu', name: '堅守の守護札', rarity: 'SR', targetType: '単体', side: 'ally', cooldown: 3, powerRatio: 0, description: '味方単体に最大HP20%障壁＋DEF+25%(2T)。', effects: [{ type: 'shield', ratio: 0.20, duration: 2 }, { type: 'buff', stat: 'defUp', value: 25, duration: 2 }] },
    { id: 'sk_sr_seifu', name: '癒しの清風', rarity: 'SR', targetType: '範囲', side: 'ally', cooldown: 3, powerRatio: 1.55, description: '味方最大3体のHPをATK155%回復する。', effects: [{ type: 'heal', ratio: 1.55 }] },
    { id: 'sk_sr_jinsoku', name: '迅速の号令', rarity: 'SR', targetType: '全体', side: 'ally', cooldown: 4, powerRatio: 0, description: '味方全体の行動ゲージ+15%＆SPD+12%(2T)。', effects: [{ type: 'gaugeUp', value: 15 }, { type: 'buff', stat: 'spdUp', value: 12, duration: 2 }] },
    // SSR (6)
    { id: 'sk_ssr_hoshiochi', name: '星墜の断罪剣', rarity: 'SSR', targetType: '単体', side: 'enemy', cooldown: 4, powerRatio: 2.75, description: '敵単体にATK275%攻撃＋会心時追加50%ダメージ。', effects: [{ type: 'damage', ratio: 2.75, critBonusRatio: 0.50 }] },
    { id: 'sk_ssr_shien', name: '紫炎の境界斬', rarity: 'SSR', targetType: '範囲', side: 'enemy', cooldown: 4, powerRatio: 1.90, description: '敵最大3体にATK190%攻撃＋被ダメージ20%増加(2T)。', effects: [{ type: 'damage', ratio: 1.90 }, { type: 'debuff', stat: 'vuln', value: 20, duration: 2 }] },
    { id: 'sk_ssr_shuukyoku', name: '残響の終曲', rarity: 'SSR', targetType: '全体', side: 'enemy', cooldown: 4, powerRatio: 1.75, description: '敵全体にATK175%攻撃＋バフ1個解除。', effects: [{ type: 'damage', ratio: 1.75 }, { type: 'dispel', count: 1 }] },
    { id: 'sk_ssr_seiiki', name: '星海の聖域展開', rarity: 'SSR', targetType: '全体', side: 'ally', cooldown: 4, powerRatio: 1.65, description: '味方全体のHPをATK165%回復＋障壁15%＋弱体1個解除。', effects: [{ type: 'heal', ratio: 1.65 }, { type: 'shield', ratio: 0.15, duration: 2 }, { type: 'cleanse', count: 1 }] },
    { id: 'sk_ssr_kyoumei', name: '覚醒の共鳴譜', rarity: 'SSR', targetType: '全体', side: 'ally', cooldown: 4, powerRatio: 0, description: '味方全体のATK+25%・会心率+18%(2T)＋行動ゲージ+15%。', effects: [{ type: 'buff', stat: 'atkUp', value: 25, duration: 2 }, { type: 'buff', stat: 'critUp', value: 18, duration: 2 }, { type: 'gaugeUp', value: 15 }] },
    { id: 'sk_ssr_furaku', name: '不落の結界陣', rarity: 'SSR', targetType: '単体', side: 'self', cooldown: 4, powerRatio: 0, description: '自身に挑発(2T)＋被ダメ35%軽減(2T)＋反撃状態(2T)。', effects: [{ type: 'buff', stat: 'taunt', value: 1, duration: 2 }, { type: 'buff', stat: 'dmgDown', value: 35, duration: 2 }, { type: 'buff', stat: 'counter', value: 1, duration: 2 }] }
  ];

  const SKILL_MAP = {};
  for (let i = 0; i < SKILLS.length; i += 1) {
    SKILL_MAP[SKILLS[i].id] = SKILLS[i];
  }

  const SETS = [
    {
      id: 'set_teppeki',
      name: '鉄壁の印',
      twoSetDesc: 'DEF +18%',
      twoSetBonus: { defPct: 18 },
      fourSetDesc: '被ダメージ 15%軽減＋最大HP +15%',
      fourSetBonus: { dmgTakenDownPct: 15, hpPct: 15 }
    },
    {
      id: 'set_yogiri',
      name: '夜霧の印',
      twoSetDesc: 'SPD +14',
      twoSetBonus: { spd: 14 },
      fourSetDesc: '戦闘開始時行動ゲージ +25%＋ATK +15%',
      fourSetBonus: { initGaugePct: 25, atkPct: 15 }
    },
    {
      id: 'set_zankyo',
      name: '残響の印',
      twoSetDesc: 'ATK +18%',
      twoSetBonus: { atkPct: 18 },
      fourSetDesc: '会心率 +15%・会心ダメージ +30%',
      fourSetBonus: { crit: 15, critDmg: 30 }
    },
    {
      id: 'set_hoshiyomi',
      name: '星詠の印',
      twoSetDesc: 'HP +15%',
      twoSetBonus: { hpPct: 15 },
      fourSetDesc: '味方全体の与ダメージ +12%',
      fourSetBonus: { allyDmgDealtPct: 12 }
    },
    {
      id: 'set_souen',
      name: '蒼焔の印',
      twoSetDesc: '会心率 +12%',
      twoSetBonus: { crit: 12 },
      fourSetDesc: '単体攻撃与ダメージ +25%',
      fourSetBonus: { singleTargetDmgPct: 25 }
    },
    {
      id: 'set_jousui',
      name: '浄水の印',
      twoSetDesc: '与回復量 +18%',
      twoSetBonus: { healPowerPct: 18 },
      fourSetDesc: '回復時に対象へATK +15%(2T)付与',
      fourSetBonus: { onHealAtkUpPct: 15, duration: 2 }
    }
  ];

  const SET_MAP = {};
  for (let i = 0; i < SETS.length; i += 1) {
    SET_MAP[SETS[i].id] = SETS[i];
  }

  const QUALITY_RANKS = [
    { idx: 0, id: 'q_0', name: '並', multiplier: 1.00, dropWeight: 55.0, sellMultiplier: 1 },
    { idx: 1, id: 'q_1', name: '良', multiplier: 1.15, dropWeight: 28.0, sellMultiplier: 2 },
    { idx: 2, id: 'q_2', name: '秀', multiplier: 1.32, dropWeight: 12.0, sellMultiplier: 4 },
    { idx: 3, id: 'q_3', name: '優', multiplier: 1.52, dropWeight: 4.2, sellMultiplier: 8 },
    { idx: 4, id: 'q_4', name: '極', multiplier: 1.75, dropWeight: 0.8, sellMultiplier: 16 }
  ];

  const EQUIP_SYNTHESIS_RULES = [
    { fromIdx: 0, toIdx: 1, baseRate: 0.50, pityMax: 3, coinCost: 200 },
    { fromIdx: 1, toIdx: 2, baseRate: 0.40, pityMax: 4, coinCost: 500 },
    { fromIdx: 2, toIdx: 3, baseRate: 0.35, pityMax: 5, coinCost: 1200 },
    { fromIdx: 3, toIdx: 4, baseRate: 0.30, pityMax: 6, coinCost: 3000 }
  ];

  const EQUIPS = [
    // set_teppeki
    { id: 'eq_teppeki_main', setId: 'set_teppeki', slot: '主器', name: '鉄壁の黒鉄戟', baseStats: { atk: 72, def: 18 }, sellBaseCoins: 80 },
    { id: 'eq_teppeki_amulet', setId: 'set_teppeki', slot: '護符', name: '鉄壁の守護符', baseStats: { hp: 500 }, sellBaseCoins: 80 },
    { id: 'eq_teppeki_accessory', setId: 'set_teppeki', slot: '装具', name: '鉄壁の腕輪', baseStats: { spd: 8, def: 24 }, sellBaseCoins: 80 },
    { id: 'eq_teppeki_seal', setId: 'set_teppeki', slot: '印章', name: '鉄壁の印章', baseStats: { def: 78, hp: 160 }, sellBaseCoins: 80 },
    // set_yogiri
    { id: 'eq_yogiri_main', setId: 'set_yogiri', slot: '主器', name: '夜霧の双刃', baseStats: { atk: 80, spd: 4 }, sellBaseCoins: 80 },
    { id: 'eq_yogiri_amulet', setId: 'set_yogiri', slot: '護符', name: '夜霧の護符', baseStats: { hp: 440, spd: 4 }, sellBaseCoins: 80 },
    { id: 'eq_yogiri_accessory', setId: 'set_yogiri', slot: '装具', name: '夜霧の懐中時計', baseStats: { spd: 12, crit: 4 }, sellBaseCoins: 80 },
    { id: 'eq_yogiri_seal', setId: 'set_yogiri', slot: '印章', name: '夜霧の印章', baseStats: { def: 58, spd: 5 }, sellBaseCoins: 80 },
    // set_zankyo
    { id: 'eq_zankyo_main', setId: 'set_zankyo', slot: '主器', name: '残響の刃器', baseStats: { atk: 90 }, sellBaseCoins: 80 },
    { id: 'eq_zankyo_amulet', setId: 'set_zankyo', slot: '護符', name: '残響の護符', baseStats: { hp: 460 }, sellBaseCoins: 80 },
    { id: 'eq_zankyo_accessory', setId: 'set_zankyo', slot: '装具', name: '残響の耳飾り', baseStats: { spd: 10, crit: 6 }, sellBaseCoins: 80 },
    { id: 'eq_zankyo_seal', setId: 'set_zankyo', slot: '印章', name: '残響の印章', baseStats: { def: 62, atk: 20 }, sellBaseCoins: 80 },
    // set_hoshiyomi
    { id: 'eq_hoshiyomi_main', setId: 'set_hoshiyomi', slot: '主器', name: '星詠の導杖', baseStats: { atk: 76, hp: 120 }, sellBaseCoins: 80 },
    { id: 'eq_hoshiyomi_amulet', setId: 'set_hoshiyomi', slot: '護符', name: '星詠の護符', baseStats: { hp: 490 }, sellBaseCoins: 80 },
    { id: 'eq_hoshiyomi_accessory', setId: 'set_hoshiyomi', slot: '装具', name: '星詠の羅針盤', baseStats: { spd: 11, crit: 4 }, sellBaseCoins: 80 },
    { id: 'eq_hoshiyomi_seal', setId: 'set_hoshiyomi', slot: '印章', name: '星詠の印章', baseStats: { def: 66, hp: 180 }, sellBaseCoins: 80 },
    // set_souen
    { id: 'eq_souen_main', setId: 'set_souen', slot: '主器', name: '蒼焔の太刀', baseStats: { atk: 86, crit: 3 }, sellBaseCoins: 80 },
    { id: 'eq_souen_amulet', setId: 'set_souen', slot: '護符', name: '蒼焔の護符', baseStats: { hp: 450, crit: 2 }, sellBaseCoins: 80 },
    { id: 'eq_souen_accessory', setId: 'set_souen', slot: '装具', name: '蒼焔の腕輪', baseStats: { spd: 9, crit: 7 }, sellBaseCoins: 80 },
    { id: 'eq_souen_seal', setId: 'set_souen', slot: '印章', name: '蒼焔の印章', baseStats: { def: 60, crit: 4 }, sellBaseCoins: 80 },
    // set_jousui
    { id: 'eq_jousui_main', setId: 'set_jousui', slot: '主器', name: '浄水の聖杯', baseStats: { atk: 78, hp: 140 }, sellBaseCoins: 80 },
    { id: 'eq_jousui_amulet', setId: 'set_jousui', slot: '護符', name: '浄水の護符', baseStats: { hp: 510 }, sellBaseCoins: 80 },
    { id: 'eq_jousui_accessory', setId: 'set_jousui', slot: '装具', name: '浄水の数珠', baseStats: { spd: 10, hp: 120 }, sellBaseCoins: 80 },
    { id: 'eq_jousui_seal', setId: 'set_jousui', slot: '印章', name: '浄水の印章', baseStats: { def: 68, hp: 190 }, sellBaseCoins: 80 }
  ];

  const EQUIP_MAP = {};
  for (let i = 0; i < EQUIPS.length; i += 1) {
    EQUIP_MAP[EQUIPS[i].id] = EQUIPS[i];
  }

  const EMBLEM_NODES = [
    { id: 1, layer: 1, reqAwakening: 0, reqPrevLayerAll: false, shardCost: 10, label: 'HP +180', bonus: { hp: 180 } },
    { id: 2, layer: 1, reqAwakening: 0, reqPrevLayerAll: false, shardCost: 10, label: 'ATK +35', bonus: { atk: 35 } },
    { id: 3, layer: 1, reqAwakening: 0, reqPrevLayerAll: false, shardCost: 10, label: 'DEF +30', bonus: { def: 30 } },
    { id: 4, layer: 1, reqAwakening: 0, reqPrevLayerAll: false, shardCost: 10, label: 'SPD +6', bonus: { spd: 6 } },
    { id: 5, layer: 2, reqAwakening: 2, reqPrevLayerAll: false, shardCost: 25, label: '会心率 +5%', bonus: { crit: 5 } },
    { id: 6, layer: 2, reqAwakening: 2, reqPrevLayerAll: false, shardCost: 25, label: '与ダメ +8%', bonus: { dmgDealtPct: 8 } },
    { id: 7, layer: 2, reqAwakening: 2, reqPrevLayerAll: false, shardCost: 25, label: '被ダメ軽減 +6%', bonus: { dmgTakenDownPct: 6 } },
    { id: 8, layer: 2, reqAwakening: 2, reqPrevLayerAll: false, shardCost: 25, label: '与回復 +10%', bonus: { healPowerPct: 10 } },
    { id: 9, layer: 3, reqAwakening: 2, reqPrevLayerAll: true, shardCost: 50, label: '初期ゲージ +10%', bonus: { initGaugePct: 10 } },
    { id: 10, layer: 3, reqAwakening: 2, reqPrevLayerAll: true, shardCost: 50, label: '固有技威力 +15%', bonus: { uniqueSkillDmgPct: 15 } },
    { id: 11, layer: 3, reqAwakening: 2, reqPrevLayerAll: true, shardCost: 50, label: 'HP +320', bonus: { hp: 320 } },
    {
      id: 12,
      layer: 3,
      reqAwakening: 2,
      reqPrevLayerAll: true,
      shardCost: 80,
      label: '究極節点',
      bonus: {},
      roleSpecialByRole: {
        'タンク': { label: '被弾時味方全体障壁5%', bonus: { onHitAllyShieldPct: 5 } },
        'ディーラー': { label: '会心ダメージ +25%', bonus: { critDmg: 25 } },
        'サポーター': { label: '味方全体SPD +6', bonus: { allySpd: 6 } },
        'ヒーラー': { label: '回復時対象ATK +12%', bonus: { onHealAllyAtkPct: 12 } }
      }
    }
  ];

  const RAID_BOSSES = [
    {
      id: 'raid_zerogo',
      name: '終電の黒鉄巨像・零号',
      subtitle: '軌道封鎖の重装甲残響',
      skills: [
        {
          id: 'rsk_zerogo_1',
          name: '黒鉄の衝撃波',
          targetType: '全体',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.45,
          telegraph: makeTelegraph('黒鉄の衝撃波', '全体', 2, '全体衝撃波の予兆：黒鉄の衝撃波'),
          effects: [{ type: 'damage', ratio: 1.45 }]
        },
        {
          id: 'rsk_zerogo_2',
          name: '重圧鉄槌',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 2.10,
          telegraph: makeTelegraph('重圧鉄槌', '単体', 1, '単体強打の予兆：重圧鉄槌'),
          effects: [{ type: 'damage', ratio: 2.10 }, { type: 'debuff', stat: 'defDown', value: 25, duration: 2 }]
        },
        {
          id: 'rsk_zerogo_3',
          name: '過熱装甲',
          targetType: '単体',
          side: 'self',
          cooldown: 4,
          powerRatio: 0,
          telegraph: makeTelegraph('過熱装甲', '単体', 2, '装甲展開の予兆：過熱装甲'),
          effects: [{ type: 'selfShield', ratio: 0.14, duration: 2 }, { type: 'selfAtkUp', value: 20, duration: 2 }]
        }
      ],
      difficulties: [
        { id: 'easy', name: '初級残響', hp: 16000, atk: 240, def: 130, spd: 112, rewards: { echoStones: 80, starCoins: 1200, emblemShards: 12, masteryBooks: 2, minQualityIdx: 1 } },
        { id: 'deep', name: '深層残響', hp: 38000, atk: 340, def: 185, spd: 120, rewards: { echoStones: 140, starCoins: 2400, emblemShards: 24, masteryBooks: 4, minQualityIdx: 2 } },
        { id: 'extreme', name: '極限残響', hp: 75000, atk: 440, def: 235, spd: 128, rewards: { echoStones: 220, starCoins: 4200, emblemShards: 40, masteryBooks: 7, minQualityIdx: 3 } }
      ]
    },
    {
      id: 'raid_tokiori',
      name: '黄昏の大時計・時の檻守',
      subtitle: '停滞刻限の監視体',
      skills: [
        {
          id: 'rsk_tokiori_1',
          name: '刻限の滅鐘',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.55,
          telegraph: makeTelegraph('刻限の滅鐘', '全体', 2, '全体時鐘の予兆：刻限の滅鐘'),
          effects: [{ type: 'damage', ratio: 1.55 }, { type: 'debuff', stat: 'spdDown', value: 20, duration: 2 }]
        },
        {
          id: 'rsk_tokiori_2',
          name: '分針の貫穿',
          targetType: '単体',
          side: 'enemy',
          cooldown: 2,
          powerRatio: 2.20,
          telegraph: makeTelegraph('分針の貫穿', '単体', 1, '防御貫通斬撃の予兆：分針の貫穿'),
          effects: [{ type: 'damage', ratio: 2.20, defIgnore: 0.35 }]
        },
        {
          id: 'rsk_tokiori_3',
          name: '時間加速',
          targetType: '単体',
          side: 'self',
          cooldown: 4,
          powerRatio: 0,
          telegraph: makeTelegraph('時間加速', '単体', 2, '自己加速の予兆：時間加速'),
          effects: [{ type: 'selfSpdUp', value: 30, duration: 2 }, { type: 'selfAtkUp', value: 15, duration: 2 }]
        }
      ],
      difficulties: [
        { id: 'easy', name: '初級残響', hp: 22000, atk: 270, def: 145, spd: 118, rewards: { echoStones: 100, starCoins: 1500, emblemShards: 15, masteryBooks: 3, minQualityIdx: 1 } },
        { id: 'deep', name: '深層残響', hp: 48000, atk: 375, def: 200, spd: 126, rewards: { echoStones: 170, starCoins: 3000, emblemShards: 28, masteryBooks: 5, minQualityIdx: 2 } },
        { id: 'extreme', name: '極限残響', hp: 92000, atk: 485, def: 250, spd: 134, rewards: { echoStones: 260, starCoins: 5200, emblemShards: 48, masteryBooks: 8, minQualityIdx: 3 } }
      ]
    },
    {
      id: 'raid_zankyo_ryu',
      name: '深層聖域の虚白竜・残響王',
      subtitle: '境界最奥の共鳴竜',
      skills: [
        {
          id: 'rsk_zankyo_ryu_1',
          name: '虚白の終末息吹',
          targetType: '全体',
          side: 'enemy',
          cooldown: 4,
          powerRatio: 1.70,
          telegraph: makeTelegraph('虚白の終末息吹', '全体', 2, '終末全体ブレスの予兆：虚白の終末息吹'),
          effects: [{ type: 'damage', ratio: 1.70 }, { type: 'dispel', count: 1 }]
        },
        {
          id: 'rsk_zankyo_ryu_2',
          name: '竜尾の薙ぎ払い',
          targetType: '範囲',
          side: 'enemy',
          cooldown: 3,
          powerRatio: 1.50,
          telegraph: makeTelegraph('竜尾の薙ぎ払い', '範囲', 1, '範囲強襲の予兆：竜尾の薙ぎ払い'),
          effects: [{ type: 'damage', ratio: 1.50 }, { type: 'gaugeDown', value: 25 }]
        },
        {
          id: 'rsk_zankyo_ryu_3',
          name: '聖域共鳴再生',
          targetType: '単体',
          side: 'self',
          cooldown: 4,
          powerRatio: 0,
          telegraph: makeTelegraph('聖域共鳴再生', '単体', 2, '共鳴再生の予兆：聖域共鳴再生'),
          effects: [{ type: 'selfHealPct', ratio: 0.10 }, { type: 'cleanseAll' }, { type: 'selfDmgDown', value: 20, duration: 2 }]
        }
      ],
      difficulties: [
        { id: 'easy', name: '初級残響', hp: 28000, atk: 310, def: 165, spd: 122, rewards: { echoStones: 120, starCoins: 1800, emblemShards: 18, masteryBooks: 3, minQualityIdx: 1 } },
        { id: 'deep', name: '深層残響', hp: 62000, atk: 420, def: 220, spd: 130, rewards: { echoStones: 200, starCoins: 3600, emblemShards: 34, masteryBooks: 6, minQualityIdx: 2 } },
        { id: 'extreme', name: '極限残響', hp: 118000, atk: 540, def: 275, spd: 138, rewards: { echoStones: 320, starCoins: 6400, emblemShards: 58, masteryBooks: 10, minQualityIdx: 3 } }
      ]
    }
  ];

  const ABYSS_CONFIG = {
    baseHpScale: 1.0,
    perFloorGrowth: 0.08,
    milestoneInterval: 5,
    bonusRewardInterval: 10,
    milestoneRewards: {
      echoStones: 300,
      exchangeCrystals: 15,
      minQualityIdx: 2
    }
  };

  const TRIALS = [
    {
      id: 'trial_1',
      name: '第一試練・無銘の境界',
      description: 'SSRキャラの編成を禁ずる（SR以下のみで踏破）。',
      rules: { noSSR: true },
      rewards: { echoStones: 250, starCoins: 2500, emblemShards: 25 }
    },
    {
      id: 'trial_2',
      name: '第二試練・常人の意地',
      description: 'Rキャラのみでの編成を課す試練。',
      rules: { onlyR: true },
      rewards: { echoStones: 320, starCoins: 3200, universalShards: 1 }
    },
    {
      id: 'trial_3',
      name: '第三試練・癒しなき夜道',
      description: 'ヒーラーの編成を禁ずる試練。',
      rules: { noHealer: true },
      rewards: { echoStones: 280, starCoins: 2800, masteryBooks: 5 }
    },
    {
      id: 'trial_4',
      name: '第四試練・無防備の突破',
      description: 'タンクの編成を禁ずる試練。',
      rules: { noTank: true },
      rewards: { echoStones: 280, starCoins: 2800, qualityCatalysts: 2 }
    },
    {
      id: 'trial_5',
      name: '第五試練・双星の残響',
      description: '2人以下の少人数編成での突破を課す試練。',
      rules: { maxPartySize: 2 },
      rewards: { echoStones: 400, exchangeCrystals: 20, emblemShards: 40 }
    }
  ];

  function validateTrialParty(trialId, partyChars) {
    let trial = null;
    for (let i = 0; i < TRIALS.length; i += 1) {
      if (TRIALS[i].id === trialId) {
        trial = TRIALS[i];
        break;
      }
    }
    if (!trial) {
      return { ok: false, reasons: ['指定された制約試練が存在しません'] };
    }
    const list = Array.isArray(partyChars) ? partyChars.filter(Boolean) : [];
    if (list.length === 0) {
      return { ok: false, reasons: ['編成メンバーが0人です'] };
    }
    const reasons = [];
    const seenIds = new Set();
    let hasDuplicate = false;
    for (let i = 0; i < list.length; i += 1) {
      const ch = list[i];
      if (!ch || typeof ch.id !== 'string' || ch.id.length === 0) {
        reasons.push('編成メンバーの情報が不正です');
        break;
      }
      if (seenIds.has(ch.id)) {
        hasDuplicate = true;
      }
      seenIds.add(ch.id);
    }
    if (hasDuplicate) {
      reasons.push('同じキャラクターを重複して編成することはできません');
    }
    const rules = trial.rules;
    if (rules.noSSR && list.some(function (c) { return c.rarity === 'SSR'; })) {
      reasons.push('制約違反：SSRキャラが含まれています');
    }
    if (rules.onlyR && list.some(function (c) { return c.rarity !== 'R'; })) {
      reasons.push('制約違反：R以外のキャラが含まれています');
    }
    if (rules.noHealer && list.some(function (c) { return c.role === 'ヒーラー'; })) {
      reasons.push('制約違反：ヒーラーが含まれています');
    }
    if (rules.noTank && list.some(function (c) { return c.role === 'タンク'; })) {
      reasons.push('制約違反：タンクが含まれています');
    }
    if (typeof rules.maxPartySize === 'number' && list.length > rules.maxPartySize) {
      reasons.push('制約違反：編成人数が上限（' + rules.maxPartySize + '人）を超えています');
    }
    return {
      ok: reasons.length === 0,
      reasons
    };
  }

  const SUMMON_CONFIG = {
    currency: 'echoStones',
    singleCost: 150,
    tenCost: 1500,
    rates: { SSR: 0.04, SR: 0.18, R: 0.78 },
    pitySSR: 80,
    srGuaranteeInterval: 40,
    tenPullGuaranteeSR: true,
    pickupShareWithinSSR: 0.70,
    dupeShardsPerPull: 1,
    maxAwakenCrystalConversion: { SSR: 50, SR: 15, R: 5 }
  };

  const BANNERS = [
    {
      id: 'banner_pu_1',
      name: '夜霧と氷刃の残響',
      type: 'pickup',
      description: 'SSR「氷室 宗一郎」「神崎 澪」の出現率が上昇する召喚。',
      pickupCharIds: ['char_himuro_soichiro', 'char_kanzaki_mio']
    },
    {
      id: 'banner_pu_2',
      name: '紫電と星夜の調律',
      type: 'pickup',
      description: 'SSR「九条 蓮司」「水無瀬 栞」の出現率が上昇する召喚。',
      pickupCharIds: ['char_kujo_renji', 'char_minase_shiori']
    },
    {
      id: 'banner_pu_3',
      name: '不動の盾と彼岸灯',
      type: 'pickup',
      description: 'SSR「桐生 貴史」「白石 澄花」の出現率が上昇する召喚。',
      pickupCharIds: ['char_kiryu_takashi', 'char_shiraishi_sumika']
    },
    {
      id: 'banner_standard',
      name: '常夜の境界召喚',
      type: 'standard',
      description: 'すべての仲間が均等に出現する常設召喚。',
      pickupCharIds: []
    }
  ];

  const EXPEDITION_ZONES = [
    {
      id: 'exp_1',
      name: '無人駅の残響調査',
      requiredBattles: 3,
      maxChars: 2,
      description: '戦闘3回ごとに報酬を持ち帰る入門調査区画。',
      rewards: { echoStones: 80, starCoins: 600, emblemShards: 10 }
    },
    {
      id: 'exp_2',
      name: '旧校舎の記憶回収',
      requiredBattles: 5,
      maxChars: 2,
      description: '戦闘5回ごとに熟練の書と良質以上の装備を持ち帰る。',
      rewards: { echoStones: 130, starCoins: 1000, masteryBooks: 3, guaranteedEquipQualityMin: 1 }
    },
    {
      id: 'exp_3',
      name: '地下機都の資材探索',
      requiredBattles: 8,
      maxChars: 3,
      description: '戦闘8回ごとに紋章片・熟練の書・秀以上の装備を持ち帰る。',
      rewards: { echoStones: 200, emblemShards: 22, masteryBooks: 5, guaranteedEquipQualityMin: 2 }
    },
    {
      id: 'exp_4',
      name: '境界聖域の深層踏査',
      requiredBattles: 12,
      maxChars: 4,
      description: '戦闘12回ごとに交換結晶と高価値資材を持ち帰る深層区画。',
      rewards: { echoStones: 320, exchangeCrystals: 15, emblemShards: 35, guaranteedEquipQualityMin: 2 }
    }
  ];

  const CRYSTAL_SHOP_ITEMS = [
    { id: 'shop_universal_shard', name: '汎用覚醒結晶 ×1', costCrystals: 20, reward: { universalShards: 1 } },
    { id: 'shop_mastery_book', name: '熟練の書 ×5', costCrystals: 10, reward: { masteryBooks: 5 } },
    { id: 'shop_emblem_pack', name: '境界の紋章片 ×30', costCrystals: 12, reward: { emblemShards: 30 } },
    { id: 'shop_catalyst', name: '品質昇格触媒 ×3', costCrystals: 18, reward: { qualityCatalysts: 3 } },
    { id: 'shop_sk_ssr_hoshiochi', name: '収集技『星墜の断罪剣』', costCrystals: 45, reward: { skillId: 'sk_ssr_hoshiochi' } },
    { id: 'shop_sk_ssr_seiiki', name: '収集技『星海の聖域展開』', costCrystals: 45, reward: { skillId: 'sk_ssr_seiiki' } },
    { id: 'shop_sk_sr_seifu', name: '収集技『癒しの清風』', costCrystals: 20, reward: { skillId: 'sk_sr_seifu' } }
  ];

  const MasterData = {
    TITLE: '異界残響録',
    RARITY_ORDER: ['SSR', 'SR', 'R'],
    ROLE_ORDER: ['タンク', 'ディーラー', 'サポーター', 'ヒーラー'],
    EQUIP_SLOTS: ['主器', '護符', '装具', '印章'],
    ENEMIES,
    AREAS,
    STAGE_MAP,
    CHARACTERS,
    CHARACTER_MAP,
    AWAKENING_TIERS,
    SKILLS,
    SKILL_MAP,
    SKILL_MASTERY_RANKS,
    SETS,
    SET_MAP,
    QUALITY_RANKS,
    EQUIP_SYNTHESIS_RULES,
    EQUIPS,
    EQUIP_MAP,
    EMBLEM_NODES,
    RAID_BOSSES,
    ABYSS_CONFIG,
    TRIALS,
    validateTrialParty,
    SUMMON_CONFIG,
    BANNERS,
    EXPEDITION_ZONES,
    CRYSTAL_SHOP_ITEMS
  };

  const freezeFn = (IkaiApp.Env && typeof IkaiApp.Env.deepFreeze === 'function')
    ? IkaiApp.Env.deepFreeze
    : fallbackDeepFreeze;

  IkaiApp.MasterData = freezeFn(MasterData);
})(typeof window !== 'undefined' ? window : globalThis);
