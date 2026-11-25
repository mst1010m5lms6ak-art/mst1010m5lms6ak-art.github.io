(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.Engine = HS.Engine || {};

  var GAUGE_MAX = (HS.CONST && HS.CONST.ATB_MAX) || 1000;
  var BASE_GAUGE_RATE = 3.2;     // Gauge units per second per 1 SPD at 1x
  var ACTION_LOCK_BASE_MS = 420; // Strict sequential attack lock window (divided by speed)
  var WAVE_DELAY_BASE_MS = 650;
  var REPEAT_DELAY_BASE_MS = 850;
  var MAX_LOG_ENTRIES = 100;

  var listeners = {};
  var logSeq = 0;
  var state = createIdleState();

  function createIdleState() {
    return {
      active: false,
      paused: false,
      phase: 'idle', // 'idle' | 'fighting' | 'wave_transition' | 'repeat_delay' | 'result' | 'repeat_result'
      mode: 'stage', // 'stage' | 'tower' | 'superboss' | 'relay' | 'bounty'
      targetId: null,
      title: '',
      world: 'frontier',
      wave: 1,
      totalWaves: 5,
      autoRepeat: false,
      stopAfterCurrent: false,
      runCount: 0,
      totalActions: 0,
      maxActions: 0,
      actionLockTimer: 0,
      waveTransitionTimer: 0,
      repeatDelayTimer: 0,
      activeActorId: null,
      readyQueue: [],
      allies: [],
      enemies: [],
      relayIndex: 0,
      relayBossPhase: 1,
      superbossDamage: 0,
      superbossBreaks: 0,
      superbossNextBreak: 0,
      towerRule: null,
      towerRuleName: '',
      towerRuleDesc: '',
      intruderPity: 0,
      intruderAppearedThisRun: false,
      intruderBanner: null,
      lastActionEvent: null,
      logs: [],
      dps: {},
      runLoot: null,
      result: null,
      repeatStats: null,
      repeatSummary: null,
      config: null
    };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function randInt(min, max) {
    if (HS.Utils && typeof HS.Utils.randInt === 'function') return HS.Utils.randInt(min, max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function emit(event, payload) {
    var list = listeners[event];
    if (list && list.length) {
      var cp = list.slice();
      for (var i = 0; i < cp.length; i++) {
        try { cp[i](payload, event); } catch (err) {
          if (typeof console !== 'undefined' && console.error) console.error('[HS.Battle] listener error:', event, err);
        }
      }
    }
    if (event !== '*' && listeners['*'] && listeners['*'].length) {
      var any = listeners['*'].slice();
      for (var j = 0; j < any.length; j++) {
        try { any[j](payload, event); } catch (err2) {
          if (typeof console !== 'undefined' && console.error) console.error('[HS.Battle] * listener error:', event, err2);
        }
      }
    }
  }

  function subscribe(event, fn) {
    if (typeof event === 'function') { fn = event; event = '*'; }
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function unsubscribe() {
      var arr = listeners[event];
      if (!arr) return;
      var idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    };
  }

  function pushLog(tag, text, kind, meta) {
    logSeq++;
    var entry = {
      id: logSeq,
      tag: tag || '行動',
      text: text,
      kind: kind || 'action',
      meta: meta || null,
      wave: state.wave,
      run: state.runCount
    };
    state.logs.push(entry);
    if (state.logs.length > MAX_LOG_ENTRIES) {
      state.logs.splice(0, state.logs.length - MAX_LOG_ENTRIES);
    }
    emit('battle:log', entry);
    return entry;
  }

  // --- Master Data Lookups ---
  function getCharById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.CHAR_BY_ID && HS.Data.CHAR_BY_ID[id]) return HS.Data.CHAR_BY_ID[id];
    var arr = HS.Data.CHARACTERS || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  function getEnemyById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.ENEMY_BY_ID && HS.Data.ENEMY_BY_ID[id]) return HS.Data.ENEMY_BY_ID[id];
    var arr = HS.Data.ALL_ENEMIES || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  function getStageData(stageId) {
    var areas = (HS.Data && Array.isArray(HS.Data.AREAS)) ? HS.Data.AREAS : [];
    for (var i = 0; i < areas.length; i++) {
      var st = areas[i].stages || [];
      for (var j = 0; j < st.length; j++) {
        if (st[j].id === stageId) return { area: areas[i], stage: st[j], areaIdx: i, stageIdx: j };
      }
    }
    if (areas[0] && areas[0].stages && areas[0].stages[0]) {
      return { area: areas[0], stage: areas[0].stages[0], areaIdx: 0, stageIdx: 0 };
    }
    return null;
  }

  function getTowerFloor(floorIdOrNum) {
    if (HS.Data && HS.Data.TOWER_BY_ID && HS.Data.TOWER_BY_ID[floorIdOrNum]) {
      return HS.Data.TOWER_BY_ID[floorIdOrNum];
    }
    var list = (HS.Data && Array.isArray(HS.Data.TOWER_FLOORS)) ? HS.Data.TOWER_FLOORS : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === floorIdOrNum || list[i].floor === floorIdOrNum || String(list[i].floor) === String(floorIdOrNum)) {
        return list[i];
      }
    }
    return list[0] || null;
  }

  function getSuperboss(bossId) {
    if (HS.Data && HS.Data.SUPERBOSS_BY_ID && HS.Data.SUPERBOSS_BY_ID[bossId]) return HS.Data.SUPERBOSS_BY_ID[bossId];
    var list = (HS.Data && Array.isArray(HS.Data.SUPERBOSSES)) ? HS.Data.SUPERBOSSES : [];
    return list[0] || null;
  }

  function getRelayRaid(raidId) {
    if (HS.Data && HS.Data.RELAY_BY_ID && HS.Data.RELAY_BY_ID[raidId]) return HS.Data.RELAY_BY_ID[raidId];
    var list = (HS.Data && Array.isArray(HS.Data.RELAY_RAIDS)) ? HS.Data.RELAY_RAIDS : [];
    return list[0] || null;
  }

  function getBounty(bountyId) {
    if (HS.Data && HS.Data.BOUNTY_BY_ID && HS.Data.BOUNTY_BY_ID[bountyId]) return HS.Data.BOUNTY_BY_ID[bountyId];
    var list = (HS.Data && Array.isArray(HS.Data.BOUNTIES)) ? HS.Data.BOUNTIES : [];
    return list[0] || null;
  }

  function getElementAdvantage(atkEl, defEl) {
    if (HS.Data && typeof HS.Data.ELEMENT_ADVANTAGE === 'function') {
      return HS.Data.ELEMENT_ADVANTAGE(atkEl, defEl);
    }
    return 1.0;
  }

  function getTargetLabel(target) {
    if (HS.CONST && HS.CONST.TARGET_NAMES && HS.CONST.TARGET_NAMES[target]) return HS.CONST.TARGET_NAMES[target];
    var map = { single: '単体', area: '範囲', all: '全体', self: '自身', ally_single: '味方単', ally_all: '味方全' };
    return map[target] || '単体';
  }

  function getStatusLabel(statusId) {
    return (HS.Data && HS.Data.STATUS_META && HS.Data.STATUS_META[statusId]) ? HS.Data.STATUS_META[statusId].name : statusId;
  }

  function getStatusKind(statusId) {
    if (HS.Data && HS.Data.STATUS_META && HS.Data.STATUS_META[statusId]) return HS.Data.STATUS_META[statusId].kind;
    var buffs = ['atk_up', 'def_up', 'spd_up', 'crit_up', 'regen', 'shield', 'taunt', 'counter'];
    var debuffs = ['atk_down', 'def_down', 'spd_down', 'vulnerable'];
    if (buffs.indexOf(statusId) !== -1) return 'buff';
    if (debuffs.indexOf(statusId) !== -1) return 'debuff';
    return 'ailment';
  }

  // --- Skill Normalization (Applies all 16 exact Awakening bonus keys!) ---
  function cloneEffect(ef) {
    var out = {};
    Object.keys(ef).forEach(function (k) { out[k] = ef[k]; });
    return out;
  }

  function normalizeSkills(rawSkills, fallbackName, awakenLevels) {
    var list = Array.isArray(rawSkills) ? rawSkills : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var sk = list[i];
      var effects = Array.isArray(sk.effects) ? sk.effects.map(cloneEffect) : [];
      var item = {
        idx: i,
        id: sk.id || ('sk_' + i),
        name: sk.name || (fallbackName + '技' + (i + 1)),
        type: sk.type || 'active',
        target: sk.target || 'single',
        power: typeof sk.power === 'number' ? sk.power : 0,
        cd: typeof sk.cd === 'number' ? sk.cd : 0,
        currentCd: 0,
        hits: sk.hits || 1,
        ignoreDef: sk.ignoreDef || 0,
        drainPct: sk.drainPct || 0,
        bonusVsAilment: sk.bonusVsAilment || 0,
        critAdd: 0,
        selfGauge: 0,
        gaugeOnKill: 0,
        effects: effects,
        awakenLevel: 0
      };

      // Apply character skill awakenings (I..III) cleanly
      var awkLv = (Array.isArray(awakenLevels) && awakenLevels[i]) || 0;
      item.awakenLevel = awkLv;
      if (awkLv > 0 && Array.isArray(sk.awakenings) && item.type !== 'passive') {
        for (var a = 0; a < Math.min(awkLv, sk.awakenings.length); a++) {
          var b = sk.awakenings[a] && sk.awakenings[a].bonus;
          if (!b) continue;
          if (typeof b.powerAdd === 'number') item.power = Math.round((item.power + b.powerAdd) * 100) / 100;
          if (typeof b.critAdd === 'number') item.critAdd += b.critAdd;
          if (typeof b.ignoreDef === 'number') item.ignoreDef += b.ignoreDef;
          if (typeof b.drainAdd === 'number') item.drainPct += b.drainAdd;
          if (typeof b.bonusVsAilment === 'number') item.bonusVsAilment += b.bonusVsAilment;
          if (typeof b.selfGauge === 'number') item.selfGauge += b.selfGauge;
          if (typeof b.gaugeOnKill === 'number') item.gaugeOnKill += b.gaugeOnKill;

          if (typeof b.chanceAdd === 'number') {
            for (var e1 = 0; e1 < item.effects.length; e1++) {
              if (item.effects[e1].type === 'status' && typeof item.effects[e1].chance === 'number' && item.effects[e1].chance < 1) {
                item.effects[e1].chance = Math.min(1.0, item.effects[e1].chance + b.chanceAdd);
              }
            }
          }
          if (typeof b.healMultAdd === 'number') {
            for (var e2 = 0; e2 < item.effects.length; e2++) {
              if (item.effects[e2].type === 'heal') item.effects[e2].mult = (item.effects[e2].mult || 1.0) + b.healMultAdd;
            }
          }
          if (typeof b.healPctAdd === 'number') {
            for (var e3 = 0; e3 < item.effects.length; e3++) {
              if (item.effects[e3].type === 'heal') item.effects[e3].hpPct = (item.effects[e3].hpPct || 0) + b.healPctAdd;
            }
          }
          if (typeof b.shieldPctAdd === 'number') {
            for (var e4 = 0; e4 < item.effects.length; e4++) {
              if (item.effects[e4].type === 'shield') item.effects[e4].hpPct = (item.effects[e4].hpPct || 0) + b.shieldPctAdd;
            }
          }
          if (typeof b.gaugeAdd === 'number') {
            for (var e5 = 0; e5 < item.effects.length; e5++) {
              if (item.effects[e5].type === 'gauge') {
                var sgn = item.effects[e5].amount < 0 ? -1 : 1;
                item.effects[e5].amount = item.effects[e5].amount + sgn * Math.abs(b.gaugeAdd);
              }
            }
          }
          if (typeof b.cleanseAdd === 'number') {
            for (var e6 = 0; e6 < item.effects.length; e6++) {
              if (item.effects[e6].type === 'cleanse') item.effects[e6].count = (item.effects[e6].count || 1) + b.cleanseAdd;
            }
          }
          if (typeof b.revivePctAdd === 'number') {
            for (var e7 = 0; e7 < item.effects.length; e7++) {
              if (item.effects[e7].type === 'revive') item.effects[e7].hpPct = (item.effects[e7].hpPct || 0.35) + b.revivePctAdd;
            }
          }
          if (b.extraEffect) {
            item.effects.push(cloneEffect(b.extraEffect));
          }
        }
      }
      out.push(item);
    }
    if (out.length === 0) {
      out.push({
        idx: 0, id: 'basic', name: '通常攻撃', type: 'active', target: 'single',
        power: 1.0, cd: 0, currentCd: 0, hits: 1, ignoreDef: 0, drainPct: 0,
        bonusVsAilment: 0, critAdd: 0, selfGauge: 0, gaugeOnKill: 0, effects: [], awakenLevel: 0
      });
    }
    return out;
  }

  function buildAllyUnit(charId, slotIdx, partyIds, linkIds, towerRule) {
    var ch = getCharById(charId);
    if (!ch) return null;
    var stats = HS.Calc.calcUnitStats(charId, {
      overrideParty: partyIds,
      overrideLinks: linkIds,
      towerRule: towerRule
    });
    var cp = HS.State.getCharProgress(charId);
    var skills = normalizeSkills(ch.skills, ch.name, cp ? cp.skillAwaken : [0, 0, 0]);
    var startShield = stats.startShieldPct > 0 ? Math.round(stats.hp * stats.startShieldPct) : 0;
    var initGauge = clamp(Math.round(stats.initGauge * GAUGE_MAX) + randInt(0, 55), 0, 940);

    return {
      uid: 'ally_' + slotIdx + '_' + charId,
      charId: charId,
      side: 'ally',
      slotIdx: slotIdx,
      name: ch.name,
      title: ch.title || '',
      element: ch.element || 'none',
      races: Array.isArray(ch.races) ? ch.races.slice() : [],
      role: ch.role || 'dealer',
      world: ch.world || 'frontier',
      isBoss: false,
      isIntruder: false,
      maxHp: stats.hp,
      hp: stats.hp,
      shield: startShield,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      crit: stats.crit,
      critDmg: stats.critDmg,
      res: stats.res,
      stats: stats,
      skills: skills,
      gauge: initGauge,
      inReadyQueue: false,
      statuses: [],
      gutsLeft: stats.gutsOnce ? 1 : 0,
      reviveAuraLeft: stats.reviveOnce > 0 ? 1 : 0,
      reviveAuraHpPct: stats.reviveOnce || 0,
      lastSkillUsed: null
    };
  }

  function buildEnemyUnit(enemyDefOrId, slotIdx, scaleFactor, flags) {
    flags = flags || {};
    var def = typeof enemyDefOrId === 'string' ? getEnemyById(enemyDefOrId) : enemyDefOrId;
    if (!def) {
      def = {
        id: 'en_gear_slime', name: '歯車スライム', element: 'none', races: ['mech'], role: 'tank',
        baseStats: { hp: 460, atk: 74, def: 58, spd: 86, crit: 0.05, critDmg: 1.45, res: 0.05 },
        skills: []
      };
    }
    HS.State.markCodex('enemies', def.id, true);

    var sc = typeof scaleFactor === 'number' ? scaleFactor : 1.0;
    var bs = def.baseStats || { hp: 500, atk: 85, def: 50, spd: 95, crit: 0.06, critDmg: 1.45, res: 0.08 };
    var hpMult = flags.hpMult || sc;
    var atkMult = flags.atkMult || Math.pow(sc, 0.85);
    var defMult = flags.defMult || Math.pow(sc, 0.78);
    var spdMult = flags.spdMult || (1 + (sc - 1) * 0.12);

    var maxHp = Math.max(120, Math.round((bs.hp || 500) * hpMult));
    var atk = Math.max(20, Math.round((bs.atk || 85) * atkMult));
    var defStat = Math.max(10, Math.round((bs.def || 50) * defMult));
    var spd = clamp(Math.round((bs.spd || 95) * spdMult), 55, 220);

    var eStats = HS.Calc ? HS.Calc.createEmptyModifiers() : {};
    if (state.towerRule && typeof state.towerRule === 'object') {
      if (state.towerRule.spdPct) spd = Math.round(spd * (1 + state.towerRule.spdPct));
      if (state.towerRule.crit) eStats.crit = state.towerRule.crit;
      if (state.towerRule.critDmg) eStats.critDmg = state.towerRule.critDmg;
    }

    var skills = normalizeSkills(def.skills, def.name, null);

    return {
      uid: 'enemy_' + state.wave + '_' + slotIdx + '_' + def.id + '_' + Math.random().toString(36).slice(2, 5),
      enemyId: def.id,
      side: 'enemy',
      slotIdx: slotIdx,
      name: def.name,
      title: def.title || '',
      element: def.element || 'none',
      races: Array.isArray(def.races) ? def.races.slice() : [],
      role: def.role || 'dealer',
      world: def.world || state.world,
      isBoss: Boolean(flags.isBoss || def.kind === 'boss' || def.kind === 'superboss' || def.kind === 'elite'),
      isIntruder: Boolean(flags.isIntruder || def.kind === 'intruder'),
      recruitCharId: def.recruitCharId || null,
      maxHp: maxHp,
      hp: maxHp,
      shield: flags.startShield || 0,
      atk: atk,
      def: defStat,
      spd: spd,
      crit: clamp((bs.crit || 0.08) + (eStats.crit || 0), 0, 1.0),
      critDmg: (bs.critDmg || 1.45) + (eStats.critDmg || 0),
      res: bs.res || 0.08,
      stats: eStats,
      skills: skills,
      gauge: randInt(20, 240),
      inReadyQueue: false,
      statuses: [],
      gutsLeft: 0,
      reviveAuraLeft: 0,
      reviveAuraHpPct: 0,
      lastSkillUsed: null
    };
  }

  // --- Status Effects ---
  function hasStatus(unit, id) {
    for (var i = 0; i < unit.statuses.length; i++) if (unit.statuses[i].id === id) return true;
    return false;
  }

  function applyStatus(target, id, turns, source) {
    if (!target || target.hp <= 0) return false;
    var kind = getStatusKind(id);
    var dur = Math.max(1, turns || 2);
    if (kind === 'buff' && source && source.stats && source.stats.buffDuration) dur += source.stats.buffDuration;
    if (kind !== 'buff' && source && source.stats && source.stats.debuffDuration) dur += source.stats.debuffDuration;

    for (var i = 0; i < target.statuses.length; i++) {
      if (target.statuses[i].id === id) {
        target.statuses[i].turns = Math.max(target.statuses[i].turns, dur);
        target.statuses[i].sourceId = source ? (source.charId || source.uid) : target.statuses[i].sourceId;
        return true;
      }
    }
    target.statuses.push({
      id: id,
      kind: kind,
      turns: dur,
      sourceId: source ? (source.charId || source.uid) : null
    });
    return true;
  }

  function cleanseStatuses(target, count) {
    var removed = 0;
    var maxRemove = count || 1;
    for (var i = target.statuses.length - 1; i >= 0 && removed < maxRemove; i--) {
      if (target.statuses[i].kind === 'debuff' || target.statuses[i].kind === 'ailment') {
        target.statuses.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  function dispelBuffs(target, count) {
    var removed = 0;
    var maxRemove = count || 1;
    for (var i = target.statuses.length - 1; i >= 0 && removed < maxRemove; i--) {
      if (target.statuses[i].kind === 'buff') {
        target.statuses.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  function tickDownStatuses(unit) {
    for (var i = unit.statuses.length - 1; i >= 0; i--) {
      unit.statuses[i].turns -= 1;
      if (unit.statuses[i].turns <= 0) unit.statuses.splice(i, 1);
    }
  }

  function getEffectiveSpeed(unit) {
    var spd = unit.spd || 100;
    if (hasStatus(unit, 'spd_up')) spd *= 1.22;
    if (hasStatus(unit, 'spd_down')) spd *= 0.80;
    if (hasStatus(unit, 'freeze')) spd *= 0.60;
    return Math.max(25, spd);
  }

  // --- Cumulative DPS Recording (4 metrics, NEVER reset across autoRepeat runs!) ---
  function initDpsEntries(allies) {
    for (var i = 0; i < allies.length; i++) {
      var u = allies[i];
      if (!u || !u.charId) continue;
      if (!state.dps[u.charId]) {
        state.dps[u.charId] = {
          charId: u.charId, name: u.name, role: u.role, element: u.element,
          dmgDealt: 0, dmgTaken: 0, healDealt: 0, healTaken: 0
        };
      }
    }
  }

  function recordDps(charId, metric, amount) {
    if (!charId || !amount || amount <= 0) return;
    if (!state.dps[charId]) {
      var ch = getCharById(charId);
      state.dps[charId] = {
        charId: charId, name: ch ? ch.name : charId, role: ch ? ch.role : 'dealer', element: ch ? ch.element : 'none',
        dmgDealt: 0, dmgTaken: 0, healDealt: 0, healTaken: 0
      };
    }
    state.dps[charId][metric] += Math.round(amount);
  }

  // --- Wave Spawning ---
  function spawnStageWave(wave) {
    var info = getStageData(state.targetId);
    if (!info) return;
    var st = info.stage;
    var area = info.area;
    var baseScale = st.powerScale || 1.0;
    var waveScale = baseScale * (1 + (wave - 1) * 0.05);
    var enemies = [];

    if (wave < state.totalWaves) {
      var count = randInt(1, 4);
      var pool = Array.isArray(st.enemyPool) && st.enemyPool.length ? st.enemyPool : (area.enemyPool || []);
      for (var i = 0; i < count; i++) {
        enemies.push(buildEnemyUnit(pickRandom(pool), i, waveScale, {}));
      }

      // Intruder system (乱入敵) on non-boss WAVEs (1..4)
      var intruderPool = Array.isArray(st.intruderPool) && st.intruderPool.length ? st.intruderPool : [];
      if (intruderPool.length > 0 && !state.intruderAppearedThisRun) {
        var baseChance = st.intruderChance || 0.22;
        var chance = baseChance + state.intruderPity * 0.10;
        if (Math.random() < chance) {
          var intrId = pickRandom(intruderPool);
          var intrSlot = enemies.length < 4 ? enemies.length : 3;
          var intrUnit = buildEnemyUnit(intrId, intrSlot, baseScale * 1.05, { isIntruder: true, hpMult: baseScale * 1.15 });
          if (enemies.length < 4) enemies.push(intrUnit);
          else enemies[3] = intrUnit;
          state.intruderAppearedThisRun = true;
          state.intruderPity = 0;
          state.intruderBanner = { enemyId: intrUnit.enemyId, name: intrUnit.name, element: intrUnit.element, timestamp: Date.now() };
          pushLog('乱入', '⚠ 乱入敵「' + intrUnit.name + '」が割り込んできた！', 'intruder', { enemy: intrUnit });
          emit('battle:intruder', { intruder: intrUnit, wave: wave });
        } else {
          state.intruderPity++;
        }
      }
    } else {
      // WAVE 5: Boss + 0..2 escorts
      var bossMult = st.isAreaBoss ? baseScale : (baseScale * 1.65);
      enemies.push(buildEnemyUnit(st.bossId, 0, baseScale, { isBoss: true, hpMult: bossMult }));
      var escorts = Array.isArray(st.bossEscorts) && st.bossEscorts.length ? st.bossEscorts : (st.enemyPool || []);
      var escortCount = Math.min(2, randInt(0, escorts.length));
      for (var e = 0; e < escortCount; e++) {
        enemies.push(buildEnemyUnit(escorts[e % escorts.length], e + 1, baseScale * 0.92, {}));
      }
    }

    state.enemies = enemies;
  }

  function spawnTowerWave(wave) {
    var fl = getTowerFloor(state.targetId);
    if (!fl) return;
    var sc = fl.powerScale || 1.0;
    var enemies = [];
    if (wave < state.totalWaves) {
      var pool = fl.enemyPool || [];
      var cnt = randInt(2, 3);
      for (var i = 0; i < cnt; i++) enemies.push(buildEnemyUnit(pickRandom(pool), i, sc * 0.92, {}));
    } else {
      var bossDef = getEnemyById(fl.bossId);
      var isElite = bossDef && (bossDef.kind === 'elite' || bossDef.kind === 'boss');
      enemies.push(buildEnemyUnit(fl.bossId, 0, sc, { isBoss: true, hpMult: isElite ? sc : sc * 1.85 }));
      var esc = fl.bossEscorts || fl.enemyPool || [];
      for (var j = 0; j < Math.min(2, esc.length); j++) {
        enemies.push(buildEnemyUnit(esc[j], j + 1, sc * 0.90, {}));
      }
    }
    state.enemies = enemies;
  }

  function spawnSuperbossWave() {
    var sb = getSuperboss(state.targetId);
    if (!sb) return;
    var sc = sb.powerScale || 1.0;
    var firstMs = (sb.milestones && sb.milestones[0] && sb.milestones[0].dmg) || 12000;
    state.superbossNextBreak = Math.round(firstMs * 0.6);
    var boss = buildEnemyUnit(sb.enemyId, 0, sc, { isBoss: true, hpMult: 1.0, atkMult: sc });
    boss.maxHp = Math.max(boss.maxHp, 100000);
    boss.hp = boss.maxHp;
    state.enemies = [boss];
  }

  function spawnRelayPhase(phaseNum) {
    var raid = getRelayRaid(state.targetId);
    if (!raid) return;
    var phases = Array.isArray(raid.phases) ? raid.phases : [];
    var pDef = phases[phaseNum - 1] || phases[0] || {};
    var sc = pDef.powerScale || 1.2;
    var enemies = [];
    enemies.push(buildEnemyUnit(pDef.enemyId, 0, sc, { isBoss: true, hpMult: sc }));
    var esc = Array.isArray(pDef.escorts) ? pDef.escorts : [];
    for (var i = 0; i < esc.length && enemies.length < 4; i++) {
      enemies.push(buildEnemyUnit(esc[i], i + 1, sc * 0.88, {}));
    }
    state.enemies = enemies;
    pushLog('総力戦', (pDef.name || ('第' + phaseNum + 'フェーズ')) + '「' + enemies[0].name + '」出現！', 'wave');
  }

  function spawnBountyWave(wave) {
    var bt = getBounty(state.targetId);
    if (!bt) return;
    var sc = bt.powerScale || 1.0;
    var enemies = [];
    var esc = Array.isArray(bt.escorts) ? bt.escorts : [];
    if (wave < state.totalWaves) {
      var cnt = randInt(2, 3);
      for (var i = 0; i < cnt; i++) {
        enemies.push(buildEnemyUnit(esc[i % Math.max(1, esc.length)], i, sc * 0.85, {}));
      }
    } else {
      enemies.push(buildEnemyUnit(bt.intruderId, 0, sc, { isIntruder: true, isBoss: true, hpMult: sc * 1.15 }));
      for (var j = 0; j < Math.min(2, esc.length); j++) {
        enemies.push(buildEnemyUnit(esc[j], j + 1, sc * 0.88, {}));
      }
    }
    state.enemies = enemies;
  }

  function applyWaveStartTeamEffects() {
    var maxAtkUp = 0;
    var maxSpdUp = 0;
    var maxEnemyDefDown = 0;
    var srcUnit = null;

    for (var i = 0; i < state.allies.length; i++) {
      var u = state.allies[i];
      if (u.hp <= 0) continue;
      if (u.stats) {
        if (u.stats.allyStartAtkUp > maxAtkUp) { maxAtkUp = u.stats.allyStartAtkUp; srcUnit = u; }
        if (u.stats.allyStartSpdUp > maxSpdUp) { maxSpdUp = u.stats.allyStartSpdUp; srcUnit = u; }
        if (u.stats.enemyStartDefDown > maxEnemyDefDown) { maxEnemyDefDown = u.stats.enemyStartDefDown; srcUnit = u; }
        if (state.wave > 1 && u.stats.waveHealPct > 0) {
          var healAmt = Math.round(u.maxHp * u.stats.waveHealPct * (1 + (u.stats.healTakenPct || 0)));
          var actual = Math.min(u.maxHp - u.hp, healAmt);
          if (actual > 0) {
            u.hp += actual;
            recordDps(u.charId, 'healDealt', actual);
            recordDps(u.charId, 'healTaken', actual);
            pushLog('回復', u.name + ' のWAVE回復 +' + actual, 'heal');
          }
        }
      }
    }

    if (maxAtkUp > 0) {
      state.allies.forEach(function (a) { if (a.hp > 0) applyStatus(a, 'atk_up', maxAtkUp, srcUnit); });
    }
    if (maxSpdUp > 0) {
      state.allies.forEach(function (a) { if (a.hp > 0) applyStatus(a, 'spd_up', maxSpdUp, srcUnit); });
    }
    if (maxEnemyDefDown > 0) {
      state.enemies.forEach(function (e) { if (e.hp > 0) applyStatus(e, 'def_down', maxEnemyDefDown, srcUnit); });
    }
  }

  function spawnCurrentWave() {
    state.readyQueue = [];
    state.intruderBanner = null;
    for (var a = 0; a < state.allies.length; a++) {
      state.allies[a].inReadyQueue = false;
      if (state.wave > 1 && state.allies[a].hp > 0) {
        state.allies[a].gauge = Math.min(850, Math.round(state.allies[a].gauge * 0.55));
      }
    }

    if (state.mode === 'stage') spawnStageWave(state.wave);
    else if (state.mode === 'tower') spawnTowerWave(state.wave);
    else if (state.mode === 'superboss') spawnSuperbossWave();
    else if (state.mode === 'relay') spawnRelayPhase(state.relayBossPhase);
    else if (state.mode === 'bounty') spawnBountyWave(state.wave);

    applyWaveStartTeamEffects();
    if (state.wave > 1) {
      pushLog('WAVE', 'WAVE ' + state.wave + '/' + state.totalWaves + ' 開始！', 'wave');
    }
    emit('battle:wave', { wave: state.wave, totalWaves: state.totalWaves, enemies: state.enemies });
  }

  // --- Combat AI & Turn Execution ---
  function skillHasEffect(skill, typeName) {
    return skill.effects.some(function (ef) { return ef.type === typeName; });
  }

  function selectSkill(actor) {
    var activeSkills = actor.skills.filter(function (s) { return s.type !== 'passive'; });
    if (!activeSkills.length) return actor.skills[0];
    if (hasStatus(actor, 'silence')) return activeSkills[0];

    var allies = actor.side === 'ally' ? state.allies : state.enemies;
    var livingAllies = allies.filter(function (u) { return u.hp > 0; });
    var deadAllies = allies.filter(function (u) { return u.hp <= 0; });
    var ready = activeSkills.filter(function (s) { return (s.currentCd || 0) <= 0; });
    if (!ready.length) return activeSkills[0];

    // 1. Revive priority if dead ally exists
    if (deadAllies.length > 0) {
      for (var r = ready.length - 1; r >= 0; r--) {
        if (skillHasEffect(ready[r], 'revive')) return ready[r];
      }
    }

    // 2. Heal priority if any living ally < 75% HP
    var needsHeal = livingAllies.some(function (u) { return (u.hp / u.maxHp) < 0.75; });
    if (needsHeal) {
      for (var h = ready.length - 1; h >= 0; h--) {
        if (skillHasEffect(ready[h], 'heal')) return ready[h];
      }
    }

    // 3. Support / Tank buff & shield skills
    if (actor.role === 'supporter' || actor.role === 'tank') {
      for (var b = ready.length - 1; b >= 0; b--) {
        var skB = ready[b];
        if (skB.power <= 0 && !skillHasEffect(skB, 'heal')) {
          var alreadyHasAll = skB.effects.every(function (ef) {
            return ef.type !== 'status' || hasStatus(actor, ef.status);
          });
          if (!alreadyHasAll || skillHasEffect(skB, 'shield') || skillHasEffect(skB, 'gauge')) return skB;
        }
      }
    }

    // 4. Highest ready active skill (Skill 3 > Skill 2 > Skill 1), skip pure heals if full HP
    for (var i = ready.length - 1; i >= 0; i--) {
      var cand = ready[i];
      if (!needsHeal && cand.power <= 0 && skillHasEffect(cand, 'heal') && !skillHasEffect(cand, 'shield')) {
        var hasNonHeal = cand.effects.some(function (ef) { return ef.type === 'status' || ef.type === 'gauge'; });
        if (!hasNonHeal) continue;
      }
      return cand;
    }

    return ready[0];
  }

  function pickLowestHpAlly(livingAllies, fallback) {
    if (!livingAllies.length) return fallback ? [fallback] : [];
    var lowest = livingAllies.slice().sort(function (a, b) {
      return (a.hp / a.maxHp) - (b.hp / b.maxHp);
    })[0];
    return [lowest];
  }

  function pickLowestGaugeAlly(actor, livingAllies) {
    if (!livingAllies.length) return actor && actor.hp > 0 ? [actor] : [];
    var others = livingAllies.filter(function (u) { return u.uid !== actor.uid; });
    var pool = others.length ? others : livingAllies;
    var lowest = pool.slice().sort(function (a, b) {
      return (a.gauge || 0) - (b.gauge || 0);
    })[0];
    return [lowest];
  }

  function resolveTargetsForScope(actor, scope, defaultTargets, ef) {
    var allies = actor.side === 'ally' ? state.allies : state.enemies;
    var foes = actor.side === 'ally' ? state.enemies : state.allies;
    var livingAllies = allies.filter(function (u) { return u.hp > 0; });
    var livingFoes = foes.filter(function (u) { return u.hp > 0; });

    // Revive ALWAYS targets fallen teammates on actor's own side — never enemies!
    if (ef && ef.type === 'revive') {
      var deadAllies = allies.filter(function (u) { return u.hp <= 0; });
      return deadAllies.length ? [deadAllies[0]] : [];
    }

    var resolved = null;
    if (scope === 'self') resolved = [actor];
    else if (scope === 'ally_all') resolved = livingAllies;
    else if (scope === 'ally_single' || scope === 'ally_lowest') resolved = pickLowestHpAlly(livingAllies, actor);
    else if (scope === 'ally_lowest_gauge') resolved = pickLowestGaugeAlly(actor, livingAllies);
    else if (scope === 'all') resolved = livingFoes;
    else if (scope === 'target' && Array.isArray(defaultTargets)) resolved = defaultTargets;
    else resolved = Array.isArray(defaultTargets) ? defaultTargets : [];

    // Defense-in-depth side-safety guardrails so beneficial effects NEVER hit enemies and hostile effects NEVER hit allies
    if (ef) {
      var isBeneficial = (
        ef.type === 'heal' ||
        ef.type === 'shield' ||
        ef.type === 'cleanse' ||
        (ef.type === 'gauge' && (typeof ef.amount !== 'number' || ef.amount >= 0)) ||
        (ef.type === 'status' && ef.status && getStatusKind(ef.status) === 'buff')
      );
      var isHostile = (
        ef.type === 'dispel' ||
        (ef.type === 'gauge' && typeof ef.amount === 'number' && ef.amount < 0) ||
        (ef.type === 'status' && ef.status && getStatusKind(ef.status) !== 'buff')
      );

      if (isBeneficial) {
        var safeAllies = resolved.filter(function (u) { return u && u.side === actor.side && u.hp > 0; });
        if (safeAllies.length) return safeAllies;
        if (ef.type === 'gauge') return pickLowestGaugeAlly(actor, livingAllies);
        if (ef.type === 'heal' || ef.type === 'shield' || ef.type === 'cleanse') return pickLowestHpAlly(livingAllies, actor);
        return actor.hp > 0 ? [actor] : livingAllies.slice(0, 1);
      }
      if (isHostile) {
        return resolved.filter(function (u) { return u && u.side !== actor.side && u.hp > 0; });
      }
    }

    return resolved;
  }

  function pickPrimaryTargets(actor, skill) {
    var allies = actor.side === 'ally' ? state.allies : state.enemies;
    var foes = actor.side === 'ally' ? state.enemies : state.allies;
    var livingAllies = allies.filter(function (u) { return u.hp > 0; });
    var livingFoes = foes.filter(function (u) { return u.hp > 0; });

    if (skill.target === 'self') return [actor];
    if (skill.target === 'ally_all') return livingAllies;
    if (skill.target === 'ally_single') {
      if (skillHasEffect(skill, 'revive')) {
        var dead = allies.filter(function (u) { return u.hp <= 0; });
        if (dead.length) return [dead[0]];
      }
      if (!livingAllies.length) return [actor];
      return [livingAllies.slice().sort(function (a, b) { return (a.hp / a.maxHp) - (b.hp / b.maxHp); })[0]];
    }
    if (skill.target === 'all') return livingFoes;
    if (!livingFoes.length) return [];

    var primary = null;
    if (actor.side === 'enemy') {
      var taunters = livingFoes.filter(function (u) { return hasStatus(u, 'taunt'); });
      if (taunters.length) {
        primary = pickRandom(taunters);
      } else {
        var tanks = livingFoes.filter(function (u) { return u.role === 'tank'; });
        primary = (tanks.length && Math.random() < 0.42) ? pickRandom(tanks) : pickRandom(livingFoes);
      }
      // Tank coverRate interception on single-target enemy attacks!
      if (skill.target === 'single' && primary) {
        var coverCands = livingFoes.filter(function (u) {
          return u.uid !== primary.uid && u.stats && u.stats.coverRate > 0 && !hasStatus(u, 'stun') && !hasStatus(u, 'freeze');
        });
        for (var ci = 0; ci < coverCands.length; ci++) {
          if (Math.random() < coverCands[ci].stats.coverRate) {
            primary = coverCands[ci];
            pushLog('庇護', '🤝 ' + primary.name + ' が味方を庇った！', 'buff');
            break;
          }
        }
      }
    } else {
      var intr = livingFoes.filter(function (u) { return u.isIntruder; });
      if (intr.length) primary = intr[0];
      else primary = livingFoes.slice().sort(function (a, b) { return (a.hp / a.maxHp) - (b.hp / b.maxHp); })[0];
    }

    if (skill.target === 'area') {
      var pIdx = foes.indexOf(primary);
      var out = [primary];
      if (pIdx > 0 && foes[pIdx - 1] && foes[pIdx - 1].hp > 0) out.push(foes[pIdx - 1]);
      if (pIdx < foes.length - 1 && foes[pIdx + 1] && foes[pIdx + 1].hp > 0) out.push(foes[pIdx + 1]);
      return out;
    }

    return [primary];
  }

  function tryHealerAutoRevive(fallenUnit) {
    if (fallenUnit.side !== 'ally') return false;
    for (var i = 0; i < state.allies.length; i++) {
      var ally = state.allies[i];
      if (ally.hp > 0 && ally.reviveAuraLeft > 0) {
        ally.reviveAuraLeft--;
        var revHp = Math.max(1, Math.round(fallenUnit.maxHp * (ally.reviveAuraHpPct || 0.35)));
        fallenUnit.hp = revHp;
        fallenUnit.statuses = fallenUnit.statuses.filter(function (st) { return st.kind === 'buff'; });
        recordDps(ally.charId, 'healDealt', revHp);
        recordDps(fallenUnit.charId, 'healTaken', revHp);
        pushLog('蘇生', '🕊 ' + ally.name + ' の加護で ' + fallenUnit.name + ' が蘇生！(HP ' + revHp + ')', 'heal');
        return true;
      }
    }
    return false;
  }

  function handleUnitDefeat(target, killer, opts) {
    if (!target || target.hp > 0) return;
    target.inReadyQueue = false;
    target.gauge = 0;
    if (target.side === 'enemy' && target.isIntruder && !target._intruderCounted) {
      target._intruderCounted = true;
      if (state.runLoot && Array.isArray(state.runLoot.intrudersDefeated)) {
        state.runLoot.intrudersDefeated.push(target.enemyId);
      }
    }
    if (killer && killer.hp > 0 && killer.side !== target.side) {
      var kStats = killer.stats || {};
      var killGauge = (kStats.gaugeOnKill || 0) + ((opts && opts.gaugeOnKill) || 0);
      if (killGauge > 0) {
        killer.gauge = Math.min(GAUGE_MAX + 100, killer.gauge + Math.round(killGauge * GAUGE_MAX));
      }
    }
  }

  function findUnitBySourceId(sourceId) {
    if (!sourceId) return null;
    var all = state.allies.concat(state.enemies);
    for (var i = 0; i < all.length; i++) {
      if (all[i].charId === sourceId || all[i].uid === sourceId) return all[i];
    }
    return null;
  }

  function applyDamage(attacker, target, rawPower, opts) {
    opts = opts || {};
    if (!target || target.hp <= 0) return { dmg: 0, crit: false, adv: 1, killed: false, revived: false };

    var atk = attacker.atk;
    if (hasStatus(attacker, 'atk_up')) atk *= 1.25;
    if (hasStatus(attacker, 'atk_down')) atk *= 0.78;

    var def = target.def;
    if (hasStatus(target, 'def_up')) def *= 1.30;
    if (hasStatus(target, 'def_down')) def *= 0.75;
    if (opts.ignoreDef) def *= Math.max(0.2, 1 - opts.ignoreDef);

    var dmg = atk * rawPower * (100 / (100 + def * 0.72));

    var adv = getElementAdvantage(attacker.element, target.element);
    dmg *= adv;

    var aStats = attacker.stats || {};
    var dmgMod = (aStats.dmgDealtPct || 0);
    if (opts.isSkill) dmgMod += (aStats.skillDmgPct || 0);
    if (opts.isArea) dmgMod += (aStats.aoeDmgPct || 0);
    if (opts.isSingle) dmgMod += (aStats.singleDmgPct || 0);
    if (adv > 1.05 && aStats.elementDmgPct) dmgMod += aStats.elementDmgPct;
    if (aStats.lowHpDmgPct && attacker.hp < attacker.maxHp) {
      dmgMod += aStats.lowHpDmgPct * (1 - attacker.hp / attacker.maxHp);
    }
    var targetHasBad = target.statuses.some(function (st) { return st.kind === 'ailment' || st.kind === 'debuff'; });
    if (targetHasBad) {
      dmgMod += (aStats.ailmentDmgPct || 0) + (opts.bonusVsAilment || 0);
    }
    if (hasStatus(target, 'vulnerable')) dmgMod += 0.20;
    if (hasStatus(target, 'freeze')) dmgMod += 0.15;
    dmg *= Math.max(0.3, 1 + dmgMod);

    // Defender dmgTakenPct (negative reduces damage!)
    var takenMod = (target.stats && target.stats.dmgTakenPct) || 0;
    dmg *= clamp(1 + takenMod, 0.30, 1.80);

    // Crit check (decimal scale 0..1)
    var critRate = (attacker.crit || 0.10) + (opts.critAdd || 0) + (hasStatus(attacker, 'crit_up') ? 0.25 : 0);
    var isCrit = Math.random() < clamp(critRate, 0, 1);
    if (isCrit) {
      dmg *= (attacker.critDmg || 1.50);
      if (aStats.gaugeOnCrit > 0) {
        attacker.gauge = Math.min(GAUGE_MAX + 100, attacker.gauge + Math.round(aStats.gaugeOnCrit * GAUGE_MAX));
      }
    }

    dmg *= (0.94 + Math.random() * 0.12);
    var finalDmg = Math.max(1, Math.round(dmg));

    // Shield absorption first
    var absorbed = 0;
    var hpDmg = finalDmg;
    if (target.shield > 0) {
      absorbed = Math.min(target.shield, finalDmg);
      target.shield -= absorbed;
      hpDmg = finalDmg - absorbed;
    }
    target.hp = Math.max(0, target.hp - hpDmg);

    // Guts (致死ダメージHP1耐え)
    if (target.hp <= 0 && target.gutsLeft > 0) {
      target.gutsLeft--;
      target.hp = 1;
      pushLog('不屈', '🔥 ' + target.name + ' は致死攻撃をHP1で耐え抜いた！', 'buff');
    }

    // Target gaugeOnHit
    if (target.hp > 0 && target.stats && target.stats.gaugeOnHit > 0) {
      target.gauge = Math.min(GAUGE_MAX + 100, target.gauge + Math.round(target.stats.gaugeOnHit * GAUGE_MAX));
    }

    // Superboss damage accumulation & break milestones
    if (state.mode === 'superboss' && target.side === 'enemy') {
      state.superbossDamage += finalDmg;
      if (state.superbossNextBreak > 0 && state.superbossDamage >= state.superbossNextBreak) {
        var sb = getSuperboss(state.targetId);
        var step = Math.round(((sb && sb.milestones && sb.milestones[0] && sb.milestones[0].dmg) || 12000) * 0.75);
        state.superbossBreaks++;
        state.superbossNextBreak += step;
        applyStatus(target, 'vulnerable', 2, attacker);
        target.gauge = Math.max(0, target.gauge - 280);
        pushLog('BREAK', '💥 超ボスBREAK #' + state.superbossBreaks + '！脆弱付与＆行動遅延！', 'intruder');
      }
      if (target.hp <= 0) target.hp = target.maxHp;
    }

    // 4-Metric Cumulative DPS tracking
    if (attacker.side === 'ally') recordDps(attacker.charId, 'dmgDealt', finalDmg);
    if (target.side === 'ally') recordDps(target.charId, 'dmgTaken', finalDmg);

    // Skill drainPct
    if (opts.drainPct > 0 && attacker.hp > 0 && finalDmg > 0) {
      var drAmt = Math.max(1, Math.round(finalDmg * opts.drainPct));
      var actDr = Math.min(attacker.maxHp - attacker.hp, drAmt);
      if (actDr > 0) {
        attacker.hp += actDr;
        if (attacker.side === 'ally') {
          recordDps(attacker.charId, 'healDealt', actDr);
          recordDps(attacker.charId, 'healTaken', actDr);
        }
      }
    }

    // Healer auto-revive check
    var revived = false;
    if (target.hp <= 0) {
      revived = tryHealerAutoRevive(target);
    }

    var killed = target.hp <= 0;
    if (killed) {
      handleUnitDefeat(target, attacker, opts);
    }

    return { dmg: finalDmg, hpDmg: hpDmg, absorbed: absorbed, crit: isCrit, adv: adv, killed: killed, revived: revived };
  }

  function applyHealEffect(healer, target, ef) {
    if (!target || target.hp <= 0) return { heal: 0, shield: 0 };
    var mult = (ef && typeof ef.mult === 'number') ? ef.mult : 0;
    var hpPct = (ef && typeof ef.hpPct === 'number') ? ef.hpPct : 0;
    var base = Math.round((healer.atk * mult) + (target.maxHp * hpPct));
    if (base <= 0) base = Math.round(target.maxHp * 0.16);

    var hMod = 1 + ((healer.stats && healer.stats.healDealtPct) || 0) + ((target.stats && target.stats.healTakenPct) || 0);
    if (hasStatus(target, 'poison')) hMod *= 0.75;
    var amount = Math.max(1, Math.round(base * Math.max(0.3, hMod)));

    var missing = target.maxHp - target.hp;
    var actual = Math.min(missing, amount);
    var excess = Math.max(0, amount - actual);
    target.hp += actual;

    // Overheal Shield conversion (予防障壁型ヒーラー!)
    var overShield = 0;
    if (excess > 0 && healer.stats && healer.stats.overhealShield > 0) {
      overShield = Math.round(excess * healer.stats.overhealShield);
      target.shield = Math.max(target.shield, Math.min(Math.round(target.maxHp * 0.6), target.shield + overShield));
    }

    // Cleanse on heal (浄化解除型ヒーラー!)
    if (healer.stats && healer.stats.cleanseOnHeal > 0) {
      cleanseStatuses(target, healer.stats.cleanseOnHeal);
    }

    if (healer.side === 'ally') recordDps(healer.charId, 'healDealt', actual || amount);
    if (target.side === 'ally') recordDps(target.charId, 'healTaken', actual || amount);
    return { heal: actual || amount, shield: overShield };
  }

  function processStartOfTurn(actor) {
    var dotEvents = [];
    // Self turnRegenPct (再生型アビリティ / 蒼海氷晶セット / リヴァイア遺物)
    if (actor.stats && actor.stats.turnRegenPct > 0 && actor.hp > 0 && actor.hp < actor.maxHp) {
      var rAmt = Math.max(10, Math.round(actor.maxHp * actor.stats.turnRegenPct * (1 + (actor.stats.healTakenPct || 0))));
      var actR = Math.min(actor.maxHp - actor.hp, rAmt);
      if (actR > 0) {
        actor.hp += actR;
        if (actor.side === 'ally') {
          recordDps(actor.charId, 'healDealt', actR);
          recordDps(actor.charId, 'healTaken', actR);
        }
        dotEvents.push({ type: 'regen', targetUid: actor.uid, value: actR });
      }
    }
    // Regen buff
    for (var i = 0; i < actor.statuses.length; i++) {
      var st = actor.statuses[i];
      if (st.id === 'regen' && actor.hp < actor.maxHp) {
        var heal = Math.max(10, Math.round(actor.maxHp * 0.10));
        var actH = Math.min(actor.maxHp - actor.hp, heal);
        if (actH > 0) {
          actor.hp += actH;
          if (actor.side === 'ally') recordDps(actor.charId, 'healTaken', actH);
          if (st.sourceId && state.dps[st.sourceId]) recordDps(st.sourceId, 'healDealt', actH);
          dotEvents.push({ type: 'regen', targetUid: actor.uid, value: actH });
        }
      }
    }
    return dotEvents;
  }

  function processEndOfTurnDots(actor) {
    var dotEvents = [];
    if (actor.hp <= 0) return dotEvents;
    for (var i = 0; i < actor.statuses.length; i++) {
      var st = actor.statuses[i];
      if (st.id === 'burn' || st.id === 'poison') {
        var pct = st.id === 'burn' ? 0.07 : 0.08;
        var cap = actor.isBoss ? Math.round(actor.maxHp * 0.025) : actor.maxHp;
        var dmg = Math.max(10, Math.min(cap, Math.round(actor.maxHp * pct)));
        actor.hp = Math.max(0, actor.hp - dmg);
        if (actor.side === 'ally') recordDps(actor.charId, 'dmgTaken', dmg);
        if (st.sourceId && state.dps[st.sourceId]) recordDps(st.sourceId, 'dmgDealt', dmg);
        dotEvents.push({ type: st.id, targetUid: actor.uid, value: dmg });
        pushLog('状態異常', actor.name + ' は' + getStatusLabel(st.id) + 'で ' + dmg + ' ダメージ', 'ailment');
        if (actor.hp <= 0) {
          if (actor.gutsLeft > 0) { actor.gutsLeft--; actor.hp = 1; }
          else tryHealerAutoRevive(actor);
          if (actor.hp <= 0) {
            handleUnitDefeat(actor, findUnitBySourceId(st.sourceId), {});
            break;
          }
        }
      }
    }
    return dotEvents;
  }

  function executeTurn(actor) {
    state.activeActorId = actor.uid;
    state.totalActions++;

    for (var c = 0; c < actor.skills.length; c++) {
      if (actor.skills[c].currentCd > 0) actor.skills[c].currentCd--;
    }

    var dotEvents = processStartOfTurn(actor);
    if (actor.hp <= 0) {
      emit('battle:action', { actor: actor, skipped: 'dead', dotEvents: dotEvents, hits: [] });
      return;
    }

    if (hasStatus(actor, 'stun') || hasStatus(actor, 'freeze')) {
      var ccName = hasStatus(actor, 'stun') ? '気絶' : '凍結';
      pushLog('妨害', actor.name + ' は' + ccName + 'のため行動不能！', 'ailment');
      dotEvents = dotEvents.concat(processEndOfTurnDots(actor));
      tickDownStatuses(actor);
      emit('battle:action', { actor: actor, skipped: ccName, dotEvents: dotEvents, hits: [] });
      return;
    }

    var skill = selectSkill(actor);
    var primaryTargets = pickPrimaryTargets(actor, skill);
    if (skill.cd > 0) skill.currentCd = skill.cd + 1;

    actor.lastSkillUsed = {
      name: skill.name,
      target: skill.target,
      targetLabel: getTargetLabel(skill.target),
      idx: skill.idx,
      timestamp: Date.now()
    };

    var hitEvents = [];
    var targetSummaries = [];
    var isArea = (skill.target === 'area' || skill.target === 'all');
    var isSingle = (skill.target === 'single');
    var isSkill = skill.idx > 0;

    // 1. Direct Damage component
    if (skill.power > 0) {
      for (var ti = 0; ti < primaryTargets.length; ti++) {
        var tgt = primaryTargets[ti];
        if (!tgt || tgt.side === actor.side || tgt.hp <= 0) continue;
        var hits = Math.max(1, skill.hits || 1);
        var perHit = skill.power / hits;
        var sumDmg = 0;
        var anyCrit = false;
        var adv = 1;
        for (var h = 0; h < hits && tgt.hp > 0; h++) {
          var res = applyDamage(actor, tgt, perHit, {
            isArea: isArea, isSingle: isSingle, isSkill: isSkill,
            ignoreDef: skill.ignoreDef, drainPct: skill.drainPct,
            bonusVsAilment: skill.bonusVsAilment, critAdd: skill.critAdd,
            gaugeOnKill: skill.gaugeOnKill
          });
          sumDmg += res.dmg;
          if (res.crit) anyCrit = true;
          adv = res.adv;
          hitEvents.push({
            kind: 'damage', targetUid: tgt.uid, value: res.dmg,
            crit: res.crit, adv: res.adv, killed: res.killed, revived: res.revived
          });
        }
        var advTag = adv > 1.05 ? '弱点!' : (adv < 0.9 ? '耐性' : '');
        targetSummaries.push(tgt.name + 'に' + sumDmg + (anyCrit ? '会心!' : '') + advTag);
      }
    }

    // 2. Skill Effects (each effect specifies its own exact target scope with side-safety guardrails!)
    var effs = skill.effects || [];
    for (var ei = 0; ei < effs.length; ei++) {
      var ef = effs[ei];
      if (!ef) continue;
      var efTargets = resolveTargetsForScope(actor, ef.target || skill.target, primaryTargets, ef);
      for (var et = 0; et < efTargets.length; et++) {
        var u = efTargets[et];
        if (!u) continue;

        if (ef.type === 'revive') {
          if (u.side === actor.side && u.hp <= 0) {
            var rHp = Math.max(1, Math.round(u.maxHp * (ef.hpPct || 0.40)));
            u.hp = rHp;
            u.gauge = 350;
            if (actor.side === 'ally') recordDps(actor.charId, 'healDealt', rHp);
            if (u.side === 'ally') recordDps(u.charId, 'healTaken', rHp);
            hitEvents.push({ kind: 'heal', targetUid: u.uid, value: rHp, revive: true });
            targetSummaries.push(u.name + 'を蘇生');
          }
          break;
        }
        if (u.hp <= 0) continue;

        if (ef.type === 'heal') {
          var hRes = applyHealEffect(actor, u, ef);
          hitEvents.push({ kind: 'heal', targetUid: u.uid, value: hRes.heal });
          if (hRes.shield > 0) hitEvents.push({ kind: 'shield', targetUid: u.uid, value: hRes.shield });
          if (targetSummaries.length < 3) targetSummaries.push(u.name + 'を' + hRes.heal + '回復');
        } else if (ef.type === 'shield') {
          var sh = Math.round(u.maxHp * (ef.hpPct || 0.18));
          u.shield = Math.max(u.shield, sh);
          hitEvents.push({ kind: 'shield', targetUid: u.uid, value: sh });
          if (targetSummaries.length < 3) targetSummaries.push(u.name + 'に防護壁' + sh);
        } else if (ef.type === 'cleanse') {
          var cl = cleanseStatuses(u, ef.count || 1);
          if (cl > 0 && targetSummaries.length < 3) targetSummaries.push(u.name + 'の異常解除');
        } else if (ef.type === 'dispel') {
          var dp = dispelBuffs(u, ef.count || 1);
          if (dp > 0 && targetSummaries.length < 3) targetSummaries.push(u.name + 'の強化解除');
        } else if (ef.type === 'gauge') {
          var amt = typeof ef.amount === 'number' ? ef.amount : 0.15;
          var delta = Math.round(amt * GAUGE_MAX);
          u.gauge = clamp(u.gauge + delta, 0, GAUGE_MAX + 150);
          if (targetSummaries.length < 3) targetSummaries.push(u.name + (delta >= 0 ? 'ゲージ加速' : '行動遅延'));
        } else if (ef.type === 'status' && ef.status) {
          var stKind = getStatusKind(ef.status);
          var chance = typeof ef.chance === 'number' ? ef.chance : 1.0;
          if (stKind !== 'buff') {
            chance = clamp(chance + ((actor.stats && actor.stats.ailmentRate) || 0) - (u.res || 0) * 0.65, 0.12, 0.98);
          }
          if (Math.random() < chance) {
            applyStatus(u, ef.status, ef.turns || 2, actor);
            hitEvents.push({ kind: 'status', targetUid: u.uid, status: ef.status });
            if (targetSummaries.length < 3) targetSummaries.push(u.name + 'に' + getStatusLabel(ef.status));
          }
        }
      }
    }

    // Skill awakening selfGauge
    if (skill.selfGauge > 0 && actor.hp > 0) {
      actor.gauge = Math.min(GAUGE_MAX + 100, actor.gauge + Math.round(skill.selfGauge * GAUGE_MAX));
    }

    var scopeTag = '[' + getTargetLabel(skill.target) + ']';
    var logKind = skillHasEffect(skill, 'heal') ? 'heal' : (skill.power > 0 ? 'action' : 'buff');
    var detailText = targetSummaries.length ? ' → ' + targetSummaries.slice(0, 3).join(' / ') : '';
    pushLog(actor.side === 'ally' ? '味方' : (actor.isBoss ? 'BOSS' : '敵'), actor.name + ' の「' + skill.name + '」' + scopeTag + detailText, logKind);

    // Follow-up Attack (追撃) inside the same sequential lock window!
    if (actor.hp > 0 && skill.power > 0 && actor.stats && actor.stats.followUpRate > 0) {
      if (Math.random() < actor.stats.followUpRate) {
        var livingFoes = (actor.side === 'ally' ? state.enemies : state.allies).filter(function (u) { return u.hp > 0; });
        var fuTarget = (primaryTargets[0] && primaryTargets[0].hp > 0 && primaryTargets[0].side !== actor.side) ? primaryTargets[0] : livingFoes[0];
        if (fuTarget) {
          var fuPow = 0.56 * (1 + (actor.stats.followUpPower || 0));
          var fuRes = applyDamage(actor, fuTarget, fuPow, { isSingle: true });
          hitEvents.push({ kind: 'damage', targetUid: fuTarget.uid, value: fuRes.dmg, crit: fuRes.crit, adv: fuRes.adv, followUp: true });
          pushLog('追撃', '⚡ ' + actor.name + ' の連携追撃 → ' + fuTarget.name + 'に' + fuRes.dmg, 'action');
        }
      }
    }

    // Counterattack (反撃) inside the same sequential lock window!
    if (skill.power > 0 && actor.hp > 0) {
      for (var ci = 0; ci < primaryTargets.length; ci++) {
        var defU = primaryTargets[ci];
        if (!defU || defU.hp <= 0 || defU.side === actor.side) continue;
        if (hasStatus(defU, 'stun') || hasStatus(defU, 'freeze')) continue;
        var hasCnt = hasStatus(defU, 'counter');
        var cntRate = hasCnt ? 1.0 : ((defU.stats && defU.stats.counterRate) || 0);
        if (cntRate > 0 && Math.random() < cntRate && actor.hp > 0) {
          var cPow = 0.62 * (1 + ((defU.stats && defU.stats.counterPower) || 0));
          var cRes = applyDamage(defU, actor, cPow, { isSingle: true });
          hitEvents.push({ kind: 'damage', targetUid: actor.uid, value: cRes.dmg, crit: cRes.crit, adv: cRes.adv, counter: true });
          pushLog('反撃', '🛡 ' + defU.name + ' の反撃 → ' + actor.name + 'に' + cRes.dmg, 'action');
        }
      }
    }

    dotEvents = dotEvents.concat(processEndOfTurnDots(actor));
    tickDownStatuses(actor);

    var actEvt = { actor: actor, skill: skill, targets: primaryTargets, hits: hitEvents, dotEvents: dotEvents, timestamp: Date.now() };
    state.lastActionEvent = actEvt;
    emit('battle:action', actEvt);
  }

  // --- Rewards & Resolution ---
  function rollEquipmentDrop(setIds, qRange, bonusQuality) {
    var defs = (HS.Data && Array.isArray(HS.Data.EQUIP_DEFS)) ? HS.Data.EQUIP_DEFS : [];
    var pool = (Array.isArray(setIds) && setIds.length)
      ? defs.filter(function (d) { return setIds.indexOf(d.setId) !== -1; })
      : defs;
    if (!pool.length) pool = defs;
    var chosen = pickRandom(pool);
    if (!chosen) return null;

    var minQ = (Array.isArray(qRange) && qRange[0]) ? qRange[0] : 20;
    var maxQ = (Array.isArray(qRange) && qRange[1]) ? qRange[1] : 90;
    var bq = Math.floor(bonusQuality || 0);
    var lo = Math.min(96, minQ + bq);
    var hi = Math.min(100, maxQ + bq);
    var q = randInt(lo, hi);
    if (maxQ >= 94 && q >= 95 && Math.random() < 0.14) q = 100;
    else if (Math.random() < 0.025) q = 100;

    return HS.State.receiveEquipment(chosen.id, q, { silent: true });
  }

  function grantBattleRewards(won) {
    var relicDrop = (HS.Calc && typeof HS.Calc.calcPartyDropBonuses === 'function')
      ? HS.Calc.calcPartyDropBonuses()
      : { dropGoldPct: 0, dropQualityBonus: 0 };

    var loot = {
      won: won,
      gold: 0,
      materials: {},
      drops: [],
      autoSoldCount: 0,
      autoSoldGold: 0,
      firstClear: false,
      unlockedChars: [],
      unlockedRelics: [],
      expeditions: [],
      intrudersDefeated: state.runLoot.intrudersDefeated.slice(),
      superbossDamage: state.superbossDamage,
      superbossBreaks: state.superbossBreaks,
      isNewRecord: false
    };

    function addMat(id, qty) {
      if (!id || !qty || qty <= 0) return;
      if (id === 'gold') {
        loot.gold += qty;
        HS.State.addMaterial('gold', qty, true);
      } else {
        loot.materials[id] = (loot.materials[id] || 0) + qty;
        HS.State.addMaterial(id, qty, true);
      }
    }

    function applyRewardBundle(rw) {
      if (!rw) return;
      if (rw.gold) addMat('gold', Math.round(rw.gold * (1 + (relicDrop.dropGoldPct || 0))));
      if (rw.chaosShard) addMat('chaosShard', rw.chaosShard);
      if (rw.matId && rw.matQty) addMat(rw.matId, rw.matQty);
      if (rw.unlockCharId) {
        var uRes = HS.State.unlockChar(rw.unlockCharId, state.mode);
        if (uRes.unlocked && uRes.char) {
          loot.unlockedChars.push(uRes.char);
          pushLog('加入', '🎉 「' + uRes.char.name + '」が仲間になった！', 'maxq');
        }
      }
      if (rw.unlockRelicId) {
        var rRes = HS.State.unlockRelic(rw.unlockRelicId);
        if (rRes.unlocked && rRes.relic) {
          loot.unlockedRelics.push(rRes.relic);
          pushLog('遺物', '✨ 世界遺物「' + rRes.relic.name + '」を獲得！', 'maxq');
        }
      }
    }

    function addDrop(rec) {
      if (!rec) return;
      loot.drops.push(rec);
      var name = (rec.def && rec.def.name) || rec.item.defId;
      if (rec.autoSold) {
        loot.autoSoldCount++;
        loot.autoSoldGold += rec.gold;
        pushLog('売却', name + '(品質' + rec.item.quality + ') [自動売却 +' + rec.gold + 'G]', 'autosell');
      } else if (rec.isMaxQuality) {
        pushLog('極品', '👑【極】' + name + '(品質100) を獲得！！', 'maxq');
      } else {
        pushLog('獲得', name + '(品質' + rec.item.quality + ') を獲得', 'drop');
      }
    }

    function checkIntruderUnlock(enemyId) {
      var kills = HS.State.recordIntruderKill(enemyId);
      addMat('mat_intruder', 2);
      var eDef = getEnemyById(enemyId);
      var bounties = (HS.Data && Array.isArray(HS.Data.BOUNTIES)) ? HS.Data.BOUNTIES : [];
      var targetBounty = null;
      for (var i = 0; i < bounties.length; i++) {
        if (bounties[i].intruderId === enemyId) { targetBounty = bounties[i]; break; }
      }
      var recruitId = (targetBounty && targetBounty.recruitCharId) || (eDef && eDef.recruitCharId);
      var reqKills = (targetBounty && targetBounty.killsToRecruit) || 3;
      if (recruitId && kills >= reqKills && !HS.State.isCharOwned(recruitId)) {
        var uRes = HS.State.unlockChar(recruitId, 'intruder');
        if (uRes.unlocked && uRes.char) {
          loot.unlockedChars.push(uRes.char);
          pushLog('加入', '🎉 乱入討伐で「' + uRes.char.name + '」が仲間になった！', 'maxq');
        }
      }
    }

    if (state.mode === 'stage' && won) {
      var info = getStageData(state.targetId);
      if (info) {
        var st = info.stage;
        var recClear = HS.State.recordStageClear(st.id);
        loot.firstClear = recClear.firstClear;

        addMat('gold', Math.round((st.goldReward || 180) * (1 + (relicDrop.dropGoldPct || 0))));
        addMat(st.matId, st.matQty || 2);
        if (Math.random() < 0.40) addMat('chaosShard', 1);

        var dropCnt = 1 + (Math.random() < 0.42 ? 1 : 0);
        for (var d = 0; d < dropCnt; d++) addDrop(rollEquipmentDrop(st.dropSets, st.qualityRange, relicDrop.dropQualityBonus));

        for (var ik = 0; ik < loot.intrudersDefeated.length; ik++) {
          checkIntruderUnlock(loot.intrudersDefeated[ik]);
          addDrop(rollEquipmentDrop(st.dropSets, [Math.min(80, (st.qualityRange ? st.qualityRange[0] : 30) + 18), 100], relicDrop.dropQualityBonus));
        }

        if (recClear.firstClear) applyRewardBundle(st.firstClear);
      }
    } else if (state.mode === 'tower' && won) {
      var fl = getTowerFloor(state.targetId);
      if (fl) {
        var tc = HS.State.recordTowerClear(fl.floor);
        loot.firstClear = tc.firstClear;
        if (tc.firstClear) applyRewardBundle(fl.firstClear);
        else applyRewardBundle(fl.repeatReward);
        addDrop(rollEquipmentDrop(fl.dropSets, fl.qualityRange, relicDrop.dropQualityBonus));
      }
    } else if (state.mode === 'superboss') {
      loot.won = true;
      var sb = getSuperboss(state.targetId);
      if (sb) {
        var sbRec = HS.State.recordSuperbossDamage(sb.id, state.superbossDamage);
        loot.isNewRecord = sbRec.isNewRecord;
        addMat('gold', Math.round((350 + Math.floor(state.superbossDamage / 45)) * (1 + (relicDrop.dropGoldPct || 0))));
        addMat('mat_boss', Math.max(2, 2 + state.superbossBreaks));

        var claimed = HS.State.get().progress.superbossClaimed[sb.id];
        if (!Array.isArray(claimed)) {
          claimed = [];
          HS.State.get().progress.superbossClaimed[sb.id] = claimed;
        }
        var milestones = Array.isArray(sb.milestones) ? sb.milestones : [];
        for (var mi = 0; mi < milestones.length; mi++) {
          var ms = milestones[mi];
          var msKey = ms.id || ('ms_' + mi);
          var already = claimed.indexOf(msKey) !== -1 || claimed.indexOf(mi) !== -1;
          if (state.superbossDamage >= (ms.dmg || 0) && !already) {
            claimed.push(msKey);
            applyRewardBundle(ms.reward);
          }
        }
        addDrop(rollEquipmentDrop(sb.dropSets, sb.qualityRange, relicDrop.dropQualityBonus));
      }
    } else if (state.mode === 'relay' && won) {
      var raid = getRelayRaid(state.targetId);
      if (raid) {
        var rc = HS.State.recordRelayClear(raid.id);
        loot.firstClear = rc.firstClear;
        if (rc.firstClear) applyRewardBundle(raid.firstClear);
        else applyRewardBundle(raid.repeatReward);
        addDrop(rollEquipmentDrop(raid.dropSets, raid.qualityRange, relicDrop.dropQualityBonus));
        addDrop(rollEquipmentDrop(raid.dropSets, raid.qualityRange, relicDrop.dropQualityBonus));
      }
    } else if (state.mode === 'bounty' && won) {
      var bt = getBounty(state.targetId);
      if (bt) {
        var bc = HS.State.recordBountyClear(bt.id);
        loot.firstClear = bc.firstClear;
        addMat('gold', Math.round((bt.goldReward || 500) * (1 + (relicDrop.dropGoldPct || 0))));
        addMat(bt.matId || 'mat_intruder', bt.matQty || 3);
        checkIntruderUnlock(bt.intruderId);
        addDrop(rollEquipmentDrop(bt.dropSets, bt.qualityRange, relicDrop.dropQualityBonus));
        if (Math.random() < 0.50) addDrop(rollEquipmentDrop(bt.dropSets, bt.qualityRange, relicDrop.dropQualityBonus));
        if (bc.firstClear) applyRewardBundle(bt.firstClear);
      }
    }

    // Advance Battle-Count-Linked Expeditions ONLY on battle victory!
    if (loot.won && HS.Expedition && typeof HS.Expedition.onBattleWin === 'function') {
      var expCompleted = HS.Expedition.onBattleWin({ mode: state.mode, targetId: state.targetId });
      loot.expeditions = expCompleted;
      for (var ex = 0; ex < expCompleted.length; ex++) {
        var ec = expCompleted[ex];
        pushLog('別働隊', '🚩 別働隊「' + ec.routeName + '」帰還！ +' + ec.gold + 'G / 装備' + ec.drops.length + '個', 'expedition');
      }
    }

    HS.State.scheduleSave();
    return loot;
  }

  function accumulateRepeatLoot(loot) {
    if (!state.repeatStats) return;
    var rs = state.repeatStats;
    rs.runs++;
    if (loot.won) rs.wins++;
    else rs.losses++;
    rs.totalGold += loot.gold;
    rs.totalAutoSold += loot.autoSoldCount;
    rs.totalAutoSoldGold += loot.autoSoldGold;
    rs.intrudersDefeated += loot.intrudersDefeated.length;
    rs.expeditionCompletions += loot.expeditions.length;

    Object.keys(loot.materials).forEach(function (k) {
      rs.materials[k] = (rs.materials[k] || 0) + loot.materials[k];
    });
    for (var i = 0; i < loot.drops.length; i++) {
      var d = loot.drops[i];
      if (!d.autoSold) {
        rs.keptDrops.push(d);
        if (d.isMaxQuality) rs.maxQualityDrops.push(d);
      }
    }
    for (var ex = 0; ex < loot.expeditions.length; ex++) {
      var exp = loot.expeditions[ex];
      rs.totalGold += exp.gold;
      rs.totalAutoSold += exp.autoSoldCount;
      rs.totalAutoSoldGold += exp.autoSoldGold;
      Object.keys(exp.materials || {}).forEach(function (mk) {
        rs.materials[mk] = (rs.materials[mk] || 0) + exp.materials[mk];
      });
      for (var ed = 0; ed < exp.drops.length; ed++) {
        if (!exp.drops[ed].autoSold) {
          rs.keptDrops.push(exp.drops[ed]);
          if (exp.drops[ed].isMaxQuality) rs.maxQualityDrops.push(exp.drops[ed]);
        }
      }
    }
    for (var uc = 0; uc < loot.unlockedChars.length; uc++) rs.unlockedChars.push(loot.unlockedChars[uc]);
    for (var ur = 0; ur < loot.unlockedRelics.length; ur++) rs.unlockedRelics.push(loot.unlockedRelics[ur]);
  }

  function finishRun(won) {
    var loot = grantBattleRewards(won);

    if (state.autoRepeat) {
      accumulateRepeatLoot(loot);
      if (state.stopAfterCurrent || !won) {
        state.active = false;
        state.phase = 'repeat_result';
        state.result = null;
        state.repeatSummary = Object.assign({}, state.repeatStats, {
          stoppedReason: !won ? 'defeat' : 'user_stop',
          title: state.title,
          mode: state.mode,
          targetId: state.targetId,
          dpsSnapshot: getDpsSnapshot()
        });
        pushLog('周回完了', '周回終了（全' + state.repeatSummary.runs + '戦 / 勝利' + state.repeatSummary.wins + '）', 'system');
        emit('battle:repeatComplete', state.repeatSummary);
      } else {
        var speed = (HS.State.get().settings.speed) || 1;
        state.phase = 'repeat_delay';
        state.repeatDelayTimer = REPEAT_DELAY_BASE_MS / speed;
        pushLog('周回', '第' + state.runCount + '戦 勝利！ 次の周回へ移行します…', 'wave');
        emit('battle:runWon', { runCount: state.runCount, loot: loot, repeatStats: state.repeatStats });
      }
    } else {
      state.active = false;
      state.phase = 'result';
      state.repeatSummary = null;
      state.result = Object.assign({}, loot, {
        title: state.title,
        mode: state.mode,
        targetId: state.targetId,
        totalActions: state.totalActions,
        dpsSnapshot: getDpsSnapshot()
      });
      pushLog('決着', won ? '🏆 勝利！' : '💀 敗北…', 'system');
      emit('battle:complete', state.result);
    }
  }

  function deployRelaySquad(squadIdx) {
    var s = HS.State.get();
    var squadIds = (s.relaySquads && Array.isArray(s.relaySquads[squadIdx])) ? s.relaySquads[squadIdx] : [];
    if (!squadIds.length) return false;
    var allies = [];
    for (var i = 0; i < squadIds.length; i++) {
      var u = buildAllyUnit(squadIds[i], i, squadIds, [], null);
      if (u) allies.push(u);
    }
    if (!allies.length) return false;
    state.relayIndex = squadIdx;
    state.allies = allies;
    initDpsEntries(allies);
    state.readyQueue = state.readyQueue.filter(function (u) { return u.side === 'enemy' && u.hp > 0; });
    pushLog('総力戦', '🚩 第' + (squadIdx + 1) + '部隊 出撃！', 'wave');
    emit('battle:relaySquad', { squadIndex: squadIdx, allies: allies });
    return true;
  }

  function checkBattleProgress() {
    var alliesAlive = state.allies.some(function (u) { return u.hp > 0; });
    var enemiesAlive = state.enemies.some(function (u) { return u.hp > 0; });

    if (state.mode === 'superboss') {
      if (state.totalActions >= state.maxActions || !alliesAlive) finishRun(true);
      return;
    }

    if (state.mode === 'relay' && !alliesAlive) {
      var deployed = false;
      for (var nextQ = state.relayIndex + 1; nextQ < 3; nextQ++) {
        if (deployRelaySquad(nextQ)) { deployed = true; break; }
      }
      if (!deployed) { finishRun(false); return; }
    } else if (!alliesAlive) {
      finishRun(false);
      return;
    }

    if (!enemiesAlive) {
      if (state.mode === 'relay') {
        if (state.relayBossPhase < 3) {
          state.relayBossPhase++;
          state.wave = state.relayBossPhase;
          for (var a = 0; a < state.allies.length; a++) {
            if (state.allies[a].hp > 0) {
              state.allies[a].hp = Math.min(state.allies[a].maxHp, state.allies[a].hp + Math.round(state.allies[a].maxHp * 0.25));
            }
          }
          state.phase = 'wave_transition';
          state.waveTransitionTimer = WAVE_DELAY_BASE_MS / (HS.State.get().settings.speed || 1);
          return;
        }
        finishRun(true);
        return;
      }

      if (state.wave < state.totalWaves) {
        state.wave++;
        state.phase = 'wave_transition';
        state.waveTransitionTimer = WAVE_DELAY_BASE_MS / (HS.State.get().settings.speed || 1);
      } else {
        finishRun(true);
      }
    }
  }

  function setupRunEntities(isRepeatContinuation) {
    var s = HS.State.get();
    state.wave = 1;
    state.totalActions = 0;
    state.actionLockTimer = 0;
    state.waveTransitionTimer = 0;
    state.repeatDelayTimer = 0;
    state.activeActorId = null;
    state.readyQueue = [];
    state.intruderAppearedThisRun = false;
    state.intruderBanner = null;
    state.runLoot = { intrudersDefeated: [] };
    state.superbossDamage = 0;
    state.superbossBreaks = 0;
    state.relayIndex = 0;
    state.relayBossPhase = 1;

    if (state.mode === 'relay') {
      var started = false;
      for (var q = 0; q < 3; q++) {
        if (deployRelaySquad(q)) { started = true; break; }
      }
      if (!started) {
        var fb = [];
        for (var fp = 0; fp < s.party.length; fp++) {
          if (s.party[fp]) fb.push(buildAllyUnit(s.party[fp], fp, s.party, s.links, null));
        }
        state.allies = fb;
        initDpsEntries(fb);
      }
    } else {
      var allies = [];
      for (var i = 0; i < s.party.length; i++) {
        if (!s.party[i]) continue;
        var u = buildAllyUnit(s.party[i], i, s.party, s.links, state.towerRule);
        if (u) allies.push(u);
      }
      state.allies = allies;
      if (!isRepeatContinuation) state.dps = {};
      initDpsEntries(allies);
    }

    state.phase = 'fighting';
    spawnCurrentWave();
  }

  function getDpsSnapshot() {
    var out = [];
    var keys = Object.keys(state.dps);
    for (var i = 0; i < keys.length; i++) {
      var d = state.dps[keys[i]];
      out.push({
        charId: d.charId, name: d.name, role: d.role, element: d.element,
        dmgDealt: d.dmgDealt, dmgTaken: d.dmgTaken, healDealt: d.healDealt, healTaken: d.healTaken
      });
    }
    return out;
  }

  function getTurnOrderPreview(count) {
    var n = count || 8;
    var living = state.allies.concat(state.enemies).filter(function (u) { return u && u.hp > 0; });
    if (!living.length) return [];

    var preview = [];
    var sims = living.map(function (u) {
      return { unit: u, gauge: u.gauge, spd: getEffectiveSpeed(u) };
    });

    for (var q = 0; q < state.readyQueue.length && preview.length < n; q++) {
      var qu = state.readyQueue[q];
      if (!qu || qu.hp <= 0) continue;
      preview.push({
        uid: qu.uid, name: qu.name, side: qu.side, element: qu.element,
        role: qu.role, isBoss: qu.isBoss, isIntruder: qu.isIntruder, ready: true
      });
      for (var si = 0; si < sims.length; si++) {
        if (sims[si].unit.uid === qu.uid) {
          sims[si].gauge = Math.max(0, sims[si].gauge - GAUGE_MAX);
          break;
        }
      }
    }

    while (preview.length < n) {
      var minTime = Infinity;
      var nextSim = null;
      for (var i = 0; i < sims.length; i++) {
        var remain = Math.max(0, GAUGE_MAX - sims[i].gauge);
        var time = remain / (sims[i].spd * BASE_GAUGE_RATE);
        if (time < minTime || (Math.abs(time - minTime) < 1e-6 && nextSim && sims[i].spd > nextSim.spd)) {
          minTime = time;
          nextSim = sims[i];
        }
      }
      if (!nextSim) break;
      for (var j = 0; j < sims.length; j++) sims[j].gauge += sims[j].spd * BASE_GAUGE_RATE * minTime;
      nextSim.gauge = Math.max(0, nextSim.gauge - GAUGE_MAX);
      var nu = nextSim.unit;
      preview.push({
        uid: nu.uid, name: nu.name, side: nu.side, element: nu.element,
        role: nu.role, isBoss: nu.isBoss, isIntruder: nu.isIntruder, ready: false
      });
    }

    return preview;
  }

  var BattleAPI = {
    GAUGE_MAX: GAUGE_MAX,
    state: state,

    getState: function () { return state; },
    isActive: function () { return Boolean(state.active); },
    isLocked: function () { return Boolean(state.active); },
    subscribe: subscribe,

    startBattle: function (config) {
      config = config || {};
      var mode = config.mode || 'stage';
      var s = HS.State.get();
      if (!s.party.some(Boolean)) return { ok: false, error: '出撃メンバーが編成されていません' };

      var supportsRepeat = (mode === 'stage' || mode === 'bounty');
      var autoRepeat = Boolean(config.autoRepeat && supportsRepeat);

      state.active = true;
      state.paused = false;
      state.mode = mode;
      state.targetId = config.targetId || s.progress.selectedStageId;
      state.autoRepeat = autoRepeat;
      state.stopAfterCurrent = false;
      state.runCount = 1;
      state.towerRule = null;
      state.towerRuleName = '';
      state.towerRuleDesc = '';
      state.maxActions = 0;
      state.result = null;
      state.repeatSummary = null;
      state.logs = [];
      state.dps = {};
      state.config = { mode: mode, targetId: state.targetId, autoRepeat: autoRepeat };

      state.repeatStats = autoRepeat ? {
        runs: 0, wins: 0, losses: 0,
        totalGold: 0, totalAutoSold: 0, totalAutoSoldGold: 0,
        materials: {}, keptDrops: [], maxQualityDrops: [],
        intrudersDefeated: 0, expeditionCompletions: 0,
        unlockedChars: [], unlockedRelics: []
      } : null;

      if (mode === 'stage') {
        var info = getStageData(state.targetId);
        state.targetId = info ? info.stage.id : state.targetId;
        state.title = info ? (info.stage.code + ' ' + info.stage.name) : '冒険ステージ';
        state.world = (info && (info.stage.world || info.area.world)) || 'frontier';
        state.totalWaves = (info && info.stage.waves) || 5;
        HS.State.selectStage(info ? info.area.id : null, state.targetId);
      } else if (mode === 'tower') {
        var fl = getTowerFloor(state.targetId);
        state.targetId = fl ? fl.floor : 1;
        var towerSuffix = fl ? String(fl.name || '').replace(/^(?:混線層・|最上)?第?\d+階(?:・)?/, '').trim() : '';
        state.title = fl ? (towerSuffix ? ('混線タワー ' + fl.floor + 'F・' + towerSuffix) : ('混線タワー ' + fl.floor + 'F')) : '異界混線タワー';
        state.world = (fl && fl.world) || 'abyss';
        state.totalWaves = (fl && fl.waves) || 3;
        state.towerRule = (fl && fl.ruleMod) || null;
        state.towerRuleName = (fl && fl.ruleName) || '';
        state.towerRuleDesc = (fl && fl.ruleDesc) || '';
      } else if (mode === 'superboss') {
        var sb = getSuperboss(state.targetId);
        state.targetId = sb ? sb.id : 'sb_1';
        state.title = sb ? sb.name : '超ボス計測戦';
        state.world = (sb && sb.world) || 'mechcity';
        state.totalWaves = 1;
        state.maxActions = (sb && sb.maxActions) || 50;
      } else if (mode === 'relay') {
        var raid = getRelayRaid(state.targetId);
        state.targetId = raid ? raid.id : 'rl_1';
        state.title = raid ? raid.name : '多部隊リレー総力戦';
        state.world = (raid && raid.world) || 'frontier';
        state.totalWaves = 3;
      } else if (mode === 'bounty') {
        var bt = getBounty(state.targetId);
        state.targetId = bt ? bt.id : 'bty_joker';
        state.title = bt ? bt.name : '乱入指名手配';
        state.world = (bt && bt.world) || 'abyss';
        state.totalWaves = (bt && bt.waves) || 3;
      }

      pushLog('出撃', state.title + ' 戦闘開始！' + (autoRepeat ? '（自動周回）' : ''), 'system');
      setupRunEntities(false);
      emit('battle:start', { state: state });
      return { ok: true, state: state };
    },

    tick: function (dtMs) {
      if (!state.active || state.paused) return;
      var dt = clamp(Number(dtMs) || 0, 0, 50);
      var speed = (HS.State && HS.State.get().settings.speed) || 1;

      if (state.phase === 'wave_transition') {
        state.waveTransitionTimer -= dt;
        if (state.waveTransitionTimer <= 0) {
          state.phase = 'fighting';
          spawnCurrentWave();
        }
        return;
      }

      if (state.phase === 'repeat_delay') {
        state.repeatDelayTimer -= dt;
        if (state.repeatDelayTimer <= 0) {
          state.runCount++;
          pushLog('周回', '━━ 自動周回 第' + state.runCount + '戦 開始 ━━', 'system');
          setupRunEntities(true); // Preserves cumulative state.dps!
          emit('battle:repeatNext', { runCount: state.runCount, state: state });
        }
        return;
      }

      if (state.phase !== 'fighting') return;

      // 1. CONTINUOUS GAUGE PROGRESSION (even while actionLockTimer > 0!)
      var allUnits = state.allies.concat(state.enemies);
      var queuedChanged = false;
      for (var i = 0; i < allUnits.length; i++) {
        var u = allUnits[i];
        if (!u || u.hp <= 0) continue;
        var effSpd = getEffectiveSpeed(u);
        u.gauge += effSpd * BASE_GAUGE_RATE * (dt / 1000) * speed;
        if (u.gauge >= GAUGE_MAX && !u.inReadyQueue) {
          u.inReadyQueue = true;
          state.readyQueue.push(u);
          queuedChanged = true;
        }
      }

      if (queuedChanged && state.readyQueue.length > 1) {
        state.readyQueue.sort(function (a, b) {
          if (b.gauge !== a.gauge) return b.gauge - a.gauge;
          var sb = getEffectiveSpeed(b) - getEffectiveSpeed(a);
          if (sb !== 0) return sb;
          return a.side === 'ally' ? -1 : 1;
        });
      }

      // 2. STRICT SEQUENTIAL LOCK (simultaneous attacks mathematically impossible!)
      if (state.actionLockTimer > 0) {
        state.actionLockTimer -= dt;
        return;
      }

      // 3. POP SINGLE NEXT LIVING UNIT
      while (state.readyQueue.length > 0 && state.readyQueue[0].hp <= 0) {
        var deadU = state.readyQueue.shift();
        deadU.inReadyQueue = false;
      }

      if (state.readyQueue.length > 0) {
        var actor = state.readyQueue.shift();
        actor.inReadyQueue = false;
        actor.gauge = Math.max(0, actor.gauge - GAUGE_MAX);
        state.actionLockTimer = ACTION_LOCK_BASE_MS / speed;
        executeTurn(actor);
        checkBattleProgress();
      }
    },

    setAutoRepeat: function (enabled) {
      if (!state.active) return false;
      if (state.mode !== 'stage' && state.mode !== 'bounty') return false;
      if (enabled) {
        state.autoRepeat = true;
        state.stopAfterCurrent = false;
        if (!state.repeatStats) {
          state.repeatStats = {
            runs: 0, wins: 0, losses: 0,
            totalGold: 0, totalAutoSold: 0, totalAutoSoldGold: 0,
            materials: {}, keptDrops: [], maxQualityDrops: [],
            intrudersDefeated: 0, expeditionCompletions: 0,
            unlockedChars: [], unlockedRelics: []
          };
        }
        emit('battle:repeatToggled', { autoRepeat: true, stopAfterCurrent: false });
      } else {
        BattleAPI.requestStopAfterCurrent();
      }
      return state.autoRepeat;
    },

    toggleAutoRepeat: function () {
      if (!state.active) return false;
      if (state.autoRepeat && !state.stopAfterCurrent) {
        BattleAPI.requestStopAfterCurrent();
        return false;
      }
      return BattleAPI.setAutoRepeat(true);
    },

    requestStopAfterCurrent: function () {
      if (!state.active || !state.autoRepeat) return false;
      state.stopAfterCurrent = true;
      pushLog('周回', '今回の戦闘終了後に自動周回を停止します', 'system');
      emit('battle:stopRequested', { stopAfterCurrent: true });
      return true;
    },

    retreat: function () {
      if (!state.active) return;
      state.active = false;
      if (state.autoRepeat && state.repeatStats && state.repeatStats.runs > 0) {
        state.phase = 'repeat_result';
        state.repeatSummary = Object.assign({}, state.repeatStats, {
          stoppedReason: 'retreat',
          title: state.title,
          mode: state.mode,
          targetId: state.targetId,
          dpsSnapshot: getDpsSnapshot()
        });
        emit('battle:repeatComplete', state.repeatSummary);
      } else {
        state.phase = 'idle';
        state.result = null;
        state.repeatSummary = null;
        emit('battle:retreat', {});
      }
    },

    closeResult: function () {
      if (state.active) return;
      state.phase = 'idle';
      state.result = null;
      state.repeatSummary = null;
      emit('battle:idle', {});
    },

    getTurnOrderPreview: getTurnOrderPreview,
    getDpsSnapshot: getDpsSnapshot,

    getNextStageId: function (stageId) {
      var info = getStageData(stageId || state.targetId);
      if (!info) return null;
      var nextInArea = info.area.stages[info.stageIdx + 1];
      if (nextInArea) return nextInArea.id;
      var areas = HS.Data.AREAS || [];
      if (areas[info.areaIdx + 1] && areas[info.areaIdx + 1].stages && areas[info.areaIdx + 1].stages[0]) {
        return areas[info.areaIdx + 1].stages[0].id;
      }
      return null;
    }
  };

  HS.Battle = BattleAPI;
  HS.Engine.Battle = BattleAPI;
})(typeof window !== 'undefined' ? window : globalThis);
