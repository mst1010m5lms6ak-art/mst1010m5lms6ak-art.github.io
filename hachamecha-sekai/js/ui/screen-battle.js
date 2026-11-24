(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const uiState = {
    infoTab: 'log',      // log | dps | rule
    dpsMetric: 'dmgDealt', // dmgDealt | dmgTaken | healDone | healRecv
    lastLogSeq: -1,
    lastWaveKey: ''
  };

  let refs = null;

  function renderUnitCardInner(u) {
    const el = C.ELEMENT_MAP[u.element] || C.ELEMENT_MAP.none;
    const tag = u.isIntruder ? '🚨' : (u.isBoss ? '👑' : '');
    const hpPct = u.maxHp > 0 ? U.clamp(u.hp / u.maxHp, 0, 1) : 0;
    const shPct = u.maxHp > 0 ? U.clamp(u.shield / u.maxHp, 0, 1) : 0;
    const ctPct = U.clamp((u.ct || 0) / 1000, 0, 1);
    const hpBarCls = u.side === 'enemy' ? 'gauge-enemy-hp' : (hpPct > 0.5 ? 'gauge-hp' : (hpPct > 0.25 ? 'gauge-hp-mid' : 'gauge-hp-low'));

    const stTags = (u.statuses || []).slice(0, 6).map((s) => {
      const m = C.STATUS_META[s.id];
      return m ? `<span class="st-tag ${m.cls}">${m.tag}${s.turns}</span>` : '';
    }).join('');

    return `
      <div class="bu-head">
        <span class="bu-name">${tag}${el.icon}${U.escapeHtml(u.name)}</span>
        <span class="bu-hp-text" data-hp-txt>${U.formatNum(u.hp)}</span>
      </div>
      <div class="bu-bars">
        <div class="gauge-track hp-track">
          <div class="gauge-fill ${hpBarCls}" data-hp-bar style="transform:scaleX(${hpPct});"></div>
          <div class="gauge-fill gauge-shield" data-sh-bar style="transform:scaleX(${shPct});"></div>
        </div>
        <div class="gauge-track ct-track">
          <div class="gauge-fill gauge-ct" data-ct-bar style="transform:scaleX(${ctPct});"></div>
        </div>
      </div>
      <div class="bu-status-strip" data-st-strip>${stTags}</div>
    `;
  }

  function mountBattleLayout(topEl, bottomEl, snapshot, controller, app) {
    uiState.lastLogSeq = -1;
    uiState.lastWaveKey = '';

    /* ==================== 上半分：閲覧専用戦場＋行動順＋Canvas ==================== */
    topEl.innerHTML = `
      <div class="battle-top-wrap">
        <div class="battle-hud-bar">
          <div class="battle-hud-row">
            <span id="bh-stage-name">${U.escapeHtml(snapshot.stage.name)}</span>
            <span id="bh-wave-badge" class="badge scope-area">WAVE 1/${snapshot.stage.waves}</span>
          </div>
          <div class="chain-bar-wrap">
            <span class="bu-hp-text" style="color:#ffd15c;">🌈共鳴</span>
            <div class="gauge-track"><div id="bh-chain-fill" class="gauge-fill gauge-chain" style="transform:scaleX(0);"></div></div>
            <span id="bh-chain-pct" class="bu-hp-text" style="width:30px;text-align:right;">0%</span>
            <span id="bh-loop-pill" class="badge q-master hidden"></span>
          </div>
        </div>

        <div class="turn-order-bar" id="bh-turn-order"></div>

        <div class="battle-arena" id="bh-arena">
          <div class="battle-row-enemies" id="bh-enemies"></div>
          <div id="bh-mid-lane" class="battle-mid-lane"></div>
          <div class="battle-row-allies" id="bh-allies"></div>
          <canvas class="battle-vfx-canvas" id="bh-vfx-canvas"></canvas>
        </div>
      </div>
    `;

    /* ==================== 下半分：親指ゾーン操作（ログ／DPS／共鳴 ＋ 速度・周回・自動売却・撤退） ==================== */
    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${uiState.infoTab === 'log' ? 'active' : ''}" data-btab="log">📜 行動ログ</button>
        <button class="sub-tab ${uiState.infoTab === 'dps' ? 'active' : ''}" data-btab="dps">📊 DPSメーター</button>
        <button class="sub-tab ${uiState.infoTab === 'rule' ? 'active' : ''}" data-btab="rule">🌈 法則・共鳴</button>
      </div>

      <div class="battle-info-box" id="bb-info-box"></div>

      <div class="battle-ctrl-grid" id="bb-ctrl-grid">
        <button class="btn btn-sm" id="btn-b-speed"></button>
        <button class="btn btn-sm" id="btn-b-loop"></button>
        <button class="btn btn-sm" id="btn-b-sell"></button>
        <button class="btn btn-sm btn-danger" id="btn-b-retreat">🏳️ 撤退</button>
      </div>
    `;

    refs = {
      stageName: topEl.querySelector('#bh-stage-name'),
      waveBadge: topEl.querySelector('#bh-wave-badge'),
      chainFill: topEl.querySelector('#bh-chain-fill'),
      chainPct: topEl.querySelector('#bh-chain-pct'),
      loopPill: topEl.querySelector('#bh-loop-pill'),
      turnOrder: topEl.querySelector('#bh-turn-order'),
      midLane: topEl.querySelector('#bh-mid-lane'),
      enemiesBox: topEl.querySelector('#bh-enemies'),
      alliesBox: topEl.querySelector('#bh-allies'),
      canvas: topEl.querySelector('#bh-vfx-canvas'),
      infoBox: bottomEl.querySelector('#bb-info-box'),
      speedBtn: bottomEl.querySelector('#btn-b-speed'),
      loopBtn: bottomEl.querySelector('#btn-b-loop'),
      sellBtn: bottomEl.querySelector('#btn-b-sell'),
      retreatBtn: bottomEl.querySelector('#btn-b-retreat'),
      bottomEl
    };

    controller.vfx.attach(refs.canvas);
    requestAnimationFrame(() => controller.vfx.resize());

    /* 下部タブ切替 */
    bottomEl.querySelectorAll('[data-btab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.infoTab = btn.getAttribute('data-btab');
        bottomEl.querySelectorAll('[data-btab]').forEach((x) => {
          x.classList.toggle('active', x.getAttribute('data-btab') === uiState.infoTab);
        });
        uiState.lastLogSeq = -1;
        renderInfoPanel(controller.getSnapshot(), true);
      });
    });

    /* 3倍速切替 */
    refs.speedBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const s = Hacha.state.settings.battleSpeed || 1;
      Hacha.state.settings.battleSpeed = s === 1 ? 2 : (s === 2 ? 3 : 1);
      Hacha.storage.saveState(true);
      syncControlButtons(controller.getSnapshot());
    });

    /* 自動周回ON / 周回終了予約（進行中の戦闘完了後に終了する仕様） */
    refs.loopBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const snap = controller.getSnapshot();
      if (!snap) return;
      if (snap.loop && snap.loop.active) {
        if (snap.loop.stopRequested) {
          controller.enableLoopMidBattle();
          Hacha.ui.common.showToast('周回終了予約を取り消しました');
        } else {
          controller.requestStopLoop();
          Hacha.ui.common.showToast('この戦闘が完了したら周回を終了します', 'gold');
        }
      } else {
        Hacha.state.settings.autoLoop = true;
        Hacha.storage.saveState(true);
        controller.enableLoopMidBattle();
        Hacha.ui.common.showToast('自動周回をONにしました！', 'gold');
      }
      syncControlButtons(controller.getSnapshot());
    });

    /* 自動売却しきい値切替 */
    refs.sellBtn.addEventListener('click', () => {
      Hacha.ui.common.cycleAutoSellSetting();
      syncControlButtons(controller.getSnapshot());
    });

    /* 撤退（下部確認ボトムシート：見切れ防止＆空白解消） */
    refs.retreatBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      Hacha.ui.common.openBottomOverlay(
        `<div class="panel"><div class="view-title">撤退の確認</div><div class="note-text" style="margin-top:4px;">進行中の戦闘から撤退します。自動周回中ならここまでの戦果を周回レポートで確認できます。</div></div>`,
        `
          <div class="action-row">
            <button class="btn btn-danger" id="cf-retreat-yes">🏳️ 撤退する</button>
            <button class="btn btn-primary" id="cf-retreat-no">戦闘を続ける</button>
          </div>
        `,
        (root) => {
          root.querySelector('#cf-retreat-yes').addEventListener('click', () => {
            Hacha.ui.common.closeOverlay();
            controller.retreat();
          });
          root.querySelector('#cf-retreat-no').addEventListener('click', () => {
            Hacha.audio.play('tap');
            Hacha.ui.common.closeOverlay();
          });
        },
        { compact: true }
      );
    });

    syncControlButtons(snapshot);
    updateFrame(snapshot);
  }

  function syncControlButtons(snap) {
    if (!refs) return;
    const sp = Hacha.state.settings.battleSpeed || 1;
    refs.speedBtn.textContent = `⏩ ${sp}倍速`;
    refs.speedBtn.className = `btn btn-sm ${sp === 3 ? 'btn-gold' : (sp === 2 ? 'btn-primary' : '')}`;

    if (snap && snap.loop && snap.loop.active) {
      if (snap.loop.stopRequested) {
        refs.loopBtn.textContent = '⏳ 終了予約';
        refs.loopBtn.className = 'btn btn-sm btn-toggle-warn';
      } else {
        refs.loopBtn.textContent = '🔁 周回:ON';
        refs.loopBtn.className = 'btn btn-sm btn-toggle-on';
      }
    } else {
      refs.loopBtn.textContent = '🔁 周回:OFF';
      refs.loopBtn.className = 'btn btn-sm';
    }

    const thr = Hacha.state.settings.autoSellBelow || 0;
    refs.sellBtn.textContent = thr > 0 ? `💰 <${thr}%売` : '💰 売却:OFF';
    refs.sellBtn.className = `btn btn-sm ${thr > 0 ? 'btn-toggle-warn' : ''}`;
  }

  function rebuildUnitSlots(snap) {
    /* 敵4枠（空きスロットはプレースホルダ固定でズレ防止） */
    const eBySlot = [null, null, null, null];
    snap.enemies.forEach((e) => { eBySlot[e.slot] = e; });
    refs.enemiesBox.innerHTML = eBySlot.map((e, idx) => {
      if (!e) return `<div class="battle-unit-empty" data-eslot="${idx}"></div>`;
      const cls = `battle-unit-card enemy-card ${e.isBoss ? 'boss-card' : ''} ${e.isIntruder ? 'intruder-card' : ''}`;
      return `<div class="${cls}" data-ukey="${e.key}">${renderUnitCardInner(e)}</div>`;
    }).join('');

    /* 味方4枠 */
    const aBySlot = [null, null, null, null];
    snap.allies.forEach((a) => { aBySlot[a.slot] = a; });
    refs.alliesBox.innerHTML = aBySlot.map((a, idx) => {
      if (!a) return `<div class="battle-unit-empty" data-aslot="${idx}"></div>`;
      return `<div class="battle-unit-card" data-ukey="${a.key}">${renderUnitCardInner(a)}</div>`;
    }).join('');
  }

  function patchUnitCard(container, u, activeKey) {
    const card = container.querySelector(`[data-ukey="${u.key}"]`);
    if (!card) return;
    card.classList.toggle('is-acting', u.key === activeKey);
    card.classList.toggle('is-hit', u.hitFlash > 0);
    card.classList.toggle('is-dead', !u.alive);

    const hpTxt = card.querySelector('[data-hp-txt]');
    const hpBar = card.querySelector('[data-hp-bar]');
    const shBar = card.querySelector('[data-sh-bar]');
    const ctBar = card.querySelector('[data-ct-bar]');
    const stStrip = card.querySelector('[data-st-strip]');

    const hpPct = u.maxHp > 0 ? U.clamp(u.hp / u.maxHp, 0, 1) : 0;
    const shPct = u.maxHp > 0 ? U.clamp(u.shield / u.maxHp, 0, 1) : 0;
    const ctPct = U.clamp((u.ct || 0) / 1000, 0, 1);

    if (hpTxt) hpTxt.textContent = u.shield > 0 ? `${U.formatNum(u.hp)}+${U.formatNum(u.shield)}` : U.formatNum(u.hp);
    if (hpBar) {
      hpBar.style.transform = `scaleX(${hpPct})`;
      if (u.side === 'ally') {
        hpBar.className = `gauge-fill ${hpPct > 0.5 ? 'gauge-hp' : (hpPct > 0.25 ? 'gauge-hp-mid' : 'gauge-hp-low')}`;
      }
    }
    if (shBar) shBar.style.transform = `scaleX(${shPct})`;
    if (ctBar) ctBar.style.transform = `scaleX(${ctPct})`;

    if (stStrip) {
      const key = u.statuses.map((s) => `${s.id}:${s.turns}`).join(',');
      if (stStrip.dataset.lastSt !== key) {
        stStrip.dataset.lastSt = key;
        stStrip.innerHTML = u.statuses.slice(0, 6).map((s) => {
          const m = C.STATUS_META[s.id];
          return m ? `<span class="st-tag ${m.cls}">${m.tag}${s.turns}</span>` : '';
        }).join('');
      }
    }
  }

  function renderInfoPanel(snap, force) {
    if (!refs || !snap) return;
    const box = refs.infoBox;

    if (uiState.infoTab === 'log') {
      const latestSeq = snap.logs.length ? snap.logs[snap.logs.length - 1].id : 0;
      if (!force && latestSeq === uiState.lastLogSeq) return;
      uiState.lastLogSeq = latestSeq;

      /* コンテナ高さから整数行のみを切り出すため、上端ログが見切れない */
      const h = box.clientHeight || 150;
      const maxRows = Math.max(4, Math.floor((h - 10) / 24));
      const visible = snap.logs.slice(-maxRows);

      const rowsHtml = visible.map((row) => {
        const kCls = row.kind === 'chain' ? 'log-chain' : (row.kind === 'intrusion' ? 'log-intrusion' : (row.kind === 'wave' ? 'log-wave' : ''));
        return `
          <div class="log-row ${kCls}">
            <span class="log-actor">${U.escapeHtml(row.actor)}</span>
            <span class="log-action">${U.escapeHtml(row.action)}</span>
            <span class="log-result ${row.resultCls}">${U.escapeHtml(row.result)}</span>
          </div>
        `;
      }).join('');

      box.innerHTML = `<div class="battle-log-viewport">${rowsHtml}</div>`;
    } else if (uiState.infoTab === 'dps') {
      const metrics = [
        { id: 'dmgDealt', label: '与ダメ', barCls: 'gauge-enemy-hp' },
        { id: 'dmgTaken', label: '被ダメ', barCls: 'gauge-hp-mid' },
        { id: 'healDone', label: '与回復', barCls: 'gauge-hp' },
        { id: 'healRecv', label: '被回復', barCls: 'gauge-ct' }
      ];
      const curM = metrics.find((m) => m.id === uiState.dpsMetric) || metrics[0];
      const list = Object.keys(snap.dpsMap).map((k) => snap.dpsMap[k]);
      const maxVal = Math.max(1, ...list.map((r) => r[curM.id] || 0));
      const sec = Math.max(1, snap.dpsElapsedSec || 1);

      if (!box.querySelector('.dps-metric-tabs') || force) {
        box.innerHTML = `
          <div class="dps-metric-tabs">
            ${metrics.map((m) => `<button class="dps-tab ${uiState.dpsMetric === m.id ? 'active' : ''}" data-dpsm="${m.id}">${m.label}</button>`).join('')}
          </div>
          <div class="dps-rows" id="bb-dps-rows"></div>
        `;
        box.querySelectorAll('[data-dpsm]').forEach((b) => {
          b.addEventListener('click', () => {
            Hacha.audio.play('tap');
            uiState.dpsMetric = b.getAttribute('data-dpsm');
            renderInfoPanel(snap, true);
          });
        });
      }

      const rowsEl = box.querySelector('#bb-dps-rows');
      if (rowsEl) {
        rowsEl.innerHTML = list.map((rec) => {
          const val = rec[curM.id] || 0;
          const pct = val / maxVal;
          const perSec = Math.round(val / sec);
          return `
            <div class="dps-row">
              <div class="dps-row-head">
                <span class="unit-name-full">${rec.icon}${U.escapeHtml(rec.name)}</span>
                <span class="dps-val">${U.formatNum(val)}（${U.formatNum(perSec)}/秒）</span>
              </div>
              <div class="gauge-track"><div class="gauge-fill ${curM.barCls}" style="transform:scaleX(${pct});"></div></div>
            </div>
          `;
        }).join('');
      }
    } else if (force) {
      /* 法則・共鳴タブ */
      const r = snap.rule;
      const resTags = snap.resonances.length
        ? snap.resonances.map((x) => `<div class="skill-mini-row"><span class="unit-name-full">${x.icon}${U.escapeHtml(x.name)}</span><span class="skill-desc-line">${U.escapeHtml(x.desc)}</span></div>`).join('')
        : `<div class="skill-mini-row"><span class="bu-hp-text">発動中の世界共鳴なし</span></div>`;

      box.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;overflow:hidden;height:100%;">
          <div class="flavor-box"><strong>${r ? `${r.icon} ${r.name}` : '世界法則'}</strong>：${U.escapeHtml(r ? r.summary : '')}</div>
          <div style="display:flex;flex-direction:column;gap:3px;overflow:hidden;">${resTags}</div>
        </div>
      `;
    }
  }

  function updateFrame(snap) {
    if (!refs || !snap) return;

    const waveKey = `${snap.stage.id}_w${snap.wave}_e${snap.enemies.map((e) => e.key).join(',')}_a${snap.allies.map((a) => a.key).join(',')}`;
    if (waveKey !== uiState.lastWaveKey) {
      uiState.lastWaveKey = waveKey;
      refs.stageName.textContent = snap.stage.name;
      refs.waveBadge.textContent = `WAVE ${snap.wave}/${snap.stage.waves}`;
      rebuildUnitSlots(snap);
      syncControlButtons(snap);
      if (uiState.infoTab === 'rule') renderInfoPanel(snap, true);
    }

    /* 共鳴チェインゲージ（ぬるぬる） */
    const cPct = U.clamp(snap.chainGauge / 100, 0, 1);
    refs.chainFill.style.transform = `scaleX(${cPct})`;
    refs.chainPct.textContent = `${Math.floor(snap.chainGauge)}%`;

    if (snap.loop && snap.loop.active) {
      refs.loopPill.classList.remove('hidden');
      refs.loopPill.textContent = snap.loop.stopRequested ? `周回${snap.loop.runs + 1}・終了予約` : `周回 ${snap.loop.runs + 1}周目`;
    } else {
      refs.loopPill.classList.add('hidden');
    }

    /* 専用中央レーン（乱入警報・共鳴チェイン・周回遷移・世界法則表示：敵味方カードと絶対非干渉） */
    if (refs.midLane) {
      let midText = snap.rule ? `${snap.rule.icon} ${snap.rule.name}` : 'はちゃめちゃ戦場';
      let midCls = 'battle-mid-lane';
      if (snap.intrusionBanner) {
        midText = snap.intrusionBanner;
        midCls = 'battle-mid-lane is-intrusion';
      } else if (snap.chainBanner) {
        midText = snap.chainBanner;
        midCls = 'battle-mid-lane is-chain';
      } else if (snap.phase === 'loop_intermission' && snap.loop) {
        midText = `🔁 ${snap.loop.runs}周目クリア！ 次の周回を開始します…`;
        midCls = 'battle-mid-lane is-intermission';
      }
      if (refs.midLane.textContent !== midText || refs.midLane.className !== midCls) {
        refs.midLane.textContent = midText;
        refs.midLane.className = midCls;
      }
    }

    /* ユニットゲージ・状態異常を毎フレームぬるぬる更新 */
    snap.enemies.forEach((e) => patchUnitCard(refs.enemiesBox, e, snap.activeActorKey));
    snap.allies.forEach((a) => patchUnitCard(refs.alliesBox, a, snap.activeActorKey));

    /* 行動順タイムライン更新（4体均等グリッドで右端見切れゼロ） */
    const top4 = snap.turnOrder.slice(0, 4);
    const orderKey = top4.map((t) => `${t.unit.key}:${t.acting ? 1 : 0}`).join('|');
    if (refs.turnOrder.dataset.lastOrder !== orderKey) {
      refs.turnOrder.dataset.lastOrder = orderKey;
      const chips = top4.map((t) => {
        const cls = `${t.unit.side === 'ally' ? 'ally' : 'enemy'} ${t.acting ? 'acting' : ''}`;
        return `<span class="turn-chip ${cls}">${t.unit.icon}${U.escapeHtml(t.unit.name)}</span>`;
      }).join('');
      refs.turnOrder.innerHTML = `<span class="turn-order-label">順▶</span><div class="turn-chips-grid">${chips}</div>`;
    }

    /* ログ／DPS更新 */
    if (uiState.infoTab === 'log' || uiState.infoTab === 'dps') {
      renderInfoPanel(snap, false);
    }
  }

  /* ==================== 通常リザルト画面（周回リザルトとは完全別UI） ==================== */
  function showNormalResult(result, app) {
    const cm = Hacha.ui.common;
    const totalCrys = result.crystals.tank + result.crystals.dealer + result.crystals.supporter + result.crystals.healer;

    const dropsHtml = result.keptDrops.length
      ? result.keptDrops.slice(0, 4).map((d) => {
          const tpl = Hacha.data.EQUIPMENT_MAP[d.item.templateId];
          const q = U.getQualityInfo(d.item.quality);
          return `
            <div class="item-tile ${q.cardClass}" style="padding:4px 6px;">
              <div class="unit-name-full">${tpl.icon}${U.escapeHtml(tpl.name)}</div>
              <div>${cm.qualityBadge(d.item.quality)}</div>
            </div>
          `;
        }).join('')
      : `<div class="panel" style="grid-column:span 2;"><span class="bu-hp-text">${result.autoSoldCount > 0 ? `全ドロップ自動売却（${result.autoSoldCount}個 → 🪙+${result.autoSoldCoins}）` : '装備ドロップなし'}</span></div>`;

    const scoutHtml = result.newScouts.length
      ? `<div class="panel card-perfect"><div class="unit-name-full" style="color:#ffe066;">🎉 新たな仲間が加入！ ${result.newScouts.map((s) => `${s.icon}${s.name}`).join('・')}</div></div>`
      : '';

    const rankHtml = result.rankUps.length
      ? `<div class="panel"><div class="bu-hp-text" style="color:#6effb8;">📜 技習熟UP：${result.rankUps.slice(0, 3).map((r) => `${r.charName}「${r.skillName}」R${r.rank}`).join(' / ')}</div></div>`
      : '';

    const dispHtml = result.dispatchReports.length
      ? `<div class="panel"><div class="bu-hp-text" style="color:#7be3ff;">🧭 派遣完了：${result.dispatchReports.map((d) => `${d.icon}${d.missionName}`).join('・')}</div></div>`
      : '';

    const topDps = result.dpsSnapshot.slice().sort((a, b) => b.dmgDealt - a.dmgDealt)[0];

    const topHtml = `
      <div class="result-banner ${result.won ? 'result-win' : 'result-lose'}">
        ${result.won ? '✨ 戦闘勝利！' : (result.retreated ? '🏳️ 戦闘から撤退' : '💥 敗北…編成を見直そう')}
      </div>
      <div class="panel">
        <div class="meta-row-nowrap" style="margin-bottom:4px;">
          <span class="unit-name-full">${U.escapeHtml(result.stage.name)}</span>
          <span class="bu-hp-text">時間 ${U.formatDuration(result.elapsedSec)}</span>
        </div>
        <div class="result-summary-grid">
          <div class="stat-chip"><span class="stat-chip-lbl">獲得資金</span><span class="stat-chip-val">🪙+${U.formatNum(result.coins)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">結晶 / 巻物</span><span class="stat-chip-val">💎${totalCrys} / 📜${result.scrolls}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">核片 / 乱入</span><span class="stat-chip-val">🔮${result.fragments} / 🚨${result.intruderCount}</span></div>
        </div>
      </div>
      ${scoutHtml}
      ${rankHtml}
      ${dispHtml}
      <div class="panel">
        <div class="meta-row-nowrap" style="margin-bottom:4px;">
          <span class="bu-hp-text" style="color:#48d6ff;">獲得装備</span>
          <span class="bu-hp-text">${result.autoSoldCount > 0 ? `自動売却 ${result.autoSoldCount}個 (+🪙${result.autoSoldCoins})` : ''}</span>
        </div>
        <div class="result-drop-grid">${dropsHtml}</div>
      </div>
      ${topDps ? `<div class="panel"><span class="bu-hp-text">🏆 最多与ダメージ：${topDps.icon}${U.escapeHtml(topDps.name)}（${U.formatNum(topDps.dmgDealt)}）</span></div>` : ''}
    `;

    const hasNextMain = result.won && result.stage.mode === 'main' && !(result.stage.areaIndex === 5 && result.stage.stageNum === 10);
    const hasNextTower = result.won && result.stage.mode === 'tower';

    const bottomHtml = `
      <div class="action-row">
        <button class="btn btn-primary" id="nr-retry">⚔️ もう一度挑戦</button>
        ${hasNextMain ? `<button class="btn btn-emerald" id="nr-next">▶ 次のステージへ</button>` : ''}
        ${hasNextTower ? `<button class="btn btn-emerald" id="nr-next-tower">🗼 次の階層へ</button>` : ''}
      </div>
      <div class="action-row">
        <button class="btn btn-gold" id="nr-loop">🔁 このステージを自動周回</button>
        <button class="btn" id="nr-home">🗺️ 出撃画面へ戻る</button>
      </div>
    `;

    cm.openBottomOverlay(topHtml, bottomHtml, (root) => {
      root.querySelector('#nr-retry').addEventListener('click', () => {
        Hacha.audio.play('tap');
        cm.closeOverlay();
        app.launchBattle(result.stage, false);
      });
      const nextBtn = root.querySelector('#nr-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          Hacha.audio.play('tap');
          cm.closeOverlay();
          const nextSt = Hacha.ui.screenQuest.advanceNextStageIfMain(result.stage);
          if (nextSt) app.launchBattle(nextSt, false);
          else app.exitBattleTo('quest');
        });
      }
      const nextTowerBtn = root.querySelector('#nr-next-tower');
      if (nextTowerBtn) {
        nextTowerBtn.addEventListener('click', () => {
          Hacha.audio.play('tap');
          cm.closeOverlay();
          app.launchBattle(Hacha.data.buildTowerStage(Hacha.state.progress.towerFloor), false);
        });
      }
      root.querySelector('#nr-loop').addEventListener('click', () => {
        Hacha.audio.play('tap');
        Hacha.state.settings.autoLoop = true;
        Hacha.storage.saveState(true);
        cm.closeOverlay();
        app.launchBattle(result.stage, true);
      });
      root.querySelector('#nr-home').addEventListener('click', () => {
        Hacha.audio.play('tap');
        cm.closeOverlay();
        app.exitBattleTo('quest');
      });
    });
  }

  /* ==================== 周回専用リザルト画面（累積DPS・高品質まとめ・自動売却集計） ==================== */
  function showLoopResult(summary, app) {
    const cm = Hacha.ui.common;
    const totalCrys = summary.totalCrystals.tank + summary.totalCrystals.dealer + summary.totalCrystals.supporter + summary.totalCrystals.healer;

    const topDrops = summary.keptDrops.slice().sort((a, b) => b.item.quality - a.item.quality).slice(0, 4);
    const perfectCount = summary.keptDrops.filter((d) => d.item.quality >= 100).length;

    const dropsHtml = topDrops.length
      ? topDrops.map((d) => {
          const tpl = Hacha.data.EQUIPMENT_MAP[d.item.templateId];
          const q = U.getQualityInfo(d.item.quality);
          return `
            <div class="item-tile ${q.cardClass}" style="padding:4px 6px;">
              <div class="unit-name-full">${tpl.icon}${U.escapeHtml(tpl.name)}</div>
              <div>${cm.qualityBadge(d.item.quality)}</div>
            </div>
          `;
        }).join('')
      : `<div class="panel" style="grid-column:span 2;"><span class="bu-hp-text">保持した装備なし（自動売却 ${summary.autoSoldCount}個）</span></div>`;

    const dpsLines = summary.dpsSnapshot.slice().sort((a, b) => b.dmgDealt - a.dmgDealt).map((r) => `
      <div class="meta-row-nowrap" style="font-size:10.5px;">
        <span class="unit-name-full">${r.icon}${U.escapeHtml(r.name)}</span>
        <span class="dps-val">与${U.formatNum(r.dmgDealt)} / 被${U.formatNum(r.dmgTaken)} / 癒${U.formatNum(r.healDone)}</span>
      </div>
    `).join('');

    const scoutHtml = summary.newScouts.length
      ? `<div class="panel card-perfect"><div class="unit-name-full" style="color:#ffe066;">🎉 周回中の新規加入：${summary.newScouts.map((s) => `${s.icon}${s.name}`).join('・')}</div></div>`
      : '';

    const topHtml = `
      <div class="result-banner result-loop">
        🔁 自動周回レポート（全${summary.runs}周：${summary.wins}勝 ${summary.losses}敗）
      </div>
      <div class="panel">
        <div class="meta-row-nowrap" style="margin-bottom:4px;">
          <span class="unit-name-full">${U.escapeHtml(summary.stage.name)}</span>
          <span class="bu-hp-text">総時間 ${U.formatDuration(summary.totalElapsedSec)}</span>
        </div>
        <div class="result-summary-grid">
          <div class="stat-chip"><span class="stat-chip-lbl">累積資金</span><span class="stat-chip-val">🪙+${U.formatNum(summary.totalCoins)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">結晶 / 巻物</span><span class="stat-chip-val">💎${totalCrys} / 📜${summary.totalScrolls}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">核片 / 乱入</span><span class="stat-chip-val">🔮${summary.totalFragments} / 🚨${summary.intruderKills}</span></div>
        </div>
      </div>
      ${scoutHtml}
      <div class="panel">
        <div class="meta-row-nowrap" style="margin-bottom:4px;">
          <span class="bu-hp-text" style="color:#ffd15c;">保持装備 ${summary.keptDrops.length}個${perfectCount > 0 ? `（👑極品質${perfectCount}！）` : ''}</span>
          <span class="bu-hp-text">自動売却 ${summary.autoSoldCount}個 (+🪙${U.formatNum(summary.autoSoldCoins)})</span>
        </div>
        <div class="result-drop-grid">${dropsHtml}</div>
      </div>
      <div class="panel">
        <div class="bu-hp-text" style="color:#48d6ff;margin-bottom:3px;">📊 周回累積DPS戦績（全${summary.runs}周合算・派遣完了${summary.dispatchReports.length}回）</div>
        <div style="display:flex;flex-direction:column;gap:2px;">${dpsLines}</div>
      </div>
    `;

    const bottomHtml = `
      <div class="action-row">
        <button class="btn btn-gold" id="lr-again">🔁 同じ条件で再周回</button>
        <button class="btn btn-primary" id="lr-equip">🎒 装備確認へ</button>
      </div>
      <div class="action-row">
        <button class="btn" id="lr-home">🗺️ 出撃画面へ戻る</button>
      </div>
    `;

    cm.openBottomOverlay(topHtml, bottomHtml, (root) => {
      root.querySelector('#lr-again').addEventListener('click', () => {
        Hacha.audio.play('tap');
        cm.closeOverlay();
        app.launchBattle(summary.stage, true);
      });
      root.querySelector('#lr-equip').addEventListener('click', () => {
        Hacha.audio.play('tap');
        cm.closeOverlay();
        app.exitBattleTo('equip');
      });
      root.querySelector('#lr-home').addEventListener('click', () => {
        Hacha.audio.play('tap');
        cm.closeOverlay();
        app.exitBattleTo('quest');
      });
    });
  }

  Hacha.ui.screenBattle = {
    mountBattleLayout,
    updateFrame,
    syncControlButtons,
    showNormalResult,
    showLoopResult
  };
})();
