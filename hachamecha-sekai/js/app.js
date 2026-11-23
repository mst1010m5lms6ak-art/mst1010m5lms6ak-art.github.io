(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  let save = null;
  const uiState = {
    tab: "quest", // 'quest' | 'party' | 'equip' | 'roster' | 'settings'
    selectedCharId: "f_hum_dra_dlr",
    selectedSlotIdx: 0,
    equipSubTab: "gear",
    equipSlotFilter: null,
    selectedEquipUid: null
  };

  const NAV_ITEMS = [
    { id: "quest",    ico: "⚔", lbl: "出撃" },
    { id: "party",    ico: "◈", lbl: "編成" },
    { id: "equip",    ico: "✦", lbl: "装備" },
    { id: "roster",   ico: "◎", lbl: "仲間" },
    { id: "settings", ico: "⚙", lbl: "記録" }
  ];

  function toast(msg) {
    const layer = document.getElementById("toast-layer");
    if (!layer) return;
    const el = document.createElement("div");
    el.className = "toast-item";
    el.textContent = msg;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }

  function triggerShake() {
    const w = document.getElementById("battle-top-wrap");
    if (!w) return;
    w.classList.remove("shake");
    void w.offsetWidth;
    w.classList.add("shake");
  }

  function openSheet(title, bodyHtml, actionsHtml) {
    const ov = document.getElementById("sheet-overlay");
    const panel = document.getElementById("sheet-panel");
    panel.innerHTML = `<div class="sheet-title"><span>${HS.CONST.esc(title)}</span></div>
      <div class="sheet-content scroll-y">${bodyHtml}</div>
      <div class="sheet-actions">${actionsHtml}</div>`;
    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden", "false");
  }

  function closeSheet() {
    const ov = document.getElementById("sheet-overlay");
    ov.classList.add("hidden");
    ov.setAttribute("aria-hidden", "true");
  }

  function renderNav() {
    const nav = document.getElementById("bottom-nav");
    nav.innerHTML = NAV_ITEMS.map(
      (n) => `<button class="nav-btn ${uiState.tab === n.id ? "active" : ""}" data-action="nav-tab" data-tab="${n.id}">
        <span class="nav-ico">${n.ico}</span>
        <span class="nav-lbl">${n.lbl}</span>
      </button>`
    ).join("");
  }

  function render() {
    const shell = document.getElementById("app-shell");
    const topEl = document.getElementById("top-display");
    const ctrlEl = document.getElementById("control-body");
    const curBattle = HS.BATTLE.getCurrent();

    if (curBattle) {
      // Strictly lock out other screens during battle
      shell.classList.add("battle-mode");
      HS.UI_BATTLE.render(curBattle, topEl, ctrlEl);
      return;
    }

    shell.classList.remove("battle-mode");
    HS.UI_BATTLE.resetState();
    renderNav();

    if (uiState.tab === "quest") HS.UI_SCREENS.renderQuest(save, uiState, topEl, ctrlEl);
    else if (uiState.tab === "party") HS.UI_SCREENS.renderParty(save, uiState, topEl, ctrlEl);
    else if (uiState.tab === "equip") HS.UI_SCREENS.renderEquip(save, uiState, topEl, ctrlEl);
    else if (uiState.tab === "roster") HS.UI_SCREENS.renderRoster(save, uiState, topEl, ctrlEl);
    else HS.UI_SCREENS.renderSettings(save, uiState, topEl, ctrlEl);
  }

  function assignCharToSlot(charId, slotIdx) {
    if (!save.chars[charId] || !save.chars[charId].unlocked) return;
    const existingIdx = save.party.indexOf(charId);
    if (existingIdx >= 0) {
      // Swap positions
      const prev = save.party[slotIdx];
      save.party[slotIdx] = charId;
      save.party[existingIdx] = prev;
    } else {
      save.party[slotIdx] = charId;
    }
    if (!save.party.some(Boolean)) save.party[0] = charId;
    HS.STORAGE.save(save);
    HS.AUDIO.tap();
    render();
  }

  function wearEquip(charId, uid) {
    const eq = save.inventory.find((x) => x.uid === uid);
    if (!eq) return;
    const curOwner = HS.EQUIP.isEquippedBy(save, uid);
    if (curOwner === charId) {
      save.equipsByChar[charId][eq.slot] = null;
      toast(eq.name + " を外しました");
    } else {
      if (curOwner) save.equipsByChar[curOwner][eq.slot] = null;
      save.equipsByChar[charId][eq.slot] = uid;
      toast(eq.name + " を装着しました");
    }
    HS.STORAGE.save(save);
    HS.AUDIO.tap();
    render();
  }

  function handleDrop(ev) {
    if (ev.dragType === "char" && ev.dropZone === "party-slot") {
      const targetSlot = Number(ev.dropId);
      if (Number.isInteger(targetSlot) && targetSlot >= 0 && targetSlot < 4) {
        uiState.selectedSlotIdx = targetSlot;
        uiState.selectedCharId = ev.dragId;
        assignCharToSlot(ev.dragId, targetSlot);
        toast("編成スロット#" + (targetSlot + 1) + " へ配置");
      }
      return;
    }
    if (ev.dragType === "equip" && ev.dropZone === "equip-slot") {
      const eq = save.inventory.find((x) => x.uid === ev.dragId);
      if (!eq) return;
      if (eq.slot !== ev.dropId) {
        toast("装備部位が一致しません");
        return;
      }
      const owned = HS.CHARS.LIST.filter((c) => save.chars[c.id].unlocked);
      const cid = uiState.selectedCharId || owned[0].id;
      wearEquip(cid, eq.uid);
      return;
    }
    if (ev.dragType === "skill" && ev.dropZone === "enemy-target") {
      HS.BATTLE.setTarget(ev.dropId);
      HS.BATTLE.manualUseSkill(Number(ev.dragId), ev.dropId);
    }
  }

  function handleAction(btn) {
    const act = btn.dataset.action;
    if (!act) return;
    const curBattle = HS.BATTLE.getCurrent();

    // Prevent switching tabs during battle
    if (act === "nav-tab") {
      if (curBattle) return;
      uiState.tab = btn.dataset.tab;
      HS.AUDIO.tap();
      render();
      return;
    }

    if (act === "close-sheet") {
      closeSheet();
      HS.AUDIO.tap();
      return;
    }

    // ---- Quest actions ----
    if (act === "select-mode") {
      save.selectedMode = btn.dataset.mode;
      if (save.selectedMode === "journey" && !save.selectedStageId.startsWith("j_")) save.selectedStageId = "j_1_1";
      if (save.selectedMode === "trial" && !save.selectedStageId.startsWith("t_")) save.selectedStageId = "t_fire";
      if (save.selectedMode === "rush" && !save.selectedStageId.startsWith("r_")) save.selectedStageId = "r_1";
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "select-stage") {
      save.selectedStageId = btn.dataset.id;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "abyss-step") {
      const d = Number(btn.dataset.delta) || 0;
      save.abyssCurrentFloor = Math.max(1, Math.min(save.abyssMaxFloor, (save.abyssCurrentFloor || 1) + d));
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "abyss-max") {
      save.abyssCurrentFloor = save.abyssMaxFloor;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "abyss-pick") {
      save.abyssCurrentFloor = Number(btn.dataset.floor) || 1;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "toggle-pref-loop") {
      save.settings.autoLoop = !save.settings.autoLoop;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "open-autosell-quick") {
      uiState.tab = "equip";
      uiState.equipSubTab = "autosell";
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "start-battle") {
      if (!save.party.some(Boolean)) {
        toast("パーティに1体以上編成してください");
        return;
      }
      const sid = save.selectedMode === "abyss" ? "abyss_" + (save.abyssCurrentFloor || 1) : save.selectedStageId;
      HS.AUDIO.tap();
      HS.BATTLE.start(sid, save, !!save.settings.autoLoop, render, triggerShake);
      return;
    }

    // ---- Battle actions ----
    if (act === "battle-speed") { HS.AUDIO.tap(); HS.BATTLE.cycleSpeed(); return; }
    if (act === "battle-auto") { HS.AUDIO.tap(); HS.BATTLE.setAutoMode(!save.settings.autoBattle); return; }
    if (act === "battle-loop") { HS.AUDIO.tap(); HS.BATTLE.toggleLoopDuringBattle(); return; }
    if (act === "battle-feed-tab") {
      HS.AUDIO.tap();
      HS.UI_BATTLE.setFeedTab(btn.dataset.tab);
      render();
      return;
    }
    if (act === "battle-target") { HS.AUDIO.tap(); HS.BATTLE.setTarget(btn.dataset.uid); return; }
    if (act === "battle-burst") { HS.BATTLE.triggerChaosBurst(); return; }
    if (act === "battle-skill") { HS.BATTLE.manualUseSkill(Number(btn.dataset.idx), null); return; }
    if (act === "battle-retreat") {
      HS.AUDIO.tap();
      openSheet(
        "戦闘から撤退しますか？",
        `<p style="font-size:12px;color:var(--text-sub)">現在の戦闘を中断して拠点へ戻ります。途中の報酬は獲得されません。</p>`,
        `<button class="btn btn-ghost" style="flex:1" data-action="close-sheet">戦闘を続ける</button>
         <button class="btn btn-danger" style="flex:1" data-action="confirm-retreat">撤退する</button>`
      );
      return;
    }
    if (act === "confirm-retreat") {
      closeSheet();
      HS.BATTLE.retreat();
      render();
      return;
    }

    // ---- Result actions (Normal & Loop) ----
    if (act === "res-metric-tab") {
      HS.AUDIO.tap();
      HS.UI_BATTLE.setResultMetricTab(btn.dataset.tab);
      render();
      return;
    }
    if (act === "res-lock") {
      const eq = save.inventory.find((x) => x.uid === btn.dataset.uid);
      if (eq) {
        eq.locked = !eq.locked;
        HS.STORAGE.save(save);
        HS.AUDIO.tap();
        render();
      }
      return;
    }
    if (act === "res-sell") {
      const idx = save.inventory.findIndex((x) => x.uid === btn.dataset.uid);
      if (idx >= 0 && !save.inventory[idx].locked) {
        const val = HS.EQUIP.getSellValue(save.inventory[idx]);
        save.inventory.splice(idx, 1);
        save.gold += val;
        HS.STORAGE.save(save);
        HS.AUDIO.tap();
        toast("売却 +" + val + "G");
        render();
      }
      return;
    }
    if (act === "res-back") {
      HS.AUDIO.tap();
      HS.BATTLE.retreat();
      render();
      return;
    }
    if (act === "res-retry" && curBattle) {
      HS.AUDIO.tap();
      HS.BATTLE.start(curBattle.stage.id, save, false, render, triggerShake);
      return;
    }
    if (act === "res-next-abyss" && curBattle) {
      HS.AUDIO.tap();
      const nextF = curBattle.stage.floor + 1;
      save.abyssCurrentFloor = nextF;
      HS.STORAGE.save(save);
      HS.BATTLE.start("abyss_" + nextF, save, false, render, triggerShake);
      return;
    }
    if (act === "loop-pause") { HS.AUDIO.tap(); HS.BATTLE.toggleLoopPause(); return; }
    if (act === "loop-now" && curBattle) {
      HS.AUDIO.tap();
      const nextId =
        curBattle.stage.mode === "abyss" && curBattle.won
          ? "abyss_" + (curBattle.stage.floor + 1)
          : curBattle.stage.id;
      HS.BATTLE.start(nextId, save, true, render, triggerShake);
      return;
    }

    // ---- Party actions ----
    if (act === "party-slot-tap") {
      const idx = Number(btn.dataset.slot);
      uiState.selectedSlotIdx = idx;
      if (save.party[idx]) uiState.selectedCharId = save.party[idx];
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "party-char-tap") {
      const cid = btn.dataset.id;
      if (uiState.selectedCharId === cid) {
        assignCharToSlot(cid, uiState.selectedSlotIdx || 0);
      } else {
        uiState.selectedCharId = cid;
        assignCharToSlot(cid, uiState.selectedSlotIdx || 0);
      }
      return;
    }
    if (act === "party-clear-slot") {
      const idx = uiState.selectedSlotIdx || 0;
      const count = save.party.filter(Boolean).length;
      if (save.party[idx] && count <= 1) {
        toast("最低1体は編成に残してください");
        return;
      }
      save.party[idx] = null;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "party-auto-best") {
      const owned = HS.CHARS.LIST
        .filter((c) => save.chars[c.id] && save.chars[c.id].unlocked)
        .map((c) => ({ id: c.id, role: c.role, power: HS.EQUIP.calcCharStats(c.id, save).power }))
        .sort((a, b) => b.power - a.power);
      const picked = [];
      ["tank", "dealer", "supporter", "healer"].forEach((role) => {
        const found = owned.find((o) => o.role === role && !picked.includes(o.id));
        if (found) picked.push(found.id);
      });
      owned.forEach((o) => {
        if (picked.length < 4 && !picked.includes(o.id)) picked.push(o.id);
      });
      while (picked.length < 4) picked.push(null);
      save.party = picked;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      toast("バランス最強パーティを自動編成しました");
      render();
      return;
    }

    // ---- Equip actions ----
    if (act === "equip-select-char") {
      uiState.selectedCharId = btn.dataset.id;
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "equip-subtab") {
      uiState.equipSubTab = btn.dataset.tab;
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "equip-filter-slot") {
      uiState.equipSlotFilter = uiState.equipSlotFilter === btn.dataset.slot ? null : btn.dataset.slot;
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "equip-select-item") {
      uiState.selectedEquipUid = btn.dataset.uid;
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "equip-wear") {
      const owned = HS.CHARS.LIST.filter((c) => save.chars[c.id].unlocked);
      const cid = uiState.selectedCharId || owned[0].id;
      wearEquip(cid, btn.dataset.uid);
      return;
    }
    if (act === "equip-upgrade") {
      const eq = save.inventory.find((x) => x.uid === uiState.selectedEquipUid);
      if (!eq || eq.level >= 15) return;
      const cost = HS.EQUIP.getUpgradeCost(eq);
      if (save.gold < cost) return;
      save.gold -= cost;
      eq.level += 1;
      HS.STORAGE.save(save);
      HS.AUDIO.heal();
      toast(eq.name + " +" + eq.level + " に強化！");
      render();
      return;
    }
    if (act === "equip-lock") {
      const eq = save.inventory.find((x) => x.uid === uiState.selectedEquipUid);
      if (!eq) return;
      eq.locked = !eq.locked;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "equip-sell") {
      const idx = save.inventory.findIndex((x) => x.uid === uiState.selectedEquipUid);
      if (idx < 0) return;
      const eq = save.inventory[idx];
      if (eq.locked || HS.EQUIP.isEquippedBy(save, eq.uid)) return;
      const val = HS.EQUIP.getSellValue(eq);
      save.inventory.splice(idx, 1);
      save.gold += val;
      uiState.selectedEquipUid = null;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      toast("売却 +" + val + "G");
      render();
      return;
    }
    if (act === "equip-ex-upgrade") {
      const cid = btn.dataset.id;
      const def = HS.CHARS.get(cid);
      const prog = save.chars[cid];
      if (!def || !prog) return;
      const ex = def.exWeapon;
      const nextCore = prog.exUnlocked ? Math.round(ex.costCore * (0.7 + prog.exLevel * 0.45)) : ex.costCore;
      const nextGold = prog.exUnlocked ? Math.round(ex.costGold * (0.7 + prog.exLevel * 0.45)) : ex.costGold;
      if (save.core < nextCore || save.gold < nextGold) return;
      save.core -= nextCore;
      save.gold -= nextGold;
      if (!prog.exUnlocked) {
        prog.exUnlocked = true;
        prog.exLevel = 0;
        toast(ex.name + " を解放しました！");
      } else if (prog.exLevel < 4) {
        prog.exLevel += 1;
        toast(ex.name + " Lv." + (prog.exLevel + 1) + " へ覚醒！");
      }
      HS.STORAGE.save(save);
      HS.AUDIO.chaos();
      render();
      return;
    }
    if (act === "set-autosell") {
      save.settings.autoSellMaxOrder = Number(btn.dataset.order);
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      toast("自動売却設定を更新しました");
      render();
      return;
    }
    if (act === "bulk-sell-now") {
      let soldCount = 0;
      let soldGold = 0;
      save.inventory = save.inventory.filter((eq) => {
        if (eq.locked || HS.EQUIP.isEquippedBy(save, eq.uid)) return true;
        if (HS.EQUIP.shouldAutoSell(eq, save)) {
          soldCount++;
          soldGold += HS.EQUIP.getSellValue(eq);
          return false;
        }
        return true;
      });
      if (soldCount > 0) {
        save.gold += soldGold;
        save.stats.totalAutoSold += soldCount;
        HS.STORAGE.save(save);
        HS.AUDIO.win();
        toast(soldCount + "件を一括売却 (+" + HS.CONST.fmtNum(soldGold) + "G)");
      } else {
        toast("売却対象の装備はありません");
      }
      render();
      return;
    }

    // ---- Roster actions ----
    if (act === "roster-select") {
      uiState.selectedCharId = btn.dataset.id;
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "roster-unlock") {
      const def = HS.CHARS.get(btn.dataset.id);
      const prog = save.chars[btn.dataset.id];
      if (!def || !prog || prog.unlocked) return;
      if (save.crystal < (def.unlock.crystal || 0) || save.gold < (def.unlock.gold || 0)) return;
      save.crystal -= def.unlock.crystal || 0;
      save.gold -= def.unlock.gold || 0;
      prog.unlocked = true;
      HS.STORAGE.save(save);
      HS.AUDIO.win();
      toast(def.name + " が仲間に加わりました！");
      render();
      return;
    }
    if (act === "roster-lvup") {
      const prog = save.chars[btn.dataset.id];
      if (!prog || prog.level >= 99) return;
      const cost = Math.round(90 + prog.level * 55);
      if (save.gold < cost) return;
      save.gold -= cost;
      prog.level += 1;
      HS.STORAGE.save(save);
      HS.AUDIO.heal();
      toast("Lv." + prog.level + " に強化！");
      render();
      return;
    }
    if (act === "roster-lb") {
      const prog = save.chars[btn.dataset.id];
      if (!prog || prog.limitBreak >= 5) return;
      const cCost = 25 + prog.limitBreak * 20;
      const gCost = 600 + prog.limitBreak * 500;
      if (save.crystal < cCost || save.gold < gCost) return;
      save.crystal -= cCost;
      save.gold -= gCost;
      prog.limitBreak += 1;
      HS.STORAGE.save(save);
      HS.AUDIO.chaos();
      toast("限界突破 +" + prog.limitBreak + " 達成！");
      render();
      return;
    }

    // ---- Settings actions ----
    if (act === "set-se") {
      save.settings.seEnabled = !save.settings.seEnabled;
      HS.AUDIO.setEnabled(save.settings.seEnabled);
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "set-speed") {
      save.settings.speed = save.settings.speed >= 3 ? 1 : save.settings.speed + 1;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "set-auto") {
      save.settings.autoBattle = !save.settings.autoBattle;
      HS.STORAGE.save(save);
      HS.AUDIO.tap();
      render();
      return;
    }
    if (act === "data-export") {
      const txt = HS.STORAGE.exportJson(save);
      openSheet(
        "セーブデータ書き出し",
        `<textarea id="export-area" readonly style="width:100%;height:110px;background:#0b0914;border:1px solid var(--border-hi);border-radius:8px;padding:8px;font-size:12px;color:#fff">${HS.CONST.esc(txt)}</textarea>`,
        `<button class="btn btn-ghost" style="flex:1" data-action="close-sheet">閉じる</button>
         <button class="btn btn-cyan" style="flex:1" data-action="copy-export">コピー</button>`
      );
      return;
    }
    if (act === "copy-export") {
      const area = document.getElementById("export-area");
      if (area && navigator.clipboard) {
        navigator.clipboard.writeText(area.value).then(() => toast("クリップボードへコピーしました")).catch(() => {});
      }
      return;
    }
    if (act === "data-import") {
      openSheet(
        "セーブデータ読み込み",
        `<textarea id="import-area" placeholder="書き出したセーブ文字列を貼り付け" style="width:100%;height:110px;background:#0b0914;border:1px solid var(--border-hi);border-radius:8px;padding:8px;font-size:16px;color:#fff"></textarea>`,
        `<button class="btn btn-ghost" style="flex:1" data-action="close-sheet">キャンセル</button>
         <button class="btn btn-primary" style="flex:1" data-action="confirm-import">読み込む</button>`
      );
      return;
    }
    if (act === "confirm-import") {
      const area = document.getElementById("import-area");
      try {
        save = HS.STORAGE.importJson(area ? area.value.trim() : "");
        HS.AUDIO.setEnabled(save.settings.seEnabled);
        closeSheet();
        toast("セーブデータを復元しました");
        render();
      } catch (_) {
        toast("読み込みに失敗しました（形式エラー）");
      }
      return;
    }
    if (act === "data-reset-ask") {
      openSheet(
        "セーブデータ初期化",
        `<p style="font-size:12px;color:#ff9aa6">所持キャラ・装備・進行状況がすべて初期化されます。元には戻せません。</p>`,
        `<button class="btn btn-ghost" style="flex:1" data-action="close-sheet">キャンセル</button>
         <button class="btn btn-danger" style="flex:1" data-action="confirm-reset">初期化する</button>`
      );
      return;
    }
    if (act === "confirm-reset") {
      save = HS.STORAGE.reset();
      HS.AUDIO.setEnabled(save.settings.seEnabled);
      closeSheet();
      toast("セーブデータを初期化しました");
      render();
    }
  }

  function initGestureGuards() {
    // Prevent iOS Safari pinch zoom & double-tap zoom
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 280) e.preventDefault();
        lastTouchEnd = now;
      },
      { passive: false }
    );
  }

  function registerSW() {
    if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  function boot() {
    save = HS.STORAGE.load();
    HS.AUDIO.setEnabled(save.settings.seEnabled);
    HS.STORAGE.tryRecoverFromIDB((recovered) => {
      save = recovered;
      HS.AUDIO.setEnabled(save.settings.seEnabled);
      render();
    });

    initGestureGuards();
    HS.DRAG.init(handleDrop);

    document.addEventListener("click", (e) => {
      if (e.target.id === "sheet-backdrop") {
        closeSheet();
        return;
      }
      const btn = e.target.closest("[data-action]");
      if (btn && !btn.disabled) handleAction(btn);
    });

    registerSW();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
