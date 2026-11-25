(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  HW.esc = function (v) {
    return HW.Security.escapeHtml(v);
  };

  HW.renderStageHeader = function (titleText) {
    const sd = HW.State.data;
    return (
      '<div class="stage-header">' +
      '<div class="stage-title">' + HW.esc(titleText) + '</div>' +
      '<div class="currency-strip">' +
      '<span class="cur-pill gold num">G ' + HW.formatCompact(sd.gold) + '</span>' +
      '<span class="cur-pill shard num">欠片 ' + HW.formatCompact(sd.omniShards) + '</span>' +
      '<span class="cur-pill medal num">闘 ' + HW.formatCompact(sd.arenaMedals) + '</span>' +
      '</div>' +
      '</div>'
    );
  };

  // モディファイアオブジェクトを人間が読みやすい短縮配列へ変換（陣形・固有装備・図鑑共通）
  HW.formatModTags = function (mod) {
    if (!mod) return [];
    const list = [];
    if (mod.hpPct) list.push('HP+' + Math.round(mod.hpPct * 100) + '%');
    if (mod.atkPct) list.push('攻+' + Math.round(mod.atkPct * 100) + '%');
    if (mod.defPct) list.push('防+' + Math.round(mod.defPct * 100) + '%');
    if (mod.spdFlat) list.push('速+' + mod.spdFlat);
    if (mod.crit) list.push('会心+' + Math.round(mod.crit * 100) + '%');
    if (mod.critDmg) list.push('会心倍+' + Math.round(mod.critDmg * 100) + '%');
    if (mod.defPen) list.push('貫通+' + Math.round(mod.defPen * 100) + '%');
    if (mod.dmgUp) list.push('与ダメ+' + Math.round(mod.dmgUp * 100) + '%');
    if (mod.dmgRed) list.push('被減' + Math.round(mod.dmgRed * 100) + '%');
    if (mod.healOutPct) list.push('与癒+' + Math.round(mod.healOutPct * 100) + '%');
    if (mod.healInPct) list.push('被癒+' + Math.round(mod.healInPct * 100) + '%');
    if (mod.res) list.push('耐性+' + Math.round(mod.res * 100) + '%');
    if (mod.effHit) list.push('命中+' + Math.round(mod.effHit * 100) + '%');
    if (mod.startGauge) list.push('開戦+' + Math.round(mod.startGauge * 100) + '%');
    if (mod.counterChance) list.push('反撃' + Math.round(mod.counterChance * 100) + '%');
    if (mod.extraHitChance) list.push('追撃' + Math.round(mod.extraHitChance * 100) + '%');
    if (mod.ailmentBonus) list.push('異常特効+' + Math.round(mod.ailmentBonus * 100) + '%');
    if (mod.turnRegenPct) list.push('再生' + Math.round(mod.turnRegenPct * 100) + '%');
    if (mod.lifesteal) list.push('吸血+' + Math.round(mod.lifesteal * 100) + '%');
    if (mod.eva) list.push('回避+' + Math.round(mod.eva * 100) + '%');
    return list;
  };

  HW.badgeElement = function (elId) {
    const e = HW.getElement(elId);
    return '<span class="el-badge ' + e.cls + '">' + HW.icon(e.id, 10) + e.name + '</span>';
  };

  HW.badgeRole = function (roleId, compact) {
    const r = HW.getRole(roleId);
    return '<span class="role-badge ' + r.cls + '">' + HW.icon(r.id, 10) + (compact ? r.short : r.name) + '</span>';
  };

  HW.badgeRaces = function (races) {
    return (races || ['human'])
      .map((id) => '<span class="race-badge">' + HW.esc(HW.getRace(id).name) + '</span>')
      .join('');
  };

  HW.badgeTarget = function (target) {
    const t = HW.TARGET_LABELS[target] || HW.TARGET_LABELS.single;
    return '<span class="target-badge ' + t.cls + '">' + t.text + '</span>';
  };

  HW.badgeQuality = function (quality) {
    const qm = HW.getQualityMeta(quality);
    if (qm.isMax) {
      return '<span class="quality-max-tag">極 100%</span>';
    }
    return '<span class="race-badge num" style="color:' + qm.color + ';border-color:' + qm.color + '55">' + qm.label + ' ' + quality + '%</span>';
  };

  HW.starsText = function (star) {
    if (star >= 6) return '★6極';
    return '★'.repeat(Math.max(1, star));
  };

  HW.DOM = {
    toast: function (text, tone) {
      const layer = document.getElementById('toast-layer');
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'toast-item' + (tone ? ' ' + tone : '');
      el.textContent = text;
      layer.appendChild(el);
      if (layer.children.length > 3) layer.removeChild(layer.firstChild);
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 2200);
    },

    openSheet: function (title, bodyHtml, actionsHtml, onBind) {
      const ov = document.getElementById('sheet-overlay');
      const panel = document.getElementById('sheet-panel');
      if (!ov || !panel) return;
      panel.innerHTML =
        '<div class="sheet-head"><div class="sheet-title">' + HW.esc(title) + '</div></div>' +
        '<div class="sheet-body">' + bodyHtml + '</div>' +
        '<div class="sheet-actions">' +
        (actionsHtml || '<button type="button" class="btn btn-primary" data-sheet-close="1">閉じる</button>') +
        '</div>';
      ov.classList.remove('hidden');

      panel.querySelectorAll('[data-sheet-close]').forEach((btn) => {
        btn.addEventListener('click', () => {
          HW.Audio.tap();
          HW.DOM.closeSheet();
        });
      });
      if (typeof onBind === 'function') onBind(panel);
    },

    closeSheet: function () {
      const ov = document.getElementById('sheet-overlay');
      if (ov) ov.classList.add('hidden');
    },

    /**
     * iOS Safari / PWA standalone の画面ズレ防御 + 誤操作防止（タップ感度を落とさない実装）
     */
    setupMobileGuard: function () {
      // 1. 長押しメニュー・ピンチズーム無効化（ダブルタップズーム防止はCSS touch-action: manipulationに委譲しclick握り潰しを防止）
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      document.addEventListener('gesturechange', (e) => e.preventDefault());

      // 初回タップでWebAudio解禁
      const unlockAudio = () => {
        HW.Audio.unlock();
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });

      // 2. リサイズ・キーボード収納後のリフロー＆VFX Canvas同期
      // ※ステータスバー領域はOS側の通常表示に委譲しているため、safe-topへの固定px上乗せは行わず余計な隙間を防止
      const syncViewport = () => {
        HW.VFX.resize();
      };

      syncViewport();
      window.addEventListener('resize', () => {
        syncViewport();
        window.scrollTo(0, 0);
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          window.scrollTo(0, 0);
          syncViewport();
        });
      }
      window.addEventListener('orientationchange', () => setTimeout(syncViewport, 150));

      // ボトムシートのオーバーレイ背景タップで閉じる
      const ov = document.getElementById('sheet-overlay');
      if (ov) {
        ov.addEventListener('click', (e) => {
          if (e.target === ov && !HW.Battle.active) {
            HW.DOM.closeSheet();
          }
        });
      }
    }
  };
})();
