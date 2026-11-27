/* 上半分（完全非操作・閲覧専用）＆下半分（全操作・親指ゾーン）UI描画＆戦闘軌跡FX・召喚演出・スクロール保持エンジン */
(function () {
  'use strict';

  const SEC = window.__IZ_SEC__;
  const ICON = window.__IZ_ICON__;
  const WDATA = window.__IZ_WORLDS__;
  const CDATA = window.__IZ_CHARS__;
  const EDATA = window.__IZ_EQUIP__;
  const STATE = window.__IZ_STATE__;
  const BATTLE = window.__IZ_BATTLE__;

  const esc = SEC.escapeHtml;
  const fnum = SEC.formatNum;

  const STATUS_META = {
    atkUp:   { label: '攻▲', cls: 'buff' },
    defUp:   { label: '防▲', cls: 'buff' },
    spdUp:   { label: '速▲', cls: 'buff' },
    taunt:   { label: '挑発', cls: 'buff' },
    atkDown: { label: '攻▼', cls: 'debuff' },
    defDown: { label: '防▼', cls: 'debuff' },
    spdDown: { label: '速▼', cls: 'debuff' },
    burn:    { label: '火傷', cls: 'debuff' }
  };

  const EL_HEX = {
    fire:  '#ff7252',
    water: '#4cc4ff',
    wind:  '#4ee898',
    light: '#ffe066',
    dark:  '#cd80ff',
    none:  '#d4dce8'
  };

  const ENEMY_KIND_LABEL = {
    normal:   '通常敵',
    intruder: '乱入',
    boss:     'エリアボス',
    raid:     '異界討伐ボス'
  };

  /* スクロール位置記憶（タブ・サブタブ内でタップしても先頭へ絶対に戻らない） */
  const scrollMemory = {};

  function elBadge(elId) {
    const el = WDATA.ELEMENTS[elId] || WDATA.ELEMENTS.none;
    return `<span class="el-badge el-${el.id}">${ICON.svg(el.id, 10)}${esc(el.name)}</span>`;
  }

  function roleBadge(roleId) {
    const ro = WDATA.ROLES[roleId] || WDATA.ROLES.dealer;
    return `<span class="role-badge role-${ro.id}">${ICON.svg(ro.id, 10)}${esc(ro.name)}</span>`;
  }

  function rarTag(rar) {
    return `<span class="rar-tag rar-${esc(rar)}">${esc(rar)}</span>`;
  }

  function qualTag(qId) {
    const q = EDATA.QUALITIES[qId] || EDATA.QUALITIES[0];
    return `<span class="qual-tag qual-${q.id}">${esc(q.name)}</span>`;
  }

  function scopeBadge(scope) {
    if (scope === 'single') return `<span class="scope-badge scope-single">単体</span>`;
    if (scope === 'area2')  return `<span class="scope-badge scope-area">範囲2体</span>`;
    if (scope === 'area3')  return `<span class="scope-badge scope-area">範囲3体</span>`;
    if (scope === 'all')    return `<span class="scope-badge scope-all">全体</span>`;
    return `<span class="scope-badge scope-passive">常時</span>`;
  }

  function powerJudgeBadge(partyPower, recPower) {
    const ratio = recPower > 0 ? partyPower / recPower : 1;
    if (ratio >= 1.15) return `<span class="power-badge safe">余裕</span>`;
    if (ratio >= 0.80) return `<span class="power-badge fair">適正</span>`;
    return `<span class="power-badge danger">戦力不足</span>`;
  }

  function currencyBarHtml(snap) {
    return `
      <div class="currency-bar">
        <span class="curr-pill num" title="残響石">${ICON.svg('stone', 11)} ${fnum(snap.stone)}</span>
        <span class="curr-pill num" title="共鳴結晶">${ICON.svg('crystal', 11)} ${fnum(snap.crystal)}</span>
        <span class="curr-pill num" title="金貨">${ICON.svg('coin', 11)} ${fnum(snap.gold)}</span>
      </div>`;
  }

  function toastHtml(ui) {
    if (!ui.toast) return '';
    return `<div class="toast-banner">${esc(ui.toast)}</div>`;
  }

  /* タイムライン用呼称（短縮名で頭欠け・省略ゼロ） */
  function timelineCallName(u) {
    if (u.side === 'enemy') {
      if (u.kind === 'boss' || u.kind === 'raid') return '強敵';
      if (u.kind === 'intruder') return '乱入';
      const idx = u.name.lastIndexOf('の');
      return idx >= 0 ? u.name.slice(idx + 1) : u.name;
    }
    return u.name;
  }

  /* 属性・ロール絞り込み（必須4段ソート順を常に維持） */
  function filterSortedCharIds(ids, ui) {
    return ids.filter((id) => {
      const c = CDATA.CHAR_MAP[id];
      if (!c) return false;
      if (ui.filterEl !== 'all' && c.el !== ui.filterEl) return false;
      if (ui.filterRole !== 'all' && c.role !== ui.filterRole) return false;
      return true;
    });
  }

  function renderFilterBars(ui, scrollPrefix) {
    const els = [
      { id: 'all', lbl: 'すべて' },
      { id: 'fire', lbl: '炎' }, { id: 'water', lbl: '水' }, { id: 'wind', lbl: '風' },
      { id: 'light', lbl: '光' }, { id: 'dark', lbl: '闇' }, { id: 'none', lbl: '無' }
    ];
    const roles = [
      { id: 'all', lbl: '全役割' },
      { id: 'tank', lbl: 'タンク' }, { id: 'dealer', lbl: 'ディーラー' },
      { id: 'support', lbl: 'サポーター' }, { id: 'healer', lbl: 'ヒーラー' }
    ];
    return `
      <div class="h-scroll-wrap">
        <div class="h-scroll-row" data-scroll-key="${scrollPrefix}-el">
          ${els.map((e) => `<button class="filter-chip ${ui.filterEl === e.id ? 'active' : ''}" data-act="setFilterEl" data-val="${e.id}">${e.id !== 'all' ? ICON.svg(e.id, 9) : ''}${e.lbl}</button>`).join('')}
        </div>
      </div>
      <div class="h-scroll-wrap">
        <div class="h-scroll-row" data-scroll-key="${scrollPrefix}-role">
          ${roles.map((r) => `<button class="filter-chip ${ui.filterRole === r.id ? 'active' : ''}" data-act="setFilterRole" data-val="${r.id}">${r.id !== 'all' ? ICON.svg(r.id, 9) : ''}${r.lbl}</button>`).join('')}
        </div>
      </div>`;
  }

  /* 横スクロール・所持キャラ即切替ストリップ（育成・装備で超快適） */
  function renderHorizontalCharStrip(snap, activeCharId, actName, scrollKey) {
    const sortedIds = STATE.sortCharIds(Object.keys(snap.roster));
    return `
      <div class="h-scroll-wrap">
        <div class="h-scroll-row" data-scroll-key="${scrollKey}">
          ${sortedIds.map((id) => {
            const c = CDATA.CHAR_MAP[id];
            const inParty = snap.party.includes(id);
            return `
              <button class="h-pill-btn ${id === activeCharId ? 'active' : ''}" data-act="${actName}" data-val="${id}">
                <span class="el-${c.el}" style="color:var(--el-color)">${ICON.svg(c.el, 10)}</span>
                <span>${esc(c.name)}</span>
                ${inParty ? `<span style="font-size:8.5px;color:#7cc8ff">出</span>` : ''}
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* キャラ入手元の自然な表記 */
  function charSourceLabel(c) {
    if (c.source === 'raidBoss') return '異界討伐・覇王降臨';
    if (c.source === 'raid') return '異界討伐・限定解放';
    if (c.source === 'tower') {
      const f = Object.keys(WDATA.TOWER_MILESTONES).find((k) => WDATA.TOWER_MILESTONES[k].id === c.id);
      return f ? `深淵の塔 第${f}層踏破` : '深淵の塔限定';
    }
    return '残響召喚';
  }

  /* =========================================================
   * 戦闘画面（めり込み0px 3段内部完結カード＋SVG攻撃軌跡＋中央アタックレーン）
   * ========================================================= */
  let battleDomKey = '';
  let lastRenderedFxSeq = 0;

  function buildStatusChipsHtml(u) {
    const chips = [];
    u.buffs.forEach((b) => {
      const m = STATUS_META[b.type] || { label: b.type, cls: 'buff' };
      chips.push(`<span class="status-chip ${m.cls}">${m.label}${b.turns}</span>`);
    });
    u.debuffs.forEach((d) => {
      const m = STATUS_META[d.type] || { label: d.type, cls: 'debuff' };
      chips.push(`<span class="status-chip ${m.cls}">${m.label}${d.turns}</span>`);
    });
    return chips.slice(0, 3).join('');
  }

  function buildBattleUnitCardHtml(u) {
    const isBossSolo = u.side === 'enemy' && u.isSolo && (u.kind === 'boss' || u.kind === 'raid');
    const isIntSolo = u.side === 'enemy' && u.isSolo && u.kind === 'intruder';
    const cls = [
      'unit-card',
      u.side,
      `el-${u.el}`,
      isBossSolo ? 'boss-solo' : '',
      isIntSolo ? 'intruder-solo' : ''
    ].filter(Boolean).join(' ');

    const roleChip = u.side === 'ally'
      ? `<span class="unit-role-mini role-${u.role}">${esc(WDATA.ROLES[u.role].short)}</span>`
      : (isBossSolo
        ? `<span class="encounter-badge boss">${ICON.svg('crown', 9)} 強敵</span>`
        : (isIntSolo ? `<span class="encounter-badge intruder">${ICON.svg('warn', 9)} 乱入</span>` : ''));

    return `
      <div class="${cls}" data-uid="${esc(u.uid)}">
        <div class="unit-head-row">
          <div class="unit-ident">
            <span class="unit-el-dot el-${u.el}">${ICON.svg(u.el, 9)}</span>
            <span class="unit-name">${esc(u.name)}</span>
            ${roleChip}
          </div>
          <span class="hp-text num" data-role="hptext">${fnum(u.hp)}/${fnum(u.maxHp)}</span>
        </div>
        <div class="gauge-stack">
          <div class="hp-bar-bg">
            <div class="hp-bar-trail" data-role="trail" style="width:100%"></div>
            <div class="hp-bar-fill" data-role="hpfill" style="width:100%"></div>
          </div>
          <div class="atb-bar-bg">
            <div class="atb-bar-fill" data-role="atb" style="width:0%"></div>
          </div>
        </div>
        <div class="unit-foot-row">
          <div class="status-chips" data-role="status"></div>
          <div class="ct-pips" data-role="cts"></div>
        </div>
        <div data-role="pop"></div>
      </div>`;
  }

  function buildBattleStageTitle(sess) {
    const cfg = sess.cfg;
    if (cfg.mode === 'main') {
      const w = WDATA.WORLDS.find((x) => x.id === cfg.worldId);
      const st = w.stages[cfg.stageNum - 1];
      return `${w.name} ${st.num}-${st.name}`;
    }
    if (cfg.mode === 'raid') {
      const r = WDATA.RAIDS.find((x) => x.id === cfg.raidId);
      const dLabel = ['初級', '上級', '極限'][cfg.diffIdx || 0];
      return `討伐・${r.name}(${dLabel})`;
    }
    if (cfg.mode === 'gauntlet') {
      const g = WDATA.GAUNTLETS.find((x) => x.id === cfg.gauntletId);
      return `総力・${g.name}`;
    }
    if (cfg.mode === 'tower') {
      return `深淵の塔 第${cfg.floor}層`;
    }
    if (cfg.mode === 'trial') {
      const t = WDATA.TRIALS.find((x) => x.id === cfg.trialId);
      return `試練・${t.name}`;
    }
    return '戦闘中';
  }

  function mountBattleDom(sess, upperEl, lowerEl) {
    const snap = STATE.getSnapshot();
    const enemyGridCls = sess.enemies.length === 1 ? 'grid-1' : (sess.enemies.length === 2 ? 'grid-2' : 'grid-2x2');
    const allyGridCls = sess.allies.length <= 2 ? 'grid-2' : 'grid-2x2';

    const allyPips = sess.allies.map((u) =>
      `<span class="timeline-pip ally" data-pip="${esc(u.uid)}" style="left:10%">${ICON.svg(u.el, 8)}${esc(timelineCallName(u))}</span>`
    ).join('');

    const enemyPips = sess.enemies.map((u) => {
      const pCls = (u.kind === 'boss' || u.kind === 'raid') ? 'boss' : (u.kind === 'intruder' ? 'intruder' : 'enemy');
      return `<span class="timeline-pip ${pCls}" data-pip="${esc(u.uid)}" style="left:10%">${ICON.svg(u.el, 8)}${esc(timelineCallName(u))}</span>`;
    }).join('');

    upperEl.innerHTML = `
      <div class="upper-bg-ornament"></div>
      <div class="battle-stage" data-b="stage">
        <div class="battle-hud">
          <div class="battle-stage-title">
            <span>${esc(buildBattleStageTitle(sess))}</span>
          </div>
          <div class="battle-hud-right">
            <span class="wave-pill num" data-b="wave">第${sess.wave}/${sess.maxWave}波</span>
            <span class="auto-pill num" data-b="auto" style="display:none"></span>
          </div>
        </div>
        <div class="timeline-box">
          <div class="timeline-meta">
            <span class="timeline-label">行動順</span>
            <span class="timeline-next" data-b="nextAct">次:準備</span>
          </div>
          <div class="timeline-dual">
            <div class="timeline-track ally-lane">
              ${allyPips}
              <span class="timeline-finish"></span>
            </div>
            <div class="timeline-track enemy-lane">
              ${enemyPips}
              <span class="timeline-finish"></span>
            </div>
          </div>
        </div>
        <div class="unit-zone enemy-zone ${enemyGridCls}">
          ${sess.enemies.map(buildBattleUnitCardHtml).join('')}
        </div>
        <div class="action-banner" data-b="banner">
          <span>戦闘開始</span>
        </div>
        <div class="unit-zone ally-zone ${allyGridCls}">
          ${sess.allies.map(buildBattleUnitCardHtml).join('')}
        </div>
        <svg class="battle-fx-layer" data-b="fxSvg" aria-hidden="true"></svg>
        <div data-b="flash"></div>
      </div>`;

    const dpsRows = [];
    for (let i = 0; i < 4; i++) {
      const a = sess.allies[i];
      if (!a) {
        dpsRows.push(`<div class="dps-row" style="opacity:0.25"><span class="item-sub">空き枠</span></div>`);
      } else {
        dpsRows.push(`
          <div class="dps-row" data-dps-row="${esc(a.charId)}">
            <div class="dps-row-top">
              <span class="dps-char-name">${elBadge(a.el)}<span>${esc(a.name)}</span></span>
              ${roleBadge(a.role)}
            </div>
            <div class="dps-metrics-grid">
              <div class="dps-metric">
                <div class="dps-metric-top"><span class="dps-m-lbl">与ダメ</span><span class="dps-num lg-dmg" data-m="dmg">0</span></div>
                <div class="dps-bar-bg"><div class="dps-bar-fill dmg" data-mb="dmg" style="width:0%"></div></div>
              </div>
              <div class="dps-metric">
                <div class="dps-metric-top"><span class="dps-m-lbl">被ダメ</span><span class="dps-num lg-tkn" data-m="tkn">0</span></div>
                <div class="dps-bar-bg"><div class="dps-bar-fill tkn" data-mb="tkn" style="width:0%"></div></div>
              </div>
              <div class="dps-metric">
                <div class="dps-metric-top"><span class="dps-m-lbl">回復量</span><span class="dps-num lg-heal" data-m="heal">0</span></div>
                <div class="dps-bar-bg"><div class="dps-bar-fill heal" data-mb="heal" style="width:0%"></div></div>
              </div>
              <div class="dps-metric">
                <div class="dps-metric-top"><span class="dps-m-lbl">被回復</span><span class="dps-num lg-rcvd" data-m="rcvd">0</span></div>
                <div class="dps-bar-bg"><div class="dps-bar-fill rcvd" data-mb="rcvd" style="width:0%"></div></div>
              </div>
            </div>
          </div>`);
      }
    }

    lowerEl.innerHTML = `
      <div class="battle-lower-wrap">
        <div class="dps-panel">
          <div class="dps-head">
            <span class="dps-title">リアルタイム戦績メーター</span>
            <div class="dps-legend">
              <span class="lg-dmg">与ダメ</span>
              <span class="lg-tkn">被ダメ</span>
              <span class="lg-heal">回復</span>
              <span class="lg-rcvd">被回復</span>
            </div>
          </div>
          <div class="dps-grid">${dpsRows.join('')}</div>
        </div>
        <div class="battle-ctrl-bar">
          <button class="btn-secondary battle-ctrl-btn" data-act="cycleSpeed" data-b="speedBtn">速度 ×${snap.settings.speed}</button>
          <button class="btn-primary battle-ctrl-btn" data-act="toggleAutoLoop" data-b="autoBtn">自動周回</button>
        </div>
      </div>`;
  }

  /* 攻撃者→対象への光弾・軌跡ライン＆着弾リング描画（誰が誰に何をしているか即視認！） */
  function updateBattleFxSvg(sess, upperEl) {
    const svg = upperEl.querySelector('[data-b="fxSvg"]');
    const stage = upperEl.querySelector('[data-b="stage"]');
    if (!svg || !stage) return;

    if (!sess.activeFx) {
      if (svg.innerHTML !== '') svg.innerHTML = '';
      return;
    }
    if (lastRenderedFxSeq === sess.activeFx.seq) return;
    lastRenderedFxSeq = sess.activeFx.seq;

    const fx = sess.activeFx;
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;

    const actorCard = stage.querySelector(`[data-uid="${fx.actorUid}"]`);
    if (!actorCard) return;
    const aRect = actorCard.getBoundingClientRect();
    const x1 = aRect.left - stageRect.left + aRect.width * 0.5;
    const y1 = aRect.top - stageRect.top + aRect.height * 0.5;

    const strokeColor = fx.kind === 'heal'
      ? '#5ef2a4'
      : (fx.kind === 'allyBuff' ? '#ffe078' : (EL_HEX[fx.el] || '#f7e1a0'));

    const parts = [];
    parts.push(`<circle class="fx-origin-dot" cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="7" fill="${strokeColor}" fill-opacity="0.72" />`);

    fx.targetUids.forEach((tUid) => {
      const tCard = stage.querySelector(`[data-uid="${tUid}"]`);
      if (!tCard) return;
      const tRect = tCard.getBoundingClientRect();
      const x2 = tRect.left - stageRect.left + tRect.width * 0.5;
      const y2 = tRect.top - stageRect.top + tRect.height * 0.5;

      if (tUid !== fx.actorUid) {
        const mx = (x1 + x2) * 0.5 + (x2 >= x1 ? 18 : -18);
        const my = (y1 + y2) * 0.5;
        const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        parts.push(`<path class="fx-beam" d="${d}" stroke="${strokeColor}" stroke-width="5" stroke-opacity="0.45" />`);
        parts.push(`<path class="fx-beam-core" d="${d}" stroke-width="1.8" />`);
      }
      parts.push(`<circle class="fx-impact-ring" cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="17" stroke="${strokeColor}" stroke-width="2.6" />`);
      parts.push(`<circle class="fx-origin-dot" cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="5" fill="#ffffff" fill-opacity="0.88" />`);
    });

    svg.setAttribute('viewBox', `0 0 ${stageRect.width.toFixed(1)} ${stageRect.height.toFixed(1)}`);
    svg.innerHTML = parts.join('');
  }

  /* レーン内ピップ2パス非重複配置（右端発光リング安全余白つき） */
  function updateLanePips(units, upperEl, leadUid) {
    const alive = units.filter((u) => !u.dead).sort((a, b) => b.atb - a.atb);
    const n = alive.length;
    if (n > 0) {
      const minGap = n >= 4 ? 20 : 22;
      const minX = 12;
      const maxX = 87;
      const pos = alive.map((u) => minX + (Math.min(100, Math.max(0, u.atb)) / 100) * (maxX - minX));
      for (let i = 1; i < n; i++) {
        if (pos[i] > pos[i - 1] - minGap) pos[i] = pos[i - 1] - minGap;
      }
      if (pos[n - 1] < minX) {
        pos[n - 1] = minX;
        for (let i = n - 2; i >= 0; i--) {
          if (pos[i] < pos[i + 1] + minGap) pos[i] = Math.min(maxX, pos[i + 1] + minGap);
        }
      }
      alive.forEach((u, idx) => {
        const pip = upperEl.querySelector(`[data-pip="${u.uid}"]`);
        if (!pip) return;
        pip.style.display = 'flex';
        pip.style.left = pos[idx].toFixed(1) + '%';
        pip.style.zIndex = String(10 - idx);
        pip.classList.toggle('lead', u.uid === leadUid);
      });
    }
    units.filter((u) => u.dead).forEach((u) => {
      const pip = upperEl.querySelector(`[data-pip="${u.uid}"]`);
      if (pip) pip.style.display = 'none';
    });
  }

  function renderBattle(sess, upperEl, lowerEl) {
    const key = `${sess.aggregate.runs}_${sess.wave}_${sess.enemies.map((e) => e.uid).join(',')}_${sess.allies.map((a) => a.uid).join(',')}`;
    if (battleDomKey !== key) {
      battleDomKey = key;
      lastRenderedFxSeq = 0;
      mountBattleDom(sess, upperEl, lowerEl);
    }

    const snap = STATE.getSnapshot();
    const waveEl = upperEl.querySelector('[data-b="wave"]');
    if (waveEl) waveEl.textContent = `第${sess.wave}/${sess.maxWave}波`;

    const autoPill = upperEl.querySelector('[data-b="auto"]');
    if (autoPill) {
      if (sess.autoLoop) {
        autoPill.style.display = 'inline-block';
        autoPill.className = 'auto-pill num' + (sess.stopRequested ? ' stopping' : '');
        const runNum = sess.pendingRestart ? sess.aggregate.runs : (sess.aggregate.runs + 1);
        autoPill.textContent = sess.stopRequested
          ? `この周で終了(${runNum}周目)`
          : `自動周回 ${runNum}周目`;
      } else {
        autoPill.style.display = 'none';
      }
    }

    const bannerEl = upperEl.querySelector('[data-b="banner"]');
    if (bannerEl && sess.actionBanner) {
      const ab = sess.actionBanner;
      const cls = ab.kind === 'heal' || ab.kind === 'allyBuff'
        ? 'action-banner heal-act'
        : (ab.side === 'enemy' ? 'action-banner enemy-act' : 'action-banner');
      bannerEl.className = cls;
      if (ab.kind === 'info') {
        bannerEl.innerHTML = `<span class="act-actor">${esc(ab.actorName)}</span><span class="act-arrow">▶</span><span class="act-skill">${esc(ab.skillName)}</span><span class="act-target">(${esc(ab.targetSummary)})</span>`;
      } else {
        bannerEl.innerHTML = `<span class="act-actor">${esc(ab.actorName)}</span><span class="act-arrow">▶</span><span class="act-skill">${esc(ab.skillName)}</span>${scopeBadge(ab.scope)}<span class="act-arrow">▶</span><span class="act-target">${esc(ab.targetSummary)}</span>`;
      }
    }

    const flashEl = upperEl.querySelector('[data-b="flash"]');
    if (flashEl) {
      if (sess.encounterBanner) {
        const eb = sess.encounterBanner;
        flashEl.innerHTML = `<div class="encounter-flash ${eb.kind}">${esc(eb.text)}</div>`;
      } else if (flashEl.innerHTML !== '') {
        flashEl.innerHTML = '';
      }
    }

    /* 攻撃軌跡SVG更新 */
    updateBattleFxSvg(sess, upperEl);

    /* 行動順タイムライン更新 */
    const allUnits = sess.allies.concat(sess.enemies);
    const nextLead = allUnits.filter((u) => !u.dead).sort((a, b) => b.atb - a.atb)[0];
    const nextEl = upperEl.querySelector('[data-b="nextAct"]');
    if (nextEl && nextLead) {
      nextEl.textContent = `次:${timelineCallName(nextLead)}`;
    }
    updateLanePips(sess.allies, upperEl, nextLead ? nextLead.uid : '');
    updateLanePips(sess.enemies, upperEl, nextLead ? nextLead.uid : '');

    /* ユニットカード差分更新 */
    allUnits.forEach((u) => {
      const card = upperEl.querySelector(`[data-uid="${u.uid}"]`);
      if (!card) return;
      card.classList.toggle('dead', u.dead);
      card.classList.toggle('acting', u.fxTag === 'acting');
      card.classList.toggle('targeted', u.fxTag === 'targeted');
      card.classList.toggle('healed', u.fxTag === 'healed');

      const hpPct = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100));
      const trailPct = Math.max(hpPct, Math.min(100, (u.trailHp / u.maxHp) * 100));
      const fill = card.querySelector('[data-role="hpfill"]');
      const trail = card.querySelector('[data-role="trail"]');
      const hptext = card.querySelector('[data-role="hptext"]');
      const atb = card.querySelector('[data-role="atb"]');
      const status = card.querySelector('[data-role="status"]');
      const cts = card.querySelector('[data-role="cts"]');
      const pop = card.querySelector('[data-role="pop"]');

      if (fill) {
        fill.style.width = hpPct.toFixed(1) + '%';
        fill.classList.toggle('low', u.side === 'ally' && hpPct <= 28);
      }
      if (trail) trail.style.width = trailPct.toFixed(1) + '%';
      if (hptext) hptext.textContent = `${fnum(u.hp)}/${fnum(u.maxHp)}`;
      if (atb) atb.style.width = Math.min(100, Math.max(0, u.atb)).toFixed(1) + '%';
      if (status) status.innerHTML = buildStatusChipsHtml(u);

      if (cts) {
        if (u.side === 'ally') {
          cts.innerHTML = u.skills.map((sk, idx) => {
            if (sk.scope === 'passive') return `<span class="ct-dot ready">常時</span>`;
            if (idx === 0) return '';
            const cd = u.cds[idx];
            return `<span class="ct-dot ${cd <= 0 ? 'ready' : ''}">技${idx + 1}${cd > 0 ? ':' + cd : ''}</span>`;
          }).join('');
        } else {
          const readyStrong = u.cds[1] <= 0;
          cts.innerHTML = readyStrong ? `<span class="enemy-charge-warn">強技構え</span>` : `<span class="ct-dot">強技:${u.cds[1]}</span>`;
        }
      }

      if (pop) {
        if (u.fxPop) {
          const stamp = String(u.fxPop.seq || 0);
          if (pop.dataset.stamp !== stamp) {
            pop.dataset.stamp = stamp;
            pop.innerHTML = `<span class="float-pop ${u.fxPop.cls}">${esc(u.fxPop.text)}</span>`;
          }
        } else if (pop.innerHTML !== '') {
          pop.innerHTML = '';
          pop.dataset.stamp = '';
        }
      }
    });

    /* 一括DPSメーター更新 */
    const maxDmg = Math.max(1, ...sess.dps.map((d) => d.dmgDealt));
    const maxTkn = Math.max(1, ...sess.dps.map((d) => d.dmgTaken));
    const maxHeal = Math.max(1, ...sess.dps.map((d) => d.healDone));
    const maxRcvd = Math.max(1, ...sess.dps.map((d) => d.healRcvd));

    sess.dps.forEach((d) => {
      const row = lowerEl.querySelector(`[data-dps-row="${d.charId}"]`);
      if (!row) return;
      row.querySelector('[data-m="dmg"]').textContent = fnum(d.dmgDealt);
      row.querySelector('[data-m="tkn"]').textContent = fnum(d.dmgTaken);
      row.querySelector('[data-m="heal"]').textContent = fnum(d.healDone);
      row.querySelector('[data-m="rcvd"]').textContent = fnum(d.healRcvd);
      row.querySelector('[data-mb="dmg"]').style.width = ((d.dmgDealt / maxDmg) * 100).toFixed(1) + '%';
      row.querySelector('[data-mb="tkn"]').style.width = ((d.dmgTaken / maxTkn) * 100).toFixed(1) + '%';
      row.querySelector('[data-mb="heal"]').style.width = ((d.healDone / maxHeal) * 100).toFixed(1) + '%';
      row.querySelector('[data-mb="rcvd"]').style.width = ((d.healRcvd / maxRcvd) * 100).toFixed(1) + '%';
    });

    const spdBtn = lowerEl.querySelector('[data-b="speedBtn"]');
    if (spdBtn) spdBtn.textContent = `速度 ×${snap.settings.speed}`;

    const autoBtn = lowerEl.querySelector('[data-b="autoBtn"]');
    if (autoBtn) {
      const runNum = sess.pendingRestart ? sess.aggregate.runs : (sess.aggregate.runs + 1);
      if (!sess.autoLoop) {
        autoBtn.className = 'btn-secondary battle-ctrl-btn';
        autoBtn.textContent = '自動周回をONにする';
      } else if (!sess.stopRequested) {
        autoBtn.className = 'btn-danger battle-ctrl-btn';
        autoBtn.textContent = `周回停止予約（${runNum}周目）`;
      } else {
        autoBtn.className = 'btn-primary battle-ctrl-btn';
        autoBtn.textContent = 'この周で終了（予約中）';
      }
    }
  }

  function resetBattleDomCache() {
    battleDomKey = '';
    lastRenderedFxSeq = 0;
  }

  /* =========================================================
   * リザルト画面
   * ========================================================= */
  function renderResultUpper(report, snap, ui) {
    const agg = report.aggregate;
    const isWin = report.autoLoop ? (agg.wins > 0) : report.lastWon;
    const title = report.autoLoop
      ? `自動周回リザルト（全${agg.runs}周）`
      : (report.lastWon ? '討伐成功' : '討伐失敗');

    const totalDmg = agg.dps.reduce((s, d) => s + d.dmgDealt, 0);
    const totalHeal = agg.dps.reduce((s, d) => s + d.healDone, 0);
    const mvp = agg.dps.slice().sort((a, b) => (b.dmgDealt + b.healDone) - (a.dmgDealt + a.healDone))[0];

    const matItems = Object.entries(agg.mats).map(([mId, cnt]) => {
      const r = WDATA.RAIDS.find((x) => x.matId === mId);
      return `<span class="synergy-pill">${esc(r ? r.matName : mId)} ×${cnt}</span>`;
    });
    const shardItems = Object.entries(agg.shards).map(([cId, cnt]) => {
      const c = CDATA.CHAR_MAP[cId];
      return `<span class="synergy-pill">${esc(c ? c.name : cId)}の鍵 ×${cnt}</span>`;
    });
    const markItems = Object.entries(agg.bossMarks || {}).map(([cId, cnt]) => {
      const r = WDATA.RAIDS.find((x) => x.bossCharId === cId);
      return `<span class="synergy-pill">${ICON.svg('mark', 10)}${esc(r ? r.bossMarkName : '覇王の印')} ×${cnt}</span>`;
    });
    const charItems = (agg.grantedChars || []).map((gc) =>
      `<span class="synergy-pill">${rarTag(gc.rarity)} ${esc(gc.name)} 加入！</span>`
    );
    const abItems = agg.unlockedAbilities.map((aid) => {
      const a = EDATA.ABILITY_MAP[aid];
      return `<span class="synergy-pill">解放：${esc(a ? a.name : aid)}</span>`;
    });

    const topEquips = agg.equips.slice().sort((a, b) => b.quality - a.quality).slice(0, 6);
    const shortStatMap = { atk: '攻', def: '防', hp: 'HP', spd: '速' };
    const equipCardsHtml = topEquips.length > 0
      ? `<div class="loot-grid">
          ${topEquips.map((eq) => {
            const ser = EDATA.SERIES_MAP[eq.seriesId];
            const sl = EDATA.SLOT_MAP[eq.slotId];
            const val = STATE.getEquipStatValue(eq);
            return `<div class="loot-chip">${qualTag(eq.quality)}<span class="loot-chip-name">${esc(ser ? ser.partNames[eq.slotId] : '')}</span><span class="loot-chip-val num">${shortStatMap[sl.baseStat]}+${fnum(val)}</span></div>`;
          }).join('')}
        </div>${agg.equips.length > 6 ? `<div class="item-sub">ほか獲得装備 +${agg.equips.length - 6}個</div>` : ''}`
      : (isWin
        ? `<div class="item-sub">獲得した報酬は所持品へ反映されました</div>`
        : `<div class="skill-preview-row"><div class="skill-name">次戦への戦力強化ヒント</div><div class="skill-desc">共鳴盤解放・装備更新・共鳴設定・有利属性への編成変更で大きく戦力が伸びます。</div></div>`);

    return `
      <div class="upper-bg-ornament"></div>
      <div class="upper-panel">
        <div class="result-banner ${isWin ? 'win' : 'lose'}">${esc(title)}</div>
        <div class="info-box">
          <div class="stat-grid-4">
            <div class="stat-cell"><div class="stat-lbl">勝敗</div><div class="stat-val">${agg.wins}勝 ${agg.losses}敗</div></div>
            <div class="stat-cell"><div class="stat-lbl">乱入撃破</div><div class="stat-val">${agg.intruders}体</div></div>
            <div class="stat-cell"><div class="stat-lbl">残響石</div><div class="stat-val">+${fnum(agg.stone)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">共鳴結晶</div><div class="stat-val">+${fnum(agg.crystal)}</div></div>
          </div>
          <div class="stat-grid-4">
            <div class="stat-cell"><div class="stat-lbl">金貨</div><div class="stat-val">+${fnum(agg.gold)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">魂晶</div><div class="stat-val">+${fnum(agg.soul)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">獲得装備</div><div class="stat-val">${agg.equips.length}個</div></div>
            <div class="stat-cell"><div class="stat-lbl">自動売却</div><div class="stat-val">${agg.autoSoldCount}個/+${fnum(agg.autoSoldGold)}</div></div>
          </div>
        </div>
        <div class="info-box grow">
          <div class="row-between">
            <span class="dps-title">獲得品と戦果</span>
            <span class="item-sub num">合計与ダメ ${fnum(totalDmg)} / 合計回復 ${fnum(totalHeal)}</span>
          </div>
          ${mvp ? `<div class="row-between"><span class="synergy-pill">最優秀：${esc(mvp.name)}</span><span class="item-sub num">与ダメ ${fnum(mvp.dmgDealt)} / 回復 ${fnum(mvp.healDone)}</span></div>` : ''}
          ${(matItems.length || shardItems.length || markItems.length || charItems.length || abItems.length)
            ? `<div class="synergy-list">${charItems.join('')}${markItems.join('')}${matItems.join('')}${shardItems.join('')}${abItems.join('')}</div>`
            : ''}
          ${equipCardsHtml}
        </div>
        ${toastHtml(ui)}
      </div>`;
  }

  function renderResultLower(report) {
    const agg = report.aggregate;
    const maxDmg = Math.max(1, ...agg.dps.map((d) => d.dmgDealt));
    const maxTkn = Math.max(1, ...agg.dps.map((d) => d.dmgTaken));
    const maxHeal = Math.max(1, ...agg.dps.map((d) => d.healDone));
    const maxRcvd = Math.max(1, ...agg.dps.map((d) => d.healRcvd));

    const rows = agg.dps.map((d) => `
      <div class="dps-row">
        <div class="dps-row-top">
          <span class="dps-char-name">${elBadge(d.el)}<span>${esc(d.name)}</span></span>
          ${roleBadge(d.role)}
        </div>
        <div class="dps-metrics-grid">
          <div class="dps-metric">
            <div class="dps-metric-top"><span class="dps-m-lbl">与ダメ</span><span class="dps-num lg-dmg">${fnum(d.dmgDealt)}</span></div>
            <div class="dps-bar-bg"><div class="dps-bar-fill dmg" style="width:${((d.dmgDealt / maxDmg) * 100).toFixed(1)}%"></div></div>
          </div>
          <div class="dps-metric">
            <div class="dps-metric-top"><span class="dps-m-lbl">被ダメ</span><span class="dps-num lg-tkn">${fnum(d.dmgTaken)}</span></div>
            <div class="dps-bar-bg"><div class="dps-bar-fill tkn" style="width:${((d.dmgTaken / maxTkn) * 100).toFixed(1)}%"></div></div>
          </div>
          <div class="dps-metric">
            <div class="dps-metric-top"><span class="dps-m-lbl">回復量</span><span class="dps-num lg-heal">${fnum(d.healDone)}</span></div>
            <div class="dps-bar-bg"><div class="dps-bar-fill heal" style="width:${((d.healDone / maxHeal) * 100).toFixed(1)}%"></div></div>
          </div>
          <div class="dps-metric">
            <div class="dps-metric-top"><span class="dps-m-lbl">被回復</span><span class="dps-num lg-rcvd">${fnum(d.healRcvd)}</span></div>
            <div class="dps-bar-bg"><div class="dps-bar-fill rcvd" style="width:${((d.healRcvd / maxRcvd) * 100).toFixed(1)}%"></div></div>
          </div>
        </div>
      </div>`).join('');

    return `
      <div class="lower-body">
        <div class="row-between">
          <span class="dps-title">累計戦績メーター</span>
          <span class="item-sub">全${agg.runs}周合計</span>
        </div>
        <div class="scroll-list" data-scroll-key="result-dps">
          <div class="list-stack">${rows}</div>
        </div>
        <div class="action-bar">
          <button class="btn-secondary" data-act="closeResult">出撃画面へ戻る</button>
          <button class="btn-primary" data-act="retryBattle">もう一度出撃</button>
        </div>
      </div>`;
  }

  /* =========================================================
   * 非戦闘画面 上半分（高密度・メタ発言ゼロ・サブタブ完全連動・紹介文は図鑑のみ）
   * ========================================================= */
  function renderSummonGateSvg() {
    return `
      <svg class="summon-ring-outer" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r="64" fill="none" stroke="rgba(247,225,160,0.48)" stroke-width="1.3" stroke-dasharray="6 4"/>
        <polygon points="70,8 124,101 16,101" fill="none" stroke="rgba(116,204,255,0.45)" stroke-width="1.2"/>
        <polygon points="70,132 16,39 124,39" fill="none" stroke="rgba(247,225,160,0.42)" stroke-width="1.2"/>
        <circle cx="70" cy="8" r="3" fill="#f7e1a0"/><circle cx="70" cy="132" r="3" fill="#f7e1a0"/>
        <circle cx="8" cy="70" r="3" fill="#74ccff"/><circle cx="132" cy="70" r="3" fill="#74ccff"/>
      </svg>
      <svg class="summon-ring-inner" viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(247,225,160,0.62)" stroke-width="1.4"/>
        <polygon points="52,10 94,52 52,94 10,52" fill="rgba(216,181,100,0.08)" stroke="rgba(247,225,160,0.68)" stroke-width="1.2"/>
      </svg>`;
  }

  function renderNonBattleUpper(snap, ui) {
    if (ui.resultReport) return renderResultUpper(ui.resultReport, snap, ui);

    const partyPower = snap.party.filter(Boolean).reduce((acc, id) => acc + STATE.getCharComputed(id, snap.party).power, 0);

    /* ① 出撃タブ上半分 */
    if (ui.tab === 'quest') {
      if (ui.questSub === 'main') {
        const world = WDATA.WORLDS.find((w) => w.id === ui.selectedWorldId) || WDATA.WORLDS[0];
        const stage = world.stages[ui.selectedStageNum - 1] || world.stages[0];
        const boss = stage.isBoss ? WDATA.ENEMIES[stage.bossId] : null;
        const intruder = WDATA.ENEMIES[world.intruderId];
        const normals = WDATA.getWorldNormalEnemies(world.id);
        const drops = world.drops.map((sid) => (EDATA.SERIES_MAP[sid] ? EDATA.SERIES_MAP[sid].name : sid)).join(' / ');
        const recPower = Math.round(stage.power * 3400);
        const clearedCnt = world.stages.filter((s) => snap.clearedStages[`${world.id}_${s.num}`]).length;

        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                <span class="upper-title">${esc(world.name)}</span>
                ${elBadge(world.mainEl)}
              </div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <span class="item-title">ステージ${stage.num}：${esc(stage.name)}</span>
                <div class="row-left">${powerJudgeBadge(partyPower, recPower)}<span class="wave-pill">全5連戦</span></div>
              </div>
              ${boss
                ? `<div class="row-left"><span class="encounter-badge boss">${ICON.svg('crown', 10)} 強敵：${esc(boss.name)}</span>${elBadge(boss.el)}</div>`
                : `<div class="row-left"><span class="item-sub">異界情景：${esc(world.theme)}</span></div>`}
              <div class="row-left">
                <span class="encounter-badge intruder">${ICON.svg('warn', 10)} 乱入：${esc(intruder.name)}</span>
                ${elBadge(intruder.el)}
              </div>
            </div>
            <div class="info-box grow">
              <div class="stat-grid-4">
                <div class="stat-cell"><div class="stat-lbl">自軍戦力</div><div class="stat-val">${fnum(partyPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">目安戦力</div><div class="stat-val">${fnum(recPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">自動売却</div><div class="stat-val">${snap.settings.autoSellMaxQuality < 0 ? 'OFF' : EDATA.QUALITIES[snap.settings.autoSellMaxQuality].name + '以下'}</div></div>
                <div class="stat-cell"><div class="stat-lbl">制覇進度</div><div class="stat-val">${clearedCnt}/${world.stages.length}</div></div>
              </div>
              <div>
                <div class="item-sub" style="margin-bottom:3px">出現敵</div>
                <div class="enemy-mini-row">
                  ${normals.map((e) => `<span class="enemy-mini-chip">${elBadge(e.el)}${esc(e.name)}</span>`).join('')}
                </div>
              </div>
              <div class="row-between">
                <span class="item-sub">獲得装備：${esc(drops)}</span>
              </div>
              <div class="synergy-list">
                ${world.drops.map((sid) => {
                  const ser = EDATA.SERIES_MAP[sid];
                  return ser ? `<span class="synergy-pill">${esc(ser.name)}：${esc(ser.set2.desc)}</span>` : '';
                }).join('')}
              </div>
              <div class="prog-wrap">
                <div class="prog-head"><span>エリア踏破率</span><span class="num">${clearedCnt}/${world.stages.length} (${Math.round((clearedCnt / world.stages.length) * 100)}%)</span></div>
                <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${(clearedCnt / world.stages.length) * 100}%"></div></div>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.questSub === 'raid') {
        const raid = WDATA.RAIDS.find((r) => r.id === ui.selectedRaidId) || WDATA.RAIDS[0];
        const boss = WDATA.ENEMIES[raid.bossId];
        const diffLabels = ['初級', '上級', '極限'];
        const diffMult = [1.0, 1.55, 2.25][ui.selectedRaidDiff];
        const recPower = Math.round(raid.power * diffMult * 3800);
        const limitChar = CDATA.CHAR_MAP[raid.charId];
        const bossChar = CDATA.CHAR_MAP[raid.bossCharId];
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">異界討伐</span></div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <div class="row-left">
                  <span class="encounter-badge boss">${ICON.svg('crown', 10)} 討伐対象</span>
                  <span class="item-title">${esc(boss.name)}（${diffLabels[ui.selectedRaidDiff]}）</span>
                </div>
                ${elBadge(boss.el)}
              </div>
              <div class="skill-preview-list">
                ${boss.skills.map((sk, i) => `
                  <div class="skill-preview-row">
                    <div class="skill-preview-head">
                      <span class="skill-name">敵技${i + 1}：${esc(sk.name)}</span>
                      ${scopeBadge(sk.scope)}
                    </div>
                    <div class="skill-desc">${esc(sk.desc)}</div>
                  </div>`).join('')}
              </div>
            </div>
            <div class="info-box grow">
              <div class="row-between">
                <span class="item-sub num">自軍 ${fnum(partyPower)} / 目安 ${fnum(recPower)}</span>
                ${powerJudgeBadge(partyPower, recPower)}
              </div>
              <div class="synergy-list">
                <span class="synergy-pill">限定素材：${esc(raid.matName)}（所持 ${fnum(snap.mats[raid.matId] || 0)}）</span>
                <span class="synergy-pill">${esc(limitChar.name)}の鍵（${snap.shards[raid.charId] || 0}/5）</span>
                <span class="synergy-pill">${ICON.svg('mark', 10)}${esc(raid.bossMarkName)}（${snap.bossMarks[raid.bossCharId] || 0}/5 → UR${esc(bossChar.name)}）</span>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.questSub === 'gauntlet') {
        const g = WDATA.GAUNTLETS.find((x) => x.id === ui.selectedGauntletId) || WDATA.GAUNTLETS[0];
        const readyTeams = snap.gauntletParties.filter((t) => t.filter(Boolean).length > 0).length;
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">総力連戦・残響回廊</span></div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <span class="item-title">${esc(g.name)}</span>
                <span class="${readyTeams === 3 ? 'power-badge safe' : 'power-badge danger'}">${readyTeams}/3部隊編成済</span>
              </div>
              <div class="item-sub">3部隊（重複不可）で3体の強敵へ連続挑撃。初回報酬：残響石 +${fnum(g.rewardStone)}</div>
            </div>
            <div class="info-box grow">
              ${g.stages.map((st, idx) => {
                const b = WDATA.ENEMIES[st.bossId];
                const team = snap.gauntletParties[idx].filter(Boolean);
                const tPow = team.reduce((acc, id) => acc + STATE.getCharComputed(id, team).power, 0);
                const names = team.map((id) => CDATA.CHAR_MAP[id].name).join('・') || '未編成';
                return `
                  <div class="skill-preview-row">
                    <div class="skill-preview-head">
                      <span class="skill-name">${esc(st.label)}：${esc(b.name)}</span>
                      <div class="row-left">${elBadge(b.el)}<span class="item-sub num">戦力 ${fnum(tPow)}</span></div>
                    </div>
                    <div class="skill-desc">第${idx + 1}部隊：${esc(names)}</div>
                  </div>`;
              }).join('')}
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.questSub === 'tower') {
        const tf = WDATA.getTowerFloor(ui.selectedTowerFloor);
        const boss = tf.isBoss ? WDATA.ENEMIES[tf.bossId] : null;
        const recPower = Math.round(tf.power * 3400);
        const pct = ((snap.towerMaxCleared / WDATA.TOWER_MAX_FLOOR) * 100).toFixed(0);
        const nextMilestoneFloor = Object.keys(WDATA.TOWER_MILESTONES).map(Number).find((k) => k > snap.towerMaxCleared) || 100;
        const nextMs = WDATA.TOWER_MILESTONES[nextMilestoneFloor];
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">深淵の塔</span></div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <span class="item-title">${esc(tf.name)}</span>
                <div class="row-left">${powerJudgeBadge(partyPower, recPower)}<span class="wave-pill">制覇 ${snap.towerMaxCleared}/${WDATA.TOWER_MAX_FLOOR}層</span></div>
              </div>
              <div class="stat-grid-4">
                <div class="stat-cell"><div class="stat-lbl">自軍戦力</div><div class="stat-val">${fnum(partyPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">目安戦力</div><div class="stat-val">${fnum(recPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">初回残響石</div><div class="stat-val">+${fnum(tf.firstStone)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">戦況</div><div class="stat-val">${boss ? '守護者戦' : '3連戦'}</div></div>
              </div>
            </div>
            <div class="info-box grow">
              ${boss
                ? `<div class="row-left"><span class="encounter-badge boss">${ICON.svg('crown', 10)} 階層守護者：${esc(boss.name)}</span>${elBadge(boss.el)}</div>`
                : `<div class="item-sub">25・50・75・100層で塔限定仲間が加入、節目層で限定アビリティを解放</div>`}
              <div class="skill-preview-row">
                <div class="skill-name">${tf.milestone ? 'この層の特別初回報酬' : '次の節目報酬'}</div>
                <div class="skill-desc">${esc(tf.milestone ? tf.milestone.label : (nextMs ? nextMs.label : '全100層制覇達成'))}</div>
              </div>
              <div class="synergy-list">
                ${[25, 50, 75, 100].map((fl) => {
                  const cid = WDATA.TOWER_MILESTONES[fl].id;
                  const c = CDATA.CHAR_MAP[cid];
                  const done = snap.towerMaxCleared >= fl;
                  return `<span class="synergy-pill" style="${done ? 'border-color:#5eeaa0;color:#82ffbd' : ''}">${fl}層 ${c.rarity} ${esc(c.name)}${done ? '済' : ''}</span>`;
                }).join('')}
              </div>
              <div class="prog-wrap">
                <div class="prog-head"><span>深淵踏破進捗</span><span class="num">${snap.towerMaxCleared} / ${WDATA.TOWER_MAX_FLOOR}層（${pct}%）</span></div>
                <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${pct}%"></div></div>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.questSub === 'trial') {
        const tr = WDATA.TRIALS.find((t) => t.id === ui.selectedTrialId) || WDATA.TRIALS[0];
        const boss = WDATA.ENEMIES[tr.bossId];
        const ab = EDATA.ABILITY_MAP[tr.rewardAbility];
        const check = STATE.checkTrialRule(tr, snap.party);
        const recPower = Math.round(tr.power * 3400);
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">試練の狭間</span></div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <span class="item-title">${esc(tr.name)}</span>
                <div class="row-left">
                  <span class="${check.ok ? 'power-badge safe' : 'power-badge danger'}">${check.ok ? '出撃可' : '条件未達'}</span>
                  ${powerJudgeBadge(partyPower, recPower)}
                </div>
              </div>
              <div class="item-sub">出撃条件：${esc(tr.ruleText)}</div>
              <div class="row-left">
                <span class="encounter-badge boss">${ICON.svg('crown', 10)} 強敵：${esc(boss.name)}</span>
                ${elBadge(boss.el)}
                <span class="item-sub num">目安 ${fnum(recPower)}</span>
              </div>
            </div>
            <div class="info-box grow">
              <div class="item-title">初回突破報酬（${Object.keys(snap.clearedTrials).length}/${WDATA.TRIALS.length} 制覇）</div>
              <div class="synergy-list">
                <span class="synergy-pill">残響石 +${fnum(tr.rewardStone)}</span>
                <span class="synergy-pill">自由アビリティ「${esc(ab.name)}」：${esc(ab.desc)}</span>
              </div>
              <div class="skill-preview-list">
                ${boss.skills.map((sk, idx) => `
                  <div class="skill-preview-row">
                    <div class="skill-preview-head">
                      <span class="skill-name">敵技${idx + 1}：${esc(sk.name)}</span>
                      ${scopeBadge(sk.scope)}
                    </div>
                    <div class="skill-desc">${esc(sk.desc)}</div>
                  </div>`).join('')}
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }
    }

    /* ② 編成タブ上半分 */
    if (ui.tab === 'party') {
      const targetParty = ui.partySub === 'main' ? snap.party : snap.gauntletParties[ui.gauntletTeamIdx];
      const validIds = targetParty.filter(Boolean);
      const validChars = validIds.map((id) => CDATA.CHAR_MAP[id]).filter(Boolean);
      const syn = EDATA.computePartySynergies(validChars);
      const comps = validIds.map((id) => STATE.getCharComputed(id, targetParty));
      const totalPower = comps.reduce((s, c) => s + c.power, 0);
      const sumHp = comps.reduce((s, c) => s + c.hp, 0);
      const sumAtk = comps.reduce((s, c) => s + c.atk, 0);
      const avgSpd = comps.length ? Math.round(comps.reduce((s, c) => s + c.spd, 0) / comps.length) : 0;

      const slotsHtml = [0, 1, 2, 3].map((idx) => {
        const cid = targetParty[idx];
        const isSel = ui.selectedPartySlot === idx;
        if (!cid) {
          return `<div class="party-slot-card ${isSel ? 'selected' : ''}"><span class="item-sub">編成${idx + 1}：空き</span></div>`;
        }
        const comp = STATE.getCharComputed(cid, targetParty);
        return `
          <div class="party-slot-card ${isSel ? 'selected' : ''}">
            <div class="row-between">
              <span class="item-title" style="font-size:11.5px">${esc(comp.def.name)}</span>
              ${rarTag(comp.def.rarity)}
            </div>
            <div class="row-left">
              ${elBadge(comp.def.el)}
              ${roleBadge(comp.def.role)}
              <span class="item-sub num">覚醒${comp.awake}</span>
            </div>
            <div class="row-between">
              <span class="item-sub num">戦力 ${fnum(comp.power)}</span>
              <span class="item-sub">${comp.linkInfo ? '共鳴:' + esc(comp.linkInfo.name) : '共鳴なし'}</span>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group">
              <span class="upper-title">${ui.partySub === 'main' ? '主力編成' : `総力第${ui.gauntletTeamIdx + 1}部隊`}</span>
              <span class="upper-subtitle num">総戦力 ${fnum(totalPower)}</span>
            </div>
            ${currencyBarHtml(snap)}
          </div>
          <div class="party-preview-grid">${slotsHtml}</div>
          <div class="stat-grid-4">
            <div class="stat-cell"><div class="stat-lbl">合計HP</div><div class="stat-val">${fnum(sumHp)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">合計攻撃</div><div class="stat-val">${fnum(sumAtk)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">平均速度</div><div class="stat-val">${avgSpd}</div></div>
            <div class="stat-cell"><div class="stat-lbl">シナジー</div><div class="stat-val">${syn.active.length}種</div></div>
          </div>
          <div class="info-box grow">
            <div class="item-sub" style="font-weight:800;color:var(--gold-bright)">発動中の編成シナジー（属性・ロール・出身異界）</div>
            <div class="synergy-list">
              ${syn.active.length > 0
                ? syn.active.map((s) => `<span class="synergy-pill">${esc(s.name)}：${esc(s.desc)}</span>`).join('')
                : '<span class="item-sub">属性・ロール・出身異界の組み合わせで部隊強化が発動します</span>'}
            </div>
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    /* ③ 育成タブ上半分（共鳴結晶＆魂晶を両方常時表示・紹介文は図鑑のみ） */
    if (ui.tab === 'grow') {
      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const comp = STATE.getCharComputed(cid, snap.party);
      const r = snap.roster[cid];
      const maxAbSlots = STATE.getAbilitySlotCount(r.awake);
      const eqAbNames = r.abilities.map((aid) => EDATA.ABILITY_MAP[aid]?.name).filter(Boolean).join(' / ') || '未装着';

      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group">
              ${rarTag(comp.def.rarity)}
              <span class="upper-title">${esc(comp.def.name)}</span>
              ${elBadge(comp.def.el)}
              ${roleBadge(comp.def.role)}
            </div>
            <div class="currency-bar">
              <span class="curr-pill num" title="共鳴結晶">${ICON.svg('crystal', 11)} ${fnum(snap.crystal)}</span>
              <span class="curr-pill num" title="魂晶">${ICON.svg('soul', 11)} ${fnum(snap.soul)}</span>
            </div>
          </div>
          <div class="stat-grid-5">
            <div class="stat-cell"><div class="stat-lbl">HP</div><div class="stat-val">${fnum(comp.hp)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">攻撃</div><div class="stat-val">${fnum(comp.atk)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">防御</div><div class="stat-val">${fnum(comp.defStat)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">速度</div><div class="stat-val">${comp.spd}</div></div>
            <div class="stat-cell"><div class="stat-lbl">会心</div><div class="stat-val">${Math.round(comp.crit * 100)}%</div></div>
          </div>
          <div class="info-box grow">
            <div class="row-between">
              <span class="item-sub">覚醒 ${r.awake}/5 ・ 共鳴盤 ${r.board.length}/6 ・ 自由枠 ${r.abilities.length}/${maxAbSlots}：${esc(eqAbNames)}</span>
            </div>
            <div class="row-between">
              <span class="item-sub">固有：${esc(comp.def.innate.name)}（${esc(comp.def.innate.desc)}）</span>
            </div>
            <div class="skill-preview-list">
              ${comp.def.skills.map((sk) => `
                <div class="skill-preview-row">
                  <div class="skill-preview-head">
                    <span class="skill-name">${sk.scope === 'passive' ? '常時' : '技' + sk.slot}：${esc(sk.name)}</span>
                    ${scopeBadge(sk.scope)}
                  </div>
                  <div class="skill-desc">${esc(sk.desc)}</div>
                </div>`).join('')}
            </div>
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    /* ④ 装備タブ上半分（サブタブ完全連動！装着／売却／限定製作／金貨還元） */
    if (ui.tab === 'equip') {
      if (ui.equipSub === 'craft') {
        const ser = EDATA.SERIES_MAP[ui.selectedCraftSeries] || EDATA.EQUIP_SERIES.find((s) => s.limited);
        const raid = WDATA.RAIDS.find((x) => x.matId === ser.matId);
        const have = snap.mats[ser.matId] || 0;
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                <span class="upper-title">限定装備製作</span>
                ${ser.el ? elBadge(ser.el) : ''}
              </div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <span class="item-title">${esc(ser.name)}</span>
                <span class="synergy-pill num">${esc(raid ? raid.matName : '')} ${have}/${ser.matCost}</span>
              </div>
              <div class="stat-grid-4">
                ${EDATA.SLOTS.map((sl) => {
                  const vals = STATE.getEquipPartPreviewValues(ser.id, sl.id);
                  return `<div class="stat-cell"><div class="stat-lbl">${esc(sl.name)}(${esc(sl.statLabel)})</div><div class="stat-val">+${fnum(vals[0].val)}〜${fnum(vals[4].val)}</div></div>`;
                }).join('')}
              </div>
            </div>
            <div class="info-box grow">
              <div class="skill-preview-row">
                <div class="skill-name">2部位セット効果</div>
                <div class="skill-desc">${esc(ser.set2.desc)}</div>
              </div>
              <div class="skill-preview-row">
                <div class="skill-name">4部位セット効果</div>
                <div class="skill-desc">${esc(ser.set4.desc)}</div>
              </div>
              <div class="item-sub">獲得先：${esc(ser.sourceText)}</div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.equipSub === 'shop') {
        const cryTimes = Math.floor(snap.gold / 400);
        const stoTimes = Math.floor(snap.gold / 600);
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">金貨還元交換</span></div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="stat-grid-4">
                <div class="stat-cell"><div class="stat-lbl">所持金貨</div><div class="stat-val">${fnum(snap.gold)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">共鳴結晶</div><div class="stat-val">${fnum(snap.crystal)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">残響石</div><div class="stat-val">${fnum(snap.stone)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">交換可能</div><div class="stat-val">${fnum(cryTimes)}回</div></div>
              </div>
            </div>
            <div class="info-box grow">
              <div class="skill-preview-row">
                <div class="skill-preview-head">
                  <span class="skill-name">${ICON.svg('crystal', 11)} 共鳴結晶交換</span>
                  <span class="qual-tag qual-2 num">交換可 ${fnum(cryTimes)}回</span>
                </div>
                <div class="skill-desc">金貨 400 で 共鳴結晶 +160（キャラの共鳴盤ノード解放に使用）</div>
              </div>
              <div class="skill-preview-row">
                <div class="skill-preview-head">
                  <span class="skill-name">${ICON.svg('stone', 11)} 残響石交換</span>
                  <span class="qual-tag qual-4 num">交換可 ${fnum(stoTimes)}回</span>
                </div>
                <div class="skill-desc">金貨 600 で 残響石 +120（星海残響召喚に使用）</div>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.equipSub === 'sell') {
        const equippedSet = new Set();
        Object.values(snap.roster).forEach((r) => EDATA.SLOTS.forEach((sl) => { if (r.equips[sl.id]) equippedSet.add(r.equips[sl.id]); }));
        const counts = [0, 1, 2, 3, 4].map((q) => snap.equips.filter((e) => e.quality === q && !e.locked && !equippedSet.has(e.id)).length);
        const lockedCnt = snap.equips.filter((e) => e.locked).length;
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">装備整理・売却</span></div>
              ${currencyBarHtml(snap)}
            </div>
            <div class="info-box">
              <div class="row-between">
                <span class="item-title">売却可能な未装着装備（品質別）</span>
                <span class="item-sub num">保護中 ${lockedCnt}個 / 総所持 ${snap.equips.length}個</span>
              </div>
              <div class="stat-grid-5">
                ${EDATA.QUALITIES.map((q, idx) => `<div class="stat-cell"><div class="stat-lbl">${esc(q.name)}</div><div class="stat-val">${counts[idx]}個</div></div>`).join('')}
              </div>
            </div>
            <div class="info-box grow">
              <div class="skill-preview-row">
                <div class="skill-name">自動売却ライン</div>
                <div class="skill-desc">現在設定：${snap.settings.autoSellMaxQuality < 0 ? 'OFF（すべて保管）' : EDATA.QUALITIES[snap.settings.autoSellMaxQuality].name + '以下を即時換金'}</div>
              </div>
              <div class="skill-preview-row">
                <div class="skill-name">保護ルール</div>
                <div class="skill-desc">誰かが装着中の装備、および保護マーク付き装備は一括売却の対象から除外されます。</div>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const comp = STATE.getCharComputed(cid, snap.party);
      const r = snap.roster[cid];
      let sumAtk = 0, sumDef = 0, sumHp = 0, sumSpd = 0;

      const slotCards = EDATA.SLOTS.map((sl) => {
        const eq = STATE.getEquipById(r.equips[sl.id]);
        if (!eq) {
          return `<div class="party-slot-card"><span class="item-sub">${ICON.svg(sl.id, 11)} ${esc(sl.name)}（${esc(sl.statLabel)}）：未装着</span></div>`;
        }
        const ser = EDATA.SERIES_MAP[eq.seriesId];
        const val = STATE.getEquipStatValue(eq);
        if (sl.baseStat === 'atk') sumAtk += val;
        if (sl.baseStat === 'def') sumDef += val;
        if (sl.baseStat === 'hp') sumHp += val;
        if (sl.baseStat === 'spd') sumSpd += val;
        return `
          <div class="party-slot-card ${ui.selectedEquipSlot === sl.id ? 'selected' : ''}">
            <div class="row-between">
              <span class="item-title" style="font-size:11px">${ICON.svg(sl.id, 11)} ${esc(ser.partNames[sl.id])}</span>
              ${qualTag(eq.quality)}
            </div>
            <div class="row-between">
              <span class="item-sub">${esc(ser.name)}</span>
              <span class="item-sub num" style="color:var(--gold-bright);font-weight:800">${esc(sl.statLabel)} +${fnum(val)}</span>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group">
              ${elBadge(comp.def.el)}
              <span class="upper-title">${esc(comp.def.name)}</span>
              <span class="upper-subtitle num">戦力 ${fnum(comp.power)}</span>
            </div>
            ${currencyBarHtml(snap)}
          </div>
          <div class="party-preview-grid">${slotCards}</div>
          <div class="stat-grid-4">
            <div class="stat-cell"><div class="stat-lbl">装備HP</div><div class="stat-val">+${fnum(sumHp)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">装備攻撃</div><div class="stat-val">+${fnum(sumAtk)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">装備防御</div><div class="stat-val">+${fnum(sumDef)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">装備速度</div><div class="stat-val">+${sumSpd}</div></div>
          </div>
          <div class="info-box grow">
            <div class="row-between">
              <span class="item-sub" style="font-weight:800;color:var(--gold-bright)">発動中セット効果</span>
              <span class="item-sub">自動売却：${snap.settings.autoSellMaxQuality < 0 ? 'OFF' : EDATA.QUALITIES[snap.settings.autoSellMaxQuality].name + '以下'}</span>
            </div>
            <div class="synergy-list">
              ${comp.activeSets.length > 0
                ? comp.activeSets.map((s) => `<span class="synergy-pill">${esc(s.name)}(${s.count})：${esc(s.desc)}</span>`).join('')
                : '<span class="item-sub">同シリーズ2部位・4部位の装着でセット効果が発動します</span>'}
            </div>
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    /* ⑤ 召喚タブ上半分（幾何学魔法陣＆召喚演出 ＋ 限定解放／覇王降臨／魂晶交換の完全連動） */
    if (ui.tab === 'summon') {
      if (ui.summonSub === 'raidChar' || ui.summonSub === 'raidBoss') {
        const isBossMode = ui.summonSub === 'raidBoss';
        const pool = CDATA.CHARS.filter((c) => c.source === (isBossMode ? 'raidBoss' : 'raid'));
        const c = CDATA.CHAR_MAP[ui.selectedExchangeCharId] && CDATA.CHAR_MAP[ui.selectedExchangeCharId].source === (isBossMode ? 'raidBoss' : 'raid')
          ? CDATA.CHAR_MAP[ui.selectedExchangeCharId]
          : pool[0];
        const have = isBossMode ? (snap.bossMarks[c.id] || 0) : (snap.shards[c.id] || 0);
        const owned = snap.roster[c.id];
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                ${rarTag(c.rarity)}
                <span class="upper-title">${esc(c.name)}</span>
                ${elBadge(c.el)}
                ${roleBadge(c.role)}
              </div>
              <span class="curr-pill num">${isBossMode ? ICON.svg('mark', 11) + ' 覇印' : '鍵'} ${have}/5</span>
            </div>
            <div class="stat-grid-5">
              <div class="stat-cell"><div class="stat-lbl">基礎HP</div><div class="stat-val">${fnum(c.hp)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">基礎攻撃</div><div class="stat-val">${fnum(c.atk)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">基礎防御</div><div class="stat-val">${fnum(c.def)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">速度</div><div class="stat-val">${c.spd}</div></div>
              <div class="stat-cell"><div class="stat-lbl">状態</div><div class="stat-val">${owned ? '覚醒' + owned.awake : '未解放'}</div></div>
            </div>
            <div class="info-box grow">
              <div class="item-sub">固有：${esc(c.innate.name)}（${esc(c.innate.desc)}）</div>
              <div class="skill-preview-list">
                ${c.skills.map((sk) => `
                  <div class="skill-preview-row">
                    <div class="skill-preview-head">
                      <span class="skill-name">${sk.scope === 'passive' ? '常時' : '技' + sk.slot}：${esc(sk.name)}</span>
                      ${scopeBadge(sk.scope)}
                    </div>
                    <div class="skill-desc">${esc(sk.desc)}</div>
                  </div>`).join('')}
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.summonSub === 'abShop') {
        const shopAbs = EDATA.FREE_ABILITIES.filter((a) => a.costSoul);
        const unlockedCnt = shopAbs.filter((a) => snap.unlockedAbilities.includes(a.id)).length;
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group"><span class="upper-title">魂晶アビリティ交換</span></div>
              <span class="curr-pill num">${ICON.svg('soul', 11)} 魂晶 ${fnum(snap.soul)}</span>
            </div>
            <div class="info-box grow">
              <div class="stat-grid-4">
                <div class="stat-cell"><div class="stat-lbl">所持魂晶</div><div class="stat-val">${fnum(snap.soul)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">交換済</div><div class="stat-val">${unlockedCnt}/${shopAbs.length}</div></div>
                <div class="stat-cell"><div class="stat-lbl">総解放</div><div class="stat-val">${snap.unlockedAbilities.length}/${EDATA.FREE_ABILITIES.length}</div></div>
                <div class="stat-cell"><div class="stat-lbl">装着先</div><div class="stat-val">育成画面</div></div>
              </div>
              <div class="skill-preview-row">
                <div class="skill-name">自由アビリティについて</div>
                <div class="skill-desc">解放したアビリティは全キャラの自由枠へ何度でも自由に付け替えできます。覚醒2で2枠目、覚醒4で3枠目が開きます。</div>
              </div>
              <div class="prog-wrap">
                <div class="prog-head"><span>魂晶交換コンプリート率</span><span class="num">${unlockedCnt}/${shopAbs.length}</span></div>
                <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${(unlockedCnt / shopAbs.length) * 100}%"></div></div>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      /* 残響召喚メイン（常設魔法陣ゲート ＋ 召喚演出 ＋ 結果カード連続公開） */
      const anim = ui.summonAnim;
      let altarHtml = '';
      if (anim && anim.phase === 'charging') {
        const rarCls = `tier-${anim.highestRarity} rar-${anim.highestRarity}`;
        altarHtml = `
          <div class="summon-altar charging ${rarCls}">
            <div class="summon-pillar"></div>
            <div class="item-sub" style="color:var(--gold-bright);font-weight:900;letter-spacing:0.12em">残響共鳴中</div>
            <div class="summon-gate-wrap">
              ${renderSummonGateSvg()}
              <div class="summon-core">${ICON.svg('summon', 22)}</div>
            </div>
            <div class="item-sub" style="color:#fff4d0;font-weight:800">異界の扉が開いています</div>
          </div>`;
      } else if (ui.lastSummonResults && ui.lastSummonResults.length > 0) {
        const shown = anim && anim.phase === 'reveal'
          ? ui.lastSummonResults.slice(0, Math.max(1, anim.revealedCount))
          : ui.lastSummonResults;
        const topRar = ui.lastSummonTopRar || 'N';
        const showFlash = anim && anim.phase === 'reveal' && anim.revealedCount <= 2;
        altarHtml = `
          <div class="summon-altar tier-${topRar} rar-${topRar}" style="justify-content:center">
            ${showFlash ? `<div class="summon-flash-veil"></div>` : ''}
            <div class="summon-grid ${ui.lastSummonResults.length === 1 ? 'single' : ''}">
              ${shown.map((res) => {
                const tag = res.status === 'new' ? 'NEW' : (res.status === 'awake' ? `覚醒${res.awake}` : `魂晶+${res.gainSoul}`);
                return `
                  <div class="summon-card rar-${res.rarity}">
                    <div class="row-left">
                      ${rarTag(res.rarity)}
                      <span class="el-${res.el}" style="color:var(--el-color)">${ICON.svg(res.el, 10)}</span>
                      <span class="item-title" style="font-size:11px">${esc(res.name)}</span>
                    </div>
                    <span class="item-sub num" style="color:var(--gold-bright);font-weight:900">${esc(tag)}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>`;
      } else {
        altarHtml = `
          <div class="summon-altar">
            <div class="row-between" style="width:100%">
              <span class="item-title" style="font-family:var(--font-display);color:var(--gold-bright)">星海の残響召喚陣</span>
              <span class="item-sub num">累計 ${fnum(snap.stats.totalSummons)}回</span>
            </div>
            <div class="summon-gate-wrap">
              ${renderSummonGateSvg()}
              <div class="summon-core">${ICON.svg('summon', 20)}</div>
            </div>
            <div class="stat-grid-5" style="width:100%">
              <div class="stat-cell"><div class="stat-lbl">UR</div><div class="stat-val" style="color:#ff94e6">3%</div></div>
              <div class="stat-cell"><div class="stat-lbl">SSR</div><div class="stat-val" style="color:#f7cd5c">10%</div></div>
              <div class="stat-cell"><div class="stat-lbl">SR</div><div class="stat-val" style="color:#cb84ff">25%</div></div>
              <div class="stat-cell"><div class="stat-lbl">R</div><div class="stat-val" style="color:#58c4ff">34%</div></div>
              <div class="stat-cell"><div class="stat-lbl">N</div><div class="stat-val">28%</div></div>
            </div>
          </div>`;
      }

      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group"><span class="upper-title">召喚・降臨</span></div>
            <div class="currency-bar">
              <span class="curr-pill num">${ICON.svg('stone', 11)} ${fnum(snap.stone)}</span>
              <span class="curr-pill num">${ICON.svg('soul', 11)} ${fnum(snap.soul)}</span>
            </div>
          </div>
          ${altarHtml}
          ${toastHtml(ui)}
        </div>`;
    }

    /* ⑥ 図鑑＆設定タブ上半分（紹介文はここ限定・敵＆装備パラメータ＆出現場所明記・撃破数なし） */
    if (ui.tab === 'codex') {
      const charPct = Math.round((Object.keys(snap.roster).length / CDATA.CHARS.length) * 100);
      const enemyTotal = Object.keys(WDATA.ENEMIES).length;
      const enemySeen = Object.keys(snap.codexEnemies).length;
      const equipTotal = EDATA.EQUIP_PARTS.length;
      const equipSeen = EDATA.EQUIP_PARTS.filter((p) => snap.codexEquips[p.partKey]).length;

      if (ui.codexSub === 'char') {
        const c = CDATA.CHAR_MAP[ui.codexCharId] || CDATA.CHARS[0];
        const owned = Boolean(snap.roster[c.id]);
        const worldName = (WDATA.WORLDS.find((w) => w.id === c.world) || {}).name || '';
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                ${rarTag(c.rarity)}
                <span class="upper-title">${esc(c.name)}</span>
                ${elBadge(c.el)}
                ${roleBadge(c.role)}
              </div>
              <span class="item-sub num">収集 ${charPct}%</span>
            </div>
            <div class="stat-grid-5">
              <div class="stat-cell"><div class="stat-lbl">HP</div><div class="stat-val">${fnum(c.hp)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">攻撃</div><div class="stat-val">${fnum(c.atk)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">防御</div><div class="stat-val">${fnum(c.def)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">速度</div><div class="stat-val">${c.spd}</div></div>
              <div class="stat-cell"><div class="stat-lbl">状態</div><div class="stat-val">${owned ? '所持' : '未所持'}</div></div>
            </div>
            <div class="row-between">
              <span class="item-sub">出身：${esc(worldName)}</span>
              <span class="item-sub">入手：${esc(charSourceLabel(c))}</span>
            </div>
            <div class="lore-box">${esc(c.lore)}</div>
            <div class="skill-preview-list">
              ${c.skills.map((sk) => `
                <div class="skill-preview-row">
                  <div class="skill-preview-head">
                    <span class="skill-name">${sk.scope === 'passive' ? '常時' : '技' + sk.slot}：${esc(sk.name)}</span>
                    ${scopeBadge(sk.scope)}
                  </div>
                  <div class="skill-desc">${esc(sk.desc)}</div>
                </div>`).join('')}
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.codexSub === 'enemy') {
        const e = WDATA.ENEMIES[ui.codexEnemyId] || WDATA.getAllEnemiesSorted()[0];
        const kindTag = (e.kind === 'boss' || e.kind === 'raid')
          ? `<span class="encounter-badge boss">${esc(ENEMY_KIND_LABEL[e.kind])}</span>`
          : (e.kind === 'intruder' ? `<span class="encounter-badge intruder">乱入</span>` : `<span class="qual-tag qual-0">通常敵</span>`);
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                ${kindTag}
                <span class="upper-title">${esc(e.name)}</span>
                ${elBadge(e.el)}
              </div>
              <span class="item-sub num">遭遇 ${enemySeen}/${enemyTotal}</span>
            </div>
            <div class="stat-grid-4">
              <div class="stat-cell"><div class="stat-lbl">基礎HP</div><div class="stat-val">${fnum(e.hp)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">基礎攻撃</div><div class="stat-val">${fnum(e.atk)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">基礎防御</div><div class="stat-val">${fnum(e.def)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">基礎速度</div><div class="stat-val">${e.spd}</div></div>
            </div>
            <div class="item-sub" style="color:var(--gold-bright);font-weight:800">出現場所：${esc(e.spawnText)}</div>
            <div class="lore-box">${esc(e.lore)}</div>
            <div class="skill-preview-list">
              ${e.skills.map((sk, idx) => `
                <div class="skill-preview-row">
                  <div class="skill-preview-head">
                    <span class="skill-name">敵技${idx + 1}：${esc(sk.name)}</span>
                    ${scopeBadge(sk.scope)}
                  </div>
                  <div class="skill-desc">${esc(sk.desc)}</div>
                </div>`).join('')}
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.codexSub === 'equip') {
        const part = EDATA.PART_MAP[ui.codexEquipPartKey] || EDATA.EQUIP_PARTS[0];
        const ser = EDATA.SERIES_MAP[part.seriesId];
        const vals = STATE.getEquipPartPreviewValues(part.seriesId, part.slotId);
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                <span class="qual-tag ${part.limited ? 'qual-4' : 'qual-2'}">${ICON.svg(part.slotId, 10)} ${esc(part.slotName)}</span>
                <span class="upper-title">${esc(part.partName)}</span>
              </div>
              <span class="item-sub num">発見 ${equipSeen}/${equipTotal}</span>
            </div>
            <div class="row-between">
              <span class="item-sub">シリーズ：${esc(ser.name)}</span>
              <span class="item-sub">入手：${esc(part.sourceText)}</span>
            </div>
            <div class="stat-grid-5">
              ${vals.map((v) => `<div class="stat-cell"><div class="stat-lbl">${esc(v.name)}</div><div class="stat-val">${esc(part.statLabel.slice(0, 2))}+${fnum(v.val)}</div></div>`).join('')}
            </div>
            <div class="lore-box">${esc(part.partLore)}</div>
            <div class="info-box grow">
              <div class="skill-preview-row">
                <div class="skill-name">2部位セット効果（${esc(ser.name)}）</div>
                <div class="skill-desc">${esc(ser.set2.desc)}</div>
              </div>
              <div class="skill-preview-row">
                <div class="skill-name">4部位セット効果</div>
                <div class="skill-desc">${esc(ser.set4.desc)}</div>
              </div>
              <div class="synergy-list">
                ${EDATA.SLOTS.map((sl) => `<span class="synergy-pill" style="${sl.id === part.slotId ? 'border-color:var(--gold-bright);background:rgba(216,181,100,0.28)' : ''}">${esc(sl.name)}：${esc(ser.partNames[sl.id])}</span>`).join('')}
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      /* 設定＆記録プレビュー */
      const totalStages = WDATA.WORLDS.reduce((s, w) => s + w.stages.length, 0);
      const clearedStages = Object.keys(snap.clearedStages).length;
      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group"><span class="upper-title">記録と設定</span></div>
            ${currencyBarHtml(snap)}
          </div>
          <div class="info-box">
            <div class="stat-grid-4">
              <div class="stat-cell"><div class="stat-lbl">仲間</div><div class="stat-val">${Object.keys(snap.roster).length}/${CDATA.CHARS.length}</div></div>
              <div class="stat-cell"><div class="stat-lbl">異界探索</div><div class="stat-val">${clearedStages}/${totalStages}</div></div>
              <div class="stat-cell"><div class="stat-lbl">深淵の塔</div><div class="stat-val">${snap.towerMaxCleared}/${WDATA.TOWER_MAX_FLOOR}</div></div>
              <div class="stat-cell"><div class="stat-lbl">総出撃数</div><div class="stat-val">${fnum(snap.stats.totalRuns)}</div></div>
            </div>
            <div class="stat-grid-4">
              <div class="stat-cell"><div class="stat-lbl">異界討伐</div><div class="stat-val">${Object.keys(snap.clearedRaids).length}/${WDATA.RAIDS.length}</div></div>
              <div class="stat-cell"><div class="stat-lbl">総力連戦</div><div class="stat-val">${Object.keys(snap.clearedGauntlets).length}/${WDATA.GAUNTLETS.length}</div></div>
              <div class="stat-cell"><div class="stat-lbl">試練狭間</div><div class="stat-val">${Object.keys(snap.clearedTrials).length}/${WDATA.TRIALS.length}</div></div>
              <div class="stat-cell"><div class="stat-lbl">累計召喚</div><div class="stat-val">${fnum(snap.stats.totalSummons)}</div></div>
            </div>
          </div>
          <div class="info-box grow">
            <div class="prog-wrap">
              <div class="prog-head"><span>キャラ収集率</span><span class="num">${Object.keys(snap.roster).length}/${CDATA.CHARS.length} (${charPct}%)</span></div>
              <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${charPct}%"></div></div>
            </div>
            <div class="prog-wrap">
              <div class="prog-head"><span>敵遭遇率</span><span class="num">${enemySeen}/${enemyTotal} (${Math.round((enemySeen / enemyTotal) * 100)}%)</span></div>
              <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${(enemySeen / enemyTotal) * 100}%"></div></div>
            </div>
            <div class="prog-wrap">
              <div class="prog-head"><span>装備発見率</span><span class="num">${equipSeen}/${equipTotal} (${Math.round((equipSeen / equipTotal) * 100)}%)</span></div>
              <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${(equipSeen / equipTotal) * 100}%"></div></div>
            </div>
            ${ui.exportedCode ? `<div class="item-sub" style="color:var(--gold-bright)">引き継ぎコードを発行しました（下段の入力欄にセット済み）</div>` : ''}
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    return '';
  }

  /* =========================================================
   * 非戦闘画面 下半分（全操作・横スクロール・完全スクロール保持）
   * ========================================================= */
  function renderBottomNav(activeTab) {
    const tabs = [
      { id: 'quest',  label: '出撃', icon: 'battle' },
      { id: 'party',  label: '編成', icon: 'party' },
      { id: 'grow',   label: '育成', icon: 'grow' },
      { id: 'equip',  label: '装備', icon: 'equip' },
      { id: 'summon', label: '召喚', icon: 'summon' },
      { id: 'codex',  label: '図鑑', icon: 'codex' }
    ];
    return `
      <nav class="bottom-nav" aria-label="メインナビゲーション">
        ${tabs.map((t) => `
          <button class="nav-btn ${activeTab === t.id ? 'active' : ''}" data-act="setTab" data-val="${t.id}">
            ${ICON.svg(t.icon, 17)}
            <span>${t.label}</span>
          </button>`).join('')}
      </nav>`;
  }

  function renderNonBattleLower(snap, ui) {
    if (ui.resultReport) return renderResultLower(ui.resultReport);

    let body = '';

    /* ① 出撃タブ */
    if (ui.tab === 'quest') {
      const subtabs = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.questSub === 'main' ? 'active' : ''}" data-act="setQuestSub" data-val="main">異界探索</button>
          <button class="subtab-btn ${ui.questSub === 'raid' ? 'active' : ''}" data-act="setQuestSub" data-val="raid">異界討伐</button>
          <button class="subtab-btn ${ui.questSub === 'gauntlet' ? 'active' : ''}" data-act="setQuestSub" data-val="gauntlet">総力連戦</button>
          <button class="subtab-btn ${ui.questSub === 'tower' ? 'active' : ''}" data-act="setQuestSub" data-val="tower">深淵の塔</button>
          <button class="subtab-btn ${ui.questSub === 'trial' ? 'active' : ''}" data-act="setQuestSub" data-val="trial">試練狭間</button>
        </div>`;

      if (ui.questSub === 'main') {
        const worldBtns = `
          <div class="h-scroll-wrap">
            <div class="h-scroll-row" data-scroll-key="quest-worlds">
              ${WDATA.WORLDS.map((w) => `
                <button class="h-pill-btn ${ui.selectedWorldId === w.id ? 'active' : ''}" data-act="selectWorld" data-val="${w.id}">
                  <span class="el-${w.mainEl}" style="color:var(--el-color)">${ICON.svg(w.mainEl, 10)}</span>
                  <span>${esc(w.shortName)}</span>
                </button>`).join('')}
            </div>
          </div>`;
        const world = WDATA.WORLDS.find((w) => w.id === ui.selectedWorldId) || WDATA.WORLDS[0];
        const autoSellLbl = snap.settings.autoSellMaxQuality < 0 ? 'OFF' : EDATA.QUALITIES[snap.settings.autoSellMaxQuality].name + '以下';
        const stageList = world.stages.map((st) => {
          const cleared = Boolean(snap.clearedStages[`${world.id}_${st.num}`]);
          const sel = ui.selectedStageNum === st.num;
          return `
            <button class="item-row-btn stage-card-btn ${sel ? 'selected' : ''}" data-act="selectStage" data-val="${st.num}">
              <div class="stage-card-head">
                <span class="item-sub" style="font-weight:900;color:var(--gold-bright)">ステージ${st.num}</span>
                <div class="row-left">
                  ${st.isBoss ? `<span class="encounter-badge boss">強敵</span>` : ''}
                  ${cleared ? `<span class="qual-tag qual-1">済</span>` : ''}
                </div>
              </div>
              <div class="row-between">
                <span class="item-title" style="font-size:11px">${esc(st.name)}</span>
                <span class="item-sub num">${fnum(Math.round(st.power * 3400))}</span>
              </div>
            </button>`;
        }).join('');

        body = `
          ${subtabs}
          ${worldBtns}
          <div class="scroll-list" data-scroll-key="quest-stages-${world.id}"><div class="list-grid-2">${stageList}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" style="flex:0.78;padding:6px 5px;font-size:10px" data-act="cycleAutoSellQuick">売却:${esc(autoSellLbl)}</button>
            <button class="btn-secondary" style="flex:0.92" data-act="startBattle" data-auto="0">1回出撃</button>
            <button class="btn-primary" style="flex:1.25" data-act="startBattle" data-auto="1">自動周回開始</button>
          </div>`;
      } else if (ui.questSub === 'raid') {
        const diffRow = `
          <div class="subtab-row">
            ${['初級', '上級', '極限'].map((d, i) => `
              <button class="subtab-btn ${ui.selectedRaidDiff === i ? 'active' : ''}" data-act="selectRaidDiff" data-val="${i}">${d}</button>`).join('')}
          </div>`;
        const rows = WDATA.RAIDS.map((r) => {
          const b = WDATA.ENEMIES[r.bossId];
          const sel = ui.selectedRaidId === r.id;
          return `
            <button class="item-row-btn ${sel ? 'selected' : ''}" data-act="selectRaid" data-val="${r.id}">
              <div class="row-between">
                <div class="row-left">${elBadge(b.el)}<span class="item-title">${esc(r.name)}（${esc(b.name)}）</span></div>
                <span class="item-sub num">覇印 ${snap.bossMarks[r.bossCharId] || 0}/5</span>
              </div>
              <div class="item-sub">${esc(r.desc)}</div>
            </button>`;
        }).join('');
        body = `
          ${subtabs}
          ${diffRow}
          <div class="scroll-list" data-scroll-key="quest-raids"><div class="list-stack">${rows}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="startBattle" data-auto="0">1回討伐</button>
            <button class="btn-primary" data-act="startBattle" data-auto="1">討伐を自動周回</button>
          </div>`;
      } else if (ui.questSub === 'gauntlet') {
        const rows = WDATA.GAUNTLETS.map((g) => {
          const sel = ui.selectedGauntletId === g.id;
          const cl = Boolean(snap.clearedGauntlets[g.id]);
          return `
            <button class="item-row-btn ${sel ? 'selected' : ''}" data-act="selectGauntlet" data-val="${g.id}">
              <div class="row-between">
                <span class="item-title">${esc(g.name)}</span>
                ${cl ? `<span class="qual-tag qual-1">制覇済</span>` : `<span class="qual-tag qual-4">初回 残響石+${fnum(g.rewardStone)}</span>`}
              </div>
              <div class="item-sub">3部隊連続戦 / 報酬：残響石・魂晶・限定素材</div>
            </button>`;
        }).join('');
        body = `
          ${subtabs}
          <div class="scroll-list" data-scroll-key="quest-gauntlets"><div class="list-stack">${rows}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="autoFillGauntlet">3部隊おまかせ</button>
            <button class="btn-secondary" data-act="gotoGauntletParty">手動編成</button>
            <button class="btn-primary" data-act="startBattle" data-auto="0">出撃</button>
          </div>`;
      } else if (ui.questSub === 'tower') {
        const maxAvail = Math.min(WDATA.TOWER_MAX_FLOOR, snap.towerMaxCleared + 1);
        const curBand = ui.selectedTowerBand || 0;
        const bands = [];
        for (let b = 0; b < 10; b++) {
          const s = b * 10 + 1;
          const e = (b + 1) * 10;
          const unlocked = s <= maxAvail;
          bands.push(`<button class="h-pill-btn ${curBand === b ? 'active' : ''}" data-act="selectTowerBand" data-val="${b}" ${unlocked ? '' : 'disabled'}>${s}〜${e}層</button>`);
        }
        const bandStart = curBand * 10 + 1;
        const bandEnd = Math.min(maxAvail, (curBand + 1) * 10);
        const rows = [];
        for (let f = bandEnd; f >= bandStart; f--) {
          const tf = WDATA.getTowerFloor(f);
          const sel = ui.selectedTowerFloor === f;
          const cl = f <= snap.towerMaxCleared;
          const msBadge = tf.milestone
            ? `<span class="qual-tag qual-3">${tf.milestone.kind === 'char' ? '限定仲間' : '限定アビ'}</span>`
            : '';
          rows.push(`
            <button class="item-row-btn stage-card-btn ${sel ? 'selected' : ''}" data-act="selectTower" data-val="${f}">
              <div class="stage-card-head">
                <span class="item-title">第${f}層</span>
                <div class="row-left">${tf.isBoss ? '<span class="encounter-badge boss">強敵</span>' : ''}${cl ? '<span class="qual-tag qual-1">済</span>' : '<span class="qual-tag qual-4">未</span>'}</div>
              </div>
              <div class="row-between">
                <span class="item-sub num">初回 残響石+${fnum(tf.firstStone)}</span>
                ${msBadge}
              </div>
            </button>`);
        }
        body = `
          ${subtabs}
          <div class="h-scroll-wrap"><div class="h-scroll-row" data-scroll-key="quest-tower-bands">${bands.join('')}</div></div>
          <div class="scroll-list" data-scroll-key="quest-tower-floors-${curBand}"><div class="list-grid-2">${rows.join('')}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="startBattle" data-auto="0">第${ui.selectedTowerFloor}層へ挑戦</button>
            <button class="btn-primary" data-act="startBattle" data-auto="1">この層を自動周回</button>
          </div>`;
      } else if (ui.questSub === 'trial') {
        const curTrial = WDATA.TRIALS.find((t) => t.id === ui.selectedTrialId) || WDATA.TRIALS[0];
        const curCheck = STATE.checkTrialRule(curTrial, snap.party);
        const rows = WDATA.TRIALS.map((tr) => {
          const sel = ui.selectedTrialId === tr.id;
          const cl = Boolean(snap.clearedTrials[tr.id]);
          const check = STATE.checkTrialRule(tr, snap.party);
          return `
            <button class="item-row-btn ${sel ? 'selected' : ''}" data-act="selectTrial" data-val="${tr.id}">
              <div class="row-between">
                <span class="item-title">${esc(tr.name)}</span>
                <div class="row-left">
                  ${check.ok ? `<span class="qual-tag qual-1">出撃可</span>` : `<span class="qual-tag qual-0">条件外</span>`}
                  ${cl ? `<span class="qual-tag qual-2">済</span>` : ''}
                </div>
              </div>
              <div class="item-sub">${esc(tr.ruleText)}</div>
            </button>`;
        }).join('');
        body = `
          ${subtabs}
          <div class="scroll-list" data-scroll-key="quest-trials"><div class="list-stack">${rows}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="setTab" data-val="party">条件に合わせて編成</button>
            <button class="btn-primary" data-act="startBattle" data-auto="0" ${curCheck.ok ? '' : 'disabled'}>試練へ挑戦</button>
          </div>`;
      }
    }

    /* ② 編成タブ */
    if (ui.tab === 'party') {
      const targetParty = ui.partySub === 'main' ? snap.party : snap.gauntletParties[ui.gauntletTeamIdx];
      const sortedIds = filterSortedCharIds(STATE.sortCharIds(Object.keys(snap.roster)), ui);

      const slotBtns = [0, 1, 2, 3].map((idx) => `
        <button class="subtab-btn ${ui.selectedPartySlot === idx ? 'active' : ''}" data-act="selectPartySlot" data-val="${idx}">編成${idx + 1}</button>`).join('');

      const listHtml = sortedIds.map((cid) => {
        const comp = STATE.getCharComputed(cid, targetParty);
        const inIdx = targetParty.indexOf(cid);
        const inOtherGauntlet = ui.partySub === 'gauntlet' && snap.gauntletParties.some((t, ti) => ti !== ui.gauntletTeamIdx && t.includes(cid));
        return `
          <button class="item-row-btn ${inIdx >= 0 ? 'in-party' : ''}" data-act="assignPartyChar" data-val="${cid}">
            <div class="row-between">
              <div class="row-left">${rarTag(comp.def.rarity)}<span class="item-title">${esc(comp.def.name)}</span></div>
              <div class="row-left">${elBadge(comp.def.el)}${roleBadge(comp.def.role)}</div>
            </div>
            <div class="row-between">
              <span class="item-sub num">覚醒 ${comp.awake}/5 ・ 戦力 ${fnum(comp.power)}</span>
              <span class="item-sub">${inIdx >= 0 ? `編成中(枠${inIdx + 1})` : (inOtherGauntlet ? '他部隊編成中' : 'タップで配置')}</span>
            </div>
          </button>`;
      }).join('');

      body = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.partySub === 'main' ? 'active' : ''}" data-act="setPartySub" data-val="main">主力編成</button>
          <button class="subtab-btn ${ui.partySub === 'gauntlet' && ui.gauntletTeamIdx === 0 ? 'active' : ''}" data-act="setGauntletTeam" data-val="0">総力第1</button>
          <button class="subtab-btn ${ui.partySub === 'gauntlet' && ui.gauntletTeamIdx === 1 ? 'active' : ''}" data-act="setGauntletTeam" data-val="1">総力第2</button>
          <button class="subtab-btn ${ui.partySub === 'gauntlet' && ui.gauntletTeamIdx === 2 ? 'active' : ''}" data-act="setGauntletTeam" data-val="2">総力第3</button>
        </div>
        <div class="subtab-row">
          ${slotBtns}
          <button class="subtab-btn" data-act="clearPartySlot">外す</button>
          ${ui.partySub === 'gauntlet' ? `<button class="subtab-btn active" data-act="autoFillGauntlet">自動3部隊</button>` : ''}
        </div>
        ${renderFilterBars(ui, 'party')}
        <div class="scroll-list" data-scroll-key="party-list"><div class="list-stack">${listHtml || '<div class="item-sub">該当するキャラがいません</div>'}</div></div>`;
    }

    /* ③ 育成タブ（横スクロールキャラ即切替＋「共鳴」名称統一） */
    if (ui.tab === 'grow') {
      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const r = snap.roster[cid];
      const def = CDATA.CHAR_MAP[cid];
      const sortedIds = STATE.sortCharIds(Object.keys(snap.roster));

      const charStrip = renderHorizontalCharStrip(snap, cid, 'selectChar', 'grow-chars-h');
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.growSub === 'board' ? 'active' : ''}" data-act="setGrowSub" data-val="board">共鳴盤</button>
          <button class="subtab-btn ${ui.growSub === 'awake' ? 'active' : ''}" data-act="setGrowSub" data-val="awake">覚醒</button>
          <button class="subtab-btn ${ui.growSub === 'ability' ? 'active' : ''}" data-act="setGrowSub" data-val="ability">アビリティ</button>
          <button class="subtab-btn ${ui.growSub === 'link' ? 'active' : ''}" data-act="setGrowSub" data-val="link">共鳴</button>
          <button class="subtab-btn ${ui.growSub === 'list' ? 'active' : ''}" data-act="setGrowSub" data-val="list">一覧</button>
        </div>`;

      let content = '';
      if (ui.growSub === 'list') {
        const filtered = filterSortedCharIds(sortedIds, ui);
        content = `${renderFilterBars(ui, 'grow')}<div class="scroll-list" data-scroll-key="grow-list"><div class="list-stack">${filtered.map((id) => {
          const comp = STATE.getCharComputed(id, snap.party);
          const sel = id === cid;
          return `
            <button class="item-row-btn ${sel ? 'selected' : ''}" data-act="selectChar" data-val="${id}">
              <div class="row-between">
                <div class="row-left">${rarTag(comp.def.rarity)}<span class="item-title">${esc(comp.def.name)}</span></div>
                <div class="row-left">${elBadge(comp.def.el)}${roleBadge(comp.def.role)}</div>
              </div>
              <div class="row-between">
                <span class="item-sub num">覚醒 ${comp.awake}/5 ・ 共鳴盤 ${snap.roster[id].board.length}/6</span>
                <span class="item-sub num">戦力 ${fnum(comp.power)}</span>
              </div>
            </button>`;
        }).join('') || '<div class="item-sub">該当するキャラがいません</div>'}</div></div>`;
      } else if (ui.growSub === 'board') {
        const nodes = CDATA.BOARD_TEMPLATES.map((t) => {
          const unlocked = r.board.includes(t.key);
          const can = !unlocked && snap.crystal >= t.cost;
          return `
            <button class="node-card ${unlocked ? 'unlocked' : (can ? 'can-unlock' : '')}" data-act="unlockBoard" data-val="${t.key}" ${unlocked ? 'disabled' : ''}>
              <div class="row-between">
                <span class="item-title" style="font-size:11.5px">${esc(t.name)}</span>
                <span class="item-sub num">${unlocked ? '解放済' : `共鳴結晶 ${fnum(t.cost)}`}</span>
              </div>
              <div class="item-sub">${esc(t.desc)}</div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list" data-scroll-key="grow-board"><div class="list-grid-2">${nodes}</div></div>`;
      } else if (ui.growSub === 'awake') {
        const costMap = { N: 40, R: 70, SR: 120, SSR: 200, UR: 320 };
        const nextCost = costMap[def.rarity] + r.awake * 35;
        const nextBonus = r.awake < 5 ? `全基礎性能 +${(r.awake + 1) * 14}%${r.awake + 1 === 2 ? ' ＋ 自由枠2解放' : (r.awake + 1 === 4 ? ' ＋ 自由枠3解放' : '')}` : '最大段階に到達済み';
        content = `
          <div class="info-box grow" style="justify-content:space-between">
            <div class="stat-grid-4">
              <div class="stat-cell"><div class="stat-lbl">現在覚醒</div><div class="stat-val">${r.awake}/5</div></div>
              <div class="stat-cell"><div class="stat-lbl">基礎補正</div><div class="stat-val">+${r.awake * 14}%</div></div>
              <div class="stat-cell"><div class="stat-lbl">自由枠</div><div class="stat-val">${STATE.getAbilitySlotCount(r.awake)}枠</div></div>
              <div class="stat-cell"><div class="stat-lbl">所持魂晶</div><div class="stat-val">${fnum(snap.soul)}</div></div>
            </div>
            <div class="skill-preview-row">
              <div class="skill-name">次の覚醒効果</div>
              <div class="skill-desc">${esc(nextBonus)}</div>
            </div>
            <div class="action-bar">
              <button class="btn-primary" data-act="awakeChar" ${r.awake >= 5 || snap.soul < nextCost ? 'disabled' : ''}>
                ${r.awake >= 5 ? '最大覚醒に到達済み' : `魂晶 ${fnum(nextCost)} で覚醒 +1`}
              </button>
            </div>
          </div>`;
      } else if (ui.growSub === 'ability') {
        const maxSlots = STATE.getAbilitySlotCount(r.awake);
        const list = snap.unlockedAbilities.map((aid) => {
          const ab = EDATA.ABILITY_MAP[aid];
          if (!ab) return '';
          const equipped = r.abilities.includes(aid);
          return `
            <button class="item-row-btn ${equipped ? 'selected' : ''}" data-act="toggleAbility" data-val="${aid}">
              <div class="row-between">
                <span class="item-title">${esc(ab.name)}</span>
                <span class="${equipped ? 'qual-tag qual-1' : 'item-sub'}">${equipped ? '装着中' : '装着'}</span>
              </div>
              <div class="item-sub">${esc(ab.desc)}</div>
            </button>`;
        }).join('');
        content = `
          <div class="item-sub">自由枠：${r.abilities.length} / ${maxSlots}（召喚の魂晶交換・試練・深淵の塔で解放）</div>
          <div class="scroll-list" data-scroll-key="grow-ability"><div class="list-grid-2">${list}</div></div>`;
      } else if (ui.growSub === 'link') {
        const candidates = sortedIds.filter((id) => id !== cid && !snap.party.includes(id));
        const list = candidates.map((id) => {
          const cDef = CDATA.CHAR_MAP[id];
          const isLinked = r.linkCharId === id;
          return `
            <button class="item-row-btn ${isLinked ? 'selected' : ''}" data-act="setCharLink" data-val="${id}">
              <div class="row-between">
                <div class="row-left">${rarTag(cDef.rarity)}<span class="item-title">${esc(cDef.name)}</span></div>
                <span class="${isLinked ? 'qual-tag qual-1' : 'item-sub'}">${isLinked ? '共鳴中' : '選択'}</span>
              </div>
              <div class="item-sub">${esc(cDef.linkBonus.text)}（覚醒 ${snap.roster[id].awake}・共鳴盤 ${snap.roster[id].board.length}で強化）</div>
            </button>`;
        }).join('');
        content = `
          <div class="row-between">
            <span class="item-sub">控え仲間と共鳴して能力と特性を加算</span>
            <button class="btn-secondary" style="padding:3px 9px;font-size:10px" data-act="clearCharLink">共鳴解除</button>
          </div>
          <div class="scroll-list" data-scroll-key="grow-link"><div class="list-stack">${list || '<div class="item-sub">控えの仲間が増えると共鳴できます</div>'}</div></div>`;
      }

      body = `${subRow}${charStrip}${content}`;
    }

    /* ④ 装備タブ（横スクロールキャラ即切替・パラメータ名＆差分明示・限定6種製作） */
    if (ui.tab === 'equip') {
      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const r = snap.roster[cid];
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.equipSub === 'wear' ? 'active' : ''}" data-act="setEquipSub" data-val="wear">装着</button>
          <button class="subtab-btn ${ui.equipSub === 'sell' ? 'active' : ''}" data-act="setEquipSub" data-val="sell">売却・自動</button>
          <button class="subtab-btn ${ui.equipSub === 'craft' ? 'active' : ''}" data-act="setEquipSub" data-val="craft">限定製作</button>
          <button class="subtab-btn ${ui.equipSub === 'shop' ? 'active' : ''}" data-act="setEquipSub" data-val="shop">金貨還元</button>
        </div>`;

      let content = '';
      if (ui.equipSub === 'wear') {
        const charStrip = renderHorizontalCharStrip(snap, cid, 'selectChar', 'equip-chars-h');
        const curEquipped = STATE.getEquipById(r.equips[ui.selectedEquipSlot]);
        const curVal = curEquipped ? STATE.getEquipStatValue(curEquipped) : 0;

        const slotRow = `
          <div class="subtab-row">
            ${EDATA.SLOTS.map((sl) => `
              <button class="subtab-btn ${ui.selectedEquipSlot === sl.id ? 'active' : ''}" data-act="selectEquipSlot" data-val="${sl.id}">${esc(sl.name)}</button>`).join('')}
            <button class="subtab-btn ${ui.equipUnownedOnly ? 'active' : ''}" data-act="toggleEquipFilter">${ui.equipUnownedOnly ? '未装着' : '全装備'}</button>
            <button class="subtab-btn" data-act="autoEquipChar">最適</button>
          </div>`;

        const equips = snap.equips
          .filter((e) => {
            if (e.slotId !== ui.selectedEquipSlot) return false;
            if (ui.equipUnownedOnly) {
              const ow = STATE.getEquipOwner(e.id);
              return !ow || ow === cid;
            }
            return true;
          })
          .sort((a, b) => STATE.getEquipStatValue(b) - STATE.getEquipStatValue(a) || b.quality - a.quality);

        const list = equips.map((eq) => {
          const ser = EDATA.SERIES_MAP[eq.seriesId];
          const sl = EDATA.SLOT_MAP[eq.slotId];
          const owner = STATE.getEquipOwner(eq.id);
          const isMine = owner === cid;
          const val = STATE.getEquipStatValue(eq);
          const diff = val - curVal;
          const diffHtml = isMine
            ? ''
            : (diff > 0 ? `<span class="stat-diff-up num">(+${fnum(diff)})</span>` : (diff < 0 ? `<span class="stat-diff-down num">(${fnum(diff)})</span>` : ''));

          return `
            <div class="item-row-btn ${isMine ? 'selected' : ''}" style="flex-direction:row;align-items:center;justify-content:space-between;gap:6px">
              <button style="flex:1;text-align:left" data-act="${isMine ? 'unequipSlot' : 'equipItem'}" data-val="${isMine ? eq.slotId : eq.id}">
                <div class="row-between">
                  <div class="row-left">${qualTag(eq.quality)}<span class="item-title">${esc(ser.partNames[eq.slotId])}</span></div>
                  <span class="item-sub num" style="color:var(--gold-bright);font-weight:900">${esc(sl.statLabel)} +${fnum(val)} ${diffHtml}</span>
                </div>
                <div class="item-sub">${esc(ser.name)} ${owner ? (isMine ? '【装着中・タップで外す】' : `【${esc(CDATA.CHAR_MAP[owner].name)}装着中】`) : '【未装着】'}</div>
              </button>
              <button class="btn-secondary ${eq.locked ? 'lock-btn-locked' : ''}" style="padding:5px 7px;font-size:10px" aria-label="${eq.locked ? '装備ロック解除' : '装備ロック保護'}" data-act="toggleEquipLock" data-val="${eq.id}">${ICON.svg(eq.locked ? 'lock' : 'unlock', 12)}${eq.locked ? '保護' : ''}</button>
            </div>`;
        }).join('');
        content = `${charStrip}${slotRow}<div class="scroll-list" data-scroll-key="equip-wear-${ui.selectedEquipSlot}"><div class="list-stack">${list || '<div class="item-sub">該当する装備がありません</div>'}</div></div>`;
      } else if (ui.equipSub === 'sell') {
        const curAuto = snap.settings.autoSellMaxQuality;
        const autoBtns = [-1, 0, 1, 2, 3].map((q) => {
          const lbl = q < 0 ? 'OFF' : EDATA.QUALITIES[q].name + '以下';
          return `<button class="subtab-btn ${curAuto === q ? 'active' : ''}" data-act="setAutoSell" data-val="${q}">${lbl}</button>`;
        }).join('');
        content = `
          <div class="info-box">
            <div class="item-title">自動売却ライン</div>
            <div class="subtab-row">${autoBtns}</div>
          </div>
          <div class="info-box grow">
            <div class="item-title">一括売却</div>
            <div class="list-grid-2">
              <button class="btn-secondary" data-act="bulkSell" data-val="0">標準のみ売却</button>
              <button class="btn-secondary" data-act="bulkSell" data-val="1">上質以下を売却</button>
              <button class="btn-secondary" data-act="bulkSell" data-val="2">精巧以下を売却</button>
              <button class="btn-danger" data-act="bulkSell" data-val="3">逸品以下を売却</button>
            </div>
            <div class="item-sub num">所持装備：${snap.equips.length}個 / 所持金貨：${fnum(snap.gold)}</div>
          </div>`;
      } else if (ui.equipSub === 'craft') {
        const limSeries = EDATA.EQUIP_SERIES.filter((s) => s.limited);
        const rows = limSeries.map((ser) => {
          const raid = WDATA.RAIDS.find((x) => x.matId === ser.matId);
          const have = snap.mats[ser.matId] || 0;
          const sel = ui.selectedCraftSeries === ser.id;
          return `
            <div class="item-row-btn ${sel ? 'selected' : ''}">
              <button style="text-align:left;width:100%" data-act="selectCraftSeries" data-val="${ser.id}">
                <div class="row-between">
                  <div class="row-left">${ser.el ? elBadge(ser.el) : ''}<span class="item-title">${esc(ser.name)}</span></div>
                  <span class="item-sub num">${esc(raid ? raid.matName : '')} ${have}/${ser.matCost}</span>
                </div>
                <div class="item-sub">2部位：${esc(ser.set2.desc)}</div>
              </button>
              <div class="subtab-row" style="margin-top:3px">
                ${EDATA.SLOTS.map((sl) => `
                  <button class="subtab-btn" data-act="craftEquip" data-series="${ser.id}" data-slot="${sl.id}" ${have < ser.matCost ? 'disabled' : ''}>${esc(sl.name)}製作</button>`).join('')}
              </div>
            </div>`;
        }).join('');
        content = `<div class="scroll-list" data-scroll-key="equip-craft"><div class="list-stack">${rows}</div></div>`;
      } else if (ui.equipSub === 'shop') {
        content = `
          <div class="info-box grow" style="justify-content:space-between;gap:7px">
            <div class="row-between">
              <span class="item-title">共鳴結晶へ還元</span>
              <span class="item-sub num">1回：金貨 400 → 結晶 +160</span>
            </div>
            <div class="action-bar">
              <button class="btn-primary" data-act="buyGold" data-val="crystal" data-times="1" ${snap.gold < 400 ? 'disabled' : ''}>1回交換（400金貨）</button>
              <button class="btn-secondary" data-act="buyGold" data-val="crystal" data-times="5" ${snap.gold < 2000 ? 'disabled' : ''}>5回交換（2,000金貨）</button>
            </div>
            <div class="row-between" style="margin-top:4px">
              <span class="item-title">残響石へ還元</span>
              <span class="item-sub num">1回：金貨 600 → 石 +120</span>
            </div>
            <div class="action-bar">
              <button class="btn-primary" data-act="buyGold" data-val="stone" data-times="1" ${snap.gold < 600 ? 'disabled' : ''}>1回交換（600金貨）</button>
              <button class="btn-secondary" data-act="buyGold" data-val="stone" data-times="5" ${snap.gold < 3000 ? 'disabled' : ''}>5回交換（3,000金貨）</button>
            </div>
          </div>`;
      }

      body = `${subRow}${content}`;
    }

    /* ⑤ 召喚・限定解放・覇王降臨・魂晶交換タブ */
    if (ui.tab === 'summon') {
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.summonSub === 'gacha' ? 'active' : ''}" data-act="setSummonSub" data-val="gacha">残響召喚</button>
          <button class="subtab-btn ${ui.summonSub === 'raidChar' ? 'active' : ''}" data-act="setSummonSub" data-val="raidChar">限定解放</button>
          <button class="subtab-btn ${ui.summonSub === 'raidBoss' ? 'active' : ''}" data-act="setSummonSub" data-val="raidBoss">覇王降臨</button>
          <button class="subtab-btn ${ui.summonSub === 'abShop' ? 'active' : ''}" data-act="setSummonSub" data-val="abShop">魂晶交換</button>
        </div>`;

      let content = '';
      if (ui.summonSub === 'gacha') {
        const isAnimating = ui.summonAnim && (ui.summonAnim.phase === 'charging' || ui.summonAnim.phase === 'reveal');
        const urSummons = CDATA.CHARS.filter((c) => c.source === 'summon' && c.rarity === 'UR');
        const hasRes = ui.lastSummonResults && ui.lastSummonResults.length > 0 && !isAnimating;
        content = `
          <div class="info-box grow" style="justify-content:space-between;gap:6px">
            <div class="row-between">
              <span class="item-title">星海残響召喚（通常召喚UR枠）</span>
              ${hasRes ? `<button class="filter-chip active" data-act="clearSummonResults">召喚陣へ戻る</button>` : `<span class="item-sub num">所持 ${fnum(snap.stone)}石</span>`}
            </div>
            <div class="list-grid-2">
              ${urSummons.map((u) => `
                <div class="skill-preview-row" style="border-left-color:#ff94e6">
                  <div class="skill-preview-head">${rarTag('UR')}<span class="item-title" style="font-size:11px">${esc(u.name)}</span>${elBadge(u.el)}</div>
                  <div class="skill-desc">${esc(WDATA.ROLES[u.role].name)}・${esc(u.innate.name)}</div>
                </div>`).join('')}
            </div>
            <div class="skill-preview-row">
              <div class="skill-name">召喚仕様</div>
              <div class="skill-desc">10連召喚は10枠目SR以上確定。最大覚醒後の再獲得は魂晶と共鳴結晶へ即時変換されます。</div>
            </div>
            ${isAnimating
              ? `<div class="action-bar"><button class="btn-primary" data-act="skipSummonAnim">演出をスキップ</button></div>`
              : `<div class="action-bar">
                  <button class="btn-secondary" data-act="summon" data-val="1" ${snap.stone < 120 ? 'disabled' : ''}>1回召喚（${fnum(120)}石）</button>
                  <button class="btn-primary" data-act="summon" data-val="10" ${snap.stone < 1100 ? 'disabled' : ''}>10連召喚（${fnum(1100)}石）</button>
                </div>`}
          </div>`;
      } else if (ui.summonSub === 'raidChar') {
        const limChars = STATE.sortCharIds(CDATA.CHARS.filter((c) => c.source === 'raid').map((c) => c.id));
        const list = limChars.map((cid) => {
          const c = CDATA.CHAR_MAP[cid];
          const have = snap.shards[cid] || 0;
          const owned = Boolean(snap.roster[cid]);
          const sel = ui.selectedExchangeCharId === cid;
          return `
            <div class="item-row-btn ${sel ? 'selected' : ''}" style="flex-direction:row;align-items:center;justify-content:space-between;gap:6px">
              <button style="flex:1;text-align:left" data-act="previewExchangeChar" data-val="${cid}">
                <div class="row-left">${rarTag(c.rarity)}<span class="item-title">${esc(c.name)}</span>${elBadge(c.el)}${roleBadge(c.role)}</div>
                <div class="item-sub">${owned ? `所持済（覚醒 ${snap.roster[cid].awake}/5）` : '異界討伐で鍵を5個集めて解放'}</div>
              </button>
              <button class="btn-primary" style="padding:6px 10px;font-size:10.5px" data-act="exchangeRaidChar" data-val="${cid}" ${have < 5 ? 'disabled' : ''}>鍵 ${have}/5</button>
            </div>`;
        }).join('');
        content = `<div class="scroll-list" data-scroll-key="summon-raid-char"><div class="list-stack">${list}</div></div>`;
      } else if (ui.summonSub === 'raidBoss') {
        /* 異界討伐ボス6体（イグニス〜オメガ：属性順 炎→水→風→光→闇→無） */
        const bossChars = WDATA.RAIDS.map((r) => ({ raid: r, c: CDATA.CHAR_MAP[r.bossCharId] }));
        const list = bossChars.map(({ raid, c }) => {
          const have = snap.bossMarks[c.id] || 0;
          const owned = Boolean(snap.roster[c.id]);
          const sel = ui.selectedExchangeCharId === c.id;
          return `
            <div class="item-row-btn ${sel ? 'selected' : ''}" style="flex-direction:row;align-items:center;justify-content:space-between;gap:6px">
              <button style="flex:1;text-align:left" data-act="previewExchangeChar" data-val="${c.id}">
                <div class="row-left">${rarTag(c.rarity)}<span class="item-title">${esc(c.name)}</span>${elBadge(c.el)}${roleBadge(c.role)}</div>
                <div class="item-sub">${owned ? `降臨済（覚醒 ${snap.roster[c.id].awake}/5）` : `${esc(raid.bossMarkName)} 5個でUR降臨`}</div>
              </button>
              <button class="btn-primary" style="padding:6px 10px;font-size:10.5px" data-act="exchangeRaidBoss" data-val="${c.id}" ${have < 5 ? 'disabled' : ''}>印 ${have}/5</button>
            </div>`;
        }).join('');
        content = `<div class="scroll-list" data-scroll-key="summon-raid-boss"><div class="list-stack">${list}</div></div>`;
      } else if (ui.summonSub === 'abShop') {
        const shopAbs = EDATA.FREE_ABILITIES.filter((a) => a.costSoul);
        const list = shopAbs.map((ab) => {
          const has = snap.unlockedAbilities.includes(ab.id);
          return `
            <button class="item-row-btn ${has ? 'locked-item' : ''}" data-act="buyAbility" data-val="${ab.id}" ${has || snap.soul < ab.costSoul ? 'disabled' : ''}>
              <div class="row-between">
                <span class="item-title">${esc(ab.name)}</span>
                <span class="item-sub num">${has ? '解放済' : `魂晶 ${fnum(ab.costSoul)}`}</span>
              </div>
              <div class="item-sub">${esc(ab.desc)}</div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list" data-scroll-key="summon-ab-shop"><div class="list-grid-2">${list}</div></div>`;
      }
      body = `${subRow}${content}`;
    }

    /* ⑥ 図鑑＆設定タブ（キャラ / 敵 / 装備 / 設定） */
    if (ui.tab === 'codex') {
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.codexSub === 'char' ? 'active' : ''}" data-act="setCodexSub" data-val="char">キャラ</button>
          <button class="subtab-btn ${ui.codexSub === 'enemy' ? 'active' : ''}" data-act="setCodexSub" data-val="enemy">敵</button>
          <button class="subtab-btn ${ui.codexSub === 'equip' ? 'active' : ''}" data-act="setCodexSub" data-val="equip">装備</button>
          <button class="subtab-btn ${ui.codexSub === 'settings' ? 'active' : ''}" data-act="setCodexSub" data-val="settings">設定</button>
        </div>`;

      let content = '';
      if (ui.codexSub === 'char') {
        const allSorted = filterSortedCharIds(STATE.getAllCharIdsSorted(), ui);
        const rows = allSorted.map((cid) => {
          const c = CDATA.CHAR_MAP[cid];
          const owned = Boolean(snap.roster[cid]);
          return `
            <button class="item-row-btn ${ui.codexCharId === cid ? 'selected' : ''} ${owned ? '' : 'locked-item'}" data-act="selectCodexChar" data-val="${cid}">
              <div class="row-between">
                <div class="row-left">${rarTag(c.rarity)}<span class="item-title">${esc(c.name)}</span></div>
                <div class="row-left">${elBadge(c.el)}${roleBadge(c.role)}</div>
              </div>
            </button>`;
        }).join('');
        content = `${renderFilterBars(ui, 'codex-char')}<div class="scroll-list" data-scroll-key="codex-char-list"><div class="list-stack">${rows || '<div class="item-sub">該当するキャラがいません</div>'}</div></div>`;
      } else if (ui.codexSub === 'enemy') {
        /* 敵図鑑：属性順→種別順（通常敵→乱入→エリアボス→異界討伐ボス）→五十音順 ＋ 種別＆属性横スクロールフィルタ */
        const kindChips = [
          { id: 'all', lbl: '全種別' },
          { id: 'normal', lbl: '通常敵' },
          { id: 'intruder', lbl: '乱入' },
          { id: 'boss', lbl: 'エリアボス' },
          { id: 'raid', lbl: '異界討伐ボス' }
        ];
        const elChips = [
          { id: 'all', lbl: 'すべて' },
          { id: 'fire', lbl: '炎' }, { id: 'water', lbl: '水' }, { id: 'wind', lbl: '風' },
          { id: 'light', lbl: '光' }, { id: 'dark', lbl: '闇' }, { id: 'none', lbl: '無' }
        ];
        const enemies = WDATA.getAllEnemiesSorted().filter((e) => {
          if (ui.codexEnemyKind !== 'all' && e.kind !== ui.codexEnemyKind) return false;
          if (ui.codexEnemyEl !== 'all' && e.el !== ui.codexEnemyEl) return false;
          return true;
        });
        const rows = enemies.map((e) => {
          const badge = (e.kind === 'boss' || e.kind === 'raid')
            ? `<span class="encounter-badge boss">${esc(ENEMY_KIND_LABEL[e.kind])}</span>`
            : (e.kind === 'intruder' ? '<span class="encounter-badge intruder">乱入</span>' : '<span class="qual-tag qual-0">通常</span>');
          return `
            <button class="item-row-btn ${ui.codexEnemyId === e.id ? 'selected' : ''}" data-act="selectCodexEnemy" data-val="${e.id}">
              <div class="row-between">
                <div class="row-left">${elBadge(e.el)}${badge}<span class="item-title">${esc(e.name)}</span></div>
                <span class="item-sub num">HP ${fnum(e.hp)}</span>
              </div>
              <div class="item-sub">${esc(e.spawnText)}</div>
            </button>`;
        }).join('');
        content = `
          <div class="h-scroll-wrap">
            <div class="h-scroll-row" data-scroll-key="codex-enemy-el">
              ${elChips.map((x) => `<button class="filter-chip ${ui.codexEnemyEl === x.id ? 'active' : ''}" data-act="setCodexEnemyEl" data-val="${x.id}">${x.id !== 'all' ? ICON.svg(x.id, 9) : ''}${x.lbl}</button>`).join('')}
            </div>
          </div>
          <div class="h-scroll-wrap">
            <div class="h-scroll-row" data-scroll-key="codex-enemy-kind">
              ${kindChips.map((x) => `<button class="filter-chip ${ui.codexEnemyKind === x.id ? 'active' : ''}" data-act="setCodexEnemyKind" data-val="${x.id}">${x.lbl}</button>`).join('')}
            </div>
          </div>
          <div class="scroll-list" data-scroll-key="codex-enemy-list"><div class="list-stack">${rows || '<div class="item-sub">該当する敵がいません</div>'}</div></div>`;
      } else if (ui.codexSub === 'equip') {
        /* 装備図鑑：部位名で一覧表示・武器→防具→装飾→紋章順 ＋ 横スクロール部位フィルタ */
        const slotChips = [
          { id: 'all', lbl: '全部位' },
          ...EDATA.SLOTS.map((sl) => ({ id: sl.id, lbl: sl.name }))
        ];
        const parts = EDATA.EQUIP_PARTS.filter((p) => ui.codexEquipSlot === 'all' || p.slotId === ui.codexEquipSlot);
        const rows = parts.map((p) => {
          const vals = STATE.getEquipPartPreviewValues(p.seriesId, p.slotId);
          return `
            <button class="item-row-btn ${ui.codexEquipPartKey === p.partKey ? 'selected' : ''}" data-act="selectCodexEquip" data-val="${esc(p.partKey)}">
              <div class="row-between">
                <div class="row-left">
                  <span class="qual-tag ${p.limited ? 'qual-4' : 'qual-2'}">${ICON.svg(p.slotId, 10)} ${esc(p.slotName)}</span>
                  <span class="item-title">${esc(p.partName)}</span>
                </div>
                <span class="item-sub num" style="color:var(--gold-bright)">${esc(p.statLabel)} +${fnum(vals[0].val)}〜${fnum(vals[4].val)}</span>
              </div>
              <div class="item-sub">${esc(p.seriesName)} / ${esc(p.sourceText)}</div>
            </button>`;
        }).join('');
        content = `
          <div class="h-scroll-wrap">
            <div class="h-scroll-row" data-scroll-key="codex-equip-slot">
              ${slotChips.map((x) => `<button class="filter-chip ${ui.codexEquipSlot === x.id ? 'active' : ''}" data-act="setCodexEquipSlot" data-val="${x.id}">${x.id !== 'all' ? ICON.svg(x.id, 9) : ''}${x.lbl}</button>`).join('')}
            </div>
          </div>
          <div class="scroll-list" data-scroll-key="codex-equip-list"><div class="list-stack">${rows}</div></div>`;
      } else {
        content = `
          <div class="scroll-list" data-scroll-key="codex-settings">
            <div class="list-stack">
              <div class="item-row-btn">
                <div class="row-between">
                  <span class="item-title">効果音（SE）</span>
                  <button class="btn-secondary ${snap.settings.sound ? 'active' : ''}" data-act="toggleSound">${snap.settings.sound ? 'ON' : 'OFF'}</button>
                </div>
              </div>
              <div class="item-row-btn">
                <div class="item-title">引き継ぎコード</div>
                <div class="action-bar" style="margin-top:4px">
                  <button class="btn-secondary" data-act="exportCode">コード発行＆コピー</button>
                  <button class="btn-secondary" data-act="importCode">入力コードから復元</button>
                </div>
                <input id="transfer-input" type="text" value="${esc(ui.exportedCode)}" placeholder="引き継ぎコードを貼り付け" style="margin-top:5px;width:100%">
              </div>
              <div class="item-row-btn">
                <div class="row-between">
                  <span class="item-title">セーブデータ初期化</span>
                  <button class="btn-danger" data-act="resetSave">${ui.confirmReset ? '本当に初期化実行' : '初期化する'}</button>
                </div>
              </div>
            </div>
          </div>`;
      }

      body = `${subRow}${content}`;
    }

    return `
      <div class="lower-body">${body}</div>
      ${renderBottomNav(ui.tab)}`;
  }

  /* スクロール位置の保存と復元（タップで先頭に戻る現象を完全防止） */
  function saveScrollPositions(rootEl) {
    rootEl.querySelectorAll('[data-scroll-key]').forEach((el) => {
      const k = el.dataset.scrollKey;
      if (!k) return;
      scrollMemory[k] = { top: el.scrollTop, left: el.scrollLeft };
    });
  }

  function restoreScrollPositions(rootEl) {
    rootEl.querySelectorAll('[data-scroll-key]').forEach((el) => {
      const k = el.dataset.scrollKey;
      const saved = k ? scrollMemory[k] : null;
      if (!saved) return;
      if (saved.top > 0) el.scrollTop = saved.top;
      if (saved.left > 0) el.scrollLeft = saved.left;
    });
  }

  function renderFull(ui) {
    const shell = document.getElementById('app-shell');
    const upperEl = document.getElementById('upper-display');
    const lowerEl = document.getElementById('lower-control');
    const snap = STATE.getSnapshot();

    let activeWorld = ui.selectedWorldId || 'w1';
    if (BATTLE.isActive()) {
      const cfg = BATTLE.getSession().cfg;
      if (cfg.mode === 'main') activeWorld = cfg.worldId;
      else if (cfg.mode === 'raid') activeWorld = WDATA.RAIDS.find((r) => r.id === cfg.raidId).world;
      else if (cfg.mode === 'gauntlet') activeWorld = WDATA.GAUNTLETS.find((g) => g.id === cfg.gauntletId).world;
      else if (cfg.mode === 'tower') activeWorld = WDATA.getTowerFloor(cfg.floor).world;
      else if (cfg.mode === 'trial') activeWorld = WDATA.TRIALS.find((t) => t.id === cfg.trialId).world;
    } else if (ui.tab === 'quest') {
      if (ui.questSub === 'raid') activeWorld = (WDATA.RAIDS.find((r) => r.id === ui.selectedRaidId) || WDATA.RAIDS[0]).world;
      if (ui.questSub === 'gauntlet') activeWorld = (WDATA.GAUNTLETS.find((g) => g.id === ui.selectedGauntletId) || WDATA.GAUNTLETS[0]).world;
      if (ui.questSub === 'tower') activeWorld = WDATA.getTowerFloor(ui.selectedTowerFloor).world;
      if (ui.questSub === 'trial') activeWorld = (WDATA.TRIALS.find((t) => t.id === ui.selectedTrialId) || WDATA.TRIALS[0]).world;
    }
    if (shell.dataset.world !== activeWorld) shell.dataset.world = activeWorld;

    if (BATTLE.isActive()) {
      renderBattle(BATTLE.getSession(), upperEl, lowerEl);
      return;
    }

    saveScrollPositions(lowerEl);
    resetBattleDomCache();
    upperEl.innerHTML = renderNonBattleUpper(snap, ui);
    lowerEl.innerHTML = renderNonBattleLower(snap, ui);
    restoreScrollPositions(lowerEl);
  }

  Object.defineProperty(window, '__IZ_UI__', {
    value: Object.freeze({
      renderFull,
      renderBattle,
      resetBattleDomCache
    }),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
