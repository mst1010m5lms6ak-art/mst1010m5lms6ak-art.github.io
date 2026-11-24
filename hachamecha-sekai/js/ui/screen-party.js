(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const uiState = {
    tab: 'party',        // party | ability | mastery | awaken
    selectedCharId: 'c_fire_tank',
    slotMode: 'party',   // party | link
    slotIdx: 0,
    page: 0,
    abilityTierView: 1
  };

  function getUnlockedSorted() {
    const state = Hacha.state;
    return Hacha.data.CHARACTERS
      .filter((c) => state.chars[c.id] && state.chars[c.id].unlocked)
      .sort(U.compareRosterEntities);
  }

  function removeCharFromAllAssignments(state, charId) {
    for (let i = 0; i < 4; i++) {
      if (state.party[i] === charId) state.party[i] = null;
      if (state.links[i] === charId) state.links[i] = null;
    }
    state.dispatches.forEach((d) => {
      if (d.charIds.includes(charId)) {
        d.charIds = d.charIds.filter((id) => id !== charId);
        if (!d.charIds.length) { d.active = false; d.progress = 0; }
      }
    });
  }

  function assignCharToSlot(charId) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const idx = uiState.slotIdx;

    if (uiState.slotMode === 'party') {
      const existingIdx = state.party.indexOf(charId);
      if (existingIdx === idx) {
        if (state.party.filter(Boolean).length <= 1) {
          cm.showToast('主力は最低1人必要です', 'danger');
          return;
        }
        state.party[idx] = null;
      } else if (existingIdx >= 0) {
        const tmp = state.party[idx];
        state.party[idx] = charId;
        state.party[existingIdx] = tmp;
      } else {
        removeCharFromAllAssignments(state, charId);
        state.party[idx] = charId;
      }
    } else {
      const existingLink = state.links.indexOf(charId);
      if (existingLink === idx) {
        state.links[idx] = null;
      } else {
        if (state.party.includes(charId) && state.party.filter(Boolean).length <= 1) {
          cm.showToast('最後の主力は支援へ移せません', 'danger');
          return;
        }
        removeCharFromAllAssignments(state, charId);
        state.links[idx] = charId;
      }
    }
    Hacha.storage.saveState(true);
  }

  function render(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const roster = getUnlockedSorted();

    if (!roster.some((c) => c.id === uiState.selectedCharId) && roster.length) {
      uiState.selectedCharId = roster[0].id;
    }
    const charDef = Hacha.data.CHARACTER_MAP[uiState.selectedCharId] || roster[0];
    const prog = state.chars[charDef.id];
    const stats = Hacha.engine.stats.computeSingleCharStats(state, charDef.id, true);
    const resInfo = Hacha.engine.stats.computeActiveResonances(state, state.party, state.links);
    const roleMeta = C.ROLE_MAP[charDef.role];
    const eqs = Hacha.engine.stats.getEquippedItems(state, charDef.id);

    /* ==================== 上半分：閲覧専用キャラ詳細＆編成プレビュー ==================== */
    const eqSummary = ['weapon', 'armor', 'charm'].map((slot) => {
      const it = eqs[slot];
      if (!it) return `<span class="badge el-none">${C.SLOT_MAP[slot].icon}未装備</span>`;
      const tpl = Hacha.data.EQUIPMENT_MAP[it.templateId];
      const q = U.getQualityInfo(it.quality);
      return `<span class="badge ${q.badgeClass}">${tpl.icon}${U.escapeHtml(tpl.name)} ${q.q}%</span>`;
    }).join('');

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
    const activeResLine = resInfo.active.length
      ? resInfo.active.slice(0, 4).map((r) => `${r.icon}${r.name}`).join(' / ')
      : '発動中の共鳴なし';

    topEl.innerHTML = `
      ${cm.renderViewHeader(`編成・育成｜所持 ${roster.length}/${Hacha.data.CHARACTERS.length}`)}
      <div class="panel panel-fill">
        <div class="meta-row-nowrap">
          <div class="meta-row">
            <span style="font-size:16px;">${charDef.icon}</span>
            <span class="view-title">${U.escapeHtml(charDef.name)}</span>
            ${cm.elementBadge(charDef.element)}
            ${cm.raceBadges(charDef.races)}
            ${cm.roleBadge(charDef.role)}
          </div>
          <span style="color:#ffd15c;font-size:11px;font-weight:800;">${awakeStars}</span>
        </div>

        <div class="detail-grid-stats">
          <div class="stat-chip"><span class="stat-chip-lbl">HP</span><span class="stat-chip-val">${U.formatNum(stats.hp)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">攻撃</span><span class="stat-chip-val">${U.formatNum(stats.atk)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">防御</span><span class="stat-chip-val">${U.formatNum(stats.def)}</span></div>
          <div class="stat-chip"><span class="stat-chip-lbl">速度 / 会心</span><span class="stat-chip-val">${stats.spd} / ${Math.round(stats.crit * 100)}%</span></div>
        </div>

        <div class="skill-mini-list">${skillsHtml}</div>

        <div class="meta-row">${eqSummary}</div>

        <div class="flavor-box">${U.escapeHtml(charDef.desc)}</div>

        <div class="bu-hp-text" style="margin-top:auto;color:#7be3ff;">
          🌈 共鳴(${resInfo.active.length})：${U.escapeHtml(activeResLine)}
        </div>
      </div>
    `;

    /* ==================== 下半分：親指ゾーン操作エリア ==================== */
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

      /* 2×2＝4枚/ページにすることでiPhone SE(375×667)でもバッジ下端が一切見切れない */
      const pageSize = 4;
      const totalPages = Math.max(1, Math.ceil(roster.length / pageSize));
      uiState.page = U.clamp(uiState.page, 0, totalPages - 1);
      const slice = roster.slice(uiState.page * pageSize, uiState.page * pageSize + pageSize);

      const gridTiles = slice.map((c) => {
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
          <button class="btn btn-sm btn-danger" id="btn-clear-slot" ${canRemoveSlot ? '' : 'disabled'}>枠を外す</button>
        </div>
        <div class="party-slots-4">${slotsRow}</div>
        <div class="select-grid-2" style="grid-template-rows:repeat(2,1fr);">${gridTiles}</div>
        <div class="pager-bar">
          <button class="btn btn-sm" id="btn-p-prev">◀ 前</button>
          <span class="pager-info">${uiState.page + 1} / ${totalPages}（全${roster.length}体）</span>
          <button class="btn btn-sm" id="btn-p-next">次 ▶</button>
        </div>
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
        <div class="action-row">
          <button class="btn btn-sm" id="btn-char-prev">◀ 前の仲間</button>
          <span class="pager-info">${roleMeta.icon}${roleMeta.crystalName}：${ownedCrys}</span>
          <button class="btn btn-sm" id="btn-char-next">次の仲間 ▶</button>
        </div>
        <div class="sub-tabs">${tierBtns}</div>
        <div class="select-list-fixed" style="grid-template-rows:repeat(5,1fr);">${choiceCards}</div>
        <div class="action-row">
          ${nextCost ? `
            <button class="btn btn-sm btn-gold" id="btn-unlock-ab-tier" ${canUnlockNext ? '' : 'disabled'}>
              🔓 段階${prog.abilityTier + 1}を解放（${roleMeta.crystalName}${nextCost.crystals}・🪙${nextCost.coins}）
            </button>
          ` : `<button class="btn btn-sm btn-emerald" disabled>✨ 全5段階解放済み</button>`}
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
          <div class="item-tile" style="justify-content:center;gap:4px;">
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
        <div class="action-row">
          <button class="btn btn-sm" id="btn-char-prev">◀ 前の仲間</button>
          <span class="pager-info">技の巻物：${state.resources.scrolls}個</span>
          <button class="btn btn-sm" id="btn-char-next">次の仲間 ▶</button>
        </div>
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
        <div class="action-row">
          <button class="btn btn-sm" id="btn-char-prev">◀ 前の仲間</button>
          <span class="pager-info">混沌の核片：${state.resources.fragments}個</span>
          <button class="btn btn-sm" id="btn-char-next">次の仲間 ▶</button>
        </div>
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
          <div class="flavor-box">
            混沌の核片を注ぎ込むことで基礎能力・会心・速度の上限を大きく引き上げます。乱入敵の撃破や大ボス・無限塔・異界派遣から核片を獲得できます。
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

    /* イベント結線（すべて下半分） */
    bottomEl.querySelectorAll('[data-ptab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        uiState.tab = btn.getAttribute('data-ptab');
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
        if (curId) uiState.selectedCharId = curId;
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-pick-char]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        const cid = btn.getAttribute('data-pick-char');
        if (uiState.selectedCharId === cid) {
          assignCharToSlot(cid);
        } else {
          uiState.selectedCharId = cid;
        }
        app.renderCurrent();
      });
    });

    const assignBtn = bottomEl.querySelector('#btn-assign-selected');
    if (assignBtn) {
      assignBtn.addEventListener('click', () => {
        Hacha.audio.play('tap');
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

    const pPrev = bottomEl.querySelector('#btn-p-prev');
    const pNext = bottomEl.querySelector('#btn-p-next');
    if (pPrev) pPrev.addEventListener('click', () => { Hacha.audio.play('tap'); uiState.page = Math.max(0, uiState.page - 1); app.renderCurrent(); });
    if (pNext) pNext.addEventListener('click', () => { Hacha.audio.play('tap'); uiState.page += 1; app.renderCurrent(); });

    const cPrev = bottomEl.querySelector('#btn-char-prev');
    const cNext = bottomEl.querySelector('#btn-char-next');
    if (cPrev) cPrev.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const idx = roster.findIndex((c) => c.id === charDef.id);
      uiState.selectedCharId = roster[(idx - 1 + roster.length) % roster.length].id;
      app.renderCurrent();
    });
    if (cNext) cNext.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const idx = roster.findIndex((c) => c.id === charDef.id);
      uiState.selectedCharId = roster[(idx + 1) % roster.length].id;
      app.renderCurrent();
    });

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
