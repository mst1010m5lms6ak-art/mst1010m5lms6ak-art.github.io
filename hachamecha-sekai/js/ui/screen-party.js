(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const uiState = {
    tab: 'party',          // party | ability | mastery | awaken
    slotMode: 'party',     // party | link
    slotIdx: 0,
    selectedCharId: 'c_fire_tank',
    abilityTierView: 1,
    listScrollTop: 0,
    stripScrollLeft: 0
  };

  function getUnlockedSorted() {
    const state = Hacha.state;
    return Hacha.data.CHARACTERS
      .filter((c) => state.chars[c.id] && state.chars[c.id].unlocked)
      .sort(U.compareRosterEntities);
  }

  function removeFromDispatch(state, charId) {
    state.dispatches.forEach((d) => {
      if (d.charIds.includes(charId)) {
        d.charIds = d.charIds.filter((id) => id !== charId);
        if (d.charIds.length === 0) {
          d.active = false;
          d.progress = 0;
        }
      }
    });
  }

  function assignCharToSlot(charId) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    removeFromDispatch(state, charId);

    if (uiState.slotMode === 'party') {
      const prevIdx = state.party.indexOf(charId);
      const linkIdx = state.links.indexOf(charId);
      if (linkIdx >= 0) state.links[linkIdx] = null;

      if (prevIdx >= 0 && prevIdx !== uiState.slotIdx) {
        const tmp = state.party[uiState.slotIdx];
        state.party[uiState.slotIdx] = charId;
        state.party[prevIdx] = tmp;
      } else {
        state.party[uiState.slotIdx] = charId;
      }
      cm.showToast(`主力枠${uiState.slotIdx + 1}に配置しました`);
    } else {
      const partyIdx = state.party.indexOf(charId);
      if (partyIdx >= 0) {
        if (state.party.filter(Boolean).length <= 1) {
          cm.showToast('主力は最低1人必要です', 'danger');
          return;
        }
        state.party[partyIdx] = null;
      }
      const prevLink = state.links.indexOf(charId);
      if (prevLink >= 0 && prevLink !== uiState.slotIdx) {
        const tmp = state.links[uiState.slotIdx];
        state.links[uiState.slotIdx] = charId;
        state.links[prevLink] = tmp;
      } else {
        state.links[uiState.slotIdx] = charId;
      }
      cm.showToast(`支援枠${uiState.slotIdx + 1}に配置しました`);
    }
    Hacha.storage.saveState(true);
  }

  function renderCharStripHtml(roster, selectedId) {
    const state = Hacha.state;
    return `
      <div class="scroll-strip-h" id="party-char-strip">
        ${roster.map((c) => {
          const assign = Hacha.engine.stats.getCharAssignment(state, c.id);
          const active = c.id === selectedId;
          const inP = assign.type === 'party' ? 'in-party' : '';
          return `
            <button class="char-chip-btn ${active ? 'active' : ''} ${inP}" data-strip-char="${c.id}">
              <span>${c.icon}</span>
              <span>${U.escapeHtml(c.name)}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function render(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const roster = getUnlockedSorted();

    if (Hacha.ui.sharedCharId && roster.some((c) => c.id === Hacha.ui.sharedCharId)) {
      uiState.selectedCharId = Hacha.ui.sharedCharId;
    }
    if (!roster.some((c) => c.id === uiState.selectedCharId) && roster.length) {
      uiState.selectedCharId = roster[0].id;
    }
    Hacha.ui.sharedCharId = uiState.selectedCharId;
    const charDef = Hacha.data.CHARACTER_MAP[uiState.selectedCharId] || roster[0];
    const prog = state.chars[charDef.id];
    const stats = Hacha.engine.stats.computeSingleCharStats(state, charDef.id, true);
    const resInfo = Hacha.engine.stats.computeActiveResonances(state, state.party, state.links);
    const roleMeta = C.ROLE_MAP[charDef.role];
    const eqs = Hacha.engine.stats.getEquippedItems(state, charDef.id);

    /* ==================== 上半分：閲覧専用キャラ詳細（図鑑外のため紹介文なし・375px見切れゼロ） ==================== */
    const eqSummary = ['weapon', 'armor', 'charm'].map((slot) => {
      const it = eqs[slot];
      if (!it) return `<span class="badge el-none">${C.SLOT_MAP[slot].icon}未装備</span>`;
      const tpl = Hacha.data.EQUIPMENT_MAP[it.templateId];
      const q = U.getQualityInfo(it.quality);
      return `<span class="badge ${q.badgeClass}">${tpl.icon}${U.escapeHtml(tpl.name)} ${q.q}%</span>`;
    }).join('');

    const activeAbilities = [];
    const roleTiers = Hacha.data.ABILITIES_BY_ROLE[charDef.role] || [];
    for (let t = 0; t < prog.abilityTier; t++) {
      const chIdx = prog.abilityChoices[t] || 0;
      const ab = roleTiers[t] && roleTiers[t][chIdx];
      if (ab) activeAbilities.push(ab.name);
    }
    const abBadgesHtml = activeAbilities.length
      ? activeAbilities.map((nm) => `<span class="badge scope-area">🔷${U.escapeHtml(nm)}</span>`).join('')
      : `<span class="badge el-none">アビリティ未解放</span>`;

    const skillsHtml = charDef.skills.map((sk, idx) => `
      <div class="skill-mini-row">
        <div class="meta-row">
          ${cm.scopeBadge(sk.scope)}
          <span class="unit-name-full">${U.escapeHtml(sk.name)}</span>
          <span class="bu-hp-text" style="color:#ffd15c;">R${prog.skillRanks[idx] || 1}</span>
        </div>
        <span class="skill-desc-line">${U.escapeHtml(sk.desc)}</span>
      </div>
    `).join('');

    const awakeStars = '★'.repeat(prog.awakening) + '☆'.repeat(5 - prog.awakening);
    const resBadgesHtml = resInfo.active.length
      ? resInfo.active.slice(0, 4).map((r) => `<span class="badge race-badge">${r.icon}${r.name}</span>`).join('')
      : `<span class="badge el-none">共鳴なし</span>`;

    topEl.innerHTML = `
      ${cm.renderViewHeader(`編成・育成｜所持 ${roster.length}/${Hacha.data.CHARACTERS.length}`)}
      <div class="panel panel-fill">
        <div class="meta-row-nowrap">
          <div class="meta-row">
            <span style="font-size:15px;">${charDef.icon}</span>
            <span class="view-title">${U.escapeHtml(charDef.name)}</span>
            ${cm.elementBadge(charDef.element)}
            ${cm.raceBadges(charDef.races)}
            ${cm.roleShortBadge(charDef.role)}
          </div>
          <div class="meta-row">
            <span class="badge q-master">戦力${U.formatNum(stats.power)}</span>
            <span style="color:#ffd15c;font-size:10px;font-weight:800;">${awakeStars}</span>
          </div>
        </div>

        <div class="detail-grid-stats">
          <div class="stat-chip"><span class="stat-chip-lbl">HP</span><span class="stat-chip-val">${U.formatNum(stats.hp)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">攻撃</span><span class="stat-chip-val">${U.formatNum(stats.atk)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">防御</span><span class="stat-chip-val">${U.formatNum(stats.def)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">速度 / 会心</span><span class="stat-chip-val">${stats.spd} / ${Math.round(stats.crit * 100)}%</span></div>
        </div>

        <div class="skill-mini-list">${skillsHtml}</div>

        <div class="meta-row">${eqSummary}</div>
        <div class="meta-row">${abBadgesHtml}</div>

        <div class="meta-row" style="margin-top:auto;">
          <span class="bu-hp-text" style="color:#48d6ff;">🌈共鳴(${resInfo.active.length})：</span>
          ${resBadgesHtml}
        </div>
      </div>
    `;

    /* ==================== 下半分：親指ゾーン操作エリア（スクロールバーなし縦横スクロール） ==================== */
    let bodyHtml = '';

    if (uiState.tab === 'party') {
      const slotsRow = [0, 1, 2, 3].map((i) => {
        const cid = uiState.slotMode === 'party' ? state.party[i] : state.links[i];
        const c = cid ? Hacha.data.CHARACTER_MAP[cid] : null;
        const active = uiState.slotIdx === i;
        return `
          <button class="party-slot-card compact-slot ${active ? 'active-slot' : ''}" data-slot-idx="${i}">
            <div class="bu-hp-text" style="color:${uiState.slotMode === 'party' ? '#6effb8' : '#d6a4ff'};">
              ${uiState.slotMode === 'party' ? `主力${i + 1}` : `支援${i + 1}`}
            </div>
            <div class="unit-name-full">${c ? `${c.icon}${U.escapeHtml(c.name)}` : '空き枠'}</div>
          </button>
        `;
      }).join('');

      const gridTiles = roster.map((c) => {
        const assign = Hacha.engine.stats.getCharAssignment(state, c.id);
        const sel = c.id === charDef.id;
        const cls = assign.type === 'party' ? 'in-party' : (assign.type === 'link' ? 'in-link' : (assign.type === 'dispatch' ? 'in-dispatch' : ''));
        return `
          <button class="item-tile ${sel ? 'selected' : ''} ${cls}" data-pick-char="${c.id}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">${c.icon}${U.escapeHtml(c.name)}</span>
              <span class="bu-hp-text" style="color:${assign.type === 'party' ? '#6effb8' : (assign.type === 'link' ? '#d6a4ff' : '#ffd15c')};">${assign.label}</span>
            </div>
            <div class="meta-row">
              ${cm.elementBadge(c.element)}
              ${cm.raceBadges(c.races)}
              ${cm.roleShortBadge(c.role)}
            </div>
          </button>
        `;
      }).join('');

      const curSlotCharId = uiState.slotMode === 'party' ? state.party[uiState.slotIdx] : state.links[uiState.slotIdx];
      const canRemoveSlot = !!curSlotCharId && (uiState.slotMode === 'link' || state.party.filter(Boolean).length > 1);

      bodyHtml = `
        <div class="action-row">
          <button class="btn btn-sm ${uiState.slotMode === 'party' ? 'btn-emerald' : ''}" data-slot-mode="party">⚔️ 主力(4)</button>
          <button class="btn btn-sm ${uiState.slotMode === 'link' ? 'btn-primary' : ''}" data-slot-mode="link">🔗 支援(4)</button>
          <button class="btn btn-sm btn-gold" id="btn-assign-selected">枠へ配置</button>
          <button class="btn btn-sm btn-danger" id="btn-clear-slot" ${canRemoveSlot ? '' : 'disabled'}>外す</button>
        </div>
        <div class="party-slots-4">${slotsRow}</div>
        <div class="scroll-list-v scroll-grid-2" id="party-char-list">${gridTiles}</div>
      `;
    } else if (uiState.tab === 'ability') {
      const curTier = U.clamp(uiState.abilityTierView, 1, 5);
      const isTierUnlocked = curTier <= prog.abilityTier;
      const choices = (Hacha.data.ABILITIES_BY_ROLE[charDef.role] || [])[curTier - 1] || [];
      const activeChoiceIdx = prog.abilityChoices[curTier - 1] || 0;
      const nextCost = Hacha.data.ABILITY_UNLOCK_COSTS[prog.abilityTier + 1];
      const ownedCrys = state.resources.crystals[charDef.role] || 0;

      const tierBtns = [1, 2, 3, 4, 5].map((t) => {
        const unlocked = t <= prog.abilityTier;
        return `
          <button class="sub-tab ${curTier === t ? 'active' : ''}" data-ab-tier="${t}">
            ${unlocked ? '' : '🔒'}段階${t}
          </button>
        `;
      }).join('');

      const choiceCards = choices.map((ab, idx) => {
        const picked = isTierUnlocked && activeChoiceIdx === idx;
        return `
          <button class="ability-tile ${picked ? 'selected' : ''} ${!isTierUnlocked ? 'locked-tile' : ''}" data-ab-choice="${idx}">
            <div class="meta-row-nowrap">
              <span class="unit-name-full">${picked ? '✅ ' : ''}${U.escapeHtml(ab.name)}</span>
              <span class="bu-hp-text">${idx + 1}/5</span>
            </div>
            <div class="skill-desc-line">${U.escapeHtml(ab.desc)}</div>
          </button>
        `;
      }).join('');

      const canUnlockNext = nextCost && ownedCrys >= nextCost.crystals && state.resources.coins >= nextCost.coins;

      bodyHtml = `
        ${renderCharStripHtml(roster, charDef.id)}
        <div class="sub-tabs">${tierBtns}</div>
        <div class="scroll-list-v scroll-list-1" id="party-ab-list">${choiceCards}</div>
        <div class="action-row">
          ${nextCost ? `
            <button class="btn btn-sm btn-gold" id="btn-unlock-ab-tier" ${canUnlockNext ? '' : 'disabled'}>
              🔓 段階${prog.abilityTier + 1}解放（${roleMeta.icon}${ownedCrys}/${nextCost.crystals}・🪙${nextCost.coins}）
            </button>
          ` : `<button class="btn btn-sm btn-emerald" disabled>✨ 全5段階解放済み（${roleMeta.icon}所持${ownedCrys}）</button>`}
        </div>
      `;
    } else if (uiState.tab === 'mastery') {
      const rows = charDef.skills.map((sk, idx) => {
        const rank = prog.skillRanks[idx] || 1;
        const uses = prog.skillUses[idx] || 0;
        const need = 10 + rank * 7;
        const costScrolls = rank;
        const costCoins = rank * 120;
        const isMax = rank >= 10;
        const canTrain = !isMax && state.resources.scrolls >= costScrolls && state.resources.coins >= costCoins;
        return `
          <div class="item-tile" style="justify-content:center;gap:3px;">
            <div class="meta-row-nowrap">
              <div class="meta-row">
                ${cm.scopeBadge(sk.scope)}
                <span class="unit-name-full">${U.escapeHtml(sk.name)}</span>
              </div>
              <span class="unit-name-full" style="color:#ffd15c;">ランク ${rank}/10</span>
            </div>
            <div class="skill-desc-line">${U.escapeHtml(sk.desc)}</div>
            <div class="meta-row-nowrap">
              <span class="bu-hp-text">${isMax ? '極意到達' : `実戦習熟 ${uses}/${need}回`}</span>
              <button class="btn btn-sm btn-primary" data-train-skill="${idx}" ${canTrain ? '' : 'disabled'}>
                ${isMax ? '最大' : `📜${costScrolls}・🪙${costCoins}で磨く`}
              </button>
            </div>
          </div>
        `;
      }).join('');

      bodyHtml = `
        ${renderCharStripHtml(roster, charDef.id)}
        <div class="select-list-fixed" style="grid-template-rows:repeat(3,1fr);">${rows}</div>
      `;
    } else {
      /* 異界覚醒 */
      const curAw = prog.awakening || 0;
      const isMax = curAw >= 5;
      const needFrag = (curAw + 1) * 3;
      const needCoins = (curAw + 1) * 650;
      const canAwake = !isMax && state.resources.fragments >= needFrag && state.resources.coins >= needCoins;

      bodyHtml = `
        ${renderCharStripHtml(roster, charDef.id)}
        <div class="panel panel-fill" style="justify-content:space-between;">
          <div class="meta-row-nowrap">
            <span class="view-title">異界覚醒段階</span>
            <span style="color:#ffd15c;font-size:15px;font-weight:900;">${awakeStars}</span>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">現在倍率</span><span class="stat-chip-val">+${curAw * 14}%</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">次段階</span><span class="stat-chip-val" style="color:#6effb8;">${isMax ? '極限' : `+${(curAw + 1) * 14}%`}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">速度補正</span><span class="stat-chip-val">+${curAw * 3}%</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">会心補正</span><span class="stat-chip-val">+${(curAw * 1.5).toFixed(1)}%</span></div>
          </div>
          <div class="note-text">
            混沌の核片で基礎能力・速度・会心の上限を引き上げます（レイド・異界塔・闘技場・異界派遣で獲得）。
          </div>
          <button class="btn btn-gold" id="btn-do-awaken" ${canAwake ? '' : 'disabled'}>
            ${isMax ? '✨ 異界覚醒 最大到達' : `🔮 異界覚醒 ★${curAw + 1}へ（核片${needFrag}・🪙${needCoins}）`}
          </button>
        </div>
      `;
    }

    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${uiState.tab === 'party' ? 'active' : ''}" data-ptab="party">⚔️編成</button>
        <button class="sub-tab ${uiState.tab === 'ability' ? 'active' : ''}" data-ptab="ability">🔷アビリティ</button>
        <button class="sub-tab ${uiState.tab === 'mastery' ? 'active' : ''}" data-ptab="mastery">📜技習熟</button>
        <button class="sub-tab ${uiState.tab === 'awaken' ? 'active' : ''}" data-ptab="awaken">🔮異界覚醒</button>
      </div>
      ${bodyHtml}
    `;

    /* スクロール位置復元＆選択チップ自動可視化 */
    const listEl = bottomEl.querySelector('#party-char-list');
    cm.bindVerticalScrollState(listEl, () => uiState.listScrollTop, (v) => { uiState.listScrollTop = v; });

    const stripEl = bottomEl.querySelector('#party-char-strip');
    cm.bindHorizontalStripState(stripEl, () => uiState.stripScrollLeft, (v) => { uiState.stripScrollLeft = v; }, '.char-chip-btn.active');

    /* イベント結線（すべて下半分） */
    bottomEl.querySelectorAll('[data-ptab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.tab = btn.getAttribute('data-ptab');
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-strip-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (stripEl) uiState.stripScrollLeft = stripEl.scrollLeft;
        uiState.selectedCharId = btn.getAttribute('data-strip-char');
        Hacha.ui.sharedCharId = uiState.selectedCharId;
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-slot-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.slotMode = btn.getAttribute('data-slot-mode');
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-slot-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.slotIdx = parseInt(btn.getAttribute('data-slot-idx'), 10);
        const curId = uiState.slotMode === 'party' ? state.party[uiState.slotIdx] : state.links[uiState.slotIdx];
        if (curId) {
          uiState.selectedCharId = curId;
          Hacha.ui.sharedCharId = curId;
        }
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-pick-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (listEl) uiState.listScrollTop = listEl.scrollTop;
        const cid = btn.getAttribute('data-pick-char');
        if (uiState.selectedCharId === cid) {
          assignCharToSlot(cid);
        } else {
          uiState.selectedCharId = cid;
          Hacha.ui.sharedCharId = cid;
        }
        app.renderCurrent();
      });
    });

    const assignBtn = bottomEl.querySelector('#btn-assign-selected');
    if (assignBtn) {
      assignBtn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (listEl) uiState.listScrollTop = listEl.scrollTop;
        assignCharToSlot(charDef.id);
        app.renderCurrent();
      });
    }

    const clearSlotBtn = bottomEl.querySelector('#btn-clear-slot');
    if (clearSlotBtn) {
      clearSlotBtn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (uiState.slotMode === 'link') {
          if (state.links[uiState.slotIdx]) {
            state.links[uiState.slotIdx] = null;
            Hacha.storage.saveState(true);
            cm.showToast(`支援${uiState.slotIdx + 1}枠を外しました`);
          }
        } else if (state.party[uiState.slotIdx] && state.party.filter(Boolean).length > 1) {
          state.party[uiState.slotIdx] = null;
          Hacha.storage.saveState(true);
          cm.showToast(`主力${uiState.slotIdx + 1}枠を外しました`);
        }
        app.renderCurrent();
      });
    }

    bottomEl.querySelectorAll('[data-ab-tier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.abilityTierView = parseInt(btn.getAttribute('data-ab-tier'), 10);
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-ab-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tier = U.clamp(uiState.abilityTierView, 1, 5);
        if (tier > prog.abilityTier) {
          cm.showToast('先にこの段階を解放してください', 'danger');
          return;
        }
        Hacha.audio.play('buff');
        prog.abilityChoices[tier - 1] = parseInt(btn.getAttribute('data-ab-choice'), 10);
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    });

    const unlockTierBtn = bottomEl.querySelector('#btn-unlock-ab-tier');
    if (unlockTierBtn) {
      unlockTierBtn.addEventListener('click', () => {
        const nextTier = prog.abilityTier + 1;
        const cost = Hacha.data.ABILITY_UNLOCK_COSTS[nextTier];
        if (!cost) return;
        if ((state.resources.crystals[charDef.role] || 0) < cost.crystals || state.resources.coins < cost.coins) return;
        state.resources.crystals[charDef.role] -= cost.crystals;
        state.resources.coins -= cost.coins;
        prog.abilityTier = nextTier;
        uiState.abilityTierView = nextTier;
        Hacha.audio.play('win');
        Hacha.storage.saveState(true);
        cm.showToast(`${charDef.name}のアビリティ段階${nextTier}を解放！`, 'gold');
        app.renderCurrent();
      });
    }

    bottomEl.querySelectorAll('[data-train-skill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-train-skill'), 10);
        const rank = prog.skillRanks[idx] || 1;
        if (rank >= 10) return;
        const costS = rank;
        const costC = rank * 120;
        if (state.resources.scrolls < costS || state.resources.coins < costC) return;
        state.resources.scrolls -= costS;
        state.resources.coins -= costC;
        prog.skillRanks[idx] = rank + 1;
        Hacha.audio.play('buff');
        Hacha.storage.saveState(true);
        cm.showToast(`${charDef.skills[idx].name}がランク${rank + 1}へ上昇！`, 'gold');
        app.renderCurrent();
      });
    });

    const awakeBtn = bottomEl.querySelector('#btn-do-awaken');
    if (awakeBtn) {
      awakeBtn.addEventListener('click', () => {
        const curAw = prog.awakening || 0;
        if (curAw >= 5) return;
        const needFrag = (curAw + 1) * 3;
        const needCoins = (curAw + 1) * 650;
        if (state.resources.fragments < needFrag || state.resources.coins < needCoins) return;
        state.resources.fragments -= needFrag;
        state.resources.coins -= needCoins;
        prog.awakening = curAw + 1;
        Hacha.audio.play('perfect');
        Hacha.storage.saveState(true);
        cm.showToast(`${charDef.name}が異界覚醒 ★${prog.awakening} に到達！`, 'gold');
        app.renderCurrent();
      });
    }
  }

  function resetToMainTab() {
    uiState.tab = 'party';
  }

  Hacha.ui.screenParty = { render, resetToMainTab };
})();
