(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};
  let uidCounter = 0;

  function hasOwn(obj, key) {
    return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function cloneState(state) {
    if (typeof root.structuredClone === 'function') {
      try {
        return root.structuredClone(state);
      } catch (_) {
        // Fallback to JSON clone if non-cloneable properties exist
      }
    }
    return JSON.parse(JSON.stringify(state));
  }

  function clampNum(v, min, max) {
    if (!Number.isFinite(v)) {
      return min;
    }
    return Math.min(max, Math.max(min, v));
  }

  function getRng(options) {
    if (options && typeof options.rng === 'function') {
      return options.rng;
    }
    return Math.random;
  }

  function makeDefaultRosterEntry() {
    if (IkaiApp.StateStore && typeof IkaiApp.StateStore.createDefaultRosterEntry === 'function') {
      return IkaiApp.StateStore.createDefaultRosterEntry();
    }
    return {
      awakening: 0,
      shards: 0,
      emblemNodes: [],
      equipped: {
        '主器': null,
        '護符': null,
        '装具': null,
        '印章': null
      },
      skills: [null, null],
      tactic: {
        policy: 'balanced',
        target: 'lowest_hp',
        skillPriority: 'unique_first'
      }
    };
  }

  function makeEquipUid(existingEquips, rngFn) {
    const rand = typeof rngFn === 'function' ? rngFn : Math.random;
    const used = new Set();
    if (Array.isArray(existingEquips)) {
      for (let i = 0; i < existingEquips.length; i += 1) {
        if (existingEquips[i] && existingEquips[i].uid) {
          used.add(existingEquips[i].uid);
        }
      }
    }
    for (let attempt = 0; attempt < 100; attempt += 1) {
      uidCounter += 1;
      const randVal = Math.floor(clampNum(rand(), 0, 0.999999999) * 0x100000000);
      const candidate = 'eq_' + uidCounter.toString(36) + '_' + randVal.toString(36);
      if (!used.has(candidate)) {
        return candidate;
      }
    }
    uidCounter += 1;
    return 'eq_' + uidCounter.toString(36) + '_' + (Array.isArray(existingEquips) ? existingEquips.length : 0);
  }

  function buildEquippedUidOwnerMap(roster) {
    const map = new Map();
    if (!roster || typeof roster !== 'object') {
      return map;
    }
    const charIds = Object.keys(roster);
    for (let i = 0; i < charIds.length; i += 1) {
      const cid = charIds[i];
      const entry = roster[cid];
      if (!entry || !entry.equipped) continue;
      const slots = Object.keys(entry.equipped);
      for (let s = 0; s < slots.length; s += 1) {
        const slot = slots[s];
        const uid = entry.equipped[slot];
        if (uid) {
          map.set(uid, { charId: cid, slot });
        }
      }
    }
    return map;
  }

  function buildActiveExpeditionCharSet(expeditions) {
    const set = new Set();
    if (!Array.isArray(expeditions)) {
      return set;
    }
    for (let i = 0; i < expeditions.length; i += 1) {
      const exp = expeditions[i];
      if (exp && !exp.claimed && Array.isArray(exp.charIds)) {
        for (let c = 0; c < exp.charIds.length; c += 1) {
          set.add(exp.charIds[c]);
        }
      }
    }
    return set;
  }

  // =========================================================================
  // Equipment System
  // =========================================================================

  function getEquipStats(equipId, qualityIdx) {
    const MasterData = IkaiApp.MasterData;
    if (!MasterData || !hasOwn(MasterData.EQUIP_MAP, equipId)) {
      return {};
    }
    const eqDef = MasterData.EQUIP_MAP[equipId];
    const qIdx = clampNum(Math.floor(Number(qualityIdx) || 0), 0, MasterData.QUALITY_RANKS.length - 1);
    const qRank = MasterData.QUALITY_RANKS[qIdx];
    const mult = qRank ? qRank.multiplier : 1.0;
    const stats = {};
    const keys = Object.keys(eqDef.baseStats || {});
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      stats[k] = Math.round(eqDef.baseStats[k] * mult);
    }
    return stats;
  }

  function getEquipSellValue(equipId, qualityIdx) {
    const MasterData = IkaiApp.MasterData;
    if (!MasterData || !hasOwn(MasterData.EQUIP_MAP, equipId)) {
      return 0;
    }
    const eqDef = MasterData.EQUIP_MAP[equipId];
    const qIdx = clampNum(Math.floor(Number(qualityIdx) || 0), 0, MasterData.QUALITY_RANKS.length - 1);
    const qRank = MasterData.QUALITY_RANKS[qIdx];
    const mult = qRank ? qRank.sellMultiplier : 1;
    return Math.round((eqDef.sellBaseCoins || 0) * mult);
  }

  function pickDropQualityIdx(rng, minQualityIdx) {
    const MasterData = IkaiApp.MasterData;
    const rand = typeof rng === 'function' ? rng : Math.random;
    const minQ = clampNum(Math.floor(Number(minQualityIdx) || 0), 0, MasterData.QUALITY_RANKS.length - 1);
    const eligible = MasterData.QUALITY_RANKS.filter(function (q) { return q.idx >= minQ; });
    if (eligible.length === 0) {
      return minQ;
    }
    let totalWeight = 0;
    for (let i = 0; i < eligible.length; i += 1) {
      totalWeight += eligible[i].dropWeight;
    }
    const roll = clampNum(rand(), 0, 0.999999999) * totalWeight;
    let acc = 0;
    for (let i = 0; i < eligible.length; i += 1) {
      acc += eligible[i].dropWeight;
      if (roll < acc) {
        return eligible[i].idx;
      }
    }
    return eligible[eligible.length - 1].idx;
  }

  function grantEquipOrAutoSell(draft, equipId, qualityIdx, rng) {
    const MasterData = IkaiApp.MasterData;
    if (!draft || !MasterData || !hasOwn(MasterData.EQUIP_MAP, equipId)) {
      return { autoSold: false, coinsGained: 0, equip: null };
    }
    const qIdx = clampNum(Math.floor(Number(qualityIdx) || 0), 0, MasterData.QUALITY_RANKS.length - 1);
    const rawAutoMax = draft.settings && Number.isSafeInteger(draft.settings.autoSellMaxQualityIdx)
      ? draft.settings.autoSellMaxQualityIdx
      : -1;
    const autoMax = Math.min(3, rawAutoMax);

    if (qIdx < 4 && autoMax >= 0 && qIdx <= autoMax) {
      const coinsGained = getEquipSellValue(equipId, qIdx);
      draft.currencies.starCoins += coinsGained;
      return {
        autoSold: true,
        coinsGained,
        equip: { uid: null, equipId, qualityIdx: qIdx, locked: false }
      };
    }

    const eqObj = {
      uid: makeEquipUid(draft.equips, rng),
      equipId,
      qualityIdx: qIdx,
      locked: false
    };
    draft.equips.push(eqObj);
    return {
      autoSold: false,
      coinsGained: 0,
      equip: eqObj
    };
  }

  function equipItem(state, charId, uid) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.roster || !hasOwn(state.roster, charId)) {
      return { ok: false, reason: '指定された仲間を所持していません', state };
    }
    const draft = cloneState(state);
    const eq = draft.equips.find(function (item) { return item.uid === uid; });
    if (!eq) {
      return { ok: false, reason: '指定された装備が見つかりません', state };
    }
    const eqDef = MasterData.EQUIP_MAP[eq.equipId];
    if (!eqDef) {
      return { ok: false, reason: '装備定義が不正です', state };
    }
    const entry = draft.roster[charId];
    const tierDef = MasterData.AWAKENING_TIERS[entry.awakening];
    if (!tierDef || tierDef.unlockedSlots.indexOf(eqDef.slot) === -1) {
      return {
        ok: false,
        reason: '覚醒段階が不足しているため「' + eqDef.slot + '」枠は未開放です',
        state
      };
    }

    const owners = buildEquippedUidOwnerMap(draft.roster);
    const prevOwner = owners.get(uid);
    if (prevOwner) {
      draft.roster[prevOwner.charId].equipped[prevOwner.slot] = null;
    }

    entry.equipped[eqDef.slot] = uid;
    return {
      ok: true,
      slot: eqDef.slot,
      state: draft
    };
  }

  function unequipSlot(state, charId, slotName) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.roster || !hasOwn(state.roster, charId)) {
      return { ok: false, reason: '指定された仲間を所持していません', state };
    }
    if (MasterData.EQUIP_SLOTS.indexOf(slotName) === -1) {
      return { ok: false, reason: '装備部位が不正です', state };
    }
    const draft = cloneState(state);
    draft.roster[charId].equipped[slotName] = null;
    return { ok: true, slot: slotName, state: draft };
  }

  function toggleEquipLock(state, uid) {
    if (!state || !Array.isArray(state.equips)) {
      return { ok: false, reason: '装備データが存在しません', state };
    }
    const draft = cloneState(state);
    const eq = draft.equips.find(function (item) { return item.uid === uid; });
    if (!eq) {
      return { ok: false, reason: '指定された装備が見つかりません', state };
    }
    eq.locked = !eq.locked;
    return { ok: true, locked: eq.locked, state: draft };
  }

  function synthesizeEquip(state, baseUid, matUid, options) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !Array.isArray(state.equips)) {
      return { ok: false, reason: '装備データが存在しません', state };
    }
    if (!baseUid || !matUid || baseUid === matUid) {
      return { ok: false, reason: 'ベース装備と素材装備には異なる装備を指定してください', state };
    }
    const draft = cloneState(state);
    const baseEq = draft.equips.find(function (item) { return item.uid === baseUid; });
    const matEq = draft.equips.find(function (item) { return item.uid === matUid; });
    if (!baseEq || !matEq) {
      return { ok: false, reason: '指定された装備が見つかりません', state };
    }
    if (matEq.locked) {
      return { ok: false, reason: '保護中の装備は合成素材にできません', state };
    }
    const owners = buildEquippedUidOwnerMap(draft.roster);
    if (owners.has(matUid)) {
      return { ok: false, reason: '装着中の装備は合成素材にできません', state };
    }
    if (baseEq.equipId !== matEq.equipId) {
      return { ok: false, reason: '同種の装備同士でのみ品質合成を行えます', state };
    }
    if (baseEq.qualityIdx !== matEq.qualityIdx) {
      return { ok: false, reason: '同品質の装備同士でのみ品質合成を行えます', state };
    }
    if (baseEq.qualityIdx >= 4) {
      return { ok: false, reason: '品質「極」はこれ以上昇格できません', state };
    }

    const rule = MasterData.EQUIP_SYNTHESIS_RULES[baseEq.qualityIdx];
    if (!rule || rule.fromIdx !== baseEq.qualityIdx) {
      return { ok: false, reason: '品質合成ルールが見つかりません', state };
    }
    if (draft.currencies.starCoins < rule.coinCost) {
      return { ok: false, reason: '星貨が不足しています（必要: ' + rule.coinCost + '）', state };
    }

    const useCatalyst = Boolean(options && options.useCatalyst);
    if (useCatalyst && draft.currencies.qualityCatalysts < 1) {
      return { ok: false, reason: '品質昇格触媒が不足しています', state };
    }

    const rng = getRng(options);
    const pityKey = baseEq.equipId + ':' + baseEq.qualityIdx;
    const curPity = draft.synthesisPity[pityKey] || 0;
    const isCeiling = (curPity + 1) >= rule.pityMax;
    const rate = Math.min(1, rule.baseRate + (useCatalyst ? 0.25 : 0));
    const succeeded = isCeiling || (rng() < rate);

    draft.currencies.starCoins -= rule.coinCost;
    if (useCatalyst) {
      draft.currencies.qualityCatalysts -= 1;
    }

    draft.equips = draft.equips.filter(function (item) { return item.uid !== matUid; });

    if (succeeded) {
      baseEq.qualityIdx = rule.toIdx;
      draft.synthesisPity[pityKey] = 0;
    } else {
      draft.synthesisPity[pityKey] = curPity + 1;
    }

    return {
      ok: true,
      succeeded,
      isCeiling,
      newQualityIdx: baseEq.qualityIdx,
      pityKey,
      pityCount: draft.synthesisPity[pityKey],
      pityMax: rule.pityMax,
      coinCost: rule.coinCost,
      usedCatalyst: useCatalyst,
      state: draft
    };
  }

  function bulkSellEquips(state, maxQualityIdx) {
    if (!state || !Array.isArray(state.equips)) {
      return { ok: false, reason: '装備データが存在しません', state };
    }
    if (!Number.isSafeInteger(maxQualityIdx) || maxQualityIdx < 0 || maxQualityIdx > 3) {
      return { ok: false, reason: '一括売却の品質指定は「並(0)」〜「優(3)」の範囲で指定してください', state };
    }
    const draft = cloneState(state);
    const owners = buildEquippedUidOwnerMap(draft.roster);
    let soldCount = 0;
    let coinsGained = 0;
    const kept = [];

    for (let i = 0; i < draft.equips.length; i += 1) {
      const eq = draft.equips[i];
      const isProtected = Boolean(eq.locked) || owners.has(eq.uid) || eq.qualityIdx > maxQualityIdx || eq.qualityIdx >= 4;
      if (isProtected) {
        kept.push(eq);
      } else {
        soldCount += 1;
        coinsGained += getEquipSellValue(eq.equipId, eq.qualityIdx);
      }
    }

    draft.equips = kept;
    draft.currencies.starCoins += coinsGained;
    return {
      ok: true,
      soldCount,
      coinsGained,
      state: draft
    };
  }

  function setAutoSellQuality(state, maxQualityIdx) {
    if (!state || !state.settings) {
      return { ok: false, reason: '設定データが存在しません', state };
    }
    if (!Number.isSafeInteger(maxQualityIdx) || maxQualityIdx < -1 || maxQualityIdx > 3) {
      return { ok: false, reason: '自動売却品質は -1（無効）〜 3（優以下）で指定してください', state };
    }
    const draft = cloneState(state);
    draft.settings.autoSellMaxQualityIdx = maxQualityIdx;
    return {
      ok: true,
      maxQualityIdx,
      state: draft
    };
  }

  // =========================================================================
  // Character Growth: Emblem Board, Awakening, Skill Mastery, Collect Skills
  // =========================================================================

  function unlockEmblemNode(state, charId, nodeId) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.roster || !hasOwn(state.roster, charId)) {
      return { ok: false, reason: '指定された仲間を所持していません', state };
    }
    const nid = Number(nodeId);
    const nodeDef = MasterData.EMBLEM_NODES.find(function (n) { return n.id === nid; });
    if (!nodeDef) {
      return { ok: false, reason: '指定された紋章ノードが存在しません', state };
    }
    const draft = cloneState(state);
    const entry = draft.roster[charId];
    if (entry.emblemNodes.indexOf(nid) !== -1) {
      return { ok: false, reason: 'この紋章ノードは既に解放済みです', state };
    }
    const tierDef = MasterData.AWAKENING_TIERS[entry.awakening];
    if (!tierDef || entry.awakening < nodeDef.reqAwakening || nodeDef.layer > tierDef.maxEmblemLayer) {
      return {
        ok: false,
        reason: '覚醒段階 ' + nodeDef.reqAwakening + ' 以上で解放できます',
        state
      };
    }
    if (nodeDef.reqPrevLayerAll) {
      const prevLayerNodes = MasterData.EMBLEM_NODES.filter(function (n) { return n.layer === nodeDef.layer - 1; });
      for (let i = 0; i < prevLayerNodes.length; i += 1) {
        if (entry.emblemNodes.indexOf(prevLayerNodes[i].id) === -1) {
          return {
            ok: false,
            reason: '第' + (nodeDef.layer - 1) + '層の全ノードを解放する必要があります',
            state
          };
        }
      }
    }
    if (draft.currencies.emblemShards < nodeDef.shardCost) {
      return {
        ok: false,
        reason: '境界の紋章片が不足しています（必要: ' + nodeDef.shardCost + '）',
        state
      };
    }

    draft.currencies.emblemShards -= nodeDef.shardCost;
    entry.emblemNodes.push(nid);
    entry.emblemNodes.sort(function (a, b) { return a - b; });
    return {
      ok: true,
      node: nodeDef,
      state: draft
    };
  }

  function awakenCharacter(state, charId, options) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.roster || !hasOwn(state.roster, charId)) {
      return { ok: false, reason: '指定された仲間を所持していません', state };
    }
    const draft = cloneState(state);
    const entry = draft.roster[charId];
    if (entry.awakening >= 3) {
      return { ok: false, reason: '既に最大覚醒段階（3 / 3）に達しています', state };
    }
    const nextTier = MasterData.AWAKENING_TIERS[entry.awakening + 1];
    if (!nextTier) {
      return { ok: false, reason: '次の覚醒段階定義が見つかりません', state };
    }

    const allowUniversal = !options || options.allowUniversal !== false;
    const cost = nextTier.shardCost;
    const usedCharShards = Math.min(entry.shards, cost);
    const deficit = cost - usedCharShards;
    if (deficit > 0) {
      if (!allowUniversal || draft.currencies.universalShards < deficit) {
        return {
          ok: false,
          reason: '覚醒に必要な欠片または汎用覚醒結晶が不足しています（必要: ' + cost + '）',
          state
        };
      }
    }

    entry.shards -= usedCharShards;
    draft.currencies.universalShards -= deficit;
    entry.awakening += 1;

    let overflowCrystals = 0;
    if (entry.awakening >= 3 && entry.shards > 0) {
      const charDef = MasterData.CHARACTER_MAP[charId];
      const rate = (charDef && MasterData.SUMMON_CONFIG.maxAwakenCrystalConversion[charDef.rarity]) || 5;
      overflowCrystals = entry.shards * rate;
      draft.currencies.exchangeCrystals += overflowCrystals;
      entry.shards = 0;
    }

    return {
      ok: true,
      newAwakening: entry.awakening,
      usedCharShards,
      usedUniversalShards: deficit,
      overflowCrystals,
      state: draft
    };
  }

  function upgradeSkillMastery(state, skillId) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.skillInventory || !hasOwn(MasterData.SKILL_MAP, skillId)) {
      return { ok: false, reason: '指定された収集技が存在しません', state };
    }
    if (!hasOwn(state.skillInventory, skillId) || state.skillInventory[skillId].ownedCount < 1) {
      return { ok: false, reason: '未所持の収集技は強化できません', state };
    }
    const draft = cloneState(state);
    const inv = draft.skillInventory[skillId];
    if (inv.rank >= 5) {
      return { ok: false, reason: '既に熟練度ランク伍（最大）に達しています', state };
    }
    const nextRankInfo = MasterData.SKILL_MASTERY_RANKS[inv.rank];
    if (!nextRankInfo) {
      return { ok: false, reason: '熟練度ランク定義が見つかりません', state };
    }
    if (draft.currencies.masteryBooks < nextRankInfo.bookCost) {
      return {
        ok: false,
        reason: '熟練の書が不足しています（必要: ' + nextRankInfo.bookCost + '）',
        state
      };
    }

    draft.currencies.masteryBooks -= nextRankInfo.bookCost;
    inv.rank = nextRankInfo.rank;
    inv.uses = Math.max(inv.uses, nextRankInfo.requiredUses);

    return {
      ok: true,
      newRank: inv.rank,
      bookCost: nextRankInfo.bookCost,
      state: draft
    };
  }

  function equipCollectSkill(state, charId, slotIdx, skillId) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.roster || !hasOwn(state.roster, charId)) {
      return { ok: false, reason: '指定された仲間を所持していません', state };
    }
    const idx = Number(slotIdx);
    if (idx !== 0 && idx !== 1) {
      return { ok: false, reason: '収集技枠の指定が不正です', state };
    }
    const draft = cloneState(state);
    const entry = draft.roster[charId];
    const tierDef = MasterData.AWAKENING_TIERS[entry.awakening];
    if (!tierDef || idx >= tierDef.skillSlots) {
      return { ok: false, reason: '覚醒段階1以上で収集技枠2が開放されます', state };
    }

    if (skillId === null || skillId === undefined || skillId === '') {
      entry.skills[idx] = null;
      return { ok: true, slotIdx: idx, skillId: null, state: draft };
    }

    if (!hasOwn(MasterData.SKILL_MAP, skillId)) {
      return { ok: false, reason: '存在しない収集技です', state };
    }
    if (!hasOwn(draft.skillInventory, skillId) || draft.skillInventory[skillId].ownedCount < 1) {
      return { ok: false, reason: '未所持の収集技は装着できません', state };
    }
    if (entry.skills[1 - idx] === skillId) {
      return { ok: false, reason: '同一の収集技を両方の枠に装着することはできません', state };
    }

    entry.skills[idx] = skillId;
    return { ok: true, slotIdx: idx, skillId, state: draft };
  }

  // =========================================================================
  // 4-Pillar PvE & Battle Outcome Integration
  // =========================================================================

  function isStageUnlocked(state, stageId) {
    const MasterData = IkaiApp.MasterData;
    if (!MasterData || !hasOwn(MasterData.STAGE_MAP, stageId)) {
      return false;
    }
    const stage = MasterData.STAGE_MAP[stageId];
    if (!stage.unlockCondition) {
      return true;
    }
    const cleared = (state && state.progress && Array.isArray(state.progress.clearedStages))
      ? state.progress.clearedStages
      : [];
    return cleared.indexOf(stage.unlockCondition) >= 0;
  }

  function validateTrialEntry(state, trialId, partyIds) {
    const MasterData = IkaiApp.MasterData;
    const trial = MasterData.TRIALS.find(function (t) { return t.id === trialId; });
    if (!trial) {
      return {
        ok: false,
        trialId,
        trialName: '',
        trialDescription: '',
        reasons: ['指定された制約試練が存在しません'],
        violatingCharIds: []
      };
    }

    const rawIds = Array.isArray(partyIds) ? partyIds : (state && state.party ? state.party : []);
    const ids = rawIds.filter(Boolean);
    const reasons = [];
    const violatingSet = new Set();
    const partyChars = [];

    for (let i = 0; i < ids.length; i += 1) {
      const cid = ids[i];
      if (!state || !state.roster || !hasOwn(state.roster, cid)) {
        reasons.push('未所持の仲間が編成に含まれています: ' + cid);
        violatingSet.add(cid);
      } else if (hasOwn(MasterData.CHARACTER_MAP, cid)) {
        partyChars.push(MasterData.CHARACTER_MAP[cid]);
      }
    }

    const baseRes = MasterData.validateTrialParty(trialId, partyChars);
    for (let i = 0; i < baseRes.reasons.length; i += 1) {
      reasons.push(baseRes.reasons[i]);
    }

    const rules = trial.rules || {};
    const seen = new Set();
    for (let i = 0; i < partyChars.length; i += 1) {
      const c = partyChars[i];
      if (seen.has(c.id)) {
        violatingSet.add(c.id);
      }
      seen.add(c.id);
      if (rules.noSSR && c.rarity === 'SSR') violatingSet.add(c.id);
      if (rules.onlyR && c.rarity !== 'R') violatingSet.add(c.id);
      if (rules.noHealer && c.role === 'ヒーラー') violatingSet.add(c.id);
      if (rules.noTank && c.role === 'タンク') violatingSet.add(c.id);
      if (typeof rules.maxPartySize === 'number' && i >= rules.maxPartySize) {
        violatingSet.add(c.id);
      }
    }

    return {
      ok: reasons.length === 0,
      trialId: trial.id,
      trialName: trial.name,
      trialDescription: trial.description,
      reasons,
      violatingCharIds: Array.from(violatingSet)
    };
  }

  function advanceExpeditionsDraft(draft) {
    let advancedCount = 0;
    const completedSlots = [];
    if (!draft || !Array.isArray(draft.expeditions)) {
      return { advancedCount, completedSlots };
    }
    for (let i = 0; i < draft.expeditions.length; i += 1) {
      const exp = draft.expeditions[i];
      if (!exp || exp.claimed) continue;
      if (exp.battlesDone < exp.requiredBattles) {
        exp.battlesDone += 1;
        advancedCount += 1;
      }
      if (exp.battlesDone >= exp.requiredBattles) {
        completedSlots.push(i);
      }
    }
    return { advancedCount, completedSlots };
  }

  function addCurrencySummary(summary, currencies, key, amount) {
    if (!amount) return;
    currencies[key] = (currencies[key] || 0) + amount;
    summary[key] = (summary[key] || 0) + amount;
  }

  function applyBattleOutcome(state, snapshot, options) {
    const MasterData = IkaiApp.MasterData;
    const opts = options || {};
    if (opts.isRetreat) {
      return { ok: true, state, summary: { retreated: true } };
    }
    if (!state || !snapshot) {
      return { ok: false, reason: '戦闘結果の適用に必要な情報が不足しています', state };
    }

    const draft = cloneState(state);
    const rng = getRng(opts);
    const isVictory = snapshot.status === 'victory';

    draft.progress.totalBattles += 1;
    const expRes = advanceExpeditionsDraft(draft);

    // Skill mastery usage accumulation & auto-rankup
    const skillUses = snapshot.skillUses || {};
    const usedIds = Object.keys(skillUses);
    const rankedUpSkills = [];
    for (let i = 0; i < usedIds.length; i += 1) {
      const sid = usedIds[i];
      const count = Math.max(0, Math.floor(Number(skillUses[sid]) || 0));
      if (count <= 0) continue;
      if (hasOwn(draft.skillInventory, sid) && draft.skillInventory[sid].ownedCount >= 1) {
        const inv = draft.skillInventory[sid];
        const prevRank = inv.rank;
        inv.uses += count;
        while (inv.rank < 5 && inv.uses >= MasterData.SKILL_MASTERY_RANKS[inv.rank].requiredUses) {
          inv.rank += 1;
        }
        if (inv.rank > prevRank && hasOwn(MasterData.SKILL_MAP, sid)) {
          rankedUpSkills.push({ skillId: sid, name: MasterData.SKILL_MAP[sid].name, newRank: inv.rank });
        }
      }
    }

    const summary = {
      mode: snapshot.mode || 'stage',
      isVictory,
      isFirstClear: false,
      isNewMax: false,
      echoStones: 0,
      starCoins: 0,
      emblemShards: 0,
      masteryBooks: 0,
      exchangeCrystals: 0,
      universalShards: 0,
      qualityCatalysts: 0,
      skillName: null,
      equipText: null,
      autoSoldEquip: false,
      autoSoldCoins: 0,
      advancedExpeditions: expRes.advancedCount,
      completedExpeditions: expRes.completedSlots,
      rankedUpSkills,
      raidBestDamage: null
    };

    const grantEquipDrop = function (minQualityIdx) {
      if (!MasterData.EQUIPS || MasterData.EQUIPS.length === 0) return;
      const eqIdx = Math.floor(clampNum(rng(), 0, 0.999999999) * MasterData.EQUIPS.length);
      const eqDef = MasterData.EQUIPS[eqIdx];
      const qIdx = pickDropQualityIdx(rng, minQualityIdx || 0);
      const res = grantEquipOrAutoSell(draft, eqDef.id, qIdx, rng);
      const qName = MasterData.QUALITY_RANKS[qIdx].name;
      if (res.autoSold) {
        summary.autoSoldEquip = true;
        summary.autoSoldCoins += res.coinsGained;
        summary.starCoins += res.coinsGained;
        summary.equipText = eqDef.name + '（' + qName + '・自動売却 +' + res.coinsGained + '星貨）';
      } else {
        summary.equipText = eqDef.name + '（' + qName + '）';
      }
    };

    if (summary.mode === 'stage' && isVictory) {
      const stage = hasOwn(MasterData.STAGE_MAP, snapshot.stageId) ? MasterData.STAGE_MAP[snapshot.stageId] : null;
      if (stage) {
        const isFirstClear = draft.progress.clearedStages.indexOf(stage.id) < 0;
        summary.isFirstClear = isFirstClear;
        if (isFirstClear) {
          draft.progress.clearedStages.push(stage.id);
        }
        const rw = isFirstClear ? stage.firstClearRewards : stage.repeatRewards;
        addCurrencySummary(summary, draft.currencies, 'echoStones', rw.echoStones || 0);
        addCurrencySummary(summary, draft.currencies, 'starCoins', rw.starCoins || 0);
        addCurrencySummary(summary, draft.currencies, 'emblemShards', rw.emblemShards || 0);
        addCurrencySummary(summary, draft.currencies, 'masteryBooks', rw.masteryBooks || 0);

        if (isFirstClear && rw.skillId && hasOwn(MasterData.SKILL_MAP, rw.skillId)) {
          const skId = rw.skillId;
          if (!hasOwn(draft.skillInventory, skId)) {
            draft.skillInventory[skId] = { ownedCount: 1, rank: 1, uses: 0 };
          } else {
            draft.skillInventory[skId].ownedCount += 1;
          }
          summary.skillName = MasterData.SKILL_MAP[skId].name;
        }

        const shouldDropEquip = isFirstClear ? Boolean(rw.equipDropGuaranteed) : (rng() < (rw.equipDropChance || 0));
        if (shouldDropEquip) {
          grantEquipDrop(0);
        }
      }
    } else if (summary.mode === 'abyss' && isVictory) {
      const floor = Math.max(1, Math.floor(Number(snapshot.floor) || 1));
      const isNewMax = floor > draft.progress.abyssMaxFloor;
      summary.isNewMax = isNewMax;
      summary.isFirstClear = isNewMax;
      draft.progress.abyssMaxFloor = Math.max(draft.progress.abyssMaxFloor, floor);

      let echoGain = isNewMax ? (50 + floor * 5) : 20;
      const coinGain = 300 + floor * 80;
      const shardGain = 4 + Math.floor(floor / 2);
      const bookGain = floor % 5 === 0 ? 2 : 1;
      let crystalGain = 0;
      let dropMinQ = null;

      if (floor % 10 === 0) {
        if (isNewMax) {
          echoGain += MasterData.ABYSS_CONFIG.milestoneRewards.echoStones || 300;
          crystalGain += MasterData.ABYSS_CONFIG.milestoneRewards.exchangeCrystals || 15;
          dropMinQ = MasterData.ABYSS_CONFIG.milestoneRewards.minQualityIdx;
        } else {
          echoGain += 60;
          crystalGain += 3;
          dropMinQ = 1;
        }
      } else if (floor % 5 === 0) {
        echoGain += 100;
        dropMinQ = 1;
      }

      addCurrencySummary(summary, draft.currencies, 'echoStones', echoGain);
      addCurrencySummary(summary, draft.currencies, 'starCoins', coinGain);
      addCurrencySummary(summary, draft.currencies, 'emblemShards', shardGain);
      addCurrencySummary(summary, draft.currencies, 'masteryBooks', bookGain);
      addCurrencySummary(summary, draft.currencies, 'exchangeCrystals', crystalGain);

      if (dropMinQ !== null) {
        grantEquipDrop(dropMinQ);
      }
    } else if (summary.mode === 'raid') {
      const raidId = snapshot.raidId;
      const diffId = snapshot.difficultyId;
      const boss = MasterData.RAID_BOSSES.find(function (b) { return b.id === raidId; });
      const diffObj = boss ? boss.difficulties.find(function (d) { return d.id === diffId; }) : null;

      if (boss && diffObj) {
        const dealt = Math.max(
          0,
          Math.round(
            (snapshot.dpsMeters && snapshot.dpsMeters.totals && snapshot.dpsMeters.totals.damageDealt) || 0
          )
        );
        if (!draft.progress.raidBestDamage) {
          draft.progress.raidBestDamage = {};
        }
        if (!hasOwn(draft.progress.raidBestDamage, raidId)) {
          draft.progress.raidBestDamage[raidId] = {};
        }
        const prevBest = draft.progress.raidBestDamage[raidId][diffId] || 0;
        const nextBest = Math.max(prevBest, dealt);
        draft.progress.raidBestDamage[raidId][diffId] = nextBest;
        summary.raidBestDamage = nextBest;

        if (isVictory) {
          if (!hasOwn(draft.progress.raidCleared, raidId)) {
            draft.progress.raidCleared[raidId] = {};
          }
          const prevClr = draft.progress.raidCleared[raidId][diffId];
          const prevNum = prevClr === true ? 1 : (Number.isSafeInteger(prevClr) ? prevClr : 0);
          summary.isFirstClear = prevNum === 0;
          draft.progress.raidCleared[raidId][diffId] = prevNum + 1;

          const rw = diffObj.rewards || {};
          addCurrencySummary(summary, draft.currencies, 'echoStones', rw.echoStones || 0);
          addCurrencySummary(summary, draft.currencies, 'starCoins', rw.starCoins || 0);
          addCurrencySummary(summary, draft.currencies, 'emblemShards', rw.emblemShards || 0);
          addCurrencySummary(summary, draft.currencies, 'masteryBooks', rw.masteryBooks || 0);
          if (typeof rw.minQualityIdx === 'number') {
            grantEquipDrop(rw.minQualityIdx);
          }
        }
      }
    } else if (summary.mode === 'trial' && isVictory) {
      const trialId = snapshot.trialId;
      const trial = MasterData.TRIALS.find(function (t) { return t.id === trialId; });
      if (trial) {
        const isFirstClear = draft.progress.trialsCleared.indexOf(trialId) < 0;
        summary.isFirstClear = isFirstClear;
        if (isFirstClear) {
          draft.progress.trialsCleared.push(trialId);
          const rw = trial.rewards || {};
          addCurrencySummary(summary, draft.currencies, 'echoStones', rw.echoStones || 0);
          addCurrencySummary(summary, draft.currencies, 'starCoins', rw.starCoins || 0);
          addCurrencySummary(summary, draft.currencies, 'emblemShards', rw.emblemShards || 0);
          addCurrencySummary(summary, draft.currencies, 'masteryBooks', rw.masteryBooks || 0);
          addCurrencySummary(summary, draft.currencies, 'universalShards', rw.universalShards || 0);
          addCurrencySummary(summary, draft.currencies, 'qualityCatalysts', rw.qualityCatalysts || 0);
          addCurrencySummary(summary, draft.currencies, 'exchangeCrystals', rw.exchangeCrystals || 0);
        } else {
          addCurrencySummary(summary, draft.currencies, 'starCoins', 500);
          addCurrencySummary(summary, draft.currencies, 'emblemShards', 5);
        }
      }
    }

    return {
      ok: true,
      state: draft,
      summary
    };
  }

  // =========================================================================
  // Buy-Once Summon & Crystal Exchange Shop
  // =========================================================================

  function selectBanner(state, bannerId) {
    const MasterData = IkaiApp.MasterData;
    const banner = MasterData.BANNERS.find(function (b) { return b.id === bannerId; });
    if (!banner) {
      return { ok: false, reason: '存在しない召喚バナーです', state };
    }
    const draft = cloneState(state);
    draft.summon.selectedBannerId = bannerId;
    return { ok: true, banner, state: draft };
  }

  function rollSummon(state, bannerId, count, options) {
    const MasterData = IkaiApp.MasterData;
    const pullCount = count === 10 ? 10 : (count === 1 ? 1 : 0);
    if (!pullCount) {
      return { ok: false, reason: '召喚回数は1回または10回を指定してください', state };
    }
    const targetBannerId = bannerId || (state && state.summon && state.summon.selectedBannerId);
    const banner = MasterData.BANNERS.find(function (b) { return b.id === targetBannerId; });
    if (!banner) {
      return { ok: false, reason: '指定された召喚バナーが存在しません', state };
    }

    const cfg = MasterData.SUMMON_CONFIG;
    const cost = pullCount === 10 ? cfg.tenCost : cfg.singleCost;
    if (!state || !state.currencies || state.currencies.echoStones < cost) {
      return { ok: false, reason: '残響石が不足しています（必要: ' + cost + '）', state };
    }

    const draft = cloneState(state);
    draft.currencies.echoStones -= cost;
    draft.summon.selectedBannerId = banner.id;
    if (!Number.isSafeInteger(draft.summon.srPityCount)) {
      draft.summon.srPityCount = 0;
    }

    const rng = getRng(options);
    const byRarity = { SSR: [], SR: [], R: [] };
    for (let i = 0; i < MasterData.CHARACTERS.length; i += 1) {
      const ch = MasterData.CHARACTERS[i];
      if (byRarity[ch.rarity]) {
        byRarity[ch.rarity].push(ch);
      }
    }
    const pickupSet = new Set(banner.pickupCharIds || []);
    const pickupPool = byRarity.SSR.filter(function (c) { return pickupSet.has(c.id); });
    const nonPickupSsrPool = byRarity.SSR.filter(function (c) { return !pickupSet.has(c.id); });

    const results = [];
    let hadSrOrHigherInTen = false;

    for (let i = 0; i < pullCount; i += 1) {
      const nextSsrPity = draft.summon.pityCount + 1;
      const nextSrPity = (draft.summon.srPityCount || 0) + 1;
      const isSsrCeiling = nextSsrPity >= cfg.pitySSR;

      let rarity = 'R';
      if (isSsrCeiling) {
        rarity = 'SSR';
      } else {
        const r = rng();
        if (r < cfg.rates.SSR) {
          rarity = 'SSR';
        } else if (r < cfg.rates.SSR + cfg.rates.SR) {
          rarity = 'SR';
        }
        if (rarity === 'R' && nextSrPity >= cfg.srGuaranteeInterval) {
          rarity = 'SR';
        }
      }

      if (pullCount === 10 && cfg.tenPullGuaranteeSR && i === 9 && !hadSrOrHigherInTen && rarity === 'R') {
        rarity = 'SR';
      }
      if (rarity === 'SSR' || rarity === 'SR') {
        hadSrOrHigherInTen = true;
      }

      let charDef = null;
      if (rarity === 'SSR' && banner.type === 'pickup' && pickupPool.length > 0) {
        const pickFromPickup = isSsrCeiling || nonPickupSsrPool.length === 0 || (rng() < cfg.pickupShareWithinSSR);
        const pool = pickFromPickup ? pickupPool : nonPickupSsrPool;
        charDef = pool[Math.floor(clampNum(rng(), 0, 0.999999999) * pool.length)];
      } else {
        const pool = byRarity[rarity];
        charDef = pool[Math.floor(clampNum(rng(), 0, 0.999999999) * pool.length)];
      }

      if (rarity === 'SSR') {
        draft.summon.pityCount = 0;
        draft.summon.srPityCount = 0;
      } else if (rarity === 'SR') {
        draft.summon.pityCount = nextSsrPity;
        draft.summon.srPityCount = 0;
      } else {
        draft.summon.pityCount = nextSsrPity;
        draft.summon.srPityCount = nextSrPity;
      }
      draft.summon.totalPulls += 1;

      let outcome = 'new';
      let shardsGained = 0;
      let crystalsGained = 0;

      if (!hasOwn(draft.roster, charDef.id)) {
        draft.roster[charDef.id] = makeDefaultRosterEntry();
      } else {
        const entry = draft.roster[charDef.id];
        const needToMax = [6, 5, 3, 0][entry.awakening] || 0;
        if (entry.awakening >= 3 || entry.shards >= needToMax) {
          crystalsGained = cfg.maxAwakenCrystalConversion[rarity] || 5;
          draft.currencies.exchangeCrystals += crystalsGained;
          outcome = 'crystal';
        } else {
          shardsGained = cfg.dupeShardsPerPull || 1;
          entry.shards += shardsGained;
          outcome = 'shard';
        }
      }

      results.push({
        charId: charDef.id,
        name: charDef.name,
        rarity: charDef.rarity,
        role: charDef.role,
        outcome,
        shardsGained,
        crystalsGained,
        isCeiling: isSsrCeiling
      });
    }

    return {
      ok: true,
      bannerId: banner.id,
      bannerName: banner.name,
      count: pullCount,
      cost,
      results,
      pityCount: draft.summon.pityCount,
      srPityCount: draft.summon.srPityCount,
      state: draft
    };
  }

  function exchangeCrystalItem(state, itemId) {
    const MasterData = IkaiApp.MasterData;
    const item = MasterData.CRYSTAL_SHOP_ITEMS.find(function (it) { return it.id === itemId; });
    if (!item) {
      return { ok: false, reason: '指定された交換品が見つかりません', state };
    }
    if (!state || !state.currencies || state.currencies.exchangeCrystals < item.costCrystals) {
      return { ok: false, reason: '交換結晶が不足しています（必要: ' + item.costCrystals + '）', state };
    }
    const rw = item.reward || {};
    if (rw.skillId) {
      if (!hasOwn(MasterData.SKILL_MAP, rw.skillId)) {
        return { ok: false, reason: '収集技定義が見つかりません', state };
      }
      if (state.skillInventory && hasOwn(state.skillInventory, rw.skillId) && state.skillInventory[rw.skillId].ownedCount >= 1) {
        return { ok: false, reason: 'この収集技は既に習得済みです', state };
      }
    }

    const draft = cloneState(state);
    draft.currencies.exchangeCrystals -= item.costCrystals;
    if (rw.universalShards) draft.currencies.universalShards += rw.universalShards;
    if (rw.masteryBooks) draft.currencies.masteryBooks += rw.masteryBooks;
    if (rw.emblemShards) draft.currencies.emblemShards += rw.emblemShards;
    if (rw.qualityCatalysts) draft.currencies.qualityCatalysts += rw.qualityCatalysts;
    if (rw.skillId) {
      draft.skillInventory[rw.skillId] = { ownedCount: 1, rank: 1, uses: 0 };
    }

    return {
      ok: true,
      item,
      state: draft
    };
  }

  // =========================================================================
  // Surplus Character Systems: Expedition (Battle-Count), Resonance, Party
  // =========================================================================

  function startExpedition(state, zoneId, charIds) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !Array.isArray(state.expeditions)) {
      return { ok: false, reason: '調査データが存在しません', state };
    }
    if (state.expeditions.length >= 4) {
      return { ok: false, reason: '同時に進行できる異界調査は最大4件までです', state };
    }
    const zone = MasterData.EXPEDITION_ZONES.find(function (z) { return z.id === zoneId; });
    if (!zone) {
      return { ok: false, reason: '指定された調査区画が存在しません', state };
    }
    const list = Array.isArray(charIds) ? charIds.filter(Boolean) : [];
    if (list.length < 1 || list.length > zone.maxChars) {
      return {
        ok: false,
        reason: 'この区画への派遣人数は 1〜' + zone.maxChars + ' 名で指定してください',
        state
      };
    }

    const partySet = new Set((state.party || []).filter(Boolean));
    const resSet = new Set((state.resonanceSlots || []).filter(Boolean));
    const activeExpSet = buildActiveExpeditionCharSet(state.expeditions);
    const chosenSet = new Set();

    for (let i = 0; i < list.length; i += 1) {
      const cid = list[i];
      if (!state.roster || !hasOwn(state.roster, cid)) {
        return { ok: false, reason: '未所持の仲間は派遣できません: ' + cid, state };
      }
      if (chosenSet.has(cid)) {
        return { ok: false, reason: '同一の仲間を重複選択しています', state };
      }
      if (partySet.has(cid)) {
        return { ok: false, reason: '出撃編成中の仲間は調査に派遣できません', state };
      }
      if (resSet.has(cid)) {
        return { ok: false, reason: '共鳴支援枠に配置中の仲間は調査に派遣できません', state };
      }
      if (activeExpSet.has(cid)) {
        return { ok: false, reason: '他の異界調査に派遣中の仲間は重複派遣できません', state };
      }
      chosenSet.add(cid);
    }

    const draft = cloneState(state);
    draft.expeditions.push({
      zoneId: zone.id,
      charIds: list.slice(),
      battlesDone: 0,
      requiredBattles: zone.requiredBattles,
      claimed: false
    });

    return {
      ok: true,
      slotIdx: draft.expeditions.length - 1,
      zone,
      state: draft
    };
  }

  function advanceExpeditionsOnBattle(state) {
    if (!state || !Array.isArray(state.expeditions)) {
      return { ok: false, reason: '調査データが存在しません', state };
    }
    const draft = cloneState(state);
    const res = advanceExpeditionsDraft(draft);
    return {
      ok: true,
      advancedCount: res.advancedCount,
      completedSlots: res.completedSlots,
      state: draft
    };
  }

  function claimExpedition(state, slotIdx, options) {
    const MasterData = IkaiApp.MasterData;
    const idx = Number(slotIdx);
    if (!state || !Array.isArray(state.expeditions) || !Number.isSafeInteger(idx) || idx < 0 || idx >= state.expeditions.length) {
      return { ok: false, reason: '指定された調査枠が存在しません', state };
    }
    const exp = state.expeditions[idx];
    if (exp.claimed) {
      return { ok: false, reason: '既に報酬を受け取り済みです', state };
    }
    if (exp.battlesDone < exp.requiredBattles) {
      return {
        ok: false,
        reason: 'まだ調査が完了していません（あと ' + (exp.requiredBattles - exp.battlesDone) + ' 戦）',
        state
      };
    }
    const zone = MasterData.EXPEDITION_ZONES.find(function (z) { return z.id === exp.zoneId; });
    if (!zone) {
      return { ok: false, reason: '調査区画定義が見つかりません', state };
    }

    const draft = cloneState(state);
    const rng = getRng(options);
    const rw = zone.rewards || {};

    if (rw.echoStones) draft.currencies.echoStones += rw.echoStones;
    if (rw.starCoins) draft.currencies.starCoins += rw.starCoins;
    if (rw.emblemShards) draft.currencies.emblemShards += rw.emblemShards;
    if (rw.masteryBooks) draft.currencies.masteryBooks += rw.masteryBooks;
    if (rw.exchangeCrystals) draft.currencies.exchangeCrystals += rw.exchangeCrystals;

    let equipResult = null;
    if (typeof rw.guaranteedEquipQualityMin === 'number' && MasterData.EQUIPS.length > 0) {
      const eqIdx = Math.floor(clampNum(rng(), 0, 0.999999999) * MasterData.EQUIPS.length);
      const eqDef = MasterData.EQUIPS[eqIdx];
      const qIdx = pickDropQualityIdx(rng, rw.guaranteedEquipQualityMin);
      equipResult = grantEquipOrAutoSell(draft, eqDef.id, qIdx, rng);
    }

    draft.expeditions.splice(idx, 1);

    return {
      ok: true,
      zoneId: zone.id,
      zoneName: zone.name,
      rewards: rw,
      equipResult,
      state: draft
    };
  }

  function setResonance(state, slotIdx, charId) {
    const idx = Number(slotIdx);
    if (!state || !Array.isArray(state.resonanceSlots) || !Number.isSafeInteger(idx) || idx < 0 || idx >= 4) {
      return { ok: false, reason: '共鳴支援枠の指定が不正です', state };
    }
    const draft = cloneState(state);

    if (charId === null || charId === undefined || charId === '') {
      draft.resonanceSlots[idx] = null;
      return { ok: true, slotIdx: idx, charId: null, state: draft };
    }

    if (!draft.roster || !hasOwn(draft.roster, charId)) {
      return { ok: false, reason: '未所持の仲間は共鳴支援枠に配置できません', state };
    }
    if (draft.party.indexOf(charId) >= 0) {
      return { ok: false, reason: '出撃編成中の仲間は共鳴支援枠に配置できません', state };
    }
    const activeExpSet = buildActiveExpeditionCharSet(draft.expeditions);
    if (activeExpSet.has(charId)) {
      return { ok: false, reason: '異界調査に派遣中の仲間は共鳴支援枠に配置できません', state };
    }

    const existingIdx = draft.resonanceSlots.indexOf(charId);
    if (existingIdx >= 0 && existingIdx !== idx) {
      draft.resonanceSlots[existingIdx] = null;
    }
    draft.resonanceSlots[idx] = charId;

    return { ok: true, slotIdx: idx, charId, state: draft };
  }

  function setPartySlot(state, slotIdx, charId) {
    const idx = Number(slotIdx);
    if (!state || !Array.isArray(state.party) || !Number.isSafeInteger(idx) || idx < 0 || idx >= 4) {
      return { ok: false, reason: '編成枠の指定が不正です', state };
    }
    const draft = cloneState(state);

    if (charId === null || charId === undefined || charId === '') {
      draft.party[idx] = null;
      if (draft.party.filter(Boolean).length < 1) {
        return { ok: false, reason: '出撃編成には最低1名の仲間が必要です', state };
      }
      return { ok: true, slotIdx: idx, charId: null, state: draft };
    }

    if (!draft.roster || !hasOwn(draft.roster, charId)) {
      return { ok: false, reason: '未所持の仲間は編成できません', state };
    }
    const activeExpSet = buildActiveExpeditionCharSet(draft.expeditions);
    if (activeExpSet.has(charId)) {
      return { ok: false, reason: '異界調査に派遣中の仲間は編成できません（完了受取後に編成できます）', state };
    }

    const existingPartyIdx = draft.party.indexOf(charId);
    if (existingPartyIdx >= 0) {
      const temp = draft.party[idx];
      draft.party[idx] = charId;
      draft.party[existingPartyIdx] = temp;
    } else {
      const resIdx = draft.resonanceSlots.indexOf(charId);
      if (resIdx >= 0) {
        draft.resonanceSlots[resIdx] = null;
      }
      draft.party[idx] = charId;
    }

    return { ok: true, slotIdx: idx, charId, state: draft };
  }

  function autoEquipBest(state, charId) {
    const MasterData = IkaiApp.MasterData;
    if (!state || !state.roster || !hasOwn(state.roster, charId)) {
      return { ok: false, reason: '指定された仲間を所持していません', state };
    }
    const draft = cloneState(state);
    const entry = draft.roster[charId];
    const tierDef = MasterData.AWAKENING_TIERS[entry.awakening];
    const unlockedSlots = tierDef ? tierDef.unlockedSlots : ['主器', '護符'];
    const owners = buildEquippedUidOwnerMap(draft.roster);

    const freeEquips = draft.equips.filter(function (eq) {
      const ow = owners.get(eq.uid);
      return !ow || ow.charId === charId;
    });

    const setCountAvailable = {};
    for (let i = 0; i < freeEquips.length; i += 1) {
      const def = MasterData.EQUIP_MAP[freeEquips[i].equipId];
      if (def && def.setId) {
        setCountAvailable[def.setId] = (setCountAvailable[def.setId] || 0) + 1;
      }
    }

    let equippedCount = 0;
    let changedCount = 0;
    const chosenSetCounts = {};

    for (let s = 0; s < unlockedSlots.length; s += 1) {
      const slot = unlockedSlots[s];
      const currentUid = entry.equipped[slot];
      const candidates = freeEquips.filter(function (eq) {
        const def = MasterData.EQUIP_MAP[eq.equipId];
        return def && def.slot === slot;
      });
      if (candidates.length === 0) {
        continue;
      }

      candidates.sort(function (a, b) {
        if (b.qualityIdx !== a.qualityIdx) {
          return b.qualityIdx - a.qualityIdx;
        }
        const defA = MasterData.EQUIP_MAP[a.equipId];
        const defB = MasterData.EQUIP_MAP[b.equipId];
        const stA = getEquipStats(a.equipId, a.qualityIdx);
        const stB = getEquipStats(b.equipId, b.qualityIdx);
        const sumA = (stA.hp || 0) * 0.15 + (stA.atk || 0) * 1.4 + (stA.def || 0) * 1.1 + (stA.spd || 0) * 5 + (stA.crit || 0) * 8;
        const sumB = (stB.hp || 0) * 0.15 + (stB.atk || 0) * 1.4 + (stB.def || 0) * 1.1 + (stB.spd || 0) * 5 + (stB.crit || 0) * 8;
        const synA = (defA && defA.setId ? (chosenSetCounts[defA.setId] || 0) * 100 + (setCountAvailable[defA.setId] || 0) * 5 : 0);
        const synB = (defB && defB.setId ? (chosenSetCounts[defB.setId] || 0) * 100 + (setCountAvailable[defB.setId] || 0) * 5 : 0);
        const scoreA = sumA + synA + (a.uid === currentUid ? 0.5 : 0);
        const scoreB = sumB + synB + (b.uid === currentUid ? 0.5 : 0);
        return scoreB - scoreA;
      });

      const best = candidates[0];
      const bestDef = MasterData.EQUIP_MAP[best.equipId];
      if (bestDef && bestDef.setId) {
        chosenSetCounts[bestDef.setId] = (chosenSetCounts[bestDef.setId] || 0) + 1;
      }
      if (entry.equipped[slot] !== best.uid) {
        entry.equipped[slot] = best.uid;
        changedCount += 1;
      }
      equippedCount += 1;
    }

    if (equippedCount === 0) {
      return { ok: false, reason: '開放済み部位に装着できる空き装備がありません', state };
    }

    return {
      ok: true,
      equippedCount,
      changedCount,
      state: draft
    };
  }

  function autoFitTrialParty(state, trialId) {
    const MasterData = IkaiApp.MasterData;
    const trial = MasterData.TRIALS.find(function (t) { return t.id === trialId; });
    if (!trial) {
      return { ok: false, reason: '指定された制約試練が存在しません', state };
    }
    const rules = trial.rules || {};
    const maxSize = Math.min(4, typeof rules.maxPartySize === 'number' ? rules.maxPartySize : 4);
    const activeExpSet = buildActiveExpeditionCharSet(state.expeditions);

    const isEligible = function (c) {
      if (!c || !state.roster || !hasOwn(state.roster, c.id)) return false;
      if (activeExpSet.has(c.id)) return false;
      if (rules.noSSR && c.rarity === 'SSR') return false;
      if (rules.onlyR && c.rarity !== 'R') return false;
      if (rules.noHealer && c.role === 'ヒーラー') return false;
      if (rules.noTank && c.role === 'タンク') return false;
      return true;
    };

    const currentValid = (state.party || []).filter(Boolean)
      .map(function (cid) { return MasterData.CHARACTER_MAP[cid]; })
      .filter(isEligible);

    const allOwned = MasterData.CHARACTERS.filter(isEligible);
    const sortedAll = (IkaiApp.StateStore && typeof IkaiApp.StateStore.sortUnits === 'function')
      ? IkaiApp.StateStore.sortUnits(allOwned)
      : allOwned;

    const picked = [];
    const seen = new Set();
    for (let i = 0; i < currentValid.length && picked.length < maxSize; i += 1) {
      if (!seen.has(currentValid[i].id)) {
        seen.add(currentValid[i].id);
        picked.push(currentValid[i].id);
      }
    }
    for (let i = 0; i < sortedAll.length && picked.length < maxSize; i += 1) {
      if (!seen.has(sortedAll[i].id)) {
        seen.add(sortedAll[i].id);
        picked.push(sortedAll[i].id);
      }
    }

    if (picked.length === 0) {
      return { ok: false, reason: '調査派遣中を除く所持仲間の中に、この制約試練に適合する仲間がいません', state };
    }

    const draft = cloneState(state);
    const newParty = [null, null, null, null];
    for (let i = 0; i < picked.length; i += 1) {
      newParty[i] = picked[i];
      const resIdx = draft.resonanceSlots.indexOf(picked[i]);
      if (resIdx >= 0) {
        draft.resonanceSlots[resIdx] = null;
      }
    }
    draft.party = newParty;

    const check = validateTrialEntry(draft, trialId, newParty);
    if (!check.ok) {
      return { ok: false, reason: check.reasons.join(' ／ '), state };
    }

    return {
      ok: true,
      party: newParty,
      state: draft
    };
  }

  IkaiApp.Progression = Object.freeze({
    getEquipStats,
    getEquipSellValue,
    pickDropQualityIdx,
    grantEquipOrAutoSell,
    equipItem,
    unequipSlot,
    toggleEquipLock,
    synthesizeEquip,
    bulkSellEquips,
    setAutoSellQuality,
    unlockEmblemNode,
    awakenCharacter,
    upgradeSkillMastery,
    equipCollectSkill,
    isStageUnlocked,
    validateTrialEntry,
    applyBattleOutcome,
    selectBanner,
    rollSummon,
    exchangeCrystalItem,
    startExpedition,
    advanceExpeditionsOnBattle,
    claimExpedition,
    setResonance,
    setPartySlot,
    autoEquipBest,
    autoFitTrialParty
  });
})(typeof window !== 'undefined' ? window : globalThis);
