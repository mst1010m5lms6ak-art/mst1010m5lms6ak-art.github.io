(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  const uiState = {
    dockTab: 'log', // 'log' | 'dps'
    dpsMetric: 'dmg' // 'dmg' | 'taken' | 'healOut' | 'healIn'
  };

  function renderUnitCard(u, isActing, isTargeted) {
    const hpPct = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
    const shPct = Math.max(0, Math.min(1, u.shield / Math.max(1, u.maxHp)));
    const elColor = HW.getElement(u.element).color;
    const cls = [
      'unit-card',
      u.side === 'enemy' ? 'enemy-card' : '',
      u.isBoss ? 'boss-card' : '',
      u.isIntruder ? 'intruder-card' : '',
      isActing ? 'acting' : '',
      isTargeted ? 'targeted' : '',
      !u.alive ? 'dead' : ''
    ].filter(Boolean).join(' ');

    const ctsHtml = (u.skills || []).map((sk) => {
      if (sk.target === 'passive') return '<span class="ct-pip passive">常時</span>';
      if (sk.slot === 1) return '<span class="ct-pip ready">技1</span>';
      const ready = sk.cd <= 0;
      const clsPip = 'ct-pip' + (sk.slot === 3 ? ' s3' : '') + (ready ? ' ready' : '');
      return '<span class="' + clsPip + '">技' + sk.slot + ':' + (ready ? '可' : sk.cd) + '</span>';
    }).join('');

    const effList = u.effects || [];
    const effsHtml = effList.length
      ? effList.slice(0, 4).map((ef) => {
          const c = ef.kind === 'buff' ? 'eff-buff' : ef.kind === 'debuff' ? 'eff-debuff' : 'eff-ailment';
          return '<span class="eff-tag ' + c + '">' + HW.esc(ef.name) + ef.dur + '</span>';
        }).join('') +
        (effList.length > 4 ? '<span class="eff-tag eff-buff">+' + (effList.length - 4) + '</span>' : '')
      : '<span class="eff-empty">--</span>';

    const bossBadge = u.isIntruder
      ? '<span class="u-boss-tag intruder">乱入</span>'
      : u.isBoss
        ? '<span class="u-boss-tag">BOSS</span>'
        : '';

    const hpBarCls = u.side === 'ally' ? 'hp-ally' : u.isBoss ? 'hp-boss' : 'hp-enemy';
    const hpLabel = u.shield > 0
      ? HW.formatCompact(u.hp) + '<span class="u-sh-txt">+' + HW.formatCompact(u.shield) + '</span>'
      : HW.formatCompact(u.hp);

    return (
      '<div id="' + u.domId + '" class="' + cls + '" style="border-left-color:' + elColor + '">' +
      '<div class="u-head">' +
      '<div class="u-name-row">' + HW.icon(u.element, 11, elColor) + '<span class="u-name">' + HW.esc(u.name) + '</span></div>' +
      '<div class="u-head-right">' + bossBadge + HW.badgeRole(u.role, true) + '</div>' +
      '</div>' +
      '<div class="u-hp-row">' +
      '<div class="bar-track">' +
      '<div class="bar-fill ' + hpBarCls + '" data-hp-bar="' + u.domId + '" style="transform:scaleX(' + hpPct.toFixed(3) + ')"></div>' +
      (shPct > 0 ? '<div class="bar-fill shield" style="transform:scaleX(' + shPct.toFixed(3) + ')"></div>' : '') +
      '</div>' +
      '<span class="u-hp-txt num">' + hpLabel + '</span>' +
      '</div>' +
      '<div class="bar-track atb"><div class="bar-fill atb-fill" data-atb-bar="' + u.domId + '" style="transform:scaleX(' + Math.min(1, u.gauge).toFixed(3) + ')"></div></div>' +
      '<div class="u-cts">' + ctsHtml + '</div>' +
      '<div class="u-effects">' + effsHtml + '</div>' +
      (!u.alive ? '<span class="ko-overlay">K.O.</span>' : '') +
      '</div>'
    );
  }

  function renderTurnOrderBar() {
    // 均等4枠グリッドで見切れを100%防止
    const list = HW.Battle.getTurnOrderPreview().slice(0, 4);
    const chips = list.map((item, idx) => {
      const u = item.unit;
      const cls = 'tq-chip ' + (u.side === 'ally' ? 'ally' : 'enemy') + (item.acting ? ' acting' : '');
      const prefix = item.acting ? '▶' : (idx + 1) + '.';
      return '<span class="' + cls + '">' + prefix + HW.esc(u.name) + '</span>';
    }).join('');
    return '<div class="turn-order-bar"><span class="turn-order-label">行動順</span><div class="turn-queue">' + chips + '</div></div>';
  }

  function getBattleHeaderTitle() {
    const cfg = HW.Battle.config;
    if (!cfg) return 'バトル';
    if (cfg.mode === 'normal') return HW.getStageDef(cfg.stageId).name;
    if (cfg.mode === 'tower') return HW.getTowerFloorDef(cfg.towerId, cfg.floor).name;
    if (cfg.mode === 'raid') {
      const rd = HW.RAIDS.find((r) => r.id === cfg.raidId);
      return (rd ? rd.name : '異界総力戦') + ' [第' + (HW.Battle.raidTeamIdx + 1) + '部隊]';
    }
    if (cfg.mode === 'restriction') {
      const rs = HW.RESTRICTIONS.find((r) => r.id === cfg.restrictionId);
      return rs ? rs.name : '制約異界';
    }
    if (cfg.mode === 'arena') {
      return '異界闘技場 ' + cfg.targetRank + '位戦';
    }
    return 'バトル';
  }

  function renderDpsInner() {
    const list = Object.values(HW.Battle.dps);
    const key = uiState.dpsMetric;
    const maxVal = Math.max(1, ...list.map((d) => d[key] || 0));
    const metricTabs = [
      { id: 'dmg', label: '与ダメ' },
      { id: 'taken', label: '被ダメ' },
      { id: 'healOut', label: '与回復' },
      { id: 'healIn', label: '被回復' }
    ];
    const ctrl =
      '<div class="dps-controls">' +
      metricTabs.map((m) =>
        '<button type="button" class="dps-metric-btn' + (key === m.id ? ' active' : '') + '" data-dps-metric="' + m.id + '">' + m.label + '</button>'
      ).join('') +
      '</div>';

    const rows = list.map((d) => {
      const val = d[key] || 0;
      const pct = Math.min(100, (val / maxVal) * 100);
      return (
        '<div class="dps-row">' +
        '<div class="dps-row-top">' +
        '<span>' + HW.badgeElement(d.element) + ' ' + HW.esc(d.name) + '</span>' +
        '<span class="num">' + HW.formatNum(val) + '</span>' +
        '</div>' +
        '<div class="dps-bar-bg"><div class="dps-bar-val ' + key + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '</div>'
      );
    }).join('');

    return ctrl + '<div class="dps-rows">' + rows + '</div>';
  }

  function getLogTagClass(badge) {
    if (!badge) return '';
    if (badge === '会心' || badge === '不屈') return 'crit';
    if (badge === '開眼' || badge === '極装備' || badge === '超稀' || badge === '乱入' || badge === '乱入賞' || badge === '獲得' || badge === '欠片') return 'drop';
    if (badge === '弱点' || badge === '撃破') return 'weak';
    if (badge === '回復' || badge === '蘇生') return 'heal';
    return '';
  }

  function renderLogInner() {
    const logs = HW.Battle.logs;
    return (
      '<div id="battle-log-list" class="battle-log-list">' +
      logs.map((l, idx) => {
        const tagHtml = l.badge
          ? '<span class="log-tag ' + getLogTagClass(l.badge) + '">' + HW.esc(l.badge) + '</span>'
          : '';
        return (
          '<div class="log-entry ' + l.kind + (idx === 0 ? ' latest' : '') + '">' +
          tagHtml +
          '<span class="log-text">' + HW.esc(l.text) + '</span>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  HW.RenderBattle = {
    mount: function (topEl, bottomEl) {
      topEl.innerHTML =
        '<div class="battle-stage-wrap">' +
        '<div id="battle-meta-slot"></div>' +
        '<div id="battle-turn-slot"></div>' +
        '<div class="battle-arena">' +
        '<div id="battle-enemy-grid" class="unit-grid"></div>' +
        '<div id="battle-action-banner" class="action-banner">戦闘開始</div>' +
        '<div id="battle-ally-grid" class="unit-grid"></div>' +
        '<canvas id="battle-vfx-canvas" class="battle-vfx-canvas"></canvas>' +
        '</div>' +
        '</div>';

      bottomEl.innerHTML =
        '<div class="battle-dock-head">' +
        '<div class="subtabs" style="flex:1">' +
        '<button type="button" class="subtab' + (uiState.dockTab === 'log' ? ' active' : '') + '" data-bdock="log">戦闘ログ</button>' +
        '<button type="button" class="subtab' + (uiState.dockTab === 'dps' ? ' active' : '') + '" data-bdock="dps">DPSメーター</button>' +
        '</div>' +
        '</div>' +
        '<div id="battle-panel-box" class="battle-panel-box"></div>' +
        '<div id="battle-ctrl-row" class="battle-ctrl-row"></div>';

      HW.VFX.attach(document.getElementById('battle-vfx-canvas'));

      bottomEl.querySelectorAll('[data-bdock]').forEach((btn) => {
        btn.addEventListener('click', () => {
          uiState.dockTab = btn.getAttribute('data-bdock');
          HW.Audio.tap();
          bottomEl.querySelectorAll('[data-bdock]').forEach((b) =>
            b.classList.toggle('active', b.getAttribute('data-bdock') === uiState.dockTab)
          );
          HW.RenderBattle.refreshPanel();
        });
      });

      this.sync(true);
    },

    sync: function (full) {
      if (!document.getElementById('battle-enemy-grid')) return;

      if (!full) {
        const all = HW.Battle.allies.concat(HW.Battle.enemies);
        for (let i = 0; i < all.length; i++) {
          const u = all[i];
          const bar = document.querySelector('[data-atb-bar="' + u.domId + '"]');
          if (bar) bar.style.transform = 'scaleX(' + Math.min(1, u.gauge).toFixed(3) + ')';
        }
        return;
      }

      const b = HW.Battle;
      const metaSlot = document.getElementById('battle-meta-slot');
      const turnSlot = document.getElementById('battle-turn-slot');
      const enemyGrid = document.getElementById('battle-enemy-grid');
      const allyGrid = document.getElementById('battle-ally-grid');
      const banner = document.getElementById('battle-action-banner');

      const wavePillCls = b.isIntruderWave ? 'b-pill intruder' : b.wave === b.maxWaves ? 'b-pill boss' : 'b-pill';
      const waveLabel = b.isIntruderWave ? '乱入発生!' : 'WAVE ' + b.wave + '/' + b.maxWaves;
      const loopPill = b.autoLoop ? '<span class="b-pill num">' + b.loopCount + '周目</span>' : '';

      metaSlot.innerHTML =
        '<div class="battle-meta-bar">' +
        '<span class="battle-stage-name">' + HW.esc(getBattleHeaderTitle()) + '</span>' +
        '<div class="battle-pills">' + loopPill + '<span class="' + wavePillCls + '">' + waveLabel + '</span></div>' +
        '</div>';

      turnSlot.innerHTML = renderTurnOrderBar();

      const actingUid = b.currentAction ? b.currentAction.unit.uid : null;
      const targetUids = b.currentAction ? (b.currentAction.targets || []).map((t) => t.uid) : [];

      enemyGrid.className = 'unit-grid' + (b.enemies.length === 1 ? ' enemy-single' : '');
      enemyGrid.innerHTML = b.enemies.map((u) => renderUnitCard(u, u.uid === actingUid, targetUids.includes(u.uid))).join('');
      allyGrid.innerHTML = b.allies.map((u) => renderUnitCard(u, u.uid === actingUid, targetUids.includes(u.uid))).join('');

      banner.className = 'action-banner ' + (b.bannerCls || '');
      banner.textContent = b.bannerText || '交戦中';

      this.refreshPanel();
      this.refreshControls();
    },

    refreshPanel: function () {
      const box = document.getElementById('battle-panel-box');
      if (!box) return;
      if (uiState.dockTab === 'log') {
        box.innerHTML = renderLogInner();
        const list = document.getElementById('battle-log-list');
        // 最新が先頭のため常にscrollTop=0で上端見切れゼロ
        if (list) list.scrollTop = 0;
      } else {
        box.innerHTML = renderDpsInner();
        box.querySelectorAll('[data-dps-metric]').forEach((btn) => {
          btn.addEventListener('click', () => {
            uiState.dpsMetric = btn.getAttribute('data-dps-metric');
            HW.Audio.tap();
            HW.RenderBattle.refreshPanel();
          });
        });
      }
    },

    refreshControls: function () {
      const row = document.getElementById('battle-ctrl-row');
      if (!row) return;
      const b = HW.Battle;
      const isRaid = b.config && b.config.mode === 'raid';
      let loopBtnCls = 'btn';
      let loopLabel = HW.icon('loop', 13) + ' 自動周回 OFF';
      if (isRaid) {
        loopLabel = '総力リレー進行中';
      } else if (b.autoLoop && b.stopAfterCurrent) {
        loopBtnCls = 'btn btn-loop-stop-pending';
        loopLabel = HW.icon('loop', 13) + ' この戦闘後に終了';
      } else if (b.autoLoop) {
        loopBtnCls = 'btn btn-loop-on';
        loopLabel = HW.icon('loop', 13) + (b.config.mode === 'tower' ? ' 連続登頂 ON' : ' 自動周回 ON');
      }

      row.innerHTML =
        '<button type="button" id="btn-battle-speed" class="btn btn-primary num">' + HW.icon('bolt', 13) + ' ' + b.speed + '倍速</button>' +
        '<button type="button" id="btn-battle-loop" class="' + loopBtnCls + '"' + (isRaid ? ' disabled' : '') + '>' + loopLabel + '</button>';

      document.getElementById('btn-battle-speed').addEventListener('click', () => b.cycleSpeed());
      const loopBtn = document.getElementById('btn-battle-loop');
      if (loopBtn && !isRaid) loopBtn.addEventListener('click', () => b.toggleLoop());
    },

    showResultSheet: function (result, onDone, onReplay) {
      const sum = result.summary;
      const isMulti = result.runs > 1;
      const bannerCls = result.win || result.wins > 0 ? 'win' : 'lose';
      const bannerTxt = isMulti
        ? '周回完了 (' + result.wins + '勝 ' + result.losses + '敗 / 計' + result.runs + '周)'
        : result.win
          ? 'VICTORY'
          : result.mode === 'raid'
            ? '総力戦 集計完了'
            : 'DEFEAT';

      const shardLines = Object.keys(sum.shards).map((cid) => {
        const c = HW.getCharDef(cid);
        return (c ? c.name : cid) + 'の欠片×' + sum.shards[cid];
      });
      const matLines = Object.keys(sum.materials).map((mid) => {
        const m = HW.RANK_MATERIALS.find((x) => x.id === mid);
        return (m ? m.name : mid) + '×' + sum.materials[mid];
      });

      const equipPreview = sum.equips.slice(0, 6).map((eq) => {
        const tpl = HW.getEquipTemplate(eq.tplId);
        return '<div class="tag-row" style="justify-content:space-between;font-size:11px"><span>' + HW.esc(tpl.name) + '</span>' + HW.badgeQuality(eq.quality) + '</div>';
      }).join('');

      const dpsLines = (result.dpsList || []).map((d) =>
        '<div class="tag-row" style="justify-content:space-between;font-size:11px">' +
        '<span>' + HW.badgeElement(d.element) + ' ' + HW.esc(d.name) + '</span>' +
        '<span class="num">与' + HW.formatNum(d.dmg) + ' / 被' + HW.formatNum(d.taken) + ' / 癒' + HW.formatNum(d.healOut) + '</span>' +
        '</div>'
      ).join('');

      const specialLines = [];
      if (sum.raidDamage > 0) specialLines.push('総力戦 累計ダメージ: ' + HW.formatNum(sum.raidDamage));
      if (sum.arenaNewRank) specialLines.push('異界闘技場 順位更新: ' + sum.arenaNewRank + '位！');
      if (sum.towerMaxFloor > 0) specialLines.push('異界塔 到達更新: ' + sum.towerMaxFloor + 'F！');
      if (sum.intruderCount > 0) specialLines.push('希少乱入敵 撃破×' + sum.intruderCount);
      if (sum.unlockedFormations.length > 0) specialLines.push('新陣形解放: ' + sum.unlockedFormations.join(' / '));
      if (sum.sparks.length > 0) specialLines.push('戦技開眼: ' + sum.sparks.join('、'));

      const bodyHtml =
        '<div class="result-banner ' + bannerCls + '">' + HW.esc(bannerTxt) + '</div>' +
        (specialLines.length
          ? '<div class="result-box" style="border-color:var(--acc-gold);color:var(--acc-gold);font-size:11.5px;font-weight:800">' +
            specialLines.map((s) => '<div>' + HW.esc(s) + '</div>').join('') +
            '</div>'
          : '') +
        '<div class="result-grid">' +
        '<div class="result-box"><div class="stat-k">獲得ゴールド</div><div class="stat-v num" style="color:var(--acc-gold)">+' + HW.formatNum(sum.gold) + ' G</div></div>' +
        '<div class="result-box"><div class="stat-k">万能欠片 / メダル</div><div class="stat-v num" style="color:var(--acc-cyan)">欠+' + sum.omniShards + ' / 闘+' + sum.arenaMedals + '</div></div>' +
        '</div>' +
        (shardLines.length || matLines.length
          ? '<div class="result-box"><div class="stat-k" style="margin-bottom:3px">獲得欠片・階位素材</div><div style="font-size:11px;line-height:1.45">' +
            HW.esc(shardLines.concat(matLines).join(' / ')) +
            '</div></div>'
          : '') +
        (sum.equips.length || sum.autoSoldCount
          ? '<div class="result-box"><div class="stat-k" style="margin-bottom:3px">獲得装備 (' + sum.equips.length + '件' + (sum.maxQualityCount ? '・極' + sum.maxQualityCount + '件!' : '') + ') / 自動売却 ' + sum.autoSoldCount + '件 (+' + HW.formatNum(sum.autoSoldGold) + 'G)</div>' +
            equipPreview +
            (sum.equips.length > 6 ? '<div style="font-size:10px;color:var(--txt-sub)">他 ' + (sum.equips.length - 6) + ' 件を倉庫へ格納</div>' : '') +
            '</div>'
          : '') +
        '<div class="result-box"><div class="stat-k" style="margin-bottom:3px">戦闘DPSサマリー（累積）</div>' + dpsLines + '</div>';

      const actionsHtml =
        '<button type="button" class="btn" id="res-back-btn">冒険へ戻る</button>' +
        '<button type="button" class="btn btn-primary" id="res-again-btn">もう一度出撃</button>';

      HW.DOM.openSheet('戦闘リザルト', bodyHtml, actionsHtml, (panel) => {
        panel.querySelector('#res-back-btn').addEventListener('click', () => {
          HW.Audio.tap();
          HW.DOM.closeSheet();
          if (onDone) onDone();
        });
        panel.querySelector('#res-again-btn').addEventListener('click', () => {
          HW.Audio.tap();
          HW.DOM.closeSheet();
          if (onReplay) onReplay();
        });
      });
    }
  };
})();
