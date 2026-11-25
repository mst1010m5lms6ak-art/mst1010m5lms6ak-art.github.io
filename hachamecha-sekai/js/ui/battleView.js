(function () {
  'use strict';

  const HS = window.HS;
  const { el, clear, formatNum, formatTime, makeElBadge, makeRoleBadge } = HS.DOM;

  let session = null;
  let rafId = null;
  let lastTs = 0;
  let activeDrawer = 'log'; // 'log' | 'dps' | 'synergy'
  let activeDpsMetric = 'dealt'; // 'dealt' | 'taken' | 'healOut' | 'healIn'
  let resultView = null; // null | { kind: 'single', data } | { kind: 'loop', data }

  // Cached live DOM refs for silky 60fps updates without full re-render
  let refs = null;

  function isActive() {
    return Boolean(session) || Boolean(resultView);
  }

  function getStatusLabel() {
    if (session) return session.isAutoLoop ? '自動周回中' : '戦闘遂行中';
    if (resultView) return resultView.kind === 'loop' ? '自動周回リザルト' : '戦闘リザルト';
    return null;
  }

  function stopLoopRaf() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startBattle(config, isAutoLoop) {
    stopLoopRaf();
    resultView = null;
    activeDrawer = 'log';

    session = new HS.Engine.BattleSession(config, isAutoLoop, {
      onWaveChange: () => {
        if (refs) rebuildUnitsDOM();
      },
      onLog: (entry) => {
        if (refs && activeDrawer === 'log') appendLogEntry(entry);
      },
      onVisual: (evt) => {
        if (refs) handleVisualEvent(evt);
      },
      onSingleComplete: (data) => {
        stopLoopRaf();
        session = null;
        resultView = { kind: 'single', data };
        HS.UI.App.render();
      },
      onLoopComplete: (data) => {
        stopLoopRaf();
        session = null;
        resultView = { kind: 'loop', data, config };
        HS.UI.App.render();
      }
    });

    HS.UI.App.render();
    lastTs = performance.now();
    rafId = requestAnimationFrame(frameLoop);
  }

  function frameLoop(now) {
    if (!session) return;
    const dt = Math.min(80, Math.max(0, now - lastTs));
    lastTs = now;
    session.tick(dt);
    if (session && refs) {
      syncFrameDOM();
    }
    if (session) {
      rafId = requestAnimationFrame(frameLoop);
    }
  }

  function createUnitCard(u) {
    const elMeta = HS.CONST.EL_MAP[u.element] || HS.CONST.EL_MAP.none;
    const roleMeta = HS.CONST.ROLE_MAP[u.role] || HS.CONST.ROLE_MAP.dealer;

    const hpFill = el('div', { className: `bar-fill ${u.side === 'ally' ? 'hp-ally' : 'hp-enemy'}` });
    const shieldFill = el('div', { className: 'bar-fill shield' });
    const atbFill = el('div', { className: 'bar-fill atb' });
    const hpNum = el('span', { className: 'hp-num num', text: formatNum(u.hp) });
    const ctStrip = el('div', { className: 'ct-strip' });
    const statusStrip = el('div', { className: 'status-strip' });

    const extraCls = u.isIntruder ? ' intruder-unit' : u.isBoss ? ' boss-unit' : '';
    const card = el(
      'div',
      {
        className: `battle-unit ${elMeta.cls}${extraCls}`,
        dataset: { uid: u.uid }
      },
      el(
        'div',
        { className: 'unit-head' },
        el('span', { className: 'unit-name', text: u.name }),
        el(
          'span',
          { className: 'unit-tags' },
          el('span', { text: elMeta.icon }),
          el('span', { text: roleMeta.icon })
        )
      ),
      el(
        'div',
        { className: 'gauge-stack' },
        el(
          'div',
          { className: 'hp-row' },
          el('div', { className: 'bar-track' }, hpFill, shieldFill),
          hpNum
        ),
        el('div', { className: 'bar-track atb' }, atbFill)
      ),
      el('div', { className: 'unit-foot' }, ctStrip, statusStrip)
    );

    return {
      uid: u.uid,
      card,
      hpFill,
      shieldFill,
      atbFill,
      hpNum,
      ctStrip,
      statusStrip,
      lastHpText: '',
      lastCtKey: '',
      lastStKey: '',
      lastDead: false,
      lastActing: false
    };
  }

  function rebuildUnitsDOM() {
    if (!refs || !session) return;
    refs.unitRefs = {};

    clear(refs.enemyGrid);
    const eCount = session.enemies.length;
    refs.enemyGrid.className = `unit-grid${eCount === 1 ? ' count-1' : eCount === 2 ? ' count-2' : ''}`;
    for (const u of session.enemies) {
      const r = createUnitCard(u);
      refs.unitRefs[u.uid] = r;
      refs.enemyGrid.appendChild(r.card);
    }

    clear(refs.allyGrid);
    const aCount = session.allies.length;
    refs.allyGrid.className = `unit-grid${aCount === 1 ? ' count-1' : aCount === 2 ? ' count-2' : ''}`;
    for (const u of session.allies) {
      const r = createUnitCard(u);
      refs.unitRefs[u.uid] = r;
      refs.allyGrid.appendChild(r.card);
    }

    updateHeaderPills();
    syncFrameDOM();
  }

  function updateHeaderPills() {
    if (!refs || !session) return;
    refs.stageTitle.textContent = session.plan.title;
    refs.wavePill.textContent = `WAVE ${session.waveIdx + 1}/${session.plan.waves.length}`;
    if (session.isAutoLoop) {
      refs.loopPill.hidden = false;
      refs.loopPill.textContent = session.stopLoopRequested
        ? `周回 ${session.loopStats.runs + 1}（完了後終了）`
        : `自動周回 ${session.loopStats.runs + 1}周目`;
    } else {
      refs.loopPill.hidden = true;
    }
    const waveDef = session.plan.waves[session.waveIdx];
    refs.intruderPill.hidden = !(waveDef && waveDef.hasIntruder);
  }

  function syncUnitCard(u, r) {
    const hpRatio = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
    const shRatio = Math.max(0, Math.min(1, u.shield / Math.max(1, u.maxHp)));
    const atbRatio = Math.max(0, Math.min(1, u.atb / 1000));

    r.hpFill.style.transform = `scaleX(${hpRatio.toFixed(4)})`;
    r.shieldFill.style.transform = `scaleX(${shRatio.toFixed(4)})`;
    r.atbFill.style.transform = `scaleX(${atbRatio.toFixed(4)})`;

    const hpText = u.shield > 0 ? `${formatNum(u.hp)}+` : formatNum(u.hp);
    if (hpText !== r.lastHpText) {
      r.lastHpText = hpText;
      r.hpNum.textContent = hpText;
    }

    const dead = !u.alive;
    if (dead !== r.lastDead) {
      r.lastDead = dead;
      r.card.classList.toggle('dead', dead);
    }

    const acting = session.actingUnit === u && session.actionLockTimer > 0;
    if (acting !== r.lastActing) {
      r.lastActing = acting;
      r.card.classList.toggle('acting', acting);
    }

    // Skill CT pips (shows Skill 2 / Skill 3 CT or Passive 'P')
    const ctParts = [];
    for (let i = 1; i < u.skills.length; i++) {
      const sk = u.skills[i];
      if (sk.passive) ctParts.push('P');
      else ctParts.push(String(u.cts[i] || 0));
    }
    const ctKey = ctParts.join(',');
    if (ctKey !== r.lastCtKey) {
      r.lastCtKey = ctKey;
      clear(r.ctStrip);
      for (let i = 1; i < u.skills.length; i++) {
        const sk = u.skills[i];
        if (sk.passive) {
          r.ctStrip.appendChild(el('span', { className: 'ct-pip passive', text: '常' }));
        } else {
          const cd = u.cts[i] || 0;
          r.ctStrip.appendChild(el('span', {
            className: `ct-pip${cd > 0 ? ' cooling' : ''}`,
            text: cd > 0 ? `${cd}` : `技${i + 1}`
          }));
        }
      }
    }

    // Status / Buff / Debuff pills (capped neatly to never overflow card height)
    const entries = Object.entries(u.statuses);
    const stKey = entries.map(([k, v]) => `${k}:${v}`).join('|');
    if (stKey !== r.lastStKey) {
      r.lastStKey = stKey;
      clear(r.statusStrip);
      const maxShow = 3;
      entries.slice(0, maxShow).forEach(([k, dur]) => {
        const meta = HS.CONST.STATUS_META[k];
        if (!meta) return;
        r.statusStrip.appendChild(el('span', {
          className: `st-chip ${meta.kind}`,
          text: `${meta.name}${dur}`
        }));
      });
      if (entries.length > maxShow) {
        r.statusStrip.appendChild(el('span', {
          className: 'st-chip buff',
          text: `+${entries.length - maxShow}`
        }));
      }
    }
  }

  function syncTurnOrder() {
    if (!refs || !session) return;
    const predicted = session.getPredictedTurnOrder(3);
    const key = predicted.map((p) => `${p.unit.uid}:${p.acting ? 1 : 0}`).join('|');
    if (key === refs.lastOrderKey) return;
    refs.lastOrderKey = key;

    clear(refs.turnOrderTrack);
    predicted.forEach((item, idx) => {
      const elMeta = HS.CONST.EL_MAP[item.unit.element] || HS.CONST.EL_MAP.none;
      const prefix = idx === 0 && item.acting ? '▶' : `${idx + 1}.`;
      refs.turnOrderTrack.appendChild(el('span', {
        className: `turn-chip ${item.unit.side}${item.acting ? ' acting' : ''}`,
        text: `${prefix}${elMeta.icon}${item.unit.name}`
      }));
    });
  }

  function syncDpsDrawer() {
    if (!refs || !refs.dpsRows || !session || activeDrawer !== 'dps') return;
    const now = performance.now();
    if (now - (refs.lastDpsPaint || 0) < 150) return;
    refs.lastDpsPaint = now;

    const map = session.isAutoLoop ? session.loopStats.dps : session.singleDps;
    const elapsedSec = Math.max(1, (session.isAutoLoop ? (session.loopStats.totalElapsedMs + session.battleElapsedMs) : session.battleElapsedMs) / 1000);
    const rows = Object.values(map);
    const maxVal = Math.max(1, ...rows.map((r) => r[activeDpsMetric] || 0));

    clear(refs.dpsRows);
    for (const row of rows) {
      const val = row[activeDpsMetric] || 0;
      const perSec = Math.round(val / elapsedSec);
      const ratio = Math.max(0.02, val / maxVal);
      const elMeta = HS.CONST.EL_MAP[row.element] || HS.CONST.EL_MAP.none;
      refs.dpsRows.appendChild(el(
        'div',
        { className: 'dps-row' },
        el(
          'div',
          { className: 'dps-row-head' },
          el('span', { text: `${elMeta.icon} ${row.name}` }),
          el('span', { className: 'num', text: `${formatNum(val)} (${formatNum(perSec)}/s)` })
        ),
        el(
          'div',
          { className: 'dps-track' },
          el('div', {
            className: `dps-fill ${activeDpsMetric}`,
            style: { transform: `scaleX(${ratio.toFixed(4)})` }
          })
        )
      ));
    }
  }

  function syncFrameDOM() {
    if (!refs || !session) return;
    for (const u of session.enemies) {
      const r = refs.unitRefs[u.uid];
      if (r) syncUnitCard(u, r);
    }
    for (const u of session.allies) {
      const r = refs.unitRefs[u.uid];
      if (r) syncUnitCard(u, r);
    }
    if (refs.timerBtn && !session.isAutoLoop) {
      const tText = `戦闘時間 ${formatTime(session.battleElapsedMs)}`;
      if (tText !== refs.lastTimerText) {
        refs.lastTimerText = tText;
        refs.timerBtn.textContent = tText;
      }
    }
    syncTurnOrder();
    syncDpsDrawer();
  }

  function getUnitCenterInArena(uid) {
    if (!refs || !refs.unitRefs[uid]) return null;
    const arenaRect = refs.arena.getBoundingClientRect();
    const cardRect = refs.unitRefs[uid].card.getBoundingClientRect();
    return {
      x: cardRect.left - arenaRect.left + cardRect.width * 0.5,
      y: cardRect.top - arenaRect.top + cardRect.height * 0.45
    };
  }

  function triggerClassAnim(node, cls, ms) {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  }

  function spawnVfxNode(node, ms) {
    if (!refs || !refs.vfxLayer) return;
    refs.vfxLayer.appendChild(node);
    while (refs.vfxLayer.children.length > 26) {
      refs.vfxLayer.removeChild(refs.vfxLayer.firstChild);
    }
    setTimeout(() => {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, ms);
  }

  function handleVisualEvent(evt) {
    if (!refs) return;
    if (evt.type === 'banner') {
      refs.centerStrip.textContent = evt.text;
      refs.centerStrip.classList.toggle('alert', Boolean(evt.alert));
      updateHeaderPills();
      return;
    }
    if (evt.type === 'act') {
      refs.centerStrip.textContent = evt.bannerText;
      refs.centerStrip.classList.remove('alert');
      const r = refs.unitRefs[evt.actorUid];
      if (r) {
        triggerClassAnim(r.card, evt.side === 'ally' ? 'anim-lunge-up' : 'anim-lunge-down', 260);
      }
      return;
    }
    if (evt.type === 'hit') {
      const r = refs.unitRefs[evt.targetUid];
      if (r) triggerClassAnim(r.card, 'anim-hit', 240);
      const pos = getUnitCenterInArena(evt.targetUid);
      if (pos) {
        const elMeta = HS.CONST.EL_MAP[evt.element] || HS.CONST.EL_MAP.none;
        const jx = (Math.random() - 0.5) * 26;
        const jy = (Math.random() - 0.5) * 14;
        spawnVfxNode(el('div', {
          className: evt.isAll ? `vfx-ring ${elMeta.cls}` : `vfx-slash ${elMeta.cls}`,
          style: { left: `${pos.x}px`, top: `${pos.y}px` }
        }), 340);

        const cls = evt.crit ? 'dmg-pop crit' : evt.tag === 'weak' ? 'dmg-pop weak' : evt.tag === 'resist' ? 'dmg-pop resist' : 'dmg-pop';
        const prefix = evt.crit ? '★' : evt.tag === 'weak' ? '▲' : '';
        spawnVfxNode(el('div', {
          className: cls,
          text: `${prefix}${formatNum(evt.value)}`,
          style: { left: `${pos.x + jx}px`, top: `${pos.y + jy}px` }
        }), 680);
      }
      return;
    }
    if (evt.type === 'heal') {
      const r = refs.unitRefs[evt.targetUid];
      if (r) triggerClassAnim(r.card, 'anim-heal', 280);
      const pos = getUnitCenterInArena(evt.targetUid);
      if (pos) {
        spawnVfxNode(el('div', {
          className: 'dmg-pop heal',
          text: `+${formatNum(evt.value)}`,
          style: { left: `${pos.x}px`, top: `${pos.y - 6}px` }
        }), 680);
      }
      return;
    }
    if (evt.type === 'statusPop') {
      const pos = getUnitCenterInArena(evt.targetUid);
      if (pos) {
        spawnVfxNode(el('div', {
          className: 'dmg-pop status',
          text: evt.text,
          style: { left: `${pos.x}px`, top: `${pos.y - 10}px` }
        }), 680);
      }
    }
  }

  function appendLogEntry(entry) {
    if (!refs || !refs.logList) return;
    const node = el('div', { className: `log-entry ${entry.kind}`, text: entry.text });
    refs.logList.appendChild(node);
    while (refs.logList.children.length > 100) {
      refs.logList.removeChild(refs.logList.firstChild);
    }
    refs.logList.scrollTop = refs.logList.scrollHeight;
  }

  function renderDrawerContent() {
    if (!refs || !session) return;
    clear(refs.drawerBody);

    if (activeDrawer === 'log') {
      const logList = el('div', { className: 'log-list scroll-zone' });
      for (const entry of session.logs.slice(-80)) {
        logList.appendChild(el('div', { className: `log-entry ${entry.kind}`, text: entry.text }));
      }
      refs.logList = logList;
      refs.drawerBody.appendChild(logList);
      requestAnimationFrame(() => { logList.scrollTop = logList.scrollHeight; });
      return;
    }

    if (activeDrawer === 'dps') {
      const dpsRows = el('div', { className: 'dps-rows' });
      refs.dpsRows = dpsRows;
      refs.lastDpsPaint = 0;

      const metrics = [
        { id: 'dealt', label: '与ダメ' },
        { id: 'taken', label: '被ダメ' },
        { id: 'healOut', label: '与回復' },
        { id: 'healIn', label: '被回復' }
      ];
      const metricBar = el(
        'div',
        { className: 'dps-metric-tabs' },
        metrics.map((m) => el('button', {
          type: 'button',
          className: `btn sm${activeDpsMetric === m.id ? ' active-toggle' : ''}`,
          text: m.label,
          on: {
            click: () => {
              activeDpsMetric = m.id;
              renderDrawerContent();
            }
          }
        }))
      );

      refs.drawerBody.appendChild(el('div', { className: 'dps-wrap' }, dpsRows, metricBar));
      syncDpsDrawer();
      return;
    }

    // Active Synergy Readout
    const synWrap = el('div', { className: 'list-col scroll-zone' });
    if (session.synergies.length === 0) {
      synWrap.appendChild(el('div', { className: 'section-sub', text: '発動中の編成シナジーはありません' }));
    } else {
      for (const s of session.synergies) {
        synWrap.appendChild(el(
          'div',
          { className: 'panel-card' },
          el('div', { className: 'item-top' }, el('span', { className: 'item-name', text: s.label }), el('span', { className: 'section-sub', text: s.desc }))
        ));
      }
    }
    refs.drawerBody.appendChild(synWrap);
  }

  function renderBattleLive(container) {
    const stageTitle = el('span', { className: 'battle-stage-name', text: session.plan.title });
    const wavePill = el('span', { className: 'battle-pill num' });
    const loopPill = el('span', { className: 'battle-pill loop', hidden: true });
    const intruderPill = el('span', { className: 'battle-pill intruder', text: '乱入!', hidden: true });

    const header = el(
      'div',
      { className: 'battle-header' },
      stageTitle,
      el('div', { className: 'battle-meta-pills' }, intruderPill, loopPill, wavePill)
    );

    const turnOrderTrack = el('div', { className: 'turn-order-track' });
    const turnBar = el(
      'div',
      { className: 'turn-order-bar' },
      el('span', { className: 'turn-order-label', text: '行動順' }),
      turnOrderTrack
    );

    const enemyGrid = el('div', { className: 'unit-grid' });
    const centerStrip = el('div', { className: 'battle-center-strip', text: `WAVE 1 / ${session.plan.waves.length}` });
    const allyGrid = el('div', { className: 'unit-grid' });
    const vfxLayer = el('div', { className: 'vfx-layer' });

    const arena = el('div', { className: 'battle-arena' }, enemyGrid, centerStrip, allyGrid, vfxLayer);

    // Lower Thumb Control Dock
    const drawerBody = el('div', { className: 'battle-drawer' });

    const drawerTabBtns = [
      { id: 'log', label: '戦況ログ' },
      { id: 'dps', label: session.isAutoLoop ? '累積DPS' : 'DPSメーター' },
      { id: 'synergy', label: `シナジー(${session.synergies.length})` }
    ].map((t) => {
      const btn = el('button', {
        type: 'button',
        className: `subtab-btn${activeDrawer === t.id ? ' active' : ''}`,
        dataset: { drawer: t.id },
        text: t.label,
        on: {
          click: () => {
            if (activeDrawer === t.id) return;
            activeDrawer = t.id;
            drawerTabBtns.forEach((b) => b.classList.toggle('active', b.dataset.drawer === activeDrawer));
            renderDrawerContent();
          }
        }
      });
      return btn;
    });
    const drawerTabs = el('div', { className: 'subtab-bar' }, drawerTabBtns);

    const curSpeed = HS.Engine.State.getState().settings.battleSpeed || 1;
    const speedBtn = el('button', {
      type: 'button',
      className: `btn${curSpeed === 3 ? ' gold' : ' active-toggle'}`,
      text: `速度 ${curSpeed}x`,
      on: {
        click: () => {
          const cur = HS.Engine.State.getState().settings.battleSpeed || 1;
          const next = cur === 1 ? 2 : cur === 2 ? 3 : 1;
          HS.Engine.State.updateSetting('battleSpeed', next);
          speedBtn.textContent = `速度 ${next}x`;
          speedBtn.className = `btn${next === 3 ? ' gold' : ' active-toggle'}`;
        }
      }
    });

    const middleBtn = session.isAutoLoop
      ? el('button', {
          type: 'button',
          className: session.stopLoopRequested ? 'btn active-toggle' : 'btn primary',
          disabled: session.stopLoopRequested,
          text: session.stopLoopRequested ? '戦闘完了後に終了' : '周回を終了予約',
          on: {
            click: () => {
              session.requestStopLoop();
              updateHeaderPills();
              middleBtn.textContent = '戦闘完了後に終了';
              middleBtn.disabled = true;
              middleBtn.className = 'btn active-toggle';
            }
          }
        })
      : el('button', {
          type: 'button',
          className: 'btn num',
          disabled: true,
          text: `戦闘時間 ${formatTime(session.battleElapsedMs)}`
        });

    const retreatBtn = el('button', {
      type: 'button',
      className: 'btn danger',
      text: '撤退',
      on: {
        click: () => {
          HS.UI.App.openSheet('戦闘から撤退しますか？', [
            el('div', { className: 'section-sub', text: session.isAutoLoop ? '現在進行中の戦闘を中断し、ここまでの周回リザルトを表示します。' : 'この戦闘を中断して帰還します。' })
          ], [
            el('button', { type: 'button', className: 'btn full', text: '戦闘を続ける', on: { click: () => HS.UI.App.closeSheet() } }),
            el('button', {
              type: 'button',
              className: 'btn danger full',
              text: '撤退する',
              on: {
                click: () => {
                  HS.UI.App.closeSheet();
                  if (session) session.retreat();
                }
              }
            })
          ]);
        }
      }
    });

    const actionBar = el('div', { className: 'battle-action-bar' }, speedBtn, middleBtn, retreatBtn);
    const dock = el('div', { className: 'battle-dock' }, drawerBody, drawerTabs, actionBar);

    clear(container);
    container.appendChild(el('div', { className: 'battle-screen' }, header, turnBar, arena, dock));

    refs = {
      stageTitle,
      wavePill,
      loopPill,
      intruderPill,
      turnOrderTrack,
      enemyGrid,
      allyGrid,
      centerStrip,
      arena,
      vfxLayer,
      drawerBody,
      timerBtn: session.isAutoLoop ? null : middleBtn,
      lastTimerText: '',
      logList: null,
      dpsRows: null,
      unitRefs: {},
      lastOrderKey: '',
      lastDpsPaint: 0
    };

    renderDrawerContent();
    rebuildUnitsDOM();
  }

  // Dedicated Single Battle Result Screen
  function renderSingleResult(container, data) {
    const { victory, retreated, plan, elapsedMs, rewards, dps } = data;
    const banner = el(
      'div',
      { className: `result-banner${victory ? '' : ' defeat'}` },
      el('div', { className: 'result-heading', text: victory ? '✦ VICTORY ✦' : retreated ? '撤退完了' : '✕ DEFEAT ✕' }),
      el('div', { className: 'result-sub', text: `${plan.title} ／ 経過 ${formatTime(elapsedMs)}` })
    );

    const upperContent = el('div', { className: 'upper-display result-upper' }, banner);

    if (victory && rewards) {
      if (rewards.alreadyClaimedTower) {
        upperContent.appendChild(el('div', { className: 'panel-card', text: 'この階層の初回報酬はすでに獲得済みです。' }));
      } else {
        upperContent.appendChild(el(
          'div',
          { className: 'stat-grid' },
          el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '🪙世界貨' }), el('span', { className: 'stat-v', text: `+${formatNum(rewards.gold)}` })),
          el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '💎結晶' }), el('span', { className: 'stat-v', text: `+${rewards.crystal}` })),
          el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '🔮欠片' }), el('span', { className: 'stat-v', text: `+${rewards.shard}` }))
        ));
      }
      if (rewards.newChar) {
        upperContent.appendChild(el('div', { className: 'panel-card quality-perfect', text: `✦ 新たな仲間【${rewards.newChar.name}】が加入しました！` }));
      }
    }

    // 4-member compact 2x2 DPS report placed cleanly in upper showcase (all 4 visible without scrolling!)
    const dpsRows = Object.values(dps || {});
    if (dpsRows.length > 0) {
      upperContent.appendChild(el(
        'div',
        { className: 'grid-2' },
        dpsRows.map((row) => el(
          'div',
          { className: 'panel-card', style: { padding: '5px 7px' } },
          el('div', { style: { fontSize: '11px', fontWeight: '800' }, text: `${(HS.CONST.EL_MAP[row.element]?.icon || '')} ${row.name}` }),
          el('div', { style: { fontSize: '9.5px', color: '#a8b7d4', marginTop: '2px' }, className: 'num', text: `与${formatNum(row.dealt)} / 被${formatNum(row.taken)}` }),
          el('div', { style: { fontSize: '9.5px', color: '#7df5c3' }, className: 'num', text: `癒${formatNum(row.healOut)} / 受癒${formatNum(row.healIn)}` })
        ))
      ));
    }

    // Lower Thumb Zone: Drops + Action Buttons
    const lowerList = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });

    if (victory && rewards && rewards.drops.length > 0) {
      lowerList.appendChild(el('div', { className: 'section-title', text: '獲得・自動売却装備' }));
      for (const dr of rewards.drops) {
        const def = HS.Data.EQUIP_ITEM_MAP[dr.item.itemId];
        const isPerf = dr.item.quality === 100;
        lowerList.appendChild(el(
          'div',
          { className: `panel-card${isPerf ? ' quality-perfect' : ''}` },
          el(
            'div',
            { className: 'item-top' },
            el('span', { className: 'item-name', text: def.name }),
            isPerf
              ? el('span', { className: 'chip perfect-badge', text: '✦極100%' })
              : el('span', { className: 'chip', text: `品質${dr.item.quality}%` })
          ),
          el('div', { className: 'section-sub', text: dr.kept ? 'バッグへ収納' : `自動売却 → 世界貨+${dr.soldGold}` })
        ));
      }
    } else {
      lowerList.appendChild(el('div', { className: 'panel-card section-sub', text: victory ? '装備ドロップはありませんでした。' : '編成・アビリティ・装備を見直して再挑戦できます。' }));
    }

    // Action buttons strictly at the bottom!
    const btns = [];
    btns.push(el('button', {
      type: 'button',
      className: 'btn full',
      text: '出撃画面へ戻る',
      on: {
        click: () => {
          resultView = null;
          HS.UI.App.render();
        }
      }
    }));

    // Next stage / floor convenience button
    let nextCfg = null;
    if (victory && plan.mode === 'normal') {
      if (plan.stageNum < 10) nextCfg = { mode: 'normal', areaId: plan.areaId, stageNum: plan.stageNum + 1 };
      else if (plan.areaId < 6) nextCfg = { mode: 'normal', areaId: plan.areaId + 1, stageNum: 1 };
    } else if (victory && plan.mode === 'tower' && plan.floor < 100) {
      nextCfg = { mode: 'tower', towerId: plan.towerId, floor: plan.floor + 1 };
    }

    if (nextCfg) {
      btns.push(el('button', {
        type: 'button',
        className: 'btn primary full',
        text: plan.mode === 'tower' ? `次の階層 (${nextCfg.floor}F) へ` : `次へ (${nextCfg.areaId}-${nextCfg.stageNum})`,
        on: {
          click: () => {
            if (nextCfg.mode === 'normal') {
              HS.Engine.State.updateUiSelection({ areaId: nextCfg.areaId, stageNum: nextCfg.stageNum });
            }
            startBattle(nextCfg, false);
          }
        }
      }));
    } else {
      btns.push(el('button', {
        type: 'button',
        className: 'btn primary full',
        text: 'もう一度挑む',
        on: {
          click: () => {
            const retryCfg = plan.mode === 'normal'
              ? { mode: 'normal', areaId: plan.areaId, stageNum: plan.stageNum }
              : plan.mode === 'tower'
                ? { mode: 'tower', towerId: plan.towerId, floor: plan.floor }
                : plan.mode === 'raid'
                  ? { mode: 'raid', raidId: plan.raidId, raidLv: plan.raidLv }
                  : { mode: 'constraint', constraintId: plan.constraintId };
            startBattle(retryCfg, false);
          }
        }
      }));
    }

    const lowerControls = el(
      'div',
      { className: 'lower-thumb' },
      lowerList,
      el('div', { className: 'grid-2' }, btns)
    );

    clear(container);
    container.appendChild(el('div', { className: 'split-screen' }, upperContent, lowerControls));
  }

  // Dedicated Auto-Loop Summary Result Screen (separate from single result!)
  function renderLoopResult(container, data, config) {
    const avgMs = data.runs > 0 ? Math.round(data.totalElapsedMs / data.runs) : 0;
    const winRate = data.runs > 0 ? Math.round((data.wins / data.runs) * 100) : 0;

    const banner = el(
      'div',
      { className: 'result-banner loop-summary' },
      el('div', { className: 'result-heading', text: '✦ 自動周回リザルト ✦' }),
      el('div', { className: 'result-sub num', text: `総計 ${data.runs}周（勝${data.wins} / 敗${data.losses}・勝率${winRate}%）` })
    );

    const summaryGrid = el(
      'div',
      { className: 'stat-grid' },
      el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '累計時間' }), el('span', { className: 'stat-v', text: formatTime(data.totalElapsedMs) })),
      el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '平均1周' }), el('span', { className: 'stat-v', text: formatTime(avgMs) })),
      el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '乱入撃破' }), el('span', { className: 'stat-v', text: `${data.intruders}体` })),
      el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '🪙世界貨' }), el('span', { className: 'stat-v', text: `+${formatNum(data.gold)}` })),
      el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '💎結晶' }), el('span', { className: 'stat-v', text: `+${data.crystal}` })),
      el('div', { className: 'stat-box' }, el('span', { className: 'stat-k', text: '🔮欠片' }), el('span', { className: 'stat-v', text: `+${data.shard}` }))
    );

    const soldSummary = el('div', {
      className: 'panel-card',
      style: { padding: '6px 8px' },
      text: `自動売却：${data.autoSoldCount}個（世界貨+${formatNum(data.autoSoldGold)}） ／ 獲得保持：${data.keptDrops.length}個`
    });

    const elapsedSec = Math.max(1, data.totalElapsedMs / 1000);
    const loopDpsGrid = el(
      'div',
      { className: 'grid-2' },
      Object.values(data.dps || {}).map((row) => el(
        'div',
        { className: 'panel-card', style: { padding: '4px 6px' } },
        el('div', { style: { fontSize: '10.5px', fontWeight: '800' }, text: `${(HS.CONST.EL_MAP[row.element]?.icon || '')} ${row.name}` }),
        el('div', { style: { fontSize: '9.5px', color: '#a8b7d4' }, className: 'num', text: `与${formatNum(row.dealt)}(${formatNum(row.dealt / elapsedSec)}/s)` }),
        el('div', { style: { fontSize: '9.5px', color: '#7df5c3' }, className: 'num', text: `被${formatNum(row.taken)} 癒${formatNum(row.healOut)} 受${formatNum(row.healIn)}` })
      ))
    );

    const upper = el('div', { className: 'upper-display result-upper' }, banner, summaryGrid, soldSummary, loopDpsGrid);

    // Lower zone: Kept Drops + Action buttons
    const lowerBody = el('div', { className: 'list-col scroll-zone', style: { flex: '1 1 auto', minHeight: '0' } });

    const sortedDrops = data.keptDrops.slice().sort((a, b) => b.quality - a.quality);
    if (sortedDrops.length > 0) {
      lowerBody.appendChild(el('div', { className: 'section-title', text: `獲得装備（高品質順・${sortedDrops.length}個）` }));
      for (const item of sortedDrops.slice(0, 40)) {
        const def = HS.Data.EQUIP_ITEM_MAP[item.itemId];
        const isPerf = item.quality === 100;
        lowerBody.appendChild(el(
          'div',
          { className: `panel-card${isPerf ? ' quality-perfect' : ''}` },
          el(
            'div',
            { className: 'item-top' },
            el('span', { className: 'item-name', text: def.name }),
            isPerf
              ? el('span', { className: 'chip perfect-badge', text: '✦極100%' })
              : el('span', { className: 'chip', text: `品質${item.quality}%` })
          )
        ));
      }
    } else {
      lowerBody.appendChild(el('div', { className: 'panel-card section-sub', text: '保持された新規ドロップ装備はありません（自動売却分は上部に集計）。' }));
    }

    const footer = el(
      'div',
      { className: 'grid-2' },
      el('button', {
        type: 'button',
        className: 'btn full',
        text: '出撃画面へ戻る',
        on: {
          click: () => {
            resultView = null;
            HS.UI.App.render();
          }
        }
      }),
      el('button', {
        type: 'button',
        className: 'btn gold full',
        text: 'もう一度自動周回',
        on: {
          click: () => startBattle(config, true)
        }
      })
    );

    clear(container);
    container.appendChild(el('div', { className: 'split-screen' }, upper, el('div', { className: 'lower-thumb' }, lowerBody, footer)));
  }

  function render(container) {
    if (session) {
      renderBattleLive(container);
    } else if (resultView && resultView.kind === 'single') {
      renderSingleResult(container, resultView.data);
    } else if (resultView && resultView.kind === 'loop') {
      renderLoopResult(container, resultView.data, resultView.config);
    }
  }

  HS.UI.BattleView = {
    isActive,
    getStatusLabel,
    startBattle,
    render
  };
})();
