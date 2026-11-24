(function () {
  'use strict';

  const Hacha = window.Hacha;

  /* 戦闘勝利ごとに異界派遣を自動進行（リアルタイム待ち一切なし） */
  function advanceDispatchesOnVictory(state) {
    const reports = [];
    const missions = Hacha.data.DISPATCH_MISSIONS;

    state.dispatches.forEach((slotObj) => {
      if (!slotObj.active || !slotObj.charIds.length) return;
      const mission = missions.find((m) => m.id === slotObj.missionId);
      if (!mission) return;

      slotObj.progress = (slotObj.progress || 0) + 1;
      if (slotObj.progress < mission.needBattles) return;

      /* 派遣完了！適正種族ボーナス算出 */
      let matchCount = 0;
      slotObj.charIds.forEach((cid) => {
        const c = Hacha.data.CHARACTER_MAP[cid];
        if (c && c.races.some((r) => mission.preferredRaces.includes(r))) matchCount++;
      });
      const mult = 1 + (slotObj.charIds.length - 1) * 0.25 + matchCount * 0.22;

      const coins = Math.round(mission.rewards.coins * mult);
      const crystals = Math.round(mission.rewards.crystals * mult);
      const scrolls = Math.round(mission.rewards.scrolls * mult);
      const fragments = Math.round(mission.rewards.fragments * mult);

      state.resources.coins += coins;
      state.resources.scrolls += scrolls;
      state.resources.fragments += fragments;

      const roles = ['tank', 'dealer', 'supporter', 'healer'];
      const crystalSplit = { tank: 0, dealer: 0, supporter: 0, healer: 0 };
      for (let i = 0; i < crystals; i++) {
        const r = roles[i % 4];
        state.resources.crystals[r] += 1;
        crystalSplit[r] += 1;
      }

      let dropResult = null;
      if (Math.random() < (mission.rewards.gearChance || 0)) {
        const pool = Hacha.data.EQUIPMENT.map((e) => e.id);
        dropResult = Hacha.engine.stats.rollEquipmentDrop(
          state, pool, mission.rewards.minQuality || 65, matchCount * 0.015
        );
      }

      reports.push({
        slot: slotObj.slot,
        missionName: mission.name,
        icon: mission.icon,
        coins,
        crystals,
        scrolls,
        fragments,
        dropResult
      });

      if (slotObj.autoRepeat) {
        slotObj.progress = 0;
      } else {
        slotObj.progress = 0;
        slotObj.active = false;
      }
    });

    return reports;
  }

  /* 進行・討伐条件によるキャラクター自動スカウト加入チェック（ガチャ無し） */
  const SCOUT_RULES = [
    { charId: 'c_fire_dealer',    check: (p) => !!p.clearedStages.area1_s5 },
    { charId: 'c_fire_supporter', check: (p) => !!p.clearedStages.area1_s10 },
    { charId: 'c_fire_healer',    check: (p) => (p.intruderKills || 0) >= 2 },
    { charId: 'c_water_tank',     check: (p) => !!p.clearedStages.area2_s5 },
    { charId: 'c_water_supporter',check: (p) => !!p.clearedStages.area2_s10 },
    { charId: 'c_water_healer',   check: (p) => (p.bestTowerFloor || 0) >= 5 },
    { charId: 'c_wind_tank',      check: (p) => !!p.clearedStages.area3_s5 },
    { charId: 'c_wind_dealer',    check: (p) => !!p.clearedStages.area3_s10 },
    { charId: 'c_wind_healer',    check: (p) => Object.keys(p.bossCleared || {}).length >= 1 },
    { charId: 'c_light_tank',     check: (p) => !!p.clearedStages.area4_s5 },
    { charId: 'c_light_dealer',   check: (p) => !!p.clearedStages.area4_s10 },
    { charId: 'c_light_supporter',check: (p) => Object.keys(p.trialCleared || {}).length >= 1 },
    { charId: 'c_dark_tank',      check: (p) => !!p.clearedStages.area5_s5 },
    { charId: 'c_dark_supporter', check: (p) => !!p.clearedStages.area5_s10 },
    { charId: 'c_dark_healer',    check: (p) => (p.intruderKills || 0) >= 5 },
    { charId: 'c_none_dealer',    check: (p) => (p.bestTowerFloor || 0) >= 10 },
    { charId: 'c_none_supporter', check: (p) => Object.keys(p.bossCleared || {}).length >= 3 },
    { charId: 'c_none_healer',    check: (p) => Object.keys(p.chaosCleared || {}).length >= 2 }
  ];

  function checkScoutUnlocks(state) {
    const joined = [];
    SCOUT_RULES.forEach((rule) => {
      const prog = state.chars[rule.charId];
      if (prog && !prog.unlocked && rule.check(state.progress)) {
        prog.unlocked = true;
        if (!state.codex.chars.includes(rule.charId)) {
          state.codex.chars.push(rule.charId);
        }
        const def = Hacha.data.CHARACTER_MAP[rule.charId];
        if (def) joined.push(def);
      }
    });
    return joined;
  }

  Hacha.engine.dispatch = {
    advanceDispatchesOnVictory,
    checkScoutUnlocks
  };
})();
