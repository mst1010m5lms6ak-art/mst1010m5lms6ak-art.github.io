(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};
  HS.UI = HS.UI || {};

  var NAV_TABS = [
    { id: 'battle', icon: '⚔️', label: '戦闘' },
    { id: 'party',  icon: '🛡️', label: '編成' },
    { id: 'growth', icon: '✦',  label: '育成' },
    { id: 'quest',  icon: '🗺️', label: '冒険' },
    { id: 'codex',  icon: '📖', label: '図鑑' }
  ];

  var TAB_TITLES = {
    battle: '戦闘待機',
    party:  '編成・装備',
    growth: '育成・酒場',
    quest:  '冒険・別働隊',
    codex:  '図鑑・設定'
  };

  var BATTLE_MODE_LABELS = {
    stage:     '⚔️ 戦闘中',
    tower:     '🗼 混線タワー',
    superboss: '💥 超ボス計測戦',
    relay:     '🚩 総力戦',
    bounty:    '🎯 指名手配'
  };

  var dom = {
    app: null,
    topHud: null,
    upperStage: null,
    fxLayer: null,
    lowerPanel: null,
    contextBar: null,
    bottomNav: null,
    sheetBackdrop: null,
    bottomSheet: null,
    sheetTitle: null,
    sheetSubtitle: null,
    sheetBody: null,
    sheetActions: null,
    toastStack: null
  };

  var navBtns = {};
  var currentTab = 'battle';
  var currentView = null;
  var sheetOnClose = null;
  var wakeLockSentinel = null;
  var toastTimer = null;
  var booted = false;

  function fmt(n) {
    if (HS.Utils && typeof HS.Utils.formatNum === 'function') return HS.Utils.formatNum(n);
    return Math.round(Number(n) || 0).toLocaleString('ja-JP');
  }

  function h(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function getViewForTab(tabId) {
    if (tabId === 'battle') return HS.UI.BattleView || null;
    if (tabId === 'party')  return HS.UI.PartyView || null;
    if (tabId === 'growth') return HS.UI.GrowthView || null;
    if (tabId === 'quest')  return HS.UI.QuestView || null;
    if (tabId === 'codex')  return HS.UI.CodexView || null;
    return null;
  }

  function findStageSummary(stageId) {
    var areas = (HS.Data && Array.isArray(HS.Data.AREAS)) ? HS.Data.AREAS : [];
    for (var i = 0; i < areas.length; i++) {
      var stages = areas[i].stages || [];
      for (var j = 0; j < stages.length; j++) {
        if (stages[j].id === stageId) {
          var code = stages[j].code || ((i + 1) + '-' + (stages[j].stageNum || (j + 1)));
          return {
            area: areas[i],
            stage: stages[j],
            world: stages[j].world || areas[i].world || 'frontier',
            label: code + ' ' + stages[j].name
          };
        }
      }
    }
    return { area: null, stage: null, world: 'frontier', label: '1-1 旅立ちの歯車草原' };
  }

  // =========================================================================
  // Passive Top HUD (Display-Only — ZERO clickable buttons/inputs/links!)
  // Avoids duplicate stage titles during active battle / result screens!
  // =========================================================================

  function renderTopHud() {
    if (!dom.topHud || !HS.State) return;
    var s = HS.State.get();
    var bState = HS.Battle ? HS.Battle.getState() : null;

    dom.topHud.textContent = '';

    var left = h('div', 'hud-left');
    var locText = TAB_TITLES[currentTab] || 'はちゃめちゃ世界';
    if (currentTab === 'battle' && bState) {
      if (bState.active) {
        if (bState.autoRepeat) {
          locText = bState.stopAfterCurrent ? '🔁 停止予定' : '🔁 自動周回中';
        } else {
          locText = BATTLE_MODE_LABELS[bState.mode] || '⚔️ 戦闘中';
        }
      } else if (bState.phase === 'repeat_result') {
        locText = '🔁 周回リザルト';
      } else if (bState.phase === 'result') {
        locText = '🏆 戦闘リザルト';
      } else {
        locText = '⚔️ 出撃待機';
      }
    }
    left.appendChild(h('span', 'hud-loc', locText));
    dom.topHud.appendChild(left);

    var right = h('div', 'hud-right');

    // Active Battle-Count-Linked Expedition Mini Progress Badges
    var exps = s.expeditions || [];
    for (var i = 0; i < exps.length; i++) {
      var ex = exps[i];
      if (!ex || !ex.routeId || !Array.isArray(ex.charIds) || ex.charIds.length === 0) continue;
      var route = HS.Expedition ? HS.Expedition.getRouteById(ex.routeId) : null;
      var req = (route && (route.battlesRequired || route.requiredBattles)) || 5;
      var exLabel = ex.paused ? '別働 待機' : ('別働 ' + ex.progress + '/' + req);
      right.appendChild(h('span', 'hud-chip hud-exp-chip', exLabel));
    }

    right.appendChild(h('span', 'hud-chip', '🪙 ' + fmt(s.materials.gold || 0)));
    right.appendChild(h('span', 'hud-chip', '💎 ' + fmt(s.materials.chaosShard || 0)));

    dom.topHud.appendChild(right);
  }

  // =========================================================================
  // Battle Tab Lock & Bottom Navigation (5 Tabs)
  // =========================================================================

  function syncBattleLockUI() {
    var locked = Boolean(HS.Battle && typeof HS.Battle.isLocked === 'function' && HS.Battle.isLocked());
    if (dom.app) {
      dom.app.setAttribute('data-battle-active', locked ? 'true' : 'false');
    }
    Object.keys(navBtns).forEach(function (id) {
      var btn = navBtns[id];
      var isTabLocked = locked && id !== 'battle';
      btn.classList.toggle('is-locked', isTabLocked);
      btn.setAttribute('aria-disabled', isTabLocked ? 'true' : 'false');
    });
  }

  function mountBottomNav() {
    if (!dom.bottomNav) return;
    dom.bottomNav.textContent = '';
    navBtns = {};

    for (var i = 0; i < NAV_TABS.length; i++) {
      (function (tab) {
        var btn = h('button', 'nav-btn' + (tab.id === currentTab ? ' is-active' : ''));
        btn.type = 'button';
        btn.setAttribute('data-tab', tab.id);
        btn.appendChild(h('span', 'nav-ico', tab.icon));
        btn.appendChild(h('span', '', tab.label));
        btn.addEventListener('click', function () {
          App.switchTab(tab.id);
        });
        navBtns[tab.id] = btn;
        dom.bottomNav.appendChild(btn);
      })(NAV_TABS[i]);
    }

    syncBattleLockUI();
  }

  // =========================================================================
  // Lower-50% Bottom Sheet (Upper 50% NEVER catches taps in ANY state!)
  // =========================================================================

  function openSheet(opts) {
    opts = opts || {};
    if (!dom.bottomSheet || !dom.sheetBackdrop) return;

    sheetOnClose = typeof opts.onClose === 'function' ? opts.onClose : null;
    if (dom.sheetTitle) dom.sheetTitle.textContent = opts.title || '';
    if (dom.sheetSubtitle) dom.sheetSubtitle.textContent = opts.subtitle || '';
    if (dom.sheetBody) dom.sheetBody.textContent = '';
    if (dom.sheetActions) dom.sheetActions.textContent = '';

    if (typeof opts.renderBody === 'function' && dom.sheetBody) {
      opts.renderBody(dom.sheetBody);
    }
    if (typeof opts.renderActions === 'function' && dom.sheetActions) {
      opts.renderActions(dom.sheetActions);
    }

    if (dom.sheetActions && dom.sheetActions.childNodes.length === 0) {
      var closeBtn = h('button', 'btn btn-ghost', '閉じる');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', closeSheet);
      dom.sheetActions.appendChild(closeBtn);
    }

    dom.sheetBackdrop.classList.remove('hidden');
    dom.bottomSheet.classList.remove('hidden');
  }

  function closeSheet() {
    if (!dom.bottomSheet || !dom.sheetBackdrop) return;
    if (dom.bottomSheet.classList.contains('hidden')) return;
    dom.bottomSheet.classList.add('hidden');
    dom.sheetBackdrop.classList.add('hidden');
    if (dom.sheetBody) dom.sheetBody.textContent = '';
    if (dom.sheetActions) dom.sheetActions.textContent = '';
    var cb = sheetOnClose;
    sheetOnClose = null;
    if (cb) {
      try { cb(); } catch (e) {}
    }
  }

  // Reusable Lower-50% Auto-Sell Configuration Bottom Sheet
  function openAutoSellSheet(onUpdated) {
    function renderAutoSellContent() {
      var s = HS.State.get();
      var cfg = s.autoSell;
      var sellableCount = 0;
      var sellableGold = 0;
      for (var i = 0; i < s.inventory.length; i++) {
        if (HS.State.shouldAutoSell(s.inventory[i], true)) {
          sellableCount++;
          sellableGold += HS.State.getSellValue(s.inventory[i]);
        }
      }

      openSheet({
        title: '自動売却設定',
        subtitle: '対象 ' + sellableCount + '個 (+' + fmt(sellableGold) + 'G)',
        renderBody: function (body) {
          var row1 = h('div', 'setting-row');
          var lbl1 = h('div', 'setting-label');
          lbl1.appendChild(h('span', 'setting-title', '獲得時の自動売却'));
          lbl1.appendChild(h('span', 'setting-desc', '基準品質以下の未保護装備を自動で売却'));
          row1.appendChild(lbl1);
          var tog1 = h('button', 'toggle-btn' + (cfg.enabled ? ' is-on' : ''), cfg.enabled ? 'ON' : 'OFF');
          tog1.type = 'button';
          tog1.addEventListener('click', function () {
            HS.State.updateAutoSell({ enabled: !cfg.enabled });
            if (onUpdated) onUpdated();
            renderAutoSellContent();
          });
          row1.appendChild(tog1);
          body.appendChild(row1);

          var thGrid = h('div', 'threshold-grid');
          var presets = [
            { q: 39, label: '39以下(並)' },
            { q: 69, label: '69以下(良)' },
            { q: 89, label: '89以下(優)' },
            { q: 99, label: '99以下(秀)' }
          ];
          for (var p = 0; p < presets.length; p++) {
            (function (pr) {
              var pBtn = h('button', 'btn btn-compact' + (cfg.maxQualityToSell === pr.q ? ' is-active' : ''), pr.label);
              pBtn.type = 'button';
              pBtn.addEventListener('click', function () {
                HS.State.updateAutoSell({ maxQualityToSell: pr.q });
                if (onUpdated) onUpdated();
                renderAutoSellContent();
              });
              thGrid.appendChild(pBtn);
            })(presets[p]);
          }
          body.appendChild(thGrid);

          var row3 = h('div', 'setting-row');
          var lbl3 = h('div', 'setting-label');
          lbl3.appendChild(h('span', 'setting-title', '👑極(品質100)を必ず保護'));
          lbl3.appendChild(h('span', 'setting-desc', '最高品質の装備は絶対に売却しない'));
          row3.appendChild(lbl3);
          var tog3 = h('button', 'toggle-btn' + (cfg.protectMaxQuality ? ' is-on' : ''), cfg.protectMaxQuality ? '保護ON' : 'OFF');
          tog3.type = 'button';
          tog3.addEventListener('click', function () {
            HS.State.updateAutoSell({ protectMaxQuality: !cfg.protectMaxQuality });
            if (onUpdated) onUpdated();
            renderAutoSellContent();
          });
          row3.appendChild(tog3);
          body.appendChild(row3);
        },
        renderActions: function (actions) {
          var bulkBtn = h('button', 'btn btn-warn', sellableCount > 0 ? ('一括売却 (' + sellableCount + '個 / +' + fmt(sellableGold) + 'G)') : '売却対象なし');
          bulkBtn.type = 'button';
          bulkBtn.disabled = sellableCount === 0;
          bulkBtn.addEventListener('click', function () {
            var r = HS.State.bulkAutoSell();
            if (r.soldCount > 0) {
              showToast('装備 ' + r.soldCount + '個を売却 (+' + fmt(r.totalGold) + 'G)', 'good');
            } else {
              showToast('売却対象の装備はありません', 'info');
            }
            if (onUpdated) onUpdated();
            renderAutoSellContent();
          });
          actions.appendChild(bulkBtn);

          var closeBtn = h('button', 'btn btn-ghost', '閉じる');
          closeBtn.type = 'button';
          closeBtn.addEventListener('click', closeSheet);
          actions.appendChild(closeBtn);
        }
      });
    }

    renderAutoSellContent();
  }

  // =========================================================================
  // Toast Notification — Latest-1 Slim Single-Line Seam Banner
  // Auto-clears on tab switch & battle state transitions!
  // =========================================================================

  function clearToast() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (dom.toastStack) {
      dom.toastStack.textContent = '';
    }
  }

  function showToast(msg, kind) {
    if (!dom.toastStack || !msg) return;
    clearToast();

    var cls = 'toast';
    if (kind === 'warn') cls += ' toast-warn';
    else if (kind === 'good' || kind === 'success') cls += ' toast-good';
    else if (kind === 'error' || kind === 'danger') cls += ' toast-error';

    var node = h('div', cls, String(msg));
    dom.toastStack.appendChild(node);

    toastTimer = setTimeout(function () {
      toastTimer = null;
      if (dom.toastStack) dom.toastStack.textContent = '';
    }, 2000);
  }

  // =========================================================================
  // Screen Wake Lock Helper (Modern Mobile & Desktop Browsers)
  // =========================================================================

  function isWakeLockSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.wakeLock && typeof navigator.wakeLock.request === 'function');
  }

  function acquireWakeLock() {
    if (!isWakeLockSupported()) return Promise.resolve(false);
    if (wakeLockSentinel) return Promise.resolve(true);
    return navigator.wakeLock.request('screen').then(function (sentinel) {
      wakeLockSentinel = sentinel;
      sentinel.addEventListener('release', function () {
        wakeLockSentinel = null;
      });
      return true;
    }).catch(function () {
      wakeLockSentinel = null;
      return false;
    });
  }

  function releaseWakeLock() {
    if (!wakeLockSentinel) return Promise.resolve();
    var prev = wakeLockSentinel;
    wakeLockSentinel = null;
    return prev.release().catch(function () {});
  }

  function setWakeLock(enabled) {
    var on = Boolean(enabled);
    if (HS.State) HS.State.updateSettings({ wakeLock: on });
    if (on) {
      if (!isWakeLockSupported()) {
        showToast('この端末はスリープ防止未対応です', 'warn');
        return Promise.resolve(false);
      }
      return acquireWakeLock().then(function (ok) {
        showToast(ok ? 'スリープ防止をONにしました' : 'スリープ防止を取得できませんでした', ok ? 'good' : 'warn');
        return ok;
      });
    }
    return releaseWakeLock().then(function () {
      showToast('スリープ防止をOFFにしました', 'info');
      return false;
    });
  }

  function toggleWakeLock() {
    var cur = Boolean(HS.State && HS.State.get().settings.wakeLock);
    return setWakeLock(!cur);
  }

  // =========================================================================
  // Mobile Safari Touch Guards & Safe Service Worker Registration
  // =========================================================================

  function registerMobileGuards() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.addEventListener('gesturestart', function (e) {
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('scroll', function () {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && HS.State && HS.State.get().settings.wakeLock) {
        acquireWakeLock();
      }
    });
  }

  function registerServiceWorkerSafely() {
    if (typeof navigator === 'undefined' || typeof location === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:' || global.Capacitor) return;
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {
      // Non-fatal on unsupported local origins
    });
  }

  // =========================================================================
  // App Controller API
  // =========================================================================

  var App = {
    boot: function () {
      if (booted) return Promise.resolve();
      booted = true;

      dom.app = document.getElementById('app');
      dom.topHud = document.getElementById('top-hud');
      dom.upperStage = document.getElementById('upper-stage');
      dom.fxLayer = document.getElementById('fx-layer');
      dom.lowerPanel = document.getElementById('lower-panel');
      dom.contextBar = document.getElementById('context-bar');
      dom.bottomNav = document.getElementById('bottom-nav');
      dom.sheetBackdrop = document.getElementById('sheet-backdrop');
      dom.bottomSheet = document.getElementById('bottom-sheet');
      dom.sheetTitle = document.getElementById('sheet-title');
      dom.sheetSubtitle = document.getElementById('sheet-subtitle');
      dom.sheetBody = document.getElementById('sheet-body');
      dom.sheetActions = document.getElementById('sheet-actions');
      dom.toastStack = document.getElementById('toast-stack');

      // Strictly enforce lower-50% dismiss only (CSS top:50% + JS clientY guard!)
      if (dom.sheetBackdrop) {
        dom.sheetBackdrop.addEventListener('click', function (e) {
          if (e && typeof e.clientY === 'number' && typeof global.innerHeight === 'number' && global.innerHeight > 0) {
            if (e.clientY < global.innerHeight * 0.5) return;
          }
          closeSheet();
        });
      }

      registerMobileGuards();
      registerServiceWorkerSafely();

      var storageInit = (HS.Storage && typeof HS.Storage.init === 'function')
        ? Promise.resolve(HS.Storage.init()).catch(function () {})
        : Promise.resolve();

      return storageInit.then(function () {
        return HS.State.init();
      }).then(function () {
        if (HS.Anim) {
          HS.Anim.initFxLayer(dom.fxLayer);
          var stInfo = findStageSummary(HS.State.get().progress.selectedStageId);
          HS.Anim.setWorldTheme(stInfo.world);
        }

        mountBottomNav();
        renderTopHud();

        HS.State.subscribe('materials:change', renderTopHud);
        HS.State.subscribe('expedition:change', renderTopHud);
        HS.State.subscribe('progress:change', renderTopHud);
        HS.State.subscribe('state:reset', function () {
          renderTopHud();
          App.refreshCurrentView();
          showToast('セーブデータを初期化しました', 'info');
        });
        HS.State.subscribe('state:import', function () {
          renderTopHud();
          App.refreshCurrentView();
          showToast('セーブデータを読み込みました', 'good');
        });

        if (HS.Battle && typeof HS.Battle.subscribe === 'function') {
          HS.Battle.subscribe('battle:start', function () {
            clearToast();
            syncBattleLockUI();
            closeSheet();
            if (currentTab !== 'battle') {
              App.switchTab('battle', { force: true });
            } else {
              renderTopHud();
            }
          });
          HS.Battle.subscribe('battle:complete', function () {
            clearToast();
            syncBattleLockUI();
            renderTopHud();
          });
          HS.Battle.subscribe('battle:repeatComplete', function () {
            clearToast();
            syncBattleLockUI();
            renderTopHud();
          });
          HS.Battle.subscribe('battle:retreat', function () {
            clearToast();
            syncBattleLockUI();
            renderTopHud();
          });
          HS.Battle.subscribe('battle:idle', function () {
            clearToast();
            syncBattleLockUI();
            renderTopHud();
          });
          HS.Battle.subscribe('battle:runWon', renderTopHud);
        }

        App.switchTab('battle', { force: true });

        if (HS.Anim) HS.Anim.startLoop();
      });
    },

    switchTab: function (tabId, opts) {
      opts = opts || {};
      var valid = false;
      for (var i = 0; i < NAV_TABS.length; i++) {
        if (NAV_TABS[i].id === tabId) { valid = true; break; }
      }
      if (!valid) return false;

      if (!opts.force && tabId !== 'battle' && HS.Battle && HS.Battle.isLocked()) {
        showToast('戦闘中は移動できません（停止または撤退）', 'warn');
        return false;
      }

      if (tabId === currentTab && currentView && !opts.force) {
        return true;
      }

      clearToast();
      closeSheet();

      if (currentView && typeof currentView.unmount === 'function') {
        try { currentView.unmount(); } catch (err) {
          if (typeof console !== 'undefined' && console.error) console.error('[HS.UI.App] unmount error:', err);
        }
      }

      currentTab = tabId;
      if (dom.app) dom.app.setAttribute('data-tab', tabId);

      Object.keys(navBtns).forEach(function (id) {
        navBtns[id].classList.toggle('is-active', id === tabId);
      });

      if (dom.upperStage) dom.upperStage.textContent = '';
      if (dom.lowerPanel) dom.lowerPanel.textContent = '';
      if (dom.contextBar) dom.contextBar.textContent = '';

      currentView = getViewForTab(tabId);
      if (currentView && typeof currentView.mount === 'function') {
        currentView.mount(dom.upperStage, dom.lowerPanel, dom.contextBar);
      } else if (dom.lowerPanel) {
        dom.lowerPanel.appendChild(h('div', 'empty-state', '画面を読み込み中です…'));
      }

      syncBattleLockUI();
      renderTopHud();
      return true;
    },

    startBattle: function (config) {
      if (!HS.Battle || typeof HS.Battle.startBattle !== 'function') {
        return { ok: false, error: '戦闘準備が完了していません' };
      }
      var res = HS.Battle.startBattle(config || {});
      if (!res.ok) {
        showToast(res.error || '出撃できませんでした', 'warn');
        return res;
      }
      if (currentTab !== 'battle') {
        App.switchTab('battle', { force: true });
      }
      return res;
    },

    refreshCurrentView: function () {
      renderTopHud();
      syncBattleLockUI();
      if (currentView && typeof currentView.render === 'function') {
        currentView.render();
      }
    },

    getCurrentTab: function () {
      return currentTab;
    },

    getElements: function () {
      return dom;
    },

    renderTopHud: renderTopHud,
    syncBattleLockUI: syncBattleLockUI,
    openSheet: openSheet,
    closeSheet: closeSheet,
    openAutoSellSheet: openAutoSellSheet,
    showToast: showToast,
    clearToast: clearToast,
    setWakeLock: setWakeLock,
    toggleWakeLock: toggleWakeLock,
    isWakeLockSupported: isWakeLockSupported,
    isWakeLockActive: function () { return Boolean(wakeLockSentinel); }
  };

  HS.UI.App = App;
  HS.App = App;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        App.boot();
      });
    } else {
      App.boot();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
