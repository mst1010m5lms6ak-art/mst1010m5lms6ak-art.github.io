(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  const uiState = {
    mode: 'hub', // 'hub' | 'battle' | 'result'
    activeTab: 'roster',
    areasPillar: 'story', // 'story' | 'abyss' | 'raid' | 'trial'
    enhanceSub: 'chars', // 'chars' | 'emblem' | 'skills' | 'equips'
    summonSub: 'pull', // 'pull' | 'shop'
    codexCategory: 'chars', // 'chars' | 'enemies' | 'equips' | 'skills'
    codexQuery: '',
    codexSelectedId: 'char_todo_seiichi',
    rosterFilter: 'all',
    selectedCharId: 'char_kiryu_takashi',
    selectedPartySlot: 0,
    selectedResonanceSlot: 0,
    selectedAreaId: 'area_1',
    selectedStageId: '1-1',
    selectedAbyssFloor: 1,
    selectedRaidId: 'raid_zerogo',
    selectedRaidDiff: 'easy',
    selectedTrialId: 'trial_1',
    selectedZoneId: 'exp_1',
    expCandidateIds: [],
    selectedEquipUid: null,
    synthBaseUid: null,
    synthMatUid: null,
    useCatalyst: false,
    selectedSkillId: 'sk_r_kiriharai',
    lastSummonResult: null,
    hubGlobalPolicy: 'balanced',
    showDpsDetail: false,
    autoRepeatDone: 0,
    autoRepeatRemaining: 0,
    autoRepeatPending: false,
    activeBattleParams: { mode: 'stage', stageId: '1-1' },
    lastRewards: null,
    nextStageId: null,
    backupText: '',
    notice: null,
    tamperWarning: null,
    booted: false
  };

  let upperEl = null;
  let lowerEl = null;
  let latestSnapshot = null;
  let loopHandle = null;
  let loopUsesRaf = false;
  let lastTickTs = 0;
  let autoRepeatTimer = null;
  const seLastPlayedAt = {};

  function hasOwn(obj, key) {
    return Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function findAreaById(areaId) {
    const areas = IkaiApp.MasterData.AREAS;
    for (let i = 0; i < areas.length; i += 1) {
      if (areas[i].id === areaId) {
        return areas[i];
      }
    }
    return areas[0];
  }

  function getNextStageId(stageId) {
    const areas = IkaiApp.MasterData.AREAS;
    const flat = [];
    for (let a = 0; a < areas.length; a += 1) {
      for (let s = 0; s < areas[a].stages.length; s += 1) {
        flat.push(areas[a].stages[s].id);
      }
    }
    const idx = flat.indexOf(stageId);
    if (idx >= 0 && idx + 1 < flat.length) {
      return flat[idx + 1];
    }
    return null;
  }

  function defaultCodexIdForCategory(cat) {
    const MasterData = IkaiApp.MasterData;
    if (cat === 'enemies') {
      const vals = Object.values(MasterData.ENEMIES);
      return vals[0] ? vals[0].id : '';
    }
    if (cat === 'equips') {
      return MasterData.EQUIPS[0] ? MasterData.EQUIPS[0].id : '';
    }
    if (cat === 'skills') {
      return MasterData.SKILLS[0] ? MasterData.SKILLS[0].id : '';
    }
    return 'char_todo_seiichi';
  }

  function playThrottledSe(seId, minIntervalMs) {
    const AudioSE = IkaiApp.AudioSE;
    if (!AudioSE) return;
    const now = Date.now();
    const prev = seLastPlayedAt[seId] || 0;
    const gap = typeof minIntervalMs === 'number' ? minIntervalMs : 60;
    if (now - prev < gap) {
      return;
    }
    seLastPlayedAt[seId] = now;
    AudioSE.play(seId);
  }

  function processBattleAudioEvents(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return;
    }
    let hasCrit = false;
    let hasDmg = false;
    let hasHeal = false;
    let hasTelegraph = false;

    for (let i = 0; i < events.length; i += 1) {
      const ev = events[i];
      if (ev.type === 'boss_telegraph') hasTelegraph = true;
      else if (ev.type === 'damage' && ev.isCrit) hasCrit = true;
      else if (ev.type === 'damage') hasDmg = true;
      else if (ev.type === 'heal') hasHeal = true;
    }

    if (hasTelegraph) playThrottledSe('boss_telegraph', 180);
    if (hasCrit) playThrottledSe('battle_crit', 70);
    else if (hasDmg) playThrottledSe('battle_attack', 70);
    if (hasHeal) playThrottledSe('battle_heal', 90);
  }

  function stopBattleLoop() {
    if (loopHandle !== null) {
      if (loopUsesRaf && typeof root.cancelAnimationFrame === 'function') {
        root.cancelAnimationFrame(loopHandle);
      } else if (typeof root.clearTimeout === 'function') {
        root.clearTimeout(loopHandle);
      }
      loopHandle = null;
    }
  }

  function cancelAutoRepeatTimer() {
    if (autoRepeatTimer !== null && typeof root.clearTimeout === 'function') {
      root.clearTimeout(autoRepeatTimer);
      autoRepeatTimer = null;
    }
    uiState.autoRepeatPending = false;
  }

  function applyBattleOutcomeToState(snapshot, opts) {
    const StateStore = IkaiApp.StateStore;
    const Progression = IkaiApp.Progression;
    const res = Progression.applyBattleOutcome(StateStore.getState(), snapshot, opts);
    if (res.ok && (!opts || !opts.isRetreat)) {
      StateStore.setState(res.state);
    }
    return res.summary || null;
  }

  function finishBattle(snapshot) {
    stopBattleLoop();
    latestSnapshot = snapshot;

    if (snapshot.status === 'victory') {
      IkaiApp.AudioSE.play('victory');
    } else {
      IkaiApp.AudioSE.play('defeat');
    }

    uiState.lastRewards = applyBattleOutcomeToState(snapshot);
    uiState.nextStageId = snapshot.mode === 'stage' ? getNextStageId(snapshot.stageId) : null;
    uiState.mode = 'result';

    const canRepeatMode = snapshot.mode === 'stage' || snapshot.mode === 'abyss' || snapshot.mode === 'raid';

    if (snapshot.status === 'victory' && canRepeatMode && snapshot.autoRepeat > 0 && uiState.autoRepeatRemaining > 0) {
      uiState.autoRepeatRemaining -= 1;
    } else if (snapshot.status !== 'victory') {
      uiState.autoRepeatRemaining = 0;
    }

    if (snapshot.status === 'victory' && canRepeatMode && snapshot.autoRepeat > 0 && uiState.autoRepeatRemaining > 0) {
      uiState.autoRepeatPending = true;
      renderAll();
      cancelAutoRepeatTimer();
      uiState.autoRepeatPending = true;
      const paramsCopy = Object.assign({}, uiState.activeBattleParams);
      autoRepeatTimer = root.setTimeout(function () {
        autoRepeatTimer = null;
        if (uiState.mode === 'result' && uiState.autoRepeatPending) {
          uiState.autoRepeatPending = false;
          startBattle(paramsCopy.mode, paramsCopy, { continueRepeat: true });
        }
      }, 1000);
      return;
    }

    uiState.autoRepeatPending = false;
    renderAll();
  }

  function runLoopFrame(nowTs) {
    if (uiState.mode !== 'battle') {
      stopBattleLoop();
      return;
    }
    const now = typeof nowTs === 'number' ? nowTs : Date.now();
    const rawDt = lastTickTs > 0 ? (now - lastTickTs) : 33;
    lastTickTs = now;
    const dtMs = Math.min(80, Math.max(16, rawDt));

    const snapshot = IkaiApp.CombatEngine.step(dtMs);
    if (!snapshot) {
      stopBattleLoop();
      return;
    }
    latestSnapshot = snapshot;
    processBattleAudioEvents(snapshot.events);

    if (snapshot.status !== 'ongoing') {
      finishBattle(snapshot);
      return;
    }

    IkaiApp.UIRenderer.patchBattleFrame(upperEl, lowerEl, snapshot, uiState);
    scheduleNextFrame();
  }

  function scheduleNextFrame() {
    if (typeof root.requestAnimationFrame === 'function') {
      loopUsesRaf = true;
      loopHandle = root.requestAnimationFrame(runLoopFrame);
    } else if (typeof root.setTimeout === 'function') {
      loopUsesRaf = false;
      loopHandle = root.setTimeout(function () {
        runLoopFrame(Date.now());
      }, 33);
    }
  }

  function startBattle(mode, params, opts) {
    const options = opts || {};
    const p = params || {};
    const targetMode = mode || 'stage';
    const state = IkaiApp.StateStore.getState();

    if (targetMode === 'trial' && !options.skipTrialCheck) {
      const tid = p.trialId || uiState.selectedTrialId || 'trial_1';
      const check = IkaiApp.Progression.validateTrialEntry(state, tid, state.party);
      if (!check.ok) {
        uiState.notice = { type: 'error', text: check.reasons.join(' ／ ') };
        renderAll();
        return null;
      }
    }

    cancelAutoRepeatTimer();
    stopBattleLoop();

    const canRepeatMode = targetMode === 'stage' || targetMode === 'abyss' || targetMode === 'raid';
    const repeatSetting = canRepeatMode ? (state.settings.autoRepeatCount || 0) : 0;

    if (options.continueRepeat) {
      uiState.autoRepeatDone += 1;
    } else {
      uiState.autoRepeatDone = repeatSetting > 0 ? 1 : 0;
      uiState.autoRepeatRemaining = repeatSetting;
    }

    const cfg = {
      mode: targetMode,
      state,
      speed: state.settings.battleSpeed,
      autoRepeat: repeatSetting,
      globalTactic: uiState.hubGlobalPolicy,
      seed: options.seed
    };

    if (targetMode === 'stage') {
      const targetStageId = p.stageId || uiState.selectedStageId || '1-1';
      uiState.selectedStageId = targetStageId;
      if (hasOwn(IkaiApp.MasterData.STAGE_MAP, targetStageId)) {
        uiState.selectedAreaId = IkaiApp.MasterData.STAGE_MAP[targetStageId].areaId;
      }
      cfg.stageId = targetStageId;
    } else if (targetMode === 'abyss') {
      const floor = Math.max(1, Math.floor(Number(p.floor || uiState.selectedAbyssFloor || 1)));
      uiState.selectedAbyssFloor = floor;
      cfg.floor = floor;
    } else if (targetMode === 'raid') {
      const raidId = p.raidId || uiState.selectedRaidId || 'raid_zerogo';
      const diffId = p.difficultyId || uiState.selectedRaidDiff || 'easy';
      uiState.selectedRaidId = raidId;
      uiState.selectedRaidDiff = diffId;
      cfg.raidId = raidId;
      cfg.difficultyId = diffId;
    } else if (targetMode === 'trial') {
      const trialId = p.trialId || uiState.selectedTrialId || 'trial_1';
      uiState.selectedTrialId = trialId;
      cfg.trialId = trialId;
    }

    uiState.activeBattleParams = {
      mode: targetMode,
      stageId: cfg.stageId,
      floor: cfg.floor,
      raidId: cfg.raidId,
      difficultyId: cfg.difficultyId,
      trialId: cfg.trialId
    };

    const battle = IkaiApp.CombatEngine.createBattle(cfg);
    if (uiState.hubGlobalPolicy && uiState.hubGlobalPolicy !== 'balanced') {
      IkaiApp.CombatEngine.setGlobalTactic(battle, uiState.hubGlobalPolicy);
    }

    latestSnapshot = IkaiApp.CombatEngine.getSnapshot(battle);
    uiState.mode = 'battle';
    uiState.lastRewards = null;
    uiState.notice = null;
    IkaiApp.UIRenderer.resetBattleCache();
    renderAll();

    lastTickTs = typeof root.performance !== 'undefined' && typeof root.performance.now === 'function'
      ? root.performance.now()
      : Date.now();
    scheduleNextFrame();
    return battle;
  }

  function startStageBattle(stageId, opts) {
    const targetStageId = stageId || uiState.selectedStageId || '1-1';
    return startBattle('stage', { stageId: targetStageId }, opts);
  }

  function renderAll() {
    const state = IkaiApp.StateStore.getState();
    IkaiApp.UIRenderer.renderAll(upperEl, lowerEl, state, uiState, latestSnapshot);
  }

  function cycleArrayValue(arr, current) {
    const idx = arr.indexOf(current);
    return arr[(idx + 1) % arr.length];
  }

  function applyProgressionResult(res, successNoticeText) {
    if (!res) return false;
    if (!res.ok) {
      uiState.notice = { type: 'error', text: res.reason || '操作を実行できませんでした' };
      renderAll();
      return false;
    }
    IkaiApp.StateStore.setState(res.state);
    if (successNoticeText) {
      uiState.notice = { type: 'ok', text: successNoticeText };
    } else {
      uiState.notice = null;
    }
    renderAll();
    return true;
  }

  async function handleAction(actionEl) {
    const action = actionEl.dataset.action;
    const AudioSE = IkaiApp.AudioSE;
    const StateStore = IkaiApp.StateStore;
    const SaveSecurity = IkaiApp.SaveSecurity;
    const CombatEngine = IkaiApp.CombatEngine;
    const Progression = IkaiApp.Progression;
    const UIRenderer = IkaiApp.UIRenderer;

    if (action === 'switch-tab') {
      uiState.activeTab = actionEl.dataset.tabId || 'roster';
      uiState.notice = null;
      AudioSE.play('ui_tab');
      renderAll();
      return;
    }

    if (action === 'switch-areas-pillar') {
      uiState.areasPillar = actionEl.dataset.pillar || 'story';
      uiState.notice = null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'switch-enhance-sub') {
      uiState.enhanceSub = actionEl.dataset.sub || 'chars';
      uiState.notice = null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'switch-summon-sub') {
      uiState.summonSub = actionEl.dataset.sub || 'pull';
      uiState.notice = null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'switch-codex-cat') {
      const cat = actionEl.dataset.category || 'chars';
      uiState.codexCategory = cat;
      uiState.codexSelectedId = defaultCodexIdForCategory(cat);
      uiState.notice = null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'codex-select') {
      uiState.codexSelectedId = actionEl.dataset.id || uiState.codexSelectedId;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'filter-roster') {
      uiState.rosterFilter = actionEl.dataset.filter === 'owned' ? 'owned' : 'all';
      if (uiState.rosterFilter === 'owned') {
        const state = StateStore.getState();
        if (!hasOwn(state.roster, uiState.selectedCharId)) {
          const ownedList = IkaiApp.MasterData.CHARACTERS.filter(function (c) {
            return hasOwn(state.roster, c.id);
          });
          const sortedOwned = StateStore.sortUnits(ownedList);
          if (sortedOwned.length > 0) {
            uiState.selectedCharId = sortedOwned[0].id;
          }
        }
      }
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'select-char') {
      uiState.selectedCharId = actionEl.dataset.charId || uiState.selectedCharId;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    // Party & Resonance actions
    if (action === 'select-party-slot') {
      uiState.selectedPartySlot = Math.min(3, Math.max(0, Number(actionEl.dataset.slotIdx) || 0));
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'assign-party-slot') {
      const slotIdx = Number(actionEl.dataset.slotIdx);
      const cid = uiState.selectedCharId;
      AudioSE.play('ui_tap');
      const res = Progression.setPartySlot(StateStore.getState(), slotIdx, cid);
      applyProgressionResult(res);
      return;
    }

    if (action === 'party-assign-char') {
      const cid = actionEl.dataset.charId || null;
      AudioSE.play('ui_tap');
      const res = Progression.setPartySlot(StateStore.getState(), uiState.selectedPartySlot, cid);
      applyProgressionResult(res);
      return;
    }

    if (action === 'party-clear-slot') {
      const slotIdx = Number(actionEl.dataset.slotIdx);
      AudioSE.play('ui_tap');
      const res = Progression.setPartySlot(StateStore.getState(), slotIdx, null);
      applyProgressionResult(res);
      return;
    }

    if (action === 'select-resonance-slot') {
      uiState.selectedResonanceSlot = Math.min(3, Math.max(0, Number(actionEl.dataset.slotIdx) || 0));
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'set-resonance-char') {
      const cid = actionEl.dataset.charId || null;
      AudioSE.play('ui_tap');
      const res = Progression.setResonance(StateStore.getState(), uiState.selectedResonanceSlot, cid);
      applyProgressionResult(res);
      return;
    }

    if (action === 'clear-resonance-slot') {
      const slotIdx = Number(actionEl.dataset.slotIdx);
      AudioSE.play('ui_tap');
      const res = Progression.setResonance(StateStore.getState(), slotIdx, null);
      applyProgressionResult(res);
      return;
    }

    if (action === 'cycle-roster-policy' || action === 'cycle-roster-target' || action === 'cycle-roster-priority') {
      const cid = actionEl.dataset.charId;
      const state = StateStore.getState();
      if (!hasOwn(state.roster, cid)) return;
      StateStore.update(function (draft) {
        const tac = draft.roster[cid].tactic;
        if (action === 'cycle-roster-policy') {
          tac.policy = cycleArrayValue(UIRenderer.POLICY_ORDER, tac.policy);
        } else if (action === 'cycle-roster-target') {
          tac.target = cycleArrayValue(UIRenderer.TARGET_ORDER, tac.target);
        } else {
          tac.skillPriority = cycleArrayValue(UIRenderer.PRIORITY_ORDER, tac.skillPriority);
        }
      });
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'cycle-roster-skill') {
      const cid = actionEl.dataset.charId;
      const state = StateStore.getState();
      if (!hasOwn(state.roster, cid)) return;
      const ownedSkills = Object.keys(state.skillInventory).filter(function (sid) {
        return state.skillInventory[sid].ownedCount > 0;
      });
      if (ownedSkills.length === 0) return;
      const skills = state.roster[cid].skills;
      const choices = [null].concat(ownedSkills.filter(function (s) { return s !== skills[1]; }));
      const nextVal = cycleArrayValue(choices, skills[0]);
      AudioSE.play('ui_tap');
      const res = Progression.equipCollectSkill(state, cid, 0, nextVal);
      applyProgressionResult(res);
      return;
    }

    // Growth actions: Awaken, Emblem, Skills, Equips
    if (action === 'awaken-char') {
      const cid = actionEl.dataset.charId || uiState.selectedCharId;
      AudioSE.play('ui_tap');
      const res = Progression.awakenCharacter(StateStore.getState(), cid);
      const msg = res.ok
        ? ('覚醒段階 ' + res.newAwakening + ' / 3 に到達しました！' + (res.overflowCrystals > 0 ? ('（余剰欠片→交換結晶 +' + res.overflowCrystals + '）') : ''))
        : null;
      applyProgressionResult(res, msg);
      return;
    }

    if (action === 'unlock-emblem') {
      const nodeId = Number(actionEl.dataset.nodeId);
      AudioSE.play('ui_tap');
      const res = Progression.unlockEmblemNode(StateStore.getState(), uiState.selectedCharId, nodeId);
      applyProgressionResult(res, res.ok ? ('紋章節点 ' + nodeId + ' を解放しました。') : null);
      return;
    }

    if (action === 'select-skill') {
      uiState.selectedSkillId = actionEl.dataset.skillId || uiState.selectedSkillId;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'equip-collect-skill') {
      const slotIdx = Number(actionEl.dataset.slotIdx);
      const skillId = actionEl.dataset.skillId || null;
      AudioSE.play('ui_tap');
      const res = Progression.equipCollectSkill(StateStore.getState(), uiState.selectedCharId, slotIdx, skillId);
      applyProgressionResult(res);
      return;
    }

    if (action === 'upgrade-skill-mastery') {
      const sid = actionEl.dataset.skillId || uiState.selectedSkillId;
      AudioSE.play('ui_tap');
      const res = Progression.upgradeSkillMastery(StateStore.getState(), sid);
      applyProgressionResult(res, res.ok ? ('収集技の熟練度をランク' + IkaiApp.MasterData.SKILL_MASTERY_RANKS[res.newRank - 1].label + 'へ鍛錬しました。') : null);
      return;
    }

    if (action === 'select-equip') {
      uiState.selectedEquipUid = actionEl.dataset.uid || null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'equip-item') {
      const uid = actionEl.dataset.uid;
      uiState.selectedEquipUid = uid;
      AudioSE.play('ui_tap');
      const res = Progression.equipItem(StateStore.getState(), uiState.selectedCharId, uid);
      applyProgressionResult(res);
      return;
    }

    if (action === 'unequip-slot') {
      const slotName = actionEl.dataset.slotName;
      AudioSE.play('ui_tap');
      const res = Progression.unequipSlot(StateStore.getState(), uiState.selectedCharId, slotName);
      applyProgressionResult(res);
      return;
    }

    if (action === 'toggle-equip-lock') {
      const uid = actionEl.dataset.uid;
      AudioSE.play('ui_tap');
      const res = Progression.toggleEquipLock(StateStore.getState(), uid);
      applyProgressionResult(res);
      return;
    }

    if (action === 'set-synth-base') {
      uiState.synthBaseUid = actionEl.dataset.uid || null;
      uiState.selectedEquipUid = uiState.synthBaseUid;
      uiState.synthMatUid = null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'set-synth-mat') {
      uiState.synthMatUid = actionEl.dataset.uid || null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'toggle-use-catalyst') {
      uiState.useCatalyst = !uiState.useCatalyst;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'synthesize-equip') {
      AudioSE.play('ui_tap');
      const res = Progression.synthesizeEquip(
        StateStore.getState(),
        uiState.synthBaseUid,
        uiState.synthMatUid,
        { useCatalyst: uiState.useCatalyst }
      );
      if (res.ok) {
        uiState.synthMatUid = null;
        const qName = IkaiApp.MasterData.QUALITY_RANKS[res.newQualityIdx].name;
        const msg = res.succeeded
          ? ('品質合成成功！品質「' + qName + '」へ昇格しました' + (res.isCeiling ? '（天井保証）' : '') + '。')
          : ('品質昇格に失敗（天井カウント ' + res.pityCount + ' / ' + res.pityMax + '）。');
        applyProgressionResult(res, msg);
      } else {
        applyProgressionResult(res);
      }
      return;
    }

    if (action === 'bulk-sell-equips') {
      const maxQ = Number(actionEl.dataset.maxQuality);
      AudioSE.play('ui_tap');
      const res = Progression.bulkSellEquips(StateStore.getState(), maxQ);
      if (res.ok) {
        const msg = res.soldCount > 0
          ? (res.soldCount + ' 個の装備を一括売却し、星貨 +' + res.coinsGained + ' を獲得しました。')
          : '売却対象の未保護・未装着装備はありませんでした。';
        applyProgressionResult(res, msg);
      } else {
        applyProgressionResult(res);
      }
      return;
    }

    // Expedition actions
    if (action === 'select-zone') {
      uiState.selectedZoneId = actionEl.dataset.zoneId || 'exp_1';
      uiState.expCandidateIds = [];
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'toggle-exp-char') {
      const cid = actionEl.dataset.charId;
      const zone = IkaiApp.MasterData.EXPEDITION_ZONES.find(function (z) { return z.id === uiState.selectedZoneId; }) || IkaiApp.MasterData.EXPEDITION_ZONES[0];
      const idx = uiState.expCandidateIds.indexOf(cid);
      if (idx >= 0) {
        uiState.expCandidateIds.splice(idx, 1);
      } else if (uiState.expCandidateIds.length < zone.maxChars) {
        uiState.expCandidateIds.push(cid);
      }
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'start-expedition') {
      AudioSE.play('ui_tap');
      const res = Progression.startExpedition(StateStore.getState(), uiState.selectedZoneId, uiState.expCandidateIds);
      if (res.ok) {
        uiState.expCandidateIds = [];
      }
      applyProgressionResult(res, res.ok ? ('『' + res.zone.name + '』へ調査派遣を開始しました。') : null);
      return;
    }

    if (action === 'claim-expedition') {
      const slotIdx = Number(actionEl.dataset.slotIdx);
      AudioSE.play('ui_tap');
      const res = Progression.claimExpedition(StateStore.getState(), slotIdx);
      if (res.ok) {
        const parts = [];
        if (res.rewards.echoStones) parts.push('残響石+' + res.rewards.echoStones);
        if (res.rewards.starCoins) parts.push('星貨+' + res.rewards.starCoins);
        if (res.rewards.emblemShards) parts.push('紋章片+' + res.rewards.emblemShards);
        if (res.rewards.masteryBooks) parts.push('熟練の書+' + res.rewards.masteryBooks);
        if (res.rewards.exchangeCrystals) parts.push('交換結晶+' + res.rewards.exchangeCrystals);
        if (res.equipResult && res.equipResult.equip) {
          const eqDef = IkaiApp.MasterData.EQUIP_MAP[res.equipResult.equip.equipId];
          const qName = IkaiApp.MasterData.QUALITY_RANKS[res.equipResult.equip.qualityIdx].name;
          parts.push((eqDef ? eqDef.name : '装備') + '（' + qName + (res.equipResult.autoSold ? '・自動売却' : '') + '）');
        }
        applyProgressionResult(res, '『' + res.zoneName + '』報酬受取：' + parts.join(' ／ '));
      } else {
        applyProgressionResult(res);
      }
      return;
    }

    // Summon & Shop actions
    if (action === 'select-banner') {
      const bannerId = actionEl.dataset.bannerId;
      uiState.lastSummonResult = null;
      AudioSE.play('ui_tap');
      const res = Progression.selectBanner(StateStore.getState(), bannerId);
      applyProgressionResult(res);
      return;
    }

    if (action === 'roll-summon') {
      const cnt = Number(actionEl.dataset.count) === 10 ? 10 : 1;
      const state = StateStore.getState();
      const res = Progression.rollSummon(state, state.summon.selectedBannerId, cnt);
      if (res.ok) {
        uiState.lastSummonResult = res;
        const hasSsr = res.results.some(function (r) { return r.rarity === 'SSR'; });
        AudioSE.play(hasSsr ? 'summon_ssr' : 'ui_tap');
        const newCount = res.results.filter(function (r) { return r.outcome === 'new'; }).length;
        const shardCount = res.results.filter(function (r) { return r.outcome === 'shard'; }).length;
        const crysTotal = res.results.reduce(function (sum, r) { return sum + r.crystalsGained; }, 0);
        applyProgressionResult(
          res,
          cnt + '回召喚完了（新規 ' + newCount + ' ／ 覚醒片 +' + shardCount + ' ／ 交換結晶 +' + crysTotal + '）'
        );
      } else {
        AudioSE.play('ui_tap');
        applyProgressionResult(res);
      }
      return;
    }

    if (action === 'exchange-crystal') {
      const itemId = actionEl.dataset.itemId;
      AudioSE.play('ui_tap');
      const res = Progression.exchangeCrystalItem(StateStore.getState(), itemId);
      applyProgressionResult(res, res.ok ? ('『' + res.item.name + '』と交換しました。') : null);
      return;
    }

    // Areas / Sortie actions
    if (action === 'select-area') {
      const area = findAreaById(actionEl.dataset.areaId);
      uiState.selectedAreaId = area.id;
      uiState.selectedStageId = area.stages[0].id;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'select-stage') {
      uiState.selectedStageId = actionEl.dataset.stageId || uiState.selectedStageId;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'set-hub-policy') {
      const pol = actionEl.dataset.policy;
      if (UIRenderer.POLICY_ORDER.indexOf(pol) >= 0) {
        uiState.hubGlobalPolicy = pol;
      }
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'set-auto-repeat') {
      const cnt = Math.max(0, Math.floor(Number(actionEl.dataset.count) || 0));
      StateStore.update(function (draft) {
        draft.settings.autoRepeatCount = cnt;
      });
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'start-stage') {
      const stageId = actionEl.dataset.stageId || uiState.selectedStageId;
      if (!Progression.isStageUnlocked(StateStore.getState(), stageId)) {
        AudioSE.play('ui_tap');
        uiState.notice = { type: 'error', text: '前のステージをクリアすると出撃できるようになります。' };
        renderAll();
        return;
      }
      AudioSE.play('ui_tap');
      startStageBattle(stageId);
      return;
    }

    if (action === 'select-abyss-floor') {
      const maxFl = Math.max(1, StateStore.getState().progress.abyssMaxFloor + 1);
      uiState.selectedAbyssFloor = Math.min(maxFl, Math.max(1, Number(actionEl.dataset.floor) || 1));
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'start-abyss') {
      AudioSE.play('ui_tap');
      startBattle('abyss', { floor: Number(actionEl.dataset.floor) || uiState.selectedAbyssFloor });
      return;
    }

    if (action === 'select-raid-boss') {
      uiState.selectedRaidId = actionEl.dataset.raidId || uiState.selectedRaidId;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'select-raid-diff') {
      uiState.selectedRaidDiff = actionEl.dataset.diffId || uiState.selectedRaidDiff;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'start-raid') {
      AudioSE.play('ui_tap');
      startBattle('raid', {
        raidId: actionEl.dataset.raidId || uiState.selectedRaidId,
        difficultyId: actionEl.dataset.diffId || uiState.selectedRaidDiff
      });
      return;
    }

    if (action === 'select-trial') {
      uiState.selectedTrialId = actionEl.dataset.trialId || uiState.selectedTrialId;
      uiState.notice = null;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'start-trial') {
      AudioSE.play('ui_tap');
      startBattle('trial', { trialId: actionEl.dataset.trialId || uiState.selectedTrialId });
      return;
    }

    // In-battle interventions
    if (action === 'battle-speed') {
      const spd = Math.min(3, Math.max(1, Math.round(Number(actionEl.dataset.speed) || 1)));
      CombatEngine.setSpeed(spd);
      StateStore.update(function (draft) {
        draft.settings.battleSpeed = spd;
      });
      latestSnapshot = CombatEngine.getSnapshot();
      AudioSE.play('ui_tap');
      if (latestSnapshot) {
        UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
      }
      return;
    }

    if (action === 'toggle-battle-repeat') {
      const current = CombatEngine.getSnapshot();
      const nextCount = current && current.autoRepeat > 0 ? 0 : 10;
      CombatEngine.setAutoRepeat(nextCount);
      if (nextCount > 0) {
        if (uiState.autoRepeatDone <= 0) {
          uiState.autoRepeatDone = 1;
        }
        uiState.autoRepeatRemaining = Math.max(1, nextCount - uiState.autoRepeatDone + 1);
      } else {
        uiState.autoRepeatRemaining = 0;
      }
      StateStore.update(function (draft) {
        draft.settings.autoRepeatCount = nextCount;
      });
      latestSnapshot = CombatEngine.getSnapshot();
      AudioSE.play('ui_tap');
      if (latestSnapshot) {
        UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
      }
      return;
    }

    if (action === 'toggle-dps-detail') {
      uiState.showDpsDetail = !uiState.showDpsDetail;
      AudioSE.play('ui_tap');
      if (latestSnapshot) {
        UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
      }
      return;
    }

    if (action === 'battle-global-policy') {
      const pol = actionEl.dataset.policy;
      CombatEngine.setGlobalTactic(pol);
      latestSnapshot = CombatEngine.getSnapshot();
      AudioSE.play('ui_tap');
      if (latestSnapshot) {
        UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
      }
      return;
    }

    if (action === 'battle-global-target') {
      const tgt = actionEl.dataset.target;
      CombatEngine.setGlobalTargetPolicy(tgt);
      latestSnapshot = CombatEngine.getSnapshot();
      AudioSE.play('ui_tap');
      if (latestSnapshot) {
        UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
      }
      return;
    }

    if (action === 'cycle-unit-tactic') {
      const uid = actionEl.dataset.unitId;
      const snap = CombatEngine.getSnapshot();
      const ally = snap && snap.allies.find(function (a) { return a.id === uid; });
      if (ally) {
        const nextPolicy = cycleArrayValue(UIRenderer.POLICY_ORDER, ally.tactic.policy);
        CombatEngine.setUnitTactic(uid, { policy: nextPolicy });
        latestSnapshot = CombatEngine.getSnapshot();
        AudioSE.play('ui_tap');
        if (latestSnapshot) {
          UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
        }
      }
      return;
    }

    if (action === 'reserve-skill') {
      const uid = actionEl.dataset.unitId;
      const skId = actionEl.dataset.skillId || 'unique';
      const snap = CombatEngine.getSnapshot();
      const ally = snap && snap.allies.find(function (a) { return a.id === uid; });
      if (ally) {
        const nextVal = ally.reservedSkillId ? null : skId;
        CombatEngine.reserveSkill(uid, nextVal);
        latestSnapshot = CombatEngine.getSnapshot();
        AudioSE.play('ui_tap');
        if (latestSnapshot) {
          UIRenderer.patchBattleFrame(upperEl, lowerEl, latestSnapshot, uiState);
        }
      }
      return;
    }

    if (action === 'retreat-battle') {
      stopBattleLoop();
      cancelAutoRepeatTimer();
      uiState.autoRepeatRemaining = 0;
      const active = CombatEngine.getActiveBattle();
      if (active) {
        active.status = 'defeat';
        latestSnapshot = CombatEngine.getSnapshot(active);
      }
      AudioSE.play('defeat');
      uiState.lastRewards = applyBattleOutcomeToState(latestSnapshot, { isRetreat: true });
      uiState.nextStageId = uiState.activeBattleParams.mode === 'stage'
        ? getNextStageId(uiState.activeBattleParams.stageId)
        : null;
      uiState.mode = 'result';
      renderAll();
      return;
    }

    // Result actions
    if (action === 'cancel-auto-repeat') {
      cancelAutoRepeatTimer();
      uiState.autoRepeatRemaining = 0;
      AudioSE.play('ui_tap');
      renderAll();
      return;
    }

    if (action === 'retry-battle') {
      AudioSE.play('ui_tap');
      const p = uiState.activeBattleParams || { mode: 'stage', stageId: uiState.selectedStageId };
      startBattle(p.mode, p);
      return;
    }

    if (action === 'next-stage') {
      if (uiState.nextStageId) {
        AudioSE.play('ui_tap');
        startStageBattle(uiState.nextStageId);
      }
      return;
    }

    if (action === 'next-abyss-floor') {
      AudioSE.play('ui_tap');
      const nextFl = Math.max(1, (uiState.activeBattleParams.floor || uiState.selectedAbyssFloor || 1) + 1);
      startBattle('abyss', { floor: nextFl });
      return;
    }

    if (action === 'return-hub') {
      cancelAutoRepeatTimer();
      stopBattleLoop();
      uiState.mode = 'hub';
      AudioSE.play('ui_tab');
      renderAll();
      return;
    }

    // Settings, Auto-sell, Audio & Records actions
    if (action === 'set-auto-sell') {
      const maxQ = Number(actionEl.dataset.maxQuality);
      AudioSE.play('ui_tap');
      const res = Progression.setAutoSellQuality(StateStore.getState(), maxQ);
      applyProgressionResult(res, 'ドロップ装備の自動売却設定を更新しました。');
      return;
    }

    if (action === 'toggle-mute') {
      const currentMuted = AudioSE.getSettings().muted;
      const nextMuted = !currentMuted;
      AudioSE.setMuted(nextMuted);
      StateStore.update(function (draft) {
        draft.settings.soundMuted = nextMuted;
      });
      if (!nextMuted) {
        AudioSE.play('ui_tap');
      }
      renderAll();
      return;
    }

    if (action === 'play-se') {
      AudioSE.play(actionEl.dataset.seId || 'ui_tap');
      return;
    }

    if (action === 'export-backup') {
      AudioSE.play('ui_tap');
      try {
        const exported = await SaveSecurity.exportBackup(StateStore.getState());
        uiState.backupText = exported;
        uiState.notice = { type: 'ok', text: '署名済みバックアップを書き出しました。' };
      } catch (err) {
        uiState.notice = { type: 'error', text: '書き出し失敗：' + (err && err.message ? err.message : '不明なエラー') };
      }
      renderAll();
      return;
    }

    if (action === 'import-backup') {
      AudioSE.play('ui_tap');
      const textarea = lowerEl ? lowerEl.querySelector('#backup-json-input') : null;
      const inputJson = textarea ? textarea.value : uiState.backupText;
      uiState.backupText = inputJson;
      const verified = await SaveSecurity.importBackup(inputJson);
      if (!verified.ok) {
        uiState.notice = { type: 'error', text: '復元拒否：' + (verified.reason || '改ざんまたは不正データです') };
        renderAll();
        return;
      }
      StateStore.setState(verified.state);
      AudioSE.setVolume(verified.state.settings.soundVolume);
      AudioSE.setMuted(verified.state.settings.soundMuted);
      uiState.tamperWarning = null;
      uiState.notice = { type: 'ok', text: '署名検証に成功し、記録を復元しました。' };
      renderAll();
      return;
    }

    if (action === 'reset-save') {
      AudioSE.play('ui_tap');
      const fresh = StateStore.createInitialState();
      StateStore.setState(fresh);
      AudioSE.setVolume(fresh.settings.soundVolume);
      AudioSE.setMuted(fresh.settings.soundMuted);
      uiState.tamperWarning = null;
      uiState.lastSummonResult = null;
      uiState.notice = { type: 'ok', text: '初期記録を再生成し、署名保存しました。' };
      renderAll();
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (!target || !target.dataset) {
      return;
    }
    if (target.dataset.action === 'backup-input') {
      uiState.backupText = target.value;
      return;
    }
    if (target.dataset.action === 'codex-search') {
      const selStart = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length;
      const selEnd = typeof target.selectionEnd === 'number' ? target.selectionEnd : target.value.length;
      uiState.codexQuery = target.value;
      renderAll();
      if (lowerEl) {
        const nextInput = lowerEl.querySelector('#codex-search-input');
        if (nextInput) {
          nextInput.focus();
          if (typeof nextInput.setSelectionRange === 'function') {
            try { nextInput.setSelectionRange(selStart, selEnd); } catch (_) {}
          }
        }
      }
      return;
    }
    if (target.dataset.action === 'volume-range') {
      const AudioSE = IkaiApp.AudioSE;
      const StateStore = IkaiApp.StateStore;
      const val = IkaiApp.Env.clamp(Number(target.value) / 100, 0, 1);
      AudioSE.setVolume(val);
      StateStore.update(function (draft) {
        draft.settings.soundVolume = val;
      }, { persist: false });
      renderAll();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (!target || !target.dataset) {
      return;
    }
    if (target.dataset.action === 'volume-range') {
      const AudioSE = IkaiApp.AudioSE;
      const StateStore = IkaiApp.StateStore;
      const val = IkaiApp.Env.clamp(Number(target.value) / 100, 0, 1);
      AudioSE.setVolume(val);
      StateStore.update(function (draft) {
        draft.settings.soundVolume = val;
      });
      renderAll();
    }
  }

  async function boot() {
    const Env = IkaiApp.Env;
    const StateStore = IkaiApp.StateStore;
    const AudioSE = IkaiApp.AudioSE;

    Env.injectManifestIfHttp();

    const loadRes = await StateStore.loadSaved();
    if (!loadRes.ok && loadRes.fallback) {
      uiState.tamperWarning = loadRes.reason || '署名不一致';
    } else {
      uiState.tamperWarning = null;
    }

    const state = StateStore.getState();
    AudioSE.setVolume(state.settings.soundVolume);
    AudioSE.setMuted(state.settings.soundMuted);

    if (Env.canUseServiceWorker() && root.navigator && root.navigator.serviceWorker) {
      root.navigator.serviceWorker.register('./sw.js').catch(function () {});
    }

    if (typeof root.document !== 'undefined') {
      upperEl = root.document.getElementById('upper-stage');
      lowerEl = root.document.getElementById('lower-deck');
      IkaiApp.RouterInput.init(lowerEl, {
        onAction: handleAction,
        onInput: handleInput,
        onChange: handleChange
      });
      renderAll();
    }

    uiState.booted = true;
    return loadRes;
  }

  function getUiState() {
    return {
      mode: uiState.mode,
      activeTab: uiState.activeTab,
      areasPillar: uiState.areasPillar,
      enhanceSub: uiState.enhanceSub,
      summonSub: uiState.summonSub,
      codexCategory: uiState.codexCategory,
      codexQuery: uiState.codexQuery,
      rosterFilter: uiState.rosterFilter,
      selectedCharId: uiState.selectedCharId,
      selectedAreaId: uiState.selectedAreaId,
      selectedStageId: uiState.selectedStageId,
      selectedAbyssFloor: uiState.selectedAbyssFloor,
      selectedRaidId: uiState.selectedRaidId,
      selectedRaidDiff: uiState.selectedRaidDiff,
      selectedTrialId: uiState.selectedTrialId,
      showDpsDetail: uiState.showDpsDetail,
      autoRepeatDone: uiState.autoRepeatDone,
      autoRepeatRemaining: uiState.autoRepeatRemaining,
      tamperWarning: uiState.tamperWarning,
      notice: uiState.notice,
      booted: uiState.booted
    };
  }

  function getBattleSnapshot() {
    return latestSnapshot || (IkaiApp.CombatEngine ? IkaiApp.CombatEngine.getSnapshot() : null);
  }

  if (typeof root.document !== 'undefined') {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () {
        boot();
      });
    } else {
      boot();
    }
  }

  IkaiApp.App = Object.freeze({
    boot,
    renderAll,
    getUiState,
    startBattle,
    startStageBattle,
    getBattleSnapshot
  });
})(typeof window !== 'undefined' ? window : globalThis);
