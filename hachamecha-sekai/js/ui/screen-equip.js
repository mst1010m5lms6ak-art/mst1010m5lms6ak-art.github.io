(function () {
  'use strict';

  const Hacha = window.Hacha;
  const U = Hacha.util;
  const C = Hacha.consts;

  const eqUi = {
    subTab: 'gear',      // gear | autosell
    charId: 'c_fire_tank',
    slot: 'weapon',      // weapon | armor | charm
    selectedUid: null,
    page: 0
  };

  const dispUi = {
    slotIdx: 0,
    page: 0
  };

  function getUnlockedSorted() {
    const state = Hacha.state;
    return Hacha.data.CHARACTERS
      .filter((c) => state.chars[c.id] && state.chars[c.id].unlocked)
      .sort(U.compareRosterEntities);
  }

  function findOwnerChar(state, itemUid) {
    const ids = Object.keys(state.chars);
    for (let i = 0; i < ids.length; i++) {
      const eq = state.chars[ids[i]].equip;
      if (eq.weapon === itemUid || eq.armor === itemUid || eq.charm === itemUid) {
        return Hacha.data.CHARACTER_MAP[ids[i]];
      }
    }
    return null;
  }

  function renderEquip(topEl, bottomEl, app) {
    const state = Hacha.state;
    const cm = Hacha.ui.common;
    const roster = getUnlockedSorted();
    if (!roster.some((c) => c.id === eqUi.charId) && roster.length) eqUi.charId = roster[0].id;
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

    /* ==================== 上半分：閲覧専用 装備詳細＆装着状況 ==================== */
    const equippedCards = ['weapon', 'armor', 'charm'].map((s) => {
      const it = eqs[s];
      const slotMeta = C.SLOT_MAP[s];
      if (!it) {
        return `
          <div class="party-slot-card ${eqUi.slot === s ? 'active-slot' : ''}" style="min-height:54px;">
            <div class="bu-hp-text">${slotMeta.icon}${slotMeta.name}</div>
            <div class="bu-hp-text">未装備</div>
          </div>
        `;
      }
      const tpl = Hacha.data.EQUIPMENT_MAP[it.templateId];
      const q = U.getQualityInfo(it.quality);
      return `
        <div class="party-slot-card ${eqUi.slot === s ? 'active-slot' : ''} ${q.cardClass}" style="min-height:54px;">
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
      detailHtml = `
        <div class="panel ${q.cardClass}" style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:4px;">
          <div class="meta-row-nowrap">
            <div class="meta-row">
              <span style="font-size:15px;">${selTpl.icon}</span>
              <span class="view-title">${U.escapeHtml(selTpl.name)}</span>
              ${cm.qualityBadge(selItem.quality)}
            </div>
            <span class="bu-hp-text">${selItem.locked ? '🔒保護' : `売却🪙${sellCoins}`}</span>
          </div>
          <div class="detail-grid-stats">
            <div class="stat-chip"><span class="stat-chip-lbl">HP</span><span class="stat-chip-val">+${st.hp}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">攻撃</span><span class="stat-chip-val">+${st.atk}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">防御</span><span class="stat-chip-val">+${st.def}</span></div>
            <div class="stat-chip"><span class="stat-chip-lbl">速度 / 会心</span><span class="stat-chip-val">+${st.spd} / +${Math.round(st.crit * 100)}%</span></div>
          </div>
          <div class="flavor-box">${U.escapeHtml(selTpl.desc)}</div>
          <div class="bu-hp-text" style="margin-top:auto;">
            装着中：${selOwner ? `${selOwner.icon}${U.escapeHtml(selOwner.name)}` : '誰も装備していません'}
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

    /* ==================== 下半分：親指ゾーン操作 ==================== */
    let lowerBody = '';
    if (eqUi.subTab === 'gear') {
      const pageSize = 6;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      eqUi.page = U.clamp(eqUi.page, 0, totalPages - 1);
      const slice = filtered.slice(eqUi.page * pageSize, eqUi.page * pageSize + pageSize);

      const tiles = slice.map((it) => {
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
              <span class="bu-hp-text" style="color:${owner ? '#6effb8' : '#7084ae'};">${owner ? owner.name : '未装着'}</span>
            </div>
          </button>
        `;
      }).join('');

      const isAlreadyOnChar = selItem && curSlotItem && curSlotItem.uid === selItem.uid;
      lowerBody = `
        <div class="action-row">
          <button class="btn btn-sm" id="btn-eq-cprev">◀ 前の仲間</button>
          <button class="btn btn-sm ${eqUi.slot === 'weapon' ? 'btn-primary' : ''}" data-eq-slot="weapon">🗡️武器</button>
          <button class="btn btn-sm ${eqUi.slot === 'armor' ? 'btn-primary' : ''}" data-eq-slot="armor">🥋防具</button>
          <button class="btn btn-sm ${eqUi.slot === 'charm' ? 'btn-primary' : ''}" data-eq-slot="charm">📿装飾</button>
          <button class="btn btn-sm" id="btn-eq-cnext">次 ▶</button>
        </div>
        <div class="select-grid-2" style="grid-template-rows:repeat(3,1fr);">${tiles}</div>
        <div class="pager-bar">
          <button class="btn btn-sm" id="btn-eq-prev">◀ 前</button>
          <span class="pager-info">${eqUi.page + 1}/${totalPages}（${filtered.length}件）</span>
          <button class="btn btn-sm" id="btn-eq-next">次 ▶</button>
        </div>
        <div class="action-row">
          <button class="btn btn-sm ${isAlreadyOnChar ? 'btn-danger' : 'btn-emerald'}" id="btn-eq-toggle" ${selItem ? '' : 'disabled'}>
            ${isAlreadyOnChar ? '外す' : '装着する'}
          </button>
          <button class="btn btn-sm" id="btn-eq-lock" ${selItem ? '' : 'disabled'}>
            ${selItem && selItem.locked ? '🔓保護解除' : '🔒保護'}
          </button>
          <button class="btn btn-sm btn-danger" id="btn-eq-sell" ${selItem && !selItem.locked && !selOwner ? '' : 'disabled'}>
            💰売却
          </button>
        </div>
      `;
    } else {
      /* 自動売却設定＆一括売却 */
      const thr = state.settings.autoSellBelow || 0;
      const thrBtns = C.AUTO_SELL_OPTIONS.map((opt) => `
        <button class="item-tile ${thr === opt.value ? 'selected' : ''}" data-sell-thr="${opt.value}" style="align-items:center;justify-content:center;">
          <span class="unit-name-full">${U.escapeHtml(opt.label)}</span>
        </button>
      `).join('');

      lowerBody = `
        <div class="select-grid-2" style="grid-template-rows:repeat(3,1fr);">${thrBtns}</div>
        <div class="action-row">
          <button class="btn btn-sm ${state.settings.keepNewCodexGear ? 'btn-toggle-on' : ''}" id="btn-toggle-keep-new">
            📖 初入手装備は売却保護：${state.settings.keepNewCodexGear ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="action-row">
          <button class="btn btn-sm btn-danger" id="btn-bulk-sell" ${thr > 0 ? '' : 'disabled'}>
            ${thr > 0 ? `💰 未装備＆未保護で品質${thr}%未満を一括売却` : '💰 自動売却基準を選ぶと一括売却できます'}
          </button>
        </div>
      `;
    }

    bottomEl.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab ${eqUi.subTab === 'gear' ? 'active' : ''}" data-eqtab="gear">🎒 装備装着</button>
        <button class="sub-tab ${eqUi.subTab === 'autosell' ? 'active' : ''}" data-eqtab="autosell">💰 自動売却設定</button>
      </div>
      ${lowerBody}
    `;

    bottomEl.querySelectorAll('[data-eqtab]').forEach((b) => {
      b.addEventListener('click', () => { Hacha.audio.play('tap'); eqUi.subTab = b.getAttribute('data-eqtab'); app.renderCurrent(); });
    });

    bottomEl.querySelectorAll('[data-eq-slot]').forEach((b) => {
      b.addEventListener('click', () => { Hacha.audio.play('tap'); eqUi.slot = b.getAttribute('data-eq-slot'); eqUi.page = 0; app.renderCurrent(); });
    });

    const cp = bottomEl.querySelector('#btn-eq-cprev');
    const cn = bottomEl.querySelector('#btn-eq-cnext');
    if (cp) cp.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const idx = roster.findIndex((c) => c.id === charDef.id);
      eqUi.charId = roster[(idx - 1 + roster.length) % roster.length].id;
      app.renderCurrent();
    });
    if (cn) cn.addEventListener('click', () => {
      Hacha.audio.play('tap');
      const idx = roster.findIndex((c) => c.id === charDef.id);
      eqUi.charId = roster[(idx + 1) % roster.length].id;
      app.renderCurrent();
    });

    bottomEl.querySelectorAll('[data-eq-uid]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        eqUi.selectedUid = b.getAttribute('data-eq-uid');
        app.renderCurrent();
      });
    });

    const ep = bottomEl.querySelector('#btn-eq-prev');
    const en = bottomEl.querySelector('#btn-eq-next');
    if (ep) ep.addEventListener('click', () => { Hacha.audio.play('tap'); eqUi.page = Math.max(0, eqUi.page - 1); app.renderCurrent(); });
    if (en) en.addEventListener('click', () => { Hacha.audio.play('tap'); eqUi.page += 1; app.renderCurrent(); });

    const eqToggle = bottomEl.querySelector('#btn-eq-toggle');
    if (eqToggle && selItem) {
      eqToggle.addEventListener('click', () => {
        Hacha.audio.play('buff');
        const prog = state.chars[charDef.id];
        if (prog.equip[eqUi.slot] === selItem.uid) {
          prog.equip[eqUi.slot] = null;
        } else {
          /* 他キャラが装備中ならそちらから外して付け替え */
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
        selItem.locked = !selItem.locked;
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    }

    const eqSell = bottomEl.querySelector('#btn-eq-sell');
    if (eqSell && selItem) {
      eqSell.addEventListener('click', () => {
        if (selItem.locked || findOwnerChar(state, selItem.uid)) return;
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

    bottomEl.querySelectorAll('[data-sell-thr]').forEach((b) => {
      b.addEventListener('click', () => {
        Hacha.audio.play('tap');
        state.settings.autoSellBelow = parseInt(b.getAttribute('data-sell-thr'), 10);
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    });

    const keepNewBtn = bottomEl.querySelector('#btn-toggle-keep-new');
    if (keepNewBtn) {
      keepNewBtn.addEventListener('click', () => {
        Hacha.audio.play('tap');
        state.settings.keepNewCodexGear = !state.settings.keepNewCodexGear;
        Hacha.storage.saveState(true);
        app.renderCurrent();
      });
    }

    const bulkBtn = bottomEl.querySelector('#btn-bulk-sell');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', () => {
        const thr = state.settings.autoSellBelow || 0;
        if (thr <= 0) return;
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
        cm.showToast(count > 0 ? `${count}個の装備を売却し 🪙${totalCoins} を獲得！` : '売却対象の装備がありませんでした');
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

    /* 上半分：全3枠の進行状況プレビュー（閲覧専用） */
    const slotsPreview = state.dispatches.map((d, i) => {
      const m = missions.find((x) => x.id === d.missionId) || missions[0];
      const names = d.charIds.map((cid) => {
        const c = Hacha.data.CHARACTER_MAP[cid];
        return c ? `${c.icon}${c.name}` : '';
      }).filter(Boolean).join('・');
      const pct = Math.min(1, (d.progress || 0) / m.needBattles);
      return `
        <div class="panel ${dispUi.slotIdx === i ? 'active-slot' : ''}" style="border-color:${dispUi.slotIdx === i ? '#48d6ff' : 'var(--border-subtle)'};padding:6px 8px;">
          <div class="meta-row-nowrap">
            <span class="unit-name-full">派遣隊${i + 1}：${m.icon}${U.escapeHtml(m.name)}</span>
            <span class="badge ${d.active ? 'scope-passive' : 'el-none'}">${d.active ? `進行中 ${d.progress}/${m.needBattles}戦` : '待機中'}</span>
          </div>
          <div class="gauge-track" style="margin:4px 0;"><div class="gauge-fill gauge-chain" style="transform:scaleX(${pct});"></div></div>
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
        <div class="flavor-box" style="margin-top:auto;">
          <strong>派遣隊${dispUi.slotIdx + 1} 適正種族：${prefRaceText}</strong>（${mission.needBattles}勝ごとに自動帰還・控えキャラが活躍）
        </div>
      </div>
    `;

    /* 下半分：派遣枠・任務・控えキャラ選択 */
    const roster = getUnlockedSorted();
    const available = roster.filter((c) => {
      const a = Hacha.engine.stats.getCharAssignment(state, c.id);
      if (a.type === 'party' || a.type === 'link') return false;
      /* 他の派遣枠にいるキャラは除外 */
      for (let i = 0; i < state.dispatches.length; i++) {
        if (i !== dispUi.slotIdx && state.dispatches[i].charIds.includes(c.id)) return false;
      }
      return true;
    });

    const pageSize = 4;
    const totalPages = Math.max(1, Math.ceil(available.length / pageSize));
    dispUi.page = U.clamp(dispUi.page, 0, totalPages - 1);
    const slice = available.slice(dispUi.page * pageSize, dispUi.page * pageSize + pageSize);

    const tiles = slice.length ? slice.map((c) => {
      const picked = slotObj.charIds.includes(c.id);
      const isPref = c.races.some((r) => mission.preferredRaces.includes(r));
      return `
        <button class="item-tile ${picked ? 'selected in-dispatch' : ''}" data-disp-char="${c.id}">
          <div class="meta-row-nowrap">
            <span class="unit-name-full">${c.icon}${U.escapeHtml(c.name)}</span>
            <span class="bu-hp-text" style="color:${picked ? '#ffd15c' : (isPref ? '#6effb8' : '#7084ae')};">
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
      <div class="panel" style="grid-column:span 2;grid-row:span 2;display:flex;align-items:center;justify-content:center;">
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
      <div class="select-grid-2" style="grid-template-rows:repeat(2,1fr);">${tiles}</div>
      <div class="pager-bar">
        <button class="btn btn-sm" id="btn-dp-prev">◀ 前</button>
        <span class="pager-info">控え ${available.length}体（最大${mission.maxChars}人）${dispUi.page + 1}/${totalPages}</span>
        <button class="btn btn-sm" id="btn-dp-next">次 ▶</button>
      </div>
      <div class="action-row">
        <button class="btn btn-sm ${slotObj.autoRepeat ? 'btn-toggle-on' : ''}" id="btn-dp-repeat">
          🔁 自動再派遣:${slotObj.autoRepeat ? 'ON' : 'OFF'}
        </button>
        <button class="btn btn-sm ${slotObj.active ? 'btn-danger' : 'btn-emerald'}" id="btn-dp-toggle" ${slotObj.charIds.length >= mission.minChars ? '' : 'disabled'}>
          ${slotObj.active ? '派遣を中止' : `🧭 派遣開始（${slotObj.charIds.length}/${mission.maxChars}）`}
        </button>
      </div>
    `;

    bottomEl.querySelectorAll('[data-disp-slot]').forEach((b) => {
      b.addEventListener('click', () => { Hacha.audio.play('tap'); dispUi.slotIdx = parseInt(b.getAttribute('data-disp-slot'), 10); dispUi.page = 0; app.renderCurrent(); });
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

    const dp = bottomEl.querySelector('#btn-dp-prev');
    const dn = bottomEl.querySelector('#btn-dp-next');
    if (dp) dp.addEventListener('click', () => { Hacha.audio.play('tap'); dispUi.page = Math.max(0, dispUi.page - 1); app.renderCurrent(); });
    if (dn) dn.addEventListener('click', () => { Hacha.audio.play('tap'); dispUi.page += 1; app.renderCurrent(); });

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

  function resetEquipTab() { eqUi.subTab = 'gear'; }

  Hacha.ui.screenEquip = { renderEquip, renderDispatch, resetEquipTab };
})();
