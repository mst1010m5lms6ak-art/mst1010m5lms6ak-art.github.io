(function () {
  'use strict';

  const Hacha = window.Hacha;

  const NAV_ITEMS = [
    { id: 'quest',    label: '出撃', icon: '🗺️' },
    { id: 'party',    label: '編成', icon: '⚔️' },
    { id: 'equip',    label: '装備', icon: '🎒' },
    { id: 'dispatch', label: '派遣', icon: '🧭' },
    { id: 'codex',    label: '図鑑', icon: '📖' },
    { id: 'settings', label: '設定', icon: '⚙️' }
  ];

  let currentScreen = 'quest'; // quest | party | equip | dispatch | codex | settings | battle
  let inBattle = false;

  const topEl = document.getElementById('top-viewport');
  const bottomEl = document.getElementById('bottom-controls');
  const navEl = document.getElementById('bottom-nav');

  const battleController = Hacha.engine.createBattleController({
    onFrame(snap) {
      if (inBattle) Hacha.ui.screenBattle.updateFrame(snap);
    },
    onStateSync(snap) {
      if (inBattle) Hacha.ui.screenBattle.updateFrame(snap);
    },
    onLoopIntermission(loopObj, lastRes) {
      const perfect = lastRes.keptDrops.some((d) => d.item && d.item.quality >= 100);
      Hacha.ui.common.showToast(
        perfect
          ? `👑 極品質ドロップ！ ${loopObj.runs}周完了 → 次周へ`
          : `🔁 ${loopObj.runs}周完了（🪙+${lastRes.coins}）→ 次の周回へ`,
        perfect ? 'gold' : ''
      );
    },
    onFinish(payload) {
      if (payload.isLoopResult) {
        Hacha.ui.screenBattle.showLoopResult(payload.loopSummary, appApi);
      } else {
        Hacha.ui.screenBattle.showNormalResult(payload.result, appApi);
      }
    }
  });

  function renderNav() {
    navEl.innerHTML = NAV_ITEMS.map((item) => {
      const isActive = !inBattle && currentScreen === item.id;
      const locked = inBattle;
      return `
        <button class="nav-btn ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}" data-nav="${item.id}" ${locked ? 'disabled' : ''}>
          <span class="nav-ico">${locked ? '🔒' : item.icon}</span>
          <span>${item.label}</span>
        </button>
      `;
    }).join('');

    navEl.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (inBattle) return; // 戦闘中の他画面移動を完全遮断
        const target = btn.getAttribute('data-nav');
        Hacha.audio.play('tap');
        if (target === currentScreen) {
          /* 選択中タブを再度タップすると先頭サブタブへ即復帰 */
          if (target === 'party' && Hacha.ui.screenParty.resetToMainTab) Hacha.ui.screenParty.resetToMainTab();
          if (target === 'equip' && Hacha.ui.screenEquip.resetEquipTab) Hacha.ui.screenEquip.resetEquipTab();
          if (target === 'codex' && Hacha.ui.screenCodex.resetToMainTab) Hacha.ui.screenCodex.resetToMainTab();
          if (target === 'settings' && Hacha.ui.screenSettings.resetState) Hacha.ui.screenSettings.resetState();
          renderCurrent();
          return;
        }
        if (currentScreen === 'settings' && Hacha.ui.screenSettings.resetState) Hacha.ui.screenSettings.resetState();
        currentScreen = target;
        renderCurrent();
      });
    });
  }

  function renderCurrent() {
    renderNav();
    if (inBattle) return;

    if (currentScreen === 'quest') {
      Hacha.ui.screenQuest.render(topEl, bottomEl, appApi);
    } else if (currentScreen === 'party') {
      Hacha.ui.screenParty.render(topEl, bottomEl, appApi);
    } else if (currentScreen === 'equip') {
      Hacha.ui.screenEquip.renderEquip(topEl, bottomEl, appApi);
    } else if (currentScreen === 'dispatch') {
      Hacha.ui.screenEquip.renderDispatch(topEl, bottomEl, appApi);
    } else if (currentScreen === 'codex') {
      Hacha.ui.screenCodex.render(topEl, bottomEl, appApi);
    } else if (currentScreen === 'settings') {
      Hacha.ui.screenSettings.render(topEl, bottomEl, appApi);
    }
  }

  function launchBattle(stage, enableLoop) {
    if (!stage) return;
    const check = Hacha.engine.stats.checkStageRestriction(Hacha.state, stage);
    if (!check.ok) {
      Hacha.ui.common.showToast(check.reason, 'danger');
      return;
    }
    inBattle = true;
    currentScreen = 'battle';
    renderNav();
    battleController.startBattle(stage, enableLoop);
    Hacha.ui.screenBattle.mountBattleLayout(topEl, bottomEl, battleController.getSnapshot(), battleController, appApi);
  }

  function exitBattleTo(screenId) {
    battleController.stopEngineLoop();
    inBattle = false;
    currentScreen = screenId || 'quest';
    renderCurrent();
  }

  const appApi = {
    renderCurrent,
    launchBattle,
    exitBattleTo,
    isInBattle: () => inBattle
  };

  /* iOS Safari PWA 誤操作防止（ピンチズーム・長押しメニュー抑止。連続タップを殺す touchend 抑止は不使用・CSS touch-action: manipulation でズーム抑止） */
  function installTouchGuards() {
    document.addEventListener('pointerdown', () => Hacha.audio.unlock(), { passive: true });
    document.addEventListener('touchstart', () => Hacha.audio.unlock(), { passive: true });

    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });

    document.addEventListener('contextmenu', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag !== 'TEXTAREA' && tag !== 'INPUT') {
        e.preventDefault();
      }
    });

    window.addEventListener('resize', () => {
      if (inBattle) battleController.vfx.resize();
    });
  }

  /* Service Worker 登録（HTTP/HTTPS環境のみ。updateViaCache:'none' でPWA更新を確実反映） */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => { if (reg && reg.update) reg.update().catch(() => {}); })
        .catch(() => {});
    });
  }

  async function boot() {
    installTouchGuards();
    registerServiceWorker();
    await Hacha.storage.loadSave();
    renderCurrent();
  }

  Hacha.app = appApi;
  boot();
})();
