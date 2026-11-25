(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  HW.Dispatch = {
    getRemainingSec: function (missionId) {
      const active = HW.State.data.dispatches[missionId];
      if (!active) return 0;
      const elapsed = Math.floor((Date.now() - active.startedAt) / 1000) + (active.bonusCutSec || 0);
      return Math.max(0, active.durationSec - elapsed);
    },

    isComplete: function (missionId) {
      const active = HW.State.data.dispatches[missionId];
      return Boolean(active) && this.getRemainingSec(missionId) <= 0;
    },

    hasAnyComplete: function () {
      return HW.DISPATCH_MISSIONS.some((m) => this.isComplete(m.id));
    },

    start: function (missionId, charIds) {
      const m = HW.DISPATCH_MISSIONS.find((x) => x.id === missionId);
      if (!m || !charIds || charIds.length === 0) return { ok: false };
      if (HW.State.data.dispatches[missionId]) return { ok: false };
      HW.State.data.dispatches[missionId] = {
        missionId: missionId,
        charIds: charIds.slice(0, m.slots),
        startedAt: Date.now(),
        durationSec: m.durationSec,
        bonusCutSec: 0
      };
      HW.Audio.tap();
      HW.State.save();
      return { ok: true };
    },

    /** バトル勝利ごとに稼働中の全探索派遣を時間短縮 */
    onBattleVictory: function () {
      const dispatches = HW.State.data.dispatches || {};
      let changed = false;
      Object.keys(dispatches).forEach((mid) => {
        const d = dispatches[mid];
        const m = HW.DISPATCH_MISSIONS.find((x) => x.id === mid);
        if (d && m) {
          d.bonusCutSec = (d.bonusCutSec || 0) + m.battleCutSec;
          changed = true;
        }
      });
      if (changed) HW.State.save();
    },

    claim: function (missionId) {
      const d = HW.State.data.dispatches[missionId];
      const m = HW.DISPATCH_MISSIONS.find((x) => x.id === missionId);
      if (!d || !m || !this.isComplete(missionId)) return { ok: false };

      const countMult = 0.5 + d.charIds.length * 0.25; // 4人派遣で1.5倍
      const rw = m.rewards;
      const summary = [];

      const gold = Math.round((rw.gold || 0) * countMult);
      if (gold > 0) {
        HW.State.data.gold += gold;
        summary.push(HW.formatNum(gold) + 'G');
      }
      const omni = Math.round((rw.omni || 0) * countMult);
      if (omni > 0) {
        HW.State.data.omniShards += omni;
        summary.push('万能欠片×' + omni);
      }
      if (rw.selfShards) {
        d.charIds.forEach((cid) => {
          const cs = HW.State.data.chars[cid];
          if (cs) cs.shards += rw.selfShards;
        });
        summary.push('派遣キャラ欠片各×' + rw.selfShards);
      }
      if (rw.matId) {
        const amt = Math.round((rw.matCount || 2) * countMult);
        HW.State.data.materials[rw.matId] = (HW.State.data.materials[rw.matId] || 0) + amt;
        summary.push('階位素材×' + amt);
      }
      if (rw.matAll) {
        HW.RANK_MATERIALS.forEach((mat) => {
          HW.State.data.materials[mat.id] = (HW.State.data.materials[mat.id] || 0) + rw.matAll;
        });
        summary.push('全階位素材×' + rw.matAll);
      }
      if (rw.medal) {
        const med = Math.round(rw.medal * countMult);
        HW.State.data.arenaMedals += med;
        summary.push('闘技場メダル×' + med);
      }
      if (rw.equipCount) {
        const normalSets = HW.EQUIP_SETS.filter((s) => !s.arenaOnly);
        let maxFound = 0;
        for (let i = 0; i < rw.equipCount; i++) {
          const set = normalSets[Math.floor(Math.random() * normalSets.length)];
          const drop = HW.State.grantEquipmentDrop(set.id, rw.minQuality || 60);
          if (drop.item.quality >= 100) maxFound++;
        }
        summary.push('装備×' + rw.equipCount + (maxFound > 0 ? ' (極×' + maxFound + '!)' : ''));
      }

      delete HW.State.data.dispatches[missionId];
      HW.Audio.rankUp();
      HW.State.save();
      return { ok: true, summary: summary };
    }
  };
})();
