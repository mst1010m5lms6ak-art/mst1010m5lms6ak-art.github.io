(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.UI = HS.UI || {};

  var DPS_METRICS = [
    { id: 'dmgDealt',  label: '与ダメ' },
    { id: 'dmgTaken',  label: '被ダメ' },
    { id: 'healDealt', label: '与回復' },
    { id: 'healTaken', label: '被回復' }
  ];

  // Compact 1-char scope badges strictly for unit card skill pills (logs keep full [単体/範囲/全体])
  var CARD_SCOPE_SHORT = {
    single: '単',
    area: '範',
    all: '全',
    self: '自',
    ally_single: '味',
    ally_all: '味'
  };

  var mounted = false;
  var upperEl = null;
  var lowerEl = null;
  var ctxEl = null;

  var activeSubTab = 'log';      // 'log' | 'dps' | 'tactics'
  var activeDpsMetric = 'dmgDealt';
  var renderedPhase = null;      // 'idle' | 'active' | 'result' | 'repeat_result'

  // Cached DOM references for 60fps zero-churn active battle updates
  var stageRefs = null;
  var unitCardRefs = {};
  var lastTurnSig = '';

  // Cached lower panel references
  var lowerRefs = null;
  var logNearBottom = true;
  var lastRenderedLogId = 0;

  // Subscriptions to clean up on unmount
  var unsubs = [];

  function fmt(n) {
    if (HS.Utils && typeof HS.Utils.formatNum === 'function') return HS.Utils.formatNum(n);
    return Math.round(Number(n) || 0).toLocaleString('ja-JP');
  }

  function fmtExact(n) {
    if (HS.Utils && typeof HS.Utils.formatExact === 'function') return HS.Utils.formatExact(n);
    return Math.round(Number(n) || 0).toLocaleString('ja-JP');
  }

  function elMeta(elId) {
    var map = (HS.Data && HS.Data.ELEMENTS_META) || {};
    return map[elId] || { id: 'none', name: '無', icon: '❖', color: '#b4c0d4' };
  }

  function raceMeta(raceId) {
    var map = (HS.Data && HS.Data.RACES_META) || {};
    return map[raceId] || { id: raceId, name: raceId || '', icon: '◆' };
  }

  function roleMeta(roleId) {
    var map = (HS.Data && HS.Data.ROLES_META) || {};
    return map[roleId] || { id: roleId, name: roleId || '', short: '戦', icon: '⚔️' };
  }

  function statusMeta(stId) {
    var map = (HS.Data && HS.Data.STATUS_META) || {};
    return map[stId] || { id: stId, name: stId, short: stId, icon: '◆', kind: 'buff' };
  }

  function getMatMeta(matId) {
    var mats = HS.Data && HS.Data.MATERIALS;
    if (!mats) return { id: matId, name: matId, icon: '◆' };
    if (!Array.isArray(mats) && mats[matId]) return mats[matId];
    if (Array.isArray(mats)) {
      for (var i = 0; i < mats.length; i++) {
        if (mats[i].id === matId) return mats[i];
      }
    }
    return { id: matId, name: matId, icon: '◆' };
  }

  function getCharById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.CHAR_BY_ID && HS.Data.CHAR_BY_ID[id]) return HS.Data.CHAR_BY_ID[id];
    var list = HS.Data.CHARACTERS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getEnemyById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.ENEMY_BY_ID && HS.Data.ENEMY_BY_ID[id]) return HS.Data.ENEMY_BY_ID[id];
    var list = HS.Data.ALL_ENEMIES || (Array.isArray(HS.Data.ENEMIES) ? HS.Data.ENEMIES : []);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getSetById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.EQUIP_SET_BY_ID && HS.Data.EQUIP_SET_BY_ID[id]) return HS.Data.EQUIP_SET_BY_ID[id];
    var list = HS.Data.EQUIP_SETS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getRelicById(id) {
    if (!id || !HS.Data) return null;
    if (HS.Data.RELIC_BY_ID && HS.Data.RELIC_BY_ID[id]) return HS.Data.RELIC_BY_ID[id];
    var list = HS.Data.RELICS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function findStageInfo(stageId) {
    var areas = (HS.Data && Array.isArray(HS.Data.AREAS)) ? HS.Data.AREAS : [];
    for (var i = 0; i < areas.length; i++) {
      var stages = areas[i].stages || [];
      for (var j = 0; j < stages.length; j++) {
        if (stages[j].id === stageId) return { area: areas[i], stage: stages[j], areaIdx: i, stageIdx: j };
      }
    }
    if (areas[0] && areas[0].stages && areas[0].stages[0]) {
      return { area: areas[0], stage: areas[0].stages[0], areaIdx: 0, stageIdx: 0 };
    }
    return null;
  }

  function findTowerFloor(floorNum) {
    var list = (HS.Data && Array.isArray(HS.Data.TOWER_FLOORS)) ? HS.Data.TOWER_FLOORS : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].floor === floorNum || list[i].id === floorNum || String(list[i].floor) === String(floorNum)) {
        return list[i];
      }
    }
    return null;
  }

  function getTowerRuleLabel(bState) {
    var fl = findTowerFloor(bState.targetId);
    if (fl) {
      if (fl.ruleName) return fl.ruleName;
      if (fl.ruleTitle) return fl.ruleTitle;
      if (fl.rule) return typeof fl.rule === 'string' ? fl.rule : (fl.rule.name || '');
    }
    var tr = bState.towerRule;
    if (!tr || typeof tr !== 'object') return '';
    if (tr.label || tr.name) return tr.label || tr.name;
    if (tr.elementBoost) return elMeta(tr.elementBoost).name + '強化';
    if (tr.raceBoost) return raceMeta(tr.raceBoost).name + '強化';
    if (tr.critSurge) return '会心激化';
    if (tr.shieldStart) return '開幕障壁';
    if (tr.healBoost) return '回復強化';
    if (tr.ailmentAmp) return '異常拡大';
    if (tr.speedShift) return '速度変動';
    return '特殊戦場';
  }

  function getQualityTierClass(q) {
    var tier = (HS.Utils && HS.Utils.getQualityTier) ? HS.Utils.getQualityTier(q) : null;
    if (tier && tier.id) return 'q-' + tier.id;
    if (q >= 100) return 'q-max';
    if (q >= 90) return 'q-s';
    if (q >= 70) return 'q-a';
    if (q >= 40) return 'q-b';
    return 'q-c';
  }

  function getQualityBadgeText(q) {
    if (q >= 100) return '👑極100';
    return '品' + q;
  }

  function raceIconsText(races) {
    if (!Array.isArray(races) || !races.length) return '';
    var s = '';
    for (var i = 0; i < races.length; i++) s += raceMeta(races[i]).icon;
    return s;
  }

  function getShortLinkPassive(roleId) {
    if (roleId === 'tank') return '盾15%・防+12%';
    if (roleId === 'dealer') return '攻+12%・追撃15%';
    if (roleId === 'supporter') return '初動+25%・速+10%';
    if (roleId === 'healer') return 'W回復15%・耐+15%';
    return '加護発動';
  }

  function h(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function isBattleRunningPhase(phase) {
    return phase === 'fighting' || phase === 'wave_transition' || phase === 'repeat_delay';
  }

  function getBattlePhaseCategory(bState) {
    if (bState.active || isBattleRunningPhase(bState.phase)) return 'active';
    if (bState.phase === 'repeat_result' && bState.repeatSummary) return 'repeat_result';
    if (bState.phase === 'result' && bState.result) return 'result';
    return 'idle';
  }

  // =========================================================================
  // UPPER 50% (Strictly Read-Only — ZERO interactive elements, ZERO scroll!)
  // =========================================================================

  function makeStatItem(k, v) {
    var item = h('div', 'unit-stat-item');
    item.appendChild(h('span', 'unit-stat-k', k));
    item.appendChild(h('span', 'tnum', v));
    return item;
  }

  function renderUpperIdle() {
    upperEl.textContent = '';
    stageRefs = null;
    unitCardRefs = {};
    lastTurnSig = '';

    var s = HS.State.get();
    var info = findStageInfo(s.progress.selectedStageId);
    var stageWorld = (info && (info.stage.world || info.area.world)) || 'frontier';
    if (HS.Anim) HS.Anim.setWorldTheme(stageWorld);

    var wrap = h('div', 'standby-stage');

    // 1. Selected Target Stage Briefing Card (Rich, Zero Empty Void)
    var targetCard = h('div', 'standby-target-card');
    var topRow = h('div', 'row-between');
    var leftIdent = h('div', 'row');
    var worldInfo = (HS.Data && HS.Data.WORLDS_META && HS.Data.WORLDS_META[stageWorld]) || { name: '境界平原', emblem: '⚜️' };
    leftIdent.appendChild(h('span', 'world-emblem', worldInfo.emblem || '⚜️'));
    var titleText = info
      ? ((info.stage.code ? (info.stage.code + ' ') : '') + info.stage.name)
      : '冒険ステージ';
    leftIdent.appendChild(h('span', 'battle-stage-name', titleText));
    topRow.appendChild(leftIdent);

    var tagsRight = h('div', 'battle-meta-tags');
    tagsRight.appendChild(h('span', 'wave-pill', '全' + ((info && info.stage.waves) || 5) + 'WAVE'));
    tagsRight.appendChild(h('span', 'tag tag-danger', '乱入あり'));
    topRow.appendChild(tagsRight);
    targetCard.appendChild(topRow);

    var subRow = h('div', 'row-wrap');
    if (info) {
      var bossDef = getEnemyById(info.stage.bossId || info.area.bossId);
      if (bossDef) {
        subRow.appendChild(h('span', 'tag tag-gold', '👑' + elMeta(bossDef.element).icon + bossDef.name));
      }
    }
    var dropSetIds = (info && (info.stage.dropSets || info.stage.dropSetIds || info.area.dropSets || info.area.dropSetIds)) || [];
    for (var ds = 0; ds < Math.min(2, dropSetIds.length); ds++) {
      var setObj = getSetById(dropSetIds[ds]);
      if (setObj) subRow.appendChild(h('span', 'tag', '装備:' + setObj.name));
    }
    if (info && !s.progress.clearedStages[info.stage.id]) {
      var fc = info.stage.firstClear || info.stage.firstClearReward || {};
      var fcCharId = fc.unlockCharId || fc.charId || info.stage.firstClearCharId;
      var fcRelicId = fc.unlockRelicId || fc.relicId || info.stage.firstClearRelicId;
      if (fcCharId) {
        var fch = getCharById(fcCharId);
        if (fch) subRow.appendChild(h('span', 'tag tag-gold', '初回加入:' + fch.name));
      } else if (fcRelicId) {
        var frel = getRelicById(fcRelicId);
        if (frel) subRow.appendChild(h('span', 'tag tag-gold', '初回遺物:' + frel.name));
      } else {
        subRow.appendChild(h('span', 'tag tag-accent', '初回報酬あり'));
      }
    } else if (info) {
      subRow.appendChild(h('span', 'tag tag-good', '制覇済'));
    }
    targetCard.appendChild(subRow);
    wrap.appendChild(targetCard);

    // 2. High-Density 4 Deployed Frontline Heroes + Paired 1-to-1 控えリンク
    var partySummary = HS.Calc.calcPartySummary(s.party, s.links);
    var grid = h('div', 'standby-party-grid');
    for (var i = 0; i < 4; i++) {
      var cid = s.party[i];
      var lid = s.links[i];
      var card = h('div', 'standby-unit');

      if (!cid) {
        card.appendChild(h('div', 'unit-head', '枠' + (i + 1)));
        card.appendChild(h('div', 'unit-name', '未編成'));
        card.appendChild(h('div', 'standby-link-chip', '編成で出撃枠を設定'));
        grid.appendChild(card);
        continue;
      }

      var ch = getCharById(cid);
      var uStats = partySummary.units[i];
      if (ch) {
        card.setAttribute('data-role', ch.role);
        card.setAttribute('data-element', ch.element);
      }

      // Row A: Element + Race + Role Head
      var head = h('div', 'unit-head');
      head.appendChild(h('span', 'unit-el-race', elMeta(ch ? ch.element : 'none').icon + raceIconsText(ch ? ch.races : [])));
      var rm = roleMeta(ch ? ch.role : 'dealer');
      head.appendChild(h('span', 'unit-role-tag', rm.short || rm.name.slice(0, 1)));
      card.appendChild(head);

      // Row B: Title + Full Name
      if (ch && ch.title) {
        card.appendChild(h('div', 'unit-title-mini', ch.title));
      }
      card.appendChild(h('div', 'unit-name', ch ? ch.name : cid));

      // Row C: Clean Non-Colliding Key Stats (HP / 攻 / 防 / 速)
      if (uStats) {
        var statGrid = h('div', 'unit-stat-grid');
        var hpItem = makeStatItem('HP', fmt(uStats.hp));
        hpItem.classList.add('is-hp');
        statGrid.appendChild(hpItem);
        statGrid.appendChild(makeStatItem('攻', fmt(uStats.atk)));
        statGrid.appendChild(makeStatItem('防', fmt(uStats.def)));
        statGrid.appendChild(makeStatItem('速', String(uStats.spd)));
        card.appendChild(statGrid);

        // Row D: Active Set / Resonance / Power Meta Line
        var metaLine = h('div', 'unit-meta-line');
        var setTagText = '';
        var sets = uStats.activeSets || [];
        for (var st = 0; st < sets.length; st++) {
          if (sets[st].active4 || sets[st].active2) {
            var sn = (sets[st].set && (sets[st].set.shortName || sets[st].set.name)) || 'セット';
            setTagText = sn + (sets[st].active4 ? '(4)' : '(2)');
            break;
          }
        }
        if (!setTagText) {
          var eqCnt = 0;
          var eqMap = uStats.resolvedEquip || {};
          ['weapon', 'armor', 'accessory', 'core'].forEach(function (sl) { if (eqMap[sl]) eqCnt++; });
          setTagText = '装' + eqCnt + '/4';
        }
        metaLine.appendChild(h('span', 'tnum', setTagText));
        metaLine.appendChild(h('span', 'tnum', '共鳴★' + (uStats.resonance || 0)));
        metaLine.appendChild(h('span', 'tnum', '力' + fmt(uStats.power)));
        card.appendChild(metaLine);
      }

      // Row E: Paired 1-to-1 控えリンク Card + Passive Summary
      var linkChip = h('div', 'standby-link-chip');
      if (lid) {
        var lch = getCharById(lid);
        var lrm = roleMeta(lch ? lch.role : 'dealer');
        var matchStar = (uStats && uStats.linkInfo && (uStats.linkInfo.sameElement || (uStats.linkInfo.sharedRaces && uStats.linkInfo.sharedRaces.length > 0))) ? '★' : '';
        linkChip.appendChild(h('div', '', '🔗' + lrm.icon + (lch ? lch.name : lid) + matchStar));
        linkChip.appendChild(h('div', 'link-passive-mini', getShortLinkPassive(lch ? lch.role : '')));
      } else {
        linkChip.appendChild(h('div', '', '控え未設定'));
        linkChip.appendChild(h('div', 'link-passive-mini', '編成で追加効果'));
      }
      card.appendChild(linkChip);
      grid.appendChild(card);
    }
    wrap.appendChild(grid);

    // 3. Active Synergies & World Relics Strip
    var synBar = h('div', 'synergy-strip');
    synBar.appendChild(h('span', 'tag tag-gold tnum', '総戦力 ' + fmt(partySummary.totalPower)));
    var activeSyns = (partySummary.synergies && partySummary.synergies.active) || [];
    var maxSynShow = 4;
    for (var sy = 0; sy < Math.min(maxSynShow, activeSyns.length); sy++) {
      synBar.appendChild(h('span', 'synergy-pill', activeSyns[sy].name));
    }
    if (activeSyns.length > maxSynShow) {
      synBar.appendChild(h('span', 'tag tag-accent', '+' + (activeSyns.length - maxSynShow)));
    }
    var eqRelics = (s.relics && s.relics.equipped) ? s.relics.equipped.filter(Boolean) : [];
    for (var rl = 0; rl < eqRelics.length; rl++) {
      var rObj = getRelicById(eqRelics[rl]);
      if (rObj) synBar.appendChild(h('span', 'tag', (rObj.icon || '✦') + rObj.name));
    }
    wrap.appendChild(synBar);

    upperEl.appendChild(wrap);
  }

  function formatUnitHpLabel(unit) {
    if (unit.shield > 0) {
      return fmt(unit.hp);
    }
    return fmt(unit.hp) + '/' + fmt(unit.maxHp);
  }

  function buildUnitCard(unit, bState) {
    var card = h('div', 'unit-card ' + (unit.side === 'ally' ? 'is-ally' : 'is-enemy'));
    card.setAttribute('data-element', unit.element || 'none');
    card.setAttribute('data-role', unit.role || 'dealer');

    if (unit.side === 'enemy') {
      if (bState.mode === 'superboss') card.classList.add('is-superboss');
      else if (unit.isIntruder) card.classList.add('is-intruder');
      else if (unit.isBoss) card.classList.add('is-boss');
    }
    if (unit.hp <= 0) card.classList.add('is-dead');

    // Row 1: Head (Element + Race + Role/Boss/Intruder badge)
    var head = h('div', 'unit-head');
    head.appendChild(h('span', 'unit-el-race', elMeta(unit.element).icon + raceIconsText(unit.races)));
    if (unit.side === 'enemy' && bState.mode === 'superboss') {
      head.appendChild(h('span', 'unit-boss-tag', '👑超BOSS'));
    } else if (unit.side === 'enemy' && unit.isIntruder) {
      head.appendChild(h('span', 'unit-intruder-tag', unit.isBoss ? '⚠乱入長' : '⚠乱入'));
    } else if (unit.side === 'enemy' && unit.isBoss) {
      head.appendChild(h('span', 'unit-boss-tag', '👑BOSS'));
    } else {
      var rm = roleMeta(unit.role);
      head.appendChild(h('span', 'unit-role-tag', rm.short || rm.name.slice(0, 1)));
    }
    card.appendChild(head);

    // Row 2: Full Name (ZERO ellipsis!)
    card.appendChild(h('div', 'unit-name', unit.name));

    // Row 3: HP + Shield Text & GPU ScaleX Track
    var hpWrap = h('div', 'unit-hp-wrap');
    var hpText = h('div', 'unit-hp-text');
    var initHpStr = formatUnitHpLabel(unit);
    var initShStr = unit.shield > 0 ? ('🛡' + fmt(unit.shield)) : '';
    var hpNumEl = h('span', 'tnum', initHpStr);
    var shieldNumEl = h('span', 'unit-shield-num tnum', initShStr);
    hpText.appendChild(hpNumEl);
    hpText.appendChild(shieldNumEl);
    hpWrap.appendChild(hpText);

    var hpTrack = h('div', 'gauge-track');
    var hpDelayEl = h('div', 'gauge-delay');
    var hpFillEl = h('div', 'gauge-fill');
    var shieldFillEl = h('div', 'shield-fill');
    hpTrack.appendChild(hpDelayEl);
    hpTrack.appendChild(hpFillEl);
    hpTrack.appendChild(shieldFillEl);
    hpWrap.appendChild(hpTrack);
    card.appendChild(hpWrap);

    // Row 4: ATB Gauge (GPU ScaleX)
    var atbTrack = h('div', 'atb-track');
    var atbFillEl = h('div', 'atb-fill');
    atbTrack.appendChild(atbFillEl);
    card.appendChild(atbTrack);

    // Row 5: Last / Active Skill Indicator
    var skillEl = h('div', 'unit-skill', '待機中');
    card.appendChild(skillEl);

    // Row 6: Fixed-Height Buff / Debuff / Ailment Row (Max 2 chips + +N, ZERO slice!)
    var buffsEl = h('div', 'unit-buffs');
    card.appendChild(buffsEl);

    var ref = {
      uid: unit.uid,
      card: card,
      hpFill: hpFillEl,
      hpDelay: hpDelayEl,
      shieldFill: shieldFillEl,
      hpNum: hpNumEl,
      shieldNum: shieldNumEl,
      atbFill: atbFillEl,
      skillEl: skillEl,
      buffsEl: buffsEl,
      lastHpText: initHpStr,
      lastShieldText: initShStr,
      lastBuffSig: '',
      lastDead: unit.hp <= 0,
      lastActing: false,
      lastSkillText: '待機中'
    };

    var hpRatio = unit.maxHp > 0 ? (unit.hp / unit.maxHp) : 0;
    var shRatio = unit.maxHp > 0 ? Math.min(1, (unit.shield || 0) / unit.maxHp) : 0;
    var atbRatio = Math.min(1, (unit.gauge || 0) / (HS.Battle.GAUGE_MAX || 1000));
    if (HS.Anim) {
      HS.Anim.setHpGauge(hpFillEl, hpDelayEl, hpRatio);
      HS.Anim.setGauge(shieldFillEl, shRatio);
      HS.Anim.setGauge(atbFillEl, atbRatio);
    }
    syncUnitBuffs(ref, unit);
    unitCardRefs[unit.uid] = ref;
    return card;
  }

  /**
   * Buff row layout guaranteeing ZERO horizontal slice on 375px/393px:
   * - 1..2 statuses: render 1..2 chips cleanly
   * - 3+ statuses: render 1 chip + '+N' overflow badge!
   */
  function syncUnitBuffs(ref, unit) {
    var statuses = unit.statuses || [];
    var sig = '';
    for (var i = 0; i < statuses.length; i++) {
      sig += statuses[i].id + ':' + statuses[i].turns + ';';
    }
    if (sig === ref.lastBuffSig) return;
    ref.lastBuffSig = sig;
    ref.buffsEl.textContent = '';

    var shown = statuses.length >= 3 ? 1 : statuses.length;
    for (var j = 0; j < shown; j++) {
      var st = statuses[j];
      var sm = statusMeta(st.id);
      var cls = st.kind === 'buff' ? 'is-buff' : (st.kind === 'debuff' ? 'is-debuff' : 'is-ailment');
      ref.buffsEl.appendChild(h('span', 'buff-chip ' + cls, (sm.short || sm.icon) + st.turns));
    }
    if (statuses.length > shown) {
      ref.buffsEl.appendChild(h('span', 'buff-more', '+' + (statuses.length - shown)));
    }
  }

  function renderUpperActiveBattle() {
    upperEl.textContent = '';
    unitCardRefs = {};
    lastTurnSig = '';

    var bState = HS.Battle.getState();
    if (HS.Anim) HS.Anim.setWorldTheme(bState.world || 'frontier');

    var stage = h('div', 'battle-stage');

    // Row 1: Compact Battle Info Bar
    var metaBar = h('div', 'battle-meta-bar');
    var stageNameEl = h('div', 'battle-stage-name', bState.title || '戦闘中');
    var metaTagsEl = h('div', 'battle-meta-tags');
    metaBar.appendChild(stageNameEl);
    metaBar.appendChild(metaTagsEl);
    stage.appendChild(metaBar);

    // Row 2: Turn-Order Timeline Bar (Fixed 5-slot equal grid — ZERO right-edge clip!)
    var turnBar = h('div', 'turn-order-bar');
    turnBar.appendChild(h('span', 'turn-order-label', '行動順'));
    var turnTrackEl = h('div', 'turn-track');
    turnBar.appendChild(turnTrackEl);
    stage.appendChild(turnBar);

    // Row 3: Enemy Row
    var enemyRowEl = h('div', 'unit-row enemy-row');
    stage.appendChild(enemyRowEl);

    // Row 4: Ally Row
    var allyRowEl = h('div', 'unit-row ally-row');
    stage.appendChild(allyRowEl);

    upperEl.appendChild(stage);

    stageRefs = {
      stageEl: stage,
      stageNameEl: stageNameEl,
      metaTagsEl: metaTagsEl,
      turnTrackEl: turnTrackEl,
      enemyRowEl: enemyRowEl,
      allyRowEl: allyRowEl
    };

    rebuildBattleMeta(bState);
    rebuildEnemyCards(bState);
    rebuildAllyCards(bState);
    syncTurnOrder(bState);
  }

  function rebuildBattleMeta(bState) {
    if (!stageRefs) return;
    stageRefs.stageNameEl.textContent = bState.title || '戦闘中';
    stageRefs.metaTagsEl.textContent = '';

    if (bState.mode === 'superboss') {
      stageRefs.metaTagsEl.appendChild(h('span', 'wave-pill', '行動 ' + bState.totalActions + '/' + bState.maxActions));
      stageRefs.metaTagsEl.appendChild(h('span', 'tag tag-gold tnum', '計' + fmt(bState.superbossDamage)));
      if (bState.superbossBreaks > 0) {
        stageRefs.metaTagsEl.appendChild(h('span', 'tag tag-danger', 'BRK×' + bState.superbossBreaks));
      }
    } else if (bState.mode === 'relay') {
      stageRefs.metaTagsEl.appendChild(h('span', 'wave-pill', '第' + (bState.relayIndex + 1) + '部隊 P' + bState.relayBossPhase + '/3'));
    } else {
      stageRefs.metaTagsEl.appendChild(h('span', 'wave-pill', 'WAVE ' + bState.wave + '/' + bState.totalWaves));
    }

    if (bState.autoRepeat) {
      var repCls = 'repeat-pill' + (bState.stopAfterCurrent ? ' is-stopping' : '');
      var repText = bState.stopAfterCurrent ? ('停止予定 #' + bState.runCount) : ('周回 #' + bState.runCount);
      stageRefs.metaTagsEl.appendChild(h('span', repCls, repText));
    }

    if (bState.mode === 'tower' && bState.towerRule) {
      var ruleLbl = getTowerRuleLabel(bState);
      if (ruleLbl) stageRefs.metaTagsEl.appendChild(h('span', 'rule-pill', ruleLbl));
    }
  }

  function rebuildEnemyCards(bState) {
    if (!stageRefs) return;
    Object.keys(unitCardRefs).forEach(function (uid) {
      if (uid.indexOf('enemy_') === 0) delete unitCardRefs[uid];
    });
    stageRefs.enemyRowEl.textContent = '';
    var enemies = bState.enemies || [];
    stageRefs.enemyRowEl.setAttribute('data-count', String(enemies.length));
    for (var i = 0; i < enemies.length; i++) {
      stageRefs.enemyRowEl.appendChild(buildUnitCard(enemies[i], bState));
    }
  }

  function rebuildAllyCards(bState) {
    if (!stageRefs) return;
    Object.keys(unitCardRefs).forEach(function (uid) {
      if (uid.indexOf('ally_') === 0) delete unitCardRefs[uid];
    });
    stageRefs.allyRowEl.textContent = '';
    var allies = bState.allies || [];
    for (var i = 0; i < allies.length; i++) {
      stageRefs.allyRowEl.appendChild(buildUnitCard(allies[i], bState));
    }
  }

  /**
   * Fixed 4-slot equal-width turn-order timeline (ZERO right-edge token clipping on every screen!)
   */
  function syncTurnOrder(bState) {
    if (!stageRefs || !stageRefs.turnTrackEl) return;
    var MAX_TOKENS = 4;
    var preview = HS.Battle.getTurnOrderPreview(MAX_TOKENS);
    var tokens = [];

    if (bState.activeActorId && bState.actionLockTimer > 0) {
      var allUnits = (bState.allies || []).concat(bState.enemies || []);
      for (var a = 0; a < allUnits.length; a++) {
        if (allUnits[a] && allUnits[a].uid === bState.activeActorId && allUnits[a].hp > 0) {
          tokens.push({
            uid: allUnits[a].uid,
            name: allUnits[a].name,
            side: allUnits[a].side,
            element: allUnits[a].element,
            isBoss: allUnits[a].isBoss,
            isIntruder: allUnits[a].isIntruder,
            isNow: true
          });
          break;
        }
      }
    }

    for (var i = 0; i < preview.length && tokens.length < MAX_TOKENS; i++) {
      tokens.push({
        uid: preview[i].uid,
        name: preview[i].name,
        side: preview[i].side,
        element: preview[i].element,
        isBoss: preview[i].isBoss,
        isIntruder: preview[i].isIntruder,
        isNow: tokens.length === 0
      });
    }

    var sig = '';
    for (var k = 0; k < tokens.length; k++) {
      sig += tokens[k].uid + (tokens[k].isNow ? '!' : '') + '|';
    }
    if (sig === lastTurnSig) return;
    lastTurnSig = sig;

    stageRefs.turnTrackEl.textContent = '';
    for (var t = 0; t < tokens.length; t++) {
      var tk = tokens[t];
      var cls = 'turn-token ' + (tk.side === 'ally' ? 'is-ally' : 'is-enemy');
      if (tk.isIntruder) cls += ' is-intruder';
      else if (tk.isBoss) cls += ' is-boss';
      if (tk.isNow) cls += ' is-now';
      // NEVER truncate unit names! For 6+ char names omit icon & tighten spacing to show FULL name cleanly.
      var tokenEl = h('span', cls);
      if (tk.name.length >= 6) {
        var nameSpan = h('span', '', tk.name);
        if (tk.name.length >= 8) {
          tokenEl.style.paddingLeft = '1px';
          tokenEl.style.paddingRight = '1px';
          nameSpan.style.letterSpacing = '-0.06em';
          nameSpan.style.display = 'inline-block';
          nameSpan.style.transform = 'scaleX(' + (tk.name.length >= 9 ? '0.82' : '0.9') + ')';
          nameSpan.style.transformOrigin = 'center center';
        } else if (tk.name.length === 7) {
          tokenEl.style.paddingLeft = '1px';
          tokenEl.style.paddingRight = '1px';
          nameSpan.style.letterSpacing = '-0.05em';
        } else {
          nameSpan.style.letterSpacing = '-0.03em';
        }
        tokenEl.appendChild(nameSpan);
      } else {
        tokenEl.textContent = elMeta(tk.element).icon + tk.name;
      }
      stageRefs.turnTrackEl.appendChild(tokenEl);
    }
  }

  var SKILL_NUM_BADGES = ['①', '②', '③'];

  function formatUnitSkillLabel(u, isDead, isActing) {
    if (isDead) return '戦闘不能';
    if (!u.lastSkillUsed) return '待機中';
    if (isActing) {
      var shortScope = CARD_SCOPE_SHORT[u.lastSkillUsed.target] || '単';
      return '[' + shortScope + ']' + u.lastSkillUsed.name;
    }
    var prefix = u.side === 'ally' ? (SKILL_NUM_BADGES[u.lastSkillUsed.idx || 0] || '①') : '';
    return prefix + u.lastSkillUsed.name;
  }

  function syncUnitStates(bState) {
    if (!stageRefs) return;
    var units = (bState.allies || []).concat(bState.enemies || []);
    var gaugeMax = HS.Battle.GAUGE_MAX || 1000;

    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var ref = unitCardRefs[u.uid];
      if (!ref) continue;

      var hpRatio = u.maxHp > 0 ? (u.hp / u.maxHp) : 0;
      var shRatio = u.maxHp > 0 ? Math.min(1, (u.shield || 0) / u.maxHp) : 0;
      var atbRatio = u.hp > 0 ? Math.min(1, (u.gauge || 0) / gaugeMax) : 0;

      if (HS.Anim) {
        HS.Anim.setHpGauge(ref.hpFill, ref.hpDelay, hpRatio);
        HS.Anim.setGauge(ref.shieldFill, shRatio);
        HS.Anim.setGauge(ref.atbFill, atbRatio);
      }

      var hpStr = formatUnitHpLabel(u);
      if (hpStr !== ref.lastHpText) {
        ref.lastHpText = hpStr;
        ref.hpNum.textContent = hpStr;
      }
      var shStr = u.shield > 0 ? ('🛡' + fmt(u.shield)) : '';
      if (shStr !== ref.lastShieldText) {
        ref.lastShieldText = shStr;
        ref.shieldNum.textContent = shStr;
      }

      var isDead = u.hp <= 0;
      if (isDead !== ref.lastDead) {
        ref.lastDead = isDead;
        ref.card.classList.toggle('is-dead', isDead);
      }
      var isActing = !isDead && bState.activeActorId === u.uid && bState.actionLockTimer > 0;
      if (isActing !== ref.lastActing) {
        ref.lastActing = isActing;
        ref.card.classList.toggle('is-acting', isActing);
      }

      var skillStr = formatUnitSkillLabel(u, isDead, isActing);
      if (skillStr !== ref.lastSkillText) {
        ref.lastSkillText = skillStr;
        ref.skillEl.textContent = skillStr;
      }

      syncUnitBuffs(ref, u);
    }
  }

  /**
   * Builds the integrated 4-Hero Mini DPS Contribution Bar section inside Result Boards.
   * Eliminates dead vertical void in Normal & Repeat Result views while making MVP pop!
   */
  function buildResultMiniDpsSection(dpsSnap, titleLabel) {
    var section = h('div', 'result-dps-section');
    var list = Array.isArray(dpsSnap) ? dpsSnap.slice() : [];
    list.sort(function (a, b) { return (b.dmgDealt || 0) - (a.dmgDealt || 0); });

    var totalDmg = 0;
    var maxDmg = 0;
    for (var i = 0; i < list.length; i++) {
      var v = list[i].dmgDealt || 0;
      totalDmg += v;
      if (v > maxDmg) maxDmg = v;
    }

    var head = h('div', 'result-section-title');
    head.appendChild(h('span', '', titleLabel || '⚔️ 与ダメージ貢献'));
    head.appendChild(h('span', 'tnum', '総計 ' + fmtExact(totalDmg)));
    section.appendChild(head);

    var rowsWrap = h('div', 'result-dps-list');
    var count = Math.min(4, list.length);
    for (var r = 0; r < count; r++) {
      var item = list[r];
      var dmg = item.dmgDealt || 0;
      var pct = totalDmg > 0 ? Math.round((dmg / totalDmg) * 100) : 0;
      var ratio = maxDmg > 0 ? (dmg / maxDmg) : 0;
      var isMvp = (r === 0 && dmg > 0);

      var row = h('div', 'result-dps-row' + (isMvp ? ' is-mvp' : ''));
      row.setAttribute('data-element', item.element || 'none');

      var namePrefix = isMvp ? '👑' : elMeta(item.element).icon;
      row.appendChild(h('span', 'result-dps-name', namePrefix + item.name));

      var track = h('div', 'dps-track');
      var fill = h('div', 'dps-fill');
      if (HS.Anim) HS.Anim.setGauge(fill, ratio);
      else fill.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      track.appendChild(fill);
      row.appendChild(track);

      row.appendChild(h('span', 'result-dps-num tnum', fmt(dmg) + ' ' + pct + '%'));
      rowsWrap.appendChild(row);
    }

    if (count === 0) {
      rowsWrap.appendChild(h('div', 'card-note', '与ダメージ記録なし'));
    }

    section.appendChild(rowsWrap);
    return section;
  }

  // Normal Result Board (通常リザルト — Single Battle, High-Density with Mini DPS + Loot Box!)
  function renderUpperNormalResult(bState) {
    upperEl.textContent = '';
    stageRefs = null;
    unitCardRefs = {};
    lastTurnSig = '';

    var res = bState.result;
    if (!res) {
      renderUpperIdle();
      return;
    }

    var board = h('div', 'result-board ' + (res.won ? 'is-victory' : 'is-defeat'));

    // 1. Banner
    var banner = h('div', 'result-banner');
    var headText = res.mode === 'superboss'
      ? '💥 超ボス計測完了！'
      : (res.won ? '🏆 勝利！' : '💀 敗北…');
    banner.appendChild(h('div', 'result-heading', headText));

    var rightTags = h('div', 'battle-meta-tags');
    if (res.firstClear) rightTags.appendChild(h('span', 'tag tag-gold', '初回クリア!'));
    if (res.isNewRecord) rightTags.appendChild(h('span', 'tag tag-gold', '新記録!'));
    rightTags.appendChild(h('span', 'tag', res.title || '戦闘結果'));
    banner.appendChild(rightTags);
    board.appendChild(banner);

    // 2. 3 KPI Cells
    var kpiGrid = h('div', 'result-kpi-grid');
    if (res.mode === 'superboss') {
      kpiGrid.appendChild(makeKpi('合計ダメージ', fmtExact(res.superbossDamage || 0)));
      kpiGrid.appendChild(makeKpi('BREAK回数', (res.superbossBreaks || 0) + '回'));
      kpiGrid.appendChild(makeKpi('獲得ゴールド', '+' + fmt(res.gold || 0) + 'G'));
    } else {
      kpiGrid.appendChild(makeKpi('行動手数', (res.totalActions || 0) + '手'));
      var goldVal = '+' + fmt((res.gold || 0) + (res.autoSoldGold || 0)) + 'G';
      var goldLabel = res.autoSoldCount > 0 ? ('ゴールド(売却+' + fmt(res.autoSoldGold) + ')') : '獲得ゴールド';
      kpiGrid.appendChild(makeKpi(goldLabel, goldVal));

      var keptCount = 0;
      var maxQCount = 0;
      var drops = res.drops || [];
      for (var d = 0; d < drops.length; d++) {
        if (!drops[d].autoSold) keptCount++;
        if (drops[d].isMaxQuality) maxQCount++;
      }
      var eqText = maxQCount > 0 ? ('残' + keptCount + ' / 👑極' + maxQCount) : ('残' + keptCount + ' / 売' + (res.autoSoldCount || 0));
      kpiGrid.appendChild(makeKpi('装備ドロップ', eqText));
    }
    board.appendChild(kpiGrid);

    // 3. Integrated 4-Hero Mini DPS Contribution Chart
    board.appendChild(buildResultMiniDpsSection(res.dpsSnapshot, '⚔️ 味方与ダメージ貢献'));

    // 4. Framed Loot & Drop Details Box (fills remaining height cleanly)
    var lootBox = h('div', 'result-loot-box');
    var lootHead = h('div', 'result-section-title');
    lootHead.appendChild(h('span', '', '🎁 獲得素材・装備ドロップ'));
    var lootSub = (res.intrudersDefeated && res.intrudersDefeated.length > 0)
      ? ('⚠ 乱入討伐 ×' + res.intrudersDefeated.length)
      : (res.won ? '戦利品' : '再戦ヒント');
    lootHead.appendChild(h('span', '', lootSub));
    lootBox.appendChild(lootHead);

    var lootWrap = h('div', 'result-loot-wrap');
    var matKeys = Object.keys(res.materials || {});
    for (var m = 0; m < matKeys.length; m++) {
      var mm = getMatMeta(matKeys[m]);
      lootWrap.appendChild(h('span', 'tag tag-accent', (mm.icon || '◆') + mm.name + ' ×' + fmt(res.materials[matKeys[m]])));
    }
    var resDrops = res.drops || [];
    for (var dr = 0; dr < resDrops.length; dr++) {
      var rec = resDrops[dr];
      var dName = (rec.def && rec.def.name) || rec.item.defId;
      var q = rec.item.quality;
      var qCls = getQualityTierClass(q);
      if (rec.autoSold) {
        lootWrap.appendChild(h('span', 'tag', dName + '(品' + q + ') 売却+' + rec.gold + 'G'));
      } else {
        lootWrap.appendChild(h('span', 'q-pill ' + qCls, dName + ' ' + getQualityBadgeText(q)));
      }
    }
    if (lootWrap.childNodes.length === 0) {
      lootWrap.appendChild(h('span', 'card-note', res.won ? '報酬を獲得しました' : '編成・控えリンク・ロールアビリティを見直して再挑戦！'));
    }
    lootBox.appendChild(lootWrap);
    board.appendChild(lootBox);

    // 5. Celebrations / Expedition Return Notice
    if (res.unlockedChars && res.unlockedChars.length > 0) {
      var cNames = res.unlockedChars.map(function (c) { return c.name; }).join('・');
      board.appendChild(h('div', 'result-notice', '🎉 新たな仲間が加入：' + cNames + '！'));
    }
    if (res.unlockedRelics && res.unlockedRelics.length > 0) {
      var rNames = res.unlockedRelics.map(function (r) { return r.name; }).join('・');
      board.appendChild(h('div', 'result-notice', '✨ 世界遺物を獲得：' + rNames + '！'));
    }
    if (res.expeditions && res.expeditions.length > 0) {
      var eSummary = res.expeditions.map(function (e) {
        return e.routeName + '(+' + fmt(e.gold) + 'G)';
      }).join(' / ');
      board.appendChild(h('div', 'result-notice', '🚩 別働隊が帰還：' + eSummary));
    }

    upperEl.appendChild(board);
  }

  // Repeat Result Board (周回リザルト — DISTINCT emerald summary with Cumulative Mini DPS!)
  function renderUpperRepeatResult(bState) {
    upperEl.textContent = '';
    stageRefs = null;
    unitCardRefs = {};
    lastTurnSig = '';

    var rs = bState.repeatSummary;
    if (!rs) {
      renderUpperIdle();
      return;
    }

    var board = h('div', 'result-board result-repeat');

    // 1. Banner
    var banner = h('div', 'result-banner');
    banner.appendChild(h('div', 'result-heading', '🔁 周回リザルト'));
    var reasonMap = {
      user_stop: '今回で停止',
      defeat: '敗北停止',
      retreat: '撤退終了'
    };
    var rightTags = h('div', 'battle-meta-tags');
    rightTags.appendChild(h('span', 'tag tag-good', reasonMap[rs.stoppedReason] || '周回完了'));
    rightTags.appendChild(h('span', 'tag', rs.title || '自動周回'));
    banner.appendChild(rightTags);
    board.appendChild(banner);

    // 2. 3 Top KPIs
    var winRate = rs.runs > 0 ? Math.round((rs.wins / rs.runs) * 100) : 0;
    var kpiGrid = h('div', 'result-kpi-grid');
    kpiGrid.appendChild(makeKpi('周回実績', rs.runs + '戦 (勝率' + winRate + '%)'));
    kpiGrid.appendChild(makeKpi('累計ゴールド', fmt((rs.totalGold || 0) + (rs.totalAutoSoldGold || 0)) + 'G'));
    kpiGrid.appendChild(makeKpi('装備残 / 極品', '残' + (rs.keptDrops ? rs.keptDrops.length : 0) + ' / 👑極' + (rs.maxQualityDrops ? rs.maxQualityDrops.length : 0)));
    board.appendChild(kpiGrid);

    // 3. Integrated Cumulative 4-Hero Mini DPS Contribution Chart
    board.appendChild(buildResultMiniDpsSection(rs.dpsSnapshot, '👑 周回累計 与ダメージ貢献'));

    // 4. Framed Cumulative Loot / Auto-Sell / Expedition Box
    var lootBox = h('div', 'result-loot-box');
    var lootHead = h('div', 'result-section-title');
    lootHead.appendChild(h('span', '', '🎁 周回累計の獲得素材・装備'));
    lootHead.appendChild(h('span', 'tnum', '自動売却 ' + (rs.totalAutoSold || 0) + '個 (+' + fmt(rs.totalAutoSoldGold || 0) + 'G)'));
    lootBox.appendChild(lootHead);

    var lootWrap = h('div', 'result-loot-wrap');
    if (rs.expeditionCompletions > 0) {
      lootWrap.appendChild(h('span', 'tag tag-good', '🚩 別働隊帰還 ×' + rs.expeditionCompletions));
    }
    if (rs.intrudersDefeated > 0) {
      lootWrap.appendChild(h('span', 'tag tag-danger', '⚠ 乱入討伐 ×' + rs.intrudersDefeated));
    }

    var matKeys = Object.keys(rs.materials || {});
    for (var m = 0; m < matKeys.length; m++) {
      var mm = getMatMeta(matKeys[m]);
      lootWrap.appendChild(h('span', 'tag tag-accent', (mm.icon || '◆') + mm.name + ' ×' + fmt(rs.materials[matKeys[m]])));
    }

    var maxDrops = rs.maxQualityDrops || [];
    for (var mq = 0; mq < Math.min(3, maxDrops.length); mq++) {
      var md = maxDrops[mq];
      lootWrap.appendChild(h('span', 'q-pill q-max', '👑極100 ' + ((md.def && md.def.name) || md.item.defId)));
    }
    if (rs.keptDrops && rs.keptDrops.length > 0) {
      var sortedKept = rs.keptDrops.slice()
        .filter(function (d) { return !d.isMaxQuality; })
        .sort(function (a, b) { return b.item.quality - a.item.quality; });
      for (var kd = 0; kd < Math.min(3, sortedKept.length); kd++) {
        var topD = sortedKept[kd];
        lootWrap.appendChild(h('span', 'q-pill ' + getQualityTierClass(topD.item.quality), ((topD.def && topD.def.name) || topD.item.defId) + ' ' + getQualityBadgeText(topD.item.quality)));
      }
    }
    lootBox.appendChild(lootWrap);
    board.appendChild(lootBox);

    if (rs.unlockedChars && rs.unlockedChars.length > 0) {
      var cn = rs.unlockedChars.map(function (c) { return c.name; }).join('・');
      board.appendChild(h('div', 'result-notice', '🎉 周回中に仲間加入：' + cn + '！'));
    }
    if (rs.unlockedRelics && rs.unlockedRelics.length > 0) {
      var rn = rs.unlockedRelics.map(function (r) { return r.name; }).join('・');
      board.appendChild(h('div', 'result-notice', '✨ 周回中に遺物獲得：' + rn + '！'));
    }

    upperEl.appendChild(board);
  }

  function makeKpi(label, val) {
    var box = h('div', 'result-kpi');
    box.appendChild(h('span', 'result-kpi-label', label));
    box.appendChild(h('span', 'result-kpi-val tnum', val));
    return box;
  }

  function renderUpper() {
    if (!mounted || !upperEl) return;
    var bState = HS.Battle.getState();
    var phaseCat = getBattlePhaseCategory(bState);
    renderedPhase = phaseCat;

    if (phaseCat === 'active') {
      renderUpperActiveBattle();
    } else if (phaseCat === 'repeat_result') {
      renderUpperRepeatResult(bState);
    } else if (phaseCat === 'result') {
      renderUpperNormalResult(bState);
    } else {
      renderUpperIdle();
    }
  }

  // =========================================================================
  // LOWER 50% (ALL Interactive Controls: Sub-tabs, Log, DPS, Tactics, Context Bar)
  // =========================================================================

  function renderLowerShell() {
    if (!mounted || !lowerEl) return;
    lowerEl.textContent = '';

    var tabsBar = h('div', 'sub-tabs');
    var tabs = [
      { id: 'log',     label: '📜 行動ログ' },
      { id: 'dps',     label: '📊 戦果DPS' },
      { id: 'tactics', label: '🧭 戦況・編成' }
    ];
    var tabBtns = {};
    for (var i = 0; i < tabs.length; i++) {
      (function (t) {
        var btn = h('button', 'sub-tab' + (activeSubTab === t.id ? ' is-active' : ''), t.label);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          if (activeSubTab === t.id) return;
          activeSubTab = t.id;
          updateSubTabButtons();
          renderLowerContent();
          renderContextBar();
        });
        tabBtns[t.id] = btn;
        tabsBar.appendChild(btn);
      })(tabs[i]);
    }
    lowerEl.appendChild(tabsBar);

    var contentSlot = h('div', 'col grow');
    lowerEl.appendChild(contentSlot);

    lowerRefs = {
      tabBtns: tabBtns,
      contentSlot: contentSlot,
      logScrollBody: null,
      logInner: null,
      logJumpBar: null,
      dpsRefs: null
    };

    renderLowerContent();
  }

  function updateSubTabButtons() {
    if (!lowerRefs || !lowerRefs.tabBtns) return;
    Object.keys(lowerRefs.tabBtns).forEach(function (id) {
      lowerRefs.tabBtns[id].classList.toggle('is-active', activeSubTab === id);
    });
  }

  function renderLowerContent() {
    if (!lowerRefs || !lowerRefs.contentSlot) return;
    lowerRefs.contentSlot.textContent = '';
    lowerRefs.logScrollBody = null;
    lowerRefs.logInner = null;
    lowerRefs.logJumpBar = null;
    lowerRefs.dpsRefs = null;

    if (activeSubTab === 'log') {
      buildLogPanel(lowerRefs.contentSlot);
    } else if (activeSubTab === 'dps') {
      buildDpsPanel(lowerRefs.contentSlot);
    } else {
      buildTacticsPanel(lowerRefs.contentSlot);
    }
  }

  // --- Sub-View 1: Battle Log (Top-aligned forward flex + Dedicated non-overlapping jump footer!) ---
  function mapLogRowClass(entry) {
    var k = entry.kind || 'action';
    if (k === 'wave' || k === 'system') return 'log-wave';
    if (k === 'intruder') return 'log-intruder';
    if (k === 'heal') return 'log-heal';
    if (k === 'drop') return 'log-drop';
    if (k === 'maxq') return 'log-max';
    if (k === 'autosell') return 'log-sell';
    if (k === 'expedition') return 'log-exp';
    if (entry.text && entry.text.indexOf('会心!') !== -1) return 'log-crit';
    if (entry.tag === '決着' || entry.tag === '妨害') return 'log-ko';
    return '';
  }

  function createLogRowNode(entry) {
    var extraCls = mapLogRowClass(entry);
    var row = h('div', 'log-row' + (extraCls ? ' ' + extraCls : ''));
    row.appendChild(h('span', 'log-tag', entry.tag || '行動'));
    row.appendChild(h('span', 'log-msg', entry.text || ''));
    return row;
  }

  function buildLogPanel(container) {
    var frame = h('div', 'scroll-frame log-frame');
    var scrollBody = h('div', 'scroll-body log-list');
    var scrollInner = h('div', 'scroll-inner log-inner');
    scrollBody.appendChild(scrollInner);
    frame.appendChild(scrollBody);

    // Dedicated footer strip keeps jump pill strictly OUTSIDE log text (zero text overlap!)
    var jumpBar = h('div', 'log-jump-bar hidden');
    var jumpBtn = h('button', 'log-jump-btn', '▼ 最新ログへ移動');
    jumpBtn.type = 'button';
    jumpBtn.addEventListener('click', function () {
      logNearBottom = true;
      scrollBody.scrollTop = scrollBody.scrollHeight;
      jumpBar.classList.add('hidden');
    });
    jumpBar.appendChild(jumpBtn);
    frame.appendChild(jumpBar);

    scrollBody.addEventListener('scroll', function () {
      var dist = scrollBody.scrollHeight - scrollBody.scrollTop - scrollBody.clientHeight;
      logNearBottom = dist <= 28;
      jumpBar.classList.toggle('hidden', logNearBottom);
    }, { passive: true });

    container.appendChild(frame);

    lowerRefs.logScrollBody = scrollBody;
    lowerRefs.logInner = scrollInner;
    lowerRefs.logJumpBar = jumpBar;
    lastRenderedLogId = 0;
    logNearBottom = true;

    syncLogs(true);
  }

  function syncLogs(forceRebuild) {
    if (!lowerRefs || !lowerRefs.logInner || !lowerRefs.logScrollBody) return;
    var bState = HS.Battle.getState();
    var logs = bState.logs || [];

    if (forceRebuild || logs.length === 0 || (lastRenderedLogId > 0 && logs[0].id > lastRenderedLogId)) {
      lowerRefs.logInner.textContent = '';
      lastRenderedLogId = 0;
    }

    if (logs.length === 0) {
      lowerRefs.logInner.appendChild(h('div', 'empty-state', '出撃すると行動やドロップの記録がここに流れます'));
      return;
    }

    if (lowerRefs.logInner.firstChild && lowerRefs.logInner.firstChild.className === 'empty-state') {
      lowerRefs.logInner.textContent = '';
    }

    var appended = false;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < logs.length; i++) {
      if (logs[i].id > lastRenderedLogId) {
        frag.appendChild(createLogRowNode(logs[i]));
        lastRenderedLogId = logs[i].id;
        appended = true;
      }
    }

    if (appended) {
      lowerRefs.logInner.appendChild(frag);
      while (lowerRefs.logInner.childNodes.length > 100) {
        lowerRefs.logInner.removeChild(lowerRefs.logInner.firstChild);
      }
      if (logNearBottom) {
        lowerRefs.logScrollBody.scrollTop = lowerRefs.logScrollBody.scrollHeight;
        if (lowerRefs.logJumpBar) lowerRefs.logJumpBar.classList.add('hidden');
      } else if (lowerRefs.logJumpBar) {
        lowerRefs.logJumpBar.classList.remove('hidden');
      }
    }
  }

  // --- Sub-View 2: DPS Meter (Compact 1-Line Horizontal Grid — ZERO Crush on SE+SafeArea!) ---
  function buildDpsPanel(container) {
    var panel = h('div', 'dps-panel');

    var metricBar = h('div', 'dps-metric-bar');
    var metricBtns = {};
    for (var i = 0; i < DPS_METRICS.length; i++) {
      (function (m) {
        var btn = h('button', 'dps-metric-btn' + (activeDpsMetric === m.id ? ' is-active' : ''), m.label);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          activeDpsMetric = m.id;
          Object.keys(metricBtns).forEach(function (k) {
            metricBtns[k].classList.toggle('is-active', k === activeDpsMetric);
          });
          syncDpsPanel();
        });
        metricBtns[m.id] = btn;
        metricBar.appendChild(btn);
      })(DPS_METRICS[i]);
    }
    panel.appendChild(metricBar);

    var header = h('div', 'dps-header');
    var titleEl = h('span', '', '与ダメ計測');
    var badgeEl = h('span', 'tag tnum', '合計 0');
    header.appendChild(titleEl);
    header.appendChild(badgeEl);
    panel.appendChild(header);

    var rowsWrap = h('div', 'dps-rows');
    var rowRefs = [];
    for (var r = 0; r < 4; r++) {
      var row = h('div', 'dps-row');
      var top = h('div', 'dps-row-top');
      var nameEl = h('span', '', '—');
      var rightWrap = h('span', '');
      var valEl = h('span', 'dps-val', '0');
      var pctEl = h('span', 'dps-pct', '0%');
      rightWrap.appendChild(valEl);
      rightWrap.appendChild(pctEl);
      top.appendChild(nameEl);
      top.appendChild(rightWrap);

      var track = h('div', 'dps-track');
      var fill = h('div', 'dps-fill');
      track.appendChild(fill);

      row.appendChild(top);
      row.appendChild(track);
      rowsWrap.appendChild(row);
      rowRefs.push({ row: row, nameEl: nameEl, valEl: valEl, pctEl: pctEl, fill: fill });
    }
    panel.appendChild(rowsWrap);
    container.appendChild(panel);

    lowerRefs.dpsRefs = {
      titleEl: titleEl,
      badgeEl: badgeEl,
      rows: rowRefs
    };

    syncDpsPanel();
  }

  function syncDpsPanel() {
    if (!lowerRefs || !lowerRefs.dpsRefs) return;
    var bState = HS.Battle.getState();
    var snap = (bState.phase === 'repeat_result' && bState.repeatSummary && bState.repeatSummary.dpsSnapshot)
      ? bState.repeatSummary.dpsSnapshot
      : ((bState.phase === 'result' && bState.result && bState.result.dpsSnapshot)
        ? bState.result.dpsSnapshot
        : HS.Battle.getDpsSnapshot());

    if (!snap || snap.length === 0) {
      var pIds = HS.State.get().party || [];
      snap = [];
      for (var p = 0; p < pIds.length; p++) {
        if (!pIds[p]) continue;
        var ch = getCharById(pIds[p]);
        if (!ch) continue;
        snap.push({
          charId: ch.id,
          name: ch.name,
          role: ch.role,
          element: ch.element,
          dmgDealt: 0, dmgTaken: 0, healDealt: 0, healTaken: 0
        });
      }
    }

    var sorted = snap.slice().sort(function (a, b) {
      return (b[activeDpsMetric] || 0) - (a[activeDpsMetric] || 0);
    });

    var total = 0;
    var maxVal = 0;
    for (var i = 0; i < sorted.length; i++) {
      var v = sorted[i][activeDpsMetric] || 0;
      total += v;
      if (v > maxVal) maxVal = v;
    }

    var metricLabel = '与ダメ';
    for (var m = 0; m < DPS_METRICS.length; m++) {
      if (DPS_METRICS[m].id === activeDpsMetric) { metricLabel = DPS_METRICS[m].label; break; }
    }

    var isRepeatCumul = Boolean(bState.autoRepeat || bState.phase === 'repeat_result');
    lowerRefs.dpsRefs.titleEl.textContent = metricLabel + (isRepeatCumul ? '（🔁 周回累計）' : '（現在戦）');
    lowerRefs.dpsRefs.badgeEl.className = isRepeatCumul ? 'tag tag-good tnum' : 'tag tnum';
    lowerRefs.dpsRefs.badgeEl.textContent = '合計 ' + fmtExact(total);

    for (var r = 0; r < 4; r++) {
      var ref = lowerRefs.dpsRefs.rows[r];
      var item = sorted[r];
      if (!item) {
        ref.row.style.opacity = '0.35';
        ref.nameEl.textContent = '—';
        ref.valEl.textContent = '0';
        ref.pctEl.textContent = '0%';
        if (HS.Anim) HS.Anim.setGauge(ref.fill, 0);
        continue;
      }
      ref.row.style.opacity = '1';
      ref.row.setAttribute('data-element', item.element || 'none');
      var val = item[activeDpsMetric] || 0;
      var pct = total > 0 ? Math.round((val / total) * 100) : 0;
      var ratio = maxVal > 0 ? (val / maxVal) : 0;
      ref.nameEl.textContent = elMeta(item.element).icon + item.name;
      ref.valEl.textContent = fmt(val);
      ref.pctEl.textContent = pct + '%';
      if (HS.Anim) HS.Anim.setGauge(ref.fill, ratio);
    }
  }

  // --- Sub-View 3: 戦況・編成 (2-Row Skill Preview prevents 1-char orphan wrap!) ---
  function makePreviewRow(title, badgeText, descText) {
    var row = h('div', 'skill-preview-row');
    var head = h('div', 'skill-preview-head');
    head.appendChild(h('span', 'skill-preview-name', title));
    if (badgeText) head.appendChild(h('span', 'tag', badgeText));
    row.appendChild(head);
    if (descText) row.appendChild(h('div', 'skill-preview-desc', descText));
    return row;
  }

  function buildTacticsPanel(container) {
    var frame = h('div', 'scroll-frame');
    var body = h('div', 'scroll-body');
    var inner = h('div', 'scroll-inner col');

    var s = HS.State.get();
    var bState = HS.Battle.getState();
    var synInfo = HS.Calc.calcPartySynergies(s.party, s.links);

    // 1. Active Synergies
    var synHead = h('div', 'row-between');
    synHead.appendChild(h('span', 'tag tag-accent', '発動中シナジー (' + synInfo.active.length + ')'));
    var eqRelics = (s.relics && s.relics.equipped) ? s.relics.equipped.filter(Boolean) : [];
    synHead.appendChild(h('span', 'tag', '世界遺物 ' + eqRelics.length + '/3'));
    inner.appendChild(synHead);

    if (synInfo.active.length > 0) {
      for (var i = 0; i < synInfo.active.length; i++) {
        var sy = synInfo.active[i];
        inner.appendChild(makePreviewRow(sy.name, '発動中', sy.desc || ''));
      }
    } else {
      inner.appendChild(h('div', 'card-note', '属性や種族を揃えると編成シナジーが発動します'));
    }

    // 2. Equipped World Relics
    if (eqRelics.length > 0) {
      inner.appendChild(h('div', 'tag tag-gold', '装備中の世界遺物'));
      for (var r = 0; r < eqRelics.length; r++) {
        var rel = getRelicById(eqRelics[r]);
        if (!rel) continue;
        inner.appendChild(makePreviewRow((rel.icon || '✦') + rel.name, '遺物', rel.desc || ''));
      }
    }

    // 3. Current Enemy Skills (or Stage Enemy Pool & Drops when Idle)
    inner.appendChild(h('div', 'tag tag-danger', bState.active ? '出現中の敵スキル' : '出撃先の出現敵・ドロップ'));
    if (bState.active && bState.enemies && bState.enemies.length > 0) {
      for (var e = 0; e < bState.enemies.length; e++) {
        var en = bState.enemies[e];
        var skNames = (en.skills || []).map(function (sk) {
          var scope = (HS.CONST && HS.CONST.TARGET_NAMES && HS.CONST.TARGET_NAMES[sk.target]) || '単体';
          return sk.name + '[' + scope + ']';
        }).join(' / ');
        inner.appendChild(makePreviewRow(elMeta(en.element).icon + en.name, en.isIntruder ? '乱入' : (en.isBoss ? 'BOSS' : ''), skNames));
      }
    } else {
      var stInfo = findStageInfo(s.progress.selectedStageId);
      if (stInfo) {
        var bossDef = getEnemyById(stInfo.stage.bossId || stInfo.area.bossId);
        if (bossDef) {
          var bossSk = (bossDef.skills || []).map(function (sk) { return sk.name; }).join(' / ');
          inner.appendChild(makePreviewRow('👑 ' + bossDef.name, elMeta(bossDef.element).name + ' / ' + raceIconsText(bossDef.races), bossSk || bossDef.lore || ''));
        }
        var pool = stInfo.stage.enemyPool || stInfo.area.enemyPool || [];
        var seenE = {};
        var names = [];
        for (var ep = 0; ep < pool.length; ep++) {
          if (seenE[pool[ep]]) continue;
          seenE[pool[ep]] = true;
          var eDef = getEnemyById(pool[ep]);
          if (eDef) names.push(elMeta(eDef.element).icon + eDef.name);
        }
        if (names.length) {
          inner.appendChild(makePreviewRow('出現エネミー', 'WAVE 1-4', names.join('・')));
        }
        var dropSets = stInfo.stage.dropSets || stInfo.stage.dropSetIds || stInfo.area.dropSets || stInfo.area.dropSetIds || [];
        var setNames = dropSets.map(function (sid) {
          var so = getSetById(sid);
          return so ? so.name : sid;
        });
        if (setNames.length) {
          inner.appendChild(makePreviewRow('装備ドロップ', '品質1-100', setNames.join(' / ')));
        }
      }
    }

    body.appendChild(inner);
    frame.appendChild(body);
    container.appendChild(frame);
  }

  // =========================================================================
  // #context-bar (Bottom Thumb Action Bar — Zero Redundant/Dead Buttons!)
  // =========================================================================

  function makeCtxBtn(label, cls, onClick, disabled) {
    var btn = h('button', 'btn ' + (cls || ''), label);
    btn.type = 'button';
    if (disabled) btn.disabled = true;
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }

  function openRetreatConfirmSheet() {
    if (!HS.UI.App || typeof HS.UI.App.openSheet !== 'function') {
      HS.Battle.retreat();
      return;
    }
    var bState = HS.Battle.getState();
    var isRepeat = bState.autoRepeat && bState.repeatStats && bState.repeatStats.runs > 0;
    HS.UI.App.openSheet({
      title: '戦闘から撤退しますか？',
      subtitle: bState.title || '',
      renderBody: function (body) {
        var msg = isRepeat
          ? '進行中の戦闘を中断し、これまでの周回戦果（' + bState.repeatStats.runs + '戦分）の周回リザルトを表示します。'
          : '進行中の戦闘を中断して待機状態に戻ります。現在戦の報酬は獲得できません。';
        body.appendChild(h('div', 'lore-box', msg));
        if (bState.autoRepeat && !bState.stopAfterCurrent) {
          body.appendChild(h('div', 'card-note', '※今の戦闘だけ終わらせたい場合は「今回で停止」をおすすめします。'));
        }
      },
      renderActions: function (actions) {
        actions.appendChild(makeCtxBtn('撤退する', 'btn-danger', function () {
          HS.UI.App.closeSheet();
          HS.Battle.retreat();
        }));
        if (bState.autoRepeat && !bState.stopAfterCurrent) {
          actions.appendChild(makeCtxBtn('今回で停止', 'btn-warn', function () {
            HS.Battle.requestStopAfterCurrent();
            HS.UI.App.closeSheet();
            if (HS.UI.App.showToast) HS.UI.App.showToast('今回終了後に自動周回を停止します', 'info');
          }));
        }
        actions.appendChild(makeCtxBtn('閉じる', 'btn-ghost', function () {
          HS.UI.App.closeSheet();
        }));
      }
    });
  }

  function renderContextBar() {
    if (!mounted || !ctxEl) return;
    ctxEl.textContent = '';

    var s = HS.State.get();
    var bState = HS.Battle.getState();
    var phaseCat = getBattlePhaseCategory(bState);

    if (phaseCat === 'active') {
      // Zero-waste active battle controls: [速度] [自動周回/今回で停止] [⚙自動売却] [撤退]
      var speed = s.settings.speed || 1;
      ctxEl.appendChild(makeCtxBtn('速度 ' + speed + 'x', speed > 1 ? 'btn-accent' : '', function () {
        var next = HS.State.cycleSpeed();
        if (HS.UI.App && HS.UI.App.showToast) HS.UI.App.showToast('戦闘速度 ' + next + 'x', 'info');
        renderContextBar();
      }));

      var canRepeat = (bState.mode === 'stage' || bState.mode === 'bounty');
      if (canRepeat) {
        if (bState.autoRepeat && !bState.stopAfterCurrent) {
          ctxEl.appendChild(makeCtxBtn('今回で停止', 'btn-warn', function () {
            HS.Battle.requestStopAfterCurrent();
            if (HS.UI.App && HS.UI.App.showToast) HS.UI.App.showToast('今回終了後に自動周回を停止します', 'info');
            rebuildBattleMeta(HS.Battle.getState());
            if (HS.UI.App && HS.UI.App.renderTopHud) HS.UI.App.renderTopHud();
            renderContextBar();
          }));
        } else if (bState.autoRepeat && bState.stopAfterCurrent) {
          ctxEl.appendChild(makeCtxBtn('停止予約済', 'btn-warn', function () {
            HS.Battle.setAutoRepeat(true);
            if (HS.UI.App && HS.UI.App.showToast) HS.UI.App.showToast('自動周回を再開しました', 'good');
            rebuildBattleMeta(HS.Battle.getState());
            if (HS.UI.App && HS.UI.App.renderTopHud) HS.UI.App.renderTopHud();
            renderContextBar();
          }));
        } else {
          ctxEl.appendChild(makeCtxBtn('自動周回 OFF', '', function () {
            HS.Battle.setAutoRepeat(true);
            if (HS.UI.App && HS.UI.App.showToast) HS.UI.App.showToast('自動周回をONにしました', 'good');
            rebuildBattleMeta(HS.Battle.getState());
            if (HS.UI.App && HS.UI.App.renderTopHud) HS.UI.App.renderTopHud();
            renderContextBar();
          }));
        }
      }

      ctxEl.appendChild(makeCtxBtn('⚙ 自動売却', '', function () {
        if (HS.UI.App && HS.UI.App.openAutoSellSheet) HS.UI.App.openAutoSellSheet();
      }));

      ctxEl.appendChild(makeCtxBtn('撤退', 'btn-danger', openRetreatConfirmSheet));
      return;
    }

    if (phaseCat === 'result') {
      var res = bState.result;
      ctxEl.appendChild(makeCtxBtn('もう一度', 'btn-primary', function () {
        HS.Battle.startBattle({ mode: res.mode, targetId: res.targetId, autoRepeat: false });
      }));

      if (res.mode === 'stage') {
        var nextId = HS.Battle.getNextStageId(res.targetId);
        var nextInfo = nextId ? findStageInfo(nextId) : null;
        var nextUnlocked = nextInfo ? HS.State.isStageUnlocked(nextInfo.area.id, nextInfo.stage.stageNum || (nextInfo.stageIdx + 1)) : false;
        if (nextId && nextUnlocked) {
          ctxEl.appendChild(makeCtxBtn('次のステージ', 'btn-success', function () {
            HS.Battle.startBattle({ mode: 'stage', targetId: nextId, autoRepeat: false });
          }));
        }
      } else if (res.mode === 'tower' && res.won) {
        var nextFloor = Number(res.targetId) + 1;
        if (findTowerFloor(nextFloor)) {
          ctxEl.appendChild(makeCtxBtn('次階 ' + nextFloor + 'F', 'btn-success', function () {
            HS.Battle.startBattle({ mode: 'tower', targetId: nextFloor, autoRepeat: false });
          }));
        }
      }

      if (res.mode === 'stage' || res.mode === 'bounty') {
        ctxEl.appendChild(makeCtxBtn('周回開始', 'btn-accent', function () {
          HS.Battle.startBattle({ mode: res.mode, targetId: res.targetId, autoRepeat: true });
        }));
      }

      ctxEl.appendChild(makeCtxBtn('閉じる', 'btn-ghost', function () {
        HS.Battle.closeResult();
      }));
      return;
    }

    if (phaseCat === 'repeat_result') {
      var rs = bState.repeatSummary;
      ctxEl.appendChild(makeCtxBtn('同じ周回を再開', 'btn-primary', function () {
        HS.Battle.startBattle({ mode: rs.mode, targetId: rs.targetId, autoRepeat: true });
      }));
      ctxEl.appendChild(makeCtxBtn('閉じる', 'btn-ghost', function () {
        HS.Battle.closeResult();
      }));
      return;
    }

    // Idle State Context Bar
    var selStageId = s.progress.selectedStageId;
    ctxEl.appendChild(makeCtxBtn('⚔️ 出撃する', 'btn-primary', function () {
      var r = HS.Battle.startBattle({ mode: 'stage', targetId: selStageId, autoRepeat: false });
      if (!r.ok && HS.UI.App && HS.UI.App.showToast) HS.UI.App.showToast(r.error, 'warn');
    }));
    ctxEl.appendChild(makeCtxBtn('🔁 自動周回', 'btn-accent', function () {
      var r = HS.Battle.startBattle({ mode: 'stage', targetId: selStageId, autoRepeat: true });
      if (!r.ok && HS.UI.App && HS.UI.App.showToast) HS.UI.App.showToast(r.error, 'warn');
    }));
    ctxEl.appendChild(makeCtxBtn('出撃先変更', '', function () {
      if (HS.UI.App && HS.UI.App.switchTab) HS.UI.App.switchTab('quest');
    }));
    ctxEl.appendChild(makeCtxBtn('自動売却', '', function () {
      if (HS.UI.App && HS.UI.App.openAutoSellSheet) HS.UI.App.openAutoSellSheet();
    }));
  }

  // =========================================================================
  // Battle Event & 60fps rAF Handlers
  // =========================================================================

  function onBattleAction(evt) {
    if (!mounted || !evt) return;
    var bState = HS.Battle.getState();

    if (bState.mode === 'superboss') {
      rebuildBattleMeta(bState);
    }

    syncUnitStates(bState);
    syncTurnOrder(bState);
    if (activeSubTab === 'dps') syncDpsPanel();

    if (!HS.Anim) return;

    if (evt.actor && evt.skill && !evt.skipped) {
      HS.Anim.showCutin({
        actorName: evt.actor.name,
        skillName: evt.skill.name,
        targetType: evt.skill.target,
        accentColor: elMeta(evt.actor.element).color,
        speed: HS.State.get().settings.speed || 1
      });
    }

    var hits = evt.hits || [];
    for (var i = 0; i < hits.length; i++) {
      var hit = hits[i];
      var ref = unitCardRefs[hit.targetUid];
      var cardEl = ref ? ref.card : null;
      if (hit.kind === 'damage') {
        var kind = hit.crit ? 'crit' : (hit.adv > 1.05 ? 'weak' : (hit.adv < 0.9 ? 'resist' : 'dmg'));
        var prefix = hit.followUp ? '追撃 ' : (hit.counter ? '反撃 ' : (hit.crit ? '★' : ''));
        var suffix = hit.adv > 1.05 ? '!' : '';
        HS.Anim.spawnPopup({
          text: prefix + fmt(hit.value) + suffix,
          targetEl: cardEl,
          kind: kind
        });
        if (cardEl) HS.Anim.triggerHitShake(cardEl);
      } else if (hit.kind === 'heal') {
        HS.Anim.spawnPopup({
          text: (hit.revive ? '蘇生 +' : '+') + fmt(hit.value),
          targetEl: cardEl,
          kind: 'heal'
        });
        if (cardEl) HS.Anim.triggerHealPulse(cardEl);
      } else if (hit.kind === 'shield') {
        HS.Anim.spawnPopup({
          text: '盾 +' + fmt(hit.value),
          targetEl: cardEl,
          kind: 'shield'
        });
      } else if (hit.kind === 'status' && hit.status) {
        var sm = statusMeta(hit.status);
        HS.Anim.spawnPopup({
          text: sm.short || sm.name,
          targetEl: cardEl,
          kind: 'status'
        });
      }
    }

    var dots = evt.dotEvents || [];
    for (var d = 0; d < dots.length; d++) {
      var de = dots[d];
      var dRef = unitCardRefs[de.targetUid];
      var dCard = dRef ? dRef.card : null;
      if (de.type === 'regen') {
        HS.Anim.spawnPopup({ text: '+' + fmt(de.value), targetEl: dCard, kind: 'heal' });
      } else {
        HS.Anim.spawnPopup({ text: '-' + fmt(de.value), targetEl: dCard, kind: 'status' });
        if (dCard) HS.Anim.triggerHitShake(dCard);
      }
    }
  }

  function onFrame() {
    if (!mounted) return;
    var bState = HS.Battle.getState();
    if (!bState.active || bState.phase !== 'fighting' || !stageRefs) return;

    var gaugeMax = HS.Battle.GAUGE_MAX || 1000;
    var units = (bState.allies || []).concat(bState.enemies || []);
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var ref = unitCardRefs[u.uid];
      if (!ref) continue;
      var atbRatio = u.hp > 0 ? Math.min(1, (u.gauge || 0) / gaugeMax) : 0;
      if (HS.Anim) HS.Anim.setGauge(ref.atbFill, atbRatio);
      var isActing = u.hp > 0 && bState.activeActorId === u.uid && bState.actionLockTimer > 0;
      if (isActing !== ref.lastActing) {
        ref.lastActing = isActing;
        ref.card.classList.toggle('is-acting', isActing);
        var nextSkillStr = formatUnitSkillLabel(u, u.hp <= 0, isActing);
        if (nextSkillStr !== ref.lastSkillText) {
          ref.lastSkillText = nextSkillStr;
          ref.skillEl.textContent = nextSkillStr;
        }
      }
    }
  }

  function bindSubscriptions() {
    unsubs.push(HS.Battle.subscribe('battle:start', function () {
      if (!mounted) return;
      if (HS.Anim) HS.Anim.clearFx();
      renderUpper();
      if (activeSubTab === 'log') syncLogs(true);
      else if (activeSubTab === 'dps') syncDpsPanel();
      else renderLowerContent();
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:wave', function () {
      if (!mounted) return;
      var bState = HS.Battle.getState();
      if (renderedPhase !== 'active') {
        renderUpper();
      } else {
        rebuildBattleMeta(bState);
        rebuildEnemyCards(bState);
        syncUnitStates(bState);
        syncTurnOrder(bState);
      }
      if (activeSubTab === 'tactics') renderLowerContent();
    }));

    unsubs.push(HS.Battle.subscribe('battle:intruder', function (evt) {
      if (!mounted) return;
      var bState = HS.Battle.getState();
      rebuildEnemyCards(bState);
      syncTurnOrder(bState);
      if (HS.Anim && evt && evt.intruder) {
        HS.Anim.showIntruderBanner(evt.intruder.name);
      }
      if (activeSubTab === 'tactics') renderLowerContent();
    }));

    unsubs.push(HS.Battle.subscribe('battle:relaySquad', function () {
      if (!mounted) return;
      var bState = HS.Battle.getState();
      rebuildBattleMeta(bState);
      rebuildAllyCards(bState);
      syncTurnOrder(bState);
      if (activeSubTab === 'dps') syncDpsPanel();
    }));

    unsubs.push(HS.Battle.subscribe('battle:action', onBattleAction));

    unsubs.push(HS.Battle.subscribe('battle:log', function () {
      if (!mounted) return;
      if (activeSubTab === 'log') syncLogs(false);
    }));

    unsubs.push(HS.Battle.subscribe('battle:repeatNext', function () {
      if (!mounted) return;
      var bState = HS.Battle.getState();
      if (HS.Anim) HS.Anim.clearFx();
      if (renderedPhase !== 'active') {
        renderUpper();
      } else {
        rebuildBattleMeta(bState);
        rebuildAllyCards(bState);
        rebuildEnemyCards(bState);
        syncTurnOrder(bState);
      }
      if (activeSubTab === 'dps') syncDpsPanel();
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:stopRequested', function () {
      if (!mounted) return;
      rebuildBattleMeta(HS.Battle.getState());
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:repeatToggled', function () {
      if (!mounted) return;
      rebuildBattleMeta(HS.Battle.getState());
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:complete', function () {
      if (!mounted) return;
      if (HS.Anim) HS.Anim.clearFx();
      renderUpper();
      if (activeSubTab === 'dps') syncDpsPanel();
      if (activeSubTab === 'log') syncLogs(false);
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:repeatComplete', function () {
      if (!mounted) return;
      if (HS.Anim) HS.Anim.clearFx();
      renderUpper();
      if (activeSubTab === 'dps') syncDpsPanel();
      if (activeSubTab === 'log') syncLogs(false);
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:retreat', function () {
      if (!mounted) return;
      if (HS.Anim) HS.Anim.clearFx();
      renderUpper();
      renderLowerContent();
      renderContextBar();
    }));

    unsubs.push(HS.Battle.subscribe('battle:idle', function () {
      if (!mounted) return;
      if (HS.Anim) HS.Anim.clearFx();
      renderUpper();
      renderLowerContent();
      renderContextBar();
    }));

    unsubs.push(HS.State.subscribe('party:change', function () {
      if (!mounted) return;
      if (getBattlePhaseCategory(HS.Battle.getState()) === 'idle') {
        renderUpper();
        renderLowerContent();
      }
    }));

    unsubs.push(HS.State.subscribe('progress:change', function () {
      if (!mounted) return;
      if (getBattlePhaseCategory(HS.Battle.getState()) === 'idle') {
        renderUpper();
        renderContextBar();
      }
    }));

    if (HS.Anim && typeof HS.Anim.addFrameListener === 'function') {
      HS.Anim.addFrameListener(onFrame);
    }
  }

  function clearSubscriptions() {
    for (var i = 0; i < unsubs.length; i++) {
      try { unsubs[i](); } catch (e) {}
    }
    unsubs.length = 0;
    if (HS.Anim && typeof HS.Anim.removeFrameListener === 'function') {
      HS.Anim.removeFrameListener(onFrame);
    }
  }

  var BattleView = {
    mount: function (uEl, lEl, cEl) {
      upperEl = uEl;
      lowerEl = lEl;
      ctxEl = cEl;
      mounted = true;
      renderedPhase = null;
      bindSubscriptions();
      BattleView.render();
    },

    unmount: function () {
      mounted = false;
      clearSubscriptions();
      stageRefs = null;
      unitCardRefs = {};
      lowerRefs = null;
      lastTurnSig = '';
      if (HS.Anim) HS.Anim.clearFx();
    },

    render: function () {
      if (!mounted) return;
      renderUpper();
      renderLowerShell();
      renderContextBar();
    }
  };

  HS.UI.BattleView = BattleView;
})(typeof window !== 'undefined' ? window : globalThis);
