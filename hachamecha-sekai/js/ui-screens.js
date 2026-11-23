(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  function renderTopHeader(save) {
    const power = HS.EQUIP.calcPartyPower(save);
    return `<div class="top-status-strip">
      <div class="brand-chip">◆ はちゃめちゃ世界</div>
      <div class="res-pills">
        <span class="res-pill"><span style="color:#ffd54a">G</span><span class="num">${HS.CONST.fmtNum(save.gold)}</span></span>
        <span class="res-pill"><span style="color:#00e5ff">晶</span><span class="num">${HS.CONST.fmtNum(save.crystal)}</span></span>
        <span class="res-pill"><span style="color:#ff3d9a">核</span><span class="num">${HS.CONST.fmtNum(save.core)}</span></span>
        <span class="res-pill"><span style="color:#6eff5c">戦力</span><span class="num">${HS.CONST.fmtNum(power)}</span></span>
      </div>
    </div>`;
  }

  function renderSynergyChips(save) {
    const defs = save.party.map((id) => (id ? HS.CHARS.get(id) : null)).filter(Boolean);
    const syn = HS.CONST.calcPartySynergies(defs);
    if (!syn.active.length) {
      return `<div class="synergy-bar"><span class="syn-chip dim">同種族2体以上で種族シナジー発動</span></div>`;
    }
    return `<div class="synergy-bar">${syn.active
      .map((s) => `<span class="syn-chip" style="border-color:${s.color};color:${s.color}">${HS.CONST.esc(s.name)}</span>`)
      .join("")}</div>`;
  }

  function renderCharPreviewCard(charId, save) {
    const E = HS.CONST.esc;
    const def = HS.CHARS.get(charId) || HS.CHARS.LIST[0];
    const prog = save.chars[def.id];
    const st = HS.EQUIP.calcCharStats(def.id, save);
    const el = HS.CONST.ELEMENT_MAP[def.element];
    const role = HS.CONST.ROLE_MAP[def.role];

    return `<div class="display-card display-card-hero">
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        ${HS.SVG.emblem(def, 46)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:14px;font-weight:900" class="truncate">${E(def.name)}</span>
            <span class="badge el-${def.element}">${el.name}</span>
            <span class="badge role-${def.role}">${role.name}</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:2px;font-size:10px;color:var(--text-sub)">
            <span>${E(HS.CONST.raceText(def.races))}</span>
            <span>・</span>
            <span class="num">${prog.unlocked ? "Lv." + prog.level + (prog.limitBreak > 0 ? " +" + prog.limitBreak : "") : "未解放"}</span>
            ${prog.exUnlocked ? `<span class="badge rar-CHAOS">専用Lv.${prog.exLevel + 1}</span>` : ""}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:9px;color:var(--text-dim)">戦力</div>
          <div class="num" style="font-size:14px;font-weight:900;color:var(--accent-gold)">${HS.CONST.fmtNum(st.power)}</div>
        </div>
      </div>

      <div class="stat-grid-4">
        <div class="stat-cell"><span class="k">HP</span><span class="v num">${HS.CONST.fmtNum(st.hp)}</span></div>
        <div class="stat-cell"><span class="k">攻撃</span><span class="v num">${HS.CONST.fmtNum(st.atk)}</span></div>
        <div class="stat-cell"><span class="k">防御</span><span class="v num">${HS.CONST.fmtNum(st.def)}</span></div>
        <div class="stat-cell"><span class="k">速度/会心</span><span class="v num">${st.spd}/${st.crit}%</span></div>
      </div>

      <div style="font-size:10px;padding:3px 7px;border-radius:6px;background:rgba(192,132,252,0.12);border:1px solid rgba(192,132,252,0.3);color:#e9d5ff" class="truncate">
        特性【${E(role.abilityName)}】${E(role.abilityDesc)}
      </div>

      <div class="skill-mini-list">
        ${def.skills
          .map(
            (sk, idx) => `<div class="skill-mini-row">
              <span class="badge ${idx === 2 ? "el-fire" : "el-water"}">${idx === 0 ? "技1" : idx === 1 ? "技2" : "奥義"}</span>
              <span style="font-weight:800;flex-shrink:0">${E(sk.name)}</span>
              <span class="truncate" style="color:var(--text-sub);flex:1">${E(sk.desc)}</span>
            </div>`
          )
          .join("")}
      </div>
    </div>`;
  }

  // ==================== 1. QUEST / SORTIE SCREEN ====================
  function renderQuest(save, uiState, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    const mode = save.selectedMode || "journey";
    const stage =
      mode === "abyss"
        ? HS.STAGES.buildAbyssStage(save.abyssCurrentFloor || 1)
        : HS.STAGES.getStageById(save.selectedStageId);
    const power = HS.EQUIP.calcPartyPower(save);
    const law = stage.fixedLaw ? HS.CONST.CHAOS_LAWS.find((l) => l.id === stage.fixedLaw) : null;
    const lastWave = stage.waves[stage.waves.length - 1] || [];
    const sellLabels = ["OFF", "N以下", "R以下", "SR以下", "SSR以下"];
    const sellLabel = sellLabels[(save.settings.autoSellMaxOrder ?? -1) + 1] || "OFF";

    topEl.innerHTML =
      renderTopHeader(save) +
      `<div class="top-visual-body">
        <div class="display-card display-card-hero">
          <div class="section-label">
            <span style="font-size:13px;color:#fff" class="truncate">${E(stage.name)}</span>
            <span class="badge el-${stage.element}">${HS.CONST.ELEMENT_MAP[stage.element].name}域</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--text-sub)">
            <span>WAVE数：${stage.waves.length}</span>
            <span>推奨戦力 <strong class="num" style="color:${power >= stage.recPower ? "#6eff5c" : "#ff8a95"}">${HS.CONST.fmtNum(stage.recPower)}</strong></span>
          </div>
          ${
            law
              ? `<div style="font-size:10px;padding:3px 7px;border-radius:6px;background:rgba(255,201,51,0.14);border:1px solid rgba(255,201,51,0.45);color:#ffe899" class="truncate">領域法則【${E(law.name)}】${E(law.desc)}</div>`
              : `<div style="font-size:10px;padding:3px 7px;border-radius:6px;background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.28);color:#b7f6ff" class="truncate">カオス満タンで世界法則がランダム激変</div>`
          }
          <div class="section-label" style="margin-top:2px"><span>最終WAVE 敵編成</span><span>報酬：装備×${stage.rewards.equipCount} / 核+${stage.rewards.core}</span></div>
          <div class="party-slots">
            ${lastWave
              .map((tid) => {
                const t = HS.STAGES.ENEMY_TEMPLATES[tid];
                if (!t) return "";
                return `<div class="party-slot filled" style="min-height:62px">
                  ${HS.SVG.emblem(t, 30)}
                  <div class="slot-name truncate">${E(t.name)}</div>
                </div>`;
              })
              .join("")}
          </div>
          ${renderSynergyChips(save)}
        </div>
      </div>`;

    let listHtml = "";
    if (mode === "journey") {
      listHtml = HS.STAGES.JOURNEY.map((st, idx) => {
        const prevCleared = idx === 0 || !!save.clearedStages[HS.STAGES.JOURNEY[idx - 1].id];
        const cleared = !!save.clearedStages[st.id];
        const sel = stage.id === st.id;
        return `<button class="stage-row ${sel ? "selected" : ""} ${cleared ? "cleared" : ""} ${!prevCleared ? "locked" : ""}"
          data-action="select-stage" data-id="${st.id}" ${!prevCleared ? "disabled" : ""}>
          <div style="min-width:0;flex:1">
            <div class="truncate" style="font-size:12px;font-weight:900">${E(st.name)}</div>
            <div style="font-size:10px;color:var(--text-sub)">${E(st.areaName)} / 推奨 ${HS.CONST.fmtNum(st.recPower)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
            <span class="badge el-${st.element}">${HS.CONST.ELEMENT_MAP[st.element].name}</span>
            <span class="badge ${cleared ? "role-healer" : "rar-N"}">${cleared ? "制圧" : prevCleared ? "挑む" : "未開放"}</span>
          </div>
        </button>`;
      }).join("");
    } else if (mode === "abyss") {
      const curF = save.abyssCurrentFloor || 1;
      const maxF = save.abyssMaxFloor || 1;
      const floors = [];
      for (let f = Math.max(1, maxF - 4); f <= maxF; f++) floors.push(f);
      listHtml = `<div class="display-card" style="gap:6px">
        <div class="section-label"><span>無限カオス深淵（到達：${maxF}F）</span><span>現在選択：${curF}F</span></div>
        <div class="action-row">
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="abyss-step" data-delta="-5">-5F</button>
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="abyss-step" data-delta="-1">-1F</button>
          <button class="btn btn-sm btn-cyan" style="flex:1.2" data-action="abyss-max">最深部 ${maxF}F</button>
          <button class="btn btn-sm btn-ghost" style="flex:1" data-action="abyss-step" data-delta="1" ${curF >= maxF ? "disabled" : ""}>+1F</button>
        </div>
      </div>` +
        floors
          .reverse()
          .map((f) => {
            const st = HS.STAGES.buildAbyssStage(f);
            return `<button class="stage-row ${curF === f ? "selected" : ""} ${f < maxF ? "cleared" : ""}" data-action="abyss-pick" data-floor="${f}">
              <div style="min-width:0;flex:1">
                <div style="font-size:12px;font-weight:900">${E(st.name)}</div>
                <div style="font-size:10px;color:var(--text-sub)">推奨 ${HS.CONST.fmtNum(st.recPower)} / 核+${st.rewards.core} 装備×${st.rewards.equipCount}</div>
              </div>
              <span class="badge el-${st.element}">${HS.CONST.ELEMENT_MAP[st.element].name}</span>
            </button>`;
          })
          .join("");
    } else if (mode === "trial") {
      listHtml = HS.STAGES.TRIAL.map((st) => {
        const sel = stage.id === st.id;
        const cleared = !!save.clearedStages[st.id];
        return `<button class="stage-row ${sel ? "selected" : ""} ${cleared ? "cleared" : ""}" data-action="select-stage" data-id="${st.id}">
          <div style="min-width:0;flex:1">
            <div class="truncate" style="font-size:12px;font-weight:900">${E(st.name)}</div>
            <div style="font-size:10px;color:var(--text-sub)">専用武器の混沌核×${st.rewards.core} / 推奨 ${HS.CONST.fmtNum(st.recPower)}</div>
          </div>
          <span class="badge el-${st.element}">${HS.CONST.ELEMENT_MAP[st.element].name}</span>
        </button>`;
      }).join("");
    } else {
      listHtml = HS.STAGES.RUSH.map((st) => {
        const sel = stage.id === st.id;
        const cleared = !!save.clearedStages[st.id];
        return `<button class="stage-row ${sel ? "selected" : ""} ${cleared ? "cleared" : ""}" data-action="select-stage" data-id="${st.id}">
          <div style="min-width:0;flex:1">
            <div class="truncate" style="font-size:12px;font-weight:900">${E(st.name)}</div>
            <div style="font-size:10px;color:var(--text-sub)">装備ドロップ×${st.rewards.equipCount} / 推奨 ${HS.CONST.fmtNum(st.recPower)}</div>
          </div>
          <span class="badge el-${st.element}">${HS.CONST.ELEMENT_MAP[st.element].name}</span>
        </button>`;
      }).join("");
    }

    ctrlEl.innerHTML = `<div class="subtabs">
        ${[
          ["journey", "混沌紀行"],
          ["abyss", "カオス深淵"],
          ["trial", "異端試練"],
          ["rush", "カオス乱闘"]
        ]
          .map(
            ([k, lbl]) =>
              `<button class="subtab ${mode === k ? "active" : ""}" data-action="select-mode" data-mode="${k}">${lbl}</button>`
          )
          .join("")}
      </div>
      <div class="scroll-y stage-list" style="flex:1;min-height:0">${listHtml}</div>
      <div class="action-row">
        <button class="btn btn-sm ${save.settings.autoLoop ? "active-toggle" : ""}" style="flex:0.9" data-action="toggle-pref-loop">無限周回：${save.settings.autoLoop ? "ON" : "OFF"}</button>
        <button class="btn btn-sm btn-ghost" style="flex:0.85" data-action="open-autosell-quick">自売:${sellLabel}</button>
        <button class="btn btn-primary" style="flex:1.25" data-action="start-battle">出撃する</button>
      </div>`;
  }

  // ==================== 2. PARTY FORMATION SCREEN ====================
  function renderParty(save, uiState, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    const focusCharId = uiState.selectedCharId || save.party.find(Boolean) || HS.CHARS.LIST[0].id;

    topEl.innerHTML =
      renderTopHeader(save) +
      `<div class="top-visual-body">
        ${renderCharPreviewCard(focusCharId, save)}
        ${renderSynergyChips(save)}
      </div>`;

    const slotsHtml = save.party
      .map((cid, idx) => {
        const ch = cid ? HS.CHARS.get(cid) : null;
        const isSel = uiState.selectedSlotIdx === idx;
        return `<div class="party-slot ${ch ? "filled" : ""} ${isSel ? "selected" : ""}"
          data-action="party-slot-tap" data-slot="${idx}"
          data-drop-zone="party-slot" data-drop-accept="char" data-drop-id="${idx}"
          ${ch ? `data-drag-type="char" data-drag-id="${ch.id}" data-drag-from="slot:${idx}"` : ""}>
          <span class="slot-idx">${idx + 1}</span>
          ${
            ch
              ? `${HS.SVG.emblem(ch, 34)}
                 <div class="slot-name truncate">${E(ch.name)}</div>
                 <div class="slot-meta">${HS.CONST.ELEMENT_MAP[ch.element].name}・${HS.CONST.ROLE_MAP[ch.role].short}</div>`
              : `<div style="font-size:11px;color:var(--text-dim)">空き枠</div>`
          }
        </div>`;
      })
      .join("");

    // Canonical sorted unlocked roster
    const owned = HS.CONST.sortCharacters(HS.CHARS.LIST.filter((c) => save.chars[c.id] && save.chars[c.id].unlocked));
    const rosterHtml = owned
      .map((ch) => {
        const inPartyIdx = save.party.indexOf(ch.id);
        const prog = save.chars[ch.id];
        const isSel = focusCharId === ch.id;
        return `<button class="unit-tile ${inPartyIdx >= 0 ? "in-party" : ""} ${isSel ? "selected" : ""}"
          data-action="party-char-tap" data-id="${ch.id}"
          data-drag-type="char" data-drag-id="${ch.id}" data-drag-from="roster">
          <div class="unit-emblem-wrap">${HS.SVG.emblem(ch, 38)}</div>
          <div class="unit-tile-info">
            <div class="unit-tile-name truncate">${E(ch.name)}</div>
            <div class="unit-tile-tags">
              <span class="mini-tag el-${ch.element}">${HS.CONST.ELEMENT_MAP[ch.element].name}</span>
              <span class="mini-tag">${E(HS.CONST.raceText(ch.races))}</span>
              <span class="mini-tag role-${ch.role}">${HS.CONST.ROLE_MAP[ch.role].short}</span>
            </div>
            <div style="font-size:10px;color:var(--text-sub)" class="num">Lv.${prog.level} ${inPartyIdx >= 0 ? "・編成#" + (inPartyIdx + 1) : ""}</div>
          </div>
        </button>`;
      })
      .join("");

    ctrlEl.innerHTML = `<div class="section-label">
        <span>編成枠（ドラッグ入替／枠選択＋タップ配置）</span>
        <span style="color:var(--accent-cyan)">選択枠 #${(uiState.selectedSlotIdx ?? 0) + 1}</span>
      </div>
      <div class="party-slots">${slotsHtml}</div>
      <div class="scroll-y roster-grid" style="flex:1;min-height:0">${rosterHtml}</div>
      <div class="action-row">
        <button class="btn btn-sm btn-ghost" style="flex:1" data-action="party-auto-best">最強自動編成</button>
        <button class="btn btn-sm btn-danger" style="flex:0.8" data-action="party-clear-slot">選択枠を外す</button>
      </div>`;
  }

  // ==================== 3. EQUIPMENT & EXCLUSIVE WEAPON SCREEN ====================
  function renderEquip(save, uiState, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    const owned = HS.CONST.sortCharacters(HS.CHARS.LIST.filter((c) => save.chars[c.id] && save.chars[c.id].unlocked));
    const charId =
      uiState.selectedCharId && save.chars[uiState.selectedCharId] && save.chars[uiState.selectedCharId].unlocked
        ? uiState.selectedCharId
        : save.party.find(Boolean) || owned[0].id;
    const def = HS.CHARS.get(charId);
    const prog = save.chars[charId];
    const st = HS.EQUIP.calcCharStats(charId, save);
    const eqMap = save.equipsByChar[charId] || {};
    const subTab = uiState.equipSubTab || "gear"; // 'gear' | 'ex' | 'autosell'
    const selEq = uiState.selectedEquipUid ? save.inventory.find((x) => x.uid === uiState.selectedEquipUid) : null;

    topEl.innerHTML =
      renderTopHeader(save) +
      `<div class="top-visual-body">
        <div class="display-card" style="gap:6px">
          <div style="display:flex;align-items:center;gap:8px">
            ${HS.SVG.emblem(def, 40)}
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:900" class="truncate">${E(def.name)} <span class="badge el-${def.element}">${HS.CONST.ELEMENT_MAP[def.element].name}</span></div>
              <div style="font-size:10px;color:var(--text-sub)" class="num">戦力 ${HS.CONST.fmtNum(st.power)} / HP ${HS.CONST.fmtNum(st.hp)} / 攻 ${HS.CONST.fmtNum(st.atk)} / 防 ${HS.CONST.fmtNum(st.def)} / 速 ${st.spd}</div>
            </div>
          </div>
          <div class="equip-slot-grid">
            ${HS.CONST.EQUIP_SLOTS.map((sl) => {
              const eq = eqMap[sl.id] ? save.inventory.find((x) => x.uid === eqMap[sl.id]) : null;
              return `<div class="equip-slot-box">
                <div style="font-size:9px;color:var(--text-dim)">${sl.short}</div>
                ${
                  eq
                    ? `${HS.SVG.equipIcon(eq.slot, eq.rarity, 22)}
                       <div class="truncate rar-${eq.rarity}" style="font-size:9px;font-weight:800;max-width:100%">+${eq.level} ${E(eq.name.slice(0, 5))}</div>`
                    : `<div style="font-size:10px;color:var(--text-dim)">未装備</div>`
                }
              </div>`;
            }).join("")}
            <div class="equip-slot-box" style="border-color:${prog.exUnlocked ? "var(--accent-pink)" : "var(--border-dim)"}">
              <div style="font-size:9px;color:var(--accent-pink)">専用武器</div>
              <div style="font-size:10px;font-weight:900;color:${prog.exUnlocked ? "#ffd54a" : "var(--text-dim)"}">${prog.exUnlocked ? "Lv." + (prog.exLevel + 1) : "未解放"}</div>
            </div>
          </div>
        </div>
        <div class="display-card" style="flex:1;min-height:0;justify-content:center">
          ${
            subTab === "ex"
              ? `<div style="font-size:12px;font-weight:900;color:var(--accent-gold)">${E(def.exWeapon.name)}</div>
                 <div style="font-size:11px;color:#e9d5ff">覚醒効果：${E(def.exWeapon.bonusDesc)}</div>
                 <div style="font-size:10px;color:var(--text-sub)">強化段階：${prog.exUnlocked ? "Lv." + (prog.exLevel + 1) + " / 5" : "未解放（混沌核 " + def.exWeapon.costCore + " / " + def.exWeapon.costGold + "G）"}</div>`
              : selEq
              ? `<div style="display:flex;align-items:center;gap:8px">
                   ${HS.SVG.equipIcon(selEq.slot, selEq.rarity, 32)}
                   <div style="flex:1;min-width:0">
                     <div class="truncate" style="font-size:12px;font-weight:900"><span class="rar-${selEq.rarity}">[${selEq.rarity}]</span> ${E(selEq.name)} +${selEq.level}</div>
                     <div style="font-size:11px;color:var(--accent-cyan);font-weight:800">${selEq.main.label} +${HS.EQUIP.getEquipMainValue(selEq)}</div>
                     <div class="truncate" style="font-size:10px;color:var(--text-sub)">${selEq.subs.map((s) => s.label + "+" + s.val + s.unit).join(" / ")}</div>
                   </div>
                 </div>`
              : `<div style="text-align:center;font-size:11px;color:var(--text-sub)">下の装備をタップまたは部位枠へドラッグして装着・強化できます</div>`
          }
        </div>
      </div>`;

    // Character selector bar (inside bottom control)
    const charStrip = `<div class="scroll-x" style="display:flex;gap:5px;flex-shrink:0;padding-bottom:2px">
      ${owned
        .map(
          (c) => `<button class="btn btn-sm ${c.id === charId ? "active-toggle" : ""}" style="flex-shrink:0;padding:0 9px;min-height:36px" data-action="equip-select-char" data-id="${c.id}">
            ${HS.SVG.emblem(c, 22)}<span>${E(c.name)}</span>
          </button>`
        )
        .join("")}
    </div>`;

    let bodyHtml = "";
    if (subTab === "gear") {
      const slotDrops = `<div class="equip-slot-grid" style="grid-template-columns:repeat(3,1fr)">
        ${HS.CONST.EQUIP_SLOTS.map((sl) => {
          const eq = eqMap[sl.id] ? save.inventory.find((x) => x.uid === eqMap[sl.id]) : null;
          return `<button class="equip-slot-box ${uiState.equipSlotFilter === sl.id ? "selected" : ""}"
            data-action="equip-filter-slot" data-slot="${sl.id}"
            data-drop-zone="equip-slot" data-drop-accept="equip" data-drop-id="${sl.id}">
            <div style="font-size:10px;font-weight:900">${sl.name}枠</div>
            <div class="truncate" style="font-size:9px;color:${eq ? "var(--accent-cyan)" : "var(--text-dim)"};max-width:100%">${eq ? E(eq.name) : "ドロップ装着"}</div>
          </button>`;
        }).join("")}
      </div>`;

      const filtered = save.inventory
        .filter((eq) => !uiState.equipSlotFilter || eq.slot === uiState.equipSlotFilter)
        .slice()
        .sort((a, b) => HS.CONST.RARITY_MAP[b.rarity].order - HS.CONST.RARITY_MAP[a.rarity].order || b.level - a.level);

      const listHtml = filtered.length
        ? filtered
            .map((eq) => {
              const owner = HS.EQUIP.isEquippedBy(save, eq.uid);
              const isSel = uiState.selectedEquipUid === eq.uid;
              return `<div class="equip-row ${isSel ? "selected" : ""}"
                data-action="equip-select-item" data-uid="${eq.uid}"
                data-drag-type="equip" data-drag-id="${eq.uid}" data-drag-label="${E(eq.name)}">
                ${HS.SVG.equipIcon(eq.slot, eq.rarity, 28)}
                <div style="flex:1;min-width:0">
                  <div class="truncate" style="font-size:12px;font-weight:800">
                    ${eq.locked ? "🔒" : ""}<span class="rar-${eq.rarity}">[${eq.rarity}]</span> ${E(eq.name)} +${eq.level}
                  </div>
                  <div class="truncate" style="font-size:10px;color:var(--text-sub)">
                    ${eq.main.label}+${HS.EQUIP.getEquipMainValue(eq)} ${owner ? "・装備中(" + E(HS.CHARS.get(owner).name.slice(0, 4)) + ")" : ""}
                  </div>
                </div>
                <button class="btn btn-sm btn-cyan" data-action="equip-wear" data-uid="${eq.uid}">${owner === charId ? "外す" : "装着"}</button>
              </div>`;
            })
            .join("")
        : `<div style="text-align:center;color:var(--text-dim);padding:16px;font-size:12px">該当する装備がありません</div>`;

      const upgCost = selEq ? HS.EQUIP.getUpgradeCost(selEq) : 0;
      const sellVal = selEq ? HS.EQUIP.getSellValue(selEq) : 0;
      const selOwner = selEq ? HS.EQUIP.isEquippedBy(save, selEq.uid) : null;

      bodyHtml = `${slotDrops}
        <div class="scroll-y" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:5px">${listHtml}</div>
        <div class="action-row">
          <button class="btn btn-sm btn-gold" style="flex:1.1" data-action="equip-upgrade" ${!selEq || selEq.level >= 15 || save.gold < upgCost ? "disabled" : ""}>強化 (${HS.CONST.fmtNum(upgCost)}G)</button>
          <button class="btn btn-sm ${selEq && selEq.locked ? "active-toggle" : "btn-ghost"}" style="flex:0.7" data-action="equip-lock" ${!selEq ? "disabled" : ""}>${selEq && selEq.locked ? "保護中" : "保護"}</button>
          <button class="btn btn-sm btn-danger" style="flex:0.9" data-action="equip-sell" ${!selEq || selEq.locked || selOwner ? "disabled" : ""}>売却 +${HS.CONST.fmtNum(sellVal)}</button>
        </div>`;
    } else if (subTab === "ex") {
      const ex = def.exWeapon;
      const nextCore = prog.exUnlocked ? Math.round(ex.costCore * (0.7 + prog.exLevel * 0.45)) : ex.costCore;
      const nextGold = prog.exUnlocked ? Math.round(ex.costGold * (0.7 + prog.exLevel * 0.45)) : ex.costGold;
      const isMax = prog.exUnlocked && prog.exLevel >= 4;
      const canPay = !isMax && save.core >= nextCore && save.gold >= nextGold;

      bodyHtml = `<div class="display-card" style="flex:1;justify-content:center;gap:8px">
          <div style="font-size:13px;font-weight:900;color:var(--accent-pink)">${E(def.name)} 専用武器</div>
          <div style="font-size:14px;font-weight:900">${E(ex.name)}</div>
          <div style="font-size:11px;color:var(--text-sub)">覚醒：${E(ex.bonusDesc)}</div>
          <div style="font-size:11px;color:var(--accent-cyan)">
            必要素材：混沌核 ${nextCore}（所持 ${save.core}） / ${HS.CONST.fmtNum(nextGold)}G
          </div>
          <button class="btn btn-primary btn-block" data-action="equip-ex-upgrade" data-id="${def.id}" ${canPay ? "" : "disabled"}>
            ${isMax ? "専用武器 最大覚醒済" : prog.exUnlocked ? "専用武器を強化 (Lv." + (prog.exLevel + 2) + ")" : "専用武器を解放する"}
          </button>
        </div>`;
    } else {
      const cur = save.settings.autoSellMaxOrder ?? -1;
      const opts = [
        [-1, "OFF（全て残す）"],
        [0, "N 以下を自動売却"],
        [1, "R 以下を自動売却"],
        [2, "SR 以下を自動売却"],
        [3, "SSR 以下を自動売却"]
      ];
      bodyHtml = `<div class="scroll-y" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:5px">
          ${opts
            .map(
              ([val, lbl]) => `<button class="stage-row ${cur === val ? "selected" : ""}" data-action="set-autosell" data-order="${val}">
                <span style="font-size:12px;font-weight:800">${lbl}</span>
                <span class="badge ${cur === val ? "role-healer" : "rar-N"}">${cur === val ? "適用中" : "選択"}</span>
              </button>`
            )
            .join("")}
        </div>
        <div class="action-row">
          <button class="btn btn-danger btn-block" data-action="bulk-sell-now">設定条件で所持装備を一括売却</button>
        </div>`;
    }

    ctrlEl.innerHTML = `${charStrip}
      <div class="subtabs">
        <button class="subtab ${subTab === "gear" ? "active" : ""}" data-action="equip-subtab" data-tab="gear">装備装着 (${save.inventory.length})</button>
        <button class="subtab ${subTab === "ex" ? "active" : ""}" data-action="equip-subtab" data-tab="ex">専用武器</button>
        <button class="subtab ${subTab === "autosell" ? "active" : ""}" data-action="equip-subtab" data-tab="autosell">自動売却</button>
      </div>
      ${bodyHtml}`;
  }

  // ==================== 4. ROSTER / UNLOCK & TRAIN SCREEN ====================
  function renderRoster(save, uiState, topEl, ctrlEl) {
    const E = HS.CONST.esc;
    const focusId = uiState.selectedCharId || HS.CHARS.LIST[0].id;
    const def = HS.CHARS.get(focusId) || HS.CHARS.LIST[0];
    const prog = save.chars[def.id];

    topEl.innerHTML =
      renderTopHeader(save) +
      `<div class="top-visual-body">${renderCharPreviewCard(def.id, save)}</div>`;

    // Strictly sorted list of all 24 characters
    const sorted = HS.CONST.sortCharacters(HS.CHARS.LIST);
    const gridHtml = sorted
      .map((ch) => {
        const p = save.chars[ch.id];
        const isSel = ch.id === def.id;
        return `<button class="unit-tile ${p.unlocked ? "" : "locked"} ${isSel ? "selected" : ""}" data-action="roster-select" data-id="${ch.id}">
          <div class="unit-emblem-wrap">${HS.SVG.emblem(ch, 38)}</div>
          <div class="unit-tile-info">
            <div class="unit-tile-name truncate">${E(ch.name)}</div>
            <div class="unit-tile-tags">
              <span class="mini-tag el-${ch.element}">${HS.CONST.ELEMENT_MAP[ch.element].name}</span>
              <span class="mini-tag">${E(HS.CONST.raceText(ch.races))}</span>
              <span class="mini-tag role-${ch.role}">${HS.CONST.ROLE_MAP[ch.role].short}</span>
            </div>
            <div style="font-size:10px;color:${p.unlocked ? "var(--accent-lime)" : "var(--accent-gold)"}" class="num">
              ${p.unlocked ? "Lv." + p.level + (p.limitBreak ? " +" + p.limitBreak : "") : "解放：晶" + ch.unlock.crystal + " / " + ch.unlock.gold + "G"}
            </div>
          </div>
        </button>`;
      })
      .join("");

    let footerHtml = "";
    if (!prog.unlocked) {
      const stageOk = !def.unlock.stage || !!save.clearedStages[def.unlock.stage];
      const stageObj = def.unlock.stage ? HS.STAGES.getStageById(def.unlock.stage) : null;
      const canUnlock = stageOk && save.crystal >= (def.unlock.crystal || 0) && save.gold >= (def.unlock.gold || 0);
      footerHtml = `<div class="action-row">
        <button class="btn btn-primary btn-block" data-action="roster-unlock" data-id="${def.id}" ${canUnlock ? "" : "disabled"}>
          ${
            !stageOk
              ? "要制圧：" + E(stageObj ? stageObj.name : def.unlock.stage)
              : `確定解放（混沌結晶 ${def.unlock.crystal} / ${HS.CONST.fmtNum(def.unlock.gold)}G）`
          }
        </button>
      </div>`;
    } else {
      const lvCost = Math.round(90 + prog.level * 55);
      const lbCostCrystal = 25 + prog.limitBreak * 20;
      const lbCostGold = 600 + prog.limitBreak * 500;
      footerHtml = `<div class="action-row">
        <button class="btn btn-cyan" style="flex:1" data-action="roster-lvup" data-id="${def.id}" ${prog.level >= 99 || save.gold < lvCost ? "disabled" : ""}>
          LvUP (${HS.CONST.fmtNum(lvCost)}G)
        </button>
        <button class="btn btn-gold" style="flex:1" data-action="roster-lb" data-id="${def.id}" ${prog.limitBreak >= 5 || save.crystal < lbCostCrystal || save.gold < lbCostGold ? "disabled" : ""}>
          ${prog.limitBreak >= 5 ? "突破MAX" : `限界突破 (晶${lbCostCrystal})`}
        </button>
      </div>`;
    }

    ctrlEl.innerHTML = `<div class="section-label">
        <span>仲間一覧（属性→種族→ロール順）</span>
        <span class="num">${sorted.filter((c) => save.chars[c.id].unlocked).length} / ${sorted.length}</span>
      </div>
      <div class="scroll-y roster-grid" style="flex:1;min-height:0">${gridHtml}</div>
      ${footerHtml}`;
  }

  // ==================== 5. RECORDS & SETTINGS SCREEN ====================
  function renderSettings(save, uiState, topEl, ctrlEl) {
    const winRate = save.stats.totalBattles ? Math.round((save.stats.totalWins / save.stats.totalBattles) * 100) : 0;

    topEl.innerHTML =
      renderTopHeader(save) +
      `<div class="top-visual-body">
        <div class="display-card">
          <div class="section-label"><span>冒険の記録</span><span>完全ソロ・オフライン対応</span></div>
          <div class="stat-grid-4">
            <div class="stat-cell"><span class="k">総勝利</span><span class="v num">${save.stats.totalWins}</span></div>
            <div class="stat-cell"><span class="k">勝率</span><span class="v num">${winRate}%</span></div>
            <div class="stat-cell"><span class="k">最大一撃</span><span class="v num">${HS.CONST.fmtNum(save.stats.maxSingleDamage)}</span></div>
            <div class="stat-cell"><span class="k">深淵到達</span><span class="v num">${save.abyssMaxFloor}F</span></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-sub)">
            <span>カオス法則発動：${save.stats.chaosTriggered}回</span>
            <span>自動売却累計：${save.stats.totalAutoSold}件</span>
          </div>
        </div>
        <div class="display-card" style="flex:1;min-height:0;gap:4px">
          <div class="section-label"><span>属性相性 & 種族シナジー</span></div>
          <div style="font-size:11px;color:var(--text-main)">
            <span class="el-fire badge">炎</span> → <span class="el-wind badge">風</span> → <span class="el-water badge">水</span> → <span class="el-fire badge">炎</span>（有利1.35倍 / 不利0.75倍）
          </div>
          <div style="font-size:11px;color:var(--text-main)">
            <span class="el-light badge">光</span> ⇔ <span class="el-dark badge">闇</span>（相互1.30倍） / <span class="el-none badge">無</span>（等倍・無律時1.4倍）
          </div>
          <div style="font-size:10px;color:var(--text-sub);line-height:1.4">
            人間(全能) / 竜(火力&炎上) / 魔物(会心&混沌) / 妖精(速度&癒) / 機械(防御&障壁)<br>
            2種族持ちは両方の種族シナジーを同時に加算！
          </div>
        </div>
      </div>`;

    ctrlEl.innerHTML = `<div class="scroll-y" style="flex:1;min-height:0;display:flex;flex-direction:column;gap:6px">
        <div class="stage-row">
          <div><div style="font-size:12px;font-weight:800">効果音（SE）</div><div style="font-size:10px;color:var(--text-sub)">合成サウンドのON/OFF</div></div>
          <button class="btn btn-sm ${save.settings.seEnabled ? "active-toggle" : ""}" data-action="set-se">${save.settings.seEnabled ? "ON" : "OFF"}</button>
        </div>
        <div class="stage-row">
          <div><div style="font-size:12px;font-weight:800">戦闘速度（最大3倍）</div><div style="font-size:10px;color:var(--text-sub)">現在の速度設定</div></div>
          <button class="btn btn-sm active-toggle" data-action="set-speed">${save.settings.speed}倍速</button>
        </div>
        <div class="stage-row">
          <div><div style="font-size:12px;font-weight:800">戦闘オート初期状態</div><div style="font-size:10px;color:var(--text-sub)">出撃時の自動行動設定</div></div>
          <button class="btn btn-sm ${save.settings.autoBattle ? "active-toggle" : ""}" data-action="set-auto">${save.settings.autoBattle ? "AUTO" : "手動"}</button>
        </div>
        <div class="action-row">
          <button class="btn btn-cyan" style="flex:1" data-action="data-export">セーブ書き出し</button>
          <button class="btn btn-ghost" style="flex:1" data-action="data-import">セーブ読み込み</button>
        </div>
        <button class="btn btn-danger btn-block" data-action="data-reset-ask">セーブデータ初期化</button>
      </div>`;
  }

  HS.UI_SCREENS = {
    renderQuest,
    renderParty,
    renderEquip,
    renderRoster,
    renderSettings
  };
})(window);
