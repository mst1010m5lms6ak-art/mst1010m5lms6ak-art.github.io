/* アプリ初期化・iOS PWA安全域補正・召喚演出制御・高感度タップイベント委譲コントローラー */
(function () {
  'use strict';

  const WDATA = window.__IZ_WORLDS__;
  const EDATA = window.__IZ_EQUIP__;
  const STATE = window.__IZ_STATE__;
  const BATTLE = window.__IZ_BATTLE__;
  const UI = window.__IZ_UI__;
  const AUDIO = window.__IZ_AUDIO__;

  let toastTimer = null;
  let summonAnimTimers = [];

  const ui = {
    tab: 'quest',
    questSub: 'main',
    selectedWorldId: 'w1',
    selectedStageNum: 1,
    selectedRaidId: 'r2',
    selectedRaidDiff: 0,
    selectedGauntletId: 'g1',
    selectedTowerFloor: 1,
    selectedTowerBand: 0,
    selectedTrialId: 't1',
    charSub: 'party',
    partySub: 'main',
    gauntletTeamIdx: 0,
    selectedPartySlot: 0,
    selectedCharId: 'c_n_2',
    equipSub: 'wear',
    selectedEquipSlot: 'weapon',
    selectedCraftSeries: 's_lim_flame',
    equipUnownedOnly: false,
    filterEl: 'all',
    filterRole: 'all',
    summonSub: 'gacha',
    selectedExchangeCharId: 'c_ur_ignis',
    lastSummonResults: [],
    lastSummonTopRar: 'N',
    summonAnim: null,
    codexSub: 'char',
    codexCharId: 'c_ur_ignis',
    codexEnemyId: 'en_w2_1',
    codexEnemyKind: 'all',
    codexEnemyEl: 'all',
    codexEquipSlot: 'all',
    codexEquipPartKey: 's_sky:weapon',
    resultReport: null,
    lastBattleCfg: null,
    lastBattleAuto: false,
    exportedCode: '',
    confirmReset: false,
    toast: ''
  };

  /* iPhone PWAスタンドアロン時の下部謎余白＆上部見切れを実測値で完全防止 */
  function syncIosSafeAreaGuard() {
    const root = document.documentElement;
    const shell = document.getElementById('app-shell');
    if (!shell) return;
    const isStandalone = window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    const isTouchPhone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isIphone = /iPhone|iPod/i.test(navigator.userAgent);
    const isNotchIphone = isIphone && Math.max(window.screen.width, window.screen.height) >= 812;

    if (!isStandalone || !isTouchPhone || !isIphone) return;

    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
    document.body.appendChild(probe);
    const cs = window.getComputedStyle(probe);
    const topPx = parseFloat(cs.paddingTop) || 0;
    const bottomPx = parseFloat(cs.paddingBottom) || 0;
    probe.remove();

    const screenH = Math.max(window.screen.width, window.screen.height);
    const innerH = window.innerHeight || screenH;

    /* WebKitのstatusBar分高さ欠損（下部謎余白）を検知した場合のみ実画面高へ補正 */
    if (topPx >= 20 && innerH < screenH - 20 && (innerH + topPx) <= (screenH + 4)) {
      root.style.setProperty('--app-vh', `${screenH}px`);
      shell.style.setProperty('--safe-top-min', '4px');
      shell.style.setProperty('--safe-top-pad', topPx >= 40 ? '6px' : '0px');
    } else {
      root.style.setProperty('--app-vh', '100dvh');
      /* blackモード等でOSがステータスバーを外出し済み(topPx=0)のときは二重余白を作らない */
      shell.style.setProperty('--safe-top-min', '4px');
      shell.style.setProperty('--safe-top-pad', topPx >= 40 ? '6px' : '0px');
    }

    /* ホームバー領域：cold-start未解決時のみ34px保護、解決済みならenv()値をそのまま適用 */
    if (isNotchIphone && bottomPx < 10) {
      shell.style.setProperty('--safe-bottom-min', '34px');
    } else {
      shell.style.setProperty('--safe-bottom-min', '4px');
    }
  }

  function clearToast() {
    ui.toast = '';
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function showToast(msg) {
    ui.toast = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      ui.toast = '';
      if (!BATTLE.isActive()) UI.renderFull(ui);
    }, 1700);
  }

  function clearSummonAnimTimers() {
    summonAnimTimers.forEach((t) => clearTimeout(t));
    summonAnimTimers = [];
  }

  function finishSummonAnim(silent) {
    clearSummonAnimTimers();
    if (!ui.summonAnim) return;
    const topRar = ui.lastSummonTopRar;
    ui.summonAnim = null;
    if (!silent) {
      const msg = topRar === 'UR'
        ? 'URの残響が降臨しました！'
        : (topRar === 'SSR' ? 'SSRの残響が応えました！' : `${ui.lastSummonResults.length}体の残響を召喚しました`);
      showToast(msg);
    }
    if (!BATTLE.isActive()) UI.renderFull(ui);
  }

  function startSummonAnimation(results, highestRarity) {
    clearSummonAnimTimers();
    ui.lastSummonResults = results;
    ui.lastSummonTopRar = highestRarity;
    ui.summonAnim = {
      phase: 'charging',
      highestRarity,
      revealedCount: 0
    };
    AUDIO.play('summonCharge');
    UI.renderFull(ui);

    const chargeTimer = setTimeout(() => {
      if (!ui.summonAnim) return;
      ui.summonAnim.phase = 'reveal';
      ui.summonAnim.revealedCount = 1;
      AUDIO.play(highestRarity === 'UR' ? 'summonUR' : (highestRarity === 'SSR' ? 'rare' : 'summon'));
      UI.renderFull(ui);

      if (results.length <= 1) {
        summonAnimTimers.push(setTimeout(() => finishSummonAnim(false), 320));
        return;
      }

      for (let i = 2; i <= results.length; i++) {
        summonAnimTimers.push(setTimeout(() => {
          if (!ui.summonAnim) return;
          ui.summonAnim.revealedCount = i;
          UI.renderFull(ui);
          if (i === results.length) {
            summonAnimTimers.push(setTimeout(() => finishSummonAnim(false), 260));
          }
        }, (i - 1) * 95));
      }
    }, 540);
    summonAnimTimers.push(chargeTimer);
  }

  function buildBattleConfig() {
    const snap = STATE.getSnapshot();
    if (ui.questSub === 'main') {
      return { ok: true, cfg: { mode: 'main', worldId: ui.selectedWorldId, stageNum: ui.selectedStageNum, partyIds: snap.party.slice() } };
    }
    if (ui.questSub === 'raid') {
      return { ok: true, cfg: { mode: 'raid', raidId: ui.selectedRaidId, diffIdx: ui.selectedRaidDiff, partyIds: snap.party.slice() } };
    }
    if (ui.questSub === 'gauntlet') {
      const teams = snap.gauntletParties;
      if (teams.some((t) => t.filter(Boolean).length === 0)) {
        return { ok: false, msg: '第1〜第3部隊すべてに最低1人必要です（「3部隊おまかせ」可）' };
      }
      return { ok: true, cfg: { mode: 'gauntlet', gauntletId: ui.selectedGauntletId } };
    }
    if (ui.questSub === 'tower') {
      return { ok: true, cfg: { mode: 'tower', floor: ui.selectedTowerFloor, partyIds: snap.party.slice() } };
    }
    if (ui.questSub === 'trial') {
      const tr = WDATA.TRIALS.find((t) => t.id === ui.selectedTrialId);
      const check = STATE.checkTrialRule(tr, snap.party);
      if (!check.ok) return { ok: false, msg: `条件未達：${check.reason}` };
      return { ok: true, cfg: { mode: 'trial', trialId: ui.selectedTrialId, partyIds: snap.party.slice() } };
    }
    return { ok: false, msg: '出撃先を選択してください' };
  }

  function launchBattle(cfg, autoLoop) {
    clearToast();
    finishSummonAnim(true);
    ui.resultReport = null;
    ui.lastBattleCfg = cfg;
    ui.lastBattleAuto = Boolean(autoLoop);
    UI.resetBattleDomCache();

    const upperEl = document.getElementById('upper-display');
    const lowerEl = document.getElementById('lower-control');
    BATTLE.start(
      cfg,
      autoLoop,
      (sess) => {
        UI.renderBattle(sess, upperEl, lowerEl);
      },
      (report) => {
        ui.resultReport = report;
        if (report.cfg.mode === 'tower' && report.lastWon) {
          const maxNext = Math.min(WDATA.TOWER_MAX_FLOOR, STATE.getSnapshot().towerMaxCleared + 1);
          ui.selectedTowerFloor = maxNext;
          ui.selectedTowerBand = Math.floor((maxNext - 1) / 10);
        }
        UI.renderFull(ui);
      }
    );
    UI.renderFull(ui);
  }

  function handleAction(btn) {
    const act = btn.dataset.act;
    const val = btn.dataset.val;
    if (!act) return;

    AUDIO.unlock();
    AUDIO.play('tap');

    /* 戦闘中操作（倍速・自動周回ON/停止予約のみ・撤退なし） */
    if (act === 'cycleSpeed') {
      const cur = STATE.getBattleSpeed();
      const next = cur === 1 ? 2 : (cur === 2 ? 3 : 1);
      STATE.setSpeed(next);
      BATTLE.forceUpdate();
      return;
    }
    if (act === 'toggleAutoLoop') {
      BATTLE.toggleAutoLoop();
      return;
    }

    if (BATTLE.isActive()) return;

    ui.confirmReset = (act === 'resetSave') ? ui.confirmReset : false;

    switch (act) {
      case 'setTab':
        clearToast();
        finishSummonAnim(true);
        /* タブ切り替え時は必ず召喚陣表示へリセット */
        ui.lastSummonResults = [];
        ui.tab = val;
        if (btn.dataset.sub) ui.charSub = btn.dataset.sub;
        ui.resultReport = null;
        break;
      case 'setCharSub':
        clearToast();
        ui.charSub = val;
        break;
      case 'setFilterEl':
        ui.filterEl = val;
        break;
      case 'setFilterRole':
        ui.filterRole = val;
        break;
      case 'setQuestSub':
        clearToast();
        ui.questSub = val;
        if (val === 'tower') {
          const nextF = Math.min(WDATA.TOWER_MAX_FLOOR, STATE.getSnapshot().towerMaxCleared + 1);
          ui.selectedTowerFloor = nextF;
          ui.selectedTowerBand = Math.floor((nextF - 1) / 10);
        }
        break;
      case 'selectWorld':
        ui.selectedWorldId = val;
        ui.selectedStageNum = 1;
        break;
      case 'selectStage':
        ui.selectedStageNum = Number(val);
        break;
      case 'selectRaid':
        ui.selectedRaidId = val;
        break;
      case 'selectRaidDiff':
        ui.selectedRaidDiff = Number(val);
        break;
      case 'selectGauntlet':
        ui.selectedGauntletId = val;
        break;
      case 'selectTowerBand': {
        const b = Number(val);
        ui.selectedTowerBand = b;
        const maxAvail = Math.min(WDATA.TOWER_MAX_FLOOR, STATE.getSnapshot().towerMaxCleared + 1);
        ui.selectedTowerFloor = Math.min(maxAvail, (b + 1) * 10);
        break;
      }
      case 'selectTower':
        ui.selectedTowerFloor = Number(val);
        break;
      case 'selectTrial':
        ui.selectedTrialId = val;
        break;
      case 'gotoGauntletParty':
        clearToast();
        ui.tab = 'char';
        ui.charSub = 'party';
        ui.partySub = 'gauntlet';
        ui.gauntletTeamIdx = 0;
        break;
      case 'autoFillGauntlet': {
        const res = STATE.autoFillGauntletParties();
        if (res.ok) {
          AUDIO.play('rare');
          showToast(`所持上位${res.count}人を3部隊へ自動編成しました`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'startBattle': {
        const built = buildBattleConfig();
        if (!built.ok) {
          showToast(built.msg);
        } else {
          launchBattle(built.cfg, btn.dataset.auto === '1');
          return;
        }
        break;
      }
      case 'closeResult':
        clearToast();
        ui.resultReport = null;
        break;
      case 'retryBattle':
        if (ui.lastBattleCfg) {
          launchBattle(ui.lastBattleCfg, ui.lastBattleAuto);
          return;
        }
        ui.resultReport = null;
        break;

      /* 編成（キャラ統合タブ内：選択枠・配置キャラを育成対象へ自動同期） */
      case 'setPartySub':
        ui.partySub = val;
        break;
      case 'setGauntletTeam':
        ui.partySub = 'gauntlet';
        ui.gauntletTeamIdx = Number(val);
        break;
      case 'selectPartySlot': {
        ui.selectedPartySlot = Number(val);
        const snap = STATE.getSnapshot();
        const tp = ui.partySub === 'main' ? snap.party : snap.gauntletParties[ui.gauntletTeamIdx];
        if (tp[ui.selectedPartySlot]) ui.selectedCharId = tp[ui.selectedPartySlot];
        break;
      }
      case 'assignPartyChar': {
        ui.selectedCharId = val;
        const res = ui.partySub === 'main'
          ? STATE.setPartySlot(ui.selectedPartySlot, val)
          : STATE.setGauntletSlot(ui.gauntletTeamIdx, ui.selectedPartySlot, val);
        if (res.ok) {
          ui.selectedPartySlot = (ui.selectedPartySlot + 1) % 4;
        } else if (res.msg) {
          showToast(res.msg);
        }
        break;
      }
      case 'clearPartySlot': {
        const res = ui.partySub === 'main'
          ? STATE.setPartySlot(ui.selectedPartySlot, null)
          : STATE.setGauntletSlot(ui.gauntletTeamIdx, ui.selectedPartySlot, null);
        if (!res.ok && res.msg) showToast(res.msg);
        break;
      }

      /* 育成（キャラ統合タブ内） */
      case 'selectChar':
        ui.selectedCharId = val;
        break;
      case 'unlockBoard': {
        const res = STATE.unlockBoardNode(ui.selectedCharId, val);
        if (res.ok) {
          AUDIO.play('rare');
          showToast(`「${res.node.name}」を解放しました`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'awakeChar': {
        const res = STATE.awakeWithSoul(ui.selectedCharId);
        if (res.ok) {
          AUDIO.play('rare');
          showToast(`覚醒 ${res.awake} へ到達しました`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'toggleAbility': {
        const res = STATE.toggleCharAbility(ui.selectedCharId, val);
        if (res.ok) showToast(res.action === 'equipped' ? 'アビリティを装着しました' : 'アビリティを外しました');
        break;
      }
      case 'setCharLink': {
        const res = STATE.setCharLink(ui.selectedCharId, val);
        if (res.ok) showToast('共鳴を設定しました');
        break;
      }
      case 'clearCharLink':
        STATE.setCharLink(ui.selectedCharId, null);
        showToast('共鳴を解除しました');
        break;

      /* 装備 */
      case 'setEquipSub':
        clearToast();
        ui.equipSub = val;
        break;
      case 'toggleEquipFilter':
        ui.equipUnownedOnly = !ui.equipUnownedOnly;
        break;
      case 'selectEquipSlot':
        ui.selectedEquipSlot = val;
        break;
      case 'selectCraftSeries':
        ui.selectedCraftSeries = val;
        break;
      case 'equipItem':
        STATE.equipItem(ui.selectedCharId, val);
        showToast('装備を装着しました');
        break;
      case 'unequipSlot':
        STATE.unequipSlot(ui.selectedCharId, val);
        showToast('装備を外しました');
        break;
      case 'autoEquipChar': {
        const res = STATE.autoEquipChar(ui.selectedCharId);
        if (res.changed > 0) {
          AUDIO.play('rare');
          showToast(`最適装備を${res.changed}部位装着しました`);
        } else {
          showToast('更新可能な未装着装備がありません');
        }
        break;
      }
      case 'toggleEquipLock':
        STATE.toggleEquipLock(val);
        break;
      case 'setAutoSell':
        STATE.setAutoSellQuality(Number(val));
        showToast('自動売却設定を更新しました');
        break;
      case 'cycleAutoSellQuick': {
        const cur = STATE.getSnapshot().settings.autoSellMaxQuality;
        const next = cur >= 3 ? -1 : cur + 1;
        STATE.setAutoSellQuality(next);
        const lbl = next < 0 ? 'OFF' : EDATA.QUALITIES[next].name + '以下';
        showToast(`自動売却：${lbl} に変更しました`);
        break;
      }
      case 'bulkSell': {
        const res = STATE.bulkSellEquips(Number(val));
        if (res.soldCount > 0) {
          AUDIO.play('rare');
          showToast(`${res.soldCount}個を一括売却（金貨 +${res.totalGold}）`);
        } else {
          showToast('売却対象の装備がありません');
        }
        break;
      }
      case 'craftEquip': {
        const res = STATE.craftLimitedEquip(btn.dataset.series, btn.dataset.slot);
        ui.selectedCraftSeries = btn.dataset.series;
        if (res.ok) {
          AUDIO.play('rare');
          const qName = EDATA.QUALITIES[res.equip.quality].name;
          const ser = EDATA.SERIES_MAP[res.equip.seriesId];
          showToast(`限定装備「${qName}・${ser.partNames[res.equip.slotId]}」を製作！`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'buyGold': {
        const times = Number(btn.dataset.times || 1);
        const res = STATE.buyResourceWithGold(val, times);
        showToast(res.msg || '交換できません');
        break;
      }

      /* 召喚・限定解放・覇王降臨・魂晶交換 */
      case 'setSummonSub':
        clearToast();
        finishSummonAnim(true);
        ui.lastSummonResults = [];
        ui.summonSub = val;
        if (val === 'raidChar') ui.selectedExchangeCharId = 'c_ur_1';
        if (val === 'raidBoss') ui.selectedExchangeCharId = 'c_ur_ignis';
        break;
      case 'clearSummonResults':
        finishSummonAnim(true);
        ui.lastSummonResults = [];
        break;
      case 'summon': {
        const res = STATE.doSummon(Number(val));
        if (res.ok) {
          startSummonAnimation(res.results, res.highestRarity);
          return;
        }
        showToast(res.msg);
        break;
      }
      case 'skipSummonAnim':
        finishSummonAnim(false);
        return;
      case 'previewExchangeChar':
        ui.selectedExchangeCharId = val;
        break;
      case 'exchangeRaidChar': {
        ui.selectedExchangeCharId = val;
        const res = STATE.exchangeRaidChar(val);
        if (res.ok) {
          AUDIO.play('rare');
          showToast(res.result.status === 'convert'
            ? `${res.result.name} を魂晶+${res.result.gainSoul}・結晶+${res.result.gainCry}へ変換！`
            : `${res.result.name} を解放しました！`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'exchangeRaidBoss': {
        ui.selectedExchangeCharId = val;
        const res = STATE.exchangeRaidBoss(val);
        if (res.ok) {
          AUDIO.play('summonUR');
          showToast(res.result.status === 'convert'
            ? `UR「${res.result.name}」を魂晶+${res.result.gainSoul}・結晶+${res.result.gainCry}へ変換！`
            : `UR「${res.result.name}」が降臨しました！`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'buyAbility': {
        const res = STATE.unlockAbility(val);
        if (res.ok) {
          AUDIO.play('rare');
          showToast(`アビリティ「${res.ab.name}」を解放しました`);
        } else {
          showToast(res.msg);
        }
        break;
      }

      /* 図鑑・設定 */
      case 'setCodexSub':
        clearToast();
        ui.codexSub = val;
        break;
      case 'selectCodexChar':
        ui.codexCharId = val;
        break;
      case 'selectCodexEnemy':
        ui.codexEnemyId = val;
        break;
      case 'setCodexEnemyKind':
        ui.codexEnemyKind = val;
        break;
      case 'setCodexEnemyEl':
        ui.codexEnemyEl = val;
        break;
      case 'selectCodexEquip':
        ui.codexEquipPartKey = val;
        break;
      case 'setCodexEquipSlot':
        ui.codexEquipSlot = val;
        break;
      case 'toggleSound':
        STATE.setSound(!STATE.getSnapshot().settings.sound);
        break;
      case 'setBattleSpeed':
        STATE.setSpeed(Number(val));
        showToast(`戦闘速度を ×${Number(val)} に設定しました`);
        break;
      case 'exportCode': {
        const code = STATE.exportCode();
        ui.exportedCode = code;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(
            () => showToast('引き継ぎコードをコピーしました'),
            () => showToast('引き継ぎコードを発行しました')
          );
        } else {
          showToast('引き継ぎコードを発行しました');
        }
        break;
      }
      case 'importCode': {
        const inp = document.getElementById('transfer-input');
        const code = inp ? inp.value : '';
        const res = STATE.importCode(code);
        showToast(res.msg);
        break;
      }
      case 'resetSave':
        if (!ui.confirmReset) {
          ui.confirmReset = true;
          showToast('もう一度タップするとデータを初期化します');
        } else {
          ui.confirmReset = false;
          finishSummonAnim(true);
          STATE.resetAllData();
          ui.lastSummonResults = [];
          ui.resultReport = null;
          ui.exportedCode = '';
          showToast('セーブデータを初期化しました');
        }
        break;
      default:
        break;
    }

    UI.renderFull(ui);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function boot() {
    syncIosSafeAreaGuard();
    setTimeout(syncIosSafeAreaGuard, 220);
    window.addEventListener('resize', syncIosSafeAreaGuard);
    window.addEventListener('orientationchange', () => setTimeout(syncIosSafeAreaGuard, 180));
    window.addEventListener('focusout', () => setTimeout(syncIosSafeAreaGuard, 120));

    STATE.init();
    const notice = STATE.consumeLoadNotice();
    if (notice) showToast(notice);

    /* 下半分のみのイベント委譲（上半分は物理的にも操作不可） */
    const lowerEl = document.getElementById('lower-control');
    lowerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn || btn.disabled) return;
      handleAction(btn);
    });

    /* ピンチズーム・ダブルタップズーム抑止 */
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });

    registerServiceWorker();
    UI.renderFull(ui);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
