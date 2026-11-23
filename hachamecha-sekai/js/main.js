/* ==========================================================================
   main.js - アプリ起動・PWA登録・親指操作イベント統合・戦闘中ナビロック・ループ
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  const NAV_ITEMS = [
    { id: 'battle', label: '出撃' },
    { id: 'party',  label: '編成' },
    { id: 'units',  label: '育成' },
    { id: 'gear',   label: '装備' },
    { id: 'codex',  label: '図鑑' },
    { id: 'world',  label: '記録' }
  ];

  let activeSheet = null; // { kind, data }
  let toastTimer = null;
  let lastFrameAt = 0;
  let hudAccum = 0;

  function showToast(msg, warn) {
    const box = document.getElementById('toast-box');
    if (!box) return;
    box.innerHTML = `<div class="toast-item ${warn ? 'warn' : ''}">${HS.UTIL.escHtml(msg)}</div>`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.innerHTML = ''; }, 2100);
  }

  function renderTopBar() {
    const el = document.getElementById('top-bar');
    if (!el || !HS.STATE.data) return;
    const r = HS.STATE.data.resources;
    el.innerHTML = `
      <span style="font-weight:900;letter-spacing:0.04em;color:#fff;white-space:nowrap">はちゃめちゃ世界</span>
      <div class="res-group">
        <span class="res-pill res-gold">G ${HS.UTIL.fmtNum(r.gold)}</span>
        <span class="res-pill res-shard">結晶 ${HS.UTIL.fmtNum(r.expCrystal)}</span>
        <span class="res-pill">片 ${HS.UTIL.fmtNum(r.shards)}</span>
        <span class="res-pill res-core">核 ${HS.UTIL.fmtNum(r.cores)}</span>
      </div>`;
  }

  function renderNav() {
    const el = document.getElementById('bottom-nav');
    if (!el) return;
    const inCombat = HS.COMBAT.isActive();
    const cur = HS.STATE.ui.tab;
    el.innerHTML = NAV_ITEMS.map((n) => {
      const locked = inCombat && n.id !== 'battle';
      return `
        <button class="nav-btn ${cur === n.id ? 'active' : ''} ${locked ? 'locked' : ''}"
                data-action="nav-tab" data-val="${n.id}">
          <span class="nav-ico">${HS.CONST.renderNavIcon(n.id)}</span>
          <span>${n.label}</span>
        </button>`;
    }).join('');
  }

  function renderAll() {
    if (!HS.STATE.data) return;
    renderTopBar();
    renderNav();

    const upper = document.getElementById('upper-content');
    const lower = document.getElementById('lower-content');
    const tab = HS.STATE.ui.tab;

    // 同一タブ再描画時のスクロール位置を保持（特に装備の横スクロール選択）
    const prevStrip = document.getElementById('gear-unit-strip');
    const prevStripLeft = prevStrip ? prevStrip.scrollLeft : null;
    const prevVScroll = lower ? lower.querySelector('.scroll-box') : null;
    const prevVTop = prevVScroll ? prevVScroll.scrollTop : null;
    const prevTab = lower ? lower.dataset.renderedTab : null;

    if (tab === 'battle') {
      upper.innerHTML = HS.UI_BATTLE.renderUpper();
      lower.innerHTML = HS.UI_BATTLE.renderLower();
    } else if (tab === 'party') {
      upper.innerHTML = HS.UI_PARTY.renderUpper();
      lower.innerHTML = HS.UI_PARTY.renderLower();
    } else if (tab === 'units') {
      upper.innerHTML = HS.UI_UNITS.renderUpper();
      lower.innerHTML = HS.UI_UNITS.renderLower();
    } else if (tab === 'gear') {
      upper.innerHTML = HS.UI_GEAR.renderUpper();
      lower.innerHTML = HS.UI_GEAR.renderLower();
    } else if (tab === 'codex') {
      upper.innerHTML = HS.UI_CODEX.renderUpper();
      lower.innerHTML = HS.UI_CODEX.renderLower();
    } else {
      upper.innerHTML = HS.UI_WORLD.renderUpper();
      lower.innerHTML = HS.UI_WORLD.renderLower();
    }

    if (lower) lower.dataset.renderedTab = tab;

    if (prevTab === tab) {
      if (prevStripLeft !== null) {
        const nextStrip = document.getElementById('gear-unit-strip');
        if (nextStrip) nextStrip.scrollLeft = prevStripLeft;
      }
      if (prevVTop !== null) {
        const nextVScroll = lower ? lower.querySelector('.scroll-box') : null;
        if (nextVScroll) nextVScroll.scrollTop = prevVTop;
      }
    }
  }

  function openSheet(kind, data) {
    activeSheet = { kind, data };
    renderSheet();
  }

  function closeSheet() {
    activeSheet = null;
    const bd = document.getElementById('sheet-backdrop');
    const sh = document.getElementById('bottom-sheet');
    if (bd) bd.classList.add('hidden');
    if (sh) {
      sh.classList.add('hidden');
      sh.innerHTML = '';
    }
  }

  function renderSheet() {
    const bd = document.getElementById('sheet-backdrop');
    const sh = document.getElementById('bottom-sheet');
    if (!activeSheet || !bd || !sh) return;

    let content = null;
    if (activeSheet.kind === 'normal-result') {
      content = HS.UI_BATTLE.buildNormalResultHtml(activeSheet.data, HS.STATE.ui.dpsMetric);
    } else if (activeSheet.kind === 'repeat-result') {
      content = HS.UI_BATTLE.buildRepeatResultHtml(activeSheet.data, HS.STATE.ui.dpsMetric);
    } else if (activeSheet.kind === 'autosell') {
      content = HS.UI_GEAR.buildAutoSellSheet();
    } else if (activeSheet.kind === 'bulksell') {
      content = HS.UI_GEAR.buildBulkSellSheet();
    } else if (activeSheet.kind === 'exweapon') {
      content = HS.UI_UNITS.buildExWeaponSheet(activeSheet.data);
    } else if (activeSheet.kind === 'save') {
      content = HS.UI_WORLD.buildSaveSheet(activeSheet.data);
    }
    if (!content) return closeSheet();

    bd.classList.remove('hidden');
    sh.classList.remove('hidden');
    sh.innerHTML = `
      <div class="sheet-head">
        <span class="sheet-title ellipsis">${HS.UTIL.escHtml(content.title)}</span>
      </div>
      <div class="sheet-body scroll-box">${content.body}</div>
      <div class="sheet-foot">${content.foot}</div>`;
  }

  // ==================== ドラッグ＆ドロップ確定処理 ====================
  function handleDrop({ dragKind, dragValue, dropKind, dropValue }) {
    if (dragKind === 'roster-unit' && dropKind === 'party-slot') {
      const idx = Number(dropValue);
      if (HS.STATE.setPartySlot(idx, dragValue)) {
        HS.STATE.ui.selectedPartySlot = idx;
        HS.AUDIO.play('buff');
        showToast(`${HS.UNITS_MAP[dragValue].name} を枠${idx + 1}に配置`);
        renderAll();
      }
      return;
    }
    if (dragKind === 'party-slot' && dropKind === 'party-slot') {
      const a = Number(dragValue);
      const b = Number(dropValue);
      if (HS.STATE.swapPartySlots(a, b)) {
        HS.STATE.ui.selectedPartySlot = b;
        HS.AUDIO.play('tap');
        renderAll();
      }
      return;
    }
    if (dragKind === 'party-slot' && dropKind === 'party-remove') {
      const idx = Number(dragValue);
      if (HS.STATE.removePartySlot(idx)) {
        HS.AUDIO.play('tap');
        showToast('枠から外しました');
        renderAll();
      } else {
        showToast('パーティは最低1人必要です', true);
      }
      return;
    }
    if (dragKind === 'gear-item' && dropKind === 'gear-slot') {
      const targetUid = HS.STATE.ui.gearTargetUnitId;
      const item = HS.STATE.data.equipment.find((e) => e.id === dragValue);
      if (!item) return;
      if (item.slot !== dropValue) {
        showToast(`部位が一致しません（${HS.CONST.EQUIP_SLOTS.find((s) => s.id === item.slot)?.name}用）`, true);
        return;
      }
      if (HS.STATE.equipItem(targetUid, dragValue)) {
        HS.AUDIO.play('buff');
        showToast(`${item.name} を装備しました`);
        renderAll();
      }
      return;
    }
  }

  // ==================== クリック・タップイベント統合 ====================
  function handleAction(action, val) {
    HS.AUDIO.unlock();
    HS.STORAGE.requestPersistence();
    const st = HS.STATE.data;

    switch (action) {
      case 'nav-tab': {
        if (HS.COMBAT.isActive() && val !== 'battle') {
          showToast('戦闘中は他の画面へ移動できません（撤退または周回終了で解除）', true);
          return;
        }
        HS.AUDIO.play('tap');
        HS.STATE.ui.tab = val;
        renderAll();
        break;
      }

      // ---- 出撃準備 ----
      case 'stage-mode':
        HS.AUDIO.play('tap');
        st.selectedStageMode = val;
        if (val === 'story') st.selectedStageId = `w${st.selectedWorld}-1`;
        else if (val === 'boss') st.selectedStageId = 'boss-fire';
        else st.selectedStageId = `tower-${st.towerFloor}`;
        HS.STATE.scheduleSave();
        renderAll();
        break;

      case 'select-world':
        HS.AUDIO.play('tap');
        st.selectedWorld = Number(val);
        st.selectedStageId = `w${st.selectedWorld}-1`;
        HS.STATE.scheduleSave();
        renderAll();
        break;

      case 'tower-floor': {
        HS.AUDIO.play('tap');
        const maxF = Math.min(HS.STAGES.TOWER_MAX_FLOOR, st.towerFloor);
        const f = Math.max(1, Math.min(maxF, Number(val) || 1));
        st.selectedStageId = `tower-${f}`;
        HS.STATE.scheduleSave();
        renderAll();
        break;
      }

      case 'select-stage':
        HS.AUDIO.play('tap');
        st.selectedStageId = val;
        HS.STATE.scheduleSave();
        renderAll();
        break;

      case 'toggle-repeat-prep':
        HS.AUDIO.play('tap');
        st.settings.autoRepeat = !st.settings.autoRepeat;
        HS.STATE.scheduleSave();
        renderAll();
        break;

      case 'start-battle': {
        const stage = HS.STAGES.getStage(st.selectedStageId, st.towerFloor);
        if (!HS.STATE.isStageUnlocked(stage)) {
          showToast('前のステージをクリアしてください', true);
          return;
        }
        HS.AUDIO.play('buff');
        HS.COMBAT.startBattle(stage.id, st.settings.autoRepeat);
        renderAll();
        break;
      }

      // ---- 戦闘中（フルオート・倍速・DPS・ログフィルタ・周回・撤退） ----
      case 'cycle-speed': {
        const idx = HS.CONST.SPEED_STEPS.indexOf(st.settings.speed);
        st.settings.speed = HS.CONST.SPEED_STEPS[(idx + 1) % HS.CONST.SPEED_STEPS.length];
        HS.AUDIO.play('tap');
        HS.STATE.scheduleSave();
        renderAll();
        break;
      }

      case 'dps-metric':
        HS.STATE.ui.dpsMetric = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'log-filter':
        HS.STATE.ui.logFilter = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'toggle-repeat-live':
        if (HS.COMBAT.isRepeating()) {
          HS.COMBAT.stopRepeatAndShowSummary();
        } else {
          const eng = HS.COMBAT.engine;
          st.settings.autoRepeat = true;
          eng.repeatSession = {
            stageId: eng.stage.id,
            stageName: eng.stage.name,
            startedAt: Date.now(),
            runs: 0, wins: 0, losses: 0, totalElapsed: 0,
            gold: 0, exp: 0, shards: 0, cores: 0,
            keptGear: [], autoSoldCount: 0, autoSoldGold: 0, autoSoldDust: 0,
            unlockedUnits: [], unitMetrics: {}
          };
          showToast('この戦闘後から周回を継続します');
          renderAll();
        }
        break;

      case 'retreat-battle':
        HS.AUDIO.play('tap');
        HS.COMBAT.retreatBattle();
        renderAll();
        break;

      // ---- リザルトシート ----
      case 'result-dps-tab': {
        const [, metric] = val.split(':');
        HS.STATE.ui.dpsMetric = metric;
        HS.AUDIO.play('tap');
        renderSheet();
        break;
      }
      case 'result-close':
        closeSheet();
        HS.COMBAT.engine.phase = 'idle';
        renderAll();
        break;
      case 'result-retry':
        closeSheet();
        HS.COMBAT.startBattle(val, false);
        renderAll();
        break;
      case 'result-next':
        closeSheet();
        st.selectedStageId = val;
        if (val.startsWith('w')) st.selectedWorld = Number(val[1]) || st.selectedWorld;
        HS.COMBAT.startBattle(val, false);
        renderAll();
        break;
      case 'result-repeat-again':
        closeSheet();
        st.settings.autoRepeat = true;
        HS.COMBAT.startBattle(val, true);
        renderAll();
        break;

      // ---- 編成 ----
      case 'select-party-slot':
        HS.STATE.ui.selectedPartySlot = Number(val);
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'assign-party-unit': {
        const slot = HS.STATE.ui.selectedPartySlot;
        HS.STATE.setPartySlot(slot, val);
        HS.AUDIO.play('tap');
        renderAll();
        break;
      }

      case 'party-remove-slot':
        if (HS.STATE.removePartySlot(HS.STATE.ui.selectedPartySlot)) {
          HS.AUDIO.play('tap');
          renderAll();
        } else {
          showToast('パーティは最低1人必要です', true);
        }
        break;

      case 'party-auto': {
        const unlocked = HS.UNITS.filter((u) => st.units[u.id]?.unlocked);
        const byRole = { tank: [], dealer: [], supporter: [], healer: [] };
        for (const u of unlocked) {
          byRole[u.role].push({ id: u.id, power: HS.STATE.getUnitStats(u.id, false).power });
        }
        const picked = [];
        for (const role of ['tank', 'dealer', 'supporter', 'healer']) {
          byRole[role].sort((a, b) => b.power - a.power);
          if (byRole[role][0]) picked.push(byRole[role][0].id);
        }
        const rest = unlocked
          .filter((u) => !picked.includes(u.id))
          .sort((a, b) => HS.STATE.getUnitStats(b.id, false).power - HS.STATE.getUnitStats(a.id, false).power);
        while (picked.length < 4 && rest.length) picked.push(rest.shift().id);
        st.party = [picked[0] || null, picked[1] || null, picked[2] || null, picked[3] || null];
        HS.STATE.scheduleSave();
        HS.AUDIO.play('buff');
        showToast('4ロール最適パーティを編成しました');
        renderAll();
        break;
      }

      case 'party-filter':
        HS.STATE.ui.partyFilterAttr = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      // ---- 育成 ----
      case 'select-unit':
        HS.STATE.ui.selectedUnitId = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'unit-filter':
        HS.STATE.ui.unitFilterAttr = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'unit-lvup': {
        const [uid, cnt] = val.split(':');
        const res = HS.STATE.levelUpUnit(uid, Number(cnt));
        if (res.ok) {
          HS.AUDIO.play('buff');
          showToast(`Lv.${res.level} へ強化しました (+${res.gained})`);
          renderAll();
        } else {
          showToast(res.msg, true);
        }
        break;
      }

      case 'unit-awaken': {
        const res = HS.STATE.awakenUnit(val);
        if (res.ok) {
          HS.AUDIO.play('chaos');
          showToast(`覚醒 +${res.awakening} 達成！`);
          renderAll();
        } else {
          showToast(res.msg, true);
        }
        break;
      }

      case 'unit-recruit': {
        const res = HS.STATE.unlockUnitByShards(val);
        if (res.ok) {
          HS.AUDIO.play('win');
          showToast(`${HS.UNITS_MAP[val].name} が仲間に加わりました！`);
          renderAll();
        } else {
          showToast(res.msg, true);
        }
        break;
      }

      case 'open-exweapon':
        HS.AUDIO.play('tap');
        openSheet('exweapon', val);
        break;

      case 'confirm-exweapon': {
        const res = HS.STATE.upgradeExWeapon(val);
        if (res.ok) {
          HS.AUDIO.play('win');
          showToast(`専用武器 Lv.${res.lv} に強化しました！`);
          renderAll();
          renderSheet();
        } else {
          showToast(res.msg, true);
        }
        break;
      }

      // ---- 装備 ----
      case 'select-gear-unit':
        HS.STATE.ui.gearTargetUnitId = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'select-gear':
        HS.STATE.ui.selectedGearId = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'gear-filter':
        HS.STATE.ui.gearFilterSlot = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'gear-equip':
        if (val && HS.STATE.equipItem(HS.STATE.ui.gearTargetUnitId, val)) {
          HS.AUDIO.play('buff');
          showToast('装備を装着しました');
          renderAll();
        }
        break;

      case 'unequip-slot': {
        const [uid, slot] = val.split(':');
        if (HS.STATE.unequipSlot(uid, slot)) {
          HS.AUDIO.play('tap');
          renderAll();
        }
        break;
      }

      case 'gear-auto-equip':
        if (HS.STATE.autoEquipUnit(val)) {
          HS.AUDIO.play('buff');
          showToast('最適装備を自動装着しました');
          renderAll();
        } else {
          showToast('すでに最適装備です');
        }
        break;

      case 'gear-enhance': {
        const res = HS.STATE.enhanceEquipment(val);
        if (res.ok) {
          HS.AUDIO.play('buff');
          showToast(`装備を +${res.enhance} に強化！`);
          renderAll();
        } else {
          showToast(res.msg, true);
        }
        break;
      }

      case 'gear-lock': {
        const locked = HS.STATE.toggleEquipLock(val);
        HS.AUDIO.play('tap');
        showToast(locked ? '装備をロック保護しました' : 'ロックを解除しました');
        renderAll();
        break;
      }

      case 'open-bulksell':
        HS.AUDIO.play('tap');
        openSheet('bulksell');
        break;

      case 'bulksell-toggle-rar': {
        const arr = HS.STATE.ui.bulkSellRarities || [];
        const i = arr.indexOf(val);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(val);
        HS.STATE.ui.bulkSellRarities = arr;
        HS.AUDIO.play('tap');
        renderSheet();
        break;
      }

      case 'bulksell-preset': {
        const order = ['N', 'R', 'SR', 'SSR'];
        const idx = order.indexOf(val);
        HS.STATE.ui.bulkSellRarities = idx >= 0 ? order.slice(0, idx + 1) : ['N'];
        HS.AUDIO.play('tap');
        renderSheet();
        break;
      }

      case 'exec-bulksell': {
        const res = HS.STATE.bulkSellByRarities(HS.STATE.ui.bulkSellRarities);
        if (res.count > 0) {
          HS.AUDIO.play('drop');
          showToast(`${res.count}件を一括売却 (+${HS.UTIL.fmtNum(res.gold)}G / 魔粉+${res.dust})`);
          closeSheet();
          renderAll();
        } else {
          showToast('売却条件に該当する装備がありません', true);
        }
        break;
      }

      case 'open-autosell':
        HS.AUDIO.play('tap');
        openSheet('autosell');
        break;

      case 'autosell-toggle':
        st.autoSell.enabled = !st.autoSell.enabled;
        HS.STATE.scheduleSave();
        HS.AUDIO.play('tap');
        renderAll();
        renderSheet();
        break;

      case 'autosell-rarity':
        st.autoSell.maxRarity = val;
        HS.STATE.scheduleSave();
        HS.AUDIO.play('tap');
        renderAll();
        renderSheet();
        break;

      case 'autosell-highscore':
        st.autoSell.keepHighScore = !st.autoSell.keepHighScore;
        HS.STATE.scheduleSave();
        HS.AUDIO.play('tap');
        renderSheet();
        break;

      // ---- 図鑑 ----
      case 'codex-tab':
        HS.STATE.ui.codexTab = val;
        HS.STATE.ui.codexFilter = 'all';
        HS.STATE.ui.codexSelectedId = null;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'codex-filter':
        HS.STATE.ui.codexFilter = val;
        HS.STATE.ui.codexSelectedId = null;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'codex-select':
        HS.STATE.ui.codexSelectedId = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      // ---- 記録・設定 ----
      case 'world-sub':
        HS.STATE.ui.worldSubTab = val;
        HS.AUDIO.play('tap');
        renderAll();
        break;

      case 'claim-offline': {
        const res = HS.STATE.claimOfflineRewards();
        if (res.ok) {
          HS.AUDIO.play('win');
          showToast(`探索回収: +${HS.UTIL.fmtNum(res.gold)}G / 結晶+${HS.UTIL.fmtNum(res.expCrystal)} / 装備${res.kept}件`);
          renderAll();
        } else {
          showToast(res.msg, true);
        }
        break;
      }

      case 'toggle-sound':
        st.settings.sound = !st.settings.sound;
        HS.AUDIO.setEnabled(st.settings.sound);
        HS.STATE.scheduleSave();
        renderAll();
        break;

      case 'open-save-export':
        openSheet('save', 'export');
        break;

      case 'open-save-import':
        openSheet('save', 'import');
        break;

      case 'open-reset-confirm':
        openSheet('save', 'reset');
        break;

      case 'copy-save-code': {
        const box = document.getElementById('save-code-box');
        if (box) {
          box.select();
          if (navigator.clipboard) navigator.clipboard.writeText(box.value).catch(() => {});
          showToast('セーブコードをコピーしました');
        }
        break;
      }

      case 'exec-save-import': {
        const box = document.getElementById('save-code-box');
        try {
          const parsed = HS.STORAGE.importCode(box ? box.value : '');
          HS.STATE.data = HS.STATE.mergeSave(parsed);
          HS.STATE.scheduleSave(true);
          closeSheet();
          HS.AUDIO.play('win');
          showToast('セーブデータを復元しました');
          renderAll();
        } catch (err) {
          showToast(err.message || '読み込みに失敗しました', true);
        }
        break;
      }

      case 'exec-reset-save':
        HS.STORAGE.clearAll().then(() => {
          HS.STATE.data = HS.STATE.createInitialSave();
          HS.STATE.scheduleSave(true);
          closeSheet();
          showToast('データを初期化しました');
          renderAll();
        });
        break;

      case 'close-sheet':
        closeSheet();
        break;

      default:
        break;
    }
  }

  function bindGlobalGuards() {
    // iOS Safari ピンチズーム・ジェスチャ誤操作抑止
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('textarea, input')) e.preventDefault();
    });

    document.addEventListener('click', (e) => {
      if (HS.DND.wasRecentDrag()) return;
      if (e.target.id === 'sheet-backdrop') {
        if (activeSheet && activeSheet.kind !== 'normal-result' && activeSheet.kind !== 'repeat-result') {
          closeSheet();
        }
        return;
      }
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;
      handleAction(btn.dataset.action, btn.dataset.val);
    });

    // バックグラウンド移行時に即保存
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') HS.STATE.scheduleSave(true);
    });
    global.addEventListener('pagehide', () => HS.STATE.scheduleSave(true));
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (global.location.protocol !== 'http:' && global.location.protocol !== 'https:') return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  function mainLoop(ts) {
    const dt = lastFrameAt ? Math.min(0.05, (ts - lastFrameAt) / 1000) : 0.016;
    lastFrameAt = ts;

    if (HS.COMBAT.isActive()) {
      HS.COMBAT.update(dt);
      const canvas = document.getElementById('battle-canvas');
      if (canvas) HS.RENDERER.render(canvas, dt);

      hudAccum += dt;
      if (hudAccum >= 0.1) {
        hudAccum = 0;
        HS.UI_BATTLE.updateLiveHud();
        renderTopBar();
      }
    }

    global.requestAnimationFrame(mainLoop);
  }

  async function boot() {
    await HS.STATE.init();

    HS.COMBAT.engine.callbacks.onNormalResult = (loot) => {
      renderAll();
      openSheet('normal-result', loot);
    };
    HS.COMBAT.engine.callbacks.onRepeatResult = (summary) => {
      renderAll();
      openSheet('repeat-result', summary);
    };
    HS.COMBAT.engine.callbacks.onStateChange = () => {
      renderAll();
    };

    HS.DND.init();
    HS.DND.setDropHandler(handleDrop);
    bindGlobalGuards();
    registerServiceWorker();

    renderAll();
    global.requestAnimationFrame(mainLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
