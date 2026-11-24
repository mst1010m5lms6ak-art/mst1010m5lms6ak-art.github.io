(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const uiState = {
    mode: 'main',         // main | tower | raid | trial | chaos
    areaIndex: 1,
    stageNum: 1,
    towerTargetFloor: 1,
    raidIndex: 0,
    trialIndex: 0,
    chaosIndex: 0
  };

  function getSelectedStage() {
    const state = Hacha.state;
    if (uiState.mode === 'main') {
      const id = `area${uiState.areaIndex}_s${uiState.stageNum}`;
      return Hacha.data.STAGE_MAP[id] || Hacha.data.MAIN_STAGES[0];
    }
    if (uiState.mode === 'tower') {
      const maxF = Math.max(1, state.progress.towerFloor || 1);
      uiState.towerTargetFloor = U.clamp(uiState.towerTargetFloor || maxF, 1, maxF);
      return Hacha.data.buildTowerStage(uiState.towerTargetFloor);
    }
    if (uiState.mode === 'raid') {
      return Hacha.data.RAID_BOSSES[uiState.raidIndex] || Hacha.data.RAID_BOSSES[0];
    }
    if (uiState.mode === 'trial') {
      return Hacha.data.TRIAL_STAGES[uiState.trialIndex] || Hacha.data.TRIAL_STAGES[0];
    }
    return Hacha.data.CHAOS_RUSH_STAGES[uiState.chaosIndex] || Hacha.data.CHAOS_RUSH_STAGES[0];
  }

  function isMainStageUnlocked(areaIdx, stageNum) {
    if (areaIdx === 1 && stageNum === 1) return true;
    const cleared = Hacha.state.progress.clearedStages || {};
    if (stageNum > 1) return !!cleared[`area${areaIdx}_s${stageNum - 1}`];
    return !!cleared[`area${areaIdx - 1}_s10`];
  }

  function render(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const stage = getSelectedStage();
    const rule = Hacha.data.WORLD_RULES[stage.ruleId];
    const boss = Hacha.data.ENEMY_MAP[stage.bossId];
    const resInfo = Hacha.engine.stats.computeActiveResonances(state, state.party, state.links);
    const restrictCheck = Hacha.engine.stats.checkStageRestriction(state, stage);
    const mainUnlocked = stage.mode !== 'main' || isMainStageUnlocked(stage.areaIndex, stage.stageNum);
    const activeParty = state.party.filter(Boolean).map((id) => Hacha.data.CHARACTER_MAP[id]).filter(Boolean);

    const canStart = mainUnlocked && restrictCheck.ok && activeParty.length > 0;

    /* ==================== 上半分：閲覧専用プレビュー ==================== */
    const dropSamples = (stage.dropPool || []).slice(0, 3).map((eid) => {
      const eq = Hacha.data.EQUIPMENT_MAP[eid];
      return eq ? `${eq.icon}${eq.name}` : '';
    }).filter(Boolean).join('・');

    const resBadgesHtml = resInfo.active.length
      ? resInfo.active.slice(0, 4).map((r) => `<span class="badge race-badge">${r.icon}${r.name}</span>`).join('')
      : `<span class="badge el-none">共鳴なし</span>`;

    const partyHtml = state.party.map((cid, i) => {
      const c = cid ? Hacha.data.CHARACTER_MAP[cid] : null;
      const l = state.links[i] ? Hacha.data.CHARACTER_MAP[state.links[i]] : null;
      if (!c) {
        return `<div class="party-slot-card"><div class="bu-hp-text">空き枠</div></div>`;
      }
      const st = Hacha.engine.stats.computeSingleCharStats(state, cid, true);
      return `
        <div class="party-slot-card">
          <div class="meta-row-nowrap">
            <span>${c.icon}</span>
            ${cm.roleShortBadge(c.role)}
          </div>
          <div class="unit-name-full">${U.escapeHtml(c.name)}</div>
          <div class="bu-hp-text">戦力${U.formatNum(st.power)}</div>
          <div class="bu-hp-text" style="color:#c5a6ff;">${l ? `＋${l.name}` : '支援なし'}</div>
        </div>
      `;
    }).join('');

    topEl.innerHTML = `
      ${cm.renderViewHeader('はちゃめちゃ世界｜出撃')}
      <div class="panel panel-fill">
        <div class="meta-row-nowrap">
          <div class="view-title">${U.escapeHtml(stage.name)}</div>
          <span class="badge scope-area">${stage.waves} WAVE</span>
        </div>

        <div class="flavor-box">
          <strong>${rule ? `${rule.icon} ${rule.name}` : '世界法則'}</strong>：${U.escapeHtml(rule ? rule.summary : '')}
        </div>

        <div class="skill-mini-row">
          <div class="meta-row">
            <span class="badge scope-all">ボス</span>
            <span class="unit-name-full">${boss ? `${boss.icon}${U.escapeHtml(boss.name)}` : '不明'}</span>
            ${boss ? cm.elementBadge(boss.element) : ''}
            ${boss ? cm.raceBadges(boss.races) : ''}
          </div>
          <span class="bu-hp-text">品質${stage.minQuality || 30}%〜極</span>
        </div>

        <div class="skill-mini-row">
          <span class="skill-desc-line">戦利品：${U.escapeHtml(dropSamples || '高品質装備')} 他</span>
          <span class="bu-hp-text">🪙${stage.coins} 💎${stage.crystals}</span>
        </div>

        ${stage.restriction ? `
          <div class="skill-mini-row" style="border-color:${restrictCheck.ok ? 'rgba(68,230,154,0.5)' : 'rgba(255,93,120,0.65)'};">
            <span class="skill-desc-line" style="color:${restrictCheck.ok ? '#8dffca' : '#ff9eb2'};">
              ${restrictCheck.ok ? '✅ ' : '⚠️ '}${U.escapeHtml(restrictCheck.ok ? stage.restriction.label : restrictCheck.reason)}
            </span>
          </div>
        ` : (stage.recHint ? `
          <div class="skill-mini-row">
            <span class="skill-desc-line" style="color:#ffe066;">💡 攻略指標：${U.escapeHtml(stage.recHint)}</span>
          </div>
        ` : '')}

        <div class="meta-row" style="margin-top:auto;">
          <span class="bu-hp-text" style="color:#48d6ff;">発動共鳴(${resInfo.active.length})：</span>
          ${resBadgesHtml}
        </div>

        <div class="party-slots-4">${partyHtml}</div>
      </div>
    `;

    /* ==================== 下半分：親指ゾーン操作エリア ==================== */
    let middleHtml = '';
    if (uiState.mode === 'main') {
      const areaBtns = Hacha.data.MAIN_AREAS.map((a) => `
        <button class="sub-tab ${uiState.areaIndex === a.index ? 'active' : ''}" data-area="${a.index}">
          ${a.icon}エリア${a.index}
        </button>
      `).join('');

      const stageTiles = [];
      for (let s = 1; s <= 10; s++) {
        const sid = `area${uiState.areaIndex}_s${s}`;
        const unlocked = isMainStageUnlocked(uiState.areaIndex, s);
        const cleared = !!(state.progress.clearedStages && state.progress.clearedStages[sid]);
        const sel = uiState.stageNum === s;
        stageTiles.push(`
          <button class="item-tile ${sel ? 'selected' : ''} ${!unlocked ? 'locked-tile' : ''}" data-stage-num="${s}" style="align-items:center;justify-content:center;padding:3px;">
            <div class="unit-name-full">${uiState.areaIndex}-${s}${s === 10 ? ' 👑' : ''}</div>
            <div class="bu-hp-text" style="color:${cleared ? '#6effb8' : (unlocked ? '#a8b9dc' : '#ff8aa0')};">
              ${cleared ? '制覇' : (unlocked ? '挑戦可' : '未開放')}
            </div>
          </button>
        `);
      }

      middleHtml = `
        <div class="sub-tabs">${areaBtns}</div>
        <div style="flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);gap:4px;">
          ${stageTiles.join('')}
        </div>
      `;
    } else if (uiState.mode === 'tower') {
      const maxF = Math.max(1, state.progress.towerFloor || 1);
      middleHtml = `
        <div class="panel panel-fill" style="justify-content:space-between;">
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">最高到達</span><span class="stat-chip-val">${state.progress.bestTowerFloor || 0}F</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">挑戦可能</span><span class="stat-chip-val">${maxF}F</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">選択階層</span><span class="stat-chip-val" style="color:#ffe066;">${uiState.towerTargetFloor}F</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">5階節目</span><span class="stat-chip-val">${uiState.towerTargetFloor % 5 === 0 ? '大ボス' : '通常'}</span></div>
          </div>
          <div class="action-row">
            <button class="btn btn-sm" data-tower-delta="-5">-5階</button>
            <button class="btn btn-sm" data-tower-delta="-1">-1階</button>
            <button class="btn btn-sm" data-tower-delta="1">+1階</button>
            <button class="btn btn-sm btn-primary" data-tower-latest="1">最新${maxF}F</button>
          </div>
        </div>
      `;
    } else if (uiState.mode === 'raid') {
      const tiles = Hacha.data.RAID_BOSSES.map((rb, idx) => {
        const cleared = !!(state.progress.bossCleared && state.progress.bossCleared[rb.id]);
        const b = Hacha.data.ENEMY_MAP[rb.bossId];
        return `
          <button class="item-tile ${uiState.raidIndex === idx ? 'selected' : ''}" data-raid-idx="${idx}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">${b.icon}${U.escapeHtml(rb.name)}</span>
              ${cm.elementBadge(b.element)}
            </div>
            <div class="meta-row-nowrap">
              <span class="bu-hp-text">品質${rb.minQuality}%〜・核片${rb.fragments}</span>
              <span class="bu-hp-text" style="color:${cleared ? '#6effb8' : '#ffd15c'};">${cleared ? '討伐済' : '未討伐'}</span>
            </div>
          </button>
        `;
      }).join('');
      middleHtml = `<div class="select-list-fixed" style="grid-template-rows:repeat(5,1fr);">${tiles}</div>`;
    } else if (uiState.mode === 'trial') {
      const tiles = Hacha.data.TRIAL_STAGES.map((tr, idx) => {
        const cleared = !!(state.progress.trialCleared && state.progress.trialCleared[tr.id]);
        return `
          <button class="item-tile ${uiState.trialIndex === idx ? 'selected' : ''}" data-trial-idx="${idx}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">${U.escapeHtml(tr.name)}</span>
              <span class="bu-hp-text" style="color:${cleared ? '#6effb8' : '#ffd15c'};">${cleared ? '制覇' : '挑戦'}</span>
            </div>
            <div class="bu-hp-text">${U.escapeHtml(tr.restriction.label.replace('出撃条件：', ''))}</div>
          </button>
        `;
      }).join('');
      middleHtml = `<div class="select-grid-2" style="grid-template-rows:repeat(3,1fr);">${tiles}</div>`;
    } else {
      const tiles = Hacha.data.CHAOS_RUSH_STAGES.map((ch, idx) => {
        const cleared = !!(state.progress.chaosCleared && state.progress.chaosCleared[ch.id]);
        return `
          <button class="item-tile ${uiState.chaosIndex === idx ? 'selected' : ''}" data-chaos-idx="${idx}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">🚨${U.escapeHtml(ch.name)}</span>
              <span class="bu-hp-text" style="color:${cleared ? '#6effb8' : '#ff9eb2'};">${cleared ? '制覇' : '高乱入'}</span>
            </div>
            <div class="bu-hp-text">品質${ch.minQuality}%〜・核片${ch.fragments}＋乱入報酬</div>
          </button>
        `;
      }).join('');
      middleHtml = `<div class="select-grid-2" style="grid-template-rows:repeat(2,1fr);">${tiles}</div>`;
    }

    const autoLoop = !!state.settings.autoLoop;
    const sellLabel = cm.getAutoSellLabel(state.settings.autoSellBelow);

    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${uiState.mode === 'main' ? 'active' : ''}" data-qmode="main">🗺️大陸</button>
        <button class="sub-tab ${uiState.mode === 'tower' ? 'active' : ''}" data-qmode="tower">🗼無限塔</button>
        <button class="sub-tab ${uiState.mode === 'raid' ? 'active' : ''}" data-qmode="raid">👹大ボス</button>
        <button class="sub-tab ${uiState.mode === 'trial' ? 'active' : ''}" data-qmode="trial">⚖️試練</button>
        <button class="sub-tab ${uiState.mode === 'chaos' ? 'active' : ''}" data-qmode="chaos">🚨乱入</button>
      </div>

      ${middleHtml}

      <div class="action-row">
        <button class="btn btn-sm ${autoLoop ? 'btn-toggle-on' : ''}" id="btn-toggle-loop">
          🔁 自動周回:${autoLoop ? 'ON' : 'OFF'}
        </button>
        <button class="btn btn-sm ${state.settings.autoSellBelow > 0 ? 'btn-toggle-warn' : ''}" id="btn-cycle-sell">
          💰 ${U.escapeHtml(sellLabel)}
        </button>
      </div>

      <div class="action-row">
        <button class="btn ${autoLoop ? 'btn-gold' : 'btn-primary'}" id="btn-start-battle" ${canStart ? '' : 'disabled'}>
          ${!mainUnlocked ? '🔒 前ステージ制覇で開放' : (!restrictCheck.ok ? '⚠️ 出撃条件を満たしていません' : (autoLoop ? '🔁 無限自動周回で出撃！' : '⚔️ このステージへ出撃！'))}
        </button>
      </div>
    `;

    /* イベント結線（すべて下半分のみ） */
    bottomEl.querySelectorAll('[data-qmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.mode = btn.getAttribute('data-qmode');
        if (uiState.mode === 'tower') uiState.towerTargetFloor = Math.max(1, state.progress.towerFloor || 1);
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-area]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.areaIndex = parseInt(btn.getAttribute('data-area'), 10);
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-stage-num]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.stageNum = parseInt(btn.getAttribute('data-stage-num'), 10);
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-tower-delta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        const maxF = Math.max(1, state.progress.towerFloor || 1);
        uiState.towerTargetFloor = U.clamp(uiState.towerTargetFloor + parseInt(btn.getAttribute('data-tower-delta'), 10), 1, maxF);
        app.renderCurrent();
      });
    });

    const latestBtn = bottomEl.querySelector('[data-tower-latest]');
    if (latestBtn) {
      latestBtn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.towerTargetFloor = Math.max(1, state.progress.towerFloor || 1);
        app.renderCurrent();
      });
    }

    bottomEl.querySelectorAll('[data-raid-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.raidIndex = parseInt(btn.getAttribute('data-raid-idx'), 10);
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-trial-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.trialIndex = parseInt(btn.getAttribute('data-trial-idx'), 10);
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-chaos-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.chaosIndex = parseInt(btn.getAttribute('data-chaos-idx'), 10);
        app.renderCurrent();
      });
    });

    const loopBtn = bottomEl.querySelector('#btn-toggle-loop');
    if (loopBtn) {
      loopBtn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        state.settings.autoLoop = !state.settings.autoLoop;
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    }

    const sellBtn = bottomEl.querySelector('#btn-cycle-sell');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        cm.cycleAutoSellSetting();
        app.renderCurrent();
      });
    }

    const startBtn = bottomEl.querySelector('#btn-start-battle');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (!canStart) return;
        Hacha.audio.play('tap');
        app.launchBattle(stage, !!state.settings.autoLoop);
      });
    }
  }

  function advanceNextStageIfMain(stage) {
    if (!stage || stage.mode !== 'main') return null;
    if (stage.stageNum < 10) {
      uiState.areaIndex = stage.areaIndex;
      uiState.stageNum = stage.stageNum + 1;
      return Hacha.data.STAGE_MAP[`area${uiState.areaIndex}_s${uiState.stageNum}`];
    }
    if (stage.areaIndex < 5) {
      uiState.areaIndex = stage.areaIndex + 1;
      uiState.stageNum = 1;
      return Hacha.data.STAGE_MAP[`area${uiState.areaIndex}_s1`];
    }
    return null;
  }

  Hacha.ui.screenQuest = {
    render,
    getSelectedStage,
    advanceNextStageIfMain
  };
})();
