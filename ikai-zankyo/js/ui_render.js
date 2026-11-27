/* 上半分（完全非操作・閲覧専用）＆下半分（全操作・親指ゾーン）UI描画＆戦闘差分更新エンジン（改修版） */
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
    return `<span class="scope-badge scope-passive">パッシブ</span>`;
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

  /* タイムライン用・頭文字欠損なし＆「…」省略なしの固有呼称抽出 */
  function timelineCallName(u) {
    if (u.side === 'enemy') {
      if (u.kind === 'boss') return 'BOSS';
      if (u.kind === 'intruder') return '乱入';
      const idx = u.name.lastIndexOf('の');
      return idx >= 0 ? u.name.slice(idx + 1) : u.name;
    }
    const kanaTail = u.name.match(/[ァ-ヴー]+$/);
    if (kanaTail) return kanaTail[0];
    const idx = u.name.lastIndexOf('の');
    return idx >= 0 ? u.name.slice(idx + 1) : u.name;
  }

  /* 属性・ロール絞り込み（必須ソート順を維持！） */
  function filterSortedCharIds(ids, ui) {
    return ids.filter((id) => {
      const c = CDATA.CHAR_MAP[id];
      if (!c) return false;
      if (ui.filterEl !== 'all' && c.el !== ui.filterEl) return false;
      if (ui.filterRole !== 'all' && c.role !== ui.filterRole) return false;
      return true;
    });
  }

  function renderFilterBars(ui) {
    const els = [
      { id: 'all', lbl: '全属' },
      { id: 'fire', lbl: '炎' }, { id: 'water', lbl: '水' }, { id: 'wind', lbl: '風' },
      { id: 'light', lbl: '光' }, { id: 'dark', lbl: '闇' }, { id: 'none', lbl: '無' }
    ];
    const roles = [
      { id: 'all', lbl: '全役割' },
      { id: 'tank', lbl: 'タンク' }, { id: 'dealer', lbl: 'ディーラー' },
      { id: 'support', lbl: 'サポーター' }, { id: 'healer', lbl: 'ヒーラー' }
    ];
    return `
      <div class="filter-bar">
        ${els.map((e) => `<button class="filter-chip ${ui.filterEl === e.id ? 'active' : ''}" data-act="setFilterEl" data-val="${e.id}">${e.lbl}</button>`).join('')}
      </div>
      <div class="filter-bar">
        ${roles.map((r) => `<button class="filter-chip ${ui.filterRole === r.id ? 'active' : ''}" data-act="setFilterRole" data-val="${r.id}">${r.lbl}</button>`).join('')}
      </div>`;
  }

  /* =========================================================
   * 戦闘画面（2段カード＋デュアルレーン行動順＋60fps差分更新）
   * ========================================================= */
  let battleDomKey = '';

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
    return chips.slice(0, 4).join('');
  }

  /* 2段レイアウトでフルネーム見切れ0pxを実現 */
  function buildBattleUnitCardHtml(u) {
    const isBossSolo = u.side === 'enemy' && u.isSolo && u.kind === 'boss';
    const isIntSolo = u.side === 'enemy' && u.isSolo && u.kind === 'intruder';
    const cls = [
      'unit-card',
      u.side,
      `el-${u.el}`,
      isBossSolo ? 'boss-solo' : '',
      isIntSolo ? 'intruder-solo' : ''
    ].filter(Boolean).join(' ');

    const badgeExtra = isBossSolo
      ? `<span class="encounter-badge boss">${ICON.svg('crown', 10)} BOSS</span>`
      : (isIntSolo ? `<span class="encounter-badge intruder">${ICON.svg('warn', 10)} 乱入</span>` : '');

    return `
      <div class="${cls}" data-uid="${esc(u.uid)}">
        <div class="unit-top-row">
          <div class="unit-name-wrap">
            <span class="unit-name">${esc(u.name)}</span>
            ${badgeExtra}
          </div>
          <div class="unit-sub-row">
            <div class="unit-meta-badges">
              ${elBadge(u.el)}
              ${u.side === 'ally' ? roleBadge(u.role) : ''}
            </div>
            <span class="hp-text num" data-role="hptext">${fnum(u.hp)}/${fnum(u.maxHp)}</span>
          </div>
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
        <div class="unit-bottom-row">
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
      `<span class="timeline-pip ally" data-pip="${esc(u.uid)}" style="left:8%">${ICON.svg(u.el, 9)}${esc(timelineCallName(u))}</span>`
    ).join('');

    const enemyPips = sess.enemies.map((u) => {
      const pCls = u.kind === 'boss' ? 'boss' : (u.kind === 'intruder' ? 'intruder' : 'enemy');
      return `<span class="timeline-pip ${pCls}" data-pip="${esc(u.uid)}" style="left:8%">${ICON.svg(u.el, 9)}${esc(timelineCallName(u))}</span>`;
    }).join('');

    upperEl.innerHTML = `
      <div class="upper-bg-ornament"></div>
      <div class="battle-stage">
        <div class="battle-hud">
          <div class="battle-stage-title">
            <span>${esc(buildBattleStageTitle(sess))}</span>
          </div>
          <div class="battle-hud-right">
            <span class="wave-pill num" data-b="wave">WAVE ${sess.wave}/${sess.maxWave}</span>
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
        <div class="unit-zone ${enemyGridCls}">
          ${sess.enemies.map(buildBattleUnitCardHtml).join('')}
        </div>
        <div class="action-banner" data-b="banner">
          <span>フルオート戦闘進行中</span>
        </div>
        <div class="unit-zone ${allyGridCls}">
          ${sess.allies.map(buildBattleUnitCardHtml).join('')}
        </div>
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
              <span class="lg-dmg">与</span>
              <span class="lg-tkn">被</span>
              <span class="lg-heal">癒</span>
              <span class="lg-rcvd">受</span>
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

  /* レーン内ピップ2パス完全非重複配置（開幕左端集中でも絶対に重ならない） */
  function updateLanePips(units, upperEl, leadUid) {
    const alive = units.filter((u) => !u.dead).sort((a, b) => b.atb - a.atb);
    const n = alive.length;
    if (n > 0) {
      const minGap = n >= 4 ? 22 : 24;
      const minX = 11;
      const maxX = 91;
      const pos = alive.map((u) => minX + (Math.min(100, Math.max(0, u.atb)) / 100) * (maxX - minX));
      /* パス1：右（先頭）から左へ最低間隔を確保 */
      for (let i = 1; i < n; i++) {
        if (pos[i] > pos[i - 1] - minGap) pos[i] = pos[i - 1] - minGap;
      }
      /* パス2：左端を下回ったら左から右へ押し戻して全員を可視範囲に収める */
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
      mountBattleDom(sess, upperEl, lowerEl);
    }

    const snap = STATE.getSnapshot();
    const waveEl = upperEl.querySelector('[data-b="wave"]');
    if (waveEl) waveEl.textContent = `WAVE ${sess.wave}/${sess.maxWave}`;

    const autoPill = upperEl.querySelector('[data-b="auto"]');
    if (autoPill) {
      if (sess.autoLoop) {
        autoPill.style.display = 'inline-block';
        autoPill.className = 'auto-pill num' + (sess.stopRequested ? ' stopping' : '');
        autoPill.textContent = sess.stopRequested
          ? `この周で終了 (${sess.aggregate.runs + 1}周目)`
          : `自動周回 ${sess.aggregate.runs + 1}周目`;
      } else {
        autoPill.style.display = 'none';
      }
    }

    const bannerEl = upperEl.querySelector('[data-b="banner"]');
    if (bannerEl && sess.actionBanner) {
      const ab = sess.actionBanner;
      bannerEl.className = 'action-banner' + (ab.side === 'enemy' ? ' enemy-act' : '');
      bannerEl.innerHTML = `<span>${esc(ab.actorName)}</span><span>「${esc(ab.skillName)}」</span>${scopeBadge(ab.scope)}`;
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

    /* 次の行動者計算＆デュアルレーン更新 */
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
            if (sk.scope === 'passive') return `<span class="ct-dot ready">常</span>`;
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
          const stamp = u.fxPop.text + '_' + Math.round(u.fxPop.ttl * 10);
          if (pop.dataset.stamp !== stamp && u.fxPop.ttl > 0.56) {
            pop.dataset.stamp = stamp;
            pop.innerHTML = `<span class="float-pop ${u.fxPop.cls}">${esc(u.fxPop.text)}</span>`;
          }
        } else if (pop.innerHTML !== '') {
          pop.innerHTML = '';
          pop.dataset.stamp = '';
        }
      }
    });

    /* 一括DPSメーター4項目（与ダメ・被ダメ・回復量・被回復量）を全味方で同時更新 */
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
      if (!sess.autoLoop) {
        autoBtn.className = 'btn-secondary battle-ctrl-btn';
        autoBtn.textContent = '自動周回をONにする';
      } else if (!sess.stopRequested) {
        autoBtn.className = 'btn-danger battle-ctrl-btn';
        autoBtn.textContent = `周回停止予約（現在${sess.aggregate.runs + 1}周目）`;
      } else {
        autoBtn.className = 'btn-primary battle-ctrl-btn';
        autoBtn.textContent = '停止予約中（この周終了で結果へ）';
      }
    }
  }

  function resetBattleDomCache() {
    battleDomKey = '';
  }

  /* =========================================================
   * リザルト画面（空白ゼロ！獲得装備詳細＋MVP＆総計表示）
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
    const abItems = agg.unlockedAbilities.map((aid) => {
      const a = EDATA.ABILITY_MAP[aid];
      return `<span class="synergy-pill">解放：${esc(a ? a.name : aid)}</span>`;
    });

    /* 獲得装備の詳細カード（高品質優先で最大6件表示） */
    const topEquips = agg.equips.slice().sort((a, b) => b.quality - a.quality).slice(0, 6);
    const equipCardsHtml = topEquips.length > 0
      ? `<div class="loot-grid">
          ${topEquips.map((eq) => {
            const ser = EDATA.SERIES_MAP[eq.seriesId];
            const val = STATE.getEquipStatValue(eq);
            return `<div class="loot-chip">${qualTag(eq.quality)}<span>${esc(ser ? ser.partNames[eq.slotId] : '')}</span><span class="num" style="color:var(--gold-bright)">+${fnum(val)}</span></div>`;
          }).join('')}
        </div>${agg.equips.length > 6 ? `<div class="item-sub">ほか獲得装備 +${agg.equips.length - 6}個（装備一覧に格納済み）</div>` : ''}`
      : (isWin
        ? `<div class="item-sub">装備ドロップは自動売却済み、または限定報酬モードです</div>`
        : `<div class="skill-preview-row"><div class="skill-name">次戦への戦力強化ヒント</div><div class="skill-desc">共鳴盤ノード解放・最適装着・共鳴リンク設定・有利属性への編成変更で大きく戦力が伸びます。</div></div>`);

    return `
      <div class="upper-bg-ornament"></div>
      <div class="upper-panel">
        <div class="result-banner ${isWin ? 'win' : 'lose'}">${esc(title)}</div>
        <div class="info-box">
          <div class="stat-grid-4">
            <div class="stat-cell"><div class="stat-lbl">勝敗</div><div class="stat-val">${agg.wins}勝 ${agg.losses}敗</div></div>
            <div class="stat-cell"><div class="stat-lbl">乱入撃破</div><div class="stat-val">${agg.intruders}体</div></div>
            <div class="stat-cell"><div class="stat-lbl">獲得石</div><div class="stat-val">+${fnum(agg.stone)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">獲得結晶</div><div class="stat-val">+${fnum(agg.crystal)}</div></div>
          </div>
          <div class="stat-grid-4">
            <div class="stat-cell"><div class="stat-lbl">獲得金貨</div><div class="stat-val">+${fnum(agg.gold)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">獲得魂晶</div><div class="stat-val">+${fnum(agg.soul)}</div></div>
            <div class="stat-cell"><div class="stat-lbl">獲得装備</div><div class="stat-val">${agg.equips.length}個</div></div>
            <div class="stat-cell"><div class="stat-lbl">自動売却</div><div class="stat-val">${agg.autoSoldCount}個/+${fnum(agg.autoSoldGold)}</div></div>
          </div>
        </div>
        <div class="info-box grow">
          <div class="row-between">
            <span class="dps-title">獲得品＆戦果サマリー</span>
            <span class="item-sub num">総与ダメ ${fnum(totalDmg)} / 総回復 ${fnum(totalHeal)}</span>
          </div>
          ${mvp ? `<div class="row-between"><span class="synergy-pill">最優秀：${esc(mvp.name)}</span><span class="item-sub num">与${fnum(mvp.dmgDealt)} / 癒${fnum(mvp.healDone)}</span></div>` : ''}
          ${(matItems.length || shardItems.length || abItems.length) ? `<div class="synergy-list">${matItems.join('')}${shardItems.join('')}${abItems.join('')}</div>` : ''}
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
          <span class="dps-title">累計戦績メーター（トータル）</span>
          <span class="item-sub">全${agg.runs}周合計</span>
        </div>
        <div class="scroll-list">
          <div class="list-stack">${rows}</div>
        </div>
        <div class="action-bar">
          <button class="btn-secondary" data-act="closeResult">出撃画面へ戻る</button>
          <button class="btn-primary" data-act="retryBattle">もう一度出撃</button>
        </div>
      </div>`;
  }

  /* =========================================================
   * 非戦闘画面 上半分（高密度・空白ゼロ・紹介文は図鑑のみ！）
   * ========================================================= */
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
                <div class="row-left">${powerJudgeBadge(partyPower, recPower)}<span class="wave-pill">全5WAVE</span></div>
              </div>
              <div class="row-left">
                ${boss
                  ? `<span class="encounter-badge boss">${ICON.svg('crown', 10)} 単独BOSS：${esc(boss.name)}</span>${elBadge(boss.el)}`
                  : `<span class="item-sub">通常5WAVE戦（ステージ3・6に単独BOSS出現）</span>`}
              </div>
              <div class="row-left">
                <span class="encounter-badge intruder">${ICON.svg('warn', 10)} 乱入枠：${esc(intruder.name)}</span>
                <span class="item-sub">ボスWAVE以外で単独出現</span>
              </div>
            </div>
            <div class="info-box grow">
              <div class="stat-grid-4">
                <div class="stat-cell"><div class="stat-lbl">自軍戦力</div><div class="stat-val">${fnum(partyPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">目安戦力</div><div class="stat-val">${fnum(recPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">自動売却</div><div class="stat-val">${snap.settings.autoSellMaxQuality < 0 ? 'OFF' : EDATA.QUALITIES[snap.settings.autoSellMaxQuality].name + '以下'}</div></div>
                <div class="stat-cell"><div class="stat-lbl">制覇進度</div><div class="stat-val">${world.stages.filter((s) => snap.clearedStages[`${world.id}_${s.num}`]).length}/6</div></div>
              </div>
              <div>
                <div class="item-sub" style="margin-bottom:3px">出現通常敵（各敵2技所持）</div>
                <div class="enemy-mini-row">
                  ${normals.map((e) => `<span class="enemy-mini-chip">${elBadge(e.el)}${esc(e.name)}</span>`).join('')}
                </div>
              </div>
              <div class="row-between">
                <span class="item-sub">獲得装備：${esc(drops)}</span>
              </div>
              <div class="item-sub">異界風景：${esc(world.theme)}</div>
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
                  <span class="encounter-badge boss">${ICON.svg('crown', 10)} 単独BOSS</span>
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
                <span class="synergy-pill">限定素材：${esc(raid.matName)}（所持${snap.mats[raid.matId] || 0}）</span>
                <span class="synergy-pill">限定鍵：${esc(limitChar.name)}（${snap.shards[raid.charId] || 0}/5）</span>
              </div>
              <div class="item-sub">※通常装備ドロップ無し。限定装備素材・限定キャラの鍵・残響石を獲得できます。</div>
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
              <div class="item-sub">3パーティ（重複不可・最大12人）で3体の単独ボスを連戦突破。控えキャラ育成がそのまま活きます。</div>
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
                      <div class="row-left">${elBadge(b.el)}<span class="item-sub num">戦力${fnum(tPow)}</span></div>
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
                <div class="row-left">${powerJudgeBadge(partyPower, recPower)}<span class="wave-pill">${snap.towerMaxCleared}/${WDATA.TOWER_MAX_FLOOR}層</span></div>
              </div>
              <div class="stat-grid-4">
                <div class="stat-cell"><div class="stat-lbl">自軍戦力</div><div class="stat-val">${fnum(partyPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">目安戦力</div><div class="stat-val">${fnum(recPower)}</div></div>
                <div class="stat-cell"><div class="stat-lbl">初回石</div><div class="stat-val">+${tf.firstStone}</div></div>
                <div class="stat-cell"><div class="stat-lbl">構成</div><div class="stat-val">${boss ? 'ボス層' : '3WAVE'}</div></div>
              </div>
            </div>
            <div class="info-box grow">
              ${boss ? `<div class="row-left"><span class="encounter-badge boss">${ICON.svg('crown', 10)} 階層単独BOSS：${esc(boss.name)}</span>${elBadge(boss.el)}</div>` : `<div class="item-sub">5層ごとに強力な単独ボスと特別アビリティ報酬が登場します。</div>`}
              <div class="skill-preview-row">
                <div class="skill-name">節目踏破ボーナス</div>
                <div class="skill-desc">第5層：自由アビリティ「深淵踏破の証」 / 第15層：自由アビリティ「深淵覇者の印」</div>
              </div>
              <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${((snap.towerMaxCleared / WDATA.TOWER_MAX_FLOOR) * 100).toFixed(1)}%"></div></div>
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
                  <span class="${check.ok ? 'power-badge safe' : 'power-badge danger'}">${check.ok ? '条件達成' : '条件未達'}</span>
                  ${powerJudgeBadge(partyPower, recPower)}
                </div>
              </div>
              <div class="item-sub">出撃条件：${esc(tr.ruleText)}</div>
              <div class="row-left">
                <span class="encounter-badge boss">${ICON.svg('crown', 10)} BOSS：${esc(boss.name)}</span>
                ${elBadge(boss.el)}
                <span class="item-sub num">目安 ${fnum(recPower)}</span>
              </div>
            </div>
            <div class="info-box grow">
              <div class="item-title">初回突破報酬（全${WDATA.TRIALS.length}試練中 ${Object.keys(snap.clearedTrials).length}制覇）</div>
              <div class="synergy-list">
                <span class="synergy-pill">残響石 +${tr.rewardStone}</span>
                <span class="synergy-pill">自由アビリティ「${esc(ab.name)}」</span>
              </div>
              <div class="skill-preview-row">
                <div class="skill-name">${esc(ab.name)}</div>
                <div class="skill-desc">${esc(ab.desc)}</div>
              </div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }
    }

    /* ② 編成タブ上半分（4枠＋総合ステ＋3軸シナジーで空白ゼロ） */
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
          return `<div class="party-slot-card ${isSel ? 'selected' : ''}"><span class="item-sub">枠${idx + 1}：空き</span></div>`;
        }
        const comp = STATE.getCharComputed(cid, targetParty);
        return `
          <div class="party-slot-card ${isSel ? 'selected' : ''}">
            <div class="row-between">
              <span class="item-title" style="font-size:11px">${esc(comp.def.name)}</span>
              ${rarTag(comp.def.rarity)}
            </div>
            <div class="row-left">
              ${elBadge(comp.def.el)}
              ${roleBadge(comp.def.role)}
              <span class="item-sub num">覚醒${comp.awake}</span>
            </div>
            <div class="row-between">
              <span class="item-sub num">戦力 ${fnum(comp.power)}</span>
              <span class="item-sub">${comp.linkInfo ? '連携:' + esc(comp.linkInfo.name) : '連携なし'}</span>
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
            <div class="item-sub" style="font-weight:800;color:var(--gold-bright)">発動中の3軸編成シナジー（属性・ロール・出身異界）</div>
            <div class="synergy-list">
              ${syn.active.length > 0
                ? syn.active.map((s) => `<span class="synergy-pill">${esc(s.name)}：${esc(s.desc)}</span>`).join('')
                : '<span class="item-sub">同属性・全ロール・同異界などの組み合わせでシナジー発動</span>'}
            </div>
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    /* ③ 育成タブ上半分（※紹介文は図鑑のみ！） */
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
            <span class="curr-pill num">魂晶 ${fnum(snap.soul)}</span>
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
              <span class="item-sub">覚醒${r.awake}/5・共鳴盤${r.board.length}/6・自由枠(${r.abilities.length}/${maxAbSlots})：${esc(eqAbNames)}</span>
            </div>
            <div class="row-between">
              <span class="item-sub">固有：${esc(comp.def.innate.name)}（${esc(comp.def.innate.desc)}）</span>
            </div>
            <div class="skill-preview-list">
              ${comp.def.skills.map((sk) => `
                <div class="skill-preview-row">
                  <div class="skill-preview-head">
                    <span class="skill-name">${sk.scope === 'passive' ? 'パッシブ' : '技' + sk.slot}：${esc(sk.name)}</span>
                    ${scopeBadge(sk.scope)}
                  </div>
                  <div class="skill-desc">${esc(sk.desc)}</div>
                </div>`).join('')}
            </div>
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    /* ④ 装備タブ上半分（4枠＋合計加算ステ＋セット効果で空白ゼロ・紹介文なし） */
    if (ui.tab === 'equip') {
      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const comp = STATE.getCharComputed(cid, snap.party);
      const r = snap.roster[cid];
      let sumAtk = 0, sumDef = 0, sumHp = 0, sumSpd = 0;

      const slotCards = EDATA.SLOTS.map((sl) => {
        const eq = STATE.getEquipById(r.equips[sl.id]);
        if (!eq) {
          return `<div class="party-slot-card"><span class="item-sub">${ICON.svg(sl.id, 11)} ${esc(sl.name)}：未装着</span></div>`;
        }
        const ser = EDATA.SERIES_MAP[eq.seriesId];
        const val = STATE.getEquipStatValue(eq);
        if (sl.baseStat === 'atk') sumAtk += val;
        if (sl.baseStat === 'def') sumDef += val;
        if (sl.baseStat === 'hp') sumHp += val;
        if (sl.baseStat === 'spd') sumSpd += val;
        const statLabel = { atk: '攻撃', def: '防御', hp: 'HP', spd: '速度' }[sl.baseStat];
        return `
          <div class="party-slot-card">
            <div class="row-between">
              <span class="item-title" style="font-size:11px">${ICON.svg(sl.id, 11)} ${esc(ser.partNames[sl.id])}</span>
              ${qualTag(eq.quality)}
            </div>
            <div class="row-between">
              <span class="item-sub">${esc(ser.name)}</span>
              <span class="item-sub num">${statLabel}+${fnum(val)}</span>
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
              <span class="item-sub" style="font-weight:800;color:var(--gold-bright)">発動中セット効果（品質に応じて強化）</span>
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

    /* ⑤ 召喚タブ上半分 */
    if (ui.tab === 'summon') {
      const resultsHtml = ui.lastSummonResults && ui.lastSummonResults.length > 0
        ? `<div class="summon-grid">
            ${ui.lastSummonResults.map((res) => {
              const tag = res.status === 'new' ? 'NEW' : (res.status === 'awake' ? `覚醒${res.awake}` : `魂晶+${res.gainSoul}`);
              return `
                <div class="summon-card rar-${res.rarity}">
                  <div class="row-left">${rarTag(res.rarity)}<span class="item-title" style="font-size:11px">${esc(res.name)}</span></div>
                  <span class="item-sub" style="color:var(--gold-bright);font-weight:800">${esc(tag)}</span>
                </div>`;
            }).join('')}
          </div>`
        : `<div class="info-box grow" style="justify-content:space-around;text-align:center">
            <div class="upper-title">残響召喚</div>
            <div class="stat-grid-4">
              <div class="stat-cell"><div class="stat-lbl">SSR</div><div class="stat-val" style="color:#f4c95d">11%</div></div>
              <div class="stat-cell"><div class="stat-lbl">SR</div><div class="stat-val" style="color:#c982ff">26%</div></div>
              <div class="stat-cell"><div class="stat-lbl">R</div><div class="stat-val" style="color:#5bc2ff">35%</div></div>
              <div class="stat-cell"><div class="stat-lbl">N</div><div class="stat-val">28%</div></div>
            </div>
            <div class="item-sub">10連召喚は10枠目SR以上確定・課金要素なし</div>
            <div class="item-sub">覚醒上限超過時は自動で魂晶＆共鳴結晶へ変換（総召喚数 ${fnum(snap.stats.totalSummons)}回）</div>
          </div>`;

      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group"><span class="upper-title">召喚・交換</span></div>
            <div class="currency-bar">
              <span class="curr-pill num">${ICON.svg('stone', 11)} ${fnum(snap.stone)}</span>
              <span class="curr-pill num">魂晶 ${fnum(snap.soul)}</span>
            </div>
          </div>
          ${resultsHtml}
          ${toastHtml(ui)}
        </div>`;
    }

    /* ⑥ 図鑑＆設定タブ上半分（収集率バー＆キャラ/敵/装備の紹介文はここ専用！） */
    if (ui.tab === 'codex') {
      const charPct = Math.round((Object.keys(snap.roster).length / CDATA.CHARS.length) * 100);
      const enemyTotal = Object.keys(WDATA.ENEMIES).length;
      const enemySeen = Object.keys(snap.codexEnemies).length;
      const equipSeen = Object.keys(snap.codexEquips).length;

      if (ui.codexSub === 'char') {
        const c = CDATA.CHAR_MAP[ui.codexCharId] || CDATA.CHARS[0];
        const owned = Boolean(snap.roster[c.id]);
        const worldName = (WDATA.WORLDS.find((w) => w.id === c.world) || {}).name || '';
        const srcText = c.source === 'raid' ? '異界討伐限定' : '残響召喚';
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
              <span class="item-sub num">図鑑 ${charPct}%</span>
            </div>
            <div class="row-between">
              <span class="item-sub">${owned ? '所持済み' : '未所持'} / 出身：${esc(worldName)}</span>
              <span class="item-sub">入手：${srcText}</span>
            </div>
            <div class="lore-box">${esc(c.lore)}</div>
            <div class="skill-preview-list">
              ${c.skills.map((sk) => `
                <div class="skill-preview-row">
                  <div class="skill-preview-head">
                    <span class="skill-name">${sk.scope === 'passive' ? 'パッシブ' : '技' + sk.slot}：${esc(sk.name)}</span>
                    ${scopeBadge(sk.scope)}
                  </div>
                  <div class="skill-desc">${esc(sk.desc)}</div>
                </div>`).join('')}
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      if (ui.codexSub === 'enemy') {
        const e = WDATA.ENEMIES[ui.codexEnemyId] || Object.values(WDATA.ENEMIES)[0];
        const kills = snap.codexEnemies[e.id] || 0;
        const kindTag = e.kind === 'boss'
          ? `<span class="encounter-badge boss">BOSS</span>`
          : (e.kind === 'intruder' ? `<span class="encounter-badge intruder">乱入</span>` : `<span class="item-sub">通常敵</span>`);
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
            <div class="row-between">
              <span class="item-sub num">累計撃破数：${fnum(kills)}体</span>
              <span class="item-sub num">基礎HP ${fnum(e.hp)} / 速度 ${e.spd}</span>
            </div>
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
        const ser = EDATA.SERIES_MAP[ui.codexEquipId] || EDATA.EQUIP_SERIES[0];
        return `
          <div class="upper-bg-ornament"></div>
          <div class="upper-panel">
            <div class="upper-header">
              <div class="upper-title-group">
                <span class="upper-title">${esc(ser.name)}</span>
                <span class="qual-tag ${ser.limited ? 'qual-4' : 'qual-2'}">${ser.limited ? '限定製作' : '異界探索'}</span>
              </div>
              <span class="item-sub num">発見 ${equipSeen}/${EDATA.EQUIP_SERIES.length}</span>
            </div>
            <div class="lore-box">${esc(ser.lore)}</div>
            <div class="info-box grow">
              <div class="skill-preview-row">
                <div class="skill-name">2部位セット効果</div>
                <div class="skill-desc">${esc(ser.set2.desc)}</div>
              </div>
              <div class="skill-preview-row">
                <div class="skill-name">4部位セット効果</div>
                <div class="skill-desc">${esc(ser.set4.desc)}</div>
              </div>
              <div class="item-sub">部位名：${esc(ser.partNames.weapon)}・${esc(ser.partNames.armor)}・${esc(ser.partNames.accessory)}・${esc(ser.partNames.emblem)}</div>
            </div>
            ${toastHtml(ui)}
          </div>`;
      }

      /* 設定プレビュー */
      return `
        <div class="upper-bg-ornament"></div>
        <div class="upper-panel">
          <div class="upper-header">
            <div class="upper-title-group"><span class="upper-title">記録と設定</span></div>
            ${currencyBarHtml(snap)}
          </div>
          <div class="info-box grow">
            <div class="stat-grid-4">
              <div class="stat-cell"><div class="stat-lbl">キャラ</div><div class="stat-val">${Object.keys(snap.roster).length}/${CDATA.CHARS.length}</div></div>
              <div class="stat-cell"><div class="stat-lbl">総出撃数</div><div class="stat-val">${fnum(snap.stats.totalRuns)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">乱入撃破</div><div class="stat-val">${fnum(snap.stats.totalIntruders)}</div></div>
              <div class="stat-cell"><div class="stat-lbl">深淵の塔</div><div class="stat-val">${snap.towerMaxCleared}/${WDATA.TOWER_MAX_FLOOR}</div></div>
            </div>
            <div class="skill-preview-row">
              <div class="skill-name">オフライン＆データ保護</div>
              <div class="skill-desc">セーブデータは暗号化・改ざん検知署名・二重バックアップで保護され、機内モードでも完全にプレイできます。</div>
            </div>
            ${ui.exportedCode ? `<div class="lore-box" style="word-break:break-all;font-size:9.5px;max-height:68px;overflow:hidden">発行済みコード（下段入力欄にセット済み）</div>` : ''}
          </div>
          ${toastHtml(ui)}
        </div>`;
    }

    return '';
  }

  /* =========================================================
   * 非戦闘画面 下半分（全操作・リスト・下部ナビ）
   * ========================================================= */
  function renderBottomNav(activeTab) {
    const tabs = [
      { id: 'quest',  label: '出撃',     icon: 'battle' },
      { id: 'party',  label: '編成',     icon: 'party' },
      { id: 'grow',   label: '育成',     icon: 'grow' },
      { id: 'equip',  label: '装備',     icon: 'equip' },
      { id: 'summon', label: '召喚',     icon: 'summon' },
      { id: 'codex',  label: '図鑑･設定', icon: 'codex' }
    ];
    return `
      <nav class="bottom-nav" aria-label="メインナビゲーション">
        ${tabs.map((t) => `
          <button class="nav-btn ${activeTab === t.id ? 'active' : ''}" data-act="setTab" data-val="${t.id}">
            ${ICON.svg(t.icon, 16)}
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
          <div class="subtab-row">
            ${WDATA.WORLDS.map((w, idx) => `
              <button class="subtab-btn ${ui.selectedWorldId === w.id ? 'active' : ''}" data-act="selectWorld" data-val="${w.id}">${idx + 1}.${esc(w.name.slice(0, 2))}</button>`).join('')}
          </div>`;
        const world = WDATA.WORLDS.find((w) => w.id === ui.selectedWorldId) || WDATA.WORLDS[0];
        const stageList = world.stages.map((st) => {
          const cleared = Boolean(snap.clearedStages[`${world.id}_${st.num}`]);
          const sel = ui.selectedStageNum === st.num;
          return `
            <button class="item-row-btn stage-card-btn ${sel ? 'selected' : ''}" data-act="selectStage" data-val="${st.num}">
              <div class="row-between">
                <span class="item-sub" style="font-weight:800;color:var(--gold-bright)">ステージ${st.num}</span>
                <div class="row-left">
                  ${st.isBoss ? `<span class="encounter-badge boss">BOSS</span>` : ''}
                  ${cleared ? `<span class="qual-tag qual-1">済</span>` : ''}
                </div>
              </div>
              <div class="row-between">
                <span class="item-title" style="font-size:11.5px">${esc(st.name)}</span>
                <span class="item-sub num">${fnum(Math.round(st.power * 3400))}</span>
              </div>
            </button>`;
        }).join('');

        body = `
          ${subtabs}
          ${worldBtns}
          <div class="scroll-list"><div class="list-grid-2">${stageList}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="startBattle" data-auto="0">1回出撃</button>
            <button class="btn-primary" data-act="startBattle" data-auto="1">自動周回開始</button>
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
                <span class="item-title">${esc(r.name)}（${esc(b.name)}）</span>
                ${elBadge(b.el)}
              </div>
              <div class="item-sub">${esc(r.desc)}</div>
            </button>`;
        }).join('');
        body = `
          ${subtabs}
          ${diffRow}
          <div class="scroll-list"><div class="list-stack">${rows}</div></div>
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
                ${cl ? `<span class="qual-tag qual-1">制覇済</span>` : `<span class="qual-tag qual-4">初回石+${g.rewardStone}</span>`}
              </div>
              <div class="item-sub">3パーティ連続ボス戦 / 報酬：残響石・魂晶・限定素材</div>
            </button>`;
        }).join('');
        body = `
          ${subtabs}
          <div class="scroll-list"><div class="list-stack">${rows}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="autoFillGauntlet">3部隊おまかせ</button>
            <button class="btn-secondary" data-act="gotoGauntletParty">手動編成</button>
            <button class="btn-primary" data-act="startBattle" data-auto="0">出撃</button>
          </div>`;
      } else if (ui.questSub === 'tower') {
        const maxAvail = Math.min(WDATA.TOWER_MAX_FLOOR, snap.towerMaxCleared + 1);
        const rows = [];
        for (let f = maxAvail; f >= 1; f--) {
          const tf = WDATA.getTowerFloor(f);
          const sel = ui.selectedTowerFloor === f;
          const cl = f <= snap.towerMaxCleared;
          rows.push(`
            <button class="item-row-btn stage-card-btn ${sel ? 'selected' : ''}" data-act="selectTower" data-val="${f}">
              <div class="row-between">
                <span class="item-title">第${f}層</span>
                <div class="row-left">${tf.isBoss ? '<span class="encounter-badge boss">BOSS</span>' : ''}${cl ? '<span class="qual-tag qual-1">済</span>' : '<span class="qual-tag qual-4">未</span>'}</div>
              </div>
              <div class="item-sub num">初回石+${tf.firstStone}</div>
            </button>`);
        }
        body = `
          ${subtabs}
          <div class="scroll-list"><div class="list-grid-2">${rows.join('')}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="startBattle" data-auto="0">第${ui.selectedTowerFloor}層へ挑戦</button>
            <button class="btn-primary" data-act="startBattle" data-auto="1">この層を自動周回</button>
          </div>`;
      } else if (ui.questSub === 'trial') {
        const rows = WDATA.TRIALS.map((tr) => {
          const sel = ui.selectedTrialId === tr.id;
          const cl = Boolean(snap.clearedTrials[tr.id]);
          const check = STATE.checkTrialRule(tr, snap.party);
          return `
            <button class="item-row-btn ${sel ? 'selected' : ''}" data-act="selectTrial" data-val="${tr.id}">
              <div class="row-between">
                <span class="item-title">${esc(tr.name)}</span>
                <div class="row-left">
                  ${check.ok ? `<span class="qual-tag qual-1">可</span>` : `<span class="qual-tag qual-0">条件外</span>`}
                  ${cl ? `<span class="qual-tag qual-2">済</span>` : ''}
                </div>
              </div>
              <div class="item-sub">${esc(tr.ruleText)}</div>
            </button>`;
        }).join('');
        body = `
          ${subtabs}
          <div class="scroll-list"><div class="list-stack">${rows}</div></div>
          <div class="action-bar">
            <button class="btn-secondary" data-act="setTab" data-val="party">条件に合わせて編成</button>
            <button class="btn-primary" data-act="startBattle" data-auto="0">試練へ挑戦</button>
          </div>`;
      }
    }

    /* ② 編成タブ（必須ソート順＋絞り込みフィルタ＋総力おまかせ編成） */
    if (ui.tab === 'party') {
      const targetParty = ui.partySub === 'main' ? snap.party : snap.gauntletParties[ui.gauntletTeamIdx];
      const sortedIds = filterSortedCharIds(STATE.sortCharIds(Object.keys(snap.roster)), ui);

      const slotBtns = [0, 1, 2, 3].map((idx) => `
        <button class="subtab-btn ${ui.selectedPartySlot === idx ? 'active' : ''}" data-act="selectPartySlot" data-val="${idx}">枠${idx + 1}</button>`).join('');

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
              <span class="item-sub num">覚醒${comp.awake} / 戦力 ${fnum(comp.power)}</span>
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
          <button class="subtab-btn" data-act="clearPartySlot">枠を外す</button>
          ${ui.partySub === 'gauntlet' ? `<button class="subtab-btn active" data-act="autoFillGauntlet">自動3部隊</button>` : ''}
        </div>
        ${renderFilterBars(ui)}
        <div class="scroll-list"><div class="list-stack">${listHtml || '<div class="item-sub">該当するキャラがいません</div>'}</div></div>`;
    }

    /* ③ 育成タブ */
    if (ui.tab === 'grow') {
      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const r = snap.roster[cid];
      const def = CDATA.CHAR_MAP[cid];
      const sortedIds = STATE.sortCharIds(Object.keys(snap.roster));

      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.growSub === 'list' ? 'active' : ''}" data-act="setGrowSub" data-val="list">キャラ選択</button>
          <button class="subtab-btn ${ui.growSub === 'board' ? 'active' : ''}" data-act="setGrowSub" data-val="board">共鳴盤</button>
          <button class="subtab-btn ${ui.growSub === 'awake' ? 'active' : ''}" data-act="setGrowSub" data-val="awake">覚醒</button>
          <button class="subtab-btn ${ui.growSub === 'ability' ? 'active' : ''}" data-act="setGrowSub" data-val="ability">アビリティ</button>
          <button class="subtab-btn ${ui.growSub === 'link' ? 'active' : ''}" data-act="setGrowSub" data-val="link">共鳴リンク</button>
        </div>`;

      let content = '';
      if (ui.growSub === 'list') {
        const filtered = filterSortedCharIds(sortedIds, ui);
        content = `${renderFilterBars(ui)}<div class="scroll-list"><div class="list-stack">${filtered.map((id) => {
          const comp = STATE.getCharComputed(id, snap.party);
          const sel = id === cid;
          return `
            <button class="item-row-btn ${sel ? 'selected' : ''}" data-act="selectChar" data-val="${id}">
              <div class="row-between">
                <div class="row-left">${rarTag(comp.def.rarity)}<span class="item-title">${esc(comp.def.name)}</span></div>
                <div class="row-left">${elBadge(comp.def.el)}${roleBadge(comp.def.role)}</div>
              </div>
              <div class="row-between">
                <span class="item-sub num">覚醒${comp.awake}/5・盤${snap.roster[id].board.length}/6</span>
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
                <span class="item-sub num">${unlocked ? '解放済' : `結晶 ${t.cost}`}</span>
              </div>
              <div class="item-sub">${esc(t.desc)}</div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list"><div class="list-grid-2">${nodes}</div></div>`;
      } else if (ui.growSub === 'awake') {
        const costMap = { N: 40, R: 70, SR: 120, SSR: 200, UR: 320 };
        const nextCost = costMap[def.rarity] + r.awake * 35;
        content = `
          <div class="info-box grow">
            <div class="item-title">現在覚醒：${r.awake} / 5（全基礎性能 +${r.awake * 14}%）</div>
            <div class="item-sub">覚醒2で自由アビリティ2枠目、覚醒4で3枠目が解放されます。</div>
            <div class="item-sub">所持魂晶：${fnum(snap.soul)}（被り上限超過・総力連戦・試練で獲得）</div>
            <div class="action-bar">
              <button class="btn-primary" data-act="awakeChar" ${r.awake >= 5 || snap.soul < nextCost ? 'disabled' : ''}>
                ${r.awake >= 5 ? '最大覚醒に到達済み' : `魂晶 ${nextCost} で覚醒+1`}
              </button>
            </div>
          </div>`;
      } else if (ui.growSub === 'ability') {
        const maxSlots = STATE.getAbilitySlotCount(r.awake);
        const list = snap.unlockedAbilities.map((aid) => {
          const ab = EDATA.ABILITY_MAP[aid];
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
          <div class="item-sub">装着枠：${r.abilities.length} / ${maxSlots}（召喚の魂晶交換・試練・深淵の塔で新アビリティ解放）</div>
          <div class="scroll-list"><div class="list-grid-2">${list}</div></div>`;
      } else if (ui.growSub === 'link') {
        const candidates = sortedIds.filter((id) => id !== cid && !snap.party.includes(id));
        const list = candidates.map((id) => {
          const cDef = CDATA.CHAR_MAP[id];
          const isLinked = r.linkCharId === id;
          return `
            <button class="item-row-btn ${isLinked ? 'selected' : ''}" data-act="setCharLink" data-val="${id}">
              <div class="row-between">
                <div class="row-left">${rarTag(cDef.rarity)}<span class="item-title">${esc(cDef.name)}</span></div>
                <span class="item-sub">${isLinked ? 'リンク中' : '選択'}</span>
              </div>
              <div class="item-sub">${esc(cDef.linkBonus.text)}（覚醒${snap.roster[id].awake}・盤${snap.roster[id].board.length}で強化）</div>
            </button>`;
        }).join('');
        content = `
          <div class="row-between">
            <span class="item-sub">控えキャラをリンクして戦力と特性を加算</span>
            <button class="btn-secondary" style="padding:4px 8px;font-size:10.5px" data-act="clearCharLink">解除</button>
          </div>
          <div class="scroll-list"><div class="list-stack">${list || '<div class="item-sub">控えキャラが増えるとリンクできます</div>'}</div></div>`;
      }

      body = `${subRow}${content}`;
    }

    /* ④ 装備タブ（キャラ切替対応＋未装着フィルタ＋明確なロックUI） */
    if (ui.tab === 'equip') {
      const cid = ui.selectedCharId && snap.roster[ui.selectedCharId] ? ui.selectedCharId : Object.keys(snap.roster)[0];
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.equipSub === 'wear' ? 'active' : ''}" data-act="setEquipSub" data-val="wear">装着</button>
          <button class="subtab-btn ${ui.equipSub === 'char' ? 'active' : ''}" data-act="setEquipSub" data-val="char">キャラ切替</button>
          <button class="subtab-btn ${ui.equipSub === 'sell' ? 'active' : ''}" data-act="setEquipSub" data-val="sell">売却・自動</button>
          <button class="subtab-btn ${ui.equipSub === 'craft' ? 'active' : ''}" data-act="setEquipSub" data-val="craft">限定製作</button>
          <button class="subtab-btn ${ui.equipSub === 'shop' ? 'active' : ''}" data-act="setEquipSub" data-val="shop">金貨還元</button>
        </div>`;

      let content = '';
      if (ui.equipSub === 'char') {
        const sortedIds = STATE.sortCharIds(Object.keys(snap.roster));
        const list = sortedIds.map((id) => {
          const comp = STATE.getCharComputed(id, snap.party);
          const eqCount = Object.values(snap.roster[id].equips).filter(Boolean).length;
          return `
            <button class="item-row-btn ${id === cid ? 'selected' : ''}" data-act="selectEquipChar" data-val="${id}">
              <div class="row-between">
                <div class="row-left">${rarTag(comp.def.rarity)}<span class="item-title">${esc(comp.def.name)}</span></div>
                <div class="row-left">${elBadge(comp.def.el)}${roleBadge(comp.def.role)}</div>
              </div>
              <div class="row-between">
                <span class="item-sub num">装着 ${eqCount}/4・戦力 ${fnum(comp.power)}</span>
                <span class="item-sub">${id === cid ? '選択中' : 'タップで切替'}</span>
              </div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list"><div class="list-stack">${list}</div></div>`;
      } else if (ui.equipSub === 'wear') {
        /* 主力4人ワンタップ切替ストリップ */
        const quickChars = snap.party.filter(Boolean);
        const quickRow = `
          <div class="filter-bar">
            ${quickChars.map((pid) => {
              const cd = CDATA.CHAR_MAP[pid];
              const shortN = cd.name.includes('の') ? cd.name.slice(cd.name.lastIndexOf('の') + 1) : cd.name;
              return `<button class="filter-chip ${pid === cid ? 'active' : ''}" data-act="selectChar" data-val="${pid}">${esc(shortN)}</button>`;
            }).join('')}
            <button class="filter-chip ${ui.equipUnownedOnly ? 'active' : ''}" data-act="toggleEquipFilter">${ui.equipUnownedOnly ? '未装着のみ' : '全装備'}</button>
          </div>`;
        const slotRow = `
          <div class="subtab-row">
            ${EDATA.SLOTS.map((sl) => `
              <button class="subtab-btn ${ui.selectedEquipSlot === sl.id ? 'active' : ''}" data-act="selectEquipSlot" data-val="${sl.id}">${esc(sl.name)}</button>`).join('')}
            <button class="subtab-btn" data-act="autoEquipChar">最適装着</button>
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
          .sort((a, b) => b.quality - a.quality || STATE.getEquipStatValue(b) - STATE.getEquipStatValue(a));
        const list = equips.map((eq) => {
          const ser = EDATA.SERIES_MAP[eq.seriesId];
          const owner = STATE.getEquipOwner(eq.id);
          const isMine = owner === cid;
          const val = STATE.getEquipStatValue(eq);
          return `
            <div class="item-row-btn ${isMine ? 'selected' : ''}" style="flex-direction:row;align-items:center;justify-content:space-between;gap:6px">
              <button style="flex:1;text-align:left" data-act="${isMine ? 'unequipSlot' : 'equipItem'}" data-val="${isMine ? eq.slotId : eq.id}">
                <div class="row-left">${qualTag(eq.quality)}<span class="item-title">${esc(ser.partNames[eq.slotId])}</span></div>
                <div class="item-sub">${esc(ser.name)} / 性能+${fnum(val)} ${owner ? (isMine ? '【装着中】' : `【${esc(CDATA.CHAR_MAP[owner].name)}】`) : ''}</div>
              </button>
              <button class="btn-secondary ${eq.locked ? 'lock-btn-locked' : ''}" style="padding:5px 7px;font-size:10px" aria-label="${eq.locked ? '装備ロック解除' : '装備ロック保護'}" data-act="toggleEquipLock" data-val="${eq.id}">${ICON.svg(eq.locked ? 'lock' : 'unlock', 12)}${eq.locked ? '保護' : ''}</button>
            </div>`;
        }).join('');
        content = `${quickRow}${slotRow}<div class="scroll-list"><div class="list-stack">${list || '<div class="item-sub">該当する装備がありません</div>'}</div></div>`;
      } else if (ui.equipSub === 'sell') {
        const curAuto = snap.settings.autoSellMaxQuality;
        const autoBtns = [-1, 0, 1, 2, 3].map((q) => {
          const lbl = q < 0 ? 'OFF' : EDATA.QUALITIES[q].name + '以下';
          return `<button class="subtab-btn ${curAuto === q ? 'active' : ''}" data-act="setAutoSell" data-val="${q}">${lbl}</button>`;
        }).join('');
        content = `
          <div class="info-box">
            <div class="item-title">自動売却ライン（周回ドロップ時に即時換金）</div>
            <div class="subtab-row">${autoBtns}</div>
          </div>
          <div class="info-box grow">
            <div class="item-title">一括売却（装着中・ロック済み装備は完全保護）</div>
            <div class="list-grid-2">
              <button class="btn-secondary" data-act="bulkSell" data-val="0">標準のみ一括売却</button>
              <button class="btn-secondary" data-act="bulkSell" data-val="1">上質以下を一括売却</button>
              <button class="btn-secondary" data-act="bulkSell" data-val="2">精巧以下を一括売却</button>
              <button class="btn-danger" data-act="bulkSell" data-val="3">逸品以下を一括売却</button>
            </div>
            <div class="item-sub">所持装備数：${snap.equips.length}個 / 所持金貨：${fnum(snap.gold)}</div>
          </div>`;
      } else if (ui.equipSub === 'craft') {
        const limSeries = EDATA.EQUIP_SERIES.filter((s) => s.limited);
        const rows = limSeries.map((ser) => {
          const raid = WDATA.RAIDS.find((x) => x.matId === ser.matId);
          const have = snap.mats[ser.matId] || 0;
          return `
            <div class="item-row-btn">
              <div class="row-between">
                <span class="item-title">${esc(ser.name)}</span>
                <span class="item-sub num">${esc(raid ? raid.matName : '')} ${have}/${ser.matCost}</span>
              </div>
              <div class="item-sub">2部位：${esc(ser.set2.desc)} / 4部位：${esc(ser.set4.desc)}</div>
              <div class="subtab-row" style="margin-top:3px">
                ${EDATA.SLOTS.map((sl) => `
                  <button class="subtab-btn" data-act="craftEquip" data-series="${ser.id}" data-slot="${sl.id}" ${have < ser.matCost ? 'disabled' : ''}>${esc(sl.name)}製作</button>`).join('')}
              </div>
            </div>`;
        }).join('');
        content = `<div class="scroll-list"><div class="list-stack">${rows}</div></div>`;
      } else if (ui.equipSub === 'shop') {
        content = `
          <div class="info-box grow">
            <div class="item-title">売却金貨の還元交換</div>
            <div class="item-sub">自動売却・一括売却で貯まった金貨を、共鳴結晶や残響石へ還元できます。</div>
            <div class="list-stack">
              <button class="btn-primary" data-act="buyGold" data-val="crystal" ${snap.gold < 400 ? 'disabled' : ''}>金貨 400 → 共鳴結晶 +160</button>
              <button class="btn-primary" data-act="buyGold" data-val="stone" ${snap.gold < 600 ? 'disabled' : ''}>金貨 600 → 残響石 +120</button>
            </div>
          </div>`;
      }

      body = `${subRow}${content}`;
    }

    /* ⑤ 召喚・限定交換・魂晶アビリティ解放タブ */
    if (ui.tab === 'summon') {
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.summonSub === 'gacha' ? 'active' : ''}" data-act="setSummonSub" data-val="gacha">残響召喚</button>
          <button class="subtab-btn ${ui.summonSub === 'raidChar' ? 'active' : ''}" data-act="setSummonSub" data-val="raidChar">限定解放</button>
          <button class="subtab-btn ${ui.summonSub === 'abShop' ? 'active' : ''}" data-act="setSummonSub" data-val="abShop">魂晶交換</button>
        </div>`;

      let content = '';
      if (ui.summonSub === 'gacha') {
        content = `
          <div class="info-box grow" style="justify-content:center;gap:10px">
            <div class="item-sub" style="text-align:center">所持残響石：${fnum(snap.stone)}（課金要素なし・周回で無限獲得）</div>
            <div class="action-bar">
              <button class="btn-secondary" data-act="summon" data-val="1" ${snap.stone < 120 ? 'disabled' : ''}>1回召喚（120石）</button>
              <button class="btn-primary" data-act="summon" data-val="10" ${snap.stone < 1100 ? 'disabled' : ''}>10連召喚（1100石）</button>
            </div>
          </div>`;
      } else if (ui.summonSub === 'raidChar') {
        const limChars = STATE.sortCharIds(CDATA.CHARS.filter((c) => c.source === 'raid').map((c) => c.id));
        const list = limChars.map((cid) => {
          const c = CDATA.CHAR_MAP[cid];
          const have = snap.shards[cid] || 0;
          const owned = Boolean(snap.roster[cid]);
          return `
            <button class="item-row-btn" data-act="exchangeRaidChar" data-val="${cid}" ${have < 5 ? 'disabled' : ''}>
              <div class="row-between">
                <div class="row-left">${rarTag(c.rarity)}<span class="item-title">${esc(c.name)}</span>${elBadge(c.el)}</div>
                <span class="qual-tag ${have >= 5 ? 'qual-4' : 'qual-0'}">鍵 ${have}/5</span>
              </div>
              <div class="item-sub">${owned ? `所持済（覚醒${snap.roster[cid].awake}/5）・鍵5個で覚醒+1` : '異界討伐で鍵を5個集めて確定解放'}</div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list"><div class="list-stack">${list}</div></div>`;
      } else if (ui.summonSub === 'abShop') {
        const shopAbs = EDATA.FREE_ABILITIES.filter((a) => a.costSoul);
        const list = shopAbs.map((ab) => {
          const has = snap.unlockedAbilities.includes(ab.id);
          return `
            <button class="item-row-btn ${has ? 'locked-item' : ''}" data-act="buyAbility" data-val="${ab.id}" ${has || snap.soul < ab.costSoul ? 'disabled' : ''}>
              <div class="row-between">
                <span class="item-title">${esc(ab.name)}</span>
                <span class="item-sub num">${has ? '解放済' : `魂晶 ${ab.costSoul}`}</span>
              </div>
              <div class="item-sub">${esc(ab.desc)}</div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list"><div class="list-grid-2">${list}</div></div>`;
      }
      body = `${subRow}${content}`;
    }

    /* ⑥ 図鑑＆設定タブ */
    if (ui.tab === 'codex') {
      const subRow = `
        <div class="subtab-row">
          <button class="subtab-btn ${ui.codexSub === 'char' ? 'active' : ''}" data-act="setCodexSub" data-val="char">キャラ図鑑</button>
          <button class="subtab-btn ${ui.codexSub === 'enemy' ? 'active' : ''}" data-act="setCodexSub" data-val="enemy">敵図鑑</button>
          <button class="subtab-btn ${ui.codexSub === 'equip' ? 'active' : ''}" data-act="setCodexSub" data-val="equip">装備図鑑</button>
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
        content = `${renderFilterBars(ui)}<div class="scroll-list"><div class="list-stack">${rows || '<div class="item-sub">該当するキャラがいません</div>'}</div></div>`;
      } else if (ui.codexSub === 'enemy') {
        const enemies = Object.values(WDATA.ENEMIES);
        const rows = enemies.map((e) => {
          const k = snap.codexEnemies[e.id] || 0;
          return `
            <button class="item-row-btn ${ui.codexEnemyId === e.id ? 'selected' : ''}" data-act="selectCodexEnemy" data-val="${e.id}">
              <div class="row-between">
                <div class="row-left">
                  ${e.kind === 'boss' ? '<span class="encounter-badge boss">BOSS</span>' : (e.kind === 'intruder' ? '<span class="encounter-badge intruder">乱入</span>' : '')}
                  <span class="item-title">${esc(e.name)}</span>
                </div>
                <div class="row-left">${elBadge(e.el)}<span class="item-sub num">撃破${k}</span></div>
              </div>
            </button>`;
        }).join('');
        content = `<div class="scroll-list"><div class="list-stack">${rows}</div></div>`;
      } else if (ui.codexSub === 'equip') {
        const rows = EDATA.EQUIP_SERIES.map((ser) => `
          <button class="item-row-btn ${ui.codexEquipId === ser.id ? 'selected' : ''}" data-act="selectCodexEquip" data-val="${ser.id}">
            <div class="row-between">
              <span class="item-title">${esc(ser.name)}</span>
              <span class="qual-tag ${ser.limited ? 'qual-4' : 'qual-2'}">${ser.limited ? '限定' : '探索'}</span>
            </div>
            <div class="item-sub">2部位：${esc(ser.set2.desc)}</div>
          </button>`).join('');
        content = `<div class="scroll-list"><div class="list-stack">${rows}</div></div>`;
      } else {
        content = `
          <div class="scroll-list">
            <div class="list-stack">
              <div class="item-row-btn">
                <div class="row-between">
                  <span class="item-title">効果音（SE）</span>
                  <button class="btn-secondary ${snap.settings.sound ? 'active' : ''}" data-act="toggleSound">${snap.settings.sound ? 'ON' : 'OFF'}</button>
                </div>
              </div>
              <div class="item-row-btn">
                <div class="item-title">引き継ぎコード（暗号化・署名付き）</div>
                <div class="action-bar" style="margin-top:4px">
                  <button class="btn-secondary" data-act="exportCode">コード発行＆コピー</button>
                  <button class="btn-primary" data-act="importCode">入力コードから復元</button>
                </div>
                <input id="transfer-input" type="text" value="${esc(ui.exportedCode)}" placeholder="復元する引き継ぎコードを貼り付け" style="margin-top:5px;width:100%">
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
    resetBattleDomCache();
    upperEl.innerHTML = renderNonBattleUpper(snap, ui);
    lowerEl.innerHTML = renderNonBattleLower(snap, ui);
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
