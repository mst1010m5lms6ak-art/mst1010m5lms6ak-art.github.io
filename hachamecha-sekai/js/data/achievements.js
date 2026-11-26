'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data || (Kairo.data = {});

  const ACHIEVEMENTS = [
    // Battles & farming loops
    { id: 'ach_win_1', title: '境界の初陣', desc: '戦闘に1回勝利する', cat: '戦闘', target: 1, metric: 'totalWins', reward: { gems: 150, gold: 500 } },
    { id: 'ach_win_10', title: '巡回観測者', desc: '戦闘に10回勝利する', cat: '戦闘', target: 10, metric: 'totalWins', reward: { gems: 250, gold: 1200 } },
    { id: 'ach_win_50', title: '熟練の周回者', desc: '戦闘に50回勝利する', cat: '戦闘', target: 50, metric: 'totalWins', reward: { gems: 450, gold: 4000 } },
    { id: 'ach_win_200', title: '永劫の戦線', desc: '戦闘に200回勝利する', cat: '戦闘', target: 200, metric: 'totalWins', reward: { gems: 900, dust: 500 } },
    { id: 'ach_kill_25', title: '異界掃討 I', desc: '敵を累計25体撃破する', cat: '戦闘', target: 25, metric: 'totalKills', reward: { gems: 150, exp: 400 } },
    { id: 'ach_kill_150', title: '異界掃討 II', desc: '敵を累計150体撃破する', cat: '戦闘', target: 150, metric: 'totalKills', reward: { gems: 350, exp: 1800 } },
    { id: 'ach_kill_600', title: '異界掃討 III', desc: '敵を累計600体撃破する', cat: '戦闘', target: 600, metric: 'totalKills', reward: { gems: 750, cores: 2 } },
    { id: 'ach_dmg_1k', title: '千撃の一閃', desc: '単発ダメージ1,000以上を記録', cat: '戦闘', target: 1000, metric: 'maxHitDamage', reward: { gems: 200, gold: 1000 } },
    { id: 'ach_dmg_10k', title: '万象破砕', desc: '単発ダメージ10,000以上を記録', cat: '戦闘', target: 10000, metric: 'maxHitDamage', reward: { gems: 500, dust: 300 } },
    { id: 'ach_dmg_50k', title: '次元断絶の一撃', desc: '単発ダメージ50,000以上を記録', cat: '戦闘', target: 50000, metric: 'maxHitDamage', reward: { gems: 1000, cores: 3 } },

    // Stage & Corridor progression
    { id: 'ach_st_3', title: '剣魔界踏破', desc: '境界領域1-3をクリアする', cat: '踏破', target: 3, metric: 'campaignClearedCount', reward: { gems: 300, exp: 800 } },
    { id: 'ach_st_6', title: '電脳圏制圧', desc: '境界領域2-3をクリアする', cat: '踏破', target: 6, metric: 'campaignClearedCount', reward: { gems: 450, cores: 1 } },
    { id: 'ach_st_9', title: '常世ノ京鎮魂', desc: '境界領域3-3をクリアする', cat: '踏破', target: 9, metric: 'campaignClearedCount', reward: { gems: 600, cores: 2 } },
    { id: 'ach_st_12', title: '機巧都攻略', desc: '境界領域4-3をクリアする', cat: '踏破', target: 12, metric: 'campaignClearedCount', reward: { gems: 800, cores: 3 } },
    { id: 'ach_st_15', title: '五界の調律者', desc: '全15境界領域を踏破する', cat: '踏破', target: 15, metric: 'campaignClearedCount', reward: { gems: 1500, cores: 5 } },
    { id: 'ach_cor_5', title: '無限回廊の入口', desc: '無限回廊5層に到達', cat: '踏破', target: 5, metric: 'maxCorridorFloor', reward: { gems: 300, dust: 150 } },
    { id: 'ach_cor_15', title: '深淵への挑戦者', desc: '無限回廊15層に到達', cat: '踏破', target: 15, metric: 'maxCorridorFloor', reward: { gems: 650, cores: 2 } },
    { id: 'ach_cor_30', title: '無窮の踏破王', desc: '無限回廊30層に到達', cat: '踏破', target: 30, metric: 'maxCorridorFloor', reward: { gems: 1400, cores: 5 } },
    { id: 'ach_boss_1', title: '巨影を討つ者', desc: '次元討伐ボスを1回撃破', cat: '踏破', target: 1, metric: 'bossWins', reward: { gems: 350, cores: 1 } },
    { id: 'ach_boss_10', title: '次元狩人', desc: '次元討伐ボスを10回撃破', cat: '踏破', target: 10, metric: 'bossWins', reward: { gems: 750, cores: 3 } },

    // Summon & Roster
    { id: 'ach_sum_10', title: '共鳴の呼び声', desc: '英雄召喚を累計10回実行', cat: '収集', target: 10, metric: 'totalSummons', reward: { gems: 300, gold: 1500 } },
    { id: 'ach_sum_50', title: '星界の召喚師', desc: '英雄召喚を累計50回実行', cat: '収集', target: 50, metric: 'totalSummons', reward: { gems: 600, cores: 2 } },
    { id: 'ach_sum_150', title: '境界の盟主', desc: '英雄召喚を累計150回実行', cat: '収集', target: 150, metric: 'totalSummons', reward: { gems: 1200, cores: 4 } },
    { id: 'ach_unit_8', title: '異界の旅団', desc: '英雄を8体収集する', cat: '収集', target: 8, metric: 'ownedUnitsCount', reward: { gems: 300, exp: 1200 } },
    { id: 'ach_unit_16', title: '五界大連盟', desc: '英雄を16体収集する', cat: '収集', target: 16, metric: 'ownedUnitsCount', reward: { gems: 700, cores: 2 } },
    { id: 'ach_unit_25', title: '全英雄の契約者', desc: '全25体の英雄を図鑑登録する', cat: '収集', target: 25, metric: 'ownedUnitsCount', reward: { gems: 2000, cores: 6 } },
    { id: 'ach_ur_1', title: '星虹との邂逅', desc: 'UR英雄を1体仲間にする', cat: '収集', target: 1, metric: 'ownedUrCount', reward: { gems: 400, exp: 1500 } },

    // Growth & Relics
    { id: 'ach_lv_20', title: '鍛錬の証 I', desc: 'いずれかの英雄をLv.20にする', cat: '育成', target: 20, metric: 'maxUnitLevel', reward: { gems: 200, gold: 2000 } },
    { id: 'ach_lv_50', title: '鍛錬の証 II', desc: 'いずれかの英雄をLv.50にする', cat: '育成', target: 50, metric: 'maxUnitLevel', reward: { gems: 500, cores: 2 } },
    { id: 'ach_lv_80', title: '限界の先へ', desc: 'いずれかの英雄をLv.80にする', cat: '育成', target: 80, metric: 'maxUnitLevel', reward: { gems: 1000, cores: 4 } },
    { id: 'ach_lb_1', title: '魂の共鳴', desc: '英雄の限界突破を1回行う', cat: '育成', target: 1, metric: 'totalLimitBreaks', reward: { gems: 250, gold: 2000 } },
    { id: 'ach_awaken_1', title: '星核覚醒', desc: '英雄の覚醒を1回行う', cat: '育成', target: 1, metric: 'totalAwakens', reward: { gems: 350, dust: 250 } },
    { id: 'ach_rel_10', title: '遺物発掘者', desc: '遺物を累計10個獲得する', cat: '遺物', target: 10, metric: 'totalRelicsFound', reward: { gems: 200, dust: 120 } },
    { id: 'ach_rel_100', title: '伝説のトレジャーハンター', desc: '遺物を累計100個獲得する', cat: '遺物', target: 100, metric: 'totalRelicsFound', reward: { gems: 600, dust: 450 } },
    { id: 'ach_rel_up_15', title: '極限鍛造', desc: '遺物を+15まで強化する', cat: '遺物', target: 15, metric: 'maxRelicLevel', reward: { gems: 500, dust: 400 } },
    { id: 'ach_reforge_5', title: '厳選の探究者', desc: '遺物の再鍛造を5回行う', cat: '遺物', target: 5, metric: 'totalReforges', reward: { gems: 350, dust: 260 } }
  ];

  // Permanent codex completion passive bonuses
  function computeCodexBonuses(state) {
    const unitCount = Object.keys(state.units || {}).length;
    const setCount = Object.keys(state.codex?.relicSets || {}).length;
    const enemyCount = Object.keys(state.codex?.enemies || {}).length;
    const corridorBonus = Math.min(60, Math.floor((state.progress?.maxCorridorFloor || 0) * 1.5));

    return {
      unitCount,
      setCount,
      enemyCount,
      atkPct: unitCount * 1.5 + corridorBonus,
      hpPct: unitCount * 1.5 + setCount * 2,
      defPct: enemyCount * 0.5 + setCount * 1.5,
      dropPct: Math.min(50, setCount * 4 + Math.floor(enemyCount * 0.5))
    };
  }

  Data.ACHIEVEMENTS = ACHIEVEMENTS;
  Data.computeCodexBonuses = computeCodexBonuses;
})(window);
