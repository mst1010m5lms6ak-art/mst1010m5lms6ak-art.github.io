(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  function createInitialState() {
    const chars = {};
    HW.CHARACTERS.forEach((c) => {
      const unlocked = Boolean(c.starter);
      chars[c.id] = {
        unlocked: unlocked,
        shards: unlocked ? 10 : c.arenaOnly ? 0 : 5,
        star: 1,
        rank: 1,
        rankSlots: [false, false, false, false, false, false],
        abilities: [0, -1, -1, -1, -1], // 初期は1段階目のみ解放、RANK/星で最大5段階
        favoriteUnlocked: false,
        relicUnlocked: false,
        masteryCount: 0, // サガ式「閃き極意」の開花回数
        equips: { weapon: null, armor: null, accessory: null, core: null }
      };
    });

    const materials = {};
    HW.RANK_MATERIALS.forEach((m) => {
      materials[m.id] = 4;
    });

    // 初期体験用の基礎装備（品質45〜75%）
    const starterEquips = [
      { id: HW.uid('eq'), tplId: 'set_crimson_weapon', quality: 68, locked: false },
      { id: HW.uid('eq'), tplId: 'set_crimson_core', quality: 62, locked: false },
      { id: HW.uid('eq'), tplId: 'set_aegis_armor', quality: 72, locked: false },
      { id: HW.uid('eq'), tplId: 'set_gale_accessory', quality: 65, locked: false },
      { id: HW.uid('eq'), tplId: 'set_blossom_weapon', quality: 70, locked: false }
    ];

    chars.c_kagura.equips.weapon = starterEquips[0].id;
    chars.c_kagura.equips.core = starterEquips[1].id;
    chars.c_suiren.equips.armor = starterEquips[2].id;
    chars.c_zephyr.equips.accessory = starterEquips[3].id;
    chars.c_lumina.equips.weapon = starterEquips[4].id;

    return {
      version: 1,
      updatedAt: Date.now(),
      gold: 1200,
      omniShards: 15,
      arenaMedals: 60,
      materials: materials,
      chars: chars,
      inventory: starterEquips,
      party: {
        main: ['c_kagura', 'c_suiren', 'c_zephyr', 'c_lumina'],
        links: [null, null, null, null],
        formationId: 'form_standard'
      },
      raidTeams: [
        ['c_kagura', 'c_suiren', 'c_zephyr', 'c_lumina'],
        [null, null, null, null],
        [null, null, null, null]
      ],
      unlockedFormations: ['form_standard', 'form_phoenix'],
      progress: {
        clearedStages: {},
        towerCleared: { tower_1: 0, tower_2: 0 },
        raidBestDamage: {},
        raidCleared: {},
        restrictionCleared: {},
        arenaRank: 100,
        arenaBestRank: 100,
        arenaWins: 0
      },
      codex: {
        enemiesSeen: {},
        equipsSeen: {
          set_crimson_weapon: true,
          set_crimson_core: true,
          set_aegis_armor: true,
          set_gale_accessory: true,
          set_blossom_weapon: true
        }
      },
      dispatches: {},
      settings: {
        battleSpeed: 3,
        autoSellBelow: 0, // 0=OFF, 55/75/90/99未満を自動売却
        seEnabled: true
      }
    };
  }

  function migrateState(data) {
    const base = createInitialState();
    if (!data || typeof data !== 'object') return base;
    const merged = Object.assign({}, base, data);
    merged.materials = Object.assign({}, base.materials, data.materials || {});
    merged.progress = Object.assign({}, base.progress, data.progress || {});
    merged.progress.towerCleared = Object.assign({}, base.progress.towerCleared, (data.progress && data.progress.towerCleared) || {});
    merged.codex = Object.assign({}, base.codex, data.codex || {});
    merged.settings = Object.assign({}, base.settings, data.settings || {});
    merged.party = Object.assign({}, base.party, data.party || {});
    merged.chars = merged.chars || {};
    HW.CHARACTERS.forEach((c) => {
      if (!merged.chars[c.id]) {
        merged.chars[c.id] = base.chars[c.id];
      } else {
        merged.chars[c.id] = Object.assign({}, base.chars[c.id], merged.chars[c.id]);
        if (!Array.isArray(merged.chars[c.id].abilities) || merged.chars[c.id].abilities.length !== 5) {
          merged.chars[c.id].abilities = [0, -1, -1, -1, -1];
        }
        if (!Array.isArray(merged.chars[c.id].rankSlots) || merged.chars[c.id].rankSlots.length !== 6) {
          merged.chars[c.id].rankSlots = [false, false, false, false, false, false];
        }
      }
    });
    if (!Array.isArray(merged.raidTeams) || merged.raidTeams.length !== 3) {
      merged.raidTeams = base.raidTeams;
    }
    return merged;
  }

  HW.State = {
    data: createInitialState(),

    init: async function () {
      const res = await HW.Storage.loadSave();
      if (res.ok && res.data) {
        this.data = migrateState(res.data);
      } else {
        this.data = createInitialState();
        this.save(true);
      }
      HW.Audio.setEnabled(this.data.settings.seEnabled);
      return res;
    },

    save: function (immediate) {
      this.data.updatedAt = Date.now();
      if (immediate) HW.Storage.saveNow(this.data);
      else HW.Storage.scheduleSave(this.data);
    },

    resetAll: async function () {
      await HW.Storage.clearSave();
      this.data = createInitialState();
      HW.Audio.setEnabled(this.data.settings.seEnabled);
      this.save(true);
    },

    getUnlockedAbilityTiers: function (charId) {
      const cs = this.data.chars[charId];
      if (!cs || !cs.unlocked) return 0;
      // 覚醒★またはRANKの進行で1〜5段階まで解放（初期1、RANK2または★2で2…最大5）
      const byStar = Math.min(5, cs.star);
      const byRank = Math.min(5, 1 + Math.floor((cs.rank - 1) / 2));
      return Math.max(1, Math.min(5, Math.max(byStar, byRank)));
    },

    getRankSlotMaterialId: function (charId, slotIdx) {
      const c = HW.getCharDef(charId);
      const cs = this.data.chars[charId];
      const seed = (HW.getElement(c.element).order + cs.rank + slotIdx) % HW.RANK_MATERIALS.length;
      return HW.RANK_MATERIALS[seed].id;
    },

    getRankSlotCost: function (charId) {
      const cs = this.data.chars[charId];
      return Math.max(1, cs.rank);
    },

    fillRankSlot: function (charId, slotIdx) {
      const cs = this.data.chars[charId];
      if (!cs || !cs.unlocked || cs.rank >= 10 || cs.rankSlots[slotIdx]) return { ok: false };
      const matId = this.getRankSlotMaterialId(charId, slotIdx);
      const cost = this.getRankSlotCost(charId);
      if ((this.data.materials[matId] || 0) < cost) return { ok: false, reason: 'mat' };
      this.data.materials[matId] -= cost;
      cs.rankSlots[slotIdx] = true;
      this.save();
      return { ok: true };
    },

    promoteRank: function (charId) {
      const cs = this.data.chars[charId];
      if (!cs || !cs.unlocked || cs.rank >= 10) return { ok: false };
      if (!cs.rankSlots.every(Boolean)) return { ok: false, reason: 'slots' };
      const goldCost = cs.rank * 350;
      if (this.data.gold < goldCost) return { ok: false, reason: 'gold' };
      this.data.gold -= goldCost;
      cs.rank += 1;
      cs.rankSlots = [false, false, false, false, false, false];
      // 新しく解放されたアビリティ段階があれば先頭を初期選択
      const tiers = this.getUnlockedAbilityTiers(charId);
      for (let i = 0; i < tiers; i++) {
        if (cs.abilities[i] < 0) cs.abilities[i] = 0;
      }
      HW.Audio.rankUp();
      this.save();
      return { ok: true, newRank: cs.rank };
    },

    unlockOrStarUp: function (charId, useOmni) {
      const c = HW.getCharDef(charId);
      const cs = this.data.chars[charId];
      if (!c || !cs) return { ok: false };

      if (!cs.unlocked) {
        const need = HW.STAR_SHARD_COST.unlock;
        const have = cs.shards;
        const omniAllow = c.arenaOnly ? 0 : useOmni ? this.data.omniShards : 0;
        if (have + omniAllow < need) return { ok: false, reason: 'shards' };
        const useChar = Math.min(have, need);
        const useUni = need - useChar;
        cs.shards -= useChar;
        this.data.omniShards -= useUni;
        cs.unlocked = true;
        cs.star = 1;
        cs.abilities[0] = 0;
        HW.Audio.rankUp();
        this.save();
        return { ok: true, mode: 'unlock' };
      }

      if (cs.star >= 6) return { ok: false, reason: 'max' };
      const nextStar = cs.star + 1;
      const need = HW.STAR_SHARD_COST[nextStar];
      const have = cs.shards;
      const omniAllow = useOmni ? this.data.omniShards : 0;
      if (have + omniAllow < need) return { ok: false, reason: 'shards' };
      const useChar = Math.min(have, need);
      const useUni = need - useChar;
      cs.shards -= useChar;
      this.data.omniShards -= useUni;
      cs.star = nextStar;
      const tiers = this.getUnlockedAbilityTiers(charId);
      for (let i = 0; i < tiers; i++) {
        if (cs.abilities[i] < 0) cs.abilities[i] = 0;
      }
      HW.Audio.rankUp();
      this.save();
      return { ok: true, mode: 'star', newStar: nextStar };
    },

    unlockSpecialGear: function (charId, kind) {
      const cs = this.data.chars[charId];
      if (!cs || !cs.unlocked) return { ok: false };
      if (kind === 'favorite') {
        if (cs.favoriteUnlocked || cs.star < 4) return { ok: false, reason: 'cond' };
        if (this.data.gold < 1200 || (this.data.materials.mat_orb || 0) < 3) return { ok: false, reason: 'cost' };
        this.data.gold -= 1200;
        this.data.materials.mat_orb -= 3;
        cs.favoriteUnlocked = true;
        HW.Audio.rankUp();
        this.save();
        return { ok: true };
      }
      if (kind === 'relic') {
        if (cs.relicUnlocked || cs.star < 5) return { ok: false, reason: 'cond' };
        if (this.data.gold < 2400 || (this.data.materials.mat_core || 0) < 4) return { ok: false, reason: 'cost' };
        this.data.gold -= 2400;
        this.data.materials.mat_core -= 4;
        cs.relicUnlocked = true;
        HW.Audio.rankUp();
        this.save();
        return { ok: true };
      }
      return { ok: false };
    },

    setAbility: function (charId, tierIdx, colIdx) {
      const cs = this.data.chars[charId];
      if (!cs || !cs.unlocked) return false;
      const tiers = this.getUnlockedAbilityTiers(charId);
      if (tierIdx >= tiers) return false;
      cs.abilities[tierIdx] = colIdx;
      HW.Audio.tap();
      this.save();
      return true;
    },

    getEquipById: function (eqId) {
      if (!eqId) return null;
      return this.data.inventory.find((i) => i.id === eqId) || null;
    },

    getEquipOwner: function (eqId) {
      const ids = Object.keys(this.data.chars);
      for (let i = 0; i < ids.length; i++) {
        const eqs = this.data.chars[ids[i]].equips;
        for (let s = 0; s < HW.EQUIP_SLOTS.length; s++) {
          if (eqs[HW.EQUIP_SLOTS[s].id] === eqId) return ids[i];
        }
      }
      return null;
    },

    equipItem: function (charId, eqId) {
      const item = this.getEquipById(eqId);
      const cs = this.data.chars[charId];
      if (!item || !cs || !cs.unlocked) return false;
      const tpl = HW.getEquipTemplate(item.tplId);
      const prevOwner = this.getEquipOwner(eqId);
      if (prevOwner && prevOwner !== charId) {
        this.data.chars[prevOwner].equips[tpl.slot] = null;
      }
      cs.equips[tpl.slot] = eqId;
      HW.Audio.tap();
      this.save();
      return true;
    },

    unequipSlot: function (charId, slotId) {
      const cs = this.data.chars[charId];
      if (!cs) return;
      cs.equips[slotId] = null;
      HW.Audio.tap();
      this.save();
    },

    toggleEquipLock: function (eqId) {
      const item = this.getEquipById(eqId);
      if (!item) return;
      item.locked = !item.locked;
      HW.Audio.tap();
      this.save();
    },

    sellEquip: function (eqId) {
      const item = this.getEquipById(eqId);
      if (!item || item.locked || this.getEquipOwner(eqId)) return { ok: false };
      const gold = HW.getEquipSellValue(item);
      this.data.inventory = this.data.inventory.filter((i) => i.id !== eqId);
      this.data.gold += gold;
      this.save();
      return { ok: true, gold: gold };
    },

    /**
     * 装備ドロップ生成＆自動売却判定（品質100%「極」は自動売却しない保護つき）
     */
    grantEquipmentDrop: function (setId, minQuality, slotOverride) {
      const slot = slotOverride || HW.EQUIP_SLOTS[Math.floor(Math.random() * 4)].id;
      const tplId = setId + '_' + slot;
      const minQ = Math.max(1, Math.min(98, minQuality || 20));
      // 品質抽選（100%「極」はレア特別枠＋通常上限到達）
      let quality;
      if (Math.random() < 0.045 + (minQ / 100) * 0.04) {
        quality = 100;
      } else {
        const r = Math.pow(Math.random(), 1.15);
        quality = Math.min(99, Math.round(minQ + r * (99 - minQ)));
      }
      this.data.codex.equipsSeen[tplId] = true;

      const item = { id: HW.uid('eq'), tplId: tplId, quality: quality, locked: quality >= 100 };
      const threshold = this.data.settings.autoSellBelow || 0;
      if (threshold > 0 && quality < threshold && quality < 100) {
        const gold = HW.getEquipSellValue(item);
        this.data.gold += gold;
        return { autoSold: true, item: item, gold: gold };
      }
      // 倉庫上限260件（溢れた場合のみ低品質の未装着・未ロック品を整理）
      if (this.data.inventory.length >= 260) {
        const idx = this.data.inventory.findIndex((i) => !i.locked && !this.getEquipOwner(i.id) && i.quality < quality);
        if (idx >= 0) {
          this.data.gold += HW.getEquipSellValue(this.data.inventory[idx]);
          this.data.inventory.splice(idx, 1);
        }
      }
      this.data.inventory.push(item);
      if (quality >= 100) HW.Audio.maxDrop();
      return { autoSold: false, item: item, gold: 0 };
    },

    unlockFormation: function (formId) {
      if (!formId) return false;
      if (!this.data.unlockedFormations.includes(formId)) {
        this.data.unlockedFormations.push(formId);
        return true;
      }
      return false;
    },

    isStageUnlocked: function (stageId) {
      if (stageId === 'st_1_1') return true;
      const st = HW.getStageDef(stageId);
      if (st.stageNum > 1) {
        return Boolean(this.data.progress.clearedStages['st_' + st.area + '_' + (st.stageNum - 1)]);
      }
      return Boolean(this.data.progress.clearedStages['st_' + (st.area - 1) + '_10']);
    },

    getBusyDispatchChars: function () {
      const busy = {};
      Object.keys(this.data.dispatches || {}).forEach((mid) => {
        const d = this.data.dispatches[mid];
        if (d && Array.isArray(d.charIds)) {
          d.charIds.forEach((cid) => {
            busy[cid] = mid;
          });
        }
      });
      return busy;
    },

    buyShopItem: function (shopId) {
      const item = HW.SHOP_ITEMS.find((s) => s.id === shopId);
      if (!item) return { ok: false };
      if (item.currency === 'medal') {
        if (this.data.arenaMedals < item.cost) return { ok: false, reason: 'medal' };
        this.data.arenaMedals -= item.cost;
      } else {
        if (this.data.gold < item.cost) return { ok: false, reason: 'gold' };
        this.data.gold -= item.cost;
      }

      let detail = item.name;
      if (item.kind === 'shard') {
        this.data.chars[item.charId].shards += item.amount;
      } else if (item.kind === 'omni') {
        this.data.omniShards += item.amount;
      } else if (item.kind === 'matPack') {
        HW.RANK_MATERIALS.forEach((m) => {
          this.data.materials[m.id] = (this.data.materials[m.id] || 0) + item.amount;
        });
      } else if (item.kind === 'equipSet') {
        const drop = this.grantEquipmentDrop(item.setId, item.minQuality);
        const tpl = HW.getEquipTemplate(drop.item.tplId);
        detail = tpl.name + ' (品質' + drop.item.quality + '%)';
      }
      HW.Audio.rankUp();
      this.save();
      return { ok: true, detail: detail };
    }
  };
})();
