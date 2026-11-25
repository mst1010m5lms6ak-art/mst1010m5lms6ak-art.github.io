(function () {
  'use strict';

  const HS = window.HS;

  // 1. Normal Areas: 6 Areas x 10 Stages (5 WAVEs each, normal mobs 1-4 random, intruder on non-boss WAVEs, auto-loop ON)
  const NORMAL_AREAS = [
    {
      id: 1,
      name: '境界の廃都市',
      theme: '現代廃墟 × 魔導境界',
      element: 'none',
      setId: 'ruin_guard',
      mobs: ['e_a1_slime', 'e_a1_drone', 'e_a1_hound'],
      intruderPool: ['e_int_gold', 'e_int_knight'],
      bossId: 'e_a1_boss',
      baseScale: 1.0,
      stageStep: 0.11,
      goldBase: 140,
      crystalBase: 3,
      shardBase: 1,
      clearUnlockChar: 'c_light_celes'
    },
    {
      id: 2,
      name: '紅蓮機甲溶炉',
      theme: 'SF溶鉱炉 × 炎竜',
      element: 'fire',
      setId: 'forge_flame',
      mobs: ['e_a2_imp', 'e_a2_golem', 'e_a2_drake'],
      intruderPool: ['e_int_gold', 'e_int_dragon'],
      bossId: 'e_a2_boss',
      baseScale: 1.55,
      stageStep: 0.13,
      goldBase: 260,
      crystalBase: 5,
      shardBase: 2,
      clearUnlockChar: 'c_fire_zenos'
    },
    {
      id: 3,
      name: '蒼穹の水晶海',
      theme: '深海神殿 × 妖精',
      element: 'water',
      setId: 'crystal_tide',
      mobs: ['e_a3_nymph', 'e_a3_serpent', 'e_a3_crab'],
      intruderPool: ['e_int_gold', 'e_int_knight', 'e_int_dragon'],
      bossId: 'e_a3_boss',
      baseScale: 2.25,
      stageStep: 0.15,
      goldBase: 410,
      crystalBase: 8,
      shardBase: 3,
      clearUnlockChar: 'c_water_levi'
    },
    {
      id: 4,
      name: '翠嵐の獣王峡',
      theme: '古代遺跡 × 獣王',
      element: 'wind',
      setId: 'gale_fang',
      mobs: ['e_a4_wolf', 'e_a4_shaman', 'e_a4_golem'],
      intruderPool: ['e_int_gold', 'e_int_knight', 'e_int_dragon'],
      bossId: 'e_a4_boss',
      baseScale: 3.15,
      stageStep: 0.17,
      goldBase: 610,
      crystalBase: 11,
      shardBase: 4,
      clearUnlockChar: 'c_wind_fenrir'
    },
    {
      id: 5,
      name: '閃光の天界回廊',
      theme: '星間要塞 × 天界神族',
      element: 'light',
      setId: 'astral_halo',
      mobs: ['e_a5_valk', 'e_a5_turret', 'e_a5_seraph'],
      intruderPool: ['e_int_gold', 'e_int_knight', 'e_int_dragon'],
      bossId: 'e_a5_boss',
      baseScale: 4.3,
      stageStep: 0.20,
      goldBase: 880,
      crystalBase: 15,
      shardBase: 6,
      clearUnlockChar: 'c_light_sol'
    },
    {
      id: 6,
      name: '終焉の混沌深淵',
      theme: '全界融合 × 混沌深淵',
      element: 'dark',
      setId: 'abyss_eclipse',
      mobs: ['e_a6_reaper', 'e_a6_dragon', 'e_a6_oracle'],
      intruderPool: ['e_int_gold', 'e_int_knight', 'e_int_dragon'],
      bossId: 'e_a6_boss',
      baseScale: 5.8,
      stageStep: 0.24,
      goldBase: 1280,
      crystalBase: 21,
      shardBase: 9,
      clearUnlockChar: 'c_dark_lilith'
    }
  ];

  // 2. Otherworld Towers (異界塔Ⅰ / 異界塔Ⅱ — 100F each, 1-time rewards, strong enemies, 100F char unlock, NO auto-loop)
  const TOWERS = [
    {
      id: 1,
      name: '異界塔Ⅰ・白銀天階',
      shortName: '異界塔Ⅰ',
      maxFloor: 100,
      requireTowerId: null,
      rewardCharId: 'c_light_aurelia',
      baseScale: 1.45,
      floorGrowth: 0.048,
      apexBossId: 'e_tw1_100',
      setPool: ['ruin_guard', 'forge_flame', 'crystal_tide', 'gale_fang', 'astral_halo', 'oath_restraint']
    },
    {
      id: 2,
      name: '異界塔Ⅱ・終焉演算塔',
      shortName: '異界塔Ⅱ',
      maxFloor: 100,
      requireTowerId: 1,
      rewardCharId: 'c_dark_omega',
      baseScale: 5.2,
      floorGrowth: 0.068,
      apexBossId: 'e_tw2_100',
      setPool: ['astral_halo', 'abyss_eclipse', 'wander_chaos', 'oath_restraint']
    }
  ];

  // 3. Element Raids (異界レイド — 6 Elements, Selectable Lv.1..10, High HP, Raid-Exclusive Gear, NO auto-loop)
  const RAIDS = [
    { id: 'raid_fire',  element: 'fire',  name: '炎界レイド・業火覇竜', bossId: 'e_raid_fire',  setId: 'raid_inferno' },
    { id: 'raid_water', element: 'water', name: '水界レイド・深海覇皇', bossId: 'e_raid_water', setId: 'raid_leviathan' },
    { id: 'raid_wind',  element: 'wind',  name: '風界レイド・神風天翔', bossId: 'e_raid_wind',  setId: 'raid_tempest' },
    { id: 'raid_light', element: 'light', name: '光界レイド・天穹審判', bossId: 'e_raid_light', setId: 'raid_seraph' },
    { id: 'raid_dark',  element: 'dark',  name: '闇界レイド・永劫虚無', bossId: 'e_raid_dark',  setId: 'raid_nihil' },
    { id: 'raid_none',  element: 'none',  name: '無界レイド・無垢原初', bossId: 'e_raid_none',  setId: 'raid_origin' }
  ];

  // 4. Constraint Realms (制約異界 — Element/Race/Role Restrictions, NO auto-loop)
  const CONSTRAINTS = [
    {
      id: 'con_fire',
      name: '紅蓮試練域',
      ruleText: '前衛は炎属性のみで出撃',
      scale: 2.1,
      mobs: ['e_a4_wolf', 'e_a4_shaman', 'e_a4_golem'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'forge_flame'],
      gold: 1600, crystal: 24, shard: 10,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.element === 'fire')
    },
    {
      id: 'con_water',
      name: '蒼海試練域',
      ruleText: '前衛は水属性のみで出撃',
      scale: 2.3,
      mobs: ['e_a2_imp', 'e_a2_golem', 'e_a2_drake'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'crystal_tide'],
      gold: 1750, crystal: 26, shard: 11,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.element === 'water')
    },
    {
      id: 'con_wind',
      name: '翠嵐試練域',
      ruleText: '前衛は風属性のみで出撃',
      scale: 2.5,
      mobs: ['e_a3_nymph', 'e_a3_serpent', 'e_a3_crab'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'gale_fang'],
      gold: 1900, crystal: 28, shard: 12,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.element === 'wind')
    },
    {
      id: 'con_lightdark',
      name: '光闇相剋域',
      ruleText: '前衛は光または闇属性のみで出撃',
      scale: 3.2,
      mobs: ['e_a5_valk', 'e_a6_reaper', 'e_a6_oracle'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'astral_halo', 'abyss_eclipse'],
      gold: 2400, crystal: 36, shard: 15,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.element === 'light' || c.element === 'dark')
    },
    {
      id: 'con_nonhuman',
      name: '異種族の聖域',
      ruleText: '前衛に人間種族を含めず出撃',
      scale: 3.0,
      mobs: ['e_a4_wolf', 'e_a5_turret', 'e_a6_dragon'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos'],
      gold: 2300, crystal: 34, shard: 14,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => !c.races.includes('human'))
    },
    {
      id: 'con_mythic',
      name: '竜神魔の玉座',
      ruleText: '前衛は竜・神・魔物いずれかを持つ者のみ',
      scale: 3.8,
      mobs: ['e_a5_valk', 'e_a6_dragon', 'e_a6_reaper'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'abyss_eclipse'],
      gold: 2900, crystal: 42, shard: 18,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.races.some((r) => r === 'dragon' || r === 'god' || r === 'demon'))
    },
    {
      id: 'con_wildtech',
      name: '精獣機の交差点',
      ruleText: '前衛は妖精・獣・機械いずれかを持つ者のみ',
      scale: 3.5,
      mobs: ['e_a3_crab', 'e_a4_golem', 'e_a5_seraph'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'gale_fang'],
      gold: 2650, crystal: 38, shard: 16,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.races.some((r) => r === 'fairy' || r === 'beast' || r === 'machine'))
    },
    {
      id: 'con_nohealer',
      name: '背水無癒の回廊',
      ruleText: 'ヒーラーを編成せずに出撃',
      scale: 4.1,
      mobs: ['e_a5_valk', 'e_a6_reaper', 'e_a6_dragon'],
      bossId: 'e_con_warden',
      setPool: ['oath_restraint', 'wander_chaos', 'astral_halo'],
      gold: 3300, crystal: 48, shard: 22,
      check: (frontChars) => frontChars.length > 0 && frontChars.every((c) => c.role !== 'healer')
    }
  ];

  // 5. Surplus Character Expeditions (異界遠征隊 — Offline time + Battle clear acceleration)
  const EXPEDITIONS = [
    {
      id: 'exp_gold',
      name: '廃都の遺貨回収',
      durationSec: 180,
      clearAccelSec: 36,
      desc: '大量の世界貨を持ち帰る。派遣人数が多いほど報酬倍率上昇。',
      rewards: { gold: 520, crystal: 3, shard: 1, equipChance: 0.25 }
    },
    {
      id: 'exp_crystal',
      name: '水晶脈の結晶採掘',
      durationSec: 240,
      clearAccelSec: 45,
      desc: 'アビリティ解放用の戦術結晶を集中的に採掘する。',
      rewards: { gold: 280, crystal: 14, shard: 2, equipChance: 0.30 }
    },
    {
      id: 'exp_shard',
      name: '深淵の刻印欠片探索',
      durationSec: 300,
      clearAccelSec: 55,
      desc: 'キャラ刻印覚醒に必要な刻印欠片を探し出す。',
      rewards: { gold: 340, crystal: 6, shard: 9, equipChance: 0.35 }
    },
    {
      id: 'exp_relic',
      name: '異界狭間の遺物発掘',
      durationSec: 360,
      clearAccelSec: 60,
      desc: '高品質になりやすい装備品と資源をまとめて持ち帰る。',
      rewards: { gold: 420, crystal: 8, shard: 4, equipChance: 1.0, minQuality: 68 }
    }
  ];

  // Build enemy WAVE roster for any battle config
  function buildBattlePlan(config) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const makeWaveEnemy = (enemyId, scale, isBoss, isIntruder, nameSuffix) => {
      const def = HS.Data.ENEMY_MAP[enemyId];
      return {
        enemyId,
        name: nameSuffix ? `${def.name}${nameSuffix}` : def.name,
        scale,
        isBoss: Boolean(isBoss),
        isIntruder: Boolean(isIntruder)
      };
    };

    if (config.mode === 'normal') {
      const area = NORMAL_AREAS.find((a) => a.id === config.areaId) || NORMAL_AREAS[0];
      const stageNum = Math.max(1, Math.min(10, Number(config.stageNum) || 1));
      const stageScale = area.baseScale * (1 + (stageNum - 1) * area.stageStep);
      const waves = [];
      let intruderCount = 0;

      for (let w = 1; w <= 4; w++) {
        const count = 1 + Math.floor(Math.random() * 4); // 1-4 random enemies!
        const list = [];
        // Non-boss WAVE intruder chance (18% per wave, capped naturally)
        const hasIntruder = Math.random() < 0.18;
        if (hasIntruder) {
          intruderCount++;
          list.push(makeWaveEnemy(pick(area.intruderPool), stageScale * 1.12, false, true));
        }
        while (list.length < count) {
          list.push(makeWaveEnemy(pick(area.mobs), stageScale * (0.94 + Math.random() * 0.12), false, false));
        }
        waves.push({ waveNum: w, hasIntruder, enemies: list });
      }
      // WAVE 5: Area Boss + 1-2 escorts
      const bossWave = [makeWaveEnemy(area.bossId, stageScale * (stageNum === 10 ? 1.28 : 1.06), true, false)];
      if (stageNum >= 4) {
        bossWave.push(makeWaveEnemy(pick(area.mobs), stageScale * 0.95, false, false));
      }
      if (stageNum >= 8) {
        bossWave.push(makeWaveEnemy(pick(area.mobs), stageScale * 0.98, false, false));
      }
      waves.push({ waveNum: 5, hasIntruder: false, isBossWave: true, enemies: bossWave });

      return {
        mode: 'normal',
        allowAutoLoop: true,
        areaId: area.id,
        stageNum,
        title: `${area.name} ${area.id}-${stageNum}`,
        setPool: [area.setId],
        intruderCount,
        goldReward: Math.round(area.goldBase * (1 + (stageNum - 1) * 0.16)),
        crystalReward: Math.round(area.crystalBase * (1 + (stageNum - 1) * 0.12)),
        shardReward: Math.round(area.shardBase * (1 + (stageNum - 1) * 0.14)),
        minQuality: Math.min(55, 1 + (area.id - 1) * 8 + stageNum),
        waves
      };
    }

    if (config.mode === 'tower') {
      const tower = TOWERS.find((t) => t.id === config.towerId) || TOWERS[0];
      const floor = Math.max(1, Math.min(tower.maxFloor, Number(config.floor) || 1));
      const scale = tower.baseScale * Math.pow(1 + tower.floorGrowth, floor - 1);
      const mobPool = NORMAL_AREAS.flatMap((a) => a.mobs);
      const waves = [];

      if (floor === 100) {
        waves.push({
          waveNum: 1,
          isBossWave: true,
          enemies: [
            makeWaveEnemy(tower.apexBossId, 1.0, true, false),
            makeWaveEnemy('e_tw_guard1', scale * 0.36, false, false),
            makeWaveEnemy('e_tw_guard2', scale * 0.36, false, false)
          ]
        });
      } else {
        const isMilestone = floor % 10 === 0;
        const isMidBoss = floor % 5 === 0;
        waves.push({
          waveNum: 1,
          enemies: [
            makeWaveEnemy(pick(mobPool), scale * 1.15, false, false),
            makeWaveEnemy(pick(mobPool), scale * 1.15, false, false),
            makeWaveEnemy(pick(mobPool), scale * 1.18, false, false)
          ]
        });
        waves.push({
          waveNum: 2,
          isBossWave: true,
          enemies: isMilestone
            ? [
                makeWaveEnemy(floor % 20 === 0 ? 'e_tw_guard2' : 'e_tw_guard1', scale * 0.85, true, false),
                makeWaveEnemy(pick(mobPool), scale * 1.2, false, false),
                makeWaveEnemy(pick(mobPool), scale * 1.2, false, false)
              ]
            : isMidBoss
              ? [
                  makeWaveEnemy(NORMAL_AREAS[(floor / 5 - 1) % NORMAL_AREAS.length].bossId, scale * 0.82, true, false),
                  makeWaveEnemy(pick(mobPool), scale * 1.12, false, false)
                ]
              : [
                  makeWaveEnemy(pick(mobPool), scale * 1.25, false, false),
                  makeWaveEnemy(pick(mobPool), scale * 1.25, false, false),
                  makeWaveEnemy(pick(mobPool), scale * 1.22, false, false),
                  makeWaveEnemy(pick(mobPool), scale * 1.22, false, false)
                ]
        });
      }

      return {
        mode: 'tower',
        allowAutoLoop: false,
        towerId: tower.id,
        floor,
        title: `${tower.shortName} ${floor}F`,
        setPool: tower.setPool,
        intruderCount: 0,
        goldReward: Math.round((320 + floor * 48) * (tower.id === 2 ? 2.4 : 1)),
        crystalReward: Math.round((6 + Math.floor(floor * 0.7)) * (tower.id === 2 ? 2 : 1)),
        shardReward: Math.round((3 + Math.floor(floor * 0.35)) * (tower.id === 2 ? 2 : 1)),
        minQuality: Math.min(82, 25 + Math.floor(floor * 0.5) + (tower.id === 2 ? 15 : 0)),
        waves
      };
    }

    if (config.mode === 'raid') {
      const raid = RAIDS.find((r) => r.id === config.raidId) || RAIDS[0];
      const raidLv = Math.max(1, Math.min(10, Number(config.raidLv) || 1));
      const scale = 0.72 * Math.pow(1.32, raidLv - 1);
      return {
        mode: 'raid',
        allowAutoLoop: false,
        raidId: raid.id,
        raidLv,
        title: `${raid.name} Lv.${raidLv}`,
        setPool: [raid.setId],
        intruderCount: 0,
        goldReward: Math.round(520 * Math.pow(1.28, raidLv - 1)),
        crystalReward: Math.round(10 + raidLv * 5),
        shardReward: Math.round(4 + raidLv * 3),
        minQuality: Math.min(85, 20 + raidLv * 6),
        guaranteedDrops: raidLv >= 6 ? 2 : 1,
        waves: [
          {
            waveNum: 1,
            isBossWave: true,
            enemies: [makeWaveEnemy(raid.bossId, scale, true, false, ` Lv.${raidLv}`)]
          }
        ]
      };
    }

    // Constraint Realm
    const con = CONSTRAINTS.find((c) => c.id === config.constraintId) || CONSTRAINTS[0];
    return {
      mode: 'constraint',
      allowAutoLoop: false,
      constraintId: con.id,
      title: `制約異界・${con.name}`,
      setPool: con.setPool,
      intruderCount: 0,
      goldReward: con.gold,
      crystalReward: con.crystal,
      shardReward: con.shard,
      minQuality: 55,
      guaranteedDrops: 2,
      waves: [
        {
          waveNum: 1,
          enemies: [
            makeWaveEnemy(pick(con.mobs), con.scale * 0.92, false, false),
            makeWaveEnemy(pick(con.mobs), con.scale * 0.95, false, false),
            makeWaveEnemy(pick(con.mobs), con.scale * 0.95, false, false)
          ]
        },
        {
          waveNum: 2,
          isBossWave: true,
          enemies: [
            makeWaveEnemy(con.bossId, con.scale * 0.68, true, false),
            makeWaveEnemy(pick(con.mobs), con.scale * 0.95, false, false),
            makeWaveEnemy(pick(con.mobs), con.scale * 0.95, false, false)
          ]
        }
      ]
    };
  }

  HS.Data.NORMAL_AREAS = NORMAL_AREAS;
  HS.Data.TOWERS = TOWERS;
  HS.Data.RAIDS = RAIDS;
  HS.Data.CONSTRAINTS = CONSTRAINTS;
  HS.Data.EXPEDITIONS = EXPEDITIONS;
  HS.Data.buildBattlePlan = buildBattlePlan;
})();
