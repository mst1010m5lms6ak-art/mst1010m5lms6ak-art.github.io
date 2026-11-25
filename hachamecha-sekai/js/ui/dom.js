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
      '<span class="cur-pill gold num">G ' + HW.formatNum(sd.gold) + '</span>' +
      '<span class="cur-pill shard num">欠片 ' + HW.formatNum(sd.omniShards) + '</span>' +
      '<span class="cur-pill medal num">闘 ' + HW.formatNum(sd.arenaMedals) + '</span>' +
      '</div>' +
      '</div>'
    );
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
     * iOS Safari / PWA standalone のセーフエリア＆画面ズレ三重防御 + 誤操作防止
     */
    setupMobileGuard: function () {
      // 1. 長押しメニュー・ダブルタップズーム・ピンチズームの完全無効化
      document.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      document.addEventListener('gesturechange', (e) => e.preventDefault());
      document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

      let lastTouchEnd = 0;
      document.addEventListener(
        'touchend',
        (e) => {
          const now = Date.now();
          if (now - lastTouchEnd <= 280) {
            e.preventDefault();
          }
          lastTouchEnd = now;
        },
        { passive: false }
      );

      // 初回タップでWebAudio解禁
      const unlockAudio = () => {
        HW.Audio.unlock();
        window.removeEventListener('pointerdown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });

      // 2. iOS PWA standalone 起動時のセーフエリアめり込み対策
      const syncSafeArea = () => {
        const root = document.documentElement;
        const safeTopEl = document.getElementById('safe-top');
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = Boolean(
          window.navigator.standalone ||
          (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        );

        if (isIOS && isStandalone && safeTopEl) {
          const computedTop = safeTopEl.getBoundingClientRect().height;
          // 一部iOS PWA環境で env(safe-area-inset-top) が 0px になる既知バグを検出して補正
          if (computedTop < 12 && window.screen && window.screen.height >= 812) {
            root.style.setProperty('--safe-top', '47px');
            root.style.setProperty('--safe-bottom', '24px');
          }
        }
        HW.VFX.resize();
      };

      syncSafeArea();
      window.addEventListener('resize', () => {
        syncSafeArea();
        // iOS PWA でキーボード収納後に画面が上へズレっぱなしになるWebKitバグの強制リフロー対策
        window.scrollTo(0, 0);
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          window.scrollTo(0, 0);
          syncSafeArea();
        });
      }
      window.addEventListener('orientationchange', () => setTimeout(syncSafeArea, 150));

      // ボトムシートのオーバーレイ背景タップで閉じる（下半分付近のみ許可でもOK、利便性優先で背景タップ閉じる）
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
