/* ==========================================================================
   render-party.js - パーティ編成画面（D&D 4スロット・シナジー・厳格ソート一覧）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  function renderUpper() {
    const st = HS.STATE.data;
    const syn = HS.STATE.getPartySynergy();
    const totalPower = HS.STATE.getPartyTotalPower();

    const slotUid = st.party[HS.STATE.ui.selectedPartySlot] || st.party.find(Boolean) || 'kagura';
    const u = HS.UNITS_MAP[slotUid];
    const us = st.units[slotUid];
    const stats = HS.STATE.getUnitStats(slotUid, true);
    const a = HS.CONST.ATTR_MAP[u.attr];
    const r = HS.CONST.ROLE_MAP[u.role];

    const synHtml = syn.activeTags.length
      ? syn.activeTags.map((t) => `<span class="synergy-chip">${HS.UTIL.escHtml(t)}</span>`).join('')
      : `<span style="font-size:10.5px;color:var(--text-mute)">同種族2体・同属性・4ロール編成でシナジー発動</span>`;

    return `
      <div class="panel" style="display:flex;flex-direction:column;gap:4px">
        <div class="row-between">
          <span style="font-weight:900;font-size:12px">パーティ総合戦力</span>
          <span class="num" style="font-size:15px;font-weight:900;color:var(--accent-cyan)">${HS.UTIL.fmtNum(totalPower)}</span>
        </div>
        <div class="synergy-wrap">${synHtml}</div>
      </div>

      <div class="panel attr-${u.attr}" style="flex:1 1 auto;min-height:0;border-color:var(--attr-col);display:flex;flex-direction:column;gap:5px;overflow:hidden">
        <div class="row-gap">
          ${HS.CONST.renderUnitCrest(u, 'lg')}
          <div style="min-width:0;flex:1">
            <div class="row-between">
              <span class="ellipsis" style="font-size:14px;font-weight:900">${HS.UTIL.escHtml(u.name)} <span class="num" style="font-size:11px;color:var(--accent-gold)">Lv.${us.level}</span></span>
              <span class="num" style="font-size:11px;color:var(--accent-cyan);font-weight:800">戦力 ${HS.UTIL.fmtNum(stats.power)}</span>
            </div>
            <div class="row-gap" style="margin-top:3px">
              <span class="tag tag-attr">${a.name}</span>
              <span class="tag tag-race">${HS.CONST.formatRacesLabel(u.races)}</span>
              <span class="tag tag-role">${r.name}</span>
            </div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-cell"><span class="k">HP</span><span class="v">${HS.UTIL.fmtNum(stats.hp)}</span></div>
          <div class="stat-cell"><span class="k">ATK</span><span class="v">${HS.UTIL.fmtNum(stats.atk)}</span></div>
          <div class="stat-cell"><span class="k">DEF</span><span class="v">${HS.UTIL.fmtNum(stats.def)}</span></div>
          <div class="stat-cell"><span class="k">SPD</span><span class="v">${stats.spd}</span></div>
          <div class="stat-cell"><span class="k">会心</span><span class="v">${Math.round(stats.crit * 100)}%</span></div>
          <div class="stat-cell"><span class="k">専用</span><span class="v">${us.exWeaponLv > 0 ? 'Lv.' + us.exWeaponLv : '未解放'}</span></div>
        </div>

        <div style="font-size:10px;color:var(--text-sub);margin-top:auto" class="clamp-2">
          <strong style="color:var(--accent-gold)">[${r.ability.name}]</strong> ${HS.UTIL.escHtml(r.ability.desc)}
        </div>
      </div>

      <div class="row-between" style="font-size:10px;color:var(--text-sub);padding:0 2px">
        <span>属性相性: <strong style="color:#ff5a4f">炎</strong>＞<strong style="color:#34d399">風</strong>＞<strong style="color:#29b6f6">水</strong>＞<strong style="color:#ff5a4f">炎</strong> / <strong style="color:#ffd54f">光</strong>⇄<strong style="color:#c084fc">闇</strong></span>
        <span style="color:var(--accent-pink)">無:混沌特化</span>
      </div>`;
  }

  function renderLower() {
    const st = HS.STATE.data;
    const selSlot = HS.STATE.ui.selectedPartySlot;
    const fltAttr = HS.STATE.ui.partyFilterAttr;

    const slotsHtml = [0, 1, 2, 3].map((idx) => {
      const uid = st.party[idx];
      const isSel = selSlot === idx;
      if (!uid) {
        return `
          <button class="party-slot ${isSel ? 'selected' : ''}"
                  data-action="select-party-slot" data-val="${idx}"
                  data-drop-kind="party-slot" data-drop-value="${idx}">
            <span class="slot-idx">${idx + 1}</span>
            <span style="font-size:10px;color:var(--text-mute)">空き枠</span>
          </button>`;
      }
      const u = HS.UNITS_MAP[uid];
      const a = HS.CONST.ATTR_MAP[u.attr];
      const r = HS.CONST.ROLE_MAP[u.role];
      return `
        <button class="party-slot filled attr-${u.attr} ${isSel ? 'selected' : ''}"
                data-action="select-party-slot" data-val="${idx}"
                data-drag-kind="party-slot" data-drag-value="${idx}" data-drag-label="${HS.UTIL.escHtml(u.name)}"
                data-drag-accept="party-slot,party-remove" data-drag-immediate="1"
                data-drop-kind="party-slot" data-drop-value="${idx}">
          <span class="slot-idx">${idx === 0 ? '前' : idx + 1}</span>
          <span class="slot-role-ico" style="color:${a.color}">${HS.CONST.renderRoleIcon(u.role)}</span>
          <span class="ellipsis" style="font-size:10.5px;font-weight:900;max-width:100%">${HS.UTIL.escHtml(u.name)}</span>
          <span style="font-size:9px;color:${a.color};font-weight:800">${a.name}・Lv.${st.units[uid].level}</span>
        </button>`;
    }).join('');

    // 厳格ソート順（HS.UNITS自体が厳格ソート済み）
    const roster = HS.UNITS.filter((u) => {
      if (!st.units[u.id]?.unlocked) return false;
      if (fltAttr !== 'all' && u.attr !== fltAttr) return false;
      return true;
    });

    const rosterHtml = roster.map((u) => {
      const us = st.units[u.id];
      const r = HS.CONST.ROLE_MAP[u.role];
      const inPartyIdx = st.party.indexOf(u.id);
      return `
        <div class="unit-chip attr-${u.attr} ${inPartyIdx !== -1 ? 'in-party' : ''}"
             data-action="assign-party-unit" data-val="${u.id}"
             data-drag-kind="roster-unit" data-drag-value="${u.id}" data-drag-label="${HS.UTIL.escHtml(u.name)}"
             data-drag-accept="party-slot">
          ${HS.CONST.renderUnitCrest(u)}
          <div style="min-width:0;flex:1">
            <div class="row-between">
              <span class="ellipsis" style="font-size:11px;font-weight:900">${HS.UTIL.escHtml(u.name)}</span>
              <span class="num" style="font-size:9.5px;color:${inPartyIdx !== -1 ? 'var(--accent-gold)' : 'var(--text-sub)'}">${inPartyIdx !== -1 ? `枠${inPartyIdx + 1}` : `Lv.${us.level}`}</span>
            </div>
            <div class="ellipsis" style="font-size:9.5px;color:var(--text-sub)">${HS.CONST.formatRacesLabel(u.races)} / ${r.name}</div>
          </div>
          <span data-drag-handle="1" style="font-size:13px;color:var(--text-mute);padding:4px 2px;touch-action:none">⠿</span>
        </div>`;
    }).join('');

    return `
      <div class="party-drop-grid">${slotsHtml}</div>
      <div class="row-gap" style="flex:0 0 28px">
        <button class="btn btn-sm btn-cyan" style="flex:1" data-action="party-auto">おすすめ編成</button>
        <button class="btn btn-sm btn-danger" style="flex:1" data-action="party-remove-slot"
                data-drop-kind="party-remove" data-drop-value="remove">選択枠を外す</button>
      </div>
      <div class="pill-bar">
        <button class="pill-btn ${fltAttr === 'all' ? 'active' : ''}" data-action="party-filter" data-val="all">全属性</button>
        ${HS.CONST.ATTRIBUTES.map((a) => `
          <button class="pill-btn ${fltAttr === a.id ? 'active' : ''}" data-action="party-filter" data-val="${a.id}">${a.name}</button>`).join('')}
      </div>
      <div class="roster-grid scroll-box">${rosterHtml}</div>`;
  }

  HS.UI_PARTY = { renderUpper, renderLower };
})(window);
