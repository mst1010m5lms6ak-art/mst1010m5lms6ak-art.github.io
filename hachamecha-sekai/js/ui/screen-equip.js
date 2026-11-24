(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const eqUi = {
    charId: 'c_fire_tank',
    slot: 'weapon', // weapon | armor | charm
    selectedUid: null,
    listScrollTop: 0,
    stripScrollLeft: 0
  };

  const dispUi = {
    slotIdx: 0,
    listScrollTop: 0
  };

  function getUnlockedSorted() {
    const state = Hacha.state;
    return Hacha.data.CHARACTERS
      .filter((c) => state.chars[c.id] && state.chars[c.id].unlocked)
      .sort(U.compareRosterEntities);
  }

  function findOwnerChar(state, uid) {
    const ids = Object.keys(state.chars);
    for (let i = 0; i < ids.length; i++) {
      const eq = state.chars[ids[i]].equip;
      if (eq.weapon === uid || eq.armor === uid || eq.charm === uid) {
        return Hacha.data.CHARACTER_MAP[ids[i]];
      }
    }
    return null;
  }

  function renderDeltaLine(diff, suffix, isSame) {
    if (isSame) return `<span class="stat-chip-delta" style="color:#6d80aa;">装着中</span>`;
    if (!diff) return `<span class="stat-chip-delta" style="color:#6d80aa;">±0</span>`;
    const sign = diff > 0 ? '+' : '';
    const col = diff > 0 ? '#6effb8' : '#ff8aa0';
    return `<span class="stat-chip-delta" style="color:${col};">${sign}${diff}${suffix || ''}</span>`;
  }

  function renderEquip(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const roster = getUnlockedSorted();
    if (Hacha.ui.sharedCharId && roster.some((c) => c.id === Hacha.ui.sharedCharId)) {
      eqUi.charId = Hacha.ui.sharedCharId;
    }
    if (!roster.some((c) => c.id === eqUi.charId) && roster.length) eqUi.charId = roster[0].id;
    Hacha.ui.sharedCharId = eqUi.charId;
    const charDef = Hacha.data.CHARACTER_MAP[eqUi.charId] || roster[0];
    const eqs = Hacha.engine.stats.getEquippedItems(state, charDef.id);

    /* 該当部位の所持装備（品質降順 → ティア降順 → 五十音順） */
    const filtered = state.inventory
      .filter((it) => {
        const tpl = Hacha.data.EQUIPMENT_MAP[it.templateId];
        return tpl && tpl.slot === eqUi.slot;
      })
      .sort((a, b) => {
        if (b.quality !== a.quality) return b.quality - a.quality;
        const ta = Hacha.data.EQUIPMENT_MAP[a.templateId];
        const tb = Hacha.data.EQUIPMENT_MAP[b.templateId];
        if (tb.tier !== ta.tier) return tb.tier - ta.tier;
        return ta.kana.localeCompare(tb.kana, 'ja');
      });

    let selItem = filtered.find((it) => it.uid === eqUi.selectedUid) || filtered[0] || null;
    if (selItem) eqUi.selectedUid = selItem.uid;
    else eqUi.selectedUid = null;

    const selTpl = selItem ? Hacha.data.EQUIPMENT_MAP[selItem.templateId] : null;
    const selOwner = selItem ? findOwnerChar(state, selItem.uid) : null;
    const curSlotItem = eqs[eqUi.slot];
    const curSlotTpl = curSlotItem ? Hacha.data.EQUIPMENT_MAP[curSlotItem.templateId] : null;
    const curSlotStats = curSlotItem
      ? Hacha.engine.stats.getEquipEffectiveStats(curSlotItem)
      : { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };

    /* ==================== 上半分：閲覧専用 装備詳細＆装着比較（図鑑外のため紹介文なし・5列均等） ==================== */
    const equippedCards = ['weapon', 'armor', 'charm'].map((s) => {
      const it = eqs[s];
      const slotMeta = C.SLOT_MAP[s];
      if (!it) {
        return `
          <div class="party-slot-card ${eqUi.slot === s ? 'active-slot' : ''}" style="min-height:50px;">
            <div class="bu-hp-text">${slotMeta.icon}${slotMeta.name}</div>
            <div class="bu-hp-text">未装備</div>
          </div>
        `;
      }
      const tpl = Hacha.data.EQUIPMENT_MAP[it.templateId];
      const q = U.getQualityInfo(it.quality);
      return `
        <div class="party-slot-card ${eqUi.slot === s ? 'active-slot' : ''} ${q.cardClass}" style="min-height:50px;">
          <div class="meta-row-nowrap">
            <span class="bu-hp-text">${slotMeta.icon}${slotMeta.name}</span>
            <span class="badge ${q.badgeClass}" style="font-size:9px;">${q.q}%</span>
          </div>
          <div class="unit-name-full">${U.escapeHtml(tpl.name)}</div>
          <div class="bu-hp-text">${U.escapeHtml(cm.renderEquipStatsLine(it))}</div>
        </div>
      `;
    }).join('');

    let detailHtml = '';
    if (selItem && selTpl) {
      const q = U.getQualityInfo(selItem.quality);
      const st = Hacha.engine.stats.getEquipEffectiveStats(selItem);
      const sellCoins = Hacha.engine.stats.getEquipSellPrice(selItem);
      const isSame = !!(curSlotItem && curSlotItem.uid === selItem.uid);
      const dHp = isSame ? 0 : st.hp - curSlotStats.hp;
      const dAtk = isSame ? 0 : st.atk - curSlotStats.atk;
      const dDef = isSame ? 0 : st.def - curSlotStats.def;
      const dSpd = isSame ? 0 : st.spd - curSlotStats.spd;
      const dCrit = isSame ? 0 : Math.round((st.crit - curSlotStats.crit) * 100);

      const compareSummary = isSame
        ? `${charDef.name}が現在この装備を装着中`
        : (curSlotTpl
            ? `入替比較：${curSlotTpl.name}(${curSlotItem.quality}%) ▶ ${selTpl.name}(${selItem.quality}%)`
            : `新規装着：${C.SLOT_MAP[eqUi.slot].name}枠（未装備）へ装備`);

      detailHtml = `
        <div class="panel ${q.cardClass}" style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:space-between;gap:4px;">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:15px;">${selTpl.icon}</span>
              <span class="view-title">${U.escapeHtml(selTpl.name)}</span>
              ${cm.qualityBadge(selItem.quality)}
            </div>
            <span class="bu-hp-text" style="color:#ffd15c;">${selItem.locked ? '🔒保護中' : `売却🪙${sellCoins}`}</span>
          </div>
          <div class="detail-grid-stats-5">
            <div class="stat-chip"><span class="stat-chip-lbl">HP</span><span class="stat-chip-val">+${st.hp}</span>${renderDeltaLine(dHp, '', isSame)}</div>
            <div class="stat-chip"><span class="stat-chip-lbl">攻撃</span><span class="stat-chip-val">+${st.atk}</span>${renderDeltaLine(dAtk, '', isSame)}</div>
            <div class="stat-chip"><span class="stat-chip-lbl">防御</span><span class="stat-chip-val">+${st.def}</span>${renderDeltaLine(dDef, '', isSame)}</div>
            <div class="stat-chip"><span class="stat-chip-lbl">速度</span><span class="stat-chip-val">+${st.spd}</span>${renderDeltaLine(dSpd, '', isSame)}</div>
            <div class="stat-chip"><span class="stat-chip-lbl">会心</span><span class="stat-chip-val">+${Math.round(st.crit * 100)}%</span>${renderDeltaLine(dCrit, '%', isSame)}</div>
          </div>
          <div class="skill-mini-row">
            <span class="skill-desc-line" style="color:#cbe2ff;">${U.escapeHtml(compareSummary)}</span>
          </div>
          <div class="meta-row-nowrap">
            <span class="bu-hp-text" style="color:#b8cae8;">格位 ${selTpl.tier}｜${C.SLOT_MAP[selTpl.slot].name}</span>
            <span class="bu-hp-text" style="color:${selOwner ? '#6effb8' : '#b8cae8'};">
              装着者：${selOwner ? `${selOwner.icon}${U.escapeHtml(selOwner.name)}` : '未装着'}
            </span>
          </div>
        </div>
      `;
    } else {
      detailHtml = `
        <div class="panel panel-fill" style="align-items:center;justify-content:center;">
          <div class="note-text" style="text-align:center;">この部位の所持装備がありません。出撃や派遣で入手できます。</div>
        </div>
      `;
    }

    topEl.innerHTML = `
      ${cm.renderViewHeader(`装備｜所持 ${state.inventory.length}個`)}
      <div class="panel" style="flex:0 0 auto;display:flex;flex-direction:column;gap:4px;">
        <div class="meta-row-nowrap">
          <div class="meta-row">
            <span>${charDef.icon}</span>
            <span class="view-title">${U.escapeHtml(charDef.name)}</span>
            ${cm.elementBadge(charDef.element)}
            ${cm.roleShortBadge(charDef.role)}
          </div>
          <span class="bu-hp-text">品質が高いほど性能良化</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">${equippedCards}</div>
      </div>
      ${detailHtml}
    `;

    /* ==================== 下半分：親指ゾーン操作（横スクロール仲間帯＋縦スクロール装備一覧） ==================== */
    const charStripHtml = `
      <div class="scroll-strip-h" id="eq-char-strip">
        ${roster.map((c) => {
          const assign = Hacha.engine.stats.getCharAssignment(state, c.id);
          const active = c.id === charDef.id;
          return `
            <button class="char-chip-btn ${active ? 'active' : ''} ${assign.type === 'party' ? 'in-party' : ''}" data-eq-char="${c.id}">
              <span>${c.icon}</span>
              <span>${U.escapeHtml(c.name)}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    const tiles = filtered.length ? filtered.map((it) => {
      const tpl = Hacha.data.EQUIPMENT_MAP[it.templateId];
      const q = U.getQualityInfo(it.quality);
      const owner = findOwnerChar(state, it.uid);
      const isSel = it.uid === eqUi.selectedUid;
      return `
        <button class="item-tile ${isSel ? 'selected' : ''} ${q.cardClass}" data-eq-uid="${it.uid}">
          <div class="meta-row-nowrap">
            <span class="unit-name-full">${tpl.icon}${U.escapeHtml(tpl.name)}</span>
            ${it.locked ? '<span style="font-size:10px;">🔒</span>' : ''}
          </div>
          <div class="meta-row-nowrap">
            ${cm.qualityBadge(it.quality)}
            <span class="bu-hp-text" style="color:${owner ? '#6effb8' : '#a8b9dc'};">${owner ? owner.name : '未装着'}</span>
          </div>
        </button>
      `;
    }).join('') : `
      <div class="panel" style="grid-column:span 2;display:flex;align-items:center;justify-content:center;min-height:80px;">
        <span class="note-text" style="text-align:center;">該当部位の装備がありません</span>
      </div>
    `;

    const isAlreadyOnChar = selItem && curSlotItem && curSlotItem.uid === selItem.uid;
    const canSellSingle = !!(selItem && !selItem.locked && !selOwner);
    const sellSingleText = !selItem ? '💰売却' : (selItem.locked ? '🔒保護中' : (selOwner ? '装備中' : '💰売却'));

    const thr = state.settings.autoSellBelow || 0;
    const bulkTargets = thr > 0 ? state.inventory.filter((it) => !it.locked && it.quality < 100 && it.quality < thr && !findOwnerChar(state, it.uid)).length : 0;
    const bulkLabel = thr > 0 ? `🧹<${thr}%(${bulkTargets})` : '🧹基準OFF';

    bottomEl.innerHTML = `
      ${charStripHtml}
      <div class="sub-tabs">
        <button class="sub-tab ${eqUi.slot === 'weapon' ? 'active' : ''}" data-eq-slot="weapon">🗡️ 武器</button>
        <button class="sub-tab ${eqUi.slot === 'armor' ? 'active' : ''}" data-eq-slot="armor">🥋 防具</button>
        <button class="sub-tab ${eqUi.slot === 'charm' ? 'active' : ''}" data-eq-slot="charm">📿 装飾</button>
      </div>
      <div class="scroll-list-v scroll-grid-2" id="eq-item-list">${tiles}</div>
      <div class="action-row">
        <button class="btn btn-sm ${isAlreadyOnChar ? 'btn-danger' : 'btn-emerald'}" id="btn-eq-toggle" ${selItem ? '' : 'disabled'}>
          ${isAlreadyOnChar ? '外す' : '装着'}
        </button>
        <button class="btn btn-sm" id="btn-eq-lock" ${selItem ? '' : 'disabled'}>
          ${selItem && selItem.locked ? '🔓解除' : '🔒保護'}
        </button>
        <button class="btn btn-sm ${canSellSingle ? 'btn-danger' : ''}" id="btn-eq-sell" ${canSellSingle ? '' : 'disabled'}>
          ${sellSingleText}
        </button>
        <button class="btn btn-sm ${bulkTargets > 0 ? 'btn-toggle-warn' : ''}" id="btn-bulk-sell">
          ${bulkLabel}
        </button>
      </div>
    `;

    /* スクロール位置復元＆選択チップ自動可視化 */
    const stripEl = bottomEl.querySelector('#eq-char-strip');
    cm.bindHorizontalStripState(stripEl, () => eqUi.stripScrollLeft, (v) => { eqUi.stripScrollLeft = v; }, '.char-chip-btn.active');

    const listEl = bottomEl.querySelector('#eq-item-list');
    cm.bindVerticalScrollState(listEl, () => eqUi.listScrollTop, (v) => { eqUi.listScrollTop = v; });

    bottomEl.querySelectorAll('[data-eq-char]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (stripEl) eqUi.stripScrollLeft = stripEl.scrollLeft;
        eqUi.charId = b.getAttribute('data-eq-char');
        Hacha.ui.sharedCharId = eqUi.charId;
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-eq-slot]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        eqUi.slot = b.getAttribute('data-eq-slot');
        eqUi.listScrollTop = 0;
        app.renderCurrent();
      });
    });

    bottomEl.querySelectorAll('[data-eq-uid]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (listEl) eqUi.listScrollTop = listEl.scrollTop;
        eqUi.selectedUid = b.getAttribute('data-eq-uid');
        app.renderCurrent();
      });
    });

    const eqToggle = bottomEl.querySelector('#btn-eq-toggle');
    if (eqToggle && selItem) {
      eqToggle.addEventListener('click', () => {
        Hacha.audio.play('buff');
        if (listEl) eqUi.listScrollTop = listEl.scrollTop;
        const prog = state.chars[charDef.id];
        if (prog.equip[eqUi.slot] === selItem.uid) {
          prog.equip[eqUi.slot] = null;
        } else {
          Object.keys(state.chars).forEach((cid) => {
            if (state.chars[cid].equip[eqUi.slot] === selItem.uid) {
              state.chars[cid].equip[eqUi.slot] = null;
            }
          });
          prog.equip[eqUi.slot] = selItem.uid;
        }
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    }

    const eqLock = bottomEl.querySelector('#btn-eq-lock');
    if (eqLock && selItem) {
      eqLock.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (listEl) eqUi.listScrollTop = listEl.scrollTop;
        selItem.locked = !selItem.locked;
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    }

    const eqSell = bottomEl.querySelector('#btn-eq-sell');
    if (eqSell && selItem) {
      eqSell.addEventListener('click', () => {
        if (selItem.locked || findOwnerChar(state, selItem.uid)) return;
        if (listEl) eqUi.listScrollTop = listEl.scrollTop;
        const coins = Hacha.engine.stats.getEquipSellPrice(selItem);
        state.inventory = state.inventory.filter((it) => it.uid !== selItem.uid);
        state.resources.coins += coins;
        eqUi.selectedUid = null;
        Hacha.audio.play('tap');
        Hacha.storage.saveState(true);
        cm.showToast(`装備を売却し 🪙${coins} を獲得！`);
        app.renderCurrent();
      });
    }

    const bulkBtn = bottomEl.querySelector('#btn-bulk-sell');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', () => {
        if (thr <= 0) {
          Hacha.audio.play('tap');
          cm.showToast('出撃または設定で自動売却基準を選ぶと一括売却できます');
          return;
        }
        if (bulkTargets <= 0) {
          Hacha.audio.play('tap');
          cm.showToast(`未装備・未保護で品質${thr}%未満の装備がありません`);
          return;
        }
        let count = 0;
        let totalCoins = 0;
        state.inventory = state.inventory.filter((it) => {
          if (it.locked || it.quality >= 100 || it.quality >= thr || findOwnerChar(state, it.uid)) {
            return true;
          }
          count++;
          totalCoins += Hacha.engine.stats.getEquipSellPrice(it);
          return false;
        });
        state.resources.coins += totalCoins;
        Hacha.audio.play('tap');
        Hacha.storage.saveState(true);
        cm.showToast(`${count}個の装備を一括売却し 🪙${totalCoins} を獲得！`, 'gold');
        app.renderCurrent();
      });
    }
  }

  /* ==================== 戦闘回数連動の「異界派遣」画面 ==================== */
  function renderDispatch(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const missions = Hacha.data.DISPATCH_MISSIONS;
    const slotObj = state.dispatches[dispUi.slotIdx] || state.dispatches[0];
    const mission = missions.find((m) => m.id === slotObj.missionId) || missions[0];

    /* 上半分：全3枠を均等配分して空白を解消（閲覧専用） */
    const slotsPreview = state.dispatches.map((d, i) => {
      const m = missions.find((x) => x.id === d.missionId) || missions[0];
      const names = d.charIds.map((cid) => {
        const c = Hacha.data.CHARACTER_MAP[cid];
        return c ? `${c.icon}${c.name}` : '';
      }).filter(Boolean).join('・');
      const pct = Math.min(1, (d.progress || 0) / m.needBattles);
      return `
        <div class="panel ${dispUi.slotIdx === i ? 'active-slot' : ''}" style="flex:1 1 0;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:3px;border-color:${dispUi.slotIdx === i ? '#48d6ff' : 'var(--border-subtle)'};padding:5px 8px;">
          <div class="meta-row-nowrap">
            <span class="unit-name-full">派遣隊${i + 1}：${m.icon}${U.escapeHtml(m.name)}</span>
            <span class="badge ${d.active ? 'scope-passive' : 'el-none'}">${d.active ? `進行中 ${d.progress}/${m.needBattles}戦` : '待機中'}</span>
          </div>
          <div class="gauge-track"><div class="gauge-fill gauge-chain" style="transform:scaleX(${pct});"></div></div>
          <div class="meta-row-nowrap">
            <span class="bu-hp-text">${names ? U.escapeHtml(names) : '控えメンバー未配置'}</span>
            <span class="bu-hp-text" style="color:#ffd15c;">${U.escapeHtml(m.rewardDesc)}</span>
          </div>
        </div>
      `;
    }).join('');

    const prefRaceText = mission.preferredRaces.map((r) => C.RACE_MAP[r].name).join('・');

    topEl.innerHTML = `
      ${cm.renderViewHeader('異界派遣｜戦闘勝利で自動進行')}
      <div class="panel-fill" style="gap:5px;">
        ${slotsPreview}
        <div class="skill-mini-row">
          <span class="bu-hp-text" style="color:#7be3ff;">派遣隊${dispUi.slotIdx + 1} 適正種族：${prefRaceText}</span>
          <span class="bu-hp-text">${mission.needBattles}勝ごとに自動帰還</span>
        </div>
      </div>
    `;

    /* 下半分：派遣枠・任務・控えキャラ縦スクロールリスト */
    const roster = getUnlockedSorted();
    const available = roster.filter((c) => {
      const a = Hacha.engine.stats.getCharAssignment(state, c.id);
      if (a.type === 'party' || a.type === 'link') return false;
      for (let i = 0; i < state.dispatches.length; i++) {
        if (i !== dispUi.slotIdx && state.dispatches[i].charIds.includes(c.id)) return false;
      }
      return true;
    });

    const tiles = available.length ? available.map((c) => {
      const picked = slotObj.charIds.includes(c.id);
      const isPref = c.races.some((r) => mission.preferredRaces.includes(r));
      return `
        <button class="item-tile ${picked ? 'selected in-dispatch' : ''}" data-disp-char="${c.id}">
          <div class="meta-row-nowrap">
            <span class="unit-name-full">${c.icon}${U.escapeHtml(c.name)}</span>
            <span class="bu-hp-text" style="color:${picked ? '#ffd15c' : (isPref ? '#6effb8' : '#a8b9dc')};">
              ${picked ? '編成済' : (isPref ? '適正◎' : '控え')}
            </span>
          </div>
          <div class="meta-row">
            ${cm.elementBadge(c.element)}
            ${cm.raceBadges(c.races)}
          </div>
        </button>
      `;
    }).join('') : `
      <div class="panel" style="grid-column:span 2;display:flex;align-items:center;justify-content:center;min-height:86px;">
        <span class="note-text" style="text-align:center;">待機中の控えキャラがいません。編成画面で支援枠を外すか新たな仲間を加えると派遣できます。</span>
      </div>
    `;

    const shortMissionLabel = {
      disp_crystals: '結晶',
      disp_scrolls: '巻物',
      disp_gear: '装備',
      disp_chaos: '核片'
    };
    const missionBtns = missions.map((m) => `
      <button class="sub-tab ${slotObj.missionId === m.id ? 'active' : ''}" data-disp-mission="${m.id}">
        ${m.icon}${shortMissionLabel[m.id] || ''}${m.needBattles}戦
      </button>
    `).join('');

    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${dispUi.slotIdx === 0 ? 'active' : ''}" data-disp-slot="0">派遣隊1</button>
        <button class="sub-tab ${dispUi.slotIdx === 1 ? 'active' : ''}" data-disp-slot="1">派遣隊2</button>
        <button class="sub-tab ${dispUi.slotIdx === 2 ? 'active' : ''}" data-disp-slot="2">派遣隊3</button>
      </div>
      <div class="sub-tabs">${missionBtns}</div>
      <div class="skill-mini-row">
        <span class="unit-name-full">${mission.icon}${U.escapeHtml(mission.name)}</span>
        <span class="bu-hp-text" style="color:#ffd15c;">${U.escapeHtml(mission.rewardDesc)}</span>
      </div>
      <div class="scroll-list-v scroll-grid-2" id="disp-char-list">${tiles}</div>
      <div class="action-row">
        <button class="btn btn-sm ${slotObj.autoRepeat ? 'btn-toggle-on' : ''}" id="btn-dp-repeat">
          🔁 自動再派遣：${slotObj.autoRepeat ? 'ON' : 'OFF'}
        </button>
        <button class="btn btn-sm ${slotObj.active ? 'btn-danger' : 'btn-emerald'}" id="btn-dp-toggle" ${slotObj.charIds.length >= mission.minChars ? '' : 'disabled'}>
          ${slotObj.active ? '派遣を中止' : `🧭 派遣開始（${slotObj.charIds.length}/${mission.maxChars}）`}
        </button>
      </div>
    `;

    const listEl = bottomEl.querySelector('#disp-char-list');
    cm.bindVerticalScrollState(listEl, () => dispUi.listScrollTop, (v) => { dispUi.listScrollTop = v; });

    bottomEl.querySelectorAll('[data-disp-slot]').forEach((b) => {
      b.addEventListener('click', () => { Hacha.audio.play('tap'); dispUi.slotIdx = parseInt(b.getAttribute('data-disp-slot'), 10); dispUi.listScrollTop = 0; app.renderCurrent(); });
    });
    bottomEl.querySelectorAll('[data-disp-mission]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        slotObj.missionId = b.getAttribute('data-disp-mission');
        slotObj.progress = 0;
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    });
    bottomEl.querySelectorAll('[data-disp-char]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        if (listEl) dispUi.listScrollTop = listEl.scrollTop;
        const cid = b.getAttribute('data-disp-char');
        if (slotObj.charIds.includes(cid)) {
          slotObj.charIds = slotObj.charIds.filter((x) => x !== cid);
          if (slotObj.charIds.length < mission.minChars) { slotObj.active = false; slotObj.progress = 0; }
        } else {
          if (slotObj.charIds.length >= mission.maxChars) {
            cm.showToast(`最大${mission.maxChars}人まで編成できます`);
            return;
          }
          slotObj.charIds.push(cid);
        }
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    });

    const repBtn = bottomEl.querySelector('#btn-dp-repeat');
    if (repBtn) repBtn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      slotObj.autoRepeat = !slotObj.autoRepeat;
      Hacha.storage.saveState(true);
      app.renderCurrent();
    });

    const togBtn = bottomEl.querySelector('#btn-dp-toggle');
    if (togBtn) togBtn.addEventListener('click', () => {
      if (slotObj.charIds.length < mission.minChars) return;
      Hacha.audio.play('buff');
      slotObj.active = !slotObj.active;
      if (!slotObj.active) slotObj.progress = 0;
      Hacha.storage.saveState(true);
      cm.showToast(slotObj.active ? `派遣隊${dispUi.slotIdx + 1}が出発しました！` : '派遣を中止しました');
      app.renderCurrent();
    });
  }

  function resetEquipTab() { eqUi.slot = 'weapon'; }

  Hacha.ui.screenEquip = { renderEquip, renderDispatch, resetEquipTab };
})();
