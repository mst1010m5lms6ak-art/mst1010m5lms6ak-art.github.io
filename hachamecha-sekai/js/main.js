'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const proto = global.location.protocol;
    const host = global.location.hostname;
    const allowed = proto === 'https:' || host === 'localhost' || host === '127.0.0.1';
    if (!allowed) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      global.location.reload();
    });

    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then((reg) => {
        if (reg && reg.update) reg.update().catch(() => {});
      })
      .catch(() => {});
  }

  async function bootstrap() {
    registerServiceWorker();

    const store = Kairo.store;
    await store.init();

    const canvas = document.getElementById('battle-canvas');
    const vfx = new Kairo.BattleVFX(canvas);
    const battle = new Kairo.BattleEngine(store, vfx);
    const ui = new Kairo.UIRenderer(store, battle);

    Kairo.runtime = { store, vfx, battle, ui };

    battle.onUpdateUI = () => {
      ui.renderDynamicTick();
    };

    store.subscribe((_st, reason) => {
      if (reason === 'battleWin' || reason === 'battleDefeat') {
        ui.renderDynamicTick();
        ui.renderBottomNav();
        if (ui.activeTab === 'battle') ui.renderBottomPanel();
        return;
      }
      ui.renderAll();
    });

    ui.renderAll();
    vfx.resize();
    battle.startStage(store.getState().progress.currentStageId);

    // Show offline return report if applicable
    const offlineRep = store.getPendingOfflineReport();
    if (offlineRep) {
      ui.openModal({ type: 'offline', report: offlineRep });
    } else if (store.isTamperRecovered()) {
      ui.showToast('記録の不整合を検知し、安全なバックアップから復旧しました');
    }

    global.addEventListener('resize', () => vfx.resize(), { passive: true });
    global.addEventListener('orientationchange', () => setTimeout(() => vfx.resize(), 120), { passive: true });

    // Resync offline clock when returning to foreground on iOS PWA
    let lastHiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        lastHiddenAt = Date.now();
      } else if (lastHiddenAt > 0) {
        const evalT = Kairo.security.evaluateOfflineElapsed(lastHiddenAt, Date.now());
        lastHiddenAt = 0;
        if (evalT.elapsedMs >= 120 * 1000 && !ui.modal) {
          const rep = store.buildOfflineReport(evalT.elapsedMs, evalT.capped);
          ui.openModal({ type: 'offline', report: rep });
        }
      }
    });

    // Main animation & simulation loop
    let lastTs = performance.now();
    let hudAccum = 0;
    let playSecAccum = 0;

    function frame(now) {
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(0.065, Math.max(0.001, rawDt));

      battle.update(dt);
      if (ui.activeTab === 'battle') {
        battle.render();
      }

      hudAccum += dt;
      if (hudAccum >= 0.35) {
        hudAccum = 0;
        ui.renderDynamicTick();
      }

      playSecAccum += dt;
      if (playSecAccum >= 5) {
        store.tickPlayTime(5);
        playSecAccum = 0;
      }

      global.requestAnimationFrame(frame);
    }

    global.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window);
