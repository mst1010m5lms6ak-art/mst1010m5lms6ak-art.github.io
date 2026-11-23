/* ==========================================================================
   render-gear.js - 装備画面（D&D装着/売却・強化・ロック・自動売却フィルタ設定）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  function getUnlockedUnits() {
    return HS.UNITS.filter((u) => HS.STATE.data.units[u.id]?.unlocked);
  }

  function ensureGearTarget() {
    const unlocked = getUnlockedUnits();
    let tid = HS.STATE.ui.gearTargetUnitId;
    if (!unlocked.some((u) => u.id === tid)) {
      tid = unlocked[0]?.id || 'kagura';
      HS.STATE.ui.gearTargetUnitId = tid;
    }
    return tid;
  }

  function renderUpper() {
    const st = HS.STATE.data;
    const targetUid = ensureGearTarget();
    const targetU = HS.UNITS_MAP[targetUid];
    const targetUs = st.units[targetUid];
    const eqMap = HS.STATE.getEquipMap();

    const item = st.equipment.find((e) => e.id === HS.STATE.ui.selectedGearId) || st.equipment[0] || null;
    if (item && HS.STATE.ui.selectedGearId !== item.id) HS.STATE.ui.selectedGearId = item.id;

    let itemHtml = '';
    if (!item) {
      itemHtml = `<div class="panel" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-mute)">所持装備がありません。戦闘で装備を獲得しましょう。</div>`;
    } else {
      const enhMult = 1 + (item.enhance || 0) * 0.12;
      const mVal = Math.round(item.mainVal * enhMult);
      const sLabel = HS.EQUIP.SLOT_BASES[item.slot]?.mainLabel || 'ATK';
      const ownerName = item.equippedBy ? HS.UNITS_MAP[item.equippedBy]?.name : null;

      // 対象キャラの同スロット現装備との比較
      const curId = targetUs.equips[item.slot];
      const curItem = curId ? eqMap[curId] : null;
      const diff = curItem ? item.score - curItem.score : item.score;
      const diffStr = curItem && curItem.id === item.id
        ? '装備中'
        : diff >= 0 ? `評点 +${diff}` : `評点 ${diff}`;
      const diffCol = curItem && curItem.id === item.id
        ? 'var(--accent-cyan)'
        : diff >= 0 ? 'var(--accent-lime)' : 'var(--accent-danger)';

      const affixesHtml = (item.affixes || []).map((af) => `
        <span class="tag tag-race">${HS.UTIL.escHtml(HS.EQUIP.formatAffix(af, item.enhance))}</span>`).join('');

      itemHtml = `
        <div class="panel rar-${item.rarity}" style="flex:1 1 auto;min-height:0;border-color:var(--rar-col);display:flex;flex-direction:column;gap:5px;overflow:hidden">
          <div class="row-between">
            <div class="row-gap">
              <span class="tag tag-rar">${item.rarity}</span>
              <span class="ellipsis" style="font-size:13px;font-weight:900">${HS.UTIL.escHtml(item.name)}${item.enhance > 0 ? ` +${item.enhance}` : ''}</span>
            </div>
            <span style="font-size:11px;font-weight:900;color:${diffCol};flex-shrink:0" class="num">${diffStr}</span>
          </div>
          <div class="row-between" style="font-size:11px">
            <span class="num">主能力: <strong style="color:#fff">${sLabel} +${HS.UTIL.fmtNum(mVal)}</strong></span>
            <span class="num" style="color:var(--text-sub)">評点 <strong style="color:var(--accent-gold)">${item.score}</strong> ${item.locked ? '🔒' : ''}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${affixesHtml}</div>
          <div class="row-between" style="margin-top:auto;font-size:10px;color:var(--text-sub)">
            <span>${ownerName ? `装着中: ${HS.UTIL.escHtml(ownerName)}` : '未装備'}</span>
            <span class="num">所持数 ${st.equipment.length}/160・魔粉 ${HS.UTIL.fmtNum(st.resources.dust)}</span>
          </div>
        </div>`;
    }

    const stats = HS.STATE.getUnitStats(targetUid, false);
    const a = HS.CONST.ATTR_MAP[targetU.attr];
    const r = HS.CONST.ROLE_MAP[targetU.role];

    return `
      <div class="panel attr-${targetU.attr}" style="border-color:var(--attr-col);display:flex;align-items:center;justify-content:space-between;gap:6px">
        <div class="row-gap">
          <div class="unit-crest"><span class="crest-role">${r.icon}</span><span class="crest-attr">${a.name}</span></div>
          <div style="min-width:0">
            <div class="ellipsis" style="font-size:12px;font-weight:900">${HS.UTIL.escHtml(targetU.name)} の装備</div>
            <div class="num" style="font-size:10px;color:var(--text-sub)">HP ${HS.UTIL.fmtNum(stats.hp)} / ATK ${HS.UTIL.fmtNum(stats.atk)} / SPD ${stats.spd}</div>
          </div>
        </div>
        <span class="num" style="font-size:11px;font-weight:900;color:var(--accent-cyan);flex-shrink:0">戦力 ${HS.UTIL.fmtNum(stats.power)}</span>
      </div>
      ${itemHtml}
      <div class="row-between" style="font-size:10px;color:var(--text-sub);padding:0 2px">
        <span>自動売却ルール: <strong style="color:${st.autoSell.enabled ? 'var(--accent-cyan)' : 'var(--text-mute)'}">${st.autoSell.enabled ? `${st.autoSell.maxRarity}以下を自動売却` : 'OFF'}</strong></span>
        <span>長押し/⠿ドラッグで枠へ装着・売却</span>
      </div>`;
  }

  function renderLower() {
    const st = HS.STATE.data;
    const targetUid = ensureGearTarget();
    const targetU = HS.UNITS_MAP[targetUid];
    const targetUs = st.units[targetUid];
    const eqMap = HS.STATE.getEquipMap();
    const fltSlot = HS.STATE.ui.gearFilterSlot;

    const item = st.equipment.find((e) => e.id === HS.STATE.ui.selectedGearId) || st.equipment[0] || null;

    const slotsHtml = HS.CONST.EQUIP_SLOTS.map((sl) => {
      const eqId = targetUs.equips[sl.id];
      const eq = eqId ? eqMap[eqId] : null;
      if (!eq) {
        return `
          <button class="gear-slot-box" data-action="gear-filter" data-val="${sl.id}"
                  data-drop-kind="gear-slot" data-drop-value="${sl.id}">
            <span style="font-size:13px">${sl.icon}</span>
            <span style="font-size:9.5px;color:var(--text-mute)">${sl.name}空</span>
          </button>`;
      }
      return `
        <button class="gear-slot-box filled rar-${eq.rarity}" data-action="unequip-slot" data-val="${targetUid}:${sl.id}"
                data-drop-kind="gear-slot" data-drop-value="${sl.id}">
          <span style="font-size:9px;font-weight:900;color:var(--rar-col)">${eq.rarity}${eq.enhance > 0 ? ` +${eq.enhance}` : ''}</span>
          <span class="ellipsis" style="font-size:10px;font-weight:800;max-width:100%">${HS.UTIL.escHtml(eq.name)}</span>
          <span style="font-size:8.5px;color:var(--text-sub)">タップで外す</span>
        </button>`;
    }).join('');

    const filtered = st.equipment
      .filter((e) => fltSlot === 'all' || e.slot === fltSlot)
      .sort((a, b) => b.score - a.score);

    const gridHtml = filtered.map((e) => {
      const sel = item && item.id === e.id;
      const slIcon = HS.CONST.EQUIP_SLOTS.find((x) => x.id === e.slot)?.icon || '';
      const owner = e.equippedBy ? HS.UNITS_MAP[e.equippedBy]?.name : '';
      return `
        <div class="gear-card rar-${e.rarity} ${sel ? 'selected' : ''}"
             data-action="select-gear" data-val="${e.id}"
             data-drag-kind="gear-item" data-drag-value="${e.id}" data-drag-label="${HS.UTIL.escHtml(e.name)}"
             data-drag-accept="gear-slot,gear-sell">
          <div class="row-between">
            <span style="font-size:9.5px;font-weight:900;color:var(--rar-col)">${slIcon} ${e.rarity}${e.enhance > 0 ? `+${e.enhance}` : ''}</span>
            <div class="row-gap">
              <span class="num" style="font-size:9.5px;color:var(--accent-gold)">${e.score}</span>
              <span data-drag-handle="1" style="font-size:12px;color:var(--text-mute);touch-action:none">⠿</span>
            </div>
          </div>
          <div class="ellipsis" style="font-size:10.5px;font-weight:800">${e.locked ? '🔒' : ''}${HS.UTIL.escHtml(e.name)}</div>
          <div class="ellipsis" style="font-size:9px;color:var(--text-sub)">${owner ? `装着:${owner}` : '未装備'}</div>
        </div>`;
    }).join('');

    const enhCost = item ? HS.EQUIP.getEnhanceCost(item) : null;

    return `
      <div class="row-gap" style="flex:0 0 28px">
        <button class="btn btn-sm" data-action="gear-target-step" data-val="-1">◀</button>
        <button class="btn btn-sm" style="flex:1.2" data-action="gear-target-step" data-val="1">${HS.UTIL.escHtml(targetU.name)} ▶</button>
        <button class="btn btn-sm btn-cyan" data-action="gear-auto-equip" data-val="${targetUid}">最適</button>
        <button class="btn btn-sm" data-action="open-autosell">自動売却</button>
        <button class="btn btn-sm btn-danger" data-action="gear-bulk-sell">一括売</button>
      </div>

      <div class="gear-drop-row">
        ${slotsHtml}
        <div class="gear-slot-box gear-sell-drop" data-drop-kind="gear-sell" data-drop-value="sell">
          <span>🗑</span>
          <span>売却</span>
        </div>
      </div>

      <div class="row-gap" style="flex:0 0 28px">
        <button class="btn btn-sm btn-primary" style="flex:1.1" data-action="gear-equip" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>装備する</button>
        <button class="btn btn-sm btn-gold" style="flex:1.2" data-action="gear-enhance" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>
          強化${enhCost ? `(${HS.UTIL.fmtNum(enhCost.gold)}G)` : ''}
        </button>
        <button class="btn btn-sm" style="flex:0.75" data-action="gear-lock" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>
          ${item?.locked ? '🔓解除' : '🔒保護'}
        </button>
        <button class="btn btn-sm btn-danger" style="flex:0.7" data-action="gear-sell" data-val="${item ? item.id : ''}" ${item ? '' : 'disabled'}>売却</button>
      </div>

      <div class="pill-bar">
        <button class="pill-btn ${fltSlot === 'all' ? 'active' : ''}" data-action="gear-filter" data-val="all">全て</button>
        ${HS.CONST.EQUIP_SLOTS.map((sl) => `
          <button class="pill-btn ${fltSlot === sl.id ? 'active' : ''}" data-action="gear-filter" data-val="${sl.id}">${sl.icon} ${sl.name}</button>`).join('')}
      </div>

      <div class="gear-grid scroll-box">${gridHtml}</div>`;
  }

  function buildAutoSellSheet() {
    const rule = HS.STATE.data.autoSell;
    const rarities = ['N', 'R', 'SR', 'SSR'];
    return {
      title: '自動売却フィルタ設定',
      body: `
        <div class="panel" style="display:flex;flex-direction:column;gap:8px;font-size:11.5px">
          <div class="row-between">
            <span style="font-weight:800">ドロップ時の自動売却</span>
            <span style="font-weight:900;color:${rule.enabled ? 'var(--accent-lime)' : 'var(--text-mute)'}">${rule.enabled ? '有効' : '無効'}</span>
          </div>
          <div style="font-size:10.5px;color:var(--text-sub)">
            指定レアリティ以下の未ロック装備をドロップ時に自動でゴールド＆強化魔粉へ変換します。CHAOSレアは常に保護されます。
          </div>
          <div style="font-weight:800;margin-top:2px">自動売却する上限レアリティ：現在 <span style="color:var(--accent-gold)">${rule.maxRarity}以下</span></div>
          <div style="font-weight:800;margin-top:2px">高評点保護（評点${rule.keepScoreThreshold}以上は売らない）：<span style="color:${rule.keepHighScore ? 'var(--accent-cyan)' : 'var(--text-mute)'}">${rule.keepHighScore ? 'ON' : 'OFF'}</span></div>
        </div>`,
      foot: `
        <div class="sheet-foot-row">
          ${rarities.map((r) => `
            <button class="btn btn-sm ${rule.maxRarity === r ? 'btn-gold' : ''}" data-action="autosell-rarity" data-val="${r}">${r}以下</button>`).join('')}
        </div>
        <div class="sheet-foot-row">
          <button class="btn btn-toggle ${rule.enabled ? 'on' : ''}" data-action="autosell-toggle">自動売却 ${rule.enabled ? 'ON' : 'OFF'}</button>
          <button class="btn btn-toggle ${rule.keepHighScore ? 'on' : ''}" data-action="autosell-highscore">高評点保護 ${rule.keepHighScore ? 'ON' : 'OFF'}</button>
        </div>
        <div class="sheet-foot-row">
          <button class="btn btn-primary" data-action="close-sheet">設定を完了して閉じる</button>
        </div>`
    };
  }

  HS.UI_GEAR = { renderUpper, renderLower, buildAutoSellSheet };
})(window);
