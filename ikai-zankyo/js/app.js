/* アプリ初期化・高感度タップイベント委譲・PWAオフライン登録・メインコントローラー（改修版） */
(function () {
  'use strict';

  const WDATA = window.__IZ_WORLDS__;
  const EDATA = window.__IZ_EQUIP__;
  const STATE = window.__IZ_STATE__;
  const BATTLE = window.__IZ_BATTLE__;
  const UI = window.__IZ_UI__;
  const AUDIO = window.__IZ_AUDIO__;

  let toastTimer = null;

  const ui = {
    tab: 'quest',
    questSub: 'main',
    selectedWorldId: 'w1',
    selectedStageNum: 1,
    selectedRaidId: 'r1',
    selectedRaidDiff: 0,
    selectedGauntletId: 'g1',
    selectedTowerFloor: 1,
    selectedTrialId: 't1',
    partySub: 'main',
    gauntletTeamIdx: 0,
    selectedPartySlot: 0,
    growSub: 'board',
    selectedCharId: 'c_n_2',
    equipSub: 'wear',
    selectedEquipSlot: 'weapon',
    equipUnownedOnly: false,
    filterEl: 'all',
    filterRole: 'all',
    summonSub: 'gacha',
    lastSummonResults: [],
    codexSub: 'char',
    codexCharId: 'c_ur_1',
    codexEnemyId: 'boss_w1_3',
    codexEquipId: 's_sky',
    resultReport: null,
    lastBattleCfg: null,
    lastBattleAuto: false,
    exportedCode: '',
    confirmReset: false,
    toast: ''
  };

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

    /* 戦闘中操作（倍速・自動周回ON/停止予約のみ・撤退禁止） */
    if (act === 'cycleSpeed') {
      const cur = STATE.getSnapshot().settings.speed;
      const next = cur === 1 ? 2 : (cur === 2 ? 3 : 1);
      STATE.setSpeed(next);
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
        ui.tab = val;
        ui.resultReport = null;
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
          ui.selectedTowerFloor = Math.min(WDATA.TOWER_MAX_FLOOR, STATE.getSnapshot().towerMaxCleared + 1);
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
      case 'selectTower':
        ui.selectedTowerFloor = Number(val);
        break;
      case 'selectTrial':
        ui.selectedTrialId = val;
        break;
      case 'gotoGauntletParty':
        clearToast();
        ui.tab = 'party';
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

      /* 編成 */
      case 'setPartySub':
        ui.partySub = val;
        break;
      case 'setGauntletTeam':
        ui.partySub = 'gauntlet';
        ui.gauntletTeamIdx = Number(val);
        break;
      case 'selectPartySlot':
        ui.selectedPartySlot = Number(val);
        break;
      case 'assignPartyChar': {
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

      /* 育成 */
      case 'setGrowSub':
        clearToast();
        ui.growSub = val;
        break;
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
          showToast(`覚醒${res.awake}へ到達しました`);
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
        if (res.ok) showToast('共鳴リンクを設定しました');
        break;
      }
      case 'clearCharLink':
        STATE.setCharLink(ui.selectedCharId, null);
        showToast('共鳴リンクを解除しました');
        break;

      /* 装備 */
      case 'setEquipSub':
        clearToast();
        ui.equipSub = val;
        break;
      case 'selectEquipChar':
        ui.selectedCharId = val;
        ui.equipSub = 'wear';
        break;
      case 'toggleEquipFilter':
        ui.equipUnownedOnly = !ui.equipUnownedOnly;
        break;
      case 'selectEquipSlot':
        ui.selectedEquipSlot = val;
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
        const res = STATE.buyResourceWithGold(val);
        showToast(res.msg || '交換できません');
        break;
      }

      /* 召喚・交換 */
      case 'setSummonSub':
        clearToast();
        ui.summonSub = val;
        break;
      case 'summon': {
        const res = STATE.doSummon(Number(val));
        if (res.ok) {
          ui.lastSummonResults = res.results;
          const hasHigh = res.results.some((r) => r.rarity === 'SSR' || r.rarity === 'UR');
          AUDIO.play(hasHigh ? 'rare' : 'summon');
          showToast(hasHigh ? '高レアリティの残響が応えました！' : `${res.results.length}体の残響を召喚しました`);
        } else {
          showToast(res.msg);
        }
        break;
      }
      case 'exchangeRaidChar': {
        const res = STATE.exchangeRaidChar(val);
        if (res.ok) {
          AUDIO.play('rare');
          showToast(`${res.result.name} を解放・強化しました！`);
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
      case 'selectCodexEquip':
        ui.codexEquipId = val;
        break;
      case 'toggleSound':
        STATE.setSound(!STATE.getSnapshot().settings.sound);
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
