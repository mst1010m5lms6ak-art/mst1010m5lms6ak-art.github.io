/* ==========================================================================
   render-battle.js - 出撃準備・フルオート5WAVE戦闘HUD（戦場+DPS+1行ログ一目表示）・通常/周回別リザルト
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const DPS_METRICS = [
    { id: 'dmgDealt', label: '与ダメ', unit: 'DPS' },
    { id: 'dmgTaken', label: '被ダメ', unit: 'DTPS' },
    { id: 'healDone', label: '与回復', unit: 'HPS' },
    { id: 'healRecv', label: '被回復', unit: 'HRPS' }
  ];

  const LOG_FILTERS = [
    { id: 'all', label: '全て' },
    { id: 'dmg', label: '攻撃' },
    { id: 'heal', label: '回復' },
    { id: 'chaos', label: '異変' }
  ];

  function filterLogs(logs, flt) {
    if (!flt || flt === 'all') return logs;
    return logs.filter((l) => {
      if (flt === 'dmg') return l.kind === 'dmg' || l.kind === 'crit';
      if (flt === 'heal') return l.kind === 'heal' || l.kind === 'buff';
      return l.kind === 'chaos';
    });
  }

  function renderLogRowHtml(entry) {
    const attrCol = HS.CONST.ATTR_MAP[entry.actorAttr]?.color || '#f4f1ff';
    const e = HS.UTIL.escHtml;
    return `
      <div class="log-row">
        <span class="log-actor" style="color:${attrCol}">${e(entry.actor)}</span>
        <span class="log-arrow">▶</span>
        <span class="log-target">${e(entry.target)}</span>
        <span class="log-skill">[${e(entry.skill)}]</span>
        <span class="log-val ${entry.kind}">${e(entry.valText)}</span>
      </div>`;
  }

  function renderDpsRowsHtml(metricsList, elapsed, metricKey, compact) {
    const sec = Math.max(1, elapsed || 1);
    const sorted = [...metricsList].sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));
    const total = sorted.reduce((s, m) => s + (m[metricKey] || 0), 0);
    const maxV = Math.max(1, sorted[0]?.[metricKey] || 1);
    const mDef = DPS_METRICS.find((m) => m.id === metricKey) || DPS_METRICS[0];

    return sorted.map((m) => {
      const val = m[metricKey] || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      const barW = val > 0 ? Math.max(3, Math.round((val / maxV) * 100)) : 0;
      const perSec = HS.UTIL.fmtNum(Math.round(val / sec));
      const roleIco = HS.CONST.renderRoleIcon(m.role, 'dps-role-ico');
      const attrCol = HS.CONST.ATTR_MAP[m.attr]?.color || '#fff';
      return `
        <div class="dps-row ${compact ? 'compact' : ''} attr-${m.attr}">
          <div class="dps-row-top">
            <span class="ellipsis dps-unit-name" style="color:${attrCol}">${roleIco}<span>${HS.UTIL.escHtml(m.name)}</span></span>
            <span class="num" style="color:var(--text-sub);flex-shrink:0">
              <strong style="color:#fff">${HS.UTIL.fmtNum(val)}</strong> (${pct}%・${perSec}/${mDef.unit})
            </span>
          </div>
          <div class="dps-bar-bg"><div class="dps-bar-fill" style="width:${barW}%"></div></div>
        </div>`;
    }).join('');
  }

  // ==================== 出撃前（ステージ選択） ====================
  function renderPrepUpper() {
    const st = HS.STATE.data;
    const stage = HS.STAGES.getStage(st.selectedStageId, st.towerFloor);
    const attrDef = HS.CONST.ATTR_MAP[stage.attr];
    const partyPower = HS.STATE.getPartyTotalPower();
    const powerRatio = partyPower / Math.max(1, stage.recPower);
    const statusText = powerRatio >= 1.05 ? '有利' : powerRatio >= 0.78 ? '互角' : '強敵';
    const statusCol = powerRatio >= 1.05 ? 'var(--accent-lime)' : powerRatio >= 0.78 ? 'var(--accent-gold)' : 'var(--accent-danger)';

    const unlockDef = stage.unlockUnit ? HS.UNITS_MAP[stage.unlockUnit] : null;
    const unlockAlready = stage.unlockUnit ? HS.STATE.data.units[stage.unlockUnit]?.unlocked : false;
    const isTower = stage.mode === 'tower';
    const towerClaimed = isTower && !!st.clearedStages[stage.id];

    const enemiesHtml = stage.enemies.map((en) => {
      const ea = HS.CONST.ATTR_MAP[en.attr];
      return `
        <div class="panel attr-${en.attr}" style="flex:1 1 0;padding:4px 6px;display:flex;flex-direction:column;gap:2px;border-color:${en.isBoss ? 'var(--accent-pink)' : 'var(--border-dim)'}">
          <div class="row-between">
            <span class="tag tag-attr">${ea.name}</span>
            <span style="font-size:12px;color:${ea.color};display:inline-flex">${HS.CONST.renderRoleIcon(en.role)}</span>
          </div>
          <div class="ellipsis" style="font-size:10.5px;font-weight:800">${HS.UTIL.escHtml(en.name)}</div>
          <div class="num" style="font-size:9.5px;color:var(--text-sub)">HP ${HS.UTIL.fmtNum(en.hp)}</div>
        </div>`;
    }).join('');

    const partyHtml = st.party.map((uid) => {
      if (!uid) return `<div class="panel" style="flex:1 1 0;padding:4px;text-align:center;color:var(--text-mute);font-size:10px">空</div>`;
      const u = HS.UNITS_MAP[uid];
      const us = st.units[uid];
      return `
        <div class="panel attr-${u.attr}" style="flex:1 1 0;padding:4px 5px;display:flex;align-items:center;gap:4px;border-color:var(--attr-col)">
          ${HS.CONST.renderUnitCrest(u, 'sm')}
          <div style="min-width:0;flex:1">
            <div class="ellipsis" style="font-size:10px;font-weight:800">${HS.UTIL.escHtml(u.name)}</div>
            <div class="num" style="font-size:9px;color:var(--text-sub)">Lv.${us.level}</div>
          </div>
        </div>`;
    }).join('');

    const rewardSummaryHtml = towerClaimed
      ? `<span style="color:var(--text-mute);font-weight:800">この階層の初回報酬は獲得済み（再挑戦可）</span>`
      : `<span class="num">${isTower ? '初回限定:' : '報酬:'} ${HS.UTIL.fmtNum(stage.gold)}G / 結晶${HS.UTIL.fmtNum(stage.exp)} / 魂片${stage.shards}</span>`;

    const rightBadgeHtml = towerClaimed
      ? `<span style="color:var(--accent-lime);font-weight:800;flex-shrink:0">報酬済</span>`
      : unlockDef
        ? `<span style="color:${unlockAlready ? 'var(--text-mute)' : 'var(--accent-gold)'};font-weight:800;flex-shrink:0">${unlockAlready ? '加入済' : `初回加入:${unlockDef.name}`}</span>`
        : `<span style="color:var(--accent-pink);font-weight:800;flex-shrink:0">コア率${Math.round((stage.coreChance || 0.2) * 100)}%</span>`;

    return `
      <div class="panel attr-${stage.attr}" style="border-color:var(--attr-col);display:flex;flex-direction:column;gap:4px">
        <div class="row-between">
          <div class="row-gap">
            <span class="tag tag-attr">${attrDef.name}</span>
            <span style="font-weight:900;font-size:13px" class="ellipsis">${HS.UTIL.escHtml(stage.code)} ${HS.UTIL.escHtml(stage.name)}</span>
          </div>
          <div class="row-gap" style="flex-shrink:0">
            <span class="tag tag-role">全${HS.STAGES.TOTAL_WAVES}WAVE</span>
            <span class="num" style="font-size:11px;font-weight:900;color:${statusCol}">${statusText}</span>
          </div>
        </div>
        <div class="row-between" style="font-size:11px">
          <span class="num" style="color:var(--text-sub)">推奨戦力 <strong style="color:#fff">${HS.UTIL.fmtNum(stage.recPower)}</strong></span>
          <span class="num" style="color:var(--text-sub)">自軍戦力 <strong style="color:var(--accent-cyan)">${HS.UTIL.fmtNum(partyPower)}</strong></span>
        </div>
        <div class="row-between" style="font-size:10px;color:var(--text-sub)">
          ${rewardSummaryHtml}
          ${rightBadgeHtml}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:3px">
        <div class="row-between" style="font-size:10px;color:var(--text-sub)">
          <span style="font-weight:800">出現エネミー（WAVE 5 主力）</span>
          <span>フルオート5連戦</span>
        </div>
        <div style="display:flex;gap:5px">${enemiesHtml}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:3px;margin-top:auto">
        <div class="row-between" style="font-size:10px;color:var(--text-sub)">
          <span style="font-weight:800">出撃パーティ</span>
          <span>自動売却: <strong style="color:${st.autoSell.enabled ? 'var(--accent-cyan)' : 'var(--text-mute)'}">${st.autoSell.enabled ? st.autoSell.maxRarity + '以下' : 'OFF'}</strong></span>
        </div>
        <div style="display:flex;gap:4px">${partyHtml}</div>
      </div>`;
  }

  function renderPrepLower() {
    const st = HS.STATE.data;
    const mode = st.selectedStageMode || 'story';

    let subBarHtml = '';
    let listHtml = '';

    if (mode === 'story') {
      const shortWorlds = ['商店街', '竜の巣', '工場', '神殿', '特異点'];
      subBarHtml = `
        <div class="world-grid">
          ${HS.STAGES.WORLDS.map((w, i) => `
            <button class="pill-btn ${st.selectedWorld === w.id ? 'active' : ''}" data-action="select-world" data-val="${w.id}">
              W${w.id}${shortWorlds[i] || ''}
            </button>`).join('')}
        </div>`;
      const stages = HS.STAGES.STORY_STAGES.filter((s) => s.world === st.selectedWorld);
      listHtml = stages.map((s) => {
        const unlocked = HS.STATE.isStageUnlocked(s);
        const cleared = !!st.clearedStages[s.id];
        const sel = st.selectedStageId === s.id;
        const a = HS.CONST.ATTR_MAP[s.attr];
        const unlockU = s.unlockUnit && !st.units[s.unlockUnit]?.unlocked ? HS.UNITS_MAP[s.unlockUnit].name : '';
        return `
          <button class="stage-card attr-${s.attr} ${sel ? 'selected' : ''} ${unlocked ? '' : 'locked'}"
                  data-action="select-stage" data-val="${s.id}" ${unlocked ? '' : 'disabled'}>
            <div class="row-gap" style="min-width:0;flex:1">
              <span class="tag tag-attr">${a.name}</span>
              <div style="min-width:0;flex:1">
                <div class="ellipsis" style="font-size:12px;font-weight:800">${s.code} ${HS.UTIL.escHtml(s.name)}</div>
                <div class="num" style="font-size:10px;color:var(--text-sub)">推奨${HS.UTIL.fmtNum(s.recPower)}・5WAVE ${unlockU ? `・★${unlockU}加入` : ''}</div>
              </div>
            </div>
            <span style="font-size:10px;font-weight:800;color:${cleared ? 'var(--accent-lime)' : 'var(--text-mute)'};flex-shrink:0">
              ${!unlocked ? '🔒' : cleared ? '踏破済' : 'NEW'}
            </span>
          </button>`;
      }).join('');
    } else if (mode === 'boss') {
      const bossUnlockHint = !st.clearedStages['w1-4']
        ? `<div class="panel" style="font-size:11px;color:var(--accent-gold);text-align:center">1-4 をクリアすると属性ボス討伐が解放されます</div>`
        : '';
      listHtml = bossUnlockHint + HS.STAGES.BOSS_STAGES.map((s) => {
        const unlocked = HS.STATE.isStageUnlocked(s);
        const cleared = !!st.clearedStages[s.id];
        const sel = st.selectedStageId === s.id;
        const unlockU = s.unlockUnit && !st.units[s.unlockUnit]?.unlocked ? HS.UNITS_MAP[s.unlockUnit].name : '';
        return `
          <button class="stage-card attr-${s.attr} ${sel ? 'selected' : ''} ${unlocked ? '' : 'locked'}"
                  data-action="select-stage" data-val="${s.id}" ${unlocked ? '' : 'disabled'}>
            <div class="row-gap" style="min-width:0;flex:1">
              <span class="tag tag-attr">${s.code}</span>
              <div style="min-width:0;flex:1">
                <div class="ellipsis" style="font-size:12px;font-weight:800">${HS.UTIL.escHtml(s.name)}</div>
                <div class="num" style="font-size:10px;color:var(--text-sub)">推奨${HS.UTIL.fmtNum(s.recPower)}・コア×${s.coreCount} ${unlockU ? `・★${unlockU}` : ''}</div>
              </div>
            </div>
            <span style="font-size:10px;font-weight:800;color:${cleared ? 'var(--accent-lime)' : 'var(--accent-pink)'};flex-shrink:0">
              ${!unlocked ? '🔒' : cleared ? '討伐済' : 'BOSS'}
            </span>
          </button>`;
      }).join('');
    } else {
      const maxF = Math.min(HS.STAGES.TOWER_MAX_FLOOR, st.towerFloor);
      const curFloor = st.selectedStageId.startsWith('tower-')
        ? Math.min(maxF, Math.max(1, Number(st.selectedStageId.split('-')[1]) || maxF))
        : maxF;
      const clearedAll = HS.STATE.isTowerClearedAll();
      subBarHtml = `
        <div class="row-gap" style="flex:0 0 28px">
          <button class="btn btn-sm" style="flex:0.85" data-action="tower-floor" data-val="${Math.max(1, curFloor - 10)}">-10F</button>
          <button class="btn btn-sm" style="flex:0.85" data-action="tower-floor" data-val="${Math.max(1, curFloor - 1)}">-1F</button>
          <button class="btn btn-sm" style="flex:0.85" data-action="tower-floor" data-val="${Math.min(maxF, curFloor + 1)}">+1F</button>
          <button class="btn btn-sm btn-cyan" style="flex:1.45" data-action="tower-floor" data-val="${maxF}">${clearedAll ? '100F制覇' : `最上階(${maxF}/100F)`}</button>
        </div>`;
      const topShow = Math.min(maxF, Math.max(curFloor + 2, Math.min(maxF, 9)));
      const botShow = Math.max(1, topShow - 9);
      const floors = [];
      for (let f = topShow; f >= botShow; f--) {
        floors.push(HS.STAGES.buildTowerStage(f));
      }
      listHtml = floors.map((s) => {
        const sel = st.selectedStageId === s.id;
        const a = HS.CONST.ATTR_MAP[s.attr];
        const claimed = !!st.clearedStages[s.id];
        return `
          <button class="stage-card attr-${s.attr} ${sel ? 'selected' : ''}" data-action="select-stage" data-val="${s.id}">
            <div class="row-gap" style="min-width:0;flex:1">
              <span class="tag tag-attr">${a.name}</span>
              <div style="min-width:0;flex:1">
                <div class="ellipsis" style="font-size:12px;font-weight:800">${HS.UTIL.escHtml(s.name)}</div>
                <div class="num" style="font-size:10px;color:var(--text-sub)">推奨${HS.UTIL.fmtNum(s.recPower)}・${claimed ? '初回報酬獲得済' : `一度きり報酬 / コア率${Math.round(s.coreChance * 100)}%`}</div>
              </div>
            </div>
            <span style="font-size:10px;font-weight:800;color:${claimed ? 'var(--accent-lime)' : s.floor % 5 === 0 ? 'var(--accent-gold)' : 'var(--accent-cyan)'};flex-shrink:0">
              ${claimed ? '報酬済' : s.floor === HS.STAGES.TOWER_MAX_FLOOR ? '覇主' : s.floor % 5 === 0 ? '大層主' : '未踏破'}
            </span>
          </button>`;
      }).join('');
    }

    const repOn = st.settings.autoRepeat;

    return `
      <div class="mode-tabs">
        <button class="btn btn-sm ${mode === 'story' ? 'btn-primary' : ''}" data-action="stage-mode" data-val="story">冒険</button>
        <button class="btn btn-sm ${mode === 'boss' ? 'btn-primary' : ''}" data-action="stage-mode" data-val="boss">属性ボス</button>
        <button class="btn btn-sm ${mode === 'tower' ? 'btn-primary' : ''}" data-action="stage-mode" data-val="tower">異界塔</button>
      </div>
      ${subBarHtml}
      <div class="stage-list scroll-box">${listHtml}</div>
      <div style="flex:0 0 auto;display:flex;flex-direction:column;gap:5px">
        <div class="row-gap">
          <button class="btn btn-sm btn-toggle ${repOn ? 'on-pink' : ''}" style="flex:1" data-action="toggle-repeat-prep">
            周回 ${repOn ? 'ON' : 'OFF'}
          </button>
          <button class="btn btn-sm" style="flex:1" data-action="open-autosell">
            自動売却: ${st.autoSell.enabled ? st.autoSell.maxRarity + '以下' : 'OFF'}
          </button>
        </div>
        <button class="btn btn-lg btn-primary" style="width:100%" data-action="start-battle">
          ${repOn ? '周回で出撃する' : 'このステージに出撃する'}
        </button>
      </div>`;
  }

  // ==================== フルオート戦闘中UI（戦場・DPS・ログ一目同時表示） ====================
  function renderActiveUpper() {
    const eng = HS.COMBAT.engine;
    const order = HS.COMBAT.getActionOrder(6);

    const orderHtml = order.map((o, idx) => {
      const a = HS.CONST.ATTR_MAP[o.attr];
      const r = HS.CONST.ROLE_MAP[o.role];
      return `
        <span class="order-chip attr-${o.attr} ${o.side} ${idx === 0 ? 'next-up' : ''}">
          <span style="color:${a.color}">${r.short}</span>
          <span>${HS.UTIL.escHtml(o.name.slice(0, 3))}</span>
        </span>`;
    }).join('');

    const anomalyHtml = eng.anomaly
      ? `<div class="anomaly-banner">✦ ${HS.UTIL.escHtml(eng.anomaly.def.name)} 発動中（残 ${eng.anomaly.timer.toFixed(1)}s）</div>`
      : '';

    const rs = eng.repeatSession;
    const repeatHtml = rs
      ? `<div class="repeat-live-bar">
          <span>周回 ${rs.runs + 1}戦目（勝${rs.wins}）</span>
          <span>+${HS.UTIL.fmtNum(rs.gold)}G / 保持${rs.keptGear.length}・売却${rs.autoSoldCount}</span>
         </div>`
      : '';

    return `
      <div class="battle-upper-wrap">
        <div class="order-bar" id="live-order-bar">
          <span class="order-label">行動順</span>
          ${orderHtml}
        </div>
        <div class="arena-stage">
          <canvas id="battle-canvas"></canvas>
          <div class="arena-hud-top">
            <div class="row-gap" style="min-width:0;flex:1">
              <span class="wave-badge num" id="live-wave-badge">W${eng.wave}/${eng.maxWaves}</span>
              <span class="ellipsis" id="live-stage-label">${HS.UTIL.escHtml(eng.stage?.code || '')} ${HS.UTIL.escHtml(eng.stage?.name || '')}</span>
              <span class="num" id="live-elapsed" style="color:var(--text-sub);flex-shrink:0">${HS.UTIL.fmtTime(eng.elapsed)}</span>
            </div>
            <div class="chaos-gauge-wrap">
              <span style="color:var(--accent-pink)">混沌</span>
              <div class="chaos-bar"><div class="chaos-bar-fill" id="live-chaos-fill" style="width:${Math.round(eng.chaos)}%"></div></div>
              <span class="num" id="live-chaos-pct">${Math.round(eng.chaos)}%</span>
            </div>
          </div>
          <div id="live-anomaly-slot">${anomalyHtml}</div>
          <div id="live-repeat-slot">${repeatHtml}</div>
        </div>
      </div>`;
  }

  function renderActiveLower() {
    const eng = HS.COMBAT.engine;
    const st = HS.STATE.data;
    const mKey = HS.STATE.ui.dpsMetric || 'dmgDealt';
    const logFlt = HS.STATE.ui.logFilter || 'all';

    const dpsRows = renderDpsRowsHtml(
      eng.allies.map((a) => ({ uid: a.uid, name: a.name, attr: a.attr, role: a.role, ...a.metrics })),
      eng.elapsed,
      mKey,
      true
    );

    const filteredLogs = filterLogs(eng.logs, logFlt);
    const tailLogs = filteredLogs.slice(-4);

    return `
      <div class="dps-tab-row">
        ${DPS_METRICS.map((m) => `
          <button class="btn btn-sm ${mKey === m.id ? 'btn-cyan' : ''}" data-action="dps-metric" data-val="${m.id}">
            ${m.label}
          </button>`).join('')}
      </div>

      <div class="live-dps-box" id="live-dps-list">${dpsRows}</div>

      <div class="log-panel-head">
        <span style="font-size:10px;font-weight:900;color:var(--accent-cyan);flex-shrink:0">戦闘ログ</span>
        <div class="log-filter-pills">
          ${LOG_FILTERS.map((f) => `
            <button class="pill-btn log-flt-btn ${logFlt === f.id ? 'active' : ''}" data-action="log-filter" data-val="${f.id}">
              ${f.label}
            </button>`).join('')}
        </div>
      </div>

      <div class="live-log-box" id="live-log-box">
        ${tailLogs.map(renderLogRowHtml).join('')}
      </div>

      <div class="battle-util-row">
        <button class="btn btn-sm btn-gold" data-action="cycle-speed">${st.settings.speed}倍速</button>
        <button class="btn btn-sm btn-toggle ${eng.repeatSession ? 'on-pink' : ''}" data-action="toggle-repeat-live">
          ${eng.repeatSession ? '周回終了' : '周回ON'}
        </button>
        <button class="btn btn-sm btn-danger" data-action="retreat-battle">撤退</button>
      </div>`;
  }

  /**
   * 戦闘中の軽量差分更新（Canvas要素を破棄せずHUD・DPS・1行ログのみ更新）
   */
  function updateLiveHud() {
    if (!HS.COMBAT.isActive() || HS.STATE.ui.tab !== 'battle') return;
    const eng = HS.COMBAT.engine;

    const orderEl = document.getElementById('live-order-bar');
    if (orderEl) {
      const order = HS.COMBAT.getActionOrder(6);
      orderEl.innerHTML = `<span class="order-label">行動順</span>` + order.map((o, idx) => {
        const a = HS.CONST.ATTR_MAP[o.attr];
        const r = HS.CONST.ROLE_MAP[o.role];
        return `<span class="order-chip attr-${o.attr} ${o.side} ${idx === 0 ? 'next-up' : ''}"><span style="color:${a.color}">${r.short}</span><span>${HS.UTIL.escHtml(o.name.slice(0, 3))}</span></span>`;
      }).join('');
    }

    const waveEl = document.getElementById('live-wave-badge');
    if (waveEl) waveEl.textContent = `W${eng.wave}/${eng.maxWaves}`;

    const elapEl = document.getElementById('live-elapsed');
    if (elapEl) elapEl.textContent = HS.UTIL.fmtTime(eng.elapsed);

    const cf = document.getElementById('live-chaos-fill');
    const cp = document.getElementById('live-chaos-pct');
    if (cf) cf.style.width = `${Math.round(eng.chaos)}%`;
    if (cp) cp.textContent = `${Math.round(eng.chaos)}%`;

    const anEl = document.getElementById('live-anomaly-slot');
    if (anEl) {
      anEl.innerHTML = eng.anomaly
        ? `<div class="anomaly-banner">✦ ${HS.UTIL.escHtml(eng.anomaly.def.name)} 発動中（残 ${eng.anomaly.timer.toFixed(1)}s）</div>`
        : '';
    }

    const repEl = document.getElementById('live-repeat-slot');
    if (repEl) {
      const rs = eng.repeatSession;
      repEl.innerHTML = rs
        ? `<div class="repeat-live-bar"><span>周回 ${rs.runs + 1}戦目（勝${rs.wins}）</span><span>+${HS.UTIL.fmtNum(rs.gold)}G / 保持${rs.keptGear.length}・売却${rs.autoSoldCount}</span></div>`
        : '';
    }

    // ライブDPS更新
    const dpsEl = document.getElementById('live-dps-list');
    if (dpsEl) {
      const mKey = HS.STATE.ui.dpsMetric || 'dmgDealt';
      dpsEl.innerHTML = renderDpsRowsHtml(
        eng.allies.map((a) => ({ uid: a.uid, name: a.name, attr: a.attr, role: a.role, ...a.metrics })),
        eng.elapsed,
        mKey,
        true
      );
    }

    // 固定1行ログ更新（コンテナ実高に収まる整数行数だけ表示して上端見切れゼロを保証）
    const logEl = document.getElementById('live-log-box');
    if (logEl) {
      const flt = HS.STATE.ui.logFilter || 'all';
      const filtered = filterLogs(eng.logs, flt);
      const fitRows = Math.max(3, Math.floor((logEl.clientHeight - 4) / 22));
      logEl.innerHTML = filtered.slice(-fitRows).map(renderLogRowHtml).join('');
    }
  }

  // ==================== 通常リザルト画面（周回リザルトとは別） ====================
  function buildNormalResultHtml(loot, metricKey) {
    const mKey = metricKey || HS.STATE.ui.dpsMetric || 'dmgDealt';
    const nextStage = getNextStoryOrTowerStage(loot.stageId);

    const dropHtml = loot.towerAlreadyClaimed
      ? `<div class="panel" style="font-size:11px;color:var(--text-sub);text-align:center">異界塔の各フロア報酬は一度きりのため、再挑戦時の報酬はありません。</div>`
      : loot.gearDrops.length
        ? loot.gearDrops.map((d) => `
            <div class="row-between panel rar-${d.item.rarity}" style="padding:5px 8px;border-color:var(--rar-col)">
              <div class="row-gap">
                <span class="tag tag-rar">${d.item.rarity}</span>
                <span class="ellipsis" style="font-size:11px;font-weight:800">${HS.UTIL.escHtml(d.item.name)}</span>
              </div>
              <span style="font-size:10px;font-weight:800;color:${d.autoSold ? 'var(--accent-gold)' : 'var(--accent-lime)'};flex-shrink:0">
                ${d.autoSold ? `自動売却 +${d.gold}G` : '獲得'}
              </span>
            </div>`).join('')
        : `<div style="font-size:11px;color:var(--text-mute);text-align:center">装備ドロップなし</div>`;

    const unlockBanner = loot.unlockedUnit
      ? `<div class="panel" style="border-color:var(--accent-gold);background:rgba(255,214,51,0.16);text-align:center;font-weight:900;color:var(--accent-gold)">
          ★ 新メンバー加入：${HS.UTIL.escHtml(loot.unlockedUnit.name)}（${HS.CONST.ATTR_MAP[loot.unlockedUnit.attr].name}・${HS.CONST.ROLE_MAP[loot.unlockedUnit.role].name}）
         </div>`
      : '';

    const lvHtml = loot.levelUps.length
      ? `<div style="font-size:11px;color:var(--accent-lime);font-weight:800">LEVEL UP: ${loot.levelUps.map((x) => `${x.name} Lv.${x.level}`).join(' / ')}</div>`
      : '';

    const waveLabel = `${loot.reachedWave || 5}/${loot.maxWaves || 5}`;

    return {
      title: `通常戦闘リザルト — ${loot.stageCode} ${loot.stageName}`,
      body: `
        <div class="result-banner ${loot.won ? 'win' : 'lose'}">${loot.won ? '✦ VICTORY ✦' : `DEFEAT (WAVE ${waveLabel})`}</div>
        ${unlockBanner}
        <div class="summary-grid">
          <div class="summary-cell"><span class="sk">タイム / 到達WAVE</span><span class="sv">${HS.UTIL.fmtTime(loot.elapsed)} / W${waveLabel}</span></div>
          <div class="summary-cell"><span class="sk">獲得ゴールド</span><span class="sv res-gold">+${HS.UTIL.fmtNum(loot.gold + loot.autoSoldGold)}G</span></div>
          <div class="summary-cell"><span class="sk">経験結晶 / 魂片</span><span class="sv res-shard">+${HS.UTIL.fmtNum(loot.exp)} / +${loot.shards}</span></div>
          <div class="summary-cell"><span class="sk">星屑コア / 魔粉</span><span class="sv res-core">+${loot.cores} / +${loot.autoSoldDust}</span></div>
        </div>
        ${lvHtml}
        <div style="display:flex;flex-direction:column;gap:4px">
          <div style="font-size:11px;font-weight:800;color:var(--text-sub)">ドロップ装備</div>
          ${dropHtml}
        </div>
        <div class="panel" style="display:flex;flex-direction:column;gap:5px">
          <div style="font-size:11px;font-weight:800;color:var(--accent-cyan)">戦闘計測（${DPS_METRICS.find((m) => m.id === mKey)?.label}）</div>
          ${renderDpsRowsHtml(loot.metrics, loot.elapsed, mKey, false)}
        </div>`,
      foot: `
        <div class="dps-tab-row">
          ${DPS_METRICS.map((m) => `
            <button class="btn btn-sm ${mKey === m.id ? 'btn-cyan' : ''}" data-action="result-dps-tab" data-val="normal:${m.id}">${m.label}</button>`).join('')}
        </div>
        <div class="sheet-foot-row">
          <button class="btn" data-action="result-close">ステージ選択へ</button>
          <button class="btn btn-cyan" data-action="result-retry" data-val="${loot.stageId}">もう一度挑む</button>
          ${loot.won && nextStage ? `<button class="btn btn-primary" data-action="result-next" data-val="${nextStage}">次のステージ</button>` : ''}
        </div>`
    };
  }

  // ==================== 周回集計リザルト画面（通常とは完全分離） ====================
  function buildRepeatResultHtml(summary, metricKey) {
    const mKey = metricKey || HS.STATE.ui.dpsMetric || 'dmgDealt';
    const avgSec = summary.runs > 0 ? summary.totalElapsed / summary.runs : 0;
    const keptSorted = [...summary.keptGear].sort((a, b) => (HS.CONST.RARITY_MAP[b.rarity]?.idx || 0) - (HS.CONST.RARITY_MAP[a.rarity]?.idx || 0));
    const metricsArr = Object.values(summary.unitMetrics || {});

    const keptHtml = keptSorted.length
      ? keptSorted.slice(0, 8).map((item) => `
          <div class="row-between panel rar-${item.rarity}" style="padding:4px 7px;border-color:var(--rar-col)">
            <div class="row-gap"><span class="tag tag-rar">${item.rarity}</span><span class="ellipsis" style="font-size:11px;font-weight:800">${HS.UTIL.escHtml(item.name)}</span></div>
            <span class="num" style="font-size:10px;color:var(--text-sub)">評点 ${item.score}</span>
          </div>`).join('') + (keptSorted.length > 8 ? `<div style="font-size:10px;color:var(--text-sub);text-align:center">ほか保持装備 ${keptSorted.length - 8}点</div>` : '')
      : `<div style="font-size:11px;color:var(--text-mute);text-align:center">保持された装備はありません</div>`;

    return {
      title: `周回 集計リザルト`,
      body: `
        <div class="result-banner repeat">周回完了：計 ${summary.runs} 周（勝 ${summary.wins} / 敗 ${summary.losses}）</div>
        <div class="summary-grid">
          <div class="summary-cell"><span class="sk">累計時間 / 平均</span><span class="sv">${HS.UTIL.fmtTime(summary.totalElapsed)} / ${avgSec.toFixed(1)}s</span></div>
          <div class="summary-cell"><span class="sk">累計ゴールド</span><span class="sv res-gold">+${HS.UTIL.fmtNum(summary.gold + summary.autoSoldGold)}G</span></div>
          <div class="summary-cell"><span class="sk">累計 結晶 / 魂片 / コア</span><span class="sv res-shard">${HS.UTIL.fmtNum(summary.exp)} / ${summary.shards} / ${summary.cores}</span></div>
          <div class="summary-cell"><span class="sk">自動売却まとめ</span><span class="sv res-core">${summary.autoSoldCount}件 (+${HS.UTIL.fmtNum(summary.autoSoldGold)}G / 魔粉${summary.autoSoldDust})</span></div>
        </div>
        ${summary.unlockedUnits.length ? `<div class="panel" style="border-color:var(--accent-gold);color:var(--accent-gold);font-weight:800;font-size:11px">★ 周回中の新規加入: ${summary.unlockedUnits.map((u) => u.name).join('・')}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:4px">
          <div style="font-size:11px;font-weight:800;color:var(--text-sub)">保持したドロップ装備（${keptSorted.length}件）</div>
          ${keptHtml}
        </div>
        ${metricsArr.length ? `
          <div class="panel" style="display:flex;flex-direction:column;gap:5px">
            <div style="font-size:11px;font-weight:800;color:var(--accent-cyan)">周回累計計測（${DPS_METRICS.find((m) => m.id === mKey)?.label}）</div>
            ${renderDpsRowsHtml(metricsArr, summary.totalElapsed, mKey, false)}
          </div>` : ''}`,
      foot: `
        <div class="dps-tab-row">
          ${DPS_METRICS.map((m) => `
            <button class="btn btn-sm ${mKey === m.id ? 'btn-cyan' : ''}" data-action="result-dps-tab" data-val="repeat:${m.id}">${m.label}</button>`).join('')}
        </div>
        <div class="sheet-foot-row">
          <button class="btn" data-action="result-close">編成・装備へ戻る</button>
          <button class="btn btn-primary" data-action="result-repeat-again" data-val="${summary.stageId}">同じ条件で再周回</button>
        </div>`
    };
  }

  function getNextStoryOrTowerStage(stageId) {
    if (stageId.startsWith('tower-')) {
      const f = Number(stageId.split('-')[1]) || 1;
      if (f >= HS.STAGES.TOWER_MAX_FLOOR) return null;
      return `tower-${Math.min(HS.STAGES.TOWER_MAX_FLOOR, f + 1)}`;
    }
    const idx = HS.STAGES.STORY_STAGES.findIndex((s) => s.id === stageId);
    if (idx !== -1 && idx + 1 < HS.STAGES.STORY_STAGES.length) {
      return HS.STAGES.STORY_STAGES[idx + 1].id;
    }
    return null;
  }

  HS.UI_BATTLE = {
    renderUpper() {
      return HS.COMBAT.isActive() ? renderActiveUpper() : renderPrepUpper();
    },
    renderLower() {
      return HS.COMBAT.isActive() ? renderActiveLower() : renderPrepLower();
    },
    updateLiveHud,
    buildNormalResultHtml,
    buildRepeatResultHtml
  };
})(window);
