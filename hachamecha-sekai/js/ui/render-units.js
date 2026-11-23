/* ==========================================================================
   render-units.js - 育成画面（レベル・覚醒・魂片加入・技3種・専用武器）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  function renderUpper() {
    const st = HS.STATE.data;
    const uid = HS.STATE.ui.selectedUnitId || HS.UNITS[0].id;
    const u = HS.UNITS_MAP[uid] || HS.UNITS[0];
    const us = st.units[u.id];
    const stats = HS.STATE.getUnitStats(u.id, false);
    const a = HS.CONST.ATTR_MAP[u.attr];
    const r = HS.CONST.ROLE_MAP[u.role];

    const skillsHtml = u.skills.map((sk, i) => `
      <div class="skill-preview-row">
        <span style="color:var(--attr-col);font-weight:900;flex-shrink:0">技${i + 1}</span>
        <span style="font-weight:800;flex-shrink:0">${HS.UTIL.escHtml(sk.name)}</span>
        <span class="ellipsis" style="color:var(--text-sub);flex:1">${HS.UTIL.escHtml(sk.desc)}</span>
      </div>`).join('');

    return `
      <div class="panel attr-${u.attr}" style="flex:1 1 auto;min-height:0;border-color:var(--attr-col);display:flex;flex-direction:column;gap:4px;overflow:hidden">
        <div class="row-gap">
          <div class="unit-crest lg">
            <span class="crest-role">${r.icon}</span>
            <span class="crest-attr">${a.name}</span>
          </div>
          <div style="min-width:0;flex:1">
            <div class="row-between">
              <span class="ellipsis" style="font-size:14px;font-weight:900">${HS.UTIL.escHtml(u.name)} <span style="font-size:10px;color:var(--text-sub)">${HS.UTIL.escHtml(u.title)}</span></span>
              <span class="num" style="font-size:11px;font-weight:900;color:${us.unlocked ? 'var(--accent-gold)' : 'var(--accent-pink)'};flex-shrink:0">
                ${us.unlocked ? `Lv.${us.level}${us.awakening > 0 ? ` +${us.awakening}` : ''}` : '未加入'}
              </span>
            </div>
            <div class="row-gap" style="margin-top:2px">
              <span class="tag tag-attr">${a.name}</span>
              <span class="tag tag-race">${HS.CONST.formatRacesLabel(u.races)}</span>
              <span class="tag tag-role">${r.name}</span>
              <span class="num" style="margin-left:auto;font-size:10.5px;color:var(--accent-cyan);font-weight:800">戦力 ${HS.UTIL.fmtNum(stats.power)}</span>
            </div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-cell"><span class="k">HP</span><span class="v">${HS.UTIL.fmtNum(stats.hp)}</span></div>
          <div class="stat-cell"><span class="k">ATK</span><span class="v">${HS.UTIL.fmtNum(stats.atk)}</span></div>
          <div class="stat-cell"><span class="k">DEF</span><span class="v">${HS.UTIL.fmtNum(stats.def)}</span></div>
          <div class="stat-cell"><span class="k">SPD</span><span class="v">${stats.spd}</span></div>
          <div class="stat-cell"><span class="k">会心</span><span class="v">${Math.round(stats.crit * 100)}%</span></div>
          <div class="stat-cell"><span class="k">専用</span><span class="v" style="color:${us.exWeaponLv > 0 ? 'var(--accent-pink)' : 'var(--text-mute)'}">${us.exWeaponLv > 0 ? `Lv.${us.exWeaponLv}` : '未解放'}</span></div>
        </div>

        <div class="skill-preview-list">${skillsHtml}</div>

        <div style="font-size:10px;color:var(--text-sub);margin-top:auto" class="clamp-2">
          <strong style="color:var(--accent-gold)">アビリティ[${r.ability.name}]</strong> ${HS.UTIL.escHtml(r.ability.desc)}
        </div>
        <div style="font-size:10px;color:var(--text-sub)" class="clamp-2">
          <strong style="color:var(--accent-pink)">専用[${HS.UTIL.escHtml(u.exWeapon.name)}]</strong> ${HS.UTIL.escHtml(u.exWeapon.desc)}
        </div>
      </div>`;
  }

  function renderLower() {
    const st = HS.STATE.data;
    const uid = HS.STATE.ui.selectedUnitId || HS.UNITS[0].id;
    const u = HS.UNITS_MAP[uid] || HS.UNITS[0];
    const us = st.units[u.id];
    const fltAttr = HS.STATE.ui.unitFilterAttr;

    let actionBarHtml = '';
    if (us.unlocked) {
      const lvCost = HS.STATE.getLevelUpCost(us.level);
      const awCost = HS.STATE.getAwakenCost(us.awakening);
      actionBarHtml = `
        <div style="flex:0 0 auto;display:grid;grid-template-columns:1.1fr 0.9fr 1fr 1.1fr;gap:4px">
          <button class="btn btn-sm btn-cyan" data-action="unit-lvup" data-val="${u.id}:1">Lv+1 (${HS.UTIL.fmtNum(lvCost.gold)}G)</button>
          <button class="btn btn-sm btn-cyan" data-action="unit-lvup" data-val="${u.id}:5">Lv+5</button>
          <button class="btn btn-sm btn-gold" data-action="unit-awaken" data-val="${u.id}">覚醒(片${awCost.shards})</button>
          <button class="btn btn-sm btn-primary" data-action="open-exweapon" data-val="${u.id}">専用武器${us.exWeaponLv > 0 ? `Lv${us.exWeaponLv}` : '解放'}</button>
        </div>`;
    } else {
      actionBarHtml = `
        <div class="row-gap" style="flex:0 0 auto">
          <div class="panel ellipsis" style="flex:1;padding:6px 8px;font-size:10.5px;color:var(--text-sub)">解放条件: ${HS.UTIL.escHtml(u.unlock.label)}</div>
          <button class="btn btn-sm btn-primary" data-action="unit-recruit" data-val="${u.id}">魂片30で加入</button>
        </div>`;
    }

    // 厳格ソート済みHS.UNITSを使用
    const list = HS.UNITS.filter((x) => fltAttr === 'all' || x.attr === fltAttr);

    const listHtml = list.map((x) => {
      const xs = st.units[x.id];
      const a = HS.CONST.ATTR_MAP[x.attr];
      const r = HS.CONST.ROLE_MAP[x.role];
      return `
        <button class="unit-chip attr-${x.attr} ${x.id === u.id ? 'selected' : ''} ${xs.unlocked ? '' : 'locked'}"
                data-action="select-unit" data-val="${x.id}">
          <div class="unit-crest">
            <span class="crest-role">${r.icon}</span>
            <span class="crest-attr">${a.name}</span>
          </div>
          <div style="min-width:0;flex:1">
            <div class="row-between">
              <span class="ellipsis" style="font-size:11px;font-weight:900">${HS.UTIL.escHtml(x.name)}</span>
              <span class="num" style="font-size:9.5px;color:${xs.unlocked ? 'var(--accent-gold)' : 'var(--text-mute)'}">
                ${xs.unlocked ? `Lv.${xs.level}` : '🔒'}
              </span>
            </div>
            <div class="ellipsis" style="font-size:9.5px;color:var(--text-sub)">
              ${HS.CONST.formatRacesLabel(x.races)}・${r.name}${xs.exWeaponLv > 0 ? ` ★専${xs.exWeaponLv}` : ''}
            </div>
          </div>
        </button>`;
    }).join('');

    return `
      ${actionBarHtml}
      <div class="pill-bar">
        <button class="pill-btn ${fltAttr === 'all' ? 'active' : ''}" data-action="unit-filter" data-val="all">全属性</button>
        ${HS.CONST.ATTRIBUTES.map((a) => `
          <button class="pill-btn ${fltAttr === a.id ? 'active' : ''}" data-action="unit-filter" data-val="${a.id}">${a.name}</button>`).join('')}
      </div>
      <div class="roster-grid scroll-box">${listHtml}</div>`;
  }

  function buildExWeaponSheet(unitId) {
    const u = HS.UNITS_MAP[unitId];
    const us = HS.STATE.data.units[unitId];
    const ex = u.exWeapon;
    const lv = us.exWeaponLv;
    const nextLv = Math.min(5, lv + 1);
    const scale = 1 + (Math.max(1, lv) - 1) * 0.35;
    const cost = HS.STATE.getExWeaponCost(lv);
    const res = HS.STATE.data.resources;

    return {
      title: `専用武器 — ${u.name}`,
      body: `
        <div class="panel attr-${u.attr}" style="border-color:var(--accent-pink);display:flex;flex-direction:column;gap:6px">
          <div class="row-between">
            <span style="font-size:14px;font-weight:900;color:var(--accent-pink)">${HS.UTIL.escHtml(ex.name)}</span>
            <span class="num" style="font-size:12px;font-weight:900;color:var(--accent-gold)">${lv > 0 ? `Lv.${lv} / 5` : '未解放'}</span>
          </div>
          <div style="font-size:11.5px;color:#fff;line-height:1.45">${HS.UTIL.escHtml(ex.desc)}</div>
          <div class="stat-grid">
            <div class="stat-cell"><span class="k">HP</span><span class="v">+${Math.round((ex.stats.hp || 0) * scale)}</span></div>
            <div class="stat-cell"><span class="k">ATK</span><span class="v">+${Math.round((ex.stats.atk || 0) * scale)}</span></div>
            <div class="stat-cell"><span class="k">DEF</span><span class="v">+${Math.round((ex.stats.def || 0) * scale)}</span></div>
            <div class="stat-cell"><span class="k">SPD</span><span class="v">+${Math.round((ex.stats.spd || 0) * scale)}</span></div>
            <div class="stat-cell"><span class="k">会心</span><span class="v">+${Math.round((ex.stats.crit || 0) * scale)}%</span></div>
            <div class="stat-cell"><span class="k">強化倍率</span><span class="v">×${scale.toFixed(2)}</span></div>
          </div>
        </div>
        ${lv < 5 ? `
          <div class="panel" style="display:flex;flex-direction:column;gap:4px;font-size:11px">
            <div style="font-weight:800;color:var(--text-sub)">${lv === 0 ? '解放に必要な素材' : `Lv.${nextLv} 覚醒に必要な素材`}</div>
            <div class="row-between">
              <span>星屑コア: <strong class="res-core">${res.cores} / ${cost.cores}</strong></span>
              <span>魂片: <strong class="res-shard">${res.shards} / ${cost.shards}</strong></span>
              <span>G: <strong class="res-gold">${HS.UTIL.fmtNum(res.gold)} / ${HS.UTIL.fmtNum(cost.gold)}</strong></span>
            </div>
          </div>` : `<div class="panel" style="text-align:center;color:var(--accent-gold);font-weight:900">最大レベル覚醒済み</div>`}`,
      foot: `
        <div class="sheet-foot-row">
          <button class="btn" data-action="close-sheet">閉じる</button>
          ${lv < 5 ? `<button class="btn btn-primary" data-action="confirm-exweapon" data-val="${unitId}">${lv === 0 ? '専用武器を解放する' : `Lv.${nextLv}へ覚醒する`}</button>` : ''}
        </div>`
    };
  }

  HS.UI_UNITS = { renderUpper, renderLower, buildExWeaponSheet };
})(window);
